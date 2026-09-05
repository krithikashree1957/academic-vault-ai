import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

/**
 * Cleanly extracts and parses structured JSON from Gemini's output.
 * 1. Strips markdown code blocks (e.g. ```json ... ``` or ``` ... ```)
 * 2. Isolates outer JSON object/array boundaries to eliminate conversational preambles/postscripts
 * 3. Sanitizes formatting anomalies (trailing commas)
 * 4. Wraps in try/catch fallback that returns structured data without throwing a backend error
 */
function parseGeminiJsonResponse<T>(rawText: string, fallbackValue: T): T {
  if (!rawText || typeof rawText !== "string") {
    return fallbackValue;
  }

  const trimmed = rawText.trim();

  // Attempt 1: Direct JSON parse if output is already pure JSON
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue with markdown cleanup
  }

  // Attempt 2: Extract content from inside ```json ... ``` or ``` ... ``` code blocks
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = trimmed.match(codeBlockRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch {
      // Continue to boundary extraction
    }
  }

  // Attempt 3: Extract outermost JSON structure ({ ... } or [ ... ]) to discard preamble text
  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  let startIndex = -1;

  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }

  if (startIndex !== -1) {
    const isObject = trimmed[startIndex] === "{";
    const endIndex = isObject ? trimmed.lastIndexOf("}") : trimmed.lastIndexOf("]");
    if (endIndex > startIndex) {
      const extractedJson = trimmed.substring(startIndex, endIndex + 1).trim();
      try {
        return JSON.parse(extractedJson);
      } catch {
        // Continue to trailing comma sanitization
      }
    }
  }

  // Attempt 4: Strip remaining code fences and sanitize trailing commas before } or ]
  try {
    let sanitized = trimmed
      .replace(/```(?:json)?/gi, "")
      .replace(/```/g, "")
      .trim();

    const braceStart = sanitized.indexOf("{");
    const braceEnd = sanitized.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd > braceStart) {
      sanitized = sanitized.substring(braceStart, braceEnd + 1);
    }
    // Remove trailing commas: e.g. { "a": 1, } -> { "a": 1 }
    sanitized = sanitized.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(sanitized);
  } catch {
    console.warn("parseGeminiJsonResponse: unable to parse raw response, returning structured fallback.");
  }

  return fallbackValue;
}

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please set it in Settings.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

interface FallbackOptions {
  contents: any;
  config?: {
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: any;
  };
}

async function generateContentWithFallback(options: FallbackOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getAIClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });

      const text = response.text || "";
      return { text, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || (err?.message?.includes("429") ? 429 : 0);
      const isRecoverable =
        status === 429 ||
        status === 503 ||
        status === 500 ||
        status === 404 ||
        err?.message?.toLowerCase().includes("unavailable") ||
        err?.message?.toLowerCase().includes("quota") ||
        err?.message?.toLowerCase().includes("not found") ||
        err?.message?.toLowerCase().includes("overloaded");

      console.warn(`Model ${model} failed with: ${err?.message || err}. Recoverable: ${isRecoverable}`);
      if (!isRecoverable && MODEL_FALLBACK_LADDER.indexOf(model) === MODEL_FALLBACK_LADDER.length - 1) {
        break;
      }
    }
  }

  throw new Error(lastError?.message || "All models in the fallback ladder failed to generate content.");
}

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Document Extraction Endpoint (Structured JSON Output with responseSchema)
app.post("/api/gemini/extract-document", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { fileBase64, mimeType = "image/png", fileName = "document" } = body;

    if (!fileBase64 || typeof fileBase64 !== "string") {
      res.status(400).json({ error: "Missing document file payload (base64 string)." });
      return;
    }

    // Strip prefix if data URL provided (e.g., "data:image/jpeg;base64,...")
    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");

    const systemInstruction = `You are a precision Academic & Credential Extraction AI.
Analyze the provided document (degree, transcript, marksheet, diploma, certificate, award, or academic evaluation).
Extract all verifiable information into the requested JSON schema.
Rules:
- documentType must be one of: "Marksheet", "Degree", "Certificate", "Other"
- issuingInstitution: official name of university, college, school, accreditation board, or issuing body
- dateOfIssuance: date or year issued (e.g., YYYY-MM-DD or Month Year)
- awardLocation: city, state, or country of institution/award
- keyMetrics: extract GPA, total score/percentage, honors/distinctions, and an array of individual subjects with their grades/marks if visible.
- summary: concise 2-3 sentence overview of what this credential establishes.`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || "image/png",
            },
          },
          {
            text: `Extract structured academic and credential metadata from this document (filename: "${fileName}"). Adhere strictly to the requested JSON schema.`,
          },
        ],
      },
    ];

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        documentType: {
          type: Type.STRING,
          enum: ["Marksheet", "Degree", "Certificate", "Other"],
        },
        issuingInstitution: {
          type: Type.STRING,
        },
        dateOfIssuance: {
          type: Type.STRING,
        },
        awardLocation: {
          type: Type.STRING,
        },
        keyMetrics: {
          type: Type.OBJECT,
          properties: {
            gpa: { type: Type.STRING },
            totalScore: { type: Type.STRING },
            honors: { type: Type.STRING },
            subjects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  grade: { type: Type.STRING },
                },
                required: ["subject", "grade"],
              },
            },
          },
        },
        summary: {
          type: Type.STRING,
        },
      },
      required: ["documentType", "issuingInstitution", "summary"],
    };

    // 1. Strictly set responseMimeType: "application/json" in the API request configuration
    const result = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const defaultFallbackData = {
      documentType: "Other" as const,
      issuingInstitution: fileName ? fileName.replace(/\.[^/.]+$/, "") : "Extracted Document",
      dateOfIssuance: new Date().toISOString().split("T")[0],
      awardLocation: "Unspecified",
      keyMetrics: {
        gpa: "",
        totalScore: "",
        honors: "",
        subjects: [],
      },
      summary: "Academic credential successfully processed.",
      fileName,
      fileType: mimeType,
      fileBase64: cleanBase64,
    };

    // 2. Strip any accidental markdown formatting (like ```json ... ``` code blocks)
    // 3. Cleanly parse structured data with try/catch fallback without throwing a backend error
    const parsed = parseGeminiJsonResponse(result.text, defaultFallbackData);

    // Normalize and defensively guard the extracted data
    const validTypes = ["Marksheet", "Degree", "Certificate", "Other"];
    const normalizedData = {
      documentType: validTypes.includes(parsed.documentType) ? parsed.documentType : "Other",
      issuingInstitution: String(parsed.issuingInstitution || defaultFallbackData.issuingInstitution),
      dateOfIssuance: String(parsed.dateOfIssuance || defaultFallbackData.dateOfIssuance),
      awardLocation: String(parsed.awardLocation || defaultFallbackData.awardLocation),
      keyMetrics: {
        gpa: String(parsed.keyMetrics?.gpa || ""),
        totalScore: String(parsed.keyMetrics?.totalScore || ""),
        honors: String(parsed.keyMetrics?.honors || ""),
        subjects: Array.isArray(parsed.keyMetrics?.subjects)
          ? parsed.keyMetrics.subjects
              .filter((s: any) => s && typeof s === "object")
              .map((s: any) => ({
                subject: String(s.subject || "Course"),
                grade: String(s.grade || "Completed"),
              }))
          : [],
      },
      summary: String(parsed.summary || (result.text ? result.text.slice(0, 300) : defaultFallbackData.summary)),
      fileName,
      fileType: mimeType,
      fileBase64: cleanBase64,
    };

    res.json({
      data: normalizedData,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/gemini/extract-document:", error);
    res.status(500).json({
      error: error?.message || "Failed to extract structured data from document.",
    });
  }
});

// Reflection & Academic Vault Chat Endpoint
app.post("/api/gemini/reflect", async (req: Request, res: Response): Promise<void> => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const {
      prompt,
      history = [],
      reflectionMode = "deep-reflection",
      customFocus = "",
      vaultDocuments = [],
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ error: "A valid prompt or reflection entry is required." });
      return;
    }

    // Build system instruction tailored to reflection & academic vault assistance
    let modeGuidance = "Provide an insightful, empathetic, and constructive reflection.";
    if (reflectionMode === "brainstorm") {
      modeGuidance = "Help the user brainstorm creative possibilities, academic goals, action steps, and perspectives.";
    } else if (reflectionMode === "summary") {
      modeGuidance = "Distill the user's thoughts and credentials into structured key takeaways and clarity.";
    } else if (reflectionMode === "philosophical") {
      modeGuidance = "Guide the user with Socratic inquiry, scholarly depth, and grounding questions.";
    }

    let vaultContext = "";
    if (Array.isArray(vaultDocuments) && vaultDocuments.length > 0) {
      vaultContext = `\n\n=== USER'S ACADEMIC VAULT (VERIFIED CREDENTIAL DOCUMENTS) ===
The user has ${vaultDocuments.length} verified document(s) in their private Academic Vault:
${vaultDocuments
  .map(
    (doc: any, i: number) =>
      `[Document ${i + 1}]
- Document ID: ${doc.id}
- Classification: ${doc.documentType}
- Issuing Institution: ${doc.issuingInstitution}
- Date of Issuance: ${doc.dateOfIssuance || "N/A"}
- Award Location: ${doc.awardLocation || "N/A"}
- Summary: ${doc.summary}
- Metrics: GPA: ${doc.keyMetrics?.gpa || "N/A"}, Total Score: ${doc.keyMetrics?.totalScore || "N/A"}, Honors: ${doc.keyMetrics?.honors || "N/A"}
- Subjects/Grades: ${
        Array.isArray(doc.keyMetrics?.subjects) && doc.keyMetrics.subjects.length > 0
          ? doc.keyMetrics.subjects.map((s: any) => `${s.subject}: ${s.grade}`).join("; ")
          : "N/A"
      }`
  )
  .join("\n\n")}

CITATION REQUIREMENT:
When the user asks questions concerning their academic qualifications, grades, courses, institutions, GPA, or documents:
1. Answer accurately and specifically using the data from these verified documents.
2. ALWAYS provide an inline Markdown citation link referencing the document using this exact format:
   [Doc: <Issuing Institution / Doc Type>](#doc:<Document ID>)
   Example: "According to your University Marksheet ([Doc: University of California, Berkeley Marksheet](#doc:${vaultDocuments[0]?.id || "doc-id"})), you achieved a GPA of 3.85..."
This allows the user to click the citation and view the verified source record in their vault.`;
    }

    const systemInstruction = `You are Academic Vault AI, a personal academic mentor and reflective intelligence assistant.
Your goal is to help the user process their thoughts, track educational progress, analyze credentials, and reflect constructively.
Guidelines:
- Maintain an encouraging, scholarly, yet warm tone.
- When academic documents are referenced, be precise with numbers, honors, and dates.
- Keep formatting clean, using Markdown (subheadings, bullet points, or bold text) to ensure high readability.
- ${modeGuidance}
${customFocus ? `Special focus requested by user: ${customFocus}` : ""}${vaultContext}`;

    // Format chat contents for @google/genai
    const contents: any[] = [];

    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg && typeof msg === "object" && typeof msg.content === "string") {
          contents.push({
            role: msg.role === "model" || msg.role === "assistant" ? "model" : "user",
            parts: [{ text: String(msg.content) }],
          });
        }
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: String(prompt) }],
    });

    const result = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({
      text: result.text,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/gemini/reflect:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate reflection with Gemini. Please try again.",
    });
  }
});

// Summarization & Key Insights Endpoint
app.post("/api/gemini/summarize", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { text, existingTitle } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      res.status(400).json({ error: "Content text is required for summarization." });
      return;
    }

    const systemInstruction = `You are an expert reflective analyst. Analyze the following journal entry or reflection conversation.
Return a structured JSON object with these EXACT fields:
- "title": A concise, meaningful 3-6 word title capturing the essence (do not use generic titles like 'Daily Journal'). If existingTitle is provided and good, improve or refine it.
- "sentiment": A 1-2 word mood descriptor (e.g., 'Optimistic & Focused', 'Reflective & Anxious', 'Calm & Determined').
- "keyTakeaways": An array of 2-4 brief strings highlighting key realizations or discussion points.
- "actionStep": A single, realistic micro-action or mindfulness practice for tomorrow.

Return ONLY valid JSON with no backticks, or Markdown codeblock fences if needed.`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `Entry text:\n${text}\n\nExisting Title: ${existingTitle || "None"}`,
          },
        ],
      },
    ];

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        sentiment: { type: Type.STRING },
        keyTakeaways: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        actionStep: { type: Type.STRING },
      },
      required: ["title", "sentiment", "keyTakeaways", "actionStep"],
    };

    const result = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const defaultSummary = {
      title: existingTitle || "Reflective Journal Entry",
      sentiment: "Thoughtful",
      keyTakeaways: ["Recorded personal reflection and dialogue with Gemini."],
      actionStep: "Review your realizations tomorrow morning.",
    };

    const parsed = parseGeminiJsonResponse(result.text, defaultSummary);

    res.json({
      title: String(parsed.title || defaultSummary.title),
      sentiment: String(parsed.sentiment || defaultSummary.sentiment),
      keyTakeaways: Array.isArray(parsed.keyTakeaways) && parsed.keyTakeaways.length > 0
        ? parsed.keyTakeaways.map((t: any) => String(t))
        : defaultSummary.keyTakeaways,
      actionStep: String(parsed.actionStep || defaultSummary.actionStep),
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/gemini/summarize:", error);
    res.status(500).json({
      error: error?.message || "Failed to summarize reflection entry.",
    });
  }
});

// Vite middleware & Production Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

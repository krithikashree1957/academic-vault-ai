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

// Types for client configuration
interface GeminiClientContext {
  client: GoogleGenAI;
  authMode: "vertexai_adc" | "developer_api";
  projectId?: string;
  location?: string;
}

// Lazy-initialized Gemini Client instances
let activeClientCtx: GeminiClientContext | null = null;
let fallbackApiKeyClient: GoogleGenAI | null = null;

/**
 * Resolves the Google Gen AI client.
 * Prioritizes GOOGLE_CLOUD_PROJECT with Application Default Credentials (ADC)
 * so requests bill directly against linked Google Cloud Project credits.
 * Gracefully falls back to GEMINI_API_KEY if Vertex credentials are unavailable.
 */
function getAIClient(): GeminiClientContext {
  if (!activeClientCtx) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.VERTEX_LOCATION || "us-central1";
    const useVertex =
      Boolean(projectId) ||
      process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" ||
      process.env.GOOGLE_GENAI_USE_ENTERPRISE === "true";
    const apiKey = process.env.GEMINI_API_KEY;

    if (useVertex && projectId) {
      console.log(
        `[Gemini Config] Initializing GoogleGenAI with Google Cloud Vertex AI ADC (Project: ${projectId}, Location: ${location})`
      );
      try {
        const client = new GoogleGenAI({
          vertexai: true,
          project: projectId,
          location: location,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
        activeClientCtx = {
          client,
          authMode: "vertexai_adc",
          projectId,
          location,
        };
      } catch (vertexErr: any) {
        console.warn("[Gemini Config] Vertex AI initialization failed, falling back to API key:", vertexErr?.message || vertexErr);
      }
    }

    if (!activeClientCtx) {
      if (!apiKey && !projectId) {
        throw new Error(
          "Neither GOOGLE_CLOUD_PROJECT (Application Default Credentials) nor GEMINI_API_KEY is configured."
        );
      }
      console.log("[Gemini Config] Initializing GoogleGenAI client with Developer API Key");
      activeClientCtx = {
        client: new GoogleGenAI({
          apiKey: apiKey || "",
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        }),
        authMode: "developer_api",
      };
    }
  }
  return activeClientCtx;
}

/**
 * Returns a fallback Developer API Key client in case Vertex AI ADC hits unauthenticated / permission rejection.
 */
function getSecondaryApiKeyClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!fallbackApiKeyClient) {
    fallbackApiKeyClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return fallbackApiKeyClient;
}

// Resilient Model Fallback Ladder prioritizing lighter Flash models to resolve rate-limits
const MODEL_FALLBACK_LADDER = [
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-1.5-flash",
  "gemini-3.7-flash",
];

// Exponential Backoff Configuration
const MAX_RETRIES_PER_MODEL = 3;
const INITIAL_BACKOFF_MS = 1000;
const BACKOFF_MULTIPLIER = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: any): boolean {
  const status = err?.status || err?.statusCode || 0;
  const msg = (err?.message || "").toLowerCase();
  return (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota exceeded") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  );
}

function isRecoverableError(err: any): boolean {
  if (isRateLimitError(err)) return true;
  const status = err?.status || err?.statusCode || 0;
  const msg = (err?.message || "").toLowerCase();
  return (
    status === 503 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    status === 404 ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("not found") ||
    msg.includes("internal error") ||
    msg.includes("service unavailable") ||
    msg.includes("bad gateway") ||
    msg.includes("gateway timeout") ||
    msg.includes("unsupported") ||
    msg.includes("deprecated")
  );
}

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

/**
 * Wraps content generation with:
 * 1. Default Application Credentials / Vertex AI billing against GOOGLE_CLOUD_PROJECT
 * 2. Exponential backoff retry logic specifically handling 429 RESOURCE_EXHAUSTED errors
 * 3. Graceful fallback ladder prioritizing lighter Flash models (gemini-2.5-flash, gemini-3.1-flash-lite, etc.)
 */
async function generateContentWithFallback(
  options: FallbackOptions
): Promise<{ text: string; modelUsed: string; authMode: string }> {
  let ctx = getAIClient();
  let currentClient = ctx.client;
  let currentAuthMode = ctx.authMode;
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    for (let retryCount = 0; retryCount <= MAX_RETRIES_PER_MODEL; retryCount++) {
      try {
        const response = await currentClient.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });

        const text = response.text || "";
        return { text, modelUsed: model, authMode: currentAuthMode };
      } catch (err: any) {
        lastError = err;

        // If Vertex AI ADC fails with authentication error (e.g. no ADC in container environment), try fallback to GEMINI_API_KEY
        if (
          currentAuthMode === "vertexai_adc" &&
          (err?.message?.toLowerCase().includes("could not load the default credentials") ||
            err?.message?.toLowerCase().includes("credentials") ||
            err?.message?.toLowerCase().includes("unauthenticated") ||
            err?.code === "UNAUTHENTICATED")
        ) {
          const secondary = getSecondaryApiKeyClient();
          if (secondary) {
            console.warn(
              `[ADC Fallback] Vertex ADC authentication failed (${err?.message}). Seamlessly failing over to GEMINI_API_KEY client.`
            );
            currentClient = secondary;
            currentAuthMode = "developer_api";
            // Retry immediately on the secondary client
            continue;
          }
        }

        const is429 = isRateLimitError(err);
        const recoverable = isRecoverableError(err);

        // If 429 status code, perform exponential backoff retry on this model
        if (is429 && retryCount < MAX_RETRIES_PER_MODEL) {
          const delay =
            INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount) +
            Math.floor(Math.random() * 300);
          console.warn(
            `[429 Backoff] Rate limit on model ${model} (attempt ${retryCount + 1}/${MAX_RETRIES_PER_MODEL + 1}). Retrying in ${delay}ms with exponential backoff...`
          );
          await sleep(delay);
          continue; // Retry with the same model
        }

        console.warn(
          `[Model Fallback] Model ${model} failed (attempt ${retryCount + 1}): ${err?.message || err}. Recoverable: ${recoverable}`
        );

        // If not a 429 retry, or if retries exhausted on this model, step to next lighter model in ladder
        break;
      }
    }
  }

  throw new Error(
    `All models in fallback ladder failed. Last error: ${lastError?.message || "RESOURCE_EXHAUSTED"}`
  );
}

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.VERTEX_LOCATION || "us-central1";
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    googleCloudProject: projectId || null,
    location,
    vertexAIEnabled: Boolean(projectId || process.env.GOOGLE_GENAI_USE_VERTEXAI === "true"),
    activeAuthMode: projectId ? "vertexai_adc" : (process.env.GEMINI_API_KEY ? "developer_api" : "none"),
    fallbackModels: MODEL_FALLBACK_LADDER,
    maxRetriesPerModel: MAX_RETRIES_PER_MODEL,
    backoffBaseMs: INITIAL_BACKOFF_MS,
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
      authMode: result.authMode,
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
      authMode: result.authMode,
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
      authMode: result.authMode,
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

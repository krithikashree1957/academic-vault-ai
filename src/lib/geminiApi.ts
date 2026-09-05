import {
  ReflectionMode,
  ReflectionSummary,
  AcademicDocument,
  ExtractedDocumentData,
} from "../types";

export interface ReflectionRequestOptions {
  prompt: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
  reflectionMode?: ReflectionMode;
  customFocus?: string;
  vaultDocuments?: AcademicDocument[];
}

export interface ReflectionResponse {
  text: string;
  modelUsed: string;
}

export interface ExtractDocumentPayload {
  fileBase64: string;
  mimeType: string;
  fileName: string;
}

export interface ExtractDocumentResponse {
  data: ExtractedDocumentData;
  modelUsed: string;
}

/**
 * Sends document file (image/PDF) to Gemini for structured JSON extraction.
 */
export async function extractDocumentMetadata(
  payload: ExtractDocumentPayload
): Promise<ExtractDocumentResponse> {
  const response = await fetch("/api/gemini/extract-document", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.error) errorMsg = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Sends journal input, conversation context, and user's verified vault documents to the server-side Gemini route.
 */
export async function generateReflection(
  options: ReflectionRequestOptions
): Promise<ReflectionResponse> {
  const response = await fetch("/api/gemini/reflect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const data = await response.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Sends entry text for summarization and reflection breakdown.
 */
export async function summarizeReflection(
  text: string,
  existingTitle?: string
): Promise<ReflectionSummary & { modelUsed?: string }> {
  const response = await fetch("/api/gemini/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, existingTitle }),
  });

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const data = await response.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}


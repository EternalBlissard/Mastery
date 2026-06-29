import crypto from "node:crypto";
import https from "node:https";
import type { RetrievedChunk } from "./retrieval";

const SERVICE = "bedrock";
const DEFAULT_QUESTION_COUNT = 10;
const MAX_TOKENS = 8192;

export type GeneratedMCQ = {
  stem: string;
  options: [string, string, string, string];
  answerKey: string;
  explanation: string;
  sourcePage: number;
  sourceChunkId: string;
};

export type GenerateMCQsOptions = {
  count?: number;
};

type RawGeneratedQuestion = {
  stem?: unknown;
  options?: unknown;
  answerKey?: unknown;
  explanation?: unknown;
  sourcePage?: unknown;
  sourceChunkId?: unknown;
};

type ChunkMeta = {
  pageNumber: number | null;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function hmac(key: crypto.BinaryLike, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function hmacHex(key: crypto.BinaryLike, data: string): string {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest("hex");
}

function hashHex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function canonicalUri(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function signInvokeRequest(path: string, body: string) {
  const region = requireEnv("AWS_REGION");
  const host = `bedrock-runtime.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const payloadHash = hashHex(body);
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["POST", canonicalUri(path), "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hashHex(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${requireEnv("AWS_SECRET_ACCESS_KEY")}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmacHex(kSigning, stringToSign);

  return {
    host,
    amzDate,
    payloadHash,
    authorization: `AWS4-HMAC-SHA256 Credential=${requireEnv("AWS_ACCESS_KEY_ID")}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function buildGroundedPrompt(chunks: RetrievedChunk[], questionCount: number): string {
  const chunkBlocks = chunks
    .map((chunk) => {
      const pageLabel = chunk.pageNumber == null ? "unknown" : String(chunk.pageNumber);
      return [
        `--- CHUNK id=${chunk.id} page=${pageLabel} ---`,
        chunk.content.trim(),
        "--- END CHUNK ---",
      ].join("\n");
    })
    .join("\n\n");

  return [
    "You are an exam-prep question writer. Generate multiple-choice questions grounded ONLY in the source chunks below.",
    "",
    "STRICT RULES:",
    "1. Use ONLY the provided chunks as your factual source. Do not use outside knowledge.",
    "2. Write ORIGINAL questions — never copy or paraphrase real certification exam items.",
    "3. Each question MUST cite the EXACT source page number from its supporting chunk (the page field in the chunk header).",
    "4. Each question MUST set sourceChunkId to the id of the chunk that fully supports the answer.",
    "5. If a chunk does not contain enough material for a fair, well-grounded question, emit NO question for that chunk.",
    "6. Return valid JSON only — no markdown fences or commentary.",
    "",
    `Generate up to ${questionCount} grounded MCQs (fewer is fine when support is weak).`,
    "",
    "Output schema:",
    JSON.stringify(
      {
        questions: [
          {
            stem: "Question stem ending with ?",
            options: ["option A", "option B", "option C", "option D"],
            answerKey: "A",
            explanation: "Why the answer follows from the cited chunk.",
            sourcePage: 1,
            sourceChunkId: "chunk-uuid-from-headers",
          },
        ],
      },
      null,
      2,
    ),
    "",
    "answerKey must be exactly one of: A, B, C, D (matching the correct option index).",
    "",
    "SOURCE CHUNKS:",
    chunkBlocks,
  ].join("\n");
}

async function invokeGenerationModel(prompt: string): Promise<string> {
  const modelId = requireEnv("BEDROCK_GENERATION_MODEL");
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: MAX_TOKENS,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });
  const path = `/model/${encodeURIComponent(modelId)}/invoke`;
  const { host, amzDate, payloadHash, authorization } = signInvokeRequest(path, body);

  const responseBody = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      {
        hostname: host,
        method: "POST",
        path,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "X-Amz-Date": amzDate,
          "X-Amz-Content-Sha256": payloadHash,
          Authorization: authorization,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
            return;
          }

          let message = data;
          try {
            const parsed = JSON.parse(data) as { message?: string; Message?: string };
            message = parsed.message || parsed.Message || data;
          } catch {
            // keep raw body
          }
          reject(new Error(message || `Bedrock invoke status ${res.statusCode}`));
        });
      },
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });

  const parsed = JSON.parse(responseBody) as {
    content?: Array<{ type?: string; text?: string }>;
    completion?: string;
    generations?: Array<{ text?: string }>;
  };

  const textBlocks = parsed.content
    ?.filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string);
  if (textBlocks && textBlocks.length > 0) {
    return textBlocks.join("\n");
  }

  if (typeof parsed.completion === "string") {
    return parsed.completion;
  }

  const generationText = parsed.generations?.[0]?.text;
  if (typeof generationText === "string") {
    return generationText;
  }

  throw new Error("Bedrock generation response missing text content");
}

function extractJsonPayload(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const arrayStart = trimmed.indexOf("{");
  const arrayEnd = trimmed.lastIndexOf("}");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return JSON.parse(trimmed.slice(arrayStart, arrayEnd + 1));
  }

  throw new Error("Model response did not contain parseable JSON");
}

function normalizeAnswerKey(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const raw = String(value).trim().toUpperCase();
  if (raw === "A" || raw === "B" || raw === "C" || raw === "D") {
    return raw;
  }

  const index = Number(raw);
  if (Number.isInteger(index) && index >= 0 && index <= 3) {
    return ["A", "B", "C", "D"][index] ?? null;
  }

  return null;
}

function normalizeOptions(value: unknown): [string, string, string, string] | null {
  if (!Array.isArray(value) || value.length !== 4) {
    return null;
  }

  const options = value.map((option) => (typeof option === "string" ? option.trim() : ""));
  if (options.some((option) => !option)) {
    return null;
  }

  return options as [string, string, string, string];
}

function parseSourcePage(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

function isGrounded(
  sourceChunkId: string,
  sourcePage: number,
  chunkMeta: Map<string, ChunkMeta>,
): boolean {
  const meta = chunkMeta.get(sourceChunkId);
  if (!meta) {
    return false;
  }
  if (meta.pageNumber == null) {
    return false;
  }
  return meta.pageNumber === sourcePage;
}

function validateQuestion(
  raw: RawGeneratedQuestion,
  chunkMeta: Map<string, ChunkMeta>,
): GeneratedMCQ | null {
  const stem = typeof raw.stem === "string" ? raw.stem.trim() : "";
  const explanation = typeof raw.explanation === "string" ? raw.explanation.trim() : "";
  const sourceChunkId = typeof raw.sourceChunkId === "string" ? raw.sourceChunkId.trim() : "";
  const options = normalizeOptions(raw.options);
  const answerKey = normalizeAnswerKey(raw.answerKey);
  const sourcePage = parseSourcePage(raw.sourcePage);

  if (!stem || !explanation || !sourceChunkId || !options || !answerKey || sourcePage == null) {
    return null;
  }

  if (!isGrounded(sourceChunkId, sourcePage, chunkMeta)) {
    return null;
  }

  return {
    stem,
    options,
    answerKey,
    explanation,
    sourcePage,
    sourceChunkId,
  };
}

function parseGeneratedQuestions(text: string, chunkMeta: Map<string, ChunkMeta>): GeneratedMCQ[] {
  const payload = extractJsonPayload(text);
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { questions?: unknown }).questions)
      ? (payload as { questions: RawGeneratedQuestion[] }).questions
      : null;

  if (!list) {
    return [];
  }

  const validated: GeneratedMCQ[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const item = validateQuestion(raw as RawGeneratedQuestion, chunkMeta);
    if (item) {
      validated.push(item);
    }
  }

  return validated;
}

export async function generateMCQs(
  chunks: RetrievedChunk[],
  opts: GenerateMCQsOptions = {},
): Promise<GeneratedMCQ[]> {
  if (chunks.length === 0) {
    return [];
  }

  const requested = opts.count ?? DEFAULT_QUESTION_COUNT;
  const questionCount = Math.max(1, Math.floor(requested));
  const chunkMeta = new Map<string, ChunkMeta>(
    chunks.map((chunk) => [chunk.id, { pageNumber: chunk.pageNumber }]),
  );

  const prompt = buildGroundedPrompt(chunks, questionCount);
  const responseText = await invokeGenerationModel(prompt);
  return parseGeneratedQuestions(responseText, chunkMeta);
}

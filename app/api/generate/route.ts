import crypto from "node:crypto";
import { executeDataStatement } from "../../../db/data-api";
import { FREE_MAX_QUESTIONS_PER_DOC, hasProPlan } from "../../../lib/billing";
import { generateMCQs } from "../../../lib/generate";
import { retrieveTopChunks } from "../../../lib/retrieval";

export const runtime = "nodejs";

const DEFAULT_QUESTION_COUNT = 10;
const DEFAULT_RETRIEVAL_K = 20;

type GenerateRequestBody = {
  goalId?: string;
  objectiveId?: string;
  topic?: string;
  count?: number;
};

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNullableString(value: string | null | undefined): string {
  if (value == null || value === "") {
    return "NULL";
  }
  return sqlString(value);
}

function sqlNullableUuid(value: string | null | undefined): string {
  if (value == null || value === "") {
    return "NULL";
  }
  return `'${value}'::uuid`;
}

function sqlJson(value: unknown): string {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function maxQuestionsPerDoc(): number {
  const raw = process.env.MAX_QUESTIONS_PER_DOC;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return 20;
}

function contentHash(stem: string, options: [string, string, string, string]): string {
  return crypto.createHash("sha256").update(`${stem}\n${options.join("\n")}`, "utf8").digest("hex");
}

function recordString(result: Awaited<ReturnType<typeof executeDataStatement>>, column = 0): string {
  const value = result.records?.[0]?.[column]?.stringValue;
  if (!value) {
    throw new Error("Expected string value from Data API response");
  }
  return value;
}

async function updateGenerationJob(
  jobId: string,
  fields: {
    status?: string;
    step?: string;
    generated?: number;
    error?: string | null;
  },
): Promise<void> {
  const sets: string[] = ["updated_at = now()"];
  if (fields.status !== undefined) {
    sets.push(`status = ${sqlString(fields.status)}`);
  }
  if (fields.step !== undefined) {
    sets.push(`step = ${sqlString(fields.step)}`);
  }
  if (fields.generated !== undefined) {
    sets.push(`generated = ${fields.generated}`);
  }
  if (fields.error !== undefined) {
    sets.push(`error = ${fields.error === null ? "NULL" : sqlString(fields.error)}`);
  }

  await executeDataStatement(`
    UPDATE generation_jobs
    SET ${sets.join(", ")}
    WHERE id = '${jobId}'::uuid
  `);
}

async function createGenerationJob(
  goalId: string,
  objectiveId: string | null,
  requested: number,
): Promise<string> {
  const result = await executeDataStatement(`
    INSERT INTO generation_jobs (goal_id, objective_id, status, step, requested, generated)
    VALUES (
      '${goalId}'::uuid,
      ${sqlNullableUuid(objectiveId)},
      'queued',
      'queued',
      ${requested},
      0
    )
    RETURNING id
  `);
  return recordString(result);
}

export async function POST(request: Request) {
  let jobId: string | undefined;

  try {
    const body = (await request.json()) as GenerateRequestBody;
    const goalId = String(body.goalId ?? "").trim();
    const objectiveId = body.objectiveId ? String(body.objectiveId).trim() : undefined;
    const topic = body.topic ? String(body.topic).trim() : undefined;

    if (!goalId || !isUuid(goalId)) {
      return Response.json({ error: "goalId must be a valid UUID" }, { status: 400 });
    }

    if (objectiveId && !isUuid(objectiveId)) {
      return Response.json({ error: "objectiveId must be a valid UUID" }, { status: 400 });
    }

    if (!objectiveId && !topic) {
      return Response.json({ error: "Either objectiveId or topic is required" }, { status: 400 });
    }

    // Billing gate: Pro gets the full per-doc budget; free (and server-to-server auto-gen) is capped lower.
    const pro = await hasProPlan();
    const budgetCap = pro ? maxQuestionsPerDoc() : Math.min(maxQuestionsPerDoc(), FREE_MAX_QUESTIONS_PER_DOC);
    const requestedRaw = body.count ?? DEFAULT_QUESTION_COUNT;
    const requested = Math.min(
      budgetCap,
      Math.max(1, Math.floor(Number.isFinite(requestedRaw) ? requestedRaw : DEFAULT_QUESTION_COUNT)),
    );

    jobId = await createGenerationJob(goalId, objectiveId ?? null, requested);
    await updateGenerationJob(jobId, { status: "processing", step: "retrieving" });

    const retrievalK = Math.min(DEFAULT_RETRIEVAL_K, Math.max(requested * 2, 10));
    const chunks = await retrieveTopChunks({
      goalId,
      objectiveId,
      query: topic,
      k: retrievalK,
    });

    if (chunks.length === 0) {
      throw new Error("No embedded chunks found for this goal");
    }

    await updateGenerationJob(jobId, { step: "generating" });
    const questions = await generateMCQs(chunks, { count: requested });

    await updateGenerationJob(jobId, { step: "inserting" });

    let inserted = 0;
    for (const question of questions) {
      const hash = contentHash(question.stem, question.options);
      const result = await executeDataStatement(`
        INSERT INTO items (
          goal_id,
          objective_id,
          source_chunk_id,
          type,
          stem,
          answer_key,
          distractors,
          explanation,
          source_page,
          content_hash
        )
        VALUES (
          '${goalId}'::uuid,
          ${sqlNullableUuid(objectiveId ?? null)},
          '${question.sourceChunkId}'::uuid,
          'mcq',
          ${sqlString(question.stem)},
          ${sqlString(question.answerKey)},
          ${sqlJson(question.options)},
          ${sqlString(question.explanation)},
          ${question.sourcePage},
          ${sqlString(hash)}
        )
        ON CONFLICT (goal_id, content_hash) DO NOTHING
      `);

      if ((result.numberOfRecordsUpdated ?? 0) > 0) {
        inserted += 1;
      }
    }

    await updateGenerationJob(jobId, {
      status: "done",
      step: "complete",
      generated: inserted,
      error: null,
    });

    return Response.json({
      ok: true,
      jobId,
      goalId,
      requested,
      generated: inserted,
      retrievedChunks: chunks.length,
      modelQuestions: questions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";

    if (jobId) {
      try {
        await updateGenerationJob(jobId, { status: "error", error: message });
      } catch {
        // best-effort error persistence
      }
    }

    return Response.json({ error: message }, { status: 500 });
  }
}

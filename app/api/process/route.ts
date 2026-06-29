import { executeDataStatement } from "../../../db/data-api";
import { embedText } from "../../../lib/bedrock";
import { chunkDocument } from "../../../lib/chunk";
import { getDocumentObject } from "../../../lib/s3";

export const runtime = "nodejs";

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNullableString(value: string | null | undefined): string {
  if (value == null || value === "") {
    return "NULL";
  }
  return sqlString(value);
}

function sqlNullableInt(value: number | null | undefined): string {
  if (value == null) {
    return "NULL";
  }
  return String(value);
}

function vectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function updateJob(
  jobId: string,
  fields: { status?: string; step?: string; progressPct?: number; error?: string | null },
): Promise<void> {
  const sets: string[] = ["updated_at = now()"];
  if (fields.status !== undefined) {
    sets.push(`status = ${sqlString(fields.status)}`);
  }
  if (fields.step !== undefined) {
    sets.push(`step = ${sqlString(fields.step)}`);
  }
  if (fields.progressPct !== undefined) {
    sets.push(`progress_pct = ${fields.progressPct}`);
  }
  if (fields.error !== undefined) {
    sets.push(`error = ${fields.error === null ? "NULL" : sqlString(fields.error)}`);
  }

  await executeDataStatement(`
    UPDATE ingestion_jobs
    SET ${sets.join(", ")}
    WHERE id = '${jobId}'::uuid
  `);
}

async function loadQueuedJob(documentId: string): Promise<{ jobId: string; s3Key: string }> {
  const result = await executeDataStatement(`
    SELECT j.id, d.s3_key
    FROM documents d
    JOIN ingestion_jobs j ON j.document_id = d.id
    WHERE d.id = '${documentId}'::uuid
      AND j.status = 'queued'
    ORDER BY j.updated_at DESC
    LIMIT 1
  `);

  const row = result.records?.[0];
  const jobId = row?.[0]?.stringValue;
  const s3Key = row?.[1]?.stringValue;
  if (!jobId || !s3Key) {
    throw new Error("No queued ingestion job found for document");
  }

  return { jobId, s3Key };
}

export async function POST(request: Request) {
  let jobId: string | undefined;

  try {
    const body = (await request.json()) as { documentId?: string };
    const documentId = String(body.documentId ?? "").trim();

    if (!documentId || !isUuid(documentId)) {
      return Response.json({ error: "documentId must be a valid UUID" }, { status: 400 });
    }

    const job = await loadQueuedJob(documentId);
    jobId = job.jobId;

    await updateJob(jobId, { status: "processing", step: "fetching", progressPct: 5 });

    const pdfBuffer = await getDocumentObject(job.s3Key);

    await updateJob(jobId, { step: "chunking", progressPct: 10 });
    const chunks = await chunkDocument(pdfBuffer);

    if (chunks.length === 0) {
      throw new Error("No text chunks extracted from PDF");
    }

    await updateJob(jobId, { step: "embedding", progressPct: 15 });

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const embedding = await embedText(chunk.content);

      await executeDataStatement(`
        INSERT INTO chunks (
          document_id,
          chunk_index,
          content,
          page_number,
          section_heading,
          token_count,
          embedding
        )
        VALUES (
          '${documentId}'::uuid,
          ${index},
          ${sqlString(chunk.content)},
          ${sqlNullableInt(chunk.pageNumber)},
          ${sqlNullableString(chunk.sectionHeading)},
          ${chunk.tokenCount},
          '${vectorLiteral(embedding)}'::vector
        )
        ON CONFLICT (document_id, chunk_index) DO NOTHING
      `);

      const embedProgress = 15 + Math.floor(((index + 1) / chunks.length) * 80);
      await updateJob(jobId, { step: "embedding", progressPct: embedProgress });
    }

    await updateJob(jobId, {
      status: "done",
      step: "complete",
      progressPct: 100,
      error: null,
    });

    return Response.json({ ok: true, jobId, documentId, chunksProcessed: chunks.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";

    if (jobId) {
      try {
        await updateJob(jobId, { status: "error", error: message });
      } catch {
        // best-effort error persistence
      }
    }

    const status = message.includes("No queued ingestion job") ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}

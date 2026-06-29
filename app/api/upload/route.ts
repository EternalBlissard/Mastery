import crypto from "node:crypto";
import { after } from "next/server";
import { executeDataStatement } from "../../../db/data-api";
import { getOrCreateUser } from "../../../lib/auth";
import { putDocumentObject } from "../../../lib/s3";

export const runtime = "nodejs";

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function recordString(result: Awaited<ReturnType<typeof executeDataStatement>>, column = 0): string {
  const value = result.records?.[0]?.[column]?.stringValue;
  if (!value) {
    throw new Error("Expected string value from Data API response");
  }
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function processUrl(request: Request): string {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}/api/process`;
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return `https://${vercel}/api/process`;
  }
  return "http://localhost:3000/api/process";
}

function triggerProcessing(request: Request, documentId: string): void {
  const url = processUrl(request);
  after(() => {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    }).catch(() => undefined);
  });
}

export async function POST(request: Request) {
  try {
    const userId = await getOrCreateUser();
    const formData = await request.formData();
    const fileField = formData.get("file");
    const goalId = String(formData.get("goalId") ?? "").trim();

    if (!(fileField instanceof File)) {
      return Response.json({ error: "Missing file field" }, { status: 400 });
    }
    if (!goalId) {
      return Response.json({ error: "goalId is required" }, { status: 400 });
    }
    if (!isUuid(goalId)) {
      return Response.json({ error: "goalId must be a UUID" }, { status: 400 });
    }

    const filename = fileField.name || "document.pdf";
    const contentType = fileField.type || "application/pdf";
    const buffer = Buffer.from(await fileField.arrayBuffer());
    if (buffer.length === 0) {
      return Response.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    const contentSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const documentId = crypto.randomUUID();
    const s3Key = `documents/${documentId}/${filename}`;

    await putDocumentObject(s3Key, buffer, contentType);

    await executeDataStatement(`
      INSERT INTO documents (id, user_id, goal_id, filename, s3_key, status, content_sha256)
      VALUES (
        '${documentId}'::uuid,
        '${userId}'::uuid,
        '${goalId}'::uuid,
        ${sqlString(filename)},
        ${sqlString(s3Key)},
        'queued',
        ${sqlString(contentSha256)}
      )
    `);

    const jobResult = await executeDataStatement(`
      INSERT INTO ingestion_jobs (document_id, status, progress_pct)
      VALUES ('${documentId}'::uuid, 'queued', 0)
      RETURNING id
    `);
    const jobId = recordString(jobResult);

    triggerProcessing(request, documentId);

    return Response.json({ documentId, jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const status = message === "Not authenticated" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

import { executeDataStatement } from "../../../../db/data-api";

export const runtime = "nodejs";

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function processUrl(request: Request): string {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) {
    return `${proto}://${host}/api/process`;
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return `https://${vercel}/api/process`;
  }
  return "http://localhost:3000/api/process";
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await executeDataStatement(`
      SELECT document_id
      FROM ingestion_jobs
      WHERE status = 'queued'
         OR (status = 'processing' AND updated_at < now() - interval '5 minutes')
    `);

    await executeDataStatement(`
      UPDATE ingestion_jobs
      SET status = 'queued', updated_at = now()
      WHERE status = 'processing'
        AND updated_at < now() - interval '5 minutes'
    `);

    const documentIds: string[] = [];
    for (const row of result.records ?? []) {
      const documentId = row?.[0]?.stringValue;
      if (documentId) {
        documentIds.push(documentId);
      }
    }

    const url = processUrl(request);
    for (const documentId of documentIds) {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      }).catch(() => undefined);
    }

    return Response.json({ ok: true, triggered: documentIds.length, documentIds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron processing failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

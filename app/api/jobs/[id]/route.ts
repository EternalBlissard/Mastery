import { executeDataStatement } from "../../../../db/data-api";

export const runtime = "nodejs";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const jobId = String(id ?? "").trim();

    if (!jobId || !isUuid(jobId)) {
      return Response.json({ error: "id must be a valid UUID" }, { status: 400 });
    }

    const result = await executeDataStatement(`
      SELECT status, step, progress_pct
      FROM ingestion_jobs
      WHERE id = '${jobId}'::uuid
    `);

    const row = result.records?.[0];
    const status = row?.[0]?.stringValue;
    if (!status) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    const stepField = row[1];
    const step = stepField?.isNull ? null : (stepField?.stringValue ?? null);
    const progressField = row[2];
    const progressPct = progressField?.longValue ?? progressField?.doubleValue ?? 0;

    return Response.json({ status, step, progressPct });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch job status";
    return Response.json({ error: message }, { status: 500 });
  }
}

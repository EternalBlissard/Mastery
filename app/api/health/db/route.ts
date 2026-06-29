import { runDataApiHealthCheck, runDataApiVectorHealthCheck } from "../../../../db/data-api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const database = await runDataApiHealthCheck();
    const vector = await runDataApiVectorHealthCheck();
    return Response.json({
      ok: database.ok && vector.ok,
      database,
      vector,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

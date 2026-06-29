import { executeDataStatement } from "../../../db/data-api";
import { getOrCreateUser } from "../../../lib/auth";

export const runtime = "nodejs";

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

type Goal = {
  id: string;
  title: string;
  mode: string;
  certificationCode: string | null;
};

function mapGoals(result: Awaited<ReturnType<typeof executeDataStatement>>): Goal[] {
  return (result.records ?? []).map((row) => ({
    id: row[0]?.stringValue ?? "",
    title: row[1]?.stringValue ?? "",
    mode: row[2]?.stringValue ?? "combined",
    certificationCode: row[3]?.isNull ? null : row[3]?.stringValue ?? null,
  }));
}

export async function GET() {
  try {
    const userId = await getOrCreateUser();
    const result = await executeDataStatement(`
      SELECT g.id, g.title, g.mode, c.code
      FROM goals g
      LEFT JOIN certifications c ON c.id = g.certification_id
      WHERE g.user_id = '${userId}'::uuid
      ORDER BY g.created_at DESC
    `);
    return Response.json({ goals: mapGoals(result) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load goals";
    const status = message === "Not authenticated" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

const VALID_MODES = new Set(["cert", "own", "combined"]);

export async function POST(request: Request) {
  try {
    const userId = await getOrCreateUser();
    const body = (await request.json()) as { title?: string; mode?: string; certificationCode?: string };

    const title = String(body.title ?? "").trim();
    if (!title) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }
    const mode = VALID_MODES.has(String(body.mode)) ? String(body.mode) : "combined";
    const certCode = body.certificationCode ? String(body.certificationCode).trim() : "CLF-C02";

    // Resolve the certification (may be null for an "own"-materials-only goal).
    const certResult = await executeDataStatement(
      `SELECT id FROM certifications WHERE code = ${sqlString(certCode)} LIMIT 1`,
    );
    const certId = certResult.records?.[0]?.[0]?.stringValue ?? null;
    const certLiteral = certId ? `'${certId}'::uuid` : "NULL";

    const result = await executeDataStatement(`
      INSERT INTO goals (user_id, certification_id, title, mode)
      VALUES ('${userId}'::uuid, ${certLiteral}, ${sqlString(title)}, ${sqlString(mode)})
      RETURNING id
    `);
    const id = result.records?.[0]?.[0]?.stringValue;
    if (!id) {
      throw new Error("Failed to create goal");
    }
    return Response.json({ id, title, mode, certificationCode: certId ? certCode : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create goal";
    const status = message === "Not authenticated" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

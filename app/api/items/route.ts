import { executeDataStatement } from "../../../db/data-api";

export const runtime = "nodejs";

type DataApiField = {
  stringValue?: string;
  longValue?: number;
  doubleValue?: number;
  booleanValue?: boolean;
  isNull?: boolean;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function fieldString(field: DataApiField | undefined): string | null {
  if (!field || field.isNull) {
    return null;
  }
  return field.stringValue ?? null;
}

function fieldInt(field: DataApiField | undefined): number | null {
  if (!field || field.isNull) {
    return null;
  }
  if (field.longValue != null) {
    return field.longValue;
  }
  if (field.doubleValue != null) {
    return Math.trunc(field.doubleValue);
  }
  return null;
}

function parseOptions(field: DataApiField | undefined): string[] {
  const raw = fieldString(field);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
      return parsed;
    }
  } catch {
    // ignore malformed JSONB
  }
  return [];
}

export async function GET(request: Request) {
  try {
    const goalId = String(new URL(request.url).searchParams.get("goalId") ?? "").trim();

    if (!goalId || !isUuid(goalId)) {
      return Response.json({ error: "goalId must be a valid UUID" }, { status: 400 });
    }

    const result = await executeDataStatement(`
      SELECT
        i.id,
        i.stem,
        i.distractors,
        i.answer_key,
        i.explanation,
        i.source_page,
        d.filename
      FROM items i
      JOIN chunks c ON i.source_chunk_id = c.id
      JOIN documents d ON c.document_id = d.id
      WHERE i.goal_id = '${goalId}'::uuid
        AND i.type = 'mcq'
      ORDER BY i.created_at
    `);

    const items = (result.records ?? [])
      .map((row) => {
        const id = fieldString(row[0]);
        if (!id) {
          return null;
        }
        return {
          id,
          stem: fieldString(row[1]) ?? "",
          options: parseOptions(row[2]),
          answer_key: fieldString(row[3]) ?? "",
          explanation: fieldString(row[4]),
          source_page: fieldInt(row[5]),
          filename: fieldString(row[6]) ?? "",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return Response.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch items";
    return Response.json({ error: message }, { status: 500 });
  }
}

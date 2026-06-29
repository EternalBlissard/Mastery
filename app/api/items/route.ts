import { executeDataStatement } from "../../../db/data-api";
import { getOrCreateUser } from "../../../lib/auth";

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

function mapItemRows(records: DataApiField[][] | undefined) {
  return (records ?? [])
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
}

const itemSelect = `
  SELECT
    i.id,
    i.stem,
    i.distractors,
    i.answer_key,
    i.explanation,
    i.source_page,
    d.filename
`;

const itemJoins = `
  FROM items i
  JOIN chunks c ON i.source_chunk_id = c.id
  JOIN documents d ON c.document_id = d.id
`;

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const goalId = String(params.get("goalId") ?? "").trim();
    const showAll = params.get("all") === "1";

    if (!goalId || !isUuid(goalId)) {
      return Response.json({ error: "goalId must be a valid UUID" }, { status: 400 });
    }

    const totalResult = await executeDataStatement(`
      SELECT COUNT(*)::bigint AS total
      FROM items
      WHERE goal_id = '${goalId}'::uuid
        AND type = 'mcq'
    `);
    const totalInGoal = fieldInt(totalResult.records?.[0]?.[0]) ?? 0;

    if (showAll) {
      const result = await executeDataStatement(`
        ${itemSelect}
        ${itemJoins}
        WHERE i.goal_id = '${goalId}'::uuid
          AND i.type = 'mcq'
        ORDER BY i.created_at
      `);

      const items = mapItemRows(result.records);
      return Response.json({
        items,
        totalInGoal,
        dueNow: items.length,
        queue: "all",
      });
    }

    const userId = await getOrCreateUser();

    const result = await executeDataStatement(`
      ${itemSelect}
      ${itemJoins}
      LEFT JOIN review_state rs
        ON rs.item_id = i.id
        AND rs.user_id = '${userId}'::uuid
      WHERE i.goal_id = '${goalId}'::uuid
        AND i.type = 'mcq'
        AND (
          rs.id IS NULL
          OR rs.due IS NULL
          OR rs.due <= now()
        )
      ORDER BY rs.due NULLS FIRST, i.created_at
    `);

    const items = mapItemRows(result.records);

    return Response.json({
      items,
      totalInGoal,
      dueNow: items.length,
      queue: "due",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch items";
    const status = message === "Not authenticated" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

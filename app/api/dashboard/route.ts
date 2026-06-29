import { executeDataStatement } from "../../../db/data-api";
import { BKT_PRIOR } from "../../../lib/bkt";

export const runtime = "nodejs";

type DataApiField = {
  stringValue?: string;
  longValue?: number;
  doubleValue?: number;
  booleanValue?: boolean;
  isNull?: boolean;
};

type ObjectiveRow = {
  id: string;
  title: string;
  pKnown: number;
  weightPct: number | null;
  covered: boolean;
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

function fieldDouble(field: DataApiField | undefined): number | null {
  if (!field || field.isNull) {
    return null;
  }
  if (field.doubleValue != null) {
    return field.doubleValue;
  }
  if (field.longValue != null) {
    return field.longValue;
  }
  return null;
}

function fieldBoolean(field: DataApiField | undefined): boolean {
  if (!field || field.isNull) {
    return false;
  }
  return field.booleanValue === true;
}

function computeOverallReadiness(rows: ObjectiveRow[]): number {
  if (rows.length === 0) {
    return 0;
  }

  const hasWeights = rows.every((row) => row.weightPct != null && row.weightPct > 0);
  if (hasWeights) {
    const totalWeight = rows.reduce((sum, row) => sum + (row.weightPct ?? 0), 0);
    if (totalWeight > 0) {
      const weighted = rows.reduce((sum, row) => sum + row.pKnown * (row.weightPct ?? 0), 0);
      return weighted / totalWeight;
    }
  }

  return rows.reduce((sum, row) => sum + row.pKnown, 0) / rows.length;
}

function computeCoverage(rows: ObjectiveRow[]): number {
  if (rows.length === 0) {
    return 0;
  }
  const coveredCount = rows.filter((row) => row.covered).length;
  return coveredCount / rows.length;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const userId = String(params.get("userId") ?? "").trim();
    const goalId = String(params.get("goalId") ?? "").trim();

    if (!userId || !isUuid(userId)) {
      return Response.json({ error: "userId must be a valid UUID" }, { status: 400 });
    }
    if (!goalId || !isUuid(goalId)) {
      return Response.json({ error: "goalId must be a valid UUID" }, { status: 400 });
    }

    const goalResult = await executeDataStatement(`
      SELECT certification_id
      FROM goals
      WHERE id = '${goalId}'::uuid
      LIMIT 1
    `);
    if (!goalResult.records?.[0]) {
      return Response.json({ error: "Goal not found" }, { status: 404 });
    }

    const objectivesResult = await executeDataStatement(`
      SELECT
        o.id,
        o.title,
        COALESCE(m.p_known, ${BKT_PRIOR}) AS p_known,
        o.weight_pct,
        EXISTS (
          SELECT 1
          FROM items i
          WHERE i.goal_id = '${goalId}'::uuid
            AND i.objective_id = o.id
        ) AS covered
      FROM goals g
      JOIN objectives o ON o.certification_id = g.certification_id
      LEFT JOIN mastery m
        ON m.user_id = '${userId}'::uuid
        AND m.objective_id = o.id
      WHERE g.id = '${goalId}'::uuid
      ORDER BY o.sequence NULLS LAST, o.title
    `);

    const objectiveRows: ObjectiveRow[] = (objectivesResult.records ?? [])
      .map((row) => {
        const id = fieldString(row[0]);
        if (!id) {
          return null;
        }
        return {
          id,
          title: fieldString(row[1]) ?? "",
          pKnown: fieldDouble(row[2]) ?? BKT_PRIOR,
          weightPct: fieldDouble(row[3]),
          covered: fieldBoolean(row[4]),
        };
      })
      .filter((row): row is ObjectiveRow => row !== null);

    const dueResult = await executeDataStatement(`
      SELECT COUNT(*)::bigint AS due_today
      FROM review_state
      WHERE user_id = '${userId}'::uuid
        AND due IS NOT NULL
        AND due <= now()
    `);

    const completedResult = await executeDataStatement(`
      SELECT COUNT(*)::bigint AS questions_completed
      FROM review_log
      WHERE user_id = '${userId}'::uuid
    `);

    const overallReadiness = computeOverallReadiness(objectiveRows);
    const coverage = computeCoverage(objectiveRows);
    const dueToday = fieldInt(dueResult.records?.[0]?.[0]) ?? 0;
    const questionsCompleted = fieldInt(completedResult.records?.[0]?.[0]) ?? 0;

    return Response.json({
      overallReadiness,
      dueToday,
      questionsCompleted,
      coverage,
      objectives: objectiveRows.map(({ id, title, pKnown, covered }) => ({
        id,
        title,
        pKnown,
        covered,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard";
    return Response.json({ error: message }, { status: 500 });
  }
}

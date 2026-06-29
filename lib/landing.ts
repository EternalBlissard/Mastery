import { auth } from "@clerk/nextjs/server";
import { executeDataStatement } from "../db/data-api";
import { BKT_PRIOR } from "./bkt";

type DataApiField = {
  stringValue?: string;
  longValue?: number;
  doubleValue?: number;
  booleanValue?: boolean;
  isNull?: boolean;
};

export type LandingStats = {
  goalId: string;
  dueToday: number;
  questionsCompleted: number;
  coverage: number; // 0..1
  mastery: number; // 0..1 (overall readiness)
  latestQuestion: { stem: string; page: number | null; filename: string | null } | null;
};

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
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
  return field?.booleanValue === true;
}

/**
 * Live stats for the landing hero. Read-only: looks up the internal user by clerk_id without
 * creating a row, so visiting "/" never mutates state. Returns null whenever there is nothing
 * real to show (signed out, no goal, or no generated questions yet) so the page can fall back
 * to the illustrative sample card.
 */
export async function getLandingStats(): Promise<LandingStats | null> {
  let clerkId: string | null = null;
  try {
    clerkId = (await auth()).userId;
  } catch {
    return null;
  }
  if (!clerkId) {
    return null;
  }

  try {
    const userResult = await executeDataStatement(
      `SELECT id FROM users WHERE clerk_id = ${sqlString(clerkId)} LIMIT 1`,
    );
    const userId = fieldString(userResult.records?.[0]?.[0]);
    if (!userId) {
      return null;
    }

    const goalResult = await executeDataStatement(`
      SELECT id
      FROM goals
      WHERE user_id = '${userId}'::uuid
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const goalId = fieldString(goalResult.records?.[0]?.[0]);
    if (!goalId) {
      return null;
    }

    // Latest generated question for this goal, with the page + filename it was grounded in.
    const latestResult = await executeDataStatement(`
      SELECT
        i.stem,
        i.source_page,
        (
          SELECT d.filename
          FROM chunks c
          JOIN documents d ON d.id = c.document_id
          WHERE c.id = i.source_chunk_id
        ) AS filename
      FROM items i
      WHERE i.goal_id = '${goalId}'::uuid
        AND i.type = 'mcq'
      ORDER BY i.created_at DESC
      LIMIT 1
    `);
    const latestRow = latestResult.records?.[0];
    const latestStem = fieldString(latestRow?.[0]);
    // No questions generated yet → nothing real to show; let the page use the sample card.
    if (!latestStem) {
      return null;
    }

    const objectivesResult = await executeDataStatement(`
      SELECT
        COALESCE(m.p_known, ${BKT_PRIOR}) AS p_known,
        o.weight_pct,
        EXISTS (
          SELECT 1 FROM items i
          WHERE i.goal_id = '${goalId}'::uuid AND i.objective_id = o.id
        ) AS covered
      FROM goals g
      JOIN objectives o ON o.certification_id = g.certification_id
      LEFT JOIN mastery m ON m.user_id = '${userId}'::uuid AND m.objective_id = o.id
      WHERE g.id = '${goalId}'::uuid
    `);
    const objectiveRows = (objectivesResult.records ?? []).map((row) => ({
      pKnown: fieldDouble(row[0]) ?? BKT_PRIOR,
      weightPct: fieldDouble(row[1]),
      covered: fieldBoolean(row[2]),
    }));

    let mastery = 0;
    let coverage = 0;
    if (objectiveRows.length > 0) {
      const hasWeights = objectiveRows.every((r) => r.weightPct != null && r.weightPct > 0);
      const totalWeight = objectiveRows.reduce((s, r) => s + (r.weightPct ?? 0), 0);
      mastery =
        hasWeights && totalWeight > 0
          ? objectiveRows.reduce((s, r) => s + r.pKnown * (r.weightPct ?? 0), 0) / totalWeight
          : objectiveRows.reduce((s, r) => s + r.pKnown, 0) / objectiveRows.length;
      coverage = objectiveRows.filter((r) => r.covered).length / objectiveRows.length;
    }

    const dueResult = await executeDataStatement(`
      SELECT COUNT(*)::bigint
      FROM review_state rs
      JOIN items i ON i.id = rs.item_id
      WHERE rs.user_id = '${userId}'::uuid
        AND i.goal_id = '${goalId}'::uuid
        AND rs.due IS NOT NULL
        AND rs.due <= now()
    `);
    const dueToday = fieldInt(dueResult.records?.[0]?.[0]) ?? 0;

    const completedResult = await executeDataStatement(`
      SELECT COUNT(*)::bigint
      FROM review_log rl
      JOIN items i ON i.id = rl.item_id
      WHERE rl.user_id = '${userId}'::uuid
        AND i.goal_id = '${goalId}'::uuid
    `);
    const questionsCompleted = fieldInt(completedResult.records?.[0]?.[0]) ?? 0;

    return {
      goalId,
      dueToday,
      questionsCompleted,
      coverage,
      mastery,
      latestQuestion: {
        stem: latestStem,
        page: fieldInt(latestRow?.[1]),
        filename: fieldString(latestRow?.[2]),
      },
    };
  } catch {
    // Landing must never error on a stats hiccup — fall back to the sample card.
    return null;
  }
}

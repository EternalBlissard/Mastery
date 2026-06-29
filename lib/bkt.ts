import { executeDataStatement } from "../db/data-api";

/** Default prior P(know) when no mastery row exists yet. */
export const BKT_PRIOR = 0.3;

const SLIP = 0.1;
const GUESS = 0.25;
const LEARN = 0.15;

const EPS = 1e-10;

function clampOpenUnit(value: number): number {
  return Math.min(1 - EPS, Math.max(EPS, value));
}

/**
 * One BKT observation + learn transition.
 * Evidence posterior, then post + (1 - post) * learn, clamped to (0, 1).
 */
export function bktUpdate(prior: number, correct: boolean): number {
  let post: number;

  if (correct) {
    const numerator = prior * (1 - SLIP);
    const denominator = numerator + (1 - prior) * GUESS;
    post = numerator / denominator;
  } else {
    const numerator = prior * SLIP;
    const denominator = numerator + (1 - prior) * (1 - GUESS);
    post = numerator / denominator;
  }

  post = post + (1 - post) * LEARN;
  return clampOpenUnit(post);
}

function fieldDouble(
  field: { doubleValue?: number; longValue?: number; isNull?: boolean } | undefined,
): number | null {
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

/** Upsert mastery for (user_id, objective_id) after one graded attempt. */
export async function applyMasteryUpdate(
  userId: string,
  objectiveId: string,
  correct: boolean,
): Promise<void> {
  const existing = await executeDataStatement(`
    SELECT p_known
    FROM mastery
    WHERE user_id = '${userId}'::uuid
      AND objective_id = '${objectiveId}'::uuid
  `);

  const prior = fieldDouble(existing.records?.[0]?.[0]) ?? BKT_PRIOR;
  const pKnown = bktUpdate(prior, correct);
  const correctDelta = correct ? 1 : 0;

  await executeDataStatement(`
    INSERT INTO mastery (
      user_id,
      objective_id,
      p_known,
      attempts,
      correct,
      updated_at
    )
    VALUES (
      '${userId}'::uuid,
      '${objectiveId}'::uuid,
      ${pKnown},
      1,
      ${correctDelta},
      now()
    )
    ON CONFLICT (user_id, objective_id) DO UPDATE SET
      p_known = ${pKnown},
      attempts = mastery.attempts + 1,
      correct = mastery.correct + ${correctDelta},
      updated_at = now()
  `);
}

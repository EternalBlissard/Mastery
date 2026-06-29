import { executeDataStatement } from "../../../db/data-api";
import { applyMasteryUpdate } from "../../../lib/bkt";
import { Rating, ratingFromAnswer, scheduleNext, type PrevState } from "../../../lib/fsrs";

export const runtime = "nodejs";

type DataApiField = {
  stringValue?: string;
  longValue?: number;
  doubleValue?: number;
  booleanValue?: boolean;
  isNull?: boolean;
};

type AnswerRequestBody = {
  userId?: string;
  itemId?: string;
  rating?: number;
  selectedKey?: string;
  responseMs?: number;
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

function parsePrevState(row: DataApiField[] | undefined): PrevState {
  if (!row) {
    return null;
  }
  return {
    stability: fieldDouble(row[0]),
    difficulty: fieldDouble(row[1]),
    due: fieldString(row[2]),
    state: fieldInt(row[3]),
    reps: fieldInt(row[4]) ?? 0,
    lapses: fieldInt(row[5]) ?? 0,
    last_review: fieldString(row[6]),
  };
}

function isValidRating(value: number): value is Rating {
  return Number.isInteger(value) && value >= Rating.Again && value <= Rating.Easy;
}

function elapsedDaysSince(lastReview: Date | string | null | undefined, now: Date): number {
  if (!lastReview) {
    return 0;
  }
  const previous = new Date(lastReview);
  const diffMs = now.getTime() - previous.getTime();
  return Math.max(0, Math.round(diffMs / 86_400_000));
}

function sqlNullableInt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "NULL";
  }
  return String(Math.trunc(value));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnswerRequestBody;
    const userId = String(body.userId ?? "").trim();
    const itemId = String(body.itemId ?? "").trim();

    if (!userId || !isUuid(userId)) {
      return Response.json({ error: "userId must be a valid UUID" }, { status: 400 });
    }
    if (!itemId || !isUuid(itemId)) {
      return Response.json({ error: "itemId must be a valid UUID" }, { status: 400 });
    }

    const itemResult = await executeDataStatement(`
      SELECT answer_key, objective_id
      FROM items
      WHERE id = '${itemId}'::uuid
      LIMIT 1
    `);
    const answerKey = fieldString(itemResult.records?.[0]?.[0]);
    const objectiveId = fieldString(itemResult.records?.[0]?.[1]);
    if (!answerKey) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    const stateResult = await executeDataStatement(`
      SELECT stability, difficulty, due, state, reps, lapses, last_review
      FROM review_state
      WHERE user_id = '${userId}'::uuid
        AND item_id = '${itemId}'::uuid
      LIMIT 1
    `);
    const prev = parsePrevState(stateResult.records?.[0]);
    const previousDue = prev?.due ? new Date(prev.due).toISOString() : null;

    let rating: Rating;
    let correct: boolean;

    if (body.rating != null) {
      if (!isValidRating(body.rating)) {
        return Response.json({ error: "rating must be 1 (Again) through 4 (Easy)" }, { status: 400 });
      }
      rating = body.rating;
      correct =
        body.selectedKey != null && body.selectedKey !== ""
          ? body.selectedKey === answerKey
          : rating !== Rating.Again;
    } else {
      if (body.selectedKey == null || body.selectedKey === "") {
        return Response.json({ error: "selectedKey or rating is required" }, { status: 400 });
      }
      correct = body.selectedKey === answerKey;
      rating = ratingFromAnswer(correct, body.responseMs);
    }

    const now = new Date();
    const next = scheduleNext(prev, rating, now);
    const elapsedDays = elapsedDaysSince(prev?.last_review, now);

    await executeDataStatement(`
      INSERT INTO review_state (
        user_id,
        item_id,
        stability,
        difficulty,
        due,
        state,
        reps,
        lapses,
        last_review
      )
      VALUES (
        '${userId}'::uuid,
        '${itemId}'::uuid,
        ${next.stability},
        ${next.difficulty},
        '${next.due.toISOString()}'::timestamptz,
        ${next.state},
        ${next.reps},
        ${next.lapses},
        '${next.last_review.toISOString()}'::timestamptz
      )
      ON CONFLICT (user_id, item_id) DO UPDATE SET
        stability = EXCLUDED.stability,
        difficulty = EXCLUDED.difficulty,
        due = EXCLUDED.due,
        state = EXCLUDED.state,
        reps = EXCLUDED.reps,
        lapses = EXCLUDED.lapses,
        last_review = EXCLUDED.last_review
    `);

    await executeDataStatement(`
      INSERT INTO review_log (
        user_id,
        item_id,
        rating,
        response_ms,
        state,
        stability,
        difficulty,
        elapsed_days
      )
      VALUES (
        '${userId}'::uuid,
        '${itemId}'::uuid,
        ${rating},
        ${sqlNullableInt(body.responseMs)},
        ${next.state},
        ${next.stability},
        ${next.difficulty},
        ${elapsedDays}
      )
    `);

    if (objectiveId) {
      try {
        await applyMasteryUpdate(userId, objectiveId, correct);
      } catch {
        // best-effort: mastery update must not break scheduling response
      }
    }

    return Response.json({
      previousDue,
      nextDue: next.due.toISOString(),
      rating,
      correct,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record answer";
    return Response.json({ error: message }, { status: 500 });
  }
}

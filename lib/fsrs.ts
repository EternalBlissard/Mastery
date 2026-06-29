import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade,
} from "ts-fsrs";

export { Rating };

/** Persisted review_state fields (null/undefined ⇒ fresh card). */
export type PrevState = {
  stability: number | null;
  difficulty: number | null;
  due: Date | string | null;
  state: number | null;
  reps: number;
  lapses: number;
  last_review: Date | string | null;
} | null;

export type NextState = {
  stability: number;
  difficulty: number;
  due: Date;
  state: number;
  reps: number;
  lapses: number;
  last_review: Date;
};

const FAST_RESPONSE_MS = 3_000;
const SLOW_RESPONSE_MS = 10_000;

const scheduler = fsrs(generatorParameters());

function hydrateCard(prev: PrevState | undefined, now: Date): Card {
  if (!prev || prev.state == null) {
    return createEmptyCard(now);
  }

  return {
    due: prev.due ? new Date(prev.due) : now,
    stability: prev.stability ?? 0,
    difficulty: prev.difficulty ?? 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: prev.reps ?? 0,
    lapses: prev.lapses ?? 0,
    state: prev.state as State,
    last_review: prev.last_review ? new Date(prev.last_review) : undefined,
  };
}

export function scheduleNext(
  prev: PrevState | undefined,
  rating: Rating,
  now: Date = new Date(),
): NextState {
  const card = hydrateCard(prev, now);
  const { card: nextCard } = scheduler.next(card, now, rating as Grade);

  return {
    stability: nextCard.stability,
    difficulty: nextCard.difficulty,
    due: nextCard.due,
    state: nextCard.state,
    reps: nextCard.reps,
    lapses: nextCard.lapses,
    last_review: nextCard.last_review ?? now,
  };
}

/** Wrong → Again; correct+slow → Hard; correct → Good; correct+fast → Easy. */
export function ratingFromAnswer(
  correct: boolean,
  responseMs?: number,
): Rating {
  if (!correct) {
    return Rating.Again;
  }
  if (responseMs !== undefined) {
    if (responseMs <= FAST_RESPONSE_MS) {
      return Rating.Easy;
    }
    if (responseMs >= SLOW_RESPONSE_MS) {
      return Rating.Hard;
    }
  }
  return Rating.Good;
}

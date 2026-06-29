"use client";

import { MasteryNav } from "../components/MasteryNav";
import GoalSelect from "../components/GoalSelect";
import { useCallback, useEffect, useState } from "react";

type StudyItem = {
  id: string;
  stem: string;
  options: string[];
  answer_key: string;
  explanation: string | null;
  source_page: number | null;
  filename: string;
};

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

type AnswerResult = {
  previousDue: string | null;
  nextDue: string;
  correct: boolean;
};

function formatDue(iso: string | null): string {
  if (!iso) {
    return "never scheduled";
  }
  return new Date(iso).toLocaleString();
}

export default function StudyPage() {
  const [goalId, setGoalId] = useState("");
  const [items, setItems] = useState<StudyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [answerResults, setAnswerResults] = useState<Record<string, AnswerResult>>({});
  const [questionStartedAt, setQuestionStartedAt] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const loadItems = useCallback(async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      setError("goalId is required");
      return;
    }

    setLoading(true);
    setError(null);
    setItems([]);
    setSelections({});
    setSubmitted({});
    setAnswerResults({});
    setQuestionStartedAt({});
    setSubmitting({});

    try {
      const res = await fetch(`/api/items?goalId=${encodeURIComponent(trimmed)}`);
      const body = (await res.json()) as { items?: StudyItem[]; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Failed to load items");
        return;
      }
      const loaded = body.items ?? [];
      const startedAt = Date.now();
      setItems(loaded);
      setQuestionStartedAt(Object.fromEntries(loaded.map((item) => [item.id, startedAt])));
    } catch {
      setError("Network error while loading items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("goalId")?.trim() ?? "";
    if (fromUrl) {
      setGoalId(fromUrl);
      void loadItems(fromUrl);
    }
  }, [loadItems]);

  const handleGenerate = useCallback(
    async (id: string) => {
      const trimmed = id.trim();
      if (!trimmed) {
        setError("goalId is required");
        return;
      }

      setGenerating(true);
      setError(null);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalId: trimmed, topic: "core concepts and key terms" }),
        });
        const body = (await res.json()) as { error?: string; generated?: number };
        if (!res.ok) {
          setError(body.error ?? "Generation failed");
          return;
        }
        await loadItems(trimmed);
      } catch {
        setError("Network error during generation");
      } finally {
        setGenerating(false);
      }
    },
    [loadItems],
  );

  const handleSubmit = useCallback(
    async (itemId: string) => {
      const selectedKey = selections[itemId];
      if (!selectedKey) {
        return;
      }

      const startedAt = questionStartedAt[itemId] ?? Date.now();
      const responseMs = Date.now() - startedAt;

      setSubmitting((prev) => ({ ...prev, [itemId]: true }));
      setError(null);

      try {
        const res = await fetch("/api/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId,
            selectedKey,
            responseMs,
          }),
        });
        const body = (await res.json()) as AnswerResult & { error?: string };
        if (!res.ok) {
          setError(body.error ?? "Failed to record answer");
          return;
        }

        setAnswerResults((prev) => ({
          ...prev,
          [itemId]: {
            previousDue: body.previousDue,
            nextDue: body.nextDue,
            correct: body.correct,
          },
        }));
        setSubmitted((prev) => ({ ...prev, [itemId]: true }));
      } catch {
        setError("Network error while recording answer");
      } finally {
        setSubmitting((prev) => ({ ...prev, [itemId]: false }));
      }
    },
    [questionStartedAt, selections],
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.22), transparent 32rem), #08111f",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 820 }}>
        <MasteryNav activeHref="/study" />

        <p style={{ color: "#38bdf8", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>
          PHASE 3 STUDY
        </p>
        <h1 style={{ fontSize: 40, letterSpacing: "-0.06em", margin: "12px 0 8px" }}>
          Cited practice questions
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: 32 }}>
          Load generated MCQs for a goal. Each question cites the source PDF page.
        </p>

        <div style={{ marginBottom: 16 }}>
          <GoalSelect value={goalId} onChange={setGoalId} disabled={loading || generating} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
          <button
            type="button"
            onClick={() => void loadItems(goalId)}
            disabled={loading || generating || !goalId.trim()}
            style={{
              alignSelf: "end",
              background: loading ? "rgba(56, 189, 248, 0.35)" : "#38bdf8",
              border: "none",
              borderRadius: 12,
              color: "#08111f",
              cursor: loading || generating || !goalId.trim() ? "not-allowed" : "pointer",
              fontWeight: 700,
              padding: "12px 20px",
            }}
          >
            {loading ? "Loading…" : "Load items"}
          </button>
          <button
            type="button"
            onClick={() => void handleGenerate(goalId)}
            disabled={loading || generating || !goalId.trim()}
            style={{
              alignSelf: "end",
              background: "transparent",
              border: "1px solid rgba(56, 189, 248, 0.6)",
              borderRadius: 12,
              color: "#7dd3fc",
              cursor: loading || generating || !goalId.trim() ? "not-allowed" : "pointer",
              fontWeight: 700,
              padding: "12px 20px",
            }}
          >
            {generating ? "Generating…" : "Generate questions"}
          </button>
          <a
            href={goalId.trim() ? `/dashboard?goalId=${encodeURIComponent(goalId.trim())}` : "/dashboard"}
            style={{
              alignSelf: "end",
              background: "transparent",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              borderRadius: 12,
              color: "#cbd5e1",
              fontWeight: 700,
              padding: "12px 20px",
              textDecoration: "none",
            }}
          >
            View dashboard →
          </a>
        </div>

        {error ? (
          <p style={{ color: "#f87171", marginBottom: 24 }} role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !generating && !error && goalId.trim() && items.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>
            No MCQs found for this goal yet. Generation may still be running after upload — wait a moment
            and press <strong>Load items</strong>, or press <strong>Generate questions</strong> to build them now.
          </p>
        ) : null}

        <div style={{ display: "grid", gap: 24 }}>
          {items.map((item, index) => {
            const isSubmitted = submitted[item.id] === true;
            const isSubmitting = submitting[item.id] === true;
            const selected = selections[item.id] ?? "";
            const result = answerResults[item.id];
            const isCorrect = result?.correct ?? selected === item.answer_key;

            return (
              <article
                key={item.id}
                style={{
                  background: "rgba(15, 23, 42, 0.82)",
                  border: "1px solid rgba(148, 163, 184, 0.24)",
                  borderRadius: 20,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    background: "rgba(56, 189, 248, 0.14)",
                    border: "1px solid rgba(56, 189, 248, 0.45)",
                    borderRadius: 12,
                    color: "#7dd3fc",
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: "0.02em",
                    marginBottom: 18,
                    padding: "10px 14px",
                  }}
                >
                  Source: {item.filename || "unknown"} p.{item.source_page ?? "?"}
                </div>

                <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 8px" }}>
                  Question {index + 1}
                </p>
                <h2 style={{ fontSize: 20, letterSpacing: "-0.03em", margin: "0 0 20px" }}>
                  {item.stem}
                </h2>

                <fieldset
                  disabled={isSubmitted}
                  style={{ border: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}
                >
                  {OPTION_KEYS.map((key, optionIndex) => {
                    const label = item.options[optionIndex] ?? `Option ${key}`;
                    const isSelected = selected === key;
                    const isAnswer = item.answer_key === key;

                    let borderColor = "rgba(148, 163, 184, 0.24)";
                    let background = "rgba(2, 6, 23, 0.58)";
                    if (isSubmitted && isAnswer) {
                      borderColor = "#4ade80";
                      background = "rgba(74, 222, 128, 0.12)";
                    } else if (isSubmitted && isSelected && !isAnswer) {
                      borderColor = "#f87171";
                      background = "rgba(248, 113, 113, 0.12)";
                    } else if (isSelected) {
                      borderColor = "#38bdf8";
                      background = "rgba(56, 189, 248, 0.1)";
                    }

                    return (
                      <label
                        key={key}
                        style={{
                          alignItems: "flex-start",
                          background,
                          border: `1px solid ${borderColor}`,
                          borderRadius: 12,
                          cursor: isSubmitted ? "default" : "pointer",
                          display: "flex",
                          gap: 12,
                          padding: "12px 14px",
                        }}
                      >
                        <input
                          type="radio"
                          name={`item-${item.id}`}
                          value={key}
                          checked={isSelected}
                          onChange={() =>
                            setSelections((prev) => ({ ...prev, [item.id]: key }))
                          }
                          style={{ marginTop: 3 }}
                        />
                        <span>
                          <strong style={{ marginRight: 8 }}>{key}.</strong>
                          {label}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>

                {!isSubmitted ? (
                  <button
                    type="button"
                    onClick={() => void handleSubmit(item.id)}
                    disabled={!selected || isSubmitting}
                    style={{
                      background:
                        !selected || isSubmitting ? "rgba(56, 189, 248, 0.35)" : "#38bdf8",
                      border: "none",
                      borderRadius: 12,
                      color: "#08111f",
                      cursor: !selected || isSubmitting ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      marginTop: 18,
                      padding: "12px 18px",
                    }}
                  >
                    {isSubmitting ? "Saving…" : "Check answer"}
                  </button>
                ) : (
                  <aside
                    style={{
                      background: "rgba(2, 6, 23, 0.58)",
                      border: `1px solid ${isCorrect ? "rgba(74, 222, 128, 0.45)" : "rgba(248, 113, 113, 0.45)"}`,
                      borderRadius: 14,
                      marginTop: 18,
                      padding: 16,
                    }}
                  >
                    <p
                      style={{
                        color: isCorrect ? "#4ade80" : "#f87171",
                        fontWeight: 800,
                        margin: "0 0 8px",
                      }}
                    >
                      {isCorrect ? "Correct" : `Incorrect — answer is ${item.answer_key}`}
                    </p>
                    {result ? (
                      <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 8px" }}>
                        Next review: {formatDue(result.nextDue)} (was {formatDue(result.previousDue)})
                      </p>
                    ) : null}
                    {item.explanation ? (
                      <p style={{ color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>
                        {item.explanation}
                      </p>
                    ) : null}
                  </aside>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

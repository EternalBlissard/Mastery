"use client";

import { MasteryNav } from "../components/MasteryNav";
import GoalSelect from "../components/GoalSelect";
import { useCallback, useEffect, useState } from "react";

type DashboardObjective = {
  id: string;
  title: string;
  pKnown: number;
  covered: boolean;
};

type DashboardData = {
  overallReadiness: number;
  dueToday: number;
  questionsCompleted: number;
  coverage: number;
  objectives: DashboardObjective[];
};

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export default function DashboardPage() {
  const [goalId, setGoalId] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (gid: string) => {
    const trimmedGoalId = gid.trim();
    if (!trimmedGoalId) {
      setError("Pick a goal first");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const params = new URLSearchParams({ goalId: trimmedGoalId });
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      const body = (await res.json()) as DashboardData & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Failed to load dashboard");
        return;
      }
      setData(body);
    } catch {
      setError("Network error while loading dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGoalChange = useCallback(
    (gid: string) => {
      setGoalId(gid);
      if (gid.trim()) {
        void loadDashboard(gid);
      }
    },
    [loadDashboard],
  );

  useEffect(() => {
    const fromGoalId = new URLSearchParams(window.location.search).get("goalId")?.trim() ?? "";
    if (fromGoalId) {
      setGoalId(fromGoalId);
      void loadDashboard(fromGoalId);
    }
  }, [loadDashboard]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at top left, rgba(52, 184, 255, 0.18), transparent 32rem), #07101D",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 920 }}>
        <MasteryNav activeHref="/dashboard" />

        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.05em", margin: "0 0 8px" }}>
          Exam readiness
        </h1>
        <p style={{ color: "rgba(255,255,255,.72)", fontSize: 18, lineHeight: 1.6, marginBottom: 32 }}>
          Track how close you are to exam day — what&apos;s due, what you&apos;ve covered, and where to focus next.
        </p>

        <div style={{ marginBottom: 16 }}>
          <GoalSelect value={goalId} onChange={handleGoalChange} disabled={loading} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
          <button
            type="button"
            onClick={() => void loadDashboard(goalId)}
            disabled={loading || !goalId.trim()}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 14,
              color: "rgba(255,255,255,.72)",
              cursor: loading || !goalId.trim() ? "not-allowed" : "pointer",
              fontWeight: 700,
              padding: "12px 20px",
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          {data && data.dueToday > 0 ? (
            <a
              href={`/study?goalId=${encodeURIComponent(goalId)}`}
              style={{
                background: "#34B8FF",
                borderRadius: 14,
                color: "#07101D",
                fontWeight: 800,
                padding: "12px 22px",
                textDecoration: "none",
              }}
            >
              Start review →
            </a>
          ) : null}
        </div>

        {error ? (
          <p style={{ color: "#f87171", marginBottom: 24 }} role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error && goalId.trim() && !data ? (
          <p style={{ color: "rgba(255,255,255,.45)" }}>Loading your readiness data…</p>
        ) : null}

        {data ? (
          <>
            {data.questionsCompleted === 0 ? (
              <EmptyState
                title="No questions yet."
                detail="Upload your first lecture to start tracking readiness."
                href={`/upload?goalId=${encodeURIComponent(goalId)}`}
                cta="Upload PDF →"
              />
            ) : null}
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                marginBottom: 32,
              }}
            >
              <MetricCard
                label="Overall readiness"
                value={formatPercent(data.overallReadiness)}
                detail="How prepared you are across all objectives"
              />
              <MetricCard
                label="Due today"
                value={String(data.dueToday)}
                detail="Cards ready for review right now"
              />
              <MetricCard
                label="Questions completed"
                value={String(data.questionsCompleted)}
                detail="Practice questions you've answered"
              />
              <MetricCard
                label="Coverage"
                value={formatPercent(data.coverage)}
                detail="Objectives with practice questions from your PDF"
              />
            </div>

            <h2 style={{ fontSize: 22, letterSpacing: "-0.04em", margin: "0 0 16px" }}>
              Objectives
            </h2>
            <div style={{ display: "grid", gap: 14 }}>
              {data.objectives.length === 0 ? (
                <EmptyState
                  title="No objectives yet."
                  detail="Upload a lecture PDF to map questions to exam objectives."
                  href={`/upload?goalId=${encodeURIComponent(goalId)}`}
                  cta="Upload PDF →"
                />
              ) : (
                data.objectives.map((objective) => (
                  <ObjectiveRow key={objective.id} objective={objective} />
                ))
              )}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function EmptyState({
  title,
  detail,
  href,
  cta,
}: {
  title: string;
  detail: string;
  href: string;
  cta: string;
}) {
  return (
    <div
      style={{
        background: "#101827",
        border: "1px solid rgba(255,255,255,.05)",
        borderRadius: 20,
        marginBottom: 24,
        padding: 32,
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>{title}</p>
      <p style={{ color: "rgba(255,255,255,.72)", margin: "0 0 20px" }}>{detail}</p>
      <a
        href={href}
        style={{
          background: "#34B8FF",
          borderRadius: 14,
          color: "#07101D",
          display: "inline-block",
          fontWeight: 800,
          padding: "14px 22px",
          textDecoration: "none",
        }}
      >
        {cta}
      </a>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.82)",
        border: "1px solid rgba(148, 163, 184, 0.24)",
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div style={{ color: "#34B8FF", fontSize: 30, fontWeight: 800 }}>{value}</div>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{detail}</div>
    </div>
  );
}

function ObjectiveRow({ objective }: { objective: DashboardObjective }) {
  const barWidth = Math.max(0, Math.min(100, objective.pKnown * 100));

  return (
    <article
      style={{
        background: "rgba(15, 23, 42, 0.82)",
        border: "1px solid rgba(148, 163, 184, 0.24)",
        borderRadius: 16,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{objective.title}</h3>
        <span
          style={{
            background: objective.covered
              ? "rgba(74, 222, 128, 0.14)"
              : "rgba(148, 163, 184, 0.12)",
            border: `1px solid ${
              objective.covered ? "rgba(74, 222, 128, 0.45)" : "rgba(148, 163, 184, 0.28)"
            }`,
            borderRadius: 999,
            color: objective.covered ? "#4ade80" : "#94a3b8",
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 10px",
            whiteSpace: "nowrap",
          }}
        >
          {objective.covered ? "Covered" : "No items"}
        </span>
      </div>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "rgba(2, 6, 23, 0.58)",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            borderRadius: 999,
            flex: 1,
            height: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "linear-gradient(90deg, #34B8FF, #4ade80)",
              borderRadius: 999,
              height: "100%",
              width: `${barWidth}%`,
            }}
          />
        </div>
        <span style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 700, minWidth: 40 }}>
          {formatPercent(objective.pKnown)}
        </span>
      </div>
    </article>
  );
}

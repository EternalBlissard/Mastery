"use client";

import { MasteryNav } from "../components/MasteryNav";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

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
  const [userId, setUserId] = useState("");
  const [goalId, setGoalId] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (uid: string, gid: string) => {
    const trimmedUserId = uid.trim();
    const trimmedGoalId = gid.trim();
    if (!trimmedUserId) {
      setError("userId is required");
      return;
    }
    if (!trimmedGoalId) {
      setError("goalId is required");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const params = new URLSearchParams({
        userId: trimmedUserId,
        goalId: trimmedGoalId,
      });
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUserId = params.get("userId")?.trim() ?? "";
    const fromGoalId = params.get("goalId")?.trim() ?? "";
    if (fromUserId) {
      setUserId(fromUserId);
    }
    if (fromGoalId) {
      setGoalId(fromGoalId);
    }
    if (fromUserId && fromGoalId) {
      void loadDashboard(fromUserId, fromGoalId);
    }
  }, [loadDashboard]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.22), transparent 32rem), #08111f",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 920 }}>
        <MasteryNav activeHref="/dashboard" />

        <p style={{ color: "#38bdf8", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>
          PHASE 5 MASTERY
        </p>
        <h1 style={{ fontSize: 40, letterSpacing: "-0.06em", margin: "12px 0 8px" }}>
          Focused mastery dashboard
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: 32 }}>
          Readiness, due reviews, completed questions, and PDF coverage per objective — all from live DB state.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
          <label style={{ display: "grid", gap: 6, flex: "1 1 280px" }}>
            <span style={{ color: "#cbd5e1", fontSize: 14 }}>userId (UUID)</span>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="00000000-0000-4000-8000-000000000001"
              disabled={loading}
              style={fieldStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6, flex: "1 1 280px" }}>
            <span style={{ color: "#cbd5e1", fontSize: 14 }}>goalId (UUID)</span>
            <input
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              placeholder="00000000-0000-4000-8000-000000000002"
              disabled={loading}
              style={fieldStyle}
            />
          </label>
          <button
            type="button"
            onClick={() => void loadDashboard(userId, goalId)}
            disabled={loading || !userId.trim() || !goalId.trim()}
            style={{
              alignSelf: "end",
              background:
                loading || !userId.trim() || !goalId.trim()
                  ? "rgba(56, 189, 248, 0.35)"
                  : "#38bdf8",
              border: "none",
              borderRadius: 12,
              color: "#08111f",
              cursor:
                loading || !userId.trim() || !goalId.trim() ? "not-allowed" : "pointer",
              fontWeight: 700,
              padding: "12px 20px",
            }}
          >
            {loading ? "Loading…" : "Load dashboard"}
          </button>
        </div>

        {error ? (
          <p style={{ color: "#f87171", marginBottom: 24 }} role="alert">
            {error}
          </p>
        ) : null}

        {data ? (
          <>
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
                detail="Weighted mean of p_known across objectives"
              />
              <MetricCard
                label="Due today"
                value={String(data.dueToday)}
                detail="Review items due now or earlier"
              />
              <MetricCard
                label="Questions completed"
                value={String(data.questionsCompleted)}
                detail="Total answers logged"
              />
              <MetricCard
                label="Coverage"
                value={formatPercent(data.coverage)}
                detail="Objectives with at least one item"
              />
            </div>

            <h2 style={{ fontSize: 22, letterSpacing: "-0.04em", margin: "0 0 16px" }}>
              Objectives
            </h2>
            <div style={{ display: "grid", gap: 14 }}>
              {data.objectives.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>No objectives found for this goal.</p>
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
      <div style={{ color: "#38bdf8", fontSize: 30, fontWeight: 800 }}>{value}</div>
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
              background: "linear-gradient(90deg, #38bdf8, #4ade80)",
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

const fieldStyle: CSSProperties = {
  background: "rgba(15, 23, 42, 0.82)",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  borderRadius: 12,
  color: "#f8fafc",
  fontSize: 14,
  padding: "12px 14px",
  width: "100%",
};

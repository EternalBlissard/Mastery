"use client";

import { useCallback, useEffect, useState } from "react";

const CLF_TITLE = "AWS Certified Cloud Practitioner (CLF-C02)";

/**
 * Hackathon goal hub: pre-select CLF-C02, one primary Continue CTA.
 */
export default function GoalPicker() {
  const [goalId, setGoalId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureClfGoal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/goals");
      const body = (await res.json()) as {
        goals?: { id: string; title: string; certificationCode: string | null }[];
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Failed to load goals");
        return;
      }

      const goals = body.goals ?? [];
      const clfGoal =
        goals.find((g) => g.certificationCode === "CLF-C02") ??
        goals.find((g) => g.title.toLowerCase().includes("clf"));

      if (clfGoal) {
        setGoalId(clfGoal.id);
        return;
      }

      const createRes = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: CLF_TITLE, mode: "combined", certificationCode: "CLF-C02" }),
      });
      const created = (await createRes.json()) as { id?: string; error?: string };
      if (!createRes.ok || !created.id) {
        setError(created.error ?? "Failed to create CLF-C02 goal");
        return;
      }
      setGoalId(created.id);
    } catch {
      setError("Network error while setting up goal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void ensureClfGoal();
  }, [ensureClfGoal]);

  const ready = Boolean(goalId.trim());
  const q = ready ? `?goalId=${encodeURIComponent(goalId.trim())}` : "";

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <button
        type="button"
        disabled={loading}
        onClick={() => void ensureClfGoal()}
        style={{
          background: "#101827",
          border: "2px solid #34B8FF",
          borderRadius: 20,
          color: "#fff",
          cursor: loading ? "wait" : "pointer",
          padding: 28,
          textAlign: "left",
          width: "100%",
        }}
      >
        <p style={{ color: "#34B8FF", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 8px" }}>
          SELECTED
        </p>
        <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
          {CLF_TITLE}
        </p>
        <p style={{ color: "rgba(255,255,255,.72)", fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          Official exam objectives paired with your own lecture PDFs. Questions stay tied to real pages
          while coverage tracks every objective.
        </p>
      </button>

      {error ? (
        <p style={{ color: "#f87171", margin: 0 }} role="alert">
          {error}
        </p>
      ) : null}

      <a
        href={`/upload${q}`}
        aria-disabled={!ready}
        style={ready ? primaryBtn : disabledBtn}
      >
        {loading ? "Loading…" : "Continue →"}
      </a>
    </div>
  );
}

const primaryBtn = {
  background: "#34B8FF",
  borderRadius: 14,
  color: "#07101D",
  display: "inline-block",
  fontSize: 18,
  fontWeight: 800,
  padding: "16px 28px",
  textAlign: "center" as const,
  textDecoration: "none",
  width: "100%",
};

const disabledBtn = {
  ...primaryBtn,
  background: "rgba(52, 184, 255, 0.25)",
  color: "rgba(255,255,255,.45)",
  pointerEvents: "none" as const,
};

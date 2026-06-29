"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export type Goal = {
  id: string;
  title: string;
  mode: string;
  certificationCode: string | null;
};

type Props = {
  value: string;
  onChange: (goalId: string) => void;
  disabled?: boolean;
};

/**
 * User-scoped goal picker: lists the signed-in user's goals (GET /api/goals) and lets them create a new
 * one (POST /api/goals). Replaces the old hand-typed goalId UUID — a goal is "what you want to learn".
 */
export default function GoalSelect({ value, onChange, disabled }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const autoSelected = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/goals");
      const body = (await res.json()) as { goals?: Goal[]; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Failed to load goals");
        return;
      }
      const list = body.goals ?? [];
      setGoals(list);
      // Preselect the first goal once, if nothing is chosen yet.
      if (!autoSelected.current && !value && list.length > 0) {
        autoSelected.current = true;
        onChange(list[0].id);
      }
    } catch {
      setError("Network error while loading goals");
    } finally {
      setLoading(false);
    }
  }, [onChange, value]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) {
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, mode: "combined", certificationCode: "CLF-C02" }),
      });
      const body = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !body.id) {
        setError(body.error ?? "Failed to create goal");
        return;
      }
      setNewTitle("");
      await load();
      onChange(body.id);
    } catch {
      setError("Network error while creating goal");
    } finally {
      setCreating(false);
    }
  }, [load, newTitle, onChange]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <span style={{ color: "#cbd5e1", fontSize: 14 }}>Goal — what you want to learn</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading || creating}
        style={fieldStyle}
      >
        {loading ? <option value="">Loading goals…</option> : null}
        {!loading && goals.length === 0 ? <option value="">No goals yet — create one below</option> : null}
        {!loading && goals.length > 0 && !value ? <option value="">Select a goal…</option> : null}
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title}
            {goal.certificationCode ? ` · ${goal.certificationCode}` : ""}
          </option>
        ))}
      </select>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New goal title (e.g. AWS CLF-C02 in 2 weeks)"
          disabled={disabled || creating}
          style={{ ...fieldStyle, flex: 1 }}
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={disabled || creating || !newTitle.trim()}
          style={{
            background: "transparent",
            border: "1px solid rgba(56, 189, 248, 0.6)",
            borderRadius: 12,
            color: "#7dd3fc",
            cursor: disabled || creating || !newTitle.trim() ? "not-allowed" : "pointer",
            fontWeight: 700,
            padding: "0 16px",
            whiteSpace: "nowrap",
          }}
        >
          {creating ? "Adding…" : "Add goal"}
        </button>
      </div>

      {error ? (
        <span style={{ color: "#f87171", fontSize: 13 }} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

const fieldStyle: CSSProperties = {
  background: "rgba(15, 23, 42, 0.82)",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  borderRadius: 12,
  color: "#f8fafc",
  fontSize: 14,
  padding: "12px 14px",
};

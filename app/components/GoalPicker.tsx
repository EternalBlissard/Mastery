"use client";

import { useState } from "react";
import GoalSelect from "./GoalSelect";

/**
 * Goal hub: select or create a goal, then carry it into the flow via ?goalId=. A goal is "what the user
 * wants to learn" — fully user-scoped, no hand-typed UUIDs.
 */
export default function GoalPicker() {
  const [goalId, setGoalId] = useState("");
  const ready = Boolean(goalId.trim());
  const q = ready ? `?goalId=${encodeURIComponent(goalId.trim())}` : "";

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div
        style={{
          background: "rgba(15, 23, 42, 0.82)",
          border: "2px solid rgba(56, 189, 248, 0.55)",
          borderRadius: 20,
          boxShadow: "0 0 0 1px rgba(56, 189, 248, 0.12), 0 16px 48px rgba(0, 0, 0, 0.28)",
          padding: 24,
        }}
      >
        <GoalSelect value={goalId} onChange={setGoalId} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <a href={`/upload${q}`} aria-disabled={!ready} style={ready ? primaryBtn : disabledBtn}>
          Continue to upload →
        </a>
        <a href={`/study${q}`} aria-disabled={!ready} style={ready ? ghostBtn : disabledBtn}>
          Study questions
        </a>
        <a href={`/dashboard${q}`} aria-disabled={!ready} style={ready ? ghostBtn : disabledBtn}>
          View dashboard
        </a>
      </div>
    </div>
  );
}

const primaryBtn = {
  background: "#38bdf8",
  borderRadius: 12,
  color: "#08111f",
  display: "inline-block",
  fontSize: 16,
  fontWeight: 800,
  padding: "14px 22px",
  textDecoration: "none",
} as const;
const ghostBtn = {
  background: "transparent",
  border: "1px solid rgba(56, 189, 248, 0.6)",
  borderRadius: 12,
  color: "#7dd3fc",
  display: "inline-block",
  fontSize: 16,
  fontWeight: 700,
  padding: "13px 20px",
  textDecoration: "none",
} as const;
const disabledBtn = {
  background: "rgba(56, 189, 248, 0.18)",
  borderRadius: 12,
  color: "#64748b",
  display: "inline-block",
  fontSize: 16,
  fontWeight: 700,
  padding: "14px 22px",
  pointerEvents: "none",
  textDecoration: "none",
} as const;

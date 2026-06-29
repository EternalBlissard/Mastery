"use client";

type Props = {
  percent: number;
  active?: boolean;
  height?: number;
  fillColor?: string;
};

export function AnimatedProgressBar({
  percent,
  active = false,
  height = 8,
  fillColor = "#34B8FF",
}: Props) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      className={active ? "mastery-progress-track mastery-progress-active" : "mastery-progress-track"}
      style={{ height }}
      aria-hidden
    >
      <div
        className="mastery-progress-fill"
        style={{ background: fillColor, width: `${clamped}%` }}
      />
    </div>
  );
}

import { MasteryNav } from "./components/MasteryNav";

const flow = [
  "Pick AWS CLF-C02",
  "Upload one lecture PDF",
  "Generate cited MCQs",
  "Review with FSRS",
  "Watch mastery move",
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.22), transparent 32rem), #08111f",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 1120 }}>
        <MasteryNav marginBottom={72} />

        <div style={{ display: "grid", gap: 32, gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 0.75fr)" }}>
          <div>
            <p style={{ color: "#38bdf8", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>
              CITATION-GROUNDED CERT PREP
            </p>
            <h1
              style={{
                fontSize: "clamp(44px, 7vw, 76px)",
                letterSpacing: "-0.08em",
                lineHeight: 0.92,
                margin: "16px 0 24px",
              }}
            >
              Turn your own notes into adaptive AWS exam practice.
            </h1>
            <p style={{ color: "#cbd5e1", fontSize: 20, lineHeight: 1.6, maxWidth: 720 }}>
              Mastery maps a real lecture PDF to AWS CLF-C02 objectives, generates original questions with page
              citations, and schedules review by predicted forgetting.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
              <a
                href="/upload"
                style={{
                  background: "#38bdf8",
                  borderRadius: 12,
                  color: "#08111f",
                  fontWeight: 800,
                  padding: "14px 18px",
                  textDecoration: "none",
                }}
              >
                Upload lecture PDF
              </a>
              <a
                href="/goal"
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.32)",
                  borderRadius: 12,
                  color: "#e2e8f0",
                  fontWeight: 700,
                  padding: "14px 18px",
                  textDecoration: "none",
                }}
              >
                Pick your cert goal
              </a>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 36 }}>
              {flow.map((step) => (
                <span
                  key={step}
                  style={{
                    background: "rgba(15, 23, 42, 0.78)",
                    border: "1px solid rgba(148, 163, 184, 0.22)",
                    borderRadius: 999,
                    color: "#e2e8f0",
                    padding: "10px 14px",
                  }}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>

          <aside
            style={{
              background: "rgba(15, 23, 42, 0.82)",
              border: "1px solid rgba(148, 163, 184, 0.24)",
              borderRadius: 28,
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.32)",
              padding: 28,
            }}
          >
            <p style={{ color: "#94a3b8", marginTop: 0 }}>Simple pricing</p>
            <h2 style={{ fontSize: 28, letterSpacing: "-0.05em", marginTop: 0 }}>Start free, upgrade when ready</h2>
            <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
              <div
                style={{
                  background: "rgba(2, 6, 23, 0.58)",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  borderRadius: 18,
                  padding: 18,
                }}
              >
                <div style={{ color: "#38bdf8", fontSize: 30, fontWeight: 800 }}>Free</div>
                <div style={{ fontWeight: 700 }}>Try the full flow</div>
                <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 6 }}>
                  One cert goal, limited uploads, cited practice questions, and FSRS review — enough to see adaptive
                  scheduling from your own materials.
                </div>
              </div>
              <div
                style={{
                  background: "rgba(2, 6, 23, 0.58)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  borderRadius: 18,
                  padding: 18,
                }}
              >
                <div style={{ color: "#38bdf8", fontSize: 30, fontWeight: 800 }}>Pro ~$12–15/mo</div>
                <div style={{ fontWeight: 700 }}>Unlimited prep depth</div>
                <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 6 }}>
                  Multiple goals, unlimited PDFs, full dashboard readiness, and priority generation — built for
                  serious cert timelines.
                </div>
              </div>
            </div>
            <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5, marginBottom: 0, marginTop: 20 }}>
              B2B cohort analytics — team readiness, coverage gaps, and instructor dashboards — on the roadmap for
              bootcamps and enterprise L&D.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}

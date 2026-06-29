import { MasteryNav } from "../components/MasteryNav";

const cardStyle = {
  background: "rgba(15, 23, 42, 0.82)",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  borderRadius: 20,
  padding: 28,
} as const;

export default function AboutPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.22), transparent 32rem), #08111f",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 800 }}>
        <MasteryNav activeHref="/about" />

        <p style={{ color: "#38bdf8", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>
          HOW IT WORKS
        </p>
        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 52px)",
            letterSpacing: "-0.06em",
            lineHeight: 1.05,
            margin: "0 0 16px",
          }}
        >
          Architecture &amp; business story
        </h1>
        <p style={{ color: "#cbd5e1", fontSize: 18, lineHeight: 1.6, marginBottom: 40 }}>
          Mastery is adaptive cert prep built on your own materials — grounded citations, real forgetting curves,
          and one database that holds everything.
        </p>

        <div style={{ display: "grid", gap: 24 }}>
          <article style={cardStyle}>
            <p style={{ color: "#38bdf8", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 10px" }}>
              ARCHITECTURE
            </p>
            <h2 style={{ fontSize: 22, letterSpacing: "-0.04em", margin: "0 0 14px" }}>
              One source of truth, end to end
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65, margin: "0 0 16px" }}>
              <strong style={{ color: "#e2e8f0" }}>Amazon Aurora PostgreSQL + pgvector</strong> stores cert
              objectives, uploaded PDF chunks, embeddings, generated questions, and every review event. Nothing is
              siloed — coverage, citations, and scheduling all read from the same data.
            </p>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65, margin: "0 0 16px" }}>
              <strong style={{ color: "#e2e8f0" }}>Amazon Bedrock</strong> powers the AI layer:{" "}
              <strong style={{ color: "#e2e8f0" }}>Titan Text Embeddings V2</strong> for semantic search over your
              lecture pages, and <strong style={{ color: "#e2e8f0" }}>Claude Sonnet</strong> for generating
              original MCQs tied to specific source passages.
            </p>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65, margin: "0 0 16px" }}>
              <strong style={{ color: "#e2e8f0" }}>FSRS</strong> (Free Spaced Repetition Scheduler) picks when each
              card is due next based on your recall history — not arbitrary intervals.{" "}
              <strong style={{ color: "#e2e8f0" }}>BKT</strong> (Bayesian Knowledge Tracing) estimates per-objective
              mastery so the dashboard readiness bars reflect what you actually retain.
            </p>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65, margin: 0 }}>
              The app runs on <strong style={{ color: "#e2e8f0" }}>Vercel</strong> — serverless API routes talk to
              Aurora over a secure connection, keeping upload → study → dashboard fast without managing servers.
            </p>
          </article>

          <article style={cardStyle}>
            <p style={{ color: "#38bdf8", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 10px" }}>
              BUSINESS MODEL
            </p>
            <h2 style={{ fontSize: 22, letterSpacing: "-0.04em", margin: "0 0 14px" }}>
              B2C today, B2B cohorts next
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65, margin: "0 0 16px" }}>
              <strong style={{ color: "#e2e8f0" }}>Free</strong> — one cert goal, limited uploads, cited practice
              questions, and FSRS review. Enough to experience adaptive scheduling from your own PDFs.
            </p>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65, margin: "0 0 16px" }}>
              <strong style={{ color: "#e2e8f0" }}>Pro (~$12–15/month)</strong> — multiple goals, unlimited PDFs,
              full dashboard readiness, and priority generation for serious cert timelines.
            </p>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65, margin: 0 }}>
              <strong style={{ color: "#e2e8f0" }}>B2B cohort analytics</strong> — team readiness, coverage gaps,
              and instructor dashboards — on the roadmap for bootcamps and enterprise L&amp;D teams who need visibility
              across a cohort, not just one learner.
            </p>
          </article>

          <article
            style={{
              ...cardStyle,
              border: "1px solid rgba(56, 189, 248, 0.35)",
            }}
          >
            <p style={{ color: "#38bdf8", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 10px" }}>
              POSITIONING
            </p>
            <h2 style={{ fontSize: 22, letterSpacing: "-0.04em", margin: "0 0 14px" }}>
              Grounded citations + real adaptive scheduling
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65, margin: "0 0 16px" }}>
              Generic question banks cannot tell you <em>where</em> in your notes an answer came from. Mastery cites
              the exact PDF page on every card — &ldquo;Source: filename p.X&rdquo; — so you can verify and revisit
              the material that matters.
            </p>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.65, margin: 0 }}>
              Spaced repetition only works when intervals reflect <em>your</em> forgetting curve. FSRS + BKT together
              mean due dates, mastery bars, and readiness scores are computed from real review data — not
              marketing copy about &ldquo;AI-powered learning.&rdquo;
            </p>
          </article>
        </div>

        <div style={{ marginTop: 40 }}>
          <a
            href="/goal"
            style={{
              background: "#38bdf8",
              borderRadius: 12,
              color: "#08111f",
              display: "inline-block",
              fontSize: 16,
              fontWeight: 800,
              padding: "14px 22px",
              textDecoration: "none",
            }}
          >
            Pick your cert goal
          </a>
        </div>
      </section>
    </main>
  );
}

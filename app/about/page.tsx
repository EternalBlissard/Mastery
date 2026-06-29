import { MasteryNav } from "../components/MasteryNav";

const cardStyle = {
  background: "#101827",
  border: "1px solid rgba(255,255,255,.05)",
  borderRadius: 20,
  padding: 28,
} as const;

const coreTables = [
  "objectives — seeded CLF-C02 domains and tasks",
  "documents — uploaded PDF metadata and status",
  "chunks — page-level text with vector(512) embeddings",
  "items — generated MCQs with source page citations",
  "review_state — current adaptive review card state",
  "review_log — immutable answer and review events",
  "mastery — personalized mastery per objective",
  "ingestion_jobs — upload processing progress",
];

const vectorQuery = `SELECT c.content, c.page_number, d.filename
FROM chunks c
JOIN documents d ON d.id = c.document_id
ORDER BY c.embedding <=> $query_embedding
LIMIT 5;`;

export default function AboutPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at top left, rgba(52, 184, 255, 0.18), transparent 32rem), #07101D",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 800 }}>
        <MasteryNav activeHref="/about" />

        <p style={{ color: "#34B8FF", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>
          HOW IT WORKS
        </p>
        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-0.05em",
            lineHeight: 1.1,
            margin: "0 0 16px",
          }}
        >
          Architecture &amp; business story
        </h1>
        <p style={{ color: "rgba(255,255,255,.72)", fontSize: 18, lineHeight: 1.6, marginBottom: 40 }}>
          Adaptive cert prep built on your own materials — grounded citations, real forgetting curves,
          and one database that holds everything.
        </p>

        <article style={{ ...cardStyle, marginBottom: 24 }}>
          <p style={{ color: "#34B8FF", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 12px" }}>
            DATA FLOW
          </p>
          <pre
            style={{
              background: "#161F31",
              borderRadius: 14,
              color: "rgba(255,255,255,.85)",
              fontSize: 14,
              lineHeight: 1.7,
              margin: 0,
              overflowX: "auto",
              padding: 20,
            }}
          >
{`Upload PDF
  ↓
Extract page chunks → Titan embeddings → Aurora pgvector
  ↓
Retrieve chunks → Bedrock generation → Grounded MCQs
  ↓
Study → FSRS scheduling + BKT mastery → Dashboard`}
          </pre>
        </article>

        <div style={{ display: "grid", gap: 24 }}>
          <article style={cardStyle}>
            <p style={{ color: "#34B8FF", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 10px" }}>
              ARCHITECTURE
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 14px" }}>
              One source of truth, end to end
            </h2>
            <p style={{ color: "rgba(255,255,255,.72)", fontSize: 15, lineHeight: 1.65, margin: "0 0 16px" }}>
              <strong style={{ color: "#fff" }}>Amazon Aurora PostgreSQL + pgvector</strong> stores cert
              objectives, uploaded PDF chunks, embeddings, generated questions, and every review event.
              Coverage, citations, and scheduling all read from the same data.
            </p>
            <p style={{ color: "rgba(255,255,255,.72)", fontSize: 15, lineHeight: 1.65, margin: "0 0 16px" }}>
              <strong style={{ color: "#fff" }}>Amazon Bedrock</strong> powers retrieval and generation:{" "}
              <strong style={{ color: "#fff" }}>Titan Text Embeddings V2</strong> for semantic search over lecture
              pages, and <strong style={{ color: "#fff" }}>Claude Sonnet</strong> for original MCQs tied to source
              passages.
            </p>
            <p style={{ color: "rgba(255,255,255,.72)", fontSize: 15, lineHeight: 1.65, margin: "0 0 16px" }}>
              <strong style={{ color: "#fff" }}>FSRS</strong> schedules when each card is due based on recall history.{" "}
              <strong style={{ color: "#fff" }}>BKT</strong> estimates per-objective mastery for dashboard readiness
              bars.
            </p>
            <p style={{ color: "rgba(255,255,255,.72)", fontSize: 15, lineHeight: 1.65, margin: 0 }}>
              The app runs on <strong style={{ color: "#fff" }}>Vercel</strong> — serverless API routes connect to
              Aurora over a secure connection.
            </p>
          </article>

          <article style={cardStyle}>
            <p style={{ color: "#34B8FF", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 10px" }}>
              SCHEMA
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 14px" }}>
              Core tables in Aurora PostgreSQL
            </h2>
            <ul style={{ color: "rgba(255,255,255,.72)", lineHeight: 1.8, margin: 0, paddingLeft: 20 }}>
              {coreTables.map((table) => (
                <li key={table}>{table}</li>
              ))}
            </ul>
            <p style={{ color: "rgba(255,255,255,.45)", fontSize: 14, lineHeight: 1.6, margin: "16px 0 0" }}>
              <code style={{ color: "#34B8FF" }}>CREATE EXTENSION IF NOT EXISTS vector;</code> with HNSW index on
              chunk embeddings for fast similarity search.
            </p>
          </article>

          <article style={cardStyle}>
            <p style={{ color: "#34B8FF", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 10px" }}>
              VECTOR SEARCH
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 14px" }}>
              Example pgvector query
            </h2>
            <p style={{ color: "rgba(255,255,255,.72)", fontSize: 15, lineHeight: 1.65, margin: "0 0 12px" }}>
              Retrieval finds the most relevant lecture pages before question generation:
            </p>
            <pre
              style={{
                background: "#161F31",
                borderRadius: 14,
                color: "#34B8FF",
                fontSize: 13,
                lineHeight: 1.6,
                margin: 0,
                overflowX: "auto",
                padding: 16,
              }}
            >
              {vectorQuery}
            </pre>
          </article>

          <article style={cardStyle}>
            <p style={{ color: "#34B8FF", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 10px" }}>
              BUSINESS MODEL
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 14px" }}>
              B2C today, B2B cohorts next
            </h2>
            <p style={{ color: "rgba(255,255,255,.72)", fontSize: 15, lineHeight: 1.65, margin: "0 0 16px" }}>
              <strong style={{ color: "#fff" }}>Free</strong> — one cert goal, limited uploads, cited practice
              questions, and adaptive review.
            </p>
            <p style={{ color: "rgba(255,255,255,.72)", fontSize: 15, lineHeight: 1.65, margin: "0 0 16px" }}>
              <strong style={{ color: "#fff" }}>Pro (~$12–15/month)</strong> — multiple goals, unlimited PDFs,
              full dashboard readiness, and priority generation.
            </p>
            <p style={{ color: "rgba(255,255,255,.72)", fontSize: 15, lineHeight: 1.65, margin: 0 }}>
              <strong style={{ color: "#fff" }}>B2B cohort analytics</strong> — team readiness and instructor
              dashboards — on the roadmap for bootcamps and enterprise L&amp;D.
            </p>
          </article>
        </div>

        <p
          style={{
            color: "rgba(255,255,255,.45)",
            fontSize: 13,
            lineHeight: 1.6,
            margin: "40px 0 24px",
          }}
        >
          AWS is a trademark of Amazon.com, Inc. Mastery is not affiliated with or endorsed by AWS. No guaranteed
          exam success.
        </p>

        <a
          href="/goal"
          style={{
            background: "#34B8FF",
            borderRadius: 14,
            color: "#07101D",
            display: "inline-block",
            fontSize: 16,
            fontWeight: 800,
            padding: "14px 22px",
            textDecoration: "none",
          }}
        >
          Start demo →
        </a>
      </section>
    </main>
  );
}

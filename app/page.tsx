import { MasteryNav } from "./components/MasteryNav";
import { MasteryTrustFooter } from "./components/MasteryTrustFooter";
import { AnimatedProgressBar } from "./components/AnimatedProgressBar";
import { getLandingStats } from "../lib/landing";

const workflow = [
  { title: "Upload PDF", detail: "Drop your lecture notes" },
  { title: "Generate cited questions", detail: "Every answer links to your notes" },
  { title: "Adaptive review", detail: "Study only what you're about to forget" },
];

const SAMPLE_HERO = {
  isSample: true as const,
  dueToday: 17,
  coverage: 74,
  mastery: 61,
  latestStem: "What storage class is best for infrequently accessed data?",
  citation: "Page 18",
};

export default async function HomePage() {
  const stats = await getLandingStats();
  const hero = stats
    ? {
        isSample: false as const,
        dueToday: stats.dueToday,
        coverage: Math.round(stats.coverage * 100),
        mastery: Math.round(stats.mastery * 100),
        latestStem: stats.latestQuestion?.stem ?? SAMPLE_HERO.latestStem,
        citation:
          stats.latestQuestion?.page != null ? `Page ${stats.latestQuestion.page}` : "From your notes",
      }
    : SAMPLE_HERO;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at top left, rgba(52, 184, 255, 0.18), transparent 32rem), #07101D",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 1120 }}>
        <MasteryNav marginBottom={72} />

        <div
          style={{
            display: "grid",
            gap: 48,
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(300px, 0.75fr)",
          }}
        >
          <div>
            <p style={{ color: "#34B8FF", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>
              ADAPTIVE CERT PREP
            </p>
            <h1
              style={{
                fontSize: "clamp(44px, 7vw, 64px)",
                letterSpacing: "-0.06em",
                lineHeight: 1.05,
                margin: "16px 0 24px",
                maxWidth: 700,
              }}
            >
              Turn your lecture PDFs into adaptive certification practice.
            </h1>
            <ul
              style={{
                color: "rgba(255,255,255,.72)",
                fontSize: 18,
                lineHeight: 1.7,
                listStyle: "none",
                margin: 0,
                padding: 0,
                maxWidth: 560,
              }}
            >
              <li style={{ marginBottom: 8 }}>Upload your notes</li>
              <li style={{ marginBottom: 8 }}>Generate cited questions</li>
              <li>Review exactly when you&apos;re about to forget</li>
            </ul>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 40 }}>
              <a
                href="/goal"
                className="mastery-btn-primary"
                style={{
                  background: "#34B8FF",
                  borderRadius: 14,
                  color: "#07101D",
                  fontWeight: 800,
                  padding: "16px 24px",
                  textDecoration: "none",
                }}
              >
                Start demo
              </a>
              <a
                href="#how-it-works"
                style={{
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 14,
                  color: "rgba(255,255,255,.85)",
                  fontWeight: 700,
                  padding: "16px 24px",
                  textDecoration: "none",
                }}
              >
                See how it works
              </a>
            </div>
          </div>

          <aside
            className="mastery-card"
            style={{
              background: "#101827",
              border: "1px solid rgba(255,255,255,.05)",
              borderRadius: 20,
              padding: 28,
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <p style={{ color: "rgba(255,255,255,.45)", fontSize: 13, margin: 0 }}>
                Today&apos;s Review
              </p>
              {hero.isSample ? (
                <span
                  style={{
                    background: "rgba(148, 163, 184, 0.12)",
                    border: "1px solid rgba(148, 163, 184, 0.28)",
                    borderRadius: 999,
                    color: "#94a3b8",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    padding: "2px 8px",
                  }}
                >
                  SAMPLE
                </span>
              ) : (
                <span
                  style={{
                    background: "rgba(74, 222, 128, 0.14)",
                    border: "1px solid rgba(74, 222, 128, 0.45)",
                    borderRadius: 999,
                    color: "#4ade80",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    padding: "2px 8px",
                  }}
                >
                  LIVE
                </span>
              )}
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 4px" }}>
              {hero.dueToday} card{hero.dueToday === 1 ? "" : "s"} due
            </p>
            <div style={{ margin: "20px 0" }}>
              <AnimatedProgressBar percent={hero.mastery} />
            </div>
            <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
              <div>
                <p style={{ color: "rgba(255,255,255,.45)", fontSize: 12, margin: 0 }}>Coverage</p>
                <p style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 0" }}>{hero.coverage}%</p>
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,.45)", fontSize: 12, margin: 0 }}>Mastery</p>
                <p style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 0" }}>{hero.mastery}%</p>
              </div>
            </div>
            <div
              style={{
                background: "#161F31",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <p style={{ color: "rgba(255,255,255,.45)", fontSize: 12, margin: "0 0 8px" }}>
                Latest question
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.5, margin: "0 0 12px" }}>
                &ldquo;{hero.latestStem}&rdquo;
              </p>
              <p style={{ color: "#34B8FF", fontSize: 13, fontWeight: 700, margin: 0 }}>
                Citation: {hero.citation}
              </p>
            </div>
          </aside>
        </div>

        <section id="how-it-works" style={{ marginTop: 96, scrollMarginTop: 32 }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              margin: "0 0 32px",
            }}
          >
            How it works
          </h2>
          <div
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {workflow.map((step, index) => (
              <article
                key={step.title}
                className="mastery-card"
                style={{
                  background: "#101827",
                  border: "1px solid rgba(255,255,255,.05)",
                  borderRadius: 20,
                  padding: 28,
                }}
              >
                <p style={{ color: "#34B8FF", fontSize: 14, fontWeight: 800, margin: "0 0 12px" }}>
                  {index + 1}
                </p>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>{step.title}</h3>
                <p style={{ color: "rgba(255,255,255,.72)", lineHeight: 1.6, margin: 0 }}>
                  {step.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" style={{ marginTop: 96, scrollMarginTop: 32 }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              margin: "0 0 12px",
            }}
          >
            Simple pricing
          </h2>
          <p style={{ color: "rgba(255,255,255,.72)", fontSize: 18, margin: "0 0 32px", maxWidth: 560 }}>
            Start free with one certification goal. Upgrade when you need unlimited depth.
          </p>
          <div
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            <article
              className="mastery-card"
              style={{
                background: "#101827",
                border: "1px solid rgba(255,255,255,.05)",
                borderRadius: 20,
                padding: 28,
              }}
            >
              <p style={{ color: "#34B8FF", fontSize: 28, fontWeight: 800, margin: "0 0 8px" }}>Free</p>
              <p style={{ fontWeight: 700, margin: "0 0 12px" }}>Perfect for one certification</p>
              <ul
                style={{
                  color: "rgba(255,255,255,.72)",
                  lineHeight: 1.8,
                  margin: "0 0 24px",
                  paddingLeft: 20,
                }}
              >
                <li>One goal</li>
                <li>Adaptive review</li>
                <li>Question generation</li>
              </ul>
              <a
                href="/goal"
                className="mastery-btn"
                style={{
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 14,
                  color: "rgba(255,255,255,.85)",
                  display: "inline-block",
                  fontWeight: 700,
                  padding: "12px 20px",
                  textDecoration: "none",
                }}
              >
                Start free
              </a>
            </article>
            <article
              className="mastery-card"
              style={{
                background: "#101827",
                border: "1px solid rgba(52, 184, 255, 0.25)",
                borderRadius: 20,
                padding: 28,
              }}
            >
              <p style={{ color: "#34B8FF", fontSize: 28, fontWeight: 800, margin: "0 0 8px" }}>
                Pro ~$12–15/mo
              </p>
              <p style={{ fontWeight: 700, margin: "0 0 12px" }}>Unlimited everything</p>
              <ul
                style={{
                  color: "rgba(255,255,255,.72)",
                  lineHeight: 1.8,
                  margin: "0 0 24px",
                  paddingLeft: 20,
                }}
              >
                <li>Unlimited PDFs</li>
                <li>Unlimited goals</li>
                <li>Priority generation</li>
              </ul>
              <a
                href="/billing"
                className="mastery-btn-primary"
                style={{
                  background: "#34B8FF",
                  borderRadius: 14,
                  color: "#07101D",
                  display: "inline-block",
                  fontWeight: 800,
                  padding: "12px 20px",
                  textDecoration: "none",
                }}
              >
                Upgrade
              </a>
            </article>
          </div>
        </section>

        <MasteryTrustFooter />
      </section>
    </main>
  );
}

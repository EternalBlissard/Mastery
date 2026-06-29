import { MasteryNav } from "./components/MasteryNav";

const workflow = [
  { title: "Upload PDF", detail: "Drop your lecture notes" },
  { title: "Generate cited questions", detail: "Every answer links to your notes" },
  { title: "Adaptive review", detail: "Study only what you're about to forget" },
];

export default function HomePage() {
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
            style={{
              background: "#101827",
              border: "1px solid rgba(255,255,255,.05)",
              borderRadius: 20,
              padding: 28,
            }}
          >
            <p style={{ color: "rgba(255,255,255,.45)", fontSize: 13, margin: "0 0 8px" }}>
              Today&apos;s Review
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 4px" }}>
              17 cards due
            </p>
            <div
              style={{
                background: "rgba(255,255,255,.06)",
                borderRadius: 999,
                height: 8,
                margin: "20px 0",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: "#34B8FF",
                  height: "100%",
                  width: "74%",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
              <div>
                <p style={{ color: "rgba(255,255,255,.45)", fontSize: 12, margin: 0 }}>Coverage</p>
                <p style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 0" }}>74%</p>
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,.45)", fontSize: 12, margin: 0 }}>Mastery</p>
                <p style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 0" }}>61%</p>
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
                &ldquo;What storage class is best for infrequently accessed data?&rdquo;
              </p>
              <p style={{ color: "#34B8FF", fontSize: 13, fontWeight: 700, margin: 0 }}>
                Citation: Page 18
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

        <footer
          style={{
            borderTop: "1px solid rgba(255,255,255,.05)",
            color: "rgba(255,255,255,.45)",
            fontSize: 13,
            lineHeight: 1.6,
            marginTop: 96,
            paddingTop: 32,
          }}
        >
          <p style={{ margin: "0 0 8px" }}>
            AWS is a trademark of Amazon.com, Inc. Mastery is not affiliated with or endorsed by AWS.
            No guaranteed exam success.
          </p>
          <p style={{ margin: 0 }}>
            <a href="/about" style={{ color: "rgba(255,255,255,.72)", marginRight: 16 }}>
              About
            </a>
            <a href="/billing" style={{ color: "rgba(255,255,255,.72)" }}>
              Pricing
            </a>
          </p>
        </footer>
      </section>
    </main>
  );
}

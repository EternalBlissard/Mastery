const navLinks = [
  { href: "/goal", label: "Goal" },
  { href: "/upload", label: "Upload" },
  { href: "/study", label: "Study" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" },
];

const linkStyle = {
  color: "#cbd5e1",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
} as const;

export default function GoalPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.22), transparent 32rem), #08111f",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 720 }}>
        <nav
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "space-between",
            marginBottom: 56,
          }}
        >
          <a href="/" style={{ color: "#f8fafc", fontSize: 22, fontWeight: 700, letterSpacing: "-0.04em", textDecoration: "none" }}>
            Mastery
          </a>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 18 }}>
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  ...linkStyle,
                  color: item.href === "/goal" ? "#38bdf8" : linkStyle.color,
                }}
              >
                {item.label}
              </a>
            ))}
            <a
              href="/upload"
              style={{
                background: "#38bdf8",
                borderRadius: 10,
                color: "#08111f",
                fontSize: 14,
                fontWeight: 800,
                padding: "10px 14px",
                textDecoration: "none",
              }}
            >
              Upload PDF
            </a>
          </div>
        </nav>

        <p style={{ color: "#38bdf8", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>
          STEP 1 OF 5
        </p>
        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 52px)",
            letterSpacing: "-0.06em",
            lineHeight: 1.05,
            margin: "0 0 16px",
          }}
        >
          Pick your certification goal
        </h1>
        <p style={{ color: "#cbd5e1", fontSize: 18, lineHeight: 1.6, marginBottom: 36 }}>
          Mastery combines the official exam blueprint with your own lecture PDFs — questions stay tied to real
          pages while coverage tracks every CLF-C02 objective.
        </p>

        <div
          style={{
            background: "rgba(15, 23, 42, 0.82)",
            border: "2px solid rgba(56, 189, 248, 0.55)",
            borderRadius: 20,
            boxShadow: "0 0 0 1px rgba(56, 189, 248, 0.12), 0 16px 48px rgba(0, 0, 0, 0.28)",
            padding: 24,
          }}
        >
          <div style={{ alignItems: "flex-start", display: "flex", gap: 16, justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "#38bdf8", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 8px" }}>
                SELECTED
              </p>
              <h2 style={{ fontSize: 24, letterSpacing: "-0.04em", margin: "0 0 10px" }}>
                AWS Certified Cloud Practitioner (CLF-C02)
              </h2>
              <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.55, margin: 0 }}>
                Official CLF-C02 objectives define what to master; your uploaded PDF supplies the grounded source
                material. Mastery maps both together so practice questions cite real pages and readiness reflects
                the full cert scope.
              </p>
            </div>
            <span
              aria-hidden
              style={{
                background: "rgba(56, 189, 248, 0.18)",
                border: "1px solid rgba(56, 189, 248, 0.45)",
                borderRadius: 999,
                color: "#38bdf8",
                flexShrink: 0,
                fontSize: 20,
                fontWeight: 800,
                height: 36,
                lineHeight: "34px",
                textAlign: "center",
                width: 36,
              }}
            >
              ✓
            </span>
          </div>
        </div>

        <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.5, margin: "20px 0 32px" }}>
          More AWS certs (SAA, DVA, SOA) coming after CLF-C02 MVP. One goal keeps the free tier focused while we
          prove adaptive scheduling from your own notes.
        </p>

        <a
          href="/upload"
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
          Continue to upload
        </a>
      </section>
    </main>
  );
}

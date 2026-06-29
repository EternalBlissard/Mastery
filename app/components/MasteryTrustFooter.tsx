const linkStyle = {
  color: "rgba(255,255,255,.72)",
  marginRight: 16,
  textDecoration: "none",
} as const;

export function MasteryTrustFooter({ marginTop = 96 }: { marginTop?: number }) {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,.05)",
        color: "rgba(255,255,255,.45)",
        fontSize: 13,
        lineHeight: 1.7,
        marginTop,
        paddingTop: 32,
      }}
    >
      <p
        style={{
          color: "rgba(255,255,255,.72)",
          fontSize: 15,
          fontWeight: 600,
          margin: "0 0 8px",
        }}
      >
        Your PDFs stay private. Delete them anytime. No training on your documents.
      </p>
      <p style={{ margin: "0 0 16px" }}>
        AWS is a trademark of Amazon.com, Inc. Mastery is not affiliated with or endorsed by AWS.
        No guaranteed exam success.
      </p>
      <p style={{ margin: 0 }}>
        <a href="/about" style={linkStyle}>
          About
        </a>
        <a href="/billing" style={linkStyle}>
          Pricing
        </a>
        <a href="/about#privacy" style={linkStyle}>
          Privacy
        </a>
        <a href="/about#terms" style={linkStyle}>
          Terms
        </a>
        <a href="mailto:hello@mastery.app" style={linkStyle}>
          Contact
        </a>
        <a href="/about#roadmap" style={{ ...linkStyle, marginRight: 0 }}>
          Roadmap
        </a>
      </p>
    </footer>
  );
}

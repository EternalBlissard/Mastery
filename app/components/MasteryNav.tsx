export const masteryNavLinks = [
  { href: "/goal", label: "Goal" },
  { href: "/upload", label: "Upload" },
  { href: "/study", label: "Study" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" },
] as const;

const linkStyle = {
  color: "#cbd5e1",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
} as const;

type MasteryNavProps = {
  activeHref?: string;
  marginBottom?: number;
};

export function MasteryNav({ activeHref, marginBottom = 56 }: MasteryNavProps) {
  return (
    <nav
      style={{
        alignItems: "center",
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        justifyContent: "space-between",
        marginBottom,
      }}
    >
      <a
        href="/"
        style={{
          color: "#f8fafc",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          textDecoration: "none",
        }}
      >
        Mastery
      </a>
      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 18 }}>
        {masteryNavLinks.map((item) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              ...linkStyle,
              color: item.href === activeHref ? "#38bdf8" : linkStyle.color,
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
  );
}

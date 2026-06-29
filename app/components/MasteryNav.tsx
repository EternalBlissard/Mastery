"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

export const masteryNavLinks = [
  { href: "/goal", label: "Goal" },
  { href: "/upload", label: "Upload" },
  { href: "/study", label: "Study" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/billing", label: "Pricing" },
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
  const { isLoaded, isSignedIn } = useUser();
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
        {isLoaded && isSignedIn ? (
          <UserButton />
        ) : isLoaded ? (
          <>
            <SignInButton mode="modal">
              <button type="button" style={ghostBtnStyle}>Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button type="button" style={solidBtnStyle}>Sign up</button>
            </SignUpButton>
          </>
        ) : null}
      </div>
    </nav>
  );
}

const ghostBtnStyle = {
  background: "transparent",
  border: "1px solid rgba(56, 189, 248, 0.6)",
  borderRadius: 10,
  color: "#7dd3fc",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  padding: "8px 14px",
} as const;
const solidBtnStyle = {
  background: "#38bdf8",
  border: "none",
  borderRadius: 10,
  color: "#08111f",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  padding: "8px 14px",
} as const;

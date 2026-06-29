import { PricingTable } from "@clerk/nextjs";
import { MasteryNav } from "../components/MasteryNav";

export default function BillingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.22), transparent 32rem), #08111f",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 920 }}>
        <MasteryNav activeHref="/billing" />

        <p style={{ color: "#38bdf8", fontSize: 14, fontWeight: 700, letterSpacing: "0.12em" }}>
          PRICING
        </p>
        <h1 style={{ fontSize: 40, letterSpacing: "-0.06em", margin: "12px 0 8px" }}>
          Upgrade to Mastery Pro
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: 32, maxWidth: 620 }}>
          Free covers one goal with capped question generation. Pro unlocks unlimited goals and the full
          per-document question budget — grounded, adaptive cert prep at full strength.
        </p>

        <PricingTable />
      </section>
    </main>
  );
}

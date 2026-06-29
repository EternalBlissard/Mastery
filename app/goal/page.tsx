import { MasteryNav } from "../components/MasteryNav";
import GoalPicker from "../components/GoalPicker";

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
        <MasteryNav activeHref="/goal" />

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

        <GoalPicker />

        <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.5, margin: "28px 0 0" }}>
          Each goal pairs the official CLF-C02 objectives with your own uploaded PDFs. Create a goal per exam
          or topic you are working toward — more AWS certs (SAA, DVA, SOA) coming after the CLF-C02 MVP.
        </p>
      </section>
    </main>
  );
}

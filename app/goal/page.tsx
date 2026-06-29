import { MasteryNav } from "../components/MasteryNav";
import GoalPicker from "../components/GoalPicker";

export default function GoalPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at top left, rgba(52, 184, 255, 0.18), transparent 32rem), #07101D",
      }}
    >
      <section style={{ margin: "0 auto", maxWidth: 640 }}>
        <MasteryNav activeHref="/goal" />

        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-0.05em",
            lineHeight: 1.1,
            margin: "0 0 16px",
          }}
        >
          Choose your certification
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,.72)",
            fontSize: 18,
            lineHeight: 1.6,
            marginBottom: 48,
            maxWidth: 520,
          }}
        >
          Start with AWS Cloud Practitioner. Upload your lecture PDF next to generate practice questions
          linked to your notes.
        </p>

        <GoalPicker />
      </section>
    </main>
  );
}

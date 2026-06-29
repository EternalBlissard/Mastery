import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
        background:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.22), transparent 32rem), #08111f",
      }}
    >
      <SignUp />
    </main>
  );
}

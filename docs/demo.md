# Demo Runbook

Pins the demo inputs and the cold click-path so the recorded run is reproducible.

## Pinned demo PDF

- **Document:** AWS *Certified Cloud Practitioner (CLF-C02) Exam Guide* (public PDF from
  `aws.amazon.com/certification`). Real AWS content, public objective text only — satisfies the
  legal rule "use public CLF-C02 objective text; do not reproduce real exam questions."
- **Location in repo:** `demo/clf-c02-exam-guide.pdf` (drop the binary there; not committed —
  see `demo/README.md`).
- **Why pinned:** removes "which file?" ambiguity on demo day and keeps the generated questions
  grounded in CLF-C02 material, so coverage maps cleanly onto the seeded objectives.

If a university lecture deck is preferred for the "your own notes" narrative, pin one PDF and
update this file — the demo must use **one** document so coverage and the dashboard read cleanly.

## Cold demo click-path

1. Sign in (Clerk) **before recording** — auth is kept, so start the take already authenticated.
2. Landing `/` → hero shows **LIVE** stats once the account has generated questions (otherwise a
   **SAMPLE** card). Pre-run the flow once on the demo account so the hero is live on camera.
3. `/goal` → AWS Certified Cloud Practitioner (CLF-C02).
4. `/upload` → drop the pinned PDF. Watch: Uploading → Reading pages → Generating study material →
   **Generating cited questions** (item count climbs) → **N cited questions ready**.
5. `/study` → answer 3–5 MCQs; show citation `Source: filename p.X` and the FSRS due-date change.
6. `/dashboard` → objective bars, coverage, due-today, readiness.
7. `/about` → architecture + Aurora/pgvector proof.

## Cost & limits (budget guard)

The plan set a **$20 AI budget ceiling**. We do **not** track per-call dollar spend. Instead,
generation volume — the only material Bedrock cost — is capped, which keeps a demo run far under
the ceiling:

- `MAX_QUESTIONS_PER_DOC` (default **20**) — hard cap on generated MCQs per document.
- `FREE_MAX_QUESTIONS_PER_DOC` (default **5**) — free-tier cap (Pro lifts it). See `lib/billing.ts`.
- `AUTO_GENERATION_TARGET` (**16**) — questions auto-generated after ingest (`app/api/process`).

**One PDF:** soft limit only. The upload API accepts multiple documents per goal; the demo uses
one by convention (step 4). Not enforced in code — out of scope for the MVP.

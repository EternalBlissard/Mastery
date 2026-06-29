import { auth } from "@clerk/nextjs/server";

// Clerk Billing plan slug — create a plan with this key in the Clerk dashboard (Billing → Plans).
export const PRO_PLAN = process.env.CLERK_PRO_PLAN ?? "pro";

// Free-tier limits (Pro removes them). Overridable via env for demos.
export const FREE_MAX_GOALS = Number.parseInt(process.env.FREE_MAX_GOALS ?? "1", 10) || 1;
export const FREE_MAX_QUESTIONS_PER_DOC =
  Number.parseInt(process.env.FREE_MAX_QUESTIONS_PER_DOC ?? "5", 10) || 5;

/**
 * True when the signed-in user holds the Pro plan (Clerk Billing). Safe in public/server-to-server
 * routes: with no session it returns false rather than throwing.
 */
export async function hasProPlan(): Promise<boolean> {
  try {
    const { userId, has } = await auth();
    return Boolean(userId) && has({ plan: PRO_PLAN });
  } catch {
    return false;
  }
}

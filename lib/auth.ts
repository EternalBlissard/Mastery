import { auth, currentUser } from "@clerk/nextjs/server";
import { executeDataStatement } from "../db/data-api";

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function firstId(result: Awaited<ReturnType<typeof executeDataStatement>>): string | null {
  return result.records?.[0]?.[0]?.stringValue ?? null;
}

/**
 * Resolve the signed-in Clerk user to our internal `users.id` (UUID), creating/linking the row on
 * first use. Returns the internal UUID — every DB FK (documents, review_state, mastery, …) keys off it.
 * Throws if there is no authenticated session (routes are protected by middleware, so this is a guard).
 */
export async function getOrCreateUser(): Promise<string> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Not authenticated");
  }

  // Fast path: already linked.
  const existing = await executeDataStatement(
    `SELECT id FROM users WHERE clerk_id = ${sqlString(clerkId)} LIMIT 1`,
  );
  const existingId = firstId(existing);
  if (existingId) {
    return existingId;
  }

  // First sign-in (or a pre-seeded row sharing the email): insert, or link by email.
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    `${clerkId}@clerk.local`;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;

  const upsert = await executeDataStatement(`
    INSERT INTO users (email, name, clerk_id)
    VALUES (${sqlString(email)}, ${name ? sqlString(name) : "NULL"}, ${sqlString(clerkId)})
    ON CONFLICT (email) DO UPDATE SET
      clerk_id = EXCLUDED.clerk_id,
      name = COALESCE(EXCLUDED.name, users.name)
    RETURNING id
  `);
  const id = firstId(upsert);
  if (!id) {
    throw new Error("Failed to resolve user id");
  }
  return id;
}

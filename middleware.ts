import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Interactive pages + user-scoped APIs require a session. Server-to-server routes (process, cron),
// goal-scoped reads (items, generate), and job polling stay public so the ingest/generation pipeline
// and Clerk-hosted auth pages keep working without a session.
const isProtectedRoute = createRouteMatcher([
  "/upload(.*)",
  "/study(.*)",
  "/dashboard(.*)",
  "/goal(.*)",
  "/api/upload(.*)",
  "/api/answer(.*)",
  "/api/dashboard(.*)",
  "/api/items(.*)",
  "/api/goals(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

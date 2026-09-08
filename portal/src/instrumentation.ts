import * as Sentry from "@sentry/nextjs";

// Sentry server/edge. Sin DSN queda inerte: no rompe build ni runtime.
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, tracesSampleRate: 0.1 });
}

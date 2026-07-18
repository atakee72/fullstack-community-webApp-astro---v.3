// Sentry browser SDK — errors only. Tracing and session replay are
// deliberately OFF (5k errors/mo free cap is the whole budget) and
// sendDefaultPii false suppresses IP + cookies (GDPR; EU-region org).
// With SENTRY_DSN unset, init is a documented no-op — the app runs
// with monitoring disabled until env vars land.
import * as Sentry from '@sentry/astro';

Sentry.init({
  // PUBLIC_ prefix REQUIRED: Astro only exposes PUBLIC_*-prefixed env vars
  // to the client bundle — a bare SENTRY_DSN statically inlines to
  // undefined in the browser and client capture never works. The DSN is
  // a public ingest identifier, safe to expose. NEVER "fix" this with a
  // custom envPrefix covering SENTRY_ — that would leak SENTRY_AUTH_TOKEN
  // into the client bundle.
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
});

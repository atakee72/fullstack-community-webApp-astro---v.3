// Sentry browser SDK — errors only. Tracing and session replay are
// deliberately OFF (5k errors/mo free cap is the whole budget) and
// sendDefaultPii false suppresses IP + cookies (GDPR; EU-region org).
// With SENTRY_DSN unset, init is a documented no-op — the app runs
// with monitoring disabled until env vars land.
import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: import.meta.env.SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
});

// Sentry server SDK — errors only (see client config for the why).
// beforeSend drops known-transient upstream noise so a provider
// incident can't burn the monthly cap: the moderation pipeline calls
// OpenAI on every submission (topics/comments/events/announcements/
// recommendations/listings), so OpenAI rate-limits fan out fast.
import * as Sentry from '@sentry/astro';

const TRANSIENT_PATTERNS = [
  /429|rate.?limit/i,        // OpenAI (and any upstream) rate limits
  /AbortError/,              // request cancellation, incl. our own 5s timeouts
  /MongoNetworkError.*timed out/i, // transient Mongo connection blips
];

Sentry.init({
  dsn: import.meta.env.SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0,
  sendDefaultPii: false,
  beforeSend(event, hint) {
    const msg = `${event.exception?.values?.[0]?.type ?? ''} ${event.exception?.values?.[0]?.value ?? ''} ${String((hint?.originalException as Error | undefined)?.message ?? '')}`;
    if (TRANSIENT_PATTERNS.some((re) => re.test(msg))) return null;
    return event;
  },
});

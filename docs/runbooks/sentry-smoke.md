# Sentry live smoke runbook

Run this once the manual Sentry-account prerequisite is done (`docs/superpowers/plans/2026-07-18-sentry-integration.md`'s "Manual prerequisite" section: sentry.io account, EU region, DSN + auth token in `.env` **and** in Vercel Production + Preview env vars). Everything here is manual verification against a real deploy — no code changes.

## 1. Server-error smoke (the critical one) — ✅ VERIFIED 2026-07-19

This was the check for [sentry-javascript#14054](https://github.com/getsentry/sentry-javascript/issues/14054) — "Astro server errors not reported when adapter is Vercel." **It initially FAILED, and the "fallback" is now the shipped design** (commit `36515c0d`). Two root causes found live:

1. Astro bundles `sentry.server.config`'s `Sentry.init()` into page chunks only — cold instances serving only `/api/*` had an uninitialized SDK (`captureException` silently no-oped). Fix: side-effect `import '../sentry.server.config'` in `src/middleware.ts`.
2. Vercel freezes the function when the response leaves, dropping the SDK's async event POST (events only surfaced when a later invocation thawed the queue). Fix: `captureException` + `await Sentry.flush(2000)` + rethrow in the middleware catch; the SDK's own request handler is disabled (`autoInstrumentation.requestHandler: false`).

Evidence: single cold-instance smoke error (`sentry-smoke-server-test`) delivered unassisted within ~15s (issue MAHALLE-PROD-1, preview deploy). Note Sentry's issues API can lag ingest by 1–3 min — don't declare failure on a 60-second poll.

Re-run recipe if ever needed: temp guard in a low-traffic API route throwing OUTSIDE its try/catch, one curl, revert.

## 2. Browser-error smoke — ✅ VERIFIED 2026-07-19

`setTimeout(() => { throw new Error('client-test') }, 0)` on the deployed preview → issue MAHALLE-PROD-3 within ~15s. (Confirms the `PUBLIC_SENTRY_DSN` build-time inlining works.)

## 3. Cron coverage — ◐ COVERED BY DESIGN (crons hit normal API routes → middleware capture path; observe first real cron failure)

Vercel cron invocations don't always pass through the same instrumentation path as normal requests (old plan audit item 3) — verify each cron individually rather than assuming API-route coverage extends to them:

1. `/api/news/fetch-daily` (Vercel cron, `0 6 * * *`) — confirm next scheduled run's errors (if any) would report; if not, wrap the handler in an explicit `try/catch` + `Sentry.captureException`.
2. `/api/cron/process-deletions` (Vercel cron, `30 5 * * *`) — same check.
3. `/api/cron/log-air` (GitHub-Actions-triggered, `.github/workflows/kiez-air-logger.yml`, Bearer `CRON_SECRET`, every 30 min) — confirm one real GH-Actions-triggered invocation would report a thrown error the same way.

## 4. Widget live — ✅ VERIFIED 2026-07-19 (real counts on prod)

1. Visit `/admin/moderation` logged in as an admin — with env vars set, `AdmErrorsCard` shows real counts (loaded state).
2. Reload within 60s — confirm (via Sentry's API request log, or by eyeballing response latency) the second load served the proxy's in-memory cache rather than hitting Sentry's API again.

## 5. Environment tagging — ✅ DONE 2026-07-19 (PUBLIC_VERCEL_ENV set per scope in Vercel; server uses VERCEL_ENV)

Alongside the other Sentry env vars, set `PUBLIC_VERCEL_ENV` in Vercel: value `production` in the Production scope, `preview` in the Preview scope. Without it, client-side events from preview deploys inline `MODE='production'` at build time and masquerade as production, polluting the shared quota bucket and the `environment:production` alert below. Server events get this for free via Vercel's own `VERCEL_ENV` — no manual var needed there.

## 6. Alerts — ✅ DONE 2026-07-19 via sentry CLI (rule 725977 „New issue in production" env-filtered + 725978 „Error spike 100%/1h", both email)

Configure once in the Sentry web UI:

1. **"New issue in production"** — issue alert, trigger: new issue created, filter `environment:production`, action: email.
2. **Error spike** — issue alert, trigger: event count rises 100% in 1 hour, action: email.
3. **Quota alert** — built-in, toggle on at 80% of the monthly cap (4000/5000).

## 7. CSP check — ✅ CHECKED 2026-07-19 (no CSP header on prod; nothing blocks *.ingest.de.sentry.io)

```
curl -I <prod-url> | grep -i content-security
```

No CSP exists on Mahalle today, so this should return nothing. If a CSP is ever added, `*.ingest.sentry.io` must be present in `connect-src` or client-side error reporting silently breaks.

## 8. Privacy policy

Add Sentry as a sub-processor: EU region, data categories transmitted — error stack trace, URL, browser/device info, breadcrumbs. No IP address, no cookies (`sendDefaultPii: false` in both configs).

## 9. Widget full-state pass — ✅ VERIFIED 2026-07-19 (user-confirmed: both smoke issues rendered in the loaded state on prod /admin/moderation)

Once the Sentry project has **≥1 real issue** (naturally, or by re-running item 1/2's deliberate test errors and leaving them unresolved), live-verify the two `AdmErrorsCard` branches that can't be proven before the account exists:

- **Zero-issues state**: with 0 unresolved issues in the last 24h, the card shows `admin.errors.none` ("Keine offenen Fehler — die Presse läuft rund." / "No open errors — the presses run clean.").
- **Issues-loaded state**: with ≥1 unresolved issue in the last 24h, the card shows the total 24h count + up to 3 top-issue rows (title, `{n}×` badge), each linking out to its Sentry `permalink`.

The `disabled` (no `SENTRY_*` env vars) and `unreachable` (502/timeout) states are the only two provable *before* the Sentry account exists — both were already verified during implementation (Tasks 1–3) and the branch math (`enabled`/`unreachable`/`topIssues.length`) was checked against the proxy's response contract at that time. This item closes the remaining gap.

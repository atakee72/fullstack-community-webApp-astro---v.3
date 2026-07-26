# Sentry error monitoring + admin "errors today" widget

> **SUPERSEDED (2026-07-18)** by docs/superpowers/plans/2026-07-18-sentry-integration.md — anchors here are pre-kiosk.

> **Status:** Deferred — picks up after the Editorial Kiosk admin redesign.
> **Drafted:** 2026-05-03 · pre-launch, no real users yet.
> **Owner:** Ercan.
> **Plan tier:** Sentry Developer (free).

## Context

Mahalle has zero production observability today. When a real user hits a Cloudinary 4xx, an OpenAI moderation timeout, a MongoDB connection blip, a Svelte/React island that crashes on Safari iOS, or the daily `/api/news/fetch-daily` cron failing at 06:00 UTC — none of it surfaces. The terminal is the only logger and only when Ercan is running `pnpm dev`. Once real users land, this is unworkable.

This plan adds Sentry on the Developer (free) tier, wires it into the Astro app + serverless functions, captures errors automatically, and surfaces a small at-a-glance widget on `/admin/moderation` so Ercan can see "is anything on fire?" without leaving the admin. Deeper investigation happens on sentry.io (its dashboards/filters/search are already excellent — we don't rebuild them).

**Free-tier verified (May 2026):** 5k errors/mo, 1 seat, email alerts, 30-day retention, custom dashboards. Slack/Discord requires paid. Email is fine for solo use — no need to pay for Slack just for this.

**Non-goal:** rebuilding sentry.io's dashboard inside Mahalle. The widget is a 3-row glance, not a query interface.

## Source-of-truth references

- Sentry Astro guide: <https://docs.sentry.io/platforms/javascript/guides/astro/> — auto-injects via integration; `sentry.client.config.ts` + `sentry.server.config.ts` at project root
- Sentry REST API: `GET /api/0/projects/{org}/{project}/issues/?statsPeriod=24h&query=is:unresolved&limit=5`
- Known caveat to verify post-install: <https://github.com/getsentry/sentry-javascript/issues/14054> — "Astro server errors not reported when adapter is Vercel". Likely fixed in current `@sentry/astro`, but smoke test the API-route side explicitly before declaring done.

## Verified app context (snapshot, 2026-05-03)

- `astro.config.mjs:11–17` — `output: 'server'` with `@astrojs/vercel` adapter (serverless, **not** edge — Sentry node integration applies). webAnalytics already on.
- `astro.config.mjs:19–29` — current integrations: `auth()`, `react({…})`, `svelte()`, `tailwind({applyBaseStyles:false})`, `mdx()`. Sentry slots in here.
- Env vars use `import.meta.env.*` everywhere (e.g. `src/pages/api/upload/image.ts:CLOUDINARY_API_KEY`). No `process.env` in app code. Sentry's server config will use `import.meta.env` too.
- Layouts (`BaseLayout.astro` / `BlogBaseLayout.astro`) have inline scripts (low-perf detector, splash, glass filters). Sentry's auto-injected snippet adds a `<script>` to `<head>` — independent, no conflict.
- `vercel.json` has 1 cron: `/api/news/fetch-daily` at `0 6 * * *`. Sentry's serverless instrumentation should capture this for free; **needs explicit verification** (see audit item 3).
- No `ErrorBoundary` exists anywhere. `src/providers/QueryProvider.tsx` has no error callback. Sentry adds a global `window.onerror` / `unhandledrejection` listener, so we don't strictly need a manual ErrorBoundary on day one.
- 56 API routes — all already follow the `getSession()` → `try` → `Response.json` pattern. Sentry server instrumentation auto-wraps them once installed; no per-route changes needed.
- `.env.example` exists at project root, structured as `# Section header` + `KEY=placeholder`. Mirror that style when adding Sentry vars.
- **Admin auth caveat:** `/admin/moderation.astro` and admin API routes use `isAdmin()` with an empty `ADMIN_USER_IDS` array — currently any logged-in user passes. The new `/api/admin/errors` route inherits this same risk (already a known TODO in the codebase). Don't fix that here; flag it as a follow-up so this plan stays scoped.
- `src/components/admin/ModerationQueue.svelte` (975 lines) has a 5-column stats grid at the top. The widget will live **above** it as a sibling, in the moderation page's own header `<div class="mb-6">…</div>` block — keeps `ModerationQueue.svelte` untouched.
- Toast helpers from `src/utils/toast.ts` already work from Svelte (verified in `ModerationQueue.svelte`).

## Phased rollout (each phase ships independently)

### Phase A · Capture (the foundation — must work before anything else)

This phase has no UI surface. Goal: errors anywhere in the app reach sentry.io.

**Manual prerequisite** (Ercan does once, in Sentry web UI):

1. Sign up at sentry.io (free Developer plan). **Prefer the EU data-residency region** for GDPR (see audit item 7).
2. Create org `mahalle` (or similar) + project `mahalle-prod` with platform "Astro".
3. Copy DSN, Org slug, Project slug.
4. Generate an Auth Token (Settings → Account → User Auth Tokens) with scopes `project:read` + `org:read`. Needed for Phase B's REST API proxy — keep handy.

**Code changes:**

1. **`package.json`** — add `@sentry/astro` (latest major; verify version at install time per audit item 1). No other Sentry packages needed; pulls in `@sentry/node` + `@sentry/browser` transitively.

2. **`astro.config.mjs`** — add `import sentry from '@sentry/astro'` and prepend the integration to the `integrations` array. Place it **before** `auth()` (Sentry docs recommend it first). Make `sourceMapsUploadOptions` conditional so a missing token doesn't fail the build:

   ```js
   sentry({
     dsn: import.meta.env.SENTRY_DSN,
     ...(import.meta.env.SENTRY_AUTH_TOKEN ? {
       sourceMapsUploadOptions: {
         org: import.meta.env.SENTRY_ORG,
         project: import.meta.env.SENTRY_PROJECT,
         authToken: import.meta.env.SENTRY_AUTH_TOKEN,
       }
     } : {})
   })
   ```

   This way the first Vercel deploy works even before `SENTRY_AUTH_TOKEN` is set; uploads turn on automatically once it's added.

3. **`sentry.client.config.ts`** (new, project root) — `Sentry.init({ dsn: import.meta.env.SENTRY_DSN, tracesSampleRate: 0, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0, environment: import.meta.env.MODE, sendDefaultPii: false })`. Tracing + replays OFF (keeps us at "just errors" so the 5k/mo cap is hard to blow). `sendDefaultPii: false` for GDPR (suppresses IP + cookies; URL + breadcrumbs still captured, which is plenty for triage).

4. **`sentry.server.config.ts`** (new, project root) — `Sentry.init({ dsn: import.meta.env.SENTRY_DSN, tracesSampleRate: 0, environment: import.meta.env.MODE, sendDefaultPii: false, beforeSend(event) { /* drop OpenAI 429 / known-transient errors here so quota isn't burned by upstream rate-limits */ return event; } })`. The DSN is **not a secret** — it's a public project identifier and ingest URL, safe to expose to the client. Sentry's Astro integration auto-propagates the value to both runtimes from the single env var, so we don't need a separate `PUBLIC_*` copy.

5. **`.env.example`** — append a "Sentry / Error Monitoring" section with `SENTRY_DSN=`, `SENTRY_AUTH_TOKEN=`, `SENTRY_ORG=`, `SENTRY_PROJECT=`. Placeholder `your-...-here` strings. Comment near `SENTRY_AUTH_TOKEN`: "server-only; never expose to client; required for Phase B widget + sourcemap uploads".

6. **`.env`** (Ercan's local; not committed) — fill in real values from Sentry web UI.

7. **Vercel project env vars** (Ercan does once via Vercel UI or `vercel env add`) — add `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to **Production** + **Preview** + **Development** environments.

8. **`.gitignore`** — confirm `.env` already ignored (it is, per CLAUDE.md). Sentry doesn't add new ignored files.

**No changes to:**

- API routes (auto-instrumented)
- Layouts (auto-injected)
- React/Svelte components (auto-instrumented globally)
- News cron (caught by serverless instrumentation — but verify; see audit item 3)

**Smoke test:**

- After install, throw a deliberate error from one API route (e.g. add `if (request.url.includes('?sentry-test')) throw new Error('sentry test');` to a low-traffic route, then revert) — confirm it appears at sentry.io within ~30s.
- From the browser, trigger a deliberate React error (DevTools console: `setTimeout(() => { throw new Error('client-test') }, 0)`) — confirm it appears.
- Specifically address the GitHub #14054 risk: trigger the error from an `/api/*` route, NOT just from `.astro` page rendering, because the issue was about API/server errors on Vercel. If server errors don't show up, fall back to wrapping `try { … } catch (err) { Sentry.captureException(err); throw err; }` in a global `astro:request` middleware — but only as a workaround if needed.

**Done when:** Sentry web UI shows at least one client error AND one server error from a deployed Vercel preview.

### Phase B · Admin widget (the at-a-glance signal in our own UI)

**Files to add:**

1. **`src/pages/api/admin/errors.ts`** (new) — server-only route. Auth pattern matches `review.ts` / `bulk-review.ts` (inline `isAdmin()` helper, same empty-array placeholder, comment noting the shared TODO). Body:
   - `GET` only.
   - Reads `import.meta.env.SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
   - If any missing → return `{ enabled: false }` (200) so the widget renders an "errors monitoring not configured" placeholder rather than blowing up.
   - `fetch('https://sentry.io/api/0/projects/{org}/{project}/issues/?statsPeriod=24h&query=is:unresolved&limit=5', { headers: { Authorization: 'Bearer ' + token } })`
   - Map response → `{ enabled: true, totalLast24h: number, affectedUsers: number, topIssues: [{ id, title, count, lastSeen, link }] }`. Drop everything else (don't pass full Sentry payloads through).
   - Cache the response in-memory for 60 seconds (a simple module-level `let cache: { data, expires }`). Sentry's REST API has tight rate limits; 60s caching prevents both rate-limit pain and excessive billable Sentry API calls when the admin refreshes. Note the per-instance caveat in audit item 5.
   - 5-second `fetch` timeout via `AbortSignal.timeout(5000)` so a Sentry outage doesn't hang the admin page.

2. **`src/components/admin/ErrorsWidget.svelte`** (new). Visual mirror of the existing 5-column stats grid in `ModerationQueue.svelte` (same `bg-white rounded-lg shadow-sm border` cards, same color tokens). Three states:
   - **Loading** — three skeleton cards.
   - **Disabled / no token** — single card "Error monitoring not configured" with a hint to add `SENTRY_AUTH_TOKEN` (Ercan-only — won't ship to other admins).
   - **Loaded** — header row "Errors (24h)" + "View all in Sentry ↗" link to `https://sentry.io/organizations/{org}/issues/?project={project_id}` (computed from response, or just the org URL if `project_id` isn't in the payload). Below: 3 cards (Total errors / Affected users / New issues) and a list of up to 3 top issues (title truncated with `title=` tooltip, count badge, "Open in Sentry" link to the issue's `permalink` from the API response).
   - Uses `showError()` from `src/utils/toast.ts` if the fetch fails.
   - Auto-refresh every 5 minutes (`setInterval` cleared on `onDestroy`).

3. **`src/pages/admin/moderation.astro`** — the only modification: insert `<ErrorsWidget client:load />` directly after the existing `<div class="mb-6">…</div>` header block, before `<ModerationQueue …/>`. No prop wiring needed (the widget self-fetches).

4. **`.env.example`** — already covered in Phase A; no further changes.

**Why a 60s cache:** Sentry's free-tier REST API has per-org rate limits in the low hundreds per hour. Without caching, an admin with the page open + auto-refresh would hit it constantly. 60s cache turns a chatty UI into ~1 req/min/admin.

**Why proxy instead of calling Sentry from the browser:** The auth token must never ship to the client. The proxy keeps it server-only.

### Phase C · Alerts (Sentry web UI only — no code)

Once Phase A is in place and getting events, configure these once at sentry.io:

1. **Issue Alert "New issue in production"** — trigger: a new issue is created. Filter: `environment:production`. Action: send email to Ercan's address.
2. **Issue Alert "Error spike"** — trigger: an issue's event count rises by 100% in 1 hour. Action: email. Catches regressions.
3. **Quota alert** — when monthly errors exceed 4000/5000 (80%). Built-in Sentry feature; toggle on.

Skip Slack/Discord (paid). Skip session replay (paid). Sourcemap upload turns on automatically once `SENTRY_AUTH_TOKEN` lands in Vercel envs (the integration option is already wired in Phase A).

## Files summary

**New (4):**

- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `src/pages/api/admin/errors.ts`
- `src/components/admin/ErrorsWidget.svelte`

**Modified (4):**

- `astro.config.mjs` (one import + one integration entry)
- `package.json` (one new dep)
- `.env.example` (4 new env keys in a new section: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`)
- `src/pages/admin/moderation.astro` (one import + one new line)

**Untouched:**

- All existing API routes (auto-instrumented)
- `ModerationQueue.svelte`
- All layouts and React/Svelte components
- The auth-astro session pipeline
- The cron handler

## Verification

1. `pnpm install` clean.
2. `pnpm type-check` — no new errors. (Pre-existing API-route TS errors stay.)
3. `pnpm build` — clean. Sentry integration builds without warnings.
4. Local smoke (Phase A): trigger a deliberate error from one API route + one client error → both appear at sentry.io within 30s.
5. Local smoke (Phase B): visit `/admin/moderation` while logged in → widget renders above the existing stats grid. With no `SENTRY_AUTH_TOKEN` set: widget shows "not configured" placeholder. With token: shows real counts.
6. Curl `/api/admin/errors` while NOT logged in → 401. While logged in (since `isAdmin` allowlist is empty, this passes): 200 with the JSON shape.
7. Vercel preview deploy: trigger an API error → confirm it lands in Sentry. Specifically test API-route errors per issue #14054.
8. Verify the 60s cache: hit `/api/admin/errors` twice within 60s → second call should not show a new request in Sentry's API logs.
9. Confirm `.env.example` is up to date but `.env` itself stays gitignored.
10. **Phase C verification** — manually trigger a fresh error type in production → email arrives within minutes.

## Out of scope · queued for follow-up

- **Tightening admin allowlist** (`ADMIN_USER_IDS`) — separate concern; the widget inherits the same wide-open access as the rest of `/admin/*`. Worth doing soon, but as its own PR — not coupled to Sentry.
- **Session replay** (paid) — revisit on Team tier.
- **Slack/Discord webhook** — free workarounds exist (Sentry → custom webhook → Slack incoming webhook) but add infrastructure. Email-first; revisit only if real users prove email is too slow.
- **`Sentry.setUser({ id })`** for breadcrumb-level user tracking — privacy-tradeoff; defer until we have a clearer take on PII handling. Default Sentry already attaches IP + browser + URL, which is enough for triage.
- **`tracesSampleRate > 0`** (performance monitoring) — would consume the 10k traces quota fast. Skip until we have a specific perf question worth instrumenting.
- **Sourcemap upload to Sentry** — `astro.config.mjs` already wires the option; flips on automatically once `SENTRY_AUTH_TOKEN` is in Vercel envs. No extra work.
- **Custom widgets at sentry.io** — the admin widget is enough for now; build out Sentry-side dashboards on demand.

## Audit findings · residual risks to verify at implementation time

This plan is deferred until after the kiosk admin redesign. When picking it up, re-verify these points before declaring done:

1. **`@sentry/astro` major version** — Don't trust any version pin in this plan; check `npm view @sentry/astro` at install time for the current major. Confirm Astro 5.x compat in the README before adding.

2. **GitHub issue #14054 (Astro server errors not reaching Sentry on Vercel)** — Likely fixed by now, but smoke test specifically: deploy a preview, throw from an `/api/*` route, confirm event lands in Sentry. If not: add `src/middleware.ts` that wraps the request with `try/catch + Sentry.captureException` as a workaround, OR check Sentry's release notes for a `@sentry/astro` config option that addresses Vercel adapters explicitly.

3. **Cron handler instrumentation** — The `/api/news/fetch-daily` cron MUST be smoke-tested individually. Vercel cron invocations don't always trigger framework middleware. If it doesn't auto-capture, wrap the handler body in `try { … } catch (err) { Sentry.captureException(err); throw err; }` explicitly.

4. **5k errors/mo cap fragility** — The moderation pipeline (`moderateText`, `checkSpamWithGPT`, `checkImagesWithGPT`) calls OpenAI on every post/comment/event/announcement/recommendation/listing. If OpenAI rate-limits or 5xx's, the monthly cap can burn fast. The `beforeSend` filter sketched in `sentry.server.config.ts` should drop:
   - `OpenAI 429` (rate-limit) — transient, not actionable
   - `AbortError` from request cancellation
   - `MongoNetworkError` of the form "connection X to … timed out" (transient)

   Keep all other errors. Tune as real data comes in.

5. **In-memory cache in `/api/admin/errors.ts` is per-instance** — Vercel serverless spawns up to N warm containers; each has its own 60s cache. Real-world request fan-out is small for an admin route (1 admin, infrequent visits), so this is OK. If it ever becomes an issue, switch to Vercel KV / Upstash Redis (Marketplace) for shared cache. Don't pre-optimize.

6. **CSP / connect-src verification** — Before declaring Phase A done: confirm Mahalle has no Content-Security-Policy header that blocks `*.ingest.sentry.io`. Quick check: `curl -I https://mahalle-prod.vercel.app | grep -i content-security`. If a CSP exists and is restrictive, append the Sentry ingest origin to `connect-src`.

7. **GDPR posture** — `sendDefaultPii: false` is set in both configs, which suppresses IP and cookies. URLs and breadcrumbs still ship to Sentry. Mahalle is a German-market app — when shipping, audit the privacy policy to disclose Sentry as a sub-processor, including the data categories actually transmitted (URL, browser, error stack, anonymous breadcrumbs, deployment region). Sentry offers an EU data-residency option (sentry.io EU region) — prefer it when creating the project.

8. **Free-tier 1-seat limitation** — Only Ercan can sign in to sentry.io. If a future moderator/co-admin needs error access, they'd see it via the in-app widget (which proxies through Mahalle's auth) but not via sentry.io. Acceptable for now; revisit if a teammate joins.

9. **Widget styling rot** — `ErrorsWidget.svelte` mirrors the **current** moderation page style (white cards, gray-100 background, wine `#814256` accent). When `/admin/*` migrates to the Editorial Kiosk design system (paper / ink / wine tokens, Bricolage / Instrument fonts, glass utilities), this widget will need restyling. Track alongside the broader admin-redesign task; don't duplicate work by trying to ship kiosk styling pre-emptively here.

10. **Sentry session-replay quota** — Free tier includes 50 replays/mo; we explicitly disabled them in the client config (`replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`) so they don't fire and don't surprise-bill. If we ever want them, flip the on-error sample rate to `0.1` first (only sample replay on errors, not all sessions) — that keeps the quota usable.

11. **Sentry CLI install for sourcemap uploads** — `@sentry/astro` may auto-install `@sentry/cli` for sourcemap uploads. On Vercel, this should "just work"; locally, it's a build-time only dep. Verify the postinstall doesn't fail in CI / Husky pre-commit.

12. **Husky pre-commit + gitleaks** — When committing the new env example, gitleaks scans staged files. `.env.example` with placeholder values is fine; just don't commit `.env`. Already covered by `.gitignore`, but worth a glance.

## Why this is deferred (May 2026 decision)

The kiosk UI restructuring is the active work track. Wiring Sentry now means:

- The admin widget would mirror current moderation styling, which itself will be replaced when admin pages get the kiosk treatment — instant rework.
- The integration is reversible and not blocked by the redesign — adding it later is the same effort.
- Pre-launch traffic is still ~zero, so the lack of observability isn't actively hurting users.

When picking this back up, re-read the audit section above and re-verify items 1–12.

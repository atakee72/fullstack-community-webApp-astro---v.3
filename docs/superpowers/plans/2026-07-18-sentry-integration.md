# Sentry Error Monitoring + Kiosk Admin Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Mahalle production observability — errors anywhere in the app (client islands, SSR pages, API routes, crons) reach sentry.io, and the admin sees an at-a-glance "Fehler (24h)" card on `/admin/moderation`.

**Architecture:** `@sentry/astro` v10 integration (errors-only: tracing/replays OFF, `sendDefaultPii: false`, EU region) with client + server configs at project root; a server-only proxy route `/api/admin/errors` (auth via `requireAdminSession`, 60s in-memory cache, 5s timeout, `{ enabled: false }` graceful fallback) feeding a kiosk-styled `AdmErrorsCard.svelte` rendered under the moderation stat strip. Alerts are configured manually at sentry.io (runbook, no code).

**Tech Stack:** `@sentry/astro` 10.x (peer astro >=3 ✓ against our 5.14), Astro 5 SSR on `@astrojs/vercel` 9, Svelte 5 runes, kiosk-i18n.

**Supersedes:** `docs/plans/sentry-integration.md` (May 2026 draft — its Phase A/B/C shape and audit items 1–12 carry over; its codebase anchors were pre-kiosk and are corrected here). Do not delete the old file; Task 4 marks it superseded.

## Global Constraints

- **Errors only:** `tracesSampleRate: 0`, `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0` in every config. The 5k errors/mo free cap is the budget; nothing may enable tracing/replays.
- **GDPR:** `sendDefaultPii: false` in BOTH configs; Sentry project created in the **EU data-residency region**; privacy-policy disclosure is a user follow-up (runbook item).
- **Secrets:** `SENTRY_AUTH_TOKEN` is server-only — must never appear in client code, client config, or any `PUBLIC_*` var. The DSN is NOT a secret (public ingest identifier) but still lives in env, never hardcoded. Nothing secret is ever committed; gitleaks pre-commit must run (never `--no-verify`).
- **Env access is `import.meta.env.*`** — zero `process.env` in app code (repo-wide convention, verified 2026-07-18). **ONE deliberate exception:** `astro.config.mjs` runs at build/config time BEFORE Vite env injection, where `import.meta.env` is not populated — env reads there MUST use `process.env` (with a comment explaining the exception). The May draft used `import.meta.env` in the config conditional, which would have evaluated permanently falsy and silently disabled sourcemap uploads forever.
- **Admin gate:** `/api/admin/errors` uses `requireAdminSession(request)` from `src/lib/auth.ts` (tagged union `{ ok: true, userId } | { ok: false, response }`) — same as every `/api/admin/*` route. NOT the old plan's empty-allowlist `isAdmin()` (that gap was fixed in July 2026).
- **Widget is kiosk-native from day one:** paper/ink tokens, plum admin accent (`--k-accent` under `[data-page="admin"]`), `font-dmmono` labels, DE/EN copy via NEW `admin.errors.*` keys in `src/lib/kiosk-i18n.ts` (the `Dict` type enforces parity; namespace is `admin.*`, never `adm.*`).
- **Zero DB writes.** Prod and local dev share MongoDB — this plan touches no collection.
- **Type-check baseline is 29 errors** (`pnpm type-check`) — no new errors. `pnpm build` green after every task.
- **PROCESS RULE: every `.svelte` change needs a live browser gate** — implementers run their own dev server on **:4399** (NEVER :3000, that's the user's) and kill it after.
- **Commits:** plain concise messages, no AI signatures, no Co-Authored-By.
- **Named risk to respect:** `astro.config.mjs` has a large `vite.ssr.external` list (mongodb, bcrypt, …). Do NOT add Sentry packages to it; if the build errors on Sentry imports, report DONE_WITH_CONCERNS with the exact error rather than guessing at vite config changes.

## Decisions

1. **Code ships before the Sentry account exists.** `Sentry.init` with an undefined DSN is a documented no-op — the app builds and runs with monitoring disabled until env vars land. Tasks 1–3 are therefore fully implementable and verifiable (the widget's `enabled: false` state IS the pre-account behavior); the live end-to-end smoke is Task 4 and is gated on the user's one-time manual setup (below).
2. **Widget placement:** `AdmErrorsCard` renders in `ModerationApp.svelte`'s desktop tree directly after `<AdmStatRow {counts} />` (currently line 472) and before `<AdmTitleBlock>`. Desktop-only (`hidden md:block` wrapper) — mobile stays triage-only, matching the Protokoll precedent. Not in the AdminLayout ribbon (too much content for a mono echo slot).
3. **Self-fetching island, no TanStack:** ModerationApp uses plain seq-guarded `fetch()`; the widget follows suit with one `fetch('/api/admin/errors')` on mount + `setInterval` refresh every 5 min (cleared on destroy). No shared state with the queue.
4. **The proxy never leaks Sentry payloads:** it maps Sentry's issues response to exactly `{ enabled, totalLast24h, affectedUsers, topIssues: [{ id, title, count, lastSeen, permalink }] }` and drops everything else.
5. **`beforeSend` noise filter (server):** drop OpenAI 429/rate-limit errors, `AbortError`, and transient `MongoNetworkError` timeout messages — the moderation pipeline calls OpenAI on every submission and a provider incident must not burn the monthly cap. Everything else passes.
6. **ViewTransitions compatibility:** all three layouts use `<ViewTransitions />`; the document persists across navigations, so the one-shot client `Sentry.init` keeps working — no `astro:page-load` re-init. Global `window.onerror`/`unhandledrejection` handlers (which the SDK installs) survive swaps. No ErrorBoundary is added (none exists today; SDK globals suffice — YAGNI).
7. **Crons in scope for the smoke matrix:** `/api/news/fetch-daily` (Vercel cron 06:00), `/api/cron/process-deletions` (Vercel cron 05:30), and `/api/cron/log-air` (GitHub-Actions-triggered, every 30 min) — all are ordinary API routes, so server instrumentation should cover them; each gets an explicit verification item because cron invocation paths historically under-report (old audit item 3).
8. **Old-plan audit items 1–12 remain binding** where not restated here; the reviewer of each task gets the relevant ones verbatim in its brief.
9. **Init lives ONLY in the config files.** The integration entry in `astro.config.mjs` gets NO `dsn`/SDK options — when custom `sentry.{client,server}.config.ts` files exist, they own initialization, and passing init options to the integration too invites the "options ignored / double init" ambiguity. The integration entry carries only build-time concerns (`sourceMapsUploadOptions`).
10. **Honest 24h numbers only.** The Sentry issues API's `count` and `userCount` fields are issue-lifetime figures, NOT the last-24h window — summing them under a "(24H)" label would lie. The true 24h event count is the sum of the `stats['24h']` bucket values (present because we query with `statsPeriod=24h`). There is no honest per-24h affected-users source in this endpoint, so the widget shows NO users stat (dropped from the old plan's design — fake precision beats no stat only in dashboards that lie).

## Manual prerequisite (user, one-time — can happen before Task 4)

1. Sign up at sentry.io (free Developer tier) — **choose the EU region** when creating the org.
2. Create org (e.g. `mahalle`) + project `mahalle-prod`, platform "Astro". Copy the **DSN**.
3. Settings → Auth Tokens → create token with scopes `event:read` + `project:read` + `org:read` + `project:releases`. Copy it. (LIVE-TESTED 2026-07-19: the issues endpoint requires `event:read` — `project:read` alone 403s, the May draft's scope list was wrong. `project:releases` covers future sourcemap uploads with the same single token. Org auth tokens (`sntrys_`) cannot read issues at all.)
4. Fill `.env` locally AND add to Vercel (Production + Preview): `SENTRY_DSN`, `PUBLIC_SENTRY_DSN` (same value as SENTRY_DSN), `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

---

### Task 1: Capture foundation — package, integration, client/server configs, env docs

**Files:**
- Modify: `package.json` (via `pnpm add @sentry/astro`)
- Modify: `astro.config.mjs:1-29` (import + integration entry)
- Create: `sentry.client.config.ts` (project root)
- Create: `sentry.server.config.ts` (project root)
- Modify: `.env.example` (new section at end)

**Interfaces:**
- Consumes: nothing.
- Produces: working (no-op-until-DSN) Sentry wiring; env var names `SENTRY_DSN` (server), `PUBLIC_SENTRY_DSN` (client, same value), `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` — Task 2 and all provisioning use these verbatim; Vercel env setup MUST include `PUBLIC_SENTRY_DSN` or client capture silently stays dark.

- [ ] **Step 1:** `pnpm add @sentry/astro` (expect 10.x; if a different MAJOR installs, stop and report NEEDS_CONTEXT with the version).

- [ ] **Step 2:** `astro.config.mjs` — add `import sentry from '@sentry/astro';` with the other imports, and make the integration the FIRST entry of the `integrations` array (before `auth()`):

```js
integrations: [
  sentry({
    // NO dsn / SDK options here — initialization lives exclusively in
    // sentry.client.config.ts + sentry.server.config.ts (Decision 9).
    // process.env, NOT import.meta.env: astro.config.mjs runs before
    // Vite env injection, where import.meta.env is not populated —
    // this is the repo's one sanctioned process.env site.
    // Missing token must not fail the build — uploads turn on when it lands.
    ...(process.env.SENTRY_AUTH_TOKEN
      ? {
          sourceMapsUploadOptions: {
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
          },
        }
      : {}),
  }),
  auth(),
  // ...existing entries unchanged, order preserved
],
```

Check the installed version's README before writing: if `@sentry/astro@10`'s documented shape for custom-config-file setups differs (e.g. an explicit option to point at the config files), follow the installed version's documented shape and say so in the report — the config files below own initialization either way.

- [ ] **Step 3:** Create `sentry.client.config.ts`:

```ts
// Sentry browser SDK — errors only. Tracing and session replay are
// deliberately OFF (5k errors/mo free cap is the whole budget) and
// sendDefaultPii false suppresses IP + cookies (GDPR; EU-region org).
// With SENTRY_DSN unset, init is a documented no-op — the app runs
// with monitoring disabled until env vars land.
import * as Sentry from '@sentry/astro';

Sentry.init({
  // PUBLIC_ prefix REQUIRED: Astro only exposes PUBLIC_*-prefixed env
  // vars to the client bundle — a bare SENTRY_DSN statically inlines to
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
```

- [ ] **Step 4:** Create `sentry.server.config.ts`:

```ts
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
```

- [ ] **Step 5:** `.env.example` — append, mirroring the file's `# Section Name` style:

```
# Sentry Error Monitoring
# DSN is a public ingest identifier (not a secret). AUTH_TOKEN is
# SERVER-ONLY — never expose to the client; needed for the admin
# errors widget + sourcemap uploads. Org/project: sentry.io slugs.
SENTRY_DSN=your-sentry-dsn-here
PUBLIC_SENTRY_DSN=your-sentry-dsn-here
SENTRY_AUTH_TOKEN=your-sentry-auth-token-here
SENTRY_ORG=your-org-slug-here
SENTRY_PROJECT=your-project-slug-here
```

(`SENTRY_DSN` and `PUBLIC_SENTRY_DSN` carry the SAME value — the server reads the bare name, the client bundle can only see `PUBLIC_`-prefixed vars. Both are the public ingest URL, not secrets.)

- [ ] **Step 6:** Gates: `pnpm type-check` (29 baseline) and `pnpm build` — both must pass WITHOUT any Sentry env vars set (proves the no-DSN/no-token paths). If the build trips on the `vite.ssr.external` boundary, stop per Global Constraints.

- [ ] **Step 7:** Boot gate: `pnpm dev --port 4399`, load `/` and one API route (`curl -s localhost:4399/api/news >/dev/null; echo $?`) — no startup errors in the server log from the Sentry integration. Kill the server.

- [ ] **Step 8:** Commit: `git add package.json pnpm-lock.yaml astro.config.mjs sentry.client.config.ts sentry.server.config.ts .env.example && git commit -m "feat(observability): Sentry capture foundation — errors-only, GDPR-safe, no-op without DSN"`

---

### Task 2: `/api/admin/errors` proxy

**Files:**
- Create: `src/pages/api/admin/errors.ts`

**Interfaces:**
- Consumes: `requireAdminSession` (`src/lib/auth.ts:26` — `Promise<{ ok: true; userId: string } | { ok: false; response: Response }>`); env names from Task 1.
- Produces (Task 3's contract): `GET /api/admin/errors` →
  `{ enabled: false }` when any of TOKEN/ORG/PROJECT is unset, else
  `{ enabled: true, totalLast24h: number, topIssues: Array<{ id: string; title: string; count24h: number; permalink: string }> }` (max 3 topIssues; all counts are TRUE 24h figures from `stats['24h']` buckets — Decision 10). Errors: 401/403 via guard; 502 `{ error: 'sentry_unreachable' }` on upstream failure/timeout.

- [ ] **Step 1:** Create the route:

```ts
import type { APIRoute } from 'astro';
import { requireAdminSession } from '../../../lib/auth';

// Server-only proxy to Sentry's REST API. Exists so SENTRY_AUTH_TOKEN
// never ships to the client and so the widget gets a minimal shape
// instead of raw Sentry payloads. 60s in-memory cache: Sentry's
// free-tier API rate limits are tight, and the cache is per-serverless-
// instance (fine for a one-admin route — audit item 5; don't Redis this).
const CACHE_TTL_MS = 60_000;
let cache: { data: unknown; expires: number } | null = null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ request }) => {
  const guard = await requireAdminSession(request);
  if (!guard.ok) return guard.response;

  const token = import.meta.env.SENTRY_AUTH_TOKEN;
  const org = import.meta.env.SENTRY_ORG;
  const project = import.meta.env.SENTRY_PROJECT;
  if (!token || !org || !project) return json({ enabled: false });

  if (cache && cache.expires > Date.now()) return json(cache.data);

  try {
    const res = await fetch(
      `https://sentry.io/api/0/projects/${org}/${project}/issues/?statsPeriod=24h&query=is:unresolved&limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return json({ error: 'sentry_unreachable' }, 502);

    type SentryIssue = {
      id: string;
      title: string;
      permalink: string;
      // With ?statsPeriod=24h the serializer includes per-issue 24h
      // buckets: stats['24h'] = [[unixTs, count], ...]. Summing these
      // is the TRUE last-24h event count. The top-level `count` /
      // `userCount` fields are issue-LIFETIME figures — never use
      // them under a "(24h)" label (Decision 10).
      stats?: { '24h'?: Array<[number, number]> };
    };
    const issues = (await res.json()) as SentryIssue[];

    const count24h = (i: SentryIssue) =>
      (i.stats?.['24h'] ?? []).reduce((s, [, n]) => s + n, 0);

    const withCounts = issues
      .map((i) => ({ id: i.id, title: i.title, permalink: i.permalink, count24h: count24h(i) }))
      .sort((a, b) => b.count24h - a.count24h);

    const data = {
      enabled: true,
      totalLast24h: withCounts.reduce((s, i) => s + i.count24h, 0),
      topIssues: withCounts.slice(0, 3),
    };
    cache = { data, expires: Date.now() + CACHE_TTL_MS };
    return json(data);
  } catch (err) {
    console.error('sentry proxy error:', err);
    return json({ error: 'sentry_unreachable' }, 502);
  }
};
```

- [ ] **Step 2:** Gates: `pnpm type-check` (29 baseline) + `pnpm build`.

- [ ] **Step 3:** Behavior check on :4399 (no Sentry env set): `curl -s -o /dev/null -w "%{http_code}\n" localhost:4399/api/admin/errors` → **401** (guard fires before env check — verify this ordering in the code too). Then with the three env vars set to dummies in the shell env for one run (`SENTRY_AUTH_TOKEN=x SENTRY_ORG=x SENTRY_PROJECT=x pnpm dev --port 4399`): logged-out curl still 401. (Authenticated 200/`{enabled:false}`/502 paths are exercised in Task 3's browser gate through the widget, and live in Task 4.) Kill the server.

- [ ] **Step 4:** Commit: `git add src/pages/api/admin/errors.ts && git commit -m "feat(observability): admin errors proxy — requireAdminSession, 60s cache, 5s timeout"`

---

### Task 3: `AdmErrorsCard.svelte` — kiosk widget + i18n

**Files:**
- Create: `src/components/admin/kiosk/AdmErrorsCard.svelte`
- Modify: `src/components/admin/kiosk/ModerationApp.svelte` (~line 472: one import + one mount line)
- Modify: `src/lib/kiosk-i18n.ts` (new `admin.errors.*` keys, BOTH dicts)

**Interfaces:**
- Consumes: Task 2's response contract verbatim; kiosk-i18n `t`/`tStr` stores; kiosk tokens (`--k-paper-warm`, `--k-ink`, `--k-rule`, `--k-accent` = plum on admin, `--k-danger`).
- Produces: nothing consumed later.

- [ ] **Step 1:** i18n keys (mirror the `admin.*` section style; `Dict` parity enforced by tsc):

| Key | DE | EN |
|---|---|---|
| `admin.errors.kicker` | `SENTRY · FEHLER (24H)` | `SENTRY · ERRORS (24H)` |
| `admin.errors.total` | `EREIGNISSE` | `EVENTS` |
| `admin.errors.top` | `HÄUFIGSTE` | `TOP ISSUES` |
| `admin.errors.none` | `Keine offenen Fehler — die Presse läuft rund.` | `No open errors — the presses run clean.` |
| `admin.errors.open` | `in Sentry öffnen ↗` | `open in Sentry ↗` |
| `admin.errors.disabled` | `Fehler-Monitoring nicht konfiguriert (SENTRY_* Env-Variablen setzen).` | `Error monitoring not configured (set the SENTRY_* env vars).` |
| `admin.errors.unreachable` | `Sentry nicht erreichbar — später erneut versuchen.` | `Sentry unreachable — try again later.` |
| `admin.errors.count` | `{n}×` | `{n}×` |

- [ ] **Step 2:** `AdmErrorsCard.svelte` — Svelte 5 runes, self-fetching. Anatomy (match `AdmStatRow`/`AdmQueueCard` idiom — read both first): full-width card `background: var(--k-paper-warm)`, `1.5px solid var(--k-ink)` border, kiosk radius, margin aligned to the stat strip's `padding: 18px 36px 0` gutter. Header row: mono 10px tracked kicker in `--k-accent` (plum) + right-aligned `admin.errors.open` link (`https://{org-less — the permalink carries the org}` — use the FIRST topIssue's permalink origin when present, else `https://sentry.io`, `target="_blank" rel="noopener"`). States:
  - **loading:** one-line skeleton (reuse the `.k-skeleton` class from motion.css if present — check; else a paperSoft shimmer block).
  - **`enabled: false`:** single muted mono line `admin.errors.disabled`. No error styling — this is the normal pre-setup state.
  - **502/fetch error:** mono line `admin.errors.unreachable` in `--k-warn` tone. No toast spam (the card IS the signal); no retry button — the 5-min interval retries.
  - **loaded, zero issues:** Instrument-italic `admin.errors.none` line.
  - **loaded, issues:** inline stat (mono: `{totalLast24h} {$t['admin.errors.total']}`) + up to 3 issue rows: `--k-danger` count chip (`tStr($t['admin.errors.count'], { n: issue.count24h })`), title truncated with `title=` tooltip, each row an `<a href={permalink} target="_blank" rel="noopener">`. No users stat (Decision 10 — no honest 24h source).
  
  Fetch logic: `fetchErrors()` on mount + `setInterval(fetchErrors, 5 * 60_000)` cleared on destroy; a `seq` guard like ModerationApp's so a stale response can't overwrite a newer one.

- [ ] **Step 3:** Mount in `ModerationApp.svelte` desktop tree:

```svelte
<AdmStatRow {counts} />
<AdmErrorsCard />
<AdmTitleBlock {view} onViewChange={handleViewChange} />
```

(plus the import at the top with the other `Adm*` imports). Desktop block only — do not touch the `md:hidden` mobile tree.

- [ ] **Step 4:** Gates: `pnpm type-check` (29 baseline) + `pnpm build`.

- [ ] **Step 5:** Browser gate on :4399 (needs an admin session — use the playwright auth workflow from `reference_playwright_auth` memory / saved cookie if still valid; if no valid admin cookie is available, report DONE_WITH_CONCERNS naming exactly which visual states were verified logged-out vs pending): `/admin/moderation` → card renders between stat strip and title block showing the `disabled` state (no env vars locally); DE/EN toggle flips all card copy; mobile 390px → card absent. Console clean. Kill the server.

- [ ] **Step 6:** Commit: `git add src/components/admin/kiosk/AdmErrorsCard.svelte src/components/admin/kiosk/ModerationApp.svelte src/lib/kiosk-i18n.ts && git commit -m "feat(observability): kiosk errors card on admin moderation"`

---

### Task 4: Docs, supersession, smoke runbook (+ live E2E if env vars exist)

**Files:**
- Modify: `docs/plans/sentry-integration.md` (top banner: superseded by this plan)
- Modify: `src/components/admin/CLAUDE.md` (AdmErrorsCard + proxy section)
- Modify: root `CLAUDE.md` (short "Error monitoring (Sentry)" bullet under an infra-appropriate section + `.env` table additions)
- Create: `docs/runbooks/sentry-smoke.md`

- [ ] **Step 1:** Old plan: insert under its title: `> **SUPERSEDED (2026-07-18)** by docs/superpowers/plans/2026-07-18-sentry-integration.md — anchors here are pre-kiosk.`

- [ ] **Step 2:** `src/components/admin/CLAUDE.md`: document AdmErrorsCard (placement, states, 5-min refresh, seq guard) + `/api/admin/errors` (guard-before-env-check ordering, cache-per-instance caveat, response contract).

- [ ] **Step 3:** Root `CLAUDE.md`: add the 4 SENTRY_* vars to the Environment Variables block (marking AUTH_TOKEN server-only) and a 3-4 line "Error monitoring" bullet: errors-only config, beforeSend transient filter, widget location, runbook pointer.

- [ ] **Step 4:** `docs/runbooks/sentry-smoke.md` — the checklist the user (or a later session) runs once env vars are set, copied from the old plan's Phase A/C and updated:
  1. Deploy preview with env vars → throw from an API route via a temporary `?sentry-test` guard → event at sentry.io within ~30s (**this is the #14054 Astro-on-Vercel server-error check — the critical one**; fallback if it fails: `Sentry.captureException` wrapper middleware, see old plan audit item 2).
  2. Browser error (`setTimeout(() => { throw new Error('client-test') })` in DevTools) → event lands.
  3. Cron coverage: next scheduled runs of `/api/news/fetch-daily`, `/api/cron/process-deletions`, and one GH-Actions `/api/cron/log-air` invocation — confirm any thrown error would report (or wrap handlers per audit item 3 if not).
  4. Widget live: `/admin/moderation` shows real counts; second load within 60s serves cache (no second Sentry API hit).
  5. Alerts (sentry.io UI): "new issue in production" email alert; 100%-in-1h spike alert; 80% quota alert.
  6. CSP check: `curl -I <prod-url> | grep -i content-security` → if a CSP ever exists, `*.ingest.sentry.io` must be in connect-src (none today).
  7. Privacy policy: add Sentry as sub-processor (EU region, data categories: error stack, URL, browser, breadcrumbs — no IP/cookies).

- [ ] **Step 5:** IF `SENTRY_DSN` + `SENTRY_AUTH_TOKEN` are present in the local `.env` at execution time, run runbook items 1, 2, 4 now against a preview deploy and record evidence in the task report; otherwise state plainly that live smoke awaits the manual prerequisite.

- [ ] **Step 6:** Gates: `pnpm type-check` + `pnpm build`. Commit: `git add -A && git commit -m "docs(observability): sentry docs, smoke runbook, supersede old plan"`

---

## Self-Review Notes (done at plan time)

- **Spec coverage vs old plan:** Phase A → Task 1 (+ config-shape flexibility for v10); Phase B → Tasks 2-3 (widget now kiosk-native, `requireAdminSession`, i18n'd — resolves old audit items 9 and the auth caveat); Phase C → Task 4 runbook (manual, unchanged); audit items 1 (version: 10.66.0 checked 2026-07-18), 2/3 (runbook items 1+3), 4 (beforeSend in Task 1), 5 (cache comment), 6 (runbook 6), 7 (EU + runbook 7), 8 (unchanged), 9 (resolved — kiosk from day one), 10 (replays 0 kept), 11 (Task 1 Step 6/7 build+boot gates), 12 (gitleaks in Global Constraints).
- **Type consistency:** proxy response shape in Task 2 Interfaces = the shape Task 3 consumes (`count24h`, no `affectedUsers`/`lastSeen`); `permalink` naming consistent (old plan mixed `link`/`permalink` — standardized on `permalink`).
- **Placeholder scan:** clean; the only deliberately-deferred work (live smoke) is explicitly gated on the user's manual prerequisite, not a TBD.
- **Audit round (2026-07-18) fixed 3 latent defects before execution:** (1) `import.meta.env` in `astro.config.mjs` is never populated → the May conditional would have silently disabled sourcemap uploads forever — now `process.env` with a sanctioned-exception constraint; (2) Sentry issue `count`/`userCount` are lifetime figures → summing them under a "(24H)" label lies — now `stats['24h']` bucket sums, users stat dropped (Decision 10); (3) dsn passed to both integration and config files invites v10 double-init ambiguity — init now lives only in the config files (Decision 9).

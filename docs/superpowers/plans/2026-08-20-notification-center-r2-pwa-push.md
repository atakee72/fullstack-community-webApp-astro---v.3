# Notification Center R2 — PWA Shell + Web Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver notifications to members' devices via web push, riding a minimal PWA shell (manifest + icons + installability + a push-only service worker) with an explicit opt-in in the notification panel's reserved foot slot.

**Architecture:** The PWA is the delivery vehicle; notifications are the cargo. A static `public/sw.js` handles `push` + `notificationclick` ONLY (no offline caching, no fetch interception — locked 2026-08-06). `pushSubscriptions` collection maps browser push endpoints to userIds; `notify()`/`notifyAllMembers()` grow a best-effort push send after the doc insert (never-throw, 404/410 endpoints pruned). Opt-in UI lives in the `.nc-foot` slot R1 reserved.

**Tech Stack:** Astro 5 (Vercel serverless, fra1), Svelte 5 kiosk islands, MongoDB 6 direct driver, `web-push` npm package, Zod, Sentry.

**Spec:** `docs/superpowers/specs/2026-08-18-notification-center-design.md` — section "Release 2 outline" is the binding scope; sections "Data model" / "Write hooks" define the R1 machinery this extends. Foot-slot visuals: user ruling 2026-08-20 — built directly in kiosk tokens, no CD handoff (CD polish pass possible later).

## Global Constraints

- **Service worker is push-only**: `push` + `notificationclick` handlers and lifecycle (`install`/`activate`) ONLY. NO `fetch` handler, NO caching, NO precache — locked user decision 2026-08-06. A reviewer seeing any `caches.*` or `fetch` event listener in `sw.js` must reject.
- **Never-throw contract** (spec "Write hooks"): a failed push send must never fail the parent request. Catch → `Sentry.captureException` + `await Sentry.flush(2000)` (Vercel freezes the function when the response leaves — unflushed events are lost), then continue.
- **No rendered copy stored in the DB.** Push payloads are transient (not stored), so server-side rendering is allowed there; payload copy is **German only** (the server cannot see the client-side locale toggle) — accepted limitation, documented.
- **Typographic quotes must be BYTE-VERIFIED.** German copy uses ‚…‘ (U+201A / U+2018) and „…" (U+201E / U+201C); English uses ‘…’ (U+2018 / U+2019). The Edit tool normalizes Unicode quotes silently — write i18n/copy strings via a **python heredoc with byte asserts**, then verify with `od -c` (grep the specific line and check the escape bytes: U+2018 = `\342\200\230`, U+201A = `\342\200\232`, U+2019 = `\342\200\231`, U+201E = `\342\200\236`). This bit three times in R1/landing; it is not optional.
- **Secrets:** `VAPID_PRIVATE_KEY` is a secret — never committed, never printed into chat/logs/reports. `.env` is gitignored; only `.env` key NAMES go into docs. `PUBLIC_VAPID_PUBLIC_KEY` is public by design (it ships in the client bundle).
- **Nested-island CSS orphan rule:** any styles for components reachable only through the `KioskNav` island go in `src/styles/global.css` under the `.nc-*` prefix — never in a `<style>` block in the component.
- **Env access convention:** server modules read `import.meta.env.X` (see `src/lib/email/mailer.ts`), never `process.env`.
- **Verification gates per task:** `pnpm type-check` (pre-existing baseline: 29 errors — the gate is "no NEW errors") and `pnpm build` green. Any task touching a `.svelte` file or `global.css` additionally requires the **browser gate** (dev server on port 4655 — NEVER port 3000, that's the user's own server; check `ss -tlnp | grep 4655` first, teardown with pkill afterwards). There is no test framework in this repo; browser verification is the test.
- **No motion on bell/badge, ever** (CD ruling, R1). The foot-slot UI gets no entrance animation either — it renders in place with the panel.
- **DB:** all work against the dev DB `mahalle-dev` (the local `.env` URI). NEVER write to prod `mahalle` during development — real users live there.
- **Commits:** simple concise messages, no Claude signature/footer (user's global git rules).

## File map

| File | Role |
|---|---|
| `public/manifest.webmanifest` | Create — PWA manifest |
| `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Create — app icons (generated once, committed as binaries) |
| `public/sw.js` | Create — push-only service worker |
| `src/layouts/{KioskLayout,AuthLayout,LandingLayout,BaseLayout,AdminLayout}.astro` | Modify — manifest/theme/apple-touch head tags (5 layouts; blog layouts nest inside these and need nothing) |
| `src/lib/pushClient.ts` | Create — dependency-pure CLIENT helper (support detection, subscribe/unsubscribe) |
| `src/schemas/push.schema.ts` | Create — Zod schema for the subscribe body |
| `src/pages/api/push/subscribe.ts`, `unsubscribe.ts` | Create — session-gated endpoints |
| `src/lib/push.ts` | Create — SERVER-only web-push sender + German payload copy |
| `src/lib/notifications.ts` | Modify — `notify()`/`notifyAllMembers()` call the push sender after insert |
| `src/lib/auth/accountDeletion.ts` | Modify — delete `pushSubscriptions` on tombstone |
| `scripts/create-notification-indexes.ts` | Modify — `pushSubscriptions` indexes |
| `src/components/forum/kiosk/NotificationPanel.svelte` | Modify — foot-slot opt-in UI |
| `src/lib/kiosk-i18n.ts` | Modify — `nc.push.*` keys DE/EN |
| `src/styles/global.css` | Modify — `.nc-foot--live`, `.nc-push-*` styles |
| `README.md`, `CLAUDE.md` | Modify — env vars, collection, PWA notes |

---

### Task 1: PWA shell — manifest, icons, layout head tags

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`
- Modify: `src/layouts/KioskLayout.astro`, `src/layouts/AuthLayout.astro`, `src/layouts/LandingLayout.astro`, `src/layouts/BaseLayout.astro`, `src/layouts/AdminLayout.astro` (head section of each)

**Interfaces:**
- Consumes: `public/favicon.svg` (existing logo: teal `#4b9aaa` circle, ochre `#eccc6e` "M").
- Produces: `/manifest.webmanifest`, `/icons/icon-192.png` (Task 2's SW uses this as notification icon), installable app shell.

- [ ] **Step 1: Generate icons** — write this one-off script as `gen-icons.mjs` **in the repo root** (Node ESM resolves the bare `sharp` import from the script file's own directory upward — a scratchpad copy in `/tmp` would NOT find the repo's `node_modules`), run it with `node gen-icons.mjs`, then `rm gen-icons.mjs` BEFORE committing. `sharp` is already present transitively via Astro (`node_modules/sharp` exists — no install):

```js
// gen-icons.mjs — one-off; uses the repo's transitive sharp
import sharp from 'sharp';
import { mkdirSync } from 'fs';

const OUT = 'public/icons';
mkdirSync(OUT, { recursive: true });

// Standard icons: rasterize the favicon artwork (circle logo, transparent corners).
const standard = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="#4b9aaa"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="50" font-weight="bold" fill="#eccc6e">M</text>
</svg>`);
await sharp(standard).resize(192, 192).png().toFile(`${OUT}/icon-192.png`);
await sharp(standard).resize(512, 512).png().toFile(`${OUT}/icon-512.png`);

// Maskable: FULL-BLEED teal background (maskable icons get cropped to arbitrary
// shapes — transparent corners would show the OS background), logo content
// scaled into the inner 80% safe zone.
const maskable = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#4b9aaa"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".32em" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#eccc6e">M</text>
</svg>`);
await sharp(maskable).resize(512, 512).png().toFile(`${OUT}/icon-maskable-512.png`);
console.log('icons written');
```

Run: `node <scratchpad>/gen-icons.mjs` (from repo root). Then verify: `file public/icons/*.png` reports three PNGs at the right dimensions. If the WSL environment lacks a font for `Arial`, sharp/librsvg falls back to a default sans — visually check one PNG (open it with the Read tool, which renders images) and accept any bold sans "M".

- [ ] **Step 2: Write `public/manifest.webmanifest`**

```json
{
  "name": "Mahalle",
  "short_name": "Mahalle",
  "description": "Mahalle — die Community-App für den Schillerkiez.",
  "lang": "de",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f3ead8",
  "theme_color": "#f3ead8",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`start_url` is `/` deliberately: logged-in members get SSR-redirected to `/forum`, logged-out installers land on the public landing — both correct. `#f3ead8` is the kiosk paper token (`tailwind.config.mjs` → `paper.DEFAULT`).

- [ ] **Step 3: Add head tags to all 5 layouts.** In each of `KioskLayout.astro`, `AuthLayout.astro`, `LandingLayout.astro`, `AdminLayout.astro`, add directly after the existing `<link rel="icon" ...>` line (each layout has one — verified):

```html
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#f3ead8" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

In `BaseLayout.astro` add the same three lines but with `content="#0e1033"` — its pages (legacy dark-glass: calendar, newsboard, marketplace, profile) sit on dark indigo, and the browser-UI tint should match the page, not the kiosk paper. The manifest's own `theme_color` stays paper (`#f3ead8`, the app's dominant identity).

The blog layouts (`src/layouts/blog/*`) render inside these and own no `<head>` — do not touch them.

- [ ] **Step 4: Verify** — `pnpm type-check` (no new errors vs baseline 29) and `pnpm build` green. Then with the dev server: `curl -s localhost:4655/manifest.webmanifest | head` returns the JSON, `curl -sI localhost:4655/icons/icon-192.png` returns 200 `image/png`.

- [ ] **Step 5: Commit**

```bash
git add public/manifest.webmanifest public/icons src/layouts/*.astro
git commit -m "feat: PWA shell — manifest, icons, layout head tags"
```

---

### Task 2: Service worker + client push helper

**Files:**
- Create: `public/sw.js`
- Create: `src/lib/pushClient.ts`

**Interfaces:**
- Consumes: `/icons/icon-192.png` (Task 1).
- Produces: `pushClient.ts` exports used verbatim by Task 5's UI:
  - `detectPushState(): Promise<'hidden' | 'ios-install' | 'denied' | 'subscribed' | 'ready'>`
  - `subscribeToPush(): Promise<boolean>` (returns false on any failure incl. permission denied)
  - `unsubscribeFromPush(): Promise<void>`
- Produces: push payload contract the SW parses — `{ title: string, body: string, href: string }` JSON (Task 4's sender must emit exactly this shape).

- [ ] **Step 1: Write `public/sw.js`** — the ENTIRE file; a reviewer must reject any `fetch` event listener or `caches.*` usage (Global Constraints):

```js
/**
 * Mahalle service worker — PUSH ONLY.
 * Deliberately NO fetch handler and NO caching (locked decision 2026-08-06):
 * live community content + auth-gated SSR = stale-cache misery. This worker
 * exists solely so web push can wake it. Do not add offline features here.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* malformed payload → generic notification below */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Mahalle', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { href: data.href || '/forum' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || '/forum';
  event.waitUntil(
    (async () => {
      // No fetch handler → pages are uncontrolled; must includeUncontrolled.
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          await w.focus();
          // navigate() rejects on clients this SW doesn't control (e.g. a
          // hard-reloaded tab) — swallow it; a focused window still wins.
          if ('navigate' in w) await w.navigate(href).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(href);
    })(),
  );
});
```

- [ ] **Step 2: Write `src/lib/pushClient.ts`** — dependency-pure (browser APIs only; no mongodb/server imports — this rides in the `KioskNav` island bundle):

```ts
/**
 * Client-side push helpers for the notification panel's opt-in UI.
 * DEPENDENCY-PURE (browser APIs only) — bundled into the KioskNav island.
 *
 * The service worker is registered LAZILY (at opt-in / state detection),
 * never at page load: registration persists across sessions once done, and
 * push wakes the SW regardless of open pages.
 */

const VAPID_PUBLIC_KEY = import.meta.env.PUBLIC_VAPID_PUBLIC_KEY as string | undefined;

export type PushUiState = 'hidden' | 'ios-install' | 'denied' | 'subscribed' | 'ready';

function supported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!VAPID_PUBLIC_KEY
  );
}

function isIOS(): boolean {
  // iPadOS 13+ reports as Mac — the maxTouchPoints check catches it.
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

/** What the foot slot should render right now. */
export async function detectPushState(): Promise<PushUiState> {
  // iOS Safari exposes the Push API only inside a home-screen-installed PWA —
  // an uninstalled iOS visitor sees the install hint, not a dead button.
  if (isIOS() && !isStandalone()) return supported() ? 'ready' : 'ios-install';
  if (!supported()) return 'hidden';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return sub ? 'subscribed' : 'ready';
  } catch {
    return 'ready';
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Register SW, request permission, subscribe, persist server-side. */
export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!supported()) return false;
    await navigator.serviceWorker.register('/sw.js');
    // subscribe() needs an ACTIVE worker — a freshly registered one is still
    // installing, and subscribing against it throws InvalidStateError.
    const reg = await navigator.serviceWorker.ready;
    // Must run inside the user gesture that triggered this call.
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    });
    const r = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!r.ok) {
      // Server rejected — don't leave a dangling browser subscription.
      await sub.unsubscribe().catch(() => {});
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Best-effort teardown: server row first, then the browser subscription. */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  } catch {
    /* best-effort */
  }
}
```

iOS branch rationale: uninstalled iOS Safari has no `PushManager`, so `supported()` is false there and the line returns `'ios-install'` (the hint). Installed-standalone iOS (16.4+) never enters that branch and takes the normal flow. The `supported() ? 'ready' : 'ios-install'` guard only matters if a future iOS exposes push in-browser — then the button shows instead of a stale hint.

- [ ] **Step 3: Verify** — `pnpm type-check` (no new errors), `pnpm build` green, and `curl -s localhost:4655/sw.js | head -5` serves the file. (`PUBLIC_VAPID_PUBLIC_KEY` doesn't exist yet — `supported()` returns false and the UI stays hidden; that's correct until Task 3.)

- [ ] **Step 4: Commit**

```bash
git add public/sw.js src/lib/pushClient.ts
git commit -m "feat: push-only service worker + client push helper"
```

---

### Task 3: Server side — dependency, env, `pushSubscriptions`, subscribe/unsubscribe API, deletion step, indexes

**Files:**
- Modify: `package.json` (via `pnpm add`)
- Create: `src/schemas/push.schema.ts`
- Create: `src/pages/api/push/subscribe.ts`
- Create: `src/pages/api/push/unsubscribe.ts`
- Modify: `src/lib/auth/accountDeletion.ts` (add one step next to the existing `notifications` step at ~line 241)
- Modify: `scripts/create-notification-indexes.ts`
- Modify: local `.env` (dev VAPID keys — NOT committed; `.env` is gitignored)

**Interfaces:**
- Consumes: `getSession` from `auth-astro/server`, `connectDB` from `src/lib/mongodb.ts` (existing API-route pattern).
- Produces: collection `pushSubscriptions` `{ endpoint: string (unique), keys: { p256dh: string, auth: string }, userId: string, createdAt: Date, updatedAt: Date }`; endpoints `POST /api/push/subscribe` (body = `PushSubscription.toJSON()`), `POST /api/push/unsubscribe` (body = `{ endpoint }`); env vars `VAPID_PRIVATE_KEY` + `PUBLIC_VAPID_PUBLIC_KEY` that Task 4 reads.

- [ ] **Step 1: Install web-push**

```bash
pnpm add web-push && pnpm add -D @types/web-push
```

- [ ] **Step 2: Generate DEV VAPID keys** and append to the local `.env` WITHOUT the private key ever hitting the terminal/transcript (piped end to end):

```bash
npx web-push generate-vapid-keys --json | python3 -c '
import json, sys
d = json.load(sys.stdin)
with open(".env", "a") as f:
    f.write(f"\nPUBLIC_VAPID_PUBLIC_KEY={d[\"publicKey\"]}\nVAPID_PRIVATE_KEY={d[\"privateKey\"]}\n")
print("appended 2 keys to .env")
'
```

Then `grep -c VAPID .env` → 2 (counts lines, prints no values). `.env` is gitignored; prod gets its OWN pair at deploy time (Task 6) — dev keys never reach Vercel.

- [ ] **Step 3: Write `src/schemas/push.schema.ts`**

```ts
import { z } from 'zod';

/** Body of POST /api/push/subscribe — PushSubscription.toJSON() shape.
 *  expirationTime is sent by browsers but unused; unknown keys are stripped. */
export const PushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export const PushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});
```

- [ ] **Step 4: Write `src/pages/api/push/subscribe.ts`**

```ts
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { PushSubscribeSchema } from '../../../schemas/push.schema';

/**
 * Upsert keyed on endpoint: a browser re-subscribing (or a different account
 * logging in on the same browser) takes the endpoint over — one endpoint
 * always belongs to exactly one user, matching the device's current session.
 */
export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }
  const parsed = PushSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid_subscription' }), { status: 400 });
  }
  const db = await connectDB();
  const now = new Date();
  await db.collection('pushSubscriptions').updateOne(
    { endpoint: parsed.data.endpoint },
    {
      $set: { keys: parsed.data.keys, userId: session.user.id, updatedAt: now },
      $setOnInsert: { endpoint: parsed.data.endpoint, createdAt: now },
    },
    { upsert: true },
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 5: Write `src/pages/api/push/unsubscribe.ts`**

```ts
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { PushUnsubscribeSchema } from '../../../schemas/push.schema';

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }
  const parsed = PushUnsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 });
  }
  const db = await connectDB();
  // userId in the filter: you can only delete your own subscription row.
  await db
    .collection('pushSubscriptions')
    .deleteOne({ endpoint: parsed.data.endpoint, userId: session.user.id });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

(Astro 5's built-in CSRF origin check covers these POSTs like every other route — no extra guard, same reasoning as the R1 `read` endpoint.)

- [ ] **Step 6: Account-deletion cleanup.** In `src/lib/auth/accountDeletion.ts`, directly after the existing `notifications` deletion step (~line 241–248, the block commented "Received notifications are orphaned junk…"), add a sibling step following the exact same `steps.X = deletedCount` / `fail('X', err)` structure used there:

```ts
  // Push subscriptions are device credentials for this account — dead weight
  // (and a stray-push risk) once the account tombstones.
  try {
    const delPush = await db.collection('pushSubscriptions').deleteMany({ userId });
    steps.pushSubscriptions = delPush.deletedCount ?? 0;
  } catch (err) {
    fail('pushSubscriptions', err);
  }
```

(Read the surrounding function first and mirror its local naming — `steps`/`fail` are illustrative of the existing structure; use whatever identifiers that file actually uses.)

- [ ] **Step 7: Indexes.** In `scripts/create-notification-indexes.ts` `main()`, after the two existing `ensureIndex` calls, add:

```ts
  // R2: push subscriptions. Endpoint is the natural key (one row per browser
  // subscription; re-subscribe/account-switch upserts take it over).
  await ensureIndex(db, 'pushSubscriptions', { endpoint: 1 }, {
    name: 'push_endpoint_unique',
    unique: true,
  });
  // Send-time fan-in: sendPushToUsers queries { userId: { $in: [...] } }.
  await ensureIndex(db, 'pushSubscriptions', { userId: 1 }, {
    name: 'push_user',
  });
```

Run it against dev: `pnpm tsx scripts/create-notification-indexes.ts` → prints `Done (db: mahalle-dev).` (Prod run happens at deploy, Task 6.)

- [ ] **Step 8: Verify** — `pnpm type-check` (no new errors), `pnpm build` green. Then against the dev server: `curl -s -X POST localhost:4655/api/push/subscribe -H 'Content-Type: application/json' -d '{}'` → 401 (no session; note a curl POST may also hit Astro's CSRF 403 — either non-2xx proves the gate).

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml src/schemas/push.schema.ts src/pages/api/push scripts/create-notification-indexes.ts src/lib/auth/accountDeletion.ts
git commit -m "feat: pushSubscriptions collection, subscribe/unsubscribe API, VAPID env"
```

---

### Task 4: Push sender + wiring into notify()/notifyAllMembers()

**Files:**
- Create: `src/lib/push.ts`
- Modify: `src/lib/notifications.ts`

**Interfaces:**
- Consumes: `NotificationType`, `NotificationTarget`, `NotificationMeta` from `src/types/notification.ts`; `NotifyInput` shape (Task's own param mirrors it structurally); collection from Task 3; payload contract from Task 2 (`{ title, body, href }`).
- Produces: `sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void>`, `sendPushToAllExcept(exceptUserId: string | undefined, payload: PushPayload): Promise<void>`, `buildPushPayload(type, target, meta): PushPayload` — all exported from `src/lib/push.ts`.

- [ ] **Step 1: Write `src/lib/push.ts`** — SERVER-ONLY (imports `connectDB`; must never be imported from client code). The German copy strings contain ‚…‘ quotes — write this file's `COPY` section via python heredoc and byte-verify per Global Constraints:

```ts
/**
 * Web-push sender. SERVER-ONLY (imports connectDB + web-push).
 *
 * NEVER-THROW by contract, same as src/lib/notifications.ts: a failed push
 * must never fail the parent request. Dead subscriptions (404/410 from the
 * push service) are pruned on send. With VAPID env unset (preview deploys,
 * fresh dev), every send is a silent no-op — the in-app center is the
 * canonical channel; push is best-effort garnish.
 *
 * Payload copy is GERMAN ONLY: the DE/EN toggle is client-side localStorage,
 * invisible to the server. Accepted limitation (site default lang="de").
 * No actor names in push copy — notify() never knows them (read-time join);
 * the panel row carries the full story after tap-through.
 */
import webpush from 'web-push';
import * as Sentry from '@sentry/astro';
import { connectDB } from './mongodb';
import type { NotificationMeta, NotificationTarget, NotificationType } from '../types/notification';

export interface PushPayload {
  title: string;
  body: string;
  href: string;
}

interface SubDoc {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userId: string;
}

let configured = false;
function ensureConfigured(): boolean {
  const pub = import.meta.env.PUBLIC_VAPID_PUBLIC_KEY;
  const priv = import.meta.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails('mailto:admin@mahalle.digital', pub, priv);
    configured = true;
  }
  return true;
}

export function buildPushPayload(
  type: NotificationType,
  target: NotificationTarget,
  meta?: NotificationMeta,
): PushPayload {
  const title = 'Mahalle';
  const href = target.href || '/forum';
  const t = target.title;
  let body: string;
  switch (type) {
    case 'comment':
      // \u201A / \u2018 = German single quotes (‚…‘) — written as escape
      // sequences so no editor/tool Unicode normalization can corrupt them.
      body = `Neue Antwort auf \u201A${t}\u2018`;
      break;
    case 'official':
      body = `Amtliche Mitteilung: ${t}`;
      break;
    case 'market_contact':
      body = `Neue Anfrage zu deinem Angebot \u201A${t}\u2018`;
      break;
    case 'moderation': {
      const noun = meta?.contentKind === 'comment' ? 'Kommentar' : 'Beitrag';
      if (meta?.outcome === 'rejected') body = `Dein ${noun} wurde abgelehnt — Details in deinem Profil`;
      else if (meta?.outcome === 'warned') body = `Dein ${noun} ist veröffentlicht — mit Hinweis`;
      else body = `Dein ${noun} ist veröffentlicht`;
      break;
    }
    default:
      body = t;
  }
  return { title, body, href };
}

async function sendToSubs(db: Awaited<ReturnType<typeof connectDB>>, subs: SubDoc[], payload: PushPayload): Promise<void> {
  if (!subs.length) return;
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, { TTL: 3600 }),
    ),
  );
  const dead: string[] = [];
  let capturedAny = false;
  results.forEach((r, i) => {
    if (r.status !== 'rejected') return;
    const code = (r.reason as { statusCode?: number } | undefined)?.statusCode;
    if (code === 404 || code === 410) {
      dead.push(subs[i].endpoint);
    } else {
      Sentry.captureException(r.reason);
      capturedAny = true;
    }
  });
  if (dead.length) {
    await db.collection('pushSubscriptions').deleteMany({ endpoint: { $in: dead } });
  }
  if (capturedAny) await Sentry.flush(2000);
}

/** Push to specific recipients. Never throws. */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  try {
    if (!ensureConfigured() || !userIds.length) return;
    const db = await connectDB();
    const subs = (await db
      .collection('pushSubscriptions')
      .find({ userId: { $in: userIds } })
      .toArray()) as unknown as SubDoc[];
    await sendToSubs(db, subs, payload);
  } catch (err) {
    console.error('[push] send failed:', err);
    try {
      Sentry.captureException(err);
      await Sentry.flush(2000);
    } catch {
      /* best-effort */
    }
  }
}

/** Broadcast push (official announcements). Never throws. */
export async function sendPushToAllExcept(
  exceptUserId: string | undefined,
  payload: PushPayload,
): Promise<void> {
  try {
    if (!ensureConfigured()) return;
    const db = await connectDB();
    const filter = exceptUserId ? { userId: { $ne: exceptUserId } } : {};
    const subs = (await db.collection('pushSubscriptions').find(filter).toArray()) as unknown as SubDoc[];
    await sendToSubs(db, subs, payload);
  } catch (err) {
    console.error('[push] broadcast failed:', err);
    try {
      Sentry.captureException(err);
      await Sentry.flush(2000);
    } catch {
      /* best-effort */
    }
  }
}
```

The `\u201A`/`\u2018` escape sequences in the copy strings are deliberate — plain-ASCII escapes survive any tool's Unicode normalization, so no od-based byte verification is needed for this file; `grep -c 'u201A' src/lib/push.ts` → 2 is the whole check.

- [ ] **Step 2: Wire into `src/lib/notifications.ts`.** Add the import at the top:

```ts
import { buildPushPayload, sendPushToAllExcept, sendPushToUsers } from './push';
```

In `notify()`, after the `insertOne` call (still inside the existing `try`):

```ts
    await sendPushToUsers([input.userId], buildPushPayload(input.type, input.target, input.meta));
```

In `notifyAllMembers()`, after the `insertMany` call (still inside the existing `try`):

```ts
    await sendPushToAllExcept(input.actorId, buildPushPayload(input.type, input.target, input.meta));
```

Both sends are awaited BEFORE the caller's response leaves (Vercel freeze rule) and are internally never-throw, so the enclosing never-throw contract of `notify`/`notifyAllMembers` is preserved twice over.

- [ ] **Step 3: Verify** — `pnpm type-check` (no new errors), `pnpm build` green. Functional proof lands in Task 6 (needs a real browser subscription); for now assert the no-op path: with dev VAPID keys present, create a comment in the dev app (or temporarily run `pnpm tsx` REPL against `notify`) — no throw, request succeeds. If that's awkward, defer the functional check entirely to Task 6; the gate here is type-check + build + code review.

- [ ] **Step 4: Commit**

```bash
git add src/lib/push.ts src/lib/notifications.ts
git commit -m "feat: web-push sender wired into notification writes"
```

---

### Task 5: Opt-in UI in the panel foot slot

**Files:**
- Modify: `src/components/forum/kiosk/NotificationPanel.svelte`
- Modify: `src/lib/kiosk-i18n.ts` (both DE and EN blocks — DE `nc.*` block ends ~line 111, EN ~line 1967)
- Modify: `src/styles/global.css` (`.nc-foot` block, ~line 971)

**Interfaces:**
- Consumes: `detectPushState`, `subscribeToPush`, `unsubscribeFromPush`, `PushUiState` from `src/lib/pushClient.ts` (Task 2); `showToast` from `src/utils/toast.ts`; existing `t`/`tStr` i18n store.
- Produces: the foot slot renders push opt-in states; `.nc-foot` gains a `--live` variant.

- [ ] **Step 1: Add i18n keys** — via python heredoc with asserts (Global Constraints; the DE strings contain „…" U+201E/U+201C and → U+2192). Insert after `'nc.time.d'` in EACH language block:

DE block:

```
'nc.push.enable': 'Push-Mitteilungen aktivieren',
'nc.push.active': 'Push aktiv auf diesem Gerät',
'nc.push.disable': 'deaktivieren',
'nc.push.denied': 'Push ist im Browser blockiert — in den Website-Einstellungen freigeben.',
'nc.push.ios': 'Für Push: „Teilen → Zum Home-Bildschirm“, dann hier aktivieren.',
'nc.push.error': 'Push konnte nicht aktiviert werden.',
```

EN block:

```
'nc.push.enable': 'Enable push notifications',
'nc.push.active': 'Push active on this device',
'nc.push.disable': 'disable',
'nc.push.denied': 'Push is blocked in your browser — allow it in the site settings.',
'nc.push.ios': 'For push: “Share → Add to Home Screen”, then enable it here.',
'nc.push.error': 'Could not enable push.',
```

Python heredoc pattern (adapt insertion anchors to the real file):

```bash
python3 - <<'EOF'
from pathlib import Path
p = Path('src/lib/kiosk-i18n.ts')
s = p.read_text(encoding='utf-8')
de = """  'nc.push.enable': 'Push-Mitteilungen aktivieren',
  'nc.push.active': 'Push aktiv auf diesem Gerät',
  'nc.push.disable': 'deaktivieren',
  'nc.push.denied': 'Push ist im Browser blockiert — in den Website-Einstellungen freigeben.',
  'nc.push.ios': 'Für Push: „Teilen → Zum Home-Bildschirm“, dann hier aktivieren.',
  'nc.push.error': 'Push konnte nicht aktiviert werden.',
"""
en = """  'nc.push.enable': 'Enable push notifications',
  'nc.push.active': 'Push active on this device',
  'nc.push.disable': 'disable',
  'nc.push.denied': 'Push is blocked in your browser — allow it in the site settings.',
  'nc.push.ios': 'For push: “Share → Add to Home Screen”, then enable it here.',
  'nc.push.error': 'Could not enable push.',
"""
# anchor: the line after each language's nc.time.d entry
first = s.index("'nc.time.d': 'vor {n} Tg.',")
cut = s.index('\n', first) + 1
s = s[:cut] + de + s[cut:]
second = s.index("'nc.time.d': '{n} d ago',")
cut2 = s.index('\n', second) + 1
s = s[:cut2] + en + s[cut2:]
assert s.count("nc.push.enable") == 2 and s.count("nc.push.ios") == 2
assert '„' in s and '“' in s and '”' in s
p.write_text(s, encoding='utf-8')
print('ok')
EOF
```

Then byte-verify: `grep -n "nc.push.ios" src/lib/kiosk-i18n.ts | head -2` and `grep "nc.push.ios" src/lib/kiosk-i18n.ts | od -c | grep -o '342 200 23[46]' | sort | uniq -c` — expect both `342 200 236` (U+201E „) and `342 200 234` (U+201C “) present in the DE line; EN line carries `342 200 234`/`342 200 235` (U+201C/U+201D).

- [ ] **Step 2: Foot-slot logic + markup in `NotificationPanel.svelte`.** Add to the `<script>` block:

```ts
  import { detectPushState, subscribeToPush, unsubscribeFromPush, type PushUiState } from '../../../lib/pushClient';
  import { showError } from '../../../utils/toast';

  let pushState = $state<PushUiState>('hidden');
  let pushBusy = $state(false);

  $effect(() => {
    detectPushState().then((s) => (pushState = s));
  });

  async function enablePush() {
    if (pushBusy) return;
    pushBusy = true;
    const ok = await subscribeToPush();
    pushBusy = false;
    if (ok) {
      pushState = 'subscribed';
    } else {
      // Denied-during-prompt lands here too — re-detect to show the right state.
      pushState = await detectPushState();
      if (pushState !== 'denied') showError($t['nc.push.error']);
    }
  }

  async function disablePush() {
    if (pushBusy) return;
    pushBusy = true;
    await unsubscribeFromPush();
    pushBusy = false;
    pushState = 'ready';
  }
```

(`showError(message)` is the real export in `src/utils/toast.ts` — verified; it wraps the `app:toast` CustomEvent bridge with `type: 'error'`.)

Replace the current foot div (`<div class="nc-foot" aria-hidden="true"></div>`) with:

```svelte
    {#if pushState === 'hidden'}
      <div class="nc-foot" aria-hidden="true"></div>
    {:else}
      <div class="nc-foot nc-foot--live">
        {#if pushState === 'ready'}
          <button type="button" class="nc-push-btn font-dmmono" disabled={pushBusy} onclick={enablePush}>
            {$t['nc.push.enable']}
          </button>
        {:else if pushState === 'subscribed'}
          <span class="nc-push-note font-instrument">{$t['nc.push.active']}</span>
          <button type="button" class="nc-push-link font-dmmono" disabled={pushBusy} onclick={disablePush}>
            {$t['nc.push.disable']}
          </button>
        {:else if pushState === 'denied'}
          <span class="nc-push-note font-instrument">{$t['nc.push.denied']}</span>
        {:else if pushState === 'ios-install'}
          <span class="nc-push-note font-instrument">{$t['nc.push.ios']}</span>
        {/if}
      </div>
    {/if}
```

`aria-hidden` comes OFF whenever content renders (the R1 markup had it because the slot was empty).

- [ ] **Step 3: CSS in `global.css`** — extend the `.nc-*` block (after the existing `.nc-foot` rule at ~line 972), kiosk tokens, no motion:

```css
/* Foot slot with live content (R2 push opt-in). Base .nc-foot stays the
   empty 10px strip for unsupported browsers. */
.nc-foot--live {
  height: auto; min-height: 0;
  padding: 10px 14px;
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.nc-push-btn {
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--k-ink); background: var(--k-paper);
  border: 1.5px solid var(--k-ink); border-radius: 8px;
  padding: 6px 10px; cursor: pointer;
  box-shadow: 2px 2px 0 var(--k-ochre, #e8a53a);
}
.nc-push-btn:disabled { opacity: 0.5; cursor: default; }
.nc-push-link {
  font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--k-wine, #b23a5b); background: none; border: none;
  padding: 4px; cursor: pointer; text-decoration: underline;
  text-underline-offset: 2px; white-space: nowrap;
}
.nc-push-link:disabled { opacity: 0.5; cursor: default; }
.nc-push-note {
  font-size: 12px; font-style: italic; color: var(--k-ink-mute, #7a7264);
  line-height: 1.35;
}
```

(Ochre shadow: Auth/Profile's page accent — the opt-in is an account-ish affordance; deliberately NOT wine, which the panel reserves for badge + „n NEU". Verify the actual CSS custom property names used in the `.nc-*` block — if the block uses raw hex or different token names like `--k-mute`, match its local convention.)

- [ ] **Step 4: Browser gate (required — .svelte + global.css touched).** Dev server on 4655, logged-in state via the playwright storage-state at `~/.local/share/claude-mahalle/storage-state.json` (see memory `reference_playwright_auth`). Verify:
  - Desktop (1280px): open bell → foot shows the enable button below the rows; head/rows did NOT shift (foot renders below existing anatomy).
  - Mobile (390px): bottom sheet shows the foot; scroll-lock still works (actually scroll).
  - Empty + filled list states both render the foot.
  - Click enable in headed/real Chrome if possible; in playwright-cli, permission prompts can't be interacted with — verify the button renders and `pushState` transitions by stubbing is NOT required; the real subscribe E2E is Task 6 in the user's own browser or via playwright's `--grant-permissions` equivalents if available.
  - Locale toggle → EN strings render.

- [ ] **Step 5: `pnpm type-check` (no new errors) + `pnpm build` green + orphan-CSS sanity**: styles live in `global.css`, so no manifest check needed — but confirm NO `<style>` block was added to `NotificationPanel.svelte`.

- [ ] **Step 6: Commit**

```bash
git add src/components/forum/kiosk/NotificationPanel.svelte src/lib/kiosk-i18n.ts src/styles/global.css
git commit -m "feat: push opt-in UI in notification panel foot slot"
```

---

### Task 6: End-to-end verification + docs

**Files:**
- Modify: `README.md` (features list + env table if present)
- Modify: `CLAUDE.md` (root — env vars, `pushSubscriptions` collection entry, PWA/push notes in the notification sections)
- Modify: `src/components/forum/kiosk/CLAUDE.md` ("Notification bell + panel" section — foot slot now live)

**Interfaces:**
- Consumes: everything above.
- Produces: verified push pipeline + synced docs. (Prod deploy steps are listed for the controller/user — NOT executed by an implementer subagent.)

- [ ] **Step 1: Dev E2E.** In a real Chrome on the dev server (localhost is a secure context; the user's own browser at their port-3000 server also works — coordinate, don't touch their server):
  1. Log in (dev DB creds), open bell → enable push → permission prompt → grant. Check dev DB: `pushSubscriptions` has one row with the session's userId.
  2. Trigger a notification: with a SECOND dev account, comment on the first account's topic (or use the admin official-announcement composer). The push notification appears (tab can be backgrounded — SW-delivered).
  3. Click the notification → app focuses/opens at `target.href`.
  4. Disable push in the foot → row deleted from `pushSubscriptions`; DevTools → Application → Service Workers shows sw.js still registered (fine — registration without subscription is inert).
  5. DevTools → Application → Manifest: installability check passes (no errors listed).

- [ ] **Step 2: Docs.**
  - `README.md`: extend the notification-center feature bullet with "+ optional web push (PWA — install Mahalle to the home screen on iOS)"; add `VAPID_PRIVATE_KEY` / `PUBLIC_VAPID_PUBLIC_KEY` wherever README documents env (if it does).
  - Root `CLAUDE.md`: (a) env-vars block gains the two VAPID lines with comments (public key ships to client; private is server-secret; unset ⇒ push no-ops silently — preview deploys have no keys, expected); (b) Database Collections gains `pushSubscriptions`; (c) the notifications collection entry gains one sentence: push send is best-effort after insert, German-only payload, 404/410 pruned; (d) a short "PWA shell" note near the notification-center references: manifest + icons + push-only SW, NO offline caching (locked 2026-08-06), sw.js must never gain a fetch handler.
  - `src/components/forum/kiosk/CLAUDE.md`: update "Notification bell + panel" — foot slot now hosts the push opt-in (states: hidden/ready/subscribed/denied/ios-install via `src/lib/pushClient.ts`); remove "foot slot reserved for R2" phrasing.

- [ ] **Step 3: `pnpm type-check` + `pnpm build` final green.**

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md src/components/forum/kiosk/CLAUDE.md
git commit -m "docs: web push + PWA shell notes"
```

- [ ] **Step 5 (controller/user, post-merge — NOT an implementer step): production rollout**
  1. Generate a FRESH prod VAPID pair — do not reuse dev keys, and do not display the private key: use `npx web-push generate-vapid-keys --json` piped into `vercel env add` (it reads the value from stdin) or into a temp file that is shredded after upload.
  2. Vercel Production env: `VAPID_PRIVATE_KEY` (Sensitive) + `PUBLIC_VAPID_PUBLIC_KEY`; redeploy so the public key bakes into client bundles.
  3. Run `scripts/create-notification-indexes.ts` against prod (URI = local `.env` URI with `/mahalle-dev` → `/mahalle`, derived in shell, never printed).
  4. Prod smoke (read-only + own account only): install prompt/manifest OK on prod domain, subscribe with the user's own account, receive one real push (e.g. from a real comment), verify `x-vercel-id` region unaffected. No test data in prod.

---

## Accepted limitations (documented, not bugs)

- **Push copy is German-only** — locale toggle is client-side; the in-app panel stays fully bilingual.
- **No actor names in push** — `notify()` never knows them (read-time join is deliberate); panel carries full copy.
- **No `pushsubscriptionchange` handler** — rare browser-initiated resubscriptions drop the subscription; dead endpoints are pruned on next send (410) and the foot slot shows "ready" again on next panel open. Acceptable at neighborhood scale.
- **Logout does not unsubscribe the device** — a subsequent login by ANOTHER account on the same browser takes the endpoint over at its own opt-in (upsert by endpoint); until then the logged-out device may receive pushes for the previous account. Shared-computer edge; ledger as deferred hardening if the reviewer flags it, do not expand scope.
- **Broadcast push fan-out is serial-batch `Promise.allSettled`** — fine for dozens-to-hundreds of subscriptions; revisit only at ~thousands.

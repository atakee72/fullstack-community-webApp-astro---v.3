# Auth Kiosk Redesign — Phase 2 Part A (Splash + KiezHeartbeat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the two frontend-only auth Phase-2 surfaces — the once-per-session kiosk **splash** on the auth front door and the ambient **"live im Kiez" heartbeat** strip on the login/register footers — with no backend changes.

**Architecture:** A `KiezHeartbeat.svelte` island fetches three cheap, EXISTING public endpoints (`/api/kiez-air`, `/api/news`, `/api/events`) client-side with per-stat graceful fallback, and is mounted as the footer of `AuthLayout`. A `KioskSplash.astro` overlay reuses the proven `SplashScreen.astro` video + dual-gate dismiss + `sessionStorage` once-per-session logic, paper-skinned for kiosk, with a CSS carve-in reveal as the reduced-motion / no-video fallback; it is mounted at the top of `AuthLayout`. Both are scoped to the auth pages only (login/register).

**Tech Stack:** Astro 5 (`is:inline` script for splash), Svelte 5 runes (heartbeat island), Tailwind 3.4, kiosk CSS-var tokens (`--k-*`), existing public API routes.

## Global Constraints

- **Frontend-only. NO backend changes, NO new API endpoints.** The heartbeat reads only EXISTING public GET routes client-side. (Email-verify, forgot-password, rate-limit are separate later plans.)
- **Scope = auth front door only.** Both surfaces live in `AuthLayout.astro` (used solely by `/login` + `/register`). Extending the splash to `KioskLayout` (the deferred "Kiosk variant TBD") is explicitly OUT of scope here.
- **Once-per-session splash, shared gate.** Use `sessionStorage` key `'mahalle-splash-shown'` — the SAME key the existing `SplashScreen.astro` uses — so the splash shows at most once per session across the whole app (if seen on a BaseLayout page, it won't re-show on auth, and vice-versa).
- **Reduced motion:** `prefers-reduced-motion: reduce` skips the splash entirely (removes the overlay before paint) — matching the existing `SplashScreen.astro` convention. (The design's "settled frame on reduced motion" is intentionally simplified to "skip" for consistency + accessibility; note this deviation.)
- **Ochre accent.** Auth accent is ochre via the existing `[data-page="auth"] { --k-accent: var(--k-ochre) }`. Splash monogram + heartbeat live-dot use kiosk tokens (`--k-ochre`, `--k-success`), no hardcoded hex except where a token doesn't exist.
- **DE + EN parity** for heartbeat strings via `kiosk-i18n` (`$t`/`$locale`). Curly quotes in German strings: opener `„` (U+201E), closer `“` (U+201C) — never straight ASCII. (Splash copy is pre-hydration `is:inline`, so it is hardcoded German — see Task 3.)
- **Heartbeat is ambient, not load-bearing.** Any fetch failure must degrade gracefully (omit that one stat); the strip must always render at least the "live im Kiez" label. Never block paint or show a spinner; never throw.
- **Token/var + font conventions** (same as Phase 1): `var(--k-paper)`, `--k-paper-warm`, `--k-paper-soft`, `--k-ink`, `--k-ink-soft`, `--k-ink-mute`, `--k-rule`, `--k-ochre`, `--k-success`; classes `font-bricolage`, `font-dmmono`, `font-instrument`.
- **Testing reality:** no unit-test runner. Gates are `pnpm type-check` (baseline: only the benign `Dict = typeof de` TS2322 lines in `kiosk-i18n.ts` + pre-existing `node_modules`/`Navbar`/`LoginForm.nextauth`/`sync-stats` errors — gate is "no NEW errors in files this task touches"), `pnpm build`, and playwright-cli on the user's dev server at :3000. If `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login` returns `000`, ask the user to start `pnpm dev` (do not auto-spawn). The playwright daemon can occasionally serve a stale tab — if a snapshot shows unrelated content, run `playwright-cli close` then `playwright-cli open` again.

---

## File structure

**Create:**
- `src/components/auth/kiosk/KiezHeartbeat.svelte` — ambient live strip (fetch + fallback + pulse).
- `src/components/auth/kiosk/KioskSplash.astro` — once-per-session splash overlay (video + CSS-reveal fallback + gate).

**Modify:**
- `src/lib/kiosk-i18n.ts` — add `auth.heartbeat.*` keys (DE + EN).
- `src/layouts/AuthLayout.astro` — mount `KioskSplash` (top of body) + `KiezHeartbeat` (footer).
- `src/components/auth/kiosk/CLAUDE.md` — document both additions.

**Reference (do not change):**
- `src/components/SplashScreen.astro` — the proven video/gate/dismiss logic the splash mirrors.
- `src/pages/api/kiez-air.ts` (`{ overallLabel }`), `src/pages/api/news/index.ts` (`{ pagination: { total } }`, supports `?dateFrom=YYYY-MM-DD`), `src/pages/api/events/index.ts` (`{ events: [{ startDate }] }`) — all public GET.

---

### Task 1: Heartbeat i18n keys (DE + EN)

**Files:**
- Modify: `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Produces: `auth.heartbeat.live`, `auth.heartbeat.events`, `auth.heartbeat.posts`, `auth.heartbeat.air` — consumed by `KiezHeartbeat.svelte` (Task 2) via `$t`.

The file has a `const de = { ... }` dict (~line 60) and a `const en: Dict = { ... }` dict (~line 1000). Add the block to BOTH, matching the existing `'key': 'value',` formatting. Place near the other `auth.*` keys.

- [ ] **Step 1: Add the DE keys** (inside the `de` dict, with the other `auth.*` entries)

```ts
  'auth.heartbeat.live': 'live im Kiez',
  'auth.heartbeat.events': 'Events heute',
  'auth.heartbeat.posts': 'neue Beiträge',
  'auth.heartbeat.air': 'Luft',
```

- [ ] **Step 2: Add the EN keys** (inside the `en` dict)

```ts
  'auth.heartbeat.live': 'live in the Kiez',
  'auth.heartbeat.events': 'events today',
  'auth.heartbeat.posts': 'new posts',
  'auth.heartbeat.air': 'air',
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check 2>&1 | grep "kiosk-i18n.ts" | grep -v "Dict = typeof de"`
Expected: no output beyond the known benign `Dict = typeof de` baseline lines.

- [ ] **Step 4: Commit**

```bash
git add src/lib/kiosk-i18n.ts
git commit -m "feat(auth): heartbeat i18n keys (de+en)"
```

---

### Task 2: KiezHeartbeat island + mount

**Files:**
- Create: `src/components/auth/kiosk/KiezHeartbeat.svelte`
- Modify: `src/layouts/AuthLayout.astro`

**Interfaces:**
- Consumes: `t`/`locale` from `../../../lib/kiosk-i18n`; public GET `/api/kiez-air` → `{ overallLabel: string }`; `/api/news?limit=1&dateFrom=YYYY-MM-DD` → `{ pagination: { total: number } }`; `/api/events` → `{ events: Array<{ startDate: string | Date }> }`.
- Produces: a self-contained strip component with no required props (optional `compact?: boolean`).

- [ ] **Step 1: Write `KiezHeartbeat.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../../lib/kiosk-i18n';

  let { compact = false }: { compact?: boolean } = $props();

  // Ambient, not load-bearing: each stat resolves independently; any failure
  // leaves that stat null and its segment is simply omitted. Never throws,
  // never blocks paint, no spinner.
  let events = $state<number | null>(null);
  let posts = $state<number | null>(null);
  let air = $state<string | null>(null);

  function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  onMount(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const opts = { signal: ctrl.signal };

    // air — single cheap public call; show the LQI grade label (e.g. "gut")
    fetch('/api/kiez-air', opts)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.overallLabel) air = d.overallLabel; })
      .catch(() => {});

    // posts today — news total within today's window (limit=1, we only need the count)
    fetch(`/api/news?limit=1&dateFrom=${todayISO()}`, opts)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (typeof d?.pagination?.total === 'number') posts = d.pagination.total; })
      .catch(() => {});

    // events today — count events whose startDate is today
    fetch('/api/events', opts)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.events)) {
          const today = new Date().toDateString();
          events = d.events.filter((e: any) => e?.startDate && new Date(e.startDate).toDateString() === today).length;
        }
      })
      .catch(() => {});

    return () => { clearTimeout(timer); ctrl.abort(); };
  });
</script>

<div class="inline-flex items-center font-dmmono"
  style="gap:{compact ? '10px' : '16px'}; padding:{compact ? '7px 12px' : '9px 16px'};
         background:var(--k-paper-warm); border:1.5px solid var(--k-ink); border-radius:999px;
         box-shadow:2px 2px 0 var(--k-ink); font-size:{compact ? '10px' : '11px'}; color:var(--k-ink-soft);">
  <span class="inline-flex items-center uppercase" style="gap:6px; color:var(--k-ink); font-weight:600; letter-spacing:0.08em; font-size:{compact ? '9px' : '10px'};">
    <span style="position:relative; width:8px; height:8px;">
      <span class="kh-ping" style="position:absolute; inset:0; border-radius:50%; background:var(--k-success);"></span>
      <span style="position:absolute; inset:0; border-radius:50%; background:var(--k-success);"></span>
    </span>
    {$t['auth.heartbeat.live']}
  </span>

  {#if events !== null}
    <span class="inline-flex items-center" style="gap:5px;">
      <span style="width:1px; height:12px; background:var(--k-rule);"></span>
      <b style="color:var(--k-ink); font-weight:700;">{events}</b> {$t['auth.heartbeat.events']}
    </span>
  {/if}
  {#if posts !== null}
    <span class="inline-flex items-center" style="gap:5px;">
      <span style="width:1px; height:12px; background:var(--k-rule);"></span>
      <b style="color:var(--k-ink); font-weight:700;">{posts}</b> {$t['auth.heartbeat.posts']}
    </span>
  {/if}
  {#if air !== null}
    <span class="inline-flex items-center" style="gap:5px;">
      <span style="width:1px; height:12px; background:var(--k-rule);"></span>
      {$t['auth.heartbeat.air']}: <b style="color:var(--k-ink); font-weight:700;">{air}</b>
    </span>
  {/if}
</div>

<style>
  @keyframes khPing { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.55); opacity: 0.35; } }
  .kh-ping { animation: khPing 1.8s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) { .kh-ping { animation: none; } }
</style>
```

- [ ] **Step 2: Mount it as the AuthLayout footer**

In `src/layouts/AuthLayout.astro`, add the import at the top of the frontmatter (alongside the `AuthLangToggle` import):

```astro
import KiezHeartbeat from '../components/auth/kiosk/KiezHeartbeat.svelte';
```

Then add a footer immediately AFTER the closing `</main>` tag and before `</body>`:

```astro
    <footer class="flex justify-center" style="padding:0 0 26px;">
      <KiezHeartbeat client:load />
    </footer>
```

(Use `client:load`, not `client:visible`: on the taller register page the footer can sit below the fold, and `client:visible` would leave the strip un-hydrated until the user scrolls — defeating the "door feels alive" intent. The three fetches are cheap and 3s-aborted.)

- [ ] **Step 3: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -E "KiezHeartbeat|AuthLayout"` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.

- [ ] **Step 4: Live-verify on :3000**

Precheck: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login` → if `000`, ask the user to start `pnpm dev`.

```bash
playwright-cli open "http://localhost:3000/login"
playwright-cli run-code "page.waitForSelector('input[name=email]', { timeout: 12000 })"
playwright-cli run-code "page.waitForTimeout(2000)"
playwright-cli console
playwright-cli snapshot
playwright-cli close
```
Expected: `Total messages: N (Errors: 0, Warnings: 0)` — no uncaught fetch errors (failed stats are swallowed). Snapshot shows the strip with the "live im Kiez" label and at least the air segment (e.g. "Luft: gut"); the events/posts segments appear if their fetches resolved. Repeat on `/register` (the footer is shared via AuthLayout).

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/kiosk/KiezHeartbeat.svelte src/layouts/AuthLayout.astro
git commit -m "feat(auth): KiezHeartbeat live strip on auth footer"
```

---

### Task 3: KioskSplash overlay + mount

**Files:**
- Create: `src/components/auth/kiosk/KioskSplash.astro`
- Modify: `src/layouts/AuthLayout.astro`

**Interfaces:**
- Consumes: `/LogoVideo.mp4` (existing public asset); `sessionStorage['mahalle-splash-shown']`.
- Produces: a self-contained `is:inline`-scripted overlay; no props. Mirrors `SplashScreen.astro`'s dual-gate (video-ended AND window-load) dismiss + 4s safety timeout, paper-skinned, with a CSS carve-in reveal fallback when the video can't play.

- [ ] **Step 1: Write `KioskSplash.astro`**

```astro
---
// Kiosk auth splash — once-per-session reveal on the auth front door.
// Reuses the proven SplashScreen.astro logic (LogoVideo.mp4 + dual-gate dismiss
// + sessionStorage gate + 4s safety), paper-skinned for kiosk. On reduced motion
// or when the video can't play, falls back to a CSS carve-in of the ochre
// monogram + wordmark. Scoped to AuthLayout (login/register) only.
---
<div id="kiosk-splash" style="display:none;">
  <video id="kiosk-splash-video" src="/LogoVideo.mp4" muted playsinline preload="auto" fetchpriority="high"></video>
  <div id="kiosk-splash-fallback" aria-hidden="true">
    <div class="ks-monogram font-instrument">m</div>
    <div class="ks-word font-bricolage">mahalle</div>
    <div class="ks-tag font-instrument">dein Kiez, an einem Ort</div>
  </div>
  <div id="kiosk-splash-bar"><span></span></div>
  <div class="ks-loading font-dmmono">WIRD GELADEN · SCHILLERKIEZ</div>
</div>

<script is:inline data-astro-rerun>
  (function () {
    var overlay = document.getElementById('kiosk-splash');
    if (!overlay) return;

    // Once-per-session or reduced motion → never show.
    try {
      if (
        sessionStorage.getItem('mahalle-splash-shown') ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) { overlay.remove(); return; }
    } catch (e) { /* privacy mode — fall through and show */ }

    overlay.style.display = 'flex';
    overlay.style.opacity = '1';

    var dismissed = false, videoReady = false, pageReady = false;
    var video = document.getElementById('kiosk-splash-video');
    var fallback = document.getElementById('kiosk-splash-fallback');

    function dismiss() {
      if (dismissed || !videoReady || !pageReady) return;
      dismissed = true;
      try { sessionStorage.setItem('mahalle-splash-shown', '1'); } catch (e) {}
      var a = overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'ease-out', fill: 'forwards' });
      a.finished.then(function () { overlay.remove(); });
    }
    function videoDone() { videoReady = true; dismiss(); }
    function pageLoaded() { pageReady = true; dismiss(); }

    if (video) {
      video.addEventListener('loadeddata', function () { video.classList.add('ready'); });
      video.play().then(function () {
        if (fallback) fallback.style.display = 'none';   // real video plays → hide CSS fallback
      }).catch(function () {
        // autoplay blocked / no video → show the CSS reveal, then dismiss
        if (video) video.style.display = 'none';
        setTimeout(function () { videoReady = true; pageReady = true; dismiss(); }, 1400);
      });
      video.addEventListener('ended', videoDone);
      video.addEventListener('timeupdate', function () {
        if (video.currentTime >= video.duration - 0.1) videoDone();
      });
    } else {
      videoReady = true;
    }

    if (document.readyState === 'complete') pageReady = true;
    else window.addEventListener('load', pageLoaded);

    setTimeout(function () {
      if (document.getElementById('kiosk-splash')) { videoReady = true; pageReady = true; dismiss(); }
    }, 4000);
  })();
</script>

<style>
  #kiosk-splash {
    position: fixed; inset: 0; z-index: 9999;
    display: none; align-items: center; justify-content: center; flex-direction: column;
    background: var(--k-paper);
  }
  #kiosk-splash-video { max-width: 60%; max-height: 60%; visibility: hidden; }
  #kiosk-splash-video.ready { visibility: visible; }
  /* CSS reveal fallback (shown until the real video plays; sole content on reduced/no-video) */
  #kiosk-splash-fallback { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .ks-monogram {
    width: 96px; height: 96px; display: flex; align-items: center; justify-content: center;
    background: var(--k-ochre); color: var(--k-ink); border: 2px solid var(--k-ink); border-radius: 50%;
    font-style: italic; font-size: 60px; transform: rotate(-4deg);
    animation: ksCarve 1.2s cubic-bezier(.2,.8,.2,1.2) both;
  }
  .ks-word { font-weight: 800; font-size: 56px; letter-spacing: -0.04em; color: var(--k-ink); animation: ksFade 0.8s ease-out 0.5s both; }
  .ks-tag { font-style: italic; font-size: 18px; color: var(--k-ink-soft); animation: ksFade 0.8s ease-out 0.9s both; }
  .ks-loading { position: absolute; bottom: 16px; font-size: 10px; letter-spacing: 0.16em; color: var(--k-ink-mute); }
  #kiosk-splash-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: var(--k-paper-soft); }
  #kiosk-splash-bar span { display: block; height: 100%; background: var(--k-ochre); transform-origin: left; animation: ksBar 2.6s ease-in-out both; }
  @keyframes ksCarve { 0% { opacity: 0; transform: translateY(14px) scale(0.82) rotate(-8deg); } 100% { opacity: 1; transform: translateY(0) scale(1) rotate(-4deg); } }
  @keyframes ksFade { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
  @keyframes ksBar { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
  @media (prefers-reduced-motion: reduce) {
    .ks-monogram, .ks-word, .ks-tag, #kiosk-splash-bar span { animation: none; }
  }
</style>
```

- [ ] **Step 2: Mount it at the top of AuthLayout's body**

In `src/layouts/AuthLayout.astro`, add the import in the frontmatter:

```astro
import KioskSplash from '../components/auth/kiosk/KioskSplash.astro';
```

Then place `<KioskSplash />` as the FIRST child inside `<body>` (before the masthead `<header>`):

```astro
  <body
    class="min-h-screen k-paper-bg text-ink font-bricolage antialiased flex flex-col"
    data-page="auth"
  >
    <KioskSplash />
    <!-- existing masthead header follows -->
```

- [ ] **Step 3: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -E "KioskSplash|AuthLayout"` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.

- [ ] **Step 4: Live-verify once-per-session + dismiss on :3000**

```bash
# fresh session → splash appears, then dismisses and sets the flag
playwright-cli open "http://localhost:3000/login"
playwright-cli run-code "page.evaluate(() => sessionStorage.removeItem('mahalle-splash-shown'))"
playwright-cli open "http://localhost:3000/login"
playwright-cli run-code "page.waitForTimeout(500)"
playwright-cli eval "() => ({ overlayPresent: !!document.getElementById('kiosk-splash') })"
playwright-cli run-code "page.waitForTimeout(4500)"
playwright-cli eval "() => ({ overlayGone: !document.getElementById('kiosk-splash'), flag: sessionStorage.getItem('mahalle-splash-shown') })"
playwright-cli console
playwright-cli close
```
Expected: shortly after load `overlayPresent: true`; after the dual-gate/safety window `overlayGone: true` and `flag: "1"`. Console: 0 errors. (If the playwright `eval` wrapper errors with `__fn__ is not a function`, retry once; it is a known CLI quirk, not a code defect — the SSR markup + sessionStorage flag are the authoritative signal.)

SSR sanity (markup present in raw HTML):
```bash
curl -s "http://localhost:3000/login" | grep -c "kiosk-splash"   # >=1
```

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/kiosk/KioskSplash.astro src/layouts/AuthLayout.astro
git commit -m "feat(auth): once-per-session kiosk splash on auth front door"
```

---

### Task 4: Docs + memory

**Files:**
- Modify: `src/components/auth/kiosk/CLAUDE.md`

**Interfaces:**
- Consumes: nothing. Produces: subtree docs describing the two additions.

- [ ] **Step 1: Append a Phase-2A section to `src/components/auth/kiosk/CLAUDE.md`**

Add this section before the existing "Phase 1 scope / deferred" notes:

```markdown
## Phase 2A — Splash + KiezHeartbeat (shipped, 2026-06-27)

Frontend-only, no backend. Both live in `AuthLayout` (login/register only).

- **`KiezHeartbeat.svelte`** — ambient "live im Kiez" strip in the AuthLayout footer
  (`client:load`). Fetches three EXISTING public GETs client-side with a 3s abort
  and per-stat graceful fallback (a failed stat is omitted; the strip always renders
  the live label): air = `/api/kiez-air` `overallLabel`; posts = `/api/news?limit=1&dateFrom=<today>`
  `pagination.total`; events = `/api/events` count of `startDate === today` (counted from
  the API's default page, so approximate if there are many events — acceptable for an
  ambient strip). Pulse dot keyframe is reduced-motion-gated. It is ambient, not
  load-bearing — never throws, never blocks paint.
- **`KioskSplash.astro`** — once-per-session splash overlay on the auth front door.
  Reuses `SplashScreen.astro`'s proven logic (`/LogoVideo.mp4`, dual-gate dismiss =
  video-ended AND window-load, 4s safety timeout) but paper-skinned for kiosk. Gate =
  `sessionStorage['mahalle-splash-shown']` — the SAME key as the global SplashScreen,
  so it is once-per-session app-wide. `prefers-reduced-motion` (or video-can't-play)
  → skip the video and show the CSS carve-in reveal fallback (ochre monogram + wordmark
  + tagline). Scoped to AuthLayout; extending to `KioskLayout` (the deferred "Kiosk
  variant TBD") is a future follow-up, not done here.

Still deferred to later Phase-2 plans (each needs net-new secure backend): email-verify
(soft gate — nag, don't block; dev-log link fallback when no `RESEND_API_KEY`),
forgot-password, rate-limit (state 05).
```

- [ ] **Step 2: Build sanity**

Run: `pnpm build 2>&1 | tail -2` → Expected: build completes (docs-only change; confirms nothing else drifted).

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/kiosk/CLAUDE.md
git commit -m "docs(auth): record Phase 2A splash + heartbeat"
```

---

## Self-review

**Spec coverage (Phase-2A slice):**
- KiezHeartbeat strip on login + register footers → Task 2 (mounted once in AuthLayout, shared by both) ✓
- Heartbeat shows live events/posts/air with graceful fallback → Task 2 (3 existing public GETs, per-stat fallback) ✓
- Once-per-session splash on the auth front door → Task 3 ✓
- Splash reuses real video + reduced-motion fallback → Task 3 (LogoVideo.mp4 + CSS carve-in fallback) ✓
- DE/EN heartbeat copy → Task 1 ✓
- Ochre accent + kiosk tokens → Tasks 2/3 ✓
- No backend / no new endpoints → honored throughout (Global Constraints) ✓
- Deferred (verify/forgot/rate-limit) → documented, not built ✓

**Placeholder scan:** every code step contains complete code (full Svelte component, full Astro component with script + styles, exact i18n blocks, exact AuthLayout edits). No TBD/"add error handling"/"similar to".

**Type consistency:** `KiezHeartbeat` state types (`number | null`, `string | null`) match the render guards. The three endpoint response shapes used (`overallLabel`, `pagination.total`, `events[].startDate`) match the verified API contracts. `auth.heartbeat.*` keys referenced in Task 2 are all defined in Task 1. The splash `sessionStorage` key (`mahalle-splash-shown`) matches the existing SplashScreen's key exactly (shared once-per-session gate). AuthLayout is edited by both Task 2 (footer) and Task 3 (top-of-body) — non-overlapping insertions.

**Known intentional deviations from the design (flag at audit):** reduced-motion skips the splash entirely (design wanted a settled frame) — chosen for consistency with the existing SplashScreen + accessibility. Splash scoped to AuthLayout only (not all kiosk pages) — KioskLayout adoption is deferred.

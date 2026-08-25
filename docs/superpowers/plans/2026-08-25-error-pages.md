# Kiosk Error Pages (404 + 500) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Astro's bare default error responses with two kiosk-styled pages: a global `404.astro` (unknown URLs) and a `500.astro` (SSR errors, e.g. Mongo blips).

**Architecture:** Both pages are plain Astro pages on `LandingLayout` (the minimal public layout used by `/`, `/impressum`, `/datenschutz` — verified dependency-free: no `getSession`, no DB, only `astro:transitions` + global.css). Astro's file convention wires them up automatically: `src/pages/404.astro` is served for any unmatched route; `src/pages/500.astro` is served when SSR rendering throws (the middleware's catch rethrows after its Sentry capture, so error monitoring is unaffected). The 404 is prerendered (static, fast, no DB); the 500 must stay SSR (Astro requirement) but contains zero dynamic dependencies.

**Tech Stack:** Astro 5 pages, LandingLayout, kiosk CSS tokens from `global.css` (`--k-paper`, `--k-ink`, `--k-ink-mute`, `--k-ink-soft`), fonts `font-bricolage` / `font-dmmono`.

**Spec:** none — bounded feature designed in chat 2026-08-25 (this plan is self-contained). Style reference: `src/pages/impressum.astro` (the `.lgl-*` pattern on LandingLayout).

## Global Constraints

- **No server dependencies in either page**: neither page may import anything that touches `getSession`, `connectDB`, or any `src/lib/*` module with server imports. The 500 page renders exactly when those are broken.
- **`404.astro` carries `export const prerender = true`**; **`500.astro` must NOT be prerendered** (Astro requires the 500 page to be server-rendered; no `prerender` export).
- Copy is German-first with one muted English line (matches legal pages / welcome email pattern). Exact copy is given verbatim in the tasks — use it as written.
- Kiosk styling only: scoped `<style>` blocks using the `--k-*` CSS variables, same idiom as `impressum.astro`'s `.lgl-*` block. No Tailwind utility soup in these two pages beyond font classes already used by LandingLayout pages.
- Dev-server verification runs on **port 4655** (never 3000). Kill with `fuser -k 4655/tcp` when done.
- Commits: simple concise messages, NO "Generated with Claude Code" signature, NO Co-Authored-By footer.
- Known dev-mode caveat (do not "fix" it): in `pnpm dev`, an SSR error shows Astro's dev overlay, NOT `500.astro` — the error-triggered path only runs in production builds. Verification therefore checks (a) the page renders correctly at its direct route `/500`, and (b) `pnpm build` passes. Do not add a throwaway crashing route; the wiring is Astro convention.

---

### Task 1: `404.astro` — global not-found page

**Files:**
- Create: `src/pages/404.astro`

**Interfaces:**
- Consumes: `src/layouts/LandingLayout.astro` (props: `title: string`, `description?: string`), CSS vars `--k-ink`, `--k-ink-mute`, `--k-ink-soft`, `--k-wine` from `global.css`.
- Produces: the route `/404` and the automatic not-found page for every unmatched URL.

- [ ] **Step 1: Create the page**

Create `src/pages/404.astro` with exactly this content:

```astro
---
// Global 404 — Astro serves this page for any unmatched route.
// Prerendered: static content, no session/DB, renders instantly and
// cannot itself fail. Middleware skips prerendered routes (isPrerendered).
import LandingLayout from '../layouts/LandingLayout.astro';

export const prerender = true;
---

<LandingLayout
  title="Seite nicht gefunden | Mahalle"
  description="Diese Seite steht nicht in der Ausgabe."
>
  <main class="err-wrap">
    <p class="err-kicker font-dmmono">AUSGABE · SEITE NICHT GEFUNDEN</p>
    <h1 class="err-code font-bricolage">404</h1>
    <p class="err-lead">Diese Seite steht nicht in der Ausgabe.</p>
    <p class="err-sub">
      Der Link führt ins Leere — vielleicht ein Tippfehler, ein veralteter
      Verweis oder eine Seite, die es nicht mehr gibt.
    </p>

    <p class="err-kicker err-kicker--links font-dmmono">WEITER GEHT ES HIER</p>
    <ul class="err-links">
      <li><a href="/">Startseite</a></li>
      <li><a href="/forum">Forum</a></li>
      <li><a href="/calendar">Kalender</a></li>
      <li><a href="/marketplace">Marktplatz</a></li>
    </ul>

    <p class="err-muted"><em>English:</em> This page doesn't exist — the link may be stale or mistyped. Try the links above.</p>
  </main>
</LandingLayout>

<style>
  .err-wrap { max-width: 680px; margin: 0 auto; padding: 64px 22px 80px; }
  .err-kicker { font-size: 11px; letter-spacing: 0.18em; color: var(--k-ink-mute); margin: 0 0 10px; }
  .err-kicker--links { margin: 40px 0 12px; }
  .err-code { font-size: clamp(88px, 18vw, 160px); font-weight: 800; letter-spacing: -0.05em; line-height: 0.9; margin: 0 0 18px; color: var(--k-ink); }
  .err-lead { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 8px; color: var(--k-ink); }
  .err-sub { font-size: 14px; line-height: 1.65; color: var(--k-ink-soft); margin: 0; max-width: 460px; }
  .err-links { list-style: none; display: flex; flex-wrap: wrap; gap: 10px 18px; padding: 0; margin: 0; }
  .err-links a { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; color: var(--k-ink); text-decoration: underline; text-decoration-style: dashed; text-underline-offset: 4px; }
  .err-links a:hover { color: var(--k-wine, #b23a5b); }
  .err-muted { font-size: 12px; line-height: 1.5; color: var(--k-ink-mute); margin: 40px 0 0; }
</style>
```

- [ ] **Step 2: Verify on the dev server**

```bash
(pnpm dev --port 4655 > /tmp/claude-1000/-home-atakee-projects-fullstack-community-webApp-astro---v-3/93289b1a-264e-4c59-9617-31fa48b15c68/scratchpad/dev4655.log 2>&1 &) && sleep 12
curl -s -o /dev/null -w "unknown path: %{http_code}\n" http://localhost:4655/diese-seite-gibt-es-nicht
curl -s http://localhost:4655/diese-seite-gibt-es-nicht | grep -c "Diese Seite steht nicht in der Ausgabe"
curl -s -o /dev/null -w "direct /404: %{http_code}\n" http://localhost:4655/404
```

Expected: unknown path returns **404** with the German lead sentence present (grep count ≥ 1); `/404` itself returns 200 or 404 (either is fine — content is what matters).

- [ ] **Step 3: Verify prod build passes**

Run: `pnpm build`
Expected: build green; `404.html` appears under the static output (`find .vercel/output -name "404*" | head`).

- [ ] **Step 4: Commit**

```bash
git add src/pages/404.astro
git commit -m "feat: kiosk-styled global 404 page"
```

---

### Task 2: `500.astro` — SSR error page

**Files:**
- Create: `src/pages/500.astro`

**Interfaces:**
- Consumes: `src/layouts/LandingLayout.astro` (same props as Task 1), same CSS vars.
- Produces: the page Astro renders when SSR throws in production (and the direct route `/500`).

- [ ] **Step 1: Create the page**

Create `src/pages/500.astro` with exactly this content:

```astro
---
// SSR error page — Astro renders this when server rendering throws in
// production (dev mode shows the overlay instead; that's expected).
// MUST stay dependency-free: no getSession, no DB, no src/lib imports —
// it renders exactly when those are broken. Must NOT be prerendered
// (Astro requires the 500 page to be server-rendered).
// Sentry capture already happened in src/middleware.ts before the rethrow,
// hence "ist schon gemeldet" in the copy.
import LandingLayout from '../layouts/LandingLayout.astro';
---

<LandingLayout
  title="Technische Störung | Mahalle"
  description="Kleine Störung in der Druckerei."
>
  <main class="err-wrap">
    <p class="err-kicker font-dmmono">STÖRUNG · TECHNISCHER FEHLER</p>
    <h1 class="err-code font-bricolage">500</h1>
    <p class="err-lead">Kleine Störung in der Druckerei.</p>
    <p class="err-sub">
      Bei uns ist etwas schiefgegangen — der Fehler ist schon gemeldet.
      Meistens hilft es, die Seite gleich noch einmal zu laden.
    </p>

    <p class="err-actions">
      <button type="button" class="err-btn font-bricolage" onclick="location.reload()">Neu laden</button>
      <a href="/" class="err-home">Zur Startseite</a>
    </p>

    <p class="err-muted"><em>English:</em> Something went wrong on our side — it's already been reported. Reloading usually helps.</p>
  </main>
</LandingLayout>

<style>
  .err-wrap { max-width: 680px; margin: 0 auto; padding: 64px 22px 80px; }
  .err-kicker { font-size: 11px; letter-spacing: 0.18em; color: var(--k-ink-mute); margin: 0 0 10px; }
  .err-code { font-size: clamp(88px, 18vw, 160px); font-weight: 800; letter-spacing: -0.05em; line-height: 0.9; margin: 0 0 18px; color: var(--k-ink); }
  .err-lead { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 8px; color: var(--k-ink); }
  .err-sub { font-size: 14px; line-height: 1.65; color: var(--k-ink-soft); margin: 0; max-width: 460px; }
  .err-actions { display: flex; align-items: center; gap: 18px; margin: 32px 0 0; }
  .err-btn { font-size: 14px; font-weight: 700; letter-spacing: 0.02em; color: var(--k-paper, #f3ead8); background: var(--k-ink, #1b1a17); border: 1.5px solid var(--k-ink, #1b1a17); border-radius: 999px; padding: 10px 22px; cursor: pointer; }
  .err-btn:hover { opacity: 0.85; }
  .err-home { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; color: var(--k-ink); text-decoration: underline; text-decoration-style: dashed; text-underline-offset: 4px; }
  .err-home:hover { color: var(--k-wine, #b23a5b); }
  .err-muted { font-size: 12px; line-height: 1.5; color: var(--k-ink-mute); margin: 40px 0 0; }
</style>
```

- [ ] **Step 2: Verify the direct route renders**

(Dev server from Task 1 still running; if not, restart on 4655.)

```bash
curl -s http://localhost:4655/500 | grep -c "Kleine Störung in der Druckerei"
curl -s -o /dev/null -w "direct /500: %{http_code}\n" http://localhost:4655/500
fuser -k 4655/tcp
```

Expected: grep count ≥ 1 — the content is the check. The direct-route status may be **200 or 500** (Astro mirrors the error-page semantics on direct visits; either is acceptable, do not chase the status code). Per Global Constraints, the error-triggered path is Astro convention verified by build — do NOT add a crashing test route.

- [ ] **Step 3: Verify prod build passes**

Run: `pnpm build`
Expected: build green; no `500.html` in static output (page is SSR — that's correct), and the build log shows no prerender warning for `/500`.

- [ ] **Step 4: Add the docs line**

In the root `CLAUDE.md`, in the "Project Structure" tree, change the line

```
│   ├── forum.astro   # `/forum` — forum index (gated)
```

to

```
│   ├── forum.astro   # `/forum` — forum index (gated)
│   ├── 404.astro     # Global not-found page (prerendered, kiosk-styled, LandingLayout)
│   ├── 500.astro     # SSR error page (dependency-free by design — no session/DB imports ever)
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/500.astro CLAUDE.md
git commit -m "feat: kiosk-styled 500 error page + docs note"
```

---

## Post-merge verification (controller, after deploy)

After merge + deploy goes green, verify in prod (read-only):

```bash
curl -s -o /dev/null -w "prod unknown: %{http_code}\n" https://mahalle.digital/diese-seite-gibt-es-nicht
curl -s https://mahalle.digital/diese-seite-gibt-es-nicht | grep -c "Diese Seite steht nicht in der Ausgabe"
```

Expected: 404 with the styled German copy. (The 500 path cannot be ethically triggered in prod — the build + convention check stands for it.)

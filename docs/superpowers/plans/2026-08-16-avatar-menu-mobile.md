# Avatar Menu on Mobile (Bottom Sheet) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tapping the nav avatar on mobile (<1024px) opens the existing account menu as a bottom sheet (with scrim) instead of navigating straight to `/profile` — restoring access to tour restart, saved items, and logout on mobile.

**Architecture:** Reuse `AvatarMenu.svelte` unchanged in structure; the presentation switches purely via CSS media query in `global.css` (`.am-*` block): desktop keeps the anchored dropdown, <1024px restyles the same DOM as a fixed bottom sheet plus a scrim element. `KioskNav.svelte` drops its desktop-only `matchMedia` gate so the avatar click toggles the menu on all viewports, and bumps the header's z-index while the menu is open (stacking fix, see Global Constraints).

**Tech Stack:** Astro 5 + Svelte 5 (runes: `$state`/`$derived`/`$effect`), Tailwind utility classes in markup, hand-written CSS in `src/styles/global.css`.

## Global Constraints

- **`.am-*` styles live in `src/styles/global.css`, NEVER in a `<style>` block in `AvatarMenu.svelte`** — Astro's prod build orphans scoped CSS of Svelte components imported only through another island (AvatarMenu is reached solely via `KioskNav.svelte`). Root `CLAUDE.md` § "Nested-island Svelte `<style>` blocks get orphaned in prod builds".
- **Stacking fix is mandatory:** the sticky header (`z-40`) and the fixed mobile bottom nav (`z-40`, later in DOM) are sibling stacking contexts. At equal z-index the bottom nav paints above anything inside the header, regardless of the child's own z-index. The header must get `z-50` while `menuOpen` is true (Task 2), or the sheet renders under the bottom nav.
- **No new i18n keys.** All menu rows already exist (`nav.menu.*` in `src/lib/kiosk-i18n.ts`).
- **`prefers-reduced-motion: reduce` must disable the sheet slide-up and closing fade** (existing pattern: `.am-menu` animation/transition set to `none` under the media query — extend it, don't fork it).
- **Touch targets ≥44px** on mobile menu rows (project a11y floor, set during the tour work).
- **Do not spawn a dev server on port 3000** — the user runs their own there. Browser verification uses `playwright-cli` against `http://localhost:3000` (see Task 3 for the auth-state workflow). If a throwaway server is unavoidable, use port 4655 only after `ss -tlnp | grep 4655` shows it free, and tear it down with `pkill -f "astro dev --port 4655"`.
- **Commit messages:** simple and concise, NO "🤖 Generated with Claude Code" signature, NO "Co-Authored-By: Claude" footer.
- **This project has no component-test framework.** The test cycle per task is: `pnpm type-check` (error count must not exceed the pre-change baseline — record it in Task 1 Step 1), `pnpm build` (green), and for behavior the playwright-cli browser checks in Task 3.

---

### Task 1: Mobile sheet + scrim presentation (CSS + AvatarMenu scrim element)

**Files:**
- Modify: `src/styles/global.css` (the `.am-*` block, currently around lines 805–853, plus `button.am-row`/`.am-icon` around line 1006)
- Modify: `src/components/forum/kiosk/AvatarMenu.svelte`

**Interfaces:**
- Consumes: existing `AvatarMenu` props `{ user, onClose }` — unchanged.
- Produces: a `.am-scrim` element (sibling rendered before `.am-menu` in AvatarMenu's markup) and mobile CSS variants. Task 2 relies on the component's public interface staying exactly `{ user, onClose(restoreFocus: boolean) }`.

- [ ] **Step 1: Record the type-check baseline**

Run: `pnpm type-check 2>&1 | grep -c "error"`
Note the number (pre-existing baseline; was 37 lines on 2026-08-16). Every later type-check must not exceed it.

- [ ] **Step 2: Add the scrim element and mobile scroll-lock to `AvatarMenu.svelte`**

In the markup, add the scrim as a sibling **before** the existing `.am-menu` div (the document-level `pointerdown` listener already closes the menu for any tap outside `menuEl`, so the scrim needs no click handler of its own — a scrim tap is an outside tap):

```svelte
<div class="am-scrim" class:am-closing={closing} aria-hidden="true"></div>
<div bind:this={menuEl} class="am-menu" class:am-closing={closing} role="menu" aria-label={user?.name ?? 'Konto'}>
```

(The second line is the existing root — only the scrim line is new.)

In the `<script>`, add a body scroll-lock effect **gated to mobile** (the desktop dropdown must NOT lock scroll — behavior change otherwise). Place it after the existing listener `$effect`:

```ts
// Mobile bottom-sheet: lock body scroll while open. Desktop dropdown
// deliberately doesn't lock (unchanged behavior).
$effect(() => {
  if (!window.matchMedia('(max-width: 1023px)').matches) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = prev; };
});
```

Also update the component's header comment: it currently says "desktop only — KioskNav gates mounting"; change that line to reflect all-viewport mounting, e.g. `// Paper dropdown (desktop) / bottom sheet (mobile <1024px) anchored to the nav avatar.`

- [ ] **Step 3: Add the mobile CSS variants to `global.css`**

Append inside the `.am-*` block (after `.am-row.am-wine`, before the tour block). Note the existing reduced-motion media query for `.am-menu` is around line 826 — extend it as shown:

```css
/* Scrim behind the mobile bottom sheet. Hidden on desktop (dropdown has
   no scrim by design). Sits below .am-menu (z 50) inside the header's
   stacking context; the header itself is bumped to z-50 while open
   (KioskNav) so both cover the fixed bottom nav (z-40). */
.am-scrim { display: none; }
@media (max-width: 1023px) {
  .am-scrim {
    display: block; position: fixed; inset: 0; z-index: 49;
    background: rgba(27, 26, 23, 0.45);
    animation: amScrimIn 180ms ease-out;
  }
  .am-scrim.am-closing { animation: none; transition: opacity 140ms ease-out; opacity: 0; }
  @keyframes amScrimIn { from { opacity: 0; } to { opacity: 1; } }

  /* Bottom sheet: same DOM as the dropdown, repositioned. */
  .am-menu {
    position: fixed; top: auto; right: 0; bottom: 0; left: 0; width: auto;
    transform-origin: bottom center;
    animation: amSheetIn 220ms cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  @keyframes amSheetIn {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .am-caret { display: none; }
  .am-card {
    border-radius: var(--k-radius-md) var(--k-radius-md) 0 0;
    border-bottom: none; box-shadow: 0 -3px 0 var(--k-ink);
    max-height: 80vh; overflow-y: auto;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    /* Echo the bottom nav's max-w-md (28rem) so the sheet doesn't go
       comically full-bleed on tablets (<1024px still shows the sheet). */
    max-width: 28rem; margin-inline: auto;
  }
  .am-row { min-height: 44px; padding: 11px 18px; }
}
```

Then **MOVE the existing `@media (prefers-reduced-motion: reduce)` block for `.am-menu`** (currently ~line 826, i.e. BEFORE the new mobile block) to AFTER the new mobile block, extended with the scrim rules:

```css
@media (prefers-reduced-motion: reduce) {
  .am-menu { animation: none; }
  .am-menu.am-closing { transition: none; }
  .am-scrim { animation: none; }
  .am-scrim.am-closing { transition: none; }
}
```

Why the move is load-bearing: media queries add no specificity. If the reduced-motion `animation: none` stays at line 826 and the new mobile `.am-menu { animation: amSheetIn … }` comes later in the file, the later rule wins and reduced-motion users get the slide animation anyway. Source order is the only thing making `none` win — the reduced-motion block must be the LAST `.am-*` rules in the file. Delete the old block at its original position (no duplicate blocks).

- [ ] **Step 4: Type-check and build**

Run: `pnpm type-check 2>&1 | grep -c "error"` → must equal the Step 1 baseline.
Run: `pnpm build 2>&1 | tail -5` → must end green (no errors).
(Behavior is not yet reachable on mobile — the click gate falls in Task 2. That's expected; desktop must be unaffected, which the build + Task 3's desktop regression check will confirm.)

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css src/components/forum/kiosk/AvatarMenu.svelte
git commit -m "feat: avatar menu bottom-sheet presentation for mobile (CSS variant + scrim)"
```

---

### Task 2: Ungate the avatar click in KioskNav + header z-bump

**Files:**
- Modify: `src/components/forum/kiosk/KioskNav.svelte` (click handler ~lines 21–28, header element ~line 99, header comment ~lines 6–8)

**Interfaces:**
- Consumes: `AvatarMenu` with props `{ user, onClose }` (Task 1 — unchanged interface).
- Produces: avatar click toggles `menuOpen` on ALL viewports; header carries `z-50` while `menuOpen`.

- [ ] **Step 1: Replace the gated click handler**

Current code:

```ts
// Desktop: avatar click opens the dropdown. Below lg the anchor navigates
// to /profile as before (mobile gets NO dropdown — design constraint).
function handleAvatarClick(e: MouseEvent) {
  if (window.matchMedia('(min-width: 1024px)').matches) {
    e.preventDefault();
    menuOpen = !menuOpen;
  }
}
```

Replace with:

```ts
// Avatar click toggles the account menu on ALL viewports (desktop:
// anchored dropdown; mobile: bottom sheet — presentation switches in
// CSS, .am-* block in global.css). /profile stays reachable as the
// menu's first row; the href remains for no-JS/middle-click semantics.
function handleAvatarClick(e: MouseEvent) {
  e.preventDefault();
  menuOpen = !menuOpen;
}
```

- [ ] **Step 2: Bump the header's z-index while the menu is open**

The header currently opens with:

```svelte
<header class="sticky top-0 z-40 border-b-2 border-ink k-paper-bg">
```

Replace with (template-conditional class — Tailwind's JIT sees both literals):

```svelte
<header class="sticky top-0 {menuOpen ? 'z-50' : 'z-40'} border-b-2 border-ink k-paper-bg">
```

Why: header and the fixed bottom nav are both `z-40` sibling stacking contexts; at equal z the later-in-DOM bottom nav paints on top of anything inside the header. `z-50` while open lets the fixed sheet + scrim (children of the header's context) cover the bottom nav.

- [ ] **Step 3: Update the component header comment**

Change the comment lines 6–8 ("Mobile shows the top bar … Profile reachable via the avatar.") to: `// Mobile shows the top bar (brand + locale toggle) plus a fixed bottom nav bar (5 short labels). The avatar opens the account menu on all viewports (bottom sheet on mobile); Profil is the menu's first row.`

- [ ] **Step 4: Type-check and build**

Run: `pnpm type-check 2>&1 | grep -c "error"` → must equal the Task 1 Step 1 baseline.
Run: `pnpm build 2>&1 | tail -5` → green.

- [ ] **Step 5: Commit**

```bash
git add src/components/forum/kiosk/KioskNav.svelte
git commit -m "feat: open avatar menu on mobile (ungate click, z-bump header while open)"
```

---

### Task 3: Browser verification (mobile + desktop regression) + docs

**Files:**
- Modify: `src/components/forum/kiosk/CLAUDE.md` (§ "Avatar menu (desktop)")
- No source changes expected — this task verifies and documents. Any defect found goes back through the fix loop of Task 1/2 scope.

**Interfaces:**
- Consumes: the running behavior from Tasks 1–2 on the user's dev server at `http://localhost:3000`.

- [ ] **Step 1: Load authenticated browser state**

The menu only renders for a logged-in user. Use the saved playwright auth-state workflow (cookie reuse — NO credentials in chat): the state file path and load procedure are in the project memory note `reference_playwright_auth.md` (`~/.claude/projects/-home-atakee-projects-fullstack-community-webApp-astro---v-3/memory/`). Read that note first and follow it. If the state file is missing/expired, STOP and report BLOCKED (the user must re-export their session cookie) — do not attempt scripted login with credentials.

- [ ] **Step 2: Mobile checks (viewport 390×844)**

Using playwright-cli against `http://localhost:3000` (re-snapshot after hydration — islands are `client:only`, the first snapshot at domcontentloaded shows an empty `<main>`):

1. Open `/` → tap the avatar disc (top right). Expect: bottom sheet slides up from the bottom edge (card centered, ≤448px wide), scrim darkens the page INCLUDING the bottom nav bar (if the nav labels stay bright/tappable above the scrim, the z-bump of Task 2 Step 2 is broken).
2. Sheet shows, top to bottom: name/handle head, Profil, Beiträge, Gespeichert, tour row (Die Führung / tour label), then „Abmelden" in the foot. Admin row only if the test account is admin.
3. Tap the tour row → sheet closes and the tour spotlight/hello appears (this is the original user-reported gap — restart reachable on mobile).
4. Re-open the sheet → tap the scrim → sheet closes.
5. Re-open → tap „Profil" → navigates to `/profile`.
6. While the sheet is open, confirm the page behind does not scroll (body scroll-lock).

- [ ] **Step 3: Desktop regression (viewport 1280×800)**

1. Open `/` → click avatar. Expect: the anchored dropdown exactly as before — top-right, caret visible, NO scrim, page scroll NOT locked.
2. `Escape` closes it and focus returns to the avatar disc.
3. ↑/↓ cycles the rows.

- [ ] **Step 4: Close the browser session**

Run: `playwright-cli close`

- [ ] **Step 5: Update the area docs**

In `src/components/forum/kiosk/CLAUDE.md`, retitle "### Avatar menu (desktop)" to "### Avatar menu (all viewports)" and rewrite the "Desktop-only gating" bullet to describe the new behavior: click toggles on all viewports; <1024px renders the same DOM as a fixed bottom sheet + scrim (`.am-scrim`, CSS-only switch in `global.css`); header z-bumps to 50 while open because the fixed bottom nav is a later `z-40` sibling stacking context; body scroll-lock applies on mobile only. Keep every other constraint bullet (Abmelden word/foot rule, no counts, admin row existence, focus-return, keyboard nav) unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/forum/kiosk/CLAUDE.md
git commit -m "docs: avatar menu now opens on all viewports (bottom sheet on mobile)"
```

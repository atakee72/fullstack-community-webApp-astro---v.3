# Avatar Menu + Signed-out Login State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give „Abmelden" a home — a desktop avatar dropdown in the kiosk nav, a signed-out confirmation strap on `/login`, and a collapsed-by-default Gefahrenzone on the mobile Konto card.

**Architecture:** Design handoff `design/handoffs/design_handoff_avatarmenu/` (CD, Aug 4 2026). Three surfaces: (1) all logout paths land on `/login?abgemeldet=1` where `AuthLoginInner` renders a one-line confirmation strap; (2) `KioskNav`'s avatar disc opens a paper dropdown on desktop (menu rows link to profile/ledger filters; foot slot links to the now-working `/logout` page); (3) `PKontoCard`'s mobile (`bare`) mount collapses the danger zone behind a ≥44px disclosure row. No new backend.

**Tech Stack:** Svelte 5 (runes), Astro 5, Tailwind + `--k-*` CSS vars, `kiosk-i18n.ts` store, auth-astro client `signOut()`.

## Global Constraints

- „Abmelden" is always the **WORD** („Abmelden" / "Sign out"), never only an icon. Wine + mono, own foot slot behind a solid ink rule (`1.5px solid var(--k-ink)`).
- **No scrim** behind the dropdown; the page stays fully visible.
- Dropdown closes on: **ESC · click outside · route change**. Keyboard ↑↓ + Enter; focus returns to the avatar on close.
- The Moderation row **does not exist** for non-admins (no disabled state). Gate: `user.role === 'admin'`.
- Mobile gets **no dropdown** — avatar keeps navigating to `/profile` below `lg` (1024px); Abmelden stays in the Konto card.
- Danger-zone disclosure row ≥ 44px tall. Desktop Konto card stays unchanged (open danger box).
- Motion: menu stamp-in 220ms `cubic-bezier(.2,.7,.3,1)`, transform-origin top right, scale .96→1 + translateY(-4px→0); close 140ms opacity fade; danger fold height-reveal 220ms. `prefers-reduced-motion: reduce` → everything instant.
- **No new design tokens** — only existing `--k-*` vars and font classes (`font-bricolage`, `font-dmmono`).
- Curly quotes „…" in all DE strings.
- **Decisions adopted** (confirmed with CD/user): „Meine Beiträge"/„Gespeichert" → `/profile?filter=forum` / `/profile?filter=gespeichert` (no new routes). **No counts** in the menu v1 (no extra per-pageload queries). Who-am-i handle/since line is lazily fetched from `GET /api/profile/me` on first menu open only.
- Repo rules: type-check baseline is **29 pre-existing errors** (`pnpm type-check`); every `.svelte` change needs a **browser gate** (no svelte-check exists); commit messages plain, no AI signatures; **never** touch the user's dev server on :3000 — smoke servers must verify a port is truly free first (sandbox squats 4399+); prod+dev share the MongoDB — don't create test users.

## File Map

- Modify: `src/lib/kiosk-i18n.ts` — 7 new keys × 2 locales (Tasks 1, 3)
- Modify: `src/components/auth/kiosk/AuthLoginInner.svelte` — signed-out strap (Task 1)
- Modify: `src/components/auth/kiosk/LogoutAction.svelte`, `src/components/profile/kiosk/PKontoCard.svelte`, `src/components/Navbar.tsx` — logout callback rewiring (Task 1)
- Modify: `src/components/profile/kiosk/PActivityLedger.svelte` — URL-param filter preselect (Task 2)
- Create: `src/components/forum/kiosk/AvatarMenu.svelte` (Task 3)
- Modify: `src/components/forum/kiosk/KioskNav.svelte` — avatar click behavior + menu mount (Task 3)
- Modify: `src/components/profile/kiosk/PKontoCard.svelte` — mobile danger fold (Task 4)
- Docs folded into tasks: `src/components/auth/kiosk/CLAUDE.md`, `src/components/profile/kiosk/CLAUDE.md`, `src/components/forum/kiosk/CLAUDE.md`

---

### Task 1: Signed-out login strap + logout callback rewiring

**Files:**
- Modify: `src/lib/kiosk-i18n.ts` (DE dict near `'auth.login.*'` ~line 999; EN dict mirror later in the same file — every key exists in BOTH)
- Modify: `src/components/auth/kiosk/AuthLoginInner.svelte`
- Modify: `src/components/auth/kiosk/LogoutAction.svelte`
- Modify: `src/components/profile/kiosk/PKontoCard.svelte:88-91`
- Modify: `src/components/Navbar.tsx:53-57`
- Modify: `src/components/auth/kiosk/CLAUDE.md` (add a short "signed-out strap" note)

**Interfaces:**
- Consumes: existing `signOut(options)` from `auth-astro/client` (always navigates to `options.callbackUrl`; the `redirect` option is dead — never read by auth-astro).
- Produces: the URL contract **`/login?abgemeldet=1`** — every logout path in the app must use exactly this. Task 3's menu links to `/logout`, whose island uses this contract.

- [ ] **Step 1: Add the i18n key (both locales)**

In `src/lib/kiosk-i18n.ts`, DE dictionary (next to the other `'auth.login.*'` keys):

```ts
'auth.login.signedout': 'Du bist abgemeldet. Bis bald im Kiez.',
```

EN dictionary (same key name, in the EN block):

```ts
'auth.login.signedout': "You're signed out. See you around the Kiez.",
```

- [ ] **Step 2: Render the strap in `AuthLoginInner.svelte`**

The island is `client:only="svelte"` (see `src/pages/login.astro`), so `window` is available at script-init. Add to the `<script>` block, next to the other `$state` declarations (~line 10-25):

```ts
// Signed-out confirmation strap (?abgemeldet=1) — set by every logout path.
// Param is stripped via replaceState so reload/bookmark doesn't re-show it.
let signedOut = $state(false);
{
  const params = new URLSearchParams(window.location.search);
  if (params.get('abgemeldet') === '1') {
    signedOut = true;
    params.delete('abgemeldet');
    const qs = params.toString();
    history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }
}
```

In the template, insert inside the `.auth-card` container (~line 103), directly BEFORE the `{#if bannedState}` banner block, so lockout/banned banners still render below it:

```svelte
{#if signedOut}
  <div
    class="font-dmmono"
    role="status"
    style="margin-bottom: 14px; padding: 9px 12px; border: 1.5px solid var(--k-ink); border-radius: var(--k-radius-sm); background: var(--k-paper-warm); font-size: 10.5px; letter-spacing: 0.08em; color: var(--k-ink-soft);"
  >
    ✓ {$t['auth.login.signedout']}
  </div>
{/if}
```

- [ ] **Step 3: Rewire the three logout call sites**

`src/components/auth/kiosk/LogoutAction.svelte` — change both URLs:

```svelte
<script>
  import { onMount } from 'svelte';
  import { signOut } from 'auth-astro/client';

  onMount(async () => {
    try {
      // callbackUrl is required here: auth-astro's signOut always navigates
      // to callbackUrl, which defaults to the CURRENT url — omitting it on
      // /logout would bounce right back onto this page.
      await signOut({ callbackUrl: '/login?abgemeldet=1' });
    } catch {
      window.location.href = '/login?abgemeldet=1';
    }
  });
</script>
```

`src/components/profile/kiosk/PKontoCard.svelte` lines 88-91 — replace `handleLogout` (the old `redirect: false` was a no-op in auth-astro; `signOut` navigates itself):

```ts
async function handleLogout() {
  try {
    await signOut({ callbackUrl: '/login?abgemeldet=1' });
  } catch {
    window.location.href = '/login?abgemeldet=1';
  }
}
```

`src/components/Navbar.tsx` lines 53-57 — same shape (keep `setMenuOpen(false)` first):

```ts
const handleLogout = async () => {
  setMenuOpen(false);
  try {
    await signOut({ callbackUrl: '/login?abgemeldet=1' });
  } catch {
    window.location.href = '/login?abgemeldet=1';
  }
};
```

- [ ] **Step 4: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -icE "error ts"` → Expected: `29` (baseline, no new errors).
Run: `pnpm build` → Expected: `[build] Complete!`

- [ ] **Step 5: Browser gate (smoke server on a verified-free port)**

Verify port free first (`(exec 3<>/dev/tcp/127.0.0.1/4650) 2>/dev/null || echo FREE`), then `pnpm dev --port 4650`. Check:
1. `curl -s "http://localhost:4650/login?abgemeldet=1" -o /dev/null -w "%{http_code}"` → `200`.
2. In a browser (playwright-cli or manual): open `/login?abgemeldet=1` → strap „Du bist abgemeldet. Bis bald im Kiez." visible above the form; URL bar shows `/login` (param stripped). Toggle EN → "You're signed out. See you around the Kiez.".
3. Plain `/login` → no strap.
Kill the smoke server afterwards (find PID via `pgrep -f "astro.*4650"`).

- [ ] **Step 6: Update `src/components/auth/kiosk/CLAUDE.md`**

Add one short paragraph: login has a signed-out strap keyed off `?abgemeldet=1` (stripped via `replaceState`); ALL logout paths must use `/login?abgemeldet=1` (LogoutAction, PKontoCard, legacy Navbar).

- [ ] **Step 7: Commit**

```bash
git add src/lib/kiosk-i18n.ts src/components/auth/kiosk/AuthLoginInner.svelte src/components/auth/kiosk/LogoutAction.svelte src/components/profile/kiosk/PKontoCard.svelte src/components/Navbar.tsx src/components/auth/kiosk/CLAUDE.md
git commit -m "feat(auth): signed-out confirmation strap on /login, all logout paths land there"
```

---

### Task 2: Activity-ledger filter preselect via URL param

**Files:**
- Modify: `src/components/profile/kiosk/PActivityLedger.svelte` (~line 42)

**Interfaces:**
- Consumes: `ActivityFilter` type from `src/lib/profile/profileShared.ts` (values: `alle | forum | markt | kalender | kurier | gespeichert`).
- Produces: the URL contract **`/profile?filter=<ActivityFilter>`** — Task 3's menu rows link to `?filter=forum` and `?filter=gespeichert`.

- [ ] **Step 1: Read the param at state-init**

In `PActivityLedger.svelte`, replace line 42 (`let filter = $state<ActivityFilter>('alle');`) with:

```ts
// URL-param preselect (/profile?filter=forum etc.) — used by the nav avatar
// menu's „Meine Beiträge"/„Gespeichert" rows. Own-view only: on the public
// profile a stranger's `gespeichert` must never preselect (that filter
// doesn't exist there), and public links don't carry the param anyway.
const VALID_FILTERS: ActivityFilter[] = ['alle', 'forum', 'markt', 'kalender', 'kurier', 'gespeichert'];
function initialFilter(): ActivityFilter {
  if (typeof window === 'undefined' || publicView || publicHandle) return 'alle';
  const p = new URLSearchParams(window.location.search).get('filter') as ActivityFilter | null;
  return p && VALID_FILTERS.includes(p) ? p : 'alle';
}
let filter = $state<ActivityFilter>(initialFilter());
```

(`typeof window` guard: ProfileInner mounts this island `client:load`, so the script also runs during SSR. The ledger's data fetch is client-side anyway, so the SSR/client chip-state difference is repaired at hydration — same pattern the island already tolerates for its fetch-driven content. Note `publicHandle`/`publicView` are the existing props at ~line 31-35 — reference them exactly as named there.)

- [ ] **Step 2: Type-check**

Run: `pnpm type-check 2>&1 | grep -icE "error ts"` → Expected: `29`.

- [ ] **Step 3: Browser gate**

Smoke server on a verified-free port. Logged-out check is enough for wiring (ledger itself needs a session; ask the user for a 10-second logged-in check on :3000 later, OR reuse the playwright cookie workflow from memory `reference_playwright_auth`): open `/profile?filter=forum` — page renders its logged-out state without JS errors in the console. The full logged-in assertion: „Forum" chip active + feed filtered, `gespeichert` variant likewise.

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/kiosk/PActivityLedger.svelte
git commit -m "feat(profile): preselect activity-ledger filter from ?filter= URL param"
```

---

### Task 3: AvatarMenu dropdown + KioskNav integration

**Files:**
- Create: `src/components/forum/kiosk/AvatarMenu.svelte`
- Modify: `src/components/forum/kiosk/KioskNav.svelte` (props type ~line 12-15, avatar anchor ~line 139-152)
- Modify: `src/lib/kiosk-i18n.ts` (6 new keys × 2 locales)
- Modify: `src/components/forum/kiosk/CLAUDE.md` (short avatar-menu section)

**Interfaces:**
- Consumes: `/login?abgemeldet=1` contract via `/logout` (Task 1); `/profile?filter=...` contract (Task 2); `GET /api/profile/me` → `{ profile: { handle, memberSince, ... } }` (existing, session-gated); `session.user.role` (already in the session — KioskLayout passes `session.user` verbatim, only the prop TYPE needs widening).
- Produces: `AvatarMenu.svelte` with props `{ user: { name?: string; role?: string }, onClose: () => void }`. `onClose` is called AFTER the 140ms close animation (immediately under reduced motion).

- [ ] **Step 1: i18n keys (both locales)**

DE dictionary (next to `'nav.*'` keys ~line 67):

```ts
'nav.menu.profil': 'Mein Profil',
'nav.menu.beitraege': 'Meine Beiträge',
'nav.menu.gespeichert': 'Gespeichert',
'nav.menu.moderation': 'Moderation',
'nav.menu.abmelden': 'Abmelden',
'nav.menu.seit': 'IM KIEZ SEIT',
```

EN dictionary:

```ts
'nav.menu.profil': 'My profile',
'nav.menu.beitraege': 'My posts',
'nav.menu.gespeichert': 'Saved',
'nav.menu.moderation': 'Moderation',
'nav.menu.abmelden': 'Sign out',
'nav.menu.seit': 'IN THE KIEZ SINCE',
```

- [ ] **Step 2: Create `src/components/forum/kiosk/AvatarMenu.svelte`**

```svelte
<script lang="ts">
  // Paper dropdown anchored to the nav avatar (desktop only — KioskNav gates
  // mounting). Design source: design/handoffs/design_handoff_avatarmenu/
  // jsx/kiosk-avatar-menu.jsx (AvatarMenu) + motion-avatarmenu.css.
  // Foot slot: „Abmelden" as WORD, wine + mono, behind a SOLID ink rule —
  // links to /logout (which runs the real signOut flow → /login?abgemeldet=1).
  import { t } from '../../../lib/kiosk-i18n';

  let { user, onClose } = $props<{
    user: { name?: string; role?: string };
    onClose: () => void;
  }>();

  const isAdmin = $derived(user?.role === 'admin');

  // Who-am-i extras — one lazy fetch per menu open, name renders regardless.
  let handle = $state<string | null>(null);
  let sinceYear = $state<number | null>(null);
  $effect(() => {
    let alive = true;
    fetch('/api/profile/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.profile) return;
        handle = d.profile.handle ?? null;
        sinceYear = d.profile.memberSince ?? null;
      })
      .catch(() => {});
    return () => { alive = false; };
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closing = $state(false);
  function close() {
    if (closing) return;
    if (reduced) { onClose(); return; }
    closing = true;
    setTimeout(onClose, 140);
  }

  let menuEl = $state<HTMLElement | null>(null);

  function onDocPointerDown(e: PointerEvent) {
    if (menuEl && !menuEl.contains(e.target as Node)) close();
  }
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = menuEl ? Array.from(menuEl.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    // Nothing focused yet (mouse-open): ArrowDown enters at the first row,
    // ArrowUp at the last. (A naive `(i-1+len)%len` with i=-1 lands on the
    // second-to-last — off-by-one, caught in plan audit.)
    const next =
      i === -1
        ? (e.key === 'ArrowDown' ? 0 : items.length - 1)
        : (e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length);
    items[next].focus();
  }
  $effect(() => {
    // Delay the outside-click listener a tick so the opening click doesn't
    // instantly close the menu. No auto-focus on open — a mouse-open would
    // paint an unexpected focus ring; ↑↓ starts keyboard navigation instead.
    const id = setTimeout(() => document.addEventListener('pointerdown', onDocPointerDown), 0);
    document.addEventListener('keydown', onKeydown);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onKeydown);
    };
  });
</script>

<div bind:this={menuEl} class="am-menu" class:am-closing={closing} role="menu" aria-label={user?.name ?? 'Konto'}>
  <div class="am-caret"></div>
  <div class="am-card">
    <div class="am-head">
      <div class="am-name font-bricolage">{user?.name ?? ''}</div>
      {#if handle}
        <div class="am-sub font-dmmono">@{handle}{#if sinceYear}&nbsp;· {$t['nav.menu.seit']} {sinceYear}{/if}</div>
      {/if}
    </div>
    <div class="am-group">
      <a role="menuitem" href="/profile" class="am-row font-bricolage">{$t['nav.menu.profil']}<span class="am-icon font-dmmono">→</span></a>
      <a role="menuitem" href="/profile?filter=forum" class="am-row font-bricolage">{$t['nav.menu.beitraege']}</a>
      <a role="menuitem" href="/profile?filter=gespeichert" class="am-row font-bricolage">{$t['nav.menu.gespeichert']}<span class="am-icon font-dmmono">◈</span></a>
    </div>
    {#if isAdmin}
      <div class="am-group am-admin">
        <a role="menuitem" href="/admin/moderation" class="am-row am-plum font-bricolage">{$t['nav.menu.moderation']}</a>
      </div>
    {/if}
    <div class="am-foot">
      <a role="menuitem" href="/logout" class="am-row am-wine font-dmmono">{$t['nav.menu.abmelden']}<span class="am-icon font-dmmono">⏻</span></a>
    </div>
  </div>
</div>

<style>
  .am-menu {
    position: absolute; top: calc(100% + 10px); right: 0; width: 236px; z-index: 50;
    transform-origin: top right;
    animation: amStampIn 220ms cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  .am-menu.am-closing { animation: none; transition: opacity 140ms cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; }
  @keyframes amStampIn {
    from { opacity: 0; transform: scale(0.96) translateY(-4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .am-menu { animation: none; }
    .am-menu.am-closing { transition: none; }
  }
  .am-caret {
    position: absolute; top: -7px; right: 16px; width: 12px; height: 12px;
    background: var(--k-paper); border: 1.5px solid var(--k-ink);
    border-right: none; border-bottom: none; transform: rotate(45deg);
  }
  .am-card {
    background: var(--k-paper); border: 1.5px solid var(--k-ink);
    border-radius: var(--k-radius-md); box-shadow: 3px 3px 0 var(--k-ink);
    overflow: hidden; position: relative;
  }
  .am-head { padding: 12px 14px 10px; border-bottom: 1px dashed var(--k-rule); background: var(--k-paper-warm); }
  .am-name { font-size: 13.5px; font-weight: 800; letter-spacing: -0.01em; color: var(--k-ink); }
  .am-sub { font-size: 9.5px; color: var(--k-ink-mute); letter-spacing: 0.08em; margin-top: 2px; }
  .am-group { padding: 6px 0; }
  .am-group.am-admin { border-top: 1px dashed var(--k-rule); }
  .am-foot { border-top: 1.5px solid var(--k-ink); padding: 6px 0; background: var(--k-paper-warm); }
  .am-row {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 9px 14px; cursor: pointer; text-decoration: none;
    font-size: 13.5px; font-weight: 600; letter-spacing: -0.005em; color: var(--k-ink);
  }
  .am-row:hover, .am-row:focus-visible { background: var(--k-paper-soft); outline: none; }
  .am-row.am-plum { color: var(--k-plum); }
  .am-row.am-wine { color: var(--k-wine); font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em; }
  .am-icon { font-size: 11px; opacity: 0.55; }
</style>
```

Tokens verified during plan audit: `--k-paper-soft`, `--k-paper-warm`, `--k-radius-sm`, `--k-radius-md`, `--k-plum`, `--k-wine`, `--k-ink-mute`, `--k-ink-soft`, `--k-rule`, `--k-danger` all exist in `src/styles/tokens.css`. Use them as written — **no new tokens**.

- [ ] **Step 3: Wire into `KioskNav.svelte`**

Widen the props type (line 12-15) — `role` comes free since KioskLayout passes `session.user` verbatim:

```ts
let { currentPath = '/', user = null } = $props<{
  currentPath?: string;
  user?: { name?: string; image?: string | null; role?: string } | null;
}>();
```

Add imports + state to the script block:

```ts
import AvatarMenu from './AvatarMenu.svelte';

let menuOpen = $state(false);
let avatarEl = $state<HTMLElement | null>(null);

// Desktop: avatar click opens the dropdown. Below lg the anchor navigates
// to /profile as before (mobile gets NO dropdown — design constraint).
function handleAvatarClick(e: MouseEvent) {
  if (window.matchMedia('(min-width: 1024px)').matches) {
    e.preventDefault();
    menuOpen = !menuOpen;
  }
}
function closeMenu() {
  menuOpen = false;
  avatarEl?.focus(); // focus returns to the avatar (design constraint)
}
```

Wrap the logged-in avatar anchor (lines 139-152) in a relative container and mount the menu (keep the existing anchor markup/classes byte-identical except the added attributes):

```svelte
{#if user?.name}
  <div class="relative">
    <a
      bind:this={avatarEl}
      href="/profile"
      onclick={handleAvatarClick}
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      aria-label={user.name}
      aria-current={profileActive ? 'page' : undefined}
      class:prof-nav-avatar-active={profileActive}
      class="w-9 h-9 rounded-full border-2 border-ink overflow-hidden flex items-center justify-center font-dmmono font-bold text-[11px] uppercase tracking-wider bg-ochre text-ink hover:scale-105 transition-transform duration-[180ms] ease-out"
    >
      {#if liveImage ?? user.image}
        <img src={liveImage ?? user.image} alt="" class="w-full h-full object-cover" />
      {:else}
        {initialsOf(user.name)}
      {/if}
    </a>
    {#if menuOpen}
      <AvatarMenu {user} onClose={closeMenu} />
    {/if}
  </div>
{:else}
  ... existing /login anchor unchanged ...
{/if}
```

Route change closes the menu for free: every menu row is a real navigation, and the island remounts on the destination page.

- [ ] **Step 4: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -icE "error ts"` → Expected: `29`.
Run: `pnpm build` → Expected: `[build] Complete!`

- [ ] **Step 5: Browser gate**

Smoke server on a verified-free port. Logged-out: nav renders, avatar shows the `/login` disc, no console errors. Logged-in checks (user's :3000 or playwright cookie workflow — memory `reference_playwright_auth`):
1. Desktop ≥1024px: click avatar → menu stamps in top-right anchored; rows Mein Profil / Meine Beiträge / Gespeichert; wine mono „Abmelden" behind solid ink rule; NO scrim.
2. Handle line appears after the lazy fetch (`@handle · IM KIEZ SEIT <year>`).
3. ESC closes + focus back on avatar; click outside closes; ↑↓ cycles rows; Enter follows.
4. Non-admin user: no Moderation row at all. Admin user: plum Moderation row → `/admin/moderation`.
5. „Abmelden" → `/logout` → lands on `/login` with the Task-1 strap.
6. Narrow viewport (<1024px): avatar click navigates to `/profile`, no menu.
7. Reduced motion (devtools emulation): menu appears/disappears instantly.

- [ ] **Step 6: Update `src/components/forum/kiosk/CLAUDE.md`**

Add a short "Avatar menu (desktop)" section: mount location (KioskNav right slot), desktop-only gating via `matchMedia`, `/api/profile/me` lazy fetch on open, close semantics, and the „Abmelden is a WORD" + no-scrim + no-counts-v1 constraints.

- [ ] **Step 7: Commit**

```bash
git add src/components/forum/kiosk/AvatarMenu.svelte src/components/forum/kiosk/KioskNav.svelte src/lib/kiosk-i18n.ts src/components/forum/kiosk/CLAUDE.md
git commit -m "feat(nav): desktop avatar dropdown menu with Abmelden foot slot"
```

---

### Task 4: Mobile Konto card — collapsed Gefahrenzone

**Files:**
- Modify: `src/components/profile/kiosk/PKontoCard.svelte` (the `{:else if onOpenDelete}` branch, ~line 174-184)
- Modify: `src/components/profile/kiosk/CLAUDE.md` (one paragraph)

**Interfaces:**
- Consumes: existing props `bare` (true = mobile fold mount), `onOpenDelete`, `deletionScheduledAt`; existing i18n keys `profile.del.zone.label` / `profile.del.zone.row` / `profile.del.zone.cta`.
- Produces: nothing new — presentation-only change.

- [ ] **Step 1: Split the danger-zone branch by `bare`**

Add to the script block:

```ts
import { slide } from 'svelte/transition';

// Mobile-only disclosure (design: Gefahrenzone ZU per default — one
// deliberate tap separates routine (Abmelden) from irreversible (löschen)).
// Local per-mount state is safe: PKontoCard is double-mounted but only one
// mount is ever visible per breakpoint, and the fold is pure presentation.
let dangerOpen = $state(false);
const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

Replace the `{:else if onOpenDelete}` block (lines 174-184) with:

```svelte
{:else if onOpenDelete}
  {#if bare}
    <!-- Mobile: collapsed disclosure (≥44px row). Desktop box below stays unchanged. -->
    <div style="margin-top: 16px; border-top: 1.5px dashed var(--k-rule);">
      <button
        type="button"
        class="font-dmmono"
        aria-expanded={dangerOpen}
        onclick={() => (dangerOpen = !dangerOpen)}
        style="width: 100%; min-height: 44px; display: flex; align-items: center; justify-content: space-between; background: none; border: none; padding: 13px 0 2px; cursor: pointer;"
      >
        <span style="font-size: 9.5px; color: var(--k-danger); letter-spacing: 0.14em;">{$t['profile.del.zone.label']}</span>
        <span style="font-size: 11px; color: var(--k-danger);">{dangerOpen ? '▾' : '▸'}</span>
      </button>
      {#if dangerOpen}
        <div
          transition:slide={{ duration: reducedMotion ? 0 : 220 }}
          style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 4px;"
        >
          <span class="font-bricolage" style="font-size: 12.5px; color: var(--k-ink-soft);">{$t['profile.del.zone.row']}</span>
          <PBtn danger small onclick={onOpenDelete}>{$t['profile.del.zone.cta']}</PBtn>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Desktop: existing open dashed box, byte-identical to before -->
    <div style="margin-top: 16px; padding: 12px 14px; border: 1.5px dashed var(--k-danger); border-radius: var(--k-radius-md);">
      <div class="font-dmmono" style="font-size: 9.5px; color: var(--k-danger); letter-spacing: 0.14em; margin-bottom: 6px;">
        {$t['profile.del.zone.label']}
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
        <span class="font-bricolage" style="font-size: 12.5px; color: var(--k-ink-soft);">{$t['profile.del.zone.row']}</span>
        <PBtn danger small onclick={onOpenDelete}>{$t['profile.del.zone.cta']}</PBtn>
      </div>
    </div>
  {/if}
{/if}
```

**Deliberate deviation from the mock, keep it:** the `deletionScheduledAt` pending-deletion banner branch stays ALWAYS visible on both breakpoints (never behind the fold) — an active deletion countdown is a status the user must see, not an action to tuck away.

- [ ] **Step 2: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -icE "error ts"` → Expected: `29`.
Run: `pnpm build` → Expected: `[build] Complete!`

- [ ] **Step 3: Browser gate**

Logged-in `/profile` at mobile width (<1024px), Konto fold open: „GEFAHRENZONE ▸" row visible, delete row hidden; tap → slides open 220ms revealing „Konto dauerhaft löschen" + danger button; disclosure row measures ≥44px (devtools). Desktop width: danger box open as before, unchanged. With a scheduled deletion (if testable): the red pending banner shows on mobile WITHOUT opening the fold.

- [ ] **Step 4: Update `src/components/profile/kiosk/CLAUDE.md`**

One paragraph under "Mobile fold layout": mobile `bare` mount collapses the Gefahrenzone behind a ≥44px disclosure (design_handoff_avatarmenu), desktop unchanged, pending-deletion banner deliberately exempt from the fold.

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/kiosk/PKontoCard.svelte src/components/profile/kiosk/CLAUDE.md
git commit -m "feat(profile): collapse Gefahrenzone behind disclosure on mobile Konto card"
```

---

## Final verification (whole feature)

1. `pnpm type-check` → 29 baseline; `pnpm build` green.
2. End-to-end on a real session: avatar menu → Gespeichert → ledger opens pre-filtered → avatar menu → Abmelden → `/logout` interstitial → `/login` with strap → log back in.
3. Commit the design handoff alongside the code: `git add design/handoffs/design_handoff_avatarmenu && git commit -m "docs(design): add avatar-menu design handoff"`.
4. Push only when the user asks.

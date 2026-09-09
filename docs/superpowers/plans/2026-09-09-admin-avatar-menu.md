# Admin Avatar Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin masthead (`AdminLayout`) a real avatar trigger with the shared account menu, extended on admin pages with a "Bereiche" group (Forum · Kalender · News · Markt · Kiez · Blog), on desktop AND mobile.

**Architecture:** `AvatarMenu.svelte` (the existing paper dropdown / mobile bottom sheet) gains a `context: 'app' | 'admin'` prop — in `admin` context it renders an areas group and hides the now-redundant „Admin-Bereich" row. A new tiny island `AdmAvatar.svelte` (plum disc button + `AvatarMenu`) is mounted by `AdminLayout.astro` in both mastheads; the layout's `adminName` prop is replaced by a `user` object that the three admin pages already have from `getSession()`.

**Tech Stack:** Astro 5 (SSR layout), Svelte 5 runes islands (`client:load`), `kiosk-i18n` derived store (`$t['key']`), global `.am-*` CSS in `src/styles/global.css`.

**Spec:** No separate spec file. The design was agreed in chat on 2026-09-09 (user: "it would be good to have it in order to jump any other areas within"; approved proposal: avatar trigger + `AvatarMenu` in the admin masthead on desktop and mobile, plus a "Bereiche" group shown only on admin pages, pages pass the session user). This header is the spec.

## Global Constraints

- CI ratchet budgets, verified before every commit: `pnpm type-check` errors ≤ 26, `npx -y svelte-check@4` errors ≤ 93. Never raise them.
- `tsc` does NOT compile `.astro` files — any task touching `AdminLayout.astro` or an admin page must run `pnpm build` as its gate.
- `AvatarMenu.svelte` styles live in `src/styles/global.css` (`.am-*` block), NEVER in a component `<style>` — it is reached only through Svelte islands and Astro's prod build orphans such scoped CSS (documented at the bottom of `AvatarMenu.svelte`). New menu styles go in that global block.
- i18n: every user-visible string is a key in `src/lib/kiosk-i18n.ts`, added to the DE dictionary first, then the EN dictionary, same key name, read in Svelte as `$t['key']`. The admin layout's own chrome (ribbon, section rail) is static DE by locked decision — do not change that.
- Commit messages: simple `type(scope): summary`, no "Generated with Claude Code" line, no `Co-Authored-By` footer. Stage only the named files (`git add <file> …`, never `git add .`). Do not push — pushing is the user's call.
- Don't auto-start `pnpm dev` for verification unless the user has said so; the browser steps below assume a dev server on `http://localhost:3000`. If it isn't up, run the static gates, then ask.
- Dev admin login for browser checks: `admin@mahalle-dev.test`, password in `scratchpad/devpw.txt` (gitignored). Fill the password LAST with command output suppressed, never snapshot a page while the password field is filled, confirm login via `playwright-cli eval "location.pathname"`.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/components/forum/kiosk/AvatarMenu.svelte` | Shared account menu (dropdown / bottom sheet) | Add `context` prop, areas group, hide admin row in admin context, widen `user.name` type |
| `src/lib/kiosk-i18n.ts` | DE + EN dictionaries | Add `nav.menu.areas` (DE line ~86, EN line ~2005) |
| `src/styles/global.css` | Global `.am-*` menu styles | Add `.am-group.am-areas` + `.am-kicker` |
| `src/components/admin/kiosk/AdmAvatar.svelte` | NEW island: plum avatar button + `AvatarMenu context="admin"` | Create |
| `src/layouts/AdminLayout.astro` | Admin masthead (desktop + mobile) | Replace `adminName` prop with `user`, mount `AdmAvatar` in both mastheads |
| `src/pages/admin/moderation.astro`, `announcements.astro`, `mitglieder.astro` | Admin pages | Pass `user={session.user}` to the layout |
| `src/components/admin/CLAUDE.md` | Area notes | Update the Layout paragraph |

---

### Task 1: `AvatarMenu` gains an admin context with a "Bereiche" group

**Files:**
- Modify: `src/components/forum/kiosk/AvatarMenu.svelte` (props block lines 12-17, markup lines 106-131)
- Modify: `src/lib/kiosk-i18n.ts` (after `'nav.menu.adminArea'` in the DE dict at line ~86 and in the EN dict at line ~2005)
- Modify: `src/styles/global.css` (after `.am-group.am-admin { … }` at line ~840)

**Interfaces:**
- Consumes: existing i18n keys `nav.forum`, `nav.calendar`, `nav.news`, `nav.marketplace`, `nav.kiez`, `nav.blog` (both dicts), existing `.am-group`/`.am-row` styles.
- Produces: `AvatarMenu` props become
  ```ts
  {
    user: { name?: string | null; role?: string };
    onClose: (restoreFocus: boolean) => void;
    context?: 'app' | 'admin';   // default 'app' — existing KioskNav callers unchanged
  }
  ```
  In `context="admin"` the menu renders, after the head: a group with kicker `$t['nav.menu.areas']` and six `role="menuitem"` links (`/forum`, `/calendar`, `/newsboard`, `/marketplace`, `/schillerkiez`, `/blog`), and does NOT render the „Admin-Bereich" row. Task 2 relies on exactly this.

- [ ] **Step 1: Add the i18n key (DE first, then EN)**

In `src/lib/kiosk-i18n.ts`, directly after the DE line `'nav.menu.adminArea': 'Admin-Bereich',` add:

```ts
  'nav.menu.areas': 'Bereiche',
```

Directly after the EN line `'nav.menu.adminArea': 'Admin area',` add:

```ts
  'nav.menu.areas': 'Areas',
```

Verify both landed:

```bash
grep -n "'nav.menu.areas'" src/lib/kiosk-i18n.ts
```

Expected: exactly two lines, the first with `Bereiche`, the second with `Areas`.

- [ ] **Step 2: Add the two global styles**

In `src/styles/global.css`, directly after the line `.am-group.am-admin { border-top: 1px dashed var(--k-rule); }` add:

```css
.am-group.am-areas { border-bottom: 1px dashed var(--k-rule); }
.am-kicker { padding: 6px 14px 2px; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--k-ink-mute); }
```

- [ ] **Step 3: Extend the props and add the areas list**

In `src/components/forum/kiosk/AvatarMenu.svelte` replace the props block

```ts
  let { user, onClose } = $props<{
    user: { name?: string; role?: string };
    onClose: (restoreFocus: boolean) => void;
  }>();

  const isAdmin = $derived(user?.role === 'admin');
```

with

```ts
  // `context`: 'app' (default — KioskNav on the member surfaces) or 'admin'
  // (AdmAvatar in the admin masthead). Admin context adds a „Bereiche" group
  // so the admin can jump to any member surface from the back-office, and
  // drops the „Admin-Bereich" row (you're already there).
  let { user, onClose, context = 'app' } = $props<{
    user: { name?: string | null; role?: string };
    onClose: (restoreFocus: boolean) => void;
    context?: 'app' | 'admin';
  }>();

  const isAdmin = $derived(user?.role === 'admin');

  // Same six surfaces as KioskNav's topNav, same i18n keys.
  const AREAS = [
    { href: '/forum',        key: 'nav.forum' },
    { href: '/calendar',     key: 'nav.calendar' },
    { href: '/newsboard',    key: 'nav.news' },
    { href: '/marketplace',  key: 'nav.marketplace' },
    { href: '/schillerkiez', key: 'nav.kiez' },
    { href: '/blog',         key: 'nav.blog' },
  ] as const;
```

- [ ] **Step 4: Render the areas group and gate the admin row**

In the same file, directly after the closing `</div>` of `<div class="am-head">…</div>` (the line after `{/if}` that closes the handle block) insert:

```svelte
    {#if context === 'admin'}
      <div class="am-group am-areas">
        <div class="am-kicker font-dmmono">{$t['nav.menu.areas']}</div>
        {#each AREAS as area (area.href)}
          <a role="menuitem" href={area.href} class="am-row font-bricolage">{$t[area.key]}</a>
        {/each}
      </div>
    {/if}
```

Then change the admin-row guard from

```svelte
    {#if isAdmin}
      <div class="am-group am-admin">
```

to

```svelte
    {#if isAdmin && context !== 'admin'}
      <div class="am-group am-admin">
```

- [ ] **Step 5: Static gates**

```bash
pnpm type-check 2>&1 | grep -c "error TS"
npx -y svelte-check@4 2>&1 | tail -1
```

Expected: `26` (or lower) and a final line containing `93 ERRORS` (or lower). If svelte-check went up, the usual cause is the `$t[area.key]` index — check that `t`'s record type accepts a string key; if not, cast: `{$t[area.key as string]}`.

- [ ] **Step 6: Browser check that the default context is unchanged**

Only if the dev server on :3000 is up. Log in and open the forum menu:

```bash
playwright-cli open "http://localhost:3000/login?redirect=/forum" >/dev/null 2>&1; sleep 2
playwright-cli snapshot 2>/dev/null | grep -E 'textbox "E-Mail"|textbox "Passwort zeigen"|button "anmelden"'
```

Note the three refs (`eNN`), then (password last, output suppressed):

```bash
playwright-cli fill <email-ref> "admin@mahalle-dev.test" >/dev/null 2>&1
playwright-cli fill <pw-ref> "$(cat scratchpad/devpw.txt)" >/dev/null 2>&1
playwright-cli click <submit-ref> >/dev/null 2>&1; sleep 4
playwright-cli eval "location.pathname" 2>&1 | grep -A1 Result | tail -1
```

Expected: `"/forum"`. Dismiss the tour card if it shows (`button "Schließen"`), then click the avatar (the `link "Dev Admin"` in the nav) and list menu items:

```bash
playwright-cli snapshot 2>/dev/null | grep -E 'link "Dev Admin" \[ref'
playwright-cli click <that-ref> >/dev/null 2>&1; sleep 1
playwright-cli snapshot 2>/dev/null | grep -E 'menuitem'
```

Expected: the seven existing rows (Mein Profil, Meine Beiträge, Gespeichert, Führung starten, Die Beilage, Admin-Bereich, Abmelden) and NO Forum/Kalender/News/Markt/Kiez/Blog rows. Then `playwright-cli close`.

- [ ] **Step 7: Commit**

```bash
git add src/components/forum/kiosk/AvatarMenu.svelte src/lib/kiosk-i18n.ts src/styles/global.css
git commit -m "feat(nav): AvatarMenu admin context with Bereiche group"
```

---

### Task 2: `AdmAvatar` island in the admin masthead, pages pass the session user

**Files:**
- Create: `src/components/admin/kiosk/AdmAvatar.svelte`
- Modify: `src/layouts/AdminLayout.astro` (header comment lines 1-7, `Props` + destructure lines 12-28, `trimmedAdminName`/`adminInitial` lines 38-39, desktop right cluster lines ~84-95, mobile header lines ~118-135)
- Modify: `src/pages/admin/moderation.astro:14`, `src/pages/admin/announcements.astro:38-41`, `src/pages/admin/mitglieder.astro:14-17`
- Modify: `src/components/admin/CLAUDE.md` (the `**Layout**:` paragraph, line ~16)

**Interfaces:**
- Consumes: `AvatarMenu` with `context="admin"` and `user: { name?: string | null; role?: string }` from Task 1.
- Produces: `AdminLayout` props
  ```ts
  {
    title: string;
    user: { name?: string | null; image?: string | null; role?: string };  // REQUIRED, replaces adminName
    wordmark?: string;
    ribbonEcho?: string;
  }
  ```
  and `AdmAvatar` props `{ user: same shape; size?: number /* px, default 38 */ }`. The layout hands the island a trimmed `avatarUser = { name, image, role }` (never the raw session user — island props are serialized into the HTML). Use explicit `user={avatarUser}` attributes in `.astro` (this repo doesn't use Astro's `{prop}` shorthand).

- [ ] **Step 1: Create the island**

Write `src/components/admin/kiosk/AdmAvatar.svelte`:

```svelte
<script lang="ts">
  // Admin masthead avatar: plum disc trigger + the shared account menu in
  // admin context (adds the „Bereiche" group, drops the „Admin-Bereich" row).
  // Imported directly by AdminLayout.astro — so unlike AvatarMenu it is NOT
  // at risk of the prod CSS-orphan bug; it still uses inline styles to match
  // the layout's other discs (no component <style>).
  // Presentation of the menu itself (dropdown ≥1024px, bottom sheet below)
  // is AvatarMenu's `.am-*` CSS; the AdminLayout masthead switches at `md`
  // (768px), so 768–1023px shows the desktop masthead with a bottom sheet —
  // same as KioskNav, accepted.
  import AvatarMenu from '../../forum/kiosk/AvatarMenu.svelte';

  let { user, size = 38 } = $props<{
    user: { name?: string | null; image?: string | null; role?: string };
    size?: number;
  }>();

  let open = $state(false);
  let triggerEl = $state<HTMLElement | null>(null);

  function initialsOf(name?: string | null): string {
    if (!name) return '·';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
  }

  function onClose(restoreFocus: boolean) {
    open = false;
    if (restoreFocus) triggerEl?.focus();
  }
</script>

<div class="relative">
  <button
    bind:this={triggerEl}
    type="button"
    onclick={() => (open = !open)}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label={user.name ?? 'Admin'}
    class="font-bricolage"
    style="width:{size}px; height:{size}px; padding:0; background:var(--k-accent); border-radius:50%; border:2px solid var(--k-ink); display:flex; align-items:center; justify-content:center; overflow:hidden; font-weight:700; font-size:{Math.round(size * 0.37)}px; color:var(--k-paper); cursor:pointer;"
  >
    {#if user.image}
      <img src={user.image} alt="" style="width:100%; height:100%; object-fit:cover;" />
    {:else}
      {initialsOf(user.name)}
    {/if}
  </button>
  {#if open}
    <AvatarMenu {user} context="admin" {onClose} />
  {/if}
</div>
```

- [ ] **Step 2: Rewrite `AdminLayout`'s frontmatter**

In `src/layouts/AdminLayout.astro` replace lines 1-28 (everything from the opening `---` through `} = Astro.props;`) with:

```astro
---
// Editorial Kiosk layout for the internal admin back-office.
// Sibling to AuthLayout, but for the OPPOSITE audience: a logged-in admin,
// not a logged-out visitor. No KioskNav (this isn't part of the public app
// nav), no footer. Plum accent via [data-page="admin"] in tokens.css.
// The layout never calls getSession itself — each page resolves the session
// and passes `user` (name/image/role) for the masthead avatar + menu.
import AuthLangToggle from '../components/auth/kiosk/AuthLangToggle.svelte';
import AdmAvatar from '../components/admin/kiosk/AdmAvatar.svelte';
import ToastProvider from '../components/ToastProvider';
import { ViewTransitions } from 'astro:transitions';

export interface Props {
  title: string;
  user: { name?: string | null; image?: string | null; role?: string };
  wordmark?: string;   // masthead italic word — 'moderation' | 'amtliches' | …
  ribbonEcho?: string; // mono echo on the right of the internal-area ribbon
}

const {
  title,
  user,
  wordmark = 'moderation',
  ribbonEcho = 'user.role === "admin"',
} = Astro.props;

// Island props are serialized into the HTML for hydration — pass only what
// the avatar needs, never the whole session user (id/email would otherwise
// land in the page source).
const avatarUser = { name: user.name ?? null, image: user.image ?? null, role: user.role };
```

Then delete these two lines (they follow `const currentPath = Astro.url.pathname;`):

```ts
const trimmedAdminName = adminName.trim();
const adminInitial = (trimmedAdminName[0] ?? '?').toUpperCase();
```

- [ ] **Step 3: Replace the desktop static disc with the island**

In the desktop right cluster, replace

```astro
          <AuthLangToggle client:load />
          <div
            class="font-bricolage"
            style="width:38px; height:38px; background:var(--k-accent); border-radius:50%; border:2px solid var(--k-ink); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; color:var(--k-paper);"
            aria-label={`Angemeldet als ${trimmedAdminName || 'Admin'}`}
          >{adminInitial}</div>
        </div>
      </header>
```

with

```astro
          <AuthLangToggle client:load />
          <AdmAvatar client:load user={avatarUser} size={38} />
        </div>
      </header>
```

Also update the desktop section comment `<!-- ═══ Desktop (≥ md) masthead — full ribbon + branding + back-link. ═══ -->` to `<!-- ═══ Desktop (≥ md) masthead — full ribbon + branding + back-link + avatar menu. ═══ -->`.

- [ ] **Step 4: Add the island to the mobile masthead**

Replace the mobile comment block

```astro
    <!-- ═══ Mobile (< md) masthead — slim ribbon + compact wordmark. ═══
         Per JSX kiosk-admin.jsx:482-491. No avatar — desktop-only chrome;
         AuthLangToggle stays available (moved into this row) so DE/EN swap
         still works on mobile. The section rail below carries navigation
         (sections + ← Forum) so no admin page is a dead end on a phone. -->
```

with

```astro
    <!-- ═══ Mobile (< md) masthead — slim ribbon + compact wordmark. ═══
         Per JSX kiosk-admin.jsx:482-491. AuthLangToggle + the avatar menu
         (bottom sheet on this viewport) sit in this row; the section rail
         below carries section navigation (+ ← Forum). -->
```

and in the mobile `<header>` replace

```astro
        <AuthLangToggle client:load />
      </header>
```

with

```astro
        <div class="flex items-center" style="gap:10px;">
          <AuthLangToggle client:load />
          <AdmAvatar client:load user={avatarUser} size={32} />
        </div>
      </header>
```

- [ ] **Step 5: Pages pass the session user**

`src/pages/admin/moderation.astro` line 14 — change

```astro
<AdminLayout title="Mahalle · Moderation" adminName={adminName}>
```

to

```astro
<AdminLayout title="Mahalle · Moderation" user={session.user}>
```

(keep the `adminName` const — `ModerationApp` still receives it on line 16).

`src/pages/admin/announcements.astro` — in the `<AdminLayout` opening tag change `adminName={adminName}` to `user={session.user}` (keep the `adminName` const — `AnnounceApp` still receives it).

`src/pages/admin/mitglieder.astro` — in the `<AdminLayout` opening tag change `adminName={adminName}` to `user={session.user}`. Then check whether `adminName` is still used in that file:

```bash
grep -n "adminName" src/pages/admin/mitglieder.astro
```

If the only remaining hit is the `const adminName = …` line, delete that line.

- [ ] **Step 6: Static gates + build**

```bash
grep -rn "adminName=" src/layouts/AdminLayout.astro; echo "(expect no output)"
pnpm type-check 2>&1 | grep -c "error TS"
npx -y svelte-check@4 2>&1 | tail -1
pnpm build 2>&1 | grep -iE "error|Complete!" | tail -5
```

Expected: no `adminName=` in the layout, `26` or lower, `93 ERRORS` or lower, and a line ending `[build] Complete!` with no `error` lines.

- [ ] **Step 7: Browser check — desktop**

Only if the dev server on :3000 is up. Log in as in Task 1 Step 6 but with `redirect=/admin/moderation`; confirm `location.pathname` is `"/admin/moderation"`. Then:

```bash
playwright-cli resize 1280 900 >/dev/null 2>&1
playwright-cli eval "(()=>{const b=[...document.querySelectorAll('button[aria-haspopup=menu]')].filter(e=>e.offsetParent);return b.length+' visible; label='+b[0]?.getAttribute('aria-label')})()" 2>&1 | grep -A1 Result | tail -1
playwright-cli eval "[...document.querySelectorAll('button[aria-haspopup=menu]')].find(e=>e.offsetParent).click(); 'ok'" >/dev/null 2>&1; sleep 1
playwright-cli eval "[...document.querySelectorAll('[role=menu] [role=menuitem]')].map(a=>a.textContent.trim()).join(' | ')" 2>&1 | grep -A1 Result | tail -1
```

Expected: `"1 visible; label=Dev Admin"`, then a row list that starts with `Forum | Kalender | News | Markt | Kiez | Blog`, continues with `Mein Profil →` … `Die Beilage ❡`, ends with `Abmelden ⏻`, and contains NO `Admin-Bereich`. Take a screenshot for the record:

```bash
playwright-cli screenshot --filename=/tmp/claude-1000/-home-atakee-projects-fullstack-community-webApp-astro---v-3/0df14674-9a99-489a-8c32-9f1f2c2bf51a/scratchpad/adm-avatar-desk.png >/dev/null 2>&1
```

Switch to EN via the toggle and confirm the kicker: `playwright-cli eval "document.querySelector('.am-kicker')?.textContent"` → `"Areas"` (reopen the menu first if the toggle closed it). Press Escape (`playwright-cli press Escape`) and confirm the menu is gone: `playwright-cli eval "!!document.querySelector('[role=menu]')"` → `false`.

- [ ] **Step 8: Browser check — mobile**

```bash
playwright-cli resize 390 844 >/dev/null 2>&1; sleep 1
playwright-cli eval "(()=>{const b=[...document.querySelectorAll('button[aria-haspopup=menu]')].filter(e=>e.offsetParent);return b.length+' visible, '+b[0]?.offsetWidth+'px'})()" 2>&1 | grep -A1 Result | tail -1
playwright-cli eval "[...document.querySelectorAll('button[aria-haspopup=menu]')].find(e=>e.offsetParent).click(); 'ok'" >/dev/null 2>&1; sleep 1
playwright-cli eval "(()=>{const m=document.querySelector('.am-menu');const r=m.getBoundingClientRect();return 'sheet bottom='+Math.round(r.bottom)+' of '+innerHeight+', rows='+m.querySelectorAll('[role=menuitem]').length})()" 2>&1 | grep -A1 Result | tail -1
playwright-cli screenshot --filename=/tmp/claude-1000/-home-atakee-projects-fullstack-community-webApp-astro---v-3/0df14674-9a99-489a-8c32-9f1f2c2bf51a/scratchpad/adm-avatar-mob.png >/dev/null 2>&1
```

Expected: `"1 visible, 32px"` (the desktop disc is hidden, only the mobile one renders), then `sheet bottom=844 of 844, rows=12` (6 areas + 5 account rows + Abmelden). Read both screenshots and confirm nothing overlaps the section rail. Repeat the trigger check on `/admin/announcements` and `/admin/mitglieder` (just the first eval on each, expecting `1 visible`). Then `playwright-cli close`.

- [ ] **Step 9: Update the area doc**

In `src/components/admin/CLAUDE.md`, replace the sentence in the `**Layout**:` paragraph

```
desktop masthead (INTERNER BEREICH ribbon + wordmark + back-link + `AuthLangToggle` + avatar initial) and a separate slimmer mobile masthead. No `KioskNav` — this isn't part of the public app nav. Session-independent by design; only consumes `adminName` for the avatar.
```

with

```
desktop masthead (INTERNER BEREICH ribbon + wordmark + back-link + `AuthLangToggle` + avatar menu) and a separate slimmer mobile masthead (toggle + avatar menu). No `KioskNav` — this isn't part of the public app nav. The layout never resolves the session itself: pages pass `user` (`session.user` — name/image/role) and `AdmAvatar.svelte` (`src/components/admin/kiosk/`) renders the plum disc + the shared `AvatarMenu` with `context="admin"`, which adds a „Bereiche" group (Forum · Kalender · News · Markt · Kiez · Blog, keys `nav.*`, kicker `nav.menu.areas`) and hides the „Admin-Bereich" row (2026-09-09). Dropdown ≥1024px / bottom sheet below is `AvatarMenu`'s own CSS; the masthead switches at `md`, so 768–1023px pairs the desktop masthead with a bottom sheet (same as KioskNav, accepted).
```

- [ ] **Step 10: Commit**

```bash
git add src/components/admin/kiosk/AdmAvatar.svelte src/layouts/AdminLayout.astro src/pages/admin/moderation.astro src/pages/admin/announcements.astro src/pages/admin/mitglieder.astro src/components/admin/CLAUDE.md
git commit -m "feat(admin): avatar menu in the admin masthead with Bereiche group"
```

Do not push. Report both commit hashes, the gate numbers, and the two screenshot paths to the user; pushing and the prod deploy check (`gh api repos/<o>/<r>/commits/<sha>/status`, then `curl -sI https://mahalle.digital/api/kiez-stats | grep x-vercel-id` → `fra1::fra1`) happen on their go.

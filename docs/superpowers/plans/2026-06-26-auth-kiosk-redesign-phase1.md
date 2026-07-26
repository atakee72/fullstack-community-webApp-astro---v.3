# Auth Kiosk Redesign — Phase 1 (login + register reskin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin `/login` and `/register` into the Editorial Kiosk design system (ochre accent, paper grain, riso cards) as Svelte islands on a dedicated `AuthLayout`, reusing the existing credentials backend untouched.

**Architecture:** A new `AuthLayout.astro` (sibling to `KioskLayout`) provides the paper-grain body, a slim auth masthead, and `data-page="auth"` — but NOT the full app `KioskNav` (wrong for a logged-out front door). Login/register bodies become Svelte 5 islands under `src/components/auth/kiosk/`, built from reusable auth primitives, wired to the existing `signIn('credentials')` flow and `POST /api/auth/register`. DE/EN comes from the existing `kiosk-i18n` `locale` store. No backend changes.

**Tech Stack:** Astro 5, Svelte 5 (runes: `$props`/`$state`/`$derived`), Tailwind 3.4, kiosk CSS-var token system (`--k-*`), Zod (existing `auth.schema.ts`), auth-astro/NextAuth credentials.

## Global Constraints

- **Phase 1 is login + register ONLY.** Out of scope (later phases): splash, `KiezHeartbeat`, email-verify, forgot-password backend, rate-limit (state 05), unverified-banner (state 04). The "Passwort vergessen?" link points to `/forgot-password` (a Phase-2 route) and may 404 until then — keep the link.
- **No backend changes.** Reuse `signIn('credentials', {redirect:false})` and `POST /api/auth/register` exactly as they work today. Do not modify `auth.config.ts` or `register.ts`.
- **Auth accent = OCHRE.** `--k-ochre` (`#e8a53a`) already exists in `tokens.css`. Wire via `[data-page="auth"] { --k-accent: var(--k-ochre); }` — mirror the existing forum/calendar/newsboard pattern. Do NOT import the handoff's `tokens-auth.css` verbatim (it uses obsolete `--ink`/`--carved-accent` naming).
- **Anti-enumeration (non-negotiable).** Login shows ONE generic error for both wrong-password and email-not-found. The current code already does this (`'Invalid email or password'`) — preserve it. Never distinguish the two externally.
- **Curly quotes in German strings.** Opener `„` (U+201E), closer `"` (U+201C). Never straight ASCII `"` inside JSX/Svelte string literals — it breaks parsing and is wrong typography.
- **DE + EN parity.** Every visible string has both, via `kiosk-i18n`. No Turkish.
- **Kiez-verification stays OUT of auth.** Register collects display name · email · password only, plus the footnote that the „Verifiziert im Kiez" badge is granted later by the team.
- **No legal name.** Register's name field is a display name ("wie sollen Nachbarn dich nennen?").
- **Token/var convention:** use `var(--k-paper)`, `var(--k-paper-warm)`, `var(--k-paper-soft)`, `var(--k-ink)`, `var(--k-ink-soft)`, `var(--k-ink-mute)`, `var(--k-rule)`, `var(--k-ochre)`, `var(--k-danger)`, `var(--k-warn)`, `var(--k-success)`, `var(--k-moss)`, `var(--k-accent)`. Font utility classes: `font-bricolage` (display), `font-dmmono` (mono), `font-instrument` (serif/italic accent) — already global.
- **Testing reality:** the repo has NO unit-test runner. Each task's verification is `pnpm type-check` (baseline: only pre-existing errors in `kiosk-i18n.ts` + `node_modules`/`LoginForm.nextauth`/`Navbar`/`sync-stats` — the gate is "no NEW errors in files this task touches"), `pnpm build`, and playwright-cli against the user's dev server on :3000. The dev server must be running; if `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login` returns `000`, ask the user to start it (do not auto-spawn).

---

## File structure

**Create:**
- `src/layouts/AuthLayout.astro` — paper-grain shell + slim masthead + `data-page="auth"`, no app nav.
- `src/components/auth/kiosk/AuthLangToggle.svelte` — DE/EN pills → `setLocale`.
- `src/components/auth/kiosk/primitives/AuthField.svelte` — labeled input with error/hint/show-toggle/success.
- `src/components/auth/kiosk/primitives/AuthPrimaryBtn.svelte` — ink fill + ochre print-shadow + spinner.
- `src/components/auth/kiosk/primitives/AuthBanner.svelte` — warn/danger/success/info banner.
- `src/components/auth/kiosk/primitives/AuthStrength.svelte` — 4-segment password meter (register only).
- `src/components/auth/kiosk/AuthLoginInner.svelte` — login orchestrator (fields + Zod + signIn).
- `src/components/auth/kiosk/AuthRegisterInner.svelte` — register orchestrator (fields + Zod + register API + auto-login).
- `src/components/auth/kiosk/CLAUDE.md` — subtree notes.

**Modify:**
- `src/styles/tokens.css` — add `[data-page="auth"] { --k-accent: var(--k-ochre); }`.
- `src/layouts/KioskLayout.astro` — add `'auth'` to the `page` Props union (shared type hygiene).
- `src/lib/kiosk-i18n.ts` — add `auth.*` DE/EN keys.
- `src/pages/login.astro` — use `AuthLayout` + mount `AuthLoginInner`.
- `src/pages/register.astro` — use `AuthLayout` + mount `AuthRegisterInner`.
- Root `CLAUDE.md` — add auth-kiosk pointer.

**Delete (final task, once unused):**
- `src/components/LoginForm.nextauth.tsx`
- `src/components/RegisterForm.nextauth.tsx`

---

### Task 1: Auth i18n keys (DE + EN)

**Files:**
- Modify: `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Produces: i18n keys consumed by every later auth island via the `$t` store: `auth.masthead.tagline`, and the `auth.login.*`, `auth.register.*`, `auth.field.*`, `auth.err.*` namespaces listed below.

The store is a dictionary keyed by string. Find the `de` object and the `en` object (the file defines two parallel dicts). Add the keys below to BOTH, keeping DE first then EN, matching the file's existing formatting (each entry `'key': 'value',`).

- [ ] **Step 1: Add the DE keys**

In the `de` dictionary, add:

```ts
  // ── Auth (Phase 1: login + register) ──
  'auth.masthead.region': 'SCHILLERKIEZ · NEUKÖLLN · BERLIN',
  'auth.login.eyebrow': 'ANMELDEN',
  'auth.login.title.a': 'Willkommen ',
  'auth.login.title.accent': 'zurück',
  'auth.login.title.b': ' im Kiez.',
  'auth.login.email': 'E-Mail',
  'auth.login.emailPh': 'du@beispiel.de',
  'auth.login.pw': 'Passwort',
  'auth.login.pwPh': 'dein Passwort',
  'auth.login.forgot': 'Passwort vergessen?',
  'auth.login.cta': 'anmelden',
  'auth.login.ctaLoading': 'anmelden …',
  'auth.login.ctaDone': 'angemeldet ✓',
  'auth.login.or': 'oder',
  'auth.login.alt': 'Neu im Kiez? ',
  'auth.login.altLink': 'Registrieren',
  'auth.login.successTitle': 'Willkommen zurück',
  'auth.login.successBody': 'Du wirst weitergeleitet …',
  'auth.register.eyebrow': 'REGISTRIEREN',
  'auth.register.title.a': 'Werde Teil vom ',
  'auth.register.title.accent': 'Kiez',
  'auth.register.title.b': '.',
  'auth.register.name': 'Anzeigename',
  'auth.register.namePh': 'wie sollen Nachbarn dich nennen?',
  'auth.register.email': 'E-Mail',
  'auth.register.emailPh': 'du@beispiel.de',
  'auth.register.pw': 'Passwort',
  'auth.register.pwPh': 'mind. 8 Zeichen',
  'auth.register.pw2': 'Passwort wiederholen',
  'auth.register.cta': 'Konto erstellen',
  'auth.register.ctaLoading': 'Konto wird erstellt …',
  'auth.register.terms.a': 'Ich akzeptiere die ',
  'auth.register.terms.termsLink': 'Nutzungsbedingungen',
  'auth.register.terms.mid': ' und ',
  'auth.register.terms.privacyLink': 'Datenschutz',
  'auth.register.note': 'Kein Klarname nötig. Dein „Verifiziert im Kiez"-Abzeichen vergibt das Team später separat.',
  'auth.register.alt': 'Schon dabei? ',
  'auth.register.altLink': 'Anmelden',
  'auth.register.successTitle': 'Konto erstellt — willkommen im Kiez',
  'auth.register.successBody': 'Du wirst weitergeleitet …',
  'auth.field.show': 'zeigen',
  'auth.field.hide': 'verbergen',
  'auth.strength.0': 'zu kurz',
  'auth.strength.1': 'schwach',
  'auth.strength.2': 'ok',
  'auth.strength.3': 'gut',
  'auth.strength.4': 'stark',
  'auth.err.credentials': 'E-Mail oder Passwort stimmt nicht.',
  'auth.err.emailInvalid': 'Bitte gib eine gültige E-Mail an.',
  'auth.err.pwShort': 'Mindestens 8 Zeichen.',
  'auth.err.pwWeak': 'Zu schwach — füge Zahlen & Groß-/Kleinbuchstaben hinzu.',
  'auth.err.nameShort': 'Bitte gib einen Anzeigenamen an.',
  'auth.err.mismatch': 'Passwörter stimmen nicht überein.',
  'auth.err.termsUnchecked': 'Bitte akzeptiere die Bedingungen.',
  'auth.err.emailTakenTitle': 'E-Mail bereits registriert',
  'auth.err.emailTakenBody': 'Es gibt schon ein Konto mit dieser Adresse.',
  'auth.err.emailTakenAction': 'Stattdessen anmelden',
  'auth.err.generic': 'Etwas ist schiefgelaufen. Bitte versuch es erneut.',
```

- [ ] **Step 2: Add the EN keys**

In the `en` dictionary, add:

```ts
  // ── Auth (Phase 1: login + register) ──
  'auth.masthead.region': 'SCHILLERKIEZ · NEUKÖLLN · BERLIN',
  'auth.login.eyebrow': 'SIGN IN',
  'auth.login.title.a': 'Welcome ',
  'auth.login.title.accent': 'back',
  'auth.login.title.b': ' to the Kiez.',
  'auth.login.email': 'Email',
  'auth.login.emailPh': 'you@example.com',
  'auth.login.pw': 'Password',
  'auth.login.pwPh': 'your password',
  'auth.login.forgot': 'Forgot password?',
  'auth.login.cta': 'sign in',
  'auth.login.ctaLoading': 'signing in …',
  'auth.login.ctaDone': 'signed in ✓',
  'auth.login.or': 'or',
  'auth.login.alt': 'New to the Kiez? ',
  'auth.login.altLink': 'Register',
  'auth.login.successTitle': 'Welcome back',
  'auth.login.successBody': 'Redirecting you …',
  'auth.register.eyebrow': 'REGISTER',
  'auth.register.title.a': 'Become part of the ',
  'auth.register.title.accent': 'Kiez',
  'auth.register.title.b': '.',
  'auth.register.name': 'Display name',
  'auth.register.namePh': 'what should neighbors call you?',
  'auth.register.email': 'Email',
  'auth.register.emailPh': 'you@example.com',
  'auth.register.pw': 'Password',
  'auth.register.pwPh': 'min. 8 characters',
  'auth.register.pw2': 'Repeat password',
  'auth.register.cta': 'Create account',
  'auth.register.ctaLoading': 'creating account …',
  'auth.register.terms.a': 'I accept the ',
  'auth.register.terms.termsLink': 'Terms of Use',
  'auth.register.terms.mid': ' and ',
  'auth.register.terms.privacyLink': 'Privacy Policy',
  'auth.register.note': 'No legal name required. Your „Verified in the Kiez" badge is granted separately by the team later.',
  'auth.register.alt': 'Already here? ',
  'auth.register.altLink': 'Sign in',
  'auth.register.successTitle': 'Account created — welcome to the Kiez',
  'auth.register.successBody': 'Redirecting you …',
  'auth.field.show': 'show',
  'auth.field.hide': 'hide',
  'auth.strength.0': 'too short',
  'auth.strength.1': 'weak',
  'auth.strength.2': 'ok',
  'auth.strength.3': 'good',
  'auth.strength.4': 'strong',
  'auth.err.credentials': 'Email or password is incorrect.',
  'auth.err.emailInvalid': 'Please enter a valid email.',
  'auth.err.pwShort': 'At least 8 characters.',
  'auth.err.pwWeak': 'Too weak — add numbers & upper/lowercase.',
  'auth.err.nameShort': 'Please enter a display name.',
  'auth.err.mismatch': "Passwords don't match.",
  'auth.err.termsUnchecked': 'Please accept the terms.',
  'auth.err.emailTakenTitle': 'Email already registered',
  'auth.err.emailTakenBody': 'An account with this address already exists.',
  'auth.err.emailTakenAction': 'Sign in instead',
  'auth.err.generic': 'Something went wrong. Please try again.',
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "kiosk-i18n.ts" | grep -v "Dict = typeof de" | head`
Expected: no output beyond the known benign `Dict = typeof de` TS2322 lines (every DE≠EN pair emits one — that's the established baseline, not a new error).

- [ ] **Step 4: Verify DE/EN key parity**

Run: `node -e "const f=require('fs').readFileSync('src/lib/kiosk-i18n.ts','utf8'); const de=(f.match(/'auth\.[^']+':/g)||[]); console.log('auth keys total occurrences:', de.length)"`
Expected: an even number (each key appears once in `de` and once in `en`) — sanity that both blocks were added.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kiosk-i18n.ts
git commit -m "feat(auth): add login + register i18n keys (de+en)"
```

---

### Task 2: Auth page accent token + page union

**Files:**
- Modify: `src/styles/tokens.css` (the `[data-page=...]` accent block, ~line 101-105)
- Modify: `src/layouts/KioskLayout.astro:25` (Props `page` union)

**Interfaces:**
- Produces: `[data-page="auth"]` resolves `--k-accent` to ochre; the `page` prop type accepts `'auth'`.

- [ ] **Step 1: Add the auth accent line**

In `src/styles/tokens.css`, find the per-page accent block:

```css
[data-page="forum"]        { --k-accent: var(--k-wine); }
[data-page="newsboard"]    { --k-accent: var(--k-ink); }
[data-page="calendar"]     { --k-accent: var(--k-teal); }
[data-page="schillerkiez"] { --k-accent: var(--k-moss); }
```

Add immediately after the `schillerkiez` line:

```css
[data-page="auth"]         { --k-accent: var(--k-ochre); }
```

- [ ] **Step 2: Extend the `page` union in KioskLayout**

In `src/layouts/KioskLayout.astro`, change:

```ts
  page?: 'forum' | 'calendar' | 'marketplace' | 'newsboard' | 'profile' | 'blog' | 'admin' | 'schillerkiez';
```

to:

```ts
  page?: 'forum' | 'calendar' | 'marketplace' | 'newsboard' | 'profile' | 'blog' | 'admin' | 'schillerkiez' | 'auth';
```

- [ ] **Step 3: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -E "tokens.css|KioskLayout" | head` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes (`Complete!` / no error).

- [ ] **Step 4: Commit**

```bash
git add src/styles/tokens.css src/layouts/KioskLayout.astro
git commit -m "feat(auth): wire ochre page accent + auth page type"
```

---

### Task 3: Auth primitives (field, button, banner, strength)

**Files:**
- Create: `src/components/auth/kiosk/primitives/AuthField.svelte`
- Create: `src/components/auth/kiosk/primitives/AuthPrimaryBtn.svelte`
- Create: `src/components/auth/kiosk/primitives/AuthBanner.svelte`
- Create: `src/components/auth/kiosk/primitives/AuthStrength.svelte`

**Interfaces:**
- Produces (consumed by Tasks 6 & 7):
  - `AuthField` props: `{ label: string; value: string; placeholder?: string; type?: 'text'|'email'|'password'; name?: string; autocomplete?: string; error?: string|null; success?: boolean; hint?: string; showToggle?: boolean; disabled?: boolean; oninput?: (v: string) => void }`. Emits the new value via `oninput(value)`.
  - `AuthPrimaryBtn` props: `{ loading?: boolean; disabled?: boolean; type?: 'submit'|'button'; onclick?: () => void; children }` (default slot = label).
  - `AuthBanner` props: `{ kind: 'warn'|'danger'|'success'|'info'; title: string; body?: string; action?: string; onaction?: () => void }`.
  - `AuthStrength` props: `{ score: 0|1|2|3|4 }`.

- [ ] **Step 1: Write `AuthField.svelte`**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';

  let {
    label,
    value = '',
    placeholder = '',
    type = 'text',
    name = '',
    autocomplete = '',
    error = null,
    success = false,
    hint = '',
    showToggle = false,
    disabled = false,
    oninput = (_v: string) => {},
  }: {
    label: string; value?: string; placeholder?: string;
    type?: 'text' | 'email' | 'password'; name?: string; autocomplete?: string;
    error?: string | null; success?: boolean; hint?: string;
    showToggle?: boolean; disabled?: boolean; oninput?: (v: string) => void;
  } = $props();

  let revealed = $state(false);
  const inputType = $derived(type === 'password' && revealed ? 'text' : type);
  const borderColor = $derived(
    error ? 'var(--k-danger)' : success ? 'var(--k-success)' : 'var(--k-rule)'
  );
</script>

<label style="display:block; opacity:{disabled ? 0.55 : 1};">
  <div class="flex items-baseline justify-between" style="margin-bottom:5px;">
    <span class="font-dmmono uppercase" style="font-size:10.5px; letter-spacing:0.1em; color:var(--k-ink-soft);">{label}</span>
    {#if hint}
      <span class="font-dmmono" style="font-size:9.5px; color:{error ? 'var(--k-danger)' : 'var(--k-ink-mute)'};">{hint}</span>
    {/if}
  </div>
  <div class="flex items-center" style="gap:8px; background:var(--k-paper-soft); border:1.5px solid {borderColor}; border-radius:12px; padding:11px 13px;">
    <input
      class="font-bricolage"
      style="flex:1; min-width:0; background:transparent; border:none; outline:none; font-size:14.5px; color:var(--k-ink);"
      type={inputType}
      {name}
      {placeholder}
      {value}
      {disabled}
      autocomplete={autocomplete || undefined}
      oninput={(e) => oninput((e.currentTarget as HTMLInputElement).value)}
    />
    {#if showToggle}
      <button type="button" class="font-dmmono" style="font-size:10px; color:var(--k-ink-mute); letter-spacing:0.05em; background:none; border:none; border-bottom:1px dashed var(--k-ink-mute); cursor:pointer; padding:0;"
        onclick={() => (revealed = !revealed)}>
        {revealed ? $t['auth.field.hide'] : $t['auth.field.show']}
      </button>
    {/if}
    {#if success && !error}
      <span style="color:var(--k-success); font-size:13px;">✓</span>
    {/if}
  </div>
  {#if error}
    <div class="flex items-center font-dmmono" style="gap:5px; margin-top:5px; font-size:10.5px; color:var(--k-danger);">
      <span>✕</span>{error}
    </div>
  {/if}
</label>
```

- [ ] **Step 2: Write `AuthPrimaryBtn.svelte`**

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    loading = false,
    disabled = false,
    type = 'submit',
    onclick = () => {},
    children,
  }: {
    loading?: boolean; disabled?: boolean; type?: 'submit' | 'button';
    onclick?: () => void; children?: Snippet;
  } = $props();
</script>

<button
  {type}
  disabled={disabled || loading}
  {onclick}
  class="auth-primary-btn font-bricolage"
  style="width:100%; display:flex; align-items:center; justify-content:center; gap:9px;
         background:{disabled ? 'var(--k-ink-mute)' : 'var(--k-ink)'}; color:var(--k-paper);
         font-size:15px; font-weight:700; padding:13px 18px; border-radius:999px;
         border:1.5px solid var(--k-ink);
         box-shadow:{disabled ? 'none' : '3px 3px 0 var(--k-accent)'};
         cursor:{disabled || loading ? 'not-allowed' : 'pointer'};"
>
  {#if loading}
    <span class="auth-spin" style="width:13px; height:13px; border-radius:50%; border:2px solid var(--k-paper); border-top-color:transparent; display:inline-block;"></span>
  {/if}
  {@render children?.()}
</button>

<style>
  @keyframes authSpin { to { transform: rotate(360deg); } }
  .auth-spin { animation: authSpin 0.7s linear infinite; }
  @media (prefers-reduced-motion: reduce) { .auth-spin { animation: none; } }
</style>
```

- [ ] **Step 3: Write `AuthBanner.svelte`**

```svelte
<script lang="ts">
  let {
    kind = 'warn',
    title,
    body = '',
    action = '',
    onaction = () => {},
  }: {
    kind?: 'warn' | 'danger' | 'success' | 'info';
    title: string; body?: string; action?: string; onaction?: () => void;
  } = $props();

  const map = {
    warn:    { bg: '#fbf1d8', bd: 'var(--k-warn)',    ic: '◐' },
    danger:  { bg: '#f7e2e2', bd: 'var(--k-danger)',  ic: '✕' },
    success: { bg: '#e7f0dd', bd: 'var(--k-success)', ic: '✓' },
    info:    { bg: '#dbeaee', bd: 'var(--k-info)',    ic: 'i' },
  } as const;
  const m = $derived(map[kind]);
</script>

<div class="flex" style="gap:11px; margin-top:18px; padding:12px 14px; background:{m.bg}; border:1.5px solid {m.bd}; border-radius:12px;">
  <span style="width:20px; height:20px; flex-shrink:0; border-radius:50%; background:{m.bd}; color:var(--k-paper); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; margin-top:1px;">{m.ic}</span>
  <div>
    <div class="font-bricolage" style="font-weight:700; font-size:13.5px; color:var(--k-ink);">{title}</div>
    {#if body}
      <div class="font-bricolage" style="font-size:12.5px; color:var(--k-ink-soft); line-height:1.45; margin-top:2px;">{body}</div>
    {/if}
    {#if action}
      <div style="margin-top:7px;">
        <button type="button" class="font-dmmono" style="font-size:11px; color:var(--k-ink); font-weight:600; background:none; border:none; border-bottom:2px solid {m.bd}; cursor:pointer; padding:0;" onclick={onaction}>{action} →</button>
      </div>
    {/if}
  </div>
</div>
```

- [ ] **Step 4: Write `AuthStrength.svelte`**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';

  let { score = 0 }: { score?: 0 | 1 | 2 | 3 | 4 } = $props();

  // segment color ramp by score (maps to existing kiosk state colors)
  const colors = ['var(--k-danger)', 'var(--k-danger)', 'var(--k-warn)', 'var(--k-moss)', 'var(--k-success)'];
  const fill = $derived(colors[score]);
  const label = $derived($t[`auth.strength.${score}` as keyof typeof $t]);
</script>

<div class="flex items-center" style="gap:8px; margin-top:7px;">
  <div class="flex" style="gap:4px; flex:1;">
    {#each [0, 1, 2, 3] as i}
      <div style="flex:1; height:5px; border-radius:3px; background:{i < score ? fill : 'var(--k-rule)'}; border:1px solid {i < score ? 'var(--k-ink)' : 'transparent'}; transition:background 220ms;"></div>
    {/each}
  </div>
  <span class="font-dmmono" style="font-size:9.5px; color:{fill}; letter-spacing:0.06em; width:48px; text-align:right;">{label}</span>
</div>
```

- [ ] **Step 5: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -E "auth/kiosk/primitives" | head` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/kiosk/primitives/
git commit -m "feat(auth): kiosk auth primitives (field, button, banner, strength)"
```

---

### Task 4: AuthLangToggle island

**Files:**
- Create: `src/components/auth/kiosk/AuthLangToggle.svelte`

**Interfaces:**
- Consumes: `locale` store + `setLocale(l)` from `src/lib/kiosk-i18n.ts`.
- Produces: a DE/EN pill toggle (used by `AuthLayout` masthead). No props.

- [ ] **Step 1: Write `AuthLangToggle.svelte`**

```svelte
<script lang="ts">
  import { locale, setLocale } from '../../../lib/kiosk-i18n';
</script>

<div class="flex font-dmmono" style="border:1.5px solid var(--k-ink); border-radius:999px; overflow:hidden; font-size:11px; font-weight:600;">
  <button type="button" onclick={() => setLocale('de')}
    style="padding:5px 11px; background:{$locale === 'de' ? 'var(--k-ink)' : 'transparent'}; color:{$locale === 'de' ? 'var(--k-paper)' : 'var(--k-ink)'}; border:none; cursor:pointer;">DE</button>
  <button type="button" onclick={() => setLocale('en')}
    style="padding:5px 11px; background:{$locale === 'en' ? 'var(--k-ink)' : 'transparent'}; color:{$locale === 'en' ? 'var(--k-paper)' : 'var(--k-ink)'}; border:none; border-left:1.5px solid var(--k-ink); cursor:pointer;">EN</button>
</div>
```

- [ ] **Step 2: Type-check + build**

Run: `pnpm type-check 2>&1 | grep "AuthLangToggle" | head` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/kiosk/AuthLangToggle.svelte
git commit -m "feat(auth): DE/EN language toggle island"
```

---

### Task 5: AuthLayout

**Files:**
- Create: `src/layouts/AuthLayout.astro`

**Interfaces:**
- Consumes: `AuthLangToggle.svelte`, kiosk global CSS (`.k-paper-bg` grain), `ToastProvider`.
- Produces: a layout with `data-page="auth"`, a slim masthead (monogram + wordmark + region + `AuthLangToggle`), a centered `<slot />`, ViewTransitions, NO `KioskNav`/`KioskFooter`/bottom-nav. Props: `{ title: string; description?: string }`.

Rationale (note for reviewer): the handoff says "migrate auth onto KioskLayout," but KioskLayout hardcodes the full app `KioskNav` (Forum/Calendar/… links + user menu), which is wrong on a logged-out front door. This sibling layout gives the same paper grain + tokens + `data-page` while showing the design's minimal masthead. Mirrors the existing `BaseLayout`/`BlogBaseLayout` split.

- [ ] **Step 1: Write `AuthLayout.astro`**

```astro
---
// Editorial Kiosk layout for the logged-out front door (login · register).
// Sibling to KioskLayout, but WITHOUT the full app nav — a logged-out visitor
// shouldn't see Forum/Calendar/… links. Slim masthead + centered card on paper.
import AuthLangToggle from '../components/auth/kiosk/AuthLangToggle.svelte';
import { ViewTransitions } from 'astro:transitions';

export interface Props {
  title: string;
  description?: string;
}

const {
  title,
  description = 'Mahalle — a community web app for local neighborhoods.',
} = Astro.props;
---

<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content={description} />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <title>{title} | Mahalle</title>
    <ViewTransitions />
  </head>

  <body
    class="min-h-screen k-paper-bg text-ink font-bricolage antialiased flex flex-col"
    data-page="auth"
  >
    <!-- slim auth masthead: monogram + wordmark + region + DE/EN -->
    <header class="flex items-center justify-between" style="padding:18px 32px; border-bottom:1px dashed var(--k-rule);">
      <a href="/" class="flex items-center no-underline" style="gap:10px; color:var(--k-ink);">
        <span class="font-instrument" style="width:34px; height:34px; background:var(--k-ochre); border-radius:50%; border:2px solid var(--k-ink); transform:rotate(-4deg); display:flex; align-items:center; justify-content:center; font-style:italic; font-size:20px; color:var(--k-ink);">m</span>
        <span class="font-bricolage" style="font-size:20px; font-weight:800; letter-spacing:-0.03em;">mahalle</span>
      </a>
      <div class="flex items-center" style="gap:14px;">
        <span class="font-dmmono hidden sm:inline" style="font-size:10px; color:var(--k-ink-mute); letter-spacing:0.12em;">SCHILLERKIEZ · NEUKÖLLN · BERLIN</span>
        <AuthLangToggle client:load />
      </div>
    </header>

    <main class="flex-1 flex items-center justify-center" style="padding:28px 22px;">
      <div style="width:100%; max-width:460px;">
        <slot />
      </div>
    </main>
  </body>
</html>

<style is:global>
  @import '../styles/global.css';
</style>
```

- [ ] **Step 2: Build**

Run: `pnpm build 2>&1 | tail -2` → Expected: build completes (the layout has no consumers yet; this confirms it compiles).

- [ ] **Step 3: Commit**

```bash
git add src/layouts/AuthLayout.astro
git commit -m "feat(auth): AuthLayout (paper-grain shell + slim masthead)"
```

---

### Task 6: Login island + page

**Files:**
- Create: `src/components/auth/kiosk/AuthLoginInner.svelte`
- Modify: `src/pages/login.astro`

**Interfaces:**
- Consumes: `AuthField`, `AuthPrimaryBtn`, `AuthBanner` (Task 3); `t` store; `signIn` from `auth-astro/client`; `LoginSchema` from `src/schemas/auth.schema.ts`.
- Produces: `/login` rendered in kiosk, single-screen email+password, generic credentials error (anti-enumeration), success → redirect to `/`.

- [ ] **Step 1: Write `AuthLoginInner.svelte`**

```svelte
<script lang="ts">
  import { signIn } from 'auth-astro/client';
  import { t } from '../../../lib/kiosk-i18n';
  import { LoginSchema } from '../../../schemas/auth.schema';
  import AuthField from './primitives/AuthField.svelte';
  import AuthPrimaryBtn from './primitives/AuthPrimaryBtn.svelte';
  import AuthBanner from './primitives/AuthBanner.svelte';

  let email = $state('');
  let password = $state('');
  let emailErr = $state<string | null>(null);
  let pwErr = $state<string | null>(null);
  let credErr = $state(false);     // generic wrong email-or-password
  let status = $state<'idle' | 'loading' | 'success'>('idle');

  async function submit(e: Event) {
    e.preventDefault();
    emailErr = null; pwErr = null; credErr = false;

    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      if (fields.email) emailErr = $t['auth.err.emailInvalid'];
      if (fields.password) pwErr = $t['auth.err.pwShort'];
      return;
    }

    status = 'loading';
    try {
      const result = await signIn('credentials', {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      if (result?.error) {
        // Anti-enumeration: ONE generic message for wrong-pw AND email-not-found.
        credErr = true;
        status = 'idle';
        return;
      }
      status = 'success';
      window.location.href = '/';
    } catch {
      credErr = true;
      status = 'idle';
    }
  }
</script>

<div class="auth-card">
  <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-accent); font-weight:600;">{$t['auth.login.eyebrow']}</div>
  <h1 class="font-bricolage" style="font-weight:800; font-size:38px; letter-spacing:-0.035em; line-height:1; margin:8px 0 0; color:var(--k-ink);">
    {$t['auth.login.title.a']}<span class="font-instrument" style="font-style:italic; font-weight:400; color:var(--k-accent);">{$t['auth.login.title.accent']}</span>{$t['auth.login.title.b']}
  </h1>

  {#if credErr}
    <AuthBanner kind="danger" title={$t['auth.err.credentials']} />
  {/if}
  {#if status === 'success'}
    <AuthBanner kind="success" title={$t['auth.login.successTitle']} body={$t['auth.login.successBody']} />
  {/if}

  <form onsubmit={submit} style="display:flex; flex-direction:column; gap:16px; margin-top:22px;">
    <AuthField
      label={$t['auth.login.email']} placeholder={$t['auth.login.emailPh']}
      type="email" name="email" autocomplete="email"
      value={email} error={emailErr}
      oninput={(v) => (email = v)} />
    <div>
      <AuthField
        label={$t['auth.login.pw']} placeholder={$t['auth.login.pwPh']}
        type="password" name="password" autocomplete="current-password"
        value={password} error={pwErr} showToggle
        oninput={(v) => (password = v)} />
      <div style="text-align:right; margin-top:7px;">
        <a href="/forgot-password" class="font-dmmono no-underline" style="font-size:11px; color:var(--k-ink-soft); border-bottom:1px dashed var(--k-ink-mute);">{$t['auth.login.forgot']}</a>
      </div>
    </div>
    <AuthPrimaryBtn loading={status === 'loading'}>
      {status === 'loading' ? $t['auth.login.ctaLoading'] : status === 'success' ? $t['auth.login.ctaDone'] : $t['auth.login.cta']}
    </AuthPrimaryBtn>
  </form>

  <div class="flex items-center" style="gap:12px; margin:20px 0 16px;">
    <div style="flex:1; border-top:1px dashed var(--k-rule);"></div>
    <span class="font-dmmono uppercase" style="font-size:9.5px; color:var(--k-ink-mute); letter-spacing:0.16em;">{$t['auth.login.or']}</span>
    <div style="flex:1; border-top:1px dashed var(--k-rule);"></div>
  </div>
  <div class="font-bricolage" style="text-align:center; font-size:13.5px; color:var(--k-ink-soft);">
    {$t['auth.login.alt']}<a href="/register" class="no-underline" style="font-weight:700; color:var(--k-ink); border-bottom:2px solid var(--k-accent);">{$t['auth.login.altLink']}</a>
  </div>
</div>

<style>
  .auth-card {
    background: var(--k-paper-warm);
    border: 1.5px solid var(--k-ink);
    border-top: 4px solid var(--k-accent);
    border-radius: 22px;
    box-shadow: 3px 3px 0 var(--k-ink);
    padding: 30px;
  }
</style>
```

- [ ] **Step 2: Rewrite `src/pages/login.astro`**

```astro
---
import AuthLayout from '../layouts/AuthLayout.astro';
import AuthLoginInner from '../components/auth/kiosk/AuthLoginInner.svelte';
---

<AuthLayout title="Anmelden">
  <AuthLoginInner client:only="svelte" />
</AuthLayout>
```

- [ ] **Step 3: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -E "AuthLoginInner|login.astro" | head` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.

- [ ] **Step 4: Live-verify the login page (dev server on :3000)**

Precheck: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login` → if `000`, ask the user to start `pnpm dev`; do not auto-spawn.

```bash
playwright-cli open "http://localhost:3000/login"
playwright-cli run-code "page.waitForSelector('input[name=email]', { timeout: 10000 })"
playwright-cli console
```
Expected: console shows `Total messages: N (Errors: 0, Warnings: 0)` — clean hydration. The snapshot shows the ochre monogram masthead, "ANMELDEN" eyebrow, headline with italic accent, email + password fields, ochre-shadowed "anmelden" button, and the "Registrieren" alt link. NO Forum/Calendar nav links present.

- [ ] **Step 5: Verify anti-enumeration generic error (bad credentials)**

```bash
playwright-cli fill "input[name=email]" "nobody-xyz@example.com"
playwright-cli fill "input[name=password]" "Wrongpass123"
playwright-cli click "button[type=submit]"
playwright-cli run-code "page.waitForTimeout(1500)"
playwright-cli snapshot
```
Expected: a single generic danger banner ("E-Mail oder Passwort stimmt nicht." / "Email or password is incorrect.") — NOT a message distinguishing wrong-password from unknown-email. Still on `/login`.

- [ ] **Step 6: Close playwright + commit**

```bash
playwright-cli close
git add src/components/auth/kiosk/AuthLoginInner.svelte src/pages/login.astro
git commit -m "feat(auth): kiosk login page (Svelte island on AuthLayout)"
```

---

### Task 7: Register island + page

**Files:**
- Create: `src/components/auth/kiosk/AuthRegisterInner.svelte`
- Modify: `src/pages/register.astro`

**Interfaces:**
- Consumes: `AuthField`, `AuthPrimaryBtn`, `AuthBanner`, `AuthStrength` (Task 3); `t` store; `signIn` from `auth-astro/client`; `POST /api/auth/register` (`{name, email, password}` → 201 `{success, userId}` / 409 `{error}` / 400 `{error}`); local password scorer.
- Produces: `/register` in kiosk, client validation (weak pw meter, mismatch, terms), email-taken banner, success → auto-login → redirect to `/`.

- [ ] **Step 1: Write `AuthRegisterInner.svelte`**

```svelte
<script lang="ts">
  import { signIn } from 'auth-astro/client';
  import { t } from '../../../lib/kiosk-i18n';
  import AuthField from './primitives/AuthField.svelte';
  import AuthPrimaryBtn from './primitives/AuthPrimaryBtn.svelte';
  import AuthBanner from './primitives/AuthBanner.svelte';
  import AuthStrength from './primitives/AuthStrength.svelte';

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let password2 = $state('');
  let terms = $state(false);

  let nameErr = $state<string | null>(null);
  let emailErr = $state<string | null>(null);
  let pwErr = $state<string | null>(null);
  let pw2Err = $state<string | null>(null);
  let termsErr = $state(false);
  let emailTaken = $state(false);
  let status = $state<'idle' | 'loading' | 'success'>('idle');

  // Local password strength: length + character classes → 0..4.
  function scorePw(pw: string): 0 | 1 | 2 | 3 | 4 {
    if (pw.length < 8) return pw.length === 0 ? 0 : 1;
    let classes = 0;
    if (/[a-z]/.test(pw)) classes++;
    if (/[A-Z]/.test(pw)) classes++;
    if (/\d/.test(pw)) classes++;
    if (/[^A-Za-z0-9]/.test(pw)) classes++;
    if (classes <= 1) return 1;
    if (classes === 2) return 2;
    if (classes === 3) return 3;
    return 4;
  }
  const pwScore = $derived(scorePw(password));
  // "valid enough" = min 8 + at least lower, upper, digit (mirrors RegisterSchema).
  const pwOk = $derived(password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password));
  const emailOk = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  async function submit(e: Event) {
    e.preventDefault();
    nameErr = null; emailErr = null; pwErr = null; pw2Err = null; termsErr = false; emailTaken = false;

    let bad = false;
    if (name.trim().length < 2) { nameErr = $t['auth.err.nameShort']; bad = true; }
    if (!emailOk) { emailErr = $t['auth.err.emailInvalid']; bad = true; }
    if (!pwOk) { pwErr = $t['auth.err.pwWeak']; bad = true; }
    if (password2 !== password || !password2) { pw2Err = $t['auth.err.mismatch']; bad = true; }
    if (!terms) { termsErr = true; bad = true; }
    if (bad) return;

    status = 'loading';
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) { emailTaken = true; status = 'idle'; return; }
        // 400 (e.g. profanity) or 500 → inline on the relevant field / generic
        nameErr = data?.error || $t['auth.err.generic'];
        status = 'idle';
        return;
      }
      // Auto-login after successful registration (mirrors prior behavior).
      const result = await signIn('credentials', { email: email.trim(), password, redirect: false });
      if (result?.error) { window.location.href = '/login'; return; }
      status = 'success';
      window.location.href = '/';
    } catch {
      nameErr = $t['auth.err.generic'];
      status = 'idle';
    }
  }
</script>

<div class="auth-card">
  <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-accent); font-weight:600;">{$t['auth.register.eyebrow']}</div>
  <h1 class="font-bricolage" style="font-weight:800; font-size:38px; letter-spacing:-0.035em; line-height:1; margin:8px 0 0; color:var(--k-ink);">
    {$t['auth.register.title.a']}<span class="font-instrument" style="font-style:italic; font-weight:400; color:var(--k-accent);">{$t['auth.register.title.accent']}</span>{$t['auth.register.title.b']}
  </h1>

  {#if emailTaken}
    <AuthBanner kind="danger" title={$t['auth.err.emailTakenTitle']} body={$t['auth.err.emailTakenBody']}
      action={$t['auth.err.emailTakenAction']} onaction={() => (window.location.href = '/login')} />
  {/if}
  {#if status === 'success'}
    <AuthBanner kind="success" title={$t['auth.register.successTitle']} body={$t['auth.register.successBody']} />
  {/if}

  <form onsubmit={submit} style="display:flex; flex-direction:column; gap:14px; margin-top:20px;">
    <AuthField label={$t['auth.register.name']} placeholder={$t['auth.register.namePh']}
      name="name" autocomplete="nickname" value={name} error={nameErr}
      success={name.trim().length >= 2} oninput={(v) => (name = v)} />
    <AuthField label={$t['auth.register.email']} placeholder={$t['auth.register.emailPh']}
      type="email" name="email" autocomplete="email" value={email}
      error={emailErr} success={emailOk && !emailTaken} oninput={(v) => (email = v)} />
    <div>
      <AuthField label={$t['auth.register.pw']} placeholder={$t['auth.register.pwPh']}
        type="password" name="password" autocomplete="new-password" value={password}
        error={pwErr} showToggle oninput={(v) => (password = v)} />
      {#if password}<AuthStrength score={pwScore} />{/if}
    </div>
    <AuthField label={$t['auth.register.pw2']} placeholder={$t['auth.register.pwPh']}
      type="password" name="password2" autocomplete="new-password" value={password2}
      error={pw2Err} success={!!password2 && password2 === password} oninput={(v) => (password2 = v)} />

    <label class="flex" style="gap:9px; align-items:flex-start; cursor:pointer; margin-top:2px;">
      <input type="checkbox" bind:checked={terms}
        style="width:18px; height:18px; flex-shrink:0; margin-top:1px; accent-color:var(--k-ink); cursor:pointer;" />
      <span class="font-bricolage" style="font-size:12.5px; line-height:1.45; color:{termsErr ? 'var(--k-danger)' : 'var(--k-ink-soft)'};">
        {$t['auth.register.terms.a']}<a href="/terms" class="no-underline" style="color:var(--k-ink); font-weight:600; border-bottom:1px solid var(--k-ink);">{$t['auth.register.terms.termsLink']}</a>{$t['auth.register.terms.mid']}<a href="/privacy" class="no-underline" style="color:var(--k-ink); font-weight:600; border-bottom:1px solid var(--k-ink);">{$t['auth.register.terms.privacyLink']}</a>.
      </span>
    </label>

    <AuthPrimaryBtn loading={status === 'loading'}>
      {status === 'loading' ? $t['auth.register.ctaLoading'] : $t['auth.register.cta']}
    </AuthPrimaryBtn>
  </form>

  <div class="font-dmmono" style="font-size:10px; color:var(--k-ink-mute); line-height:1.5; margin-top:14px; padding-top:12px; border-top:1px dashed var(--k-rule);">{$t['auth.register.note']}</div>
  <div class="font-bricolage" style="text-align:center; font-size:13.5px; color:var(--k-ink-soft); margin-top:14px;">
    {$t['auth.register.alt']}<a href="/login" class="no-underline" style="font-weight:700; color:var(--k-ink); border-bottom:2px solid var(--k-accent);">{$t['auth.register.altLink']}</a>
  </div>
</div>

<style>
  .auth-card {
    background: var(--k-paper-warm);
    border: 1.5px solid var(--k-ink);
    border-top: 4px solid var(--k-accent);
    border-radius: 22px;
    box-shadow: 3px 3px 0 var(--k-ink);
    padding: 30px;
  }
</style>
```

- [ ] **Step 2: Rewrite `src/pages/register.astro`**

```astro
---
import AuthLayout from '../layouts/AuthLayout.astro';
import AuthRegisterInner from '../components/auth/kiosk/AuthRegisterInner.svelte';
---

<AuthLayout title="Registrieren">
  <AuthRegisterInner client:only="svelte" />
</AuthLayout>
```

- [ ] **Step 3: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -E "AuthRegisterInner|register.astro" | head` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.

- [ ] **Step 4: Live-verify register page + client validation**

```bash
playwright-cli open "http://localhost:3000/register"
playwright-cli run-code "page.waitForSelector('input[name=name]', { timeout: 10000 })"
playwright-cli console
```
Expected: 0 console errors. Snapshot shows "REGISTRIEREN" eyebrow, display-name/email/password/repeat fields, the „Verifiziert im Kiez" footnote, terms checkbox, ochre-shadowed "Konto erstellen".

Validation check (weak pw + mismatch + terms):
```bash
playwright-cli fill "input[name=name]" "Test Nachbar"
playwright-cli fill "input[name=email]" "bad-email"
playwright-cli fill "input[name=password]" "abc"
playwright-cli fill "input[name=password2]" "xyz"
playwright-cli click "button[type=submit]"
playwright-cli run-code "page.waitForTimeout(600)"
playwright-cli snapshot
```
Expected: inline errors on email (invalid), password (weak — strength meter shows red/score 1), repeat (mismatch), and the terms label turns danger. No network call fired (submit blocked client-side). Still on `/register`.

- [ ] **Step 5: Verify email-taken banner (use an existing account email)**

Use a known-registered email (ask the user for one already in the DB, or reuse the playwright-auth account email). Fill a valid form with that email + a strong password + matching repeat + terms checked, submit, and expect the `emailtaken` danger banner with a "Stattdessen anmelden" action. Do NOT create a new real account in this step.
```bash
playwright-cli fill "input[name=name]" "Test Nachbar"
playwright-cli fill "input[name=email]" "<an-existing-account-email>"
playwright-cli fill "input[name=password]" "StrongPass123"
playwright-cli fill "input[name=password2]" "StrongPass123"
playwright-cli click "input[type=checkbox]"
playwright-cli click "button[type=submit]"
playwright-cli run-code "page.waitForTimeout(1500)"
playwright-cli snapshot
playwright-cli close
```
Expected: danger banner "E-Mail bereits registriert" + "Stattdessen anmelden →" action. Still on `/register`.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/kiosk/AuthRegisterInner.svelte src/pages/register.astro
git commit -m "feat(auth): kiosk register page (Svelte island on AuthLayout)"
```

---

### Task 8: Cleanup + docs

**Files:**
- Delete: `src/components/LoginForm.nextauth.tsx`, `src/components/RegisterForm.nextauth.tsx`
- Create: `src/components/auth/kiosk/CLAUDE.md`
- Modify: root `CLAUDE.md` (add auth-kiosk pointer)

**Interfaces:**
- Consumes: nothing. Produces: a clean tree with no references to the deleted React forms + subtree docs.

- [ ] **Step 1: Confirm the old React forms are unreferenced**

Run: `grep -rn "LoginForm.nextauth\|RegisterForm.nextauth" src/ --include=*.astro --include=*.ts --include=*.tsx --include=*.svelte`
Expected: no output (login.astro/register.astro no longer import them after Tasks 6–7).

- [ ] **Step 2: Delete the old React forms**

```bash
git rm src/components/LoginForm.nextauth.tsx src/components/RegisterForm.nextauth.tsx
```

- [ ] **Step 3: Write `src/components/auth/kiosk/CLAUDE.md`**

```markdown
# Auth (kiosk) notes

Loaded when working in `src/components/auth/kiosk/`. The login + register front
door, migrated to the Editorial Kiosk system (Phase 1, June 2026). Plan:
`docs/superpowers/plans/2026-06-26-auth-kiosk-redesign-phase1.md`.

## Layout — AuthLayout, NOT KioskLayout
Auth pages use `src/layouts/AuthLayout.astro` (sibling to KioskLayout). KioskLayout
hardcodes the full app `KioskNav` (Forum/Calendar/… links), which is wrong on a
logged-out front door. AuthLayout gives the same `.k-paper-bg` grain + tokens +
`data-page="auth"` but only a slim masthead (monogram + wordmark + region +
`AuthLangToggle`). No KioskNav, no bottom mobile nav, no KioskFooter.

## Accent = ochre
`tokens.css` sets `[data-page="auth"] { --k-accent: var(--k-ochre); }` (#e8a53a) —
the one primary hue no other surface claims. The handoff's `tokens-auth.css` (old
`--ink`/`--carved-accent` naming) was NOT imported; the accent is wired via the
established `--k-*` page-accent pattern instead.

## Pieces
- `AuthLayout.astro` — shell + masthead.
- `AuthLangToggle.svelte` — DE/EN pills → `setLocale` (existing `kiosk-i18n` store).
- `primitives/` — `AuthField` (input + error/hint/show-toggle/success), `AuthPrimaryBtn`
  (ink fill + ochre print shadow + spinner), `AuthBanner` (warn/danger/success/info),
  `AuthStrength` (4-segment pw meter).
- `AuthLoginInner.svelte` / `AuthRegisterInner.svelte` — orchestrators, mounted
  `client:only="svelte"` on `/login` + `/register`.

## Backend reused untouched
Login → `signIn('credentials', { redirect:false })`; register → `POST /api/auth/register`
({name,email,password}) then auto-login. Client validation reuses `LoginSchema` +
a local password scorer mirroring `RegisterSchema` (min 8 + upper/lower/digit). No
changes to `auth.config.ts` or `register.ts`.

## Anti-enumeration
Login shows ONE generic error ("E-Mail oder Passwort stimmt nicht.") for both
wrong-password and unknown-email. Never distinguish them externally.

## Phase 1 scope / deferred
Phase 1 = login + register reskin ONLY. Deferred to later phases: splash,
`KiezHeartbeat`, email-verify (states 11–13), forgot-password backend, rate-limit
(state 05), unverified banner (state 04). The "Passwort vergessen?" link points to
`/forgot-password` (a Phase-2 route) and 404s until built.
```

- [ ] **Step 4: Add a pointer in root `CLAUDE.md`**

In `src/CLAUDE.md`'s component-patterns area (near the other kiosk section pointers, e.g. the Newsboard/Marketplace pointers), add:

```markdown
### Auth (kiosk) patterns (login + register front door)
See `src/components/auth/kiosk/CLAUDE.md` — full notes load when working in that subtree. Auth uses a dedicated `AuthLayout.astro` (not `KioskLayout` — no app nav on the logged-out door), ochre accent (`[data-page="auth"]`), and reuses the credentials backend untouched. Phase 1 = login + register only; splash/verify/forgot/KiezHeartbeat deferred.
```

- [ ] **Step 5: Type-check + build + final grep**

Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.
Run: `grep -rn "LoginForm.nextauth\|RegisterForm.nextauth" src/` → Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(auth): remove legacy React auth forms + add kiosk docs"
```

---

## Self-review

**Spec coverage (AUTH_SCOPING + README, Phase-1 slice):**
- Ochre accent → Task 2 ✓ (via `--k-ochre`, not the obsolete token file).
- Login surface + 6 states → Task 6 covers the Phase-1-applicable subset: idle, filled, loading, success, generic-credentials-error. States 04 (unverified) + 05 (rate-limited) are explicitly deferred (need backend) — documented in Global Constraints + CLAUDE.md ✓.
- Register surface + 4 states → Task 7: idle/filled/loading, email-taken (07), weak-pw (08) via meter, mismatch (09), terms-unchecked (10) ✓.
- Anti-enumeration (login generic error) → Task 6 Step 5 verifies it ✓.
- KioskLayout `data-page` (open Q4) → resolved: dedicated AuthLayout emits `data-page="auth"` ✓.
- Sign-in methods email+password only (open Q1) → confirmed in code (Credentials-only); no OAuth row ✓.
- DE/EN parity + curly quotes → Task 1 ✓.
- Kiez-verification footnote + display-name-only → Task 7 ✓.
- Port to Svelte → all islands are Svelte 5 ✓.
- Splash / KiezHeartbeat / verify / forgot-password → out of Phase 1, documented as deferred ✓.

**Placeholder scan:** every code step contains complete, real code (full Svelte components, full page files, exact i18n blocks). No TBD/"similar to"/"add validation" placeholders.

**Type consistency:** `AuthField` `oninput(v: string)` is used consistently in Tasks 6 & 7. `AuthStrength` `score: 0|1|2|3|4` matches `scorePw`'s return type. `AuthBanner` `{kind,title,body,action,onaction}` matches all call sites. i18n keys referenced in Tasks 6/7 (`auth.login.*`, `auth.register.*`, `auth.err.*`, `auth.field.*`, `auth.strength.*`) are all defined in Task 1. `--k-accent` is set by Task 2 before any island consumes it.

**Known intentional gaps (not failures):** `/forgot-password`, `/terms`, `/privacy` links may 404 until those routes exist — acceptable for Phase 1 (the design shows the links; the routes are later work).

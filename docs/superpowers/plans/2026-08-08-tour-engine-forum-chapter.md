# „Die Führung" — Tour Engine + Forum Chapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the spotlight-tour system (engine + storage + three entry points) with the fully-designed Forum chapter, per `design/handoffs/design_handoff_tour/`.

**Architecture:** One Svelte overlay island (`TourController`) mounted in `KioskLayout`, driven by a chapter registry and a client storage module with a server mirror. The spotlight is a single fixed "ring" element whose oversized `box-shadow` paints the scrim with a hole — no z-index games with island stacking contexts. Chapters never cross a navigation.

**Tech Stack:** Svelte 5 (runes), Astro ViewTransitions lifecycle events, MongoDB (`users` doc, additive fields), kiosk-i18n, global.css `.tour-*` classes.

## Global Constraints

- **Engine contract — five duties (handoff, non-negotiable):** (1) wait for hydration — anchors don't exist at first paint; (2) re-find anchors after every soft-nav — ViewTransitions remounts islands; (3) missing anchor → skip the stop silently, counter adapts; (4) scroll each stop into view, measure only AFTER the scroll (`content-visibility: auto`); (5) a chapter never crosses a navigation.
- **Safe anchors only:** chrome + top-level controls via `data-tour="…"` attributes — never the n-th card of a list.
- **Tour chrome accent = OCHRE** (`--k-ochre` ring/top-rule; text on paper uses deep ochre `#b07515`). Surface accent (wine/teal/…) stays on the page beneath.
- **Storage: timestamps, never booleans.** `tours?: { forum?: Date, kalender?: Date, markt?: Date, kurier?: Date, kiezdaten?: Date, blog?: Date, profil?: Date }` + `tourHelloDismissedAt?: Date` on the `users` doc. localStorage mirror; server is truth for logged-in users. Abort (✕ / nav-away) writes the chapter timestamp exactly like "Fertig". Restart via avatar menu never writes.
- **Styles live in `src/styles/global.css`** under `.tour-*` (layout-mounted island → nested-island CSS orphan rule). No component `<style>` blocks in tour components.
- **i18n:** every user-facing string via `kiosk-i18n.ts`, keys added to BOTH dictionaries. German quotes: „…" (U+201E/U+201C).
- **Mobile (<1024px):** card renders as bottom sheet ABOVE the bottom nav (`bottom: 78px`, `left/right: 12px`); hello modal = bottom sheet with grabber; all touch targets ≥44px.
- **Reduced motion:** scrim + card fade only, ring static (no pulse), per `motion-tour.css`.
- **A11y:** Esc closes, ←/→ navigate stops, focus trap inside the card, focus returns to trigger on close.
- **v1 scope:** Forum chapter only (7 stops, final copy in handoff). Other 6 chapters, header-ℹ entry, checklist/straps, admin/auth chapters: OUT.
- **No new dependencies.** Type-check baseline: 28 pre-existing errors (`pnpm type-check 2>&1 | grep -icE "error ts"`). Every task: `pnpm build` green. `.svelte` changes need a browser gate (playwright-cli; never touch the user's :3000 dev server — spawn a smoke server on a verified-free 4xxx port and kill it after).
- Commit messages plain/concise, no signatures, never `--no-verify`.

## Recorded plan decisions (deviations + answered questions)

1. **Scrim mechanism:** handoff §03 prescribes "anchor above scrim via z-index". That fails whenever any island ancestor creates a stacking context. We implement the visually-identical robust variant: the fixed ring element carries `box-shadow: 0 0 0 200vmax rgba(27,26,23,0.5)` — the page dims, the anchor shows through the ring hole at full brightness. (Flagged to CD Aug 8, reserved.)
2. **Hello modal trigger (handoff open Q1):** shows on first visit of ANY chapter surface (v1: forum only, since the registry has one chapter) when signed in and `tourHelloDismissedAt` absent.
3. **Anchor pattern (Q2):** `data-tour="…"` attributes, one pattern everywhere.
4. **Kapitel-Angebot-Zeile (Q3):** client-rendered after hydration (no SSR flash-of-offer). **v1 placement deviation:** rendered by `TourController` as a full-width strip directly below the nav (same slot pattern as `VerifyEmailBanner`), NOT under the page title — a layout island cannot reach into page content. Revisit with CD when the next chapters go to design review.
5. Anonymous users: localStorage only; on first logged-in sync, local-only timestamps are POSTed up (merge-at-registration per handoff §05).

## File map

- Create `src/lib/tour/tourStore.ts` — types, localStorage mirror, server sync, seen-markers (dependency-pure, client-safe)
- Create `src/pages/api/profile/tour.ts` — GET state / POST mark-seen
- Create `src/lib/tour/tourChapters.ts` — chapter registry (dependency-pure)
- Create `src/components/tour/TourController.svelte` — orchestrator (mounted in KioskLayout)
- Create `src/components/tour/TourSpotlight.svelte` — ring/scrim + card/sheet for the active stop
- Create `src/components/tour/TourHelloModal.svelte` — entrance 1
- Create `src/components/tour/TourOfferStrip.svelte` — entrance 2
- Modify `src/layouts/KioskLayout.astro` — mount TourController
- Modify `src/components/forum/kiosk/TagBar.svelte` — `data-tour` on filter chips + first tag
- Modify `src/components/forum/kiosk/ForumIndexInner.svelte` — `data-tour` on „+ Neues Thema" CTA
- Modify `src/components/forum/kiosk/AvatarMenu.svelte` — „Führung starten" row (entrance 3)
- Modify `src/lib/kiosk-i18n.ts` — all tour keys, both locales
- Modify `src/styles/global.css` — `.tour-*` block
- Modify `CLAUDE.md` — users fields, API route, tour section pointer
- Create `src/components/tour/CLAUDE.md` — area notes

---

### Task 1: Storage module + API endpoint

**Files:**
- Create: `src/lib/tour/tourStore.ts`
- Create: `src/pages/api/profile/tour.ts`
- Modify: `CLAUDE.md` (users collection bullet + API routes tree)

**Interfaces (produced — later tasks rely on these exact names):**
```ts
export type ChapterKey = 'forum' | 'kalender' | 'markt' | 'kurier' | 'kiezdaten' | 'blog' | 'profil';
export interface TourState { tours: Partial<Record<ChapterKey, string>>; helloDismissedAt: string | null; }
export function getLocalState(): TourState;
export function isChapterSeen(state: TourState, ch: ChapterKey): boolean;
export function markChapterSeen(ch: ChapterKey, loggedIn: boolean): Promise<void>; // no-op if already seen locally
export function markHelloDismissed(loggedIn: boolean): Promise<void>;              // no-op if already dismissed
export function syncWithServer(): Promise<TourState>;                              // logged-in only; call once per page load
```

- [ ] **Step 1: Write `src/lib/tour/tourStore.ts`** (dependency-pure — no mongodb/fs imports; this file is client-side)

```ts
// Tour storage — localStorage mirror + server truth (users.tours / users.tourHelloDismissedAt).
// Pattern: same two-tier idea as the warning-label overlay. Timestamps (ISO strings
// client-side), never booleans — a future redesign can re-offer by cutoff date.
// Anonymous users live on localStorage alone; syncWithServer() POSTs local-only
// chapters up on the first logged-in visit (merge-at-registration, handoff §05).

export type ChapterKey = 'forum' | 'kalender' | 'markt' | 'kurier' | 'kiezdaten' | 'blog' | 'profil';

export interface TourState {
  tours: Partial<Record<ChapterKey, string>>; // ISO timestamps
  helloDismissedAt: string | null;
}

const LS_KEY = 'mahalle-tour-state';
export const CHAPTER_KEYS: ChapterKey[] = ['forum', 'kalender', 'markt', 'kurier', 'kiezdaten', 'blog', 'profil'];

export function getLocalState(): TourState {
  if (typeof localStorage === 'undefined') return { tours: {}, helloDismissedAt: null };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { tours: {}, helloDismissedAt: null };
    const parsed = JSON.parse(raw);
    return {
      tours: typeof parsed?.tours === 'object' && parsed.tours ? parsed.tours : {},
      helloDismissedAt: typeof parsed?.helloDismissedAt === 'string' ? parsed.helloDismissedAt : null,
    };
  } catch {
    return { tours: {}, helloDismissedAt: null };
  }
}

function writeLocal(state: TourState): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* quota/privacy */ }
}

export function isChapterSeen(state: TourState, ch: ChapterKey): boolean {
  return typeof state.tours[ch] === 'string';
}

async function postSeen(body: { chapter?: ChapterKey; hello?: boolean }): Promise<void> {
  try {
    await fetch('/api/profile/tour', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch { /* best-effort — localStorage already has it */ }
}

export async function markChapterSeen(ch: ChapterKey, loggedIn: boolean): Promise<void> {
  const state = getLocalState();
  if (isChapterSeen(state, ch)) return; // restart never rewrites
  state.tours[ch] = new Date().toISOString();
  // BINDING: writeLocal must stay BEFORE the first await — TourController calls
  // `void markChapterSeen(...)` and reads getLocalState() on the next line,
  // relying on the local write landing synchronously.
  writeLocal(state);
  if (loggedIn) await postSeen({ chapter: ch });
}

export async function markHelloDismissed(loggedIn: boolean): Promise<void> {
  const state = getLocalState();
  if (state.helloDismissedAt) return;
  state.helloDismissedAt = new Date().toISOString();
  writeLocal(state);
  if (loggedIn) await postSeen({ hello: true });
}

// Merge server truth with local (union of "seen"); push local-only chapters up.
export async function syncWithServer(): Promise<TourState> {
  const local = getLocalState();
  try {
    const res = await fetch('/api/profile/tour');
    if (!res.ok) return local;
    const server = await res.json() as { tours?: Record<string, string>; tourHelloDismissedAt?: string | null };
    const merged: TourState = {
      tours: { ...local.tours },
      helloDismissedAt: local.helloDismissedAt ?? server.tourHelloDismissedAt ?? null,
    };
    for (const ch of CHAPTER_KEYS) {
      const s = server.tours?.[ch];
      if (s && !merged.tours[ch]) merged.tours[ch] = s;           // server → local
      if (!s && local.tours[ch]) void postSeen({ chapter: ch }); // local-only → server (anon merge)
    }
    if (local.helloDismissedAt && !server.tourHelloDismissedAt) void postSeen({ hello: true });
    writeLocal(merged);
    return merged;
  } catch {
    return local;
  }
}
```

- [ ] **Step 2: Write `src/pages/api/profile/tour.ts`**

```ts
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { z } from 'zod';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// Tour progress — additive users fields (tours.<chapter>: Date, tourHelloDismissedAt: Date).
// Deliberately NOT ban-gated: reading a UI tour is not content-writing; banned
// accounts keep read access to the app and may see the tour.
const CHAPTERS = ['forum', 'kalender', 'markt', 'kurier', 'kiezdaten', 'blog', 'profil'] as const;

const BodySchema = z.object({
  chapter: z.enum(CHAPTERS).optional(),
  hello: z.literal(true).optional(),
}).refine((d) => d.chapter !== undefined || d.hello === true, { message: 'Nothing to mark' });

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.id) return json({ error: 'Unauthorized' }, 401);
  const client = await clientPromise;
  const user = await client.db().collection('users').findOne(
    { _id: new ObjectId(session.user.id) },
    { projection: { tours: 1, tourHelloDismissedAt: 1 } }
  );
  return json({
    tours: user?.tours ?? {},
    tourHelloDismissedAt: user?.tourHelloDismissedAt ?? null,
  });
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.id) return json({ error: 'Unauthorized' }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);

  const $set: Record<string, Date> = {};
  const now = new Date();
  // $set only when absent (first write wins — restarts/aborts never move the date).
  const client = await clientPromise;
  const users = client.db().collection('users');
  const _id = new ObjectId(session.user.id);
  const existing = await users.findOne({ _id }, { projection: { tours: 1, tourHelloDismissedAt: 1 } });
  if (parsed.data.chapter && !existing?.tours?.[parsed.data.chapter]) $set[`tours.${parsed.data.chapter}`] = now;
  if (parsed.data.hello && !existing?.tourHelloDismissedAt) $set.tourHelloDismissedAt = now;
  if (Object.keys($set).length) await users.updateOne({ _id }, { $set });
  return json({ ok: true });
};
```

Note: check how other API files import the client. If the repo's `lib/mongodb.ts` exports `connectDB` (as `users/update.ts` uses `clientPromise` and news uses `connectDB`), match `users/update.ts`'s import style exactly (`import clientPromise from '../../../lib/mongodb'` + `client.db()`); if only `connectDB` exists, use `const db = await connectDB()` instead. Verify by reading `src/lib/mongodb.ts` before writing.

- [ ] **Step 3: Verify** — `pnpm type-check 2>&1 | grep -icE "error ts"` → 28. `pnpm build` → green. `curl -s -o /dev/null -w "%{http_code}" http://localhost:<smokeport>/api/profile/tour` → 401 (unauthenticated) on a smoke server (verified-free 4xxx port, kill after).

- [ ] **Step 4: Update `CLAUDE.md`** — in the `users` collection bullet add: `` `tours?: { forum?: Date, kalender?: Date, markt?: Date, kurier?: Date, kiezdaten?: Date, blog?: Date, profil?: Date }` + `tourHelloDismissedAt?: Date` — spotlight-tour per-chapter seen stamps (timestamps not booleans; first write wins; see `src/components/tour/CLAUDE.md`) ``. In the API routes tree under `profile/` nothing is listed individually — skip the tree, it only lists top-level dirs.

- [ ] **Step 5: Commit** — `git add src/lib/tour/tourStore.ts src/pages/api/profile/tour.ts CLAUDE.md && git commit -m "feat(tour): storage module + tour progress API"`

---

### Task 2: Chapter registry, i18n keys, data-tour anchors

**Files:**
- Create: `src/lib/tour/tourChapters.ts`
- Modify: `src/lib/kiosk-i18n.ts` (both dictionaries)
- Modify: `src/components/forum/kiosk/TagBar.svelte`
- Modify: `src/components/forum/kiosk/ForumIndexInner.svelte` (~line 357, the `/topics/create` CTA)

**Interfaces:**
- Consumes: `ChapterKey` from `src/lib/tour/tourStore.ts`
- Produces:
```ts
export interface TourStop { anchor: string; titleKey: string; bodyKey: string; }
export interface TourChapter {
  key: ChapterKey;
  page: string;            // KioskLayout `page` prop value
  kickerKey: string;
  stops: TourStop[];
  endNoteKey: string;      // chapter-end moss box text
  nextChapterKey: string;  // "Nächstes Kapitel: … →" label
  nextChapterHref: string; // plain navigation target
}
export const CHAPTERS_BY_PAGE: Record<string, TourChapter>; // v1: { forum: … }
```

- [ ] **Step 1: Write `src/lib/tour/tourChapters.ts`** (dependency-pure)

```ts
import type { ChapterKey } from './tourStore';

export interface TourStop { anchor: string; titleKey: string; bodyKey: string; }
export interface TourChapter {
  key: ChapterKey; page: string; kickerKey: string;
  stops: TourStop[]; endNoteKey: string; nextChapterKey: string; nextChapterHref: string;
}

// v1: Forum only. The other 6 chapters are confirm-before-code (design review
// pending) — add them here once their copy is approved. Safe anchors only:
// chrome + top-level controls, never the n-th card (handoff, non-negotiable).
export const CHAPTERS_BY_PAGE: Record<string, TourChapter> = {
  forum: {
    key: 'forum',
    page: 'forum',
    kickerKey: 'tour.forum.kicker',
    stops: [
      { anchor: '[data-tour="forum-filter-discussion"]',     titleKey: 'tour.forum.s1.title', bodyKey: 'tour.forum.s1.body' },
      { anchor: '[data-tour="forum-filter-announcement"]',   titleKey: 'tour.forum.s2.title', bodyKey: 'tour.forum.s2.body' },
      { anchor: '[data-tour="forum-filter-recommendation"]', titleKey: 'tour.forum.s3.title', bodyKey: 'tour.forum.s3.body' },
      { anchor: '[data-tour="forum-filter-saved"]',          titleKey: 'tour.forum.s4.title', bodyKey: 'tour.forum.s4.body' },
      { anchor: '[data-tour="forum-filter-mine"]',           titleKey: 'tour.forum.s5.title', bodyKey: 'tour.forum.s5.body' },
      { anchor: '[data-tour="forum-tag"]',                   titleKey: 'tour.forum.s6.title', bodyKey: 'tour.forum.s6.body' },
      { anchor: '[data-tour="forum-new-topic"]',             titleKey: 'tour.forum.s7.title', bodyKey: 'tour.forum.s7.body' },
    ],
    endNoteKey: 'tour.forum.end.note',
    nextChapterKey: 'tour.forum.end.next',
    nextChapterHref: '/calendar',
  },
};
```

- [ ] **Step 2: Add i18n keys** to BOTH dictionaries in `src/lib/kiosk-i18n.ts` (copy verbatim from handoff — curly quotes „" in DE):

DE dictionary:
```ts
// tour — „Die Führung" (spotlight onboarding)
'tour.hello.kicker': 'WILLKOMMEN IM KIEZ',
'tour.hello.title': 'Schön, dass du {da} bist, {name}.',   // {da} = italic serif accent span, {name} = first name
'tour.hello.body': 'Kurze Führung durchs Forum? Sieben Stationen, ungefähr eine Minute. Du kannst jederzeit abbrechen — und sie später beliebig oft neu starten.',
'tour.hello.start': 'Führung starten →',
'tour.hello.later': 'Später vielleicht',
'tour.hello.foot': 'ERSCHEINT EINMAL · DANACH: AVATAR-MENÜ → „FÜHRUNG STARTEN"',
'tour.chrome.back': '← zurück',
'tour.chrome.next': 'weiter →',
'tour.chrome.done': 'Fertig ✓',
'tour.offer.kicker': 'NEU HIER?',
'tour.offer.text': 'Kurze Führung über diese Seite — jederzeit abbrechbar.',
'tour.offer.start': 'starten',
'tour.forum.kicker': 'FÜHRUNG · FORUM',
'tour.forum.s1.title': 'Diskussionen',
'tour.forum.s1.body': 'Fragen, Gespräche, Kiez-Themen — hier landet, was Nachbar:innen gerade beschäftigt. Der Filter zeigt nur diese Beiträge.',
'tour.forum.s2.title': 'Ankündigungen',
'tour.forum.s2.body': 'Offizielle Mitteilungen vom Team — in Teal, manchmal angepinnt. Selten, aber wichtig.',
'tour.forum.s3.title': 'Empfehlungen',
'tour.forum.s3.body': 'Tipps aus der Nachbarschaft: Läden, Ärzt:innen, Ecken. Das Gedächtnis des Kiezes.',
'tour.forum.s4.title': 'Gespeichert',
'tour.forum.s4.body': 'Alles, was du mit ◈ markierst, wartet hier — nichts geht verloren.',
'tour.forum.s5.title': 'Meine',
'tour.forum.s5.body': 'Deine eigenen Beiträge und ihr Status — auch die, die gerade noch geprüft werden.',
'tour.forum.s6.title': 'Tags',
'tour.forum.s6.body': 'Ein Klick auf einen Tag filtert den Kiez nach diesem Thema. Noch ein Klick auf denselben Tag — und alles kommt zurück.',
'tour.forum.s7.title': 'Neues Thema',
'tour.forum.s7.body': 'Wenn du so weit bist: dein erster Beitrag. Eine „Hallo Kiez"-Vorlage liegt bereit — er wird kurz geprüft und ist meist in Minuten sichtbar.',
'tour.forum.end.note': 'Das war das Forum. Die anderen Bereiche haben eigene, kürzere Kapitel.',
'tour.forum.end.next': 'Nächstes Kapitel: Kalender →',
'nav.menu.tour': 'Führung starten',
```

EN dictionary (same keys):
```ts
'tour.hello.kicker': 'WELCOME TO THE KIEZ',
'tour.hello.title': 'Good to have you {da}, {name}.',
'tour.hello.body': 'A quick tour of the forum? Seven stops, about a minute. You can leave any time — and restart it as often as you like.',
'tour.hello.start': 'Start the tour →',
'tour.hello.later': 'Maybe later',
'tour.hello.foot': 'SHOWN ONCE · AFTER THAT: AVATAR MENU → “START TOUR”',
'tour.chrome.back': '← back',
'tour.chrome.next': 'next →',
'tour.chrome.done': 'Done ✓',
'tour.offer.kicker': 'NEW HERE?',
'tour.offer.text': 'A quick tour of this page — leave any time.',
'tour.offer.start': 'start',
'tour.forum.kicker': 'TOUR · FORUM',
'tour.forum.s1.title': 'Discussions',
'tour.forum.s1.body': 'Questions, conversations, Kiez topics — whatever neighbors are talking about right now. The filter shows only these posts.',
'tour.forum.s2.title': 'Announcements',
'tour.forum.s2.body': 'Official notes from the team — in teal, sometimes pinned. Rare, but important.',
'tour.forum.s3.title': 'Recommendations',
'tour.forum.s3.body': 'Tips from the neighborhood: shops, doctors, corners. The Kiez’s memory.',
'tour.forum.s4.title': 'Saved',
'tour.forum.s4.body': 'Everything you mark with ◈ waits here — nothing gets lost.',
'tour.forum.s5.title': 'Mine',
'tour.forum.s5.body': 'Your own posts and their status — including the ones still being reviewed.',
'tour.forum.s6.title': 'Tags',
'tour.forum.s6.body': 'One click on a tag filters the Kiez by that topic. Click the same tag again — and everything comes back.',
'tour.forum.s7.title': 'New topic',
'tour.forum.s7.body': 'When you’re ready: your first post. A “Hello Kiez” template is waiting — it gets a quick review and is usually visible within minutes.',
'tour.forum.end.note': 'That was the forum. The other areas have their own, shorter chapters.',
'tour.forum.end.next': 'Next chapter: Calendar →',
'nav.menu.tour': 'Start tour',
```

Note the EN hello title also uses the `{da}` slot ("here" italic): DE inserts „da", EN inserts "here" — so add two more keys carrying the accent word: `'tour.hello.accent': 'da'` (DE) / `'tour.hello.accent': 'here'` (EN).

- [ ] **Step 3: Anchors.** In `TagBar.svelte`, both `{#each filters …}` and the auth-filters `{#each …}` button loops get `data-tour={`forum-filter-${f.key}`}` (produces `forum-filter-all` too — unused, harmless). The tag-chip loop: add `data-tour={i === 0 ? 'forum-tag' : undefined}` (add index: `{#each visibleTags as tag, i (tag)}` — match the existing each-key style). In `ForumIndexInner.svelte`, the `/topics/create` anchor (~line 357) gets `data-tour="forum-new-topic"`.

- [ ] **Step 4: Verify** — `pnpm type-check` (28) + `pnpm build` green + `npx -y svelte-check@4 --output machine 2>/dev/null | grep -c state_referenced_locally` → 0. Client-bundle purity: `grep -rl "mongodb" dist/client/_astro || echo clean` → clean (tourStore/tourChapters must not drag server modules into browser chunks).

- [ ] **Step 5: Commit** — `git add -A src/lib/tour src/lib/kiosk-i18n.ts src/components/forum/kiosk/TagBar.svelte src/components/forum/kiosk/ForumIndexInner.svelte && git commit -m "feat(tour): chapter registry, i18n keys, forum data-tour anchors"`

---

### Task 3: Engine — TourController + TourSpotlight + global.css + KioskLayout mount

**Files:**
- Create: `src/components/tour/TourController.svelte`
- Create: `src/components/tour/TourSpotlight.svelte`
- Modify: `src/styles/global.css` (append `.tour-*` block)
- Modify: `src/layouts/KioskLayout.astro`

**Interfaces:**
- Consumes: `CHAPTERS_BY_PAGE`, `TourChapter` (Task 2); `getLocalState`, `isChapterSeen`, `markChapterSeen`, `syncWithServer`, type `ChapterKey` (Task 1); `t`, `locale` from `kiosk-i18n`.
- Produces: `window.__mahalleTourStart(): void` — no-arg public start hook, starts the CURRENT page's chapter (used by AvatarMenu in Task 4; also the dev-test entry). `TourController` props: `{ user: { name?: string } | null; page?: string }`.

- [ ] **Step 1: `TourSpotlight.svelte`** — renders ONE active stop. Props:
```ts
let { chapter, stopIndex, availableStops, targetRect, radius, onNext, onBack, onClose } = $props<{
  chapter: TourChapter;
  stopIndex: number;              // index into availableStops
  availableStops: number[];       // indices of chapter.stops that currently have anchors
  targetRect: { top: number; left: number; width: number; height: number }; // viewport coords
  radius: string;                 // computed borderRadius of the anchor
  onNext: () => void; onBack: () => void; onClose: () => void;
}>();
```
Markup (styles via global `.tour-*` classes only, NO `<style>` block — nested-island CSS rule):
```svelte
<!-- Ring = spotlight + scrim in one: oversized box-shadow paints the dim layer,
     the hole shows the anchor at full brightness. Stacking-context-proof
     (plan decision 1; deviates from handoff §03 z-index mechanism). -->
<div class="tour-ring" style={`top:${targetRect.top - 6}px;left:${targetRect.left - 6}px;width:${targetRect.width + 12}px;height:${targetRect.height + 12}px;border-radius:${radius};`}></div>
<div class="tour-card" bind:this={cardEl} tabindex="-1" role="dialog" aria-modal="true" aria-label={$t[stop.titleKey]} style={cardStyle}>
  <div class="tour-card-head">
    <span class="tour-kicker font-dmmono">{$t[chapter.kickerKey]}</span>
    <button class="tour-x font-dmmono" onclick={onClose} aria-label="Schließen">✕</button>
  </div>
  <div class="tour-title font-bricolage">{$t[stop.titleKey]}</div>
  <div class="tour-body">{$t[stop.bodyKey]}</div>
  {#if isLast}
    <div class="tour-end">
      <span class="tour-stamp font-dmmono"><span>✓</span><span>KAPITEL</span></span>
      <span class="tour-end-note">{$t[chapter.endNoteKey]}</span>
    </div>
  {/if}
  <div class="tour-foot">
    <span class="tour-dots">{#each availableStops as _, i}<span class="tour-dot" class:on={i === stopIndex} class:past={i <= stopIndex}></span>{/each}</span>
    <span class="tour-count font-dmmono">{stopIndex + 1} / {availableStops.length}</span>
    {#if stopIndex > 0}<button class="tour-back font-dmmono" onclick={onBack}>{$t['tour.chrome.back']}</button>{/if}
    <button class="tour-next font-bricolage" onclick={isLast ? onClose : onNext}>{isLast ? $t['tour.chrome.done'] : $t['tour.chrome.next']}</button>
  </div>
  {#if isLast}<a class="tour-nextch font-dmmono" href={chapter.nextChapterHref}>{$t[chapter.nextChapterKey]}</a>{/if}
</div>
```
Script details: `const stop = $derived(chapter.stops[availableStops[stopIndex]]);` `const isLast = $derived(stopIndex === availableStops.length - 1);` `cardStyle` computed: desktop (`matchMedia('(min-width:1024px)')` at mount, no live tracking) → `position:fixed; width:380px; top:{rect.bottom + 16}px; left:{clamped}px` — clamp left to `[12, innerWidth - 392]`; if `rect.bottom + 16 + 320 > innerHeight`, place ABOVE (`bottom: innerHeight - rect.top + 16`). Mobile → class `tour-sheet` (fixed, `left:12px; right:12px; bottom:78px`) and no inline top/left. Focus: on mount focus `cardEl`; trap Tab within card buttons (keydown handler cycling focusables); Escape/arrow handling lives in the controller.

- [ ] **Step 2: `TourController.svelte`** — the orchestrator. Core logic (write exactly this flow):

```svelte
<script lang="ts">
  import { t, locale } from '../../lib/kiosk-i18n';
  import { CHAPTERS_BY_PAGE, type TourChapter } from '../../lib/tour/tourChapters';
  import { getLocalState, isChapterSeen, markChapterSeen, markHelloDismissed, syncWithServer, type TourState } from '../../lib/tour/tourStore';
  import TourSpotlight from './TourSpotlight.svelte';
  import TourHelloModal from './TourHelloModal.svelte';   // Task 4 — stub-import guarded, see note
  import TourOfferStrip from './TourOfferStrip.svelte';   // Task 4

  let { user = null, page = undefined } = $props<{ user: { name?: string } | null; page?: string }>();

  const chapter: TourChapter | null = page ? (CHAPTERS_BY_PAGE[page] ?? null) : null;
  const loggedIn = $derived(!!user);

  let mode = $state<'idle' | 'hello' | 'touring' | 'offer'>('idle');
  let state = $state<TourState>(getLocalState());
  let availableStops = $state<number[]>([]);
  let stopIndex = $state(0);
  let targetRect = $state<{ top: number; left: number; width: number; height: number } | null>(null);
  let radius = $state('999px');
  let triggerEl: HTMLElement | null = null; // focus restore target

  // ── Duty 1: wait for hydration — poll for an anchor before starting. ──
  function waitForAnchor(sel: string, timeoutMs = 4000): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
      const t0 = performance.now();
      (function poll() {
        const el = document.querySelector<HTMLElement>(sel);
        if (el) return resolve(el);
        if (performance.now() - t0 > timeoutMs) return resolve(null);
        requestAnimationFrame(poll);
      })();
    });
  }

  async function startChapter() {
    if (!chapter) return;
    triggerEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await waitForAnchor(chapter.stops[0].anchor);           // hydration gate
    // Duty 3: compute available stops — missing anchors are skipped, counter adapts.
    availableStops = chapter.stops.map((s, i) => (document.querySelector(s.anchor) ? i : -1)).filter((i) => i >= 0);
    if (!availableStops.length) return;
    stopIndex = 0; mode = 'touring';
    await showStop();
  }

  // Duty 4: scroll first, measure AFTER the scroll (content-visibility:auto).
  async function showStop() {
    if (!chapter) return;
    targetRect = null; // hide ring+card during transition (old card fades via mode CSS)
    const sel = chapter.stops[availableStops[stopIndex]].anchor;
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) { // anchor vanished mid-chapter → skip forward (or end)
      availableStops = availableStops.filter((_, i) => i !== stopIndex);
      if (!availableStops.length || stopIndex >= availableStops.length) return void endChapter();
      return void showStop();
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    await new Promise((r) => setTimeout(r, reduced ? 50 : 380)); // let the scroll settle
    const r = el.getBoundingClientRect();
    radius = getComputedStyle(el).borderRadius || '999px';
    targetRect = { top: r.top, left: r.left, width: r.width, height: r.height };
  }

  function next() { if (stopIndex < availableStops.length - 1) { stopIndex++; void showStop(); } }
  function back() { if (stopIndex > 0) { stopIndex--; void showStop(); } }

  function endChapter() {
    mode = 'idle'; targetRect = null;
    if (chapter) void markChapterSeen(chapter.key, loggedIn); // ✕/done/nav-away all write; no-op if seen
    state = getLocalState();
    triggerEl?.focus();
  }

  function onKeydown(e: KeyboardEvent) {
    if (mode !== 'touring') return;
    if (e.key === 'Escape') { e.preventDefault(); endChapter(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
  }

  $effect(() => {
    // Public start hook — entrance 3 (avatar menu) + dev testing.
    (window as any).__mahalleTourStart = () => { if (mode !== 'touring') void startChapter(); };
    document.addEventListener('keydown', onKeydown);
    // Duty 5: a chapter never crosses a navigation — nav-away = abort (writes stamp).
    const onNav = () => { if (mode === 'touring') endChapter(); };
    document.addEventListener('astro:before-preparation', onNav);
    // Keep ring glued to the anchor while the page scrolls/resizes under it.
    let raf = 0;
    const onScroll = () => {
      if (mode !== 'touring' || !chapter || !targetRect) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(chapter.stops[availableStops[stopIndex]].anchor);
        if (!el) return;
        const r = el.getBoundingClientRect();
        targetRect = { top: r.top, left: r.left, width: r.width, height: r.height };
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      delete (window as any).__mahalleTourStart;
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('astro:before-preparation', onNav);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  });

  // Entrance decision — ONE-SHOT per mount (`decided` guard). Without it the
  // effect re-fires every time `mode` returns to 'idle' (end of hello/tour),
  // and its async tail can then stomp an already-started tour: mode flips to
  // 'idle' → guard passes → syncWithServer resolves AFTER startChapter set
  // 'touring' → assignment overwrites mid-tour. Caught in plan audit.
  let decided = false;
  $effect(() => {
    // hello modal (signed-in, never dismissed, chapter surface) → offer strip
    // (chapter surface, chapter unseen) → idle. Client-only: no SSR flash.
    if (!chapter || decided) return;
    decided = true;
    (async () => {
      if (loggedIn) state = await syncWithServer();
      if (mode !== 'idle') return; // a tour was started meanwhile (avatar row / dev hook)
      if (loggedIn && !state.helloDismissedAt) mode = 'hello';
      else if (!isChapterSeen(state, chapter.key)) mode = 'offer';
    })();
  });
</script>

{#if mode === 'hello' && chapter}
  <TourHelloModal name={user?.name?.split(' ')[0] ?? ''} onStart={() => { void markHelloDismissed(loggedIn); mode = 'idle'; void startChapter(); }} onDismiss={() => { void markHelloDismissed(loggedIn); state = getLocalState(); mode = isChapterSeen(state, chapter.key) ? 'idle' : 'offer'; }} />
{:else if mode === 'offer' && chapter}
  <TourOfferStrip page={chapter.page} onStart={() => { mode = 'idle'; void startChapter(); }} onDismiss={() => { void markChapterSeen(chapter.key, loggedIn); state = getLocalState(); mode = 'idle'; }} />
{:else if mode === 'touring' && chapter && targetRect}
  <TourSpotlight {chapter} {stopIndex} {availableStops} {targetRect} {radius} onNext={next} onBack={back} onClose={endChapter} />
{/if}
```

**Task-3 note:** `TourHelloModal` / `TourOfferStrip` are Task 4 — in THIS task create them as minimal placeholder files that render nothing (`<script lang="ts">let { ...rest } = $props<any>();</script>`) so the controller compiles; Task 4 replaces their contents. The entrance-decision effect still runs; with placeholders nothing visible appears — verify the engine via `window.__mahalleTourStart()`.

- [ ] **Step 3: global.css `.tour-*` block** — append (namespaced, tokens from `tokens.css` `--k-*`; verify each `--k-*` var exists in `src/styles/tokens.css` and hardcode the hex with a comment if one is missing):

```css
/* ── Tour („Die Führung") — layout-mounted island, styles global by rule.
   Ring paints the scrim via oversized box-shadow: stacking-context-proof
   spotlight (design_handoff_tour, plan decision 1). ─────────────────── */
.tour-ring {
  position: fixed; z-index: 60; pointer-events: none;
  border: 2.5px solid var(--k-ochre);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--k-ochre) 20%, transparent),
              0 0 0 200vmax rgba(27, 26, 23, 0.5);
  animation: tourRingIn 320ms ease-out both;
}
@keyframes tourRingIn { from { opacity: 0; } to { opacity: 1; } }
.tour-card {
  position: fixed; z-index: 70; width: 380px; max-width: calc(100vw - 24px);
  background: var(--k-paper-warm); border: 2px solid var(--k-ink);
  border-top: 4px solid var(--k-ochre); border-radius: 10px;
  box-shadow: 4px 4px 0 var(--k-ochre); padding: 14px 18px 12px;
  animation: tourCardIn 220ms cubic-bezier(.2,.7,.3,1) both;
}
@keyframes tourCardIn { from { transform: translateY(6px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
.tour-card-head { display: flex; justify-content: space-between; align-items: center; }
.tour-kicker { font-size: 9px; letter-spacing: 0.18em; color: #b07515; font-weight: 700; }
.tour-x { font-size: 13px; color: var(--k-ink-2); min-width: 44px; min-height: 24px; text-align: right; }
.tour-title { font-size: 18px; font-weight: 800; letter-spacing: -0.015em; margin: 6px 0 4px; color: var(--k-ink); }
.tour-body { font-size: 12.5px; line-height: 1.5; color: var(--k-ink-2); }
.tour-end { display: flex; gap: 10px; align-items: center; margin-top: 10px; padding: 8px 10px;
  background: color-mix(in srgb, var(--k-moss) 8%, transparent); border: 1.5px solid var(--k-moss); border-radius: 6px; }
.tour-stamp { width: 40px; height: 40px; border-radius: 999px; border: 2px solid var(--k-moss); color: var(--k-moss);
  display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;
  transform: rotate(-8deg); animation: tourStampIn 260ms cubic-bezier(.2,.8,.2,1.2) both; }
.tour-stamp span:first-child { font-size: 12px; } .tour-stamp span:last-child { font-size: 5.5px; letter-spacing: 0.06em; }
@keyframes tourStampIn { from { transform: rotate(-8deg) scale(1.25); opacity: 0; } to { transform: rotate(-8deg) scale(1); opacity: 1; } }
.tour-end-note { font-size: 11.5px; color: var(--k-ink-2); line-height: 1.4; }
.tour-foot { display: flex; align-items: center; gap: 10px; margin-top: 12px; border-top: 1px dashed var(--k-rule); padding-top: 10px; }
.tour-dots { display: flex; gap: 4px; }
.tour-dot { width: 7px; height: 7px; border-radius: 999px; border: 1.5px solid var(--k-rule); background: transparent; }
.tour-dot.past { border-color: var(--k-ochre); } .tour-dot.on { background: var(--k-ochre); }
.tour-count { font-size: 10px; color: var(--k-ink-2); }
.tour-back { margin-left: auto; font-size: 11px; color: var(--k-ink-2); text-decoration: underline; text-underline-offset: 3px; padding: 10px 6px; }
.tour-back + .tour-next { margin-left: 0; } .tour-foot .tour-next { margin-left: auto; }
.tour-back ~ .tour-next, .tour-foot .tour-back + .tour-next { margin-left: 0; }
.tour-next { padding: 6px 14px; border-radius: 6px; background: var(--k-ink); color: var(--k-paper); font-size: 12px; font-weight: 700; min-height: 32px; }
.tour-nextch { display: block; font-size: 9.5px; color: #b07515; margin-top: 8px; text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 1023px) {
  .tour-card { left: 12px !important; right: 12px; top: auto !important; bottom: 78px; width: auto;
    animation-name: tourSheetIn; }
  .tour-next, .tour-back { min-height: 44px; }
}
@keyframes tourSheetIn { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .tour-card, .tour-stamp { animation: none; }
  .tour-ring { animation: none; }
}
```

**Footer layout (binding):** wrap back + next in `<span class="tour-actions">` in the Spotlight markup; CSS `.tour-actions { margin-left: auto; display: flex; gap: 10px; align-items: center; }`. Delete the `.tour-back`/`.tour-next` margin rules above (`margin-left` lines) — the wrapper handles alignment whether or not back renders.

- [ ] **Step 4: Mount in `KioskLayout.astro`** after `<ToastProvider client:load />`:
```astro
<TourController client:load user={session?.user ?? null} page={page} />
```
with `import TourController from '../components/tour/TourController.svelte';` in frontmatter.

- [ ] **Step 5: Browser gate** — spawn smoke server (`pnpm dev --port 4655` after verifying the port is free with `ss -tlnp | grep 4655` → empty), then playwright-cli: open `http://localhost:4655/`, wait for `[data-tour="forum-new-topic"]`, evaluate `window.__mahalleTourStart()`, snapshot → assert `.tour-ring` + `.tour-card` present, card shows "Diskussionen" + "1 / 7" (logged-out: saved/mine chips may be absent → counter shows "1 / 5" — BOTH are acceptable; assert count equals number of visible chips + 2). Arrow-Right → stop 2. Escape → overlay gone. Kill the smoke server (explicit PID).

- [ ] **Step 6: Verify** `pnpm type-check` (28), `pnpm build` green, svelte-check state_referenced_locally count 0 (add per-line ignores with the standard comment if the controller's `$props` captures warn — they are deliberate initial-value captures).

- [ ] **Step 7: Commit** — `git add -A src/components/tour src/styles/global.css src/layouts/KioskLayout.astro && git commit -m "feat(tour): spotlight engine + forum chapter wiring"`

---

### Task 4: Entry points — hello modal, offer strip, avatar-menu row

**Files:**
- Replace placeholder: `src/components/tour/TourHelloModal.svelte`
- Replace placeholder: `src/components/tour/TourOfferStrip.svelte`
- Modify: `src/components/forum/kiosk/AvatarMenu.svelte`
- Modify: `src/styles/global.css` (hello + offer styles, appended to the tour block)
- Create: `src/components/tour/CLAUDE.md`

**Interfaces:**
- Consumes: props defined in Task 3's controller markup: `TourHelloModal { name: string; onStart: () => void; onDismiss: () => void }`, `TourOfferStrip { page: string; onStart: () => void; onDismiss: () => void }`; `window.__mahalleTourStart` (Task 3).

- [ ] **Step 1: `TourHelloModal.svelte`** — centered card ≥1024px, bottom sheet with grabber below. Scrim div (plain `rgba(27,26,23,0.5)` fixed inset-0 — no hole needed here), card `role="dialog" aria-modal="true"`, focus the start button on mount, Esc = onDismiss, focus trap. Title interpolation: `$t['tour.hello.title'].replace('{name}', name).split('{da}')` → render `[pre, <span class="tour-hello-accent">{$t['tour.hello.accent']}</span>, post]`. Buttons: start (ink pill, 44px+ mobile full-width) → `onStart`; „Später vielleicht" (mono underline) + ✕ → `onDismiss`. Foot line `tour.hello.foot` above a dashed rule. Classes: `.tour-hello-scrim`, `.tour-hello`, `.tour-hello-sheet` (mobile), `.tour-hello-kicker`, `.tour-hello-title`, `.tour-hello-accent` (Instrument serif italic, `#b07515`), `.tour-hello-body`, `.tour-hello-start`, `.tour-hello-later`, `.tour-hello-foot`, `.tour-hello-grabber`. CSS mirrors the Task 3 card look (paperWarm, inkBold border, 4px ochre top rule, ochre print shadow; desktop width 520px; mobile: `left/right/bottom: 0`, `border-radius: 14px 14px 0 0`, grabber 44×4px `--k-rule` pill).
- [ ] **Step 2: `TourOfferStrip.svelte`** — full-width strip below nav (the controller renders it in normal flow at the layout slot): paper-warm bg, 1.5px ink bottom border, inner `max-w` container: mono kicker `NEU HIER?` in the surface accent (use `--k-accent`-style lookup: `data-page` drives accent via existing per-page CSS — simplest v1: ochre-deep `#b07515`), text `tour.offer.text`, underlined `tour.offer.start` button (calls `onStart`), ✕ (calls `onDismiss`, ≥44px hitbox). Class `.tour-offer` (uses the existing 140ms opacity transition from the motion spec).
- [ ] **Step 3: AvatarMenu row** — in `AvatarMenu.svelte`, after the `/profile?filter=gespeichert` row inside the first `.am-group`, add:
```svelte
<button role="menuitem" class="am-row font-bricolage" onclick={() => { close(); (window as any).__mahalleTourStart?.(); }}>{$t['nav.menu.tour']}<span class="am-icon font-dmmono">◎</span></button>
```
Buttons vs anchors: the existing rows are `<a>`; a `<button>` inherits `.am-row` styling — verify hover/focus styles apply to `button.am-row` in global.css (add `button.am-row { width: 100%; text-align: left; }` to the `.am-*` block if needed). The menu's own keyboard nav picks it up via `[role="menuitem"]`.
- [ ] **Step 4: `src/components/tour/CLAUDE.md`** — area notes: engine contract (five duties), storage schema + first-write-wins, scrim-via-box-shadow decision, entrance rules (hello: signed-in + never dismissed + chapter surface; offer: chapter surface + chapter unseen; avatar row: always, never writes), how to add a chapter (registry entry + i18n keys + data-tour anchors + design review first), v1 deviations (offer strip below nav).
- [ ] **Step 5: Browser gate** (smoke server, free 4xxx port, kill after):
  1. Fresh context (no localStorage), logged-out, open `/` → offer strip visible (hello is signed-in-only). Click ✕ → strip gone; reload → still gone (localStorage stamp).
  2. Clear localStorage, click „starten" → tour runs from stop 1; complete with „Fertig ✓" → reload → no strip (chapter stamped).
  3. Logged-in flows (hello modal, server persistence, avatar row) need a session — use the playwright cookie-reuse workflow from `reference_playwright_auth` memory if a cookie is available; otherwise hand the user a 60-second manual checklist: hello modal appears once on /, „Später" → never again (check second device/browser too — server flag), avatar menu → „Führung starten" works repeatedly.
- [ ] **Step 6: Verify** `pnpm type-check` (28) + `pnpm build` + svelte-check 0 warnings + **prod-CSS manifest check is NOT needed** (all styles in global.css) — but confirm no tour component grew a `<style>` block: `grep -l "<style" src/components/tour/*.svelte` → empty.
- [ ] **Step 7: Commit** — `git add -A src/components/tour src/components/forum/kiosk/AvatarMenu.svelte src/styles/global.css && git commit -m "feat(tour): hello modal, offer strip, avatar-menu entry"`

---

## Verification (whole feature, before merge)

1. `pnpm type-check` → 28 · `pnpm build` → green · svelte-check → 0 `state_referenced_locally`.
2. Playwright pass on smoke server: desktop 1280px + mobile 390px viewports; reduced-motion emulation (`--reduced-motion=reduce`) → ring static, no stamp animation.
3. All five engine duties demonstrably hold: start before hydration completes (throttled CPU) → no ghost ring; navigate mid-tour → tour closes + chapter stamped; remove a `data-tour` attr in devtools mid-chapter → stop skipped, counter shrinks.
4. DB check: after a logged-in run, `users` doc has `tours.forum: Date` + `tourHelloDismissedAt: Date`; a restart via avatar menu does NOT update them (shared prod DB — use the admin test account atakee+mahalle@gmail.com, clean nothing — these fields are the feature).
5. User E2E confirm on :3000, then merge/push on request.

## Out of scope (tracked)

- 6 remaining chapters (confirm-before-code: design review per chapter) — registry + engine are ready for them.
- Offer-strip placement under the page title (v1: below nav) — revisit with CD.
- **„Hallo Kiez"-Vorlage (stop 7's prefilled composer entry):** the handoff mandates it ("vorbefüllter Composer-Einstieg, normale Quota + Moderation") but ships NO template copy in README/TOUR_SCOPING. v1 stop 7 highlights the CTA only; the prefill (`/topics/create?vorlage=hallo-kiez` + ComposeForm initialValues) follows once CD delivers the template text — flag in the next design review.
- Header-ℹ entry, checklist/straps, admin/auth chapters, notification-center integration.

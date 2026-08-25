# Pin Accordion In Place Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pinned official announcements keep their fixed newest-first positions on the forum index; clicking a slim pin bar expands that pin *in its own row* into the full featured card (slide micro-animation) while the previously open one collapses to a bar — a true accordion, replacing yesterday-shipped swap-to-top behavior (user revision 2026-08-25: "let the announcements keep their position").

**Architecture:** Rework the pinned render block in `ForumIndexInner.svelte` to a single `{#each pinnedOfficials}` loop in stable order; each row renders either the featured card or the bar based on `expandedPin`, with `transition:slide` on BOTH branches so the row's total height interpolates smoothly (bar 44px ↔ card height). Duration 0 under `prefers-reduced-motion`. State/focus machinery from the swap version is reused (renamed `expandedPin`/`expandedLinkEl`); the `featuredPin`/`barPins` split derives are removed.

**Tech Stack:** Svelte 5 runes island, `slide` from `svelte/transition`, Tailwind utilities, playwright-cli browser gate.

**Spec:** User decision in chat 2026-08-25 (supersedes the same-day swap addendum in `docs/superpowers/specs/2026-08-22-multi-pin-design.md`): positions fixed, expand in place, one open at a time, micro-animation, reduced-motion respected, expanded card still navigates to detail, default = newest expanded.

## Global Constraints

- Commit message simple/concise; NO AI signature, NO "Co-Authored-By" footer.
- No new `.svelte` component file; inline utility classes only.
- `.svelte` change ⇒ browser gate on port 4655 ONLY (never 3000; free with `fuser -k 4655/tcp` after). Dev DB only (seed snippets carry the non-dev interlock — never weaken it).
- Bar markup stays byte-identical to the current bar (`▾` glyph, `#7fc2ce` comment retained); the only addition is `aria-expanded="false"` (accordion semantics).
- Transitions must NOT play on initial page load (Svelte `{#if}` intros don't run on hydration-time-true blocks — that default is the requirement; don't add `intro`).
- `pnpm build` green; `pnpm type-check` adds no new errors mentioning ForumIndexInner.
- Scratch `.mts` scripts live in the PROJECT ROOT (node resolution) and are deleted before committing.
- playwright-cli login recipe (2026-08-25, encodes hard-won quirks — don't improvise): `open` the gated URL → bounce to `/login?redirect=…` → `playwright-cli snapshot > file` (stdout capture; auto-saved `.yml` files go stale) → extract refs for `textbox "E-Mail"` / `textbox "Passwort zeigen"` / `button "anmelden"` → `fill` + `click` → land on target. No `state-load`, no cookie tricks. Password comes from reseeding: `npx tsx scripts/seed-dev-db.ts 2>&1 | grep -oE "password for all: [^ )\"]+" | cut -d' ' -f4 > /tmp/devpw.txt` (reseed wipes the dev DB — run BEFORE inserting test pins). Admin account: `admin@mahalle-dev.test`. Expect the tour hello dialog after reseed (dismiss via button "Später vielleicht").

---

### Task 1: Accordion render + animation + browser gate + docs

**Files:**
- Modify: `src/components/forum/kiosk/ForumIndexInner.svelte` (imports line ~17, script lines 112–131, render block lines 458–503)
- Modify: `src/components/forum/kiosk/CLAUDE.md` (pinned-slot bullet — full rewrite of the behavior sentences, also fixing the stale "Only the first (`i === 0`)" clause), `docs/superpowers/specs/2026-08-22-multi-pin-design.md` (accordion addendum superseding the swap addendum)

**Interfaces:**
- Consumes: existing `pinnedOfficials` derived (newest-first, sliced to `MAX_PINS`), `detailHref(item)`, `pinBarTime(d)`, `$t['pinned.bar.label']`, `ForumPostCard`, `tick` (already imported).
- Produces: nothing downstream. `pinnedIds` (feed exclusion) untouched. The names `featuredPin`, `barPins`, `featuredLinkEl` are REMOVED — nothing else in the file references them (verify with grep before finishing).

- [ ] **Step 1: Imports**

In `src/components/forum/kiosk/ForumIndexInner.svelte`, next to the existing `import { tick } from 'svelte';` (line ~17), add:

```ts
  import { slide } from 'svelte/transition';
```

- [ ] **Step 2: Replace the swap state block (lines 112–131) with the accordion state**

Replace everything from the `// Variant B+ swap …` comment through the closing `}` of `expandPin` with:

```ts
  // Pin accordion (user-decided 2026-08-25, v2 — supersedes the same-day
  // position-swap): pins keep their newest-first positions; exactly one
  // is EXPANDED in place as the full featured card, the rest are slim
  // bars. Clicking a bar expands it in its own row (slide) and collapses
  // the open one. Pure per-visit VIEW state: never persisted, never
  // reordered — the newest pin is expanded again on next load.
  let expandedPinId = $state<string | null>(null);
  const expandedPin = $derived(
    pinnedOfficials.find((p: any) => p._id === expandedPinId) ?? pinnedOfficials[0]
  );

  // Slide duration for the row swap — 0 under prefers-reduced-motion
  // (instant, no animation). Island is client:only, but guard anyway.
  const pinSlideMs =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : 180;

  // Focus management: the clicked bar button is replaced in place by the
  // expanded card, which would drop keyboard focus to <body>. Move focus
  // to the expanded card's link instead.
  let expandedLinkEl = $state<HTMLAnchorElement | null>(null);
  async function expandPin(id: string) {
    expandedPinId = id;
    await tick();
    expandedLinkEl?.focus();
  }
```

- [ ] **Step 3: Replace the pinned render block**

Replace the block from the `<!-- Pinned official announcements … -->` comment (line ~458) through its closing `{/if}` (line ~503) with:

```svelte
      <!-- Pinned official announcements (real DB docs, up to MAX_PINS).
           Accordion (Aug 2026 v2): pins keep their newest-first order;
           exactly ONE is expanded in place as the full featured card,
           the others are slim one-line pin bars. Clicking a bar expands
           it in its own row and collapses the open one — both branches
           carry transition:slide so the row height interpolates smoothly
           (bar 44px ↔ card height; two rows animating in opposite
           directions keep the page height near-constant). The expanded
           card navigates to the detail page. Hidden when the kind filter
           wouldn't include announcements. -->
      {#if activeFilter === 'all' || activeFilter === 'announcement'}
        {#each pinnedOfficials as pin (pin._id)}
          <div class="md:col-span-2 lg:col-span-3">
            {#if pin === expandedPin}
              <div transition:slide={{ duration: pinSlideMs }}>
                <a
                  bind:this={expandedLinkEl}
                  href={detailHref(pin)}
                  class="block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
                  aria-label="Offizielle Ankündigung"
                >
                  <ForumPostCard
                    topic={pin}
                    kind="announcement"
                    featured
                    pinned
                    isOfficial
                    team={pin.author?.role === 'admin'}
                  />
                </a>
              </div>
            {:else}
              <!-- #7fc2ce is deliberate: teal legible on ink (no on-ink teal
                   token exists — same reason the blog has --k-rust-on-ink).
                   Don't "fix" it to text-teal, which vanishes on the ink bg. -->
              <div transition:slide={{ duration: pinSlideMs }}>
                <button
                  type="button"
                  aria-expanded="false"
                  onclick={() => expandPin(pin._id)}
                  class="w-full text-left flex items-center gap-3 min-h-[44px] px-4 py-[9px] bg-ink text-paper border-[1.5px] border-teal rounded-lg shadow-[2px_2px_0_var(--k-teal)] focus:outline-none focus:ring-2 focus:ring-ink transition-all duration-[180ms] ease-out hover:-translate-x-px hover:-translate-y-px"
                >
                  <span aria-hidden="true" class="text-[12px]">📌</span>
                  <span class="shrink-0 font-dmmono text-[9px] uppercase tracking-[0.12em] text-[#7fc2ce]">{$t['pinned.bar.label']}</span>
                  <span class="min-w-0 truncate font-bricolage text-[14px] font-bold tracking-[-0.01em]">{pin.title}</span>
                  <span class="ml-auto shrink-0 font-dmmono text-[9.5px] text-paper/55">{pinBarTime(pin.date)}</span>
                  <span aria-hidden="true" class="shrink-0 text-[#7fc2ce] font-bold">▾</span>
                </button>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
```

Then verify no stale references remain: `grep -n "featuredPin\|barPins\|featuredLinkEl" src/components/forum/kiosk/ForumIndexInner.svelte` → empty.

- [ ] **Step 4: Build + type-check**

Run: `pnpm build 2>&1 | tail -2` → `Complete!`, and `pnpm type-check 2>&1 | grep -i ForumIndexInner` → empty.

- [ ] **Step 5: Browser gate on 4655**

Start the server:

```bash
ss -tlnp | grep -q 4655 && echo BUSY && exit 1
(pnpm astro dev --port 4655 > /tmp/dev-4655.log 2>&1 &)
for i in $(seq 1 30); do sleep 1; curl -s -o /dev/null http://localhost:4655/ && break; done
```

Reseed FIRST (captures password, wipes DB — see Global Constraints), then seed two extra pinned officials:

```bash
npx tsx scripts/seed-dev-db.ts 2>&1 | grep -oE "password for all: [^ )\"]+" | cut -d' ' -f4 > /tmp/devpw.txt
wc -c /tmp/devpw.txt   # sanity: non-empty

cat > ./seed-pins.mts <<'TS'
import 'dotenv/config';
import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
const db = client.db();
if (!db.databaseName.includes('dev')) throw new Error(`refusing non-dev db: ${db.databaseName}`);
const admin = await db.collection('users').findOne({ role: 'admin' });
if (!admin) throw new Error('no admin user — reseed dev db first');
const now = Date.now();
const docs = [1, 2].map((n) => ({
  title: `Pin-Accordion-Test ${n}`,
  description: `Testinhalt für das Pin-Akkordeon Nummer ${n}.`,
  author: String(admin._id),
  tags: ['test'],
  date: new Date(now - n * 60_000).toISOString(),
  isOfficial: true,
  pinnedUntil: new Date(now + (7 - n) * 24 * 3600_000),
  moderationStatus: 'approved',
  likes: 0, likedBy: [], views: 0, viewedBy: [], comments: [],
}));
const r = await db.collection('announcements').insertMany(docs);
console.log(Object.values(r.insertedIds).map(String).join(' '));
await client.close();
TS
npx tsx ./seed-pins.mts
```

Login via the redirect-bounce recipe (Global Constraints) at `http://localhost:4655/forum`, dismiss the tour dialog, then verify (snapshot to stdout after each action, ~3s hydration wait):

1. The pinned block shows the pins in newest-first order; exactly ONE is the featured ink card, the rest are bars ending in `▾`, each `aria-expanded="false"` `button` nodes.
2. RECORD the top-to-bottom order of pin titles. Click the SECOND pin's bar → that row now shows the featured card IN THE SAME position (second), the previously expanded pin (first position) is now a bar in the first position. The title order top-to-bottom is UNCHANGED. Exactly one featured card.
3. Click the third pin's bar (if three exist) → same invariants; order still unchanged.
4. Click the expanded card → navigates to `/announcements/<id>`. KNOWN FLAKE: playwright clicks on card-wrapping `<a>`s have silently not navigated before; if the URL doesn't change, the accepted fallback evidence is the expanded link node showing the correct `/url: /announcements/<id>` in the snapshot. Note which path you used.
5. Filter „Diskussionen" → whole block hidden; „Ankündigungen" → shown.
6. `playwright-cli resize 390 844` → bars one line, titles truncate; expanded card full-width; order stable after another swap click.
7. Screenshots: desktop + mobile (`playwright-cli screenshot`).

(The animation itself can't be asserted from a11y snapshots — the structural invariants above plus the code review are the gate; the slide is visually confirmable in the screenshots only as end states. That's accepted.)

Cleanup:

```bash
cat > ./cleanup-pins.mts <<'TS'
import 'dotenv/config';
import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
const db = client.db();
if (!db.databaseName.includes('dev')) throw new Error('refusing non-dev db');
const r = await db.collection('announcements').deleteMany({ title: /^Pin-Accordion-Test / });
console.log('deleted', r.deletedCount);
await client.close();
TS
npx tsx ./cleanup-pins.mts
rm ./seed-pins.mts ./cleanup-pins.mts
playwright-cli close; fuser -k 4655/tcp
```

- [ ] **Step 6: Docs**

In `src/components/forum/kiosk/CLAUDE.md`, "Official admin announcements" → "Pinned slot on the forum index" bullet: replace the text from `Only the first (\`i === 0\`) renders full-width` through `the featured card keeps its click-through to the detail page.` with:

```
Pins keep their newest-first positions; exactly ONE is expanded in place as the full-width featured card (newest by default), the rest render as slim one-line pin bars (ink bg, teal border/shadow, `pinned.bar.label` + title + relative time) — accordion behavior (Aug 2026 v2, superseding the brief swap-to-top version): clicking a bar expands it in its own row with a `slide` micro-animation (180ms, 0 under `prefers-reduced-motion`) and collapses the open one (client-side view state `expandedPinId`, per-visit only — newest pin expanded again on reload). The expanded card keeps its click-through to the detail page.
```

In `docs/superpowers/specs/2026-08-22-multi-pin-design.md`, directly after the swap addendum paragraph, append:

```markdown
**Accordion addendum (2026-08-25 evening, user-revised — SUPERSEDES the
swap addendum above):** pins keep their fixed newest-first positions;
clicking a bar expands that pin in its own row into the featured card
(slide transition, 180ms, 0 under prefers-reduced-motion) and collapses
the previously open one to a bar in ITS row — one expanded at a time,
nothing changes position. The expanded card still navigates to detail.
```

- [ ] **Step 7: Commit**

```bash
git add src/components/forum/kiosk/ForumIndexInner.svelte src/components/forum/kiosk/CLAUDE.md docs/superpowers/specs/2026-08-22-multi-pin-design.md docs/superpowers/plans/2026-08-25-pin-accordion.md
git commit -m "forum: pinned announcements expand in place as accordion"
```

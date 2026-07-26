# Marketplace Kiosk Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the marketplace from the legacy dark-glass design system to the kiosk design system, faithfully implementing the locked spec at `design/handoffs/design_handoff_marketplace/` (READMEFIRST + MARKETPLACE_SCOPING + 5 JSX files + tokens CSS + motion CSS).

**Architecture:** Extend the existing `listings` collection schema (3 listing kinds, 8 categories, delivery enum, optional specs, lastBumpedAt). Build a new Svelte component subtree at `src/components/marketplace/kiosk/` following the forum + calendar pattern. Reuse the shared kiosk tokens (`src/styles/tokens.css`), kiosk-i18n (`src/lib/kiosk-i18n.ts`), KioskLayout, and the Forum-owned `KioskBtn` / `KioskNav` / `KioskFooter` / `OwnStatusBanner` / `StatusBadge` / `KioskReportModal`. Add three new backend endpoints (contact relay, bump, status transitions). Phase per-image moderation UX behind a future API extension.

**Tech Stack:** Astro 5.x + Svelte 5 (kiosk islands) + Tailwind CSS 3.4 + MongoDB 6.3 + Zod + TanStack Query 5.17 + auth-astro + Cloudinary + OpenAI moderation.

---

## 0 · Decisions log (binding)

All 12 ambiguities resolved 2026-05-19 via structured questions. **This section is the binding spec for the tasks below.** Where a decision overrides the original JSX, the override is marked.

### Schema decisions (A1–A5, i3)

**A1 — Listing kind enum:** `'sell' | 'exchange' | 'gift'`. Single-token English nouns; orthogonal to price (a `'sell'` with price 0 is also "free", but kind = intent, price = number); room for future `lend`/`borrow` in the same enum shape.

**A2 — Category strategy:** **DB column = free-form string** (passes legacy values through on read). Zod `KioskCategorySchema` enum validates **write-path only**. New 9 keys (spec JSX): `'moebel' | 'kleidung' | 'medien' | 'werkzeug' | 'pflanze' | 'elektronik' | 'fahrrad' | 'kind' | 'sonstiges'`. Legacy 10 keys (`furniture, electronics, clothing, books, comics, toys, handmade, home-garden, sports, other`) documented in inline comment, **NOT validated**. `resolveCategory(raw)` helper returns `{ key, token, label, legacy: boolean }`. Legacy listings: no `CategoryChip`, no color, `Altbestand` strap. **Owner-edit on legacy forces category re-pick** (form treats field as empty/required — the only soft-migration path).

**A3 — Delivery enum:** `'abholung' | 'versand' | 'abholungVersand'` (spec keys). **Required on write, nullable on read.** `DeliveryPill` omitted when `null` (no placeholder). Filter rail **excludes nulls** (not bucketed into any value). **Owner-edit on legacy forces delivery pick** (symmetric with A2).

**A4 — Specs shape:** `condition` stays a **flat top-level enum** (kept English per i3 — see below). `specs?` is a nested object with 5 German free-text keys: `masse, material, baujahr, farbe, gewicht`. Caps: masse 80, material 80, baujahr 20, farbe 40, gewicht 40. `baujahr` is **`string`** (allows "ca. 1970", "60er", "unbekannt"). Render rule: **skip empty fields** (no "—" placeholder). Specs available on **all 3 kinds**. Persistence: `null` when nothing filled, `{ ... }` when at least one set.

**i3 — Condition enum keys:** **Keep existing English unchanged** — `'like-new' | 'excellent' | 'very-good' | 'good' | 'fair'`. Walks back A4's German enum suggestion. Render layer translates to German chip labels:

| Enum | DE label | EN label |
|---|---|---|
| `like-new` | Wie neu | Like new |
| `excellent` | Sehr gut | Excellent |
| `very-good` | Gut | Very good |
| `good` | Akzeptabel | Good |
| `fair` | Gebraucht | Fair |

Don't let the two enums drift in cardinality, only in language.

**A5 — Bump tracking:** Separate `lastBumpedAt?: Date` nullable column. Strap derives from `lastBumpedAt > now - 24h`. Bump endpoint sets `lastBumpedAt`; `updatedAt` updates implicitly per ORM convention. **Partial index** on `lastBumpedAt > now - 24h`. **Never expose `lastBumpedAt` to non-owners** — strap is the only public projection (prevents "bumps every 7d like clockwork" leakage). Bumps don't bypass moderation. Edits don't clear the bump (24h timer continues).

### Backend / infrastructure decisions (A6, A7)

**A6 — Email provider:** Resend. `RESEND_API_KEY` env var (server-only). **React Email templates** (`@react-email/components`): two templates — `MarketplaceContactEmail` (owner-direction) + `ContactConfirmation` (sender-direction BCC). **`replyTo: senderEmail`** is the privacy mechanism: owner reply → buyer directly; Mahalle relays the introduction only, subsequent conversation off-platform. Rate limits: **5/hour per sender globally + 3/day per sender-to-same-owner**. Sending domain = project apex (`mahalle.berlin` or equivalent — confirm at deploy). **Body retention**: metadata only (sender email, listing ID, timestamp, mod status); message body purged after relay OR 30d encrypted retention for moderation history, then purged. **GDPR**: do not persist message bodies indefinitely. **Pending listings disable the contact form on both sides** (can't contact a listing under AI review). **Tausch listings use the same form + endpoint + template** — only intro copy varies.

**A7 — Reserved state:** Owner-toggled only. Add `'reserved'` to status enum + `reservedAt: Date?` (nullable, set on toggle, **NO auto-expiry, NO `reservedUntil`**). No buyer-initiated lock, no waitlist collection in v1. **Contact form stays open on reserved** with soft copy: *"Reserviert — du kannst trotzdem anfragen, falls der Deal nicht zustande kommt."* **Bump disabled while reserved.** Stale decay still applies. **Reserved → sold is one click** (skip "un-reserve" intermediate). Strap = muted plum.

### Spec-vs-implementation decisions (A8, A9, A10, A11, A12)

**A8 — Saved-search alert CTA:** Trust v1.1, omit the `🔔 alarm setzen` button. Search-empty renders: **dismissible filter chips + "Nichts dabei." headline + "← Filter zurücksetzen" link** (link, not button — it's a state action, not a commit). **Two distinct empty states** (both must be built): (a) filtered-empty → chips + clear-filters link; (b) truly-empty marketplace (no listings at all) → no chips, "Be the first to post" CTA (different copy, no chip stack).

**A9 — Bundles:** **Defer to follow-up PR.** **Reserve `bundleId?: ObjectId` nullable FK** on listing schema NOW (additive while schema is moving; free now, real migration cost later). Add **partial index** on `bundleId`. Do NOT create `bundles` collection, discount field, or bundle-status enum — those are v2 design decisions. **Un-defer trigger conditions** (record in CLAUDE.md): owners writing "siehe auch meine andere Anzeige" in descriptions; repeat-seller patterns (one user with 5+ active listings); forum comments asking "kann man mehrere Sachen zusammen verkaufen?" — when 2–3 such signals appear, build bundles.

**A10 — Page-accent:** Trust JSX. Marketplace uses **two page accents**:
- `--carved-accent: var(--wine)` — primary (kickers, carved title device, default surface accent)
- `--k-accent-italic: var(--ochre)` — **NEW, narrowly scoped** (italic editorial emphasis on headline verbs ONLY)

**Fix `src/styles/tokens.css:105`** from `marketplace → teal` to `marketplace → wine` (it's a placeholder/copy-paste bug that creates a page-color collision with Calendar). Document the scope constraint inline:

```css
/* --k-accent-italic is scoped to italicized verb emphasis in headlines.
   Do NOT use for buttons, borders, fills, or any other accent need.
   Marketplace surfaces use --carved-accent for everything else.
   Forum and Calendar do NOT receive this token. */
```

CSS class pattern (not inline styles):
```css
.kiosk-headline em,
.kiosk-headline .accent-italic {
  color: var(--k-accent-italic);
  font-style: italic;
}
```

Future surfaces only earn `--k-accent-italic` if they have the same italicized-verb headline vocabulary.

**A11 — Per-image moderation:** Gated on a per-image vision-mod API extension that doesn't exist. State matrix tile §10 ("Bild abgelehnt") **NOT rendered in v1**. Only the **strap kind `bildAbgelehnt`** is included in `MarketStrap.svelte` so it's ready when the API lands.

**A12 — Legacy code:** Delete in this same branch, **co-located commit-by-commit** (NOT bundled in a final Phase 8 cleanup commit). **Each phase that adds a kiosk component deletes its legacy counterpart in the same commit.** Why clean cut: all schema changes are additive (no column drops, no enum value removals, no destructive migrations) → `git revert` is the real rollback path; legacy components reference old schema shapes that won't survive these changes anyway, so parallel-with-feature-flag is fake safety. **Inventory before delete**: grep `from.*marketplace` for external coupling. **Triage shared utilities**: keep if new kiosk code imports; if shared+kept, move to `src/lib/marketplace/`. **Tests need replacement, not deletion** (verify whether legacy has tests first). **i18n keys swept in a final commit within same PR**, after all components land. **PR description names the rollback story**: *"All schema changes are additive (no column drops, no destructive enum changes). Rollback: `git revert <PR>`, then drop new columns in follow-up. Down migrations are reversible."*

### Cross-cutting rules

1. **Soft-migration symmetry** (A2 + A3): DB-permissive on read, Zod-strict on write, owner-edit forces re-pick on legacy values. Apply to any future similar enum extension.
2. **Schema additivity is the rollback contract**: no destructive changes. This licenses A12's clean cut.
3. **JSX-vs-v1.1 precedence**: *JSX wins on conflict EXCEPT when v1.1 explicitly removed a feature from scope — in that case the scoping doc supersedes the JSX surface.* Newer-intent wins over older-pixel-fidelity when the conflict is about whether to ship.
4. **Spec hygiene as part of this PR**: scan marketplace JSX for residue of v1.1-cut features (`🔔/Alarm/Benachrichtigung`, `Karte/Map/Treffpunkt/Vorbeischauen`, `Gegenangebot/counter-offer`, bundle UI). Strip from JSX or mark `// DEFERRED — see CLAUDE.md`. The handoff itself gets cleaned to match v1.1. **New Task 1.0 below handles this.**
5. **Second-accent privilege**: `--k-accent-italic` is marketplace-only. Other surfaces don't get it unless they earn it with the same italicized-verb headline vocabulary.

---

## 1 · File structure (target shape)

New tree to be created. Bold = new file; *italic* = file modified.

```
src/
├── components/
│   └── marketplace/
│       └── kiosk/                              # NEW subtree
│           ├── primitives/
│           │   ├── MarketStrap.svelte          # 10 strap kinds; locked geometry
│           │   ├── CategoryChip.svelte         # 8 cats + sonstiges fallback
│           │   ├── DeliveryPill.svelte         # abholung | versand | abholungVersand
│           │   ├── PriceTag.svelte             # per-kind: € italic / ↔ Tausch / gratis strap
│           │   └── ListingImagePlaceholder.svelte
│           ├── browse/
│           │   ├── MarketTitleBlock.svelte
│           │   ├── MarketFilterRail.svelte     # kind toggle + cat row + search
│           │   ├── ListingLead.svelte          # editorial page-1 lead
│           │   ├── ListingCard.svelte          # uniform 3-col grid card
│           │   └── MarketplaceBrowseInner.svelte  # orchestrator
│           ├── detail/
│           │   ├── DetailGallery.svelte        # lead + thumb strip + lightbox
│           │   ├── SellerCard.svelte           # avatar + verified + rating
│           │   ├── ContactForm.svelte          # idle | sent; Tausch copy variant
│           │   ├── OwnerActions.svelte         # edit/bump/reserve/sold/delete
│           │   ├── MarketDetailInner.svelte    # orchestrator
│           │   └── SpecStrip.svelte            # spec/optional-details strip
│           ├── compose/
│           │   ├── KindPicker.svelte           # §01 verkaufen/tausch/verschenken
│           │   ├── ImageSlots.svelte           # §04 5 slots + main badge + drag-reorder
│           │   ├── ComposePreview.svelte       # sticky live preview pane
│           │   ├── OptionalDetails.svelte      # §06 6 free-text fields
│           │   ├── DeliveryRadios.svelte       # §05 right column
│           │   ├── MarketComposeInner.svelte   # orchestrator
│           │   └── MarketComposeStickyPublish.svelte  # mobile sticky bar
│           ├── states/
│           │   ├── MarketSkeletonGrid.svelte   # §01 loading
│           │   ├── MarketEmpty.svelte          # §02 empty
│           │   ├── MarketSearchEmpty.svelte    # §03 filter 0 hits
│           │   ├── MarketError.svelte          # §04 network error
│           │   ├── BackfillBanner.svelte       # owner-only "Auffrischen?" prompt
│           │   └── ListingRejectedPanel.svelte # §11 owner-only rejection detail
│           └── novel/
│               ├── BumpControl.svelte          # owner CTA + rate-limit countdown
│               └── (Bundle*.svelte)            # deferred per A9
├── pages/
│   └── marketplace/
│       ├── index.astro                         # REWRITTEN (kiosk index)
│       ├── [id].astro                          # REWRITTEN (kiosk detail)
│       ├── create.astro                        # NEW (replaces sell.astro)
│       ├── edit/[id].astro                     # NEW
│       └── my-listings.astro                   # DELETED (Meine Anzeigen filter on /marketplace covers it)
│   └── api/
│       └── listings/
│           ├── [id]/
│           │   ├── contact.ts                  # NEW: relay-via-Resend
│           │   ├── bump.ts                     # NEW
│           │   └── status.ts                   # NEW: reserved/sold transitions
│           ├── *create.ts*                     # extend for new fields
│           ├── *edit/[id].ts*                  # extend for new fields
│           ├── *draft.ts*                      # extend for new fields
│           └── *draft/[id]/publish.ts*         # extend for new fields
├── schemas/
│   └── *listing.schema.ts*                     # extend per A1–A5
├── types/
│   └── *listing.ts*                            # extend per A1–A5
├── lib/
│   ├── kiosk-i18n.ts                           # add MARKET.* keys
│   ├── marketplaceQueryOptions.ts              # NEW (mirror forumQueryOptions pattern)
│   └── listingsQuery.ts                        # NEW server-side fetch + filter
├── hooks/api/
│   ├── useListingsQuery.ts                     # NEW (or extend existing if any)
│   ├── useListingMutations.ts                  # NEW
│   ├── useContactListingMutation.ts            # NEW
│   ├── useBumpListingMutation.ts               # NEW
│   └── useListingStatusMutation.ts             # NEW
├── styles/
│   └── *tokens.css*                            # extend with 8 cat tokens + 10 strap tokens + 3 delivery tokens
└── styles/
    └── motion-marketplace.css                  # NEW (copy from handoff dir)
```

---

## 2 · Tasks

The plan is structured in 8 sequential phases. Each phase must complete + commit before the next begins. Within a phase, tasks can be parallelized if independent. **Per A12: every commit that adds a kiosk component deletes its legacy counterpart in the same commit (co-located add+delete). Don't bundle legacy deletion into a final cleanup phase.**

### Phase 1: Foundation (schema, tokens, i18n, nav, spec hygiene)

#### Task 1.0: JSX hygiene audit (strip v1.1-cut residue from spec JSX) [Rule 4]

**Files:**
- Modify: `design/handoffs/design_handoff_marketplace/jsx/kiosk-marketplace-states.jsx` (strip 🔔 alert CTA from desktop + mobile state tiles)
- Modify: `design/handoffs/design_handoff_marketplace/jsx/kiosk-marketplace-novel.jsx` (mark Bundles section `// DEFERRED — see CLAUDE.md "Bundles" marker`)
- Audit (read-only) the other 3 JSX files for any cut-feature residue

- [ ] **Step 1: Grep for residue**

```bash
cd design/handoffs/design_handoff_marketplace/jsx
grep -nE "alarm|🔔|benachrichtig|Karte|Map|Treffpunkt|Vorbeischauen|Gegenangebot|counter.offer" *.jsx
```

Expected hits: at minimum `kiosk-marketplace-states.jsx` lines 175 (`{lang === "DE" ? "alarm setzen" : "set alert"}`) and 371. Possibly bundle-related residue is more invasive — the entire `MarketplaceNovelDesktop` is one of the bundle-rendering components.

- [ ] **Step 2: Strip alert CTA from `kiosk-marketplace-states.jsx`**

Replace the `🔔 alarm setzen` button + surrounding `KioskBtn` lines (desktop tile §03 ~line 175 and mobile tile §03 ~line 371) with:

```jsx
<a href="#" style={{
  fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft,
  textDecoration: "underline", textDecorationStyle: "dashed",
  letterSpacing: "0.03em",
}}>← {lang === "DE" ? "Filter zurücksetzen" : "Clear filters"}</a>
```

- [ ] **Step 3: Mark bundles section deferred in `kiosk-marketplace-novel.jsx`**

Wrap the `Feature n="03" ... Bundle-Anzeige ...` block (lines 166–213) in a block comment so Babel doesn't parse the JSX body (avoids "dead code" double-takes during review):

```jsx
{/*
  DEFERRED to follow-up PR — see CLAUDE.md "Bundles" marker.
  Schema reserves bundleId?: ObjectId nullable FK + partial index.
  Un-defer trigger conditions documented in CLAUDE.md (un-defer when
  2-3 of: cross-link patterns in descriptions, 5+ active-listing
  sellers, forum requests for multi-item grouping).

  ORIGINAL SPEC — retained as reference, NOT for implementation in this PR:

  <div style={{ gridColumn: "span 2" }}>
    <Feature n="03" title={lang === "DE" ? "Bündel-Anzeige" : "Bundle listing"} ...>
      ... entire bundle Feature block ...
    </Feature>
  </div>
*/}
```

Don't delete the JSX — it's the reference for the v2 PR. The block-comment form keeps it readable but inert; readers see "this is preserved reference, not unreachable code."

- [ ] **Step 4: Grep again to confirm clean**

```bash
grep -nE "alarm|🔔|benachrichtig" *.jsx
```
Expected: 0 hits in `kiosk-marketplace-states.jsx` (only retained in `// DEFERRED` blocks if any survive).

- [ ] **Step 5: Commit**

```bash
git add design/handoffs/design_handoff_marketplace/jsx/kiosk-marketplace-states.jsx design/handoffs/design_handoff_marketplace/jsx/kiosk-marketplace-novel.jsx
git commit -m "docs(marketplace): strip v1.1-cut features from handoff JSX

- Remove 🔔 alarm-setzen CTA from search-empty state (saved-search alerts
  were dropped in v1.1; rendering chips + 'Filter zurücksetzen' link instead).
- Mark bundles section // DEFERRED in novel.jsx; spec retained for v2 PR.

Per the new precedence rule: JSX wins on conflict EXCEPT when v1.1
explicitly removed a feature from scope. Documented in plan §0 rule 3."
```

#### Task 1.1: Extend listing schema + types (A1–A5, i3, A7)

**Files:**
- Modify: `src/schemas/listing.schema.ts`
- Modify: `src/types/listing.ts`

- [ ] **Step 1: Extend `ListingTypeSchema` (A1)**

```ts
// src/schemas/listing.schema.ts
export const ListingTypeSchema = z.enum(['sell', 'exchange', 'gift']);
```

- [ ] **Step 2: Define category schemas (A2)** — DB column is permissive; Zod enum gates write-path only

```ts
// Legacy keys — documented here for future archaeology.
// NOT validated. DB accepts these on read (passthrough).
// const LEGACY_CATEGORY_KEYS = [
//   'furniture', 'electronics', 'clothing', 'books', 'comics',
//   'toys', 'handmade', 'home-garden', 'sports', 'other',
// ];

// Spec JSX keys — validated on every write.
export const KioskCategorySchema = z.enum([
  'moebel', 'kleidung', 'medien', 'werkzeug',
  'pflanze', 'elektronik', 'fahrrad', 'kind', 'sonstiges',
]);

// Read-path schema: any string survives. The Listing TS type uses `string`.
// Write-path schemas (Create/Update) use KioskCategorySchema directly.
```

- [ ] **Step 3: Add `DeliverySchema` (A3)**

```ts
export const DeliverySchema = z.enum(['abholung', 'versand', 'abholungVersand']);
// Required on Create/Update, nullable on Listing TS type.
```

- [ ] **Step 4: Add `SpecsSchema` (A4)** — 5 German keys, no `condition` (which stays a flat top-level enum)

```ts
export const SpecsSchema = z.object({
  masse:    z.string().max(80).optional(),
  material: z.string().max(80).optional(),
  baujahr:  z.string().max(20).optional(),  // string, not number — allows "ca. 1970", "60er"
  farbe:    z.string().max(40).optional(),
  gewicht:  z.string().max(40).optional(),
}).optional();
// Persistence: null when none filled, { … } when at least one set.
// Render rule: skip empty fields (no "—" placeholder).
```

- [ ] **Step 5: Extend `ListingStatusSchema` with `'reserved'` (A7)**

```ts
export const ListingStatusSchema = z.enum([
  'draft', 'available', 'reserved', 'sold', 'exchanged',
]);
```

- [ ] **Step 6: Keep existing `ListingConditionSchema` unchanged (i3)**

```ts
// UNCHANGED — English keys, 5 values.
export const ListingConditionSchema = z.enum([
  'like-new', 'excellent', 'very-good', 'good', 'fair',
]);
// Render layer translates to German chip labels — see Task 1.3 (i18n).
```

- [ ] **Step 7: Thread new fields into `ListingCreateSchema`, `ListingUpdateSchema`, `ListingDraftSchema`**

```ts
// ListingCreateSchema (and Update) — REQUIRED:
category: KioskCategorySchema,
delivery: DeliverySchema,

// OPTIONAL:
specs: SpecsSchema,

// ListingDraftSchema (relaxed) — all the above .optional()
```

`price` validation per kind (strict per Issue 3 / Round 4 review):
- `'sell'` — `price ≥ 0.01` (existing rule).
- `'exchange'` — `price` must be `0 | undefined` (**strict, not permissive**). Owners who want cash-or-trade create two cross-linked listings; keeps `PriceTag` rendering clean.
- `'gift'` — `price` must be `0 | undefined`.

```ts
.superRefine((data, ctx) => {
  if (data.listingType === 'gift' && data.price && data.price > 0) {
    ctx.addIssue({ code: 'custom', message: 'gift listings cannot have a price', path: ['price'] });
  }
  if (data.listingType === 'exchange' && data.price && data.price > 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'exchange listings cannot have a price; create separate sell + exchange listings if you want both',
      path: ['price'],
    });
  }
})
```

- [ ] **Step 8: Update `Listing` TS type (`src/types/listing.ts`)** — read-path permissive

```ts
export interface Listing {
  // … existing fields …
  listingType: 'sell' | 'exchange' | 'gift';
  category: string;                       // permissive: legacy values pass through
  condition?: 'like-new' | 'excellent' | 'very-good' | 'good' | 'fair' | null;

  // New, optional/nullable:
  delivery?: 'abholung' | 'versand' | 'abholungVersand' | null;
  specs?: {
    masse?: string;
    material?: string;
    baujahr?: string;
    farbe?: string;
    gewicht?: string;
  } | null;

  status: 'draft' | 'available' | 'reserved' | 'sold' | 'exchanged';
  reservedAt?: Date | string | null;

  lastBumpedAt?: Date | string | null;    // never exposed to non-owners (see A5)
  bundleId?: string | null;               // reserved for v2 per A9; always null in v1
}
```

- [ ] **Step 9: Add MongoDB indexes via a dedicated script** (NOT in connection bootstrap)

Verified via grep: there's no `createIndex` pattern anywhere in `src/lib/`. Don't tuck index creation into `src/lib/mongodb.ts` — startup races, no idempotency guarantee, and there's no precedent for it. Add a standalone script:

```ts
// scripts/create-listing-indexes.ts
import { connectDB } from '../src/lib/mongodb';

async function main() {
  const db = await connectDB();
  await db.collection('listings').createIndex(
    { lastBumpedAt: -1 },
    { partialFilterExpression: { lastBumpedAt: { $exists: true } }, name: 'listings_lastBumpedAt_partial' }
  );
  await db.collection('listings').createIndex(
    { bundleId: 1 },
    { partialFilterExpression: { bundleId: { $exists: true } }, name: 'listings_bundleId_partial' }
  );
  console.log('listings indexes created');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Run manually at deploy: `pnpm tsx scripts/create-listing-indexes.ts`. Document in the PR description's "ops checklist." Idempotent (`createIndex` is no-op when index with same name + options exists).

- [ ] **Step 10: Build the `resolveCategory` + `resolveDelivery` helpers**

Create `src/lib/marketplaceResolvers.ts`:

```ts
import { KioskCategorySchema, DeliverySchema } from '../schemas/listing.schema';

const KIOSK_CATEGORY_KEYS = KioskCategorySchema.options;
const DELIVERY_KEYS = DeliverySchema.options;

// Pure function — no MongoDB, no auth. Safe for both server + client imports.
export function resolveCategory(raw: string | null | undefined) {
  if (!raw) return { key: null, token: null, label: null, legacy: false };
  if (KIOSK_CATEGORY_KEYS.includes(raw as any)) {
    return { key: raw, token: `--cat-${raw}`, label: raw, legacy: false as const };
  }
  // Legacy passthrough — no color, no chip
  return { key: 'legacy' as const, token: '--k-ink-mute', label: raw, legacy: true as const };
}

export function isLegacyDelivery(raw: string | null | undefined): boolean {
  if (raw == null) return true;  // null delivery on legacy listings
  return !DELIVERY_KEYS.includes(raw as any);
}
```

- [ ] **Step 11: Type-check + commit**

```bash
pnpm type-check
git add src/schemas/listing.schema.ts src/types/listing.ts src/lib/marketplaceResolvers.ts src/lib/mongodb.ts
git commit -m "feat(marketplace): extend listing schema for kiosk redesign

- listingType: add 'gift' (A1)
- category: free-form string on read, KioskCategorySchema gated on write (A2)
- delivery: new required-on-write enum (A3)
- specs: nested optional German free-text object (A4)
- status: add 'reserved' + reservedAt nullable (A7)
- lastBumpedAt: nullable + partial index (A5)
- bundleId: reserved nullable FK + partial index for v2 (A9)
- condition: kept English enum unchanged (i3)
- resolveCategory/resolveDelivery helpers in src/lib/"
```

#### Task 1.2: Extend kiosk tokens with marketplace block

**Files:**
- Modify: `src/styles/tokens.css`
- Create: `src/styles/motion-marketplace.css`

- [ ] **Step 1: Append marketplace token block to `tokens.css`**

Copy the entire `:root { … }` block from `design/handoffs/design_handoff_marketplace/tokens-marketplace.css` (lines 7–53) — the 8 category tokens, 10 strap-bg tokens, and 3 delivery icon tokens. Place after the existing kiosk semantic accents block.

- [ ] **Step 2: Append `.kiosk-strap*` + `.cat-chip*` + `.delivery-pill` class definitions**

Copy lines 55–132 of `tokens-marketplace.css` verbatim. These provide CSS-class fallbacks for surfaces that don't want to use the Svelte primitive components.

- [ ] **Step 3: Copy `motion-marketplace.css` from handoff dir**

```bash
cp design/handoffs/design_handoff_marketplace/motion-marketplace.css src/styles/motion-marketplace.css
```

- [ ] **Step 4: Import the motion file in the kiosk layout chain**

In `src/styles/global.css`, append:
```css
@import './motion-marketplace.css';
```

- [ ] **Step 4.5: Extend `KioskLayout.astro` to emit `data-page`** (verified gap per Issue 5)

Grep confirms `data-page` is currently only on `CalendarPageInner.svelte:312` (a div, not `<body>`). The existing `[data-page="marketplace"]` rule in `tokens.css:105` matches nothing. Add a `page` prop to KioskLayout and emit it on `<body>`:

```astro
---
// src/layouts/KioskLayout.astro frontmatter
export interface Props {
  title?: string;
  page?: 'forum' | 'calendar' | 'marketplace' | 'newsboard' | 'profile' | 'blog' | 'admin';
  // … existing props …
}
const { title, page, /* … */ } = Astro.props;
---
<html lang="de">
  <head>…</head>
  <body
    class="min-h-screen k-paper-bg text-ink font-bricolage antialiased flex flex-col"
    data-page={page}
  >
    …
  </body>
</html>
```

Then every kiosk page passes its `page` prop:
- `src/pages/index.astro`: `<KioskLayout page="forum">`
- `src/pages/calendar.astro`: `<KioskLayout page="calendar">`
- `src/pages/marketplace/index.astro` (after rewrite): `<KioskLayout page="marketplace">`

Without this step, the `--k-accent-italic` cascade (next step) never activates.

- [ ] **Step 5: Fix the page-accent rule per A10** — `tokens.css:105` is a placeholder bug (marketplace → teal collides with Calendar). Replace it with the wine + ochre pair:

```css
/* --k-accent-italic is scoped to italicized verb emphasis in marketplace
   headlines. Do NOT use for buttons, borders, fills, or any other accent
   need. Forum and Calendar do NOT receive this token — only marketplace
   has the editorial-verb headline vocabulary that earns the second accent.
   See docs/plans/2026-05-19-marketplace-kiosk-redesign.md §0 rule 5. */
[data-page="marketplace"] {
  --k-accent: var(--k-wine);
  --k-accent-italic: var(--k-ochre);
}
```

Do NOT add `--k-accent-italic` fallbacks to forum/calendar/etc. — undefined is correct for those surfaces (any accidental use of the var on those pages will read as `currentColor` and become visible during review). The second-accent privilege is marketplace-only.

Add the CSS class hook to `global.css` (after the marketplace-tokens import):

```css
/* Italic-verb emphasis pattern — marketplace only.
   Markup writes <em>wechselt</em> or <span class="accent-italic">…</span>. */
.kiosk-headline em,
.kiosk-headline .accent-italic {
  color: var(--k-accent-italic);
  font-style: italic;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/styles/motion-marketplace.css src/styles/global.css
git commit -m "feat(marketplace): kiosk token extension (8 cats + 10 straps + delivery + motion)"
```

#### Task 1.3: Add marketplace strings to kiosk-i18n

**Files:**
- Modify: `src/lib/kiosk-i18n.ts`

- [ ] **Step 1: Add `MARKET.*` namespace keys**

Pull all German + English copy from the 5 JSX spec files. Group under namespaces:
- `market.title.q1` / `market.title.q1.italic` (Wie/What's + accent + den-Besitzer)
- `market.titlemeta.listings` / `market.titlemeta.new` / `market.titlemeta.fresh`
- `market.filter.kind.*` (all, verkaufen, tausch, verschenken)
- `market.filter.saved` / `market.filter.mine` / `market.filter.search`
- `market.filter.category.label` + `market.cat.{moebel,kleidung,medien,werkzeug,pflanze,elektronik,fahrrad,kind,sonstiges}` (de + en)
- `market.strap.{gratis,tausch,bump,altpapier,altbestand,pruefung,bildAbgelehnt,reserviert,verkauft,entwurf}` (de + en)
- `market.lead.banner` / `market.lead.posted`
- `market.delivery.{abholung,versand,abholungVersand}` (de + en)
- `market.price.tausch.label` ("Tauschvorschlag") / `market.price.vb.suffix`
- `market.divider.sortedBy` / `market.divider.allListings`
- `market.detail.*` (all detail-page copy: gallery legend, spec-strip labels, action row labels, similar-listings header)
- `market.contact.*` (form: header, name-label, email-label, message-label, helper-text, send-button, sent-confirmation, sent-helper, tausch-headline, tausch-helper, tausch-placeholder, privacy-footer)
- `market.owner.*` (owner-actions: header, edit, bump, mark-reserved, mark-sold, last-bump, delete, pending-banner)
- `market.seller.*` (seller-card: header, since, n-listings, verified, more-listings, report)
- `market.compose.*` (compose title, all 6 section headings, kind-picker labels + descriptions, image-slot text, price labels, delivery labels, optional-details intro + 5 field labels (`masse, material, baujahr, farbe, gewicht` — note: condition lives at top-level, not in specs), draft-save, cancel, publish, publishing, preview-waiting, preview-live, checklist labels, moderation-notice)
- `market.condition.{like-new,excellent,very-good,good,fair}` (per i3 — render-layer translation):

```ts
'market.condition.like-new':   { de: 'Wie neu',     en: 'Like new'    },
'market.condition.excellent':  { de: 'Sehr gut',    en: 'Excellent'   },
'market.condition.very-good':  { de: 'Gut',         en: 'Very good'   },
'market.condition.good':       { de: 'Akzeptabel',  en: 'Good'        },
'market.condition.fair':       { de: 'Gebraucht',   en: 'Fair'        },
```

- `market.state.{loading,empty.truly,empty.filtered,error,reserved,sold,altpapier,owner,pending,bildRejected,listingRejected}.*` (per state-matrix copy — note A8: `empty.filtered` and `empty.truly` are now distinct states)
- `market.novel.{bump,decay}.*` (per novel-features copy; **`market.novel.bundle.*` omitted** per A9 deferral)
- `market.backfill.banner` ("Diese Anzeige stammt aus der alten Marktplatz-Version…")
- `market.contact.reserved.softnote` ("Reserviert — du kannst trotzdem anfragen, falls der Deal nicht zustande kommt.") — per A7

Use the literal German + English strings from the JSX. **Curly quotes**: use `„…"` for German per READMEFIRST.

- [ ] **Step 2: Type-check + commit**

```bash
pnpm type-check && git add src/lib/kiosk-i18n.ts && \
git commit -m "i18n(marketplace): add kiosk marketplace strings (de + en)"
```

#### Task 1.3.5: `canMutateListing` DRY guard (Issue 2 — safe-by-default for future mutations)

**Files:**
- Create: `src/lib/listingActions.ts`

This helper isn't a fix for anything broken (Tasks 4.3, 5.1, 5.2 already gate pending correctly; only Task 5.3 has the gap, addressed in-place). Its purpose is **safe-by-default**: centralize the mutation precondition so the next mutation endpoint added to marketplace can't accidentally skip a check.

- [ ] **Step 1: Implement the helper**

```ts
// src/lib/listingActions.ts
import type { Listing } from '../types/listing';

export type CanMutateReason =
  | 'not_owner'
  | 'pending_review'
  | 'has_warning_label'
  | 'rejected'   // delete is allowed separately — caller handles
  | 'reserved'   // bump-blocked; other mutations may still be allowed
  | 'sold';      // most mutations blocked — caller decides

export interface CanMutateResult {
  ok: boolean;
  reason?: CanMutateReason;
}

export interface CanMutateOptions {
  allowOnReserved?: boolean;  // status endpoint allows reserved→sold transition
  allowOnRejected?: boolean;  // delete-from-rejected is legit
}

export function canMutateListing(
  listing: Pick<Listing, 'sellerId' | 'moderationStatus' | 'hasWarningLabel' | 'status'>,
  currentUserId: string,
  opts: CanMutateOptions = {},
): CanMutateResult {
  if (String(listing.sellerId) !== currentUserId) return { ok: false, reason: 'not_owner' };
  if (listing.moderationStatus === 'pending')     return { ok: false, reason: 'pending_review' };
  if (listing.hasWarningLabel)                    return { ok: false, reason: 'has_warning_label' };
  if (listing.moderationStatus === 'rejected' && !opts.allowOnRejected) {
    return { ok: false, reason: 'rejected' };
  }
  if (listing.status === 'reserved' && !opts.allowOnReserved) {
    return { ok: false, reason: 'reserved' };
  }
  if (listing.status === 'sold')                  return { ok: false, reason: 'sold' };
  return { ok: true };
}
```

- [ ] **Step 2: Apply at the four mutation sites**

| Endpoint | Call | Notes |
|---|---|---|
| `PUT /api/listings/edit/[id]` (Task 4.4) | `canMutateListing(listing, userId)` | Strictest — no overrides |
| `POST /api/listings/[id]/bump` (Task 5.2) | `canMutateListing(listing, userId)` | Strictest — bump is "fresh-up", needs clean state |
| `POST /api/listings/[id]/status` (Task 5.3) | `canMutateListing(listing, userId, { allowOnReserved: true })` | Reserved → sold is a one-click intended path per A7 |
| `DELETE /api/listings/delete/[id]` (existing) | `canMutateListing(listing, userId, { allowOnRejected: true })` | Owners must be able to delete rejected listings |

Each endpoint maps the `reason` to a stable error code:
- `'not_owner'` → 403
- `'pending_review'` → 409 `'edit_blocked_pending'` (or per-endpoint variant)
- `'has_warning_label'` → 409 `'edit_blocked_warning'`
- `'rejected'` → 409 `'edit_blocked_rejected'`
- `'reserved'` → 409 `'edit_blocked_reserved'`
- `'sold'` → 409 `'edit_blocked_sold'`

- [ ] **Step 3: OwnerActions UI** mirrors the helper via a derived store (already specified in Task 5.3 Step 3 — no change needed there; the helper just becomes the single source of truth for the button-disabled logic).

- [ ] **Step 4: Type-check + commit**

```bash
pnpm type-check
git add src/lib/listingActions.ts
git commit -m "feat(marketplace): canMutateListing helper for mutation-endpoint guards

DRY centralization across edit/bump/status/delete endpoints. Existing
endpoints already gate pending/owner correctly; this helper makes the
next mutation endpoint safe-by-default rather than retrofitting fixes."
```

#### Task 1.4: Add `Markt` entry to KioskNav

**Files:**
- Modify: `src/components/forum/kiosk/KioskNav.svelte`

- [ ] **Step 1: Add `marketplace` nav item**

Add a nav entry — `{ key: 'marketplace', href: '/marketplace', label: $t('nav.market') }` — that highlights when `active === 'marketplace'`. Match the existing pattern used for forum + calendar entries.

- [ ] **Step 2: Add `nav.market` i18n key** (`Markt` / `Market`) in `kiosk-i18n.ts`.

- [ ] **Step 3: Visual check + commit**

Run `pnpm dev`, hit `/` and `/calendar`, verify the new Markt entry appears in the nav. Commit:
```bash
git commit -m "feat(nav): add Markt entry to KioskNav"
```

#### Task 1.5: Build marketplace primitives

**Files:** all under `src/components/marketplace/kiosk/primitives/`

- [ ] **Step 1: `MarketStrap.svelte`** — 10-variant strap component. Port from `kiosk-marketplace.jsx:51-71`. Props: `kind` (enum of 10), `small` (boolean, default false). Use the `.kiosk-strap--*` CSS classes from tokens-marketplace.css. Pull label via `$t['market.strap.{kind}']`. Locked geometry; **only color varies** (per scoping §3).

- [ ] **Step 2: `CategoryChip.svelte`** — Port from `kiosk-marketplace.jsx:74-92`. Props: `id` (one of 9 kiosk cats), `active` (boolean), `mini` (boolean). Includes the 8px color dot. Falls back to `sonstiges` (gray-ish, no swatch dot) for legacy categories.

- [ ] **Step 3: `DeliveryPill.svelte`** — Port from `kiosk-marketplace.jsx:95-110`. Props: `kind` (3-variant). Returns null if undefined (legacy listings).

- [ ] **Step 4: `PriceTag.svelte`** — Port from `kiosk-marketplace.jsx:113-141`. Props: `listing`, `size` (`'sm' | 'md' | 'lg'`). Branches on `listing.listingType`: gift → `<MarketStrap kind="gratis" />`; exchange → `↔` glyph + Tauschvorschlag; sell → italic € numeral with optional VB suffix.

- [ ] **Step 5: `ListingImagePlaceholder.svelte`** — Port from `kiosk-marketplace.jsx:144-162`. Striped placeholder used when no image; falls back gracefully. Props: `category`, `ratio`, `label`, `lead`.

- [ ] **Step 6: Verify each primitive in isolation** via a temporary `/playground/market-primitives.astro` page (delete after the next phase verifies).

- [ ] **Step 7: Commit**

```bash
git add src/components/marketplace/kiosk/primitives/
git commit -m "feat(marketplace): kiosk primitives (MarketStrap, CategoryChip, DeliveryPill, PriceTag, ListingImagePlaceholder)"
```

---

### Phase 2: Browse (index page)

#### Task 2.1: Title block + filter rail

**Files:**
- Create: `src/components/marketplace/kiosk/browse/MarketTitleBlock.svelte`
- Create: `src/components/marketplace/kiosk/browse/MarketFilterRail.svelte`

- [ ] **Step 1: MarketTitleBlock** — Port from `kiosk-marketplace.jsx:337-358`. Includes:
  - DM Mono kicker `MARKT · DONNERSTAG 7. MAI · 09:14` in **wine** (per A10)
  - 56px display headline with carved-italic accent in **ochre** ("wechselt")
  - Stats line (listings count, new since yesterday, fresh marker)
  - CTA button (`+ neue anzeige` → `/marketplace/create`)

- [ ] **Step 2: MarketFilterRail** — Port from `kiosk-marketplace.jsx:363-421`. Two rows:
  - Kind toggle (Alle / Verkaufen / Tausch / Verschenken — pill-style, ink-filled when active) + Gespeichert + Meine Anzeigen + search input
  - Category row (8 cats + sonstiges) using `<CategoryChip>` primitives, with `kiosk-scroll-fade` on mobile

Both bind to URL search params (`?kind=verkaufen&cat=moebel&q=…&view=mine|saved|null`) via `goto` + `$page` from `$app/stores`.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(marketplace): kiosk browse — title block + filter rail"
```

#### Task 2.2: ListingLead (editorial page-1 hero)

**Files:**
- Create: `src/components/marketplace/kiosk/browse/ListingLead.svelte`

- [ ] **Step 1: Port** from `kiosk-marketplace.jsx:426-499`. Two-column desktop grid (1.35fr image + 1fr content):
  - Image side: `ListingImagePlaceholder lead` + 5-thumb strip below
  - Content side: `CategoryChip active`, 26px headline (carved-italic accent on first word in cat color), italic body lead-in, divider, price + delivery row, seller mini-strip
  - Top edge `★ HEUTE FRISCH IM KIEZ` strap (ink bg, paper text, ochre dot)
  - Lead motion: `.market-lead` settle animation on first paint (from `motion-marketplace.css`)
- [ ] **Step 2: Commit**

#### Task 2.3: ListingCard (3-col grid item)

**Files:**
- Create: `src/components/marketplace/kiosk/browse/ListingCard.svelte`

- [ ] **Step 1: Port** from `kiosk-marketplace.jsx:504-563`. Single-column card with:
  - Image area with **top-left strap stack** rendering in this order if present: `entwurf`, `bump` (if `lastBumpedAt > now - 24h`), `reserviert` (if status='reserved'), `altpapier` (if age ≥ 21d), `altbestand` (if legacy listing)
  - Image-count badge bottom-right
  - Body: cat chip + timestamp · headline · price + delivery · seller strip
  - Decay state: opacity 0.7 + saturate 0.6 when stale (CSS class `.market-stale`)
  - Hover lift via `.market-card` class
- [ ] **Step 2: Commit**

#### Task 2.4: SSR fetch + query options

**Files:**
- Create: `src/lib/marketplaceQueryOptions.ts` (pure constants — fields, sort, default limit)
- Create: `src/lib/listingsQuery.ts` (server-side fetch with auth + moderation filter + author lookup batching)
- Create: `src/hooks/api/useListingsQuery.ts`

- [ ] **Step 1: marketplaceQueryOptions** — DRY constants. Mirror `src/lib/forumQueryOptions.ts`. **Dependency-pure** (no MongoDB import) so it can be safely imported by both server + client. Define `DEFAULT_LISTINGS_QUERY_OPTIONS` with `fields`, `sortBy: 'updatedAt'`, `sortOrder: 'desc'`, `limit: 24`.

- [ ] **Step 2: listingsQuery (server)** — `fetchListingsForSSR(filters, userId)` composes a **`buildListingsFilter(userId)`** that wraps `buildModerationFilter(userId)` and layers marketplace status visibility on top (Issue 7):

```ts
// src/lib/listingsQuery.ts
import { buildModerationFilter } from './topicsQuery';
import type { Filter } from 'mongodb';

export function buildListingsFilter(userId: string | null): Filter<any> {
  // Moderation visibility (forum/calendar precedent — author sees own pending/rejected;
  // community-reported pending stays visible to all per anti-abuse rule)
  const modFilter = buildModerationFilter(userId);

  // Marketplace status visibility (per A7 + Issue 7):
  //   available         → visible to all
  //   reserved          → visible to all (soft-note copy invites backup contact)
  //   sold              → visible only to owner (in their 'mine' view)
  //   exchanged         → visible only to owner
  //   draft             → visible only to owner (in their 'mine' / 'Entwürfe' view)
  const statusFilter = userId
    ? {
        $or: [
          { status: { $in: ['available', 'reserved'] } },
          { sellerId: userId },  // owner sees their own at any status
        ],
      }
    : { status: { $in: ['available', 'reserved'] } };

  return { $and: [modFilter, statusFilter] };
}
```

The view-specific filters (`view: 'mine'` / `view: 'saved'`, `kind`, `cat`, `q`) layer on top of this base filter in the SSR fetch. Authors of stale listings (`createdAt < now - 60d`) still see them (Task 7.2 keeps the owner exception), but non-owners get them server-side-hidden.

- [ ] **Step 3: useListingsQuery hook** — TanStack Query 5 client wrapper. Takes filters as input, returns the same shape. queryKey: `['listings', filters]`. Accepts `extras.initialData` for SSR handoff.

#### Task 2.5: Browse orchestrator

**Files:**
- Create: `src/components/marketplace/kiosk/browse/MarketplaceBrowseInner.svelte`
- Create: `src/pages/marketplace.astro` (NEW route — the old `/marketplace/index.astro` is replaced)

- [ ] **Step 1: MarketplaceBrowseInner** — orchestrator that wires:
  - URL params → filter state (writable store)
  - `useListingsQuery(filters)` for the data
  - Renders TitleBlock + FilterRail + (lead if page=1 + no filters + view=all) + section divider + grid of ListingCards
  - Pagination — reuse Svelte inline pattern from blog/marketplace browse (12/24/48 per page)
  - Two distinct empty states (A8):
    - **Truly-empty** (no listings AT ALL in the Kiez) → render `MarketEmpty.svelte` with "Heute steht hier noch nichts. Magst du anfangen?" + `+ erste anzeige` CTA. No chips.
    - **Filtered-empty** (filters applied, 0 matches) → render `MarketSearchEmpty.svelte` with active filter chips (dismissible × on each) + "Nichts dabei." + `← Filter zurücksetzen` link (text link, not button). **No 🔔 alarm CTA** (per A8).
  - Error state → defer to Phase 6 panel; render plain placeholder until then.

- [ ] **Step 2: Rewrite `src/pages/marketplace/index.astro`**:
  - Replace dark-glass body with `KioskLayout` + `data-page="marketplace"` on `<body>`
  - Frontmatter calls `fetchListingsForSSR(filters, userId)` to get `initialListings`
  - Threads `initialListings` into `MarketplaceBrowseInner` via `client:only="svelte"` props
  - Adds `Cache-Control: no-store, must-revalidate` (per-user moderation visibility, mirror calendar pattern)
  - GlassFilters component is already mounted in BaseLayout — confirm KioskLayout inherits it

- [ ] **Step 3: Visual check (desktop)** — `pnpm dev` not auto-started; ask user to load http://localhost:3000/marketplace; verify cards render with correct cat colors, straps, prices, delivery pills, decay state on stale items, etc.

- [ ] **Step 4: Commit**

#### Task 2.6: Mobile parity (browse)

**Files:**
- Modify: `MarketplaceBrowseInner.svelte` (responsive)

- [ ] **Step 1: Mobile breakpoint behavior**:
  - Title block: 32px headline (smaller), single-line stats
  - Kind toggle: horizontal scroll-row with `kiosk-scroll-fade`
  - Category row: horizontal scroll-row with `kiosk-scroll-fade`
  - Lead: stacked (single column), 19px headline
  - Grid: single column
  - Mobile FAB: floating `+` wine button at `bottom-16 right-4 z-30 lg:hidden` (mirror calendar FAB pattern)

- [ ] **Step 2: Commit**

---

### Phase 3: Detail page

#### Task 3.1: DetailGallery

**Files:**
- Create: `src/components/marketplace/kiosk/detail/DetailGallery.svelte`

- [ ] **Step 1: Port** from `kiosk-marketplace-detail.jsx:16-83`. Lead image (16:10) + thumb strip (5 thumbs + "alle ansehen" overflow). Click lead → open lightbox dialog. Arrow keys + click `‹` `›` to nav. Esc to close. Mobile: same component, smaller geometry.

#### Task 3.2: SellerCard

**Files:**
- Create: `src/components/marketplace/kiosk/detail/SellerCard.svelte`

- [ ] **Step 1: Port** from `kiosk-marketplace-detail.jsx:239-282`. Avatar + name + member-since + listings-count + `VERIFIZIERT IM KIEZ` badge (moss) + rating chip + "weitere Anzeigen" + "melden" link. For v1: hard-code `VERIFIZIERT` for any user with verified email; rating chip pulls from a derived count of approved listings (no rating-collection in v1 — just `★★★★☆ N` where N = listing count). **Surface this** if rating logic should be defaulted differently.

#### Task 3.3: ContactForm + backend (A6)

**Files:**
- Create: `src/components/marketplace/kiosk/detail/ContactForm.svelte`
- Create: `src/emails/MarketplaceContactEmail.tsx` (React Email template, owner-direction)
- Create: `src/emails/ContactConfirmationEmail.tsx` (React Email template, sender BCC)
- Create: `src/pages/api/listings/[id]/contact.ts`
- Create: `src/hooks/api/useContactListingMutation.ts`

- [ ] **Step 1: ContactForm component** — Port from `kiosk-marketplace-detail.jsx:92-190`. Two states: `idle` + `sent`. Form fields: name (2–60) + email + message (20–600 chars). 600-char counter. Tausch-variant copy when `listing.listingType === 'exchange'`. Submit → mutation → on success → component swaps to `sent` state with `.market-contact-sent` animation. Privacy footer: 🔒 "no email addresses are revealed" — pulled from i18n.

  **Per A7** — when `listing.status === 'reserved'`, render an inline soft-note above the form: *"Reserviert — du kannst trotzdem anfragen, falls der Deal nicht zustande kommt."* (i18n key `market.contact.reserved.softnote`). Form stays interactive.

  **Per A6** — when `listing.moderationStatus === 'pending'`, the form is **disabled entirely** (don't render the inputs; render an info panel: *"Diese Anzeige wird gerade geprüft. Du kannst eine Nachricht senden, sobald die Prüfung abgeschlossen ist."*).

- [ ] **Step 2: Install Resend + React Email** (A6)

```bash
pnpm add resend @react-email/components
```

Add to `.env.example`: `RESEND_API_KEY=` (and document the sending-domain DNS setup in the deploy runbook — TBD which apex to verify with Resend).

- [ ] **Step 3: Build the two React Email templates** (`src/emails/`)

`MarketplaceContactEmail.tsx` — owner-direction:
- Kiosk-styled (paper warm bg, ink border, wine accent on the listing title block)
- Header: "Nachricht zu deiner Anzeige" / "Message about your listing"
- Body: sender name + listing title + message body
- Footer: "Antworte direkt auf diese E-Mail — sie geht direkt an {sender}. Mahalle hat die Adresse nicht offen geteilt." / "Reply directly to this email — it goes straight to {sender}. Mahalle did not share the address openly."

`ContactConfirmationEmail.tsx` — sender BCC:
- Header: "Deine Nachricht wurde gesendet." / "Your message was sent."
- Body: short confirmation + listing title link + the message they sent (so they have a record)
- Footer: "Antworten landen direkt in deinem Postfach." / "Replies arrive directly in your inbox."

- [ ] **Step 4: Add the honeypot field to the ContactForm component** (Issue 1)

In `ContactForm.svelte`, render a hidden input that bots tend to fill:

```svelte
<input
  type="text"
  name="website"
  value=""
  bind:value={honeypot}
  tabindex="-1"
  autocomplete="off"
  aria-hidden="true"
  style="position:absolute; left:-9999px; width:1px; height:1px; opacity:0;"
/>
```

Submit POSTs `{ name, email, message, website: honeypot }`. The endpoint silently 200s if `website` is non-empty (don't reveal the trap).

- [ ] **Step 5: Build `/api/listings/[id]/contact.ts` with full spam protection**

Per Issues 1, 8, 9: IP-hash rate limit, per-listing flood guard, honeypot drain, Origin-header CSRF check, env-driven sending domain. The body-retention policy from A6 stays (metadata only).

```ts
import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { z } from 'zod';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { moderateText, checkSpamWithGPT, mergeModerationResults } from '../../../../lib/moderation';
import MarketplaceContactEmail from '../../../../emails/MarketplaceContactEmail';
import ContactConfirmationEmail from '../../../../emails/ContactConfirmationEmail';

const ContactPayloadSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().email(),
  message: z.string().trim().min(20).max(600),
  website: z.string().max(200).optional(),  // HONEYPOT — bots fill this
});

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

// Issue 1: hash IP with a fixed salt before storing.
// We get the dedupe property without storing raw PII (GDPR).
const IP_SALT = import.meta.env.CONTACT_IP_SALT || ''; // require non-empty at boot in production
function hashIp(ip: string): string {
  return createHash('sha256').update(IP_SALT + ip).digest('hex').slice(0, 32);
}

// Issue 9: reject cross-origin POSTs. Anonymous endpoint, so this is the primary CSRF guard.
const ALLOWED_ORIGINS = (import.meta.env.ALLOWED_ORIGINS || 'https://mahalle.berlin').split(',');

export const POST: APIRoute = async ({ params, request, clientAddress }) => {
  // Issue 9: Origin header check
  const origin = request.headers.get('origin') || '';
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'invalid_origin' }), { status: 403 });
  }

  const body = await request.json();
  const parsed = ContactPayloadSchema.safeParse(body);
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });

  // Issue 1: HONEYPOT — silently 200 (don't reveal the trap; consume an attempt slot)
  if (parsed.data.website && parsed.data.website.length > 0) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const db = await connectDB();
  const senderEmail = parsed.data.email.toLowerCase();
  const senderIpHash = hashIp(clientAddress || 'unknown');
  const listingId = new ObjectId(params.id!);
  const now = Date.now();

  const listing = await db.collection('listings').findOne({ _id: listingId });
  if (!listing) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

  // A6: pending listings disable contact form on both sides
  if (listing.moderationStatus === 'pending') {
    return new Response(JSON.stringify({ error: 'listing_pending_review' }), { status: 409 });
  }

  // A6: 5/hour per sender-email + 3/day per sender-to-same-owner
  const hourlyByEmail = await db.collection('listingContacts').countDocuments({
    buyerEmail: senderEmail,
    sentAt: { $gte: new Date(now - ONE_HOUR) },
  });
  if (hourlyByEmail >= 5) return new Response(JSON.stringify({ error: 'rate_limited_hourly' }), { status: 429 });

  const dailyToOwner = await db.collection('listingContacts').countDocuments({
    buyerEmail: senderEmail,
    sellerId: listing.sellerId,
    sentAt: { $gte: new Date(now - ONE_DAY) },
  });
  if (dailyToOwner >= 3) return new Response(JSON.stringify({ error: 'rate_limited_daily_to_owner' }), { status: 429 });

  // Issue 1: per-IP hourly limit (catches rotating sender emails from same source)
  const hourlyByIp = await db.collection('listingContacts').countDocuments({
    senderIpHash,
    sentAt: { $gte: new Date(now - ONE_HOUR) },
  });
  if (hourlyByIp >= 10) return new Response(JSON.stringify({ error: 'rate_limited_ip' }), { status: 429 });

  // Issue 1: per-listing flood guard (catches single-listing harassment campaigns)
  const hourlyOnListing = await db.collection('listingContacts').countDocuments({
    listingId,
    sentAt: { $gte: new Date(now - ONE_HOUR) },
  });
  if (hourlyOnListing >= 20) return new Response(JSON.stringify({ error: 'listing_flooded' }), { status: 429 });

  // Moderate message
  const [textMod, spamMod] = await Promise.all([
    moderateText(parsed.data.message),
    checkSpamWithGPT(parsed.data.message, 'marketplace contact message'),
  ]);
  const merged = mergeModerationResults([textMod, spamMod]);
  if (merged.flagged) return new Response(JSON.stringify({ error: 'message_flagged' }), { status: 422 });

  const seller = await db.collection('users').findOne({ _id: new ObjectId(listing.sellerId) });
  if (!seller?.email) return new Response(JSON.stringify({ error: 'seller_unreachable' }), { status: 410 });

  // Issue 8: sending domain via env var (don't hardcode for staging/preview compatibility)
  const resend = new Resend(import.meta.env.RESEND_API_KEY);
  const sendingFrom = import.meta.env.SENDING_FROM_EMAIL || 'Mahalle <noreply@mahalle.berlin>';

  await resend.emails.send({
    from: sendingFrom,
    to: seller.email,
    replyTo: parsed.data.email,
    subject: `Mahalle: Nachricht zu „${listing.title}"`,
    html: await render(MarketplaceContactEmail({
      senderName: parsed.data.name,
      senderEmail: parsed.data.email,
      message: parsed.data.message,
      listing: { id: String(listing._id), title: listing.title },
    })),
  });

  await resend.emails.send({
    from: sendingFrom,
    to: parsed.data.email,
    subject: `Bestätigung: Nachricht zu „${listing.title}" gesendet`,
    html: await render(ContactConfirmationEmail({
      senderName: parsed.data.name,
      message: parsed.data.message,
      listing: { id: String(listing._id), title: listing.title },
    })),
  });

  // A6 retention policy: METADATA ONLY. NO message body persisted.
  await db.collection('listingContacts').insertOne({
    listingId,
    sellerId: listing.sellerId,
    buyerName: parsed.data.name,
    buyerEmail: senderEmail,
    senderIpHash,           // Issue 1 — hashed, not raw
    sentAt: new Date(),
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

**Required new env vars** (add to `.env.example` + README + Vercel project):
- `RESEND_API_KEY` — Resend secret
- `SENDING_FROM_EMAIL` — full From header, e.g. `Mahalle <noreply@mahalle.berlin>` (Issue 8)
- `CONTACT_IP_SALT` — random 32+ char string; fixed across deploys (rotating breaks dedupe; Issue 1)
- `ALLOWED_ORIGINS` — CSV of allowed Origin values, default `https://mahalle.berlin` (Issue 9; add preview-deploy URLs if needed)

Also: **partial index** on `listingContacts.sentAt` (for the time-window count queries) — add to the same `scripts/create-listing-indexes.ts` from Task 1.1 Step 9:
```ts
await db.collection('listingContacts').createIndex({ sentAt: -1 });
await db.collection('listingContacts').createIndex({ buyerEmail: 1, sentAt: -1 });
await db.collection('listingContacts').createIndex({ senderIpHash: 1, sentAt: -1 });
await db.collection('listingContacts').createIndex({ listingId: 1, sentAt: -1 });
```

- [ ] **Step 5: useContactListingMutation hook** — TanStack mutation that POSTs to the endpoint, surfaces 409 (pending) / 429 (rate-limited, both variants) / 422 (flagged) / 410 (seller unreachable) as user-facing toasts via the `app:toast` bridge. On 200 success, swap form to `sent` state.

- [ ] **Step 6: Commit**

#### Task 3.4: SpecStrip

**Files:**
- Create: `src/components/marketplace/kiosk/detail/SpecStrip.svelte`

- [ ] **Step 1: Port** from `kiosk-marketplace-detail.jsx:348-368` (desktop) + `:469-483` (mobile). 6-field grid (3 cols desktop, 2 cols mobile). **Only renders filled fields.** If `specs` is undefined or empty, the strip is omitted entirely.

#### Task 3.5: MarketDetailInner orchestrator

**Files:**
- Create: `src/components/marketplace/kiosk/detail/MarketDetailInner.svelte`
- Rewrite: `src/pages/marketplace/[id].astro`

- [ ] **Step 1: MarketDetailInner** — receives `{ listing, currentUserId, isOwner, lang }` via props. Renders the left column (gallery + title block with carved-italic accent in cat color + category chip + price + delivery + description + SpecStrip + action row: 🔖 merken/share/melden) and right sidebar (`OwnerActions` if owner else `ContactForm`, then `SellerCard`, then "Ähnliches im Kiez" list).

  Moderation visibility per forum + calendar parity:
  - If owner: `OwnStatusBanner` above description when `moderationStatus !== 'approved' || hasWarningLabel || isUserReported`
  - If non-owner + `moderationStatus === 'pending' && isUserReported`: show small `⚑ GEMELDET` chip near the meta line
  - Ghosting: opacity-70 + outline-dashed if owner sees pending/rejected/reported (mirror calendar pattern, not the forum border-dashed wrapping)
  - If `moderationStatus === 'rejected'` AND not owner: page renders 404 (already gated by `buildModerationFilter` in SSR fetch, but assert defensively).

- [ ] **Step 2: Rewrite `/marketplace/[id].astro`** to use a **hybrid SSR-static + island-hydrate pattern** (verified 2026-05-20 — see SEO verdict below).

```astro
---
// frontmatter: server-side fetch
const listing = await fetchListingForSSR(Astro.params.id, session?.user?.id);
if (!listing) return Astro.redirect('/marketplace?not_found=1');
const isOwner = session?.user?.id === String(listing.sellerId);
const c = resolveCategory(listing.category);
---
<KioskLayout page="marketplace" title={`${listing.title} · Marktplatz`}>
  <!-- SSR-rendered static fields: title, category, price-as-text, body, image src.
       Search engines + link-preview crawlers + assistive tech all see these
       directly in the raw HTML, without waiting for JS hydration. -->
  <article class="market-detail-ssr-shell" data-listing-id={listing._id}>
    <header>
      <span class="kiosk-kicker">{$t['market.detail.kicker']}</span>
      <h1 class="kiosk-headline">{listing.title}</h1>
      <p class="kiosk-category">{c.label}</p>
      {listing.listingType === 'sell' && (
        <span class="kiosk-price">{listing.price} €{listing.vb ? ' VB' : ''}</span>
      )}
    </header>
    <p class="kiosk-body">{listing.descriptionPlainText ?? listing.description}</p>
    {listing.images?.[0] && (
      <img src={listing.images[0]} alt={listing.title} loading="lazy" />
    )}
  </article>

  <!-- Interactive Svelte island hydrates over the static shell.
       Once hydrated, it replaces the shell with the full gallery + lightbox +
       ContactForm/OwnerActions + SellerCard + SpecStrip + "Ähnliches im Kiez".
       Inner uses initialListing to skip the API round-trip. -->
  <MarketDetailInner
    client:load
    initialListing={listing}
    isOwner={isOwner}
    currentUserId={session?.user?.id ?? null}
  />
</KioskLayout>
```

Server-side check `isOwner = session?.user?.id === listing.sellerId`. Cache-Control no-store (per-user moderation visibility).

**Why hybrid (not blanket `client:load`)**: empirical verification (2026-05-20) on forum's `topics/[id]` (which uses `client:only="svelte"`) found that the raw Googlebot-fetched HTML contains the `<title>` tag (good) but **zero body content** — only 255 chars of nav + footer chrome (`'Mahalle · Forum | Mahalle m mahalle SCHILLERKIEZ … Forum Kalender News Markt Kiez Blog DE EN … © 2026 …'`). Topic body, comments, post metadata are all client-hydrated. Forum's own homepage shows the same shape: 5 sampled topic titles, **0 found** in raw HTML. So switching marketplace detail's directive from `client:only` to `client:load` alone is not enough — the Svelte island may not be cleanly SSR-able anyway (TanStack Query, custom stores, mutation hooks have SSR-time gotchas). The hybrid pattern sidesteps that entirely: critical SEO content lives in the `.astro` template (which Astro definitely SSRs); the island layers on for interactivity.

**Marketplace specifically benefits**: a query like *"Eichentisch Schillerpromenade 180"* needs to find the listing via search. Body keywords ("Schillerpromenade", price, condition phrases) are what enable that. Without SSR-rendered body content, the listing is effectively invisible to non-Google crawlers (link previews, archive.org, third-party search aggregators) and ranks lower on body-keyword queries even on Google.

**Forum + calendar SEO follow-up (out of scope for this PR)**: forum's topic-detail and calendar's event-detail pages have the same gap. Worth a separate small PR after marketplace ships to apply the same hybrid pattern to those surfaces. Surfaced from this verification, not part of marketplace scope.

- [ ] **Step 3: Commit**

#### Task 3.6: Mobile detail

**Files:**
- Modify: `MarketDetailInner.svelte` (responsive)

- [ ] **Step 1: Mobile rearrangement** — DetailGallery (smaller), title block (26px headline), price + delivery, description, SpecStrip (2-col), SellerCard, ContactForm/OwnerActions inline (no modal), sticky bottom bar with "↑ nachricht senden" + 🔖 bookmark icon.

- [ ] **Step 2: Commit**

---

### Phase 4: Compose flow

#### Task 4.1: Compose primitives

**Files:** all under `src/components/marketplace/kiosk/compose/`

- [ ] **Step 1: KindPicker** — Port `kiosk-marketplace-compose.jsx:34-75`. 3-card radio. Active card fills with kind-color (wine/teal/moss).

- [ ] **Step 2: ImageSlots** — Port `:78-122`. 5-slot grid. "HAUPT" badge on slot 0; numeric 2–5 on others. Drag-reorder via `svelte-dnd-action` or HTML5 drag (existing wizard uses HTML5 — match pattern). Click slot to open file picker; ✕ to remove.

- [ ] **Step 3: ComposePreview** — Port `:125-239`. Two render states: placeholder (when no kind/cat) + live preview (mounts a real `<ListingCard>` with `pointerEvents: none`). Bottom: checklist with 6 line-items. Publishing-state shows ochre `KI-CHECK LÄUFT` banner.

- [ ] **Step 4: OptionalDetails** — Port `:426-460`. 6 free-text input rows in 3-col grid. Header copy via i18n. Bottom moderation notice.

- [ ] **Step 5: DeliveryRadios** — Port `:395-422`. 3 radio rows in §05 right column.

- [ ] **Step 6: Commit**

#### Task 4.2: MarketComposeInner orchestrator

**Files:**
- Create: `src/components/marketplace/kiosk/compose/MarketComposeInner.svelte`
- Create: `src/components/marketplace/kiosk/compose/MarketComposeStickyPublish.svelte`

- [ ] **Step 1: MarketComposeInner** — single-page form. Accepts `mode: 'create' | 'edit'` + `initialListing` (for edit). Two-column layout (1.6fr form + 1fr sticky preview). Six form sections (§01 Kind, §02 Category, §03 Title+Body, §04 Photos, §05 Price+Delivery, §06 Optional Details). Auto-save to localStorage draft on each keystroke (mirror calendar eventDraft pattern). On publish:
  - Mode `create`: POST `/api/listings/create` with full payload
  - Mode `edit`: PUT `/api/listings/edit/[id]` (re-runs moderation server-side; UI shows "publishing" state)
  - On success: flash redirect to `/marketplace?just_posted=1` (create) or `/marketplace?just_edited=1` (edit)

  Edit-mode also gates: if `listing.moderationStatus !== 'approved' || hasWarningLabel`, redirect to `/marketplace?edit_blocked=1` (matches calendar pattern).

- [ ] **Step 2: MarketComposeStickyPublish** — mobile sticky bottom bar. "vorschau" (ghost) + "veröffentlichen →" (primary).

- [ ] **Step 3: Commit**

#### Task 4.3: Create + edit pages

**Files:**
- Create: `src/pages/marketplace/create.astro`
- Create: `src/pages/marketplace/edit/[id].astro`

- [ ] **Step 1: create.astro** — KioskLayout, auth-gated (redirect to `/login?redirect=/marketplace/create`), mounts `<MarketComposeInner mode="create" client:only="svelte" />`.

- [ ] **Step 2: edit/[id].astro** — KioskLayout, gates auth → owner → moderation (`approved && !hasWarningLabel`). Redirects with flash queries on each fail (same pattern as `/events/edit/[id].astro:1-50`). Mounts `<MarketComposeInner mode="edit" initialListing={...} client:only="svelte" />`.

- [ ] **Step 3: Commit**

#### Task 4.4: Extend create + edit + draft endpoints for new fields

**Files:**
- Modify: `src/pages/api/listings/create.ts`
- Modify: `src/pages/api/listings/edit/[id].ts`
- Modify: `src/pages/api/listings/draft.ts`
- Modify: `src/pages/api/listings/draft/[id]/publish.ts`

- [ ] **Step 1: Thread new fields** — `listingType` accepts new 3-enum, `category` accepts new 8-enum (Zod schema already extended in Task 1.1), `delivery` accepts new enum, `specs` accepts new optional object. Persist to MongoDB as-is.

- [ ] **Step 2: Edit endpoint** — re-runs `moderateText + checkSpamWithGPT + checkImagesWithGPT` in parallel on every edit (mirror calendar pattern at `src/pages/api/events/edit/[id].ts`). Block edits with `403 'edit_blocked_by_moderation'` when existing listing is `pending/rejected` or `hasWarningLabel`.

- [ ] **Step 3: Commit**

#### Task 4.5: Flash redirect handling on `/marketplace`

**Files:**
- Modify: `src/components/marketplace/kiosk/browse/MarketplaceBrowseInner.svelte`

- [ ] **Step 1: Mount $effect on flash params** — consume `?just_posted=1` / `?just_edited=1` / `?just_edited=pending` / `?edit_blocked=1` and emit the right toast via `dispatchToast()`. Then `window.history.replaceState` to strip the flag. Invalidate `['listings']` query keys to refetch. (Mirror `src/components/calendar/kiosk/CalendarPageInner.svelte` flash effect.)

- [ ] **Step 2: Commit**

---

### Phase 5: Owner lifecycle (detail page)

#### Task 5.1: OwnerActions

**Files:**
- Create: `src/components/marketplace/kiosk/detail/OwnerActions.svelte`
- Create: `src/components/marketplace/kiosk/detail/PendingLockBanner.svelte`

- [ ] **Step 1: OwnerActions** — Port from `kiosk-marketplace-detail.jsx:193-236`. Header strip with stats (watching, views). If `pending` prop is true (passed from parent based on listing.moderationStatus), render `PendingLockBanner` and disable all action buttons via `opacity-40` + `pointer-events: none`. Otherwise show 2×2 button grid: bearbeiten / frisch hochholen / als reserviert / als verkauft. Plus delete-link.

- [ ] **Step 2: Wire mutation handlers** — see Task 5.2, 5.3.

#### Task 5.2: Bump endpoint + mutation (A5)

**Files:**
- Create: `src/pages/api/listings/[id]/bump.ts`
- Create: `src/hooks/api/useBumpListingMutation.ts`

- [ ] **Step 1: Endpoint** — POST. Session-gated (must be owner). Multiple guards per A5 + A7:
  - **403** if not owner
  - **409 `'bump_blocked_by_status'`** if `status !== 'available'` (can't bump reserved/sold/draft per A7)
  - **409 `'bump_blocked_by_moderation'`** if `moderationStatus !== 'approved' || hasWarningLabel` (per A5: bumps don't bypass moderation)
  - **429 `'bump_rate_limited'`** if `lastBumpedAt && < 7d ago`, returning `retryAt` for toast formatting

```ts
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
// inside handler, after auth + owner check:
const listing = await db.collection('listings').findOne({ _id: new ObjectId(params.id!) });
if (!listing) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

if (listing.status !== 'available') {
  return new Response(JSON.stringify({ error: 'bump_blocked_by_status' }), { status: 409 });
}
if (listing.moderationStatus !== 'approved' || listing.hasWarningLabel) {
  return new Response(JSON.stringify({ error: 'bump_blocked_by_moderation' }), { status: 409 });
}
if (listing.lastBumpedAt && Date.now() - new Date(listing.lastBumpedAt).getTime() < ONE_WEEK) {
  return new Response(JSON.stringify({
    error: 'bump_rate_limited',
    retryAt: new Date(new Date(listing.lastBumpedAt).getTime() + ONE_WEEK),
  }), { status: 429 });
}
const now = new Date();
await db.collection('listings').updateOne(
  { _id: new ObjectId(params.id!) },
  { $set: { lastBumpedAt: now, updatedAt: now } }
);
```

Note: `updatedAt` updates here purely for cache-invalidation purposes. **Stale-decay age keys off `createdAt`, NOT `updatedAt`** (see A5 + Task 7.2), so bumping does NOT reset altpapier.

- [ ] **Step 2: Server-side projection — `lastBumpedAt` is owner-only** (A5)

In `src/lib/listingsQuery.ts`, when projecting fields for non-owner reads, **omit `lastBumpedAt`**. Compute the derived `bumped` boolean server-side and project that instead. This prevents leaking owner bump-cadence patterns.

```ts
// in fetchListingsForSSR / fetchListingsByFilters / single-listing fetch:
const projection = isOwnerOrAdmin
  ? { ...FIELDS_FULL, lastBumpedAt: 1 }
  : { ...FIELDS_FULL, lastBumpedAt: 0 };
// Then in the post-processing step, derive `bumped` from lastBumpedAt if owner;
// non-owners see only the public derived flag.
```

- [ ] **Step 3: Mutation hook** — optimistic update: set `lastBumpedAt` to now in cache, rollback on error, single invalidation on `onSettled`. Surface 409 + 429 errors as toasts with appropriate copy (`bump_blocked_by_status` → "Reservierte/verkaufte Anzeigen können nicht hochgeholt werden"; 429 → formatted retry date).

- [ ] **Step 3: Commit**

#### Task 5.3: Status transitions (reserved / sold)

**Files:**
- Create: `src/pages/api/listings/[id]/status.ts`
- Create: `src/hooks/api/useListingStatusMutation.ts`

- [ ] **Step 1: Endpoint** — POST. Session-gated owner. Payload `{ status: 'available' | 'reserved' | 'sold' }`. Per A7:
  - Valid transitions: `available ↔ reserved` (both directions), `available → sold`, `reserved → sold` (one-click skip), `sold → available` (un-mark, rare but allowed)
  - Invalid: `sold → reserved`, anything → `draft`
  - When transitioning to `reserved`: set `reservedAt: now`
  - When transitioning OUT of `reserved`: set `reservedAt: null`
  - **No automatic 48h expiry. No waitlist collection.** Owner owns the state.

```ts
import { canMutateListing } from '../../../../lib/listingActions';

const VALID_TRANSITIONS: Record<string, string[]> = {
  available: ['reserved', 'sold'],
  reserved:  ['available', 'sold'],  // sold-from-reserved is the one-click skip
  sold:      ['available'],          // un-mark (rare but allowed)
  // draft, exchanged: no transitions via this endpoint
};

// after auth + body parse + listing fetch:

// Issue 2: pending=read-only guard via shared helper.
// allowOnReserved: true — status transitions are how owners exit reserved.
const guard = canMutateListing(listing, userId, { allowOnReserved: true });
if (!guard.ok) {
  const httpStatus = guard.reason === 'not_owner' ? 403 : 409;
  return new Response(JSON.stringify({ error: `status_blocked_${guard.reason}` }), { status: httpStatus });
}

const current = listing.status;
const target  = parsed.status;
if (!VALID_TRANSITIONS[current]?.includes(target)) {
  return new Response(JSON.stringify({ error: 'invalid_transition' }), { status: 400 });
}
const update: any = { status: target, updatedAt: new Date() };
if (target === 'reserved') update.reservedAt = new Date();
if (current === 'reserved' && target !== 'reserved') update.reservedAt = null;
await db.collection('listings').updateOne({ _id: listingId }, { $set: update });
```

- [ ] **Step 2: Mutation hook** — optimistic update for the new status + `reservedAt`. Rollback on error. Single invalidation. Surface `invalid_transition` as a toast.

- [ ] **Step 3: OwnerActions UI changes** (Task 5.1 already creates the buttons; this step wires the soft-copy + state-aware button visibility):
  - **Reserve button**: visible when `status === 'available'`; label `"als reserviert markieren"` / `"mark reserved"`
  - **Un-reserve button**: visible when `status === 'reserved'`; label `"Reservierung aufheben"` / `"clear reservation"`
  - **Sold button**: visible when `status === 'available'` OR `status === 'reserved'` (one-click skip); label `"als verkauft markieren"` / `"mark sold"`
  - **Bump button**: visible when `status === 'available'` AND `moderationStatus === 'approved'` AND `!hasWarningLabel` AND `lastBumpedAt < now - 7d` (or `lastBumpedAt == null`). **Disabled (greyed) with tooltip otherwise** — never hidden, per the forum/calendar precedent (visible disabled = clearer signal than absence).
  - **Edit button**: same gating as forum/calendar (`moderationStatus === 'approved' && !hasWarningLabel`). Disabled with tooltip otherwise.

- [ ] **Step 3: Commit**

#### Task 5.4: BackfillBanner (per scoping §2)

**Files:**
- Create: `src/components/marketplace/kiosk/states/BackfillBanner.svelte`

- [ ] **Step 1: Render** owner-only banner when listing uses a legacy category (in the 10-cat legacy set) OR `listingType` was never written by kiosk compose (best signal: `delivery === undefined && specs === undefined && createdAt < kiosk-launch-date`). Banner copy from i18n: *"Diese Anzeige stammt aus der alten Marktplatz-Version. Auffrischen, um sie sichtbarer zu machen?"* with CTA → `/marketplace/edit/{id}?from=backfill`. CTA pre-fills the form with what we have; user fills in new category + delivery + optional specs and re-publishes (runs moderation).

- [ ] **Step 2: Mount** in `MarketDetailInner.svelte` above the description block (owner-only branch).

- [ ] **Step 3: Commit**

---

### Phase 6: States + moderation visibility

#### Task 6.1: State panels

**Files:** all under `src/components/marketplace/kiosk/states/`

- [ ] **Step 1: MarketSkeletonGrid** — Port from `kiosk-marketplace-states.jsx:42-56` SkeletonCard. 6 cards in 3-col grid with `.market-skeleton::after` shimmer.

- [ ] **Step 2: MarketEmpty** — Port from `:146-156`. "Heute steht hier noch nichts. Magst du anfangen?" + CTA `+ erste anzeige`.

- [ ] **Step 3: MarketSearchEmpty** — Per A8 (saved-search alerts removed), render with active-filter chips (dismissible) + "Nichts dabei." + `← Filter zurücksetzen` link. **Omit** the `🔔 alarm setzen` CTA.

- [ ] **Step 4: MarketError** — Port from `:181-196`. Top banner (danger bg, paper text) + retry link. Below: cached listings rendered at opacity 0.7 if available.

- [ ] **Step 5: Wire into `MarketplaceBrowseInner.svelte`** — replace the placeholder branches with these panels.

- [ ] **Step 6: Commit**

#### Task 6.2: Moderation visibility (parity with forum + calendar)

**Files:**
- Modify: `ListingCard.svelte`
- Modify: `MarketDetailInner.svelte`

- [ ] **Step 1: Author-only ghosting on `ListingCard`**:
  - `pending` → `outline outline-dashed outline-warn outline-offset-[-2px]` + body opacity-70 (calendar pattern, not forum's wrapping border-dashed)
  - `reported` (`pending && isUserReported`) → `outline-plum` + opacity-70
  - `rejected` → `outline-danger` + opacity-70

- [ ] **Step 2: Badge precedence chip on `ListingCard`** — `inferredBadge` derive (same as calendar/forum). Place chip in the top-left strap stack: small `StatusBadge` reused from `src/components/forum/kiosk/StatusBadge.svelte`.

- [ ] **Step 3: Non-author "⚑ GEMELDET" chip** — when `isUserReported && pending` for non-author, render `⚑ GEMELDET` chip on card (anti-stigma; matches forum pattern).

- [ ] **Step 4: Sort rejected to top of owner view** — when `view === 'mine'`, stable-sort with rejected first.

- [ ] **Step 5: OwnStatusBanner reuse on detail page** — mount `<OwnStatusBanner />` (from `src/components/forum/kiosk/states/OwnStatusBanner.svelte`) at the top of `MarketDetailInner` description block when current user is owner AND status is not approved.

- [ ] **Step 6: Commit**

#### Task 6.3: ListingRejectedPanel (owner-only detail view)

**Files:**
- Create: `src/components/marketplace/kiosk/states/ListingRejectedPanel.svelte`

- [ ] **Step 1: Port** from `kiosk-marketplace-states.jsx:288-315`. Renders the rejected listing as `dim` + `✕` overlay alongside a paper-soft panel showing rejection reason + appeal CTA. Mount in `MarketDetailInner` when `isOwner && moderationStatus === 'rejected'`.

- [ ] **Step 2: Commit**

#### Task 6.4: KioskReportModal wire-up

**Files:**
- Modify: `MarketDetailInner.svelte`

- [ ] **Step 1: Mount `<KioskReportModal contentType="listing" />`** (shared component already exists at `src/components/forum/kiosk/KioskReportModal.svelte`). Trigger via `⚑ melden` link in detail page action row. Hide for guests (`{#if currentUserId && !isOwner}`).

- [ ] **Step 2: Confirm `/api/reports/submit` already accepts `contentType: 'listing'`** — if not, extend it.

- [ ] **Step 3: Commit**

---

### Phase 7: Novel features

#### Task 7.1: Bump module (UI wiring)

Bump endpoint + mutation already built in Task 5.2. This task adds the visual feedback:

**Files:**
- Modify: `ListingCard.svelte`

- [ ] **Step 1: Derive `bumped` state at render time** — `bumped = lastBumpedAt && now - lastBumpedAt < 24h`. When true, render `<MarketStrap kind="bump" />` in the strap stack.

- [ ] **Step 2: Animate bump** — when listing transitions to bumped (TanStack cache update), apply `.market-bump` class for the 380ms pop-in. Use `untrack` or a one-shot timer to remove the class.

- [ ] **Step 3: Commit**

#### Task 7.2: Freshness decay

**Override of spec** (per A5): stale decay keys off **`createdAt`**, NOT `updatedAt` (spec novel-features.jsx:160 wrote `age = now - updatedAt` — this is wrong because bumps + edits would let an owner indefinitely escape altpapier, defeating the feature's purpose). The user explicitly overrode the spec on this point.

**Files:**
- Modify: `ListingCard.svelte`
- Modify: `src/lib/listingsQuery.ts`

- [ ] **Step 1: Render-time decay** — derive `stale = (Date.now() - new Date(listing.createdAt).getTime()) >= 21 * ONE_DAY`. When true: apply `.market-stale` class + render `<MarketStrap kind="altpapier" />` in the strap stack. The strap stack `Altbestand + altpapier + bump` is **all legal simultaneously** — a legacy listing that's old and just got bumped can wear all three. Spec values: opacity 0.6 + saturate 0.45 (from `.market-stale` in `motion-marketplace.css`).

- [ ] **Step 2: Server-side hide at 60d** — extend `buildListingsFilter` (in `listingsQuery.ts`) to exclude listings where:
  - `createdAt < now - 60d` AND
  - `status === 'available'` AND
  - viewer is not the owner
  
  Owner still sees their own stale-but-hidden listings (so the BackfillBanner / "auffrischen" CTA can reach them).

- [ ] **Step 3: Refresh CTA for owner** — in `OwnerActions`, when listing is stale (`age >= 21d`), the existing bump button copy + tooltip changes to `↻ auffrischen` (i18n key `market.owner.refresh.cta`). It calls the same bump endpoint — bumping is the refresh action. Note: per A5, **a bump does NOT clear the altpapier strap** (stale-age is from `createdAt`, not `lastBumpedAt`). The refreshed listing wears `altpapier + FRISCH HOCHGEHOLT` simultaneously for 24h, then `altpapier` alone, then back to feed-rotation by `lastBumpedAt` sort boost.

- [ ] **Step 4: Commit**

#### Task 7.3: Bundles (DEFER per A9)

Per A9 default, defer bundles to a follow-up PR. Stub:

**Files:**
- Modify: `src/types/listing.ts` (already reserved `bundleId?` field in Task 1.1)
- Modify: `src/components/marketplace/kiosk/CLAUDE.md` (created in Task 8.1)

- [ ] **Step 1: Record the un-defer trigger conditions in `src/components/marketplace/kiosk/CLAUDE.md`** (Issue 10 — not just a "see spec" note; actionable criteria so the deferral doesn't drift into "forgotten TODO"):

```markdown
### Bundles (deferred to follow-up PR)

Spec: `design/handoffs/design_handoff_marketplace/jsx/kiosk-marketplace-novel.jsx:166-213` (block-commented as `// DEFERRED` per Task 1.0). Scoping: `MARKETPLACE_SCOPING.md` §03.

Schema reserves `bundleId?: ObjectId` nullable FK on the `listings` collection + partial index (`scripts/create-listing-indexes.ts`).

**Un-defer trigger conditions** — build bundles when 2-3 of the following signals appear in production:
1. Owners writing "siehe auch meine andere Anzeige" / "see also my other listing" in description bodies (search the `listings` collection for these phrases).
2. Repeat-seller patterns — one user with 5+ simultaneously-active listings (query `listings` grouped by `sellerId` where `status = 'available'`).
3. Forum / `/admin/moderation` reports asking "kann man mehrere Sachen zusammen verkaufen?" or equivalent.

Until then: `bundleId` stays null on all listings. The Bundle UI surfaces (`BundleCard`, `BundleCompose`, `BundleDetail`) and the auto-dissolve cron are out-of-scope.
```

- [ ] **Step 2: Confirm `bundleId?` field + partial index landed in Task 1.1** (already specified there; this is just a verification step).

---

### Phase 8: Polish + retire legacy

#### Task 8.1: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (root)
- Create: `src/components/marketplace/kiosk/CLAUDE.md`

- [ ] **Step 1: Move marketplace from "Still on legacy" → "Migrated"** in root CLAUDE.md sections.

- [ ] **Step 2: Create `src/components/marketplace/kiosk/CLAUDE.md`** — subtree-local notes following the forum + calendar pattern. Document: page-accent rule (wine kicker + ochre italic), strap precedence in `ListingCard`, backfill rule, contact-form relay design, Resend env var, bump rate-limit, freshness decay thresholds.

- [ ] **Step 3: Add pointer in root CLAUDE.md** to the new subtree file.

#### Task 8.2: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update migration-status table** — Marketplace `🚧 → ✅ Kiosk (Svelte)`.

- [ ] **Step 2: Add `RESEND_API_KEY` to env vars list**.

- [ ] **Step 3: Update Features section** — replace legacy marketplace bullet with kiosk reality (multi-kind, 8 categories, editorial lead, contact-form relay, bumps + decay).

#### Task 8.3: Legacy deletion sweep (verification + i18n + tests)

**Per A12: legacy components are deleted commit-by-commit alongside their replacements throughout Phases 2–7, NOT bundled here.** This task is the final sweep to confirm nothing was missed.

The co-located add+delete commits happen as:

| New kiosk surface lands | Same-commit legacy deletion |
|---|---|
| Task 2.5 (browse orchestrator + rewritten `marketplace/index.astro`) | `MarketplaceBrowse.svelte`, `ProductCard.svelte`, `ProductFilters.svelte`, `SearchBar.svelte` |
| Task 3.5 (detail orchestrator + rewritten `marketplace/[id].astro`) | `ProductDetail.svelte`, `RichTextDisplay.svelte`, `ImageCropper.svelte`, `ReportListingModal.svelte` |
| Task 4.3 (`marketplace/create.astro` + `marketplace/edit/[id].astro`) | `ListingWizard.svelte`, `wizard/{BasicDetailsStep,PhotoUploadStep,PricingStep,ReviewStep}.svelte`, `RichTextEditor.svelte`, `pages/marketplace/sell.astro` |
| Task 5.1 (OwnerActions) | `MyListingsDashboard.svelte`, `dashboard/{ListingsTable,StatsCards}.svelte`, `pages/marketplace/my-listings.astro` |

Each of those tasks gets a sub-step "Step N: delete legacy counterparts" with a `git rm` list. The deletion must be in the SAME commit that introduces the kiosk replacement, so no intermediate commit has both old + new in a half-routed state.

This task (8.3) is the **final inventory check** to catch anything overlooked.

- [ ] **Step 1: Inventory imports** — before this task fires, every legacy file should be either deleted or accounted for. Verify:

```bash
ls src/components/marketplace/*.svelte 2>/dev/null
ls src/components/marketplace/wizard/*.svelte 2>/dev/null
ls src/components/marketplace/dashboard/*.svelte 2>/dev/null
ls src/pages/marketplace/sell.astro src/pages/marketplace/my-listings.astro 2>/dev/null
```
Expected: only `src/components/marketplace/kiosk/**` survives. The marketplace pages tree contains only `index.astro`, `[id].astro`, `create.astro`, `edit/[id].astro`.

- [ ] **Step 2: Triage shared utilities** — if any files at `src/components/marketplace/` (NOT under `kiosk/`) survived because new code still imports from them, **move them to `src/lib/marketplace/`** to signal "shared scaffolding, not legacy UI." Candidates: any pure utility (price formatters, validation helpers, Cloudinary upload wrappers). Re-target imports.

- [ ] **Step 3: External coupling check**

```bash
grep -rn "from.*['\"].*components/marketplace[^k]" src/ --include="*.astro" --include="*.svelte" --include="*.ts" --include="*.tsx"
```
Any hit that's NOT under `components/marketplace/kiosk/` is a stale import that needs re-targeting (probably at a shared utility moved to `src/lib/marketplace/` in Step 2).

- [ ] **Step 4: Test replacement check** — if legacy components had test files (`*.test.tsx` / `*.test.ts`), verify each has a kiosk-equivalent test landing in this PR:

```bash
git log --diff-filter=D --name-only | grep -E "components/marketplace/.*test\.(ts|tsx)$"
git log --diff-filter=A --name-only | grep -E "components/marketplace/kiosk/.*test\.(ts|tsx)$"
```
If counts don't match, flag the gap before merging.

- [ ] **Step 5: i18n key sweep** — separate commit, fires AFTER all components have landed.

**Heuristic** (not a verdict — template strings like `$t['market.cat.' + id]` escape literal grep, so the diff is a hint to investigate, not a list to delete blindly):

```bash
grep -rhoE '\$t\[["\047][a-z][a-zA-Z0-9.\-_]+["\047]\]' src/ | sort -u > /tmp/used-keys.txt
node -e "const i = require('./src/lib/kiosk-i18n.ts'); console.log(Object.keys(i.dict.de).join('\n'))" | sort -u > /tmp/declared-keys.txt
diff /tmp/declared-keys.txt /tmp/used-keys.txt
```

Walk the "declared but not literal-grep-found" list manually. For each candidate orphan: confirm it's not constructed via template before deleting. Orphan keys are cheap (~50 bytes each) — when in doubt, leave it. Commit as `chore(i18n): remove confirmed-orphan marketplace legacy keys`.

- [ ] **Step 6: Commit**

#### Task 8.4: Final verification

- [ ] **Step 1: Full type-check**: `pnpm type-check`
- [ ] **Step 2: Production build**: `pnpm build` — confirm no client-bundle has accidental MongoDB / `auth-astro/server` import (the "server-only modules bleeding" gotcha from root CLAUDE.md). Open the built `marketplace` chunk in `.vercel/output` to scan for `mongodb` strings.
- [ ] **Step 3: Browser walkthrough** (playwright-cli or manual): browse → filter (kind + cat + saved + mine) → empty states (filtered + truly-empty) → click card → contact form (idle + sent + pending-disabled + reserved-soft) → owner view (bump rate-limit + reserve + sold + delete) → compose (blank + filled + publish) → edit (gated by moderation; legacy listing forces category + delivery re-pick) → all state surfaces.
- [ ] **Step 4: i18n parity check** — toggle DE/EN, verify every string flips correctly. Pay special attention to condition labels (i3 mapping).
- [ ] **Step 5: Mobile parity check** — same walkthrough on viewport 390×844. Confirm sticky-bar clearance over `KioskFooter`.
- [ ] **Step 6: Email smoke test** — send a contact via the form to a test address. Verify (a) owner-direction email arrives with replyTo header set to sender; (b) sender-confirmation email arrives in sender's inbox; (c) reply from owner's inbox routes to sender. Confirm Resend domain DNS is set up.
- [ ] **Step 7: PR description** — name the rollback story explicitly (per A12): *"All schema changes are additive (no column drops, no destructive enum changes). Rollback path: `git revert <PR>`, then drop new columns in follow-up. Down migrations are reversible."*
- [ ] **Step 8: Commit final docs.**

---

## 3 · Out-of-scope (per spec, do not build)

- **Suchen** kind / `gesucht` strap (scoping §1, §7)
- **Leihen** (scoping §1)
- **Curated lead-of-the-day** — algorithmic only (scoping §6)
- **DM threads** — contact form relay only (v1.1)
- **Per-image moderation UX** — gated on per-image vision-mod API extension (READMEFIRST + scoping §4)
- **Buyer-initiated soft-lock + waitlist** (A7 default)
- **Saved-search alerts** (v1.1 + A8)
- **Tausch matching cron** (v1.1)
- **Pickup-spot map / spot picker** (v1.1)
- **Bundles** (A9 default — defer to follow-up PR)

---

## 4 · References

- Spec dir: `design/handoffs/design_handoff_marketplace/` (all 5 JSX + tokens.css + motion.css + READMEFIRST + MARKETPLACE_SCOPING)
- Self-contained design canvas: `design/handoffs/design_handoff_marketplace/Mahalle Redesign.html`
- Forum kiosk pattern (reference): `src/components/forum/kiosk/` + `src/components/forum/kiosk/CLAUDE.md`
- Calendar kiosk pattern (reference, especially edit-page + flash-redirect + cache-bust + moderation parity): `src/components/calendar/kiosk/` + `src/components/calendar/kiosk/CLAUDE.md`
- Shared kiosk tokens: `src/styles/tokens.css`
- Shared kiosk i18n: `src/lib/kiosk-i18n.ts`
- Shared kiosk layout: `src/layouts/KioskLayout.astro`
- Existing listings API: `src/pages/api/listings/`
- Existing listings schema: `src/schemas/listing.schema.ts` + `src/types/listing.ts`
- Moderation pipeline: `src/lib/moderation.ts`
- Sentry plan (deferred sibling work): `docs/plans/sentry-integration.md`

---

## 5 · Notes on plan philosophy

This plan deliberately tracks the spec line-by-line. Where the spec is unambiguous, the task is a direct port of the JSX into Svelte. Where the spec is ambiguous (A1–A12), the default is documented inline and gated on human confirmation. **Do not start execution without resolving A1–A12 first.**

The plan does **not** prescribe TDD-with-failing-tests because:
- The Forum + Calendar kiosk redesigns (commits `3eccfb50`, `e5eda400`, `3bad8d15`, `4c0c1956`, `606a9d8c`) did not ship with new unit tests for UI components.
- The existing verification pattern is: `pnpm type-check` → `pnpm build` → manual browser check (playwright-cli for headless verification).
- Adding a test harness for marketplace alone would be out-of-scope; if test coverage is wanted, that's a separate plan.

Where end-to-end behavior matters (contact-form moderation, bump rate-limit, edit-block-by-moderation), the relevant API route should get a smoke test via a tracked HTTP call captured during browser walkthrough.

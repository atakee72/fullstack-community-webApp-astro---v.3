# Marketplace (kiosk) notes

> **A5 superseded May 2026** — see "Bump — no rate limit" and "Freshness decay
> & public visibility" sections below. The original A5 (7-day cooldown +
> altpapier strap that bump didn't clear + 60d hide) was replaced by a single
> 21-day threshold that *hides* past-21d listings from public entirely + bump
> as freshness reset + no rate limit.


Loaded lazily when Claude reads/edits files in `src/components/marketplace/kiosk/` (or any subtree). The root `CLAUDE.md` keeps a pointer to this file so it can be pulled in even when working on related files outside this directory (e.g. `src/pages/api/listings/`, `src/lib/listingActions.ts`, `src/lib/listingsQuery.ts`).

### Page-accent rule (dual accent)
- Marketplace uses **two** accents — not one:
  - `--k-accent: var(--k-wine)` — kickers (mono-uppercase eyebrows like `MARKTPLATZ`) and default surface accents. Wine is also the marketplace FAB color.
  - `--k-accent-italic: var(--k-ochre)` — italic verb emphasis ONLY in headlines. Per Decision A10.
- The `.kiosk-headline em` CSS rule in `global.css` auto-applies the ochre + italic to `<em>` inside `.kiosk-headline` elements. Don't manually write `text-ochre italic` — let the rule do it.
- **Don't extend `--k-accent-italic`** (ochre italic) to other pages. It's a marketplace-only design decision. Forum stays wine-italic, calendar stays teal-italic.
- **Don't touch** these semantic accents that stay constant across all kiosk surfaces: live-now indicator (ochre dot), today indicator on calendar, weekend-day labels, required-field asterisks, compose step numbers (`01`, `02`, …), CTA wine-shadows, modal wine-shadows, mobile wine FABs.

### Strap precedence in `ListingCard`
Order in the top-left strap stack (topmost = highest priority):
1. `entwurf` — draft badge (author-only, not shown in public feed)
2. `bump` — recently bumped (within 7 days of last bump)
3. `reserviert` — reserved for a buyer
4. `altpapier` — stale listing (≥ 21 days old)
5. `StatusBadge` (author-only, moderation state) — last in the stack

The stack is intentionally additive. A listing that was bumped at day 22 wears `altpapier + bump` simultaneously (A5). Each strap communicates a different signal.

**`altbestand` strap removed from rendering** (May 2026). The strap kind + CSS still exist in `MarketStrap.svelte` + `tokens.css` for any future direct-DB-edit edge case, but `ListingCard` no longer renders it — the one-time backfill (`scripts/migrate-legacy-categories.ts`) maps every pre-redesign legacy category to a kiosk key, so `resolveCategory().legacy === false` for all rows.

### Soft-migration symmetry (A2 + A3) — post-backfill
- **DB column is permissive**: `category` is a plain string (no enum constraint at the DB level). `delivery` is nullable. This allowed legacy listings to survive the redesign without an upfront migration.
- **Write path is strict**: `KioskCategorySchema` (Zod) gates all creates + edits to the **13 approved kiosk category keys** (`moebel`, `garten`, `werkzeug`, `kleidung`, `medien`, `elektronik`, `fahrrad`, `pflanze`, `kinder`, `spielzeug`, `handgemacht`, `sport`, `sonstiges`). `DeliverySchema` gates delivery to `'abholung' | 'versand' | 'abholungVersand'`.
- **One-time backfill ran May 2026** (`scripts/migrate-legacy-categories.ts`): mapped pre-redesign English legacy keys (`furniture`/`electronics`/etc.) to the new German kiosk keys, defaulted null `delivery` to `'abholung'`, and renamed the original short-lived `kind` key → `kinder` (split into `kinder` + `spielzeug` for the children/toys distinction).
- **Owner-edit still forces re-pick on legacy values**: `BackfillBanner` keeps rendering on the edit page when a listing has a legacy category or null delivery — defense in depth for any direct-DB-edit cases that bypass the schema.

### Backfill rule
`BackfillBanner` renders owner-only on the detail page (`/marketplace/[id]`) when either:
- `resolveCategory(listing.category).legacy === true`, OR
- `listing.delivery == null`

CTA routes to `/marketplace/edit/{id}?from=backfill`. Edit page pre-populates whatever valid fields exist; owner must pick a new category and/or delivery mode, then republish. Republish re-runs the full moderation pipeline (same as create path).

### Contact-form relay design (A6)
`POST /api/listings/[id]/contact` is the buyer→seller email pipeline.

**Rate limits** (per-listing-flood + per-IP + per-sender + per-sender-to-owner):
- Max 3 contact messages per listing per hour (global flood guard)
- Max 5 messages per IP per hour
- Max 2 messages per sender email per hour
- Max 1 message per sender per listing per day (prevents harassment)

**Security layers:**
- AI moderation on message body (same `checkSpamWithGPT` pipeline as all content)
- Honeypot field (`website`) drains bots silently — no error, no action, HTTP 200
- `Origin` header CSRF guard — must match `ALLOWED_ORIGINS` env var

**GDPR / privacy design:**
- No message bodies stored server-side. Metadata only: `{ listingId, senderEmail (hashed), timestamp }` in `listingContacts` collection.
- Message lives only in the two outbound Resend emails (seller confirmation + buyer receipt).
- `replyTo: senderEmail` on the seller email is the privacy mechanism — seller can reply directly to the buyer, but the seller's email never appears on any page the buyer sees.
- Confirmation email to buyer has an "ignore if you didn't send this" footer for impersonation victims.

**Required env vars for contact relay:**
```
RESEND_API_KEY=            # Resend.com API key
SENDING_FROM_EMAIL=        # e.g. "Mahalle <noreply@mahalle.berlin>"
CONTACT_IP_SALT=           # 32+ chars, fixed across deploys (for hashing IPs in rate-limit keys)
ALLOWED_ORIGINS=           # CSV of allowed origins, e.g. "https://mahalle.berlin" (defaults to this)
```

### Server-side projection — A5 `lastBumpedAt` is owner-only
`listingsQuery.ts` strips `lastBumpedAt` from the non-owner serialization branch and exposes `isBumped: boolean` instead (computed server-side: `lastBumpedAt != null && Date.now() - lastBumpedAt < 7 * 86400 * 1000`).

`ListingCard.svelte` uses `isBumped` as the canonical signal for the bump strap. **Never extend the public projection to expose `lastBumpedAt`** — bump timestamps are a privacy leak (tells competitors exactly when a seller is active/desperate).

### Bump — no rate limit (supersedes A5)
- Endpoint: `POST /api/listings/[id]/bump`.
- No cooldown. Bump is the freshness reset; sellers need to be able to use it whenever the listing slips out of the public feed (past the 21d freshness clock). Spamming it would be visible in the audit (`updatedAt` + `lastBumpedAt` timestamps) and gated by the user's own social signals — not a technical concern.
- `canMutateListing` guards the endpoint: blocks pending / rejected / reserved / sold. Bump passes `{ allowOnWarningLabel: true }` (see below).
- **Bump resets the freshness clock.** A bumped 25-day listing is back in the public feed at the top, with the 24h `FRISCH HOCHGEHOLT` strap. No more `altpapier` strap simultaneously.
- Owner-facing label: the bump button reads "frisch hochholen" normally; when the listing is past 21d it swaps to "↻ Auffrischen" — same action, clearer intent.
- **Bump button is disabled while the listing is within its 21-day freshness window** (server-computed freshness clock = `max(createdAt, lastBumpedAt)`). It re-enables the moment the listing goes stale and gets hidden from the public feed — that's the only time bumping does something user-visible. Brand-new listings have their bump button disabled for the first 21 days; this is intentional, not a bug. The disabled tooltip shows the days remaining (`market.owner.bump.disabledFresh` with `{n}` interpolation).
- **Warning-labeled listings (`hasWarningLabel === true`) are bumpable.** Warning labels mean approved-with-caveat — the content is publicly visible (blurred until the viewer clicks through). Bumping doesn't change the content, just the freshness timestamp. The bump + status endpoints pass `{ allowOnWarningLabel: true }` to `canMutateListing`; **edits stay default-blocked** (mirrors calendar + forum precedent — editing a warning-labeled item could "fix" the flagged content out from under the warning). The edit button in `OwnerActions` mirrors that gate as disabled-with-tooltip (`market.owner.edit.warningTooltip`).
- **`PendingLockBanner` triggers on `moderationStatus === 'pending'` only** (NOT on `hasWarningLabel`). Warning-labeled listings render the full action grid; edit is gated visually, bump + status mutations work. The lock banner's copy ("Diese Anzeige wird gerade geprüft") is only accurate for the pending state.

### Freshness decay & public visibility (supersedes A5 + Task 7.2)
- **Freshness clock = `max(createdAt, lastBumpedAt)`.** Bumping resets it; editing does not.
- **0–21 days since the clock**: visible in public feed, search, browse, direct URL. Normal card.
- **>21 days since the clock**:
  - **Hidden from public entirely.** `buildListingsFilter` in `listingsQuery.ts` uses `$expr: { $gte: [{ $ifNull: ['$lastBumpedAt', '$createdAt'] }, twentyOneDaysAgo] }` on the public branch. (Caveat: `$expr` doesn't use indexes — fine for current scale; future optimization is a precomputed `freshness` field with an index on it.)
  - **Direct URL → "Diese Anzeige ist nicht mehr verfügbar." page** (HTTP 200, not 404). `fetchListingDetailForSSR` returns `{ kind: 'hidden_past_21d' }` and `[id].astro` renders `<ListingUnavailable />` inside the same `<KioskLayout>` shell at the same URL. Keeps the URL indexable-but-empty; the moment the owner bumps, the next request flips back to the full detail page.
  - **Owner's „Meine Anzeigen" view**: the card renders grayed (`.market-stale` class — opacity 0.6 + saturate 0.45 via motion-marketplace.css) + an ochre `⚠ Nicht im public Feed · bump zum Hochholen` warning chip (i18n key `market.owner.notInPublicFeed`). Triggered when the orchestrator passes `inOwnerView={true}` AND the server-computed `listing.isPubliclyHidden === true`.
  - **Owner's direct URL**: full detail page renders normally (owner bypass via `fetchListingDetailForSSR`'s `isOwner` branch).
- **No auto-archive, no hard cutoff.** Past-21d listings live indefinitely in the author's private view until they bump or delete.
- **`altpapier` / `altbestand` straps**: kinds + CSS retained in `MarketStrap.svelte` + `tokens.css` for defense; never rendered by `ListingCard` after May 2026.
- **`isPubliclyHidden: boolean`** is a server-computed virtual on the `Listing` type. Always `false` for any listing a non-owner receives (server filter excludes them); variable for the owner's own. No privacy leak — boolean only, not a timestamp.

### Status visibility (A7)
| Status | Visible to | Conditions |
|---|---|---|
| `available` | All (incl. logged-out) | Always |
| `reserved` | All (incl. logged-out) | Always |
| `sold` | Owner only | Only when `?view=mine` |
| `exchanged` | Owner only | Only when `?view=mine` |
| `draft` | Owner only | Only when `?view=mine` |

Owner does **not** see their own drafts/sold listings leaking into the public feed unless they explicitly switch to the "Meine Anzeigen" (`?view=mine`) tab. `buildListingsFilter` enforces this via a `$or` arm that adds `{ sellerId: userId, status: { $in: ['draft', 'sold', 'exchanged'] } }` only when the request includes `?view=mine` + a valid session.

### Hybrid SSR-static + island-hydrate pattern (detail page)
`/marketplace/[id].astro` renders the listing title, body, lead image, and structured data directly in the Astro template (visible to search engines, link previews, and a11y). It then mounts `<MarketDetailInner client:load>` on top for the interactive gallery, sidebar contact form, and action buttons.

**Why not `client:only="svelte"`:** Empirical Googlebot test (2026-05-20) showed `client:only` islands return zero body content in raw HTML — bad for SEO on a search-driven marketplace. Hybrid SSR-static is the correct pattern here.

**Rule:** For any new detail-page surface on marketplace, follow the same split: static Astro template for visible content + `client:load` island for interactivity.

### Kind-key bridge (rail vs API)
`MarketFilterRail.svelte` and the URL bar speak German keys: `verkaufen`, `tausch`, `verschenken`.
The data layer, DB, and API speak English enum values: `sell`, `exchange`, `gift`.

`MarketplaceBrowseInner.svelte` has the translation maps:
```ts
const RAIL_TO_API = { verkaufen: 'sell', tausch: 'exchange', verschenken: 'gift' };
const API_TO_RAIL = { sell: 'verkaufen', exchange: 'tausch', gift: 'verschenken' };
```

Compose flow uses the same convention: the category/kind pickers emit German keys → the submit handler translates before posting to the API. **Don't bypass these maps** by writing English kind values directly into URLs or filter state.

### `canMutateListing` guard
Located at `src/lib/listingActions.ts`. Central guard called by all listing mutation endpoints (edit, delete, bump, status-change).

**Default behavior** — blocks: `pending`, `warning`, `rejected`, `reserved`, `sold`.

**Override flags** (pass as second arg object):
- `{ allowOnRejected: true }` — delete endpoint. Owners need to be able to clean up rejected listings.
- `{ allowOnReserved: true }` — status endpoint. `reserved → sold` is a one-click intended path.

**The bump endpoint uses default** (no overrides) — bumping a reserved/rejected listing makes no semantic sense.

**Pattern for new endpoints:** call `canMutateListing(listing, session, opts)` at the top of the handler before any writes. Return its `Response` if it returns one.

---

## Bundles (deferred to follow-up PR)

Spec: `design/handoffs/design_handoff_marketplace/jsx/kiosk-marketplace-novel.jsx:166-213` (block-commented as `// DEFERRED` per Task 1.0). Scoping: `MARKETPLACE_SCOPING.md` §03.

Schema reserves `bundleId?: ObjectId` nullable FK on the `listings` collection + partial index (`scripts/create-listing-indexes.ts`).

**Un-defer trigger conditions** — build bundles when 2-3 of the following signals appear in production:
1. Owners writing "siehe auch meine andere Anzeige" / "see also my other listing" in description bodies (search the `listings` collection for these phrases).
2. Repeat-seller patterns — one user with 5+ simultaneously-active listings (query `listings` grouped by `sellerId` where `status = 'available'`).
3. Forum / `/admin/moderation` reports asking "kann man mehrere Sachen zusammen verkaufen?" or equivalent.

Until then: `bundleId` stays null on all listings. The Bundle UI surfaces (`BundleCard`, `BundleCompose`, `BundleDetail`) and the auto-dissolve cron are out-of-scope.

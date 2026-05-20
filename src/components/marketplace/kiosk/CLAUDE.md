# Marketplace (kiosk) notes

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
5. `altbestand` — very old listing (60+ days; shown only to owner since public browse hides these)
6. `StatusBadge` (author-only, moderation state) — last in the stack

The stack is intentionally additive. A listing that was bumped at day 22 wears `altpapier + bump` simultaneously (A5). A legacy owner-only listing at day 63 can wear `altbestand + altpapier + bump` all at once. This is by design — each strap communicates a different signal.

### Soft-migration symmetry (A2 + A3)
- **DB column is permissive**: `category` is a plain string (no enum constraint at the DB level). `delivery` is nullable. This allows legacy listings to survive without migration.
- **Write path is strict**: `KioskCategorySchema` (Zod) gates all creates + edits to the 9 approved kiosk category keys. `DeliverySchema` gates delivery to `'pickup' | 'shipping' | 'both'`.
- **Owner-edit forces re-pick on legacy values**: `BackfillBanner` renders on the edit page when the listing has a legacy category or null delivery, blocking publish until the owner picks a valid value. This is the only point where we coerce legacy data — never do it server-side automatically (could misclassify).

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

### Bump rate-limit (A5)
- 7-day cooldown per listing. Endpoint: `POST /api/listings/[id]/bump`.
- Returns `429 { error: 'rate_limited', retryAt: <ISO> }` on rate-limit hit. UI shows countdown in a toast.
- `canMutateListing` (see below) guards the endpoint. Default behavior: blocks pending / warning / rejected / reserved / sold. Bump uses the default (no overrides).
- Bump does **not** clear the `altpapier` strap. Freshness/staleness keys off `createdAt`, not `lastBumpedAt`. A bumped 25-day listing wears both `altpapier` and `bump` simultaneously — the bump signals "seller still active", altpapier signals "listing is old".

### Freshness decay thresholds
- **21 days** → `altpapier` strap (DB: `createdAt < now - 21d`). CSS: `.market-stale` class adds `opacity-0.6` + `saturate-[0.45]` via `motion-marketplace.css`. Card still visible to everyone.
- **60 days** → server-side hidden from non-owner views. `buildListingsFilter` in `listingsQuery.ts` adds `createdAt >= now-60d` to the public `$match` pipeline. Owner sees their own listings at any age via the `sellerId === userId` `$or` arm.

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

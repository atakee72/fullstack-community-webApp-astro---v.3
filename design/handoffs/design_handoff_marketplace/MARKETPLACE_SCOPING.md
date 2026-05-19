# Marketplace · Batch 2.2 scoping

Working document for Marketplace redesign. Captures answers from the scoping form, open calls before artboard work begins, and the strap/category/layout systems locked in advance.

> Status: **v1.1 — user revisions applied (May 18, 2026). Ready to hand off.**

---

## Locked answers (from scoping form)

| Topic | Decision |
|---|---|
| **Listing kinds (v1)** | Verkaufen · Tausch · Verschenken. (No Suchen, no Leihen.) |
| **Categories** | Hybrid — marketplace-specific categories, mapped to Kiosk's existing palette. 8 final categories (see below). |
| **Index layout** | Uniform 3-column grid (option 3), with one editorial lead at top of page 1 only — see §6. |
| **Create flow** | Single page with sticky preview pane on the right (live preview while typing). |
| **Drafts** | Private until explicitly published. Separate `Entwürfe` tab in user's listings page. |
| **Image gallery (detail)** | Editorial — one big lead image, thumbnail strip below, click-to-lightbox. |
| **Vision-mod states** | All five (submitting / pending / image-flag / full-reject / auto-approved). Image-level gated on API extension — see §4. |
| **Price treatment** | Per-kind: Verkaufen → big italic €, Tausch → ↔ glyph + "Tauschvorschlag", Verschenken → `gratis` strap. |
| **Messaging** | **Contact form** — buyer fills name + email + message. Mahalle relays to owner. Owner's email is NEVER shown. No DMs, no contact-reveal. |
| **State matrix depth** | All 10 (loading, empty, search-empty, error, reserved, sold, image-mod-pending, image-rejected, listing-rejected, owner-view). |
| **Mobile coverage** | Full parity — list, detail, create, gallery, all states. |
| **Novel features** | Three only: Bumps, Stale decay (`altpapier`), Bundles. _(Saved-search alerts, Tausch matching, and Vorbeischauen pickup-pins removed in v1.1 per user feedback.)_ |

---

## 1 · Categories (8 final)

Hybrid approach: marketplace-specific names, Kiosk's color palette mapped onto them.

| # | Category | Token | Notes |
|---|---|---|---|
| 1 | Möbel & Wohnen | `wine` `#7a4256` | absorbs home-deco |
| 2 | Kleidung & Mode | `plum` | |
| 3 | Bücher, Medien & Spiele | `ink` (deep) | books + comics + music + games + films collapsed |
| 4 | Werkzeug & Garten | `moss` | absorbs garden tools |
| 5 | Pflanzen & Tiere | new aux token (swatch pick deferred to build) | distinct from #4 — separate category, confirmed |
| 6 | Elektronik | `teal` | |
| 7 | Fahrräder & Mobilität | `ochre` | bikes, scooters, e-mobility |
| 8 | Kinder | `salmon` (new aux token) | absorbs toys + baby gear + kids' clothing — parents browse this way |
| (9) | Sonstiges | greyed/none | not a real category — fallback only, no color, sits at end of filter rail |

**Locked:** Kinder for slot #8. Pflanzen & Tiere kept separate (slot #5) with a new aux token — exact swatch picked during build.

> Existing schema has 10 categories; above is the agreed merge to 8.

---

## 2 · Backfill story

**Recommendation: legacy strap, no data migration.**

- Old listings render with a small **`Altbestand`** strap (inkSoft color, same strap family).
- No category color (gray-ish). No Vorbeischauen pin. No new fields.
- Owner sees a one-time banner on their own legacy listings:
  > *"Diese Anzeige stammt aus der alten Marktplatz-Version. Auffrischen, um sie sichtbarer zu machen?"*
  Click → opens the new create-listing form pre-filled with what we have.
- Buyers see legacy listings normally in the grid, just with the strap and no color.

**Why not the alternatives:**
- Silent backfill with sensible defaults → hides a data hole and lies about completeness.
- Hide-until-owner-edits → makes launch look empty.
- Strap-and-invite → honest, gives owners agency, rewards engagement with better visibility. Cheap to ship.

**Locked:** `Altbestand` strap + Auffrischen banner.

**Note:** `Altbestand` and `altpapier` can co-exist on the same listing — old AND stale. Strap stack handles two straps without breaking layout.

---

## 3 · Strap system (locked)

One component: `<KioskStrap kind="..." />` defined in `kiosk-marketplace.jsx`.
**One** font (small-caps condensed sans, same as Forum's strap labels). **One** shadow (riso offset). **One** size. **One** geometry. **Color is the only variable.**

Authoritative list (10 straps):

| Strap | Color | Where |
|---|---|---|
| `gratis` | moss | Verschenken kind |
| `Tausch` | teal | Tausch kind |
| `frisch hochgeholt` | ochre | bumps |
| `altpapier` | inkSoft (faded) | freshness decay |
| `Altbestand` | inkSoft | legacy listings |
| `In Prüfung` | ochre | mod pending |
| `Bild abgelehnt` | wine | image-level flag |
| `Reserviert` | plum | soft-lock |
| `Verkauft` | inkSoft (struck) | archived sold |
| `Entwurf` | ink (outline only) | drafts |

> Rule: if a feature needs a strap not on this list, we add it here, not invent a new component.

---

## 4 · Per-image moderation dependency

The image-level flag UX (rejected thumbnail with reason + re-upload affordance) **is gated on a per-image vision-mod API extension** that does not yet exist in the backend.

Plan:
- Artboards include the image-flag UI (designed to spec).
- Handoff explicitly marks it "depends on per-image vision-mod endpoint."
- CC implements **listing-level mod first**; image-level lands when the API does.
- Artboards remain accurate; the rollout simply phases.

---

## 5 · eBay-Kleinanzeigen — vocabulary, not vibe

We lift their German marketplace conventions for clarity and familiarity:
- `VB` suffix as price strap option (`45 € VB`)
- `Nur Abholung` / `Versand möglich` disclosures
- Contact-reveal pattern (button → email or phone)
- Category vocabulary phrasing
- `Festpreis` vs `Verhandlungsbasis`

We do **not** lift their visual language. Kiosk pulls editorial newspaper, not utility database.

---

## 6 · Index layout (proposed mix)

Form answer was **3 (uniform 3-column grid)** but the layout question stayed open. Proposed pragmatic compromise:

- **Page 1:** one full-width **editorial lead** at the top — featured listing of the day (curated or freshness-based), then a thin strap divider (e.g. *"Heute frisch im Kiez · 47 Anzeigen"*), then uniform 3-column grid below.
- **Page 2+:** no lead, just grid. The lead is page-1's job; pagination is uniform.
- **Filtered views:** lead disappears (filtered = focused mode, not editorial mode).

This keeps "3" for ~90% of the surface, gives the index **one** editorial moment for identity, and avoids the "every page tries to be page 1" problem.

**Locked:** Yes. Lead-selection is **algorithmic / freshness-based** in v1, not curated (curation would need admin tooling, out of scope).

---

## 7 · No Suchen → no `gesucht` strap

Confirmed: cut from spec.

Price treatment becomes **3-kind only**:
- **Verkaufen** → big italic € numeral (with optional `VB` suffix)
- **Tausch** → ↔ glyph + "Tauschvorschlag" line
- **Verschenken** → `gratis` strap, no numeral

---

## v1.1 revisions (May 18, 2026)

User feedback after first pass led to these revisions:

| Change | Why |
|---|---|
| **Contact reveal → contact form** | Simpler. Buyer fills `name + email + message`; Mahalle relays to owner. Owner's email is never disclosed. |
| **Pickup spot map removed** | Overkill for v1. No `PickupSpotBlock` in detail; no spot-picker in compose. If location hints are needed, a plain text line on the listing suffices. |
| **Compose §06 reworked: Optional details** | Replaces pickup-spot picker. Six optional fields: Maße / Material / Baujahr / Farbe / Gewicht / Zustand. All voluntary; shown as spec strip on listing detail when filled. |
| **Tausch matching removed** | Counter-offers go through `ContactForm` (with Tausch-flavored copy when the listing kind is `tausch`). No nightly ML matching cron. |
| **Saved-search alerts removed** | Overkill at v1. Users can re-search whenever they want. No hourly cron, no notification UI. |
| **Text moderation explicitly noted** | Moderation runs on **images AND text** (profanity, hate, spam). Surfaces during pending + rejected states. |
| **Pending = read-only** | Owner cannot edit or bump a listing while AI is checking. Brief lock (~12s); buttons grey out, banner explains. |

**Novel-features module count: 3** (was 6). Vorbeischauen pickup pins also dropped (no surface for it elsewhere after the map removal).

---

## Open calls — RESOLVED (v1.0)

| | Question | Decision |
|---|---|---|
| **A** | Slot #8 | **Kinder** |
| **B** | Slot #5 Pflanzen & Tiere | **Separate** category, new aux token (swatch picked at build) |
| **C** | Editorial lead on page 1 only | **Yes** — lead-selection algorithmic/freshness-based in v1 (curation out of scope) |
| **D** | `Altbestand` strap + Auffrischen banner | **Yes** — `Altbestand` and `altpapier` can co-exist on same listing |

### Side-notes acknowledged
- Strap system locked at 10 entries.
- `Nur Abholung` / `Versand möglich` worth adding as a **delivery enum** on the listing schema (flag for CC in handoff).
- Per-image mod correctly phased (listing-level first, image-level lands with the API extension).

---

## Build order
1. `kiosk-marketplace.jsx` — tokens (categories + straps), index page (lead + grid).
2. `kiosk-marketplace-detail.jsx` — listing detail (gallery, contact reveal, owner-view variants).
3. `kiosk-marketplace-compose.jsx` — create flow (single page + sticky preview).
4. `kiosk-marketplace-states.jsx` — 10-state matrix (desktop + mobile).
5. `kiosk-marketplace-novel.jsx` — bumps, freshness decay, Vorbeischauen pins, saved-search, Tausch matching, bundles.
6. Mobile parity throughout.

Same cadence as Calendar. All artboards land in the existing `Mahalle Redesign.html` canvas.

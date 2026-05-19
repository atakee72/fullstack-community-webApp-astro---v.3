# READMEFIRST · Marketplace handoff (Batch 2.2)

Read me before you implement anything. This is the order to consume the handoff so the design lands faithfully and you don't waste time fighting tokens that haven't been loaded yet.

---

## Feed order for Claude Code

1. **`MARKETPLACE_SCOPING.md`** — locked decisions (categories, straps, backfill, layout, per-image-mod phasing). Read this first; it answers the "why" behind every artboard. *(Already in your context.)*

2. **Existing design system** (already in your codebase from Forum + Calendar rollout):
   - Kiosk tokens (`tokens.css` / equivalent in your Astro project)
   - Paper-grain `body::before` (untouched — already global)
   - Carved-title device, strap labels, riso shadows, type ramp — all reused from Forum.
   - Calendar tokens & motion (already shipped or in progress) — Marketplace builds on top, doesn't replace.

3. **`tokens-marketplace.css`** — Marketplace token extension:
   - 8 category tokens (`--cat-moebel`, `--cat-kleidung`, …) mapped to Kiosk palette + 2 new aux tokens (Pflanzen & Kinder swatches).
   - 10 strap tokens (`--strap-gratis`, `--strap-tausch`, … see scoping doc §3).
   - Delivery enum tokens (`--delivery-abholung`, `--delivery-versand`).

4. **`motion-marketplace.css`** — Marketplace motion keyframes:
   - bump animation ("frisch hochgeholt" pop-in)
   - freshness decay fade
   - contact-reveal (button → contact strip)
   - editorial lead cycling (page-1 only)
   - listing soft-lock pulse (Reserviert)

5. **JSX files in dependency order** *(this is where the Kiosk identity lives — treat the JSX as the source of truth; CSS files are convenience extracts):*

   1. `kiosk-marketplace.jsx` — tokens + index page (editorial lead + uniform 3-col grid + filter rail).
   2. `kiosk-marketplace-detail.jsx` — listing detail (gallery, contact reveal, owner-view variants).
   3. `kiosk-marketplace-compose.jsx` — create flow (single page + sticky preview pane).
   4. `kiosk-marketplace-states.jsx` — 10-state matrix (loading, empty, search-empty, error, reserved, sold, image-mod-pending, image-rejected, listing-rejected, owner-view).
   5. `kiosk-marketplace-novel.jsx` — bumps, freshness decay, Vorbeischauen pickup pins, saved-search alerts, Tausch matching, bundles.

6. **Self-contained canvas bundle** — `Mahalle Redesign.html` in this handoff dir. Open it locally to scrub through every artboard.

---

## Rules of engagement

- **The JSX files are the spec.** Tokens-CSS + motion-CSS are convenience extracts. If they disagree with the JSX, the JSX wins.
- **Reuse, don't re-derive.** `KioskNav`, paper-grain, carved-title, strap labels, riso shadows, type ramp — all already in the codebase. Don't reimplement.
- **Carved-title accent for Marketplace** = TBD (will be set in `kiosk-marketplace.jsx` tokens block; check there before assuming).
- **Strap component is locked at 10 entries** — see scoping doc §3. Add new straps to that file, don't invent ad-hoc tag styles elsewhere.
- **Per-image moderation is API-gated.** Implement listing-level mod first. Image-level UX (rejected thumbnail + reason + re-upload) lands when the per-image vision-mod endpoint exists.
- **Backfill = legacy strap, no migration.** Old listings render with `Altbestand` strap + Auffrischen banner for the owner. Don't write a backfill script.
- **`Altbestand` and `altpapier` can co-exist** on a single listing (old AND stale). Strap stack must handle two straps without breaking layout.
- **German curly quotes** in JS string literals: opener `„` (U+201E) + closer `"` (U+201C). Straight `"` will break Babel parsing — bit me twice during Calendar build.

---

## Out of scope for v1 (don't build)

- **Suchen** (want / ISO listings) — and therefore the `gesucht` strap.
- **Leihen** (lend / borrow).
- **Curated lead-of-the-day** — page-1 lead is algorithmic / freshness-based; curation needs admin tooling, deferred.
- **DM threads** — messaging is click-to-reveal contact only in v1.
- **Per-image moderation UX** — designed but gated on API extension (see above).

---

## Side-notes the user flagged

- `Nur Abholung` / `Versand möglich` should ship as a **delivery enum** on the listing schema. Tokens are already provisioned for it.
- Existing production Marketplace uses 10 categories and 2 listing kinds. Per backfill plan, those listings render with `Altbestand` strap and no category color until the owner refreshes them.

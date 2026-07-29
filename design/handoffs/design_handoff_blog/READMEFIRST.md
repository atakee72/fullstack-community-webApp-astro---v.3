# READMEFIRST — Blog pass · „Die Beilage" (Editorial Kiosk)

**For: Claude Code (CC) · From: design side · Jul 16 2026**
Surface: `/blog` (+ `/blog/[slug]`, `/blog/tag/[tag]`) — the LAST undesigned surface. After this: all 8 Kiosk surfaces + 2 Nachzügler are designed.

---

## ⚑ FLAGS — read before writing any code

1. **Article bodies in the mockups are APPROXIMATED, not verbatim.** The 6 post titles/descriptions/dates/tags/layouts are real (from the repo's MDX frontmatter), but the body paragraphs in `kiosk-blog-article.jsx` are plausible reconstructions. **The real MDX bodies stay exactly as authored (EN).** Do not replace repo content with mockup copy.
2. **Rust `#a3552e` is a NEW accent** — add it to `tokens.css` via the established `--k-*` pattern (see `tokens-blog.css` for the ramp). No other page claims rust; the old blog accent `#4b9aaa` dies with the redesign.
3. **This is a CHROME SWAP, not a content migration.** `/blog` currently uses its own grain-less `BlogBaseLayout`. It moves onto the Kiosk chrome: paper grain (`body::before`, same values as everywhere), `KioskNav` with the Blog tab active, DE/EN switcher top-right. `postLayout` stays a frontmatter enum with the same 3 values — the 3 layout files in `src/layouts/blog/` get rebuilt visually, not renamed.
4. **All 6 novel modules need ZERO backend work.** Everything is build-time derivation (Lesezeit, Archiv, Rubrik-Rail), pre-filled navigation (Forum-CTA, Aufruf) or print CSS (Druckbogen). No new collections, no new endpoints, no schema changes.

## ✋ Confirm with the user BEFORE coding

- **(a) Chrome swap approved?** `/blog` gains grain + KioskNav and loses the standalone BlogBaseLayout look. (Design intent: the Beilage is a sibling of the Kurier — same printing house.)
- **(b) Forum-CTA quota:** the „Im Forum besprechen" button pre-fills `/topics/create` — the resulting post counts against the existing 5/day quota and runs normal AI moderation. Confirm no special-casing is wanted.

## Feed order (read in this order)

1. `READMEFIRST.md` (this file)
2. `BLOG_SCOPING.md` — full spec, section by section
3. `jsx/kiosk-system.jsx` — tokens source of truth (`window.kiosk`)
4. `jsx/kiosk-blog-explore.jsx` — **load FIRST among blog files**: exports `KB_POSTS` / `KB_TAGS` / `KB_RUST` seeds used by all others
5. `jsx/kiosk-blog.jsx` — atoms (`Bl*`), i18n table `BL_L`, masthead, index desktop
6. `jsx/kiosk-blog-article.jsx` — ReadBar, ArticleFooter, RelatedRail, all 3 postLayouts
7. `jsx/kiosk-blog-mobile.jsx` — 390×844 screens (index, article top/end, tag)
8. `jsx/kiosk-blog-states.jsx` — tag page desktop, novel spec, 4-state matrix
9. `tokens-blog.css` + `motion-blog.css` — spec values (wire through `--k-*` as usual, not verbatim imports)
10. `Mahalle Redesign.html` — self-contained canvas; sections `blog`, `blog-novel`, `blog-states` are the contract

## Build order (suggested)

1. Layout swap: BlogBaseLayout → Kiosk chrome (grain, KioskNav active="Blog", DE/EN). Keep routes.
2. Index `/blog`: Beilage masthead (double rule!), rubric row, lead card + newspaper columns, sidebar (Rubriken-Cloud, Archiv, Über, Aufruf), pagination. `BlogSearch.svelte` keeps its exact function (live search title/desc/tags, 12/24/48 pagination) — restyle only.
3. The 3 article layouts (standard / hero / gallery) + ReadBar + ArticleFooter + RelatedRail.
4. Tag pages `/blog/tag/[tag]` + TagBarMobile equivalent.
5. Novel modules §01–§06 (see scoping §08 — order there is easiest-first).
6. States (4) — mostly copy + build-time behavior, see scoping §09.

## Non-negotiables

- **One visible accent: rust.** Wine appears ONLY on the Forum-CTA card (it marks the bridge to Forum). Teal/moss/ochre only where the system already uses them (placeholder stripes are mockup-only).
- **Masthead anatomy:** centered axis + double rule (2.5px ink + 2px gap + 1px ink), „EINE BEILAGE DES SCHILLERKIEZ KURIER" strap above the title. This is the Kurier-family signal — do not simplify to a single rule.
- **EN bodies stay.** Chrome is DE/EN switched; article text renders as authored, with the small `EN` chip in the meta line (tooltip explains).
- **German quotes are curly:** „ (U+201E) opener + " (U+201C) closer. Never ASCII `"`.
- **Draft filtering is Astro-default:** `draft: true` ⇒ no route, no search hit, no archive count, no rubric count. Don't invent an admin preview.
- **Nothing auto-posts.** Forum-CTA and Aufruf only pre-fill the composer.
- **Progress bar is scroll-bound** — no animation loop; `prefers-reduced-motion` changes nothing (see motion-blog.css).
- Mobile hit targets ≥ 44px (CTA rows on article end).

## Out of scope (explicitly)

- Contributor upload pathway / CMS — posts remain team-authored via repo.
- Comments on blog posts (discussion lives in the Forum via the CTA).
- Read-state persistence („gelesen ✓" is display-only, nothing stored).
- Reader analytics.

## Legacy to replace, not keep

- Old accent `#4b9aaa` and the grain-less BlogBaseLayout look.
- Any scroll-reveal stagger that conflicts with reduced-motion (keep the pattern only per motion-blog.css rules).

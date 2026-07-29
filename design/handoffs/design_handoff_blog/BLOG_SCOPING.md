# BLOG_SCOPING — „Die Beilage" · full spec

Decision trail: exploration round Jul 15 2026 (3 metaphors) → **user picked Metapher A · Die Beilage (Kurier-Schwester)** Jul 16 2026 → full pass same day. Accent locked earlier: **RUST/TERRAKOTTA #a3552e**.

## §00 · Codebase grounding (repo `main`, read Jul 15 2026)

- `/blog` is STATIC: Astro content collection, 6 team-authored MDX posts, EN-only bodies, all author „Mahalle Team", prerendered. No API, no DB, no user actions.
- Frontmatter: `title` / `description` / `pubDate` / `author` / `cover` / `coverAlt` / `galleryImages` / `tags` / `draft` + `postLayout` enum **standard | hero | gallery** (3 layout files in `src/layouts/blog/`).
- Routes: `/blog` (client `BlogSearch.svelte`: live search over title/desc/tags + pagination 12/24/48 with first/prev/next/last + scroll-reveal stagger; `TagCloud` sidebar + About card; `TagBarMobile`), `/blog/[slug]`, `/blog/tag/[tag]` (BlogCard grid).
- Old accent `#4b9aaa`; own grain-less `BlogBaseLayout`.
- The 6 real posts: cafe-guide (8. Apr, standard) · green-spaces (20. Mär, standard) · market-guide (12. Feb, standard) · welcome (15. Jan, standard) · community-spotlight (10. Jan, **hero**) · neighborhood-gallery (5. Jan, **gallery**).

## §01 · Direction

The blog reads as the Kurier's magazine supplement — „dieselbe Druckerei, anderes Heft". Kurier-sibling masthead (centered axis, double rule, strap line), newspaper columns with hairline dividers, Rubriken = tags. Ties the blog into the app family without blurring into the Newsboard: the Kurier is ink + daily + AI-curated; die Beilage is rust + irregular + human-written („AUS DER REDAKTION").

## §02 · Masthead

- Strap: „EINE BEILAGE DES SCHILLERKIEZ KURIER" (mono, 0.22em tracking) with 1px ink rule above.
- Title: „Die **Beilage**" — display 800 + „Beilage" in Instrument Serif italic 400, rust.
- Stats line: `AUS DER REDAKTION · 6 BEITRÄGE · ZULETZT: 8. APR 2025` (count + latest derived at build).
- Double rule below: 2.5px ink, 2px gap, 1px ink.
- Compact variant (tag pages, mobile): smaller title, no stats line, same rules.

## §03 · Index anatomy (desktop)

Top→bottom: KioskNav (Blog active) → masthead → rubric row (RUBRIKEN label + `#alle` active + 6 chips + `+4` overflow + search 300px right) → main grid `1fr 300px`:
- **Left:** lead card (newest post: „NEU IN DER BEILAGE" rust strap, title 33px, serif standfirst, meta, tag chips, cover right) → double rule → two newspaper columns with 1px hairline divider, posts with dashed separators, first in each column gets a thumb; hero/gallery posts carry a small mono layout badge (◼ AUFMACHER / ▤ BILDSTRECKE) → pagination row.
- **Right sidebar:** Rubriken-Cloud (all 10 tags + counts) → Archiv (novel §03) → Über-die-Beilage card → Aufruf (novel §06).
- Meta line everywhere: `date · Mahalle-Team · N Min · [EN]` — EN chip tooltip: „Beitrag auf Englisch verfasst".

## §04 · Article layouts (postLayout enum — all 3 kept)

All three share: KioskNav → **ReadBar** (novel §01) → content column (max 940 centered) → **ArticleFooter** (tags + teilen + Druckbogen-CTA + Forum-CTA card) → **RelatedRail** (novel §02).

- **standard = Zeitungsseite:** rust rubric strap (`RUBRIK · <tag[0]> · № n/6`, 3px left border), title 46px, serif italic standfirst, meta, full-width cover + mono photo credit, body in 2 CSS columns (14.5px/1.62), pull quote block (double rules top+bottom, serif italic rust-deep) with `break-inside: avoid`.
- **hero = Aufmacherseite:** full-bleed cover 420px, ink title band overlapping the cover bottom edge (rust print shadow `3px 3px 0`), centered standfirst + meta + rust rule, single 720px column, larger leading.
- **gallery = Bildstrecke:** standard header, then image grid — image 01 full width, rest 2-up; captions: mono `BILD nn / 06` in rust + regular caption text. `galleryImages` frontmatter drives the list.

## §05 · Tag pages `/blog/tag/[tag]`

Compact masthead → title row „Rubrik *#tag*" (serif italic rust) + count + „✕ Rubrik aufheben" pill right → 3-col card grid (cover, date + layout badge, title, desc, meta) → „ANDERE RUBRIKEN" chip row. Statically generated from real tags only.

## §06 · Search + pagination (function preserved, restyled)

- Live client search over title/desc/tags (`BlogSearch.svelte` logic unchanged). Active state: ink border + query bold + ✕ + rust result line „N TREFFER · LIVE, OHNE NEULADEN".
- Pagination: per-page 12/24/48 pills (12 active default) + `« ‹ SEITE n / m › »`. At 6 posts: Seite 1/1, arrows inactive (rule-colored, not hidden).

## §07 · Mobile (full parity)

390px, standard Kiosk mobile shell (top bar m-logo + mahalle + lang pill + avatar; bottom nav 5 tabs — Blog has no own tab, entry via direct link + Kurier masthead hint). Screens: index (compact masthead, TagBar horizontal scroll, search, stacked cards — lead gets strap + cover), article (compact ReadBar `‹ Beilage · 23 % · 6 Min` + 4px progress; end state shows `100 % · gelesen ✓`, 44px CTA row, Forum-CTA card, compact rail), tag page. CTA hit targets ≥ 44px.

## §08 · Novel modules (all 6 wanted — zero backend)

1. **Lesezeit + Lesefaden:** Lesezeit = MDX word count / 200 wpm at build. Sticky bar: back link + `Die Beilage · <title>` + `nn % gelesen · N Min`; 4px track paperSoft, rust fill = scroll position, 1.5px ink leading edge. 100 % ⇒ „gelesen ✓" (display only). reduced-motion: unchanged (scroll-bound).
2. **Rubrik-Rail:** rank = count of shared tags, exclude self, max 3; card shows `GEMEINSAM: #a #b` (rust-deep mono); 0 shared ⇒ fill with newest, label „ZULETZT ERSCHIENEN". Pure build-time logic.
3. **Archiv nach Monat:** month groups derived from pubDate at build (APR 1 · MÄR 1 · FEB 1 · JAN 3). Row: month + rust unit blocks + count. Click = client-side filtered list (same mechanism as rubric filter). No empty months rendered.
4. **„Im Forum besprechen":** ArticleFooter card, wine button (Forum bridge color). Opens `/topics/create` pre-filled: title `Beilage: <post title>` + body containing the post link. Counts against the 5/day quota, normal AI moderation. Nothing auto-posts.
5. **Druckbogen (A4):** `@media print` on the article route — third print surface after Kiezdaten + Steckbrief. A4 portrait, 18mm margins, 2-color ink+rust, single serif column 11pt, images as framed figures with captions, chrome hidden. Footer MANDATORY: `STAND: <date>` + QR (locally generated) → `/blog/[slug]`. CTA: „⏙ Druckbogen (A4)" pill in ArticleFooter.
6. **„Schreib für den Kiez":** sidebar card, rust tint, honest copy — no upload path exists; CTA opens pre-filled forum topic tagged `#blogidee`; mono note „die Redaktion meldet sich". An invitation, not a promise.

## §09 · States (4 — static surface, small matrix)

1. **Leer:** collection empty at build ⇒ masthead stays, card: „Die erste Ausgabe ist noch im Druck." No spinner — the state exists only before the first post.
2. **Suche ohne Treffer:** „Nichts gefunden zu „query"" + „0 von 6 Beiträgen" + rubric chips as the exit. ✕ resets.
3. **Leere Rubrik:** normally unreachable (tag pages built from real tags); catches stale links. „Rubrik #x ist (noch) leer." + „‹ zur Beilage".
4. **Entwurf:** `draft: true` ⇒ filtered at build — no route, no search hit, no archive/rubric count. Dev-mode-only visibility (Astro default).

## §10 · Backend / schema impact

**None.** No new collections, endpoints, or frontmatter fields. Optional nicety (NOT required): precompute `readingMinutes` in the content config instead of at render.

## §11 · Open questions for CC

1. QR generation for the Druckbogen — reuse whatever the Kiezdaten §03 / Steckbrief print pages settled on (keep one lib).
2. Scroll-reveal stagger on the index exists today — keep it only if it respects `prefers-reduced-motion` (see motion-blog.css); otherwise drop, the paper doesn't need it.
3. `TagBarMobile`: current component may be reusable with restyle — CC judges rebuild vs reskin.

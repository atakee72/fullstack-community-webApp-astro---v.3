# Mahalle · Forum · Design handoff

> **Direction:** Editorial Kiosk · **Surface:** Forum (desktop + mobile) · **Version:** v1.0 · **Status:** ready for build

This package documents the **Forum** redesign — every screen, every state, every interaction, every motion. It is the source of truth for what to build. The accompanying `Mahalle Redesign.html` canvas (in this folder) shows it all live, side-by-side.

---

## What's in this folder

| File | What it is | How to use |
|---|---|---|
| `README.md` | This document. Read first. | Read |
| `Mahalle Redesign.html` | The full design canvas — every artboard, pannable/zoomable. | **Look at**, don't copy. This is the visual spec. |
| `tokens.css` | Production CSS custom properties (color, type, spacing, radii, shadows, motion). | **Drop in** `src/styles/`. Import once at app root. |
| `motion.css` | The 12 keyframe animations as plain CSS classes. | **Drop in** `src/styles/`. Imports tokens.css. |

> **Important:** the canvas (`Mahalle Redesign.html`) is a self-contained React presentation written for **visual reference only**. It is *not* the source code to import. The real components must be rebuilt in the repo's actual stack (Astro + Svelte 5 islands + React islands), using `tokens.css` + `motion.css` as the foundation. Treat the canvas the way you'd treat a Figma file: look at it, measure it, lift values from it — don't copy-paste its JSX.

---

## Fidelity

**Hi-fi, build-ready.** Every screen is a real React component using inline styles that map 1:1 to `tokens.css`. The canvas is pixel-accurate at the listed dimensions (desktop 1280×900, mobile 390×844, motion sheet 1280×1800).

Type, color, spacing, radii, and shadows are tokenized. Copy is real DE/EN mixed strings, not lorem.

---

## Direction · Editorial Kiosk

A Berlin risograph zine, printed for Schillerkiez. Warm cream paper (`#f4ede1`), inky type (`#1b1a17`), wine accent (`#7a4256`) for Forum. **Bricolage Grotesque** display, **Instrument Serif** italic for emotional moments, **JetBrains Mono** for meta and labels. 2-px ink borders. Stacked print-style box-shadows (`2px 2px 0` wine + `4px 4px 0` ink). Subtle paper-grain texture on every surface.

The carved-title device from the previous Dark Glass branch is preserved — same `--carved-accent` variable, same per-page color (Forum = wine).

This is **not** the existing Dark Glass branch. It replaces it. The current `feature/dark-glass-redesign` is preserved as Direction 0 in the canvas for diff/reference only.

---

## Screens delivered

### Forum core

| Screen | Sizes | DE | EN |
|---|---|---|---|
| Forum list (home) | desktop · mobile | ✓ | ✓ |
| Post detail (OP + first reply) | desktop · mobile | ✓ | ✓ |
| Post detail with full thread | mobile | ✓ | — |
| Compose new topic | desktop · mobile | ✓ | — |
| Edit own post | desktop · mobile | ✓ | — |
| Moderating transition (post-submit) | desktop · mobile | ✓ | — |
| Search results | mobile | ✓ | — |
| Bookmarks | mobile | ✓ | — |

### Forum state matrix (10 states × 2 sizes)

For both desktop and mobile, every state of the post list is designed:

1. **Loading** — skeleton shimmer
2. **Empty (filter)** — filter excludes everything
3. **Empty (zero)** — first time, no posts ever
4. **Error** — backend 503
5. **Offline** — cached, grayscale-dimmed
6. **Rate-limited** — too many posts, cooldown timer
7. **AI-flagged · pending** — post in review (Mahalle's 5-state lifecycle)
8. **Rejected** — moderation rejected with reason + appeal
9. **Reported** — community-flagged, awaiting admin
10. **Optimistic submit** — own post appears instantly with status pill

### Design system page

`window.KioskSystem` — colors, type scale, components (buttons, chips, cards, badges, avatars, status pills), spacing, radii, shadows. All annotated with token names.

### Motion spec

`window.ForumMotionSpec` — 12 looping animations on a single 1280×1800 sheet. Every tile shows trigger, timing, easing, and a live demo. The motion sheet **is** the motion spec — what you see is what to build. CSS source is `motion.css`.

---

## Components inventory

What CC needs to build, mapped to existing repo structure where applicable:

| Component | Used on | Repo path (if exists) |
|---|---|---|
| `<KioskBtn variant size>` | everywhere | new — replaces existing `Button` in feature branch |
| `<PostTypeChip kind>` | list, detail | new — `kind` ∈ topic / announcement / recommendation |
| `<FilterChip>` | list header | new |
| `<StatusBadge state>` | own posts | new — covers pending / approved / flagged / rejected / reported |
| `<KioskAvatar initials color size>` | author rows | new — solid color + initials, no images |
| `<KioskNav>` | shell | replaces existing `Header.astro` |
| `<MobileShell>` | every mobile artboard | wrapper used by canvas only — at build time, the real shell is the existing `Layout.astro` mobile branch |
| `<ForumPostCard post>` | list | new — replaces existing post card |
| Carved title (`<h1 class="k-carved-title">`) | every page | preserved from `feature/dark-glass-redesign`, just retokenized |

---

## Hardcoded for the canvas — wire up at build

These are visually present in artboards but **fake data** that must be wired to the backend:

- **`SEED_POSTS`** array (in `directions/kiosk-forum.jsx`) → real posts from `/api/forum/posts`
- **Like counts, RSVP counts, comment counts** → real counts
- **Author initials + colors** → derived from `user.name` + a deterministic hash → 5 wine/teal/ochre/moss/plum slots
- **"47 reading"** live count → optional websocket heartbeat; fall back to "open" / hidden if not built
- **Reply timestamps** → real `formatDistance(post.createdAt, 'de-DE' | 'en-US')`
- **AI moderation stages** ("Sprache geprüft", "Inhalt geprüft", etc.) → mapped to existing 5-state moderation lifecycle in repo
- **Search highlight** → server returns match offsets, client wraps in `<mark>`
- **Bookmark "savedAt"** ("heute", "vor 3 Tagen") → real `bookmarked_at` timestamp
- **`team: true` author flag** for "Mahalle-Team" badge → existing `user.role === 'admin'` check, no schema change

---

## What changed from `feature/dark-glass-redesign`

The Dark Glass branch was a strong start. Kiosk evolves it without throwing it away:

| Aspect | Dark Glass (before) | Kiosk (after) |
|---|---|---|
| **Base** | Indigo `#0e1033` + purple radial | Cream paper `#f4ede1` + ink `#1b1a17` |
| **Surfaces** | Glass-morphism (SVG displacement filter) | Flat paper with grain texture |
| **Display font** | Space Grotesk | Bricolage Grotesque (more character, same x-height feel) |
| **Body font** | Inter | (same — Bricolage handles body too at smaller sizes) |
| **Serif** | — | Instrument Serif italic for emotional moments |
| **Mono** | — | JetBrains Mono for meta + labels |
| **Per-page accent** | Wine carved title | **Preserved** — same `--carved-accent` variable, same wine for Forum |
| **Borders** | Glass edges | 2-px ink borders, dashed for dividers |
| **Shadow** | Soft glass blur | Stacked print shadows (offset wine + ink) |
| **State system** | Partial | Complete — all 10 states designed for desktop + mobile |
| **Motion** | Framer Motion 12.x | Same library, formalized vocabulary (12 tokens) |
| **Mobile** | Responsive web | Dedicated 390×844 mobile artboards |

The `GlassFilters.astro` SVG displacement filters are not used by Kiosk. They can be removed once Kiosk lands. Keep `motion/react` (Framer Motion) — useful for layout transitions (FLIP) that pure CSS can't do.

---

## Build order (suggested batches)

This handoff covers **Batch 1 · Forum**. Two more batches follow once Forum lands:

- **Batch 1 (this) · Design system + Forum + state matrix + motion** — ~30 artboards
- **Batch 2 · Calendar + Marketplace + Newsboard** — ~20 artboards
- **Batch 3 · Auth + Admin moderation + Profile + Schillerkiez data** — ~15 artboards

Recommended sequence within Batch 1:

1. Drop `tokens.css` + `motion.css` into `src/styles/`. Import once in `Layout.astro`.
2. Build atomic components: `KioskBtn`, `PostTypeChip`, `FilterChip`, `StatusBadge`, `KioskAvatar`. Storybook them against the design system page.
3. Build `<ForumPostCard>` with all 10 state variants — drive variant by `post.state` enum.
4. Compose Forum list page. Wire to existing `useForumPosts` query.
5. Compose post detail. Wire to existing detail route.
6. Compose form (compose + edit, both share 90% of the layout).
7. Wire moderation transition to existing post-submit flow (already has 5-state lifecycle).
8. Mobile pass — the artboards are the spec. Same components, different shell.
9. Motion pass — copy `motion.css` classes; apply where canvas indicates.

---

## Accessibility · already handled in design

- All text ≥ 12px on mobile, ≥ 14px on desktop.
- Color contrast: ink-on-paper = 13.4:1 (AAA). Wine-on-paper = 5.8:1 (AA large, AA normal).
- `prefers-reduced-motion` zeroes all animation durations — see bottom of `tokens.css`.
- Focus states: every interactive surface gets a 2-px ink outline at 2-px offset (TBD in components — not in canvas).
- Status colors are **never** the only signal — every state also has an icon + text label.

---

## Decisions (resolved)

1. **Bookmark icon** — emoji 🔖. Matches Kiosk's warm, hand-printed feel; consistent with other small icons in the canvas.
2. **Author avatar** — Cloudinary photo when the user has uploaded one. **Fallback:** deterministic-color initials (5-slot palette: wine / teal / ochre / moss / plum, hashed from `user.name`).
3. **Search** — match the existing Forum search bar's behavior in the current branch. No new endpoint needed.
4. **Live "X reading" indicator** — the small `↻ 47 mitlesend` badge on post detail. **Hardcode for now** (display a static plausible number, or hide if zero). Mark as a future websocket enhancement.

5. **AI moderation stage labels** — hardcoded the labels below. **Team to confirm with CC during build** that they map sensibly to the actual pipeline; rename if needed.

   1. "Sprache geprüft" / "Language checked"
   2. "Inhalt geprüft" / "Content checked"
   3. "Kontext-Prüfung" / "Context check"
   4. "Bilder werden geprüft" / "Images being screened"
   5. "Veröffentlichen" / "Publish"

## No open questions

All decisions resolved. Ready to build.

---

*Designed for the Schillerkiez · Berlin-Neukölln · 2026.*

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Mahalle - A Fullstack Community Web App for Local Neighborhoods. The name means "neighborhood" in Turkish and sounds like "meine Halle" (my hall) in German, reflecting the multicultural community it serves.

## Tech Stack
- **Framework**: Astro 5.x with React 18.2 (hybrid SSR/SSG)
- **Styling**: Tailwind CSS 3.4
- **Animation**: Motion 12.x (`motion/react` for React, Web Animations API for Astro inline scripts)
- **State Management**: TanStack Query for server state + local `useState` for UI (no Zustand/Redux)
- **Data Fetching**: TanStack Query 5.17 (with `@tanstack/react-query-devtools` in dev)
- **Authentication**: auth-astro with NextAuth (Credentials provider)
- **Database**: MongoDB 6.3 (direct driver, no Mongoose)
- **Deployment**: Vercel (serverless)
- **Validation**: Zod schemas

## Development Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm type-check   # TypeScript validation
```

## Project Structure

```
src/
├── components/       # React components (.tsx)
├── layouts/          # Astro layouts (BaseLayout.astro)
├── pages/            # File-based routing
│   ├── api/          # API routes (serverless functions)
│   │   ├── auth/     # Registration endpoint
│   │   ├── topics/   # Forum CRUD
│   │   ├── events/   # Calendar events CRUD
│   │   ├── announcements/
│   │   ├── recommendations/
│   │   ├── comments/
│   │   ├── likes/
│   │   ├── views/
│   │   ├── news/          # Newsboard CRUD, daily fetch, save/unsave
│   │   ├── posts/         # Forum post image upload
│   │   ├── listings/      # Marketplace listings CRUD + draft save/publish
│   │   ├── reports/       # User report submission
│   │   ├── admin/         # Admin moderation APIs (review + bulk-review)
│   │   └── kiez-stats.ts  # Public Schillerkiez demographics/social API
│   └── *.astro       # Page components
├── hooks/
│   └── api/          # TanStack Query hooks
├── lib/
│   ├── mongodb.ts    # Database connection
│   ├── auth.ts       # Auth utilities
│   ├── reviewAction.ts # Shared moderation review logic (single + bulk)
│   └── queryUtils.ts # Query helpers
├── schemas/          # Zod validation schemas
├── styles/           # Global CSS
├── types/            # TypeScript types
└── utils/            # Helper functions
```

## Key Architecture Patterns

### Authentication Flow
- Uses `auth-astro` wrapping NextAuth v5 beta (which itself wraps `@auth/core`)
- Credentials provider with bcrypt password hashing
- MongoDB adapter for session storage
- JWT strategy for stateless auth
- Config in `auth.config.ts`
- **Role**: users have `role?: 'user' | 'admin'` on their MongoDB doc. The `authorize` → `jwt` → `session` callback chain in `auth.config.ts` propagates it so `session.user.role` is available on every API route + page. Type augmentation lives in `src/types/next-auth.d.ts` (must augment `@auth/core/types` and `@auth/core/jwt`, not `next-auth/*` — that's the package the lib actually uses).
- **Admin gate helper**: `requireAdminSession(request)` in `src/lib/auth.ts` returns `{ ok: true, userId }` or a pre-shaped 401/403 `Response`. Used by all `/api/admin/announcements/*` endpoints.
- **Pre-existing security TODO**: `/api/admin/moderation/{review,bulk-review,index}.ts` still use a degraded `ADMIN_USER_IDS.length === 0 || includes(userId)` fallback (hardcoded array, empty by default → any logged-in user passes). Switch them to `session.user.role === 'admin'` (no fallback) in a follow-up PR.

### API Routes
All API routes in `src/pages/api/` follow this pattern:
```typescript
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  // ... handler logic
};
```

### Data Fetching
- TanStack Query for client-side data fetching
- Custom hooks in `src/hooks/api/` (useTopicsQuery, useEventsQuery, etc.)
- QueryProvider wrapper in `src/providers/QueryProvider.tsx`

### State Management
- TanStack Query for server state (hooks in `src/hooks/api/*`)
- Local `useState` in container components for UI state — no Zustand/Redux
- Canonical v5 mutation pattern: optimistic `onMutate` + `onError` rollback + single `onSettled` invalidation. Never stack `onSuccess` + `onSettled` invalidations (causes double-refetch flicker).

### Content Moderation
- **AI moderation**: OpenAI `omni-moderation-latest` scans all content types (topics, comments, events, announcements, recommendations, marketplace listings) on submission
- **GPT content check**: `checkSpamWithGPT()` runs in parallel with `moderateText()` on all content types — catches spam, ads, scams, **hate speech**, and **harassment** that the safety scan misses. `irrelevant_nonsense` classification is treated as legitimate (too many false positives on short/casual content like "nice", "Çok iyi!"). `hate_speech` and `harassment` are flagged as urgent.
- **Image moderation**: Forum posts (topics, announcements, recommendations) and marketplace listings get `checkImagesWithGPT()` (GPT-4o vision) for image safety — runs in parallel with text moderation
- **Profanity blocklists**: Turkish, English, and German blocklists in `lib/moderation.ts` with leetspeak normalization (`normalizeLeetspeak()` converts `0→o, 1→i, 3→e, 4→a, 5→s/c, 7→t, 8→b, @→a, $→s` etc.). Runs two normalization passes for ambiguous characters (e.g. `5` can mean `s` or `c`).
- **Username validation**: `checkNameProfanity()` at registration — runs all 3 blocklists (word-boundary + substring check for concatenated profanity like "PenisPenisPenis"), then `moderateText()` + `checkSpamWithGPT()` via OpenAI as safety net for creative spellings and hate speech.
- **Result merging**: `mergeModerationResults()` combines all checks into a single flagged record
- **Daily posting limits**: 5 per rolling 24h for topics, events, announcements, recommendations, and marketplace listings. Comments excluded (lightweight/conversational). Checked before validation to save API costs.
- **User reports**: Community can flag content via report button (all content types including calendar event comments via `EventViewModal`)
- **Admin queue**: `/admin/moderation` page (Svelte: `ModerationQueue.svelte`) with filter tabs (All/Posts/Comments/Events/Announcements/Recommendations/Marketplace)
- **Warning labels**: Approved-with-warning content shows blur overlay until user clicks "Show content anyway" (persisted to localStorage)
- **Strike system**: 3 strikes = automatic user ban
- **Status flow**: `pending` → `approved`/`rejected` (with optional warning label)
- **Bulk review**: `POST /api/admin/moderation/bulk-review` — approve/reject up to 50 items at once. Skips already-reviewed items, processes all even if some fail, returns partial results with ban notifications.
- **Shared review logic**: `src/lib/reviewAction.ts` — `processReviewAction()` handles updating flagged content, original content, comment parent arrays, strike system, and auto-ban. Used by both `review.ts` and `bulk-review.ts`.
- Key fields: `moderationStatus`, `isUserReported`, `hasWarningLabel`, `warningText` on content

### Admin Moderation Table (`ModerationQueue.svelte`)
See `src/components/admin/CLAUDE.md` — full notes load when working in that subtree.

### Newsboard
See `src/pages/api/news/CLAUDE.md` — full notes load when working in that subtree (or read directly for UI work — frontend lives at `src/components/NewsCardsWrapper.tsx` and `src/components/ui/NewsCards.tsx`).

### Kiez Data Dashboard
See `src/components/kiez/CLAUDE.md` — full notes (data pipeline, LOR codes, MSS column layout, charts, air quality, trend backfills) load when working in that subtree.

## Database Collections
- `users` - User accounts (includes `moderationStrikes`, `isBanned`, plus `role?: 'user' | 'admin'` — admin role unlocks `/admin/announcements`, the moderation queue, and the `isOfficial`-true admin-create endpoint; defaults to `'user'`)
- `topics` - Forum posts (includes `moderationStatus`, `isUserReported`, `rejectionReason`, `images` fields)
- `events` - Calendar events (includes `moderationStatus`, `isUserReported` fields)
- `announcements` - Community + official announcements (includes `moderationStatus`, `isUserReported`, `rejectionReason`, `images`, plus **`isOfficial?: boolean`** + **`pinnedUntil?: Date | null`** for admin-posted official announcements with the 7-day pin lifecycle — server-controlled, never settable from client input; see admin dashboard at `/admin/announcements`)
- `recommendations` - User recommendations (includes `moderationStatus`, `isUserReported`, `rejectionReason`, `images` fields)
- `comments` - Comments on posts (includes `moderationStatus` field)
- `listings` - Marketplace listings (includes `moderationStatus`, `listingType`, `status` fields)
- `news` - Newsboard articles (AI-fetched and user-submitted, includes `moderationStatus`, `aiRelevanceScore`, `fetchDate`, `sourceName`, `sourceUrl` fields)
- `savedNews` - User bookmarks for news (userId + newsId pairs, server-side persistence)
- `savedPosts` - User bookmarks for forum posts (userId + postId pairs, server-side persistence)
- `flaggedContent` - Content flagged by AI or user reports (for admin review queue)
- `schillerkiez_demographics` - AfS demographic data per PLR area per period (unique: `plr_code + period`)
- `schillerkiez_social` - MSS social index data per PLR area per report period (unique: `plr_code + period`)

## Environment Variables

Required in `.env`:
```
AUTH_SECRET=            # NextAuth secret
AUTH_TRUST_HOST=true
MONGODB_URI=            # MongoDB connection string
CLOUDINARY_CLOUD_NAME=  # Image upload
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
OPENAI_API_KEY=         # Content moderation API + news relevance scoring
CRON_SECRET=            # Vercel cron job authentication
NEWSDATA_API_KEY=       # NewsData.io API (optional, for additional news sources)
STATS_XLSX_URL=         # AfS demographics XLSX URL (sync script + GitHub Actions)
STATS_PERIOD=           # AfS period, e.g. "2025h2" (sync script + GitHub Actions)
MSS_XLSX_URL=           # MSS social index XLSX URL (optional, sync script)
MSS_PERIOD=             # MSS report period, e.g. "2023" (optional, sync script)
MSS_SDI_URL=            # MSS SDI XLSX URL (optional, for Status/Dynamik index)
```

## Component Patterns

### Client-Side React Components
Use `client:load` or `client:only="react"` directive:
```astro
<Navbar client:load user={session?.user} />
<CalendarWrapper client:only="react" />
<ForumWrapper client:only="react" session={session} />
```
Note: `ForumWrapper` uses `client:only="react"` (not `client:load`) because the forum is fully interactive (TanStack Query, client-side state) with no SEO benefit from server rendering.

### Wrapper Pattern
Complex React components use a wrapper pattern:
- `CalendarWrapper.tsx` → `CalendarContainer.tsx`
- `ForumWrapper.tsx` → `ForumContainer.tsx`

### Forum patterns (List/Pagination, Performance/SSR, Post Images, Save/Bookmark, Search & Tag Filtering, Card Interactions)
See `src/components/forum/kiosk/CLAUDE.md` — full notes load when working in that subtree. The forum spans dirs (`src/pages/api/topics/*`, `src/lib/topicsQuery.ts`, `src/lib/forumQueryOptions.ts`); read the area file directly when working on those server-side pieces.

### TanStack Query — optimistic updates (gotchas)
- **Use real userId, not placeholders**: optimistic `setQueryData` that mutates `likedBy: [...ids, 'optimistic-user-id']` will not match the real user id in subsequent `.includes(user.id)` checks, so UI state (heart filled/unfilled) won't flip until server refetch. Pass the actual `user?.id` into the mutation hook. See `useLikeMutation.ts`.
- **Don't stack `onSuccess` + `onSettled` invalidations** with `refetchType: 'all'` — the double refetch overwrites the optimistic state and causes visible flicker/delay. Canonical v5 pattern: `onMutate` does the optimistic write + snapshot, `onError` rolls back, `onSettled` runs a single `invalidateQueries`. Drop `onSuccess` entirely.

### Calendar Date Range Selection
- **Click-to-select**: Click a future day to select it (teal highlight + speech-bubble tooltip), click another future day to select a range (teal highlight across days)
- **Tooltip**: Floating speech-bubble with "+" (mobile) / "+ Event" (desktop) above selected cell — opens EventModal with dates pre-filled (09:00–17:00, or next full hour if today)
- **State design**: `selectedDate` (sidebar filtering) is separate from `rangeStart`/`rangeEnd` (event creation) — past date clicks update sidebar only and clear range
- **Auto-swap**: If second click is before start date, they swap automatically
- **Extend/shorten**: Click after end → extends range forward; click within range → shortens to that day
- **Pivot**: Click end date again → makes it the new start (ready to select new range from there)
- **Deselect**: Click start date (no range) → deselects; click before start (range exists) → new selection
- **Auth-gated**: Tooltip only appears for logged-in users
- **`prefillDates` memoized** via `useMemo` in CalendarContainer to prevent useEffect churn in EventModal

### Pagination
- **React component**: `src/components/ui/Pagination.tsx` — reusable with props for accent color, page size options, item label
- **Used in**: Forum (`ForumContainer.tsx`, client-side slicing, 12/24/48), Newsboard (`NewsCards.tsx`, server-side, 12/24/48)
- **Svelte inline**: Marketplace (`MarketplaceBrowse.svelte`), Blog (`BlogSearch.svelte`), Admin Moderation (`ModerationQueue.svelte`) — same layout, adapted to Svelte syntax
- **Features**: First/Prev/Next/Last buttons, "Page X of Y · N items" display, optional page size dropdown
- **Accent colors**: Wine/burgundy for forum and newsboard, teal for marketplace/moderation, white-on-dark for blog

### Blog Tag Bar (Mobile)
See `src/components/blog/CLAUDE.md` — full notes load when working in that subtree.

### Splash Screen
- `SplashScreen.astro` — plays logo video with fade-out and 3D CSS effect
- **Page allowlist**: Only shows on main nav pages (`/`, `/blog`, `/newsboard`, `/calendar`, `/marketplace`, `/profile`, `/schillerkiez`). Sub-pages (e.g. `/blog/my-post`, `/login`) skip it entirely via pathname check.
- **Session-gated**: `sessionStorage['mahalle-splash-shown']` — shows once per session, skipped on subsequent main-page visits/reloads. Also skipped if `prefers-reduced-motion: reduce`.
- Included in both `BaseLayout.astro` and `BlogBaseLayout.astro`
- Uses `<script is:inline data-astro-rerun>` for synchronous execution and ViewTransitions compatibility
- Hidden by default (`display: none` in CSS) — JS shows it only on allowed pages to prevent flash-of-overlay
- Dual-gate dismiss: waits for both video end AND `window.load` before fading out. Safety timeout bumped to 4s.
- **No blob flash**: `<video>` has `visibility: hidden` + dark bg (`#0e1033`) until `loadeddata` fires (first frame decoded), then JS adds `.ready` class to reveal. Prevents empty blob-shape showing before frames paint.
- **Autoplay fallback**: `video.play()` catch → dismiss after 600ms. Covers mobile Firefox where muted autoplay still blocks.
- **Overlay**: transparent bg, `backdrop-filter: blur(2px)` — just softens the page behind, no dark tint.
- **Body bg**: `BaseLayout` uses `bg-[#0e1033]` (dark indigo) to match dark-glass redesign pages — no yellow flash behind glass divs.
- **Video**: compressed to ~56 KB (H.264 720x720 CRF 30, `+faststart`, no audio). `fetchpriority="high"` on `<video>` for early download.
- Uses native Web Animations API (not Motion) because `is:inline` scripts can't use ES imports
- `astro:before-swap` listener (commented out, available if needed) strips overlay from incoming pages

### Global UI: Toasts & Confirm Dialogs
- **Toast system**: `sonner` library, triggered via `CustomEvent` bridge (`app:toast`) from `src/utils/toast.ts`
- **Confirm dialog**: Custom `<dialog>`-based modal replaces all `window.confirm()` calls. Uses `CustomEvent` bridge (`app:confirm`) with `confirmAction()` returning `Promise<boolean>`. Works across React and Svelte.
- Both are mounted globally in `ToastProvider.tsx` (rendered in layouts) — no per-component state needed
- `confirmAction(message, { title, confirmLabel, variant })` — `variant: 'danger'` shows red confirm button

### Cloudinary URL Optimization
- **Utility**: `src/utils/cloudinary.ts` exports `optimizeCloudinary(url)` — rewrites any Cloudinary URL to inject `f_auto,q_auto` (auto format + auto quality) for ~30-60% smaller transfers. No-op for non-Cloudinary URLs or URLs that already have those transforms.
- **Applied in**: `Navbar.tsx` (user avatar), `UserProfile.tsx` (profile picture), `ForumContainer.tsx` (post cover images), `ReadMoreModal.tsx` (post gallery images). Apply anywhere you render user-uploaded Cloudinary images.

### Page Header
- **Component**: `src/components/ui/PageHeader.astro` — animated title with fade-in + sweeping status bars
- **Props**: `title`, `subtitle?`, `color?` (hex, defaults to wine `#814256`), `subtitleClass?` (defaults to `text-gray-600`)
- **Animation**: `is:inline data-astro-rerun` script — re-triggers on every ViewTransitions navigation. Title fades in + slides up, then 3 decorative bars sweep in with staggered delays. Respects `prefers-reduced-motion`.
- **Used on**: All main pages (`/`, `/calendar`, `/newsboard`, `/marketplace`, `/blog`, `/profile`, `/schillerkiez`). Blog uses `color="#ffffff" subtitleClass="text-white/80"` for dark background. Marketplace uses `color="#4b9aaa"` (teal). Schillerkiez uses `color="#6aab8e"` (green).

### Glass Utility System
Five opt-in CSS utilities in `global.css` layer the dark-glass look. Pair them as needed with standard Tailwind dark-glass classes (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.15] ...`).

- **`.glass-inner-glow`** — Apple-style `box-shadow: inset 0 0 22px -4px rgba(255,255,255,0.4)`. Zero cost. Drop-in on any glass surface for a subtle inner highlight.
- **`.glass-luxe`** — full-area liquid glass: `::after` with `backdrop-filter: blur(8px)` + `#glass-distortion` SVG filter (wobble). Used on the profile hero card. Host must have **no** `bg-*` or `backdrop-blur-*` — the pseudo handles it.
- **`.glass-luxe-edge`** — same wobble as luxe but masked to an edge frame via radial `mask-composite: exclude`. Host keeps its own bg color visible in the center. Used on forum cards so the tan `bg-[#c9c4b9]/75` remains the trademark center while edges show the glass refraction. Base uses `#glass-distortion-subtle` (gentler scale/blur settings).
- **`.glass-smooth`** — same shape as `glass-luxe` but **no SVG filter**: flat blur + tint, no wobble. Use when the wobble looks too fragmented or the surface doesn't need refraction.
- **`.glass-smooth-edge`** — flat blur + tint masked to an edge frame. Use when you want a glass frame without the SVG cost.

**Required helper component:** `GlassFilters.astro` (injected once in `BaseLayout` and `BlogBaseLayout`) defines three SVG filters — `#glass-distortion` (default, scale 60), `#glass-distortion-strong` (scale 110, for hover), `#glass-distortion-subtle` (low-frequency, heavy blur, scale 85 for organic curl without chunkiness). Without this component mounted, `.glass-luxe*` classes render as flat glass (SVG url() refs silently no-op).

**Why `::after` instead of filtering the host:** `backdrop-filter` and `filter` create a containing block for `position: fixed` descendants (see Common Errors). Putting the filter on `::after` keeps the host a normal element, so modals inside still escape to the viewport. Also isolates `z-index` via `isolation: isolate`.

**Reduced motion:** all `.glass-luxe*` variants drop the SVG filter under `prefers-reduced-motion: reduce` (flat glass fallback). Effect gracefully degrades — nothing disappears.

### Low-perf Device Detector
Inline script in `<head>` of both `BaseLayout.astro` and `BlogBaseLayout.astro`. Runs before first paint, tags underpowered devices so heavy SVG filters degrade to flat glass.

```js
if ((navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) ||
    (navigator.deviceMemory && navigator.deviceMemory < 4)) {
  document.documentElement.classList.add('low-perf');
}
```

`.low-perf .glass-luxe-edge::after, .low-perf .glass-luxe::after { filter: none }` in `global.css` drops the filter on flagged devices. Old Android (2 cores, 2 GB) → flat; modern iPhone/flagship → full wobble. Safari/Firefox `deviceMemory` is undefined — falls back to core count only, fail-safe (unknown = assume capable). Brave/Tor spoof `hardwareConcurrency` to 2 → falls to flat; zero harm, they opt into minimalism. Pattern reusable for any "heavy effect on mid-tier mobile" concern.

### `content-visibility: auto` for heavy card lists
Forum cards wear `[content-visibility:auto] [contain-intrinsic-size:400px]`. Offscreen cards skip layout, paint, AND filter passes — browser treats them as the intrinsic size until they enter the viewport. On a 12-card page with only 4 visible, 8 cards' `backdrop-filter` + SVG wobble never run. Layout jumps avoided via `contain-intrinsic-size` matching the real `h-[400px]`. Apply to any list where items have expensive filters/shadows AND fixed/predictable height. Don't use on items with unpredictable height — `contain-intrinsic-size` will mis-estimate and cause scrollbar jitter.

### Animation (Motion Library)
- **Navbar**: `motion/react` — spring-based menu slide (`AnimatePresence`), staggered nav item entrance
- **Calendar**: `motion/react` — spring-physics slide on month change (grid slides horizontally, month name slides vertically). `AnimatePresence mode="popLayout"` for smooth height transitions between 4/5/6-week months. Direction tracked via `useRef`.
- **Newsboard**: `motion/react` — `whileInView` scroll-triggered card reveals with per-column stagger delay
- **Splash screen**: Native Web Animations API (fade-in/out) — `is:inline` context, no imports
- **Kiez dashboard**: Scroll-triggered section reveal via IntersectionObserver (`use:reveal` Svelte action). CSS transitions for opacity + translateY. Respects `prefers-reduced-motion`.

## Color Palette
The project uses these CSS variables (defined in `global.css`):
- `--color-primary`: #4b9aaa (Teal)
- `--color-secondary`: #814256 (Wine/Burgundy)
- `--color-yellow`: #eccc6e (Yellow/Gold - main background)
- `--color-gray`: #aca89f (Gray/Beige)

When I say yellow, red, green, I always mean the default variants of the project.

## Common Errors to Avoid

### SSR Compatibility
- `typewriter-editor` requires dynamic import inside `onMount()` to avoid SSR errors - it accesses browser globals (KeyboardEvent) at module load time
- **Prerendered pages + auth**: Middleware uses `context.isPrerendered` to skip `getSession()` on prerendered routes (avoids `Astro.request.headers` warning). `BlogBaseLayout` reads session from `Astro.locals.session` (populated by middleware) instead of calling `getSession` directly.
- **Navbar on prerendered pages**: `BaseLayout` calls `getSession(Astro.request)` which returns `null` at build time, so `user={undefined}` is baked into static HTML. `Navbar.tsx` compensates by fetching `/api/auth/session` client-side in `useEffect` when `initialUser` is undefined — ensures login state reflects reality on prerendered routes (e.g. `/schillerkiez`).
- **QueryProvider hydration**: `src/providers/QueryProvider.tsx` renders the same JSX tree on SSR and client (`<QueryClientProvider>` only). The cache persister attaches imperatively via `persistQueryClient` in a client-only `useEffect` — if you wrap with `<PersistQueryClientProvider>` instead, the SSR/client trees differ and React hydration crashes, which cascades to Svelte `effect_orphan` errors on any `client:only="svelte"` island.

### Astro Script + ViewTransitions
- Module `<script>` tags are deferred and only execute once — they do NOT re-run on ViewTransitions navigation
- `<script is:inline>` may or may not re-run — use `data-astro-rerun` to force re-execution on every navigation
- For critical synchronous code (e.g. splash screen), always use `is:inline` — module scripts load too late for timing-sensitive DOM manipulation
- `astro:before-swap` event can modify `e.newDocument` before it enters the live DOM — useful for stripping elements from incoming pages

### `position: sticky` + `overflow-x: hidden` interaction
- **Do NOT use `overflow-x: hidden` on `html` or `body`** — it silently breaks every `position: sticky` on the site. Per CSS spec, when one axis of `overflow` is `visible` and the other is not, `visible` computes to `auto`, turning the element into a scroll container. Sticky descendants then try to stick relative to body (which doesn't scroll) instead of the viewport, and never activate.
- **Use `overflow-x: clip` instead** (supported in all modern browsers since 2020-2022). `clip` prevents horizontal overflow without creating a scroll container. For very old browsers, pair with `overflow-x: hidden` as a fallback declaration FIRST:
  ```css
  html, body {
    overflow-x: hidden; /* fallback for pre-2020 browsers */
    overflow-x: clip;   /* modern — preserves position: sticky */
  }
  ```
- **If sticky stops working anywhere in the project**, check `global.css` and any container components for `overflow-x: hidden` on the axis-scroll ancestors. Use `getComputedStyle(el).overflowY` in devtools to verify — the "upgraded" value shows as `auto` even if you wrote `visible`.
- **This was a real latent bug discovered in March 2026.** The fix preserves sticky positioning globally (sticky headers, blog sidebars, calendar agenda headers, and any future sticky usage).

### `backdrop-filter` creates a containing block for `position: fixed` descendants
- **Any element with `backdrop-filter: blur(*)` (or `filter`, `transform`, `will-change`, `perspective`, `contain: paint/layout/strict`) creates a containing block for its `position: fixed` descendants.** This means a modal with `position: fixed inset-0` inside a glass container with `backdrop-blur-*` will position relative to the container, not the viewport — rendering off-screen or partially visible.
- Symptom: modal opens (DOM is there, hydration works, backdrop darkens the page) but the modal content renders at weird coordinates (`rect.top` way above or below viewport). Often looks like "the modal doesn't open" because content is invisible.
- **Fix:** remove `backdrop-filter` from any ancestor of a fixed-positioned modal/overlay. On forum/blog/marketplace/etc., the outer glass container uses bg + borders only (no backdrop-blur). Cards inside can still have backdrop-blur on hover since they don't contain fixed descendants.
- **Known offenders to watch:** `.dark-glass-gradient` (fine — it's a sibling, not ancestor), any `bg-*/[n] backdrop-blur-*` wrapper that has a modal-opening action inside. If you add a new glass wrapper, audit whether any descendant can open a fixed overlay.
- **Unlike the sticky/overflow gotcha, this one was masked by working tests** — the modal works when opened from a non-glass-wrapped page, fails on forum/calendar/etc. First hit: forum ReadMoreModal in April 2026.

### Modal scroll-lock: wrap in `<RemoveScroll>` from `react-remove-scroll`
- All 5 modals (ReportModal, EventModal, PostModal, ReadMoreModal, EventViewModal) use `<RemoveScroll enabled={isOpen}>` as the outermost wrapper. Battle-tested lib (used by Radix, Headless UI) that handles iOS touch-scroll, desktop scrollbar-gutter compensation, and nested-scroller preservation.
- Replaced earlier `overflow: hidden` on html/body and `position: fixed; top: -scrollY` patterns — both had edge cases (iOS touch leaks, fixed-descendant conflicts with `backdrop-filter` containing blocks).
- For new modals: just wrap in `<RemoveScroll enabled={isOpen}>` and drop any bespoke scroll-lock `useEffect`.

### Server-only modules bleeding into client bundles
- **The server/client boundary in Astro is enforced by what you TRANSITIVELY import, not by file location.** If a React component with `client:only="react"` (or `client:load`) imports anything from a module that in turn imports `mongodb`, `fs`, `auth-astro/server`, etc., Vite pulls that entire module graph into the browser chunk. Node built-ins (`net`, `tls`, ...) get silently externalized and the chunk fails to evaluate at runtime — the component just never mounts.
- **Symptom**: page renders, hydration slot is empty, no obvious error in build output. `pnpm build` goes green because Vite doesn't error on unresolved Node built-ins in client bundles — it just produces a broken bundle. You only see it when you load the page in a browser.
- **Rule**: any file imported from both server (`.astro` frontmatter, `/api/*` routes) and client (React components, `.svelte` with `client:*`) must be **dependency-pure** — constants, types, pure functions. The moment it imports `mongodb`/`fs`/etc., it becomes server-only for import purposes.
- **Pattern**: split shared constants into a standalone file. Example: `src/lib/forumQueryOptions.ts` (pure, imported by both) vs `src/lib/topicsQuery.ts` (server, imports `connectDB`). The server file can re-export the constant for convenience; the client imports from the pure file directly.
- **Prevention**: after any SSR-touching change (new `Astro.locals` data threaded through, new shared util between page and component), **actually load the page in a browser** before declaring done. `pnpm build` is necessary but not sufficient.
- **First hit**: April 2026 — `FORUM_QUERY_OPTIONS` lived in `topicsQuery.ts`, which imports `connectDB`. ForumContainer's browser chunk included MongoDB, forum never hydrated.

### Sticky bottom bars + `KioskLayout` footer math
See `src/components/forum/kiosk/CLAUDE.md` — full notes load when working in that subtree (rule of thumb: don't add a big spacer above sticky bars on kiosk pages — the `KioskFooter` already provides clearance).

## UI Verification (playwright-cli)

`@playwright/cli` (Microsoft, v0.1.x — released May 2026, **not** the old deprecated `playwright-cli` package) is installed globally for browser verification. Lets the assistant navigate the running dev server, capture token-efficient YAML snapshots of the a11y tree, click/fill elements, and read console logs — without needing the user to send screenshots.

- **Install** (already done; one-time): `npm install -g @playwright/cli@latest && playwright-cli install-browser chromium && playwright-cli install`. System libs `libnspr4` + `libnss3` required on bare WSL Ubuntu (everything else usually pre-installed).
- **Workspace files**: `.playwright/cli.config.json` (config) and `.playwright-cli/` (per-session snapshots + console logs). Both are gitignored.
- **Common flow**: `playwright-cli open <url>` opens the browser, navigates, and captures a snapshot at `.playwright-cli/page-<timestamp>.yml`. Element refs (`[ref=eN]`) in the YAML are usable with `click`, `fill`, `type`, `hover`, etc. Always `playwright-cli close` at the end of a verification session — daemons survive across commands.
- **Caveat: `client:only` Svelte/React islands**. The initial snapshot fires at `domcontentloaded`, before islands hydrate. `<main>` will look empty on Forum pages. Either re-snapshot after a delay, or use `wait-for` for a known post-hydration selector.
- **Caveat: auth-gated routes**. `/topics/create`, `/admin/*` redirect to `/login`. Two ways to verify auth-only UI: (a) scripted login — `goto /login` → `fill` email + password → `click Login` (requires test creds in chat — avoid); (b) cookie reuse — user logs in once in their normal browser, copies session cookie, assistant sets it on the CLI session (preferred — no creds in chat history).
- **When to use it**: any time the user reports a visual issue ("there's a gap", "looks wrong on mobile") OR you've made a UI change you want to verify before declaring done. Avoids the "I theorized it was invisible — actually no, the user could see it" trap from the May 2026 mobile-compose polish session.

## Secret Scanning
- **Pre-commit**: `.husky/pre-commit` runs `gitleaks protect --staged` on every commit. Falls back to a warning (exit 0) if gitleaks isn't installed locally, so collaborators without it aren't blocked.
- **CI safety net**: `.github/workflows/gitleaks.yml` runs `gitleaks/gitleaks-action@v2` on push to `main` and on PRs — catches anything that bypassed the local hook.
- **Whitelist**: `.gitleaksignore` lists historical findings accepted as residual risk (fingerprint format `<sha>:<file>:<rule>:<line>`). Add new entries only after a deliberate decision; each line silences a real finding.

## License
PolyForm Noncommercial 1.0.0 — see `LICENSE`. Free for noncommercial use; commercial use requires a separate license from the author.

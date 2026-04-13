# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Mahalle - A Fullstack Community Web App for Local Neighborhoods. The name means "neighborhood" in Turkish and sounds like "meine Halle" (my hall) in German, reflecting the multicultural community it serves.

## Tech Stack
- **Framework**: Astro 5.x with React 18.2 (hybrid SSR/SSG)
- **Styling**: Tailwind CSS 3.4
- **Animation**: Motion 12.x (`motion/react` for React, Web Animations API for Astro inline scripts)
- **State Management**: Zustand 4.4
- **Data Fetching**: TanStack Query 5.17
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
├── stores/           # Zustand stores
├── styles/           # Global CSS
├── types/            # TypeScript types
└── utils/            # Helper functions
```

## Key Architecture Patterns

### Authentication Flow
- Uses `auth-astro` wrapping NextAuth v5 beta
- Credentials provider with bcrypt password hashing
- MongoDB adapter for session storage
- JWT strategy for stateless auth
- Config in `auth.config.ts`

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
- Zustand for UI state (forumStore.ts)
- React Query for server state

### Content Moderation
- **AI moderation**: OpenAI `omni-moderation-latest` scans all content types (topics, comments, events, announcements, recommendations, marketplace listings) on submission
- **GPT spam check**: `checkSpamWithGPT()` runs in parallel with `moderateText()` on all content types — catches spam, ads, scams that the safety scan misses. `irrelevant_nonsense` classification is treated as legitimate (too many false positives on short/casual content like "nice", "Çok iyi!"). Only `spam`, `ad_promotional`, and `scam` are flagged.
- **Image moderation**: Forum posts (topics, announcements, recommendations) and marketplace listings get `checkImagesWithGPT()` (GPT-4o vision) for image safety — runs in parallel with text moderation
- **Turkish filter**: Custom blocklist in `lib/moderation.ts` for Turkish profanity (OpenAI is English-focused)
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
- **Sortable columns**: Date (`createdAt`), Flagged For (`maxScore`), Decision (`reviewStatus`) — click header to toggle asc/desc
- **Column visibility**: "Columns" dropdown to show/hide columns; Reason/Warning hidden by default
- **Improved pagination**: Page size selector (10/25/50), First/Prev/Next/Last buttons, "Page X of Y"
- **Bulk actions** (queue view only): Select items via checkboxes → Approve All / Reject All with `confirmAction()` dialogs
- **Human-readable categories**: Raw strings like `spam_check:irrelevant_nonsense` displayed as "Irrelevant content", `image_safety:sexual` as "Sexual image", etc. (via `CATEGORY_LABELS` map + `formatCategory()`)

### Newsboard
- **Daily AI fetch**: Vercel cron (6 AM daily) triggers `/api/news/fetch-daily` which fetches from 9 RSS feeds + NewsData.io API
- **RSS feeds**: Tagesspiegel, Berliner Zeitung, Berliner Kurier, nd-aktuell, taz, Kiez und Kneipe, Schillerpromenade, Facetten Neukölln, Pro Schillerkiez
- **GPT-4o scoring**: All articles scored for Berlin/Neukölln relevance (threshold 70/100, max 20/day)
- **Relevance sorting**: Articles sorted by day (`fetchDate`), then user-submitted first, then by `aiRelevanceScore` descending (most hyperlocal on top). User-submitted articles get `fetchDate` set at admin approval time, not submission time.
- **Auto-approve**: AI-fetched articles are auto-approved (no moderation needed); only user-submitted news goes through moderation
- **Image pipeline**: RSS media:content → enclosure → description `<img>` → og:image scrape → placeholder fallback
- **Dedup**: By sourceUrl + title, with unique index on title
- **Bookmarks**: Server-side persistence via `savedNews` collection (localStorage fallback for logged-out users)
- **Filters**: Date range tabs (7d, 30d, 3m, 6m, 1y, Archive), live search with 300ms debounce
- **Archive**: Articles older than 1 year shown in Archive tab with "Archived" badge
- Key config: `vercel.json` (cron schedule), `src/pages/api/news/fetch-daily.ts` (RSS feeds, thresholds)

### Kiez Data Dashboard
- **Data pipeline**: `scripts/sync-stats.ts` downloads XLSX from AfS (demographics) and MSS (social index), parses with `exceljs`, upserts to MongoDB
- **Sync schedule**: GitHub Actions workflow runs 2x/year (March + September) + manual dispatch
- **LOR codes**: Schillerkiez = 4 Planungsräume (2021+ LOR): `08100102` (Schillerpromenade Nord), `08100103` (Süd), `08100104` (Wartheplatz), `08100105` (Silbersteinstraße). Pre-2021: 2 PLRs `08010117` (Schillerpromenade) + `08010118` (Silbersteinstraße). Sync script auto-detects based on period.
- **MSS column layout**: Pre-2023: S1=unemployment(col4), S2=long-term-unemp(col5), S3=transfer(col6), S4=child-poverty(col7). 2023+: S1=unemployment(col4), S2=child-poverty(col5), S3=youth-unemp(col6), S4=transfer(col7). Sync script handles this via period-aware column mapping.
- **API**: `GET /api/kiez-stats` — public, no auth, 24h cache. Aggregates demographics + social data, pre-computes non-overlapping migration segments (MH includes AUSL)
- **Frontend**: `KiezDashboard.svelte` — Svelte 5 with hand-drawn SVG charts (no chart library). German UI. Fetches data client-side via `onMount`.
- **Charts**: Horizontal bar (age), donut (migration, gender), vertical bar (PLR areas), horizontal bar (social indicators). Uses project color palette.
- **Page**: `/schillerkiez` — prerendered static shell, Svelte hydrates client-side
- **Per-PLR carousels**: Each data section (stat cards + charts) is a horizontally scrollable carousel of 5 same-sized cards (CSS scroll-snap, no JS library). First card shows aggregate, next 4 show per-PLR data with the same chart type (bar chart, donut, etc.). Stat carousels use `lg:grid-cols-5` on desktop; chart carousels remain scrollable at all viewports (~3 visible on desktop).
- **Air quality**: Live data from BLUME API station MC042 (Nansenstraße). `GET /api/kiez-air` proxies LQI grades (1–5) with 30 min cache. No auth, no MongoDB, no sync script. Cards show German pollutant names (Feinstaub, Stickstoffdioxid, Ozon, Kohlenmonoxid) with abbreviations below, plus a color-coded grade scale legend. Pollutants with no current reading show "keine Angabe" instead of being hidden.
- **Carousel scroll-padding**: Chart carousels use `scroll-pl-*` classes matching the edge-bleed `px-*` padding, so `scroll-snap` lands the first card at `scrollLeft = 0`. Arrow visibility uses dynamic `paddingLeft` threshold to prevent flicker.
- **Population trend**: SVG line chart (aggregate + per-PLR population) and stacked area chart (migration diversity %) over time. Uses proportional time axis from `date` field. Section hidden if <2 trend entries.
- **Historical backfill (demographics)**: `bash scripts/backfill-history.sh` (one-time, 6 periods). Use `--dry-run` first.
- **Historical backfill (social)**: `bash scripts/backfill-social.sh` (one-time, 5 MSS periods 2013–2021). Use `--dry-run` first.
- **Social trend chart**: "Soziale Entwicklung" 4-card carousel showing unemployment, child poverty, and transfer benefits over ~10 years. Merges old/new LOR codes for continuous lines across 2021 boundary. Data from `socialTrend` + `plrSocialTrend` API fields.
- **Entrance animation**: Scroll-triggered reveal via IntersectionObserver (`use:reveal` Svelte action). Each section fades in + slides up when it enters the viewport (15% threshold). Respects `prefers-reduced-motion`.
- **Dry-run**: `pnpm tsx scripts/sync-stats.ts --dry-run` — parses XLSX without DB writes (for verifying structure)

## Database Collections
- `users` - User accounts (includes `moderationStrikes`, `isBanned` fields)
- `topics` - Forum posts (includes `moderationStatus`, `isUserReported`, `images` fields)
- `events` - Calendar events (includes `moderationStatus`, `isUserReported` fields)
- `announcements` - Community announcements (includes `moderationStatus`, `isUserReported`, `images` fields)
- `recommendations` - User recommendations (includes `moderationStatus`, `isUserReported`, `images` fields)
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

### Forum List (Pagination)
- **Sticky header**: Tabs + search bar stick at `top: 16px` (`sticky top-4 z-30`), CSS-only.
- **Pagination**: Client-side slicing of `filteredItems` into pages of 12 (configurable 12/24/48). Uses the shared `Pagination` component (`src/components/ui/Pagination.tsx`) with wine accent (`#814256`). Page resets to 0 on tab switch or search. Scroll-to-top on page change.
- **Applies to all 3 forums** (Topics, Announcements, Recommendations) via the shared `collectionType` prop.

### Forum Post Images
- **Upload**: Up to 5 images per post (topics, announcements, recommendations), 5MB each. Uploaded to Cloudinary via `POST /api/posts/upload` (session auth, folder `mahalle/posts`, transform 1200x800 limit).
- **Data model**: `images?: { url: string; publicId: string }[]` on Topic, Announcement, Recommendation types. Validated by `PostImageSchema` in `forum.schema.ts`.
- **Moderation**: `checkImagesWithGPT()` runs in parallel with text moderation on create. Flagged images → post goes to `pending` review.
- **Card layout (desktop, >= md)**: Cards with images use `flex-row` — left half (`w-1/2`) contains all content, right half shows cover image (`object-contain` on `#c9c4b9` background). Cards without images use normal `flex-col` layout. All cards have fixed height `h-[300px] md:h-[400px]`.
- **Card layout (mobile, < md)**: Image cards use news-style overlay — hero image with gradient overlay, author/date bottom-left over gradient, title + icons below image. Image is clickable to open modal. Text-only cards unchanged.
- **Icon toolbar**: All action icons (bookmark, comment, eye, heart, report, edit, delete) in a single `justify-evenly` row above the tags section. Removed from the teal author ribbon. Consistent across all screen sizes.
- **PostModal**: Image picker section between body textarea and tags. File input with preview grid, X-to-remove, counter (N/5). Images uploaded to Cloudinary on form submit (not on select). Edit mode pre-populates existing images.
- **ReadMoreModal**: CSS scroll-snap carousel (`w-[65%]` per image, shows 1.5 images). `object-contain` with `max-h-64 sm:max-h-80`. Arrow nav buttons (`<` / `>`) for 2+ images. Single image shows full width. Bookmark + like icons in modal footer.
- **Comments**: Inline in ReadMoreModal (not on card face). Simple cards matching EventViewModal pattern, newest first. `useCommentsQuery(postId)` fetches full comment data.

### Forum Save/Bookmark
- **API**: `POST/GET /api/posts/save` — toggle save/unsave with `savedPosts` collection (`{ userId, postId, savedAt }`). Same pattern as newsboard's `savedNews`.
- **Hooks**: `useSavePostMutation()` with optimistic update (instant toggle, rollback on error) + `useSavedPostsQuery(enabled)` with 5min staleTime. In `useTopicsQuery.ts`.
- **UI**: BookmarkIcon from `lucide-react`. Wine-red fill when saved, wine-red outline when unsaved. Shown in card toolbar and ReadMoreModal footer. Only visible to logged-in users.

### Forum Search & Tag Filtering
- **Search bar**: Filters cards client-side by title, body/description, author name, and tags. X button to clear search. Result count shown below search bar when active.
- **Clickable tags**: Tags on cards act as buttons — clicking sets search value to that tag, filtering all cards with that tag. Works across tab switches (search persists).
- **Tab switch animation**: `AnimatePresence` + `motion.div` keyed by `collectionType + searchValue` — slide-up animation on tab switch and search changes. Smooth scroll to top on tab switch only; search preserves scroll position.

### Forum Card Interactions
- **Clickable content**: Post text and cover image are clickable to open ReadMoreModal (both mobile and desktop).
- **EyeIcon / HeartBtn**: Accept optional `color` prop for white-on-image variants (mobile overlay). Default wine-red `#814256`.

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
- **Component**: `src/components/blog/TagBarMobile.astro` — horizontal scrollable tag pills, visible only below `lg` (1024px)
- **"All" pill**: First pill links to `/blog`, highlighted when no tag is active; recovers sidebar's "All Posts" link on mobile
- **Active tag**: `currentTag` prop highlights the matching pill with `bg-white text-[#4b9aaa]`; inactive pills use `bg-white/20 text-white`
- **Edge bleed**: `-mx-4 px-4 md:-mx-8 md:px-8` makes scroll area extend to viewport edges while parent content stays padded
- **Sidebar swap**: Sidebar (`<aside>`) uses `hidden lg:block` — hidden on mobile (tags in bar), visible on desktop. No layout shift.
- **Used on**: `/blog` (index) and `/blog/tag/[tag]` pages

### Splash Screen
- `SplashScreen.astro` — plays logo video with fade-in/out and 3D CSS effect
- **Page allowlist**: Only shows on main nav pages (`/`, `/blog`, `/newsboard`, `/calendar`, `/marketplace`, `/profile`). Sub-pages (e.g. `/blog/my-post`, `/login`) skip it entirely via pathname check.
- No session gating — splash shows on every visit/reload of a main page
- Included in both `BaseLayout.astro` and `BlogBaseLayout.astro`
- Uses `<script is:inline data-astro-rerun>` for synchronous execution and ViewTransitions compatibility
- Hidden by default (`display: none` in CSS) — JS shows it only on allowed pages to prevent flash-of-overlay
- Dual-gate dismiss: waits for both video end AND `window.load` before fading out
- Uses native Web Animations API (not Motion) because `is:inline` scripts can't use ES imports
- `astro:before-swap` listener (commented out, available if needed) strips overlay from incoming pages

### Global UI: Toasts & Confirm Dialogs
- **Toast system**: `sonner` library, triggered via `CustomEvent` bridge (`app:toast`) from `src/utils/toast.ts`
- **Confirm dialog**: Custom `<dialog>`-based modal replaces all `window.confirm()` calls. Uses `CustomEvent` bridge (`app:confirm`) with `confirmAction()` returning `Promise<boolean>`. Works across React and Svelte.
- Both are mounted globally in `ToastProvider.tsx` (rendered in layouts) — no per-component state needed
- `confirmAction(message, { title, confirmLabel, variant })` — `variant: 'danger'` shows red confirm button

### Page Header
- **Component**: `src/components/ui/PageHeader.astro` — animated title with fade-in + sweeping status bars
- **Props**: `title`, `subtitle?`, `color?` (hex, defaults to wine `#814256`), `subtitleClass?` (defaults to `text-gray-600`)
- **Animation**: `is:inline data-astro-rerun` script — re-triggers on every ViewTransitions navigation. Title fades in + slides up, then 3 decorative bars sweep in with staggered delays. Respects `prefers-reduced-motion`.
- **Used on**: All main pages (`/`, `/calendar`, `/newsboard`, `/marketplace`, `/blog`, `/profile`, `/schillerkiez`). Blog uses `color="#ffffff" subtitleClass="text-white/80"` for dark background. Marketplace uses `color="#4b9aaa"` (teal). Schillerkiez uses `color="#6aab8e"` (green).

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

## TODO / Reminders
- [ ] Create a pre-commit hook for automatic credentials/secrets check before git add (husky + custom grep script)

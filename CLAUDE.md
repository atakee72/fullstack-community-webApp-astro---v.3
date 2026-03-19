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
│   │   ├── listings/      # Marketplace listings CRUD + draft save/publish
│   │   ├── reports/       # User report submission
│   │   └── admin/         # Admin moderation APIs
│   └── *.astro       # Page components
├── hooks/
│   └── api/          # TanStack Query hooks
├── lib/
│   ├── mongodb.ts    # Database connection
│   ├── auth.ts       # Auth utilities
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
- **GPT spam check**: `checkSpamWithGPT()` runs in parallel with `moderateText()` on all content types — catches spam, ads, scams that the safety scan misses
- **Marketplace extra**: Listings also get `checkImagesWithGPT()` (GPT-4o vision) for image safety
- **Turkish filter**: Custom blocklist in `lib/moderation.ts` for Turkish profanity (OpenAI is English-focused)
- **Result merging**: `mergeModerationResults()` combines all checks into a single flagged record
- **Daily posting limits**: 5 per rolling 24h for topics, events, announcements, recommendations, and marketplace listings. Comments excluded (lightweight/conversational). Checked before validation to save API costs.
- **User reports**: Community can flag content via report button (all content types)
- **Admin queue**: `/admin/moderation` page (Svelte: `ModerationQueue.svelte`) with filter tabs (All/Posts/Comments/Events/Announcements/Recommendations/Marketplace)
- **Warning labels**: Approved-with-warning content shows blur overlay until user clicks "Show content anyway" (persisted to localStorage)
- **Strike system**: 3 strikes = automatic user ban
- **Status flow**: `pending` → `approved`/`rejected` (with optional warning label)
- Key fields: `moderationStatus`, `isUserReported`, `hasWarningLabel`, `warningText` on content

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

## Database Collections
- `users` - User accounts (includes `moderationStrikes`, `isBanned` fields)
- `topics` - Forum posts (includes `moderationStatus`, `isUserReported` fields)
- `events` - Calendar events (includes `moderationStatus`, `isUserReported` fields)
- `announcements` - Community announcements (includes `moderationStatus`, `isUserReported` fields)
- `recommendations` - User recommendations (includes `moderationStatus`, `isUserReported` fields)
- `comments` - Comments on posts (includes `moderationStatus` field)
- `listings` - Marketplace listings (includes `moderationStatus`, `listingType`, `status` fields)
- `news` - Newsboard articles (AI-fetched and user-submitted, includes `moderationStatus`, `aiRelevanceScore`, `fetchDate`, `sourceName`, `sourceUrl` fields)
- `savedNews` - User bookmarks (userId + newsId pairs, server-side persistence)
- `flaggedContent` - Content flagged by AI or user reports (for admin review queue)

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
```

## Component Patterns

### Client-Side React Components
Use `client:load` or `client:only="react"` directive:
```astro
<Navbar client:load user={session?.user} />
<CalendarWrapper client:only="react" />
```

### Wrapper Pattern
Complex React components use a wrapper pattern:
- `CalendarWrapper.tsx` → `CalendarContainer.tsx`
- `ForumWrapper.tsx` → `ForumContainer.tsx`

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

### Animation (Motion Library)
- **Navbar**: `motion/react` — spring-based menu slide (`AnimatePresence`), staggered nav item entrance
- **Splash screen**: Native Web Animations API (fade-in/out) — `is:inline` context, no imports
- Motion is available for future use: scroll reveals (`inView`), micro-interactions, spring physics

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

## TODO / Reminders
- [ ] Create a pre-commit hook for automatic credentials/secrets check before git add (husky + custom grep script)

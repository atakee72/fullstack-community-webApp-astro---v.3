# Newsboard Feature Plan

## Overview
AI-powered daily news aggregator + user-submitted news for Mahalle community (Schillerkiez, Neukölln, Berlin).

## Architecture

### News Sources (Hybrid Approach)

**Layer 1: RSS Feeds (FREE, unlimited) — Hyper-local**
- Tagesspiegel: `https://www.tagesspiegel.de/contentexport/feed/home` (Berlin, Bezirke, Politik, Wirtschaft, Kultur)
- Berliner Zeitung: `https://www.berliner-zeitung.de/feed.xml` (Berlin, society, economy, culture)
- Both provide: title, description, link, image, category — verified via live fetch
- Look for more Neukölln/Kreuzberg-specific feeds

**Layer 2: News API (free tier) — City / Country / EU / World**
- Primary: Currents API (600 req/day) or NewsData.io (200 req/day)
- Language: German primary, English fallback only
- Keyword queries: "Berlin", "Neukölln", "Kreuzberg", plus category-based (politics, business, health, environment, culture, arts, science, entertainment, community, everyday life)

**Layer 3: GPT-4o — Relevance Filter (~$1/month)**
- Scores all fetched articles in ONE batch call
- Relevance tiers: Schillerkiez/Neukölln (90-100) > Berlin (70-85) > Germany (50-70) > EU/World (40-60)
- Articles scoring > threshold → moderation queue

### Automation
- Vercel Cron Job (free on Hobby plan, 1x/day)
- Endpoint: `/api/news/fetch-daily`
- Schedule: `0 6 * * *` (6 AM daily)

### User Features
- Users can submit news (URL + optional commentary)
- Auto-fetch article metadata via OG tags when user pastes URL
- Users can save/bookmark news (localStorage now, backend in Phase 3)
- Saved items use shared `savedItems` collection (userId + itemId + itemType)

### Moderation
- All news (AI-found + user-submitted) go through moderation queue
- "News" tab in ModerationQueue (added)
- Source badge: 🤖 AI Found / 👤 User Submitted
- Same approve/reject/warning workflow as other content
- Admin approval sets `approvedAt` timestamp on news items

### Database Schema
```typescript
// Collection: news (in types/index.ts as NewsItem)
interface NewsItem {
  source: 'ai_fetched' | 'user_submitted';
  title: string;
  description: string;
  imageUrl?: string;
  sourceUrl: string;
  sourceName: string;
  aiRelevanceScore?: number;
  aiCategory?: string;
  aiReason?: string;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  hasWarningLabel?: boolean;
  submittedBy?: ObjectId | string | User;
  submitterComment?: string;
  isUserReported?: boolean;
  viewCount: number;
  publishedAt: Date;
  fetchedAt: Date;
  approvedAt?: Date;
}

// Collection: savedItems (shared across features, in types/index.ts)
interface SavedItem {
  userId: string;
  itemId: string;
  itemType: 'news' | 'listing' | 'topic' | 'event';
  savedAt: Date;
}
```

## Implementation Phases

### Phase 1: User Submissions ✅ COMPLETED
- NewsCards UI component (React, CSS transitions, teal/burgundy/gold palette)
- `/newsboard` page route + Navbar link
- Submit News form with URL auto-fetch (OG meta tags)
- API: GET `/api/news` (list approved), POST `/api/news/submit`, GET `/api/news/preview`
- TanStack Query hook: `useNewsQuery`, `useSubmitNews`, `useSaveNewsMutation`
- Zod schemas: `NewsSubmitSchema`, `NewsQuerySchema`
- Moderation integration: news → flaggedContent → admin review → approved
- "News" tab in ModerationQueue
- `news` added to collectionMap in review.ts
- Pagination (Previous/Load More)
- Bookmark UI (localStorage only for now)
- Empty/loading/error states

**Files created/modified:**
- `src/components/ui/NewsCards.tsx` — main UI component
- `src/components/NewsCardsWrapper.tsx` — QueryProvider wrapper
- `src/pages/newsboard.astro` — page route
- `src/pages/api/news/index.ts` — GET list endpoint
- `src/pages/api/news/submit.ts` — POST submit endpoint
- `src/pages/api/news/preview.ts` — GET URL preview (OG tag extraction)
- `src/hooks/api/useNewsQuery.ts` — TanStack Query hooks
- `src/schemas/news.schema.ts` — Zod validation
- `src/types/index.ts` — NewsItem, SavedItem types
- `src/schemas/moderation.schema.ts` — added 'news' to content types
- `src/pages/api/admin/moderation/review.ts` — added news to collectionMap + approvedAt
- `src/components/admin/ModerationQueue.svelte` — added News tab
- `src/components/Navbar.tsx` — added Newsboard link

### Phase 2: AI Daily Fetch (PENDING)
- `/api/news/fetch-daily` endpoint
- RSS parsing (Tagesspiegel, Berliner Zeitung)
- News API queries (Currents or NewsData.io)
- GPT-4o relevance scoring (batch call)
- Vercel Cron trigger (`vercel.json` config)
- Deduplication by URL hash

### Phase 3: Save & Profile (PENDING)
- `/api/news/save` endpoint (save/unsave)
- `savedItems` MongoDB collection
- Profile dashboard tabs: Saved News, Saved Products, etc.
- Replace localStorage bookmarks with backend persistence

## Cost Estimates
- News API: $0 (free tier)
- RSS: $0 (free, unlimited)
- GPT-4o filtering: ~$1/month (one batch call/day)
- Vercel Cron: $0 (Hobby plan includes 2 daily crons)
- **Total: ~$1/month**

## Key Decisions
- React (not Svelte) for consistency with existing codebase
- German news primary, English only as fallback
- Display snippets + links, not full articles (copyright compliance)
- GPT-4o over GPT-4o-mini for better German/local context understanding
- URL preview uses native fetch + regex (no npm package needed)
- All user-submitted news requires admin approval regardless of AI moderation result
- Delete/edit for users deferred to later

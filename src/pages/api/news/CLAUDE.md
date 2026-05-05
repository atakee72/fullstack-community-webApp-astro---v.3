# Newsboard notes

Loaded lazily when Claude reads/edits files in `src/pages/api/news/`. Note: the frontend (`src/components/NewsCardsWrapper.tsx`, `src/components/ui/NewsCards.tsx`) lives elsewhere — root `CLAUDE.md` keeps a pointer here so this file can be pulled in for UI tasks too.

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

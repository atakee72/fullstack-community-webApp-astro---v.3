# Newsboard notes

Loaded lazily when Claude reads/edits files in `src/pages/api/news/`. Note: the frontend (`src/components/NewsCardsWrapper.tsx`, `src/components/ui/NewsCards.tsx`) lives elsewhere — root `CLAUDE.md` keeps a pointer here so this file can be pulled in for UI tasks too.

### Newsboard
- **Daily AI fetch**: Vercel cron (6 AM daily) triggers `/api/news/fetch-daily` which fetches from 9 RSS feeds + NewsData.io API
- **RSS feeds**: Tagesspiegel, Berliner Zeitung, Berliner Kurier, nd-aktuell, taz, Kiez und Kneipe, Schillerpromenade, Facetten Neukölln, Pro Schillerkiez
- **GPT-4o scoring**: All articles scored for Berlin/Neukölln relevance (threshold 70/100, max 20/day)
- **Relevance sorting**: Articles sorted by day (`fetchDate`), then user-submitted first, then by `aiRelevanceScore` descending (most hyperlocal on top). User-submitted articles get `fetchDate` set at admin approval time, not submission time.
- **Auto-approve**: AI-fetched articles are auto-approved (no moderation needed); only user-submitted news goes through moderation
- **Degraded-scoring alert**: GPT scoring failure (e.g. OpenAI credits exhausted) falls back to score 50 — below the 70 threshold — so the cron "succeeds" daily while saving nothing (real incident Aug 1–4 2026: board starved 4 days, zero errors). `scoreArticlesWithGPT` returns `{ scored, degraded }`; on `degraded` the handler sends `Sentry.captureMessage` + `flush(2000)` before returning (flush is mandatory — success responses aren't flushed by middleware, Vercel's freeze would eat the event).
- **Image pipeline**: RSS media:content → enclosure → description `<img>` → og:image scrape → placeholder fallback
- **Dedup**: By sourceUrl + title, with unique index on title
- **Bookmarks**: Server-side persistence via `savedNews` collection (localStorage fallback for logged-out users)
- **Filters**: Date range tabs (7d, 30d, 3m, 6m, 1y, Archive), live search with 300ms debounce
- **Archive**: Articles older than 1 year shown in Archive tab with "Archived" badge
- Key config: `vercel.json` (cron schedule), `src/pages/api/news/fetch-daily.ts` (RSS feeds, thresholds)
- **Piggy-backed air-logger watchdog** (Aug 2026): `fetch-daily.ts` calls `checkAirLoggerFreshness()` (`src/lib/kiez/airFreshness.ts`) right after the cron-secret check — nothing to do with news. It rides this cron because Vercel-NATIVE schedules hit the deployment directly and so can't be broken by a domain/alias change, unlike the GitHub-Actions air logger (which a 308 from the retired `*.vercel.app` origin silently killed for two days). Fires `Sentry.captureMessage` + `flush(2000)` when the `schillerkiez_air_log` collection has had **zero** rows in 24h. Zero (not "a few hours") is deliberate: BLUME publishes hourly and healthy days land 17–21 readings, so multi-hour gaps are normal and a tight threshold would cry wolf. It is best-effort and never throws — a watchdog must not fail its host cron — but it reports its own failure rather than swallowing it. Placed BEFORE the early returns so a news-side outage can't also blind the air check.

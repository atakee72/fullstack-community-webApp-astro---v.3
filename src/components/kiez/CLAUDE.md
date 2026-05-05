# Kiez dashboard notes

Loaded lazily when Claude reads/edits files in `src/components/kiez/`. Covers both the Svelte frontend and the data pipeline (sync script + APIs) — the section cross-references `scripts/sync-stats.ts` and `src/pages/api/kiez-stats.ts`.

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

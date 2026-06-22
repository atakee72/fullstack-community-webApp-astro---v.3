# READMEFIRST · Newsboard handoff (Batch 2.3)

Read me before you implement anything. Newsboard is the most natural fit yet for the Kiosk identity (it's literally a newspaper) — but it has more codebase entanglement than Marketplace did, so the gotchas matter.

This handoff lands AFTER Forum, Calendar, and Marketplace are shipped in the codebase. Tokens / paper-grain / KioskNav / strap system are all already there. Newsboard extends, doesn't replace.

---

## Feed order for Claude Code

1. **`NEWSBOARD_SCOPING.md`** — locked decisions: direction, novel features, what's in/out of scope, codebase gotchas. Read this first; it answers the "why" behind every artboard.

2. **Existing design system in your codebase** (already shipped):
   - Kiosk tokens (`tokens.css` from Forum batch)
   - Marketplace tokens (`tokens-marketplace.css` from Batch 2.2)
   - Calendar tokens (`tokens-calendar.css` from Batch 2.1)
   - Paper-grain `body::before` — already global, untouched
   - `KioskNav` component — reuse exactly, just register the active="News" prop
   - Carved-title device, strap labels, riso shadows, type ramp — all reused from Forum

3. **`tokens-newsboard.css`** — Newsboard token extension:
   - **7 sektion tokens** (`--sektion-politik` etc.) mapped to existing Kiosk palette + 1 aux (`--sektion-klima: #8aa67a` — shared with Marketplace's `--cat-pflanze`).
   - **10 quelle tokens** (`--quelle-rbb` etc.) — source-chip accent only, never page accent.
   - **3 read-decay opacity tokens** (`--news-read-opacity-{fresh,seen,archived}`).
   - **Heat-indicator tokens** (`--news-heat-threshold`, `--news-heat-color`).
   - **2 quota tokens** (`--news-submit-quota`, `--news-forum-quota`) — these are SEPARATE, both 5/day.
   - **Carved accent override:** Newsboard's `--carved-accent` resolves to `--k-ink` via `[data-page="newsboard"]`. Forum=wine, Calendar=teal, Marketplace=wine, Newsboard=ink.

4. **`motion-newsboard.css`** — Newsboard motion keyframes:
   - mark-as-read flip (instant, no fade — committed feel)
   - save-bookmark tuck (220ms ease-out)
   - heat-chip pop (280ms spring on first paint only)
   - masthead intro (600ms rise, once per day per session)
   - loading-skeleton sweep (2.4s loop, same tempo as Marketplace)
   - feed-card slot-in (post-mod success)
   - pending-mod pulse
   - `prefers-reduced-motion` fallbacks for all of the above

5. **JSX files in dependency order** *(the JSX is the source of truth — CSS files are convenience extracts):*

   1. `jsx/kiosk-system.jsx` — base design system (you already have this from Forum; included here for completeness).
   2. `jsx/kiosk-newsboard.jsx` — tokens + atomic components (`SourceChip`, `SektionTag`, `KuratiertChip`, `HeatChip`, `ReadDot`, `SaveToggle`, `ArticleImage`) + `SEED_ARTICLES` + `TODAY` constant + Masthead + FilterRail + NewsCard/NewsCardLead/NewsCardMobile + `NewsboardIndexDesktop` / `NewsboardIndexMobile`.
   3. `jsx/kiosk-newsboard-detail.jsx` — `ArticleBody`, `SourceFooter`, `ReadingListControls`, `ForumDiscussCTA`, `RelatedRail` + 3 detail variants (`NewsDetailDesktop`, `NewsDetailUserSubmitted`, `NewsDetailMobile`).
   4. `jsx/kiosk-newsboard-submit.jsx` — `QuotaIndicator`, `Field`, `SektionPicker` + `NewsSubmitBlank` / `NewsSubmitFilled` / `NewsSubmitMobile`.
   5. `jsx/kiosk-newsboard-states.jsx` — 9-state matrix (display 01–03, fetch+sources 04–06, submission 07–09) + mobile vertical stack.
   6. `jsx/kiosk-newsboard-novel.jsx` — three novel features with anatomy diagrams: Masthead, Read-decay timeline, Heat-indicator logic.

6. **Self-contained canvas bundle** — `Mahalle Redesign.html` in this handoff dir. Open it locally to scrub through every artboard with `?` showing keyboard shortcuts.

---

## Rules of engagement

- **The JSX files are the spec.** Tokens-CSS + motion-CSS are convenience extracts. If they disagree with the JSX, the JSX wins.
- **Reuse, don't re-derive.** `KioskNav`, paper-grain, carved-title, strap labels, riso shadows, type ramp, `KioskBtn` — all already shipped. Don't reimplement.
- **Carved-title accent for Newsboard = INK** (`var(--k-ink)`). Restrained newspaper-traditional. Headlines do the work — no decorative color flooding.
- **`Schillerkiez Kurier` is a proper noun.** Same name DE and EN. Don't translate.
- **`TODAY.issue` (Nr. 142) is server-side fixed per-day**, not per-render. Compute as days since notional launch Jan 3 2026. Don't read `Date()` in the client to derive it.
- **Read-state is AUTH-GATED.** Server-side persistence for logged-in users only. Guests see all articles as unread; the read-toggle is hidden for them. **No localStorage fallback** — keeps the logic clean.
- **No optimistic rendering for user-submitted articles.** Unlike Forum (where posts appear immediately + AI-mod runs in parallel), Newsboard waits for AI-mod approval before slotting the article into the feed. The `news-card[data-just-approved="true"]` animation runs ONLY after success.
- **NewsData API key is OPTIONAL.** If absent or failing, the `degraded` variant of the index renders an RSS-only banner. 7/9 sources still curate normally — this is NOT an error state, it's a quieter normal.
- **Heat indicator is asymmetric.** Newsboard shows the ♨ chip when ≥2 forum posts link to an article. Forum threads show the article link as normal — they don't get a reverse-heat indicator. Newsboard knows about Forum; Forum doesn't know about Newsboard.
- **German curly quotes in JS string literals:** opener `„` (U+201E) + closer `"` (U+201C). Straight ASCII `"` after `„` terminates the JS string and breaks Babel. This bit me three times across Calendar/Marketplace/Newsboard. Lint your German strings.

---

## Codebase gotchas (locked design responses)

These came from your own scoping notes and are baked into the artboards:

1. **Image pipeline · 4-step RSS fallback.** Roughly 15–20% of articles end with no image. Designed an explicit `noImage` first-class state: dashed border + source-letter monogram (e.g. "TS" for Tagesspiegel) + `kein bild` label. Lead variant has its own copy: `kein bild · headline trägt`. Not an afterthought — render it cleanly.

2. **AI-fetched articles bypass moderation entirely.** Only user-submitted news enters the queue. State matrix §08 (`pending`) and §09 (`rejected`) cover user-submitted lifecycle only. Do NOT build an admin queue UI for AI-fetched content — that already runs unattended via cron.

3. **`fetchDate` quirk for user-submitted articles** = the moderation APPROVAL timestamp, not the submission timestamp. Masthead copy uses `kuratiert für den 24. Mai` not `was heute passiert` — softens the implicit "happened today" promise. Detail-page copy reads `freigegeben durch Moderation am [fetchDate]`.

4. **NewsData degradation.** Designed `degraded` variant of index + state §06 (RSS-only). Trigger when `NEWSDATA_API_KEY` is absent OR the API returns a non-200. 7/9 sources still curate normally; banner reads `RSS-only · einige Quellen heute nicht erreichbar`. Reserve the warn-color amber for this; don't promote it to error red.

5. **Read-state = auth-gated.** No dual-mode storage. Logged-in users persist server-side; guests see everything as unread and the read-toggle is hidden. Cleaner than localStorage fallback.

6. **Two SEPARATE 5/day quotas.** Submitting news (`/news/submit`) and posting-to-forum from a news article (`/forum/topics/create`) draw on independent counters. Even if newsboard quota is fine, the `im Forum diskutieren` CTA may be exhausted. Show explanatory copy: `Heute schon 5 Themen erstellt — morgen geht's weiter.`

7. **Smart digest cut from scope.** No transactional email infra beyond Resend's contact-relay. Documented at the bottom of `kiosk-newsboard-novel.jsx`. Don't build it.

---

## Out of scope for v1 (don't build)

- **Per-article AI relevance score chips.** Soft transparency via the masthead `kuratiert` chip is enough — picked over per-article `★★★ Kiez-Relevanz` indicator.
- **Smart digest email.** Documented above. Its own project when Resend transactional infra lands.
- **Print archive view** (scroll back through past "issues" like flipping newspapers). Could come later as a `Nr. 141 anzeigen` link on the masthead. Not designed for v1.
- **Reader marginalia** (private notes per saved article). Reading-list with read/unread states + opacity decay is sufficient for v1.
- **Auto-bridge to Forum.** Admin promotion of a hot article to a pinned Forum post is NOT designed. Soft-link only via the `im Forum diskutieren` CTA.
- **Embedded discussion** (comments inline on Newsboard article pages). Forum stays the discussion venue; Newsboard's tie-in is the CTA.
- **Auto-translation** of article content. DE articles stay German, EN articles stay English. UI chrome follows the DE/EN switcher as everywhere else; article content is mix-as-is.

---

## What CC will likely need to write

Roughly, in order:

1. **Newsboard route + index page** — `/newsboard` or `/news` (your call, match existing pattern). Continuous reverse-chrono feed.
2. **Article detail route** — `/news/[id]`. Three variants: standard AI-fetched, user-submitted (with submitter card), forum-quota-exhausted.
3. **Submit flow** — `/news/submit` extends existing `submit.ts` endpoint. Add the 5/day quota indicator + accept/reject sidebars.
4. **State matrix** — wire the 9 states into real conditional rendering.
5. **Masthead** — server-rendered banner with the day's issue number, article count, source count. Optional sessionStorage flag for the once-per-day intro animation.
6. **Read-state schema** — auth-gated `news_read_state` collection: `{ userId, articleId, state: "fresh"|"seen"|"archived", updatedAt }`. Server-renders the opacity into the card.
7. **Heat indicator job** — server-side compute in articles resolver, count `forum_posts WHERE body CONTAINS article.id AND createdAt < now - 1h`, cache 10 min.
8. **Schema additions** — `articles.heatCount?: number`, `articles.fetchSource: "rss" | "newsdata" | "user"`, `users.newsboardSubmitQuota: { day: Date, count: number }`.

---

## Side-notes the user flagged

- `--sektion-klima: #8aa67a` is the SAME aux green as Marketplace's `--cat-pflanze`. They're intentionally shared — both gesture toward the same `kiez-natur` register. Don't fork into separate hex codes.
- Carved-accent table in root `CLAUDE.md` is authoritative: Forum=wine, Calendar=teal, Marketplace=wine, Newsboard=ink. If you find a stale entry mapping Newsboard to another color, fix it from the table — not from any one tokens file.

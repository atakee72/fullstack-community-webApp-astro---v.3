# Newsboard scoping · Batch 2.3

The decisions locked during scoping (May 28 2026) before any artboards were drawn. Each line answers a "why" question the artboards don't explain on their own.

---

## §1 · Direction

**Editorial Kiosk applied to AI-curated daily news.** Continuous reverse-chrono feed framed by a daily masthead. The user feels like they're reading a newspaper that updates itself — not scrolling an algorithmic feed.

- Layout: **continuous reverse-chronological feed**. Not a daily-edition modal, not a sectioned multi-page UI.
- The masthead (`Schillerkiez Kurier · Nr. 142 · 24. Mai 2026`) frames the day's curation without splitting the page into discrete editions.
- Reading depth: **headline + dek + 2–3 paragraph AI summary**, then `weiterlesen` opens the source. Newsboard never renders the full article inline.

---

## §2 · Carved title accent

**INK** (`var(--k-ink)`, near-black). Newspaper-traditional, restrained, lets the headlines carry the page.

Page-accent table (authoritative, mirror in root `CLAUDE.md`):
| Surface     | Accent |
|-------------|--------|
| Forum       | wine   |
| Calendar    | teal   |
| Marketplace | wine   |
| Newsboard   | INK    |

Newsboard's restraint is intentional: the section colors (politik wine, kultur plum, etc.) already do small-area work on the tags. A loud page-accent would compete.

---

## §3 · Sektion taxonomy (7 slots)

| Token              | Label DE   | Label EN | Mapped color |
|--------------------|------------|----------|--------------|
| `politik`          | Politik    | Politics | wine         |
| `kultur`           | Kultur     | Culture  | plum         |
| `lokales`          | Lokales    | Local    | ink          |
| `wirtschaft`       | Wirtschaft | Economy  | moss         |
| `verkehr`          | Verkehr    | Transit  | teal         |
| `klima`            | Klima      | Climate  | #8aa67a (shared w/ marketplace cat-pflanze) |
| `sport`            | Sport      | Sport    | ochre        |

**Rules:**
- Sektion color surfaces ONLY on the small inline tag chip + the filter rail. Never floods backgrounds.
- The rest of the page stays ink-on-paper.
- Two text-on-color values per section so tag chips read correctly (klima + sport have light backgrounds, get dark text).

---

## §4 · Quelle taxonomy (9 sources + user-submitted bucket)

| Slot       | Source                    | Mapped color  | Feed type |
|------------|---------------------------|---------------|-----------|
| `rbb`      | rbb24                     | teal          | RSS       |
| `tsp`      | Tagesspiegel              | wine          | RSS       |
| `taz`      | taz                       | ink           | RSS       |
| `bzb`      | BZ Berlin                 | ochre         | RSS       |
| `bmp`      | Berliner Morgenpost       | plum          | RSS       |
| `nwk`      | Neuköllner Wochenkurier   | moss          | RSS       |
| `nkn`      | neukoellner.net           | wine          | RSS       |
| `nd`       | Neues Deutschland         | danger (red)  | RSS       |
| `newsdata` | NewsData                  | ink-mute      | API (optional) |
| `user`     | eingereicht               | ink-soft      | USER (mod queue) |

Source accent surfaces ONLY on the source chip's letter mark (e.g. "rbb" badge inside the chip). Never used as a page accent.

`user` is its own bucket, not a hidden category — articles wear a moss strap reading "Eingereicht von einer Nachbarin" plus a dedicated submitter card on detail pages.

---

## §5 · AI transparency

**Soft.** A single `kuratiert` chip on the masthead. Nothing per-article.

Rejected alternatives:
- ❌ Invisible — opaque AI feels untrustworthy.
- ❌ Per-article relevance score (`★★★ Kiez-Relevanz`) — chip clutter, false precision.
- ❌ "Why this?" per-article reasoning — adds a UX layer for marginal benefit.

The chip's wording is intentional: `kuratiert` (DE) / `AI-curated` (EN). It's the soft promise that *something* picked the articles, without forcing the user to think about it.

---

## §6 · Save mechanic

**Reading-list style** with read/unread + opacity decay.

| State    | Opacity | When                                |
|----------|---------|-------------------------------------|
| fresh    | 1.0     | unread, just landed                 |
| seen     | 0.55    | user opened the article             |
| archived | 0.32    | user marked done (saved view only)  |

Transitions are **instant** (no fade) — the marking should feel committed.

Rejected alternatives:
- ❌ Flat saved list — boring.
- ❌ Folders — premature scaffolding.
- ❌ Tags — too much vocabulary for users to build.

Read-state is **AUTH-GATED**. Logged-in users persist server-side. Guests see all articles as unread and the read-toggle is hidden for them. No localStorage fallback.

---

## §7 · Filter dimensions

Five filters, all on a sticky rail above the feed:

1. **Sektion** — 7 + "Alle"
2. **Quelle** — 9 sources + user + "Alle". Top 3 shown inline, rest behind `+ 6 mehr`.
3. **Zeitraum** — today / this week / this month
4. **Meine gespeicherten** — toggle (saved-only view)
5. **Ungelesen** — toggle (unread-only view)

Mobile shows a compressed horizontal-scroll version with 4–5 visible chips.

Out of scope:
- ❌ Sprache filter (DE-only / EN-only). Content is mix-as-is — articles stay in their original language.

---

## §8 · Forum tie-in

**Soft link only.** Each article has an `im Forum diskutieren` CTA that opens a new Diskussion in Forum with the article URL pre-filled.

Rejected:
- ❌ No tie-in — orphans Newsboard from the rest of the app.
- ❌ Embedded comments — duplicates Forum's purpose.
- ❌ Auto-bridge (admin promotes hot articles to pinned Forum posts) — needs admin tooling, deferred.

**Two separate 5/day quotas:**
- `news_submit_quota` — for submitting news to Newsboard.
- `forum_topic_quota` — for posting topics to Forum (shared with normal forum cap).

The `im Forum diskutieren` CTA respects `forum_topic_quota`, NOT the newsboard one. Disabled state copy: `Heute schon 5 Themen erstellt — morgen geht's weiter.`

---

## §9 · Languages

**Mix as-is.** DE articles stay German. EN articles (mostly NewsData) stay English. No translation.

UI chrome (filter labels, nav, button copy) follows the DE/EN switcher exactly as it does everywhere else in Mahalle.

Rejected:
- ❌ Auto-translate all content to user's locale — GPT-4o-translated articles read worse than the original.
- ❌ DE-only feed — drops 1–2 useful international stories per day.

---

## §10 · Novel features (3 modules)

The user picked three out of seven proposed. The three that ship:

### Masthead (`Schillerkiez Kurier · Nr. 142 · 24. Mai 2026`)
- Frames each day's curation.
- `TODAY.issue` = days since notional launch Jan 3 2026. Computed **server-side, fixed per-day**, not per-render.
- Variants: standard, RSS-only-degraded, weekend (`Sa/So-Ausgabe`, optional pilot), mobile.
- One-time intro animation on first visit of the session (sessionStorage flag).

### Mark-as-read opacity decay
- Three states: fresh / seen / archived (see §6).
- Visual feels like a marked-up newspaper.
- Auth-gated, server-side persistence.
- ARIA: `aria-label="gelesen"` when decay is active. Never `display: none`.

### Heat indicator (♨ chip)
- Trigger: **≥2 forum posts linking to an article** (threshold in `news.heat.threshold`).
- Server-side computed in articles resolver, cached 10 min.
- Spam protection: only forum posts older than 1 hour count.
- Asymmetric: Newsboard shows the ♨ chip; Forum does NOT show a reverse-heat indicator on its threads.
- Copy variants: `2× im Forum` (low), `4× im Forum` (medium), `9× im Forum` (high).

### Rejected
- ❌ Print-archive view — could come later as a `Nr. 141 anzeigen` masthead link.
- ❌ Featured front-page article with full-bleed editorial — we have a `lead` slot in the index, but it stays compact, not full-bleed. (Editorial lead is in the canvas; it's just not the full-bleed treatment originally floated.)
- ❌ Reader marginalia — read/unread states are sufficient.
- ❌ Smart-digest email — no transactional email infra. Deferred to its own project when Resend transactional lands.

---

## §11 · Mobile coverage

**Full parity, DE + EN, every screen.**

Per surface:
- Index — mobile DE + EN, saved-only mobile, plus the same filter rail (horizontal scroll).
- Detail — mobile DE.
- Submit — mobile DE (compressed compose form with mini quota indicator).
- States — mobile vertical stack of all 9 tiles.

---

## §12 · State matrix (9 states)

Three groups of three. See `kiosk-newsboard-states.jsx`.

### Display (01–03) — color: ink

01. **Lädt heutige Auswahl** — skeleton, 8–14s
02. **Heute keine News** — curation found nothing relevant
03. **Leseliste leer** — saved-only filter, zero items

### Fetch + sources (04–06) — color: danger / warn

04. **Quellen 503** — all sources failed; shows last successful edition + auto-retry in 14 min
05. **Offline · cached** — connectivity gone; renders cached articles at 0.78 opacity
06. **RSS-only · degradiert** — NewsData API down; 7/9 sources curate normally with warn banner

### Submission + moderation (07–09) — color: warn / ochre / danger

07. **5/5 eingereicht** — daily quota exhausted; 5-slot quota indicator + reset countdown
08. **In Prüfung** — user submission running through AI mod; ochre `IN PRÜFUNG` chip
09. **Abgelehnt** — moderation rejected; reason shown; "no strike against your account" reassurance

Legend at the foot of the matrix explicitly notes: **source-degraded (06) is NOT an error** — newsboard works without NewsData.

---

## §13 · Open questions for CC

These came up during scoping; the artboards punt to CC's judgment but the answer needs to be documented in your implementation plan:

1. **Route path** — `/newsboard` or `/news`? Match the existing pattern in your Astro project; either is fine, the design assumes you pick one and stick to it. (Nav active label is "News" / "Newsboard" in the JSX.)

2. **Heat-job scheduling** — cron-every-10-min recompute or recompute-on-write (every new forum post that contains a `news/[id]` URL bumps the article's heat counter). The artboards assume one of these; pick the cheaper one for your infra.

3. **Masthead intro animation persistence** — `sessionStorage` for "seen masthead today" works for the same browser tab, but a fresh tab will replay the animation. If that's bothersome, persist in the user record server-side. (Cosmetic — defer if uncertain.)

4. **Schema for `articles.heatCount`** — store as raw count or as an `isHot: boolean` derived field? Raw count gives you future flexibility (e.g. sorting by heat); boolean is cheaper to query. The JSX renders `count` so we recommend storing the count.

5. **Image fallback storage** — when the 4-step pipeline succeeds, do you cache the image to your CDN or hot-link to the source? Hot-linking is fragile (source rotates URLs, breaks display); caching is the right call but adds storage cost. The `noImage` placeholder makes hot-link breakage less catastrophic, so either is workable.

---

## §14 · Changes from earlier drafts

None — Newsboard scoping happened in a single pass and went directly to canvas without revisions. (Marketplace had a v1.1 revision pass; Calendar shipped first-try; Newsboard matches Calendar.)

The bump+visibility rework that hit Marketplace post-scoping (binding decision A13) does NOT apply to Newsboard — there's no bump mechanic in Newsboard at all. Articles age out naturally as new ones come in, and saved articles stay saved indefinitely until the user archives them.

---

## §15 · Forward-compatibility notes

When/if these come up later, the design already accommodates them:

- **Per-article AI confidence score** — chip slot exists next to `kuratiert` on the masthead; could extend to per-card.
- **Print archive** — masthead's `Nr. 142` is already a clickable anchor; could open a past-issues drawer.
- **Smart digest email** — `news_saved_articles` join table makes a weekly query trivial when Resend transactional lands.
- **Multi-language translation** — `article.title` / `article.titleEN` (and the `summary` arrays) are already shaped for multi-locale; auto-translation would just populate more fields.

These are pure additions; no scoping decision rules them out forever.

# KIEZDATEN_SCOPING — Mahalle Kiez-Daten pass (Editorial Kiosk, Batch 3 · LAST surface)

Designed Jul 13 2026 · packaged Jul 13 2026. Companion to `READMEFIRST.md` — that file has
the four flags, the step-by-step and the non-negotiables; this file is the full spec.

---

## §01 · Direction

- **Metaphor: MESSSTATION.** The page is a measuring station's daily bulletin: live air
  leads on an ink instrument strip, the population/social figures follow as numbered
  „Kanäle“ (channels) in a broadsheet vertical flow. Chosen over Amtsblatt and Almanach
  in the exploration round (boards kept on the canvas under „ENTSCHIEDEN“).
- **Carved accent: MOSS `#6b8a4a`** — the last free primary. Forum/Markt = wine,
  Calendar = teal, Kurier = ink, Auth/Profile = ochre, Admin = plum.
- **Chart hand: MISCHUNG.** Precise hairline axes, grid and tick labels (mono) carry the
  statistical truth; the data marks — bars, lines, donut segments — are hand-printed riso:
  wobbled outlines (`kdWobLine` / `kdWobRect`, seeded, deterministic) plus an offset
  color double-strike (+2px x, +1.6px y, lower opacity) that mimics misregistered ink.
  **Axes are never wobbled.**
- **Broadsheet replaces carousels.** The legacy dashboard's horizontal dark-glass
  carousels are gone. One vertical page, one global PLR selector, every Kanal follows.
- **Headline:** „Der Kiez, *gemessen*“ / „The Kiez, *measured*“ — italic serif verb in
  moss, standard Kiosk carved-title pattern.

## §02 · Page anatomy (desktop 1280)

Top → bottom, each block separated by dashed rules:

1. **KioskNav** — active tab „Kiez“.
2. **Instrument strip** (ink band, full width) — see §05.
3. **Title block** — kicker `KIEZ-DATEN · SCHILLERKIEZ · STAND {date}`, carved H1, serif
   dek, mono fact row (Einwohner · 4 Planungsräume · 2×/Jahr AfS-Sync). Right column:
   the **Zahl der Woche** stamp card (paperWarm, ink-bold border, print shadow, rotated
   0.6°) — see §08.
4. **PLR selector** — see §03.
5. **KANAL 01–05** — see §04. Each Kanal: mono kicker `KANAL NN · {area}`, bold title,
   optional right-side meta (Δ badge, mini locator map, period range).
6. **Footer** — sources line + Messwert-Logger `†` footnote + „⎙ Kiez in Zahlen ·
   A4 drucken“ pill button (print route, §10).

## §03 · PLR selector (global)

- One selector drives ALL Kanäle. Big riso map (`KDMap`, real LOR-2021 polygons from
  `plrPaths.ts`, viewBox `0 0 85 104`) + 5 chips: Gesamt + the 4 PLRs, each chip carrying
  its series-color square + mono population count.
- Active chip = ink fill, paper text. Map highlights the active polygon in its color.
- **Series colors (fixed):** Gesamt = moss `#6b8a4a` · 08100102 Schillerpromenade Nord =
  teal `#3f8f9f` · 08100103 Schillerpromenade Süd = wine `#b23a5b` · 08100104 Wartheplatz =
  ochre `#e8a53a` · 08100105 Silbersteinstraße = plum `#6f2f59`.
- Selecting a PLR recolors charts to that PLR's color and swaps the data; small locator
  maps on Kanal headers follow. **Kanal 05 renders only for Gesamt** (its virtual series
  span the whole Kiez) — the page simply omits it when a PLR is selected.

## §04 · Kanäle

**KANAL 01 · Bevölkerung** — 3-col grid `220px | 1fr | 330px`:
gauge card (pop, ♂/♀, single-person households, Δ vs previous period in the header) ·
trend line 2021–2025 (mix hand, value labels above dots, mono period labels „H2 '21“…) ·
per-PLR small multiples (4 sparklines in series colors + current pop).

**KANAL 02 · Alter** — horizontal bar chart, 7 groups (0–5 / 6–17 / 18–26 / 27–44 /
45–54 / 55–64 / 65+ — the API's u6…a65 buckets). Bar opacity scales with share; label =
`{pct} · {absolute}` (absolute derived, rounded to 10). Grid lines at 0/10/20/30/40 %.

**KANAL 03 · Vielfalt** — double-struck riso donut (3 non-overlapping segments:
foreignNationals = teal · germanWithMigBg = wine · withoutMigBg = ochre) + legend with
the non-overlap caption, beside a 5-period Zeitverlauf line chart (Gesamt only data).

**KANAL 04 · Soziale Lage** — 3 indicator bars (Arbeitslosenquote = teal · Kinderarmut
U15 = wine · Transferleistungen = ochre) with grid to 50 %. Inline **Anwohner-Kontext**
thread links after the value (`♨ 3 Gespräche im Forum →`) — see §11. Footer row:
Status-Index · Dynamik · „(*) MSS-Systematik, s. Quellen“. `noData` variant = state §05.

**KANAL 05 · Soziale Entwicklung** (Gesamt only) — left: three indicators 2013–2023
(year-only periods „'13“…). Right: ALQ by area using the existing `mergeSocialPlrTrend`
virtual series (Schillerpromenade = wine, Silbersteinstraße = plum) with the dashed
**„LOR 2021“ boundary marker** drawn in-chart between '19 and '21. Below: the
Gebietsreform footnote (§-prefixed) explaining the merge (average of successors,
continuous lines, honest break marker).

## §05 · Instrument strip (air)

- Ink band. Left: mono kicker `MESSSTATION NANSENSTRASSE · MC042 · LIVE` with pulsing
  success dot (`kzPulse`), headline `Luftgüte: {lqi} · {label}` + timestamp. Middle:
  4 pollutant tiles (PM10 / NO₂ / O₃ / CO) with grade + label, colored by on-ink ramp
  (≤2 `#9fd08a` · 3 `#ecc76e` · ≥4 `#e08a8a`; „k.A." when null). Right: 7-day LQI
  sparkline bars (today full opacity, past 0.55) + caption `7-TAGE-VERLAUF · NEU†`.
- The 7-day sparkline **requires the Messwert-Logger** (novel §00 / README flag 1).
- **`variant="off"` (state §04):** dot goes mute, headline „Die Station meldet sich
  nicht.“, right side shows the last logged reading† + „BLUME antwortet nicht — Rest der
  Seite unberührt.“ **Replaces the legacy silent absence of the air section.**
- Grades map to LQI 1–5 (sehr gut / gut / mäßig / schlecht / sehr schlecht).

## §06 · Zahl der Woche (title-block card) — summary; full spec §08

Stamp card in the title block: mono kicker + KW badge, huge mono figure, one-sentence
plain-language reading, dashed rule, „im Forum diskutieren →“ link in moss.

## §07 · Mobile (390px)

Single stack: nav → compact instrument strip (wrapping) → title → Zahl der Woche →
horizontal-scroll PLR chip row (min-height 30, whole row ≥ 44px touch band) → Kanäle
simplified (gauge + trend for 01; bars for 02/04; donut + legend for 03; 05 omitted on
mobile — depth lives on desktop) → footer with print button. DE + EN.

## §08 · NOVEL §01 — Zahl der Woche

- One derived figure per week. **Rotation: the ISO week number seeds a pick from a fixed
  code-side menu of derivable figures** — age share · Δ population · single-person
  households · diversity share · weekly air mean† . Zero new schema; everything computes
  from kiez-stats + air_log.
- **Share flow:** „im Forum diskutieren →“ opens `/topics/create` pre-filled — title
  `Zahl der Woche (KW {n}): {figure}` + body with source line, Stand-Datum, link back,
  and a prompt question. Counts against the 5/day forum quota; normal AI moderation.
  No special endpoint, no privileged path.

## §09 · NOVEL §02 — Berlin-Vergleich

- Dumbbell chart per social indicator: Berlin (paper dot) — Neukölln (sky dot) —
  Schillerkiez (moss dot, double-struck, value labelled). Yardstick for every figure.
- **Requires reference data** (README flag 2): extend `sync-stats.ts` to import Berlin
  total + Bezirk Neukölln rows → new collection `schillerkiez_reference {scope, period,
  …}` → additive `reference?: { berlin, neukoelln }` on the kiez-stats response.
- Reference missing ⇒ module **quietly absent** (same contract as air).

## §10 · NOVEL §03 — Datenarchiv · „Kiez in Zahlen“ (A4 print)

- Printable A4 riso one-pager: header (kicker + „Schillerkiez, *gemessen*“), 2×2 headline
  figure tiles, age-distribution bars (wobble hand survives print), sources + URL + QR.
- Route `/schillerkiez/druck`, pure print-CSS (`@page` A4), **2 riso colors: ink + moss**.
  QR generated locally (same mechanics as the Profile Steckbrief) — no external service.
- **Stand-Datum is mandatory on the sheet** — paper ages. Entry: footer ⎙ button
  (desktop + mobile). Content is curated, not complete: what belongs on a pinboard.

## §11 · NOVEL §04 — Anwohner-Kontext

- Where the Kiez talks about a figure, the figure points to the talk: indicator rows in
  Kanal 04 carry ♨ chips linking to matching forum threads.
- **Asymmetry rule (like Kurier heat):** dashboard knows the forum; the forum does NOT
  know the dashboard. No backlinks, no badges on threads.
- Matching: **curated keyword map per indicator** (code-side), computed daily, cached
  24 h. Only threads > 1 h old (spam guard). **0 matches ⇒ row without chips** — never
  empty shells, never a „no discussions“ placeholder.

## §12 · NOVEL §00 — Messwert-Logger (backend enabler)

- Cron every 30 min → `GET lqis/data` (mc042) → append
  `schillerkiez_air_log { ts, lqi, pm10, no2, o3, co }`.
- Daily rollup (max + mean) for the 90-day view. Retention: hourly 90 d · daily forever.
- **Gaps > 6 h ⇒ dashed empty bars + caption naming the pause. NEVER interpolate.**
- Feeds: instrument-strip sparkline, „last logged reading“ in state §04, weekly air mean
  for the Zahl-der-Woche menu. Independent PR, no new infrastructure.

## §13 · State matrix (7 states, 3 groups)

**A · Anzeige:**
- **§01 Lädt** — skeleton mirrors the real layout (ink strip block + Kanal blocks),
  `kzSweep` 1.4 s. No spinner, no emoji. Replaces legacy's 6 pulse cards.
- **§02 Fehler** — kiez-stats 500 ⇒ full-page error, serif „Die Zahlen lassen sich gerade
  nicht abholen.“ + mono cause + „erneut versuchen“. **Air strip stays if IT loaded** —
  independent sources.
- **§03 Noch keine Daten** — demographics AND social null (fresh DB): „Das Archiv ist
  noch leer.“ + names the 2×/Jahr sync mechanism (März + September).

**B · Quellen:**
- **§04 Station meldet sich nicht** — strip stays, says so, shows last logged reading†.
  Rest of page untouched. Replaces legacy silent absence.
- **§05 PLR ohne Sozialdaten** — Kanal 04 keeps its frame, honest serif blank, never a
  0 %-bar.
- **§06 Logger-Lücke** — dashed empty bars in the 7-day strip + caption
  („Aufzeichnung pausierte Do–Fr“). Ties to §12.

**C · Frische:**
- **§07 Stand veraltet** — `lastUpdated` > 8 months ⇒ warn line under the title
  („Stand 30.06.2025 — der Herbst-Import fehlt.“ + admin hint). Page fully usable —
  paper ages, but it never lies about its date.

Mobile stack ships §01/§02/§04/§06 (the states a phone actually meets).

## §14 · Backend / schema impact summary

| Item | Impact |
|---|---|
| Messwert-Logger | NEW: cron (30 min) + collection `schillerkiez_air_log` + daily rollup. README flag 1 |
| Berlin-Vergleich reference | NEW: `sync-stats.ts` extension + collection `schillerkiez_reference` + additive API field. README flag 2 |
| Zahl der Woche | zero schema — derived, ISO-week-seeded, fixed code-side menu |
| Share flow | none — reuses `/topics/create` + 5/day quota + AI moderation |
| Anwohner-Kontext | small: daily keyword-match job + 24 h cache; no forum-side changes |
| Datenarchiv | route `/schillerkiez/druck`, print CSS + local QR — no PDF backend |
| Index / Kanäle | UI rebuild of `KiezDashboard.svelte` (split per Kanal — README flag 4); reads existing `/api/kiez-stats` + `/api/kiez-air` |
| State §04 | needs last-logged-reading lookup from `schillerkiez_air_log` |
| State §07 | compare `lastUpdated` against an 8-month threshold — read-side only |
| youth_unemployment | stays unexposed (in DB, not in API) — no change |

## §15 · Open questions for CC / user

1. **Logger hosting:** the repo's existing GitHub Action pattern (like sync-stats) vs. a
   proper scheduler. 30-min cadence on Actions is possible but jittery — pick at
   implementation time; the design only needs the collection shape + gap rule.
2. **Reference-data granularity (§09):** MSS district/city rows may not exist for every
   period the Kiez has. The module tolerates holes (absent = hidden) — confirm the
   import maps periods 1:1 rather than back-filling.
3. **PLR selection persistence:** design assumes selection is page-local (resets on
   reload). If you find URL-param precedent elsewhere in the app, `?plr=` is fine —
   don't invent new state infra otherwise.
4. **Print-route QR library:** small + local, no external service — same pick as the
   Profile Steckbrief (whatever landed there).

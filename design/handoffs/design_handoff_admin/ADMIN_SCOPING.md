# ADMIN MODERATION — Scoping doc (Editorial Kiosk · Batch 3)

Designed Jul 4 2026 · reviewed + approved Jul 9 2026. Companion to `READMEFIRST.md`.
The JSX in `jsx/` is the source of truth for layout + copy; this doc is the source of truth
for behaviour, rules and scope boundaries.

---

## §1 · Direction

Admin moderation is the **judicial back-office** of the Kiez — internal, procedural, calm.
Same Kiosk vocabulary (paper, ink borders, riso print shadows, mono labels, serif italics)
but with an explicit "internal area" frame: a plum ribbon above the masthead reading
„INTERNER BEREICH — NUR FÜR ADMINS SICHTBAR" with the literal guard condition
(`user.role === "admin"`) printed on the right. The design tells the admin where they are
and tells the developer what protects it.

- **Carved accent: PLUM `#6f2f59`** (`kiosk.color.plum`). Last free primary.
- **Two views** behind one masthead: **Prüfstapel** (queue, cards) and **Protokoll**
  (history, table). Pill toggle, plum = active.
- **Masthead:** logo + „mahalle *moderation*" + SCHILLERKIEZ · NEUKÖLLN · ADMIN, a
  „← zurück zum Forum" escape, DE/EN switcher, admin avatar.

## §2 · Grounding in the codebase

Grounded in `ModerationQueue.svelte` + `moderation.schema.ts` + the 3 moderation API
endpoints (read from `main`). Everything the current code does is covered; nothing invented
except the two novel guards (§7) and the ban-enforcement screens (§8), both flagged as such.

**Pre-build security fix (blocking):** `isAdmin()` in all 3 endpoints is a placeholder —
empty `ADMIN_USER_IDS` lets everyone through. Replace with `user.role === 'admin'`.

## §3 · Taxonomies

### 3.1 Content types (filter rail + type chips)
`topic` Diskussion / `comment` Kommentar / `announcement` Ankündigung / `recommendation`
Empfehlung / `event` Termin / `news` News / `marketplace` Markt. Rail = Alle + 7 types +
„⚑ Gemeldet" (ochre outline, filters to user-reported items).

### 3.2 Flag categories → severity (chip color)
Maps the real `flaggedCategories` keys:

| severity | color | categories |
|---|---|---|
| critical | danger `#a83245` | `hate`, `hate/threatening`, `violence`, `harassment/threatening` |
| high | `#a05a28` (aux) | `harassment`, `turkish_profanity`, `spam_check:scam` |
| mid | warn `#c8881e` | `spam_check:spam`, `spam_check:ad_promotional`, `image_safety:other_violation` |
| info | info `#3a7282` | `relevance` (user-submitted news score, shown as N/100) |

Chips show DE/EN label + score %. Unknown keys fall back to mid severity, raw key as label.

### 3.3 Sources → straps
- `ai` → plum „KI-GEPRÜFT / AI-FLAGGED"
- urgent (see §5) → danger „DRINGEND / URGENT", pulses
- `report` → ochre „⚑ GEMELDET ×N / REPORTED ×N" (ink text)
- `news` → moss „EINGEREICHT / SUBMITTED" (user-submitted news, shows AI relevance)

Report reasons (user_report): spam / harassment / misinformation / inappropriate / other —
each with DE/EN label. Report cards show reason chip + reporter + quoted report details.

## §4 · Queue (Prüfstapel)

- **Stat row** (Setzkasten): 5 cards mapping the API counts object — dringend (danger) ·
  offen (ochre) · freigegeben (success) · mit hinweis (warn) · abgelehnt (ink-mute). Big
  number + mono label, colored top-rule.
- **Card anatomy:** header (checkbox · source strap · type chip · author + strike dots ●●○ ·
  time) / body (context line for comments, title, body — comments render serif-italic in
  „quotes") / flags block (cat chips w/ scores, or report block, or relevance) / action row
  on paperSoft (freigeben ✓ green outline · mit hinweis… ⚠ warn outline · ablehnen… ✕ danger
  fill). Flagged images render **blurred by default, hover reveals**.
- **2-strike authors:** inline danger flag „Ablehnung = Sperre (3/3)" right-aligned in the
  action row.
- **Selection + bulk bar:** ≥1 checkbox → plum bulk bar (N ausgewählt · alle freigeben ·
  alle ablehnen… · auswahl aufheben) with the reminder „ablehnen vergibt Verwarnungen —
  Vorschau folgt". Bulk reject ALWAYS goes through the Folgen-Vorschau (§7.2). Max 50/call.
- **Sort:** newest first; urgent always on top. Pagination 10/25/50.

## §5 · Urgent rule

`score ≥ 0.85` in a **critical** category ⇒ urgent. Treatment: 2px danger border, paperWarm
fill, red print shadow, pulsing DRINGEND strap (opacity-only, 1.6s), sorts above everything,
own stat-row counter. Reduced-motion: strap stays solid — color carries the urgency.

## §6 · History (Protokoll)

- Table, 7 visible columns: Datum (flag date + „geprüft" review date) · Quelle (strap) ·
  Typ · Inhalt · Autor:in · Markiert als (chips) · Entscheid (chip + reason/warning/note
  text underneath, color-coded: reason=danger, warning=warn, note=mute italic serif).
- **„Grund / Hinweis" is a hideable 8th column, hidden by default** — column-visibility
  menu (▦ Spalten) mirrors the current code; at least 1 column stays visible.
- Decision filter: Alle / Freigegeben / Abgelehnt. **„Alle" = approved + rejected — NEVER
  pending** (`reviewStatus: 'reviewed'`). Queue and history are disjoint.
- Sortable headers: Datum · Score · Entscheid. Pagination 10/25/50.
- Decision chips: ✓ freigegeben (success) · ⚠ mit hinweis (warn) · ✕ abgelehnt (danger).

## §7 · Decision flows (replace `prompt()`)

All modals: dimmed queue backdrop, paperWarm card, 5px accent top-rule, print shadow, case
summary block (strap + chip + title + author + strike dots) at top.

### 7.1 Reject (single)
- **Grund der Ablehnung** — required, shown to the author.
- **Interne Notiz** — optional, protocol-only.
- **Strike consequence box** (warn tone): shows the author's new dot count + plain-language
  consequence („Noch eine Ablehnung, dann wird das Konto gesperrt").
- CTA: „✕ ablehnen & verwarnen" (danger fill).

### 7.1b Ban-Bremse — NOVEL §01 (3rd strike)
If the reject would be strike 3/3, the modal escalates:
- Danger badge „BAN-BREMSE · 3. VERWARNUNG", title „Diese Ablehnung *sperrt das Konto*".
- **Inline strike ledger:** 3 rows — date · surface · content · reason; current case marked
  „← DIESE" on danger tint.
- Grund still required.
- **Explicit checkbox** („Ja, X sperren. Kein Login, kein Posten mehr — bis ein Admin die
  Sperre aufhebt. Bestehende Beiträge bleiben.") before „✕ ablehnen & sperren" enables.
- **Rule: Sperren passiert nie beiläufig.** No ban without this confirmation.

### 7.2 Bulk-reject Folgen-Vorschau — NOVEL §02
Before a bulk reject executes:
- **Gemeinsamer Grund** — one required reason for all N, shown to all authors.
- **Per-author strike delta table:** each item → author · ●●○ → ●●● transition. Multiple
  hits on the same author in one selection are **summed sequentially** (matches the API's
  sequential processing). Bans flagged „WIRD GESPERRT" on danger tint.
- **Acknowledgment checkbox** („Mir ist klar: N Konten werden dabei gesperrt.") — CTA
  disabled (0.4 opacity, not-allowed) until ticked. Only appears when ≥1 ban would trigger.
- Footnote: already-reviewed cases are skipped. Maps `bansTriggered` / `results[]` 1:1.

### 7.3 Freigeben mit Hinweis (warning)
- **Hinweistext** — required, public, max 200 chars.
- **Live preview:** the ochre „⚠ HINWEIS DER MODERATION" strap + italic serif warning text
  rendered on a mock of the actual content card, updating as the admin types.
- CTA: „⚠ freigeben mit hinweis" (warn outline). Content stays online, label rides on top.

### 7.4 Report actions
Reported items get a different action row: „✓ meldung verwerfen" (dismiss report, content
stays) · „⚠ hinweis ergänzen…" (→ 7.3) · „✕ inhalt entfernen…" (→ 7.1, strikes apply).

## §8 · Ban enforcement (user side) — NEW CODE

Enforcement is a TODO in `review.ts`. Two screens are designed; wiring them needs
`isBanned` in the auth callback + a guard on content-write APIs:

- **A · Login blocked:** centered Kiosk card, danger top-rule, ✕ roundel, „Konto *gesperrt*",
  explanation (3 Verstöße), contact block `moderation@mahalle.berlin`. Shown at auth
  callback; session is never created.
- **B · Active session:** danger banner „Dein Konto ist gesperrt. Du kannst mitlesen, aber
  nichts mehr posten, kommentieren oder inserieren." — **read-only session**: feed visible,
  composer rendered but disabled (DEAKTIVIERT), all write CTAs disabled.
- Rejected/banned users' existing content **stays in the DB** (proof of moderation).
- **Un-ban:** admin-side popover deferred (see out-of-scope). Interim: manual DB flip.

## §9 · Mobile = triage only

390px stack. Slim plum ribbon + compact masthead with „1 dringend · 5 offen" count. One
card after another (TRIAGE — EIN FALL NACH DEM ANDEREN): straps, clamped 3-line body,
chips, author + dots — then a **3-button 48px action row** (frei / hinweis / ablehnen)
as a full-width grid. Reject on mobile opens the same required-reason modal (sheet).
**No history, no bulk, no column menu on mobile** — mobile triages, it doesn't manage.

## §10 · State matrix — 9 states, 3 groups

**A · Anzeige** — §01 Stapel lädt (skeleton sweep 1.4s; reduced-motion: static paperSoft) ·
§02 Stapel leer („Nichts zu prüfen. *Der Kiez benimmt sich.*" + last-decision timestamp) ·
§03 Protokoll leer (fresh instance, → zum Prüfstapel).

**B · Aktionen** — §04 Aktion läuft (optimistic: card dims 0.55, buttons disabled, pulsing
pill „wird abgelehnt…"; settle-out 220ms on success) · §05 Bulk-Ergebnis (toast breaks down
partial success: „4 abgelehnt · 1 bereits bearbeitet · 1 fehlgeschlagen"; failed items stay
in queue; maps `results[]`) · §06 Laden fehlgeschlagen (503/offline: „Nichts ist verloren —
der Stapel wartet." + retry).

**C · Grenzen** — §07 Dringend-Anatomie (see §5) · §08 Sperre ausgelöst (ink toast, danger
rule: „X wurde gesperrt — 3/3 Verwarnungen" + un-ban pointer; only ever after a confirmed
Ban-Bremse — never surprising) · §09 Kein Zugriff (403, `role !== admin`: „Dieser Bereich
gehört der Moderation." + ← zurück zum Forum; requires the real role check).

## §11 · Language rule

Queue + history: **DE + EN parity** (switcher in masthead). Flows + state matrix: **DE only**
by design — internal tool, DE copy is the contract; EN follows the same structure if needed
later. German strings use curly quotes „…" (U+201E/U+201C) — straight `"` breaks Babel.

## §12 · Seeds (realistic coverage)

The 5 seed cases cover every real source: urgent AI hate (0.91, housing discrimination) ·
user report ×3 (e-bike scam) · AI spam+scam on a 2-strike author (the Ban-Bremse case) ·
AI harassment on a comment (the 2nd-strike reject case) · user-submitted news (relevance
84). History seeds cover approved-false-positive, warning, rejected-scam, news-accepted,
rejected-harassment, report-dismissed.

## §13 · Open questions for CC

1. Does the bulk-review API already return `results[]` per item, or only aggregate counts?
   §05's breakdown assumes per-item results — if aggregate-only, extend the API.
2. Is there an existing blur-on-hover pattern for flagged images, or is per-image
   vision-mod data available to gate the blur on? If not, blur ALL images on flagged items.
3. Where does the strike count live today — per-user counter or derived from rejection
   count? The ledger (7.1b) needs date + surface + reason per strike; if only a counter
   exists, derive the ledger from the user's rejected-content history.
4. `data-page="admin"` from the layout — confirm KioskLayout emits it (mirrors marketplace
   + auth); add if missing.

## §14 · Out of scope

Reporter-outcome notifications (no notification infra) · un-ban UI (protocol popover is
future work) · tiered moderator roles · appeal flow beyond the contact address · audit-log
export.

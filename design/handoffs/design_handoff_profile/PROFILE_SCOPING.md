# PROFILE_SCOPING — Mahalle profile pass (Editorial Kiosk, Batch 3 · surface 3)

Designed Jul 10 2026 · packaged Jul 10 2026. Companion to `READMEFIRST.md` — that file has
the build order and non-negotiables; this file is the full spec. JSX in `jsx/` is the
source of truth for layout + copy.

---

## §01 · Direction

- **Metaphor: Meldebogen + Archiv.** The own profile is a registration sheet (editorial ID
  card column, left) plus a dated cross-surface ledger (right). The public profile is a
  trimmed Meldebogen — „Aus der Nachbarschaft“.
- **Carved accent: OCHRE** (`#e8a53a` = `kiosk.color.ochre`), shared with Auth. Deliberate
  „your door“ pairing, chosen by the user over moss. Scope via `data-page="profile"`.
- **Nav:** profile is not a nav tab. The nav avatar gets a 2px ochre ring while `/profil`
  is active.
- **Title block:** eyebrow `PROFIL · @handle · IM KIEZ SEIT <year>` + carved headline
  „Dein *Meldebogen*“ (own) / „Aus der *Nachbarschaft*“ (public). Serif-italic word in
  ochre — same carved-title device as every other surface.
- **Seeds:** own = Emre Aydın (`emre_a` — matches the „EA“ avatar in KioskNav), public =
  Lena Bergmann (`lena_b` — continuity with the Auth pass seeds).

## §02 · Own profile — layout

Desktop 1280: 2-col grid `384px | 1fr`, gap 26.

**Left column (identity):**
1. **PIdentityCard** — avatar (92px wine monogram circle, ÄNDERN chip when own), name,
   `@handle · im Kiez seit <year>`, „Verifiziert im Kiez“ badge (teal pill — still granted
   by the team, NOT self-serve; same rule as Forum), 4-stat ledger line (Beiträge /
   Anzeigen / Termine / danke, dashed dividers), hobby chips, actions
   („Profil bearbeiten“ primary · „Steckbrief drucken“ outline).
2. **PModerationCard** („Leumund“) — see §05.
3. **PKontoCard** — see §06.

**Right column (record):**
1. **PChronikStrip** — compact Kiez-Chronik (see §09).
2. **PActivityLedger** („Archiv“) — see §04.

Mobile 390: single stack — compact identity card → chronik strip → Archiv (chip row
scrolls horizontally, 5 rows + „ältere laden“) → Moderation fold → Konto fold
(PMobileFold accordions). All hit targets ≥ 44px.

## §03 · Public neighbor profile — NEW FEATURE

- **Route:** `/nachbarn/[handle]` (design shorthand: `/nachbarn/@handle`). Entry points:
  clicking an author name in Forum / Markt / Kalender.
- **Shows:** name, handle, seit, verified badge, hobbies, Kiez-Chronik, public activity
  (posts, active listings, upcoming created events).
- **NEVER shows:** e-mail, saved items, moderation standing, settings, stats that leak
  private behavior. The `Gespeichert` toggle is absent (`publicView={true}` on the ledger).
- **No DM system.** A dashed footnote card explains: contact runs through content —
  inquire on a listing or reply in the forum. E-mail stays private.
- **Not-found (state §03):** friendly card „Diese Nachbarin ist nicht (mehr) hier.“ — no
  raw 404. Same pattern as the market's „nicht mehr verfügbar“ page.
- Mobile parity: compact identity, chronik, „Im Kiez unterwegs“ ledger.

## §04 · Archiv (activity ledger)

- Reverse-chrono, cross-surface merge of the user's own footprint: forum posts, market
  listings, calendar events + RSVPs, Kurier submissions.
- **Row anatomy:** `52px date/time col | body | right rail`. Body = surface tag (colored
  dot + mono label: FORUM wine · MARKT wine · KALENDER teal · KURIER ink) + kind label +
  title (display 15.5/700) + meta line (mono). Right rail = optional strap + ◈ marker.
- **Straps reuse the marketplace strap system:** IN PRÜFUNG (ochre/ink), RESERVIERT
  (plum/paper), ABGELEHNT (danger/paper). Color is the only variable — never invent
  ad-hoc tag styles.
- **Filters:** Alle · Forum · Markt · Kalender · Kurier + (own view only, after a divider)
  „◈ Gespeichert“.
- **Gespeichert view:** others' content the user saved — forum posts, listings, events,
  news articles. Rows additionally show the author („von Lena B.“) and the ochre ◈.
- Pagination: „ältere laden ↓“ ghost button.

## §05 · Moderation standing („Leumund“)

- **Always visible** on the own profile. 0 strikes + no rejections ⇒ success-accent card
  with one serif-italic line: „Alles im Reinen — keine Einträge.“ Otherwise warn-accent
  card.
- Strike dots ●○○ + „Verwarnungen x / 3“ — same 3-strike system as the admin pass; data
  comes from the author-strike-history endpoint added there.
- **Rejected-items list:** date + surface tag + ABGELEHNT strap + title (strikethrough,
  danger) + reason line. Visible ONLY to the owner — same „proof of moderation“ rule as
  Forum.
- Footer line: „Abgelehnte Inhalte sieht nur, wem sie gehören. 3 Verwarnungen führen zur
  Sperre.“

## §06 · Konto card

- Rows (label / value / underlined action): E-MAIL → „ändern“ (opens §08 flow) ·
  PASSWORT → „ändern“. Below: „Abmelden“ outline button.
- **Gefahrenzone:** dashed danger box with „Konto dauerhaft löschen“ → delete modal (§10).

## §07 · Edit-in-place (flow §01)

- Editing happens **in the identity card** — no separate screen, no modal. Avatar click
  opens the upload flow from read state too.
- Fields: display name (3–30 chars, letters/numbers/-/_), hobby chips (removable ✕ + „+
  hinzufügen und ⏎“ dashed ghost chip, max 10 × 50).
- **E-mail display-only** inside edit, with a note pointing to the verify flow. (Legacy
  shows an e-mail input that never saves — replaced.)
- **Optimistic save:** card returns to read state immediately; chip „speichert …“ →
  „gespeichert ✓“ (1.5s) → fades. Failure: back to edit state, inputs intact, danger
  banner with retry (states §04/§05).

## §08 · Konto flows

**Avatar upload (flow §02) — 5 states:** idle (monogram fallback + hover ÄNDERN chip) →
picking (dropzone, JPG/PNG/WebP, max 5 MB, Cloudinary preset as in codebase) → uploading
(progress BAR + percent + cancel — no spinner) → error (concrete reason, old image stays)
→ saved (✓ chip pop). **Legacy `handleImageUpload` never persists `userPicture` — this
flow must actually write it.** Monogram fallback replaces ui-avatars.com.

**E-mail change (flow §03) — 3 stages:** 01 new address + current password („zur
Sicherheit“) → 02 verification sent (link 30 min · single-use; old address gets a notice
mail in parallel; old address stays active until confirm; resend + cancel) → 03 switched
(existing sessions stay signed in). **Anti-enumeration:** taken address ⇒ neutral „Diese
Adresse kann nicht verwendet werden.“ Needs new endpoint + `pendingEmail` field. While
pending: warn banner on the Konto card (state §08) with resend/cancel.

**Password change (flow §04):** current + new + repeat. Validation =
`ChangePasswordSchema` (min 8, upper + lower + digit). Strength meter REUSED from the
Auth pass (`AuthStrength`, same 4 segments + labels). Wrong current password ⇒ generic
inline error on the first field. „Vergessen?“ → Auth forgot-flow, no duplicate. On
success: all other devices signed out, this one stays.

**Delete account (flow §05):** danger-topped modal „Das ist ein *Abschied*, kein Umzug“.
Consequences ledger (◍ keep / ✕ delete): posts & comments remain anonymized („Ehemaliges
Mitglied“) · listings deleted · created events remain anonymized, RSVPs removed · saved
items & RSVPs deleted · name/e-mail/photo/interests deleted · moderation log keeps
anonymized entries (Nachweispflicht). Confirm = type username + password; CTA disabled
until the name matches. **DECIDED (Jul 10 2026): 7-day grace with undo.** After confirm
the account is „vorgemerkt“ — warn banner on the Konto card (deletion date + „Widerrufen“,
analog to the e-mail-pending banner, state §08 pattern) + undo link by mail. Logging in
during the window keeps undo available; the anonymization/deletion pipeline runs at day 7.

## §09 · NOVEL §01 — Kiez-Chronik

- Tenure timeline replacing the hardcoded „seit 2019“. **Fully derived, zero new schema
  fields:** `user.createdAt`, oldest forum post, oldest listing, oldest created event,
  aggregated danke crossing 100. Derived at read time, cached 24h.
- Fixed milestone menu: dabei · erstes Thema · erste Anzeige · erster Termin · 100. danke.
  Only existing milestones render, max 5. „heute · aktiv“ dot pulses (2.4s) when active in
  the last 7 days.
- On own AND public profiles (contains no private data). Compact strip above the Archiv;
  the full anatomy artboard is the reference.

## §10 · NOVEL §02 — Steckbrief

- Printable A6-landscape (148 × 105 mm) riso neighbor card: for the pinboard, hallway,
  Kiezfest. Pure print-CSS on a `/steckbrief` route — no PDF backend, no canvas.
- 2-color riso: ink + ochre. Corner stamp, monogram (photo renders as monogram in print —
  riso-honest), name, handle, seit, hobby chips, public-profile URL + QR (small local
  library, no external service).
- Content = public only + **optional motto** (one line, 80 chars) — the pass's ONLY new
  schema datum. **DECIDED (Jul 10 2026): keep.** Empty motto ⇒ the italic line is omitted.
- Entry: „Steckbrief drucken“ on the identity card; the route itself is the print preview.

## §11 · State matrix (10 states, 3 groups)

**A · Anzeige:** §01 Lädt (layout-mirroring skeleton — no ⏳ emoji) · §02 Archiv leer
(„Noch keine Spuren im Kiez.“ + three concrete entry CTAs) · §03 Profil nicht gefunden
(friendly card + back-link).

**B · Bearbeiten:** §04 Speichert (optimistic chip) · §05 Speichern fehlgeschlagen
(inputs kept, retry) · §06 Avatar lädt hoch (in-card bar, profile stays usable) ·
§07 Avatar-Fehler (concrete reason, old image stays).

**C · Konto:** §08 E-Mail-Wechsel ausstehend (warn banner, resend/cancel) · §09 Konto
gesperrt (read-only: banner „Konto gesperrt seit … — kein Posten mehr“, edit/print
disabled at 0.45 opacity, moderation block shows ●●● + reason — binds to admin-pass ban
enforcement) · §10 Abgemeldet („Der Meldebogen braucht einen Schlüssel.“ + login CTA —
replaces the legacy 🔒 card).

## §12 · Language & typography

- DE + EN full parity on every screen of this pass, top-right switcher as everywhere.
- German quotes: „ (U+201E) + “ (U+201C) — lint-checked; the ASCII-closer bug has bitten
  on four surfaces, keep the rule.
- Type/spacing/shadows: base Kiosk system, no additions.

## §13 · Backend / schema impact summary

| Item | Impact |
|---|---|
| Public profile | NEW route + resolver, public fields only |
| E-mail change | NEW endpoint + `pendingEmail` field + 2 mail templates (Resend) |
| Password change | existing `ChangePasswordSchema`; add other-device sign-out |
| Avatar | fix persistence (`userPicture`); no schema change |
| Chronik | NEW read-time resolver + 24h cache; ZERO schema fields |
| Archiv feed | NEW cross-surface merged query (own + saved) |
| Steckbrief | print-CSS route; motto field (80 chars, optional) — CONFIRMED keep |
| Delete account | anonymization pipeline per ledger; `deletionScheduledAt` + 7-day grace with undo (banner + mail link) |
| Strikes on profile | reuses admin pass's author-strike-history endpoint |

## §14 · Open questions for CC / user

*(Formerly-open items 1–2 — delete grace period and Steckbrief motto — were answered by
the user Jul 10 2026: 7-day grace with undo; motto stays. Folded into §08 / §10 / §13.)*

1. **Verified badge:** remains team-granted + hardcoded-ish — confirm no self-serve
   verification is expected in this pass.
2. **„aktiv · letzte 7 Tage“ on the Chronik:** derive from latest activity timestamp
   already in the merged feed — confirm no separate presence tracking is built for it.

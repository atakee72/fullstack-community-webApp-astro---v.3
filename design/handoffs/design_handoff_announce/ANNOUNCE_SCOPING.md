# ANNOUNCE_SCOPING — /admin/announcements · Editorial Kiosk

Stand 15. Jul 2026 · Design: Claude Design · Grounding: CCs Codebase-Read vom selben Tag.

## 01 · Richtung

Metapher: **das amtliche Brett im Kiosk-Fenster.** Plum-Admin-Chrome (geteilt mit Moderation),
die Mitteilung selbst trägt die Forum-Ankündigungs-Identität (Ink-Karte, Teal-Strap) — was der
Admin hier anpinnt, sieht im Forum exakt so aus. Ein Brett, ein Pin, ein Archiv.

## 02 · Seiten-Anatomie (Desktop 1280)

1. Plum-Ribbon „INTERNER BEREICH …“ + `requireAdminSession()`-Echo rechts
2. Masthead: m-Avatar · „mahalle *amtliches*“ · „← zur Moderation“ · DE/EN · EA-Avatar
3. Titelblock: Kicker mono plum · H1 „Was hängt am *Brett*?“ · Zählerzeile „3 Mitteilungen · 1 angepinnt — es kann immer nur eine am Brett hängen.“
4. Grid `460px | 1fr`:
   - **Composer** (links): paperWarm, 4px Plum-Top-Rule, Felder Titel (max 120) + Mitteilung,
     Teal-Hinweisbox „⏱ wird 7 Tage angepinnt … **ersetzt die aktuelle Anheftung („<Titel>“)**“,
     CTA „📌 anschlagen & anpinnen“ (Ink-Pill, Teal-Druckschatten)
   - **Liste** (rechts): Label „AM BRETT — ANGEPINNT“ → 1 Ink-Karte · Label „ARCHIV — NICHT MEHR ANGEPINNT“ → Papier-Karten

## 03 · Karten

**Angepinnt (max. 1):** Ink-Hintergrund, 2px-Ink-Rahmen, Teal-Druckschatten, Teal-Strap
„OFFIZIELLE ANKÜNDIGUNG · MAHALLE-TEAM / AM BRETT“, Ochre-Chip „📌 ANGEPINNT BIS MI 22. JUL“,
Fußzeile: ✎ bearbeiten · ⤓ lösen (unpin) · mono-Echo `PATCH pinnedUntil: null`.

**Archiv:** Papier, opacity 0.92, gestrichelter Chip „PIN ABGELAUFEN AM …“, Meta „· 1× bearbeitet“,
Fußzeile: **⤒ erneut anpinnen (7 Tage)** (Plum-Outline) · ✎ bearbeiten · ✕ löschen… ·
mono-Microcopy rechts „anpinnen löst die aktuelle Anheftung“.

## 04 · API-Mapping (bestehend, unverändert)

| UI-Aktion | Call | Verhalten |
|---|---|---|
| anschlagen & anpinnen | `POST /api/admin/announcements` | Server pinnt hart now+7d, verwirft Client-`isOfficial`/`pinnedUntil`, demontiert aktuelles Pin |
| erneut anpinnen | `PATCH [id]` `pinnedUntil: now+7d` | Client rechnet now+7d; Server-Invariante demontiert das andere Pin |
| lösen | `PATCH [id]` `pinnedUntil: null` | Brett wird leer (erlaubt) |
| bearbeiten | `PATCH [id]` Titel/Text | Meta-Zähler „n× bearbeitet“ |
| löschen | `DELETE [id]` | Modal warnt: auch Forum-Sichtbarkeit weg (→ README Frage 1) |

## 05 · Einzel-Pin-Invariante, lesbar gemacht

1. Composer-Hinweis benennt die aktuell angepinnte Mitteilung **namentlich**.
2. Re-Pin-Button trägt Verdrängungs-Microcopy.
3. Optimistischer Save: verdrängte Karte animiert sichtbar vom Brett ins Archiv (Chip wechselt 📌→abgelaufen).
4. Toast: „✓ angeschlagen · ersetzt: ‚<Titel>' · rückgängig“ (Undo → README Frage 2).
5. Im gesamten UI existiert zu jedem Zeitpunkt genau ein 📌.

## 06 · States (5)

01 **laden** — Skelett spiegelt Composer + Brett-Karte + Archivzeilen, `annSweep` 1.4s
02 **leer** — „Das Brett ist leer.“ + Hinweis, dass die erste Mitteilung automatisch 7 Tage gepinnt wird + CTA
03 **speichert · Verdrängung** — Puls-Chip „📌 WIRD ANGEPINNT…“ (`annPending` 1.2s), Verdrängung + Toast
04 **Fehler** — „Die Mitteilung ließ sich nicht anschlagen.“ · Eingaben bleiben · Rollback (kein Geister-Pin) · ⟳
05 **löschen bestätigen** — Kiosk-Modal (Danger-Druckschatten), benennt Forum-Konsequenz, „endgültig löschen / abbrechen“

## 07 · Mobile (390)

Plum-Ribbon → schlanker Header („amtliches“ · „3 · 1 📌“) → Vollbreite-CTA „📌 neue Mitteilung anschlagen“
(48px, darunter mono „wird 7 Tage angepinnt · ersetzt die aktuelle Anheftung“) → AM BRETT-Karte (compact) →
ARCHIV-Stack. Kein Tabellen-Layout. Alle Aktionen ≥ 44 px.

## 08 · Sprache

DE + EN volle Parität (Desktop-Artboards beide gebaut; Mobile-EN folgt denselben Strings).
Deutsche Anführungszeichen: „ (U+201E) + “ (U+201C).

## 09 · Offene Fragen an CC

1. DELETE hart oder soft? (Modal-Copy hängt daran — s. README)
2. Undo-Mechanik im Verdrängungs-Toast machbar? (sonst Undo streichen, Benennung bleibt)

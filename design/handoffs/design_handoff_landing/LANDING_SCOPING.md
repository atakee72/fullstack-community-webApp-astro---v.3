# LANDING_SCOPING · Das Schaufenster (`/`) — Spec

Stand Aug 19 2026 · Design abgenommen. Referenz-Frames: Bundle-Sektion ◆ LANDING PASS (Desktop DE/EN 1280×960 · Mobil DE 390×1310 · Heartbeat-Board).

## §00 Kontext & Route

- Route `/` — öffentlich, prerendered/SSR, **eingeloggt → Redirect `/forum`** (Session-Check serverseitig, die Seite hat nur EIN CTA und kein Member-Chrome).
- Eigenes Minimal-Layout (Geschwister von AuthLayout): keine KioskNav, keine Tour, kein Splash-Video, kein Avatar.
- Teil des Routing-Release: Forum zieht `/` → `/forum` (nicht dieser Scope). Alt-Route `/landing` = 2023-Fossil, ersetzen + löschen/301 (confirm-before-code).

## §01 Anatomie (Desktop, top→down)

1. **Datumszeile** — mono 10px: Datum links · „SCHILLERKIEZ · BERLIN-NEUKÖLLN" mittig · rechts „Anmelden →"-Textlink + **DE | EN**-Umschalter. Hairline darunter.
2. **Masthead** — Wortmarke „M*a*halle" (a serif-italic) zentriert, groß (96px Desktop / 54px mobil); darunter Manifest serif-italic: „Der Kiez hat einen Ort. Reden, tauschen, treffen — hier, wo du wohnst."
3. **Doppellinie** (3px + 1px ink) — Zeitungskopf-Abschluss.
4. **Banner-Slot** — die Zone zwischen Doppellinie und Strip bleibt FREI (Sept-Launch-Banner, nicht v1, nicht verbauen).
5. **KiezHeartbeat-Strip** — Ink-Band, 1–4 Zellen (§03) + rechts „STÜNDLICH AKTUALISIERT".
6. **Teaser-Zone** — 3-Spalten-Grid `1.18fr 1fr 1fr`, Hairline-Trenner, **immer opakes Papier** (§02): Blog · Kiez-Daten · Kurier (§05–§07).
7. **CTA-Zone** (§08) — ochre Wash, ein Button, Quota-Subline, Slogan.
8. **Footer** (§09).

## §02 Hintergrund „VOLLBILD GESPIEGELT"

- Asset: `assets/background_landing_page-transparent.png` (Aquarell-Riso-Bänder, halbtransparent auf Weiß, landscape).
- Layer absolut über die ganze Seite: `rotate(180deg)` · `cover` · `center top` · `multiply` · `opacity 0.16` · kein Blur. Bänderzug läuft von unten-rechts nach oben-links, flache Kante bündig unten.
- z-Stapel: Bild-Layer `z-index: 0`; alle anderen Direktkinder des Seiten-Roots `position: relative; z-index: 1`. **Nie negativer z-index** (verschwindet hinter dem Seitengrund).
- **Teaser-Zone opak:** `main` (desktop) bzw. der Teaser-Block-Wrapper (mobil) bekommt `background: paper` — Bänder tauchen unter der Textzone durch.
- Warm-Basis gehört zum Rezept: gefüllte Rubriken-Straps (Kicker als Farbfläche mit Papier-Text), Moss-Zahl, Ochre-CTA-Wash.
- Dies ist die einzige sanktionierte Ausnahme der „ink-led, kein Regenbogen"-Regel — nur auf `/`.

## §03 Heartbeat-Strip · Zero-Regel

- Ink-Band; je Zeile: Puls-Punkt (8px, Zeilenfarbe) + mono-Label, Luft-Zeile zusätzlich 7-Tage-Sparkline.
- Zeileninventar (max 4): **Luft** (`#9db97c`, aus BLUME/Logger) · **Forum-Beiträge** (`#d16a87`, Wochenfenster) · **Termine** (`#6fb5c4`, Wochenende) · **Kurier-Ausgabe** (paper-Punkt).
- **Zero-Regel:** nie eine Null zeigen. Zeile ohne Leben wird SERVERSEITIG weggelassen; Strip verträgt 1–4 Zeilen und layoutet flexibel (flex, Zellen teilen die Breite).
- **Luft-Absent-State** (Logger-Lücke/Station still): Zeile bleibt, zeigt Gedankenstrich „LUFT IM KIEZ: —" + stillen, gedimmten Punkt (`mute`: opacity 0.45, kein Puls) — nie stale Werte anzeigen.
- **Totalausfall:** Endpoint down / 0 Zeilen → Strip rendert NICHT, Manifest-Zeile trägt die Seite. Kein Skeleton, kein Fehlertext.
- Alle 4 Zustände (voller Tag / ruhige Woche / Logger-Lücke / kollabiert) + Regeln-Karte im Bundle-Board.

## §04 Endpoint `GET /api/kiez-heartbeat` (NEU · Enabler)

- Public, **unauth**, Cache ~1h (Header „stündlich aktualisiert" verspricht nicht mehr), SSR-konsumiert; Client lädt kein JS dafür.
- Antwort (Vorschlag): `{ rows: [{ kind: "air"|"forum"|"events"|"kurier", label: { de, en }, value?, spark?: number[7], mute?: boolean }] }` — bereits gefiltert (Zero-Regel serverseitig), Reihenfolge = Anzeige.
- Query-Vorschläge (confirm-before-code 1): Forum = approved Posts der laufenden ISO-Woche · Termine = Events Fr–So des KOMMENDEN Wochenendes (RSVP-öffentliche Zählung) · Kurier = heutige kuratierte Ausgabe vorhanden → Zeile „AUSGABE NR. {n} ERSCHIENEN" · Luft = letzter Logger-Wert ≤ 90 min, sonst `mute` + Gedankenstrich.
- Nur Aggregate. Nie Namen, Titel, UGC-Fragmente.

## §05 Teaser · Blog („AUS DER BEILAGE", rust `#a3552e`)

- Aufmacher-Karte: Rubriken-Strap rust (gefüllt) · Headline display-bold 25px · Standfirst · mono-Datumszeile · Zweit-Headline mit Hairline · Link „Zur Beilage →" (rust, dashed underline).
- Quelle: neuester Nicht-Draft-MDX-Post (+ zweitneuester als Zweitzeile). Linkt direkt auf `/blog/[slug]` bzw. `/blog` — echt öffentlich.

## §06 Teaser · Kiez-Daten („DER KIEZ, GEMESSEN", moss `#6b8a4a`)

- EINE große Zahl (62px, moss): Bevölkerung 25.900* · mono-Unterzeile · darunter Luft-Zeile „Luft heute: gut" + 7-Tage-Sparkline (moss) · Link „Alle Zahlen →" auf `/schillerkiez`.
- *Seed erfunden — echter Wert aus `/api/kiez-stats`. Luft teilt die Quelle mit dem Strip; fällt sie aus, fällt nur die Luft-Zeile weg (Zahl bleibt).

## §07 Teaser · Kurier („DER KURIER · HEUTE AUSGEWÄHLT", INK — kein Farbakzent)

- Headline-Liste (3), je: Headline 14–15px + mono-Quellzeile „TAGESSPIEGEL ↗" (dashed underline). Fußnote: „Aus 9 Quellen kuratiert — jeder Link führt zur Quelle."
- **Links gehen zur QUELLE** (`target="_blank" rel="noopener"`), NIE in eine Login-Wall. Quelle: heutige kuratierte Ausgabe, Top 3 nach Relevanz-Score.

## §08 CTA-Zone (ochre)

- Wash `rgba(176,117,21,0.10)` + dashed Top-Rule ochre. H2 „Mach mit im Kiez." · Ink-Pill-Button „Mitmachen — kostenlos" (→ `/register`, min-height 48px) · mono-Subline „FÜR NACHBAR:INNEN … ANMELDUNG IN ZWEI MINUTEN" · Slogan serif-italic als Schlusszeile: „Das hier wird, was wir draus machen."

## §09 Footer

- Hairline-Top; Links (mono, dashed underline): Impressum · Datenschutz · Über das Projekt · Förderung: Gebietsfonds · Kontakt · GitHub ↗; rechts „© 2026 MAHALLE · SCHILLERKIEZ". **Kein Sprachumschalter im Footer** (sitzt oben).

## §10 Mobil (390)

- Gleiche Reihenfolge, gestapelt: Datumszeile → Masthead (54px) → Doppellinie → Strip als Zeilen-Stapel (Ink-Band, Zeile für Zeile, Sparkline rechts in der Luft-Zeile) → Teaser-Stapel Blog/Daten/Kurier **in einem opaken Papier-Wrapper** → CTA → Footer.
- Hintergrund: identisches Rezept (cover beschneidet stärker — abgenommen). Alle Tap-Targets ≥ 44px.

## §11 i18n

- Volle DE/EN-Parität im Chrome + Teaser-Labels (Strings in `kiosk-landing.jsx` → `LND_L`, nach kiosk-i18n.ts überführen). Kurier-Headlines + Blog-Titel bleiben in Originalsprache der Quelle. Curly quotes DE („…"), EN (“…”).

## §12 Motion

- `lndPulse` 2.4s ease-in-out infinite (Punkt-Opacity .3→1→.3) — einzige Animation der Seite.
- `prefers-reduced-motion`: Punkte statisch bei voller Deckung. Keine Scroll-/Entrance-Animationen.

## §13 Akzent-Inventar (komplett, nichts TBD)

Forum wine · Kalender teal · Marktplatz wine (geteilt, Absicht) · Kurier INK · Kiez-Daten moss · Blog rust · Auth/Profil ochre · Admin plum. Landing selbst ist ink-led; Akzente NUR im eigenen Teaser-Slot + Überdruck-Ausnahme §02.

## §14 Backend-Impact & offene Fragen

| Baustein | Impact |
| --- | --- |
| `GET /api/kiez-heartbeat` | NEU — aggregiert Forum/Events/Kurier/Luft-Logger, unauth, Cache ~1h (§04) |
| Teaser Blog / Kiez-Daten / Kurier | keine neuen Endpoints — bestehende Quellen SSR-seitig lesen |
| Routing | `/` = Landing + Redirect eingeloggt → `/forum`; Teil des bestehenden Routing-Release |
| Schema | KEINE Änderungen |

Offene CC-Fragen: (1) Heartbeat-Query-Definitionen bestätigen (§04) · (2) `/landing` löschen vs. 301 · (3) Cache-Ort (CDN vs. In-Memory) für den Heartbeat — Design ist agnostisch, ~1h Frische genügt.

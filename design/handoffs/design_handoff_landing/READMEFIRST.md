# READMEFIRST · Landing Page — Das Schaufenster (12. Fläche, Aug 19 2026)

Öffentliche Landing auf `/` im Editorial-Kiosk: EIN-Viewport-Zeitungsseite — Masthead · Manifest · KiezHeartbeat-Strip · 3 Teaser (Blog / Kiez-Daten / Kurier) · EIN Mitmachen-CTA · Footer. Eingeloggt → sofortiger Redirect `/forum`. Design komplett + vom User abgenommen (Hintergrund-Variante „VOLLBILD GESPIEGELT" gewählt Aug 18, Teaser-Zone opak + EN/Mobil nachgezogen Aug 19).

## ⚠ Zuerst lesen — 4 Flags

1. **Alle Seeds sind PLAUSIBEL ERFUNDEN** — Heartbeat-Zahlen (Luft „gut", 12 Beiträge, 3 Termine), Ausgabe Nr. 214, 25.900 Nachbar:innen, alle drei Kurier-Headlines. Echte Werte kommen zur Laufzeit aus den echten Quellen; nichts davon hardcoden.
2. **Der Heartbeat-Endpoint ist ein NEUER Build-Enabler:** `GET /api/kiez-heartbeat` — public, **unauth**, ~1h-Cache, SSR-konsumiert, zero JS im Client (Puls ist reines CSS). Aggregat-Zahlen only, nie UGC, nie Namen. Spec in `LANDING_SCOPING.md` §04. Als eigene PR VOR dem Seitenbau empfohlen.
3. **Teil des größeren Routing-Release:** `/` wird Landing, das Forum zieht nach `/forum` (dein Release, nicht Design-Scope). Die Seite bekommt ein **eigenes Minimal-Layout** (Geschwister von AuthLayout): keine App-Nav, keine Tour, kein Splash-Video. Die alte `/landing` (2023-Fossil, BaseLayout, EN-Generik) ist NICHT salvagebar — ersetzen, Route löschen oder redirecten.
4. **Das Hintergrund-Bild liegt im Paket:** `assets/background_landing_page-transparent.png` (halbtransparente Aquarell-Riso-Bänder auf Weiß). Es ist die **offizielle Überdruck-Ausnahme** zur „ink-led, kein Regenbogen"-Regel: NUR als multiply-Hintergrund auf dieser Seite, exakt nach Rezept unten — nie als Deko auf App-Flächen.

## Rezept „VOLLBILD GESPIEGELT" (nicht verhandelbar)

- Bild absolut über die ganze Seite, `transform: rotate(180deg)` · `background-size: cover` · `background-position: center top` · `mix-blend-mode: multiply` · `opacity: 0.16` · **kein Blur, kein Filter**. Ergebnis: Bänderzug startet unten-rechts, flache Kante bündig an der Seiten-Unterkante.
- **z-Stapel statt negativem z-index:** Bänder-Layer `z-index: 0`, ALLE Geschwister `position: relative; z-index: 1`. Negativer z-index verschwindet hinter dem Papier-Grund — gelernt, nicht wiederholen.
- **Die Teaser-Zone liegt IMMER auf opakem Papier** (`#f3ead8`): desktop das 3-Spalten-`main`, mobil der Wrapper um die drei Teaser-Blöcke. Die Bänder tauchen darunter durch und kommen oben (Masthead/Strip) + unten (CTA/Footer) wieder raus.
- Gleiche Rezeptur für Desktop (1280) und Mobil (390, cover crops stärker — so abgenommen).

## Heartbeat-Strip · Zero-Regel (nicht verhandelbar)

- Der Strip zeigt **nie eine Null** — Zeilen ohne Leben werden SERVERSEITIG weggelassen; der Strip verträgt 1–4 Zeilen. Früh lieber Wochenfenster („diese Woche") statt „heute".
- Luft-Zeile kann ausfallen (Logger-Outages sind real): designter Absent-State = Gedankenstrich + stiller Punkt, **nie stale Werte**.
- Fällt der ganze Strip aus → er kollabiert ersatzlos, die Manifest-Zeile trägt die Seite. Kein Skeleton, kein Fehlerbanner auf der Landing.
- Alle 4 Zustände als Board im Bundle (Sektion ◆ LANDING, „Heartbeat · Zustände & Regeln").

## Confirm-before-code (2)

1. **Heartbeat-Query-Definitionen:** Was zählt exakt als „Beiträge diese Woche" (nur approved?), „Termine am Wochenende" (Fr–So? kommendes WE?), „Ausgabe erschienen" (Kurier-Tagesausgabe?)? Vorschläge in §04 — kurz bestätigen, bevor der Endpoint gebaut wird.
2. **`/landing`-Fossil: löschen oder 301 auf `/`?** Design-Votum: 301, kostet nichts, tötet Alt-Links nicht.

## Nicht verhandelbar

- **EIN CTA** auf der ganzen Seite (ochre Zone, Ink-Button „Mitmachen — kostenlos"). Dezenter „Anmelden →"-Textlink nur in der Datumszeile. Eingeloggt → Redirect `/forum`, die Seite sieht kein Member je.
- **Banner-Slot bleibt FREI:** die Zone zwischen Masthead-Doppellinie und Strip ist für den Sept-Launch-Banner (Gebietsfonds-Events Herrfurthplatz) reserviert — nicht verbauen, nicht v1.
- **Kurier-Headlines linken zur QUELLE (↗)**, nie in eine Login-Wall — kein Bait. Blog + Kiez-Daten linken direkt rein (echt öffentlich).
- **Akzente nur im eigenen Teaser-Slot:** Blog rust `#a3552e` · Kiez-Daten moss `#6b8a4a` · Kurier INK · CTA ochre. Sonst ink-led (Überdruck-Ausnahme s. o.).
- Member-Content bleibt gated: keine UGC, keine Namen, nur Aggregat-Zahlen.
- **KEINE Fotos** — reine Typo + Riso-Grafik.
- Deutsch-first, mobile-first; DE/EN-Umschalter oben in der Datumszeile (kein zweiter im Footer).
- reduced-motion: Puls-Punkte stehen still (volle Deckung).
- Curly quotes: „…" in allen DE-Strings.

## Out of scope (v1)

Launch-Banner-Inhalt (Sept) · Newsletter/Kontaktformular · SEO-Landing-Varianten · der Routing-Move selbst (Forum → `/forum`) — die Seite setzt ihn nur voraus.

## Dateien / Feed-Reihenfolge

1. Dieses README
2. `LANDING_SCOPING.md` — Spec §00–§14 (Anatomie, Hintergrund-Rezept, Heartbeat + Endpoint, Teaser, States, Backend-Impact)
3. `Mahalle Redesign.html` (Bundle) — Sektion **◆ LANDING PASS** ganz oben: Desktop DE + EN (VOLLBILD GESPIEGELT) · Mobil DE · Heartbeat-Zustände-Board
4. `jsx/kiosk-system.jsx` → `jsx/kiosk-landing.jsx` — Reihenfolge zwingend (landing braucht `window.kiosk`). Hinweis: die JSX enthält noch ungenutzte Varianten-Pfade (`ribbons`/`ribbonArt`/`bgTuck`/`bgFill`) aus der Hintergrund-Runde — gültig ist NUR `warm bgFull bgFlip`.
5. `tokens-landing.css` + `motion-landing.css` — Spec, keine Drop-ins; über bestehendes `--k-*`-Muster verdrahten
6. `assets/background_landing_page-transparent.png` — MUSS mit ausgeliefert werden

## Empfohlene Bau-Reihenfolge

1. `GET /api/kiez-heartbeat` (Enabler-PR, §04) — inkl. Zero-Regel serverseitig
2. Minimal-Layout + Route `/` + Redirect eingeloggt → `/forum` (im Takt deines Routing-Release)
3. Seite: Masthead → Strip → Teaser (SSR aus echten Quellen) → CTA → Footer; Hintergrund nach Rezept
4. `/landing`-Fossil abräumen (confirm-before-code 2)

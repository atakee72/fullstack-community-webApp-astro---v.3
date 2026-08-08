# TOUR_SCOPING — Die Führung · Spotlight-Onboarding · Editorial Kiosk

Stand 8. Aug 2026 · Design: Claude Design · Entschieden vom User Aug 6 2026 (Spotlight-Tour statt Explore-Metaphern), Review ok Aug 8 2026.

## 01 · Richtung

Metapher: **die Gebrauchsanweisung, die neben dem Kiosk hängt.** Kein eigenes Onboarding-Universum,
keine Checkliste, keine Straps — EIN System: ein Spotlight wandert über die echten Controls der Seite,
eine Karte erklärt, weiter geht's. **Kapitel je Fläche** statt ein 25-Stationen-Marathon; ein Kapitel
beginnt und endet auf einer Seite (löst nebenbei das Anker-sterben-bei-Soft-Nav-Problem).
Tour-Chrome-Akzent: **OCHRE** — der Flächen-Akzent bleibt semantisch die Seite darunter.

## 02 · Drei Eingänge

| # | Eingang | Wann | Persistenz |
|---|---|---|---|
| 1 | **Hallo-Modal** | nach erstem Sign-in (Forum) | einmalig — „Später"/✕ → `tourHelloDismissedAt` |
| 2 | **Kapitel-Angebot-Zeile** unterm Seitentitel | erster Besuch einer Fläche + Kapitel ungesehen | einmalig je Fläche, ✕ schreibt Kapitel-Timestamp |
| 3 | **Avatar-Menü → „Führung starten"** | immer | startet Kapitel der aktuellen Fläche, ändert keine Timestamps |

Kein Header-ℹ im v1 (CC-Votum) — erst sehen, ob Eingang 3 gefunden wird.

## 03 · Spotlight-Karte · Anatomie (6 Teile)

1. **Ring** — 2.5px Ochre + weicher Hof (0 0 0 4px ochre@20%), inset −6px um den Anker. Kein Dauerpuls.
2. **Scrim** — rgba(27,26,23,0.5) über der ganzen Seite; Anker per z-index DARÜBER (Scrim 20 · Anker 30 · Karte 40). Kein Ausschneiden/Maskieren.
3. **Kicker** — mono, `FÜHRUNG · [KAPITEL]`, tiefes Ochre #b07515 — sagt immer, wo man ist.
4. **Fortschritt** — Punkte + „n / 7", zeigt Kapitel-Länge ehrlich vorab.
5. **Aktionen** — „weiter →" (Ink-Pill, primär) · „← zurück" (leise, ab Station 2) · ✕ (bricht ab, schreibt Timestamp genauso).
6. **Kapitel-Ende** — Moss-Stempel (✓ KAPITEL, −8° rotiert) + „Nächstes Kapitel: … →"-Link (normale Navigation).

Karte: 380px, paperWarm, Ink-Rahmen, 4px Ochre-Top-Rule, Ochre-Druckschatten, Pfeil-Nase zum Anker (45°-Quadrat).

## 04 · Engine-Kontrakt (CC-abgestimmt Aug 6 2026)

**Fünf Pflichten:**
1. Auf Hydration warten — Islands sind client:only, Anker existieren beim First Paint noch nicht.
2. Anker nach jedem Soft-Nav neu finden — ViewTransitions remountet Islands.
3. Fehlender Anker → Station still überspringen, Zähler passt sich an.
4. Jede Station in den View scrollen; content-visibility:auto → erst NACH dem Scroll messen.
5. Ein Kapitel überquert nie eine Navigation.

**Regeln:** sichere Anker = Chrome + Top-Level-Controls (nie die n-te Karte) · Esc schließt · Pfeiltasten
navigieren · Fokus-Falle · Mount im KioskLayout, Styles in global.css (.tour-*) · reduced-motion: nur
Fades, Ring statisch · DE/EN via kiosk-i18n.ts · mobil Bottom-Sheet über der Bottom-Nav, Targets ≥44px.

## 05 · Speicher-Schema

```
tours?: { forum?: Date, kalender?: Date, markt?: Date, kurier?: Date, kiezdaten?: Date, blog?: Date, profil?: Date }
tourHelloDismissedAt?: Date
```
Timestamps nie Booleans · localStorage-Spiegel, Server ist die Wahrheit · anonym → Merge bei Registrierung ·
Abbruch schreibt genauso · Neustart ändert nichts.

## 06 · Kapitelkarte (7 Kapitel)

| Kapitel | Akzent drunter | Stationen |
|---|---|---|
| **Forum** ★ final | Wein | 7 — s. §07 |
| Kalender | Teal | 4 — Monat/Agenda · Ziehen-zum-Anlegen · RSVP · Kategorien |
| Marktplatz | Wein | 4 — Verkaufen/Tausch/Verschenken · Anzeige aufgeben · Kontakt (Formular, keine DM) · Meine Anzeigen |
| Kurier | Ink | 4 — Masthead/tägliche Ausgabe · ◈ speichern · Gelesenes verblasst · Selbst einreichen (5/Tag) |
| Kiez-Daten | Moss | 3 — Planungsraum wählen · Die Kanäle · Kiez in Zahlen A4 |
| Blog | Rost | 3 — Rubriken · Archiv nach Monat · Im Forum besprechen |
| Profil | Ochre | 3 — Steckbrief + Hobbys (= Interessen-Frage: Tags wählen → profile.hobbies) · Dein Archiv · Kiez-Chronik |

Die 6 Nicht-Forum-Kapitel sind Bauplan (Stop-Listen, kein finales Copy) → Design-Review vor Implementierung.
Nicht im v1: Admin, Auth.

## 07 · Forum-Kapitel · finales Copy (DE — EN im JSX, TR_STOPS)

1. **Diskussionen** — „Fragen, Gespräche, Kiez-Themen — hier landet, was Nachbar:innen gerade beschäftigt. Der Filter zeigt nur diese Beiträge."
2. **Ankündigungen** — „Offizielle Mitteilungen vom Team — in Teal, manchmal angepinnt. Selten, aber wichtig."
3. **Empfehlungen** — „Tipps aus der Nachbarschaft: Läden, Ärzt:innen, Ecken. Das Gedächtnis des Kiezes."
4. **Gespeichert** — „Alles, was du mit ◈ markierst, wartet hier — nichts geht verloren."
5. **Meine** — „Deine eigenen Beiträge und ihr Status — auch die, die gerade noch geprüft werden."
6. **Tags** — „Ein Klick auf einen Tag filtert den Kiez nach diesem Thema. Noch ein Klick auf denselben Tag — und alles kommt zurück."
7. **Neues Thema** — „Wenn du so weit bist: dein erster Beitrag. Eine ‚Hallo Kiez'-Vorlage liegt bereit — er wird kurz geprüft und ist meist in Minuten sichtbar." + Kapitel-Ende-Stempel + „Nächstes Kapitel: Kalender →"

Anker: Stationen 1–5 = Filterchips · 6 = erster Tag-Chip (Top-Level-Tag-Leiste, nicht Karten-Tags) · 7 = „+ Neues Thema"-CTA.

**Hallo-Modal-Copy (DE):** Kicker „WILLKOMMEN IM KIEZ" · „Schön, dass du *da* bist, Emre." ·
„Kurze Führung durchs Forum? Sieben Stationen, ungefähr eine Minute. Du kannst jederzeit abbrechen —
und sie später beliebig oft neu starten." · CTA „Führung starten →" · leise „Später vielleicht" ·
Fußnote „ERSCHEINT EINMAL · DANACH: AVATAR-MENÜ → ‚FÜHRUNG STARTEN'".

## 08 · Mobile (390)

Hallo = Bottom-Sheet (Grabber, Ochre-Kicker, Vollbreite-CTA 44px+). Station = Sheet ÜBER der Bottom-Nav
(bottom-offset ~78px, left/right 12px), gleiche Anatomie kompakt: Kicker+✕ · Titel · Body · Rule ·
„n / 7" + zurück + weiter. Ring auf dem Anker wie Desktop. Alle Targets ≥44px (✕ hat 44×24-Hitbox + Padding).

## 09 · Sprache

DE + EN volle Parität (TR_L + TR_STOPS tragen beide). Deutsche Anführungszeichen: „ (U+201E) + " (U+201C).

## 10 · Backend-Impact

**Ein additives Feld am User-Doc** (`tours` + `tourHelloDismissedAt`, s. §05) + ein PATCH-Pfad zum Schreiben.
Sonst NICHTS — keine neuen Collections, keine Cron, keine Moderation. Anonym-Merge bei Registrierung
folgt dem bestehenden localStorage-Muster (Warning-Label).

## 11 · Offene Fragen an CC

1. Hallo-Modal-Trigger, wenn der erste Login per Deep-Link NICHT auf dem Forum landet — hart /forum abwarten oder Modal auf erster Kapitel-Fläche zeigen (Vorschlag)?
2. Anker-Vergabe: data-tour="…"-Attribute an den Controls (empfohlen, robust gegen Refactors) vs. bestehende Selektoren — CCs Wahl, aber bitte EIN Muster.
3. Kapitel-Angebot-Zeile: rendert serverseitig (Layout-Slot) oder clientseitig nach Hydration? Clientseitig vermeidet Flash-of-offer bei gesehenem Kapitel.

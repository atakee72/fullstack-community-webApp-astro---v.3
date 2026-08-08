# READMEFIRST · Die Führung — Spotlight-Tour (Onboarding, Aug 8 2026)

Elfte Fläche, aber keine Seite: ein **Overlay-System im KioskLayout**. Step-by-step-Spotlight-Tour („Gebrauchsanweisung") in **Kapiteln je Fläche** — nie ein Marathon, nie über eine Navigation hinweg. Design komplett + vom User abgenommen (Aug 8 2026).

## ⚠ Zuerst lesen — 3 Flags

1. **Der Engine-Kontrakt ist die eigentliche Arbeit.** Die Karte ist Styling; die fünf Pflichten (unten + Spec-Board im Bundle) sind der Kern. Astro-Islands + ViewTransitions machen naive Anker-Selektoren kaputt — der Kontrakt ist dagegen gebaut. Nicht abkürzen.
2. **Nur das Forum-Kapitel ist voll ausgestaltet** (7 Stationen, finales Copy DE+EN, Frames im Bundle). Die übrigen 6 Kapitel sind **Stop-Listen als Bauplan** (Kapitelkarte-Board) — gleiche Anatomie, aber ihre Inhalte/Copy sind **confirm-before-code: Design-Review vor Implementierung**. Engine + Forum-Kapitel können sofort gebaut werden.
3. **CC-Amendments sind eingearbeitet und verbindlich** (abgenickt Aug 6 2026): (a) Neustart-Eingang NUR über das Avatar-Menü im v1 — kein Header-ℹ; (b) **die Tour fährt allein** — Checkliste + Straps aus der alten Exploration sind RAUS, ein System statt zwei; (c) Speicher = Timestamps je Kapitel, nie Booleans; (d) Engine scrollt selbst + misst erst NACH dem Scroll (content-visibility:auto).

## Was drin ist

- **Hallo-Modal** (Eingang 1, einmalig): nach dem ersten Sign-in auf dem Forum. „Später" / ✕ → `tourHelloDismissedAt`, kommt nie wieder. Desktop-Karte + mobiles Bottom-Sheet, DE+EN.
- **Forum-Kapitel, 7 Stationen:** Diskussionen → Ankündigungen → Empfehlungen → Gespeichert → Meine → Tags (an/aus) → Neues Thema (+ „Hallo Kiez"-Vorlage). Station 7 trägt Moss-Kapitel-Stempel + „Nächstes Kapitel: Kalender →"-Link (normale Navigation — die Tour selbst navigiert nie).
- **Kapitel-Angebot-Zeile** (Eingang 2, je Fläche, einmalig): eine Zeile unterm Seitentitel im Flächen-Akzent, „NEU HIER? Kurze Führung … starten / ✕". Teil DES Tour-Systems, kein zweites Onboarding.
- **Avatar-Menü-Zeile „Führung starten"** (Eingang 3, immer): neue Zeile im bestehenden Avatar-Menü (i18n-Key + .am-row), startet das Kapitel der AKTUELLEN Fläche. Ändert keine Timestamps.
- **Spec-Board** (Anatomie mit 6 Callouts + Engine-Kontrakt + Speicher-Karte) + **Kapitelkarte-Board** (7 Kapitel + 3 Eingänge) — beides im Bundle ganz oben, Sektion ◆ FÜHRUNG.

## Engine-Kontrakt · die fünf Pflichten (nicht verhandelbar)

1. **Auf Hydration warten** — Islands sind client:only; Anker existieren beim First Paint noch nicht.
2. **Anker nach jedem Soft-Nav neu finden** — ViewTransitions remountet Islands.
3. **Fehlt ein Anker → Station still überspringen**, Zähler passt sich an. Nie ein Ring ins Leere.
4. **Jede Station in den View scrollen** · content-visibility:auto → erst NACH dem Scroll messen.
5. **Ein Kapitel überquert nie eine Navigation** — beginnt und endet auf einer Seite.

## Speicher-Schema (Spec)

```
tours?: { forum?: Date, kalender?: Date, markt?: Date, kurier?: Date, kiezdaten?: Date, blog?: Date, profil?: Date }
tourHelloDismissedAt?: Date
```
- **Timestamps, nie Booleans** — Re-Offer nach künftigem Redesign-Cutoff bleibt möglich.
- localStorage-Spiegel = Paint-Speed-Cache, **Server ist die Wahrheit** (Muster: Warning-Label).
- Anonym: nur localStorage → Merge in den User-Doc bei Registrierung.
- ✕ / Abbruch schreibt den Kapitel-Timestamp GENAUSO wie „Fertig" — abgebrochen zählt als gesehen.
- Neustart über Avatar-Menü ändert nichts an den Timestamps.

## Confirm-before-code (2)

1. **Kapitel-Inhalte der 6 Bauplan-Flächen** (Kalender 4 · Marktplatz 4 · Kurier 4 · Kiez-Daten 3 · Blog 3 · Profil 3): Stop-Listen stehen, finales Copy nicht → kurzer Design-Review je Kapitel VOR Implementierung. Forum ist final.
2. **Hallo-Modal-Trigger:** „nach erstem Sign-in, auf dem Forum" — falls der erste Login nicht auf /forum landet (Deep-Link), Vorschlag: Modal zeigt sich beim ersten Besuch EINER Kapitel-Fläche und bietet deren Kapitel an. OK, oder hart ans Forum binden?

## Nicht verhandelbar

- **Sichere Anker:** Chrome + Top-Level-Controls (Filterchips, Tags, Buttons, Toggles) — NIE die n-te Karte einer Liste.
- Scrim = rgba(ink, 0.5) über der ganzen Seite; der Anker liegt per **z-index darüber**, wird nicht ausgeschnitten.
- Tour-Chrome-Akzent = **OCHRE** (Ring, Top-Rule, Kicker) — der Flächen-Akzent (Wein, Teal, …) bleibt semantisch die Seite darunter. Kicker-/Link-Text auf Papier nutzt das tiefe Ochre `#b07515`.
- Esc schließt · Pfeiltasten navigieren · Fokus-Falle in der Karte, Fokus kehrt zum Auslöser zurück.
- Mount im KioskLayout, Styles global (.tour-*), DE/EN über kiosk-i18n.ts.
- Mobil: Karte als **Bottom-Sheet ÜBER der Bottom-Nav** (nicht dahinter), alle Targets ≥ 44px. Hallo-Modal mobil = Bottom-Sheet mit Grabber.
- reduced-motion: Scrim + Karte nur faden, **Ring statisch**, kein Puls.
- Interessen-Frage aus der alten Exploration: GELÖST — lebt als **Profil-Kapitel Station 1** (Steckbrief + Hobbys, Tooltip lädt zum Tag-Wählen ein → `profile.hobbies`). Kein eigenes Formular bauen.
- Nichts postet automatisch; die „Hallo Kiez"-Vorlage in Station 7 ist ein vorbefüllter Composer-Einstieg, normale 5/Tag-Quota + AI-Moderation.
- Curly quotes: „…" in allen DE-Strings.

## Out of scope (v1)

Admin-Kapitel (Back-Office, eigene Doku) · Auth (vor dem Login gibt es nichts zu führen) · Header-ℹ als vierter Eingang · Checkliste/Fortschritts-Straps · Reporter-/Benachrichtigungs-Anbindung.

## Dateien / Feed-Reihenfolge

1. Dieses README
2. `TOUR_SCOPING.md` — 11-Abschnitt-Spec (Anatomie, Kontrakt, Speicher, Kapitelkarte, Stationen-Copy)
3. `Mahalle Redesign.html` (Bundle) — Sektion **◆ FÜHRUNG** ganz oben: Hallo-Modal DE+EN · Forum-Stationen 1/6/7 DE + 1 EN · Mobil (Hallo-Sheet + Station 6) · Spec-Board · Kapitelkarte-Board
4. `jsx/kiosk-system.jsx` → `jsx/kiosk-tour.jsx` → `jsx/kiosk-tour-spec.jsx` — **Reihenfolge zwingend** (spec nutzt TRTip/TRRing aus kiosk-tour.jsx; beide brauchen window.kiosk aus kiosk-system.jsx)
5. `tokens-tour.css` + `motion-tour.css` — Spec, keine Drop-ins; über bestehendes `--k-*`-Muster verdrahten

## Empfohlene Bau-Reihenfolge

1. Engine (fünf Pflichten) + Speicher-Schema + Avatar-Menü-Zeile — testbar am Forum-Kapitel
2. Forum-Kapitel (Copy final, im Bundle) + Hallo-Modal + Kapitel-Angebot-Zeile
3. Die 6 übrigen Kapitel — je nach Design-Review (confirm-before-code 1)

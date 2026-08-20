# NOTIFY_CC_ANSWERS · Visuelles Layer zum Notification Center (Aug 19 2026)

Antwort auf `docs/superpowers/specs/2026-08-18-notification-center-design.md` („look-and-feel is CD's"). **Kein volles Handoff-Paket** — Mechanik, Datenmodell, API, Hooks stehen bei dir und bleiben unangetastet; das hier ist ausschließlich das visuelle Layer. Wo dieses Dokument von deinem Provisorium abweicht, gilt dieses Dokument.

**Paket-Inhalt:** dieses Doc · `tokens-notify.css` (Knob-Spec, kein Drop-in) · `motion-notify.css` · `jsx/kiosk-system.jsx` + `jsx/kiosk-notify.jsx` (Quelle der Wahrheit für alle Werte; alle Strings als NC_L-Tabelle) · `Mahalle Redesign.html` (self-contained Canvas-Bundle — Sektion **MITTEILUNGEN** ganz oben: Desktop DE offen · EN leer · Mobil-Sheet · Frisch/Gelesen-Board · Leer-Panel DE+EN · Mobil-Sheet leer · Spez-Board).

---

## 1 · Glocke & Badge

- **Glocke = Umriss-Disc 36 px**, paperWarm-Fläche, 1.5 px Ink-Rand — Geschwister des Avatar-Discs, sitzt LINKS davon im Rechtscluster (Sprachschalter · Glocke · Avatar). Glyphe = Umriss-Bell, Ink, ~19 px. Tap-Ziel ≥ 44 px über unsichtbaren Hit-Bereich.
- **Badge = Wein-ZÄHLER, capped „9+"** — dein Fixed-Dot-vs-Q1-Widerspruch ist damit zugunsten des Zählers aufgelöst. Wein-Fläche, Papier-Ziffer, 1 px Ink-Rand, minWidth 17 px, Position oben rechts überlappend (top −5 / right −6).
- **Null ungelesen = KEIN Badge.** Nie „0" (Zero-Regel der Landing gilt auch hier).
- **KEINE Motion an Glocke oder Badge** — statisch, auch beim Eintreffen neuer Zähler. Der Zähler selbst ist die Nachricht; das 90s-Polling darf nichts wackeln lassen.

## 2 · Typ-Akzente — Hybrid-Regel

Tinte ist Default; Farbe NUR wo das **System** spricht. Akzent sitzt ausschließlich auf der Glyphe — nie im Körpertext, nie im Badge.

| type | Glyphe | Farbe |
|---|---|---|
| `comment` | ✎ | Tinte |
| `market_contact` | ⇄ | Tinte |
| `moderation` | § | **Pflaume** `#6f2f59` |
| `official` | ◉ | **Teal** `#3f8f9f` (Amtlich-Präzedenz der Announcement-Fläche) |

**Begründete Abweichung von deinem Provisorium:** `market_contact` bekommt **⇄ statt ◈** — ◈ ist bereits „Gespeichert" im Avatar-Menü; die Glyphen-Kollision wäre eine falsche Verwandtschaft. Nachbarschaft untereinander (✎, ⇄) bleibt bewusst Tinte.

## 3 · Frisch / Gelesen — Kurier-Verblassen

- **Frisch:** volle Tinte, Gewicht 600, **3 px Ink-Kante links** als Zweitanker.
- **Gelesen:** inkMute, Gewicht 500, Glyphe auf 45 % Opazität, keine Kante.
- **Begründete Abweichung:** die Frisch-Kante ist **Ink, nicht Wein** — Wein bleibt allein beim Badge und beim „n NEU"-Zähler im Kopf; zwei Wein-Träger im Panel würden den Zähler entwerten.
- Verhalten wie in deiner Spec: Öffnen feuert den PATCH/POST `read`, die offene Session behält den pre-mark-Zustand client-seitig — frische Zeilen verblassen erst beim nächsten Besuch. Bestätigt, kein Einzel-Read, kein Einzel-Dismiss.

## 4 · Kopf & Leere

- **Kopf = Mono-Zeile + Ink-Rule, KEIN Rubrik-Strap** — das Panel ist Chrome, keine Rubrik. paperWarm-Zone, „MITTEILUNGEN" mono 10/700/0.16em, rechts „n NEU" mono wein (nur wenn n > 0), darunter 1.5 px Ink-Rule.
- **Leere = EINE warme Zeile, Serif kursiv,** zentriert: DE „Alles gelesen — der Kiez meldet sich, wenn's was Neues gibt." / EN „All caught up — the kiez will let you know when there's news." Kein Icon-Theater, keine Null.

## 5 · Panel-Anatomie & Mechanik-Erbe

- **Panel 324 px** (desktop), Papier + 1.5 px Ink-Rand + Druckschatten `3px 3px 0 ink` (kein Blur), Radius 12, Caret 12 px zur Glocke.
- **Zeile:** Kante (3 px) · Glyphe (Mono, 16 px-Spalte) · Körper (Bricolage 12.5–13.5/1.4, client-seitig aus i18n gerendert — DE/EN-Toggle wirkt rückwirkend, wie in deiner Spec) · relative Zeit (Mono 9.5, beim Öffnen berechnet, nie stale). Ganze Zeile = Link zu `target.href`; Hover paperSoft; Trenner 1 px dashed rule.
- **Mechanik verbatim vom Avatar-Menü geerbt** (deine Struktur-Vorgabe, bestätigt): Stamp-in 220 ms SETTLE, transform-origin oben rechts · ESC / Außenklick / Routenwechsel / erneuter Glocken-Klick schließen, Fokus kehrt zur Glocke zurück · Tastatur ↑↓ + Enter · Avatar-Menü und Panel schließen einander (nur eins offen) · dual html+body-Scroll-Lock, z-50-Bump, Scrim, reduced-motion-Guard — alles wie in `AvatarMenu.svelte` · Styles als **`.nc-*` in `global.css`** (Nested-Island-Regel), bestätigt.
- **Mobil:** Bottom-Sheet über Scrim (rgba-Ink 0.5), Grabber, Radius 16 oben, Zeilen ≥ 44 px (13 px Padding, big-Variante), Schließen: Scrim-Tap + Swipe-down. Glocke bleibt in der Top-Bar, Badge identisch.

## 6 · Fuß-Slot — ab R1 strukturell reserviert

Banner-Slot-Lektion der Landing: der Fuß (Ink-Rule + paperWarm-Zone) ist ab R1 **Teil der Anatomie, rendert aber NICHTS**. In R2 zieht das Push-Opt-in dort ein, ohne dass Kopf oder Zeilen umziehen. Niemals Werbung, niemals eine zweite Aktion daneben. (iOS-Install-Erklärtext R2 lebt dann ebenfalls dort.)

## Flags

- **Seeds sind ERFUNDEN** (Lena/Ali/Deniz, Wasserabsperrung Herrfurthstraße) — plausible Platzhalter, echte Copy kommt aus `kiosk-i18n.ts`-Keys per `type` + Interpolation.
- Die Artboards dimmen eine Forum-Attrappe als Hintergrund (`ForumTitleBlock` vom Canvas) — reine Kulisse, nicht Teil des Deliverables.
- Struktur-Kontrakt deiner Spec (Fan-out, 4 Typen, Panel-only, 90s-Polling, TTL 90 d, never-throw) ist vollständig kompatibel — nichts davon berührt das visuelle Layer.

## 7 · Nachträge aus dem User-Review (Aug 19)

- **NC_L = i18n-Quelle.** Alle Panel-Strings (Kopf, „NEU", Leere) UND die Typ-Copy-Vorlagen liegen jetzt als `NC_L`-Tabelle (DE/EN) oben in `jsx/kiosk-notify.jsx` — sie wandern **1:1 nach `kiosk-i18n.ts` unter `nc.*`** (bestehende Basis-Copy dort überschreiben). Interpolation: `{actor}` `{title}` `{n}`. DE-Artikel je `contentType` (Thema / Empfehlung / Kommentar …) löst ihr als Key-Varianten (`nc.comment.topic` …) — die Vorlagen sind die Topic-Kanonik.
- **`market_contact`-Copy KORRIGIERT:** der frühere Seed nannte den Käufer („Nachricht von Ali") — das widerspricht eurer eigenen Spec (kein `actorId`, Käufer anonym per GDPR-Stance). Jetzt: „Neue Anfrage zu deinem Angebot ‚{title}‘" — ohne Namen. Bitte so bauen.
- **Fuß-Slot rendert im Spez nur noch als markierte FREIE Zone** (dashed Outline, leer, 34 px) — kein Label-Theater; R1 baut dort nichts, die Zone existiert nur strukturell (§ 6).
- **Neue Frames auf dem Canvas** (im Bundle enthalten): Frisch/Gelesen-Board (beide Zustände nebeneinander + Übergangs-Regeln) · Leer-Panel DE+EN · Mobil-Sheet leer (EN, kein Badge).
- **Priorität hoch, verstanden** — R1 baut direkt nach diesem Handoff; aus Design-Sicht blockiert nichts.

Damit ist das visuelle Layer entschieden; aus Design-Sicht blockiert nichts den R1-Bau.

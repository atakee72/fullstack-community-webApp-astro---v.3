# READMEFIRST · Avatar-Menü addendum (Aug 4 2026)

Kleines chrome-level Addendum nach Rollout-Abschluss. Zwei Dinge, ein Motiv: **„Abmelden" bekommt ein Zuhause.**

## Was drin ist
1. **Avatar-Dropdown (NEU, desktop)** — der EA-Avatar oben rechts in der Kiosk-Nav wird klickbar. Paper-Dropdown: Who-am-i-Kopf (Name · @handle · seit) → Mein Profil / Meine Beiträge / Gespeichert → (nur `role==='admin'`: Moderation, pflaume, mit Queue-Count) → Fuß-Slot hinter Ink-Rule: **Abmelden** (wein, mono). Erbt auf ALLE Flächen, weil es in der Nav lebt — gehört zu KioskLayout, nicht zu einer Seite.
2. **Mobile Konto-Karte (ÄNDERUNG an ausgeliefertem /profil)** — Gefahrenzone ist mobil jetzt ZU per Default: Disclosure-Zeile „GEFAHRENZONE ▸" (≥44px), erst ein bewusster Tap zeigt „Konto dauerhaft löschen". „Abmelden" steht allein davor. **Desktop-Konto-Karte bleibt unverändert offen** (Cursor-Präzision + Type-Username-Modal + 7-Tage-Frist reichen dort).

## Confirm-before-code (2)
- **Link-Ziele:** „Meine Beiträge" + „Gespeichert" haben keine eigenen Routen — Vorschlag: beide gehen auf /profil-Archiv mit vorgewähltem Filter (Forum bzw. ◈ Gespeichert). OK, oder eigene Routen gewünscht?
- **Counts im Menü** (12 Beiträge · ◈ 7 · Moderation ● 5) sind nice-to-have. Wenn sie eine extra Query pro Seitenaufruf kosten: weglassen, Menü funktioniert ohne.

## Nicht verhandelbar
- Abmelden immer als **WORT** („Abmelden" / „Sign out"), nie nur Icon. Wein + Mono, eigener Fuß-Slot hinter durchgezogener Ink-Rule — nie mit Navigation verwechselbar.
- Kein Scrim hinter dem Dropdown — die Seite bleibt voll sichtbar, das Menü ist leicht.
- Schließen: ESC · Klick außerhalb · Routenwechsel. Tastatur ↑↓ + Enter, Fokus kehrt zum Avatar zurück.
- Moderation-Zeile existiert für Nicht-Admins NICHT (kein disabled state).
- Mobile: KEIN Dropdown — Abmelden bleibt in der Konto-Karte (Profil → §03). Disclosure-Zeile ≥ 44px.
- Abmelden → bestehender Signout-Endpoint → Login mit „abgemeldet"-Zustand (existiert im Profil-States-Pass). Nichts Neues bauen.
- Curly quotes: „…" in allen DE-Strings.

## Motion
`motion-avatarmenu.css`: Stamp-in 220ms SETTLE cubic(.2,.7,.3,1), transform-origin oben rechts, scale .96→1 + translateY(-4→0). Schließen: 140ms INK fade. Gefahrenzone-Aufklappen: height-reveal 220ms SETTLE. `prefers-reduced-motion`: alles sofort, Endzustand.

## Dateien / Feed-Reihenfolge
1. Dieses README
2. `Mahalle Redesign.html` (Bundle) — Sektion **◆ AVATAR-MENÜ** ganz oben: Desktop DE (Mitglied) · Desktop EN (Admin) · Mobil (Konto-Karte, Zustand zu/auf)
3. `jsx/kiosk-avatar-menu.jsx` — AvatarMenu / AvatarMenuDesktop / AMKontoMobileCard / AMDangerFold
4. `jsx/kiosk-profile-public.jsx` — enthält die Konto-Fold-Änderung in `ProfileOwnMobile` (Suchanker: „Gefahrenzone collapsed on mobile")
5. `motion-avatarmenu.css`

Tokens: KEINE neuen — alles aus dem bestehenden `--k-*`-Bestand (paper, paperWarm, ink, wine, plum, rule, print-shadow).

## Out of scope
Kein Theme-/Sprachumschalter im Menü (DE/EN-Switcher bleibt eigenständig in der Nav) · keine Benachrichtigungen · kein „Konto wechseln".

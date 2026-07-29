# READMEFIRST — Admin · Amtliche Mitteilungen (Kiosk-Migration)

Handoff für Claude Code · gepackt 15. Jul 2026 · letzte Admin-Surface auf altem Design.
Danach ist `/blog` der einzige Holdout im ganzen Produkt.

## Was das ist

Kiosk-Redesign des Panels auf **`/admin/announcements`**. Du hast es selbst gescopet:
Backend fertig (CRUD gated by `requireAdminSession()`, Server-Pin), Seite existiert —
**nur BaseLayout→AdminLayout tauschen und `AdminAnnouncementsPanel.svelte` ersetzen.**
Kein Schema-, kein API-Umbau.

## Feed-Reihenfolge

1. Dieses README
2. `ANNOUNCE_SCOPING.md` (Spec + API-Mapping + 2 offene Fragen)
3. `jsx/kiosk-system.jsx` (falls nicht mehr im Kontext — Tokens, KioskAvatar, KioskAnnotate, paperGrain)
4. `jsx/kiosk-admin.jsx` (nur als Referenz — ADM_ACCENT, Masthead-Muster; ist im Codebase schon implementiert)
5. `jsx/kiosk-admin-announce.jsx` (die Designs: Desktop DE/EN · Mobile · 5 States)
6. `tokens-announce.css` + `motion-announce.css` (Spec, keine Drop-ins — wie immer über `--k-*` verdrahten)

Referenz-Canvas: `Mahalle Redesign.html` (Bundle in diesem Ordner), Section „◆ ADMIN · Amtliche Mitteilungen“.

## Vor dem Coden bestätigen (2 Punkte)

1. **Löschen = hart?** Das Bestätigungs-Modal sagt „verschwindet vom Brett **und aus dem Forum** · nicht rückgängig“. Prüfe, dass DELETE im Bestand wirklich hart löscht (kein Soft-Delete). Wenn soft: Modal-Copy anpassen, nicht das Verhalten.
2. **Undo im Verdrängungs-Toast.** State 03 zeigt „✓ angeschlagen · ersetzt: ‚…' · rückgängig“. Undo = altes Pin per `PATCH pinnedUntil` restaurieren + neues lösen. Wenn das racy/ungünstig ist: Undo weglassen, Toast behalten (er MUSS die verdrängte Mitteilung benennen).

## Nicht verhandelbar

- **Nur EIN 📌 je sichtbar.** Die Server-Invariante (Anpinnen demontiert das aktuelle Pin) wird im UI lesbar gemacht, nie versteckt: Composer-Hinweis benennt die aktuelle Anheftung namentlich; Re-Pin-Buttons tragen „ersetzt die aktuelle Anheftung“; Toast benennt die Ablösung.
- **Kein Dauer-Wähler.** `create.ts` pinnt hart 7 Tage; Re-Pin = `PATCH pinnedUntil: now+7d`. Die 7 Tage stehen als Text am Composer und am Re-Pin-Button.
- **Karten-Anatomie:** angepinnt = Ink-Karte + Teal-Strap „OFFIZIELLE ANKÜNDIGUNG · MAHALLE-TEAM“ + Ochre-Chip „📌 ANGEPINNT BIS …“ (exakt die Forum-Ankündigungs-Behandlung). Archiv = Papier, gestrichelter Abgelaufen-Chip, opacity 0.92.
- **Optimistisch speichern:** neue Karte erscheint sofort (Puls-Chip „WIRD ANGEPINNT…“), verdrängte Karte rutscht sichtbar ins Archiv; bei Fehler Rollback, Eingaben bleiben.
- **Mobile ist Pflicht** (deine eigene Korrektur): Karten-Stack statt Tabelle, Aktionen ≥ 44 px, Composer als Vollbutton.
- **Anführungszeichen:** „ (U+201E) + “ (U+201C) in allen DE-Strings. ASCII-`"` bricht Babel/Copy-Konsistenz.
- **Papier-Grain** kommt mit AdminLayout automatisch mit.

## Schritte

1. `admin/announcements.astro`: BaseLayout → AdminLayout (Masthead-Wordmark hier: „amtliches“, sonst identisches Plum-Chrome).
2. Neues Panel-Component nach `jsx/kiosk-admin-announce.jsx` bauen: Titelblock („Was hängt am *Brett*?“) → Grid 460px Composer | Brett+Archiv-Liste.
3. Aktionen verdrahten: anschlagen (POST) · bearbeiten (PATCH) · lösen (PATCH pinnedUntil: null) · erneut anpinnen (PATCH now+7d) · löschen (DELETE + Kiosk-Modal, kein prompt()).
4. States 01–05 (laden / leer / speichert+Verdrängung / Fehler / löschen) — Keyframes in `motion-announce.css`.
5. Mobile-Stack (≤ md).
6. DE + EN via kiosk-i18n, Toasts über die geteilte Toast-Infrastruktur.

## Out of scope

`/blog` (nächste/letzte Migration, noch undesignt) · Benachrichtigungen bei Verdrängung · geplantes Veröffentlichen · mehrere gleichzeitige Pins · Pin-Dauer-Optionen.

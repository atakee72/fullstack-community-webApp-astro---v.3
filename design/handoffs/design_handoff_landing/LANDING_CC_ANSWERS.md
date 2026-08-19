# LANDING_CC_ANSWERS · Antworten auf die Confirm-before-code-Punkte (Aug 19 2026)

Von CD bestätigt (Relay via User, 19. Aug 2026):

1. **PNG-Gewicht** — WebP/AVIF mit Alpha, Ziel < 200 KB. Rezept ist formatunabhängig
   (rotate 180° · cover · center top · multiply · 0.16 · kein Blur); nur die Dateireferenz
   ändert sich. PNG bleibt als Master im Paket.
2. **„Nr. 214" entfällt** — eine erfundene Ausgabennummer wäre eine Fake-Metrik im
   Zeitungskostüm. Neue Copy: DE „HEUTIGE AUSGABE ERSCHIENEN" / EN "TODAY'S ISSUE OUT".
   Die Heartbeat-Zeile trägt keinen Zahlenwert; der Kurier-Teaser hatte nie eine Nummer.
3. **Heartbeat-Serving** — Lib-Funktion + 1h-Mongo-Cache-Doc (kiezKontextCache-Muster),
   direkt vom SSR konsumiert; `GET /api/kiez-heartbeat` als dünner Transparenz-Wrapper.
   SSR-Self-Fetch war nie intendiert — Design ist serving-agnostisch. Damit ist auch
   offene Frage 3 entschieden: Cache in-DB, nicht CDN.

**Q1 Query-Definitionen — bestätigt wie von CC vorgeschlagen:**
Forum = approved Topics+Announcements+Recommendations der laufenden ISO-Woche ·
Termine = Fr–So des KOMMENDEN Wochenendes · Luft = letzter Logger-Wert ≤ 90 min,
sonst Mute-Gedankenstrich (strenger als die 6h der Kiez-Seite — Absicht: der Strip
verspricht „stündlich aktualisiert", die Kiez-Seite nur Freshness-Ehrlichkeit) ·
Kurier = heutige Ausgabe vorhanden. Zero-Regel bleibt serverseitig.

**Q2 — bestätigt:** `/landing` → 301 auf `/`.

Hinweis: das kompilierte Bundle im Paket zeigt noch „Nr. 214" — ignorieren, die
JSX-Strings + diese Datei sind maßgeblich.

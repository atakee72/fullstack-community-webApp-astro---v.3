/* global React */

// ══════════════════════════════════════════════════════════
//  KIEZ-DATEN PASS · novel features (5 modules)
//  §00 Messwert-Logger (backend enabler, user-requested air
//  history) · §01 Zahl der Woche · §02 Berlin-Vergleich ·
//  §03 Datenarchiv (A4 print) · §04 Anwohner-Kontext.
// ══════════════════════════════════════════════════════════

const { kiosk: KN, paperGrainStyle: KN_grain, kioskFonts: KN_fonts } = window;
const { KZ_T: NT, KZ_PCT: NP, KZ_MOSS: NMOSS, KZBar: NBar, KZDonut: NDonut } = window;

function KNModule({ nr, title, dek, lang, children, flag }) {
  return (
    <section style={{ margin: "0 44px 26px", border: KN.border.inkBold, borderRadius: KN.r.lg, background: KN.color.paperWarm, boxShadow: KN.shadow.print(), overflow: "hidden" }}>
      <div style={{ padding: "16px 24px 12px", borderBottom: `1.5px dashed ${KN.color.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <div style={{ fontFamily: KN.font.mono, fontSize: 10, letterSpacing: "0.16em", color: NMOSS, fontWeight: 500 }}>NOVEL {nr}</div>
          <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 2 }}>{title}</div>
          <div style={{ fontFamily: KN.font.serif, fontStyle: "italic", fontSize: 14.5, color: KN.color.inkSoft, marginTop: 3 }}>{dek}</div>
        </div>
        {flag && (
          <div style={{ padding: "6px 12px", background: KN.color.ochre, border: KN.border.ink, borderRadius: KN.r.sm, fontFamily: KN.font.mono, fontSize: 10, fontWeight: 500, maxWidth: 240, lineHeight: 1.45, transform: "rotate(1deg)", boxShadow: KN.shadow.printSm() }}>{flag}</div>
        )}
      </div>
      <div style={{ padding: "18px 24px 22px" }}>{children}</div>
    </section>
  );
}

function KNSpec({ title, lines }) {
  return (
    <div style={{ border: `1.5px dashed ${KN.color.rule}`, borderRadius: KN.r.md, padding: "12px 16px", background: KN.color.paper }}>
      <div style={{ fontFamily: KN.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KN.color.inkMute, marginBottom: 8 }}>{title}</div>
      {lines.map((l, i) => (
        <div key={i} style={{ fontFamily: KN.font.mono, fontSize: 10.5, lineHeight: 1.75, color: KN.color.inkSoft }}>· {l}</div>
      ))}
    </div>
  );
}

function KiezNovelDesktop({ lang = "DE" }) {
  const week = [2, 2, 3, 2, 1, 2, 2];
  const gap = [2, 2, null, null, 1, 2, 2];
  const days = lang === "DE" ? ["Di", "Mi", "Do", "Fr", "Sa", "So", "heute"] : ["Tu", "We", "Th", "Fr", "Sa", "Su", "today"];
  const cmp = [
    { l: NT(lang, "Arbeitslosenquote", "Unemployment"), kiez: 8.9, nk: 8.1, be: 5.9 },
    { l: NT(lang, "Kinderarmut (U15)", "Child poverty (U15)"), kiez: 38.2, nk: 35.8, be: 26.5 },
    { l: NT(lang, "Transferleistungen", "Transfer benefits"), kiez: 24.6, nk: 24.0, be: 17.2 },
  ];
  return (
    <div style={{ width: 1280, background: KN.color.paper, color: KN.color.ink, fontFamily: KN.font.display, position: "relative", overflow: "hidden", minHeight: 2540 }} data-screen-label={`Kiez-Daten novel ${lang}`}>
      <style>{KN_fonts}</style>
      <div style={{ ...KN_grain, zIndex: 2 }} />
      <div style={{ padding: "34px 44px 22px" }}>
        <div style={{ fontFamily: KN.font.mono, fontSize: 11, letterSpacing: "0.16em", color: NMOSS }}>KIEZ-DATEN · NOVEL FEATURES · {lang}</div>
        <h1 style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em", margin: "8px 0 4px" }}>
          {NT(lang, "Fünf Module, die messen ", "Five modules that make measuring ")}<span style={{ fontFamily: KN.font.serif, fontStyle: "italic", fontWeight: 400, color: NMOSS }}>{NT(lang, "lebendig machen", "feel alive")}</span>
        </h1>
      </div>

      {/* §00 · Messwert-Logger */}
      <KNModule nr="§00" lang={lang}
        title={NT(lang, "Messwert-Logger", "Reading logger")}
        dek={NT(lang, "Der Wunsch: Luft-Verlauf. Das Problem: BLUME liefert nur den Augenblick.", "The wish: air history. The problem: BLUME serves only the moment.")}
        flag={NT(lang, "BACKEND-ENABLER — neue Cron + Collection, keine neue Infrastruktur", "BACKEND ENABLER — new cron + collection, no new infrastructure")}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 380px", gap: 20, alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: KN.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KN.color.inkMute, marginBottom: 8 }}>{NT(lang, "7-TAGE-VERLAUF · VOLLSTÄNDIG", "7-DAY COURSE · COMPLETE")}</div>
            <svg viewBox="0 0 340 92" style={{ width: "100%" }}>
              {week.map((g, i) => (
                <g key={i}>
                  <rect x={i * 48 + 4} y={70 - g * 20} width={30} height={g * 20} rx={3}
                    fill={g <= 2 ? KN.color.success : g === 3 ? KN.color.warn : KN.color.danger} opacity={i === 6 ? 0.9 : 0.5}
                    stroke={KN.color.ink} strokeWidth="1.2" />
                  <text x={i * 48 + 19} y={86} textAnchor="middle" fontFamily={KN.font.mono} fontSize="9.5" fill={KN.color.inkMute}>{days[i]}</text>
                </g>
              ))}
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: KN.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KN.color.inkMute, marginBottom: 8 }}>{NT(lang, "MIT LÜCKE · EHRLICH GEZEIGT", "WITH A GAP · SHOWN HONESTLY")}</div>
            <svg viewBox="0 0 340 92" style={{ width: "100%" }}>
              {gap.map((g, i) => (
                <g key={i}>
                  {g == null ? (
                    <rect x={i * 48 + 4} y={30} width={30} height={40} rx={3} fill="none" stroke={KN.color.rule} strokeWidth="1.2" strokeDasharray="3 3" />
                  ) : (
                    <rect x={i * 48 + 4} y={70 - g * 20} width={30} height={g * 20} rx={3}
                      fill={g <= 2 ? KN.color.success : KN.color.warn} opacity={i === 6 ? 0.9 : 0.5} stroke={KN.color.ink} strokeWidth="1.2" />
                  )}
                  <text x={i * 48 + 19} y={86} textAnchor="middle" fontFamily={KN.font.mono} fontSize="9.5" fill={KN.color.inkMute}>{days[i]}</text>
                </g>
              ))}
            </svg>
            <div style={{ fontFamily: KN.font.mono, fontSize: 9.5, color: KN.color.inkMute, marginTop: 4 }}>{NT(lang, "„Aufzeichnung pausierte Do–Fr“ — keine Interpolation.", "“Recording paused Th–Fr” — no interpolation.")}</div>
          </div>
          <KNSpec title="CC · SPEC" lines={[
            NT(lang, "Cron alle 30 min → GET lqis/data (mc042)", "cron every 30 min → GET lqis/data (mc042)"),
            NT(lang, "append schillerkiez_air_log {ts, lqi, pm10, no2, o3, co}", "append schillerkiez_air_log {ts, lqi, pm10, no2, o3, co}"),
            NT(lang, "Tages-Rollup (max + Mittel) für 90-Tage-Sicht", "daily rollup (max + mean) for the 90-day view"),
            NT(lang, "Retention: stündlich 90 d · täglich unbegrenzt", "retention: hourly 90 d · daily forever"),
            NT(lang, "Lücken > 6 h ⇒ gestrichelte Leerbalken, nie interpolieren", "gaps > 6 h ⇒ dashed empty bars, never interpolate"),
          ]} />
        </div>
      </KNModule>

      {/* §01 · Zahl der Woche */}
      <KNModule nr="§01" lang={lang}
        title={NT(lang, "Zahl der Woche", "Figure of the week")}
        dek={NT(lang, "Eine Zahl pro Woche, abgeleitet aus Bestandsdaten — teilbar ins Forum.", "One figure per week, derived from existing data — shareable to the forum.")}>
        <div style={{ display: "grid", gridTemplateColumns: "330px 1fr 380px", gap: 20, alignItems: "start" }}>
          <div style={{ border: KN.border.inkBold, borderRadius: KN.r.lg, background: KN.color.paper, boxShadow: KN.shadow.printSm(), padding: "14px 18px", transform: "rotate(-0.6deg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: KN.font.mono, fontSize: 9, letterSpacing: "0.12em", color: KN.color.inkMute }}>
              <span style={{ color: NMOSS, fontWeight: 500 }}>{NT(lang, "ZAHL DER WOCHE", "FIGURE OF THE WEEK")}</span><span>KW 29</span>
            </div>
            <div style={{ fontFamily: KN.font.mono, fontSize: 40, fontWeight: 500, margin: "6px 0 2px" }}>{lang === "DE" ? "37,9 %" : "37.9 %"}</div>
            <div style={{ fontSize: 13, lineHeight: 1.4, color: KN.color.inkSoft }}>{NT(lang, "der Nachbarschaft ist zwischen 27 und 44 — der Kiez bleibt jung.", "of the neighbourhood is between 27 and 44 — the Kiez stays young.")}</div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1.5px dashed ${KN.color.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: KN.font.mono, fontSize: 10.5, color: NMOSS, fontWeight: 500 }}>{NT(lang, "im Forum diskutieren →", "discuss in the forum →")}</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: KN.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KN.color.inkMute, marginBottom: 8 }}>{NT(lang, "TEILEN-FLOW → NEUE DISKUSSION, VORAUSGEFÜLLT", "SHARE FLOW → NEW DISCUSSION, PRE-FILLED")}</div>
            <div style={{ border: KN.border.ink, borderRadius: KN.r.md, background: KN.color.paper, padding: "12px 16px" }}>
              <div style={{ fontFamily: KN.font.mono, fontSize: 9, color: KN.color.inkMute }}>{NT(lang, "NEUES THEMA · DISKUSSION", "NEW TOPIC · DISCUSSION")}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, padding: "8px 12px", border: `1.5px solid ${KN.color.rule}`, borderRadius: KN.r.sm, background: KN.color.paperSoft }}>
                {NT(lang, "Zahl der Woche (KW 29): 37,9 % zwischen 27 und 44", "Figure of the week (wk 29): 37.9 % between 27 and 44")}
              </div>
              <div style={{ fontSize: 12.5, color: KN.color.inkSoft, marginTop: 6, padding: "8px 12px", border: `1.5px solid ${KN.color.rule}`, borderRadius: KN.r.sm, background: KN.color.paperSoft, lineHeight: 1.5 }}>
                {NT(lang, "Quelle: Kiez-Daten · Stand 31.12.2025 · [Link] — Was bedeutet das für uns?", "Source: Kiez data · as of 31 Dec 2025 · [link] — what does it mean for us?")}
              </div>
              <div style={{ fontFamily: KN.font.mono, fontSize: 9.5, color: KN.color.inkMute, marginTop: 8 }}>{NT(lang, "zählt gegen das 5/Tag-Forum-Kontingent · normale KI-Moderation", "counts against the 5/day forum quota · normal AI moderation")}</div>
            </div>
          </div>
          <KNSpec title="CC · SPEC" lines={[
            NT(lang, "Rotation: ISO-Woche seedet Auswahl aus festem Menü ableitbarer Zahlen", "rotation: ISO week seeds a pick from a fixed menu of derivable figures"),
            NT(lang, "Menü: Altersanteil · Δ Bevölkerung · Einpersonen-HH · Vielfalt-Anteil · Luft-Wochenmittel†", "menu: age share · Δ population · single-person hh · diversity share · weekly air mean†"),
            NT(lang, "null neue Schema-Felder — alles aus kiez-stats + air_log", "zero new schema fields — all from kiez-stats + air_log"),
            NT(lang, "Teilen = /topics/create vorausgefüllt, kein Sonder-Endpoint", "share = /topics/create pre-filled, no special endpoint"),
          ]} />
        </div>
      </KNModule>

      {/* §02 · Berlin-Vergleich */}
      <KNModule nr="§02" lang={lang}
        title={NT(lang, "Berlin-Vergleich", "Berlin comparison")}
        dek={NT(lang, "Jeder Indikator gegen Neukölln und Berlin — Zahlen bekommen einen Maßstab.", "Every indicator against Neukölln and Berlin — figures get a yardstick.")}
        flag={NT(lang, "NEUE DATEN NÖTIG — Referenzzeilen (Berlin + Bezirk) im sync-stats-Import. Gleiche AfS/MSS-Quellen, keine neue Infrastruktur.", "NEW DATA NEEDED — reference rows (Berlin + district) in the sync-stats import. Same AfS/MSS sources, no new infrastructure.")}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>
          <div style={{ border: KN.border.ink, borderRadius: KN.r.lg, background: KN.color.paper, padding: "14px 20px" }}>
            <svg viewBox="0 0 700 168" style={{ width: "100%" }}>
              {[0, 10, 20, 30, 40].map((p) => (
                <g key={p}>
                  <line x1={170 + (p / 42) * 500} x2={170 + (p / 42) * 500} y1={4} y2={146} stroke={KN.color.rule} strokeWidth="0.8" />
                  <text x={170 + (p / 42) * 500} y={160} textAnchor="middle" fontFamily={KN.font.mono} fontSize="9.5" fill={KN.color.inkMute}>{p}%</text>
                </g>
              ))}
              {cmp.map((r, i) => {
                const y = i * 46 + 14;
                const x = (v) => 170 + (v / 42) * 500;
                return (
                  <g key={r.l}>
                    <text x={160} y={y + 11} textAnchor="end" fontSize="12.5" fontWeight="600" fontFamily={KN.font.display} fill={KN.color.ink}>{r.l}</text>
                    <line x1={x(r.be)} y1={y + 7} x2={x(r.kiez)} y2={y + 7} stroke={KN.color.inkMute} strokeWidth="1.6" />
                    <circle cx={x(r.be)} cy={y + 7} r="5.5" fill={KN.color.paper} stroke={KN.color.ink} strokeWidth="1.5" />
                    <circle cx={x(r.nk)} cy={y + 7} r="5.5" fill={KN.color.sky} stroke={KN.color.ink} strokeWidth="1.5" />
                    <circle cx={x(r.kiez) + 1.5} cy={y + 8.2} r="6.5" fill={NMOSS} opacity="0.45" />
                    <circle cx={x(r.kiez)} cy={y + 7} r="6.5" fill={NMOSS} stroke={KN.color.ink} strokeWidth="1.6" />
                    <text x={x(r.kiez)} y={y + 28} textAnchor="middle" fontFamily={KN.font.mono} fontSize="9.5" fill={KN.color.ink} fontWeight="500">{NP(r.kiez, lang)}</text>
                  </g>
                );
              })}
            </svg>
            <div style={{ display: "flex", gap: 18, fontFamily: KN.font.mono, fontSize: 9.5, color: KN.color.inkSoft, marginTop: 4 }}>
              <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 999, background: NMOSS, border: `1px solid ${KN.color.ink}`, marginRight: 5 }} />Schillerkiez</span>
              <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 999, background: KN.color.sky, border: `1px solid ${KN.color.ink}`, marginRight: 5 }} />Neukölln</span>
              <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 999, background: KN.color.paper, border: `1px solid ${KN.color.ink}`, marginRight: 5 }} />Berlin</span>
            </div>
          </div>
          <KNSpec title="CC · SPEC" lines={[
            NT(lang, "sync-stats.ts: zusätzlich Berlin-Gesamt + Bezirk Neukölln einlesen", "sync-stats.ts: also import Berlin total + Neukölln district"),
            NT(lang, "neue Collection schillerkiez_reference {scope, period, …}", "new collection schillerkiez_reference {scope, period, …}"),
            NT(lang, "kiez-stats-Response: reference?: {berlin, neukoelln} — additiv", "kiez-stats response: reference?: {berlin, neukoelln} — additive"),
            NT(lang, "Fehlt die Referenz ⇒ Modul verschwindet still (wie Luft)", "reference missing ⇒ module quietly absent (like air)"),
          ]} />
        </div>
      </KNModule>

      {/* §03 · Datenarchiv */}
      <KNModule nr="§03" lang={lang}
        title={NT(lang, "Datenarchiv · „Kiez in Zahlen“", "Data archive · “Kiez in figures”")}
        dek={NT(lang, "Ein A4-Riso-Einseiter zum Ausdrucken — für Hausflur, Kiezfest, Amtstermin.", "A printable A4 riso one-pager — for the hallway, the street fest, the office visit.")}>
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 380px", gap: 20, alignItems: "start" }}>
          {/* A4 preview */}
          <div style={{ width: 280, aspectRatio: "210/297", border: KN.border.inkBold, borderRadius: 4, background: "#f9f4e6", boxShadow: KN.shadow.print(), padding: "18px 20px", position: "relative", overflow: "hidden" }}>
            <div style={{ borderBottom: `2px solid ${KN.color.ink}`, paddingBottom: 6 }}>
              <div style={{ fontFamily: KN.font.mono, fontSize: 6.5, letterSpacing: "0.14em", color: NMOSS }}>KIEZ IN ZAHLEN · {NT(lang, "STAND", "AS OF")} 31.12.2025</div>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" }}>Schillerkiez<span style={{ fontFamily: KN.font.serif, fontStyle: "italic", fontWeight: 400, color: NMOSS }}>, {NT(lang, "gemessen", "measured")}</span></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
              {[["25.900", NT(lang, "Einwohner", "residents")], ["4", NT(lang, "Planungsräume", "planning areas")], ["37,9 %", "27–44"], ["6.410", NT(lang, "1-Pers.-HH", "1-person hh")]].map(([v, l]) => (
                <div key={l} style={{ border: `1px solid ${KN.color.ink}`, borderRadius: 4, padding: "5px 7px" }}>
                  <div style={{ fontFamily: KN.font.mono, fontSize: 12, fontWeight: 500 }}>{v}</div>
                  <div style={{ fontFamily: KN.font.mono, fontSize: 6, color: KN.color.inkMute, letterSpacing: "0.08em", textTransform: "uppercase" }}>{l}</div>
                </div>
              ))}
            </div>
            <svg viewBox="0 0 240 92" style={{ width: "100%", marginTop: 8 }}>
              {[38, 15.1, 12.9, 11.8, 8.7, 7.3, 6.4].map((p, i) => (
                <NBar key={i} x={0} y={i * 13} w={(p / 40) * 230} h={8} seed={i + 3} color={NMOSS} opacity={0.5} />
              ))}
            </svg>
            <div style={{ position: "absolute", bottom: 14, left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ fontFamily: KN.font.mono, fontSize: 5.5, color: KN.color.inkMute, lineHeight: 1.6 }}>AfS · MSS · BLUME<br />mahalle.berlin/schillerkiez</div>
              <svg viewBox="0 0 40 40" width="34" height="34">
                {Array.from({ length: 25 }, (_, i) => {
                  const r = (Math.sin(i * 12.9898) * 43758.5453) % 1;
                  return Math.abs(r) > 0.45 ? <rect key={i} x={(i % 5) * 8} y={Math.floor(i / 5) * 8} width="7" height="7" fill={KN.color.ink} /> : null;
                })}
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: KN.color.inkSoft, maxWidth: 420 }}>
            <p style={{ margin: 0 }}>
              {NT(lang,
                "Gleiche Mechanik wie der Steckbrief aus dem Profil-Pass: eine Print-CSS-Route, kein PDF-Backend. Zwei Riso-Farben (Tinte + Moos), die Mix-Handschrift der Charts überlebt den Druck, QR führt zur Live-Seite.",
                "Same mechanics as the Steckbrief from the profile pass: a print-CSS route, no PDF backend. Two riso colors (ink + moss), the mix chart hand survives print, QR links to the live page.")}
            </p>
            <p style={{ margin: "12px 0 0" }}>
              {NT(lang,
                "Inhalt ist kuratiert, nicht vollständig: Kopfzahlen, Altersverteilung, drei Sozialindikatoren, Luft-Gesamtnote — was auf ein Pinnbrett gehört.",
                "Content is curated, not complete: headline figures, age distribution, three social indicators, overall air grade — what belongs on a pinboard.")}
            </p>
          </div>
          <KNSpec title="CC · SPEC" lines={[
            NT(lang, "Route /schillerkiez/druck · reine Print-CSS (@page A4)", "route /schillerkiez/druck · pure print CSS (@page A4)"),
            NT(lang, "Einstieg: ⎙-Button im Seitenfuß (desktop + mobil)", "entry: ⎙ button in the page footer (desktop + mobile)"),
            NT(lang, "QR klein + lokal generiert (wie Steckbrief) — kein Dienst", "QR small + locally generated (like Steckbrief) — no service"),
            NT(lang, "Stand-Datum ist Pflicht auf dem Blatt — Papier altert", "the as-of date is mandatory on the sheet — paper ages"),
          ]} />
        </div>
      </KNModule>

      {/* §04 · Anwohner-Kontext */}
      <KNModule nr="§04" lang={lang}
        title={NT(lang, "Anwohner-Kontext", "Neighbour context")}
        dek={NT(lang, "Wo der Kiez über eine Zahl spricht, zeigt die Zahl aufs Gespräch — wie die Kurier-Heat, asymmetrisch.", "Where the Kiez talks about a figure, the figure points to the talk — like Kurier heat, asymmetric.")}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: KN.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KN.color.inkMute, marginBottom: 8 }}>{NT(lang, "ANATOMIE · INDIKATORZEILE MIT KONTEXT", "ANATOMY · INDICATOR ROW WITH CONTEXT")}</div>
            <div style={{ border: KN.border.ink, borderRadius: KN.r.md, background: KN.color.paper, padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 14.5, fontWeight: 700 }}>{NT(lang, "Kinderarmut (U15)", "Child poverty (U15)")}</span>
                <span style={{ fontFamily: KN.font.mono, fontSize: 16, fontWeight: 500 }}>{lang === "DE" ? "38,2 %" : "38.2 %"}</span>
              </div>
              <svg viewBox="0 0 560 18" style={{ width: "100%", marginTop: 6 }}>
                <NBar x={1} y={1} w={(38.2 / 50) * 550} h={13} seed={5} color={KN.color.wine} opacity={0.5} />
              </svg>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {[
                  NT(lang, "Nachbarschaftshilfe für Familien organisieren?", "Organising family support in the Kiez?"),
                  NT(lang, "Mittagstisch am Herrfurthplatz — wer macht mit?", "Community lunch at Herrfurthplatz — who's in?"),
                  NT(lang, "Schulweg-Paten gesucht", "School-run buddies wanted"),
                ].map((t) => (
                  <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", border: KN.border.ink, borderRadius: KN.r.pill, fontSize: 11.5, fontWeight: 600, background: KN.color.paperWarm }}>
                    <span style={{ fontFamily: KN.font.mono, fontSize: 10, color: KN.color.ochre }}>♨</span>{t}
                  </span>
                ))}
              </div>
              <div style={{ fontFamily: KN.font.mono, fontSize: 9.5, color: KN.color.inkMute, marginTop: 8 }}>
                {NT(lang, "3 Gespräche im Forum · Chips öffnen den Thread", "3 forum threads · chips open the thread")}
              </div>
            </div>
          </div>
          <KNSpec title="CC · SPEC" lines={[
            NT(lang, "Asymmetrie-Regel wie Kurier-Heat: Dashboard kennt Forum, Forum kennt Dashboard NICHT", "asymmetry rule like Kurier heat: dashboard knows forum, forum does NOT know dashboard"),
            NT(lang, "Zuordnung: kuratierte Stichwortliste je Indikator, täglich berechnet, 24 h Cache", "matching: curated keyword list per indicator, computed daily, 24 h cache"),
            NT(lang, "nur Threads > 1 h alt (Spam-Schutz, wie Heat)", "only threads > 1 h old (spam guard, like heat)"),
            NT(lang, "0 Treffer ⇒ Zeile ohne Chips — nie leere Hülsen", "0 matches ⇒ row without chips — never empty shells"),
          ]} />
        </div>
      </KNModule>
    </div>
  );
}

Object.assign(window, { KiezNovelDesktop });

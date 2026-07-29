/* global React */

// ══════════════════════════════════════════════════════════
//  KIEZ-DATEN PASS · state matrix
//  7 states in 3 groups, grounded in KiezDashboard.svelte +
//  kiez-air.ts real behaviour:
//  A · Anzeige: 01 laden · 02 Fehler · 03 leer
//  B · Quellen: 04 Station still · 05 PLR ohne Sozialdaten ·
//               06 Logger-Lücke
//  C · Frische: 07 Stand veraltet
// ══════════════════════════════════════════════════════════

const { kiosk: KS, paperGrainStyle: KS_grain, kioskFonts: KS_fonts } = window;
const { KZ_T: ST, KZ_MOSS: SMOSS, KZInstrumentStrip: SStrip } = window;

function KSTile({ nr, group, title, note, lang, children, wide }) {
  return (
    <div style={{ border: KS.border.ink, borderRadius: KS.r.lg, background: KS.color.paperWarm, overflow: "hidden", gridColumn: wide ? "span 2" : "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 16px", borderBottom: `1.5px dashed ${KS.color.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: KS.font.mono, fontSize: 10, letterSpacing: "0.12em", color: SMOSS, fontWeight: 500 }}>§{nr}</span>
        <span style={{ fontSize: 14.5, fontWeight: 800 }}>{title}</span>
        <span style={{ fontFamily: KS.font.mono, fontSize: 9, letterSpacing: "0.1em", color: KS.color.inkMute }}>{group}</span>
      </div>
      <div style={{ padding: 16, flex: 1 }}>{children}</div>
      {note && (
        <div style={{ padding: "9px 16px", borderTop: `1.5px dashed ${KS.color.rule}`, fontFamily: KS.font.mono, fontSize: 9.5, lineHeight: 1.55, color: KS.color.inkMute }}>{note}</div>
      )}
    </div>
  );
}

function KSSkelBar({ w = "100%", h = 12, style }) {
  return <div className="kz-skel" style={{ width: w, height: h, borderRadius: 4, background: KS.color.paperSoft, ...style }} />;
}

const KS_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .kz-skel { background: linear-gradient(90deg, #ebe1c7 25%, #e2d7bd 50%, #ebe1c7 75%); background-size: 400px 100%; animation: kzSweep 1.4s linear infinite; }
  @keyframes kzSweep { 0% { background-position: -200px 0; } 100% { background-position: 400px 0; } }
  .kz-live-dot { animation: kzPulse 1.8s ease-in-out infinite; }
  @keyframes kzPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
}
`;

function KiezStatesDesktop({ lang = "DE" }) {
  return (
    <div style={{ width: 1280, background: KS.color.paper, color: KS.color.ink, fontFamily: KS.font.display, position: "relative", overflow: "hidden", minHeight: 1560 }} data-screen-label={`Kiez-Daten states ${lang}`}>
      <style>{KS_fonts}{KS_CSS}</style>
      <div style={{ ...KS_grain, zIndex: 2 }} />
      <div style={{ padding: "34px 44px 20px" }}>
        <div style={{ fontFamily: KS.font.mono, fontSize: 11, letterSpacing: "0.16em", color: SMOSS }}>KIEZ-DATEN · STATE MATRIX · {lang}</div>
        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", margin: "8px 0 4px" }}>
          {ST(lang, "Sieben Zustände, ", "Seven states, ")}<span style={{ fontFamily: KS.font.serif, fontStyle: "italic", fontWeight: 400, color: SMOSS }}>{ST(lang, "ehrlich gemessen", "honestly measured")}</span>
        </h1>
        <div style={{ fontFamily: KS.font.mono, fontSize: 10.5, color: KS.color.inkMute }}>
          A · {ST(lang, "ANZEIGE", "DISPLAY")} (01–03) &nbsp;·&nbsp; B · {ST(lang, "QUELLEN", "SOURCES")} (04–06) &nbsp;·&nbsp; C · {ST(lang, "FRISCHE", "FRESHNESS")} (07)
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, padding: "0 44px 40px" }}>
        {/* 01 laden */}
        <KSTile nr="01" group={`A · ${ST(lang, "ANZEIGE", "DISPLAY")}`} title={ST(lang, "Lädt", "Loading")} lang={lang}
          note={ST(lang, "Skelett spiegelt das echte Layout: Instrumentenleiste + Kanäle. Ersetzt die 6 Pulskarten des Bestands. Kein Spinner, kein Emoji.", "Skeleton mirrors the real layout: instrument strip + channels. Replaces legacy's 6 pulse cards. No spinner, no emoji.")}>
          <div style={{ background: KS.color.ink, borderRadius: KS.r.md, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
            <KSSkelBar w={140} h={14} style={{ opacity: 0.25 }} />
            {[0, 1, 2, 3].map((i) => <KSSkelBar key={i} w={44} h={30} style={{ opacity: 0.25 }} />)}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <KSSkelBar w={180} h={70} /><KSSkelBar h={70} />
          </div>
          <KSSkelBar h={90} style={{ marginTop: 10 }} />
        </KSTile>

        {/* 02 Fehler */}
        <KSTile nr="02" group={`A · ${ST(lang, "ANZEIGE", "DISPLAY")}`} title={ST(lang, "Fehler", "Error")} lang={lang}
          note={ST(lang, "kiez-stats 500 ⇒ ganzseitiger Fehler mit Retry (wie Bestand, Kiosk-Ton). Luftleiste bleibt, falls SIE geladen hat — unabhängige Quellen.", "kiez-stats 500 ⇒ full-page error with retry (as legacy, Kiosk voice). Air strip stays if IT loaded — independent sources.")}>
          <div style={{ border: `1.5px dashed ${KS.color.danger}`, borderRadius: KS.r.md, padding: "22px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: KS.font.serif, fontStyle: "italic", fontSize: 17, color: KS.color.inkSoft }}>
              {ST(lang, "Die Zahlen lassen sich gerade nicht abholen.", "The figures can't be fetched right now.")}
            </div>
            <div style={{ fontFamily: KS.font.mono, fontSize: 10, color: KS.color.inkMute, marginTop: 6 }}>HTTP 500 · /api/kiez-stats</div>
            <div style={{ display: "inline-block", marginTop: 12, padding: "9px 20px", background: KS.color.ink, color: KS.color.paper, borderRadius: KS.r.pill, fontSize: 13, fontWeight: 700, boxShadow: KS.shadow.printSm(SMOSS) }}>
              {ST(lang, "erneut versuchen", "try again")}
            </div>
          </div>
        </KSTile>

        {/* 03 leer */}
        <KSTile nr="03" group={`A · ${ST(lang, "ANZEIGE", "DISPLAY")}`} title={ST(lang, "Noch keine Daten", "No data yet")} lang={lang}
          note={ST(lang, "demographics UND social null (frische DB, Sync noch nie gelaufen). Nennt den Mechanismus statt zu schweigen.", "demographics AND social null (fresh DB, sync never ran). Names the mechanism instead of going silent.")}>
          <div style={{ border: `1.5px dashed ${KS.color.rule}`, borderRadius: KS.r.md, padding: "24px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: KS.font.serif, fontStyle: "italic", fontSize: 17, color: KS.color.inkSoft }}>
              {ST(lang, "Das Archiv ist noch leer.", "The archive is still empty.")}
            </div>
            <div style={{ fontSize: 12.5, color: KS.color.inkMute, marginTop: 8, lineHeight: 1.5 }}>
              {ST(lang, "Der AfS-Import läuft zweimal im Jahr (März + September). Danach stehen hier die ersten Zahlen.", "The AfS import runs twice a year (March + September). The first figures appear after that.")}
            </div>
          </div>
        </KSTile>

        {/* 04 Station still */}
        <KSTile nr="04" group={`B · ${ST(lang, "QUELLEN", "SOURCES")}`} title={ST(lang, "Station meldet sich nicht", "Station not reporting")} lang={lang}
          note={ST(lang, "Bestand: Luft verschwindet WORTLOS. Neu: Leiste bleibt, sagt es, zeigt den letzten geloggten Wert†. Rest der Seite unberührt.", "Legacy: air vanishes SILENTLY. New: strip stays, says so, shows the last logged reading†. Rest of page untouched.")}>
          <div style={{ borderRadius: KS.r.md, overflow: "hidden" }}>
            <SStrip lang={lang} compact variant="off" />
          </div>
        </KSTile>

        {/* 05 PLR ohne Sozialdaten */}
        <KSTile nr="05" group={`B · ${ST(lang, "QUELLEN", "SOURCES")}`} title={ST(lang, "PLR ohne Sozialdaten", "PLR without social data")} lang={lang}
          note={ST(lang, "MSS liefert nicht für jeden PLR jede Periode. Kanal 04 zeigt die Karte trotzdem — mit ehrlicher Leerstelle, kein 0%-Balken.", "MSS doesn't cover every PLR every period. Channel 04 keeps the frame — honest blank, never a 0% bar.")}>
          <div style={{ fontFamily: KS.font.mono, fontSize: 9.5, letterSpacing: "0.12em", color: KS.color.inkMute, marginBottom: 6 }}>{ST(lang, "KANAL", "CHANNEL")} 04 · WARTHEPLATZ</div>
          <div style={{ border: `1.5px dashed ${KS.color.rule}`, borderRadius: KS.r.md, padding: "20px 18px", textAlign: "center", fontFamily: KS.font.serif, fontStyle: "italic", fontSize: 15, color: KS.color.inkMute }}>
            {ST(lang, "Für diesen Planungsraum liegen keine Sozialdaten vor.", "No social data available for this planning area.")}
          </div>
        </KSTile>

        {/* 06 Logger-Lücke */}
        <KSTile nr="06" group={`B · ${ST(lang, "QUELLEN", "SOURCES")}`} title={ST(lang, "Logger-Lücke", "Logger gap")} lang={lang}
          note={ST(lang, "7-Tage-Verlauf mit Ausfall: gestrichelte Leerbalken, nie Interpolation. Beschriftung nennt die Pause. (Bindet an Novel §00.)", "7-day course with an outage: dashed empty bars, never interpolation. Caption names the pause. (Ties to novel §00.)")}>
          <svg viewBox="0 0 340 86" style={{ width: "100%" }}>
            {[2, 2, null, null, 1, 2, 2].map((g, i) => (
              <g key={i}>
                {g == null
                  ? <rect x={i * 48 + 4} y={26} width={30} height={38} rx={3} fill="none" stroke={KS.color.rule} strokeWidth="1.2" strokeDasharray="3 3" />
                  : <rect x={i * 48 + 4} y={64 - g * 19} width={30} height={g * 19} rx={3} fill={KS.color.success} opacity={i === 6 ? 0.9 : 0.5} stroke={KS.color.ink} strokeWidth="1.2" />}
                <text x={i * 48 + 19} y={80} textAnchor="middle" fontFamily={KS.font.mono} fontSize="9" fill={KS.color.inkMute}>{(lang === "DE" ? ["Di", "Mi", "Do", "Fr", "Sa", "So", "heute"] : ["Tu", "We", "Th", "Fr", "Sa", "Su", "today"])[i]}</text>
              </g>
            ))}
          </svg>
          <div style={{ fontFamily: KS.font.mono, fontSize: 10, color: KS.color.inkMute, marginTop: 6 }}>
            {ST(lang, "Aufzeichnung pausierte Do–Fr (Logger-Ausfall).", "Recording paused Th–Fr (logger outage).")}
          </div>
        </KSTile>

        {/* 07 Stand veraltet */}
        <KSTile nr="07" group={`C · ${ST(lang, "FRISCHE", "FRESHNESS")}`} title={ST(lang, "Stand veraltet", "Data stale")} lang={lang} wide
          note={ST(lang, "lastUpdated > 8 Monate ⇒ der nächste Halbjahres-Sync ist überfällig (Action fehlgeschlagen o. Secret abgelaufen). Warn-Zeile unter dem Titel, Seite bleibt voll nutzbar — Papier altert, aber es lügt nicht über sein Datum.", "lastUpdated > 8 months ⇒ the next half-yearly sync is overdue (action failed or secret expired). Warn line under the title, page fully usable — paper ages, but it never lies about its date.")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, border: `1.5px solid ${KS.color.warn}`, background: "#f5e7c8", borderRadius: KS.r.md, padding: "12px 18px" }}>
            <span style={{ fontFamily: KS.font.mono, fontSize: 16, color: KS.color.warn }}>⚠</span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                {ST(lang, "Stand 30.06.2025 — der Herbst-Import fehlt.", "As of 30 Jun 2025 — the autumn import is missing.")}
              </div>
              <div style={{ fontFamily: KS.font.mono, fontSize: 10, color: KS.color.inkMute, marginTop: 2 }}>
                {ST(lang, "Erwartet: Sync im September. Admin sieht Details im Aktions-Log.", "Expected: September sync. Admin sees details in the action log.")}
              </div>
            </div>
          </div>
        </KSTile>
      </div>
    </div>
  );
}

// ── Mobile stack ──────────────────────────────────────────
function KiezStatesMobile({ lang = "DE" }) {
  const tiles = [
    { nr: "01", t: ST(lang, "Lädt", "Loading") },
    { nr: "02", t: ST(lang, "Fehler", "Error") },
    { nr: "04", t: ST(lang, "Station still", "Station silent") },
    { nr: "06", t: ST(lang, "Logger-Lücke", "Logger gap") },
  ];
  return (
    <div style={{ width: 390, background: KS.color.paper, color: KS.color.ink, fontFamily: KS.font.display, position: "relative", overflow: "hidden", minHeight: 1210, padding: "0 0 24px" }} data-screen-label={`Kiez-Daten states mobile ${lang}`}>
      <style>{KS_fonts}{KS_CSS}</style>
      <div style={{ ...KS_grain, zIndex: 2 }} />
      <div style={{ padding: "24px 18px 6px" }}>
        <div style={{ fontFamily: KS.font.mono, fontSize: 10, letterSpacing: "0.16em", color: SMOSS }}>KIEZ-DATEN · STATES · MOBILE</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "6px 0 0" }}>
          {ST(lang, "Kernzustände", "Key states")} <span style={{ fontFamily: KS.font.serif, fontStyle: "italic", fontWeight: 400, color: SMOSS }}>390px</span>
        </h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "12px 18px 0" }}>
        {tiles.map((tile) => (
          <div key={tile.nr} style={{ border: KS.border.ink, borderRadius: KS.r.lg, background: KS.color.paperWarm, overflow: "hidden" }}>
            <div style={{ padding: "8px 14px", borderBottom: `1.5px dashed ${KS.color.rule}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: KS.font.mono, fontSize: 9.5, color: SMOSS, fontWeight: 500 }}>§{tile.nr}</span>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{tile.t}</span>
            </div>
            <div style={{ padding: 14 }}>
              {tile.nr === "01" && (
                <React.Fragment>
                  <div style={{ background: KS.color.ink, borderRadius: KS.r.sm, padding: "8px 10px", display: "flex", gap: 8 }}>
                    <KSSkelBar w={90} h={12} style={{ opacity: 0.25 }} />
                    {[0, 1].map((i) => <KSSkelBar key={i} w={34} h={24} style={{ opacity: 0.25 }} />)}
                  </div>
                  <KSSkelBar h={56} style={{ marginTop: 10 }} />
                  <KSSkelBar h={56} style={{ marginTop: 8 }} />
                </React.Fragment>
              )}
              {tile.nr === "02" && (
                <div style={{ border: `1.5px dashed ${KS.color.danger}`, borderRadius: KS.r.sm, padding: "16px 12px", textAlign: "center" }}>
                  <div style={{ fontFamily: KS.font.serif, fontStyle: "italic", fontSize: 14, color: KS.color.inkSoft }}>{ST(lang, "Die Zahlen lassen sich gerade nicht abholen.", "The figures can't be fetched right now.")}</div>
                  <div style={{ display: "inline-block", marginTop: 10, padding: "10px 18px", background: KS.color.ink, color: KS.color.paper, borderRadius: KS.r.pill, fontSize: 12.5, fontWeight: 700, minHeight: 44, boxSizing: "border-box" }}>{ST(lang, "erneut versuchen", "try again")}</div>
                </div>
              )}
              {tile.nr === "04" && <div style={{ borderRadius: KS.r.sm, overflow: "hidden" }}><SStrip lang={lang} compact variant="off" /></div>}
              {tile.nr === "06" && (
                <svg viewBox="0 0 340 80" style={{ width: "100%" }}>
                  {[2, 2, null, null, 1, 2, 2].map((g, i) => (
                    <g key={i}>
                      {g == null
                        ? <rect x={i * 48 + 4} y={22} width={30} height={36} rx={3} fill="none" stroke={KS.color.rule} strokeWidth="1.2" strokeDasharray="3 3" />
                        : <rect x={i * 48 + 4} y={58 - g * 18} width={30} height={g * 18} rx={3} fill={KS.color.success} opacity={i === 6 ? 0.9 : 0.5} stroke={KS.color.ink} strokeWidth="1.2" />}
                      <text x={i * 48 + 19} y={74} textAnchor="middle" fontFamily={KS.font.mono} fontSize="8.5" fill={KS.color.inkMute}>{(lang === "DE" ? ["Di", "Mi", "Do", "Fr", "Sa", "So", "heute"] : ["Tu", "We", "Th", "Fr", "Sa", "Su", "today"])[i]}</text>
                    </g>
                  ))}
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { KiezStatesDesktop, KiezStatesMobile });

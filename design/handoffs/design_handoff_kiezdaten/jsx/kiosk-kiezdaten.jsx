/* global React */

// ══════════════════════════════════════════════════════════
//  KIEZ-DATEN PASS · Editorial Kiosk · Batch 3 (LAST surface)
//  Metaphor: MESSSTATION · chart hand: MISCHUNG (precise axes,
//  hand-printed marks) · carved accent: MOSS.
//  Route /schillerkiez · nav „Kiez“. Broadsheet flow replaces
//  the carousels; a global PLR selector (map + chips) drives
//  every Kanal. Seeds mirror KiezStatsResponse + AirQuality-
//  Response from src/types/kiezStats.ts.
// ══════════════════════════════════════════════════════════

const { kiosk: KZ, paperGrainStyle: KZ_grain, kioskFonts: KZ_fonts, KioskNav: KZNav, KioskAnnotate: KZNote, KDMap: KZMap, kdWobLine: kzWobLine, kdWobRect: kzWobRect } = window;
const KZ_MOSS = KZ.color.moss;
const KZ_GRADE = (g) => g <= 2 ? KZ.color.success : g === 3 ? KZ.color.warn : KZ.color.danger;
const KZ_PLR_COLORS = { all: KZ_MOSS, "08100102": KZ.color.teal, "08100103": KZ.color.wine, "08100104": KZ.color.ochre, "08100105": KZ.color.plum };

// ── Seeds ─────────────────────────────────────────────────
const KZ_DATA = {
  stand: "31.12.2025", period: "2025 H2", quelle: "AfS Berlin-Brandenburg · MSS",
  areas: [
    { code: "all", name: { DE: "Gesamt · Schillerkiez", EN: "Total · Schillerkiez" }, short: "Gesamt",
      pop: 25900, m: 13120, f: 12780, einp: 6410, delta: "+180",
      age: [6.4, 11.8, 15.1, 37.9, 12.9, 8.7, 7.3],
      mig: { a: 44.6, mh: 21.8, o: 33.6 },
      social: { alq: 8.9, ka: 38.2, tr: 24.6, status: "niedrig", dyn: "+1" },
      trend: [25480, 25610, 25540, 25720, 25900] },
    { code: "08100102", name: { DE: "Schillerpromenade Nord", EN: "Schillerpromenade Nord" }, short: "Schiller. N",
      pop: 8200, m: 4180, f: 4020, einp: 2050, delta: "+60",
      age: [6.8, 12.2, 15.6, 36.8, 12.6, 8.6, 7.4],
      mig: { a: 46.2, mh: 21.4, o: 32.4 },
      social: { alq: 9.4, ka: 41.0, tr: 26.8, status: "niedrig", dyn: "stabil" },
      trend: [8100, 8130, 8110, 8160, 8200] },
    { code: "08100103", name: { DE: "Schillerpromenade Süd", EN: "Schillerpromenade Süd" }, short: "Schiller. S",
      pop: 7400, m: 3740, f: 3660, einp: 1830, delta: "+40",
      age: [6.2, 11.5, 15.3, 38.4, 13.0, 8.5, 7.1],
      mig: { a: 45.1, mh: 22.0, o: 32.9 },
      social: { alq: 8.7, ka: 37.5, tr: 24.1, status: "niedrig", dyn: "+1" },
      trend: [7290, 7330, 7310, 7360, 7400] },
    { code: "08100104", name: { DE: "Wartheplatz", EN: "Wartheplatz" }, short: "Warthepl.",
      pop: 5600, m: 2840, f: 2760, einp: 1380, delta: "+50",
      age: [6.1, 11.4, 14.6, 38.9, 13.2, 8.9, 6.9],
      mig: { a: 42.8, mh: 21.9, o: 35.3 },
      social: { alq: 8.2, ka: 35.4, tr: 22.9, status: "mittel", dyn: "+2" },
      trend: [5480, 5520, 5510, 5550, 5600] },
    { code: "08100105", name: { DE: "Silbersteinstraße", EN: "Silbersteinstraße" }, short: "Silberst.",
      pop: 4700, m: 2360, f: 2340, einp: 1150, delta: "+30",
      age: [6.3, 11.9, 14.7, 37.4, 12.8, 9.0, 7.9],
      mig: { a: 43.5, mh: 22.1, o: 34.4 },
      social: { alq: 9.2, ka: 39.1, tr: 24.7, status: "niedrig", dyn: "stabil" },
      trend: [4610, 4630, 4610, 4650, 4700] },
  ],
  ageLabels: ["0–5", "6–17", "18–26", "27–44", "45–54", "55–64", "65+"],
  trendLabels: ["H2 '21", "H2 '22", "H2 '23", "H2 '24", "H2 '25"],
  divTrend: [
    { t: "H2 '21", a: 42.1, mh: 22.5, o: 35.4 }, { t: "H2 '22", a: 42.9, mh: 22.3, o: 34.8 },
    { t: "H2 '23", a: 43.6, mh: 22.1, o: 34.3 }, { t: "H2 '24", a: 44.2, mh: 21.9, o: 33.9 },
    { t: "H2 '25", a: 44.6, mh: 21.8, o: 33.6 },
  ],
  // ALQ, merged virtual series across the LOR-2021 boundary (mergeSocialPlrTrend)
  socTrend: {
    years: ["'13", "'15", "'17", "'19", "'21", "'23"],
    gesamt: { alq: [12.8, 11.9, 10.6, 9.8, 9.3, 8.9], ka: [44.2, 43.0, 41.5, 40.1, 39.0, 38.2], tr: [31.5, 29.8, 28.0, 26.4, 25.3, 24.6] },
    series: [
      { name: "Schillerpromenade", alq: [13.4, 12.4, 11.0, 10.1, 9.6, 9.1] },
      { name: "Silbersteinstraße", alq: [12.2, 11.4, 10.2, 9.5, 9.0, 8.7] },
    ],
    reformAfter: 4, // index of "'21" — boundary marker sits before it
  },
  air: {
    lqi: 2, label: { DE: "gut", EN: "good" }, at: { DE: "13.07. · 11:00", EN: "13 Jul · 11:00" },
    pollutants: [
      { n: "PM10", g: 2, l: { DE: "gut", EN: "good" } },
      { n: "NO₂", g: 2, l: { DE: "gut", EN: "good" } },
      { n: "O₃", g: 3, l: { DE: "mäßig", EN: "moderate" } },
      { n: "CO", g: 1, l: { DE: "sehr gut", EN: "very good" } },
    ],
    week: [2, 2, 3, 2, 1, 2, 2],
    weekDays: { DE: ["Di", "Mi", "Do", "Fr", "Sa", "So", "heute"], EN: ["Tu", "We", "Th", "Fr", "Sa", "Su", "today"] },
  },
  zdw: {
    kw: "KW 29",
    value: "37,9 %",
    text: { DE: "der Nachbarschaft ist zwischen 27 und 44 — der Kiez bleibt jung.", EN: "of the neighbourhood is between 27 and 44 — the Kiez stays young." },
  },
};
const KZ_T = (lang, de, en) => (lang === "DE" ? de : en);
const KZ_NUM = (n, lang) => n.toLocaleString(lang === "DE" ? "de-DE" : "en-GB");
const KZ_PCT = (n, lang) => (lang === "DE" ? String(n).replace(".", ",") : String(n)) + " %";

// ── Mix-hand chart primitives ─────────────────────────────
// Precise axes carry the truth; wobbly riso marks carry the print.
function KZBar({ x, y, w, h, seed, color = KZ_MOSS, opacity = 0.42 }) {
  return (
    <g>
      <path d={kzWobRect(x + 2, y + 1.6, w, h, seed)} fill={color} opacity={opacity} />
      <path d={kzWobRect(x, y, w, h, seed + 7)} fill="none" stroke={KZ.color.ink} strokeWidth="1.5" />
    </g>
  );
}
function KZLine({ pts, color = KZ_MOSS, seed = 3, width = 2.2, dots = true }) {
  return (
    <g>
      {pts.slice(0, -1).map((p, i) => (
        <polyline key={i} points={kzWobLine(p[0], p[1], pts[i + 1][0], pts[i + 1][1], seed + i, 1.4, 5)} fill="none" stroke={color} strokeWidth={width} />
      ))}
      {dots && pts.map((p, i) => (
        <g key={"d" + i}>
          <circle cx={p[0] + 1.5} cy={p[1] + 1.2} r="3.4" fill={color} opacity="0.45" />
          <circle cx={p[0]} cy={p[1]} r="3.4" fill={KZ.color.paperWarm} stroke={KZ.color.ink} strokeWidth="1.4" />
        </g>
      ))}
    </g>
  );
}
function KZGrid({ x1, x2, rows, top, step }) {
  return (
    <g>
      {Array.from({ length: rows }, (_, i) => (
        <line key={i} x1={x1} x2={x2} y1={top + i * step} y2={top + i * step} stroke={KZ.color.rule} strokeWidth="0.8" />
      ))}
    </g>
  );
}

// ── Chrome ────────────────────────────────────────────────
function KZInstrumentStrip({ lang = "DE", compact = false, variant = "live" }) {
  const A = KZ_DATA.air;
  const off = variant === "off";
  return (
    <div style={{ background: KZ.color.ink, color: KZ.color.paper, padding: compact ? "12px 18px" : "14px 36px", display: "flex", alignItems: "center", gap: compact ? 14 : 24, flexWrap: compact ? "wrap" : "nowrap" }}>
      <div style={{ minWidth: compact ? "100%" : 300 }}>
        <div style={{ fontFamily: KZ.font.mono, fontSize: 10, letterSpacing: "0.18em", color: KZ.color.ochre, display: "flex", alignItems: "center", gap: 7 }}>
          <span className="kz-live-dot" style={{ width: 7, height: 7, borderRadius: 999, background: off ? KZ.color.inkMute : KZ.color.success }} />
          {KZ_T(lang, "MESSSTATION NANSENSTRASSE · MC042", "MEASURING STATION NANSENSTRASSE · MC042")} · {off ? KZ_T(lang, "KEIN SIGNAL", "NO SIGNAL") : "LIVE"}
        </div>
        {off ? (
          <div style={{ fontSize: compact ? 17 : 22, fontWeight: 800, marginTop: 2, opacity: 0.75 }}>
            {KZ_T(lang, "Die Station meldet sich nicht.", "The station isn't reporting.")}
          </div>
        ) : (
          <div style={{ fontSize: compact ? 18 : 24, fontWeight: 800, marginTop: 2 }}>
            {KZ_T(lang, "Luftgüte", "Air quality")}: <span style={{ color: "#9fd08a" }}>{A.lqi} · {A.label[lang]}</span>
            <span style={{ fontFamily: KZ.font.mono, fontSize: 10, fontWeight: 400, opacity: 0.6, marginLeft: 12 }}>{A.at[lang]}</span>
          </div>
        )}
      </div>
      {!off && (
        <div style={{ display: "flex", gap: 8 }}>
          {A.pollutants.map((p) => (
            <div key={p.n} style={{ border: "1.5px solid rgba(243,234,216,0.3)", borderRadius: KZ.r.md, padding: compact ? "5px 9px" : "7px 13px", textAlign: "center", minWidth: compact ? 58 : 74 }}>
              <div style={{ fontFamily: KZ.font.mono, fontSize: 9.5, opacity: 0.65 }}>{p.n}</div>
              <div style={{ fontFamily: KZ.font.mono, fontSize: compact ? 16 : 20, fontWeight: 500, color: p.g <= 2 ? "#9fd08a" : p.g === 3 ? "#ecc76e" : "#e08a8a" }}>{p.g}</div>
              {!compact && <div style={{ fontFamily: KZ.font.mono, fontSize: 8.5, opacity: 0.7 }}>{p.l[lang]}</div>}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginLeft: compact ? 0 : "auto", textAlign: "right" }}>
        {off ? (
          <div style={{ fontFamily: KZ.font.mono, fontSize: 10, opacity: 0.65, lineHeight: 1.6, textAlign: "right" }}>
            {KZ_T(lang, "Letzter Wert: gestern 23:30 · LQI 2", "Last reading: yesterday 23:30 · LQI 2")}<br />
            {KZ_T(lang, "BLUME antwortet nicht — Rest der Seite unberührt.", "BLUME not responding — rest of the page unaffected.")}
          </div>
        ) : (
          <React.Fragment>
            <svg viewBox="0 0 170 40" width={compact ? 130 : 170} height={compact ? 31 : 40}>
              {A.week.map((g, i) => (
                <rect key={i} x={i * 24} y={40 - g * 11} width={16} height={g * 11} rx={2}
                  fill={g <= 2 ? "#9fd08a" : g === 3 ? "#ecc76e" : "#e08a8a"} opacity={i === 6 ? 1 : 0.55} />
              ))}
            </svg>
            <div style={{ fontFamily: KZ.font.mono, fontSize: 8.5, opacity: 0.6, letterSpacing: "0.1em" }}>
              {KZ_T(lang, "7-TAGE-VERLAUF · NEU†", "7-DAY COURSE · NEW†")}
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

function KZTitle({ lang = "DE" }) {
  const Z = KZ_DATA.zdw;
  return (
    <section style={{ padding: "24px 36px 20px", display: "grid", gridTemplateColumns: "1fr 330px", gap: 28, alignItems: "start", borderBottom: `1px dashed ${KZ.color.rule}` }}>
      <div>
        <div style={{ fontFamily: KZ.font.mono, fontSize: 11, color: KZ_MOSS, letterSpacing: "0.14em" }}>
          KIEZ-DATEN · SCHILLERKIEZ · {KZ_T(lang, "STAND", "AS OF")} {KZ_DATA.stand}
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "6px 0 0" }}>
          {lang === "DE"
            ? <React.Fragment>Der Kiez, <span style={{ fontFamily: KZ.font.serif, fontStyle: "italic", fontWeight: 400, color: KZ_MOSS }}>gemessen</span></React.Fragment>
            : <React.Fragment>The Kiez, <span style={{ fontFamily: KZ.font.serif, fontStyle: "italic", fontWeight: 400, color: KZ_MOSS }}>measured</span></React.Fragment>}
        </h1>
        <div style={{ fontFamily: KZ.font.serif, fontStyle: "italic", fontSize: 17, color: KZ.color.inkSoft, marginTop: 8, maxWidth: 620 }}>
          {KZ_T(lang,
            "Vier Planungsräume, 25.900 Nachbarinnen und Nachbarn, eine Messstation — alle Kanäle auf einer Seite.",
            "Four planning areas, 25,900 neighbours, one measuring station — every channel on a single page.")}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontFamily: KZ.font.mono, fontSize: 11, color: KZ.color.inkMute }}>
          <span><b style={{ color: KZ.color.ink }}>{KZ_NUM(25900, lang)}</b> {KZ_T(lang, "Einwohner", "residents")}</span>
          <span><b style={{ color: KZ.color.ink }}>4</b> {KZ_T(lang, "Planungsräume", "planning areas")}</span>
          <span><b style={{ color: KZ.color.ink }}>{KZ_T(lang, "2×/Jahr", "2×/yr")}</b> {KZ_T(lang, "AfS-Sync", "AfS sync")}</span>
        </div>
      </div>
      {/* Zahl der Woche — the alive, rotating figure */}
      <div style={{ border: KZ.border.inkBold, borderRadius: KZ.r.lg, background: KZ.color.paperWarm, boxShadow: KZ.shadow.print(), padding: "16px 20px", transform: "rotate(0.6deg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: KZ.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KZ.color.inkMute }}>
          <span style={{ color: KZ_MOSS, fontWeight: 500 }}>{KZ_T(lang, "ZAHL DER WOCHE", "FIGURE OF THE WEEK")}</span>
          <span>{Z.kw}</span>
        </div>
        <div style={{ fontFamily: KZ.font.mono, fontSize: 44, fontWeight: 500, letterSpacing: "-0.03em", margin: "8px 0 2px" }}>{lang === "DE" ? Z.value : Z.value.replace(",", ".")}</div>
        <div style={{ fontSize: 14, lineHeight: 1.45, color: KZ.color.inkSoft }}>{Z.text[lang]}</div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1.5px dashed ${KZ.color.rule}`, fontFamily: KZ.font.mono, fontSize: 11, color: KZ_MOSS, fontWeight: 500 }}>
          {KZ_T(lang, "im Forum diskutieren →", "discuss in the forum →")}
        </div>
      </div>
    </section>
  );
}

// PLR selector — big riso map + chips. Every Kanal follows it.
function KZSelector({ lang = "DE", active = "all" }) {
  return (
    <section style={{ padding: "18px 36px", display: "flex", gap: 26, alignItems: "center", borderBottom: `1px dashed ${KZ.color.rule}` }}>
      <KZMap size={92} accent={KZ_PLR_COLORS[active] || KZ_MOSS} highlight={active} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: KZ.font.mono, fontSize: 10, letterSpacing: "0.14em", color: KZ.color.inkMute, marginBottom: 8 }}>
          {KZ_T(lang, "PLANUNGSRAUM WÄHLEN — ALLE KANÄLE FOLGEN DER AUSWAHL", "PICK A PLANNING AREA — EVERY CHANNEL FOLLOWS")}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {KZ_DATA.areas.map((a) => (
            <span key={a.code} style={{
              padding: "7px 14px", fontSize: 13, fontWeight: 600, borderRadius: KZ.r.pill,
              border: KZ.border.ink, display: "inline-flex", alignItems: "center", gap: 8,
              background: a.code === active ? KZ.color.ink : "transparent",
              color: a.code === active ? KZ.color.paper : KZ.color.ink,
            }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: KZ_PLR_COLORS[a.code], border: a.code === active ? "none" : `1px solid ${KZ.color.ink}` }} />
              {a.code === "all" ? KZ_T(lang, "Gesamt", "Total") : a.name.DE}
              <span style={{ fontFamily: KZ.font.mono, fontSize: 10, opacity: 0.65 }}>{KZ_NUM(a.pop, lang)}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// Kanal frame — every chart module lives in one
function KZKanal({ nr, title, lang, children, right, area }) {
  return (
    <section style={{ margin: "0 36px", padding: "20px 0", borderBottom: `1px dashed ${KZ.color.rule}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: KZ.font.mono, fontSize: 10, letterSpacing: "0.16em", color: KZ.color.inkMute }}>
            {KZ_T(lang, "KANAL", "CHANNEL")} {nr} · {area}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 2 }}>{title}</div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

// ── KANAL 01 · Bevölkerung ────────────────────────────────
function KZKanalPop({ lang = "DE", plr = "all" }) {
  const A = KZ_DATA.areas.find((a) => a.code === plr);
  const min = Math.min(...A.trend), max = Math.max(...A.trend);
  const toY = (v) => 118 - ((v - min) / (max - min || 1)) * 82;
  const pts = A.trend.map((v, i) => [70 + i * 190, toY(v)]);
  const overlay = KZ_DATA.areas.filter((a) => a.code !== "all");
  return (
    <KZKanal nr="01" lang={lang} area={A.name[lang] || A.name.DE} title={KZ_T(lang, "Bevölkerung", "Population")}
      right={<div style={{ fontFamily: KZ.font.mono, fontSize: 11, color: KZ_MOSS }}>Δ {A.delta} / H2 '24</div>}>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 330px", gap: 22, alignItems: "stretch" }}>
        {/* gauge */}
        <div style={{ border: KZ.border.inkBold, borderRadius: KZ.r.lg, background: KZ.color.paperWarm, boxShadow: KZ.shadow.printSm(), padding: "14px 16px" }}>
          <div style={{ fontFamily: KZ.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KZ.color.inkMute }}>{KZ_T(lang, "EINWOHNER", "RESIDENTS")}</div>
          <div style={{ fontFamily: KZ.font.mono, fontSize: 34, fontWeight: 500, marginTop: 4, letterSpacing: "-0.02em" }}>{KZ_NUM(A.pop, lang)}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 8, fontFamily: KZ.font.mono, fontSize: 10.5, color: KZ.color.inkSoft }}>
            <span>♂ {KZ_NUM(A.m, lang)}</span><span>♀ {KZ_NUM(A.f, lang)}</span>
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1.5px dashed ${KZ.color.rule}`, fontFamily: KZ.font.mono, fontSize: 10, color: KZ.color.inkMute, lineHeight: 1.5 }}>
            {KZ_NUM(A.einp, lang)} {KZ_T(lang, "Einpersonen-Haushalte", "single-person households")}
          </div>
        </div>
        {/* trend, mix hand */}
        <div style={{ border: KZ.border.ink, borderRadius: KZ.r.lg, background: KZ.color.paperWarm, padding: "12px 18px" }}>
          <div style={{ fontFamily: KZ.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KZ.color.inkMute }}>{KZ_T(lang, "ENTWICKLUNG 2021–2025", "COURSE 2021–2025")}</div>
          <svg viewBox="0 0 880 150" style={{ width: "100%", marginTop: 4 }}>
            <KZGrid x1={40} x2={860} rows={3} top={26} step={40} />
            <line x1={40} y1={16} x2={40} y2={126} stroke={KZ.color.ink} strokeWidth="1.1" />
            <KZLine pts={pts} color={KZ_PLR_COLORS[plr]} seed={4} />
            {A.trend.map((v, i) => (
              <g key={i}>
                <text x={70 + i * 190} y={144} textAnchor="middle" fontFamily={KZ.font.mono} fontSize="10.5" fill={KZ.color.inkMute}>{KZ_DATA.trendLabels[i]}</text>
                <text x={70 + i * 190} y={toY(v) - 11} textAnchor="middle" fontFamily={KZ.font.mono} fontSize="10.5" fill={KZ.color.ink} fontWeight="500">{KZ_NUM(v, lang)}</text>
              </g>
            ))}
          </svg>
        </div>
        {/* per-PLR small multiples */}
        <div style={{ border: KZ.border.ink, borderRadius: KZ.r.lg, background: KZ.color.paperWarm, padding: "12px 18px" }}>
          <div style={{ fontFamily: KZ.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KZ.color.inkMute, marginBottom: 8 }}>{KZ_T(lang, "NACH PLANUNGSRAUM", "BY PLANNING AREA")}</div>
          {overlay.map((a) => {
            const mn = Math.min(...a.trend), mx = Math.max(...a.trend);
            return (
              <div key={a.code} style={{ display: "grid", gridTemplateColumns: "84px 1fr 52px", gap: 10, alignItems: "center", padding: "4px 0" }}>
                <span style={{ fontFamily: KZ.font.mono, fontSize: 10, color: KZ.color.inkSoft }}>{a.short}</span>
                <svg viewBox="0 0 130 24" style={{ width: "100%" }}>
                  <KZLine pts={a.trend.map((v, i) => [8 + i * 28, 19 - ((v - mn) / (mx - mn || 1)) * 14])} color={KZ_PLR_COLORS[a.code]} seed={6} width={1.8} dots={false} />
                </svg>
                <span style={{ fontFamily: KZ.font.mono, fontSize: 10.5, textAlign: "right" }}>{KZ_NUM(a.pop, lang)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </KZKanal>
  );
}

// ── KANAL 02 · Alter ──────────────────────────────────────
function KZKanalAge({ lang = "DE", plr = "all" }) {
  const A = KZ_DATA.areas.find((a) => a.code === plr);
  const maxP = Math.max(...A.age);
  return (
    <KZKanal nr="02" lang={lang} area={A.name[lang] || A.name.DE} title={KZ_T(lang, "Alter", "Age")}
      right={<KZMap size={40} accent={KZ_PLR_COLORS[plr]} highlight={plr} />}>
      <div style={{ border: KZ.border.ink, borderRadius: KZ.r.lg, background: KZ.color.paperWarm, padding: "14px 22px" }}>
        <svg viewBox="0 0 1130 258" style={{ width: "100%" }}>
          {[0, 10, 20, 30, 40].map((p) => (
            <g key={p}>
              <line x1={80 + (p / 42) * 990} x2={80 + (p / 42) * 990} y1={6} y2={238} stroke={KZ.color.rule} strokeWidth="0.8" />
              <text x={80 + (p / 42) * 990} y={252} textAnchor="middle" fontFamily={KZ.font.mono} fontSize="10" fill={KZ.color.inkMute}>{p}%</text>
            </g>
          ))}
          <line x1={80} y1={4} x2={80} y2={238} stroke={KZ.color.ink} strokeWidth="1.2" />
          {A.age.map((p, i) => {
            const w = (p / 42) * 990, y = i * 33 + 8;
            return (
              <g key={i}>
                <text x={70} y={y + 15} textAnchor="end" fontFamily={KZ.font.mono} fontSize="11.5" fill={KZ.color.inkSoft}>{KZ_DATA.ageLabels[i]}</text>
                <KZBar x={80} y={y + 2} w={w} h={18} seed={i + 2} color={KZ_PLR_COLORS[plr]} opacity={0.28 + 0.55 * (p / maxP)} />
                <text x={88 + w} y={y + 15} fontFamily={KZ.font.mono} fontSize="10.5" fill={KZ.color.ink} fontWeight="500">
                  {KZ_PCT(p, lang)} · {KZ_NUM(Math.round(A.pop * p / 100 / 10) * 10, lang)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </KZKanal>
  );
}

// ── KANAL 03 · Vielfalt ───────────────────────────────────
function KZDonut({ segs, size = 148 }) {
  const C = 2 * Math.PI * 40;
  let off = 0;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      {segs.map((s, i) => {
        const dash = (s.v / 100) * C, el = (
          <g key={i}>
            <circle cx="61.5" cy="61.2" r="40" fill="none" stroke={s.c} strokeWidth="17" opacity="0.4"
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-off} transform="rotate(-90 61.5 61.2)" />
            <circle cx="60" cy="60" r="40" fill="none" stroke={s.c} strokeWidth="17" opacity="0.85"
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-off} transform="rotate(-90 60 60)" />
          </g>
        );
        off += dash;
        return el;
      })}
      <circle cx="60" cy="60" r="30.5" fill="none" stroke={KZ.color.ink} strokeWidth="1.2" />
      <circle cx="60" cy="60" r="49.5" fill="none" stroke={KZ.color.ink} strokeWidth="1.2" />
    </svg>
  );
}
function KZKanalMig({ lang = "DE", plr = "all" }) {
  const A = KZ_DATA.areas.find((a) => a.code === plr);
  const legs = [
    { l: KZ_T(lang, "Ausländische Nachbar:innen", "Foreign nationals"), v: A.mig.a, c: KZ.color.teal },
    { l: KZ_T(lang, "Deutsche mit Migrationsgeschichte", "Germans with migration background"), v: A.mig.mh, c: KZ.color.wine },
    { l: KZ_T(lang, "Ohne Migrationsgeschichte", "No migration background"), v: A.mig.o, c: KZ.color.ochre },
  ];
  const D = KZ_DATA.divTrend;
  const toY = (v) => 108 - ((v - 18) / 30) * 88;
  return (
    <KZKanal nr="03" lang={lang} area={A.name[lang] || A.name.DE} title={KZ_T(lang, "Vielfalt", "Diversity")}
      right={<KZMap size={40} accent={KZ_PLR_COLORS[plr]} highlight={plr} />}>
      <div style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 22 }}>
        <div style={{ border: KZ.border.ink, borderRadius: KZ.r.lg, background: KZ.color.paperWarm, padding: "16px 20px", display: "flex", gap: 20, alignItems: "center" }}>
          <KZDonut segs={legs} />
          <div style={{ flex: 1 }}>
            {legs.map((s) => (
              <div key={s.l} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "6px 0", borderBottom: `1px dashed ${KZ.color.rule}` }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.c, border: `1px solid ${KZ.color.ink}`, alignSelf: "center" }} />
                <span style={{ fontSize: 12.5, color: KZ.color.inkSoft, flex: 1, lineHeight: 1.3 }}>{s.l}</span>
                <span style={{ fontFamily: KZ.font.mono, fontSize: 15, fontWeight: 500 }}>{KZ_PCT(s.v, lang)}</span>
              </div>
            ))}
            <div style={{ fontFamily: KZ.font.mono, fontSize: 9, color: KZ.color.inkMute, marginTop: 8 }}>
              {KZ_T(lang, "MH schließt Ausländer:innen NICHT ein — Segmente überlappen nicht.", "Segments are non-overlapping.")}
            </div>
          </div>
        </div>
        <div style={{ border: KZ.border.ink, borderRadius: KZ.r.lg, background: KZ.color.paperWarm, padding: "12px 18px" }}>
          <div style={{ fontFamily: KZ.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KZ.color.inkMute }}>{KZ_T(lang, "IM ZEITVERLAUF · GESAMT", "OVER TIME · TOTAL")}</div>
          <svg viewBox="0 0 620 140" style={{ width: "100%", marginTop: 4 }}>
            <KZGrid x1={36} x2={600} rows={3} top={22} step={38} />
            <line x1={36} y1={12} x2={36} y2={116} stroke={KZ.color.ink} strokeWidth="1.1" />
            {[["a", KZ.color.teal], ["mh", KZ.color.wine], ["o", KZ.color.ochre]].map(([k, c], si) => (
              <KZLine key={k} pts={D.map((d, i) => [64 + i * 130, toY(d[k])])} color={c} seed={si * 3 + 2} width={2} />
            ))}
            {D.map((d, i) => (
              <text key={i} x={64 + i * 130} y={134} textAnchor="middle" fontFamily={KZ.font.mono} fontSize="10" fill={KZ.color.inkMute}>{d.t}</text>
            ))}
          </svg>
          <div style={{ display: "flex", gap: 14, fontFamily: KZ.font.mono, fontSize: 9.5, color: KZ.color.inkSoft, marginTop: 4 }}>
            {legs.map((s) => <span key={s.l} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 3, background: s.c }} />{KZ_PCT(s.v, lang)}</span>)}
          </div>
        </div>
      </div>
    </KZKanal>
  );
}

// ── KANAL 04 · Soziale Lage (+ Anwohner-Kontext links) ────
function KZKanalSocial({ lang = "DE", plr = "all", noData = false }) {
  const A = KZ_DATA.areas.find((a) => a.code === plr);
  const rows = [
    { l: KZ_T(lang, "Arbeitslosenquote", "Unemployment rate"), v: A.social.alq, c: KZ.color.teal, threads: 0 },
    { l: KZ_T(lang, "Kinderarmut (U15)", "Child poverty (U15)"), v: A.social.ka, c: KZ.color.wine, threads: 3 },
    { l: KZ_T(lang, "Transferleistungen", "Transfer benefits"), v: A.social.tr, c: KZ.color.ochre, threads: 1 },
  ];
  return (
    <KZKanal nr="04" lang={lang} area={A.name[lang] || A.name.DE} title={KZ_T(lang, "Soziale Lage", "Social situation")}
      right={<div style={{ fontFamily: KZ.font.mono, fontSize: 10.5, color: KZ.color.inkMute }}>MSS 2023</div>}>
      {noData ? (
        <div style={{ border: `1.5px dashed ${KZ.color.rule}`, borderRadius: KZ.r.lg, padding: "26px 24px", textAlign: "center", fontFamily: KZ.font.serif, fontStyle: "italic", fontSize: 16, color: KZ.color.inkMute }}>
          {KZ_T(lang, "Für diesen Planungsraum liegen keine Sozialdaten vor.", "No social data available for this planning area.")}
        </div>
      ) : (
        <div style={{ border: KZ.border.ink, borderRadius: KZ.r.lg, background: KZ.color.paperWarm, padding: "16px 22px" }}>
          <svg viewBox="0 0 1130 150" style={{ width: "100%" }}>
            {[0, 10, 20, 30, 40, 50].map((p) => (
              <g key={p}>
                <line x1={170 + (p / 50) * 820} x2={170 + (p / 50) * 820} y1={4} y2={130} stroke={KZ.color.rule} strokeWidth="0.8" />
                <text x={170 + (p / 50) * 820} y={146} textAnchor="middle" fontFamily={KZ.font.mono} fontSize="10" fill={KZ.color.inkMute}>{p}%</text>
              </g>
            ))}
            <line x1={170} y1={2} x2={170} y2={130} stroke={KZ.color.ink} strokeWidth="1.2" />
            {rows.map((r, i) => {
              const w = (r.v / 50) * 820, y = i * 42 + 8;
              return (
                <g key={r.l}>
                  <text x={160} y={y + 15} textAnchor="end" fontSize="13" fontWeight="600" fill={KZ.color.ink} fontFamily={KZ.font.display}>{r.l}</text>
                  <KZBar x={170} y={y} w={w} h={20} seed={i + 11} color={r.c} opacity={0.5} />
                  <text x={178 + w} y={y + 15} fontFamily={KZ.font.mono} fontSize="12" fontWeight="500" fill={KZ.color.ink}>{KZ_PCT(r.v, lang)}</text>
                  {r.threads > 0 && (
                    <text x={258 + w} y={y + 15} fontFamily={KZ.font.mono} fontSize="10.5" fill={KZ_MOSS} fontWeight="500">
                      ♨ {r.threads} {KZ_T(lang, r.threads === 1 ? "Gespräch im Forum" : "Gespräche im Forum", r.threads === 1 ? "forum thread" : "forum threads")} →
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div style={{ display: "flex", gap: 18, marginTop: 8, paddingTop: 10, borderTop: `1.5px dashed ${KZ.color.rule}`, fontFamily: KZ.font.mono, fontSize: 10.5, color: KZ.color.inkSoft }}>
            <span>{KZ_T(lang, "Status-Index", "Status index")}: <b>{A.social.status}</b></span>
            <span>{KZ_T(lang, "Dynamik", "Dynamics")}: <b>{A.social.dyn}</b></span>
            <span style={{ color: KZ.color.inkMute }}>(*) {KZ_T(lang, "MSS-Systematik, s. Quellen", "MSS methodology, see sources")}</span>
          </div>
        </div>
      )}
    </KZKanal>
  );
}

// ── KANAL 05 · Soziale Entwicklung (LOR merge) ────────────
function KZKanalSocTrend({ lang = "DE" }) {
  const S = KZ_DATA.socTrend;
  const toY = (v) => 128 - ((v - 6) / 42) * 108;
  const boundaryX = 64 + (S.reformAfter - 0.5) * 106;
  return (
    <KZKanal nr="05" lang={lang} area={KZ_T(lang, "Gesamt · Schillerkiez", "Total · Schillerkiez")} title={KZ_T(lang, "Soziale Entwicklung", "Social development")}
      right={<div style={{ fontFamily: KZ.font.mono, fontSize: 10.5, color: KZ.color.inkMute }}>2013–2023</div>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 440px", gap: 22 }}>
        <div style={{ border: KZ.border.ink, borderRadius: KZ.r.lg, background: KZ.color.paperWarm, padding: "12px 18px" }}>
          <div style={{ fontFamily: KZ.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KZ.color.inkMute }}>{KZ_T(lang, "DREI INDIKATOREN · GESAMT", "THREE INDICATORS · TOTAL")}</div>
          <svg viewBox="0 0 640 168" style={{ width: "100%", marginTop: 4 }}>
            <KZGrid x1={38} x2={620} rows={4} top={20} step={36} />
            <line x1={38} y1={10} x2={38} y2={136} stroke={KZ.color.ink} strokeWidth="1.1" />
            {[["alq", KZ.color.teal], ["ka", KZ.color.wine], ["tr", KZ.color.ochre]].map(([k, c], si) => (
              <KZLine key={k} pts={S.gesamt[k].map((v, i) => [64 + i * 106, toY(v)])} color={c} seed={si * 4 + 1} width={2} />
            ))}
            {S.years.map((y, i) => (
              <text key={y} x={64 + i * 106} y={158} textAnchor="middle" fontFamily={KZ.font.mono} fontSize="10.5" fill={KZ.color.inkMute}>{y}</text>
            ))}
          </svg>
          <div style={{ display: "flex", gap: 16, fontFamily: KZ.font.mono, fontSize: 9.5, color: KZ.color.inkSoft }}>
            <span><span style={{ display: "inline-block", width: 12, height: 3, background: KZ.color.teal, marginRight: 5 }} />{KZ_T(lang, "Arbeitslosigkeit", "Unemployment")}</span>
            <span><span style={{ display: "inline-block", width: 12, height: 3, background: KZ.color.wine, marginRight: 5 }} />{KZ_T(lang, "Kinderarmut", "Child poverty")}</span>
            <span><span style={{ display: "inline-block", width: 12, height: 3, background: KZ.color.ochre, marginRight: 5 }} />{KZ_T(lang, "Transfer", "Transfer")}</span>
          </div>
        </div>
        <div style={{ border: KZ.border.ink, borderRadius: KZ.r.lg, background: KZ.color.paperWarm, padding: "12px 18px", position: "relative" }}>
          <div style={{ fontFamily: KZ.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KZ.color.inkMute }}>{KZ_T(lang, "ARBEITSLOSIGKEIT NACH GEBIET", "UNEMPLOYMENT BY AREA")}</div>
          <svg viewBox="0 0 640 168" style={{ width: "100%", marginTop: 4 }}>
            <KZGrid x1={38} x2={620} rows={4} top={20} step={36} />
            <line x1={38} y1={10} x2={38} y2={136} stroke={KZ.color.ink} strokeWidth="1.1" />
            {/* LOR-2021 boundary */}
            <line x1={boundaryX} y1={8} x2={boundaryX} y2={140} stroke={KZ.color.inkMute} strokeWidth="1.2" strokeDasharray="4 4" />
            <text x={boundaryX + 6} y={18} fontFamily={KZ.font.mono} fontSize="8.5" fill={KZ.color.inkMute} letterSpacing="0.08em">LOR 2021</text>
            {S.series.map((s, si) => (
              <KZLine key={s.name} pts={s.alq.map((v, i) => [64 + i * 106, 128 - ((v - 6) / 10) * 108])} color={si === 0 ? KZ.color.wine : KZ.color.plum} seed={si * 5 + 3} width={2} />
            ))}
            {S.years.map((y, i) => (
              <text key={y} x={64 + i * 106} y={158} textAnchor="middle" fontFamily={KZ.font.mono} fontSize="10.5" fill={KZ.color.inkMute}>{y}</text>
            ))}
          </svg>
          <div style={{ display: "flex", gap: 16, fontFamily: KZ.font.mono, fontSize: 9.5, color: KZ.color.inkSoft }}>
            {S.series.map((s, si) => <span key={s.name}><span style={{ display: "inline-block", width: 12, height: 3, background: si === 0 ? KZ.color.wine : KZ.color.plum, marginRight: 5 }} />{s.name}</span>)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, fontFamily: KZ.font.mono, fontSize: 10, color: KZ.color.inkMute, lineHeight: 1.6 }}>
        § {KZ_T(lang,
          "Gebietsreform 2021: vor 2021 zwei Planungsräume, seither vier. Alte Gebiete werden mit den neuen zusammengeführt (Mittelwert der Nachfolger) — durchgängige Linien, ehrlicher Bruchvermerk.",
          "2021 boundary reform: two planning areas before 2021, four since. Old areas are merged with their successors (average) — continuous lines, honest break marker.")}
      </div>
    </KZKanal>
  );
}

// ── Footer ────────────────────────────────────────────────
function KZFooter({ lang = "DE" }) {
  return (
    <footer style={{ padding: "18px 36px 26px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
      <div style={{ fontFamily: KZ.font.mono, fontSize: 10, color: KZ.color.inkMute, lineHeight: 1.7 }}>
        {KZ_T(lang, "QUELLEN", "SOURCES")}: Amt für Statistik Berlin-Brandenburg · Monitoring Soziale Stadtentwicklung · BLUME-Messnetz (mc042)<br />
        † {KZ_T(lang, "7-Tage-Luftverlauf: neuer Messwert-Logger nötig — BLUME liefert nur den Augenblick.", "7-day air course: needs a new reading logger — BLUME serves the moment only.")}
      </div>
      <div style={{ padding: "9px 18px", border: KZ.border.ink, borderRadius: KZ.r.pill, fontFamily: KZ.font.mono, fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", boxShadow: KZ.shadow.printSm() }}>
        {KZ_T(lang, "⎙ Kiez in Zahlen · A4 drucken", "⎙ Kiez in figures · print A4")}
      </div>
    </footer>
  );
}

// ═══ INDEX DESKTOP ════════════════════════════════════════
function KiezIndexDesktop({ lang = "DE", plr = "all" }) {
  return (
    <div style={{ width: 1280, background: KZ.color.paper, color: KZ.color.ink, fontFamily: KZ.font.display, position: "relative", overflow: "hidden", minHeight: plr === "all" ? 2360 : 2080 }} data-screen-label={`Kiez-Daten index ${lang}`}>
      <style>{KZ_fonts}</style>
      <div style={{ ...KZ_grain, zIndex: 2 }} />
      <KZNav active="Kiez" lang={lang} />
      <KZInstrumentStrip lang={lang} />
      <KZTitle lang={lang} />
      <KZSelector lang={lang} active={plr} />
      <KZKanalPop lang={lang} plr={plr} />
      <KZKanalAge lang={lang} plr={plr} />
      <KZKanalMig lang={lang} plr={plr} />
      <KZKanalSocial lang={lang} plr={plr} />
      {plr === "all" && <KZKanalSocTrend lang={lang} />}
      <KZFooter lang={lang} />
    </div>
  );
}

Object.assign(window, {
  KZ_DATA, KZ_T, KZ_NUM, KZ_PCT, KZ_GRADE, KZ_PLR_COLORS, KZ_MOSS,
  KZBar, KZLine, KZGrid, KZDonut,
  KZInstrumentStrip, KZTitle, KZSelector, KZKanal,
  KZKanalPop, KZKanalAge, KZKanalMig, KZKanalSocial, KZKanalSocTrend, KZFooter,
  KiezIndexDesktop,
});

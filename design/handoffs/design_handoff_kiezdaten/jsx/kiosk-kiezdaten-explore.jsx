/* global React */

// ══════════════════════════════════════════════════════════
//  KIEZ-DATEN PASS · exploration round
//  Three editorial metaphors × one chart-style comparison.
//  Carved accent: MOSS (#6b8a4a) — locked by user Jul 13 2026.
//  Route: /schillerkiez · nav „Kiez Data“.
//  Seeds mirror the real KiezStatsResponse shape (AfS/MSS +
//  BLUME MC042). Air-quality HISTORY is flagged: backend has
//  instant readings only — a logger is a new build item.
// ══════════════════════════════════════════════════════════

const { kiosk: KD_K, paperGrainStyle: KD_grain, kioskFonts: KD_fonts, KioskAnnotate: KDNote } = window;
const KD_MOSS = KD_K.color.moss;

// ── Seeds (realistic, KiezStatsResponse-shaped) ───────────
const KD_SEED = {
  stand: "31.12.2025", period: "2025 H2",
  total: 25900, male: 13120, female: 12780,
  age: [
    { g: "0–5", n: 1650, p: 6.4 }, { g: "6–17", n: 3050, p: 11.8 },
    { g: "18–26", n: 3900, p: 15.1 }, { g: "27–44", n: 9800, p: 37.9 },
    { g: "45–54", n: 3350, p: 12.9 }, { g: "55–64", n: 2250, p: 8.7 },
    { g: "65+", n: 1900, p: 7.3 },
  ],
  mig: { auslaender: 11550, mitMH: 5650, ohneMH: 8700 },
  social: { alq: 8.9, kinderarmut: 38.2, transfer: 24.6 },
  trend: [
    { t: "H2 '21", v: 25480 }, { t: "H2 '22", v: 25610 }, { t: "H2 '23", v: 25540 },
    { t: "H2 '24", v: 25720 }, { t: "H2 '25", v: 25900 },
  ],
  air: {
    lqi: 2, label: { DE: "gut", EN: "good" }, at: "13.07. · 11:00",
    pollutants: [
      { n: "PM10", d: { DE: "Feinstaub", EN: "Particulates" }, g: 2, l: { DE: "gut", EN: "good" } },
      { n: "NO₂", d: { DE: "Stickstoffdioxid", EN: "Nitrogen dioxide" }, g: 2, l: { DE: "gut", EN: "good" } },
      { n: "O₃", d: { DE: "Ozon", EN: "Ozone" }, g: 3, l: { DE: "mäßig", EN: "moderate" } },
      { n: "CO", d: { DE: "Kohlenmonoxid", EN: "Carbon monoxide" }, g: 1, l: { DE: "sehr gut", EN: "very good" } },
    ],
    week: [2, 2, 3, 2, 1, 2, 2], // ← FLAG: needs new reading-logger, instant-only API today
  },
};

const KD_GRADE = (g) => g <= 2 ? KD_K.color.success : g === 3 ? KD_K.color.warn : KD_K.color.danger;

// ── PLR mini-map (real LOR-2021 polygons, simplified) ─────
const KD_PLR = [
  { c: "08100102", d: "M2.9 2 L37.2 13.9 L55.3 10.8 L61.8 33.3 L38.6 37.7 L35.8 25.1 L31.4 25.3 L30.8 21.9 L23.5 19.3 L15.7 25.5 L3.8 23.3 L2 10.3 L2.9 2 Z" },
  { c: "08100103", d: "M23.1 20.9 L23.5 19.3 L25.9 20 L30.8 21.9 L31.4 25.3 L35.8 25.1 L38.6 37.7 L61.8 33.3 L65.8 47.4 L41.3 51.9 L42.7 57.2 L34.6 59.8 L30.3 65.5 L23.1 20.9 Z" },
  { c: "08100104", d: "M65.8 47.4 L73.7 71.8 L44.6 77.2 L45 81.1 L32.7 83 L30.3 65.5 L34.6 59.8 L42.7 57.2 L41.3 51.9 L65.8 47.4 Z" },
  { c: "08100105", d: "M73.7 71.8 L82.9 94.8 L59.6 100.4 L47.2 101.1 L44.6 77.2 L73.7 71.8 Z" },
];
function KDMap({ size = 64, accent = KD_MOSS, highlight = "all" }) {
  return (
    <svg viewBox="0 0 85 104" width={size} height={size * 104 / 85} aria-hidden="true">
      {KD_PLR.map((p) => (
        <path key={p.c} d={p.d} fill={highlight === "all" || highlight === p.c ? accent : KD_K.color.paperSoft}
          opacity={highlight === "all" || highlight === p.c ? 0.8 : 1} stroke={KD_K.color.ink} strokeWidth="1.6" />
      ))}
    </svg>
  );
}

// ── Wobble helpers (hand-drawn chart language) ────────────
const KD_rnd = (i, seed) => { const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x); };
function kdWobLine(x1, y1, x2, y2, seed = 1, amp = 1.4, segs = 7) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const jx = (KD_rnd(i, seed) - 0.5) * amp, jy = (KD_rnd(i, seed + 5) - 0.5) * amp;
    pts.push(`${(x1 + (x2 - x1) * t + (i === 0 || i === segs ? 0 : jx)).toFixed(1)},${(y1 + (y2 - y1) * t + (i === 0 || i === segs ? 0 : jy)).toFixed(1)}`);
  }
  return pts.join(" ");
}
function kdWobRect(x, y, w, h, seed = 1, amp = 1.3) {
  const j = (i, s) => (KD_rnd(i, seed + s) - 0.5) * amp;
  return `M${x},${y + j(0, 1)} L${x + w + j(1, 2)},${y + j(2, 3)} L${x + w + j(3, 4)},${y + h + j(4, 5)} L${x + j(5, 6)},${y + h + j(6, 7)} Z`;
}

// ── Shared bits ───────────────────────────────────────────
function KDPage({ children, height, bg = KD_K.color.paper }) {
  return (
    <div style={{ width: 1280, height, background: bg, color: KD_K.color.ink, fontFamily: KD_K.font.display, position: "relative", overflow: "hidden" }}>
      <style>{KD_fonts}</style>
      <div style={KD_grain} />
      {children}
    </div>
  );
}
function KDRibbon({ label }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 48px", borderBottom: `1.5px solid ${KD_K.color.ink}` }}>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>Mahalle<span style={{ color: KD_MOSS }}>.</span></div>
      <div style={{ fontFamily: KD_K.font.mono, fontSize: 10.5, letterSpacing: "0.14em", color: KD_K.color.inkMute }}>{label}</div>
      <div style={{ display: "flex", gap: 6, fontFamily: KD_K.font.mono, fontSize: 11 }}>
        <span style={{ padding: "3px 9px", background: KD_K.color.ink, color: KD_K.color.paper, borderRadius: 999 }}>DE</span>
        <span style={{ padding: "3px 9px", border: `1.5px solid ${KD_K.color.ink}`, borderRadius: 999 }}>EN</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  METAPHOR A · STATISTISCHES AMTSBLATT
//  Official gazette: numbered Abbildungen, stamps, formal
//  rules. The Kiez read like a public record.
// ═══════════════════════════════════════════════════════════
function KDExploreAmtsblatt() {
  const S = KD_SEED;
  return (
    <KDPage height={840}>
      <KDRibbon label="KIEZ-DATEN · METAPHER A" />
      <div style={{ padding: "30px 48px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: KD_K.font.mono, fontSize: 11, letterSpacing: "0.18em", color: KD_MOSS }}>
              STATISTISCHES AMTSBLATT · SCHILLERKIEZ · AUSGABE {S.period} · STAND {S.stand}
            </div>
            <h1 style={{ fontSize: 58, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "10px 0 6px" }}>
              Der Kiez, <span style={{ fontFamily: KD_K.font.serif, fontStyle: "italic", fontWeight: 400, color: KD_MOSS }}>amtlich</span>
            </h1>
            <div style={{ fontFamily: KD_K.font.serif, fontStyle: "italic", fontSize: 17, color: KD_K.color.inkSoft }}>
              Vier Planungsräume, {S.total.toLocaleString("de-DE")} Einwohner, ein öffentliches Protokoll.
            </div>
          </div>
          {/* Amtsstempel */}
          <div style={{ transform: "rotate(6deg)", border: `2.5px solid ${KD_MOSS}`, borderRadius: 8, padding: "8px 14px", color: KD_MOSS, fontFamily: KD_K.font.mono, fontSize: 10, letterSpacing: "0.12em", textAlign: "center", lineHeight: 1.5, opacity: 0.85 }}>
              BEGLAUBIGT<br />AfS BERLIN-BRANDENBURG<br />MSS · BLUME MC042
          </div>
        </div>

        {/* Bekanntmachung Nr. 1 — Luftgüte */}
        <div style={{ marginTop: 26, border: KD_K.border.inkBold, borderRadius: KD_K.r.lg, background: KD_K.color.paperWarm, boxShadow: KD_K.shadow.print(), padding: "18px 24px", display: "flex", gap: 28, alignItems: "center" }}>
          <div style={{ minWidth: 210 }}>
            <div style={{ fontFamily: KD_K.font.mono, fontSize: 10, letterSpacing: "0.14em", color: KD_K.color.inkMute }}>BEKANNTMACHUNG NR. 1</div>
            <div style={{ fontSize: 21, fontWeight: 800, marginTop: 3 }}>Luftgüte <span style={{ fontFamily: KD_K.font.serif, fontStyle: "italic", fontWeight: 400 }}>heute</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, fontFamily: KD_K.font.mono, fontSize: 10.5, color: KD_K.color.inkMute }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: KD_K.color.success }} />LIVE · NANSENSTRASSE · {S.air.at}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 74, height: 74, borderRadius: 999, border: `2.5px solid ${KD_GRADE(S.air.lqi)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: KD_K.color.paper }}>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: KD_GRADE(S.air.lqi) }}>{S.air.lqi}</div>
              <div style={{ fontFamily: KD_K.font.mono, fontSize: 9.5, color: KD_K.color.inkMute }}>{S.air.label.DE}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {S.air.pollutants.map((p) => (
                <div key={p.n} style={{ textAlign: "center", padding: "8px 12px", border: KD_K.border.hair, borderRadius: KD_K.r.md, minWidth: 78 }}>
                  <div style={{ fontFamily: KD_K.font.mono, fontSize: 9.5, color: KD_K.color.inkMute }}>{p.n}</div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: KD_GRADE(p.g) }}>{p.g}</div>
                  <div style={{ fontFamily: KD_K.font.mono, fontSize: 9, color: KD_K.color.inkSoft }}>{p.l.DE}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontFamily: KD_K.font.mono, fontSize: 9.5, color: KD_K.color.inkMute, textAlign: "right", lineHeight: 1.6 }}>
            Skala 1–5 · 1 = sehr gut<br />Quelle: BLUME-Messnetz
          </div>
        </div>

        {/* Abb. 1 — Altersverteilung + Tab. 1 side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, marginTop: 24 }}>
          <div style={{ border: KD_K.border.ink, borderRadius: KD_K.r.lg, background: KD_K.color.paperWarm, padding: "18px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: KD_K.font.mono, fontSize: 10, letterSpacing: "0.14em", color: KD_MOSS, fontWeight: 500 }}>ABB. 1</div>
                <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>Altersverteilung · Gesamt</div>
              </div>
              <KDMap size={44} />
            </div>
            <svg viewBox="0 0 560 236" style={{ width: "100%", marginTop: 10 }}>
              {S.age.map((a, i) => {
                const w = (a.n / 9800) * 380, y = i * 33 + 4;
                return (
                  <g key={a.g}>
                    <text x={56} y={y + 15} textAnchor="end" fontFamily={KD_K.font.mono} fontSize="11" fill={KD_K.color.inkSoft}>{a.g}</text>
                    <rect x={64} y={y + 2} width={w} height={18} rx={3} fill={KD_MOSS} opacity={0.28 + 0.72 * (a.n / 9800)} stroke={KD_K.color.ink} strokeWidth="1.2" />
                    <text x={64 + w + 8} y={y + 15} fontFamily={KD_K.font.mono} fontSize="11" fill={KD_K.color.ink} fontWeight="500">{a.n.toLocaleString("de-DE")} · {a.p}%</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div style={{ border: KD_K.border.ink, borderRadius: KD_K.r.lg, background: KD_K.color.paperWarm, padding: "18px 24px" }}>
            <div style={{ fontFamily: KD_K.font.mono, fontSize: 10, letterSpacing: "0.14em", color: KD_MOSS, fontWeight: 500 }}>TAB. 1</div>
            <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>Soziale Lage</div>
            {[
              { l: "Arbeitslosenquote", v: S.social.alq }, { l: "Kinderarmut (U15)", v: S.social.kinderarmut }, { l: "Transferleistungen", v: S.social.transfer },
            ].map((r) => (
              <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0 10px", borderBottom: `1.5px dashed ${KD_K.color.rule}` }}>
                <span style={{ fontSize: 14, color: KD_K.color.inkSoft }}>{r.l}</span>
                <span style={{ fontFamily: KD_K.font.mono, fontSize: 20, fontWeight: 500 }}>{String(r.v).replace(".", ",")}<span style={{ fontSize: 12, color: KD_K.color.inkMute }}> %</span></span>
              </div>
            ))}
            <div style={{ fontFamily: KD_K.font.mono, fontSize: 9.5, color: KD_K.color.inkMute, marginTop: 12, lineHeight: 1.6 }}>
              MSS 2023 · Mittel über 4 PLR<br />„(*) Status/Dynamik s. Anhang“
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, fontFamily: KD_K.font.mono, fontSize: 10, color: KD_K.color.inkMute, letterSpacing: "0.04em" }}>
          §&nbsp;Gebietsreform 2021: vor 2021 zwei Planungsräume, seither vier — Trendlinien werden amtlich zusammengeführt.
        </div>
      </div>
      <KDNote top={210} right={40} rotate={2}>
        A · AMTSBLATT — numbered figures (Abb./Tab.), stamp, formal §-footnotes. Data as public record. Strongest kinship: Kurier (both „printed civic paper“).
      </KDNote>
    </KDPage>
  );
}

// ═══════════════════════════════════════════════════════════
//  METAPHOR B · ALMANACH
//  Chaptered yearly book. Roman numerals, contemplative
//  serif deks, charts as book plates (Tafeln).
// ═══════════════════════════════════════════════════════════
function KDExploreAlmanach() {
  const S = KD_SEED;
  const chapters = [
    { n: "I", t: "Die Menschen", dek: "Wer hier lebt, in sieben Altersgruppen erzählt." },
    { n: "II", t: "Die Lage", dek: "Was der Sozialatlas über den Kiez weiß." },
    { n: "III", t: "Die Luft", dek: "Gemessen an der Nansenstraße, Stunde für Stunde." },
  ];
  return (
    <KDPage height={860} bg={KD_K.color.paperWarm}>
      <KDRibbon label="KIEZ-DATEN · METAPHER B" />
      <div style={{ padding: "36px 90px 0", maxWidth: 1100 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: KD_K.font.mono, fontSize: 11, letterSpacing: "0.22em", color: KD_MOSS }}>DER SCHILLERKIEZ-ALMANACH · {S.period}</div>
          <h1 style={{ fontSize: 62, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "12px 0 8px" }}>
            Ein Kiez in <span style={{ fontFamily: KD_K.font.serif, fontStyle: "italic", fontWeight: 400, color: KD_MOSS }}>drei Kapiteln</span>
          </h1>
          <div style={{ fontFamily: KD_K.font.serif, fontStyle: "italic", fontSize: 18, color: KD_K.color.inkSoft, maxWidth: 620, margin: "0 auto" }}>
            {S.total.toLocaleString("de-DE")} Nachbarinnen und Nachbarn, vier Planungsräume, zehn Jahre Verlauf — gesammelt wie ein Jahrbuch.
          </div>
        </div>

        {/* Chapter index */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 22, marginTop: 34 }}>
          {chapters.map((c) => (
            <div key={c.n} style={{ borderTop: `3px solid ${KD_MOSS}`, paddingTop: 14 }}>
              <div style={{ fontFamily: KD_K.font.serif, fontSize: 44, lineHeight: 1, color: KD_MOSS }}>{c.n}</div>
              <div style={{ fontSize: 21, fontWeight: 800, marginTop: 6 }}>{c.t}</div>
              <p style={{ fontFamily: KD_K.font.serif, fontStyle: "italic", fontSize: 15, color: KD_K.color.inkSoft, lineHeight: 1.45, margin: "6px 0 0" }}>{c.dek}</p>
            </div>
          ))}
        </div>

        {/* Tafel 1 — book plate */}
        <div style={{ marginTop: 32, border: KD_K.border.ink, borderRadius: KD_K.r.lg, background: KD_K.color.paper, boxShadow: KD_K.shadow.print(), padding: "24px 34px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: KD_K.font.mono, fontSize: 10, letterSpacing: "0.16em", color: KD_K.color.inkMute }}>KAPITEL I · TAFEL 1</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 3 }}>Die Bevölkerung <span style={{ fontFamily: KD_K.font.serif, fontStyle: "italic", fontWeight: 400, color: KD_MOSS }}>wächst leise</span></div>
            </div>
            <KDMap size={46} />
          </div>
          <svg viewBox="0 0 900 170" style={{ width: "100%", marginTop: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={70} x2={860} y1={20 + i * 38} y2={20 + i * 38} stroke={KD_K.color.rule} strokeWidth="1" strokeDasharray="3 5" />
            ))}
            {S.trend.map((t, i) => {
              const x = 90 + i * 185, y = 140 - ((t.v - 25400) / 600) * 110;
              const nx = i < S.trend.length - 1 ? 90 + (i + 1) * 185 : null;
              const ny = nx != null ? 140 - ((S.trend[i + 1].v - 25400) / 600) * 110 : null;
              return (
                <g key={t.t}>
                  {nx != null && <line x1={x} y1={y} x2={nx} y2={ny} stroke={KD_MOSS} strokeWidth="2.5" />}
                  <circle cx={x} cy={y} r="4.5" fill={KD_K.color.paper} stroke={KD_MOSS} strokeWidth="2.5" />
                  <text x={x} y={165} textAnchor="middle" fontFamily={KD_K.font.mono} fontSize="11" fill={KD_K.color.inkMute}>{t.t}</text>
                  <text x={x} y={y - 12} textAnchor="middle" fontFamily={KD_K.font.mono} fontSize="11" fill={KD_K.color.ink} fontWeight="500">{t.v.toLocaleString("de-DE")}</text>
                </g>
              );
            })}
          </svg>
          <p style={{ fontFamily: KD_K.font.serif, fontStyle: "italic", fontSize: 15.5, color: KD_K.color.inkSoft, lineHeight: 1.5, margin: "14px 0 0", maxWidth: 720 }}>
            Seit 2021 wieder wachsend: gut vierhundert Menschen mehr als vor vier Jahren. Der Kiez bleibt jung — mehr als jede dritte Person ist zwischen 27 und 44.
          </p>
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: 20, alignItems: "center", fontFamily: KD_K.font.mono, fontSize: 10, color: KD_K.color.inkMute }}>
          <span>QUELLEN: AfS · MSS · BLUME</span><span>·</span><span>KAPITEL III trägt die Live-Luft — mit Wochenverlauf (NEU, s. Backend-Flag)</span>
        </div>
      </div>
      <KDNote top={196} right={40} rotate={-2}>
        B · ALMANACH — chaptered, contemplative, every Tafel gets a serif caption SENTENCE (data + editorial voice). Slowest read, most narrative.
      </KDNote>
    </KDPage>
  );
}

// ═══════════════════════════════════════════════════════════
//  METAPHOR C · MESSSTATION
//  Instrument panel. Mono-heavy, gauge cards, tick rulers,
//  the LIVE air reading leads the page.
// ═══════════════════════════════════════════════════════════
function KDExploreMessstation() {
  const S = KD_SEED;
  return (
    <KDPage height={680}>
      <KDRibbon label="KIEZ-DATEN · METAPHER C" />
      {/* Instrument strip */}
      <div style={{ background: KD_K.color.ink, color: KD_K.color.paper, padding: "16px 48px", display: "flex", alignItems: "center", gap: 26 }}>
        <div>
          <div style={{ fontFamily: KD_K.font.mono, fontSize: 10, letterSpacing: "0.18em", color: KD_K.color.ochre, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: KD_K.color.success }} />MESSSTATION NANSENSTRASSE · MC042 · LIVE
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>Luftgüte: <span style={{ color: KD_K.color.success }}>{S.air.lqi} · {S.air.label.DE}</span></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: 10 }}>
          {S.air.pollutants.map((p) => (
            <div key={p.n} style={{ border: "1.5px solid rgba(243,234,216,0.3)", borderRadius: KD_K.r.md, padding: "7px 13px", textAlign: "center", minWidth: 76 }}>
              <div style={{ fontFamily: KD_K.font.mono, fontSize: 9.5, opacity: 0.65 }}>{p.n}</div>
              <div style={{ fontFamily: KD_K.font.mono, fontSize: 20, fontWeight: 500, color: p.g <= 2 ? "#9fd08a" : p.g === 3 ? "#ecc76e" : "#e08a8a" }}>{p.g}</div>
            </div>
          ))}
        </div>
        {/* 7-day sparkline — the NEW history module */}
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <svg viewBox="0 0 170 44" width="170" height="44">
            {S.air.week.map((g, i) => (
              <rect key={i} x={i * 24} y={44 - g * 12} width={16} height={g * 12} rx={2}
                fill={g <= 2 ? "#9fd08a" : g === 3 ? "#ecc76e" : "#e08a8a"} opacity={i === 6 ? 1 : 0.55} />
            ))}
          </svg>
          <div style={{ fontFamily: KD_K.font.mono, fontSize: 9, opacity: 0.65, letterSpacing: "0.1em" }}>7-TAGE-VERLAUF · NEU†</div>
        </div>
      </div>

      <div style={{ padding: "26px 48px 0" }}>
        <div style={{ fontFamily: KD_K.font.mono, fontSize: 11, letterSpacing: "0.18em", color: KD_MOSS }}>KIEZ-DATEN · SCHILLERKIEZ · STAND {S.stand}</div>
        <h1 style={{ fontSize: 54, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "8px 0 22px" }}>
          Der Kiez, <span style={{ fontFamily: KD_K.font.serif, fontStyle: "italic", fontWeight: 400, color: KD_MOSS }}>gemessen</span>
        </h1>

        {/* Gauge card row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
          {[
            { l: "EINWOHNER", v: S.total.toLocaleString("de-DE"), sub: "▲ +180 seit H2 '24", map: true },
            { l: "ARBEITSLOSENQUOTE", v: "8,9 %", sub: "MSS 2023 · Mittel 4 PLR" },
            { l: "KINDERARMUT U15", v: "38,2 %", sub: "MSS 2023" },
            { l: "EINPERSONEN-HH", v: "6.410", sub: "AfS 2025 H2" },
          ].map((c) => (
            <div key={c.l} style={{ border: KD_K.border.inkBold, borderRadius: KD_K.r.lg, background: KD_K.color.paperWarm, boxShadow: KD_K.shadow.printSm(), padding: "16px 18px", position: "relative" }}>
              <div style={{ fontFamily: KD_K.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KD_K.color.inkMute }}>{c.l}</div>
              <div style={{ fontFamily: KD_K.font.mono, fontSize: 32, fontWeight: 500, marginTop: 6, letterSpacing: "-0.02em" }}>{c.v}</div>
              <div style={{ fontFamily: KD_K.font.mono, fontSize: 10, color: KD_MOSS, marginTop: 5 }}>{c.sub}</div>
              {c.map && <div style={{ position: "absolute", top: 12, right: 12 }}><KDMap size={34} /></div>}
              {/* tick ruler base */}
              <svg viewBox="0 0 200 8" style={{ width: "100%", marginTop: 10 }}>
                {Array.from({ length: 41 }, (_, i) => (
                  <line key={i} x1={i * 5} x2={i * 5} y1={i % 5 === 0 ? 0 : 3} y2={8} stroke={KD_K.color.rule} strokeWidth="1" />
                ))}
              </svg>
            </div>
          ))}
        </div>

        {/* Panel: trend as oscilloscope card */}
        <div style={{ marginTop: 20, border: KD_K.border.ink, borderRadius: KD_K.r.lg, background: KD_K.color.paperWarm, padding: "18px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontFamily: KD_K.font.mono, fontSize: 10.5, letterSpacing: "0.14em", color: KD_K.color.inkMute }}>KANAL 01 · BEVÖLKERUNG · 2021–2025</div>
            <div style={{ fontFamily: KD_K.font.mono, fontSize: 10.5, color: KD_MOSS }}>Δ +420 / 4 J.</div>
          </div>
          <svg viewBox="0 0 1130 120" style={{ width: "100%", marginTop: 8 }}>
            {[0, 1, 2].map((i) => <line key={i} x1={0} x2={1130} y1={20 + i * 40} y2={20 + i * 40} stroke={KD_K.color.rule} strokeWidth="1" strokeDasharray="2 6" />)}
            <polyline points={S.trend.map((t, i) => `${60 + i * 250},${100 - ((t.v - 25400) / 600) * 75}`).join(" ")} fill="none" stroke={KD_MOSS} strokeWidth="2.5" />
            {S.trend.map((t, i) => (
              <g key={t.t}>
                <circle cx={60 + i * 250} cy={100 - ((t.v - 25400) / 600) * 75} r="4" fill={KD_MOSS} />
                <text x={60 + i * 250} y={116} textAnchor="middle" fontFamily={KD_K.font.mono} fontSize="10.5" fill={KD_K.color.inkMute}>{t.t}</text>
              </g>
            ))}
          </svg>
        </div>

        <div style={{ marginTop: 16, fontFamily: KD_K.font.mono, fontSize: 10, color: KD_K.color.inkMute }}>
          † 7-Tage-Luftverlauf braucht einen neuen Messwert-Logger (Cron → Mongo). Die BLUME-API liefert nur den Augenblick.
        </div>
      </div>
      <KDNote top={330} right={40} rotate={2}>
        C · MESSSTATION — the live reading LEADS (ink instrument strip), everything framed as channels + gauges. Most „alive“, least editorial-warm.
      </KDNote>
    </KDPage>
  );
}

// ═══════════════════════════════════════════════════════════
//  CHART-STYLE COMPARISON · same data, three hands
// ═══════════════════════════════════════════════════════════
function KDChartCol({ title, dek, children, note }) {
  return (
    <div style={{ border: KD_K.border.ink, borderRadius: KD_K.r.lg, background: KD_K.color.paperWarm, padding: "20px 22px", display: "flex", flexDirection: "column" }}>
      <div style={{ fontFamily: KD_K.font.mono, fontSize: 10, letterSpacing: "0.14em", color: KD_MOSS, fontWeight: 500 }}>{title}</div>
      <div style={{ fontFamily: KD_K.font.serif, fontStyle: "italic", fontSize: 14.5, color: KD_K.color.inkSoft, margin: "4px 0 12px" }}>{dek}</div>
      {children}
      <div style={{ marginTop: "auto", paddingTop: 12, fontFamily: KD_K.font.mono, fontSize: 9.5, color: KD_K.color.inkMute, lineHeight: 1.55 }}>{note}</div>
    </div>
  );
}
function KDExploreChartStyles() {
  const S = KD_SEED;
  const bars = S.age.slice(0, 5);
  const line = S.trend;
  const toLineY = (v) => 96 - ((v - 25400) / 600) * 70;

  return (
    <KDPage height={740}>
      <KDRibbon label="KIEZ-DATEN · CHART-SPRACHE" />
      <div style={{ padding: "30px 48px 0" }}>
        <div style={{ fontFamily: KD_K.font.mono, fontSize: 11, letterSpacing: "0.18em", color: KD_MOSS }}>DIESELBEN DATEN · DREI HANDSCHRIFTEN</div>
        <h1 style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em", margin: "8px 0 22px" }}>
          Wie zeichnet der Kiosk <span style={{ fontFamily: KD_K.font.serif, fontStyle: "italic", fontWeight: 400, color: KD_MOSS }}>Zahlen</span>?
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 22, alignItems: "stretch" }}>
          {/* A · hand-drawn riso */}
          <KDChartCol title="STIL A · HANDGEZEICHNET" dek="Wacklige Linien, versetzter Riso-Druck." note="+ maximal eigen, warm — − bei dichten Charts (4 PLR-Linien) schnell unruhig; Präzisionseindruck leidet.">
            <svg viewBox="0 0 330 240" style={{ width: "100%" }}>
              <polyline points={kdWobLine(50, 8, 50, 200, 3)} fill="none" stroke={KD_K.color.ink} strokeWidth="1.6" />
              <polyline points={kdWobLine(50, 200, 320, 200, 4)} fill="none" stroke={KD_K.color.ink} strokeWidth="1.6" />
              {bars.map((a, i) => {
                const w = (a.n / 9800) * 230, y = i * 37 + 16;
                return (
                  <g key={a.g}>
                    <text x={44} y={y + 14} textAnchor="end" fontFamily={KD_K.font.mono} fontSize="10.5" fill={KD_K.color.inkSoft}>{a.g}</text>
                    {/* offset riso fill + wobbly outline */}
                    <path d={kdWobRect(54, y + 3, w, 17, i + 2)} fill={KD_MOSS} opacity="0.45" transform="translate(2.5,2)" />
                    <path d={kdWobRect(52, y + 1, w, 17, i + 9)} fill="none" stroke={KD_K.color.ink} strokeWidth="1.7" />
                    <text x={58 + w} y={y + 14} fontFamily={KD_K.font.mono} fontSize="10" fill={KD_K.color.ink}>{a.p}%</text>
                  </g>
                );
              })}
            </svg>
          </KDChartCol>

          {/* B · precise editorial */}
          <KDChartCol title="STIL B · PRÄZISE EDITORIAL" dek="Haarlinien-Achsen, Serifenziffern, Riso nur als Fläche." note="+ ruhig, glaubwürdig, skaliert auf alle 7 Chartfamilien — − am wenigsten ‚handgemacht'.">
            <svg viewBox="0 0 330 240" style={{ width: "100%" }}>
              {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={52} x2={320} y1={30 + i * 42} y2={30 + i * 42} stroke={KD_K.color.rule} strokeWidth="0.8" />)}
              {bars.map((a, i) => {
                const w = (a.n / 9800) * 230, y = i * 37 + 16;
                return (
                  <g key={a.g}>
                    <text x={44} y={y + 14} textAnchor="end" fontFamily={KD_K.font.mono} fontSize="10.5" fill={KD_K.color.inkSoft}>{a.g}</text>
                    <rect x={52} y={y + 1} width={w} height={17} fill={KD_MOSS} opacity={0.3 + 0.7 * (a.n / 9800)} />
                    <text x={58 + w} y={y + 14} fontFamily={KD_K.font.serif} fontSize="12" fill={KD_K.color.ink}>{a.p}%</text>
                  </g>
                );
              })}
              <line x1={52} y1={10} x2={52} y2={202} stroke={KD_K.color.ink} strokeWidth="1.2" />
            </svg>
          </KDChartCol>

          {/* C · mix */}
          <KDChartCol title="STIL C · MISCHUNG ◀ EMPFEHLUNG" dek="Präzise Achsen, handgedruckte Datenmarken." note="+ Lesbarkeit von B, Charakter von A: Achsen tragen die Wahrheit, die Daten tragen den Druck. Empfohlen.">
            <svg viewBox="0 0 330 240" style={{ width: "100%" }}>
              {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={52} x2={320} y1={30 + i * 42} y2={30 + i * 42} stroke={KD_K.color.rule} strokeWidth="0.8" />)}
              <line x1={52} y1={10} x2={52} y2={202} stroke={KD_K.color.ink} strokeWidth="1.2" />
              {bars.map((a, i) => {
                const w = (a.n / 9800) * 230, y = i * 37 + 16;
                return (
                  <g key={a.g}>
                    <text x={44} y={y + 14} textAnchor="end" fontFamily={KD_K.font.mono} fontSize="10.5" fill={KD_K.color.inkSoft}>{a.g}</text>
                    <path d={kdWobRect(54, y + 3, w, 17, i + 2)} fill={KD_MOSS} opacity="0.42" transform="translate(2,1.6)" />
                    <path d={kdWobRect(52, y + 1, w, 17, i + 9)} fill="none" stroke={KD_K.color.ink} strokeWidth="1.5" />
                    <text x={58 + w} y={y + 14} fontFamily={KD_K.font.mono} fontSize="10" fill={KD_K.color.ink}>{a.p}%</text>
                  </g>
                );
              })}
            </svg>
          </KDChartCol>
        </div>

        {/* Line-chart row in the same three hands */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 22, marginTop: 18 }}>
          {["A", "B", "C"].map((style) => (
            <div key={style} style={{ border: KD_K.border.hair, borderRadius: KD_K.r.md, background: KD_K.color.paper, padding: "12px 16px" }}>
              <div style={{ fontFamily: KD_K.font.mono, fontSize: 9, letterSpacing: "0.14em", color: KD_K.color.inkMute, marginBottom: 4 }}>DERSELBE TREND · STIL {style}</div>
              <svg viewBox="0 0 330 116" style={{ width: "100%" }}>
                {style !== "A" && [0, 1, 2].map((i) => <line key={i} x1={20} x2={320} y1={20 + i * 32} y2={20 + i * 32} stroke={KD_K.color.rule} strokeWidth="0.8" />)}
                {style === "A" && <polyline points={kdWobLine(20, 96, 320, 96, 7)} fill="none" stroke={KD_K.color.ink} strokeWidth="1.4" />}
                {style === "B"
                  ? <polyline points={line.map((t, i) => `${30 + i * 70},${toLineY(t.v)}`).join(" ")} fill="none" stroke={KD_MOSS} strokeWidth="2.2" />
                  : line.slice(0, -1).map((t, i) => (
                    <polyline key={i} points={kdWobLine(30 + i * 70, toLineY(t.v), 30 + (i + 1) * 70, toLineY(line[i + 1].v), i + 3, style === "A" ? 2.2 : 1.4, 5)} fill="none" stroke={KD_MOSS} strokeWidth="2.2" />
                  ))}
                {line.map((t, i) => (
                  style === "B"
                    ? <circle key={t.t} cx={30 + i * 70} cy={toLineY(t.v)} r="3.5" fill={KD_MOSS} />
                    : <g key={t.t}>
                        <circle cx={30 + i * 70 + 1.5} cy={toLineY(t.v) + 1.2} r="3.5" fill={KD_MOSS} opacity="0.45" />
                        <circle cx={30 + i * 70} cy={toLineY(t.v)} r="3.5" fill="none" stroke={KD_K.color.ink} strokeWidth="1.4" />
                      </g>
                ))}
              </svg>
            </div>
          ))}
        </div>
      </div>
    </KDPage>
  );
}

Object.assign(window, {
  KDExploreAmtsblatt, KDExploreAlmanach, KDExploreMessstation, KDExploreChartStyles,
  KD_SEED, KDMap, kdWobLine, kdWobRect,
});

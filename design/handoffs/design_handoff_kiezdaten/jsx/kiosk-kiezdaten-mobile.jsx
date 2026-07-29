/* global React */

// ══════════════════════════════════════════════════════════
//  KIEZ-DATEN PASS · mobile (390)
//  Same broadsheet order, one column. Selector = map + chips.
// ══════════════════════════════════════════════════════════

const { kiosk: KZM, paperGrainStyle: KZM_grain, kioskFonts: KZM_fonts, KDMap: KZMMap } = window;
const { KZ_DATA: MD, KZ_T: MT, KZ_NUM: MN, KZ_PCT: MP, KZ_PLR_COLORS: MC, KZ_MOSS: MMOSS, KZBar: MBar, KZLine: MLine, KZGrid: MGrid, KZDonut: MDonut, KZInstrumentStrip: MStrip } = window;

function KZMHeader({ lang }) {
  return (
    <header style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px dashed ${KZM.color.rule}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 32, height: 32, background: KZM.color.wine, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: KZM.color.paper, fontFamily: KZM.font.serif, fontStyle: "italic", fontSize: 20, border: KZM.border.ink }}>m</div>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em" }}>mahalle</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", border: KZM.border.ink, borderRadius: KZM.r.pill, overflow: "hidden", fontFamily: KZM.font.mono, fontSize: 10, fontWeight: 600 }}>
          <span style={{ padding: "4px 8px", background: lang === "DE" ? KZM.color.ink : "transparent", color: lang === "DE" ? KZM.color.paper : KZM.color.ink }}>DE</span>
          <span style={{ padding: "4px 8px", background: lang === "EN" ? KZM.color.ink : "transparent", color: lang === "EN" ? KZM.color.paper : KZM.color.ink, borderLeft: KZM.border.ink }}>EN</span>
        </div>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: KZM.color.ochre, border: KZM.border.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700 }}>EA</div>
      </div>
    </header>
  );
}

function KZMCard({ label, children, style }) {
  return (
    <div style={{ border: KZM.border.ink, borderRadius: KZM.r.lg, background: KZM.color.paperWarm, padding: "13px 15px", ...style }}>
      {label && <div style={{ fontFamily: KZM.font.mono, fontSize: 9, letterSpacing: "0.14em", color: KZM.color.inkMute, marginBottom: 8 }}>{label}</div>}
      {children}
    </div>
  );
}

function KiezIndexMobile({ lang = "DE" }) {
  const A = MD.areas[0];
  const min = Math.min(...A.trend), max = Math.max(...A.trend);
  const toY = (v) => 84 - ((v - min) / (max - min || 1)) * 58;
  const S = MD.socTrend;
  const migLegs = [
    { l: MT(lang, "Ausländ. Nachbar:innen", "Foreign nationals"), v: A.mig.a, c: KZM.color.teal },
    { l: MT(lang, "Deutsche mit MG", "Germans w/ mig. bg"), v: A.mig.mh, c: KZM.color.wine },
    { l: MT(lang, "Ohne MG", "No mig. background"), v: A.mig.o, c: KZM.color.ochre },
  ];
  const socRows = [
    { l: MT(lang, "Arbeitslosenquote", "Unemployment"), v: A.social.alq, c: KZM.color.teal, th: 0 },
    { l: MT(lang, "Kinderarmut (U15)", "Child poverty (U15)"), v: A.social.ka, c: KZM.color.wine, th: 3 },
    { l: MT(lang, "Transferleistungen", "Transfer benefits"), v: A.social.tr, c: KZM.color.ochre, th: 1 },
  ];
  return (
    <div style={{ width: 390, background: KZM.color.paper, color: KZM.color.ink, fontFamily: KZM.font.display, position: "relative", overflow: "hidden", minHeight: 2140 }} data-screen-label={`Kiez-Daten mobile ${lang}`}>
      <style>{KZM_fonts}</style>
      <div style={{ ...KZM_grain, zIndex: 2 }} />
      <KZMHeader lang={lang} />
      <MStrip lang={lang} compact />

      {/* Title + ZdW */}
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px dashed ${KZM.color.rule}` }}>
        <div style={{ fontFamily: KZM.font.mono, fontSize: 9.5, color: MMOSS, letterSpacing: "0.14em" }}>KIEZ-DATEN · {MT(lang, "STAND", "AS OF")} {MD.stand}</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "6px 0 0" }}>
          {lang === "DE"
            ? <React.Fragment>Der Kiez, <span style={{ fontFamily: KZM.font.serif, fontStyle: "italic", fontWeight: 400, color: MMOSS }}>gemessen</span></React.Fragment>
            : <React.Fragment>The Kiez, <span style={{ fontFamily: KZM.font.serif, fontStyle: "italic", fontWeight: 400, color: MMOSS }}>measured</span></React.Fragment>}
        </h1>
        <div style={{ marginTop: 14, border: KZM.border.inkBold, borderRadius: KZM.r.lg, background: KZM.color.paperWarm, boxShadow: KZM.shadow.printSm(), padding: "12px 15px", transform: "rotate(0.5deg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: KZM.font.mono, fontSize: 8.5, letterSpacing: "0.12em", color: KZM.color.inkMute }}>
            <span style={{ color: MMOSS, fontWeight: 500 }}>{MT(lang, "ZAHL DER WOCHE", "FIGURE OF THE WEEK")}</span><span>{MD.zdw.kw}</span>
          </div>
          <div style={{ fontFamily: KZM.font.mono, fontSize: 32, fontWeight: 500, margin: "5px 0 2px" }}>{lang === "DE" ? MD.zdw.value : MD.zdw.value.replace(",", ".")}</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.4, color: KZM.color.inkSoft }}>{MD.zdw.text[lang]}</div>
          <div style={{ marginTop: 8, fontFamily: KZM.font.mono, fontSize: 10.5, color: MMOSS, fontWeight: 500 }}>{MT(lang, "im Forum diskutieren →", "discuss in the forum →")}</div>
        </div>
      </div>

      {/* Selector */}
      <div style={{ padding: "14px 18px", display: "flex", gap: 14, alignItems: "center", borderBottom: `1px dashed ${KZM.color.rule}` }}>
        <KZMMap size={56} accent={MMOSS} highlight="all" />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MD.areas.map((a) => (
            <span key={a.code} style={{
              padding: "6px 10px", fontSize: 11, fontWeight: 600, borderRadius: KZM.r.pill, border: KZM.border.ink,
              background: a.code === "all" ? KZM.color.ink : "transparent", color: a.code === "all" ? KZM.color.paper : KZM.color.ink,
              minHeight: 30, display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: MC[a.code] }} />
              {a.code === "all" ? MT(lang, "Gesamt", "Total") : a.short}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* K01 */}
        <KZMCard label={`${MT(lang, "KANAL", "CHANNEL")} 01 · ${MT(lang, "BEVÖLKERUNG", "POPULATION")}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: KZM.font.mono, fontSize: 28, fontWeight: 500 }}>{MN(A.pop, lang)}</span>
            <span style={{ fontFamily: KZM.font.mono, fontSize: 10, color: MMOSS }}>Δ {A.delta} / H2 '24</span>
          </div>
          <svg viewBox="0 0 330 108" style={{ width: "100%", marginTop: 6 }}>
            <MGrid x1={12} x2={322} rows={3} top={16} step={30} />
            <MLine pts={A.trend.map((v, i) => [30 + i * 68, toY(v)])} color={MMOSS} seed={4} width={2} />
            {MD.trendLabels.map((t, i) => (
              <text key={t} x={30 + i * 68} y={103} textAnchor="middle" fontFamily={KZM.font.mono} fontSize="8.5" fill={KZM.color.inkMute}>{t}</text>
            ))}
          </svg>
          <div style={{ fontFamily: KZM.font.mono, fontSize: 9.5, color: KZM.color.inkSoft, marginTop: 4 }}>
            ♂ {MN(A.m, lang)} · ♀ {MN(A.f, lang)} · {MN(A.einp, lang)} {MT(lang, "Einpersonen-HH", "single-person hh")}
          </div>
        </KZMCard>

        {/* K02 */}
        <KZMCard label={`${MT(lang, "KANAL", "CHANNEL")} 02 · ${MT(lang, "ALTER", "AGE")}`}>
          <svg viewBox="0 0 330 190" style={{ width: "100%" }}>
            <line x1={46} y1={4} x2={46} y2={180} stroke={KZM.color.ink} strokeWidth="1" />
            {A.age.map((p, i) => {
              const w = (p / 42) * 250, y = i * 26 + 6;
              return (
                <g key={i}>
                  <text x={40} y={y + 12} textAnchor="end" fontFamily={KZM.font.mono} fontSize="9.5" fill={KZM.color.inkSoft}>{MD.ageLabels[i]}</text>
                  <MBar x={46} y={y} w={w} h={14} seed={i + 2} color={MMOSS} opacity={0.28 + 0.5 * (p / 38)} />
                  <text x={52 + w} y={y + 12} fontFamily={KZM.font.mono} fontSize="9" fill={KZM.color.ink}>{MP(p, lang)}</text>
                </g>
              );
            })}
          </svg>
        </KZMCard>

        {/* K03 */}
        <KZMCard label={`${MT(lang, "KANAL", "CHANNEL")} 03 · ${MT(lang, "VIELFALT", "DIVERSITY")}`}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <MDonut segs={migLegs} size={108} />
            <div style={{ flex: 1 }}>
              {migLegs.map((s) => (
                <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: `1px dashed ${KZM.color.rule}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c, border: `1px solid ${KZM.color.ink}` }} />
                  <span style={{ fontSize: 10.5, color: KZM.color.inkSoft, flex: 1, lineHeight: 1.25 }}>{s.l}</span>
                  <span style={{ fontFamily: KZM.font.mono, fontSize: 12, fontWeight: 500 }}>{MP(s.v, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        </KZMCard>

        {/* K04 */}
        <KZMCard label={`${MT(lang, "KANAL", "CHANNEL")} 04 · ${MT(lang, "SOZIALE LAGE", "SOCIAL SITUATION")} · MSS 2023`}>
          {socRows.map((r, i) => (
            <div key={r.l} style={{ padding: "7px 0", borderBottom: i < 2 ? `1px dashed ${KZM.color.rule}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
                <span>{r.l}</span>
                <span style={{ fontFamily: KZM.font.mono }}>{MP(r.v, lang)}</span>
              </div>
              <svg viewBox="0 0 330 16" style={{ width: "100%", marginTop: 4 }}>
                <MBar x={1} y={1} w={(r.v / 50) * 326} h={11} seed={i + 11} color={r.c} opacity={0.5} />
              </svg>
              {r.th > 0 && (
                <div style={{ fontFamily: KZM.font.mono, fontSize: 9.5, color: MMOSS, marginTop: 3, fontWeight: 500 }}>
                  ♨ {r.th} {MT(lang, r.th === 1 ? "Gespräch im Forum" : "Gespräche im Forum", r.th === 1 ? "forum thread" : "forum threads")} →
                </div>
              )}
            </div>
          ))}
        </KZMCard>

        {/* K05 */}
        <KZMCard label={`${MT(lang, "KANAL", "CHANNEL")} 05 · ${MT(lang, "SOZIALE ENTWICKLUNG", "SOCIAL DEVELOPMENT")} · 2013–2023`}>
          <svg viewBox="0 0 330 130" style={{ width: "100%" }}>
            <MGrid x1={10} x2={322} rows={4} top={12} step={28} />
            <line x1={214} y1={6} x2={214} y2={108} stroke={KZM.color.inkMute} strokeWidth="1" strokeDasharray="3 3" />
            <text x={218} y={14} fontFamily={KZM.font.mono} fontSize="7.5" fill={KZM.color.inkMute}>LOR 2021</text>
            {[["alq", KZM.color.teal], ["ka", KZM.color.wine], ["tr", KZM.color.ochre]].map(([k, c], si) => (
              <MLine key={k} pts={S.gesamt[k].map((v, i) => [24 + i * 58, 104 - ((v - 6) / 42) * 88])} color={c} seed={si * 4 + 1} width={1.8} dots={false} />
            ))}
            {S.years.map((y, i) => (
              <text key={y} x={24 + i * 58} y={124} textAnchor="middle" fontFamily={KZM.font.mono} fontSize="8.5" fill={KZM.color.inkMute}>{y}</text>
            ))}
          </svg>
          <div style={{ fontFamily: KZM.font.mono, fontSize: 8.5, color: KZM.color.inkMute, marginTop: 4, lineHeight: 1.5 }}>
            § {MT(lang, "Gebietsreform 2021 — Linien amtlich zusammengeführt.", "2021 boundary reform — series merged, break marked.")}
          </div>
        </KZMCard>

        {/* footer */}
        <div style={{ textAlign: "center", padding: "6px 0 10px" }}>
          <div style={{ display: "inline-block", padding: "10px 20px", border: KZM.border.ink, borderRadius: KZM.r.pill, fontFamily: KZM.font.mono, fontSize: 11.5, fontWeight: 600, boxShadow: KZM.shadow.printSm(), minHeight: 44, boxSizing: "border-box" }}>
            {MT(lang, "⎙ Kiez in Zahlen · A4 drucken", "⎙ Kiez in figures · print A4")}
          </div>
          <div style={{ fontFamily: KZM.font.mono, fontSize: 8.5, color: KZM.color.inkMute, marginTop: 10, lineHeight: 1.6 }}>
            AfS · MSS · BLUME (mc042) · † {MT(lang, "Verlauf braucht Logger", "course needs logger")}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { KiezIndexMobile });

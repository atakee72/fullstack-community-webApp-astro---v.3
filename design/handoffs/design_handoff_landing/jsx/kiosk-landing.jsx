/* global React */
// ══════════════════════════════════════════════════════════
//  LANDING PASS · Das Schaufenster (12. Fläche)
//  Konsens CD+CC+User Aug 16 2026: EIN-Viewport-Editorial,
//  ink-led, Heartbeat mit Zero-Regel, Teaser nur Öffentliches,
//  EIN Mitmachen-CTA (ochre). Eingeloggt → Redirect /forum.
// ══════════════════════════════════════════════════════════
const LK = window.kiosk;
const LND_CSS = `@keyframes lndPulse{0%,100%{opacity:.3}50%{opacity:1}}`;
const LND_L = {
  DE: {
    date: "SONNTAG · 16. AUGUST 2026", loc: "SCHILLERKIEZ · BERLIN-NEUKÖLLN", signin: "Anmelden →",
    manifest: "Der Kiez hat einen Ort. Reden, tauschen, treffen — hier, wo du wohnst.",
    stripRight: "STÜNDLICH AKTUALISIERT",
    rows: [
      { c: "#9db97c", t: "LUFT IM KIEZ: GUT", spark: true },
      { c: "#d16a87", t: "12 BEITRÄGE DIESE WOCHE" },
      { c: "#6fb5c4", t: "3 TERMINE AM WOCHENENDE" },
      { c: "paper", t: "AUSGABE NR. 214 ERSCHIENEN" },
    ],
    blogK: "AUS DER BEILAGE", blogT: "Die Cafés der Schillerpromenade — ein Spaziergang",
    blogS: "Sechs Orte zwischen Herrfurthplatz und Silbersteinstraße, an denen der Kiez seinen Kaffee trinkt.",
    blogM: "08. APRIL 2026 · MAHALLE TEAM", blog2: "Grüne Ecken: die stillen Plätze des Kiezes", blog2M: "20. MÄRZ 2026",
    blogLink: "Zur Beilage →",
    datenK: "DER KIEZ, GEMESSEN", datenN: "25.900", datenL: "NACHBAR:INNEN IM SCHILLERKIEZ",
    datenAir: "Luft heute: gut", datenSpark: "LETZTE 7 TAGE", datenLink: "Alle Zahlen →",
    kurierK: "DER KURIER · HEUTE AUSGEWÄHLT",
    kurierNote: "Aus 9 Quellen kuratiert — jeder Link führt zur Quelle.",
    heads: [
      { t: "Herrfurthplatz: Gebietsfonds fördert zwei Nachbarschaftsfeste im September", s: "TAGESSPIEGEL ↗" },
      { t: "Tempelhofer Feld: neue Regeln für die Grillzonen ab Herbst", s: "RBB24 ↗" },
      { t: "Neukölln testet Kiezblocks — der Schillerkiez steht auf der Liste", s: "BERLINER ZEITUNG ↗" },
    ],
    ctaH: "Mach mit im Kiez.", ctaBtn: "Mitmachen — kostenlos",
    ctaSub: "FÜR NACHBAR:INNEN IM SCHILLERKIEZ · ANMELDUNG IN ZWEI MINUTEN",
    slogan: "„Das hier wird, was wir draus machen.“",
    foot: ["Impressum", "Datenschutz", "Über das Projekt", "Förderung: Gebietsfonds", "Kontakt", "GitHub ↗"],
    copyright: "© 2026 MAHALLE · SCHILLERKIEZ",
  },
  EN: {
    date: "SUNDAY · 16 AUGUST 2026", loc: "SCHILLERKIEZ · BERLIN-NEUKÖLLN", signin: "Sign in →",
    manifest: "The Kiez has a place. Talk, swap, meet — right where you live.",
    stripRight: "UPDATED HOURLY",
    rows: [
      { c: "#9db97c", t: "KIEZ AIR: GOOD", spark: true },
      { c: "#d16a87", t: "12 POSTS THIS WEEK" },
      { c: "#6fb5c4", t: "3 EVENTS THIS WEEKEND" },
      { c: "paper", t: "ISSUE NO. 214 OUT NOW" },
    ],
    blogK: "FROM THE SUPPLEMENT", blogT: "The cafés of Schillerpromenade — a stroll",
    blogS: "Six places between Herrfurthplatz and Silbersteinstraße where the Kiez drinks its coffee.",
    blogM: "APRIL 8, 2026 · MAHALLE TEAM", blog2: "Green corners: the quiet places of the Kiez", blog2M: "MARCH 20, 2026",
    blogLink: "Read the supplement →",
    datenK: "THE KIEZ, MEASURED", datenN: "25,900", datenL: "NEIGHBORS IN SCHILLERKIEZ",
    datenAir: "Air today: good", datenSpark: "LAST 7 DAYS", datenLink: "All figures →",
    kurierK: "KURIER · TODAY’S PICKS",
    kurierNote: "Curated from 9 sources — every link goes to the source.",
    heads: [
      { t: "Herrfurthplatz: Gebietsfonds fördert zwei Nachbarschaftsfeste im September", s: "TAGESSPIEGEL ↗" },
      { t: "Tempelhofer Feld: neue Regeln für die Grillzonen ab Herbst", s: "RBB24 ↗" },
      { t: "Neukölln testet Kiezblocks — der Schillerkiez steht auf der Liste", s: "BERLINER ZEITUNG ↗" },
    ],
    ctaH: "Join your Kiez.", ctaBtn: "Join — it’s free",
    ctaSub: "FOR NEIGHBORS IN SCHILLERKIEZ · SIGN-UP TAKES TWO MINUTES",
    slogan: "“This becomes what we make of it.”",
    foot: ["Impressum", "Privacy", "About the project", "Funding: Gebietsfonds", "Contact", "GitHub ↗"],
    copyright: "© 2026 MAHALLE · SCHILLERKIEZ",
  },
};

function LndSpark({ w = 62, h = 16, stroke = "#9db97c" }) {
  return (
    <svg width={w} height={h} viewBox="0 0 62 16" style={{ flexShrink: 0 }}>
      <polyline points="1,11 10,9.5 19,12 29,7 39,8.5 50,4 61,5.5" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Heartbeat-Strip · Zero-Regel render-seitig: rows kommen bereits gefiltert an (1–4).
function LndStrip({ rows, right, compact }) {
  return (
    <div style={{ background: LK.color.ink, color: LK.color.paper, display: "flex", alignItems: "stretch", padding: compact ? "0 12px" : "0 48px" }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: compact ? "13px 10px" : "13px 18px", borderLeft: i ? "1px solid rgba(243,234,216,0.22)" : "none", flex: r.spark && !compact ? "1.2" : "1", minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: r.c === "paper" ? LK.color.paper : r.c, opacity: r.mute ? 0.45 : 1, animation: r.mute ? "none" : "lndPulse 2.4s ease-in-out infinite" }} />
          <span style={{ fontFamily: LK.font.mono, fontSize: compact ? 9.5 : 10.5, letterSpacing: compact ? "0.06em" : "0.1em", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: r.mute ? "rgba(243,234,216,0.55)" : LK.color.paper }}>{r.t}</span>
          {r.spark && !compact && <LndSpark />}
        </div>
      ))}
      {right && !compact && <div style={{ display: "flex", alignItems: "center", padding: "13px 0 13px 18px", borderLeft: "1px solid rgba(243,234,216,0.22)", marginLeft: "auto" }}>
        <span style={{ fontFamily: LK.font.mono, fontSize: 9.5, letterSpacing: "0.12em", color: "rgba(243,234,216,0.5)", whiteSpace: "nowrap" }}>{right}</span>
      </div>}
    </div>
  );
}

function LndRule() {
  return (<div style={{ padding: "0 48px" }}><div style={{ height: 3, background: LK.color.ink }} /><div style={{ height: 1, background: LK.color.ink, marginTop: 3 }} /></div>);
}

function LndLink({ children, color = LK.color.ink }) {
  return <span style={{ fontFamily: LK.font.display, fontSize: 13, fontWeight: 700, color, textDecoration: "underline", textDecorationStyle: "dashed", textUnderlineOffset: 3, cursor: "pointer" }}>{children}</span>;
}

function LndKicker({ t, c, fill }) {
  const base = { fontFamily: LK.font.mono, fontSize: 10.5, fontWeight: 500, letterSpacing: "0.16em" };
  return (
    <div style={{ borderBottom: `1px dashed ${LK.color.rule}`, paddingBottom: 7, marginBottom: 14 }}>
      <span style={fill ? { ...base, background: c, color: LK.color.paper, padding: "3px 9px 4px", display: "inline-block" } : { ...base, color: c }}>{t}</span>
    </div>
  );
}

function LndCta({ L, mobile, warm }) {
  return (
    <div style={{ textAlign: "center", padding: mobile ? "26px 18px 26px" : "26px 48px 28px", borderTop: warm ? `1px dashed ${LK.color.ochre}` : `1px dashed ${LK.color.rule}`, background: warm ? "rgba(176,117,21,0.10)" : "none" }}>
      <h2 style={{ fontFamily: LK.font.display, fontSize: mobile ? 26 : 30, fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 16px" }}>{L.ctaH}</h2>
      <button style={{ background: LK.color.ink, color: LK.color.paper, fontFamily: LK.font.display, fontSize: mobile ? 15 : 16, fontWeight: 700, padding: mobile ? "13px 26px" : "13px 30px", minHeight: 48, borderRadius: LK.r.pill, border: `1.5px solid ${LK.color.ink}`, boxShadow: LK.shadow.print(LK.color.ochre), cursor: "pointer" }}>{L.ctaBtn}</button>
      <div style={{ fontFamily: LK.font.mono, fontSize: 9.5, letterSpacing: "0.12em", color: LK.color.inkMute, marginTop: 13 }}>{L.ctaSub}</div>
      <div style={{ fontFamily: LK.font.serif, fontStyle: "italic", fontSize: mobile ? 18 : 21, color: LK.color.ink, marginTop: 16 }}>{L.slogan}</div>
    </div>
  );
}

function LndFooter({ L, mobile }) {
  return (
    <footer style={{ borderTop: LK.border.hair, padding: mobile ? "16px 18px 20px" : "15px 48px 20px", display: "flex", flexWrap: "wrap", gap: mobile ? "8px 14px" : 16, alignItems: "baseline", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: mobile ? "8px 14px" : 16 }}>
        {L.foot.map((f) => <span key={f} style={{ fontFamily: LK.font.mono, fontSize: 10, letterSpacing: "0.08em", color: LK.color.inkSoft, textDecoration: "underline", textDecorationStyle: "dashed", textUnderlineOffset: 3, cursor: "pointer" }}>{f}</span>)}
      </div>
      <span style={{ fontFamily: LK.font.mono, fontSize: 10, letterSpacing: "0.08em", color: LK.color.inkMute }}>{L.copyright}</span>
    </footer>
  );
}

function LndWordmark({ size = 96 }) {
  return (
    <h1 style={{ fontFamily: LK.font.display, fontSize: size, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 0.95, margin: 0, color: LK.color.ink }}>
      M<span style={{ fontFamily: LK.font.serif, fontStyle: "italic", fontWeight: 400, letterSpacing: 0 }}>a</span>halle
    </h1>
  );
}

// Riso-Überdruck-Bänder · alle Flächen-Akzente, diagonal unten-links → oben-rechts.
// Multiply + niedrige Deckung = Overprint, nie Backdrop; Ink-Text bleibt Chef.
const LND_RIB = [
  { c: "#7a4256", h: 40, o: 0.13 },
  { c: "#2e6f7a", h: 72, o: 0.14 },
  { c: "#a3552e", h: 34, o: 0.13 },
  { c: "#6b8a4a", h: 88, o: 0.12 },
  { c: "#b07515", h: 52, o: 0.14 },
];
function LndRibbons() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: -360, top: "46%", width: 2200, transform: "rotate(-17deg)", display: "flex", flexDirection: "column", gap: 30 }}>
        {LND_RIB.map((r, i) => <div key={i} style={{ height: r.h, background: r.c, opacity: r.o, mixBlendMode: "multiply" }} />)}
      </div>
    </div>
  );
}

// Randmotiv · User-Bild (Riso-Bänder) als Ecken-Motiv: nur Ecke unten-links + Ecke oben-rechts,
// weich ausmaskiert, multiply — Textspalten bleiben auf ruhigem Papier.
function LndRibbonArt() {
  const img = "uploads/grafik-da54647d.png";
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: -170, bottom: -150, width: 620, height: 460, backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "left bottom", mixBlendMode: "multiply", opacity: 0.9, transform: "rotate(6deg)", WebkitMaskImage: "radial-gradient(ellipse 62% 62% at 18% 88%, #000 38%, transparent 72%)", maskImage: "radial-gradient(ellipse 62% 62% at 18% 88%, #000 38%, transparent 72%)" }} />
      <div style={{ position: "absolute", right: -190, top: -140, width: 560, height: 420, backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "right top", mixBlendMode: "multiply", opacity: 0.85, transform: "rotate(186deg)", WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 68%)", maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 68%)" }} />
    </div>
  );
}

// Vollbild-Hintergrund · User-Bild „background_landing_page“: ein Bänderzug oben-links → unten-rechts,
// leicht geblurrt + multiply, damit der Zeitungssatz drüber lesbar bleibt.
// Vollbild-Hintergrund · User-Bild „background_landing_page“: verkleinert (kein cover), Bänderzug läuft
// diagonal durch die Seitenmitte; blur mild, Deckung niedrig — Lesbarkeit vor Farbe.
// Vollbild-Hintergrund · User-Bild „background_landing_page“: verkleinert, flache Oberkante des
// Bänderzugs bündig an der Seiten-Oberkante; kein Blur, multiply — Satz liegt drüber (z-Stapel).
// Vollbild-Hintergrund · User-Bild „background_landing_page-transparent“ (halbtransparente Aquarell-Bänder):
// 1:1 auf Seitenbreite, Oberkante am Seitenkopf, multiply gegen weißen Bildgrund — Satz liegt drüber.
// Vollbild-Hintergrund · flip=true spiegelt den Bänderzug (180°): startet unten-rechts statt oben-links.
// Bild-URL läuft über das versteckte <img id="lnd-bg-asset"> im Haupt-HTML — so fängt der
// Bundler das Asset (data:-URL im Self-contained-Bundle); Fallback = Projektpfad.
function lndBgSrc() {
  const el = document.getElementById("lnd-bg-asset");
  return (el && el.src) || "uploads/background_landing_page-transparent.png";
}
function LndBgFull({ flip, strong, fill }) {
  const src = lndBgSrc();
  return (
    <div className="lnd-bg" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${src})`, backgroundSize: flip ? "cover" : "100% auto", backgroundRepeat: "no-repeat", backgroundPosition: "center top", mixBlendMode: "multiply", opacity: strong ? 0.42 : 0.16, transform: flip ? (strong ? "rotate(180deg) scale(1.22) translate(40px, -30px)" : "rotate(180deg)") : "none" }} />
      {fill && <div style={{ position: "absolute", left: -60, top: -50, width: 760, height: 520, backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "left top", backgroundRepeat: "no-repeat", mixBlendMode: "multiply", opacity: 0.42, WebkitMaskImage: "radial-gradient(ellipse 68% 68% at 12% 10%, #000 42%, transparent 74%)", maskImage: "radial-gradient(ellipse 68% 68% at 12% 10%, #000 42%, transparent 74%)" }} />}
    </div>
  );
}

// ─── Desktop 1280 ───
function LandingDesktop({ lang = "DE", warm, ribbons, ribbonArt, bgFull, bgFlip, bgTuck, bgFill }) {
  const L = LND_L[lang];
  return (
    <div className={bgFull ? "lnd-root" : undefined} style={{ width: 1280, height: 960, background: LK.color.paper, color: LK.color.ink, fontFamily: LK.font.display, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <style>{kioskFonts + LND_CSS + (bgFull ? ".lnd-root>*{position:relative;z-index:1}.lnd-root>.lnd-bg{z-index:0}" : "")}</style>
      <div style={paperGrainStyle} />
      {ribbons && <LndRibbons />}
      {ribbonArt && <LndRibbonArt />}
      {bgFull && <LndBgFull flip={bgFlip} strong={bgTuck} fill={bgFill} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 48px", borderBottom: LK.border.hair, fontFamily: LK.font.mono, fontSize: 10, letterSpacing: "0.12em", color: LK.color.inkMute }}>
        <span>{L.date}</span>
        <span>{L.loc}</span>
        <span style={{ display: "flex", gap: 18 }}>
          <span style={{ color: LK.color.ink, textDecoration: "underline", textDecorationStyle: "dashed", textUnderlineOffset: 3, cursor: "pointer" }}>{L.signin}</span>
          <span><b style={{ color: LK.color.ink }}>{lang}</b> | {lang === "DE" ? "EN" : "DE"}</span>
        </span>
      </div>
      <header style={{ textAlign: "center", padding: "30px 48px 20px" }}>
        <LndWordmark />
        <div style={{ fontFamily: LK.font.serif, fontStyle: "italic", fontSize: 23, color: LK.color.inkSoft, marginTop: 13 }}>{L.manifest}</div>
      </header>
      <LndRule />
      {/* Banner-Slot (Sept-Events) bleibt zwischen Doppellinie und Strip FREI — nicht verbauen. */}
      <div style={{ marginTop: 10 }}><LndStrip rows={L.rows} right={L.stripRight} /></div>
      <main style={{ flex: 1, display: "grid", gridTemplateColumns: "1.18fr 1fr 1fr", padding: "28px 48px 22px", minHeight: 0, background: LK.color.paper }}>
        <section style={{ paddingRight: 26 }}>
          <LndKicker t={L.blogK} c="#a3552e" fill={warm} />
          <h3 style={{ fontFamily: LK.font.display, fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.12, margin: "0 0 10px" }}>{L.blogT}</h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: LK.color.inkSoft, margin: "0 0 8px" }}>{L.blogS}</p>
          <div style={{ fontFamily: LK.font.mono, fontSize: 9.5, letterSpacing: "0.1em", color: LK.color.inkMute }}>{L.blogM}</div>
          <div style={{ borderTop: `1px dashed ${LK.color.rule}`, marginTop: 14, paddingTop: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25 }}>{L.blog2}</div>
            <div style={{ fontFamily: LK.font.mono, fontSize: 9.5, letterSpacing: "0.1em", color: LK.color.inkMute, marginTop: 4 }}>{L.blog2M}</div>
          </div>
          <div style={{ marginTop: 16 }}><LndLink color="#a3552e">{L.blogLink}</LndLink></div>
        </section>
        <section style={{ padding: "0 26px", borderLeft: LK.border.hair }}>
          <LndKicker t={L.datenK} c={LK.color.moss} fill={warm} />
          <div style={{ fontFamily: LK.font.display, fontSize: 62, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: warm ? LK.color.moss : LK.color.ink }}>{L.datenN}</div>
          <div style={{ fontFamily: LK.font.mono, fontSize: 10, letterSpacing: "0.14em", color: LK.color.inkMute, marginTop: 6 }}>{L.datenL}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 20, paddingTop: 14, borderTop: `1px dashed ${LK.color.rule}` }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: LK.color.moss, animation: "lndPulse 2.4s ease-in-out infinite" }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{L.datenAir}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <LndSpark w={120} h={26} stroke={LK.color.moss} />
            <span style={{ fontFamily: LK.font.mono, fontSize: 9, letterSpacing: "0.12em", color: LK.color.inkMute }}>{L.datenSpark}</span>
          </div>
          <div style={{ marginTop: 18 }}><LndLink color={LK.color.moss}>{L.datenLink}</LndLink></div>
        </section>
        <section style={{ paddingLeft: 26, borderLeft: LK.border.hair, display: "flex", flexDirection: "column" }}>
          <LndKicker t={L.kurierK} c={LK.color.ink} fill={warm} />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {L.heads.map((h, i) => (
              <div key={i} style={{ padding: i ? "11px 0" : "0 0 11px", borderTop: i ? `1px dashed ${LK.color.rule}` : "none" }}>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3 }}>{h.t}</div>
                <div style={{ fontFamily: LK.font.mono, fontSize: 9.5, letterSpacing: "0.1em", color: LK.color.inkMute, marginTop: 5, textDecoration: "underline", textDecorationStyle: "dashed", textUnderlineOffset: 3, cursor: "pointer" }}>{h.s}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: LK.font.serif, fontStyle: "italic", fontSize: 12.5, color: LK.color.inkMute, marginTop: "auto", paddingTop: 10 }}>{L.kurierNote}</div>
        </section>
      </main>
      <LndCta L={L} warm={warm} />
      <LndFooter L={L} />
      {lang === "DE" && !warm && <KioskAnnotate top={296} right={26} rotate={1.5}>BANNER-SLOT · die Zone zwischen Doppellinie und Strip bleibt FREI — Sept: Gebietsfonds-Events Herrfurthplatz. Nicht verbauen.</KioskAnnotate>}
      {lang === "DE" && !warm && <KioskAnnotate top={520} left={26} rotate={-1.5} color={LK.color.sky}>Kurier-Headlines linken zur QUELLE (↗), nie in die App. Blog + Kiez-Daten linken direkt rein — echt öffentlich.</KioskAnnotate>}
      {warm && !ribbons && <KioskAnnotate top={296} right={26} rotate={1.5} color={LK.color.ochre}>VARIANTE WARM · gefüllte Rubriken-Straps + Moss-Zahl + Ochre-Wash in der CTA-Zone. Slot-Regel hält: jede Farbe bleibt in ihrem Teaser.</KioskAnnotate>}
      {ribbons && <KioskAnnotate top={296} right={26} rotate={1.5} color={LK.color.ochre}>VARIANTE RIBBONS · Riso-Überdruck: alle 5 Flächen-Akzente als diagonale Bänder (multiply, ≤14 %). Overprint, kein Backdrop — Ink-Text läuft ungestört drüber.</KioskAnnotate>}
      {ribbonArt && <KioskAnnotate top={296} right={26} rotate={1.5} color={LK.color.ochre}>VARIANTE RANDMOTIV · User-Grafik als Ecken-Bänder (unten-links + oben-rechts), multiply + weiche Maske. Volle Riso-Farbe am Rand, Textspalten bleiben auf ruhigem Papier. Bild-Asset im Handoff mitliefern.</KioskAnnotate>}
      {bgFull && !bgFlip && <KioskAnnotate top={296} right={26} rotate={1.5} color={LK.color.ochre}>VARIANTE VOLLBILD · User-Grafik 1:1 auf Seitenbreite, Oberkante am Seitenkopf — Überdruck-Stärke wie die Riso-Bänder: multiply + 16 % Deckung, volle Farbe, kein Blur. Bild-Asset im Handoff mitliefern.</KioskAnnotate>}
      {lang === "DE" && bgFull && bgFlip && !bgTuck && <KioskAnnotate top={296} right={26} rotate={1.5} color={LK.color.ochre}>VARIANTE VOLLBILD GESPIEGELT · Bänderzug 180° gedreht: startet unten-rechts, läuft nach oben-links aus. Sonst identisch: multiply + 16 %, kein Blur.</KioskAnnotate>}
      {bgTuck && !bgFill && <KioskAnnotate top={296} right={26} rotate={1.5} color={LK.color.ochre}>VARIANTE UNTERTAUCHEN · Bänder tauchen unter der opaken Teaser-Zone durch, oben + unten wieder raus. Weil sie dort keinen Text tragen: kräftiger (42 %) + größer skaliert Richtung oben-links.</KioskAnnotate>}
      {bgFill && <KioskAnnotate top={296} right={26} rotate={1.5} color={LK.color.ochre}>VARIANTE UNTERTAUCHEN + ECKE · zweite Bild-Kopie (ungespiegelt) füllt die Ecke oben-links neben der Wortmarke, per Maske weich auslaufend — wirkt wie derselbe Bänderzug, der oben wieder eintaucht.</KioskAnnotate>}
    </div>
  );
}

// ─── Mobil 390 ───
function LandingMobile({ lang = "DE", warm, bgFull, bgFlip }) {
  const L = LND_L[lang];
  const mrows = L.rows;
  return (
    <div className={bgFull ? "lnd-root" : undefined} style={{ width: 390, height: 1310, background: LK.color.paper, color: LK.color.ink, fontFamily: LK.font.display, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      <style>{kioskFonts + LND_CSS + (bgFull ? ".lnd-root>*{position:relative;z-index:1}.lnd-root>.lnd-bg{z-index:0}" : "")}</style>
      <div style={paperGrainStyle} />
      {bgFull && <LndBgFull flip={bgFlip} />}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", borderBottom: LK.border.hair, fontFamily: LK.font.mono, fontSize: 9, letterSpacing: "0.1em", color: LK.color.inkMute }}>
        <span>{L.date}</span>
        <span><b style={{ color: LK.color.ink }}>{lang}</b> | {lang === "DE" ? "EN" : "DE"}</span>
      </div>
      <header style={{ textAlign: "center", padding: "22px 18px 16px" }}>
        <LndWordmark size={54} />
        <div style={{ fontFamily: LK.font.serif, fontStyle: "italic", fontSize: 16.5, lineHeight: 1.35, color: LK.color.inkSoft, marginTop: 10 }}>{L.manifest}</div>
      </header>
      <div style={{ padding: "0 18px" }}><div style={{ height: 3, background: LK.color.ink }} /><div style={{ height: 1, background: LK.color.ink, marginTop: 3 }} /></div>
      <div style={{ background: LK.color.ink, marginTop: 10 }}>
        {mrows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 18px", borderTop: i ? "1px solid rgba(243,234,216,0.18)" : "none" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: r.c === "paper" ? LK.color.paper : r.c, animation: "lndPulse 2.4s ease-in-out infinite" }} />
            <span style={{ fontFamily: LK.font.mono, fontSize: 10, letterSpacing: "0.09em", fontWeight: 500, color: LK.color.paper }}>{r.t}</span>
            {r.spark && <span style={{ marginLeft: "auto" }}><LndSpark w={54} h={14} /></span>}
          </div>
        ))}
      </div>
      <div style={{ background: LK.color.paper }}>
      <div style={{ padding: "20px 18px 4px" }}>
        <LndKicker t={L.blogK} c="#a3552e" fill={warm} />
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.18 }}>{L.blogT}</div>
        <div style={{ fontFamily: LK.font.mono, fontSize: 9, letterSpacing: "0.1em", color: LK.color.inkMute, margin: "6px 0 10px" }}>{L.blogM}</div>
        <LndLink color="#a3552e">{L.blogLink}</LndLink>
      </div>
      <div style={{ padding: "18px 18px 4px" }}>
        <LndKicker t={L.datenK} c={LK.color.moss} fill={warm} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
          <div>
            <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1, color: warm ? LK.color.moss : LK.color.ink }}>{L.datenN}</div>
            <div style={{ fontFamily: LK.font.mono, fontSize: 8.5, letterSpacing: "0.12em", color: LK.color.inkMute, marginTop: 5 }}>{L.datenL}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <LndSpark w={86} h={20} stroke={LK.color.moss} />
            <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>{L.datenAir}</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}><LndLink color={LK.color.moss}>{L.datenLink}</LndLink></div>
      </div>
      <div style={{ padding: "18px 18px 0" }}>
        <LndKicker t={L.kurierK} c={LK.color.ink} fill={warm} />
        {L.heads.map((h, i) => (
          <div key={i} style={{ padding: i ? "10px 0" : "0 0 10px", borderTop: i ? `1px dashed ${LK.color.rule}` : "none" }}>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{h.t}</div>
            <div style={{ fontFamily: LK.font.mono, fontSize: 9, letterSpacing: "0.1em", color: LK.color.inkMute, marginTop: 4, textDecoration: "underline", textDecorationStyle: "dashed", textUnderlineOffset: 3 }}>{h.s}</div>
          </div>
        ))}
      </div>
      </div>
      <div style={{ flex: 1 }} />
      <LndCta L={L} mobile warm={warm} />
      <LndFooter L={L} mobile />
    </div>
  );
}

// ─── Heartbeat · Zustände & Regeln (Board) ───
function LandingStates() {
  const R = LND_L.DE.rows;
  const St = ({ n, t, note, children }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: LK.font.mono, fontSize: 10.5, letterSpacing: "0.12em", color: LK.color.ink, marginBottom: 7 }}><span style={{ color: LK.color.wine }}>{n}</span> · {t}</div>
      <div style={{ border: LK.border.ink, borderRadius: LK.r.sm, overflow: "hidden" }}>{children}</div>
      {note && <div style={{ fontFamily: LK.font.serif, fontStyle: "italic", fontSize: 12.5, color: LK.color.inkMute, marginTop: 6 }}>{note}</div>}
    </div>
  );
  return (
    <div style={{ width: 1140, height: 1000, background: LK.color.paper, color: LK.color.ink, fontFamily: LK.font.display, position: "relative", overflow: "hidden", padding: "30px 40px", boxSizing: "border-box" }}>
      <style>{kioskFonts + LND_CSS}</style>
      <div style={paperGrainStyle} />
      <div style={{ borderBottom: `1.5px dashed ${LK.color.rule}`, paddingBottom: 12, marginBottom: 22 }}>
        <div style={{ fontFamily: LK.font.mono, fontSize: 11, letterSpacing: "0.18em", color: LK.color.inkMute }}>◆ LANDING · HEARTBEAT-STRIP</div>
        <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 0" }}>Zustände <span style={{ fontFamily: LK.font.serif, fontStyle: "italic", fontWeight: 400 }}>&amp; Regeln</span></h2>
      </div>
      <St n="01" t="VOLLER TAG — Maximum: 4 Zeilen" note="Reihenfolge fest: Luft · Forum · Kalender · Kurier. Akzente nur als Puls-Punkt — der Strip selbst bleibt ink.">
        <LndStrip rows={R} right="STÜNDLICH AKTUALISIERT" compact />
      </St>
      <St n="02" t="RUHIGE WOCHE — Zeilen ohne Leben verschwinden. Nie eine Null." note="Render-seitig gefiltert, die API lügt nicht. Früh: Wochenfenster („diese Woche“) statt „heute“.">
        <LndStrip rows={[R[0], R[3]]} right="STÜNDLICH AKTUALISIERT" compact />
      </St>
      <St n="03" t="LOGGER-LÜCKE — Luft pausiert: Gedankenstrich, nie ein stale Wert" note="Ausfälle sind real (2-Tage-Outage beim Domain-Umzug). Punkt steht still, Zeile bleibt ehrlich.">
        <LndStrip rows={[{ c: "paper", t: "LUFT: MESSUNG PAUSIERT —", mute: true }, R[1], R[2]]} right="STÜNDLICH AKTUALISIERT" compact />
      </St>
      <St n="04" t="STRIP FÄLLT AUS — null Zeilen: Strip rendert nicht, das Manifest trägt" note="Kein leerer schwarzer Balken, kein „keine Daten“. Die Seite ist ohne Strip vollständig.">
        <div style={{ background: LK.color.paper, textAlign: "center", padding: "18px 20px 16px" }}>
          <div style={{ fontFamily: LK.font.display, fontSize: 34, fontWeight: 800, letterSpacing: "-0.04em" }}>M<span style={{ fontFamily: LK.font.serif, fontStyle: "italic", fontWeight: 400 }}>a</span>halle</div>
          <div style={{ fontFamily: LK.font.serif, fontStyle: "italic", fontSize: 15, color: LK.color.inkSoft, marginTop: 6 }}>{LND_L.DE.manifest}</div>
          <div style={{ maxWidth: 420, margin: "12px auto 0" }}><div style={{ height: 2.5, background: LK.color.ink }} /><div style={{ height: 1, background: LK.color.ink, marginTop: 3 }} /></div>
        </div>
      </St>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20, marginTop: 4 }}>
        <div style={{ background: LK.color.ink, color: LK.color.paper, border: LK.border.ink, borderRadius: LK.r.md, padding: "16px 20px", boxShadow: LK.shadow.print(LK.color.ochre) }}>
          <div style={{ fontFamily: LK.font.mono, fontSize: 10, letterSpacing: "0.16em", color: LK.color.ochre, marginBottom: 8 }}>REGELN · NICHT VERHANDELBAR</div>
          <div style={{ fontFamily: LK.font.mono, fontSize: 11, lineHeight: 1.8 }}>
            · Zero-Regel: nie eine Null — die Zeile entfällt<br />
            · 1–4 Zeilen: das Layout verträgt jede Anzahl<br />
            · Kurier-Links → Quelle, nie in eine Login-Wall<br />
            · kein UGC, keine Namen — nur Aggregat-Zahlen<br />
            · Banner-Slot unterm Masthead bleibt frei (Sept)<br />
            · ink-led: Akzente NUR im eigenen Teaser-Slot<br />
            · reduced-motion: Puls-Punkte stehen still
          </div>
        </div>
        <div style={{ background: LK.color.paperWarm, border: LK.border.ink, borderRadius: LK.r.md, padding: "16px 20px", boxShadow: LK.shadow.printSm() }}>
          <div style={{ fontFamily: LK.font.mono, fontSize: 10, letterSpacing: "0.16em", color: LK.color.moss, marginBottom: 8 }}>DATEN · PUBLIC ENDPOINT</div>
          <div style={{ fontFamily: LK.font.mono, fontSize: 11, lineHeight: 1.8, color: LK.color.inkSoft }}>
            GET /api/kiez-heartbeat · unauth<br />
            Cache ~1h (TTL-Muster besteht) · SSR, zero-JS<br />
            zählt nur approved-only Content<br />
            Luft: letzter Logger-Wert + 7-Tage-Sparkline<br />
            eingeloggt? Route redirectet zu /forum —<br />
            Mitglieder sehen diese Seite nie
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LandingDesktop, LandingMobile, LandingStates });

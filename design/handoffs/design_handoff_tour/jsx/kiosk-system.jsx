/* global React */

// ══════════════════════════════════════════════════════════
//  KIOSK · DESIGN SYSTEM
//  Editorial Kiosk: same riso DNA as the sneak peek, but
//  quieter chrome + stronger typographic hierarchy for daily
//  reading. This file is the single source of truth for
//  tokens; everything else imports from window.kiosk.
// ══════════════════════════════════════════════════════════

const kiosk = {
  // —— Color ——
  // Paper & ink dominate; riso colors are accents, not floods.
  color: {
    paper:      "#f3ead8",   // warm cream — page bg
    paperSoft:  "#ebe1c7",   // recessed surface (inputs, footer)
    paperWarm:  "#f7f0de",   // raised card on paper (subtle elevation)
    ink:        "#1b1a17",   // body text, primary CTA
    inkSoft:    "#3a362e",   // secondary text
    inkMute:    "#7a7264",   // tertiary, timestamps, mono labels
    rule:       "#c9beA3",   // dashed dividers
    // Riso accents — used sparingly, ALWAYS over paper or ink.
    wine:       "#b23a5b",   // Topic / discussion · primary brand red
    teal:       "#3f8f9f",   // Announcement / official
    moss:       "#6b8a4a",   // Recommendation / warm
    ochre:      "#e8a53a",   // highlight / "neu" / counts
    sky:        "#b6d4db",   // info backgrounds, cool fills
    plum:       "#6f2f59",   // long-form, kiez carved (matches dark-glass forum accent)
    // States
    success:    "#5a8a3a",
    warn:       "#c8881e",
    danger:     "#a83245",
    info:       "#3a7282",
  },
  // —— Type ——
  // Bricolage Grotesque (display + UI). Instrument Serif italic for
  // editorial accents only. DM Mono for labels, timestamps, data.
  font: {
    display: "'Bricolage Grotesque', system-ui, sans-serif",
    serif:   "'Instrument Serif', Georgia, serif",
    mono:    "'DM Mono', ui-monospace, monospace",
  },
  // Modular type scale (1.18 ratio, paper-based)
  size: {
    micro: 10, mono: 11, caption: 12, body: 14, lead: 16,
    h6: 17, h5: 19, h4: 22, h3: 28, h2: 36, h1: 48, hero: 64,
  },
  // —— Spacing ——
  s: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 56, 10: 72 },
  // —— Radii ——
  // Generous, but quieter than sneak-peek. Cards are 16, pills 999, inputs 12.
  r: { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 },
  // —— Borders ——
  border: { hair: "1px solid #c9beA3", ink: "1.5px solid #1b1a17", inkBold: "2px solid #1b1a17" },
  // —— Shadows ——
  // Riso "offset print" shadow. No blur — it's a stamp, not a glow.
  shadow: {
    print: (c = "#1b1a17") => `3px 3px 0 ${c}`,
    printSm: (c = "#1b1a17") => `2px 2px 0 ${c}`,
    soft: "0 1px 0 rgba(27,26,23,0.08), 0 6px 18px rgba(27,26,23,0.06)",
  },
  // —— Motion ——
  // Custom-easing names map to feel. Use these in transition:.
  motion: {
    pop:    "cubic-bezier(.2,.8,.2,1.2)", // for chips, tags, CTA press
    settle: "cubic-bezier(.2,.7,.3,1)",   // for cards, list reorder
    ink:    "cubic-bezier(.4,0,.2,1)",    // for text, fades
    durFast: 140, durBase: 220, durSlow: 380,
  },
};

const kioskFonts = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap');
`;

// Riso paper grain — applied as ::before on root surfaces
const paperGrainStyle = {
  position: "absolute", inset: 0, pointerEvents: "none",
  backgroundImage: "radial-gradient(circle at 25% 30%, rgba(27,26,23,0.04) 1px, transparent 1.5px), radial-gradient(circle at 75% 70%, rgba(27,26,23,0.03) 1px, transparent 1.5px)",
  backgroundSize: "7px 7px, 11px 11px",
  mixBlendMode: "multiply",
};

// Striped placeholder helper — used for imagery in mockups
function StripedPlaceholder({ color = kiosk.color.wine, label, height = 80, ratio }) {
  const h = ratio ? undefined : height;
  return (
    <div style={{
      width: "100%", height: h, aspectRatio: ratio,
      borderRadius: kiosk.r.md, border: kiosk.border.ink,
      background: `repeating-linear-gradient(45deg, ${color}33 0 8px, ${kiosk.color.paperWarm} 8px 16px)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: kiosk.font.mono, fontSize: kiosk.size.micro,
      color: kiosk.color.inkMute, letterSpacing: "0.08em", textTransform: "uppercase",
    }}>{label}</div>
  );
}

// Annotation post-it (for motion + intent notes on artboards)
function KioskAnnotate({ children, top, left, right, bottom, rotate = -1.5, color = kiosk.color.ochre }) {
  return (
    <div style={{
      position: "absolute", top, left, right, bottom, zIndex: 5,
      maxWidth: 220, padding: "10px 14px",
      background: color, color: kiosk.color.ink,
      border: kiosk.border.ink, borderRadius: kiosk.r.sm,
      boxShadow: kiosk.shadow.print(),
      transform: `rotate(${rotate}deg)`,
      fontFamily: kiosk.font.mono, fontSize: 11, lineHeight: 1.45, fontWeight: 500,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────
//  DESIGN SYSTEM — overview artboard (1280×900)
// ─────────────────────────────────────────────────────────
function KioskSystem() {
  return (
    <div style={{
      width: 1280, height: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      {/* Header */}
      <header style={{ padding: "32px 48px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `1.5px dashed ${kiosk.color.rule}` }}>
        <div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.18em", color: kiosk.color.wine }}>MAHALLE · DESIGN SYSTEM · v1.0</div>
          <h1 style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "8px 0 0" }}>
            Editorial <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>Kiosk</span>
          </h1>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 17, color: kiosk.color.inkSoft, marginTop: 4 }}>Riso DNA, daily-readable. Paper-first, ink-confident.</div>
        </div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, lineHeight: 1.6, textAlign: "right" }}>
          schillerkiez · neukölln · berlin<br/>
          DE · EN · paper #f3ead8
        </div>
      </header>

      {/* Body grid */}
      <div style={{ padding: "24px 48px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 22 }}>

        {/* Color */}
        <section>
          <SectionHeader n="01" t="Farbe" subtitle="Paper & ink lead. Riso = accent, never flood." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            <Swatch name="paper" hex={kiosk.color.paper} role="page bg" />
            <Swatch name="ink" hex={kiosk.color.ink} role="text · primary CTA" dark />
            <Swatch name="wine" hex={kiosk.color.wine} role="topic · brand" dark />
            <Swatch name="teal" hex={kiosk.color.teal} role="announcement" dark />
            <Swatch name="moss" hex={kiosk.color.moss} role="recommendation" dark />
            <Swatch name="ochre" hex={kiosk.color.ochre} role="highlight · neu" />
            <Swatch name="sky" hex={kiosk.color.sky} role="info bg" />
            <Swatch name="plum" hex={kiosk.color.plum} role="long-form" dark />
          </div>
        </section>

        {/* Type */}
        <section>
          <SectionHeader n="02" t="Schrift" subtitle="Bricolage display · Instrument serif italic accents · DM Mono labels" />
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <TypeSpec font={kiosk.font.display} weight={800} size={36} label="H1 / Display" />
            <TypeSpec font={kiosk.font.display} weight={700} size={22} label="H3 / Section" />
            <TypeSpec font={kiosk.font.serif} italic size={20} label="Editorial accent" />
            <TypeSpec font={kiosk.font.display} weight={500} size={14} label="Body · 14/1.55" body />
            <TypeSpec font={kiosk.font.mono} weight={500} size={11} label="LABEL · MONO 11" mono />
          </div>
        </section>

        {/* Spacing & Radii */}
        <section>
          <SectionHeader n="03" t="Raster · Radien · Schatten" subtitle="4-px base. Riso offset print, no blur." />
          <div style={{ marginTop: 10 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, marginBottom: 6 }}>SPACING · 4·8·12·16·24·32·56</div>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", marginBottom: 14 }}>
              {[4,8,12,16,24,32,56].map((v) => (
                <div key={v} style={{ width: v, height: v, background: kiosk.color.ink, borderRadius: 2 }} />
              ))}
            </div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, marginBottom: 6 }}>RADII · 8 · 12 · 16 · 22 · ∞</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 14 }}>
              {[8,12,16,22,999].map((r) => (
                <div key={r} style={{ width: 28, height: 28, background: kiosk.color.paperWarm, border: kiosk.border.ink, borderRadius: r }} />
              ))}
            </div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, marginBottom: 6 }}>SHADOW · PRINT OFFSET</div>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 56, height: 36, background: kiosk.color.paperWarm, border: kiosk.border.ink, borderRadius: 8, boxShadow: kiosk.shadow.printSm() }} />
              <div style={{ width: 56, height: 36, background: kiosk.color.paperWarm, border: kiosk.border.ink, borderRadius: 8, boxShadow: kiosk.shadow.print(kiosk.color.wine) }} />
              <div style={{ width: 56, height: 36, background: kiosk.color.paperWarm, border: kiosk.border.ink, borderRadius: 8, boxShadow: kiosk.shadow.print(kiosk.color.teal) }} />
            </div>
          </div>
        </section>

        {/* Tags / pills */}
        <section style={{ marginTop: 4 }}>
          <SectionHeader n="04" t="Tags · Filter · Status" subtitle="3 post types = 3 distinct visuals" />
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            <PostTypeChip kind="topic" />
            <PostTypeChip kind="announcement" />
            <PostTypeChip kind="recommendation" />
            <FilterChip label="Alle" active />
            <FilterChip label="Diskussion" />
            <FilterChip label="Kita" />
            <FilterChip label="Verkehr" hashtag />
            <FilterChip label="Essen" hashtag />
          </div>
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
            <StatusBadge kind="approved" />
            <StatusBadge kind="pending" />
            <StatusBadge kind="rejected" />
            <StatusBadge kind="flagged" />
          </div>
        </section>

        {/* Buttons */}
        <section style={{ marginTop: 4 }}>
          <SectionHeader n="05" t="Schaltflächen" subtitle="Ink primary, paper outline, ghost text" />
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
            <KioskBtn>+ neues thema</KioskBtn>
            <KioskBtn variant="outline">abbrechen</KioskBtn>
            <KioskBtn variant="ghost">mehr laden</KioskBtn>
            <KioskBtn variant="danger">verwerfen</KioskBtn>
          </div>
        </section>

        {/* Inputs */}
        <section style={{ marginTop: 4 }}>
          <SectionHeader n="06" t="Eingabe" subtitle="Recessed paper, ink rule on focus" />
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <KioskInput placeholder="Suchen im Forum…" icon="🔍" />
            <KioskInput placeholder="Titel deines Themas" focused value="Rattenproblem Oderstraße" />
            <KioskTextarea placeholder="Was möchtest du teilen?" />
          </div>
        </section>

        {/* Avatars + presence */}
        <section style={{ marginTop: 4 }}>
          <SectionHeader n="07" t="Avatare · Präsenz" subtitle="Initialen, riso-getönt, mit kiez-marker" />
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <KioskAvatar initials="EA" color={kiosk.color.wine} online />
            <KioskAvatar initials="LK" color={kiosk.color.teal} />
            <KioskAvatar initials="AD" color={kiosk.color.moss} online />
            <KioskAvatar initials="MR" color={kiosk.color.ochre} />
            <KioskAvatar initials="OB" color={kiosk.color.plum} />
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, marginLeft: 8 }}>+ 24 weitere<br/>im Kiez heute</div>
          </div>
        </section>

        {/* Voice */}
        <section style={{ marginTop: 4 }}>
          <SectionHeader n="08" t="Stimme · DE / EN" subtitle="Direkt, warm, lokal. Mahalle = Nachbarschaft." />
          <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.5, fontFamily: kiosk.font.display, color: kiosk.color.inkSoft }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.moss, letterSpacing: "0.1em" }}>JA · </span>
              „dein kiez, in einem klick" · „teilen ist auch eine sprache" · „neu im kiez? sag hallo."
            </div>
            <div>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.danger, letterSpacing: "0.1em" }}>NEIN · </span>
              „Engage with your community" · „Boost your reach" · jegliches Marketing-Sprech
            </div>
          </div>
        </section>

        {/* Motion */}
        <section style={{ marginTop: 4 }}>
          <SectionHeader n="09" t="Bewegung" subtitle="Ink-press, settle, riso-pop. 140 / 220 / 380ms." />
          <div style={{ marginTop: 10, fontFamily: kiosk.font.mono, fontSize: 10.5, lineHeight: 1.7, color: kiosk.color.inkSoft }}>
            <div><b>POP</b> · cubic(.2,.8,.2,1.2) — chips, tag-toggle, like</div>
            <div><b>SETTLE</b> · cubic(.2,.7,.3,1) — list reorder, card mount</div>
            <div><b>INK</b> · cubic(.4,0,.2,1) — fades, skeleton→content</div>
            <div style={{ marginTop: 8, color: kiosk.color.inkMute }}>// optimistic post = card slides up + 80% opacity → 100% on approve</div>
            <div style={{ color: kiosk.color.inkMute }}>// rejected = card shakes 6px x2 + ink-rule turns wine</div>
          </div>
        </section>
      </div>

      {/* Footer rule */}
      <div style={{ position: "absolute", bottom: 12, left: 48, right: 48, display: "flex", justifyContent: "space-between", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em" }}>
        <span>SYSTEM · 09 SECTIONS · LIVE</span>
        <span>EDITORIAL KIOSK · forum + system locked</span>
      </div>
    </div>
  );
}

// ──── Sub-components used here AND by Forum screens ────

function SectionHeader({ n, t, subtitle }) {
  return (
    <div style={{ borderBottom: `1px dashed ${kiosk.color.rule}`, paddingBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.15em" }}>§{n}</span>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>{t}</h3>
      </div>
      {subtitle && <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12, color: kiosk.color.inkMute, marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

function Swatch({ name, hex, role, dark }) {
  return (
    <div style={{ background: hex, color: dark ? kiosk.color.paper : kiosk.color.ink, border: kiosk.border.ink, borderRadius: kiosk.r.sm, padding: "8px 10px", height: 54, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em" }}>{name}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 9 }}>{hex.toUpperCase()}</span>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 8, opacity: 0.75 }}>{role}</span>
      </div>
    </div>
  );
}

function TypeSpec({ font, weight = 500, italic, size, label, body, mono }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "baseline", gap: 8, borderBottom: `1px dashed ${kiosk.color.rule}`, paddingBottom: 4 }}>
      <span style={{ fontFamily: font, fontWeight: weight, fontStyle: italic ? "italic" : "normal", fontSize: size, lineHeight: 1, letterSpacing: size > 24 ? "-0.025em" : "0" }}>
        {body ? "Im Kiez geht's um Menschen." : mono ? "PM10 · 18 µg/m³" : "Aa Bb Çç"}
      </span>
      <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>{label}</span>
    </div>
  );
}

// ─── Reusable component primitives ──────────────────────────

function PostTypeChip({ kind }) {
  const map = {
    topic:          { l: "DISKUSSION",    c: kiosk.color.wine },
    announcement:   { l: "ANKÜNDIGUNG",   c: kiosk.color.teal },
    recommendation: { l: "EMPFEHLUNG",    c: kiosk.color.moss },
  };
  const m = map[kind];
  return (
    <span style={{
      fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 500,
      background: m.c, color: kiosk.color.paper,
      padding: "3px 9px", borderRadius: kiosk.r.sm,
      letterSpacing: "0.08em", border: `1px solid ${kiosk.color.ink}`,
    }}>{m.l}</span>
  );
}

function FilterChip({ label, active, hashtag }) {
  return (
    <span style={{
      padding: "5px 12px", fontSize: 12.5, fontWeight: 600,
      background: active ? kiosk.color.ink : "transparent",
      color: active ? kiosk.color.paper : kiosk.color.ink,
      border: kiosk.border.ink, borderRadius: kiosk.r.pill,
      fontFamily: hashtag ? kiosk.font.mono : kiosk.font.display,
      fontWeight: hashtag ? 500 : 600,
    }}>{hashtag ? `#${label.toLowerCase()}` : label}</span>
  );
}

function StatusBadge({ kind }) {
  const map = {
    approved: { l: "veröffentlicht", c: kiosk.color.success, dot: "●" },
    pending:  { l: "in prüfung",      c: kiosk.color.warn,    dot: "◐" },
    rejected: { l: "abgelehnt",       c: kiosk.color.danger,  dot: "✕" },
    flagged:  { l: "gemeldet",        c: kiosk.color.plum,    dot: "⚑" },
  };
  const m = map[kind];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: kiosk.font.mono, fontSize: 10.5, fontWeight: 500,
      color: m.c, background: kiosk.color.paperWarm,
      padding: "3px 9px", borderRadius: kiosk.r.sm,
      border: `1px solid ${m.c}55`,
    }}><span>{m.dot}</span>{m.l}</span>
  );
}

function KioskBtn({ children, variant = "primary", small }) {
  const styles = {
    primary: { bg: kiosk.color.ink, fg: kiosk.color.paper, b: kiosk.color.ink, sh: kiosk.shadow.print(kiosk.color.wine) },
    outline: { bg: "transparent", fg: kiosk.color.ink, b: kiosk.color.ink, sh: "none" },
    ghost:   { bg: "transparent", fg: kiosk.color.inkSoft, b: "transparent", sh: "none", underline: true },
    danger:  { bg: kiosk.color.danger, fg: kiosk.color.paper, b: kiosk.color.ink, sh: kiosk.shadow.print() },
  };
  const s = styles[variant];
  return (
    <button style={{
      background: s.bg, color: s.fg, fontFamily: kiosk.font.display,
      fontSize: small ? 12 : 14, fontWeight: 700, letterSpacing: "-0.005em",
      padding: small ? "6px 12px" : "10px 18px",
      borderRadius: kiosk.r.pill,
      border: variant === "ghost" ? "none" : `1.5px solid ${s.b}`,
      boxShadow: s.sh,
      cursor: "pointer",
      textDecoration: s.underline ? "underline" : "none",
      textDecorationStyle: "dashed", textUnderlineOffset: 3,
    }}>{children}</button>
  );
}

function KioskInput({ placeholder, value, focused, icon }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: kiosk.color.paperSoft,
      border: focused ? `1.5px solid ${kiosk.color.ink}` : `1px solid ${kiosk.color.rule}`,
      borderRadius: kiosk.r.md, padding: "8px 12px",
      boxShadow: focused ? `inset 0 0 0 2px ${kiosk.color.paper}` : "none",
    }}>
      {icon && <span style={{ fontSize: 12, opacity: 0.6 }}>{icon}</span>}
      <span style={{ fontSize: 13, color: value ? kiosk.color.ink : kiosk.color.inkMute, fontFamily: kiosk.font.display, flex: 1 }}>{value || placeholder}</span>
      {focused && <span style={{ width: 1.5, height: 14, background: kiosk.color.ink, animation: "blink 1s step-end infinite" }} />}
    </div>
  );
}

function KioskTextarea({ placeholder }) {
  return (
    <div style={{
      background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.rule}`,
      borderRadius: kiosk.r.md, padding: "10px 12px", minHeight: 50,
      fontFamily: kiosk.font.display, fontSize: 13, color: kiosk.color.inkMute,
      lineHeight: 1.5,
    }}>{placeholder}</div>
  );
}

function KioskAvatar({ initials, color = kiosk.color.wine, online, size = 36 }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: color, color: kiosk.color.paper,
        border: kiosk.border.ink,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.36, fontWeight: 700, letterSpacing: "-0.02em",
        fontFamily: kiosk.font.display,
      }}>{initials}</div>
      {online && (
        <div style={{
          position: "absolute", bottom: -1, right: -1,
          width: 10, height: 10, borderRadius: "50%",
          background: kiosk.color.success, border: `2px solid ${kiosk.color.paper}`,
        }} />
      )}
    </div>
  );
}

// Export everything to window for Babel-scope sharing
Object.assign(window, {
  kiosk, kioskFonts, paperGrainStyle,
  KioskSystem, StripedPlaceholder, KioskAnnotate,
  SectionHeader, Swatch, TypeSpec,
  PostTypeChip, FilterChip, StatusBadge,
  KioskBtn, KioskInput, KioskTextarea, KioskAvatar,
});

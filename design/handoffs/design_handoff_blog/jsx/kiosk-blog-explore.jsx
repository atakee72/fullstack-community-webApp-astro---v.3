/* global React */

// ══════════════════════════════════════════════════════════
//  BLOG PASS · exploration round
//  Three editorial metaphors for /blog. Accent locked by
//  user Jul 15 2026: RUST/TERRAKOTTA (#a3552e family).
//  Grounding (repo main): static Astro content collection,
//  6 team-authored MDX posts, EN-only bodies, 3 postLayouts
//  (standard/hero/gallery), client search + tags + pagination.
//  Chrome is DE/EN switched; article bodies stay as authored.
// ══════════════════════════════════════════════════════════

const { kiosk: KB, paperGrainStyle: KB_grain, kioskFonts: KB_fonts, KioskAnnotate: KBNote, StripedPlaceholder: KBImg } = window;
const KB_RUST = "#a3552e";
const KB_RUST_DEEP = "#7e401f";

// ── Seeds — the real 6 MDX posts, verbatim from the repo ──
const KB_POSTS = [
  { id: "neighborhood-cafe-guide", title: "The Cafe Guide: Where Schillerkiez Gets Its Coffee", desc: "A local's guide to the best cafes in the neighborhood — from specialty pour-overs to classic Milchkaffee spots.", date: "8. Apr 2025", month: "APR", tags: ["cafe", "food", "local", "guide"], layout: "standard", cover: "cafe interior · warm light", min: 6 },
  { id: "green-spaces", title: "Hidden Green Spaces in Schillerkiez", desc: "Beyond Tempelhofer Feld — discover the pocket parks, community gardens, and quiet green corners of our neighborhood.", date: "20. Mär 2025", month: "MÄR", tags: ["nature", "parks", "outdoor"], layout: "standard", cover: "park at sunset", min: 5 },
  { id: "local-market-guide", title: "Your Guide to the Weekly Kiez Market", desc: "Everything you need to know about the weekly market on Schillerpromenade — vendors, seasonal picks, and tips from regulars.", date: "12. Feb 2025", month: "FEB", tags: ["market", "local", "food"], layout: "standard", cover: "market produce stall", min: 5 },
  { id: "welcome-to-mahalle", title: "Welcome to the Mahalle Blog", desc: "Introducing our community blog - a space for stories, updates, and connections from your neighborhood.", date: "15. Jan 2025", month: "JAN", tags: ["announcement", "community"], layout: "standard", cover: "community gathering", min: 3 },
  { id: "community-spotlight", title: "Community Spotlight: Meet Your Neighbors", desc: "Get to know the wonderful people who make our neighborhood special.", date: "10. Jan 2025", month: "JAN", tags: ["spotlight", "neighbors"], layout: "hero", cover: "cafe culture", min: 4 },
  { id: "neighborhood-gallery", title: "A Visual Tour of Our Neighborhood", desc: "Explore the beauty of our community through this photo gallery showcasing local landmarks and everyday moments.", date: "5. Jan 2025", month: "JAN", tags: ["photos", "local"], layout: "gallery", cover: "street mural", min: 4 },
];
const KB_TAGS = [["local", 3], ["food", 2], ["community", 2], ["guide", 2], ["cafe", 1], ["market", 1], ["nature", 1], ["parks", 1], ["photos", 1], ["spotlight", 1]];

// ── Shared bits ───────────────────────────────────────────
function KBPage({ children, height, bg = KB.color.paper }) {
  return (
    <div style={{ width: 1280, height, background: bg, color: KB.color.ink, fontFamily: KB.font.display, position: "relative", overflow: "hidden" }}>
      <style>{KB_fonts}</style>
      <div style={KB_grain} />
      {children}
    </div>
  );
}
function KBRibbon({ label }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 48px", borderBottom: `1.5px solid ${KB.color.ink}` }}>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>Mahalle<span style={{ color: KB_RUST }}>.</span></div>
      <div style={{ fontFamily: KB.font.mono, fontSize: 10.5, letterSpacing: "0.14em", color: KB.color.inkMute }}>{label}</div>
      <div style={{ display: "flex", gap: 6, fontFamily: KB.font.mono, fontSize: 11 }}>
        <span style={{ padding: "3px 9px", background: KB.color.ink, color: KB.color.paper, borderRadius: 999 }}>DE</span>
        <span style={{ padding: "3px 9px", border: `1.5px solid ${KB.color.ink}`, borderRadius: 999 }}>EN</span>
      </div>
    </div>
  );
}
function KBTag({ t, n, active }) {
  return (
    <span style={{ fontFamily: KB.font.mono, fontSize: 10.5, padding: "3px 10px", borderRadius: 999, border: `1.5px solid ${active ? KB_RUST : KB.color.ink}`, background: active ? KB_RUST : "transparent", color: active ? KB.color.paper : KB.color.ink, whiteSpace: "nowrap" }}>
      #{t}{n != null && <span style={{ opacity: 0.55 }}> {n}</span>}
    </span>
  );
}
function KBSearch({ w = "100%" }) {
  return (
    <div style={{ width: w, display: "flex", alignItems: "center", gap: 8, background: KB.color.paperSoft, border: `1px solid ${KB.color.rule}`, borderRadius: KB.r.md, padding: "9px 14px" }}>
      <span style={{ fontSize: 14, opacity: 0.5 }}>⌕</span>
      <span style={{ fontSize: 13, color: KB.color.inkMute }}>Suche in Titel, Beschreibung, Tags…</span>
    </div>
  );
}
function KBMeta({ post, color = KB.color.inkMute }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: KB.font.mono, fontSize: 10.5, color }}>
      <span>{post.date}</span><span>·</span><span>Mahalle-Team</span><span>·</span><span>{post.min} Min</span><span style={{ padding: "1px 6px", border: `1px solid ${color}55`, borderRadius: 4, fontSize: 9 }}>EN</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  METAPHOR A · DIE BEILAGE
//  The Kurier's weekend supplement — a visual sibling of the
//  Newsboard masthead. Newspaper columns, hairline dividers,
//  rubric row. The blog reads as "our paper's magazine".
// ═══════════════════════════════════════════════════════════
function BlogExploreBeilage() {
  const lead = KB_POSTS[0], rest = KB_POSTS.slice(1);
  return (
    <KBPage height={900}>
      <KBRibbon label="BLOG · METAPHER A" />
      <div style={{ padding: "26px 48px 0" }}>
        {/* Kurier-sibling masthead */}
        <div style={{ textAlign: "center", borderBottom: `2.5px solid ${KB.color.ink}`, paddingBottom: 14 }}>
          <div style={{ fontFamily: KB.font.mono, fontSize: 10, letterSpacing: "0.22em", color: KB.color.inkMute }}>EINE BEILAGE DES SCHILLERKIEZ KURIER</div>
          <h1 style={{ fontSize: 54, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "8px 0 4px" }}>
            Die <span style={{ fontFamily: KB.font.serif, fontStyle: "italic", fontWeight: 400, color: KB_RUST }}>Beilage</span>
          </h1>
          <div style={{ display: "flex", justifyContent: "center", gap: 18, fontFamily: KB.font.mono, fontSize: 10.5, color: KB.color.inkMute, marginTop: 6 }}>
            <span>AUS DER REDAKTION</span><span>·</span><span>6 BEITRÄGE</span><span>·</span><span style={{ color: KB_RUST }}>ZULETZT: APR 2025</span>
          </div>
        </div>
        {/* Rubric row = tag bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "12px 0", borderBottom: `1px dashed ${KB.color.rule}` }}>
          <span style={{ fontFamily: KB.font.mono, fontSize: 10, letterSpacing: "0.14em", color: KB.color.inkMute }}>RUBRIKEN</span>
          <KBTag t="alle" active />
          {KB_TAGS.slice(0, 6).map(([t, n]) => <KBTag key={t} t={t} n={n} />)}
          <div style={{ marginLeft: "auto", width: 300 }}><KBSearch /></div>
        </div>
        {/* Lead + column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1px 1fr 1px 1fr", gap: 20, paddingTop: 20 }}>
          <div>
            <div style={{ display: "inline-block", fontFamily: KB.font.mono, fontSize: 10, letterSpacing: "0.14em", background: KB_RUST, color: KB.color.paper, padding: "3px 10px", borderRadius: 4, border: `1px solid ${KB.color.ink}` }}>NEU IN DER BEILAGE</div>
            <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "10px 0 8px" }}>{lead.title}</h2>
            <div style={{ fontFamily: KB.font.serif, fontStyle: "italic", fontSize: 16, lineHeight: 1.45, color: KB.color.inkSoft, marginBottom: 10 }}>{lead.desc}</div>
            <KBMeta post={lead} />
            <div style={{ marginTop: 12 }}><KBImg color={KB_RUST} label={lead.cover} height={150} /></div>
          </div>
          <div style={{ background: KB.color.rule }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {rest.slice(0, 2).map((p) => (
              <div key={p.id} style={{ borderBottom: `1px dashed ${KB.color.rule}`, paddingBottom: 14 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.15, margin: "0 0 6px" }}>{p.title}</h3>
                <div style={{ fontSize: 12.5, lineHeight: 1.45, color: KB.color.inkSoft, marginBottom: 8 }}>{p.desc}</div>
                <KBMeta post={p} />
              </div>
            ))}
          </div>
          <div style={{ background: KB.color.rule }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {rest.slice(2, 4).map((p) => (
              <div key={p.id} style={{ borderBottom: `1px dashed ${KB.color.rule}`, paddingBottom: 14 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.15, margin: "0 0 6px" }}>{p.title}</h3>
                <div style={{ fontSize: 12.5, lineHeight: 1.45, color: KB.color.inkSoft, marginBottom: 8 }}>{p.desc}</div>
                <KBMeta post={p} />
              </div>
            ))}
            <div style={{ fontFamily: KB.font.mono, fontSize: 10.5, color: KB_RUST }}>+ 1 weiterer Beitrag · Seite 1 / 1</div>
          </div>
        </div>
        {/* Artikel-Probe */}
        <div style={{ marginTop: 22, border: KB.border.inkBold, borderRadius: KB.r.lg, background: KB.color.paperWarm, boxShadow: KB.shadow.print(), padding: "16px 24px", display: "grid", gridTemplateColumns: "230px 1fr", gap: 24 }}>
          <div>
            <div style={{ fontFamily: KB.font.mono, fontSize: 10, letterSpacing: "0.14em", color: KB.color.inkMute }}>ARTIKEL-PROBE · A</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>Zeitungsseite</div>
            <div style={{ fontFamily: KB.font.serif, fontStyle: "italic", fontSize: 12.5, color: KB.color.inkSoft, marginTop: 4, lineHeight: 1.45 }}>Standfirst kursiv, Fließtext zweispaltig, Rubrik-Strap oben. Hero-Layout = Aufmacherseite mit Vollbild-Cover.</div>
          </div>
          <div style={{ borderLeft: `3px solid ${KB_RUST}`, paddingLeft: 18 }}>
            <div style={{ fontFamily: KB.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: KB_RUST }}>RUBRIK · GUIDE</div>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", margin: "4px 0 6px" }}>{lead.title}</div>
            <div style={{ columns: 2, columnGap: 22, fontSize: 12, lineHeight: 1.55, color: KB.color.inkSoft }}>
              Schillerkiez runs on coffee. Whether you need a quick espresso on the way to the U-Bahn or a quiet corner to work for the afternoon, the neighborhood has you covered. Right on Schillerpromenade sits the neighborhood living room — outdoor seating in summer, board games in winter, and a Milchkaffee that tastes like it's always tasted.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontFamily: KB.font.mono, fontSize: 10, color: KB.color.inkMute }}>
          <span>CHROME DE/EN · ARTIKELTEXTE BLEIBEN WIE VERFASST (EN)</span>
          <span style={{ color: KB_RUST }}>STÄRKE: FAMILIE MIT DEM KURIER · RISIKO: VERWECHSLUNG MIT NEWS</span>
        </div>
      </div>
      <KBNote top={112} right={26} color={KB.color.sky}>Masthead-Verwandtschaft: gleiche Mittelachse + Doppellinie wie der Kurier, aber Rost statt Ink — „dieselbe Druckerei, anderes Heft“.</KBNote>
    </KBPage>
  );
}

// ═══════════════════════════════════════════════════════════
//  METAPHOR B · DAS JOURNAL
//  Standalone literary magazine. Own masthead, cover-led
//  cards, drop cap, generous air. The blog as Feuilleton.
// ═══════════════════════════════════════════════════════════
function BlogExploreJournal() {
  const lead = KB_POSTS[0];
  return (
    <KBPage height={940} bg={KB.color.paperWarm}>
      <KBRibbon label="BLOG · METAPHER B" />
      <div style={{ padding: "34px 72px 0" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: KB.font.mono, fontSize: 10, letterSpacing: "0.3em", color: KB_RUST }}>MAHALLE · SCHILLERKIEZ</div>
          <h1 style={{ fontFamily: KB.font.serif, fontStyle: "italic", fontWeight: 400, fontSize: 84, lineHeight: 0.9, margin: "10px 0 8px", letterSpacing: "-0.02em" }}>Journal</h1>
          <div style={{ fontSize: 14.5, color: KB.color.inkSoft }}>Geschichten, Orte und Menschen aus dem Kiez — <span style={{ fontFamily: KB.font.serif, fontStyle: "italic" }}>in Ruhe erzählt.</span></div>
          <div style={{ width: 64, height: 3, background: KB_RUST, margin: "18px auto 0" }} />
        </div>
        {/* centered tag row + search */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          {KB_TAGS.slice(0, 7).map(([t, n]) => <KBTag key={t} t={t} n={n} />)}
        </div>
        <div style={{ width: 420, margin: "14px auto 0" }}><KBSearch /></div>
        {/* cover-led grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 26, marginTop: 28 }}>
          {KB_POSTS.slice(0, 3).map((p, i) => (
            <div key={p.id}>
              <div style={{ border: KB.border.ink, borderRadius: KB.r.lg, overflow: "hidden", boxShadow: KB.shadow.printSm() }}>
                <KBImg color={i === 1 ? KB.color.moss : KB_RUST} label={p.cover} height={140} />
              </div>
              <div style={{ fontFamily: KB.font.mono, fontSize: 10, letterSpacing: "0.16em", color: KB_RUST, marginTop: 12 }}>{p.date.toUpperCase()}</div>
              <h3 style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.12, margin: "5px 0 6px" }}>{p.title}</h3>
              <div style={{ fontFamily: KB.font.serif, fontStyle: "italic", fontSize: 13.5, lineHeight: 1.45, color: KB.color.inkSoft }}>{p.desc}</div>
              <div style={{ marginTop: 8 }}><KBMeta post={p} /></div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", fontFamily: KB.font.mono, fontSize: 10.5, color: KB.color.inkMute, marginTop: 20, borderTop: `1px dashed ${KB.color.rule}`, paddingTop: 12 }}>+ 3 ÄLTERE BEITRÄGE · ALLE ANSEHEN ↓</div>
        {/* Artikel-Probe */}
        <div style={{ marginTop: 18, border: KB.border.inkBold, borderRadius: KB.r.lg, background: KB.color.paper, boxShadow: KB.shadow.print(), padding: "18px 28px", display: "grid", gridTemplateColumns: "230px 1fr", gap: 24 }}>
          <div>
            <div style={{ fontFamily: KB.font.mono, fontSize: 10, letterSpacing: "0.14em", color: KB.color.inkMute }}>ARTIKEL-PROBE · B</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>Magazinseite</div>
            <div style={{ fontFamily: KB.font.serif, fontStyle: "italic", fontSize: 12.5, color: KB.color.inkSoft, marginTop: 4, lineHeight: 1.45 }}>Zentrierter Serif-Titel, Initiale, einspaltiger ruhiger Lesefluss. Gallery-Layout = Bildstrecke mit Bildunterschriften.</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: KB.font.mono, fontSize: 9.5, letterSpacing: "0.2em", color: KB_RUST }}>№ 6 · GUIDE</div>
            <div style={{ fontFamily: KB.font.serif, fontStyle: "italic", fontSize: 24, lineHeight: 1.1, margin: "5px 0 10px" }}>{lead.title}</div>
            <div style={{ textAlign: "left", fontSize: 12.5, lineHeight: 1.6, color: KB.color.inkSoft, maxWidth: 560, margin: "0 auto" }}>
              <span style={{ float: "left", fontFamily: KB.font.serif, fontSize: 40, lineHeight: 0.8, paddingRight: 8, color: KB_RUST }}>S</span>chillerkiez runs on coffee. Whether you need a quick espresso on the way to the U-Bahn or a quiet corner to work for the afternoon, the neighborhood has you covered.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontFamily: KB.font.mono, fontSize: 10, color: KB.color.inkMute }}>
          <span>CHROME DE/EN · ARTIKELTEXTE BLEIBEN WIE VERFASST (EN)</span>
          <span style={{ color: KB_RUST }}>STÄRKE: EIGENSTÄNDIGE LESE-IDENTITÄT · RISIKO: LÖST SICH VOM APP-GEFÜGE</span>
        </div>
      </div>
      <KBNote top={128} left={26} color={KB.color.sky}>Einzige Fläche der App auf paperWarm als Grundfläche — das Heft fühlt sich „schwerer“ an als die Tagesseiten.</KBNote>
    </KBPage>
  );
}

// ═══════════════════════════════════════════════════════════
//  METAPHOR C · DIE KIEZ-CHRONIK
//  Team scrapbook / chronicle. Month spine, taped entries,
//  date stamps, personal register.
// ═══════════════════════════════════════════════════════════
function KBTape({ rot = -3, color = KB_RUST }) {
  return <div style={{ position: "absolute", top: -10, left: "50%", width: 76, height: 20, background: `${color}66`, border: `1px solid ${KB.color.ink}33`, transform: `translateX(-50%) rotate(${rot}deg)`, borderRadius: 2 }} />;
}
function BlogExploreChronik() {
  const groups = [["APR 2025", [KB_POSTS[0]]], ["MÄR 2025", [KB_POSTS[1]]], ["FEB 2025", [KB_POSTS[2]]], ["JAN 2025", KB_POSTS.slice(3)]];
  return (
    <KBPage height={980}>
      <KBRibbon label="BLOG · METAPHER C" />
      <div style={{ padding: "28px 48px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontFamily: KB.font.mono, fontSize: 11, letterSpacing: "0.18em", color: KB_RUST }}>NOTIZEN AUS DER NACHBARSCHAFT · SEIT JAN 2025</div>
            <h1 style={{ fontSize: 54, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "8px 0 4px" }}>
              Die Kiez-<span style={{ fontFamily: KB.font.serif, fontStyle: "italic", fontWeight: 400, color: KB_RUST }}>Chronik</span>
            </h1>
            <div style={{ fontFamily: KB.font.serif, fontStyle: "italic", fontSize: 16, color: KB.color.inkSoft }}>Was das Team aufgeschrieben hat — Monat für Monat.</div>
          </div>
          <div style={{ width: 320 }}><KBSearch /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, paddingBottom: 14, borderBottom: `1px dashed ${KB.color.rule}` }}>
          <KBTag t="alle" active />{KB_TAGS.slice(0, 6).map(([t, n]) => <KBTag key={t} t={t} n={n} />)}
        </div>
        {/* Month spine + taped entries */}
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 26, marginTop: 24 }}>
          <div style={{ borderRight: `2px solid ${KB.color.ink}`, paddingRight: 16 }}>
            {groups.map(([m, ps]) => (
              <div key={m} style={{ marginBottom: 34, textAlign: "right" }}>
                <div style={{ fontFamily: KB.font.mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em" }}>{m}</div>
                <div style={{ fontFamily: KB.font.mono, fontSize: 9.5, color: KB.color.inkMute }}>{ps.length} {ps.length === 1 ? "Eintrag" : "Einträge"}</div>
                <div style={{ width: 9, height: 9, borderRadius: 999, background: KB_RUST, border: `1.5px solid ${KB.color.ink}`, marginLeft: "auto", marginTop: 6, marginRight: -22 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "26px 22px", alignContent: "start" }}>
            {KB_POSTS.map((p, i) => (
              <div key={p.id} style={{ position: "relative", border: KB.border.ink, borderRadius: KB.r.md, background: i % 2 ? KB.color.paperWarm : KB.color.paper, boxShadow: KB.shadow.printSm(), padding: "18px 18px 14px", transform: `rotate(${[-0.7, 0.5, -0.4, 0.6, -0.5, 0.4][i]}deg)` }}>
                <KBTape rot={[-4, 3, -2, 4, -3, 2][i]} color={i % 3 ? KB_RUST : KB.color.ochre} />
                <div style={{ display: "inline-block", fontFamily: KB.font.mono, fontSize: 9.5, letterSpacing: "0.1em", border: `1.5px solid ${KB_RUST}`, color: KB_RUST, padding: "2px 8px", borderRadius: 3, transform: "rotate(-1.5deg)" }}>{p.date.toUpperCase()}</div>
                <h3 style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: "-0.015em", lineHeight: 1.15, margin: "8px 0 5px" }}>{p.title}</h3>
                <div style={{ fontSize: 12, lineHeight: 1.45, color: KB.color.inkSoft }}>{p.desc}</div>
                <div style={{ display: "flex", gap: 5, marginTop: 9, flexWrap: "wrap" }}>{p.tags.slice(0, 3).map((t) => <KBTag key={t} t={t} />)}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Artikel-Probe */}
        <div style={{ marginTop: 24, border: KB.border.inkBold, borderRadius: KB.r.lg, background: KB.color.paperWarm, boxShadow: KB.shadow.print(), padding: "16px 24px", display: "grid", gridTemplateColumns: "230px 1fr", gap: 24 }}>
          <div>
            <div style={{ fontFamily: KB.font.mono, fontSize: 10, letterSpacing: "0.14em", color: KB.color.inkMute }}>ARTIKEL-PROBE · C</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>Chronik-Eintrag</div>
            <div style={{ fontFamily: KB.font.serif, fontStyle: "italic", fontSize: 12.5, color: KB.color.inkSoft, marginTop: 4, lineHeight: 1.45 }}>Datumstempel führt, Titel folgt. Persönliches Register — „wir haben notiert“. Gallery-Layout = eingeklebte Fotoecken.</div>
          </div>
          <div>
            <div style={{ display: "inline-block", fontFamily: KB.font.mono, fontSize: 10, letterSpacing: "0.1em", border: `1.5px solid ${KB_RUST}`, color: KB_RUST, padding: "2px 9px", borderRadius: 3, transform: "rotate(-1.5deg)" }}>8. APR 2025 · EINTRAG № 6</div>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", margin: "8px 0 6px" }}>{KB_POSTS[0].title}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: KB.color.inkSoft, maxWidth: 620 }}>
              Schillerkiez runs on coffee. Whether you need a quick espresso on the way to the U-Bahn or a quiet corner to work for the afternoon, the neighborhood has you covered.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontFamily: KB.font.mono, fontSize: 10, color: KB.color.inkMute }}>
          <span>CHROME DE/EN · ARTIKELTEXTE BLEIBEN WIE VERFASST (EN)</span>
          <span style={{ color: KB_RUST }}>STÄRKE: WARM + PERSÖNLICH, EHRLICH BEI 6 POSTS · RISIKO: SKALIERT SCHLECHT BEI VIELEN BEITRÄGEN</span>
        </div>
      </div>
      <KBNote top={210} right={26} color={KB.color.sky}>Monats-Rückgrat = das Archiv-Novel-Feature, hier schon als Grundstruktur statt als Zusatzmodul.</KBNote>
    </KBPage>
  );
}

Object.assign(window, { BlogExploreBeilage, BlogExploreJournal, BlogExploreChronik, KB_POSTS, KB_TAGS, KB_RUST, KB_RUST_DEEP });

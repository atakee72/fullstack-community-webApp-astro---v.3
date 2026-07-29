/* global React */

// ══════════════════════════════════════════════════════════
//  KIOSK · BLOG — mobile (390×844 Ausschnitte)
//  Index · Artikel (oben + Ende) · Rubrik-Seite.
//  Loads AFTER kiosk-blog-article.jsx.
// ══════════════════════════════════════════════════════════

const { kiosk: BMK, paperGrainStyle: bmGrain, kioskFonts: bmFonts, KioskAnnotate: BmNote, StripedPlaceholder: BmImg, KB_POSTS: BM_POSTS, KB_TAGS: BM_TAGS, KB_RUST: BM_RUST, KB_RUST_DEEP: BM_RUST_DEEP, BlRubrik: BmRubrik, BlMeta: BmMeta, BlLayoutBadge: BmBadge, BlogContributorCall: BmCall, BlogArticleFooter: BmFooter, BlogRelatedRail: BmRail, BA_BODY_CAFE: BM_BODY } = window;

// ── Phone shell (matches Newsboard/Forum mobile pattern) ──
function BmShell({ children, lang = "DE" }) {
  return (
    <div style={{ width: 390, height: 844, background: BMK.color.paper, color: BMK.color.ink, fontFamily: BMK.font.display, position: "relative", overflow: "hidden" }}>
      <style>{bmFonts}</style>
      <div style={bmGrain} />
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "10px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px dashed ${BMK.color.rule}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, background: BMK.color.wine, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: BMK.color.paper, fontFamily: BMK.font.serif, fontStyle: "italic", fontSize: 18, border: BMK.border.ink }}>m</div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.025em" }}>mahalle</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontFamily: BMK.font.mono, fontSize: 9, fontWeight: 600, padding: "3px 8px", border: BMK.border.ink, borderRadius: BMK.r.pill, background: lang === "DE" ? BMK.color.ink : "transparent", color: lang === "DE" ? BMK.color.paper : BMK.color.ink }}>{lang}</span>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: BMK.color.ochre, border: BMK.border.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>EA</div>
          </div>
        </header>
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>{children}</div>
        <nav style={{ padding: "8px 16px 14px", display: "flex", justifyContent: "space-around", borderTop: `1.5px solid ${BMK.color.ink}`, background: BMK.color.paperWarm }}>
          {["Forum", "Kalender", "News", "Markt", "Kiez"].map((n) => (
            <span key={n} style={{ fontFamily: BMK.font.mono, fontSize: 10, fontWeight: 500, color: BMK.color.inkMute }}>{n}</span>
          ))}
        </nav>
      </div>
    </div>
  );
}

function BmMasthead({ lang = "DE" }) {
  return (
    <div style={{ textAlign: "center", padding: "14px 18px 0" }}>
      <div style={{ fontFamily: BMK.font.mono, fontSize: 8, letterSpacing: "0.2em", color: BMK.color.inkMute, borderTop: `1px solid ${BMK.color.ink}`, paddingTop: 7 }}>{lang === "DE" ? "EINE BEILAGE DES SCHILLERKIEZ KURIER" : "A SUPPLEMENT OF THE SCHILLERKIEZ KURIER"}</div>
      <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "6px 0 4px" }}>Die <span style={{ fontFamily: BMK.font.serif, fontStyle: "italic", fontWeight: 400, color: BM_RUST }}>Beilage</span></div>
      <div style={{ fontFamily: BMK.font.mono, fontSize: 8.5, color: BMK.color.inkMute, marginBottom: 8 }}>{lang === "DE" ? "AUS DER REDAKTION · 6 BEITRÄGE" : "FROM THE EDITORS · 6 POSTS"}</div>
      <div style={{ borderBottom: `2px solid ${BMK.color.ink}` }} />
      <div style={{ borderBottom: `1px solid ${BMK.color.ink}`, marginTop: 2 }} />
    </div>
  );
}

// TagBarMobile equivalent — horizontal scroll rubric bar
function BmTagBar({ lang = "DE", activeTag }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "10px 18px", borderBottom: `1px dashed ${BMK.color.rule}`, overflow: "hidden" }}>
      <BmRubrik t={lang === "DE" ? "alle" : "all"} active={!activeTag} small />
      {BM_TAGS.slice(0, 5).map(([t, n]) => <BmRubrik key={t} t={t} n={n} active={activeTag === t} small />)}
      <span style={{ fontFamily: BMK.font.mono, fontSize: 10, color: BM_RUST }}>›</span>
    </div>
  );
}

function BmSearchRow({ lang = "DE" }) {
  return (
    <div style={{ padding: "10px 18px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: BMK.color.paperSoft, border: `1px solid ${BMK.color.rule}`, borderRadius: BMK.r.md, padding: "8px 12px" }}>
        <span style={{ fontSize: 13, opacity: 0.5 }}>⌕</span>
        <span style={{ fontSize: 12, color: BMK.color.inkMute }}>{lang === "DE" ? "Suche in Titel, Beschreibung, Tags…" : "Search title, description, tags…"}</span>
      </div>
    </div>
  );
}

function BmCard({ post, lang = "DE", lead = false }) {
  return (
    <article style={{ padding: "14px 18px", borderBottom: `1px dashed ${BMK.color.rule}` }}>
      {lead && <div style={{ display: "inline-block", fontFamily: BMK.font.mono, fontSize: 9, letterSpacing: "0.12em", background: BM_RUST, color: BMK.color.paper, padding: "2px 8px", borderRadius: 4, border: `1px solid ${BMK.color.ink}`, marginBottom: 8 }}>{lang === "DE" ? "NEU IN DER BEILAGE" : "NEW IN THE SUPPLEMENT"}</div>}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontFamily: BMK.font.mono, fontSize: 9, letterSpacing: "0.1em", color: BM_RUST }}>{post.date.toUpperCase()}</span>
        <BmBadge layout={post.layout} lang={lang} />
      </div>
      <h3 style={{ fontSize: lead ? 21 : 16.5, fontWeight: lead ? 800 : 700, letterSpacing: "-0.02em", lineHeight: 1.12, margin: "0 0 5px" }}>{post.title}</h3>
      {lead && <div style={{ fontFamily: BMK.font.serif, fontStyle: "italic", fontSize: 13.5, lineHeight: 1.4, color: BMK.color.inkSoft, marginBottom: 8 }}>{post.desc}</div>}
      {lead && <div style={{ border: BMK.border.ink, borderRadius: BMK.r.md, overflow: "hidden", marginBottom: 8 }}><BmImg color={BM_RUST} label={post.cover} height={140} /></div>}
      <BmMeta post={post} lang={lang} />
    </article>
  );
}

// ═════ Index ═════
function BlogMobileIndex({ lang = "DE" }) {
  return (
    <BmShell lang={lang}>
      <BmMasthead lang={lang} />
      <BmTagBar lang={lang} />
      <BmSearchRow lang={lang} />
      <BmCard post={BM_POSTS[0]} lang={lang} lead />
      <BmCard post={BM_POSTS[1]} lang={lang} />
      <BmCard post={BM_POSTS[2]} lang={lang} />
      <BmNote bottom={16} right={12} color={BMK.color.sky} rotate={1}>Einstieg mobil: Direktlink + Hinweis im Kurier-Masthead. Unten weiter: restliche Beiträge, Pagination, Archiv, Aufruf.</BmNote>
    </BmShell>
  );
}

// ═════ Artikel · oben ═════
function BlogMobileArticle({ lang = "DE" }) {
  const post = BM_POSTS[0];
  return (
    <BmShell lang={lang}>
      {/* Lesefaden mobile */}
      <div style={{ borderBottom: `1.5px solid ${BMK.color.ink}`, background: BMK.color.paperWarm }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px" }}>
          <span style={{ fontFamily: BMK.font.mono, fontSize: 10, color: BM_RUST_DEEP }}>‹ Beilage</span>
          <span style={{ fontFamily: BMK.font.mono, fontSize: 9.5, color: BMK.color.inkMute }}>23 % · {post.min} Min</span>
        </div>
        <div style={{ height: 4, background: BMK.color.paperSoft }}><div style={{ width: "23%", height: "100%", background: BM_RUST, borderRight: `1.5px solid ${BMK.color.ink}` }} /></div>
      </div>
      <div style={{ padding: "16px 18px" }}>
        <span style={{ fontFamily: BMK.font.mono, fontSize: 9, letterSpacing: "0.14em", color: BM_RUST, borderLeft: `3px solid ${BM_RUST}`, paddingLeft: 8 }}>RUBRIK · CAFE · № 6 / 6</span>
        <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "10px 0 8px" }}>{post.title}</h1>
        <div style={{ fontFamily: BMK.font.serif, fontStyle: "italic", fontSize: 14.5, lineHeight: 1.4, color: BMK.color.inkSoft, marginBottom: 8 }}>{post.desc}</div>
        <BmMeta post={post} lang={lang} />
        <div style={{ border: BMK.border.ink, borderRadius: BMK.r.md, overflow: "hidden", margin: "12px 0 4px" }}><BmImg color={BM_RUST} label={post.cover} height={170} /></div>
        <div style={{ fontFamily: BMK.font.mono, fontSize: 8.5, color: BMK.color.inkMute, marginBottom: 10 }}>FOTO: MAHALLE-TEAM · SCHILLERPROMENADE</div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: BMK.color.ink, margin: 0 }}>{BM_BODY[0]}</p>
      </div>
    </BmShell>
  );
}

// ═════ Artikel · Ende (gescrollt: Footer + Rail) ═════
function BlogMobileArticleEnd({ lang = "DE" }) {
  const post = BM_POSTS[0];
  return (
    <BmShell lang={lang}>
      <div style={{ borderBottom: `1.5px solid ${BMK.color.ink}`, background: BMK.color.paperWarm }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px" }}>
          <span style={{ fontFamily: BMK.font.mono, fontSize: 10, color: BM_RUST_DEEP }}>‹ Beilage</span>
          <span style={{ fontFamily: BMK.font.mono, fontSize: 9.5, color: BMK.color.inkMute }}>100 % · gelesen ✓</span>
        </div>
        <div style={{ height: 4, background: BMK.color.paperSoft }}><div style={{ width: "100%", height: "100%", background: BM_RUST }} /></div>
      </div>
      <div style={{ padding: "14px 18px" }}>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: BMK.color.inkSoft, margin: 0 }}>{BM_BODY[5]}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", borderTop: `2px solid ${BMK.color.ink}`, marginTop: 14, paddingTop: 12 }}>
          {post.tags.map((t) => <BmRubrik key={t} t={t} small />)}
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: BMK.font.mono, fontSize: 10, padding: "6px 11px", border: `1.5px solid ${BMK.color.ink}`, borderRadius: BMK.r.pill }}>⇗</span>
          <span style={{ fontFamily: BMK.font.mono, fontSize: 10, padding: "6px 11px", border: `1.5px solid ${BMK.color.ink}`, borderRadius: BMK.r.pill }}>⏙ A4</span>
        </div>
        <div style={{ marginTop: 12, border: BMK.border.inkBold, borderRadius: BMK.r.lg, background: BMK.color.paperWarm, boxShadow: BMK.shadow.printSm(), padding: "14px 16px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.015em" }}>Und was sagst <i style={{ fontFamily: BMK.font.serif, fontWeight: 400, color: BMK.color.wine }}>du</i> dazu?</div>
          <div style={{ display: "inline-block", marginTop: 10, padding: "11px 18px", background: BMK.color.wine, color: BMK.color.paper, border: BMK.border.ink, borderRadius: BMK.r.pill, fontSize: 13.5, fontWeight: 700, boxShadow: BMK.shadow.printSm() }}>Im Forum besprechen →</div>
          <div style={{ fontFamily: BMK.font.mono, fontSize: 8.5, lineHeight: 1.5, color: BMK.color.inkMute, marginTop: 8 }}>öffnet ein vorbereitetes Thema — zählt zu deinen 5 Beiträgen/Tag</div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: BMK.font.mono, fontSize: 9.5, letterSpacing: "0.16em", color: BM_RUST, borderBottom: `1px solid ${BMK.color.ink}`, paddingBottom: 5, marginBottom: 10 }}>MEHR AUS DER BEILAGE</div>
          {[BM_POSTS[2], BM_POSTS[5]].map((p) => (
            <div key={p.id} style={{ border: BMK.border.ink, borderRadius: BMK.r.md, background: BMK.color.paperWarm, padding: "10px 13px", marginBottom: 8 }}>
              <div style={{ fontFamily: BMK.font.mono, fontSize: 8.5, color: BM_RUST }}>{p.date.toUpperCase()}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, marginTop: 3 }}>{p.title}</div>
            </div>
          ))}
        </div>
      </div>
      <BmNote top={64} right={12} color={BMK.color.ochre} rotate={-1}>Hit-Targets: CTA-Reihe 44px hoch. Forum-CTA in Wein — Brücke zur Forum-Fläche.</BmNote>
    </BmShell>
  );
}

// ═════ Rubrik-Seite (Tag) ═════
function BlogMobileTag({ lang = "DE" }) {
  const posts = BM_POSTS.filter((p) => p.tags.includes("local"));
  return (
    <BmShell lang={lang}>
      <BmMasthead lang={lang} />
      <BmTagBar lang={lang} activeTag="local" />
      <div style={{ padding: "14px 18px 8px", display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.025em" }}>Rubrik <span style={{ fontFamily: BMK.font.serif, fontStyle: "italic", fontWeight: 400, color: BM_RUST }}>#local</span></span>
        <span style={{ fontFamily: BMK.font.mono, fontSize: 9.5, color: BMK.color.inkMute }}>{posts.length} {lang === "DE" ? "BEITRÄGE" : "POSTS"}</span>
        <span style={{ marginLeft: "auto", fontFamily: BMK.font.mono, fontSize: 9.5, color: BM_RUST_DEEP }}>✕ {lang === "DE" ? "aufheben" : "clear"}</span>
      </div>
      {posts.map((p) => <BmCard key={p.id} post={p} lang={lang} />)}
    </BmShell>
  );
}

Object.assign(window, { BmShell, BmMasthead, BmTagBar, BmCard, BlogMobileIndex, BlogMobileArticle, BlogMobileArticleEnd, BlogMobileTag });

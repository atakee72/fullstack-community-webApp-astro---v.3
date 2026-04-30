/* global React, kiosk, kioskFonts, paperGrainStyle, StripedPlaceholder, KioskAnnotate,
   PostTypeChip, FilterChip, StatusBadge, KioskBtn, KioskInput, KioskAvatar */

// ══════════════════════════════════════════════════════════
//  KIOSK · FORUM (desktop + mobile, all states)
//  Editorial intensity: ink-led type, riso accents,
//  distinct treatment per post type, transparent moderation,
//  DE/EN switcher top-right, paper grain throughout.
// ══════════════════════════════════════════════════════════

// Realistic Schillerkiez seed data — DE + EN mixed, very local.
const SEED_POSTS = [
  {
    id: "p01", kind: "announcement", pinned: true,
    title: "Straßenfest Herrfurthplatz · 3. Mai · Helfer:innen gesucht",
    titleEN: "Herrfurthplatz street fest · May 3 · need volunteers",
    body: "Wir bauen ab 14 Uhr auf. Wer kann zwei Stunden? Bringt Laune und vielleicht eine Bierbank mit. Vegane Mantı werden serviert, Çay sowieso.",
    bodyEN: "Setup starts 2pm. Anyone got two hours? Bring a folding bench if you have one. Vegan Mantı + Çay incl.",
    a: "Orhan B.", aColor: kiosk.color.teal, team: true,
    tags: ["#nachbarschaft", "#fest"],
    ts: "vor 28 min", replies: 12, likes: 47, bookmarked: false,
    img: { type: "real", label: "Herrfurthplatz · Sonntag · 4:3 Foto" },
  },
  {
    id: "p02", kind: "topic",
    title: "Rattenproblem Oderstraße — wer hat Tipps?",
    titleEN: "Rat problem on Oderstraße — anyone got tips?",
    body: "Seit zwei Wochen sehe ich sie abends rund um die Mülltonnen. Habe das Grünflächenamt angerufen, aber bisher nichts gehört. Hat jemand Erfahrung mit Fallen oder weiß, wer da helfen kann?",
    bodyEN: "For two weeks now I've been seeing them around the bins at night. Called the Grünflächenamt — radio silence. Anyone got experience with traps?",
    a: "Lena K.", aColor: kiosk.color.wine,
    tags: ["#oderstraße", "#hilfe"],
    ts: "vor 1h", replies: 47, likes: 23, bookmarked: true,
    img: null,
  },
  {
    id: "p03", kind: "recommendation",
    title: "Neue Bäckerei Weisestr. 14 · schon probiert?",
    titleEN: "New bakery on Weisestr. 14 · tried it yet?",
    body: "Simit und Poğaça sind hammer. Der Mann im Laden ist übrigens der Onkel vom Backgammon-Spieler aus Café Selig. Mahalle in Reinform.",
    bodyEN: "Simit and Poğaça are stellar. The guy running it is the uncle of the backgammon player from Café Selig. Mahalle in its purest form.",
    a: "Mauro R.", aColor: kiosk.color.moss,
    tags: ["#essen", "#weisestraße"],
    ts: "vor 3h", replies: 23, likes: 67, bookmarked: false,
    img: { type: "placeholder", label: "Simit · Poğaça · 3:2", color: kiosk.color.moss },
  },
  {
    id: "p04", kind: "topic",
    title: "Sperrmüll-Tausch Sonntag · jeder stellt was raus",
    titleEN: "Sunday curbside swap · everyone leaves something",
    body: "Letztes Mal hab ich einen Stuhl und zwei Pflanzen gefunden. Wir machen das wieder am Sonntag — nehmen statt kaufen. Bitte nur Sachen, die noch funktionieren.",
    bodyEN: "Last time I scored a chair and two plants. We're doing it again Sunday — take instead of buy. Working stuff only please.",
    a: "Beate W.", aColor: kiosk.color.ochre,
    tags: ["#tausch", "#sonntag"],
    ts: "vor 5h", replies: 8, likes: 34, bookmarked: false,
    img: null,
  },
  {
    id: "p05", kind: "recommendation",
    title: "Französisch-Konversation B1+ gesucht",
    titleEN: "Looking for French conversation partners (B1+)",
    body: "Bin B2, rostig. Wer will sich einmal die Woche im Tempelhofer Feld treffen und quatschen? Gerne bilingualer Tausch DE↔FR.",
    bodyEN: "B2 here, rusty. Anyone want to meet weekly at Tempelhofer Feld and chat? Bilingual swap DE↔FR welcome.",
    a: "Clémence M.", aColor: kiosk.color.plum,
    tags: ["#sprache", "#tempelhof"],
    ts: "vor 7h", replies: 6, likes: 15, bookmarked: false,
    img: null,
  },
  {
    id: "p06", kind: "announcement",
    title: "BVG-Info · M41 Ersatz wegen Bauarbeiten 28.04.–05.05.",
    titleEN: "BVG · M41 replaced by SEV April 28 – May 5",
    body: "Zwischen Hermannplatz und Sonnenallee fährt SEV. Plant 10 min mehr ein. Quelle: BVG Service-Center, gestern.",
    bodyEN: "Between Hermannplatz and Sonnenallee SEV runs instead. Add 10min. Source: BVG service desk, yesterday.",
    a: "Mahalle Bot", aColor: kiosk.color.teal, team: true,
    tags: ["#verkehr", "#bvg"],
    ts: "vor 1 Tag", replies: 4, likes: 12, bookmarked: false,
    img: null,
  },
];

// ─────────────────────────────────────────────────────────
//  Shared chrome — Nav + filter rail
// ─────────────────────────────────────────────────────────
function KioskNav({ active = "Forum", lang = "DE" }) {
  return (
    <header style={{ padding: "20px 36px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 42, height: 42, background: kiosk.color.wine, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: kiosk.color.paper, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 26, border: kiosk.border.ink }}>m</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>mahalle</div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginTop: 2 }}>SCHILLERKIEZ · NEUKÖLLN</div>
        </div>
      </div>
      <nav style={{ display: "flex", gap: 4 }}>
        {["Forum","Kalender","News","Markt","Kiez","Blog"].map((n) => (
          <span key={n} style={{
            padding: "6px 14px", fontSize: 13.5, fontWeight: 600,
            background: n === active ? kiosk.color.ink : "transparent",
            color: n === active ? kiosk.color.paper : kiosk.color.ink,
            border: kiosk.border.ink, borderRadius: kiosk.r.pill,
          }}>{n}</span>
        ))}
      </nav>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {/* DE/EN switcher — top-right, always visible */}
        <div style={{ display: "flex", border: kiosk.border.ink, borderRadius: kiosk.r.pill, overflow: "hidden", fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600 }}>
          <span style={{ padding: "5px 10px", background: lang === "DE" ? kiosk.color.ink : "transparent", color: lang === "DE" ? kiosk.color.paper : kiosk.color.ink }}>DE</span>
          <span style={{ padding: "5px 10px", background: lang === "EN" ? kiosk.color.ink : "transparent", color: lang === "EN" ? kiosk.color.paper : kiosk.color.ink, borderLeft: kiosk.border.ink }}>EN</span>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: kiosk.color.ochre, border: kiosk.border.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>EA</div>
      </div>
    </header>
  );
}

function ForumTitleBlock({ lang = "DE" }) {
  return (
    <section style={{ padding: "22px 36px 14px", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: 20, borderBottom: `1px dashed ${kiosk.color.rule}` }}>
      <div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.wine, letterSpacing: "0.12em" }}>FORUM · {lang === "DE" ? "MITTWOCH 25. APRIL" : "WEDNESDAY APRIL 25"} · 14:42</div>
        <h1 style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "6px 0 0" }}>
          {lang === "DE" ? <>Was <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>reden</span> wir heute?</> : <>What are we <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>talking</span> about today?</>}
        </h1>
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute }}>
          <span><b style={{ color: kiosk.color.ink }}>247</b> {lang === "DE" ? "Themen" : "topics"}</span>
          <span><b style={{ color: kiosk.color.ink }}>12</b> {lang === "DE" ? "neu seit gestern" : "new since yesterday"}</span>
          <span><b style={{ color: kiosk.color.ink }}>34</b> {lang === "DE" ? "aktiv jetzt" : "active now"}</span>
        </div>
      </div>
      <KioskBtn>{lang === "DE" ? "+ neues thema" : "+ new topic"}</KioskBtn>
    </section>
  );
}

function ForumFilterRail({ activeKind = "all", lang = "DE" }) {
  const labels = lang === "DE"
    ? { all: "Alle", topic: "Diskussion", announcement: "Ankündigung", recommendation: "Empfehlung", saved: "Gespeichert", mine: "Meine" }
    : { all: "All", topic: "Discussion", announcement: "Announcement", recommendation: "Recommendation", saved: "Saved", mine: "Mine" };
  return (
    <section style={{ padding: "14px 36px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <FilterChip label={labels.all} active={activeKind === "all"} />
      <FilterChip label={labels.topic} active={activeKind === "topic"} />
      <FilterChip label={labels.announcement} active={activeKind === "announcement"} />
      <FilterChip label={labels.recommendation} active={activeKind === "recommendation"} />
      <span style={{ width: 1, height: 18, background: kiosk.color.rule, margin: "0 4px" }} />
      <FilterChip label={labels.saved} />
      <FilterChip label={labels.mine} />
      <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em" }}>{lang === "DE" ? "TAGS" : "TAGS"}</span>
        {["kita","verkehr","essen","sprache","garten","tausch"].map((t) => (
          <FilterChip key={t} label={t} hashtag />
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
//  Post card — three distinct treatments
// ─────────────────────────────────────────────────────────
function ForumPostCard({ post, lang = "DE", featured = false, dim = false, optimistic = false, statusBadge, ghosted = false }) {
  const t = lang === "DE" ? post.title : post.titleEN;
  const b = lang === "DE" ? post.body : post.bodyEN;

  // Per-kind treatments
  const treatment = {
    topic: {
      cardBg: kiosk.color.paperWarm,
      shadow: "none",
      strap: null,
      titleColor: kiosk.color.ink,
      labelTone: lang === "DE" ? "DISKUSSION" : "DISCUSSION",
      labelColor: kiosk.color.wine,
      borderColor: kiosk.color.ink,
      borderWidth: 1.5,
    },
    announcement: {
      // Official → ink card with paper text. Most distinct.
      cardBg: kiosk.color.ink,
      shadow: kiosk.shadow.print(kiosk.color.teal),
      strap: { bg: kiosk.color.teal, label: lang === "DE" ? "OFFIZIELLE ANKÜNDIGUNG · KIEZRAT" : "OFFICIAL ANNOUNCEMENT · KIEZRAT" },
      titleColor: kiosk.color.paper,
      labelTone: lang === "DE" ? "ANKÜNDIGUNG" : "ANNOUNCEMENT",
      labelColor: kiosk.color.teal,
      borderColor: kiosk.color.ink,
      borderWidth: 2,
      bodyColor: "rgba(243,234,216,0.8)",
      metaColor: "rgba(243,234,216,0.55)",
    },
    recommendation: {
      // Warmer → paper with moss strap and serif italic accent
      cardBg: kiosk.color.paperWarm,
      shadow: kiosk.shadow.printSm(kiosk.color.moss),
      strap: { bg: kiosk.color.moss, label: lang === "DE" ? "✦ EMPFEHLUNG AUS DEM KIEZ" : "✦ RECOMMENDED IN THE KIEZ" },
      titleColor: kiosk.color.ink,
      labelTone: lang === "DE" ? "EMPFEHLUNG" : "RECOMMENDATION",
      labelColor: kiosk.color.moss,
      borderColor: kiosk.color.moss,
      borderWidth: 1.5,
      serif: true,
    },
  }[post.kind];

  const isAnnouncement = post.kind === "announcement";

  return (
    <article style={{
      background: treatment.cardBg,
      border: `${treatment.borderWidth}px solid ${treatment.borderColor}`,
      borderRadius: kiosk.r.lg,
      boxShadow: treatment.shadow,
      overflow: "hidden",
      position: "relative",
      opacity: ghosted ? 0.45 : optimistic ? 0.78 : 1,
      gridColumn: featured ? "span 2" : "auto",
      gridRow: featured ? "span 1" : "auto",
    }}>
      {/* Strap (only announcement + recommendation) */}
      {treatment.strap && (
        <div style={{
          background: treatment.strap.bg, color: kiosk.color.paper,
          fontFamily: kiosk.font.mono, fontSize: 9.5, fontWeight: 600,
          letterSpacing: "0.12em", padding: "5px 14px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: `1px solid ${kiosk.color.ink}`,
        }}>
          <span>{treatment.strap.label}</span>
          {post.pinned && <span>📌 {lang === "DE" ? "ANGEHEFTET" : "PINNED"}</span>}
        </div>
      )}

      <div style={{ padding: featured ? "18px 22px" : "16px 18px" }}>
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <KioskAvatar initials={post.a.split(" ").map(s => s[0]).join("").slice(0,2)} color={post.aColor} size={28} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: isAnnouncement ? kiosk.color.paper : kiosk.color.ink, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{post.a}</span>
                {post.team && (
                  <span style={{
                    fontFamily: kiosk.font.mono, fontSize: 8.5, fontWeight: 600,
                    letterSpacing: "0.08em",
                    padding: "1px 5px", borderRadius: 3,
                    background: isAnnouncement ? kiosk.color.ochre : kiosk.color.ink,
                    color: isAnnouncement ? kiosk.color.ink : kiosk.color.paper,
                    border: `1px solid ${isAnnouncement ? kiosk.color.ochre : kiosk.color.ink}`,
                    textTransform: "uppercase",
                  }}>{lang === "DE" ? "Mahalle-Team" : "Mahalle Team"}</span>
                )}
              </div>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: isAnnouncement ? "rgba(243,234,216,0.5)" : kiosk.color.inkMute, letterSpacing: "0.05em" }}>{post.ts}</div>
            </div>
          </div>
          {!treatment.strap && <PostTypeChip kind={post.kind} />}
          {statusBadge && <StatusBadge kind={statusBadge} />}
        </div>

        {/* Image (if any) */}
        {post.img && (
          <div style={{ marginBottom: 12 }}>
            {post.img.type === "real" ? (
              <div style={{
                height: featured ? 180 : 100,
                borderRadius: kiosk.r.md, border: kiosk.border.ink,
                background: `linear-gradient(135deg, ${kiosk.color.ochre} 0%, ${kiosk.color.wine} 100%)`,
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(0deg, transparent 0 4px, rgba(0,0,0,0.04) 4px 5px)` }} />
                <div style={{ position: "absolute", bottom: 8, left: 10, fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.paper, letterSpacing: "0.1em", background: "rgba(27,26,23,0.5)", padding: "2px 6px", borderRadius: 4 }}>
                  {post.img.label}
                </div>
              </div>
            ) : (
              <StripedPlaceholder color={post.img.color} label={post.img.label} height={featured ? 140 : 80} />
            )}
          </div>
        )}

        {/* Title */}
        <h3 style={{
          fontSize: featured ? 24 : 16.5,
          fontWeight: 800, letterSpacing: "-0.018em",
          margin: "0 0 8px", lineHeight: 1.18,
          color: treatment.titleColor,
          textWrap: "balance",
          fontFamily: treatment.serif && featured ? kiosk.font.display : kiosk.font.display,
        }}>{t}</h3>

        {/* Body */}
        <p style={{
          fontSize: featured ? 14 : 12.5, lineHeight: 1.5,
          margin: "0 0 14px",
          color: treatment.bodyColor || kiosk.color.inkSoft,
          fontFamily: treatment.serif ? kiosk.font.serif : kiosk.font.display,
          fontStyle: treatment.serif ? "italic" : "normal",
        }}>{b}</p>

        {/* Tags */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {post.tags.map((tg) => (
            <span key={tg} style={{
              fontFamily: kiosk.font.mono, fontSize: 10,
              color: isAnnouncement ? "rgba(243,234,216,0.7)" : kiosk.color.inkMute,
              padding: "1px 0",
            }}>{tg}</span>
          ))}
        </div>

        {/* Meta footer */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: kiosk.font.mono, fontSize: 11,
          color: treatment.metaColor || kiosk.color.inkMute,
          borderTop: `1px dashed ${isAnnouncement ? "rgba(243,234,216,0.25)" : kiosk.color.rule}`,
          paddingTop: 10,
        }}>
          <span style={{ display: "flex", gap: 12 }}>
            <span>♥ {post.likes}</span>
            <span>💬 {post.replies}</span>
            <span style={{ color: post.bookmarked ? kiosk.color.ochre : "inherit" }}>{post.bookmarked ? "🔖 saved" : "🔖"}</span>
          </span>
          <span>→ {lang === "DE" ? "lesen" : "read"}</span>
        </div>
      </div>
    </article>
  );
}

// ═════════════════════════════════════════════════════════
//  DESKTOP — Forum list, happy path
// ═════════════════════════════════════════════════════════
function KioskForumDesktop({ lang = "DE" }) {
  const featured = SEED_POSTS.find((p) => p.pinned);
  const rest = SEED_POSTS.filter((p) => !p.pinned);
  return (
    <div style={{
      width: 1280, height: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      <KioskNav active="Forum" lang={lang} />
      <ForumTitleBlock lang={lang} />
      <ForumFilterRail lang={lang} />

      {/* Feed: featured (announcement) full-width, then 3-col grid */}
      <section style={{ padding: "8px 36px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ gridColumn: "span 3" }}>
          <ForumPostCard post={featured} lang={lang} featured />
        </div>
        {rest.slice(0, 5).map((p) => (
          <ForumPostCard key={p.id} post={p} lang={lang} />
        ))}
      </section>

      {/* Bottom rule */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 36px", display: "flex", justifyContent: "space-between", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, borderTop: `1px dashed ${kiosk.color.rule}`, background: kiosk.color.paper }}>
        <span>{lang === "DE" ? "1 / 18 SEITEN" : "1 / 18 PAGES"}</span>
        <span style={{ color: kiosk.color.wine }}>↻ {lang === "DE" ? "live · letzter post vor 28 min" : "live · last post 28 min ago"}</span>
        <span>{lang === "DE" ? "MEHR LADEN ↓" : "LOAD MORE ↓"}</span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
//  MOBILE — Forum list, happy path
//  (390 × 844 — iPhone 14 size)
// ═════════════════════════════════════════════════════════
function KioskForumMobile({ lang = "DE", state = "happy" }) {
  return (
    <div style={{
      width: 390, height: 844, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      {/* Mobile status bar (faux) */}
      <div style={{ height: 44, background: kiosk.color.paper, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", fontFamily: kiosk.font.mono, fontSize: 13, fontWeight: 600 }}>
        <span>14:42</span>
        <span>● ● ●</span>
      </div>

      {/* Mobile nav */}
      <header style={{ padding: "10px 18px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, background: kiosk.color.wine, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: kiosk.color.paper, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 20, border: kiosk.border.ink }}>m</div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>mahalle</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", border: kiosk.border.ink, borderRadius: kiosk.r.pill, overflow: "hidden", fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 600 }}>
            <span style={{ padding: "3px 8px", background: lang === "DE" ? kiosk.color.ink : "transparent", color: lang === "DE" ? kiosk.color.paper : kiosk.color.ink }}>DE</span>
            <span style={{ padding: "3px 8px", background: lang === "EN" ? kiosk.color.ink : "transparent", color: lang === "EN" ? kiosk.color.paper : kiosk.color.ink, borderLeft: kiosk.border.ink }}>EN</span>
          </div>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: kiosk.color.ochre, border: kiosk.border.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>EA</div>
        </div>
      </header>

      {/* Title block */}
      <section style={{ padding: "12px 18px 10px", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.wine, letterSpacing: "0.12em" }}>FORUM · {lang === "DE" ? "MITTWOCH 14:42" : "WEDNESDAY 14:42"}</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "4px 0 0" }}>
          {lang === "DE" ? <>Was <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>reden</span> wir?</> : <>What's <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>up</span>?</>}
        </h1>
        <div style={{ display: "flex", gap: 12, marginTop: 8, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>
          <span><b style={{ color: kiosk.color.ink }}>247</b> {lang === "DE" ? "Themen" : "topics"}</span>
          <span><b style={{ color: kiosk.color.ink }}>12</b> {lang === "DE" ? "neu" : "new"}</span>
          <span><b style={{ color: kiosk.color.ink }}>34</b> {lang === "DE" ? "aktiv" : "active"}</span>
        </div>
      </section>

      {/* Filter rail (horizontal scroll feel) */}
      <div style={{ padding: "10px 18px", display: "flex", gap: 6, overflow: "hidden", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <FilterChip label={lang === "DE" ? "Alle" : "All"} active />
        <FilterChip label={lang === "DE" ? "Diskussion" : "Topics"} />
        <FilterChip label={lang === "DE" ? "Ankündigung" : "Announce"} />
        <FilterChip label={lang === "DE" ? "Empfehlung" : "Recs"} />
        <FilterChip label="kita" hashtag />
      </div>

      {/* Feed (single column) */}
      <div style={{ padding: "12px 18px 80px", display: "flex", flexDirection: "column", gap: 12, height: 844 - 44 - 56 - 60 - 44, overflow: "hidden" }}>
        {SEED_POSTS.slice(0, 3).map((p, i) => (
          <ForumPostCard key={p.id} post={p} lang={lang} />
        ))}
      </div>

      {/* Floating compose */}
      <button style={{
        position: "absolute", bottom: 70, right: 18,
        width: 56, height: 56, borderRadius: "50%",
        background: kiosk.color.ink, color: kiosk.color.paper,
        border: kiosk.border.ink, boxShadow: kiosk.shadow.print(kiosk.color.wine),
        fontSize: 26, fontWeight: 700, cursor: "pointer",
      }}>+</button>

      {/* Bottom tab bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 56,
        background: kiosk.color.paperSoft, borderTop: kiosk.border.ink,
        display: "flex", justifyContent: "space-around", alignItems: "center",
        fontFamily: kiosk.font.mono, fontSize: 9.5, letterSpacing: "0.05em",
      }}>
        {[["FORUM", true], ["KAL.", false], ["NEWS", false], ["MARKT", false], ["KIEZ", false]].map(([l, a]) => (
          <div key={l} style={{ textAlign: "center", color: a ? kiosk.color.wine : kiosk.color.inkMute, fontWeight: a ? 700 : 500 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: a ? kiosk.color.wine : "transparent", margin: "0 auto 3px" }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  KioskForumDesktop, KioskForumMobile, ForumPostCard,
  KioskNav, ForumTitleBlock, ForumFilterRail,
  SEED_POSTS,
});

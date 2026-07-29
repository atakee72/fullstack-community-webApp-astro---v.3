/* global React */

// ══════════════════════════════════════════════════════════
//  KIOSK · BLOG — „Die Beilage“ (Metapher A, ENTSCHIEDEN)
//  The Kurier's magazine supplement. Same printing house,
//  different Heft: centered masthead + double rule like the
//  Kurier, but RUST (#a3552e) instead of ink. Zeitungsspalten,
//  Rubriken = Tags. Static Astro content collection — 6 team-
//  authored MDX posts, EN bodies, chrome DE/EN.
//  Loads AFTER kiosk-system.jsx + kiosk-blog-explore.jsx
//  (reuses KB_POSTS / KB_TAGS / KB_RUST from the explore file).
// ══════════════════════════════════════════════════════════

const { kiosk: BLK, paperGrainStyle: blGrain, kioskFonts: blFonts, KioskAnnotate: BlNote, StripedPlaceholder: BlImg, KioskNav: BlNav, KB_POSTS: BL_POSTS, KB_TAGS: BL_TAGS, KB_RUST: BL_RUST, KB_RUST_DEEP: BL_RUST_DEEP } = window;

// ── i18n chrome strings (bodies stay EN as authored) ──────
const BL_L = {
  DE: { supp: "EINE BEILAGE DES SCHILLERKIEZ KURIER", from: "AUS DER REDAKTION", posts: "BEITRÄGE", latest: "ZULETZT", rubrics: "RUBRIKEN", all: "alle", search: "Suche in Titel, Beschreibung, Tags…", newest: "NEU IN DER BEILAGE", min: "Min", team: "Mahalle-Team", perPage: "PRO SEITE", page: "SEITE", archive: "ARCHIV", archiveNote: "nach Monat · aus pubDate abgeleitet", about: "ÜBER DIE BEILAGE", aboutBody: <>Die Beilage ist das Magazin des <b>Schillerkiez Kurier</b> — Geschichten, Orte und Menschen aus dem Kiez, geschrieben vom Mahalle-Team. Erscheint unregelmäßig, bleibt für immer.</>, since: "SEIT JAN 2025 · 6 BEITRÄGE", write: "Schreib für den Kiez", writeBody: <>Du kennst eine Geschichte, einen Ort, einen Menschen, über den die Beilage schreiben sollte? Die Redaktion liest mit.</>, writeCta: "Idee im Forum vorschlagen", writeNote: "öffnet ein vorbereitetes Thema mit #blogidee — die Redaktion meldet sich", entry: "Eintrag", entries: "Einträge", moreIn: "MEHR AUS DER RUBRIK" },
  EN: { supp: "A SUPPLEMENT OF THE SCHILLERKIEZ KURIER", from: "FROM THE EDITORS", posts: "POSTS", latest: "LATEST", rubrics: "RUBRICS", all: "all", search: "Search title, description, tags…", newest: "NEW IN THE SUPPLEMENT", min: "min read", team: "Mahalle team", perPage: "PER PAGE", page: "PAGE", archive: "ARCHIVE", archiveNote: "by month · derived from pubDate", about: "ABOUT THE SUPPLEMENT", aboutBody: <>Die Beilage is the magazine of the <b>Schillerkiez Kurier</b> — stories, places and people from the Kiez, written by the Mahalle team. Published irregularly, kept forever.</>, since: "SINCE JAN 2025 · 6 POSTS", write: "Write for the Kiez", writeBody: <>You know a story, a place, a person the supplement should cover? The editors are listening.</>, writeCta: "Suggest an idea in the forum", writeNote: "opens a pre-filled topic tagged #blogidee — the editors follow up", entry: "entry", entries: "entries", moreIn: "MORE FROM THE RUBRIC" },
};

// ── Shared atoms ──────────────────────────────────────────
function BlPage({ children, width = 1280, minHeight, bg = BLK.color.paper }) {
  return (
    <div style={{ width, minHeight, background: bg, color: BLK.color.ink, fontFamily: BLK.font.display, position: "relative", overflow: "hidden" }}>
      <style>{blFonts}</style>
      <div style={blGrain} />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}
function BlRubrik({ t, n, active, small }) {
  return (
    <span style={{ fontFamily: BLK.font.mono, fontSize: small ? 10 : 10.5, padding: small ? "2px 8px" : "3px 10px", borderRadius: 999, border: `1.5px solid ${active ? BL_RUST : BLK.color.ink}`, background: active ? BL_RUST : "transparent", color: active ? BLK.color.paper : BLK.color.ink, whiteSpace: "nowrap" }}>
      #{t}{n != null && <span style={{ opacity: 0.55 }}> {n}</span>}
    </span>
  );
}
function BlSearch({ w = "100%", lang = "DE", value, count }) {
  const L = BL_L[lang];
  return (
    <div style={{ width: w }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: BLK.color.paperSoft, border: value ? `1.5px solid ${BLK.color.ink}` : `1px solid ${BLK.color.rule}`, borderRadius: BLK.r.md, padding: "9px 14px" }}>
        <span style={{ fontSize: 14, opacity: 0.5 }}>⌕</span>
        {value ? <span style={{ fontSize: 13, fontWeight: 600 }}>{value}<span style={{ borderLeft: `1.5px solid ${BLK.color.ink}`, marginLeft: 1, animation: "none" }} /></span> : <span style={{ fontSize: 13, color: BLK.color.inkMute }}>{L.search}</span>}
        {value && <span style={{ marginLeft: "auto", fontFamily: BLK.font.mono, fontSize: 10, color: BLK.color.inkMute }}>✕</span>}
      </div>
      {count != null && <div style={{ fontFamily: BLK.font.mono, fontSize: 10, color: BL_RUST, marginTop: 5 }}>{count} {lang === "DE" ? "TREFFER · LIVE, OHNE NEULADEN" : "MATCHES · LIVE, NO RELOAD"}</div>}
    </div>
  );
}
function BlMeta({ post, lang = "DE", color = BLK.color.inkMute }) {
  const L = BL_L[lang];
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: BLK.font.mono, fontSize: 10.5, color, flexWrap: "wrap" }}>
      <span>{post.date}</span><span>·</span><span>{L.team}</span><span>·</span><span>{post.min} {L.min}</span><span style={{ padding: "1px 6px", border: `1px solid ${color}55`, borderRadius: 4, fontSize: 9 }} title={lang === "DE" ? "Beitrag auf Englisch verfasst" : "written in English"}>EN</span>
    </div>
  );
}
function BlLayoutBadge({ layout, lang = "DE" }) {
  if (layout === "standard") return null;
  const label = layout === "hero" ? (lang === "DE" ? "◼ AUFMACHER" : "◼ FEATURE") : (lang === "DE" ? "▤ BILDSTRECKE" : "▤ GALLERY");
  return <span style={{ fontFamily: BLK.font.mono, fontSize: 9, letterSpacing: "0.1em", color: BL_RUST_DEEP, border: `1px solid ${BL_RUST}66`, borderRadius: 4, padding: "1px 6px" }}>{label}</span>;
}

// ── Beilage masthead — Kurier sibling, rust instead of ink ──
function BlogMasthead({ lang = "DE", compact = false, count = 6 }) {
  const L = BL_L[lang];
  return (
    <div style={{ textAlign: "center", padding: compact ? "18px 48px 0" : "26px 48px 0" }}>
      <div style={{ fontFamily: BLK.font.mono, fontSize: 10, letterSpacing: "0.22em", color: BLK.color.inkMute, borderTop: `1px solid ${BLK.color.ink}`, paddingTop: 8 }}>{L.supp}</div>
      <h1 style={{ fontSize: compact ? 38 : 58, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: compact ? "6px 0 4px" : "10px 0 6px" }}>
        Die <span style={{ fontFamily: BLK.font.serif, fontStyle: "italic", fontWeight: 400, color: BL_RUST }}>Beilage</span>
      </h1>
      {!compact && (
        <div style={{ display: "flex", justifyContent: "center", gap: 18, fontFamily: BLK.font.mono, fontSize: 10.5, color: BLK.color.inkMute, margin: "4px 0 12px" }}>
          <span>{L.from}</span><span>·</span><span>{count} {L.posts}</span><span>·</span><span style={{ color: BL_RUST }}>{L.latest}: 8. APR 2025</span>
        </div>
      )}
      {compact && <div style={{ height: 10 }} />}
      <div style={{ borderBottom: `2.5px solid ${BLK.color.ink}` }} />
      <div style={{ borderBottom: `1px solid ${BLK.color.ink}`, marginTop: 2 }} />
    </div>
  );
}

// ── Rubric row = tag bar + live search ────────────────────
function BlogRubrikRow({ lang = "DE", activeTag = "alle", searchValue, searchCount }) {
  const L = BL_L[lang];
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "12px 48px", borderBottom: `1px dashed ${BLK.color.rule}` }}>
      <span style={{ fontFamily: BLK.font.mono, fontSize: 10, letterSpacing: "0.14em", color: BLK.color.inkMute }}>{L.rubrics}</span>
      <BlRubrik t={lang === "DE" ? "alle" : "all"} active={activeTag === "alle"} />
      {BL_TAGS.slice(0, 6).map(([t, n]) => <BlRubrik key={t} t={t} n={n} active={activeTag === t} />)}
      <span style={{ fontFamily: BLK.font.mono, fontSize: 10, color: BL_RUST }}>+4</span>
      <div style={{ marginLeft: "auto", width: 300 }}><BlSearch lang={lang} value={searchValue} count={searchCount} /></div>
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────
function BlogLeadCard({ post, lang = "DE" }) {
  const L = BL_L[lang];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 24 }}>
      <div>
        <div style={{ display: "inline-block", fontFamily: BLK.font.mono, fontSize: 10, letterSpacing: "0.14em", background: BL_RUST, color: BLK.color.paper, padding: "3px 10px", borderRadius: 4, border: `1px solid ${BLK.color.ink}` }}>{L.newest}</div>
        <h2 style={{ fontSize: 33, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.04, margin: "12px 0 8px" }}>{post.title}</h2>
        <div style={{ fontFamily: BLK.font.serif, fontStyle: "italic", fontSize: 16.5, lineHeight: 1.45, color: BLK.color.inkSoft, marginBottom: 10 }}>{post.desc}</div>
        <BlMeta post={post} lang={lang} />
        <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>{post.tags.map((t) => <BlRubrik key={t} t={t} small />)}</div>
      </div>
      <div style={{ border: BLK.border.ink, borderRadius: BLK.r.lg, overflow: "hidden", boxShadow: BLK.shadow.printSm(), alignSelf: "start" }}>
        <BlImg color={BL_RUST} label={post.cover} height={220} />
      </div>
    </div>
  );
}
function BlogColCard({ post, lang = "DE", thumb = false }) {
  return (
    <div style={{ borderBottom: `1px dashed ${BLK.color.rule}`, paddingBottom: 16 }}>
      {thumb && <div style={{ border: BLK.border.ink, borderRadius: BLK.r.md, overflow: "hidden", marginBottom: 10 }}><BlImg color={post.layout === "gallery" ? BLK.color.moss : BL_RUST} label={post.cover} height={110} /></div>}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontFamily: BLK.font.mono, fontSize: 9.5, letterSpacing: "0.12em", color: BL_RUST }}>{post.date.toUpperCase()}</span>
        <BlLayoutBadge layout={post.layout} lang={lang} />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.15, margin: "5px 0 6px" }}>{post.title}</h3>
      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: BLK.color.inkSoft, marginBottom: 8 }}>{post.desc}</div>
      <BlMeta post={post} lang={lang} />
    </div>
  );
}

// ── Pagination (12/24/48 + erste/zurück/weiter/letzte) ────
function BlogPagination({ lang = "DE" }) {
  const L = BL_L[lang];
  const Btn = ({ ch, on }) => <span style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${on ? BLK.color.ink : BLK.color.rule}`, borderRadius: BLK.r.sm, color: on ? BLK.color.ink : BLK.color.rule, fontFamily: BLK.font.mono, fontSize: 12 }}>{ch}</span>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 16 }}>
      <span style={{ fontFamily: BLK.font.mono, fontSize: 10, letterSpacing: "0.12em", color: BLK.color.inkMute }}>{L.perPage}</span>
      {[12, 24, 48].map((n, i) => <span key={n} style={{ fontFamily: BLK.font.mono, fontSize: 11, padding: "3px 9px", borderRadius: 999, border: `1.5px solid ${i === 0 ? BL_RUST : BLK.color.rule}`, background: i === 0 ? BL_RUST : "transparent", color: i === 0 ? BLK.color.paper : BLK.color.inkMute }}>{n}</span>)}
      <div style={{ flex: 1 }} />
      <Btn ch="«" /><Btn ch="‹" />
      <span style={{ fontFamily: BLK.font.mono, fontSize: 11, color: BLK.color.ink }}>{L.page} <b>1</b> / 1</span>
      <Btn ch="›" /><Btn ch="»" />
    </div>
  );
}

// ── Sidebar modules ───────────────────────────────────────
function BlogRubrikenCloud({ lang = "DE" }) {
  const L = BL_L[lang];
  return (
    <div style={{ border: BLK.border.ink, borderRadius: BLK.r.lg, background: BLK.color.paperWarm, boxShadow: BLK.shadow.printSm(), padding: "16px 18px" }}>
      <div style={{ fontFamily: BLK.font.mono, fontSize: 10, letterSpacing: "0.16em", color: BL_RUST, borderBottom: `1px solid ${BLK.color.ink}`, paddingBottom: 7, marginBottom: 12 }}>{L.rubrics} · 10</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {BL_TAGS.map(([t, n]) => <BlRubrik key={t} t={t} n={n} small />)}
      </div>
    </div>
  );
}
// NOVEL §03 · Archiv — months derived from pubDate at build time
function BlogArchivModule({ lang = "DE", activeMonth }) {
  const L = BL_L[lang];
  const months = [["APR 2025", 1], ["MÄR 2025", 1], ["FEB 2025", 1], ["JAN 2025", 3]];
  return (
    <div style={{ border: BLK.border.ink, borderRadius: BLK.r.lg, background: BLK.color.paperWarm, boxShadow: BLK.shadow.printSm(), padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid ${BLK.color.ink}`, paddingBottom: 7, marginBottom: 6 }}>
        <span style={{ fontFamily: BLK.font.mono, fontSize: 10, letterSpacing: "0.16em", color: BL_RUST }}>{L.archive}</span>
        <span style={{ fontFamily: BLK.font.mono, fontSize: 8.5, color: BLK.color.inkMute }}>{L.archiveNote}</span>
      </div>
      {months.map(([m, n]) => (
        <div key={m} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px dashed ${BLK.color.rule}`, background: activeMonth === m ? `${BL_RUST}14` : "transparent" }}>
          <span style={{ fontFamily: BLK.font.mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: activeMonth === m ? BL_RUST_DEEP : BLK.color.ink }}>{m}</span>
          <div style={{ flex: 1, display: "flex", gap: 3 }}>{Array.from({ length: n }).map((_, i) => <span key={i} style={{ width: 14, height: 7, background: BL_RUST, opacity: 0.75, borderRadius: 2 }} />)}</div>
          <span style={{ fontFamily: BLK.font.mono, fontSize: 10, color: BLK.color.inkMute }}>{n} {n === 1 ? L.entry : L.entries}</span>
        </div>
      ))}
    </div>
  );
}
function BlogAboutCard({ lang = "DE" }) {
  const L = BL_L[lang];
  return (
    <div style={{ border: BLK.border.ink, borderRadius: BLK.r.lg, background: BLK.color.paper, boxShadow: BLK.shadow.printSm(), padding: "16px 18px" }}>
      <div style={{ fontFamily: BLK.font.mono, fontSize: 10, letterSpacing: "0.16em", color: BL_RUST, borderBottom: `1px solid ${BLK.color.ink}`, paddingBottom: 7, marginBottom: 10 }}>{L.about}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: BLK.color.inkSoft }}>{L.aboutBody}</div>
      <div style={{ fontFamily: BLK.font.mono, fontSize: 9.5, letterSpacing: "0.1em", color: BLK.color.inkMute, marginTop: 10 }}>{L.since}</div>
    </div>
  );
}
// NOVEL §06 · „Schreib für den Kiez“ — honest contributor call:
// no upload pathway exists; idea lands as pre-filled forum topic.
function BlogContributorCall({ lang = "DE" }) {
  const L = BL_L[lang];
  return (
    <div style={{ border: BLK.border.inkBold, borderRadius: BLK.r.lg, background: `${BL_RUST}18`, boxShadow: BLK.shadow.print(BL_RUST_DEEP), padding: "18px 18px 16px", position: "relative" }}>
      <div style={{ fontFamily: BLK.font.mono, fontSize: 9.5, letterSpacing: "0.18em", color: BL_RUST_DEEP }}>✎ {lang === "DE" ? "AUFRUF" : "OPEN CALL"}</div>
      <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em", margin: "6px 0 6px" }}>{L.write}<span style={{ color: BL_RUST }}>.</span></div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: BLK.color.inkSoft }}>{L.writeBody}</div>
      <div style={{ display: "inline-block", marginTop: 12, padding: "8px 16px", background: BLK.color.ink, color: BLK.color.paper, borderRadius: BLK.r.pill, fontSize: 13, fontWeight: 700, boxShadow: BLK.shadow.printSm(BL_RUST) }}>{L.writeCta} →</div>
      <div style={{ fontFamily: BLK.font.mono, fontSize: 9, lineHeight: 1.5, color: BLK.color.inkMute, marginTop: 8 }}>{L.writeNote}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  INDEX · desktop — Zeitungsspalten + Rubriken + Seitenrand
// ═══════════════════════════════════════════════════════════
function BlogIndexDesktop({ lang = "DE" }) {
  const lead = BL_POSTS[0], rest = BL_POSTS.slice(1);
  const col1 = [rest[0], rest[2]], col2 = [rest[1], rest[3], rest[4]];
  return (
    <BlPage minHeight={1250}>
      <BlNav active="Blog" lang={lang} />
      <BlogMasthead lang={lang} />
      <BlogRubrikRow lang={lang} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 32, padding: "22px 48px 40px" }}>
        <div>
          <BlogLeadCard post={lead} lang={lang} />
          <div style={{ borderBottom: `2px solid ${BLK.color.ink}`, margin: "22px 0 0" }} />
          <div style={{ borderBottom: `1px solid ${BLK.color.ink}`, margin: "2px 0 20px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 22 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <BlogColCard post={col1[0]} lang={lang} thumb />
              <BlogColCard post={col1[1]} lang={lang} />
            </div>
            <div style={{ background: BLK.color.rule }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <BlogColCard post={col2[0]} lang={lang} thumb />
              <BlogColCard post={col2[1]} lang={lang} />
              <BlogColCard post={col2[2]} lang={lang} />
            </div>
          </div>
          <BlogPagination lang={lang} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <BlogRubrikenCloud lang={lang} />
          <BlogArchivModule lang={lang} />
          <BlogAboutCard lang={lang} />
          <BlogContributorCall lang={lang} />
        </div>
      </div>
      {lang === "DE" && <>
        <BlNote top={196} left={30} color={BLK.color.sky} rotate={1}>Masthead = Kurier-Verwandtschaft: gleiche Mittelachse + Doppellinie, Rost statt Ink. „Dieselbe Druckerei, anderes Heft.“</BlNote>
        <BlNote top={560} right={22} color={BLK.color.ochre}>NOVEL §03 · Archiv nach Monat — beim Build aus pubDate abgeleitet, null Backend. Klick = gefilterte Liste.</BlNote>
        <BlNote bottom={60} right={22} rotate={1.5} color={BLK.color.ochre}>NOVEL §06 · Aufruf ist ehrlich: kein Upload-Pfad. CTA öffnet vorbereitetes Forum-Thema (#blogidee) — Redaktion veröffentlicht übers Repo.</BlNote>
        <BlNote bottom={130} left={30} color={BLK.color.sky} rotate={-1}>Suche + Pagination bleiben voll funktional (BlogSearch.svelte): live über Titel/Beschreibung/Tags, 12/24/48 pro Seite. Bei 6 Posts: Seite 1/1, Pfeile inaktiv.</BlNote>
      </>}
    </BlPage>
  );
}

Object.assign(window, { BlPage, BlRubrik, BlSearch, BlMeta, BlLayoutBadge, BlogMasthead, BlogRubrikRow, BlogLeadCard, BlogColCard, BlogPagination, BlogRubrikenCloud, BlogArchivModule, BlogAboutCard, BlogContributorCall, BlogIndexDesktop, BL_L });

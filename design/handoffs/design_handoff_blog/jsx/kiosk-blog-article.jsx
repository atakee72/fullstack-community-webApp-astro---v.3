/* global React */

// ══════════════════════════════════════════════════════════
//  KIOSK · BLOG — Artikel · alle 3 postLayouts
//  standard = Zeitungsseite (Rubrik-Strap, Standfirst, 2 Spalten)
//  hero     = Aufmacherseite (Vollbild-Cover, Ink-Titelband)
//  gallery  = Bildstrecke (nummerierte Bilder + Unterschriften)
//  Novel hier: §01 Lesezeit+Lesefaden · §02 Rubrik-Rail ·
//  §04 „Im Forum besprechen“ · §05 Druckbogen-CTA.
//  Loads AFTER kiosk-blog.jsx.
// ══════════════════════════════════════════════════════════

const { kiosk: BAK, paperGrainStyle: baGrain, KioskAnnotate: BaNote, StripedPlaceholder: BaImg, KioskNav: BaNav, KB_POSTS: BA_POSTS, KB_RUST: BA_RUST, KB_RUST_DEEP: BA_RUST_DEEP, BlPage: BaPage, BlRubrik: BaRubrik, BlMeta: BaMeta, BL_L: BA_L } = window;

// ── Bodies stay EN as authored (MDX) ──────────────────────
const BA_BODY_CAFE = [
  "Schillerkiez runs on coffee. Whether you need a quick espresso on the way to the U-Bahn or a quiet corner to work for the afternoon, the neighborhood has you covered. This guide collects the places we keep coming back to — no rankings, just honest favorites.",
  "Start on Herrfurthstraße. The small bars near the church pull shots from early morning, and the standing counters are where the Kiez trades its first news of the day. If the queue looks long, don't worry — it moves faster than you think.",
  "On Schillerpromenade sits the neighborhood living room: outdoor seating in summer, board games in winter, and a Milchkaffee that tastes like it has always tasted. Cash only, and proudly so.",
  "For laptop afternoons, head toward the Feld. Two cafes near the Oderstraße entrance keep long tables, patient wifi, and a house rule that lunch hours are for eating, not typing. Respect it and you are welcome all day.",
  "And for the cheap and cheerful: the bakery counters on Okerstraße still do filter coffee for small change, best drunk on the bench outside while the neighborhood walks past.",
  "Got a favorite we missed? Tell us in the forum — this guide gets updated as the Kiez changes.",
];
const BA_BODY_SPOT = [
  "Every neighborhood has its quiet backbone — the people who water the tree pits, organize the stairwell flea markets, and remember everyone's name at the späti. This series introduces them, one at a time.",
  "We start where most Schillerkiez days start: on the Promenade. Between the market stalls and the playground you will find the regulars who have watched the Kiez change for decades — and the newcomers learning its rhythm one Saturday at a time.",
  "If you would like to nominate a neighbor for the next spotlight, the forum thread is open. We read everything.",
];
const BA_GALLERY = [
  { c: BA_RUST, l: "street mural · Herrfurthstraße", cap: "The mural at the corner of Herrfurthstraße — repainted every spring, photographed every day." },
  { c: "#6b8a4a", l: "tempelhofer feld gate · dusk", cap: "The Oderstraße gate at dusk. The Feld empties slowly, never completely." },
  { c: BA_RUST, l: "market stall · schillerpromenade", cap: "Saturday market on the Promenade — the tomato stand that never needs a sign." },
  { c: "#3f8f9f", l: "courtyard garden · hinterhof", cap: "A shared courtyard garden, three buildings deep. Ring twice." },
  { c: BA_RUST, l: "rooftops toward neukölln", cap: "Rooftops looking north — the Kiez from above is mostly chimneys and antennas." },
  { c: "#e8a53a", l: "corner kiosk · night", cap: "The corner kiosk at night: last light on, first to know everything." },
];

const BA_LL = {
  DE: { back: "‹ zur Beilage", read: "gelesen", discuss: "Im Forum besprechen", discussNote: "öffnet ein vorbereitetes Thema mit Titel + Link auf diesen Beitrag — zählt zu deinen 5 Beiträgen/Tag", print: "⏙ Druckbogen (A4)", printNote: "2-Farb-Druck-CSS · Ink + Rost", share: "⇗ teilen", rubrics: "RUBRIKEN", inCommon: "GEMEINSAM", moreIn: "MEHR AUS DER BEILAGE", relatedNote: "sortiert nach geteilten Rubriken · ohne diesen Beitrag · max 3", caption: "BILD", of: "VON" },
  EN: { back: "‹ to the supplement", read: "read", discuss: "Discuss in the forum", discussNote: "opens a pre-filled topic with title + link to this post — counts toward your 5 posts/day", print: "⏙ Print sheet (A4)", printNote: "2-color print CSS · ink + rust", share: "⇗ share", rubrics: "RUBRICS", inCommon: "IN COMMON", moreIn: "MORE FROM THE SUPPLEMENT", relatedNote: "ranked by shared rubrics · excluding this post · max 3", caption: "IMAGE", of: "OF" },
};

// ── NOVEL §01 · Lesefaden — sticky mini-mast + progress ───
function BlogReadBar({ lang = "DE", title, progress = 0.42, min = 6 }) {
  const L = BA_LL[lang];
  return (
    <div style={{ borderBottom: `1.5px solid ${BAK.color.ink}`, background: BAK.color.paperWarm, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 48px" }}>
        <span style={{ fontFamily: BAK.font.mono, fontSize: 10.5, color: BA_RUST_DEEP, whiteSpace: "nowrap" }}>{L.back}</span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "center" }}>Die <i style={{ fontFamily: BAK.font.serif, fontWeight: 400, color: BA_RUST }}>Beilage</i> · {title}</span>
        <span style={{ fontFamily: BAK.font.mono, fontSize: 10, color: BAK.color.inkMute, whiteSpace: "nowrap" }}>{Math.round(progress * 100)} % {L.read} · {min} {lang === "DE" ? "Min" : "min"}</span>
      </div>
      <div style={{ height: 4, background: BAK.color.paperSoft }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", background: BA_RUST, borderRight: `1.5px solid ${BAK.color.ink}` }} />
      </div>
    </div>
  );
}

// ── Article footer: tags + print + forum CTA ──────────────
function BlogArticleFooter({ post, lang = "DE" }) {
  const L = BA_LL[lang];
  return (
    <div style={{ marginTop: 28, borderTop: `2px solid ${BAK.color.ink}`, paddingTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: BAK.font.mono, fontSize: 10, letterSpacing: "0.14em", color: BAK.color.inkMute }}>{L.rubrics}</span>
        {post.tags.map((t) => <BaRubrik key={t} t={t} small />)}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: BAK.font.mono, fontSize: 11, padding: "7px 14px", border: `1.5px solid ${BAK.color.ink}`, borderRadius: BAK.r.pill }}>{L.share}</span>
        <span title={L.printNote} style={{ fontFamily: BAK.font.mono, fontSize: 11, padding: "7px 14px", border: `1.5px solid ${BAK.color.ink}`, borderRadius: BAK.r.pill }}>{L.print}</span>
      </div>
      {/* NOVEL §04 · Forum-CTA — wine ties back to the Forum surface */}
      <div style={{ marginTop: 16, border: BAK.border.inkBold, borderRadius: BAK.r.lg, background: BAK.color.paperWarm, boxShadow: BAK.shadow.print(), padding: "16px 20px", display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: "-0.015em" }}>{lang === "DE" ? <>Und was sagst <i style={{ fontFamily: BAK.font.serif, fontWeight: 400, color: BAK.color.wine }}>du</i> dazu?</> : <>And what do <i style={{ fontFamily: BAK.font.serif, fontWeight: 400, color: BAK.color.wine }}>you</i> think?</>}</div>
          <div style={{ fontFamily: BAK.font.mono, fontSize: 9.5, lineHeight: 1.5, color: BAK.color.inkMute, marginTop: 4 }}>{L.discussNote}</div>
        </div>
        <div style={{ padding: "10px 20px", background: BAK.color.wine, color: BAK.color.paper, border: BAK.border.ink, borderRadius: BAK.r.pill, fontSize: 14, fontWeight: 700, boxShadow: BAK.shadow.printSm(), whiteSpace: "nowrap" }}>{L.discuss} →</div>
      </div>
    </div>
  );
}

// ── NOVEL §02 · Rubrik-Rail — related by shared tags ──────
function BlogRelatedRail({ current = BA_POSTS[0], lang = "DE" }) {
  const L = BA_LL[lang];
  const scored = BA_POSTS.filter((p) => p.id !== current.id)
    .map((p) => ({ p, shared: p.tags.filter((t) => current.tags.includes(t)) }))
    .sort((a, b) => b.shared.length - a.shared.length).slice(0, 3);
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, borderBottom: `1px solid ${BAK.color.ink}`, paddingBottom: 6, marginBottom: 14 }}>
        <span style={{ fontFamily: BAK.font.mono, fontSize: 10.5, letterSpacing: "0.16em", color: BA_RUST }}>{L.moreIn}</span>
        <span style={{ fontFamily: BAK.font.mono, fontSize: 9, color: BAK.color.inkMute }}>{L.relatedNote}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
        {scored.map(({ p, shared }) => (
          <div key={p.id} style={{ border: BAK.border.ink, borderRadius: BAK.r.md, background: BAK.color.paperWarm, boxShadow: BAK.shadow.printSm(), padding: "14px 16px" }}>
            <div style={{ fontFamily: BAK.font.mono, fontSize: 9, letterSpacing: "0.1em", color: BA_RUST }}>{p.date.toUpperCase()}</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.2, margin: "5px 0 7px" }}>{p.title}</div>
            <div style={{ fontFamily: BAK.font.mono, fontSize: 8.5, color: shared.length ? BA_RUST_DEEP : BAK.color.inkMute }}>
              {shared.length ? `${L.inCommon}: ${shared.map((t) => "#" + t).join(" ")}` : (lang === "DE" ? "ZULETZT ERSCHIENEN" : "MOST RECENT")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared header bits ────────────────────────────────────
function BaStrap({ post, no }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontFamily: BAK.font.mono, fontSize: 10, letterSpacing: "0.16em", color: BA_RUST, borderLeft: `3px solid ${BA_RUST}`, paddingLeft: 10 }}>RUBRIK · {post.tags[0].toUpperCase()}</span>
      <span style={{ fontFamily: BAK.font.mono, fontSize: 10, color: BAK.color.inkMute }}>№ {no} / 6</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  STANDARD · Zeitungsseite
// ═══════════════════════════════════════════════════════════
function BlogArticleStandard({ lang = "DE" }) {
  const post = BA_POSTS[0];
  return (
    <BaPage minHeight={1450}>
      <BaNav active="Blog" lang={lang} />
      <BlogReadBar lang={lang} title={post.title} progress={0.42} min={post.min} />
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "30px 0 44px" }}>
        <BaStrap post={post} no={6} />
        <h1 style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.0, margin: "14px 0 12px" }}>{post.title}</h1>
        <div style={{ fontFamily: BAK.font.serif, fontStyle: "italic", fontSize: 20, lineHeight: 1.45, color: BAK.color.inkSoft, maxWidth: 780, marginBottom: 12 }}>{post.desc}</div>
        <BaMeta post={post} lang={lang} />
        <div style={{ margin: "18px 0 6px", border: BAK.border.ink, borderRadius: BAK.r.lg, overflow: "hidden", boxShadow: BAK.shadow.printSm() }}>
          <BaImg color={BA_RUST} label={post.cover} height={330} />
        </div>
        <div style={{ fontFamily: BAK.font.mono, fontSize: 9.5, color: BAK.color.inkMute, marginBottom: 20 }}>FOTO: MAHALLE-TEAM · SCHILLERPROMENADE</div>
        <div style={{ columns: 2, columnGap: 30, fontSize: 14.5, lineHeight: 1.62, color: BAK.color.inkSoft }}>
          <p style={{ margin: "0 0 14px", fontSize: 16, color: BAK.color.ink }}>{BA_BODY_CAFE[0]}</p>
          <p style={{ margin: "0 0 14px" }}>{BA_BODY_CAFE[1]}</p>
          <p style={{ margin: "0 0 14px" }}>{BA_BODY_CAFE[2]}</p>
          <div style={{ breakInside: "avoid", borderTop: `2px solid ${BAK.color.ink}`, borderBottom: `2px solid ${BAK.color.ink}`, padding: "14px 4px", margin: "6px 0 16px" }}>
            <div style={{ fontFamily: BAK.font.serif, fontStyle: "italic", fontSize: 21, lineHeight: 1.3, color: BA_RUST_DEEP }}>„Order a Milchkaffee on the Promenade and you taste thirty years of the Kiez.“</div>
          </div>
          <p style={{ margin: "0 0 14px" }}>{BA_BODY_CAFE[3]}</p>
          <p style={{ margin: "0 0 14px" }}>{BA_BODY_CAFE[4]}</p>
          <p style={{ margin: 0 }}>{BA_BODY_CAFE[5]}</p>
        </div>
        <BlogArticleFooter post={post} lang={lang} />
        <BlogRelatedRail current={post} lang={lang} />
      </div>
      {lang === "DE" && <>
        <BaNote top={100} right={22} color={BAK.color.ochre}>NOVEL §01 · Lesefaden: Balken = Scrollposition, Rost auf paperSoft. Leiste klebt oben (sticky). reduced-motion: bleibt — scrollgebunden, keine Animation.</BaNote>
        <BaNote top={430} left={22} color={BAK.color.sky} rotate={1}>postLayout „standard“ = Zeitungsseite: Rubrik-Strap, Standfirst kursiv, zweispaltiger Satz, Zwischenzitat mit Doppellinie.</BaNote>
        <BaNote bottom={430} right={22} color={BAK.color.ochre} rotate={-1}>NOVEL §04 · Wein = Forum-Farbe. CTA füllt /topics/create vor (Titel + Link), nichts wird automatisch gepostet.</BaNote>
        <BaNote bottom={130} left={22} color={BAK.color.ochre} rotate={1}>NOVEL §02 · Rubrik-Rail: Rang = Anzahl geteilter Tags, ohne sich selbst, max 3. Bei 0 Treffern: neueste Beiträge.</BaNote>
      </>}
    </BaPage>
  );
}

// ═══════════════════════════════════════════════════════════
//  HERO · Aufmacherseite
// ═══════════════════════════════════════════════════════════
function BlogArticleHero({ lang = "DE" }) {
  const post = BA_POSTS[4];
  return (
    <BaPage minHeight={1410}>
      <BaNav active="Blog" lang={lang} />
      <BlogReadBar lang={lang} title={post.title} progress={0.18} min={post.min} />
      {/* full-bleed cover with ink title band */}
      <div style={{ position: "relative" }}>
        <div style={{ height: 420, background: `repeating-linear-gradient(45deg, ${BA_RUST}40 0 10px, ${BAK.color.paperWarm} 10px 20px)`, borderBottom: BAK.border.inkBold, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: 14 }}>
          <span style={{ fontFamily: BAK.font.mono, fontSize: 10, letterSpacing: "0.08em", color: BAK.color.inkMute, background: BAK.color.paper, border: `1px solid ${BAK.color.rule}`, borderRadius: 4, padding: "2px 8px" }}>COVER · {post.cover.toUpperCase()}</span>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -74, display: "flex", justifyContent: "center" }}>
          <div style={{ background: BAK.color.ink, color: BAK.color.paper, border: BAK.border.inkBold, borderRadius: BAK.r.lg, boxShadow: BAK.shadow.print(BA_RUST), padding: "20px 34px", maxWidth: 760, textAlign: "center" }}>
            <div style={{ fontFamily: BAK.font.mono, fontSize: 9.5, letterSpacing: "0.2em", color: BA_RUST === "#a3552e" ? "#e0966b" : BA_RUST }}>AUFMACHER · RUBRIK {post.tags[0].toUpperCase()} · № 2 / 6</div>
            <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.02, margin: "8px 0 0" }}>{post.title}</h1>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "98px 0 44px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: BAK.font.serif, fontStyle: "italic", fontSize: 19, lineHeight: 1.45, color: BAK.color.inkSoft }}>{post.desc}</div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}><BaMeta post={post} lang={lang} /></div>
          <div style={{ width: 56, height: 3, background: BA_RUST, margin: "16px auto 20px" }} />
        </div>
        <div style={{ fontSize: 15.5, lineHeight: 1.68, color: BAK.color.inkSoft }}>
          <p style={{ margin: "0 0 16px", fontSize: 17, color: BAK.color.ink }}>{BA_BODY_SPOT[0]}</p>
          <p style={{ margin: "0 0 16px" }}>{BA_BODY_SPOT[1]}</p>
          <p style={{ margin: 0 }}>{BA_BODY_SPOT[2]}</p>
        </div>
        <BlogArticleFooter post={post} lang={lang} />
        <BlogRelatedRail current={post} lang={lang} />
      </div>
      {lang === "DE" && <BaNote top={480} left={22} color={BAK.color.sky}>postLayout „hero“ = Aufmacherseite: Vollbild-Cover, Titel auf Ink-Band mit Rost-Druckschatten, einspaltiger ruhiger Lesefluss.</BaNote>}
    </BaPage>
  );
}

// ═══════════════════════════════════════════════════════════
//  GALLERY · Bildstrecke
// ═══════════════════════════════════════════════════════════
function BlogArticleGallery({ lang = "DE" }) {
  const post = BA_POSTS[5];
  const L = BA_LL[lang];
  return (
    <BaPage minHeight={1840}>
      <BaNav active="Blog" lang={lang} />
      <BlogReadBar lang={lang} title={post.title} progress={0.66} min={post.min} />
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "30px 0 44px" }}>
        <BaStrap post={post} no={1} />
        <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.0, margin: "14px 0 12px" }}>{post.title}</h1>
        <div style={{ fontFamily: BAK.font.serif, fontStyle: "italic", fontSize: 19, lineHeight: 1.45, color: BAK.color.inkSoft, maxWidth: 760, marginBottom: 12 }}>{post.desc}</div>
        <BaMeta post={post} lang={lang} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "26px 24px", marginTop: 24 }}>
          {BA_GALLERY.map((g, i) => (
            <div key={i} style={{ gridColumn: i === 0 ? "1 / -1" : "auto" }}>
              <div style={{ border: BAK.border.ink, borderRadius: BAK.r.lg, overflow: "hidden", boxShadow: BAK.shadow.printSm() }}>
                <BaImg color={g.c} label={g.l} height={i === 0 ? 300 : 190} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "baseline" }}>
                <span style={{ fontFamily: BAK.font.mono, fontSize: 9.5, letterSpacing: "0.1em", color: BA_RUST, whiteSpace: "nowrap" }}>{L.caption} {String(i + 1).padStart(2, "0")} / 06</span>
                <span style={{ fontSize: 12, lineHeight: 1.45, color: BAK.color.inkSoft }}>{g.cap}</span>
              </div>
            </div>
          ))}
        </div>
        <BlogArticleFooter post={post} lang={lang} />
        <BlogRelatedRail current={post} lang={lang} />
      </div>
      {lang === "DE" && <BaNote top={330} right={22} color={BAK.color.sky} rotate={1}>postLayout „gallery“ = Bildstrecke: Bild 01 volle Breite, dann 2er-Raster. Nummerierte Unterschriften — BILD 01/06 — wie im Druck.</BaNote>}
    </BaPage>
  );
}

Object.assign(window, { BlogReadBar, BlogArticleFooter, BlogRelatedRail, BlogArticleStandard, BlogArticleHero, BlogArticleGallery, BA_BODY_CAFE, BA_BODY_SPOT, BA_GALLERY, BA_LL });

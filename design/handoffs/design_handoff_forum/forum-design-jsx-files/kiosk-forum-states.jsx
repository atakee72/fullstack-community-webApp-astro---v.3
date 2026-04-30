/* global React, kiosk, kioskFonts, paperGrainStyle,
   PostTypeChip, FilterChip, StatusBadge, KioskBtn, KioskAvatar,
   KioskNav, ForumTitleBlock, ForumFilterRail, ForumPostCard,
   SEED_POSTS, StripedPlaceholder */

// ══════════════════════════════════════════════════════════
//  KIOSK · FORUM · STATE MATRIX
//  Every state from the spec, desktop + mobile variants.
//  Loading, empty (filter), empty (zero posts), error, offline,
//  rate-limited, AI-flagged-pending, rejected, reported,
//  optimistic-pending submit.
// ══════════════════════════════════════════════════════════

// ─── Skeleton primitives ───────────────────────────────────
function SkelBar({ w = "100%", h = 12, mb = 6, dark }) {
  return (
    <div style={{
      width: w, height: h, marginBottom: mb,
      background: dark ? "rgba(243,234,216,0.12)" : "rgba(27,26,23,0.08)",
      borderRadius: 4,
      backgroundImage: dark
        ? "linear-gradient(90deg, transparent 0%, rgba(243,234,216,0.18) 50%, transparent 100%)"
        : "linear-gradient(90deg, transparent 0%, rgba(27,26,23,0.04) 50%, transparent 100%)",
      backgroundSize: "200% 100%",
      animation: "skel 1.4s ease infinite",
    }} />
  );
}

function SkelCard({ kind = "topic" }) {
  const map = {
    topic: { bg: kiosk.color.paperWarm, border: kiosk.color.ink, w: 1.5 },
    announcement: { bg: kiosk.color.ink, border: kiosk.color.ink, w: 2, dark: true },
    recommendation: { bg: kiosk.color.paperWarm, border: kiosk.color.moss, w: 1.5 },
  }[kind];
  return (
    <div style={{
      background: map.bg, border: `${map.w}px solid ${map.border}`,
      borderRadius: kiosk.r.lg, padding: "16px 18px", minHeight: 220,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: map.dark ? "rgba(243,234,216,0.12)" : "rgba(27,26,23,0.1)" }} />
          <div>
            <SkelBar w={70} h={9} mb={4} dark={map.dark} />
            <SkelBar w={48} h={7} mb={0} dark={map.dark} />
          </div>
        </div>
        <SkelBar w={80} h={16} mb={0} dark={map.dark} />
      </div>
      <SkelBar w="92%" h={18} dark={map.dark} />
      <SkelBar w="76%" h={18} dark={map.dark} />
      <div style={{ marginTop: 10 }}>
        <SkelBar w="100%" h={10} dark={map.dark} />
        <SkelBar w="94%" h={10} dark={map.dark} />
        <SkelBar w="68%" h={10} dark={map.dark} />
      </div>
    </div>
  );
}

const skelKeyframes = `
  @keyframes skel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
`;

// ═════════════════════════════════════════════════════════
//  DESKTOP STATES
// ═════════════════════════════════════════════════════════

// 1. Loading skeleton
function ForumDesktopLoading({ lang = "DE" }) {
  return (
    <ForumShellDesktop lang={lang}>
      <style>{skelKeyframes}</style>
      <section style={{ padding: "8px 36px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div style={{ gridColumn: "span 3" }}><SkelCard kind="announcement" /></div>
        <SkelCard kind="topic" />
        <SkelCard kind="recommendation" />
        <SkelCard kind="topic" />
        <SkelCard kind="topic" />
        <SkelCard kind="recommendation" />
      </section>
      <FooterRule lang={lang} loading />
    </ForumShellDesktop>
  );
}

// 2. Empty (no results for active filter)
function ForumDesktopEmptyFilter({ lang = "DE" }) {
  return (
    <ForumShellDesktop lang={lang} activeFilter="kita">
      <div style={{ margin: "60px 36px", padding: "60px 40px", border: `2px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.xl, textAlign: "center", background: kiosk.color.paperWarm, position: "relative" }}>
        <div style={{ fontSize: 64, fontFamily: kiosk.font.serif, fontStyle: "italic", color: kiosk.color.wine, lineHeight: 1, marginBottom: 8 }}>still.</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          {lang === "DE" ? "Hier ist's gerade ruhig." : "All quiet here."}
        </h2>
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 17, color: kiosk.color.inkSoft, maxWidth: 480, margin: "0 auto 18px" }}>
          {lang === "DE"
            ? "Keine Beiträge mit #kita in den letzten 30 Tagen. Magst du den Anfang machen?"
            : "No posts tagged #kita in the last 30 days. Want to start the conversation?"}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <KioskBtn>{lang === "DE" ? "+ erstes Thema" : "+ start a topic"}</KioskBtn>
          <KioskBtn variant="outline">{lang === "DE" ? "Filter zurücksetzen" : "clear filter"}</KioskBtn>
        </div>
        <div style={{ marginTop: 24, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
          {lang === "DE" ? "VERWANDTE TAGS" : "RELATED TAGS"} ·
          <span style={{ marginLeft: 8 }}>#familie · #spielplatz · #schule · #betreuung</span>
        </div>
      </div>
      <FooterRule lang={lang} />
    </ForumShellDesktop>
  );
}

// 3. Empty (zero posts ever)
function ForumDesktopEmptyZero({ lang = "DE" }) {
  return (
    <ForumShellDesktop lang={lang}>
      <div style={{ margin: "40px 36px", padding: "70px 50px 60px", background: kiosk.color.ink, color: kiosk.color.paper, borderRadius: kiosk.r.xl, position: "relative", overflow: "hidden", border: kiosk.border.ink, boxShadow: kiosk.shadow.print(kiosk.color.wine) }}>
        {/* riso sun */}
        <svg style={{ position: "absolute", right: -60, top: -60, opacity: 0.25 }} width="280" height="280" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="30" fill={kiosk.color.ochre} />
          {[...Array(12)].map((_, i) => <rect key={i} x="49" y="4" width="2" height="12" fill={kiosk.color.ochre} transform={`rotate(${i * 30} 50 50)`} />)}
        </svg>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.18em", color: kiosk.color.ochre }}>NEU IM KIEZ · TAG 01</div>
        <h2 style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "10px 0 14px", maxWidth: 700 }}>
          {lang === "DE" ? <>Noch keine Beiträge.<br/><span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.ochre }}>Sei die erste Stimme.</span></> : <>No posts yet.<br/><span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.ochre }}>Be the first voice.</span></>}
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: "rgba(243,234,216,0.75)", maxWidth: 560, marginBottom: 22 }}>
          {lang === "DE"
            ? "Mahalle ist neu in Schillerkiez. Erzähl was — vom Späti um die Ecke, von einer Bauarbeit, einer Empfehlung. Andere Nachbarn werden mitlesen."
            : "Mahalle is new in Schillerkiez. Share something — about the Späti next door, a construction notice, a recommendation. Your neighbors will read."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <KioskBtn>{lang === "DE" ? "+ erstes Thema" : "+ first post"}</KioskBtn>
          <KioskBtn variant="outline">{lang === "DE" ? "Wie funktioniert's?" : "How it works"}</KioskBtn>
        </div>
      </div>
      <FooterRule lang={lang} />
    </ForumShellDesktop>
  );
}

// 4. Error (server)
function ForumDesktopError({ lang = "DE" }) {
  return (
    <ForumShellDesktop lang={lang}>
      <div style={{ margin: "60px 36px", padding: "50px 40px", background: kiosk.color.paperWarm, border: `2px solid ${kiosk.color.danger}`, borderRadius: kiosk.r.xl, position: "relative", boxShadow: kiosk.shadow.print(kiosk.color.danger) }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.danger, letterSpacing: "0.15em", marginBottom: 6 }}>FEHLER · 503 · API NICHT ERREICHBAR</div>
        <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 8px" }}>
          {lang === "DE" ? "Da hakt's gerade." : "Something's stuck."}
        </h2>
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 17, color: kiosk.color.inkSoft, maxWidth: 600, marginBottom: 18 }}>
          {lang === "DE"
            ? "Wir kommen gerade nicht ans Forum. Das liegt nicht an dir. Wir versuchen's gleich nochmal — oder du klickst auf neu laden."
            : "We can't reach the forum right now. Not your fault. We'll retry — or hit reload."}
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <KioskBtn>{lang === "DE" ? "↻ neu laden" : "↻ reload"}</KioskBtn>
          <KioskBtn variant="ghost">{lang === "DE" ? "Status-Seite" : "status page"} ↗</KioskBtn>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, marginLeft: "auto" }}>
            {lang === "DE" ? "automatischer Versuch in" : "auto-retry in"} <b style={{ color: kiosk.color.danger }}>00:08</b>
          </span>
        </div>
      </div>
      <FooterRule lang={lang} />
    </ForumShellDesktop>
  );
}

// 5. Offline / cached
function ForumDesktopOffline({ lang = "DE" }) {
  return (
    <ForumShellDesktop lang={lang}>
      {/* Offline banner */}
      <div style={{ margin: "10px 36px 0", padding: "8px 14px", background: kiosk.color.ink, color: kiosk.color.paper, borderRadius: kiosk.r.md, display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: kiosk.color.warn, animation: "pulse 1.6s ease infinite" }} />
        <b style={{ fontFamily: kiosk.font.mono, fontSize: 10, letterSpacing: "0.1em" }}>OFFLINE</b>
        <span style={{ opacity: 0.85 }}>
          {lang === "DE" ? "Du siehst gespeicherte Beiträge von vor 22 min. Neue Posts kommen, sobald du wieder online bist." : "You're viewing cached posts from 22 min ago. New posts arrive when you're back online."}
        </span>
      </div>
      <section style={{ padding: "16px 36px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {SEED_POSTS.slice(0, 3).map((p) => (
          <div key={p.id} style={{ filter: "grayscale(0.4) opacity(0.85)" }}>
            <ForumPostCard post={p} lang={lang} />
          </div>
        ))}
      </section>
      <FooterRule lang={lang} offline />
    </ForumShellDesktop>
  );
}

// 6. Rate-limited (compose)
function ForumDesktopRateLimit({ lang = "DE" }) {
  return (
    <ForumShellDesktop lang={lang}>
      <div style={{ margin: "40px auto", maxWidth: 720, padding: "40px 36px", background: kiosk.color.ochre, border: kiosk.border.inkBold, borderRadius: kiosk.r.xl, boxShadow: kiosk.shadow.print() }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.15em", color: kiosk.color.ink }}>{lang === "DE" ? "LIMIT ERREICHT · 5 BEITRÄGE / STUNDE" : "LIMIT HIT · 5 POSTS / HOUR"}</div>
        <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.025em", margin: "8px 0 8px" }}>
          {lang === "DE" ? "Pause für Mahalle." : "Mahalle says: take a breath."}
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.5, marginBottom: 18, maxWidth: 560 }}>
          {lang === "DE"
            ? "Du hast 5 Beiträge in der letzten Stunde geschrieben — das ist viel! Wir geben Mahalle und allen anderen Lesenden ein bisschen Zeit. Du kannst in 47 Minuten wieder posten."
            : "You've made 5 posts in the last hour — that's a lot! We're giving Mahalle and other readers some breathing room. You can post again in 47 minutes."}
        </p>
        <div style={{ background: kiosk.color.paper, border: kiosk.border.ink, borderRadius: kiosk.r.md, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.1em" }}>{lang === "DE" ? "ZURÜCK ZUM POSTEN IN" : "POSTING UNLOCKS IN"}</span>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 28, fontWeight: 700 }}>00:47:12</span>
        </div>
        <div style={{ marginTop: 14, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 14, color: kiosk.color.inkSoft }}>
          {lang === "DE" ? "In der Zwischenzeit: Lesen, Kommentieren, ein Beitrag merken. Auch Stille ist Teil der Nachbarschaft." : "Meanwhile: read, comment, bookmark. Quiet time is part of the neighborhood too."}
        </div>
      </div>
      <FooterRule lang={lang} />
    </ForumShellDesktop>
  );
}

// 7. AI-flagged · pending review (own post)
function ForumDesktopFlaggedPending({ lang = "DE" }) {
  const myPost = {
    id: "my01", kind: "topic",
    title: "Was ein Mist mit der Müllabfuhr — diese Woche zum dritten Mal vergessen!",
    titleEN: "What a mess with the trash pickup — third time forgotten this week!",
    body: "Ich raste aus. Echt jetzt. Wir sehen alle die volle Tonne und niemand macht was.",
    bodyEN: "I'm losing it. Seriously. We all see the overflowing bin and nobody does anything.",
    a: "Ercan A.", aColor: kiosk.color.wine,
    tags: ["#müll", "#bsr"],
    ts: lang === "DE" ? "vor 12 sek" : "12 sec ago",
    replies: 0, likes: 0, bookmarked: false, img: null,
  };
  return (
    <ForumShellDesktop lang={lang}>
      <section style={{ padding: "8px 36px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* My pending post — top, full-width with explainer */}
        <div style={{ gridColumn: "span 3", border: `2px dashed ${kiosk.color.warn}`, borderRadius: kiosk.r.lg, padding: 4, position: "relative" }}>
          <div style={{ display: "flex", gap: 12, padding: "10px 12px", background: `${kiosk.color.warn}22`, borderTopLeftRadius: kiosk.r.md, borderTopRightRadius: kiosk.r.md, marginBottom: 4, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: kiosk.color.warn, color: kiosk.color.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>◐</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <b style={{ fontSize: 13.5 }}>{lang === "DE" ? "Dein Beitrag wird gerade gelesen." : "We're reading your post."}</b>
                <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>{lang === "DE" ? "üblich: 30–90 sek" : "usual: 30–90 sec"}</span>
              </div>
              <div style={{ fontSize: 12.5, color: kiosk.color.inkSoft, marginTop: 4, lineHeight: 1.5 }}>
                {lang === "DE"
                  ? "Während der Prüfung sehen andere Nachbar:innen den Beitrag noch nicht. Du musst nichts tun. Danach wird er freigegeben — manchmal mit Hinweis — oder nicht freigegeben."
                  : "While we review, other neighbours don't see the post yet. Nothing for you to do. Afterwards it goes live — sometimes with a notice — or it doesn't."}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                <StatusBadge kind="pending" />
                <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, alignSelf: "center" }}>
                  {lang === "DE" ? "nur du siehst diesen Status" : "only you see this status"}
                </span>
              </div>
            </div>
          </div>
          <ForumPostCard post={myPost} lang={lang} optimistic />
        </div>
        {/* Rest of feed continues */}
        {SEED_POSTS.slice(1, 5).map((p) => <ForumPostCard key={p.id} post={p} lang={lang} />)}
      </section>
      <FooterRule lang={lang} />
    </ForumShellDesktop>
  );
}

// 8. Rejected (own post — visible only to author, kept in DB as proof)
function ForumDesktopRejected({ lang = "DE" }) {
  const myPost = {
    id: "my02", kind: "topic",
    title: "Was ein Mist mit der Müllabfuhr — diese Woche zum dritten Mal vergessen!",
    titleEN: "What a mess with the trash pickup — third time forgotten this week!",
    body: "Ich raste aus. Echt jetzt. Wir sehen alle die volle Tonne und diese Idioten machen nichts.",
    bodyEN: "I'm losing it. Seriously. We all see the overflowing bin and these idiots do nothing.",
    a: "Ercan A.", aColor: kiosk.color.wine,
    tags: ["#müll", "#bsr"],
    ts: lang === "DE" ? "vor 4 min" : "4 min ago",
    replies: 0, likes: 0, bookmarked: false, img: null,
  };
  return (
    <ForumShellDesktop lang={lang}>
      <section style={{ padding: "8px 36px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* Quiet rejection note — only the author sees this */}
        <div style={{
          gridColumn: "span 3",
          background: kiosk.color.paperWarm,
          border: `1.5px solid ${kiosk.color.danger}`,
          borderRadius: kiosk.r.lg, padding: "14px 18px",
        }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: kiosk.color.danger, color: kiosk.color.paper,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>✕</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <b style={{ fontSize: 14 }}>
                  {lang === "DE" ? "Dein Beitrag wurde nicht freigegeben." : "Your post wasn't approved."}
                </b>
                <StatusBadge kind="rejected" />
              </div>
              <p style={{ fontSize: 13, color: kiosk.color.inkSoft, lineHeight: 1.55, margin: "6px 0 0", maxWidth: 720 }}>
                {lang === "DE"
                  ? "Andere Nachbar:innen sehen ihn nicht. Du siehst ihn weiterhin in deiner Übersicht. Wir behalten ihn intern, falls du dich an die Moderation wenden möchtest."
                  : "Other neighbours can't see it. You still see it in your own view. We keep it internally in case you want to reach out to moderation."}
              </p>
            </div>
          </div>
        </div>

        {/* The post — ghosted, with rejected badge, visible only in the author's own view */}
        <div style={{ gridColumn: "span 3" }}>
          <ForumPostCard post={myPost} lang={lang} ghosted statusBadge="rejected" />
        </div>

        {SEED_POSTS.slice(0, 3).map((p) => <ForumPostCard key={p.id} post={p} lang={lang} />)}
      </section>
      <FooterRule lang={lang} />
    </ForumShellDesktop>
  );
}

// 9. Reported by others (post visible with banner; content held)
function ForumDesktopReported({ lang = "DE" }) {
  const reportedPost = {
    id: "rep01", kind: "topic",
    title: lang === "DE" ? "[Beitrag wegen Meldung verborgen]" : "[Post hidden pending review]",
    titleEN: "[Post hidden pending review]",
    body: "—", bodyEN: "—",
    a: "—", aColor: kiosk.color.inkMute,
    tags: [], ts: lang === "DE" ? "vor 14 min" : "14 min ago",
    replies: 23, likes: 8, bookmarked: false, img: null,
  };
  return (
    <ForumShellDesktop lang={lang}>
      <section style={{ padding: "8px 36px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div style={{ gridColumn: "span 3", background: `${kiosk.color.plum}15`, border: `1.5px solid ${kiosk.color.plum}`, borderRadius: kiosk.r.lg, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: kiosk.color.plum, color: kiosk.color.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>⚑</div>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 13.5 }}>{lang === "DE" ? "Ein Beitrag wurde von Nachbar:innen gemeldet." : "A post was flagged by neighbors."}</b>
            <div style={{ fontSize: 12.5, color: kiosk.color.inkSoft, marginTop: 2 }}>
              {lang === "DE" ? "Während wir prüfen, ist er für andere ausgeblendet — du siehst nur, dass er existiert." : "While we review, it's hidden from others — you only see it exists."}
            </div>
          </div>
          <KioskBtn variant="ghost" small>{lang === "DE" ? "Mehr erfahren" : "Learn more"}</KioskBtn>
        </div>
        <ForumPostCard post={reportedPost} lang={lang} ghosted statusBadge="flagged" />
        {SEED_POSTS.slice(1, 5).map((p) => <ForumPostCard key={p.id} post={p} lang={lang} />)}
      </section>
      <FooterRule lang={lang} />
    </ForumShellDesktop>
  );
}

// 10. Optimistic submit (just-published, sliding in)
function ForumDesktopOptimistic({ lang = "DE" }) {
  const justPosted = {
    id: "new01", kind: "recommendation",
    title: lang === "DE" ? "Neue Spätsommer-Bowls bei Café Selig — empfehle dringend" : "New late-summer bowls at Café Selig — strong rec",
    titleEN: "New late-summer bowls at Café Selig — strong rec",
    body: lang === "DE" ? "Vegan, 9.50€, riesige Portion. Inhaberin freut sich übrigens über mehr Mahalle-Gäste." : "Vegan, 9.50€, huge portion. The owner says hi to more Mahalle visitors.",
    bodyEN: "Vegan, 9.50€, huge portion. The owner says hi to more Mahalle visitors.",
    a: "Ercan A.", aColor: kiosk.color.wine,
    tags: ["#essen", "#café-selig"],
    ts: lang === "DE" ? "gerade eben" : "just now",
    replies: 0, likes: 0, bookmarked: false,
    img: { type: "placeholder", color: kiosk.color.moss, label: "your photo · café selig" },
  };
  return (
    <ForumShellDesktop lang={lang}>
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 0.78; transform: translateY(0); } }`}</style>
      <section style={{ padding: "8px 36px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div style={{ gridColumn: "span 3", animation: "slideIn .38s cubic-bezier(.2,.7,.3,1) forwards" }}>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: -8, left: 14, zIndex: 2, background: kiosk.color.success, color: kiosk.color.paper, fontFamily: kiosk.font.mono, fontSize: 9.5, padding: "3px 10px", borderRadius: 10, letterSpacing: "0.1em" }}>
              {lang === "DE" ? "✓ DEIN POST · WIRD GEPRÜFT" : "✓ YOUR POST · UNDER REVIEW"}
            </div>
            <ForumPostCard post={justPosted} lang={lang} optimistic statusBadge="pending" />
          </div>
        </div>
        {SEED_POSTS.slice(0, 4).map((p) => <ForumPostCard key={p.id} post={p} lang={lang} />)}
      </section>
      <FooterRule lang={lang} live />
    </ForumShellDesktop>
  );
}

// ─── Shared shell wrapper ──────────────────────────────────
function ForumShellDesktop({ children, lang, activeFilter }) {
  return (
    <div style={{
      width: 1280, height: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <KioskNav active="Forum" lang={lang} />
      <ForumTitleBlock lang={lang} />
      <ForumFilterRail lang={lang} activeKind={activeFilter} />
      {children}
    </div>
  );
}

function FooterRule({ lang, live, offline, loading }) {
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 36px", display: "flex", justifyContent: "space-between", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, borderTop: `1px dashed ${kiosk.color.rule}`, background: kiosk.color.paper }}>
      <span>{loading ? (lang === "DE" ? "LADE…" : "LOADING…") : lang === "DE" ? "1 / 18 SEITEN" : "1 / 18 PAGES"}</span>
      <span style={{ color: offline ? kiosk.color.warn : live ? kiosk.color.success : kiosk.color.wine }}>
        {offline ? "● OFFLINE · CACHED" : live ? "● LIVE · post just landed" : "↻ live · last 28 min ago"}
      </span>
      <span>{lang === "DE" ? "MEHR LADEN ↓" : "LOAD MORE ↓"}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
//  MOBILE STATES — condensed; same vocabulary, mobile shell
// ═════════════════════════════════════════════════════════
function MobileShell({ children, lang, banner }) {
  return (
    <div style={{
      width: 390, height: 844, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}{skelKeyframes}</style>
      <div style={paperGrainStyle} />
      {/* status bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", fontFamily: kiosk.font.mono, fontSize: 13, fontWeight: 600 }}>
        <span>14:42</span><span>● ● ●</span>
      </div>
      {/* compact nav */}
      <header style={{ padding: "8px 18px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, background: kiosk.color.wine, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: kiosk.color.paper, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 19, border: kiosk.border.ink }}>m</div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em" }}>mahalle · forum</div>
        </div>
        <div style={{ display: "flex", border: kiosk.border.ink, borderRadius: kiosk.r.pill, fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 600 }}>
          <span style={{ padding: "3px 8px", background: lang === "DE" ? kiosk.color.ink : "transparent", color: lang === "DE" ? kiosk.color.paper : kiosk.color.ink, borderRadius: `${kiosk.r.pill}px 0 0 ${kiosk.r.pill}px` }}>DE</span>
          <span style={{ padding: "3px 8px", background: lang === "EN" ? kiosk.color.ink : "transparent", color: lang === "EN" ? kiosk.color.paper : kiosk.color.ink, borderLeft: kiosk.border.ink, borderRadius: `0 ${kiosk.r.pill}px ${kiosk.r.pill}px 0` }}>EN</span>
        </div>
      </header>
      {banner}
      <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

function ForumMobileLoading({ lang = "DE" }) {
  return (
    <MobileShell lang={lang}>
      <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <SkelBar w="60%" h={26} mb={4} />
        <SkelBar w="40%" h={10} />
        <SkelCard kind="announcement" />
        <SkelCard kind="topic" />
        <SkelCard kind="recommendation" />
      </div>
    </MobileShell>
  );
}

function ForumMobileEmpty({ lang = "DE" }) {
  return (
    <MobileShell lang={lang}>
      <div style={{ padding: "60px 22px 0", textAlign: "center" }}>
        <div style={{ fontSize: 48, fontFamily: kiosk.font.serif, fontStyle: "italic", color: kiosk.color.wine, lineHeight: 1, marginBottom: 6 }}>still.</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          {lang === "DE" ? "Noch keine Beiträge." : "No posts yet."}
        </h2>
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 14, color: kiosk.color.inkSoft, marginBottom: 18 }}>
          {lang === "DE" ? "Sei die erste Stimme im Schillerkiez heute." : "Be the first voice in Schillerkiez today."}
        </p>
        <KioskBtn>{lang === "DE" ? "+ erstes Thema" : "+ first post"}</KioskBtn>
      </div>
    </MobileShell>
  );
}

function ForumMobileError({ lang = "DE" }) {
  return (
    <MobileShell lang={lang}>
      <div style={{ margin: "32px 18px", padding: "24px 18px", background: kiosk.color.paperWarm, border: `2px solid ${kiosk.color.danger}`, borderRadius: kiosk.r.lg, boxShadow: kiosk.shadow.printSm(kiosk.color.danger) }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.danger, letterSpacing: "0.12em" }}>FEHLER · 503</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", margin: "6px 0" }}>
          {lang === "DE" ? "Da hakt's gerade." : "Something's stuck."}
        </h2>
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 14, color: kiosk.color.inkSoft, margin: "0 0 12px" }}>
          {lang === "DE" ? "Wir versuchen's gleich nochmal." : "We'll retry shortly."}
        </p>
        <KioskBtn>{lang === "DE" ? "↻ neu laden" : "↻ reload"}</KioskBtn>
      </div>
    </MobileShell>
  );
}

function ForumMobileOffline({ lang = "DE" }) {
  return (
    <MobileShell lang={lang} banner={
      <div style={{ margin: "8px 18px 0", padding: "6px 12px", background: kiosk.color.ink, color: kiosk.color.paper, borderRadius: kiosk.r.sm, display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: kiosk.color.warn }} />
        <b style={{ fontFamily: kiosk.font.mono, fontSize: 9, letterSpacing: "0.1em" }}>OFFLINE</b>
        <span style={{ opacity: 0.85 }}>{lang === "DE" ? "vor 22 min gespeichert" : "cached 22 min ago"}</span>
      </div>
    }>
      <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 12, filter: "grayscale(0.4) opacity(0.85)" }}>
        {SEED_POSTS.slice(0, 3).map((p) => <ForumPostCard key={p.id} post={p} lang={lang} />)}
      </div>
    </MobileShell>
  );
}

function ForumMobileFlaggedPending({ lang = "DE" }) {
  const myPost = {
    id: "myM1", kind: "topic",
    title: lang === "DE" ? "Müllabfuhr — diese Woche zum dritten Mal vergessen" : "Trash pickup forgotten — third time this week",
    titleEN: "Trash pickup forgotten — third time this week",
    body: lang === "DE" ? "Wir sehen alle die volle Tonne." : "We all see the full bin.",
    bodyEN: "We all see the full bin.",
    a: "Ercan A.", aColor: kiosk.color.wine,
    tags: ["#müll"], ts: "vor 12 sek", replies: 0, likes: 0, bookmarked: false, img: null,
  };
  return (
    <MobileShell lang={lang}>
      <div style={{ padding: "10px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: `${kiosk.color.warn}22`, border: `1.5px dashed ${kiosk.color.warn}`, borderRadius: kiosk.r.md, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: kiosk.color.warn, color: kiosk.color.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>◐</div>
          <div>
            <b style={{ fontSize: 12.5 }}>{lang === "DE" ? "Wir lesen kurz quer." : "Quick check happening."}</b>
            <div style={{ fontSize: 11.5, color: kiosk.color.inkSoft, marginTop: 2, lineHeight: 1.4 }}>
              {lang === "DE" ? "Üblich: 30–90 sek. Nur du siehst diesen Status." : "Usual: 30–90 sec. Only you see this status."}
            </div>
          </div>
        </div>
        <ForumPostCard post={myPost} lang={lang} optimistic />
        <ForumPostCard post={SEED_POSTS[0]} lang={lang} />
      </div>
    </MobileShell>
  );
}

function ForumMobileRejected({ lang = "DE" }) {
  const myPost = {
    id: "myM2", kind: "topic",
    title: "Was ein Mist mit der Müllabfuhr — diese Woche zum dritten Mal vergessen!",
    titleEN: "What a mess with the trash pickup — third time forgotten this week!",
    body: "Ich raste aus. Echt jetzt. Wir sehen alle die volle Tonne.",
    bodyEN: "I'm losing it. Seriously. We all see the overflowing bin.",
    a: "Ercan A.", aColor: kiosk.color.wine,
    tags: ["#müll"], ts: lang === "DE" ? "vor 4 min" : "4 min ago",
    replies: 0, likes: 0, bookmarked: false, img: null,
  };
  return (
    <MobileShell lang={lang}>
      <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{
          background: kiosk.color.paperWarm,
          border: `1.5px solid ${kiosk.color.danger}`,
          borderRadius: kiosk.r.md, padding: "12px 14px",
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: kiosk.color.danger, color: kiosk.color.paper,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
            }}>✕</div>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, letterSpacing: "-0.015em" }}>
              {lang === "DE" ? "Nicht freigegeben" : "Not approved"}
            </h3>
          </div>
          <p style={{ fontSize: 12.5, color: kiosk.color.inkSoft, lineHeight: 1.5, margin: "0" }}>
            {lang === "DE"
              ? "Andere sehen ihn nicht. Du siehst ihn weiter in deiner Übersicht."
              : "Others can't see it. You still see it in your own view."}
          </p>
        </div>
        <ForumPostCard post={myPost} lang={lang} ghosted statusBadge="rejected" />
      </div>
    </MobileShell>
  );
}

function ForumMobileRateLimit({ lang = "DE" }) {
  return (
    <MobileShell lang={lang}>
      <div style={{ padding: "20px 18px" }}>
        <div style={{ background: kiosk.color.ochre, border: kiosk.border.inkBold, borderRadius: kiosk.r.lg, padding: "20px 18px", boxShadow: kiosk.shadow.print() }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, letterSpacing: "0.12em" }}>{lang === "DE" ? "LIMIT · 5/STD" : "LIMIT · 5/HR"}</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.025em", margin: "6px 0 8px" }}>{lang === "DE" ? "Pause." : "Breathe."}</h2>
          <p style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 14 }}>
            {lang === "DE" ? "Du hast 5 Posts in 1h gemacht. Wieder posten in:" : "You made 5 posts in 1h. Posting unlocks in:"}
          </p>
          <div style={{ background: kiosk.color.paper, border: kiosk.border.ink, borderRadius: kiosk.r.sm, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, letterSpacing: "0.08em" }}>{lang === "DE" ? "ENTSPERRT IN" : "UNLOCKS IN"}</span>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 22, fontWeight: 700 }}>00:47:12</span>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}

function ForumMobileOptimistic({ lang = "DE" }) {
  const justPosted = {
    id: "newM1", kind: "recommendation",
    title: lang === "DE" ? "Spätsommer-Bowls bei Café Selig — empfehle dringend" : "Late-summer bowls at Café Selig — strong rec",
    titleEN: "Late-summer bowls at Café Selig — strong rec",
    body: lang === "DE" ? "Vegan, 9.50€." : "Vegan, 9.50€.",
    bodyEN: "Vegan, 9.50€.",
    a: "Ercan A.", aColor: kiosk.color.wine,
    tags: ["#essen"], ts: lang === "DE" ? "gerade" : "now", replies: 0, likes: 0,
    bookmarked: false, img: null,
  };
  return (
    <MobileShell lang={lang}>
      <div style={{ padding: "10px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ position: "relative", animation: "slideIn .38s cubic-bezier(.2,.7,.3,1) forwards" }}>
          <div style={{ position: "absolute", top: -6, left: 12, zIndex: 2, background: kiosk.color.success, color: kiosk.color.paper, fontFamily: kiosk.font.mono, fontSize: 8.5, padding: "2px 8px", borderRadius: 8, letterSpacing: "0.08em" }}>
            {lang === "DE" ? "✓ DEIN POST" : "✓ YOUR POST"}
          </div>
          <ForumPostCard post={justPosted} lang={lang} optimistic statusBadge="pending" />
        </div>
        {SEED_POSTS.slice(0, 2).map((p) => <ForumPostCard key={p.id} post={p} lang={lang} />)}
      </div>
    </MobileShell>
  );
}

function ForumMobileReported({ lang = "DE" }) {
  const reportedPost = {
    id: "rpM1", kind: "topic",
    title: lang === "DE" ? "[Beitrag verborgen — wird geprüft]" : "[Hidden — under review]",
    titleEN: "[Hidden — under review]",
    body: "—", bodyEN: "—",
    a: "—", aColor: kiosk.color.inkMute,
    tags: [], ts: lang === "DE" ? "vor 14 min" : "14 min ago",
    replies: 23, likes: 8, bookmarked: false, img: null,
  };
  return (
    <MobileShell lang={lang}>
      <div style={{ padding: "10px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: `${kiosk.color.plum}15`, border: `1.5px solid ${kiosk.color.plum}`, borderRadius: kiosk.r.md, padding: "10px 12px", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: kiosk.color.plum, color: kiosk.color.paper, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>⚑</div>
          <div style={{ fontSize: 12 }}>
            <b>{lang === "DE" ? "Gemeldet von Nachbar:innen" : "Flagged by neighbors"}</b>
            <div style={{ color: kiosk.color.inkSoft, fontSize: 11, marginTop: 1 }}>
              {lang === "DE" ? "ausgeblendet bis Prüfung" : "hidden until review"}
            </div>
          </div>
        </div>
        <ForumPostCard post={reportedPost} lang={lang} ghosted statusBadge="flagged" />
        <ForumPostCard post={SEED_POSTS[0]} lang={lang} />
      </div>
    </MobileShell>
  );
}

Object.assign(window, {
  ForumDesktopLoading, ForumDesktopEmptyFilter, ForumDesktopEmptyZero,
  ForumDesktopError, ForumDesktopOffline, ForumDesktopRateLimit,
  ForumDesktopFlaggedPending, ForumDesktopRejected, ForumDesktopReported,
  ForumDesktopOptimistic,
  ForumMobileLoading, ForumMobileEmpty, ForumMobileError,
  ForumMobileOffline, ForumMobileFlaggedPending, ForumMobileRejected,
  ForumMobileRateLimit, ForumMobileOptimistic, ForumMobileReported,
});

/* global React, kiosk, kioskFonts, paperGrainStyle, KioskBtn, news, SEED_ARTICLES, TODAY, SourceChip, SektionTag, HeatChip, KuratiertChip, ReadDot, SaveToggle, ArticleImage, ArticleMeta */

// ══════════════════════════════════════════════════════════
//  KIOSK · NEWSBOARD · ARTICLE DETAIL
//  Expanded reading view: full headline, dek, full AI summary,
//  source attribution, weiterlesen → source, "im Forum
//  diskutieren" CTA. Sidebar with related articles (heat-
//  sorted) + author rail for user-submitted items.
//  Read-state variants: unread / read / read+saved.
// ══════════════════════════════════════════════════════════

// ─── Pull lead article (L001 from seed) for primary detail demo ───
const DETAIL_ARTICLE = SEED_ARTICLES.find((a) => a.lead);
// And a user-submitted one for variant
const DETAIL_USER = SEED_ARTICLES.find((a) => a.quelle === "user");

// ═══════════════════════════════════════════════════════════════════
//  Atomic detail components
// ═══════════════════════════════════════════════════════════════════

// ─── "im Forum diskutieren" CTA (soft Forum link) ───
function ForumDiscussCTA({ lang = "DE", disabled = false, exhausted = false }) {
  return (
    <div style={{
      padding: 14,
      background: disabled ? kiosk.color.paperSoft : kiosk.color.paperWarm,
      border: `1.5px solid ${disabled ? kiosk.color.rule : kiosk.color.ink}`,
      borderRadius: kiosk.r.md,
      boxShadow: disabled ? "none" : kiosk.shadow.printSm(kiosk.color.wine),
      opacity: disabled ? 0.7 : 1,
    }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.12em", marginBottom: 6 }}>
        FORUM
      </div>
      <div style={{ fontFamily: kiosk.font.display, fontSize: 15, fontWeight: 700, lineHeight: 1.25, marginBottom: 4 }}>
        {lang === "DE" ? "Was meinst du dazu?" : "What do you think?"}
      </div>
      <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12.5, color: kiosk.color.inkSoft, lineHeight: 1.45, marginBottom: 10 }}>
        {exhausted
          ? (lang === "DE" ? "Heute schon 5 Themen erstellt — morgen geht's weiter." : "5 topics created today — back tomorrow.")
          : (lang === "DE" ? "Eröffne ein Thema im Forum — der Artikel-Link wird automatisch eingefügt." : "Start a topic in the forum — the article link is added automatically.")}
      </div>
      <KioskBtn small variant={disabled ? "outline" : "primary"}>
        {exhausted ? (lang === "DE" ? "Tageskontingent erreicht" : "Daily quota reached")
                   : (lang === "DE" ? "im Forum diskutieren →" : "discuss in forum →")}
      </KioskBtn>
    </div>
  );
}

// ─── Reading-list controls: save + mark-as-read + archive ───
function ReadingListControls({ article, lang = "DE" }) {
  const isSaved = article.saved;
  const isRead = article.read;
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 8,
      padding: 14,
      background: kiosk.color.paperSoft,
      border: `1px solid ${kiosk.color.rule}`,
      borderRadius: kiosk.r.md,
    }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.12em" }}>
        {lang === "DE" ? "LESELISTE" : "READING LIST"}
      </div>
      <button style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px", fontSize: 13, fontWeight: 600,
        background: isSaved ? kiosk.color.ink : "transparent",
        color: isSaved ? kiosk.color.paper : kiosk.color.ink,
        border: kiosk.border.ink, borderRadius: kiosk.r.sm,
        fontFamily: kiosk.font.display, cursor: "pointer", textAlign: "left",
      }}>
        <span>{isSaved ? "■" : "□"}</span>
        {isSaved
          ? (lang === "DE" ? "gespeichert · entfernen" : "saved · remove")
          : (lang === "DE" ? "für später speichern" : "save for later")}
      </button>
      <button style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px", fontSize: 13, fontWeight: 500,
        background: "transparent", color: kiosk.color.inkSoft,
        border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm,
        fontFamily: kiosk.font.display, cursor: "pointer", textAlign: "left",
      }}>
        <span>{isRead ? "●" : "○"}</span>
        {isRead
          ? (lang === "DE" ? "als ungelesen markieren" : "mark as unread")
          : (lang === "DE" ? "als gelesen markieren" : "mark as read")}
      </button>
      {isRead && isSaved && (
        <button style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", fontSize: 12.5, fontWeight: 500,
          background: "transparent", color: kiosk.color.inkMute,
          border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm,
          fontFamily: kiosk.font.mono, cursor: "pointer", textAlign: "left",
        }}>
          <span>↓</span>
          {lang === "DE" ? "archivieren" : "archive"}
        </button>
      )}
    </div>
  );
}

// ─── Related-articles rail ───
function RelatedRail({ lang = "DE", sektion = "politik" }) {
  const related = SEED_ARTICLES.filter((a) => a.sektion === sektion && !a.lead).slice(0, 3);
  return (
    <div style={{
      padding: 14,
      background: "transparent",
      border: `1px dashed ${kiosk.color.rule}`,
      borderRadius: kiosk.r.md,
    }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.14em", marginBottom: 10, textTransform: "uppercase" }}>
        {lang === "DE" ? "Mehr aus" : "More from"} · {lang === "DE" ? news.sektion[sektion].de : news.sektion[sektion].en}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {related.length === 0 && (
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 13, color: kiosk.color.inkMute }}>
            {lang === "DE" ? "keine weiteren Artikel in dieser Sektion." : "no further articles in this section."}
          </div>
        )}
        {related.map((a) => (
          <div key={a.id} style={{ paddingBottom: 10, borderBottom: `1px dashed ${kiosk.color.rule}` }}>
            <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 4 }}>
              <SourceChip id={a.quelle} mini />
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute }}>{lang === "DE" ? a.ts : a.tsEN}</span>
            </div>
            <div style={{ fontFamily: kiosk.font.display, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, color: kiosk.color.ink }}>
              {lang === "DE" ? a.title : a.titleEN}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Article body — full summary paragraphs ───
function ArticleBody({ article, lang = "DE" }) {
  const summary = lang === "DE" ? article.summary : article.summaryEN;
  return (
    <div style={{
      fontFamily: kiosk.font.display, fontSize: 15.5, lineHeight: 1.6,
      color: kiosk.color.ink, display: "flex", flexDirection: "column", gap: 16,
      maxWidth: "70ch",
    }}>
      {summary.map((p, i) => (
        <p key={i} style={{ margin: 0 }}>
          {i === 0 && (
            <span style={{
              fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400,
              float: "left", fontSize: 56, lineHeight: 0.85, marginRight: 8, marginTop: 3,
              color: kiosk.color.ink,
            }}>{p.charAt(0)}</span>
          )}
          {i === 0 ? p.slice(1) : p}
        </p>
      ))}
    </div>
  );
}

// ─── Source attribution footer (weiterlesen + URL) ───
function SourceFooter({ article, lang = "DE" }) {
  const sourceName = news.quelle[article.quelle]?.name || article.quelle;
  return (
    <div style={{
      marginTop: 28, padding: "18px 0",
      borderTop: `1px solid ${kiosk.color.ink}`,
      borderBottom: `1px solid ${kiosk.color.ink}`,
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
    }}>
      <div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.14em", marginBottom: 4 }}>
          {lang === "DE" ? "ORIGINAL · ZUM VOLLSTÄNDIGEN ARTIKEL" : "ORIGINAL · FULL ARTICLE"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SourceChip id={article.quelle} />
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft }}>
            {sourceName.toLowerCase().replace(/\s+/g, "")}.de/{article.id.toLowerCase()}
          </span>
        </div>
      </div>
      <KioskBtn>{lang === "DE" ? "weiterlesen bei " + sourceName + " →" : "read full article on " + sourceName + " →"}</KioskBtn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  DESKTOP DETAIL
// ═══════════════════════════════════════════════════════════════════

function NewsDetailDesktop({ lang = "DE", articleId, ownerExhausted = false }) {
  const article = SEED_ARTICLES.find((a) => a.id === articleId) || DETAIL_ARTICLE;
  const showHeat = article.forumLinks >= news.heat.threshold;

  return (
    <div style={{ width: 1280, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", minHeight: "100%" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative" }}>
        <window.KioskNav active="News" lang={lang} />

        {/* Breadcrumb back to feed */}
        <div style={{ padding: "14px 36px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px dashed ${kiosk.color.rule}`, fontFamily: kiosk.font.mono, fontSize: 11 }}>
          <span style={{ color: kiosk.color.inkSoft, textDecoration: "underline dashed", textUnderlineOffset: 3 }}>← {lang === "DE" ? "zurück zum Feed" : "back to feed"}</span>
          <span style={{ color: kiosk.color.inkMute }}>· {lang === "DE" ? "Tagesausgabe Nr." : "Daily edition no."} {TODAY.issue} · {lang === "DE" ? TODAY.de : TODAY.en}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 36, padding: "30px 36px 50px" }}>
          {/* Main column */}
          <article>
            {/* Section + heat + read state */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
              <SektionTag id={article.sektion} lang={lang} />
              {showHeat && <HeatChip count={article.forumLinks} lang={lang} />}
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em" }}>
                · {lang === "DE" ? "veröffentlicht" : "published"} {article.fetchDate}
              </span>
            </div>

            {/* Big headline */}
            <h1 style={{
              fontFamily: kiosk.font.display, fontWeight: 800,
              fontSize: 56, lineHeight: 1.0, letterSpacing: "-0.035em",
              margin: "0 0 16px", color: kiosk.color.ink, maxWidth: "20ch",
            }}>{lang === "DE" ? article.title : article.titleEN}</h1>

            {/* Dek */}
            <p style={{
              fontFamily: kiosk.font.serif, fontStyle: "italic",
              fontSize: 22, lineHeight: 1.35, color: kiosk.color.inkSoft,
              margin: "0 0 24px", maxWidth: "55ch",
            }}>{lang === "DE" ? article.dek : article.dekEN}</p>

            {/* Source line + AI chip */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, paddingBottom: 14, borderBottom: `1px dashed ${kiosk.color.rule}` }}>
              <SourceChip id={article.quelle} lang={lang} />
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>· {lang === "DE" ? article.ts : article.tsEN}</span>
              <div style={{ flex: 1 }} />
              <KuratiertChip lang={lang} />
            </div>

            {/* Hero image */}
            <div style={{ marginBottom: 24 }}>
              <ArticleImage article={article} ratio="16/9" lead />
            </div>

            {/* Caption */}
            <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12, color: kiosk.color.inkMute, marginBottom: 28, paddingBottom: 14, borderBottom: `1px dashed ${kiosk.color.rule}` }}>
              {lang === "DE"
                ? "Pressefoto · Quelle: " + (news.quelle[article.quelle]?.name || "RSS")
                : "Press photo · Source: " + (news.quelle[article.quelle]?.name || "RSS")}
            </div>

            {/* Article body */}
            <ArticleBody article={article} lang={lang} />

            {/* Source footer */}
            <SourceFooter article={article} lang={lang} />

            {/* AI disclosure note */}
            <div style={{
              marginTop: 16, padding: "12px 14px",
              background: kiosk.color.paperSoft, border: `1px dashed ${kiosk.color.rule}`,
              borderRadius: kiosk.r.sm,
              fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute,
              lineHeight: 1.6, letterSpacing: "0.04em",
            }}>
              {lang === "DE"
                ? "↳ Die Zusammenfassung wurde maschinell erstellt (GPT-4o). Für Detail und Kontext: vollständiger Artikel bei der Quelle."
                : "↳ This summary was machine-generated (GPT-4o). For detail and context: full article at the source."}
            </div>
          </article>

          {/* Side rail */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <ReadingListControls article={article} lang={lang} />
            <ForumDiscussCTA lang={lang} exhausted={ownerExhausted} />
            <RelatedRail lang={lang} sektion={article.sektion} />
          </aside>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  DETAIL · user-submitted article variant
//  Shows attribution to submitter + "freigegeben durch Moderation" note
// ═══════════════════════════════════════════════════════════════════

function NewsDetailUserSubmitted({ lang = "DE" }) {
  const article = DETAIL_USER;
  if (!article) return <div>No user-submitted article in seed</div>;

  return (
    <div style={{ width: 1280, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", minHeight: "100%" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative" }}>
        <window.KioskNav active="News" lang={lang} />

        <div style={{ padding: "14px 36px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px dashed ${kiosk.color.rule}`, fontFamily: kiosk.font.mono, fontSize: 11 }}>
          <span style={{ color: kiosk.color.inkSoft, textDecoration: "underline dashed", textUnderlineOffset: 3 }}>← {lang === "DE" ? "zurück zum Feed" : "back to feed"}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 36, padding: "30px 36px 50px" }}>
          <article>
            {/* User-submitted strap — emphasizes "from a neighbor" */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 12px",
              background: kiosk.color.moss, color: kiosk.color.paper,
              border: kiosk.border.ink, borderRadius: kiosk.r.sm,
              fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              marginBottom: 16,
              boxShadow: kiosk.shadow.printSm(),
            }}>
              <span>↗</span>
              {lang === "DE" ? "Eingereicht von einer Nachbarin" : "Submitted by a neighbor"}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
              <SektionTag id={article.sektion} lang={lang} />
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>
                {lang === "DE" ? "freigegeben am" : "approved"} {article.fetchDate}
              </span>
            </div>

            <h1 style={{
              fontFamily: kiosk.font.display, fontWeight: 800,
              fontSize: 48, lineHeight: 1.05, letterSpacing: "-0.03em",
              margin: "0 0 14px", color: kiosk.color.ink, maxWidth: "22ch",
            }}>{(lang === "DE" ? article.title : article.titleEN).replace(/^\[eingereicht\]\s*|\[submitted\]\s*/, "")}</h1>

            <p style={{
              fontFamily: kiosk.font.serif, fontStyle: "italic",
              fontSize: 20, lineHeight: 1.35, color: kiosk.color.inkSoft,
              margin: "0 0 22px", maxWidth: "55ch",
            }}>{lang === "DE" ? article.dek : article.dekEN}</p>

            {/* Submitter card */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px",
              background: kiosk.color.paperWarm,
              border: `1.5px solid ${kiosk.color.ink}`,
              borderRadius: kiosk.r.md,
              marginBottom: 24,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: article.submittedBy.color, color: kiosk.color.paper,
                border: kiosk.border.ink,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: kiosk.font.display, fontSize: 16, fontWeight: 700,
              }}>{article.submittedBy.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: kiosk.font.display, fontSize: 15, fontWeight: 700 }}>{article.submittedBy.name}</div>
                <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12.5, color: kiosk.color.inkSoft }}>
                  {lang === "DE" ? "Nachbarin im Schillerkiez · seit 2021" : "Neighbor in Schillerkiez · since 2021"}
                </div>
              </div>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.success, letterSpacing: "0.1em" }}>● {lang === "DE" ? "moderiert" : "moderated"}</span>
            </div>

            <ArticleBody article={article} lang={lang} />

            <div style={{
              marginTop: 28, padding: "16px 18px",
              background: kiosk.color.paperSoft,
              border: `1px dashed ${kiosk.color.rule}`,
              borderRadius: kiosk.r.md,
              fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute,
              lineHeight: 1.6,
            }}>
              {lang === "DE"
                ? "↳ Dieser Beitrag wurde von einer Nachbarin eingereicht und durchlief die automatische Moderation am " + article.fetchDate + ". Inhalt liegt in der Verantwortung der Einreicherin."
                : "↳ This entry was submitted by a neighbor and passed automatic moderation on " + article.fetchDate + ". Responsibility for content lies with the submitter."}
            </div>
          </article>

          <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <ReadingListControls article={article} lang={lang} />
            <ForumDiscussCTA lang={lang} />
            <RelatedRail lang={lang} sektion={article.sektion} />
          </aside>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MOBILE DETAIL
// ═══════════════════════════════════════════════════════════════════

function NewsDetailMobile({ lang = "DE", articleId }) {
  const article = SEED_ARTICLES.find((a) => a.id === articleId) || DETAIL_ARTICLE;
  const showHeat = article.forumLinks >= news.heat.threshold;
  const summary = lang === "DE" ? article.summary : article.summaryEN;

  return (
    <div style={{ width: 390, height: 844, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header style={{ padding: "10px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft, textDecoration: "underline dashed", textUnderlineOffset: 3 }}>← {lang === "DE" ? "Feed" : "Feed"}</span>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.12em" }}>NR. {TODAY.issue}</span>
          <SaveToggle saved={article.saved} mini />
        </header>

        {/* Body */}
        <div style={{ flex: 1, overflow: "hidden", padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
            <SektionTag id={article.sektion} lang={lang} mini />
            {showHeat && <HeatChip count={article.forumLinks} lang={lang} mini />}
          </div>

          <h1 style={{
            fontFamily: kiosk.font.display, fontWeight: 800,
            fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.025em",
            margin: "0 0 8px",
          }}>{lang === "DE" ? article.title : article.titleEN}</h1>

          <p style={{
            fontFamily: kiosk.font.serif, fontStyle: "italic",
            fontSize: 14.5, lineHeight: 1.4, color: kiosk.color.inkSoft,
            margin: "0 0 12px",
          }}>{lang === "DE" ? article.dek : article.dekEN}</p>

          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10, marginBottom: 12, borderBottom: `1px dashed ${kiosk.color.rule}` }}>
            <SourceChip id={article.quelle} lang={lang} mini />
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute }}>· {lang === "DE" ? article.ts : article.tsEN}</span>
          </div>

          {/* Image */}
          {!article.noImage && (
            <div style={{ marginBottom: 12 }}>
              <ArticleImage article={article} ratio="16/9" />
            </div>
          )}

          {/* First paragraph of summary */}
          <p style={{
            fontFamily: kiosk.font.display, fontSize: 13.5, lineHeight: 1.55,
            color: kiosk.color.ink, margin: "0 0 12px",
          }}>{summary[0]}</p>

          {summary[1] && (
            <p style={{ fontFamily: kiosk.font.display, fontSize: 13.5, lineHeight: 1.55, color: kiosk.color.ink, margin: "0 0 14px" }}>
              {summary[1]}
            </p>
          )}

          {/* CTAs row */}
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            <KioskBtn small>{lang === "DE" ? "weiterlesen →" : "read more →"}</KioskBtn>
            <KioskBtn small variant="outline">{lang === "DE" ? "Forum" : "Forum"}</KioskBtn>
          </div>
        </div>

        {/* Bottom nav */}
        <nav style={{
          padding: "8px 16px 14px", display: "flex", justifyContent: "space-around",
          borderTop: `1.5px solid ${kiosk.color.ink}`, background: kiosk.color.paperWarm,
        }}>
          {["Forum","Kalender","News","Markt","Kiez"].map((n) => (
            <span key={n} style={{
              fontFamily: kiosk.font.mono, fontSize: 9.5, fontWeight: 600,
              padding: "5px 9px", borderRadius: kiosk.r.sm,
              background: n === "News" ? kiosk.color.ink : "transparent",
              color: n === "News" ? kiosk.color.paper : kiosk.color.inkSoft,
              letterSpacing: "0.04em",
            }}>{n}</span>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Export
// ═══════════════════════════════════════════════════════════════════

Object.assign(window, {
  ForumDiscussCTA, ReadingListControls, RelatedRail, ArticleBody, SourceFooter,
  NewsDetailDesktop, NewsDetailUserSubmitted, NewsDetailMobile,
});

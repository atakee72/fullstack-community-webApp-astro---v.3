/* @jsx React.createElement */
/* global React, kiosk, kioskFonts, paperGrainStyle,
   PostTypeChip, FilterChip, StatusBadge, KioskBtn, KioskAvatar,
   KioskNav, ForumPostCard, SEED_POSTS, MobileShell */

// ══════════════════════════════════════════════════════════
//  KIOSK · FORUM · EXTRAS
//  - Additional mobile artboards (edit, moderating, search, bookmarks, detail-thread)
//  - Motion spec page (looping prototypes for handoff)
//  All inline styles. All consistent with existing Kiosk vocabulary.
// ══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
//  ForumModeratingMobile · post-submit screening modal on phone
// ─────────────────────────────────────────────────────────
function ForumModeratingMobile({ lang = "DE" }) {
  const stages = lang === "DE"
    ? [
        { l: "Sprache geprüft", s: "done" },
        { l: "Inhalt geprüft", s: "done" },
        { l: "Kontext-Prüfung", s: "running" },
        { l: "Bilder werden geprüft", s: "queued" },
        { l: "Veröffentlichen", s: "queued" },
      ]
    : [
        { l: "Language checked", s: "done" },
        { l: "Content checked", s: "done" },
        { l: "Context check", s: "running" },
        { l: "Images being screened", s: "queued" },
        { l: "Publish", s: "queued" },
      ];

  return (
    <MobileShell lang={lang}>
      <div style={{
        position: "absolute", top: 44 + 50, left: 0, right: 0, bottom: 0,
        background: "rgba(27,26,23,0.32)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}>
        <div style={{
          width: "100%", background: kiosk.color.paper,
          border: `2px solid ${kiosk.color.ink}`, borderRadius: kiosk.r.lg,
          boxShadow: kiosk.shadow.print(kiosk.color.wine),
          padding: "20px 18px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              width: 12, height: 12, borderRadius: "50%",
              background: kiosk.color.ochre, border: `2px solid ${kiosk.color.ink}`,
              animation: "pulseDot 1.4s ease-in-out infinite",
            }} />
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.14em" }}>
              ◆ {lang === "DE" ? "WIRD GEPRÜFT" : "BEING SCREENED"}
            </div>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", margin: "4px 0 4px", lineHeight: 1.1 }}>
            {lang === "DE" ? <>Wir <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>schauen</span> kurz drüber.</> : <>One <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>moment</span>.</>}
          </h2>
          <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 13, color: kiosk.color.inkSoft, margin: "0 0 14px", lineHeight: 1.4 }}>
            {lang === "DE" ? "Anonym. Nichts zu tun." : "Anonymous. Nothing to do."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 14 }}>
            {stages.map((st, i) => {
              const isDone = st.s === "done";
              const isRun = st.s === "running";
              const dot = isDone ? "✓" : isRun ? "◐" : "·";
              const dotColor = isDone ? kiosk.color.success : isRun ? kiosk.color.ochre : kiosk.color.inkMute;
              const labelColor = isDone || isRun ? kiosk.color.ink : kiosk.color.inkMute;
              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "24px 1fr",
                  gap: 8, alignItems: "center",
                  padding: "8px 0",
                  borderBottom: i < stages.length - 1 ? `1px dashed ${kiosk.color.rule}` : "none",
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: isDone ? kiosk.color.success : isRun ? kiosk.color.ochre : "transparent",
                    border: `1.5px solid ${dotColor}`,
                    color: kiosk.color.paper,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, fontFamily: kiosk.font.mono,
                    animation: isRun ? "spinDot 1.2s linear infinite" : "none",
                  }}>{dot}</div>
                  <div style={{
                    fontSize: 12.5, fontWeight: 700, color: labelColor,
                    letterSpacing: "-0.005em",
                  }}>{st.l}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}

// ─────────────────────────────────────────────────────────
//  ForumEditMobile · edit own post
// ─────────────────────────────────────────────────────────
function ForumEditMobile({ lang = "DE" }) {
  return (
    <MobileShell lang={lang}>
      {/* Sub-header: "Editing" */}
      <div style={{
        padding: "8px 18px", display: "flex", justifyContent: "space-between",
        alignItems: "center", background: kiosk.color.ochre,
        borderBottom: kiosk.border.ink,
      }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.ink, fontWeight: 700, letterSpacing: "0.08em" }}>
          ◆ {lang === "DE" ? "BEARBEITEN" : "EDITING"}
        </span>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ink }}>
          {lang === "DE" ? "3-mal bearbeitet" : "edited 3 times"}
        </span>
      </div>

      <div style={{ padding: "14px 18px" }}>
        {/* Type pill (locked-in) */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={{
            padding: "4px 10px", fontSize: 10.5, fontWeight: 700,
            background: kiosk.color.wine, color: kiosk.color.paper,
            border: kiosk.border.ink, borderRadius: kiosk.r.pill,
            fontFamily: kiosk.font.mono, letterSpacing: "0.06em",
          }}>● {lang === "DE" ? "DISKUSSION" : "DISCUSSION"}</span>
        </div>

        {/* Title (editable) */}
        <div style={{ borderBottom: `1.5px solid ${kiosk.color.ink}`, paddingBottom: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            {lang === "DE" ? "Rattenproblem Oderstraße — wer hat Tipps?" : "Rat problem on Oderstraße — anyone tips?"}
            <span style={{
              width: 2, height: 18, background: kiosk.color.ink,
              display: "inline-block", verticalAlign: "middle", marginLeft: 1,
              animation: "blink 1s step-end infinite",
            }} />
          </span>
        </div>

        {/* Body (editable) */}
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: kiosk.color.ink, margin: "0 0 8px" }}>
          {lang === "DE"
            ? "Seit zwei Wochen sehe ich abends Ratten am Eingang Oderstr. 15. Hat jemand Tipps oder ähnliche Beobachtungen? Vielleicht koordinieren wir uns mit dem Hausmeister?"
            : "For two weeks now I've been seeing rats by the entrance of Oderstr. 15 in the evenings. Anyone got tips or similar observations? Maybe we coordinate with the building manager?"}
        </p>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: kiosk.color.inkSoft, margin: 0 }}>
          {lang === "DE"
            ? "Update: Seit gestern auch tagsüber gesehen."
            : "Update: starting yesterday I'm seeing them in daylight too."}
        </p>

        {/* Image strip */}
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {[kiosk.color.ochre].map((c, i) => (
            <div key={i} style={{
              width: 60, height: 60, borderRadius: kiosk.r.sm,
              border: kiosk.border.ink,
              background: `repeating-linear-gradient(45deg, ${c}55 0 6px, ${kiosk.color.paperWarm} 6px 12px)`,
              position: "relative",
            }}>
              <div style={{
                position: "absolute", top: 2, right: 2,
                width: 14, height: 14, borderRadius: "50%",
                background: kiosk.color.ink, color: kiosk.color.paper,
                fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "12px 18px", background: kiosk.color.paper,
        borderTop: kiosk.border.ink,
        display: "flex", gap: 8, alignItems: "center",
      }}>
        <KioskBtn small>{lang === "DE" ? "speichern" : "save"}</KioskBtn>
        <KioskBtn variant="outline" small>{lang === "DE" ? "abbrechen" : "cancel"}</KioskBtn>
        <span style={{ marginLeft: "auto" }}>
          <KioskBtn variant="danger" small>{lang === "DE" ? "löschen…" : "delete…"}</KioskBtn>
        </span>
      </div>
    </MobileShell>
  );
}

// ─────────────────────────────────────────────────────────
//  ForumSearchMobile · search results
// ─────────────────────────────────────────────────────────
function ForumSearchMobile({ lang = "DE" }) {
  return (
    <MobileShell lang={lang}>
      {/* Search bar */}
      <div style={{ padding: "10px 18px", background: kiosk.color.paperWarm, borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: kiosk.color.paper, border: kiosk.border.ink,
          borderRadius: kiosk.r.pill, padding: "8px 14px",
        }}>
          <span style={{ fontSize: 14, color: kiosk.color.inkMute }}>⌕</span>
          <span style={{
            fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 600,
            color: kiosk.color.ink, flex: 1,
          }}>{lang === "DE" ? "müll" : "trash"}</span>
          <span style={{
            width: 16, height: 16, borderRadius: "50%",
            background: kiosk.color.inkMute, color: kiosk.color.paper,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, cursor: "pointer",
          }}>×</span>
        </div>
        <div style={{
          marginTop: 6, fontFamily: kiosk.font.mono, fontSize: 9.5,
          color: kiosk.color.inkMute, letterSpacing: "0.05em",
        }}>
          {lang === "DE" ? "12 TREFFER · BEITRÄGE + KOMMENTARE" : "12 RESULTS · POSTS + COMMENTS"}
        </div>
      </div>

      {/* Results — posts with highlighted match */}
      <div style={{ padding: "10px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {SEED_POSTS.slice(0, 3).map((p, i) => {
          const term = lang === "DE" ? "Müll" : "trash";
          const title = lang === "DE" ? p.title : p.titleEN;
          const body = lang === "DE" ? p.body : p.bodyEN;
          // simple highlight of first occurrence
          const highlight = (text) => {
            const idx = text.toLowerCase().indexOf(term.toLowerCase());
            if (idx === -1) return text;
            return (
              <>
                {text.slice(0, idx)}
                <mark style={{ background: kiosk.color.ochre, color: kiosk.color.ink, padding: "0 2px" }}>
                  {text.slice(idx, idx + term.length)}
                </mark>
                {text.slice(idx + term.length)}
              </>
            );
          };
          return (
            <article key={p.id} style={{
              background: kiosk.color.paper, border: kiosk.border.ink,
              borderRadius: kiosk.r.md, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <PostTypeChip kind={p.kind} />
                <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute }}>
                  {lang === "DE" ? p.ts : p.tsEN}
                </span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.015em", margin: "0 0 4px", lineHeight: 1.2 }}>
                {highlight(title)}
              </h3>
              <p style={{ fontSize: 12.5, lineHeight: 1.45, color: kiosk.color.inkSoft, margin: 0 }}>
                {highlight(body.slice(0, 100) + "…")}
              </p>
            </article>
          );
        })}
      </div>
    </MobileShell>
  );
}

// ─────────────────────────────────────────────────────────
//  ForumBookmarksMobile · saved posts
// ─────────────────────────────────────────────────────────
function ForumBookmarksMobile({ lang = "DE" }) {
  const bookmarks = SEED_POSTS.slice(0, 4).map((p, i) => ({ ...p, bookmarked: true, savedAt: lang === "DE" ? ["heute", "gestern", "vor 3 Tagen", "vor 1 Woche"][i] : ["today", "yesterday", "3d ago", "1w ago"][i] }));

  return (
    <MobileShell lang={lang}>
      {/* Title block */}
      <div style={{ padding: "16px 18px 8px", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.wine, letterSpacing: "0.12em" }}>
          ◆ {lang === "DE" ? "GESPEICHERT" : "BOOKMARKS"}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.025em", margin: "4px 0 0", lineHeight: 1 }}>
          {lang === "DE" ? <>Was du dir <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>merken</span> wolltest.</> : <>What you wanted to <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>remember</span>.</>}
        </h1>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, marginTop: 6, letterSpacing: "0.05em" }}>
          {bookmarks.length} {lang === "DE" ? "BEITRÄGE" : "POSTS"}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: "10px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        {bookmarks.map((p) => (
          <article key={p.id} style={{
            background: kiosk.color.paper, border: kiosk.border.ink,
            borderRadius: kiosk.r.md, padding: "10px 12px",
            display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <PostTypeChip kind={p.kind} small />
                <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
                  ⌂ {p.savedAt}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                {lang === "DE" ? p.title : p.titleEN}
              </div>
            </div>
            <span style={{
              fontSize: 16, color: kiosk.color.ochre,
            }}>🔖</span>
          </article>
        ))}
      </div>
    </MobileShell>
  );
}

// ─────────────────────────────────────────────────────────
//  ForumDetailMobileThread · post detail with replies (deep scroll)
//  Different from ForumDetailMobile (which shows just OP + first reply)
// ─────────────────────────────────────────────────────────
function ForumDetailMobileThread({ lang = "DE" }) {
  const post = SEED_POSTS.find((p) => p.id === "p02");
  const replies = [
    { initials: "TY", aColor: kiosk.color.ochre, a: "Tarık Y.",
      body: "Bei uns hat das Streumittel von Apotheke Sonnenallee geholfen — dauert aber 2 Wochen.",
      bodyEN: "The bait from Sonnenallee pharmacy helped us — takes 2 weeks though.",
      ts: "vor 47 min", tsEN: "47 min ago", likes: 12, isOP: false },
    { initials: "AÇ", aColor: kiosk.color.moss, a: "Ayşegül Ç.",
      body: "+1 Aushänge. Wir haben einen Hauseingangs-Plan im Haus und das Problem ist seit 2 Jahren weg.",
      bodyEN: "+1 notices. We have a stairwell plan and the problem's been gone for 2 years.",
      ts: "vor 18 min", tsEN: "18 min ago", likes: 8, isOP: false },
    { initials: "LK", aColor: kiosk.color.wine, a: "Lena K.",
      body: "Danke euch! Ich versuch's diese Woche.",
      bodyEN: "Thanks! I'll try this week.",
      ts: "vor 4 min", tsEN: "4 min ago", likes: 3, isOP: true },
  ];

  return (
    <MobileShell lang={lang}>
      {/* Breadcrumb */}
      <div style={{
        padding: "8px 18px", borderBottom: `1px dashed ${kiosk.color.rule}`,
        fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute,
        letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span>← {lang === "DE" ? "FORUM" : "FORUM"}</span>
        <span style={{ color: kiosk.color.wine }}>↻ {lang === "DE" ? "47 mitlesend" : "47 reading"}</span>
      </div>

      <div style={{ padding: "14px 18px", overflow: "hidden" }}>
        {/* OP post — compact */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <PostTypeChip kind="topic" small />
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute }}>
            · {lang === "DE" ? "vor 1 Std" : "1h ago"} · #oderstraße
          </span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 8px", lineHeight: 1.1 }}>
          {lang === "DE" ? post.title : post.titleEN}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <KioskAvatar initials="LK" color={kiosk.color.wine} size={26} />
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700 }}>Lena K.</div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute }}>
              {lang === "DE" ? "seit 2019" : "since 2019"}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, color: kiosk.color.ink, margin: "0 0 12px" }}>
          {lang === "DE" ? post.body : post.bodyEN}
        </p>

        {/* Engagement bar */}
        <div style={{
          display: "flex", gap: 6, padding: "8px 0",
          borderTop: `1px dashed ${kiosk.color.rule}`,
          borderBottom: `1px dashed ${kiosk.color.rule}`,
          fontFamily: kiosk.font.mono, fontSize: 10.5,
        }}>
          <span style={{ background: kiosk.color.paperWarm, border: kiosk.border.ink, padding: "3px 8px", borderRadius: kiosk.r.pill, fontWeight: 700 }}>
            ♥ 23
          </span>
          <span style={{ border: kiosk.border.ink, padding: "3px 8px", borderRadius: kiosk.r.pill, fontWeight: 700 }}>
            💬 47
          </span>
          <span style={{ background: kiosk.color.ochre, border: kiosk.border.ink, padding: "3px 8px", borderRadius: kiosk.r.pill, fontWeight: 700 }}>
            🔖
          </span>
          <span style={{ marginLeft: "auto", color: kiosk.color.inkMute, alignSelf: "center" }}>↗</span>
        </div>

        {/* Replies header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          margin: "12px 0 6px", borderBottom: `1.5px solid ${kiosk.color.ink}`, paddingBottom: 4,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            {lang === "DE" ? "47 Antworten" : "47 replies"}
          </h2>
          <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 11, color: kiosk.color.inkMute }}>
            {lang === "DE" ? "neueste" : "newest"}
          </span>
        </div>

        {/* Replies */}
        {replies.map((r, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "auto 1fr", gap: 8,
            padding: "10px 0",
            borderBottom: i < replies.length - 1 ? `1px dashed ${kiosk.color.rule}` : "none",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <KioskAvatar initials={r.initials} color={r.aColor} size={26} />
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 8.5, color: kiosk.color.inkMute }}>
                ♥ {r.likes}
              </span>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700 }}>{r.a}</span>
                {r.isOP && <span style={{
                  fontFamily: kiosk.font.mono, fontSize: 7.5, fontWeight: 700,
                  letterSpacing: "0.08em", padding: "1px 4px", borderRadius: 2,
                  background: kiosk.color.wine, color: kiosk.color.paper,
                }}>OP</span>}
                <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute }}>
                  · {lang === "DE" ? r.ts : r.tsEN}
                </span>
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.45, margin: 0, color: kiosk.color.inkSoft }}>
                {lang === "DE" ? r.body : r.bodyEN}
              </p>
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}

// ══════════════════════════════════════════════════════════
//  MOTION SPEC PAGE · for handoff
//  Visible, looping prototypes of every motion in the Forum.
//  Each tile shows: name, what triggers it, timing/easing, a live demo.
// ══════════════════════════════════════════════════════════

const motionKeyframes = `
@keyframes m-skel { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes m-slideIn { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes m-fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
@keyframes m-pulseDot { 0%, 100% { transform: scale(1); opacity: 0.95; } 50% { transform: scale(1.18); opacity: 0.6; } }
@keyframes m-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes m-heart-pop {
  0% { transform: scale(1); }
  30% { transform: scale(1.4); }
  60% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
@keyframes m-heart-burst {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes m-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes m-pendingToApproved {
  0%, 60% { background-color: rgba(217,178,56,0.15); border-color: #d9b238; }
  70%, 100% { background-color: rgba(122,158,127,0.15); border-color: #7a9e7f; }
}
@keyframes m-cycle-modCard {
  0%, 30% { opacity: 1; transform: translateY(0); }
  35%, 65% { opacity: 0; transform: translateY(-8px); }
  70%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes m-bookmark-fill {
  0%, 30% { color: rgba(27,26,23,0.4); transform: scale(1); }
  50% { color: #d9b238; transform: scale(1.3) rotate(-8deg); }
  100% { color: #d9b238; transform: scale(1); }
}
@keyframes m-tab-out {
  0% { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(-30px); }
}
@keyframes m-tab-in {
  0% { opacity: 0; transform: translateX(30px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes m-blink-cursor {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
`;

function MotionTile({ name, trigger, timing, easing, children, height = 200, accent = "#7a4256" }) {
  return (
    <div style={{
      background: kiosk.color.paper,
      border: `2px solid ${kiosk.color.ink}`,
      borderRadius: kiosk.r.lg,
      padding: 0,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header strip */}
      <div style={{
        background: accent, color: kiosk.color.paper,
        padding: "8px 12px",
        borderBottom: kiosk.border.ink,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, letterSpacing: "0.1em", fontWeight: 700 }}>
          ◆ {name.toUpperCase()}
        </span>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, opacity: 0.85 }}>
          {timing}
        </span>
      </div>

      {/* Demo region */}
      <div style={{
        height,
        background: kiosk.color.paperWarm,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {children}
      </div>

      {/* Spec footer */}
      <div style={{
        padding: "8px 12px",
        borderTop: `1px dashed ${kiosk.color.rule}`,
        fontFamily: kiosk.font.mono, fontSize: 9.5,
        color: kiosk.color.inkSoft, lineHeight: 1.5,
      }}>
        <div><b style={{ color: kiosk.color.ink }}>Trigger:</b> {trigger}</div>
        <div><b style={{ color: kiosk.color.ink }}>Easing:</b> {easing}</div>
      </div>
    </div>
  );
}

function ForumMotionSpec({ lang = "DE" }) {
  return (
    <div style={{
      width: 1280, height: 1800, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, position: "relative", overflow: "hidden",
    }}>
      <style>{kioskFonts}{motionKeyframes}</style>
      <div style={paperGrainStyle} />

      {/* Header */}
      <header style={{
        padding: "28px 36px 18px",
        borderBottom: `2px solid ${kiosk.color.ink}`,
      }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.wine, letterSpacing: "0.14em" }}>
          ◆ FORUM · MOTION SPEC · v1.0
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.035em", margin: "8px 0 4px", lineHeight: 1 }}>
          Motion. <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>Was lebt.</span>
        </h1>
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 17, color: kiosk.color.inkSoft, margin: 0, maxWidth: 760 }}>
          Twelve animations make Mahalle feel alive. Each tile shows: when it fires, how long, the easing curve, and a live looping demo. Implementation: CSS keyframes for atomic motions; Framer Motion for layout transitions.
        </p>
      </header>

      {/* Grid */}
      <div style={{ padding: "20px 36px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

        <MotionTile
          name="01 · Skeleton shimmer"
          trigger="Loading any list"
          timing="1400ms · loop"
          easing="ease-in-out"
        >
          <div style={{ width: "85%", display: "flex", flexDirection: "column", gap: 8 }}>
            {[60, 90, 75].map((w, i) => (
              <div key={i} style={{
                height: 12, width: `${w}%`,
                background: "rgba(27,26,23,0.08)",
                borderRadius: 4,
                backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(27,26,23,0.04) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "m-skel 1.4s ease infinite",
              }} />
            ))}
          </div>
        </MotionTile>

        <MotionTile
          name="02 · Optimistic slide-in"
          trigger="User submits a post"
          timing="380ms · once"
          easing="cubic(.2,.7,.3,1)"
          accent={kiosk.color.success}
        >
          <div style={{
            width: "80%",
            background: kiosk.color.paper,
            border: kiosk.border.ink,
            borderRadius: kiosk.r.md,
            padding: "10px 12px",
            animation: "m-slideIn 1.8s cubic-bezier(.2,.7,.3,1) infinite",
            position: "relative",
          }}>
            <div style={{ position: "absolute", top: -6, left: 12, background: kiosk.color.success, color: kiosk.color.paper, fontFamily: kiosk.font.mono, fontSize: 8.5, padding: "2px 6px", borderRadius: 8 }}>
              ✓ DEIN POST
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>
              {lang === "DE" ? "Sperrmüll-Tausch Sonntag" : "Sunday curbside swap"}
            </div>
            <div style={{ fontSize: 10, color: kiosk.color.inkMute, marginTop: 2 }}>
              {lang === "DE" ? "gerade · von dir" : "now · by you"}
            </div>
          </div>
        </MotionTile>

        <MotionTile
          name="03 · Pending → Approved"
          trigger="Moderation completes"
          timing="2400ms cycle · loop"
          easing="ease-in-out"
          accent={kiosk.color.ochre}
        >
          <div style={{
            width: "80%",
            border: "2px solid",
            borderRadius: kiosk.r.md,
            padding: "10px 12px",
            animation: "m-pendingToApproved 2.4s ease-in-out infinite",
          }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, letterSpacing: "0.1em", fontWeight: 700 }}>
              {lang === "DE" ? "STATUS · DEIN POST" : "STATUS · YOUR POST"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 4, letterSpacing: "-0.015em" }}>
              {lang === "DE" ? "in Prüfung → veröffentlicht" : "in review → live"}
            </div>
          </div>
        </MotionTile>

        <MotionTile
          name="04 · Moderation pulse"
          trigger="Screening modal open"
          timing="1400ms · loop"
          easing="ease-in-out"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 16, height: 16, borderRadius: "50%",
              background: kiosk.color.ochre, border: `2px solid ${kiosk.color.ink}`,
              animation: "m-pulseDot 1.4s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.015em" }}>
              {lang === "DE" ? "wir schauen drüber" : "we're checking"}
            </span>
          </div>
        </MotionTile>

        <MotionTile
          name="05 · Stage spinner"
          trigger="Active moderation step"
          timing="1200ms · loop"
          easing="linear"
        >
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: kiosk.color.ochre, color: kiosk.color.paper,
            border: `2px solid ${kiosk.color.ochre}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: kiosk.font.mono, fontSize: 16, fontWeight: 700,
            animation: "m-spin 1.2s linear infinite",
          }}>◐</div>
        </MotionTile>

        <MotionTile
          name="06 · Danke (heart) tap"
          trigger="User taps ♥ on post"
          timing="450ms · once"
          easing="cubic(.34,1.56,.64,1)"
          accent={kiosk.color.danger}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 60, height: 60 }}>
            <span style={{
              position: "absolute",
              width: 24, height: 24, borderRadius: "50%",
              border: `3px solid ${kiosk.color.danger}`,
              animation: "m-heart-burst 1.6s ease-out infinite",
            }} />
            <span style={{
              fontSize: 30, color: kiosk.color.danger,
              animation: "m-heart-pop 1.6s cubic-bezier(.34,1.56,.64,1) infinite",
              display: "inline-block",
            }}>♥</span>
          </div>
        </MotionTile>

        <MotionTile
          name="07 · Bookmark fill"
          trigger="User taps 🔖"
          timing="500ms · once"
          easing="cubic(.34,1.56,.64,1)"
          accent={kiosk.color.ochre}
        >
          <span style={{
            fontSize: 32,
            animation: "m-bookmark-fill 2s cubic-bezier(.34,1.56,.64,1) infinite",
            display: "inline-block",
          }}>🔖</span>
        </MotionTile>

        <MotionTile
          name="08 · Rejected shake"
          trigger="Post fails moderation"
          timing="500ms · once"
          easing="cubic(.36,.07,.19,.97)"
          accent={kiosk.color.danger}
        >
          <div style={{
            width: "80%",
            background: kiosk.color.paperWarm,
            border: `2px solid ${kiosk.color.danger}`,
            borderRadius: kiosk.r.md,
            padding: "8px 12px",
            animation: "m-shake 2s cubic-bezier(.36,.07,.19,.97) infinite",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: "50%",
              background: kiosk.color.danger, color: kiosk.color.paper,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700,
            }}>✕</div>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {lang === "DE" ? "nicht freigegeben" : "not approved"}
            </span>
          </div>
        </MotionTile>

        <MotionTile
          name="09 · Cursor blink"
          trigger="Editable text field"
          timing="1000ms · loop"
          easing="step-end"
        >
          <div style={{
            background: kiosk.color.paper, border: kiosk.border.ink,
            borderRadius: kiosk.r.sm, padding: "6px 10px",
            fontFamily: kiosk.font.mono, fontSize: 13,
          }}>
            {lang === "DE" ? "Lena" : "Lena"}
            <span style={{
              width: 1.5, height: 14, background: kiosk.color.ink,
              display: "inline-block", verticalAlign: "middle", marginLeft: 1,
              animation: "m-blink-cursor 1s step-end infinite",
            }} />
          </div>
        </MotionTile>

        <MotionTile
          name="10 · Tab → tab transition"
          trigger="Nav click between sections"
          timing="320ms out + in"
          easing="cubic(.4,0,.2,1)"
          accent={kiosk.color.teal}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "75%" }}>
            <div style={{
              padding: "6px 10px", background: kiosk.color.paper,
              border: kiosk.border.ink, borderRadius: kiosk.r.md,
              fontSize: 11, fontWeight: 700,
              animation: "m-tab-in 1.6s cubic-bezier(.4,0,.2,1) infinite",
            }}>
              {lang === "DE" ? "→ Forum" : "→ Forum"}
            </div>
            <div style={{
              padding: "6px 10px", background: kiosk.color.paperSoft,
              border: `1px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.md,
              fontSize: 11, color: kiosk.color.inkMute,
              animation: "m-tab-out 1.6s cubic-bezier(.4,0,.2,1) infinite",
            }}>
              Kalender
            </div>
          </div>
        </MotionTile>

        <MotionTile
          name="11 · Skeleton → content"
          trigger="Data loaded"
          timing="240ms · once"
          easing="cubic(.4,0,.2,1)"
        >
          <div style={{
            width: "80%",
            background: kiosk.color.paper, border: kiosk.border.ink,
            borderRadius: kiosk.r.md, padding: "10px 12px",
            animation: "m-fadeIn 1.6s ease-in-out infinite",
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "-0.015em" }}>
              {lang === "DE" ? "Spätsommer-Bowls bei Café Selig" : "Late-summer bowls at Café Selig"}
            </div>
            <div style={{ fontSize: 10, color: kiosk.color.inkMute, marginTop: 3 }}>
              Tarık · {lang === "DE" ? "vor 12 min" : "12 min ago"}
            </div>
          </div>
        </MotionTile>

        <MotionTile
          name="12 · Carved title hover"
          trigger="Hover on page title"
          timing="200ms"
          easing="cubic(.4,0,.2,1)"
          accent={kiosk.color.wine}
        >
          <div style={{
            fontSize: 32, fontWeight: 800, letterSpacing: "-0.025em",
            color: kiosk.color.ink,
            textShadow: `2px 2px 0 ${kiosk.color.wine}`,
            transition: "text-shadow 0.2s cubic-bezier(.4,0,.2,1), transform 0.2s",
          }}>
            Forum.
          </div>
        </MotionTile>
      </div>

      {/* Footer rule */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "14px 36px", borderTop: `2px solid ${kiosk.color.ink}`,
        background: kiosk.color.paperWarm,
        display: "flex", justifyContent: "space-between",
        fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute,
        letterSpacing: "0.06em",
      }}>
        <span>◆ MAHALLE · KIOSK · MOTION v1.0</span>
        <span>{lang === "DE" ? "ALLE LOOPS · 60FPS · CSS KEYFRAMES" : "ALL LOOPS · 60FPS · CSS KEYFRAMES"}</span>
        <span>SCHILLERKIEZ · NEUKÖLLN</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Export
// ══════════════════════════════════════════════════════════
Object.assign(window, {
  ForumModeratingMobile,
  ForumEditMobile,
  ForumSearchMobile,
  ForumBookmarksMobile,
  ForumDetailMobileThread,
  ForumMotionSpec,
});

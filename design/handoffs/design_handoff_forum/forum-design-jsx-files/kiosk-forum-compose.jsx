/* global React, kiosk, kioskFonts, paperGrainStyle, StripedPlaceholder,
   PostTypeChip, FilterChip, StatusBadge, KioskBtn, KioskInput, KioskTextarea,
   KioskAvatar, KioskNav, ForumPostCard, SEED_POSTS */

// ══════════════════════════════════════════════════════════
//  KIOSK · FORUM · DETAIL + COMPOSE + EDIT
//  Six artboards. Each is its own "page" in the prototype:
//  desktop detail (DE/EN), desktop compose, moderating
//  transition, edit/delete, mobile detail, mobile compose.
// ══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
//  Seed thread — realistic Schillerkiez replies, mixed lang
// ─────────────────────────────────────────────────────────
const THREAD_REPLIES = [
  {
    id: "r01", a: "Tarık D.", aColor: "#3f8f9f", initials: "TD",
    ts: "vor 47 min", tsEN: "47 min ago",
    body: "Wir hatten das gleiche letzten Sommer in der Allerstr. Grünflächenamt war nutzlos — am Ende hat die Eigentümerin das Schädlingsbekämpfer-Service von Pestmann beauftragt. Kostete ~180€, aber war in 3 Tagen weg.",
    bodyEN: "We had the same on Allerstr. last summer. Grünflächenamt was useless — owner ended up booking Pestmann pest control. ~€180, gone in 3 days.",
    likes: 14, isOP: false, hasMedia: false,
  },
  {
    id: "r02", a: "Lena K.", aColor: "#814256", initials: "LK",
    ts: "vor 32 min", tsEN: "32 min ago",
    body: "Danke Tarık! Mache ich morgen. Ich versuch's nochmal beim Amt — diesmal mit dem Online-Formular, vielleicht hilft das.",
    bodyEN: "Thanks Tarık! Will do tomorrow. I'll try the Amt one more time via the online form — maybe that helps.",
    likes: 4, isOP: true, hasMedia: false,
  },
  {
    id: "r03", a: "Ayşegül N.", aColor: "#6b8a4a", initials: "AN",
    ts: "vor 24 min", tsEN: "24 min ago",
    body: "Wichtig: Mülltonnen-Deckel müssen IMMER zu sein. Wir hatten Aushänge im Hausflur gemacht, das hat 70% des Problems gelöst. PDF kann ich teilen wenn du willst.",
    bodyEN: "Important: bin lids ALWAYS shut. We posted notices in the stairwell — solved 70% of the problem. Happy to share the PDF.",
    likes: 22, isOP: false, hasMedia: true,
  },
  {
    id: "r04", a: "Mauro R.", aColor: "#e8a53a", initials: "MR",
    ts: "vor 18 min", tsEN: "18 min ago",
    body: "+1 Aushänge. Wir haben einen Hauseingangs-Plan im Haus und das Problem ist seit 2 Jahren weg. Es geht um Disziplin der Nachbar:innen, nicht um Fallen.",
    bodyEN: "+1 notices. We have a stairwell plan and the problem's been gone for 2 years. It's about neighbour discipline, not traps.",
    likes: 8, isOP: false, hasMedia: false,
  },
  {
    id: "r05", a: "Kerem S.", aColor: "#6f2f59", initials: "KS",
    ts: "vor 6 min", tsEN: "6 min ago",
    body: "Also Pestmann hilft schon, aber bitte keine Giftköder im Hof — Hunde, Kinder. Schlagfallen draußen sind ok wenn abgedeckt.",
    bodyEN: "Pestmann does work, but please no poison bait in the yard — dogs, kids. Snap traps outside fine if covered.",
    likes: 3, isOP: false, hasMedia: false,
  },
];

// ─────────────────────────────────────────────────────────
//  Reusable: Reply card (paper, with OP marker for thread starter)
// ─────────────────────────────────────────────────────────
function ReplyCard({ reply, lang = "DE", first = false }) {
  return (
    <article style={{
      borderTop: first ? "none" : `1px dashed ${kiosk.color.rule}`,
      padding: "14px 0 14px 0",
      display: "grid", gridTemplateColumns: "auto 1fr", gap: 12,
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <KioskAvatar initials={reply.initials} color={reply.aColor} size={32} />
        <span style={{
          fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute,
          letterSpacing: "0.05em",
        }}>♥ {reply.likes}</span>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{reply.a}</span>
          {reply.isOP && (
            <span style={{
              fontFamily: kiosk.font.mono, fontSize: 8.5, fontWeight: 600,
              letterSpacing: "0.08em", padding: "1px 5px", borderRadius: 3,
              background: kiosk.color.wine, color: kiosk.color.paper,
              textTransform: "uppercase",
            }}>OP</span>
          )}
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
            · {lang === "DE" ? reply.ts : reply.tsEN}
          </span>
        </div>
        <p style={{
          fontSize: 13.5, lineHeight: 1.55, margin: "0 0 8px",
          color: kiosk.color.inkSoft, fontFamily: kiosk.font.display,
        }}>{lang === "DE" ? reply.body : reply.bodyEN}</p>
      </div>
    </article>
  );
}

// ═════════════════════════════════════════════════════════
//  1.  POST DETAIL · DESKTOP (DE + EN)
// ═════════════════════════════════════════════════════════
function ForumDetailDesktop({ lang = "DE" }) {
  // The OP post is the rat-problem topic — most replied-to seed.
  const post = SEED_POSTS.find((p) => p.id === "p02");

  return (
    <div style={{
      width: 1280, height: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      <KioskNav active="Forum" lang={lang} />

      {/* Breadcrumb */}
      <div style={{
        padding: "10px 36px", borderBottom: `1px dashed ${kiosk.color.rule}`,
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute,
        letterSpacing: "0.05em",
      }}>
        <span style={{ cursor: "pointer" }}>← {lang === "DE" ? "FORUM" : "FORUM"}</span>
        <span>·</span>
        <span style={{ cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dashed", textUnderlineOffset: 3 }}>
          {lang === "DE" ? "DISKUSSION" : "DISCUSSION"}
        </span>
        <span>·</span>
        <span style={{ color: kiosk.color.ink }}>#oderstraße</span>
        <span style={{ marginLeft: "auto", color: kiosk.color.wine }}>↻ {lang === "DE" ? "live · 47 mitlesend" : "live · 47 reading"}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", height: 900 - 56 - 36, overflow: "hidden" }}>

        {/* Main column */}
        <div style={{ overflow: "hidden", padding: "24px 36px 24px 36px" }}>

          {/* OP post — full editorial treatment */}
          <article style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <PostTypeChip kind="topic" />
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
                · {lang === "DE" ? "vor 1 Stunde" : "1 hour ago"}
              </span>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute }}>· #oderstraße #hilfe</span>
            </div>

            <h1 style={{
              fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em",
              lineHeight: 1.05, margin: "0 0 14px",
              textWrap: "balance", maxWidth: 760,
            }}>{lang === "DE" ? post.title : post.titleEN}</h1>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <KioskAvatar initials="LK" color={kiosk.color.wine} size={36} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Lena K.</div>
                <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
                  {lang === "DE" ? "seit 2019" : "since 2019"}
                </div>
              </div>
              <span style={{ marginLeft: 14, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.success, letterSpacing: "0.08em" }}>
                ● {lang === "DE" ? "VERIFIZIERT IM KIEZ" : "VERIFIED IN KIEZ"}
              </span>
            </div>

            <p style={{
              fontSize: 17, lineHeight: 1.55, color: kiosk.color.ink,
              fontFamily: kiosk.font.display, margin: "0 0 14px",
              maxWidth: 720, textWrap: "pretty",
            }}>{lang === "DE" ? post.body : post.bodyEN}</p>

            <p style={{
              fontSize: 16, lineHeight: 1.55, color: kiosk.color.inkSoft,
              fontFamily: kiosk.font.display, margin: "0 0 18px",
              maxWidth: 720,
            }}>
              {lang === "DE"
                ? "Update: Seit gestern auch tagsüber gesehen, was vorher nicht der Fall war. Ich frage mich, ob es mit den Bauarbeiten am Sonnenallee-Eck zusammenhängt."
                : "Update: starting yesterday I'm seeing them in daylight too, which wasn't happening before. Wondering if it's tied to the construction at the Sonnenallee corner."}
            </p>

            {/* Engagement bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 16,
              borderTop: `1px dashed ${kiosk.color.rule}`,
              borderBottom: `1px dashed ${kiosk.color.rule}`,
              padding: "10px 0", marginTop: 18,
              fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft,
              letterSpacing: "0.04em",
            }}>
              <button style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: kiosk.color.paperWarm, border: kiosk.border.ink,
                borderRadius: kiosk.r.pill, padding: "5px 12px",
                fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600,
                cursor: "pointer", color: kiosk.color.ink,
              }}>♥ <span>23 {lang === "DE" ? "danke" : "thanks"}</span></button>
              <button style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "transparent", border: kiosk.border.ink,
                borderRadius: kiosk.r.pill, padding: "5px 12px",
                fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600,
                cursor: "pointer", color: kiosk.color.ink,
              }}>💬 <span>47 {lang === "DE" ? "antworten" : "replies"}</span></button>
              <button style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: kiosk.color.ochre, border: kiosk.border.ink,
                borderRadius: kiosk.r.pill, padding: "5px 12px",
                fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600,
                cursor: "pointer", color: kiosk.color.ink,
              }}>🔖 <span>{lang === "DE" ? "gespeichert" : "saved"}</span></button>
              <span style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
                <span style={{ cursor: "pointer" }}>↗ {lang === "DE" ? "teilen" : "share"}</span>
                <span style={{ cursor: "pointer", color: kiosk.color.inkMute }}>⚑ {lang === "DE" ? "melden" : "report"}</span>
              </span>
            </div>
          </article>

          {/* Replies header */}
          <div style={{
            display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6,
            paddingBottom: 6, borderBottom: `1.5px solid ${kiosk.color.ink}`,
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              {lang === "DE" ? "47 Antworten" : "47 replies"}
            </h2>
            <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 13, color: kiosk.color.inkMute }}>
              {lang === "DE" ? "neueste zuerst" : "newest first"}
            </span>
            <span style={{ marginLeft: "auto", fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
              {lang === "DE" ? "5 ungelesen" : "5 unread"}
            </span>
          </div>

          {/* Reply list */}
          <div style={{ marginBottom: 16 }}>
            {THREAD_REPLIES.map((r, i) => (
              <ReplyCard key={r.id} reply={r} lang={lang} first={i === 0} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside style={{
          borderLeft: `1px dashed ${kiosk.color.rule}`,
          padding: "24px 22px",
          background: kiosk.color.paperSoft,
          overflow: "hidden",
        }}>
          {/* Reply composer (sticky-feeling) */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.12em", marginBottom: 8 }}>
              ◆ {lang === "DE" ? "DEINE ANTWORT" : "YOUR REPLY"}
            </div>
            <div style={{
              background: kiosk.color.paper, border: `1.5px solid ${kiosk.color.ink}`,
              borderRadius: kiosk.r.md, padding: "10px 12px", minHeight: 90,
              fontFamily: kiosk.font.display, fontSize: 13, color: kiosk.color.inkMute,
              lineHeight: 1.5, position: "relative",
            }}>
              <span style={{ display: "block" }}>
                {lang === "DE" ? "Schreib was Hilfreiches…" : "Write something helpful…"}
              </span>
              <span style={{
                width: 1.5, height: 14, background: kiosk.color.ink,
                position: "absolute", top: 12, left: 12,
                animation: "blink 1s step-end infinite",
              }} />
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginTop: 8, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute,
            }}>
              <span>📎 {lang === "DE" ? "anhang" : "attach"} · 0/3</span>
              <KioskBtn small>{lang === "DE" ? "antworten" : "reply"}</KioskBtn>
            </div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, marginTop: 8, lineHeight: 1.4, letterSpacing: "0.03em" }}>
              {lang === "DE"
                ? "Antworten werden automatisch geprüft (KI + Nachbarschaft). Sei direkt, sei freundlich."
                : "Replies are auto-screened (AI + neighbours). Be direct, be kind."}
            </div>
          </div>

          {/* People in this thread */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.teal, letterSpacing: "0.12em", marginBottom: 8 }}>
              ◆ {lang === "DE" ? "WER MITREDET · 12" : "WHO'S IN · 12"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                { i: "LK", c: kiosk.color.wine, on: true },
                { i: "TD", c: kiosk.color.teal, on: false },
                { i: "AN", c: kiosk.color.moss, on: true },
                { i: "MR", c: kiosk.color.ochre, on: false },
                { i: "KS", c: kiosk.color.plum, on: true },
                { i: "BW", c: kiosk.color.wine, on: false },
                { i: "OB", c: kiosk.color.teal, on: true },
              ].map((p, i) => (
                <KioskAvatar key={i} initials={p.i} color={p.c} online={p.on} size={28} />
              ))}
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                border: `1.5px dashed ${kiosk.color.inkMute}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute,
              }}>+5</div>
            </div>
          </div>

          {/* Related topics */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.moss, letterSpacing: "0.12em", marginBottom: 8 }}>
              ◆ {lang === "DE" ? "ÄHNLICHE THEMEN" : "RELATED TOPICS"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { t: lang === "DE" ? "Müllabfuhr fehlt seit Mittwoch" : "No bin pickup since Wednesday", r: 14, age: "2d" },
                { t: lang === "DE" ? "Hauseingangs-Aushang Vorlage?" : "Stairwell notice template?", r: 8, age: "5d" },
                { t: lang === "DE" ? "Erfahrungen mit Pestmann?" : "Anyone used Pestmann?", r: 19, age: "1w" },
              ].map((r, i) => (
                <div key={i} style={{
                  paddingBottom: 8, borderBottom: `1px dashed ${kiosk.color.rule}`,
                  cursor: "pointer",
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, color: kiosk.color.ink, marginBottom: 2 }}>{r.t}</div>
                  <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
                    {r.r} {lang === "DE" ? "antworten" : "replies"} · {r.age}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust note */}
          <div style={{
            background: kiosk.color.paper, border: `1px dashed ${kiosk.color.rule}`,
            borderRadius: kiosk.r.sm, padding: "10px 12px",
            fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 11.5,
            color: kiosk.color.inkSoft, lineHeight: 1.5,
          }}>
            {lang === "DE"
              ? `\u201EMahalle ist kein Forum f\u00FCr anonyme Wut. Jede Stimme hat eine Adresse \u2014 manchmal w\u00F6rtlich.\u201D`
              : `\u201EMahalle isn't a forum for anonymous rage. Every voice has an address \u2014 sometimes literally.\u201D`}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
//  2.  COMPOSE NEW TOPIC · DESKTOP
// ═════════════════════════════════════════════════════════
function ForumComposeDesktop({ lang = "DE" }) {
  return (
    <div style={{
      width: 1280, height: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      <KioskNav active="Forum" lang={lang} />

      {/* Breadcrumb */}
      <div style={{
        padding: "10px 36px", borderBottom: `1px dashed ${kiosk.color.rule}`,
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute,
        letterSpacing: "0.05em",
      }}>
        <span>← {lang === "DE" ? "FORUM" : "FORUM"}</span>
        <span>·</span>
        <span style={{ color: kiosk.color.ink }}>{lang === "DE" ? "NEUES THEMA" : "NEW TOPIC"}</span>
        <span style={{ marginLeft: "auto", color: kiosk.color.success }}>● {lang === "DE" ? "automatisch gespeichert · vor 4s" : "auto-saved · 4s ago"}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", height: 900 - 56 - 36, overflow: "hidden" }}>

        {/* Compose form */}
        <div style={{ padding: "26px 36px 24px", overflow: "hidden" }}>

          {/* Title */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.12em" }}>
              ◆ {lang === "DE" ? "WORÜBER REDEN WIR HEUTE?" : "WHAT'S ON YOUR MIND?"}
            </div>
          </div>

          {/* Title input */}
          <div style={{
            background: "transparent", border: "none",
            borderBottom: `1.5px solid ${kiosk.color.ink}`,
            padding: "8px 0 6px", marginBottom: 14,
            position: "relative",
          }}>
            <span style={{
              fontSize: 36, fontWeight: 800, letterSpacing: "-0.025em",
              color: kiosk.color.ink, lineHeight: 1.1,
              fontFamily: kiosk.font.display,
            }}>{lang === "DE" ? "Sperrmüll-Tausch Sonntag — wer macht mit?" : "Sunday curbside swap — who's in?"}</span>
            <span style={{
              position: "absolute", bottom: 6, right: 0,
              fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute,
            }}>{lang === "DE" ? "42 / 80" : "42 / 80"}</span>
          </div>

          {/* Type selector */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 6 }}>
              {lang === "DE" ? "ART · WAS POSTEST DU?" : "TYPE · WHAT ARE YOU POSTING?"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { k: "topic", l: lang === "DE" ? "Diskussion" : "Discussion", c: kiosk.color.wine, d: lang === "DE" ? "frage, problem, austausch" : "question, problem, exchange", active: true },
                { k: "recommendation", l: lang === "DE" ? "Empfehlung" : "Recommendation", c: kiosk.color.moss, d: lang === "DE" ? "tipp, ort, person" : "tip, place, person" },
                { k: "announcement", l: lang === "DE" ? "Ankündigung" : "Announcement", c: kiosk.color.teal, d: lang === "DE" ? "info, hinweis, einladung" : "info, notice, invite" },
              ].map((opt) => (
                <div key={opt.k} style={{
                  flex: 1, padding: "10px 12px",
                  background: opt.active ? opt.c : kiosk.color.paperWarm,
                  color: opt.active ? kiosk.color.paper : kiosk.color.ink,
                  border: `1.5px solid ${opt.active ? opt.c : kiosk.color.ink}`,
                  borderRadius: kiosk.r.md,
                  cursor: "pointer",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {opt.l}
                  </div>
                  <div style={{
                    fontFamily: kiosk.font.mono, fontSize: 9.5,
                    color: opt.active ? "rgba(243,234,216,0.75)" : kiosk.color.inkMute,
                    letterSpacing: "0.04em", marginTop: 2,
                  }}>{opt.d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Body editor */}
          <div style={{ marginBottom: 14 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute,
              letterSpacing: "0.1em", marginBottom: 6,
            }}>
              <span>{lang === "DE" ? "TEXT · MARKDOWN OK" : "BODY · MARKDOWN OK"}</span>
              <span style={{ display: "flex", gap: 10 }}>
                <span><b>B</b></span>
                <span style={{ fontStyle: "italic" }}>i</span>
                <span style={{ textDecoration: "underline" }}>U</span>
                <span>“ ”</span>
                <span>· { } ·</span>
                <span>↗</span>
              </span>
            </div>
            <div style={{
              background: kiosk.color.paperSoft,
              border: `1.5px solid ${kiosk.color.ink}`,
              borderRadius: kiosk.r.md, padding: "14px 16px", minHeight: 130,
              fontFamily: kiosk.font.display, fontSize: 14, lineHeight: 1.55,
              color: kiosk.color.ink, position: "relative",
            }}>
              <p style={{ margin: 0 }}>
                {lang === "DE"
                  ? "Letztes Mal hab ich einen Stuhl und zwei Pflanzen mitgenommen. Wir machen das wieder am Sonntag — nehmen statt kaufen."
                  : "Last time I scored a chair and two plants. We're doing it again Sunday — take instead of buy."}
              </p>
              <p style={{ margin: "10px 0 0", color: kiosk.color.inkSoft }}>
                {lang === "DE"
                  ? "Bitte nur Sachen, die noch funktionieren."
                  : "Working stuff only please."}
              </p>
              <span style={{
                width: 1.5, height: 18, background: kiosk.color.ink,
                display: "inline-block", verticalAlign: "middle",
                animation: "blink 1s step-end infinite", marginLeft: 1,
              }} />
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute,
              marginTop: 6,
            }}>
              <span>{lang === "DE" ? "tipp · @name erwähnt jemanden im kiez" : "tip · @name mentions someone in the kiez"}</span>
              <span>{lang === "DE" ? "184 / 2000" : "184 / 2000"}</span>
            </div>
          </div>

          {/* Image upload */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 6 }}>
              {lang === "DE" ? "BILDER · MAX 5" : "IMAGES · MAX 5"} · 2 / 5
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[kiosk.color.ochre, kiosk.color.moss].map((c, i) => (
                <div key={i} style={{
                  width: 84, height: 84, borderRadius: kiosk.r.sm,
                  border: kiosk.border.ink,
                  background: `repeating-linear-gradient(45deg, ${c}55 0 6px, ${kiosk.color.paperWarm} 6px 12px)`,
                  position: "relative",
                }}>
                  <div style={{
                    position: "absolute", top: 4, right: 4,
                    width: 18, height: 18, borderRadius: "50%",
                    background: kiosk.color.ink, color: kiosk.color.paper,
                    fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}>×</div>
                  <div style={{
                    position: "absolute", bottom: 4, left: 4,
                    fontFamily: kiosk.font.mono, fontSize: 8, color: kiosk.color.ink,
                    background: kiosk.color.paper, padding: "1px 4px", borderRadius: 2,
                  }}>0{i+1}</div>
                </div>
              ))}
              <div style={{
                width: 84, height: 84, borderRadius: kiosk.r.sm,
                border: `1.5px dashed ${kiosk.color.inkMute}`,
                background: "transparent",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute,
                cursor: "pointer", lineHeight: 1.3,
              }}>
                <div style={{ fontSize: 22 }}>+</div>
                <div>{lang === "DE" ? "hochladen" : "upload"}</div>
              </div>
              <div style={{
                width: 84, height: 84, borderRadius: kiosk.r.sm,
                background: "transparent",
                fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute,
                lineHeight: 1.4, padding: "4px 6px",
              }}>
                {lang === "DE"
                  ? "JPG, PNG, WebP · ≤5 MB · alle Bilder werden geprüft"
                  : "JPG, PNG, WebP · ≤5 MB · all images are screened"}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 6 }}>
              {lang === "DE" ? "TAGS · 1–3" : "TAGS · 1–3"}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <FilterChip label="tausch" hashtag active />
              <FilterChip label="sonntag" hashtag active />
              <span style={{
                padding: "5px 12px", fontSize: 12.5,
                fontFamily: kiosk.font.mono, fontWeight: 500,
                color: kiosk.color.inkMute,
                border: `1.5px dashed ${kiosk.color.inkMute}`,
                borderRadius: kiosk.r.pill,
              }}>+ {lang === "DE" ? "tag" : "tag"}</span>
              <span style={{ marginLeft: 8, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, alignSelf: "center" }}>
                {lang === "DE" ? "vorgeschlagen:" : "suggested:"}
              </span>
              <FilterChip label="nachbarschaft" hashtag />
              <FilterChip label="upcycling" hashtag />
            </div>
          </div>
        </div>

        {/* Sidebar — preview + submit */}
        <aside style={{
          borderLeft: `1px dashed ${kiosk.color.rule}`,
          background: kiosk.color.paperSoft,
          padding: "26px 22px",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.12em", marginBottom: 8 }}>
            ◆ {lang === "DE" ? "VORSCHAU · LIVE" : "PREVIEW · LIVE"}
          </div>

          {/* Mini preview card */}
          <div style={{
            background: kiosk.color.paperWarm, border: `1.5px solid ${kiosk.color.ink}`,
            borderRadius: kiosk.r.md, padding: 14, marginBottom: 18,
            boxShadow: kiosk.shadow.printSm(),
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <KioskAvatar initials="EA" color={kiosk.color.wine} size={22} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>du</div>
                  <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute }}>{lang === "DE" ? "gleich" : "now"}</div>
                </div>
              </div>
              <PostTypeChip kind="topic" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.018em", lineHeight: 1.2, marginBottom: 6 }}>
              {lang === "DE" ? "Sperrmüll-Tausch Sonntag — wer macht mit?" : "Sunday curbside swap — who's in?"}
            </div>
            <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: 0, color: kiosk.color.inkSoft }}>
              {lang === "DE"
                ? "Letztes Mal hab ich einen Stuhl und zwei Pflanzen mitgenommen. Wir machen das wieder…"
                : "Last time I scored a chair and two plants. We're doing it again…"}
            </p>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute }}>#tausch</span>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute }}>#sonntag</span>
            </div>
          </div>

          {/* Moderation note */}
          <div style={{
            background: kiosk.color.paper, border: `1px dashed ${kiosk.color.rule}`,
            borderRadius: kiosk.r.sm, padding: "12px 14px", marginBottom: 16,
          }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.teal, letterSpacing: "0.12em", marginBottom: 6 }}>
              ◆ {lang === "DE" ? "MODERATION" : "MODERATION"}
            </div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, lineHeight: 1.7, color: kiosk.color.inkSoft }}>
              {lang === "DE"
                ? "Dein Beitrag wird kurz auf Sprache und Inhalt geprüft, bevor er veröffentlicht wird. Die Prüfung ist anonym — keine persönlichen Daten werden verwendet, nur der Text und die Bilder."
                : "Your post is briefly checked for language and content before going live. The check is anonymous — no personal data is used, only the text and images."}
            </div>
          </div>

          {/* Submit row */}
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <KioskBtn>{lang === "DE" ? "veröffentlichen →" : "publish →"}</KioskBtn>
            <KioskBtn variant="outline">{lang === "DE" ? "als entwurf speichern" : "save as draft"}</KioskBtn>
            <KioskBtn variant="ghost">{lang === "DE" ? "verwerfen" : "discard"}</KioskBtn>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, lineHeight: 1.5, marginTop: 6 }}>
              {lang === "DE"
                ? "indem du veröffentlichst, akzeptierst du die kiez-regeln. wir sind eine nachbarschaft, kein anonymes board."
                : "by publishing you accept the kiez rules. we're a neighbourhood, not an anonymous board."}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
//  3.  MODERATING TRANSITION
//  After submit · 5-state pipeline visible · live ticker
// ═════════════════════════════════════════════════════════
function ForumModeratingDesktop({ lang = "DE" }) {
  const stages = lang === "DE"
    ? [
        { l: "Sprache geprüft", s: "done", t: "TR · DE · EN" },
        { l: "Inhalt geprüft", s: "done", t: "keine Auffälligkeiten" },
        { l: "Kontext-Prüfung", s: "running", t: "läuft" },
        { l: "Bilder werden geprüft", s: "queued", t: "Bild 1/2" },
        { l: "Veröffentlichen", s: "queued", t: "gleich live" },
      ]
    : [
        { l: "Language checked", s: "done", t: "TR · DE · EN" },
        { l: "Content checked", s: "done", t: "nothing flagged" },
        { l: "Context check", s: "running", t: "running" },
        { l: "Images being screened", s: "queued", t: "image 1/2" },
        { l: "Publish", s: "queued", t: "almost live" },
      ];

  return (
    <div style={{
      width: 1280, height: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      <KioskNav active="Forum" lang={lang} />

      {/* Backdrop = ghosted forum behind a modal */}
      <div style={{
        position: "absolute", top: 56, left: 0, right: 0, bottom: 0,
        background: "rgba(27,26,23,0.32)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 40,
      }}>
        {/* Centered moderation card */}
        <div style={{
          width: 720, background: kiosk.color.paper,
          border: `2px solid ${kiosk.color.ink}`,
          borderRadius: kiosk.r.lg,
          boxShadow: kiosk.shadow.print(kiosk.color.wine),
          padding: "26px 32px",
          position: "relative",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{
              width: 14, height: 14, borderRadius: "50%",
              background: kiosk.color.ochre, border: `2px solid ${kiosk.color.ink}`,
              animation: "pulseDot 1.4s ease-in-out infinite",
            }} />
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.wine, letterSpacing: "0.14em" }}>
              ◆ {lang === "DE" ? "DEIN POST WIRD GEPRÜFT" : "YOUR POST IS BEING SCREENED"}
            </div>
          </div>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.025em", margin: "4px 0 4px", lineHeight: 1.05 }}>
            {lang === "DE" ? <>Wir <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>schauen</span> kurz drüber.</> : <>One <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>moment</span>, screening.</>}
          </h2>
          <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, color: kiosk.color.inkSoft, margin: "0 0 18px", lineHeight: 1.4 }}>
            {lang === "DE"
              ? "Kurze, anonyme Prüfung. Du musst nichts tun."
              : "Quick, anonymous screening. Nothing for you to do."}
          </p>

          {/* Pipeline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 16 }}>
            {stages.map((st, i) => {
              const isDone = st.s === "done";
              const isRun = st.s === "running";
              const dot = isDone ? "✓" : isRun ? "◐" : "·";
              const dotColor = isDone ? kiosk.color.success : isRun ? kiosk.color.ochre : kiosk.color.inkMute;
              const labelColor = isDone || isRun ? kiosk.color.ink : kiosk.color.inkMute;
              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "28px 1fr",
                  gap: 10, alignItems: "center",
                  padding: "10px 0",
                  borderBottom: i < stages.length - 1 ? `1px dashed ${kiosk.color.rule}` : "none",
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: isDone ? kiosk.color.success : isRun ? kiosk.color.ochre : "transparent",
                    border: `1.5px solid ${dotColor}`,
                    color: kiosk.color.paper,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                    fontFamily: kiosk.font.mono,
                    animation: isRun ? "spinDot 1.2s linear infinite" : "none",
                  }}>{dot}</div>
                  <div>
                    <div style={{
                      fontSize: 13.5, fontWeight: 700, color: labelColor,
                      letterSpacing: "-0.005em",
                    }}>{st.l}</div>
                    <div style={{
                      fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute,
                      letterSpacing: "0.04em", marginTop: 1,
                    }}>{st.t}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{
            background: kiosk.color.paperSoft,
            border: `1px solid ${kiosk.color.rule}`,
            borderRadius: kiosk.r.pill, height: 8,
            overflow: "hidden", marginBottom: 8,
          }}>
            <div style={{
              width: "44%", height: "100%",
              background: `repeating-linear-gradient(45deg, ${kiosk.color.ochre} 0 6px, ${kiosk.color.wine} 6px 12px)`,
              borderRadius: kiosk.r.pill,
              animation: "progStripe 1.2s linear infinite",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>
            <span>{lang === "DE" ? "schritt 3 / 5 · ~700ms verbleibend" : "stage 3 / 5 · ~700ms left"}</span>
            <span>{lang === "DE" ? "abbrechen +Z" : "cancel +Z"}</span>
          </div>

          {/* Note */}
          <div style={{
            marginTop: 16, padding: "10px 12px",
            background: kiosk.color.paperWarm, border: `1px dashed ${kiosk.color.rule}`,
            borderRadius: kiosk.r.sm,
            fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12, color: kiosk.color.inkSoft, lineHeight: 1.5,
          }}>
            {lang === "DE"
              ? "✦ Im Hintergrund läuft schon der optimistische Eintrag — falls alles ok ist, ist dein Post bereits sichtbar, sobald du diesen Dialog wegklickst."
              : "✦ Optimistic insert is already running — if everything's clean, your post is visible the moment you dismiss this dialog."}
          </div>
        </div>

        {/* Annotation post-it */}
        <div style={{
          position: "absolute", top: 80, right: 60, maxWidth: 200,
          background: kiosk.color.ochre, border: kiosk.border.ink,
          borderRadius: kiosk.r.sm, padding: "10px 12px",
          boxShadow: kiosk.shadow.print(),
          transform: "rotate(2deg)",
          fontFamily: kiosk.font.mono, fontSize: 10.5, lineHeight: 1.45,
          color: kiosk.color.ink,
        }}>
          <b>MOTION</b><br/>
          stages cascade in @ 80ms each. Running stage's dot rotates (1.2s linear). Stripe progress bar shifts left-to-right at 1.2s.
        </div>
      </div>

      <style>{`
        @keyframes pulseDot { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.6; } }
        @keyframes spinDot { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes progStripe { from { background-position: 0 0; } to { background-position: 24px 0; } }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
//  4.  EDIT POST + DELETE CONFIRM (overlay)
// ═════════════════════════════════════════════════════════
function ForumEditDesktop({ lang = "DE" }) {
  return (
    <div style={{
      width: 1280, height: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      <KioskNav active="Forum" lang={lang} />

      {/* Banner: edit mode */}
      <div style={{
        background: kiosk.color.ochre, color: kiosk.color.ink,
        padding: "8px 36px", borderBottom: kiosk.border.ink,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.08em", fontWeight: 600,
      }}>
        <span>{lang === "DE" ? `\u270E DU BEARBEITEST DEINEN POST \u00B7 \u00C4nderungen werden mit \u201Ebearbeitet\u201D markiert` : `\u270E YOU'RE EDITING YOUR POST \u00B7 changes are marked \u201Eedited\u201D`}</span>
        <span>{lang === "DE" ? "ESC = abbrechen" : "ESC = cancel"}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: 900 - 56 - 38, overflow: "hidden" }}>

        {/* Editable form */}
        <div style={{ padding: "22px 36px", overflow: "hidden" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
          }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
              {lang === "DE" ? "VERÖFFENTLICHT · vor 1 Stunde · 47 Antworten" : "PUBLISHED · 1h ago · 47 replies"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <PostTypeChip kind="topic" />
              <StatusBadge kind="approved" />
            </div>
          </div>

          {/* Title editable */}
          <div style={{
            background: kiosk.color.paperWarm,
            border: `1.5px solid ${kiosk.color.ink}`,
            borderRadius: kiosk.r.md, padding: "10px 14px", marginBottom: 10,
            position: "relative",
          }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 4 }}>TITEL</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {lang === "DE" ? "Rattenproblem Oderstraße — wer hat Tipps?" : "Rat problem on Oderstraße — anyone got tips?"}
              <span style={{
                width: 2, height: 22, background: kiosk.color.ink,
                display: "inline-block", verticalAlign: "middle", marginLeft: 2,
                animation: "blink 1s step-end infinite",
              }} />
            </div>
          </div>

          {/* Body editable */}
          <div style={{
            background: kiosk.color.paperSoft,
            border: `1.5px solid ${kiosk.color.ink}`,
            borderRadius: kiosk.r.md, padding: "12px 14px", marginBottom: 12,
            minHeight: 180,
          }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 6 }}>TEXT</div>
            <p style={{ fontSize: 14, lineHeight: 1.55, margin: "0 0 10px", color: kiosk.color.ink }}>
              {lang === "DE"
                ? "Seit zwei Wochen sehe ich sie abends rund um die Mülltonnen. Habe das Grünflächenamt angerufen, aber bisher nichts gehört. Hat jemand Erfahrung mit Fallen oder weiß, wer da helfen kann?"
                : "For two weeks now I've been seeing them around the bins at night. Called the Grünflächenamt — radio silence. Anyone got experience with traps?"}
            </p>
            {/* New paragraph being added — highlighted */}
            <p style={{
              fontSize: 14, lineHeight: 1.55, margin: 0,
              background: `linear-gradient(transparent 60%, ${kiosk.color.ochre}55 60%)`,
              padding: "0 2px",
            }}>
              {lang === "DE"
                ? "Update (gerade dazu): Tarık empfiehlt Pestmann (~180€). Probier ich morgen zuerst beim Amt, sonst dort."
                : "Update (just now): Tarık recommends Pestmann (~€180). Trying the Amt one more time first, otherwise booking them."}
              <span style={{
                width: 2, height: 16, background: kiosk.color.ink,
                display: "inline-block", verticalAlign: "middle", marginLeft: 1,
                animation: "blink 1s step-end infinite",
              }} />
            </p>
          </div>

          {/* Edit history — minimal */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 6 }}>
              {lang === "DE" ? "VERSIONEN" : "VERSION HISTORY"}
            </div>
            <div style={{
              fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft,
              padding: "6px 10px", background: kiosk.color.paperWarm,
              border: `1px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.sm,
            }}>
              {lang === "DE" ? "3-mal bearbeitet" : "edited 3 times"}
            </div>
          </div>

          {/* Action row */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <KioskBtn>{lang === "DE" ? "speichern" : "save"}</KioskBtn>
            <KioskBtn variant="outline">{lang === "DE" ? "abbrechen" : "cancel"}</KioskBtn>
            <span style={{ marginLeft: "auto" }}>
              <KioskBtn variant="danger" small>{lang === "DE" ? "post löschen…" : "delete post…"}</KioskBtn>
            </span>
          </div>
        </div>

        {/* Sidebar: delete confirm overlay */}
        <aside style={{
          borderLeft: `1px dashed ${kiosk.color.rule}`,
          background: kiosk.color.paperSoft,
          padding: "22px 22px",
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.danger, letterSpacing: "0.12em", marginBottom: 8 }}>
            ◆ {lang === "DE" ? "POST LÖSCHEN?" : "DELETE POST?"}
          </div>

          {/* Confirm card */}
          <div style={{
            background: kiosk.color.paper,
            border: `2px solid ${kiosk.color.danger}`,
            borderRadius: kiosk.r.md, padding: 16,
            boxShadow: kiosk.shadow.print(kiosk.color.danger),
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px", lineHeight: 1.15 }}>
              {lang === "DE" ? <>Wirklich <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.danger }}>löschen</span>?</> : <>Really <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.danger }}>delete</span>?</>}
            </h3>
            <p style={{ fontSize: 12.5, lineHeight: 1.55, color: kiosk.color.inkSoft, margin: "0 0 12px" }}>
              {lang === "DE"
                ? "47 Antworten gehen verloren. Tarıks Tipp, Ayşegüls Aushang, Maurus +1 — alles weg."
                : "47 replies will disappear. Tarık's tip, Ayşegül's notice, Mauro's +1 — all gone."}
            </p>

            {/* Type to confirm */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.08em", marginBottom: 4 }}>
                {lang === "DE" ? `TIPPE \u201EL\u00D6SCHEN\u201D ZUM BEST\u00C4TIGEN` : `TYPE \u201EDELETE\u201D TO CONFIRM`}
              </div>
              <div style={{
                background: kiosk.color.paperSoft,
                border: `1.5px solid ${kiosk.color.danger}`,
                borderRadius: kiosk.r.sm, padding: "6px 10px",
                fontFamily: kiosk.font.mono, fontSize: 12, color: kiosk.color.ink,
                position: "relative",
              }}>
                {lang === "DE" ? "lösch" : "del"}
                <span style={{
                  width: 1.5, height: 14, background: kiosk.color.ink,
                  display: "inline-block", verticalAlign: "middle", marginLeft: 1,
                  animation: "blink 1s step-end infinite",
                }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button style={{
                flex: 1, background: kiosk.color.paperSoft,
                border: kiosk.border.ink, borderRadius: kiosk.r.pill,
                padding: "8px 12px", fontSize: 12, fontWeight: 700,
                fontFamily: kiosk.font.display, cursor: "pointer",
                color: kiosk.color.inkMute, // disabled feel
              }}>{lang === "DE" ? "endgültig löschen" : "delete forever"}</button>
              <button style={{
                background: kiosk.color.ink, color: kiosk.color.paper,
                border: kiosk.border.ink, borderRadius: kiosk.r.pill,
                padding: "8px 16px", fontSize: 12, fontWeight: 700,
                fontFamily: kiosk.font.display, cursor: "pointer",
                boxShadow: kiosk.shadow.print(kiosk.color.wine),
              }}>{lang === "DE" ? "abbrechen" : "cancel"}</button>
            </div>
          </div>

          <div style={{ marginTop: 14, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 11.5, color: kiosk.color.inkMute, lineHeight: 1.5 }}>
            {lang === "DE"
              ? `Der Knopf links wird erst aktiv, wenn du \u201El\u00F6schen\u201D tippst. Bewusste Reibung \u2014 wir sch\u00FCtzen den Thread.`
              : `The left button stays disabled until you type \u201Edelete\u201D. Intentional friction \u2014 we protect the thread.`}
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
//  5.  POST DETAIL · MOBILE
// ═════════════════════════════════════════════════════════
function ForumDetailMobile({ lang = "DE" }) {
  const post = SEED_POSTS.find((p) => p.id === "p02");

  return (
    <div style={{
      width: 390, height: 844, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      {/* Status bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", fontFamily: kiosk.font.mono, fontSize: 13, fontWeight: 600 }}>
        <span>14:42</span>
        <span>● ● ●</span>
      </div>

      {/* Top nav */}
      <header style={{
        padding: "8px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px dashed ${kiosk.color.rule}`,
      }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 12, fontWeight: 600, color: kiosk.color.ink, letterSpacing: "0.05em" }}>
          ← {lang === "DE" ? "FORUM" : "FORUM"}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🔖</span>
          <span style={{ fontSize: 16 }}>↗</span>
          <span style={{ fontSize: 16 }}>⋯</span>
        </div>
      </header>

      {/* Content scroll region */}
      <div style={{ height: 844 - 44 - 40 - 56 - 64, overflow: "hidden", padding: "14px 18px 16px" }}>
        {/* Type + tags */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <PostTypeChip kind="topic" />
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
            · {lang === "DE" ? "vor 1h" : "1h"}
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 24, fontWeight: 800, letterSpacing: "-0.025em",
          lineHeight: 1.1, margin: "0 0 12px", textWrap: "balance",
        }}>{lang === "DE" ? post.title : post.titleEN}</h1>

        {/* Author row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <KioskAvatar initials="LK" color={kiosk.color.wine} size={28} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Lena K.</div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute }}>
              {lang === "DE" ? "seit 2019" : "since 2019"}
            </div>
          </div>
        </div>

        {/* Body */}
        <p style={{ fontSize: 14, lineHeight: 1.55, margin: "0 0 12px", color: kiosk.color.ink }}>
          {lang === "DE" ? post.body : post.bodyEN}
        </p>

        {/* Engagement strip */}
        <div style={{
          display: "flex", gap: 10, marginBottom: 14,
          paddingBottom: 14, borderBottom: `1.5px solid ${kiosk.color.ink}`,
        }}>
          <div style={{
            background: kiosk.color.paperWarm, border: kiosk.border.ink,
            borderRadius: kiosk.r.pill, padding: "5px 10px",
            fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>♥ 23</div>
          <div style={{
            background: "transparent", border: kiosk.border.ink,
            borderRadius: kiosk.r.pill, padding: "5px 10px",
            fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>💬 47</div>
          <div style={{
            background: kiosk.color.ochre, border: kiosk.border.ink,
            borderRadius: kiosk.r.pill, padding: "5px 10px",
            fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>🔖</div>
          <span style={{ marginLeft: "auto", alignSelf: "center", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.05em" }}>
            ↻ live
          </span>
        </div>

        {/* Replies header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, letterSpacing: "-0.015em" }}>
            {lang === "DE" ? "47 Antworten" : "47 replies"}
          </h2>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
            {lang === "DE" ? "neueste ↓" : "newest ↓"}
          </span>
        </div>

        {/* Top 2 replies condensed */}
        {THREAD_REPLIES.slice(0, 2).map((r, i) => (
          <ReplyCard key={r.id} reply={r} lang={lang} first={i === 0} />
        ))}
      </div>

      {/* Sticky reply composer */}
      <div style={{
        position: "absolute", bottom: 56, left: 0, right: 0,
        padding: "10px 14px", background: kiosk.color.paper,
        borderTop: `1.5px solid ${kiosk.color.ink}`,
        display: "flex", gap: 8, alignItems: "center",
      }}>
        <KioskAvatar initials="EA" color={kiosk.color.wine} size={28} />
        <div style={{
          flex: 1, background: kiosk.color.paperSoft,
          border: `1px solid ${kiosk.color.rule}`,
          borderRadius: kiosk.r.pill, padding: "8px 14px",
          fontFamily: kiosk.font.display, fontSize: 12, color: kiosk.color.inkMute,
        }}>{lang === "DE" ? "Antworten…" : "Reply…"}</div>
        <button style={{
          width: 36, height: 36, borderRadius: "50%",
          background: kiosk.color.ink, color: kiosk.color.paper,
          border: kiosk.border.ink, fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>↑</button>
      </div>

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

// ═════════════════════════════════════════════════════════
//  6.  COMPOSE · MOBILE (full-screen sheet)
// ═════════════════════════════════════════════════════════
function ForumComposeMobile({ lang = "DE" }) {
  return (
    <div style={{
      width: 390, height: 844, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      {/* Status bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", fontFamily: kiosk.font.mono, fontSize: 13, fontWeight: 600 }}>
        <span>14:42</span>
        <span>● ● ●</span>
      </div>

      {/* Sheet header */}
      <header style={{
        padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: kiosk.border.ink, background: kiosk.color.paper,
      }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute, fontWeight: 600 }}>
          {lang === "DE" ? "ABBRECHEN" : "CANCEL"}
        </span>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.wine, letterSpacing: "0.12em" }}>◆ NEU</div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.015em" }}>
            {lang === "DE" ? "Neues Thema" : "New topic"}
          </div>
        </div>
        <span style={{
          fontFamily: kiosk.font.display, fontSize: 12, fontWeight: 700,
          background: kiosk.color.ink, color: kiosk.color.paper,
          padding: "5px 12px", borderRadius: kiosk.r.pill,
          border: kiosk.border.ink, boxShadow: kiosk.shadow.printSm(kiosk.color.wine),
        }}>{lang === "DE" ? "post" : "post"}</span>
      </header>

      <div style={{ padding: "14px 18px", overflow: "hidden", height: 844 - 44 - 50 - 240 }}>
        {/* Type pills */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <span style={{
            padding: "5px 12px", fontSize: 11, fontWeight: 700,
            background: kiosk.color.wine, color: kiosk.color.paper,
            border: kiosk.border.ink, borderRadius: kiosk.r.pill,
            fontFamily: kiosk.font.mono, letterSpacing: "0.06em",
          }}>● {lang === "DE" ? "DISKUSSION" : "DISCUSSION"}</span>
          <span style={{
            padding: "5px 12px", fontSize: 11, fontWeight: 600,
            background: "transparent", color: kiosk.color.inkMute,
            border: `1.5px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.pill,
            fontFamily: kiosk.font.mono, letterSpacing: "0.06em",
          }}>○ {lang === "DE" ? "EMPFEHLUNG" : "RECOMMEND"}</span>
        </div>

        {/* Title */}
        <div style={{ borderBottom: `1.5px solid ${kiosk.color.ink}`, paddingBottom: 6, marginBottom: 12 }}>
          <span style={{
            fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15,
          }}>{lang === "DE" ? "Sperrmüll-Tausch Sonntag — wer macht mit?" : "Sunday curbside swap — who's in?"}</span>
        </div>

        {/* Body */}
        <p style={{ fontSize: 14, lineHeight: 1.55, color: kiosk.color.ink, margin: "0 0 8px" }}>
          {lang === "DE"
            ? "Letztes Mal hab ich einen Stuhl und zwei Pflanzen mitgenommen. Wir machen das wieder am Sonntag — nehmen statt kaufen."
            : "Last time I scored a chair and two plants. We're doing it again Sunday — take instead of buy."}
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: kiosk.color.inkSoft, margin: 0 }}>
          {lang === "DE" ? "Bitte nur Sachen, die noch funktionieren." : "Working stuff only please."}
          <span style={{
            width: 2, height: 16, background: kiosk.color.ink,
            display: "inline-block", verticalAlign: "middle", marginLeft: 1,
            animation: "blink 1s step-end infinite",
          }} />
        </p>

        {/* Char count */}
        <div style={{
          fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute,
          marginTop: 8, textAlign: "right",
        }}>184 / 2000</div>
      </div>

      {/* Image strip */}
      <div style={{
        padding: "10px 18px", borderTop: `1px dashed ${kiosk.color.rule}`,
        display: "flex", gap: 6, overflow: "hidden",
      }}>
        {[kiosk.color.ochre, kiosk.color.moss].map((c, i) => (
          <div key={i} style={{
            width: 56, height: 56, borderRadius: kiosk.r.sm,
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
        <div style={{
          width: 56, height: 56, borderRadius: kiosk.r.sm,
          border: `1.5px dashed ${kiosk.color.inkMute}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, color: kiosk.color.inkMute,
        }}>+</div>
        <div style={{
          fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute,
          alignSelf: "center", marginLeft: 6, lineHeight: 1.4,
        }}>
          2 / 5<br/>{lang === "DE" ? "Bilder" : "images"}
        </div>
      </div>

      {/* Tags row */}
      <div style={{
        padding: "10px 18px", borderTop: `1px dashed ${kiosk.color.rule}`,
        display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap",
      }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.1em" }}>TAGS</span>
        <FilterChip label="tausch" hashtag active />
        <FilterChip label="sonntag" hashtag active />
        <span style={{
          padding: "3px 10px", fontSize: 11,
          fontFamily: kiosk.font.mono,
          color: kiosk.color.inkMute,
          border: `1.5px dashed ${kiosk.color.inkMute}`,
          borderRadius: kiosk.r.pill,
        }}>+ tag</span>
      </div>

      {/* Moderation strip */}
      <div style={{
        padding: "10px 18px", borderTop: `1px dashed ${kiosk.color.rule}`,
        background: kiosk.color.paperSoft,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkSoft,
          letterSpacing: "0.04em",
        }}>
          <span style={{ color: kiosk.color.success }}>● {lang === "DE" ? "WIRD GEPRÜFT" : "AUTO-SCREENED"}</span>
          <span style={{ marginLeft: "auto", color: kiosk.color.inkMute }}>
            {lang === "DE" ? "~1.4s · KI + Nachbarschaft" : "~1.4s · AI + neighbours"}
          </span>
        </div>
      </div>

      {/* Faux keyboard */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 240,
        background: kiosk.color.paperSoft, borderTop: `1.5px solid ${kiosk.color.ink}`,
        padding: "8px 4px",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          padding: "4px 12px",
          fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute,
          borderBottom: `1px dashed ${kiosk.color.rule}`,
          marginBottom: 6,
        }}>
          <span>📷</span><span>🔗</span><span>@</span><span>#</span><span>✦</span><span>↩</span>
        </div>
        {/* Keys (decorative) */}
        {["qwertzuiopü", "asdfghjklöä", "yxcvbnm"].map((row, ri) => (
          <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 5 }}>
            {row.split("").map((k) => (
              <div key={k} style={{
                width: 30, height: 38, borderRadius: 5,
                background: kiosk.color.paper, border: `1px solid ${kiosk.color.rule}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontFamily: kiosk.font.display, fontWeight: 500,
              }}>{k}</div>
            ))}
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "center", gap: 3 }}>
          <div style={{ width: 60, height: 38, borderRadius: 5, background: kiosk.color.paper, border: `1px solid ${kiosk.color.rule}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: kiosk.font.mono }}>123</div>
          <div style={{ width: 160, height: 38, borderRadius: 5, background: kiosk.color.paper, border: `1px solid ${kiosk.color.rule}` }} />
          <div style={{ width: 60, height: 38, borderRadius: 5, background: kiosk.color.ink, color: kiosk.color.paper, border: kiosk.border.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: kiosk.font.mono }}>↩</div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

Object.assign(window, {
  ForumDetailDesktop, ForumComposeDesktop,
  ForumModeratingDesktop, ForumEditDesktop,
  ForumDetailMobile, ForumComposeMobile,
});

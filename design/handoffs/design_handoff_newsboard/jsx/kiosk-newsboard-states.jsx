/* global React, kiosk, kioskFonts, paperGrainStyle, KioskBtn, news, SEED_ARTICLES, TODAY, SourceChip, SektionTag, HeatChip, KuratiertChip, FilterChip, SaveToggle */

// ══════════════════════════════════════════════════════════
//  KIOSK · NEWSBOARD · STATE MATRIX
//  9 states covering the full lifecycle:
//   01 loading skeleton          02 empty (zero today)
//   03 empty (saved-only zero)   04 error 503
//   05 offline / cached          06 NewsData API down (RSS-only)
//   07 rate-limited (submit)     08 submission pending mod
//   09 submission rejected
//  Desktop matrix (3×3) + mobile vertical stack.
// ══════════════════════════════════════════════════════════

// ─── State tile shell — frames each state with annotation ───
function StateTile({ n, title, sub, children, color = kiosk.color.ink }) {
  return (
    <div style={{
      background: kiosk.color.paperWarm,
      border: kiosk.border.ink,
      borderRadius: kiosk.r.lg,
      overflow: "hidden",
      boxShadow: kiosk.shadow.printSm(),
    }}>
      <div style={{
        padding: "10px 14px",
        background: color, color: kiosk.color.paper,
        display: "flex", alignItems: "center", gap: 8,
        borderBottom: `1.5px solid ${kiosk.color.ink}`,
      }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em" }}>§{n}</span>
        <span style={{ fontFamily: kiosk.font.display, fontSize: 13, fontWeight: 700 }}>{title}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 11, opacity: 0.85 }}>{sub}</span>
      </div>
      <div style={{ padding: 14, minHeight: 240, background: kiosk.color.paper }}>
        {children}
      </div>
    </div>
  );
}

// ─── Mini masthead (used in many state tiles to set the scene) ───
function MiniMasthead({ lang = "DE" }) {
  return (
    <div style={{ padding: "8px 0 6px", borderBottom: `1.5px solid ${kiosk.color.ink}`, textAlign: "center", marginBottom: 10 }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 8, color: kiosk.color.ink, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 2 }}>
        {lang === "DE" ? TODAY.de : TODAY.en} · Nr. {TODAY.issue}
      </div>
      <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 22, lineHeight: 1, color: kiosk.color.ink }}>
        Schillerkiez Kurier
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  STATE 01 — Loading skeleton
// ═══════════════════════════════════════════════════════════════════
function StateLoading({ lang = "DE" }) {
  return (
    <>
      <MiniMasthead lang={lang} />
      {[1,2,3].map((i) => (
        <div key={i} style={{ marginBottom: 12, opacity: 1 - i * 0.18 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <div style={{ width: 40, height: 12, background: kiosk.color.paperSoft, borderRadius: 3 }} />
            <div style={{ width: 70, height: 12, background: kiosk.color.paperSoft, borderRadius: 3 }} />
          </div>
          <div style={{ height: 18, background: kiosk.color.paperSoft, borderRadius: 3, marginBottom: 5, width: "85%" }} />
          <div style={{ height: 18, background: kiosk.color.paperSoft, borderRadius: 3, marginBottom: 8, width: "60%" }} />
          <div style={{ height: 10, background: kiosk.color.paperSoft, borderRadius: 3, marginBottom: 3, width: "95%" }} />
          <div style={{ height: 10, background: kiosk.color.paperSoft, borderRadius: 3, width: "70%" }} />
        </div>
      ))}
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, textAlign: "center", marginTop: 8, letterSpacing: "0.1em" }}>
        ↻ {lang === "DE" ? "kuratiere heutige Auswahl…" : "curating today's selection…"}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  STATE 02 — Empty (no news today — fetch ran, nothing relevant)
// ═══════════════════════════════════════════════════════════════════
function StateEmptyToday({ lang = "DE" }) {
  return (
    <>
      <MiniMasthead lang={lang} />
      <div style={{ textAlign: "center", padding: "32px 16px 12px" }}>
        <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 56, color: kiosk.color.inkMute, lineHeight: 1, marginBottom: 14 }}>—</div>
        <div style={{ fontFamily: kiosk.font.display, fontSize: 15, fontWeight: 700, marginBottom: 6, color: kiosk.color.ink }}>
          {lang === "DE" ? "Heute ist nichts Wichtiges passiert." : "Nothing notable today."}
        </div>
        <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12.5, color: kiosk.color.inkSoft, lineHeight: 1.45, maxWidth: "30ch", margin: "0 auto 14px" }}>
          {lang === "DE"
            ? "Die Kuration hat keine kiez-relevanten Artikel gefunden. Schau morgen wieder vorbei."
            : "Curation found no Kiez-relevant articles. Check back tomorrow."}
        </div>
        <KioskBtn small variant="outline">{lang === "DE" ? "alte Ausgaben durchblättern" : "browse past issues"}</KioskBtn>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  STATE 03 — Empty saved (reading list is empty)
// ═══════════════════════════════════════════════════════════════════
function StateEmptySaved({ lang = "DE" }) {
  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <FilterChip label={lang === "DE" ? "☆ Meine gespeicherten" : "☆ My reading list"} active />
      </div>
      <div style={{ textAlign: "center", padding: "30px 16px 12px" }}>
        <div style={{ fontFamily: kiosk.font.display, fontSize: 56, lineHeight: 1, color: kiosk.color.inkMute, marginBottom: 14 }}>☐</div>
        <div style={{ fontFamily: kiosk.font.display, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          {lang === "DE" ? "Deine Leseliste ist leer." : "Your reading list is empty."}
        </div>
        <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12.5, color: kiosk.color.inkSoft, lineHeight: 1.45, maxWidth: "28ch", margin: "0 auto 14px" }}>
          {lang === "DE"
            ? "Tippe ☐ auf einem Artikel — er landet hier."
            : "Tap ☐ on an article — it'll land here."}
        </div>
        <KioskBtn small variant="outline">{lang === "DE" ? "← zurück zum Feed" : "← back to feed"}</KioskBtn>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  STATE 04 — Error 503 (all sources failed)
// ═══════════════════════════════════════════════════════════════════
function StateError({ lang = "DE" }) {
  return (
    <>
      <MiniMasthead lang={lang} />
      <div style={{
        padding: 16, marginTop: 8,
        border: `1.5px solid ${kiosk.color.danger}`,
        background: kiosk.color.paperSoft,
        borderRadius: kiosk.r.md,
      }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.danger, letterSpacing: "0.12em", marginBottom: 6 }}>
          ⚠ HTTP 503 · {lang === "DE" ? "FETCH FEHLGESCHLAGEN" : "FETCH FAILED"}
        </div>
        <div style={{ fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
          {lang === "DE" ? "News-Quellen vorübergehend nicht erreichbar." : "News sources temporarily unreachable."}
        </div>
        <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12, color: kiosk.color.inkSoft, lineHeight: 1.4, marginBottom: 10 }}>
          {lang === "DE"
            ? "Die nächtliche Kuration konnte nicht durchgeführt werden. Anzeige der letzten erfolgreichen Ausgabe."
            : "Tonight's curation could not run. Showing last successful edition."}
        </div>
        <KioskBtn small>{lang === "DE" ? "letzte Ausgabe (gestern) anzeigen" : "show last edition (yesterday)"}</KioskBtn>
      </div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, marginTop: 12, letterSpacing: "0.06em" }}>
        ↻ {lang === "DE" ? "automatischer Wiederholungsversuch in 14 Min." : "auto-retry in 14 min."}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  STATE 05 — Offline / cached
// ═══════════════════════════════════════════════════════════════════
function StateOffline({ lang = "DE" }) {
  return (
    <>
      <div style={{
        padding: "8px 12px", marginBottom: 12,
        background: kiosk.color.warn + "22",
        border: `1px dashed ${kiosk.color.warn}`,
        borderRadius: kiosk.r.sm,
        fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.ink, letterSpacing: "0.06em",
      }}>
        ⊘ {lang === "DE" ? "Offline · Cache vom" : "Offline · cached from"} 23.05.2026 · 21:14
      </div>
      <MiniMasthead lang={lang} />
      {SEED_ARTICLES.filter((a) => !a.lead).slice(0, 2).map((a) => (
        <div key={a.id} style={{ opacity: 0.78, marginBottom: 12, paddingBottom: 10, borderBottom: `1px dashed ${kiosk.color.rule}` }}>
          <div style={{ fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            {(lang === "DE" ? a.title : a.titleEN).slice(0, 56)}…
          </div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute }}>
            <SourceChip id={a.quelle} mini /> · {lang === "DE" ? a.ts : a.tsEN}
          </div>
        </div>
      ))}
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, textAlign: "center", marginTop: 6 }}>
        {lang === "DE" ? "verbinde dich, um neue Artikel zu laden" : "connect to load new articles"}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  STATE 06 — Degraded: NewsData API down, RSS-only
// ═══════════════════════════════════════════════════════════════════
function StateDegraded({ lang = "DE" }) {
  return (
    <>
      <div style={{
        padding: "8px 12px", marginBottom: 12,
        background: kiosk.color.warn,
        border: kiosk.border.ink,
        borderRadius: kiosk.r.sm,
        fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ink, letterSpacing: "0.06em",
        boxShadow: kiosk.shadow.printSm(),
      }}>
        ⚠ {lang === "DE" ? "RSS-only · NewsData heute nicht erreichbar" : "RSS-only · NewsData unreachable today"}
      </div>
      <MiniMasthead lang={lang} />
      {SEED_ARTICLES.filter((a) => a.quelle !== "newsdata" && !a.lead).slice(0, 2).map((a) => (
        <div key={a.id} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: `1px dashed ${kiosk.color.rule}` }}>
          <div style={{ fontFamily: kiosk.font.display, fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, marginBottom: 3 }}>
            {(lang === "DE" ? a.title : a.titleEN).slice(0, 48)}…
          </div>
          <SourceChip id={a.quelle} mini />
        </div>
      ))}
      <div style={{
        marginTop: 8, padding: "8px 10px",
        background: kiosk.color.paperSoft, border: `1px dashed ${kiosk.color.rule}`,
        fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, lineHeight: 1.5,
      }}>
        {lang === "DE"
          ? "↳ 7 von 9 Quellen verfügbar. Internationale Artikel über NewsData kommen morgen wieder."
          : "↳ 7 of 9 sources available. International articles via NewsData return tomorrow."}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  STATE 07 — Rate-limited (submit quota exhausted)
// ═══════════════════════════════════════════════════════════════════
function StateRateLimited({ lang = "DE" }) {
  return (
    <>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.14em", marginBottom: 14 }}>
        + {lang === "DE" ? "NEWS EINREICHEN" : "SUBMIT NEWS"}
      </div>
      <div style={{
        padding: 16,
        background: kiosk.color.paperSoft,
        border: `1.5px solid ${kiosk.color.warn}`,
        borderRadius: kiosk.r.md,
      }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.warn, letterSpacing: "0.12em", marginBottom: 6 }}>
          ⊘ {lang === "DE" ? "TAGESKONTINGENT ERREICHT" : "DAILY QUOTA REACHED"}
        </div>
        <div style={{ fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
          {lang === "DE" ? "5 / 5 Einreichungen heute genutzt." : "5 / 5 submissions used today."}
        </div>
        <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12, color: kiosk.color.inkSoft, lineHeight: 1.45, marginBottom: 12 }}>
          {lang === "DE"
            ? "Hilft uns, die Nachbarschaft fokussiert zu halten. Morgen kannst du wieder einreichen."
            : "Helps keep the neighborhood focused. You can submit again tomorrow."}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[1,2,3,4,5].map((i) => (
            <div key={i} style={{ flex: 1, height: 8, background: kiosk.color.warn, border: `1px solid ${kiosk.color.ink}`, borderRadius: 2 }} />
          ))}
        </div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, marginTop: 8, letterSpacing: "0.06em", textAlign: "center" }}>
          {lang === "DE" ? "↻ Reset in 6 Std. 41 Min." : "↻ resets in 6h 41m"}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  STATE 08 — Submission pending moderation
// ═══════════════════════════════════════════════════════════════════
function StatePendingMod({ lang = "DE" }) {
  return (
    <>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.14em", marginBottom: 10 }}>
        {lang === "DE" ? "MEINE EINREICHUNGEN" : "MY SUBMISSIONS"}
      </div>
      <div style={{
        padding: 14,
        background: kiosk.color.paperWarm,
        border: `1.5px solid ${kiosk.color.ochre}`,
        borderRadius: kiosk.r.md,
        boxShadow: kiosk.shadow.printSm(kiosk.color.ochre),
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{
            fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 700,
            background: kiosk.color.ochre, color: kiosk.color.ink,
            padding: "2px 7px", borderRadius: 3, letterSpacing: "0.12em",
            border: `1px solid ${kiosk.color.ink}`,
          }}>◐ IN PRÜFUNG</span>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute }}>
            {lang === "DE" ? "eingereicht vor 12 Min." : "submitted 12 min ago"}
          </span>
        </div>
        <div style={{ fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 700, lineHeight: 1.25, marginBottom: 6 }}>
          {lang === "DE"
            ? "Hasenheide-Spielplatz: neue Spielgeräte ab Juni"
            : "Hasenheide playground: new equipment from June"}
        </div>
        <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12.5, color: kiosk.color.inkSoft, marginBottom: 10 }}>
          {lang === "DE" ? "Lokales · von Eda A." : "Local · by Eda A."}
        </div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkSoft, lineHeight: 1.5, letterSpacing: "0.04em" }}>
          {lang === "DE"
            ? "↳ AI-Moderation läuft (Profanität / Hass / Spam). Freigabe i.d.R. < 5 Min."
            : "↳ AI moderation in progress (profanity / hate / spam). Approval usually < 5 min."}
        </div>
      </div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, marginTop: 10, textAlign: "center", letterSpacing: "0.06em" }}>
        {lang === "DE" ? "Tageskontingent: 1 / 5 genutzt" : "Daily quota: 1 / 5 used"}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  STATE 09 — Submission rejected
// ═══════════════════════════════════════════════════════════════════
function StateRejected({ lang = "DE" }) {
  return (
    <>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.14em", marginBottom: 10 }}>
        {lang === "DE" ? "MEINE EINREICHUNGEN" : "MY SUBMISSIONS"}
      </div>
      <div style={{
        padding: 14,
        background: kiosk.color.paperWarm,
        border: `1.5px solid ${kiosk.color.danger}`,
        borderRadius: kiosk.r.md,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{
            fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 700,
            background: kiosk.color.danger, color: kiosk.color.paper,
            padding: "2px 7px", borderRadius: 3, letterSpacing: "0.12em",
            border: `1px solid ${kiosk.color.ink}`,
          }}>✕ {lang === "DE" ? "ABGELEHNT" : "REJECTED"}</span>
        </div>
        <div style={{ fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 700, lineHeight: 1.25, marginBottom: 6 }}>
          {lang === "DE"
            ? "[entfernt] Werbung für privates Yoga-Studio"
            : "[removed] Ad for private yoga studio"}
        </div>
        <div style={{
          padding: "8px 10px", marginBottom: 8,
          background: kiosk.color.paper, border: `1px dashed ${kiosk.color.danger}`,
          borderRadius: kiosk.r.sm,
        }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.danger, letterSpacing: "0.1em", marginBottom: 3 }}>
            {lang === "DE" ? "GRUND" : "REASON"}
          </div>
          <div style={{ fontFamily: kiosk.font.display, fontSize: 12, color: kiosk.color.ink, lineHeight: 1.45 }}>
            {lang === "DE"
              ? "Kommerzielle Werbung. Newsboard ist für nicht-kommerzielle Kiez-Nachrichten."
              : "Commercial promotion. Newsboard is for non-commercial Kiez news."}
          </div>
        </div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkSoft }}>
          {lang === "DE" ? "Kein Strike gegen dein Konto." : "No strike against your account."}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Desktop matrix
// ═══════════════════════════════════════════════════════════════════

function NewsboardStatesDesktop({ lang = "DE" }) {
  return (
    <div style={{ width: 1280, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", padding: "30px 36px 40px" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative" }}>
        {/* Header */}
        <header style={{ marginBottom: 22, paddingBottom: 12, borderBottom: `2px solid ${kiosk.color.ink}` }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.ink, letterSpacing: "0.18em" }}>NEWSBOARD · STATE MATRIX</div>
          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "6px 0 4px" }}>
            {lang === "DE" ? "Neun Zustände" : "Nine states"} <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400 }}>· {lang === "DE" ? "lebenszyklus + fehler" : "lifecycle + errors"}</span>
          </h1>
          <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 16, color: kiosk.color.inkSoft, margin: "4px 0 0", maxWidth: "70ch" }}>
            {lang === "DE"
              ? "Drei Gruppen: Anzeige (01–03), Fetch + Quellen (04–06), Einreichung (07–09)."
              : "Three groups: display (01–03), fetch + sources (04–06), submission (07–09)."}
          </p>
        </header>

        {/* 3x3 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
          <StateTile n="01" title={lang === "DE" ? "Lädt heutige Auswahl" : "Loading today's selection"} sub={lang === "DE" ? "skeleton · 8–14s" : "skeleton · 8–14s"}>
            <StateLoading lang={lang} />
          </StateTile>
          <StateTile n="02" title={lang === "DE" ? "Heute keine News" : "No news today"} sub={lang === "DE" ? "kuration leer" : "curation empty"}>
            <StateEmptyToday lang={lang} />
          </StateTile>
          <StateTile n="03" title={lang === "DE" ? "Leseliste leer" : "Reading list empty"} sub={lang === "DE" ? "filter aktiv" : "filter active"}>
            <StateEmptySaved lang={lang} />
          </StateTile>

          <StateTile n="04" title={lang === "DE" ? "Quellen 503" : "Sources 503"} sub={lang === "DE" ? "fetch failed" : "fetch failed"} color={kiosk.color.danger}>
            <StateError lang={lang} />
          </StateTile>
          <StateTile n="05" title={lang === "DE" ? "Offline · cached" : "Offline · cached"} sub={lang === "DE" ? "letzte ausgabe" : "last edition"} color={kiosk.color.warn}>
            <StateOffline lang={lang} />
          </StateTile>
          <StateTile n="06" title={lang === "DE" ? "RSS-only · degradiert" : "RSS-only · degraded"} sub={lang === "DE" ? "NewsData unreachable" : "NewsData unreachable"} color={kiosk.color.warn}>
            <StateDegraded lang={lang} />
          </StateTile>

          <StateTile n="07" title={lang === "DE" ? "5/5 eingereicht" : "5/5 submitted"} sub={lang === "DE" ? "tageslimit" : "daily limit"} color={kiosk.color.warn}>
            <StateRateLimited lang={lang} />
          </StateTile>
          <StateTile n="08" title={lang === "DE" ? "In Prüfung" : "Under review"} sub={lang === "DE" ? "AI-mod aktiv" : "AI mod running"} color={kiosk.color.ochre}>
            <StatePendingMod lang={lang} />
          </StateTile>
          <StateTile n="09" title={lang === "DE" ? "Abgelehnt · mit Grund" : "Rejected · with reason"} sub={lang === "DE" ? "kein strike" : "no strike"} color={kiosk.color.danger}>
            <StateRejected lang={lang} />
          </StateTile>
        </div>

        {/* Legend */}
        <div style={{ marginTop: 28, paddingTop: 14, borderTop: `1px dashed ${kiosk.color.rule}`, display: "flex", gap: 30, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.06em" }}>
          <span><b style={{ color: kiosk.color.ink }}>01–03</b> {lang === "DE" ? "ANZEIGE" : "DISPLAY"}</span>
          <span><b style={{ color: kiosk.color.danger }}>04–06</b> {lang === "DE" ? "FETCH · QUELLEN" : "FETCH · SOURCES"}</span>
          <span><b style={{ color: kiosk.color.ochre }}>07–09</b> {lang === "DE" ? "EINREICHUNG · MOD" : "SUBMISSION · MOD"}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontStyle: "italic", fontFamily: kiosk.font.serif }}>
            {lang === "DE" ? "Hinweis: Quellen-degradiert (06) ist NICHT ein Fehler — Newsboard funktioniert ohne NewsData." : "Note: source-degraded (06) is NOT an error — newsboard works without NewsData."}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Mobile vertical stack
// ═══════════════════════════════════════════════════════════════════

function NewsboardStatesMobile({ lang = "DE" }) {
  const tiles = [
    { n: "01", title: lang === "DE" ? "Lädt" : "Loading", color: kiosk.color.ink, C: StateLoading },
    { n: "02", title: lang === "DE" ? "Heute leer" : "Empty today", color: kiosk.color.ink, C: StateEmptyToday },
    { n: "03", title: lang === "DE" ? "Leseliste leer" : "List empty", color: kiosk.color.ink, C: StateEmptySaved },
    { n: "04", title: lang === "DE" ? "Quellen 503" : "Sources 503", color: kiosk.color.danger, C: StateError },
    { n: "05", title: lang === "DE" ? "Offline" : "Offline", color: kiosk.color.warn, C: StateOffline },
    { n: "06", title: lang === "DE" ? "RSS-only" : "RSS-only", color: kiosk.color.warn, C: StateDegraded },
    { n: "07", title: lang === "DE" ? "5/5 limit" : "5/5 limit", color: kiosk.color.warn, C: StateRateLimited },
    { n: "08", title: lang === "DE" ? "In Prüfung" : "Pending", color: kiosk.color.ochre, C: StatePendingMod },
    { n: "09", title: lang === "DE" ? "Abgelehnt" : "Rejected", color: kiosk.color.danger, C: StateRejected },
  ];

  return (
    <div style={{ width: 390, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", padding: "20px 14px" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative" }}>
        <header style={{ marginBottom: 18, paddingBottom: 10, borderBottom: `2px solid ${kiosk.color.ink}` }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.ink, letterSpacing: "0.16em" }}>NEWSBOARD · STATES</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1, margin: "4px 0 0" }}>
            {lang === "DE" ? "Mobile · 9 Zustände" : "Mobile · 9 states"}
          </h1>
        </header>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {tiles.map(({ n, title, color, C }) => (
            <StateTile key={n} n={n} title={title} sub="" color={color}>
              <C lang={lang} />
            </StateTile>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  NewsboardStatesDesktop, NewsboardStatesMobile,
});

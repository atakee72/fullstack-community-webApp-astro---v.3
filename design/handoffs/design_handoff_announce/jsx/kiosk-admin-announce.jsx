/* global React */

// ══════════════════════════════════════════════════════════
//  ADMIN · AMTLICHE MITTEILUNGEN (announcements dashboard)
//  Route /admin/announcements — plum admin chrome, teal
//  official strap (matches Forum's Ankündigung ink card).
//  Grounded in CC read: create.ts hardcodes 7d pin, PATCH
//  accepts pinnedUntil|null, single-pinned invariant server-
//  side. Composer + list + mobile stack + 5-state matrix.
// ══════════════════════════════════════════════════════════

const ANN_ACCENT = window.ADM_ACCENT; // plum — shared admin chrome

const ANN_SEED = [
  {
    id: "a1", pinned: true, pinnedUntil: { DE: "Mi 22. Jul", EN: "Wed Jul 22" },
    title: { DE: "Wasserabstellung Herrfurthstraße · Do 17. Juli, 8–14 Uhr", EN: "Water shut-off Herrfurthstraße · Thu Jul 17, 8 am–2 pm" },
    body: { DE: "Die Berliner Wasserbetriebe erneuern den Hauptanschluss zwischen Nr. 12 und 28. Bitte Wasservorrat für den Vormittag einplanen. Notfallnummer hängt im Hausflur.", EN: "Berliner Wasserbetriebe are replacing the main connection between no. 12 and 28. Please plan a water reserve for the morning. Emergency number is posted in the hallway." },
    created: { DE: "Di 15. Jul · 08:10", EN: "Tue Jul 15 · 08:10" }, edited: 0,
  },
  {
    id: "a2", pinned: false, expiredOn: { DE: "So 6. Jul", EN: "Sun Jul 6" },
    title: { DE: "Sommerfest Herrfurthplatz — Standanmeldung offen", EN: "Herrfurthplatz summer fest — stall sign-up open" },
    body: { DE: "Bis 20. Juli können Nachbar:innen Stände anmelden (Flohmarkt, Essen, Info). Formular im Forum-Thread, Rückfragen ans Team.", EN: "Neighbours can register stalls until July 20 (flea market, food, info). Form in the forum thread, questions to the team." },
    created: { DE: "So 29. Jun · 17:40", EN: "Sun Jun 29 · 17:40" }, edited: 1,
  },
  {
    id: "a3", pinned: false, expiredOn: { DE: "Fr 13. Jun", EN: "Fri Jun 13" },
    title: { DE: "Neue Moderationsregeln in Kraft", EN: "New moderation rules in effect" },
    body: { DE: "Ab sofort gilt das 3-Verwarnungen-Prinzip. Details und Begründung stehen im angehängten Forum-Beitrag.", EN: "The 3-strike principle applies from now on. Details and rationale are in the linked forum post." },
    created: { DE: "Fr 6. Jun · 09:02", EN: "Fri Jun 6 · 09:02" }, edited: 0,
  },
];

// —— tiny atoms ——
function AnnPinChip({ lang = "DE", until }) {
  const k = window.kiosk;
  return (
    <span style={{ fontFamily: k.font.mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", background: k.color.ochre, color: k.color.ink, padding: "3px 9px", borderRadius: k.r.sm, border: `1px solid ${k.color.ink}` }}>
      📌 {lang === "DE" ? "ANGEPINNT BIS" : "PINNED UNTIL"} {until[lang].toUpperCase()}
    </span>
  );
}
function AnnExpiredChip({ lang = "DE", on }) {
  const k = window.kiosk;
  return (
    <span style={{ fontFamily: k.font.mono, fontSize: 10, letterSpacing: "0.06em", color: k.color.inkMute, padding: "3px 9px", borderRadius: k.r.sm, border: `1px dashed ${k.color.rule}` }}>
      {lang === "DE" ? "PIN ABGELAUFEN AM" : "PIN EXPIRED"} {on[lang].toUpperCase()}
    </span>
  );
}
function AnnGhostBtn({ children, tone, small }) {
  const k = window.kiosk;
  const c = tone === "danger" ? k.color.danger : tone === "accent" ? ANN_ACCENT : k.color.ink;
  return (
    <button style={{ background: "transparent", color: c, border: `1.5px solid ${c}`, borderRadius: k.r.pill, padding: small ? "6px 13px" : "8px 16px", fontFamily: k.font.display, fontSize: small ? 12 : 13, fontWeight: 700, cursor: "pointer" }}>{children}</button>
  );
}

// —— masthead — moderation chrome, amtliches wordmark ——
function AnnMasthead({ lang = "DE" }) {
  const k = window.kiosk;
  return (
    <div>
      <div style={{ background: ANN_ACCENT, color: k.color.paper, padding: "6px 36px", fontFamily: k.font.mono, fontSize: 10, letterSpacing: "0.14em", display: "flex", justifyContent: "space-between" }}>
        <span>{lang === "DE" ? "INTERNER BEREICH — NUR FÜR ADMINS SICHTBAR" : "INTERNAL AREA — VISIBLE TO ADMINS ONLY"}</span>
        <span>requireAdminSession()</span>
      </div>
      <header style={{ padding: "18px 36px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px dashed ${k.color.rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: ANN_ACCENT, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: k.color.paper, fontFamily: k.font.serif, fontStyle: "italic", fontSize: 26, border: k.border.ink }}>m</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>mahalle <span style={{ fontFamily: k.font.serif, fontStyle: "italic", fontWeight: 400, color: ANN_ACCENT }}>{lang === "DE" ? "amtliches" : "officials"}</span></div>
            <div style={{ fontFamily: k.font.mono, fontSize: 9, color: k.color.inkMute, letterSpacing: "0.1em", marginTop: 2 }}>SCHILLERKIEZ · NEUKÖLLN · ADMIN</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontFamily: k.font.mono, fontSize: 11, color: k.color.inkMute }}>{lang === "DE" ? "← zur Moderation" : "← to moderation"}</span>
          <div style={{ display: "flex", border: k.border.ink, borderRadius: k.r.pill, overflow: "hidden", fontFamily: k.font.mono, fontSize: 11, fontWeight: 600 }}>
            <span style={{ padding: "5px 10px", background: lang === "DE" ? k.color.ink : "transparent", color: lang === "DE" ? k.color.paper : k.color.ink }}>DE</span>
            <span style={{ padding: "5px 10px", background: lang === "EN" ? k.color.ink : "transparent", color: lang === "EN" ? k.color.paper : k.color.ink, borderLeft: k.border.ink }}>EN</span>
          </div>
          <window.KioskAvatar initials="EA" color={ANN_ACCENT} online />
        </div>
      </header>
    </div>
  );
}

// —— composer card ——
function AnnComposer({ lang = "DE", compact }) {
  const k = window.kiosk;
  const field = { background: k.color.paperSoft, border: k.border.ink, borderRadius: k.r.sm, padding: "10px 12px", fontFamily: k.font.display, fontSize: 14, color: k.color.inkMute };
  return (
    <div style={{ background: k.color.paperWarm, border: k.border.ink, borderTop: `4px solid ${ANN_ACCENT}`, borderRadius: k.r.lg, boxShadow: k.shadow.print(ANN_ACCENT), padding: compact ? "16px 16px 14px" : "20px 22px 18px" }}>
      <div style={{ fontFamily: k.font.mono, fontSize: 10, color: ANN_ACCENT, letterSpacing: "0.12em", marginBottom: 10 }}>{lang === "DE" ? "NEUE AMTLICHE MITTEILUNG" : "NEW OFFICIAL ANNOUNCEMENT"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>{lang === "DE" ? "Titel" : "Title"} <span style={{ fontFamily: k.font.mono, fontSize: 10, fontWeight: 400, color: k.color.inkMute }}>· max 120</span></div>
          <div style={field}>{lang === "DE" ? "Worum geht es?" : "What is it about?"}</div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>{lang === "DE" ? "Mitteilung" : "Message"}</div>
          <div style={{ ...field, minHeight: 84, lineHeight: 1.5 }}>{lang === "DE" ? "Sachlich, kurz, mit Datum und Ort. Erscheint mit „Mahalle-Team“-Marke im Forum." : "Factual, short, with date and place. Appears in the forum with the “Mahalle team” badge."}</div>
        </div>
      </div>
      <div style={{ marginTop: 12, padding: "9px 12px", background: `${k.color.teal}18`, border: `1.5px solid ${k.color.teal}`, borderRadius: k.r.sm, fontFamily: k.font.mono, fontSize: 10.5, lineHeight: 1.55, color: k.color.inkSoft }}>
        ⏱ {lang === "DE" ? "Wird 7 Tage oben angepinnt — serverseitig fest. " : "Pinned on top for 7 days — fixed server-side. "}
        <b style={{ color: k.color.ink }}>{lang === "DE" ? "Ersetzt die aktuelle Anheftung („Wasserabstellung…“)." : "Replaces the current pin (“Water shut-off…”)."}</b>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button style={{ background: k.color.ink, color: k.color.paper, border: k.border.ink, borderRadius: k.r.pill, padding: "10px 20px", fontFamily: k.font.display, fontSize: 14, fontWeight: 700, boxShadow: k.shadow.printSm(k.color.teal), cursor: "pointer" }}>
          📌 {lang === "DE" ? "anschlagen & anpinnen" : "post & pin"}
        </button>
        <span style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute }}>POST /api/admin/announcements</span>
      </div>
    </div>
  );
}

// —— announcement card (ink treatment when pinned, paper in archive) ——
function AnnCard({ item, lang = "DE", compact }) {
  const k = window.kiosk;
  const pinned = item.pinned;
  const fg = pinned ? k.color.paper : k.color.ink;
  const fgSoft = pinned ? "rgba(243,234,216,0.72)" : k.color.inkSoft;
  const fgMute = pinned ? "rgba(243,234,216,0.5)" : k.color.inkMute;
  const dash = pinned ? "rgba(243,234,216,0.25)" : k.color.rule;
  return (
    <article style={{ background: pinned ? k.color.ink : k.color.paper, color: fg, border: pinned ? k.border.inkBold : k.border.ink, borderRadius: k.r.lg, overflow: "hidden", boxShadow: pinned ? k.shadow.print(k.color.teal) : k.shadow.printSm(), opacity: pinned ? 1 : 0.92 }}>
      {pinned ? (
        <div style={{ background: k.color.teal, color: k.color.paper, padding: "5px 16px", fontFamily: k.font.mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{lang === "DE" ? "OFFIZIELLE ANKÜNDIGUNG · MAHALLE-TEAM" : "OFFICIAL ANNOUNCEMENT · MAHALLE TEAM"}</span>
          <span>{lang === "DE" ? "AM BRETT" : "ON THE BOARD"}</span>
        </div>
      ) : null}
      <div style={{ padding: compact ? "13px 15px 11px" : "15px 18px 12px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          {pinned ? <AnnPinChip lang={lang} until={item.pinnedUntil} /> : <AnnExpiredChip lang={lang} on={item.expiredOn} />}
          <span style={{ fontFamily: k.font.mono, fontSize: 10, color: fgMute, marginLeft: "auto" }}>{item.created[lang]}{item.edited ? ` · ${lang === "DE" ? `${item.edited}× bearbeitet` : `edited ${item.edited}×`}` : ""}</span>
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: compact ? 16 : 19, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.25 }}>{item.title[lang]}</h3>
        <p style={{ margin: 0, fontSize: compact ? 12.5 : 13.5, lineHeight: 1.55, color: fgSoft }}>{item.body[lang]}</p>
      </div>
      <div style={{ padding: compact ? "10px 15px" : "11px 18px", borderTop: `1px dashed ${dash}`, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {pinned ? (
          <React.Fragment>
            <AnnGhostBtn small>{lang === "DE" ? "✎ bearbeiten" : "✎ edit"}</AnnGhostBtn>
            <button style={{ background: "transparent", color: k.color.paper, border: "1.5px solid rgba(243,234,216,0.5)", borderRadius: k.r.pill, padding: "6px 13px", fontFamily: k.font.display, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{lang === "DE" ? "⤓ lösen (unpin)" : "⤓ unpin"}</button>
            <span style={{ fontFamily: k.font.mono, fontSize: 10, color: fgMute, marginLeft: "auto" }}>PATCH pinnedUntil: null</span>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <AnnGhostBtn small tone="accent">⤒ {lang === "DE" ? "erneut anpinnen (7 Tage)" : "re-pin (7 days)"}</AnnGhostBtn>
            <AnnGhostBtn small>{lang === "DE" ? "✎ bearbeiten" : "✎ edit"}</AnnGhostBtn>
            <AnnGhostBtn small tone="danger">{lang === "DE" ? "✕ löschen…" : "✕ delete…"}</AnnGhostBtn>
            <span style={{ fontFamily: k.font.mono, fontSize: 10, color: fgMute, marginLeft: "auto" }}>{lang === "DE" ? "anpinnen löst die aktuelle Anheftung" : "re-pin displaces the current pin"}</span>
          </React.Fragment>
        )}
      </div>
    </article>
  );
}

const annPinBtnStyle = null; // (reserved)

// ─────────────────────────────────────────────────────────
//  Desktop — composer left, board + archive right
// ─────────────────────────────────────────────────────────
function AdminAnnounceDesktop({ lang = "DE" }) {
  const k = window.kiosk;
  return (
    <div style={{ width: 1280, minHeight: 1240, background: k.color.paper, color: k.color.ink, fontFamily: k.font.display, position: "relative", overflow: "hidden" }}>
      <style>{window.kioskFonts}</style>
      <div style={window.paperGrainStyle}></div>
      <AnnMasthead lang={lang} />
      <section style={{ padding: "22px 36px 0" }}>
        <div style={{ fontFamily: k.font.mono, fontSize: 11, color: ANN_ACCENT, letterSpacing: "0.12em" }}>
          {lang === "DE" ? "AMTLICHE MITTEILUNGEN · DIENSTAG 15. JULI · 09:15" : "OFFICIAL ANNOUNCEMENTS · TUESDAY JULY 15 · 09:15"}
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "6px 0 0" }}>
          {lang === "DE"
            ? <>Was hängt am <span style={{ fontFamily: k.font.serif, fontStyle: "italic", fontWeight: 400, color: ANN_ACCENT }}>Brett</span>?</>
            : <>What&rsquo;s on the <span style={{ fontFamily: k.font.serif, fontStyle: "italic", fontWeight: 400, color: ANN_ACCENT }}>board</span>?</>}
        </h1>
        <div style={{ fontFamily: k.font.mono, fontSize: 11, color: k.color.inkMute, marginTop: 10, borderBottom: `1px dashed ${k.color.rule}`, paddingBottom: 14 }}>
          {lang === "DE" ? "3 Mitteilungen · 1 angepinnt — es kann immer nur eine am Brett hängen." : "3 announcements · 1 pinned — only one can ever hang on the board."}
        </div>
      </section>
      <section style={{ padding: "22px 36px 32px", display: "grid", gridTemplateColumns: "460px 1fr", gap: 24, alignItems: "start", position: "relative" }}>
        <div style={{ position: "relative" }}>
          <AnnComposer lang={lang} />
          <window.KioskAnnotate top={-14} left={-10} rotate={-2}>
            {lang === "DE"
              ? "create.ts pinnt hart 7 Tage — client-gesendetes isOfficial/pinnedUntil wird verworfen. Kein Dauer-Wähler."
              : "create.ts hard-pins 7 days — client-sent isOfficial/pinnedUntil is dropped. No duration picker."}
          </window.KioskAnnotate>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>
          <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, letterSpacing: "0.12em" }}>{lang === "DE" ? "AM BRETT — ANGEPINNT" : "ON THE BOARD — PINNED"}</div>
          <AnnCard item={ANN_SEED[0]} lang={lang} />
          <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, letterSpacing: "0.12em", marginTop: 10 }}>{lang === "DE" ? "ARCHIV — NICHT MEHR ANGEPINNT" : "ARCHIVE — NO LONGER PINNED"}</div>
          <AnnCard item={ANN_SEED[1]} lang={lang} />
          <AnnCard item={ANN_SEED[2]} lang={lang} />
          <window.KioskAnnotate bottom={-18} right={-8} rotate={1.5}>
            {lang === "DE"
              ? "Nur EIN 📌 existiert je im UI. Anpinnen von Karte B demontiert Karte A sichtbar (Chip wandert). Server erzwingt die Invariante — das UI macht sie lesbar."
              : "Only ONE 📌 ever exists in the UI. Pinning card B visibly demotes card A (the chip moves). Server enforces the invariant — the UI makes it legible."}
          </window.KioskAnnotate>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Mobile — simple stack, cards over table
// ─────────────────────────────────────────────────────────
function AdminAnnounceMobile({ lang = "DE" }) {
  const k = window.kiosk;
  return (
    <div style={{ width: 390, minHeight: 1330, background: k.color.paper, color: k.color.ink, fontFamily: k.font.display, position: "relative", overflow: "hidden" }}>
      <style>{window.kioskFonts}</style>
      <div style={window.paperGrainStyle}></div>
      <div style={{ background: ANN_ACCENT, color: k.color.paper, padding: "6px 18px", fontFamily: k.font.mono, fontSize: 9, letterSpacing: "0.12em" }}>{lang === "DE" ? "INTERN · NUR ADMIN" : "INTERNAL · ADMIN ONLY"}</div>
      <header style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px dashed ${k.color.rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 32, height: 32, background: ANN_ACCENT, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: k.color.paper, fontFamily: k.font.serif, fontStyle: "italic", fontSize: 19, border: k.border.ink }}>m</div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>{lang === "DE" ? "amtliches" : "officials"}</div>
        </div>
        <span style={{ fontFamily: k.font.mono, fontSize: 10.5, color: k.color.inkMute }}>3 · 1 📌</span>
      </header>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <button style={{ minHeight: 48, background: k.color.ink, color: k.color.paper, border: k.border.ink, borderRadius: k.r.pill, fontFamily: k.font.display, fontSize: 14.5, fontWeight: 700, boxShadow: k.shadow.printSm(k.color.teal), cursor: "pointer" }}>
          📌 {lang === "DE" ? "neue Mitteilung anschlagen" : "post a new announcement"}
        </button>
        <div style={{ fontFamily: k.font.mono, fontSize: 9.5, color: k.color.inkMute, textAlign: "center", marginTop: -6 }}>{lang === "DE" ? "wird 7 Tage angepinnt · ersetzt die aktuelle Anheftung" : "pinned for 7 days · replaces the current pin"}</div>
        <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, letterSpacing: "0.1em" }}>{lang === "DE" ? "AM BRETT" : "ON THE BOARD"}</div>
        <AnnCard item={ANN_SEED[0]} lang={lang} compact />
        <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, letterSpacing: "0.1em", marginTop: 6 }}>{lang === "DE" ? "ARCHIV" : "ARCHIVE"}</div>
        <AnnCard item={ANN_SEED[1]} lang={lang} compact />
        <AnnCard item={ANN_SEED[2]} lang={lang} compact />
        <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, textAlign: "center", paddingTop: 4 }}>
          {lang === "DE" ? "Leichter als Moderation: Karten statt Tabelle, Aktionen ≥ 44 px." : "Lighter than moderation: cards over table, actions ≥ 44 px."}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  States — 5 tiles
// ─────────────────────────────────────────────────────────
function AnnStateTile({ n, t, children, note }) {
  const k = window.kiosk;
  return (
    <div style={{ background: k.color.paperWarm, border: k.border.ink, borderRadius: k.r.lg, boxShadow: k.shadow.printSm(), overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px dashed ${k.color.rule}`, display: "flex", gap: 10, alignItems: "baseline" }}>
        <span style={{ fontFamily: k.font.mono, fontSize: 10, fontWeight: 600, color: ANN_ACCENT }}>{n}</span>
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{t}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
      {note ? <div style={{ padding: "8px 16px 12px", fontFamily: k.font.mono, fontSize: 10, lineHeight: 1.5, color: k.color.inkMute }}>{note}</div> : null}
    </div>
  );
}

function AdminAnnounceStates({ lang = "DE" }) {
  const k = window.kiosk;
  const skel = (w, h = 12) => <div style={{ width: w, height: h, borderRadius: 4, background: `linear-gradient(90deg, ${k.color.paperSoft} 25%, #e2d6b8 50%, ${k.color.paperSoft} 75%)`, backgroundSize: "200% 100%", animation: "annSweep 1.4s linear infinite" }}></div>;
  return (
    <div style={{ width: 1280, minHeight: 1120, background: k.color.paper, color: k.color.ink, fontFamily: k.font.display, position: "relative", overflow: "hidden", padding: "28px 36px 36px", boxSizing: "border-box" }}>
      <style>{window.kioskFonts}</style>
      <style>{`@keyframes annSweep { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } @keyframes annPending { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      <div style={window.paperGrainStyle}></div>
      <div style={{ fontFamily: k.font.mono, fontSize: 11, color: ANN_ACCENT, letterSpacing: "0.12em" }}>AMTLICHE MITTEILUNGEN · ZUSTANDSMATRIX</div>
      <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 20px" }}>5 Zustände — <span style={{ fontFamily: k.font.serif, fontStyle: "italic", fontWeight: 400, color: ANN_ACCENT }}>ehrlich & optimistisch</span></h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, position: "relative" }}>
        <AnnStateTile n="01" t="laden" note="Skelett spiegelt die echte Anatomie: Composer-Block + 1 Brett-Karte + Archivzeilen. annSweep 1.4s.">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {skel("55%", 16)}{skel("100%", 60)}{skel("80%")}{skel("90%")}{skel("70%")}
          </div>
        </AnnStateTile>
        <AnnStateTile n="02" t="leer" note="Kein Fake-Inhalt. Der leere Zustand erklärt das Brett und zeigt auf den Composer.">
          <div style={{ textAlign: "center", padding: "18px 10px" }}>
            <div style={{ fontFamily: k.font.serif, fontStyle: "italic", fontSize: 19, color: k.color.inkSoft }}>Das Brett ist leer.</div>
            <div style={{ fontSize: 12.5, color: k.color.inkMute, marginTop: 6, lineHeight: 1.5 }}>Noch keine amtliche Mitteilung. Die erste wird automatisch 7 Tage angepinnt.</div>
            <div style={{ marginTop: 12 }}><AnnGhostBtn small tone="accent">📌 erste Mitteilung anschlagen</AnnGhostBtn></div>
          </div>
        </AnnStateTile>
        <AnnStateTile n="03" t="speichert · Verdrängung" note="Optimistisch: neue Karte erscheint sofort mit Puls-Chip; die verdrängte Karte rutscht sichtbar ins Archiv. Toast benennt die Ablösung.">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ border: k.border.ink, borderRadius: k.r.md, padding: "10px 12px", background: k.color.ink, color: k.color.paper }}>
              <span style={{ fontFamily: k.font.mono, fontSize: 9.5, background: k.color.ochre, color: k.color.ink, padding: "2px 7px", borderRadius: 4, border: `1px solid ${k.color.ink}`, animation: "annPending 1.2s ease-in-out infinite" }}>📌 WIRD ANGEPINNT…</span>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 7 }}>Herbstputz am Platz · Sa 26. Juli</div>
            </div>
            <div style={{ border: `1px dashed ${k.color.rule}`, borderRadius: k.r.md, padding: "8px 12px", fontSize: 12, color: k.color.inkMute }}>↓ „Wasserabstellung…“ wandert ins Archiv</div>
            <div style={{ alignSelf: "flex-start", fontFamily: k.font.mono, fontSize: 10, background: k.color.paper, border: k.border.ink, borderRadius: k.r.sm, padding: "5px 10px", boxShadow: k.shadow.printSm() }}>✓ angeschlagen · ersetzt: „Wasserabstellung…“ · <u>rückgängig</u></div>
          </div>
        </AnnStateTile>
        <AnnStateTile n="04" t="Fehler" note="Eingaben bleiben erhalten. Karte fällt auf den Vorzustand zurück (kein Geister-Pin).">
          <div style={{ border: `1.5px solid ${k.color.danger}`, borderRadius: k.r.md, padding: "12px 14px", background: `${k.color.danger}0d` }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: k.color.danger }}>Die Mitteilung ließ sich nicht anschlagen.</div>
            <div style={{ fontSize: 12, color: k.color.inkSoft, marginTop: 4, lineHeight: 1.5 }}>Titel und Text sind noch da — nichts verloren.</div>
            <div style={{ marginTop: 10 }}><AnnGhostBtn small>⟳ erneut versuchen</AnnGhostBtn></div>
          </div>
        </AnnStateTile>
        <AnnStateTile n="05" t="löschen bestätigen" note="Kiosk-Modal statt prompt(). Löschen entfernt auch die Forum-Sichtbarkeit — das steht dabei.">
          <div style={{ border: k.border.inkBold, borderRadius: k.r.md, padding: "14px 16px", background: k.color.paper, boxShadow: k.shadow.print(k.color.danger) }}>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>Mitteilung löschen?</div>
            <div style={{ fontSize: 12, color: k.color.inkSoft, marginTop: 5, lineHeight: 1.5 }}>„Sommerfest Herrfurthplatz…“ verschwindet vom Brett <b>und aus dem Forum</b>. Das lässt sich nicht rückgängig machen.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={{ background: k.color.danger, color: k.color.paper, border: k.border.ink, borderRadius: k.r.pill, padding: "7px 14px", fontFamily: k.font.display, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>✕ endgültig löschen</button>
              <AnnGhostBtn small>abbrechen</AnnGhostBtn>
            </div>
          </div>
        </AnnStateTile>
        <div style={{ position: "relative" }}>
          <window.KioskAnnotate top={10} left={4} rotate={-1.5}>
            CC-Notiz: Backend fertig (CRUD + requireAdminSession + Server-Pin). Nur AdminAnnouncementsPanel.svelte ersetzen, BaseLayout → AdminLayout. Re-Pin = PATCH pinnedUntil: now+7d.
          </window.KioskAnnotate>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ANN_SEED, AnnPinChip, AnnExpiredChip, AnnMasthead, AnnComposer, AnnCard, AdminAnnounceDesktop, AdminAnnounceMobile, AdminAnnounceStates });

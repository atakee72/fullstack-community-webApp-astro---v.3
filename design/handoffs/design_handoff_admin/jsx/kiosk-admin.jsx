/* global React */

// ══════════════════════════════════════════════════════════
//  ADMIN MODERATION · Editorial Kiosk
//  Carved accent: PLUM (#6f2f59) — the judicial back-office.
//  Wine=Forum/Markt, Teal=Kalender, Ink=News, Ochre=Auth.
//  This file: tokens + seeds + masthead + stat row + queue
//  cards + queue index (desktop DE/EN) + mobile triage.
//  Grounded in ModerationQueue.svelte + moderation.schema.ts.
// ══════════════════════════════════════════════════════════

const ADM_ACCENT = window.kiosk.color.plum;

// —— Category taxonomy → severity color + DE/EN label ——
// Maps the real flaggedCategories keys from the codebase.
const ADM_CATS = {
  "hate":                     { sev: "critical", DE: "Hassrede",        EN: "Hate speech" },
  "hate/threatening":         { sev: "critical", DE: "Hass-Drohung",    EN: "Hate threat" },
  "violence":                 { sev: "critical", DE: "Gewalt",          EN: "Violence" },
  "harassment":               { sev: "high",     DE: "Belästigung",     EN: "Harassment" },
  "harassment/threatening":   { sev: "critical", DE: "Drohung",         EN: "Threat" },
  "turkish_profanity":        { sev: "high",     DE: "Beleidigung",     EN: "Profanity" },
  "spam_check:spam":          { sev: "mid",      DE: "Spam",            EN: "Spam" },
  "spam_check:ad_promotional":{ sev: "mid",      DE: "Werbung",         EN: "Ad / promo" },
  "spam_check:scam":          { sev: "high",     DE: "Betrugsverdacht", EN: "Scam" },
  "image_safety:other_violation": { sev: "mid",  DE: "Bild-Verstoß",    EN: "Image violation" },
  "relevance":                { sev: "info",     DE: "Relevanz",        EN: "Relevance" },
};
const ADM_SEV_COLOR = {
  critical: window.kiosk.color.danger,
  high:     "#a05a28",
  mid:      window.kiosk.color.warn,
  info:     window.kiosk.color.info,
};

// —— Report reasons (user_report source) ——
const ADM_REPORT_REASONS = {
  spam:           { DE: "Spam / Werbung",     EN: "Spam / advertising" },
  harassment:     { DE: "Belästigung",        EN: "Harassment" },
  misinformation: { DE: "Falschinformation",  EN: "Misinformation" },
  inappropriate:  { DE: "Unangemessen",       EN: "Inappropriate" },
  other:          { DE: "Sonstiges",          EN: "Other" },
};

// —— Content types ——
const ADM_TYPES = {
  topic:          { DE: "Diskussion",   EN: "Discussion" },
  comment:        { DE: "Kommentar",    EN: "Comment" },
  announcement:   { DE: "Ankündigung",  EN: "Announcement" },
  recommendation: { DE: "Empfehlung",   EN: "Recommendation" },
  event:          { DE: "Termin",       EN: "Event" },
  news:           { DE: "News",         EN: "News" },
  marketplace:    { DE: "Markt",        EN: "Market" },
};

// —— Seed queue (pending items, sorted newest first) ——
const ADM_SEED = [
  {
    id: "F01", source: "ai", type: "topic", urgent: true,
    title: "2-Zi-Wohnung Weisestraße — „keine Ausländer als Nachmieter“",
    body: "Vermiete ab August, 680 € warm. Bitte nur Bewerbungen von Deutschen, ich will keine Probleme…",
    author: { name: "anonym_kiez22", initials: "AK", strikes: 0 },
    cats: [ { k: "hate", score: 0.91 } ],
    time: "heute · 08:12",
  },
  {
    id: "F02", source: "report", type: "marketplace", reportCount: 3,
    title: "E-Bike Cube, neuwertig — 250 €",
    body: "Fast neu, Rechnung verloren. Nur schnelle Abwicklung, Anzahlung per PayPal Freunde…",
    author: { name: "R. Novak", initials: "RN", strikes: 0 },
    reportReason: "spam",
    reportDetails: "Preis viel zu niedrig, will Anzahlung vorab — klassischer Betrug, gleiche Anzeige war letzte Woche schon mal da.",
    reporter: "L. Kaya",
    time: "heute · 07:40",
  },
  {
    id: "F03", source: "ai", type: "topic",
    title: "Schnell Geld verdienen im Kiez 🚀 finanzielle Freiheit",
    body: "Hallo Nachbarn! Ich habe mit einer Methode 3.000 € im Monat nebenbei verdient. Schreibt mir bei Telegram…",
    author: { name: "Klaus W.", initials: "KW", strikes: 2 },
    cats: [ { k: "spam_check:spam", score: 0.97 }, { k: "spam_check:scam", score: 0.88 } ],
    time: "gestern · 22:03",
  },
  {
    id: "F04", source: "ai", type: "comment",
    title: null,
    body: "Du hast doch echt keine Ahnung von diesem Kiez, zieh doch zurück nach Schwaben, solche wie dich braucht hier keiner.",
    context: "Kommentar zu: „Späti-Sterben in der Okerstraße“",
    author: { name: "M. Berger", initials: "MB", strikes: 1 },
    cats: [ { k: "harassment", score: 0.71 } ],
    time: "gestern · 19:27",
  },
  {
    id: "F05", source: "news", type: "news",
    title: "Tempelhofer Feld: Senat legt neuen Randbebauungs-Entwurf vor",
    body: "Eingereichter Artikel (Tagesspiegel). KI-Zusammenfassung erstellt, wartet auf Freigabe für den Kurier.",
    author: { name: "E. Aydın", initials: "EA", strikes: 0 },
    relevance: 84,
    time: "gestern · 18:55",
  },
];

// ─────────────────────────────────────────────────────────
//  Atoms
// ─────────────────────────────────────────────────────────

function AdmCheckbox({ checked }) {
  const k = window.kiosk;
  return (
    <span style={{
      width: 18, height: 18, flex: "0 0 18px", borderRadius: 4,
      border: k.border.ink, display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: checked ? ADM_ACCENT : "transparent",
      color: k.color.paper, fontSize: 12, fontWeight: 700, lineHeight: 1,
    }}>{checked ? "✓" : ""}</span>
  );
}

function AdmSourceStrap({ item, lang = "DE" }) {
  const k = window.kiosk;
  let bg = ADM_ACCENT, label = lang === "DE" ? "KI-GEPRÜFT" : "AI-FLAGGED", pulse = false;
  if (item.urgent) { bg = k.color.danger; label = lang === "DE" ? "DRINGEND" : "URGENT"; pulse = true; }
  else if (item.source === "report") { bg = k.color.ochre, label = (lang === "DE" ? "⚑ GEMELDET" : "⚑ REPORTED") + (item.reportCount > 1 ? ` ×${item.reportCount}` : ""); }
  else if (item.source === "news") { bg = k.color.moss; label = lang === "DE" ? "EINGEREICHT" : "SUBMITTED"; }
  return (
    <span style={{
      fontFamily: k.font.mono, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em",
      background: bg, color: item.source === "report" ? k.color.ink : k.color.paper,
      padding: "3px 9px", borderRadius: k.r.sm, border: `1px solid ${k.color.ink}`,
      animation: pulse ? "admPulse 1.6s ease-in-out infinite" : "none",
    }}>{label}</span>
  );
}

function AdmTypeChip({ type, lang = "DE" }) {
  const k = window.kiosk;
  return (
    <span style={{
      fontFamily: k.font.mono, fontSize: 10, letterSpacing: "0.06em",
      color: k.color.inkSoft, background: k.color.paperSoft,
      padding: "3px 9px", borderRadius: k.r.sm, border: `1px solid ${k.color.rule}`,
    }}>{ADM_TYPES[type][lang].toUpperCase()}</span>
  );
}

function AdmCatChip({ k: key, score, lang = "DE" }) {
  const k = window.kiosk;
  const cat = ADM_CATS[key] || { sev: "mid", DE: key, EN: key };
  const c = ADM_SEV_COLOR[cat.sev];
  return (
    <span style={{
      display: "inline-flex", alignItems: "baseline", gap: 6,
      fontFamily: k.font.mono, fontSize: 10.5, fontWeight: 500,
      color: c, background: k.color.paperWarm,
      padding: "3px 9px", borderRadius: k.r.sm, border: `1px solid ${c}66`,
    }}>
      <span>{cat[lang]}</span>
      <b style={{ fontSize: 11 }}>{Math.round(score * 100)}%</b>
    </span>
  );
}

// Strike dots ●●○ — used on cards + ledger
function AdmStrikeDots({ n, size = 8 }) {
  const k = window.kiosk;
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: size, height: size, borderRadius: "50%",
          background: i < n ? k.color.danger : "transparent",
          border: `1.5px solid ${i < n ? k.color.danger : k.color.rule}`,
        }}></span>
      ))}
    </span>
  );
}

function AdmActionBtn({ children, variant = "outline", small }) {
  const k = window.kiosk;
  const map = {
    approve: { bg: "transparent", fg: k.color.success, b: k.color.success, sh: "none" },
    warn:    { bg: "transparent", fg: k.color.warn,    b: k.color.warn,    sh: "none" },
    danger:  { bg: k.color.danger, fg: k.color.paper,  b: k.color.ink,     sh: k.shadow.printSm() },
    outline: { bg: "transparent", fg: k.color.ink,     b: k.color.ink,     sh: "none" },
  };
  const s = map[variant];
  return (
    <button style={{
      background: s.bg, color: s.fg, border: `1.5px solid ${s.b}`,
      borderRadius: k.r.pill, padding: small ? "6px 13px" : "8px 16px",
      fontFamily: k.font.display, fontSize: small ? 12 : 13, fontWeight: 700,
      boxShadow: s.sh, cursor: "pointer",
    }}>{children}</button>
  );
}

// ─────────────────────────────────────────────────────────
//  Masthead — internal ribbon, no public nav
// ─────────────────────────────────────────────────────────
function AdmMasthead({ lang = "DE" }) {
  const k = window.kiosk;
  return (
    <div>
      <div style={{
        background: ADM_ACCENT, color: k.color.paper, padding: "6px 36px",
        fontFamily: k.font.mono, fontSize: 10, letterSpacing: "0.14em",
        display: "flex", justifyContent: "space-between",
      }}>
        <span>{lang === "DE" ? "INTERNER BEREICH — NUR FÜR ADMINS SICHTBAR" : "INTERNAL AREA — VISIBLE TO ADMINS ONLY"}</span>
        <span>user.role === "admin"</span>
      </div>
      <header style={{ padding: "18px 36px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px dashed ${k.color.rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: ADM_ACCENT, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: k.color.paper, fontFamily: k.font.serif, fontStyle: "italic", fontSize: 26, border: k.border.ink }}>m</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>mahalle <span style={{ fontFamily: k.font.serif, fontStyle: "italic", fontWeight: 400, color: ADM_ACCENT }}>moderation</span></div>
            <div style={{ fontFamily: k.font.mono, fontSize: 9, color: k.color.inkMute, letterSpacing: "0.1em", marginTop: 2 }}>SCHILLERKIEZ · NEUKÖLLN · ADMIN</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontFamily: k.font.mono, fontSize: 11, color: k.color.inkMute }}>{lang === "DE" ? "← zurück zum Forum" : "← back to forum"}</span>
          <div style={{ display: "flex", border: k.border.ink, borderRadius: k.r.pill, overflow: "hidden", fontFamily: k.font.mono, fontSize: 11, fontWeight: 600 }}>
            <span style={{ padding: "5px 10px", background: lang === "DE" ? k.color.ink : "transparent", color: lang === "DE" ? k.color.paper : k.color.ink }}>DE</span>
            <span style={{ padding: "5px 10px", background: lang === "EN" ? k.color.ink : "transparent", color: lang === "EN" ? k.color.paper : k.color.ink, borderLeft: k.border.ink }}>EN</span>
          </div>
          <window.KioskAvatar initials="EA" color={ADM_ACCENT} online />
        </div>
      </header>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Stat row — Setzkasten counts (maps API counts object)
// ─────────────────────────────────────────────────────────
function AdmStatRow({ lang = "DE" }) {
  const k = window.kiosk;
  const stats = [
    { n: 1,  l: { DE: "dringend",     EN: "urgent" },       c: k.color.danger },
    { n: 5,  l: { DE: "offen",        EN: "pending" },      c: k.color.ochre },
    { n: 38, l: { DE: "freigegeben",  EN: "approved" },     c: k.color.success },
    { n: 4,  l: { DE: "mit hinweis",  EN: "with warning" }, c: k.color.warn },
    { n: 11, l: { DE: "abgelehnt",    EN: "rejected" },     c: k.color.inkMute },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, padding: "18px 36px 0" }}>
      {stats.map((s) => (
        <div key={s.l.DE} style={{
          background: k.color.paperWarm, border: k.border.ink, borderRadius: k.r.md,
          borderTop: `4px solid ${s.c}`, padding: "12px 16px 10px",
          boxShadow: k.shadow.printSm(),
        }}>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, fontFamily: k.font.display }}>{s.n}</div>
          <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, letterSpacing: "0.1em", marginTop: 4, textTransform: "uppercase" }}>{s.l[lang]}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Title + view toggle + filter rail
// ─────────────────────────────────────────────────────────
function AdmTitleBlock({ lang = "DE", view = "queue" }) {
  const k = window.kiosk;
  return (
    <section style={{ padding: "22px 36px 0" }}>
      <div style={{ fontFamily: k.font.mono, fontSize: 11, color: ADM_ACCENT, letterSpacing: "0.12em" }}>
        {lang === "DE" ? "MODERATION · FREITAG 4. JULI · 08:30" : "MODERATION · FRIDAY JULY 4 · 08:30"}
      </div>
      <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "6px 0 0" }}>
        {lang === "DE"
          ? <>Was liegt auf dem <span style={{ fontFamily: k.font.serif, fontStyle: "italic", fontWeight: 400, color: ADM_ACCENT }}>Prüftisch</span>?</>
          : <>What&rsquo;s on the <span style={{ fontFamily: k.font.serif, fontStyle: "italic", fontWeight: 400, color: ADM_ACCENT }}>review desk</span>?</>}
      </h1>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16, borderBottom: `1px dashed ${k.color.rule}`, paddingBottom: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "queue",   DE: "Prüfstapel",   EN: "Review queue" },
            { id: "history", DE: "Protokoll",    EN: "History" },
          ].map((t) => (
            <span key={t.id} style={{
              padding: "7px 16px", fontSize: 13.5, fontWeight: 700,
              background: view === t.id ? ADM_ACCENT : "transparent",
              color: view === t.id ? k.color.paper : k.color.ink,
              border: k.border.ink, borderRadius: k.r.pill,
              boxShadow: view === t.id ? k.shadow.printSm() : "none",
            }}>{t[lang]}</span>
          ))}
        </div>
        <span style={{ fontFamily: k.font.mono, fontSize: 11, color: k.color.inkMute }}>
          {lang === "DE" ? "sortieren: neueste ↓ · aktualisieren ⟳" : "sort: newest ↓ · refresh ⟳"}
        </span>
      </div>
    </section>
  );
}

function AdmFilterRail({ lang = "DE", active = "all" }) {
  const k = window.kiosk;
  const items = [
    { id: "all", DE: "Alle", EN: "All" },
    ...Object.keys(ADM_TYPES).map((t) => ({ id: t, DE: ADM_TYPES[t].DE, EN: ADM_TYPES[t].EN })),
    { id: "reported", DE: "⚑ Gemeldet", EN: "⚑ Reported" },
  ];
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "14px 36px" }}>
      {items.map((it) => (
        <span key={it.id} style={{
          padding: "5px 12px", fontSize: 12.5, fontWeight: 600,
          background: active === it.id ? k.color.ink : "transparent",
          color: active === it.id ? k.color.paper : it.id === "reported" ? k.color.ochre : k.color.ink,
          border: it.id === "reported" ? `1.5px solid ${k.color.ochre}` : k.border.ink,
          borderRadius: k.r.pill, fontFamily: k.font.display,
        }}>{it[lang]}</span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Bulk bar — appears when ≥1 selected (queue view only)
// ─────────────────────────────────────────────────────────
function AdmBulkBar({ lang = "DE", count = 2 }) {
  const k = window.kiosk;
  return (
    <div style={{
      margin: "0 36px 16px", padding: "12px 18px",
      background: `${ADM_ACCENT}14`, border: `1.5px solid ${ADM_ACCENT}`,
      borderRadius: k.r.md, display: "flex", alignItems: "center", gap: 14,
    }}>
      <span style={{ fontFamily: k.font.mono, fontSize: 12, fontWeight: 600, color: ADM_ACCENT }}>
        {count} {lang === "DE" ? "ausgewählt" : "selected"}
      </span>
      <AdmActionBtn variant="approve" small>✓ {lang === "DE" ? "alle freigeben" : "approve all"}</AdmActionBtn>
      <AdmActionBtn variant="danger" small>✕ {lang === "DE" ? "alle ablehnen…" : "reject all…"}</AdmActionBtn>
      <AdmActionBtn variant="outline" small>{lang === "DE" ? "auswahl aufheben" : "clear"}</AdmActionBtn>
      <span style={{ fontFamily: k.font.mono, fontSize: 10.5, color: k.color.inkMute, marginLeft: "auto" }}>
        {lang === "DE" ? "ablehnen vergibt Verwarnungen — Vorschau folgt" : "rejecting adds strikes — preview follows"}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Queue card
// ─────────────────────────────────────────────────────────
function AdmQueueCard({ item, lang = "DE", selected = false }) {
  const k = window.kiosk;
  const isReport = item.source === "report";
  const isNews = item.source === "news";
  return (
    <article style={{
      background: item.urgent ? k.color.paperWarm : k.color.paper,
      border: item.urgent ? `2px solid ${k.color.danger}` : selected ? `2px solid ${ADM_ACCENT}` : k.border.ink,
      borderRadius: k.r.lg, overflow: "hidden",
      boxShadow: item.urgent ? k.shadow.print(k.color.danger) : selected ? k.shadow.print(ADM_ACCENT) : k.shadow.printSm(),
    }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: `1px dashed ${k.color.rule}` }}>
        <AdmCheckbox checked={selected} />
        <AdmSourceStrap item={item} lang={lang} />
        <AdmTypeChip type={item.type} lang={lang} />
        <span style={{ fontSize: 13, color: k.color.inkSoft, display: "inline-flex", alignItems: "center", gap: 7 }}>
          {lang === "DE" ? "von" : "by"} <b>{item.author.name}</b>
          <AdmStrikeDots n={item.author.strikes} />
        </span>
        <span style={{ fontFamily: k.font.mono, fontSize: 11, color: k.color.inkMute, marginLeft: "auto" }}>{item.time}</span>
      </div>
      {/* body */}
      <div style={{ padding: "14px 18px 12px" }}>
        {item.context ? <div style={{ fontFamily: k.font.mono, fontSize: 10.5, color: k.color.inkMute, marginBottom: 6 }}>{item.context}</div> : null}
        {item.title ? <h3 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 700, letterSpacing: "-0.015em", color: k.color.ink }}>{item.title}</h3> : null}
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: k.color.inkSoft, fontStyle: item.type === "comment" ? "italic" : "normal" }}>
          {item.type === "comment" ? <>„{item.body}“</> : item.body}
        </p>
        {item.images ? (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {item.images.map((im, i) => (
              <div key={i} style={{ width: 84, height: 84, borderRadius: k.r.sm, border: k.border.ink, overflow: "hidden", position: "relative", background: `repeating-linear-gradient(45deg, ${ADM_ACCENT}22 0 8px, ${k.color.paperSoft} 8px 16px)`, filter: "blur(0px)" }}>
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(6px)", background: "rgba(243,234,216,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: k.font.mono, fontSize: 9, color: k.color.inkMute, textAlign: "center", padding: 4 }}>{lang === "DE" ? "unscharf — hover zeigt" : "blurred — hover reveals"}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {/* flags / report block */}
      <div style={{ padding: "0 18px 14px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {isReport ? (
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, letterSpacing: "0.08em" }}>{lang === "DE" ? "GEMELDET WEGEN" : "REPORTED FOR"}</span>
              <span style={{ fontFamily: k.font.mono, fontSize: 10.5, fontWeight: 500, color: k.color.ink, background: k.color.ochre, padding: "3px 9px", borderRadius: k.r.sm, border: `1px solid ${k.color.ink}` }}>{ADM_REPORT_REASONS[item.reportReason][lang]}</span>
              <span style={{ fontFamily: k.font.mono, fontSize: 10.5, color: k.color.inkMute }}>{lang === "DE" ? "von" : "by"} {item.reporter} {item.reportCount > 1 ? `+ ${item.reportCount - 1} ${lang === "DE" ? "weitere" : "more"}` : ""}</span>
            </div>
            <blockquote style={{ margin: "8px 0 0", padding: "8px 12px", background: k.color.paperSoft, borderRadius: k.r.sm, border: `1px solid ${k.color.rule}`, fontFamily: k.font.serif, fontStyle: "italic", fontSize: 13, color: k.color.inkSoft }}>„{item.reportDetails}“</blockquote>
          </div>
        ) : isNews ? (
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6, fontFamily: k.font.mono, fontSize: 10.5, color: k.color.info, background: k.color.paperWarm, padding: "3px 9px", borderRadius: k.r.sm, border: `1px solid ${k.color.info}66` }}>
            {lang === "DE" ? "KI-Relevanz" : "AI relevance"} <b style={{ fontSize: 11 }}>{item.relevance}/100</b>
          </span>
        ) : (
          <React.Fragment>
            <span style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, letterSpacing: "0.08em" }}>{lang === "DE" ? "MARKIERT ALS" : "FLAGGED AS"}</span>
            {item.cats.map((c) => <AdmCatChip key={c.k} k={c.k} score={c.score} lang={lang} />)}
          </React.Fragment>
        )}
      </div>
      {/* actions */}
      <div style={{ padding: "12px 18px", background: k.color.paperSoft, borderTop: `1px dashed ${k.color.rule}`, display: "flex", gap: 10, alignItems: "center" }}>
        {isReport ? (
          <React.Fragment>
            <AdmActionBtn variant="approve">✓ {lang === "DE" ? "meldung verwerfen" : "dismiss report"}</AdmActionBtn>
            <AdmActionBtn variant="warn">⚠ {lang === "DE" ? "hinweis ergänzen…" : "add warning…"}</AdmActionBtn>
            <AdmActionBtn variant="danger">✕ {lang === "DE" ? "inhalt entfernen…" : "remove content…"}</AdmActionBtn>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <AdmActionBtn variant="approve">✓ {lang === "DE" ? "freigeben" : "approve"}</AdmActionBtn>
            <AdmActionBtn variant="warn">⚠ {lang === "DE" ? "mit hinweis…" : "with warning…"}</AdmActionBtn>
            <AdmActionBtn variant="danger">✕ {lang === "DE" ? "ablehnen…" : "reject…"}</AdmActionBtn>
          </React.Fragment>
        )}
        {item.author.strikes === 2 ? (
          <span style={{ marginLeft: "auto", fontFamily: k.font.mono, fontSize: 10.5, fontWeight: 600, color: k.color.danger, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AdmStrikeDots n={2} /> {lang === "DE" ? "Ablehnung = Sperre (3/3)" : "rejection = ban (3/3)"}
          </span>
        ) : null}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────
//  Queue index — desktop
// ─────────────────────────────────────────────────────────
function AdminQueueDesktop({ lang = "DE" }) {
  const k = window.kiosk;
  return (
    <div style={{ width: 1280, minHeight: 1620, background: k.color.paper, color: k.color.ink, fontFamily: k.font.display, position: "relative", overflow: "hidden" }}>
      <style>{window.kioskFonts}</style>
      <style>{`@keyframes admPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      <div style={window.paperGrainStyle}></div>
      <AdmMasthead lang={lang} />
      <AdmStatRow lang={lang} />
      <AdmTitleBlock lang={lang} view="queue" />
      <AdmFilterRail lang={lang} active="all" />
      <AdmBulkBar lang={lang} count={2} />
      <div style={{ padding: "0 36px 28px", display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
        <AdmQueueCard item={ADM_SEED[0]} lang={lang} />
        <AdmQueueCard item={ADM_SEED[1]} lang={lang} selected />
        <AdmQueueCard item={ADM_SEED[2]} lang={lang} selected />
        <AdmQueueCard item={ADM_SEED[3]} lang={lang} />
        <AdmQueueCard item={ADM_SEED[4]} lang={lang} />
        <window.KioskAnnotate top={-4} right={-8} rotate={2}>
          {lang === "DE"
            ? "Dringend = 2px danger-Rahmen + roter Druckschatten + pulsierende Marke. Sortiert immer nach oben."
            : "Urgent = 2px danger frame + red print shadow + pulsing strap. Always sorts to top."}
        </window.KioskAnnotate>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, alignItems: "center", fontFamily: k.font.mono, fontSize: 11, color: k.color.inkMute, paddingTop: 6 }}>
          <span style={{ border: k.border.ink, borderRadius: k.r.pill, padding: "5px 14px", color: k.color.ink, fontWeight: 600 }}>{lang === "DE" ? "← zurück" : "← prev"}</span>
          <span>{lang === "DE" ? "Seite 1 von 1 · 5 offen · zeige 10" : "page 1 of 1 · 5 pending · show 10"}</span>
          <span style={{ border: k.border.ink, borderRadius: k.r.pill, padding: "5px 14px", color: k.color.ink, fontWeight: 600 }}>{lang === "DE" ? "weiter →" : "next →"}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Mobile triage — slim stack, thumb-sized actions
// ─────────────────────────────────────────────────────────
function AdminQueueMobile({ lang = "DE" }) {
  const k = window.kiosk;
  const items = [ADM_SEED[0], ADM_SEED[1], ADM_SEED[3]];
  return (
    <div style={{ width: 390, minHeight: 1420, background: k.color.paper, color: k.color.ink, fontFamily: k.font.display, position: "relative", overflow: "hidden" }}>
      <style>{window.kioskFonts}</style>
      <style>{`@keyframes admPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      <div style={window.paperGrainStyle}></div>
      <div style={{ background: ADM_ACCENT, color: k.color.paper, padding: "6px 18px", fontFamily: k.font.mono, fontSize: 9, letterSpacing: "0.12em" }}>
        {lang === "DE" ? "INTERN · NUR ADMIN" : "INTERNAL · ADMIN ONLY"}
      </div>
      <header style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px dashed ${k.color.rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 32, height: 32, background: ADM_ACCENT, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: k.color.paper, fontFamily: k.font.serif, fontStyle: "italic", fontSize: 19, border: k.border.ink }}>m</div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>moderation</div>
        </div>
        <span style={{ fontFamily: k.font.mono, fontSize: 10.5, fontWeight: 600, color: k.color.danger }}>1 {lang === "DE" ? "dringend" : "urgent"} · 5 {lang === "DE" ? "offen" : "open"}</span>
      </header>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, letterSpacing: "0.1em" }}>{lang === "DE" ? "TRIAGE — EIN FALL NACH DEM ANDEREN" : "TRIAGE — ONE CASE AT A TIME"}</div>
        {items.map((item) => (
          <article key={item.id} style={{
            background: item.urgent ? k.color.paperWarm : k.color.paper,
            border: item.urgent ? `2px solid ${k.color.danger}` : k.border.ink,
            borderRadius: k.r.lg, overflow: "hidden",
            boxShadow: item.urgent ? k.shadow.printSm(k.color.danger) : k.shadow.printSm(),
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", flexWrap: "wrap", borderBottom: `1px dashed ${k.color.rule}` }}>
              <AdmSourceStrap item={item} lang={lang} />
              <AdmTypeChip type={item.type} lang={lang} />
              <span style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, marginLeft: "auto" }}>{item.time}</span>
            </div>
            <div style={{ padding: "12px 14px" }}>
              {item.title ? <h3 style={{ margin: "0 0 5px", fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em" }}>{item.title}</h3> : null}
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: k.color.inkSoft, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", fontStyle: item.type === "comment" ? "italic" : "normal" }}>
                {item.type === "comment" ? <>„{item.body}“</> : item.body}
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                {item.source === "report"
                  ? <span style={{ fontFamily: k.font.mono, fontSize: 10, fontWeight: 500, color: k.color.ink, background: k.color.ochre, padding: "2px 8px", borderRadius: k.r.sm, border: `1px solid ${k.color.ink}` }}>{ADM_REPORT_REASONS[item.reportReason][lang]}</span>
                  : (item.cats || []).map((c) => <AdmCatChip key={c.k} k={c.k} score={c.score} lang={lang} />)}
                <span style={{ fontSize: 11.5, color: k.color.inkSoft, display: "inline-flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>{item.author.name} <AdmStrikeDots n={item.author.strikes} size={6} /></span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: `1px dashed ${k.color.rule}` }}>
              <button style={{ minHeight: 48, background: "transparent", border: "none", borderRight: `1px dashed ${k.color.rule}`, fontFamily: k.font.display, fontSize: 13, fontWeight: 700, color: k.color.success, cursor: "pointer" }}>✓ {lang === "DE" ? "frei" : "ok"}</button>
              <button style={{ minHeight: 48, background: "transparent", border: "none", borderRight: `1px dashed ${k.color.rule}`, fontFamily: k.font.display, fontSize: 13, fontWeight: 700, color: k.color.warn, cursor: "pointer" }}>⚠ {lang === "DE" ? "hinweis" : "warn"}</button>
              <button style={{ minHeight: 48, background: "transparent", border: "none", fontFamily: k.font.display, fontSize: 13, fontWeight: 700, color: k.color.danger, cursor: "pointer" }}>✕ {lang === "DE" ? "ablehnen" : "reject"}</button>
            </div>
          </article>
        ))}
        <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, textAlign: "center", paddingTop: 4 }}>
          {lang === "DE" ? "Protokoll + Bulk-Aktionen nur am Desktop — mobil wird triagiert, nicht verwaltet." : "History + bulk actions are desktop-only — mobile triages, doesn't manage."}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ADM_ACCENT, ADM_CATS, ADM_SEV_COLOR, ADM_TYPES, ADM_REPORT_REASONS, ADM_SEED,
  AdmCheckbox, AdmSourceStrap, AdmTypeChip, AdmCatChip, AdmStrikeDots, AdmActionBtn,
  AdmMasthead, AdmStatRow, AdmTitleBlock, AdmFilterRail, AdmBulkBar, AdmQueueCard,
  AdminQueueDesktop, AdminQueueMobile,
});

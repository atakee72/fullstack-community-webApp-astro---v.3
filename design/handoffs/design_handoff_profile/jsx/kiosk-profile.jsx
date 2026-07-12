/* global React */

// ══════════════════════════════════════════════════════════
//  PROFILE PASS · Editorial Kiosk · Batch 3
//  Carved accent: OCHRE — Profil is kin to Auth ("your door").
//  System: Meldebogen + Archiv. Identity = editorial ID card
//  (left column), activity = dated cross-surface ledger (right).
//  Grounded in UserProfile.tsx + auth.schema.ts (ProfileUpdate,
//  ChangePassword) on main.
// ══════════════════════════════════════════════════════════

const PROFILE_ACCENT = kiosk.color.ochre;

const profileKeyframes = `
  @keyframes profPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(0.82); } }
  @keyframes profSweep { 0% { background-position: -200px 0; } 100% { background-position: 400px 0; } }
  @keyframes profChipIn { 0% { opacity: 0; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes profSaveTick { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0); } }
  @keyframes profUploadBar { 0% { width: 8%; } 60% { width: 74%; } 100% { width: 92%; } }
`;

// ─── Seeds ───────────────────────────────────────────────
// Own profile = Emre Aydın (the "EA" avatar in KioskNav chrome).
const SEED_ME = {
  name: "Emre Aydın",
  handle: "emre_a",
  email: "emre.aydin@posteo.de",
  since: "2019",
  verified: true,
  hobbies: ["Fahrrad-Werkstatt", "Çay & Tavla", "Flohmärkte", "Balkon-Garten"],
  stats: { posts: 24, listings: 3, events: 5, danke: 87 },
  strikes: 1,
};

// Public neighbor = Lena Bergmann (auth seeds continuity).
const SEED_NEIGHBOR = {
  name: "Lena Bergmann",
  handle: "lena_b",
  since: "2021",
  verified: true,
  hobbies: ["Urban Sketching", "Kompost", "Kiezgeschichte"],
  stats: { posts: 41, listings: 2, events: 3, danke: 152 },
};

// Cross-surface activity ledger (reverse chrono, "today" = Fr 10. Juli 2026)
const SEED_ACTIVITY = [
  { d: "09.07", t: "18:12", surface: "forum", kindDE: "Diskussion", kindEN: "Discussion",
    titleDE: "Bauarbeiten Herrfurthstraße — wer weiß mehr?", titleEN: "Construction on Herrfurthstraße — who knows more?",
    metaDE: "12 danke · 8 antworten", metaEN: "12 danke · 8 replies" },
  { d: "07.07", t: "09:41", surface: "markt", kindDE: "Anzeige · 45 €", kindEN: "Listing · 45 €",
    titleDE: "Lastenrad-Anhänger, gut erhalten", titleEN: "Cargo-bike trailer, good condition",
    metaDE: "3 anfragen", metaEN: "3 inquiries", strap: "pruefung" },
  { d: "06.07", t: "20:05", surface: "kalender", kindDE: "Termin erstellt", kindEN: "Event created",
    titleDE: "Fahrrad-Selbsthilfe im Hof", titleEN: "Bike self-repair in the courtyard",
    metaDE: "14 zusagen · Sa 12.07", metaEN: "14 going · Sat 12.07" },
  { d: "05.07", t: "13:30", surface: "forum", kindDE: "Empfehlung", kindEN: "Recommendation",
    titleDE: "Beste Simit im Kiez — kleine Feldstudie", titleEN: "Best simit in the kiez — a small field study",
    metaDE: "23 danke · 11 antworten", metaEN: "23 danke · 11 replies" },
  { d: "03.07", t: "08:15", surface: "kalender", kindDE: "Zusage", kindEN: "RSVP",
    titleDE: "Flohmarkt Schillerpromenade", titleEN: "Flea market Schillerpromenade",
    metaDE: "zugesagt · So 06.07", metaEN: "going · Sun 06.07" },
  { d: "01.07", t: "17:48", surface: "kurier", kindDE: "News eingereicht", kindEN: "News submitted",
    titleDE: "Neue Fahrradstraße für die Weisestraße beschlossen", titleEN: "New bike street approved for Weisestraße",
    metaDE: "freigegeben · relevanz 84", metaEN: "approved · relevance 84" },
  { d: "28.06", t: "11:02", surface: "markt", kindDE: "Anzeige · verschenken", kindEN: "Listing · give away",
    titleDE: "Kinderfahrrad 16 Zoll", titleEN: "Kids' bike, 16-inch",
    metaDE: "7 anfragen", metaEN: "7 inquiries", strap: "reserviert" },
  { d: "24.06", t: "19:26", surface: "forum", kindDE: "Diskussion", kindEN: "Discussion",
    titleDE: "Taubenfüttern am Spielplatz — was tun?", titleEN: "Pigeon feeding at the playground — what to do?",
    metaDE: "9 danke · 21 antworten", metaEN: "9 danke · 21 replies" },
];

// Saved items — content of OTHERS (posts, listings, events, news)
const SEED_SAVED = [
  { d: "08.07", t: "21:14", surface: "forum", kindDE: "Empfehlung", kindEN: "Recommendation",
    titleDE: "Werkzeug-Verleih im Nachbarschaftsheim", titleEN: "Tool lending at the neighborhood house",
    byDE: "von Lena B.", byEN: "by Lena B.", metaDE: "34 danke", metaEN: "34 danke" },
  { d: "06.07", t: "10:33", surface: "markt", kindDE: "Anzeige · 120 €", kindEN: "Listing · 120 €",
    titleDE: "Werkbank, massiv, Selbstabholung", titleEN: "Workbench, solid, pick-up only",
    byDE: "von Meryem K.", byEN: "by Meryem K.", metaDE: "noch aktiv", metaEN: "still active" },
  { d: "04.07", t: "16:50", surface: "kalender", kindDE: "Termin", kindEN: "Event",
    titleDE: "Offenes Hofkonzert · Herrfurthplatz", titleEN: "Open courtyard concert · Herrfurthplatz",
    byDE: "von Jonas W.", byEN: "by Jonas W.", metaDE: "Fr 18.07 · 19:00", metaEN: "Fri 18.07 · 19:00" },
  { d: "02.07", t: "07:58", surface: "kurier", kindDE: "Artikel", kindEN: "Article",
    titleDE: "Schillerkiez: Mietspiegel-Zahlen für Nord-Neukölln", titleEN: "Schillerkiez: rent-index figures for North Neukölln",
    byDE: "Tagesspiegel", byEN: "Tagesspiegel", metaDE: "ungelesen", metaEN: "unread" },
];

// Own rejected content (moderation standing block)
const SEED_REJECTED = [
  { d: "14.05", surface: "forum", titleDE: "Wer parkt hier ständig auf dem Gehweg?!", titleEN: "Who keeps parking on the sidewalk?!",
    reasonDE: "Persönliche Daten Dritter (Kennzeichen im Foto)", reasonEN: "Third-party personal data (license plate in photo)" },
];

const SURFACE_META = {
  forum:    { de: "FORUM",    en: "FORUM",    color: kiosk.color.wine },
  markt:    { de: "MARKT",    en: "MARKET",   color: kiosk.color.wine },
  kalender: { de: "KALENDER", en: "CALENDAR", color: kiosk.color.teal },
  kurier:   { de: "KURIER",   en: "KURIER",   color: kiosk.color.ink },
};

// ─── Atoms ───────────────────────────────────────────────

function PSurfaceTag({ surface, lang = "DE" }) {
  const m = SURFACE_META[surface];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: kiosk.font.mono, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.12em", color: m.color }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.color, border: `1px solid ${kiosk.color.ink}` }}></span>
      {lang === "DE" ? m.de : m.en}
    </span>
  );
}

function PStrap({ kind, lang = "DE" }) {
  const map = {
    pruefung:   { de: "IN PRÜFUNG", en: "IN REVIEW", bg: kiosk.color.ochre, fg: kiosk.color.ink },
    reserviert: { de: "RESERVIERT", en: "RESERVED",  bg: kiosk.color.plum, fg: kiosk.color.paper },
    abgelehnt:  { de: "ABGELEHNT",  en: "REJECTED",  bg: kiosk.color.danger, fg: kiosk.color.paper },
  };
  const s = map[kind];
  return (
    <span style={{ padding: "3px 8px", background: s.bg, color: s.fg, border: kiosk.border.ink, borderRadius: 4, fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", boxShadow: kiosk.shadow.printSm() }}>
      {lang === "DE" ? s.de : s.en}
    </span>
  );
}

function PVerifiedBadge({ lang = "DE" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: kiosk.color.teal, color: kiosk.color.paper, border: kiosk.border.ink, borderRadius: kiosk.r.pill, fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 500, letterSpacing: "0.08em" }}>
      ✓ {lang === "DE" ? "Verifiziert im Kiez" : "Verified in the kiez"}
    </span>
  );
}

function PStrikeDots({ strikes = 0 }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 11, height: 11, borderRadius: "50%", border: kiosk.border.ink, background: i < strikes ? kiosk.color.danger : "transparent" }}></span>
      ))}
    </span>
  );
}

function PHobbyChip({ children, removable }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: kiosk.color.paperSoft, border: kiosk.border.ink, borderRadius: kiosk.r.pill, fontFamily: kiosk.font.display, fontSize: 12.5, fontWeight: 600 }}>
      {children}
      {removable && <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute, cursor: "pointer" }}>✕</span>}
    </span>
  );
}

function PBtn({ children, primary, danger, small, disabled }) {
  return (
    <button disabled={disabled} style={{
      padding: small ? "6px 14px" : "9px 18px",
      background: danger ? "transparent" : primary ? kiosk.color.ink : "transparent",
      color: danger ? kiosk.color.danger : primary ? kiosk.color.paper : kiosk.color.ink,
      border: danger ? `1.5px solid ${kiosk.color.danger}` : kiosk.border.ink,
      borderRadius: kiosk.r.pill, fontFamily: kiosk.font.display, fontSize: small ? 12.5 : 13.5, fontWeight: 700,
      boxShadow: primary ? kiosk.shadow.printSm(PROFILE_ACCENT) : "none",
      cursor: "pointer", opacity: disabled ? 0.45 : 1,
    }}>{children}</button>
  );
}

function PCardHead({ n, de, en, lang = "DE", accent = PROFILE_ACCENT }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
      <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: accent, fontWeight: 600 }}>§{n}</span>
      <span style={{ fontFamily: kiosk.font.display, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>{lang === "DE" ? de : en}</span>
    </div>
  );
}

// Card surface — same anatomy as AuthCard: paperWarm, ink border, 4px accent top-rule
function PCard({ children, accent = PROFILE_ACCENT, pad = 20, style }) {
  return (
    <div style={{
      background: kiosk.color.paperWarm, border: kiosk.border.ink, borderTop: `4px solid ${accent}`,
      borderRadius: kiosk.r.lg, boxShadow: kiosk.shadow.print(), padding: pad, position: "relative", ...style,
    }}>{children}</div>
  );
}

// ─── Identity card (own + public) ────────────────────────

function PAvatar({ initials = "EA", size = 92, editable = false, lang = "DE" }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%", background: kiosk.color.wine,
        border: kiosk.border.inkBold, boxShadow: kiosk.shadow.printSm(PROFILE_ACCENT),
        display: "flex", alignItems: "center", justifyContent: "center",
        color: kiosk.color.paper, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: size * 0.36,
      }}>{initials}</div>
      {editable && (
        <span style={{
          position: "absolute", bottom: -6, right: -10, padding: "3px 9px",
          background: kiosk.color.ochre, border: kiosk.border.ink, borderRadius: kiosk.r.pill,
          fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 500, letterSpacing: "0.08em", boxShadow: kiosk.shadow.printSm(),
        }}>{lang === "DE" ? "ÄNDERN" : "CHANGE"}</span>
      )}
    </div>
  );
}

function PIdentityCard({ person = SEED_ME, own = true, lang = "DE" }) {
  return (
    <PCard>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <PAvatar initials={person.name.split(" ").map((w) => w[0]).join("")} editable={own} lang={lang} />
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontFamily: kiosk.font.display, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.05 }}>{person.name}</h2>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute, marginTop: 4 }}>@{person.handle} · {lang === "DE" ? `im Kiez seit ${person.since}` : `in the kiez since ${person.since}`}</div>
          <div style={{ marginTop: 8 }}>{person.verified && <PVerifiedBadge lang={lang} />}</div>
        </div>
      </div>
      {/* stats ledger line */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginTop: 18, borderTop: `1.5px dashed ${kiosk.color.rule}`, paddingTop: 12 }}>
        {[
          { n: person.stats.posts, de: "Beiträge", en: "posts" },
          { n: person.stats.listings, de: "Anzeigen", en: "listings" },
          { n: person.stats.events, de: "Termine", en: "events" },
          { n: person.stats.danke, de: "danke", en: "danke" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center", borderLeft: i > 0 ? `1px dashed ${kiosk.color.rule}` : "none" }}>
            <div style={{ fontFamily: kiosk.font.display, fontSize: 21, fontWeight: 800 }}>{s.n}</div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.1em" }}>{lang === "DE" ? s.de : s.en}</div>
          </div>
        ))}
      </div>
      {/* hobbies */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.14em", marginBottom: 8 }}>{lang === "DE" ? "INTERESSEN" : "INTERESTS"}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {person.hobbies.map((h) => <PHobbyChip key={h}>{h}</PHobbyChip>)}
        </div>
      </div>
      {own && (
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <PBtn primary small>{lang === "DE" ? "Profil bearbeiten" : "Edit profile"}</PBtn>
          <PBtn small>{lang === "DE" ? "Steckbrief drucken" : "Print Steckbrief"}</PBtn>
        </div>
      )}
    </PCard>
  );
}

// ─── Moderation standing („Leumund“) ─────────────────────

function PModerationCard({ strikes = 1, rejected = SEED_REJECTED, lang = "DE" }) {
  const clean = strikes === 0 && rejected.length === 0;
  return (
    <PCard accent={strikes > 0 ? kiosk.color.warn : kiosk.color.success}>
      <PCardHead n="02" de="Moderation" en="Moderation" lang={lang} accent={strikes > 0 ? kiosk.color.warn : kiosk.color.success} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: kiosk.font.display, fontSize: 13.5, fontWeight: 600 }}>
          {lang === "DE" ? "Verwarnungen" : "Warnings"} <b>{strikes} / 3</b>
        </span>
        <PStrikeDots strikes={strikes} />
      </div>
      {clean ? (
        <div style={{ marginTop: 10, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 14, color: kiosk.color.inkSoft }}>
          {lang === "DE" ? "Alles im Reinen — keine Einträge." : "All clear — no entries."}
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.14em", marginBottom: 8 }}>{lang === "DE" ? "ABGELEHNTE INHALTE" : "REJECTED CONTENT"}</div>
          {rejected.map((r, i) => (
            <div key={i} style={{ padding: "10px 0", borderTop: `1px dashed ${kiosk.color.rule}`, display: "grid", gridTemplateColumns: "44px 1fr", gap: 10 }}>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>{r.d}</span>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <PSurfaceTag surface={r.surface} lang={lang} />
                  <PStrap kind="abgelehnt" lang={lang} />
                </div>
                <div style={{ fontFamily: kiosk.font.display, fontSize: 13, fontWeight: 600, marginTop: 5, textDecoration: "line-through", textDecorationColor: kiosk.color.danger, textDecorationThickness: 1.5 }}>{lang === "DE" ? r.titleDE : r.titleEN}</div>
                <div style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkSoft, marginTop: 3 }}>{lang === "DE" ? "Grund: " : "Reason: "}{lang === "DE" ? r.reasonDE : r.reasonEN}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8, fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, lineHeight: 1.5 }}>
            {lang === "DE" ? "Abgelehnte Inhalte sieht nur, wem sie gehören. 3 Verwarnungen führen zur Sperre." : "Rejected content is visible only to you. 3 warnings lead to a suspension."}
          </div>
        </div>
      )}
    </PCard>
  );
}

// ─── Konto (settings) card ───────────────────────────────

function PKontoRow({ label, value, action, lang = "DE" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderTop: `1px dashed ${kiosk.color.rule}`, gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.14em" }}>{label}</div>
        <div style={{ fontFamily: kiosk.font.display, fontSize: 13.5, fontWeight: 600, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      </div>
      <span style={{ fontFamily: kiosk.font.display, fontSize: 12.5, fontWeight: 700, color: kiosk.color.ink, borderBottom: `2px solid ${PROFILE_ACCENT}`, cursor: "pointer", flexShrink: 0 }}>{action}</span>
    </div>
  );
}

function PKontoCard({ lang = "DE", person = SEED_ME }) {
  return (
    <PCard>
      <PCardHead n="03" de="Konto" en="Account" lang={lang} />
      <PKontoRow label="E-MAIL" value={person.email} action={lang === "DE" ? "ändern" : "change"} lang={lang} />
      <PKontoRow label={lang === "DE" ? "PASSWORT" : "PASSWORD"} value="••••••••••" action={lang === "DE" ? "ändern" : "change"} lang={lang} />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <PBtn small>{lang === "DE" ? "Abmelden" : "Log out"}</PBtn>
      </div>
      <div style={{ marginTop: 16, padding: "12px 14px", border: `1.5px dashed ${kiosk.color.danger}`, borderRadius: kiosk.r.md }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.danger, letterSpacing: "0.14em", marginBottom: 6 }}>{lang === "DE" ? "GEFAHRENZONE" : "DANGER ZONE"}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontFamily: kiosk.font.display, fontSize: 12.5, color: kiosk.color.inkSoft }}>{lang === "DE" ? "Konto dauerhaft löschen" : "Delete account permanently"}</span>
          <PBtn danger small>{lang === "DE" ? "löschen …" : "delete …"}</PBtn>
        </div>
      </div>
    </PCard>
  );
}

// ─── Kiez-Chronik strip (compact teaser of NOVEL §01) ────

function PChronikStrip({ person = SEED_ME, lang = "DE" }) {
  const stops = lang === "DE"
    ? [{ y: person.since, l: "dabei seit" }, { y: "2021", l: "erste Anzeige" }, { y: "2024", l: "100. danke" }, { y: "heute", l: "aktiv", now: true }]
    : [{ y: person.since, l: "joined" }, { y: "2021", l: "first listing" }, { y: "2024", l: "100th danke" }, { y: "today", l: "active", now: true }];
  return (
    <div style={{ border: kiosk.border.ink, borderRadius: kiosk.r.md, background: kiosk.color.paperSoft, padding: "14px 20px", display: "flex", alignItems: "center", gap: 0 }}>
      <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: kiosk.color.inkMute, marginRight: 18, flexShrink: 0 }}>KIEZ-CHRONIK</span>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        {stops.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ flex: 1, borderTop: `1.5px dashed ${kiosk.color.rule}`, margin: "0 8px" }}></span>}
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", border: kiosk.border.ink, background: s.now ? PROFILE_ACCENT : kiosk.color.ink, animation: s.now ? "profPulse 2.4s ease-in-out infinite" : "none" }}></span>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, fontWeight: 600 }}>{s.y}</span>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 8.5, color: kiosk.color.inkMute }}>{s.l}</span>
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Activity ledger ─────────────────────────────────────

function PFilterChip({ label, active, count }) {
  return (
    <span style={{
      padding: "5px 13px", fontFamily: kiosk.font.display, fontSize: 12.5, fontWeight: 600,
      background: active ? kiosk.color.ink : "transparent", color: active ? kiosk.color.paper : kiosk.color.ink,
      border: kiosk.border.ink, borderRadius: kiosk.r.pill, cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center",
    }}>
      {label}
      {count != null && <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: active ? kiosk.color.ochre : kiosk.color.inkMute }}>{count}</span>}
    </span>
  );
}

function PActivityRow({ item, lang = "DE", saved = false }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", gap: 14, padding: "13px 0", borderTop: `1px dashed ${kiosk.color.rule}`, alignItems: "start" }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, lineHeight: 1.5 }}>
        {item.d}<br />{item.t}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <PSurfaceTag surface={item.surface} lang={lang} />
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.08em" }}>{lang === "DE" ? item.kindDE : item.kindEN}</span>
          {saved && <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12, color: kiosk.color.inkSoft }}>{lang === "DE" ? item.byDE : item.byEN}</span>}
        </div>
        <div style={{ fontFamily: kiosk.font.display, fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em", marginTop: 4, lineHeight: 1.25 }}>{lang === "DE" ? item.titleDE : item.titleEN}</div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkSoft, marginTop: 4 }}>{lang === "DE" ? item.metaDE : item.metaEN}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        {item.strap && <PStrap kind={item.strap} lang={lang} />}
        {saved && <span style={{ fontFamily: kiosk.font.mono, fontSize: 13, color: PROFILE_ACCENT }}>◈</span>}
      </div>
    </div>
  );
}

function PActivityLedger({ lang = "DE", view = "alle", items, savedItems, publicView = false }) {
  const showSaved = view === "gespeichert";
  const rows = showSaved ? (savedItems || SEED_SAVED) : (items || SEED_ACTIVITY);
  const t = lang === "DE"
    ? { head: "Archiv", alle: "Alle", gesp: "Gespeichert", note: "chronologisch · alle Bereiche" }
    : { head: "Archive", alle: "All", gesp: "Saved", note: "chronological · all surfaces" };
  return (
    <PCard pad={24}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <PCardHead n="01" de="Archiv" en="Archive" lang={lang} />
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.1em" }}>{t.note}</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <PFilterChip label={t.alle} active={view === "alle"} count={SEED_ACTIVITY.length} />
        <PFilterChip label="Forum" active={view === "forum"} />
        <PFilterChip label={lang === "DE" ? "Markt" : "Market"} active={view === "markt"} />
        <PFilterChip label={lang === "DE" ? "Kalender" : "Calendar"} active={view === "kalender"} />
        <PFilterChip label="Kurier" active={view === "kurier"} />
        {!publicView && (
          <React.Fragment>
            <span style={{ width: 1, height: 20, background: kiosk.color.rule, margin: "2px 4px 0" }}></span>
            <PFilterChip label={"◈ " + t.gesp} active={showSaved} count={SEED_SAVED.length} />
          </React.Fragment>
        )}
      </div>
      {rows.map((item, i) => <PActivityRow key={i} item={item} lang={lang} saved={showSaved} />)}
      <div style={{ marginTop: 14, textAlign: "center" }}>
        <PBtn small>{lang === "DE" ? "ältere laden ↓" : "load older ↓"}</PBtn>
      </div>
    </PCard>
  );
}

// ─── Title block ─────────────────────────────────────────

function ProfileTitleBlock({ lang = "DE", person = SEED_ME, own = true }) {
  const eyebrow = own
    ? (lang === "DE" ? `PROFIL · @${person.handle} · IM KIEZ SEIT ${person.since}` : `PROFILE · @${person.handle} · IN THE KIEZ SINCE ${person.since}`)
    : (lang === "DE" ? `NACHBARSCHAFT · @${person.handle} · IM KIEZ SEIT ${person.since}` : `NEIGHBORHOOD · @${person.handle} · IN THE KIEZ SINCE ${person.since}`);
  return (
    <section style={{ padding: "22px 36px 18px", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: PROFILE_ACCENT, letterSpacing: "0.12em", fontWeight: 600 }}>{eyebrow}</div>
      <h1 style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "6px 0 0", fontFamily: kiosk.font.display }}>
        {own
          ? (lang === "DE"
            ? <React.Fragment>Dein <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>Meldebogen</span></React.Fragment>
            : <React.Fragment>Your <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>Meldebogen</span></React.Fragment>)
          : (lang === "DE"
            ? <React.Fragment>Aus der <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>Nachbarschaft</span></React.Fragment>
            : <React.Fragment>From the <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>neighborhood</span></React.Fragment>)}
      </h1>
    </section>
  );
}

// ─── Own profile · desktop ───────────────────────────────

function ProfileOwnDesktop({ lang = "DE", view = "alle" }) {
  return (
    <div style={{ width: 1280, minHeight: 1500, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      <KioskNav active="" lang={lang} />
      <ProfileTitleBlock lang={lang} own={true} />
      <div style={{ padding: "24px 36px 40px", display: "grid", gridTemplateColumns: "384px 1fr", gap: 26, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <PIdentityCard person={SEED_ME} own={true} lang={lang} />
          <PModerationCard strikes={SEED_ME.strikes} lang={lang} />
          <PKontoCard lang={lang} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <PChronikStrip lang={lang} />
          <PActivityLedger lang={lang} view={view} />
        </div>
      </div>
      <KioskAnnotate top={150} right={40} rotate={1.5}>
        {lang === "DE"
          ? "Avatar in der Nav bekommt einen Ochre-Ring, wenn /profil aktiv ist — Profil ist kein Nav-Tab."
          : "Nav avatar gets an ochre ring while /profile is active — profile is not a nav tab."}
      </KioskAnnotate>
      <KioskAnnotate top={620} left={310} rotate={-2} color={kiosk.color.sky}>
        {lang === "DE"
          ? "Verwarnungs-Stand kommt aus dem 3-Strike-System (Admin-Pass). 0 Strikes → grüne Regel + eine Zeile."
          : "Warning count comes from the 3-strike system (admin pass). 0 strikes → green rule + a single line."}
      </KioskAnnotate>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════

Object.assign(window, {
  PROFILE_ACCENT, profileKeyframes,
  SEED_ME, SEED_NEIGHBOR, SEED_ACTIVITY, SEED_SAVED, SEED_REJECTED, SURFACE_META,
  PSurfaceTag, PStrap, PVerifiedBadge, PStrikeDots, PHobbyChip, PBtn, PCard, PCardHead,
  PAvatar, PIdentityCard, PModerationCard, PKontoCard, PKontoRow, PChronikStrip,
  PFilterChip, PActivityRow, PActivityLedger, ProfileTitleBlock,
  ProfileOwnDesktop,
});

/* global React */

// ══════════════════════════════════════════════════════════
//  PROFILE PASS · public neighbor view + mobile
//  Public view = trimmed Meldebogen: NO email, NO saved items,
//  NO moderation, NO settings. Contact happens through content
//  (listing contact form, forum replies) — no DM system.
// ══════════════════════════════════════════════════════════

// Public activity of the neighbor (only public things: posts,
// active listings, upcoming events created)
const SEED_PUBLIC_ACTIVITY = [
  { d: "08.07", t: "21:14", surface: "forum", kindDE: "Empfehlung", kindEN: "Recommendation",
    titleDE: "Werkzeug-Verleih im Nachbarschaftsheim", titleEN: "Tool lending at the neighborhood house",
    metaDE: "34 danke · 6 antworten", metaEN: "34 danke · 6 replies" },
  { d: "05.07", t: "17:02", surface: "kalender", kindDE: "Termin erstellt", kindEN: "Event created",
    titleDE: "Urban-Sketching-Runde am Herrfurthplatz", titleEN: "Urban sketching walk at Herrfurthplatz",
    metaDE: "9 zusagen · So 13.07", metaEN: "9 going · Sun 13.07" },
  { d: "02.07", t: "10:20", surface: "markt", kindDE: "Anzeige · 15 €", kindEN: "Listing · 15 €",
    titleDE: "Aquarellkasten, kaum benutzt", titleEN: "Watercolor set, barely used",
    metaDE: "aktiv", metaEN: "active" },
  { d: "27.06", t: "14:44", surface: "forum", kindDE: "Diskussion", kindEN: "Discussion",
    titleDE: "Geschichte der Schillerpromenade — Fotos gesucht", titleEN: "History of Schillerpromenade — looking for photos",
    metaDE: "18 danke · 13 antworten", metaEN: "18 danke · 13 replies" },
];

// ─── Public profile · desktop ────────────────────────────

function PublicProfileDesktop({ lang = "DE" }) {
  return (
    <div style={{ width: 1280, minHeight: 1160, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      <KioskNav active="" lang={lang} />
      <ProfileTitleBlock lang={lang} person={SEED_NEIGHBOR} own={false} />
      <div style={{ padding: "24px 36px 40px", display: "grid", gridTemplateColumns: "384px 1fr", gap: 26, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <PIdentityCard person={SEED_NEIGHBOR} own={false} lang={lang} />
          <PChronikStrip person={SEED_NEIGHBOR} lang={lang} />
          <div style={{ padding: "12px 16px", border: `1.5px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.md, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, lineHeight: 1.6 }}>
            {lang === "DE"
              ? "Kontakt läuft über Inhalte: Anzeige anfragen oder im Forum antworten. E-Mail, Gespeichertes und Moderation bleiben privat."
              : "Contact happens through content: inquire on a listing or reply in the forum. Email, saved items and moderation stay private."}
          </div>
        </div>
        <PActivityLedger lang={lang} items={SEED_PUBLIC_ACTIVITY} publicView={true} />
      </div>
      <KioskAnnotate top={150} right={40} rotate={1.5} color={kiosk.color.sky}>
        {lang === "DE"
          ? "Einstieg: Klick auf Autor:innen-Namen in Forum / Markt / Kalender. Route: /nachbarn/@handle."
          : "Entry point: clicking an author name in Forum / Market / Calendar. Route: /nachbarn/@handle."}
      </KioskAnnotate>
    </div>
  );
}

// ─── Mobile chrome ───────────────────────────────────────

function PMobileTopBar({ lang = "DE", own = true }) {
  return (
    <header style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 32, height: 32, background: kiosk.color.wine, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: kiosk.color.paper, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 19, border: kiosk.border.ink }}>m</div>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em" }}>{own ? (lang === "DE" ? "Profil" : "Profile") : (lang === "DE" ? "Nachbarschaft" : "Neighborhood")}</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", border: kiosk.border.ink, borderRadius: kiosk.r.pill, overflow: "hidden", fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 600 }}>
          <span style={{ padding: "4px 8px", background: lang === "DE" ? kiosk.color.ink : "transparent", color: lang === "DE" ? kiosk.color.paper : kiosk.color.ink }}>DE</span>
          <span style={{ padding: "4px 8px", background: lang === "EN" ? kiosk.color.ink : "transparent", color: lang === "EN" ? kiosk.color.paper : kiosk.color.ink, borderLeft: kiosk.border.ink }}>EN</span>
        </div>
        {own && <div style={{ width: 30, height: 30, borderRadius: "50%", background: kiosk.color.ochre, border: kiosk.border.ink, boxShadow: `0 0 0 2px ${PROFILE_ACCENT}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700 }}>EA</div>}
      </div>
    </header>
  );
}

// Collapsed accordion row (mobile: Konto + Moderation fold away)
function PMobileFold({ title, badge, open = false, children, accent = PROFILE_ACCENT }) {
  return (
    <div style={{ background: kiosk.color.paperWarm, border: kiosk.border.ink, borderTop: `4px solid ${accent}`, borderRadius: kiosk.r.lg, boxShadow: kiosk.shadow.printSm(), overflow: "hidden" }}>
      <div style={{ padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: kiosk.font.display, fontSize: 14.5, fontWeight: 800 }}>{title}</span>
          {badge}
        </span>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 12, color: kiosk.color.inkMute }}>{open ? "▴" : "▾"}</span>
      </div>
      {open && <div style={{ padding: "0 16px 16px", borderTop: `1px dashed ${kiosk.color.rule}`, paddingTop: 12 }}>{children}</div>}
    </div>
  );
}

// Compact ledger row for 390px
function PActivityRowMobile({ item, lang = "DE", saved = false }) {
  return (
    <div style={{ padding: "12px 0", borderTop: `1px dashed ${kiosk.color.rule}` }}>
      <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute }}>{item.d}</span>
        <PSurfaceTag surface={item.surface} lang={lang} />
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.06em" }}>{lang === "DE" ? item.kindDE : item.kindEN}</span>
        {item.strap && <PStrap kind={item.strap} lang={lang} />}
      </div>
      <div style={{ fontFamily: kiosk.font.display, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3, marginTop: 5 }}>{lang === "DE" ? item.titleDE : item.titleEN}</div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkSoft, marginTop: 3, display: "flex", justifyContent: "space-between" }}>
        <span>{saved ? (lang === "DE" ? item.byDE : item.byEN) + " · " : ""}{lang === "DE" ? item.metaDE : item.metaEN}</span>
        {saved && <span style={{ color: PROFILE_ACCENT }}>◈</span>}
      </div>
    </div>
  );
}

// ─── Own profile · mobile ────────────────────────────────

function ProfileOwnMobile({ lang = "DE" }) {
  const t = lang === "DE"
    ? { alle: "Alle", gesp: "◈ Gespeichert", archiv: "Archiv", moderation: "Moderation", konto: "Konto", older: "ältere laden ↓" }
    : { alle: "All", gesp: "◈ Saved", archiv: "Archive", moderation: "Moderation", konto: "Account", older: "load older ↓" };
  return (
    <div style={{ width: 390, minHeight: 1720, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      <PMobileTopBar lang={lang} own={true} />

      <div style={{ padding: "18px 16px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* identity — compact */}
        <PCard pad={16}>
          <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
            <PAvatar initials="EA" size={68} editable={true} lang={lang} />
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontFamily: kiosk.font.display, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>{SEED_ME.name}</h2>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, marginTop: 3 }}>@{SEED_ME.handle} · {lang === "DE" ? "seit" : "since"} {SEED_ME.since}</div>
              <div style={{ marginTop: 6 }}><PVerifiedBadge lang={lang} /></div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginTop: 14, borderTop: `1.5px dashed ${kiosk.color.rule}`, paddingTop: 10 }}>
            {[
              { n: SEED_ME.stats.posts, de: "Beiträge", en: "posts" },
              { n: SEED_ME.stats.listings, de: "Anzeigen", en: "listings" },
              { n: SEED_ME.stats.events, de: "Termine", en: "events" },
              { n: SEED_ME.stats.danke, de: "danke", en: "danke" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center", borderLeft: i > 0 ? `1px dashed ${kiosk.color.rule}` : "none" }}>
                <div style={{ fontFamily: kiosk.font.display, fontSize: 17, fontWeight: 800 }}>{s.n}</div>
                <div style={{ fontFamily: kiosk.font.mono, fontSize: 8.5, color: kiosk.color.inkMute, letterSpacing: "0.08em" }}>{lang === "DE" ? s.de : s.en}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12 }}>
            {SEED_ME.hobbies.map((h) => <PHobbyChip key={h}>{h}</PHobbyChip>)}
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <PBtn primary small>{lang === "DE" ? "Bearbeiten" : "Edit"}</PBtn>
            <PBtn small>{lang === "DE" ? "Steckbrief" : "Steckbrief"}</PBtn>
          </div>
        </PCard>

        <PChronikStrip lang={lang} />

        {/* archive ledger */}
        <PCard pad={16}>
          <PCardHead n="01" de="Archiv" en="Archive" lang={lang} />
          <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 6, marginBottom: 2 }}>
            <PFilterChip label={t.alle} active={true} count={SEED_ACTIVITY.length} />
            <PFilterChip label="Forum" />
            <PFilterChip label={lang === "DE" ? "Markt" : "Market"} />
            <PFilterChip label={lang === "DE" ? "Kalender" : "Calendar"} />
            <PFilterChip label={t.gesp} count={SEED_SAVED.length} />
          </div>
          {SEED_ACTIVITY.slice(0, 5).map((item, i) => <PActivityRowMobile key={i} item={item} lang={lang} />)}
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <PBtn small>{t.older}</PBtn>
          </div>
        </PCard>

        {/* moderation — folded open to show anatomy */}
        <PMobileFold
          title={t.moderation}
          open={true}
          accent={kiosk.color.warn}
          badge={<PStrikeDots strikes={SEED_ME.strikes} />}
        >
          <div style={{ fontFamily: kiosk.font.display, fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>{lang === "DE" ? "Verwarnungen" : "Warnings"} <b>{SEED_ME.strikes} / 3</b></div>
          {SEED_REJECTED.map((r, i) => (
            <div key={i} style={{ paddingTop: 8, borderTop: `1px dashed ${kiosk.color.rule}` }}>
              <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute }}>{r.d}</span>
                <PSurfaceTag surface={r.surface} lang={lang} />
                <PStrap kind="abgelehnt" lang={lang} />
              </div>
              <div style={{ fontFamily: kiosk.font.display, fontSize: 12.5, fontWeight: 600, marginTop: 5, textDecoration: "line-through", textDecorationColor: kiosk.color.danger }}>{lang === "DE" ? r.titleDE : r.titleEN}</div>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkSoft, marginTop: 3 }}>{lang === "DE" ? "Grund: " + r.reasonDE : "Reason: " + r.reasonEN}</div>
            </div>
          ))}
        </PMobileFold>

        {/* konto — folded open */}
        <PMobileFold title={t.konto} open={true}>
          <PKontoRow label="E-MAIL" value={SEED_ME.email} action={lang === "DE" ? "ändern" : "change"} lang={lang} />
          <PKontoRow label={lang === "DE" ? "PASSWORT" : "PASSWORD"} value="••••••••••" action={lang === "DE" ? "ändern" : "change"} lang={lang} />
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", justifyContent: "space-between" }}>
            <PBtn small>{lang === "DE" ? "Abmelden" : "Log out"}</PBtn>
            <PBtn danger small>{lang === "DE" ? "Konto löschen …" : "Delete account …"}</PBtn>
          </div>
        </PMobileFold>
      </div>
      <KioskAnnotate top={92} right={12} rotate={2}>
        {lang === "DE" ? "Alle Aktionsziele ≥ 44px. Chips-Reihe scrollt horizontal." : "All hit targets ≥ 44px. Chip row scrolls horizontally."}
      </KioskAnnotate>
    </div>
  );
}

// ─── Public profile · mobile ─────────────────────────────

function PublicProfileMobile({ lang = "DE" }) {
  return (
    <div style={{ width: 390, minHeight: 1260, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      <PMobileTopBar lang={lang} own={false} />
      <div style={{ padding: "18px 16px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
        <PCard pad={16}>
          <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
            <PAvatar initials="LB" size={68} lang={lang} />
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontFamily: kiosk.font.display, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1 }}>{SEED_NEIGHBOR.name}</h2>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, marginTop: 3 }}>@{SEED_NEIGHBOR.handle} · {lang === "DE" ? "seit" : "since"} {SEED_NEIGHBOR.since}</div>
              <div style={{ marginTop: 6 }}><PVerifiedBadge lang={lang} /></div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12 }}>
            {SEED_NEIGHBOR.hobbies.map((h) => <PHobbyChip key={h}>{h}</PHobbyChip>)}
          </div>
        </PCard>
        <PChronikStrip person={SEED_NEIGHBOR} lang={lang} />
        <PCard pad={16}>
          <PCardHead n="01" de="Im Kiez unterwegs" en="Around the kiez" lang={lang} />
          {SEED_PUBLIC_ACTIVITY.map((item, i) => <PActivityRowMobile key={i} item={item} lang={lang} />)}
        </PCard>
        <div style={{ padding: "11px 14px", border: `1.5px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.md, fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, lineHeight: 1.6 }}>
          {lang === "DE"
            ? "Kontakt über Anzeige oder Forum — E-Mail bleibt privat."
            : "Contact via listing or forum — email stays private."}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════

Object.assign(window, {
  SEED_PUBLIC_ACTIVITY,
  PublicProfileDesktop, PublicProfileMobile,
  ProfileOwnMobile, PMobileTopBar, PMobileFold, PActivityRowMobile,
});

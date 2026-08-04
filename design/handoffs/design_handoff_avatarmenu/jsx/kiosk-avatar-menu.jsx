/* global React, kiosk, kioskFonts, paperGrainStyle, KioskNav, ForumTitleBlock, KioskAnnotate, PCard, PCardHead, PKontoRow, PBtn, SEED_ME */
// ══════════════════════════════════════════════════════════
//  AVATAR-MENÜ · Editorial Kiosk addendum (Aug 4 2026)
//  The EA avatar in KioskNav gains a paper dropdown — the one
//  global home for „Abmelden“. Desktop only; mobile logout
//  already lives in the Profil Konto-Karte (PKontoCard).
//  Logout is always the WORD, never a naked icon.
// ══════════════════════════════════════════════════════════

const AM_L = {
  profil:   { de: "Mein Profil",   en: "My profile" },
  beitraege:{ de: "Meine Beiträge",en: "My posts" },
  gespeichert:{ de: "Gespeichert", en: "Saved" },
  moderation:{ de: "Moderation",   en: "Moderation" },
  abmelden: { de: "Abmelden",      en: "Sign out" },
};

function AMRow({ label, icon, hover, mono, color, lang = "DE" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      padding: "9px 14px", cursor: "pointer",
      background: hover ? kiosk.color.paperSoft : "transparent",
      fontFamily: mono ? kiosk.font.mono : kiosk.font.display,
      fontSize: mono ? 11.5 : 13.5, fontWeight: mono ? 700 : 600,
      letterSpacing: mono ? "0.08em" : "-0.005em",
      color: color || kiosk.color.ink,
    }}>
      <span>{label[lang.toLowerCase()]}</span>
      <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, opacity: 0.55 }}>{icon}</span>
    </div>
  );
}

function AvatarMenu({ lang = "DE", admin = false, hoverIndex = -1 }) {
  return (
    <div style={{ position: "relative", width: 236 }}>
      {/* caret notch — points at the avatar */}
      <div style={{ position: "absolute", top: -7, right: 16, width: 12, height: 12, background: kiosk.color.paper, border: kiosk.border.ink, borderRight: "none", borderBottom: "none", transform: "rotate(45deg)" }} />
      <div style={{ background: kiosk.color.paper, border: kiosk.border.ink, borderRadius: kiosk.r.md, boxShadow: kiosk.shadow.print(), overflow: "hidden", position: "relative" }}>
        {/* who-am-i header */}
        <div style={{ padding: "12px 14px 10px", borderBottom: `1px dashed ${kiosk.color.rule}`, background: kiosk.color.paperWarm }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: "-0.01em" }}>Emre Aydın</div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.08em", marginTop: 2 }}>@emre · {lang === "DE" ? "IM KIEZ SEIT 2019" : "IN THE KIEZ SINCE 2019"}</div>
        </div>
        <div style={{ padding: "6px 0" }}>
          <AMRow label={AM_L.profil} icon="→" lang={lang} hover={hoverIndex === 0} />
          <AMRow label={AM_L.beitraege} icon="12" lang={lang} hover={hoverIndex === 1} />
          <AMRow label={AM_L.gespeichert} icon="◈ 7" lang={lang} hover={hoverIndex === 2} />
        </div>
        {admin && (
          <div style={{ borderTop: `1px dashed ${kiosk.color.rule}`, padding: "6px 0" }}>
            <AMRow label={AM_L.moderation} icon="● 5" lang={lang} color={kiosk.color.plum} hover={hoverIndex === 3} />
          </div>
        )}
        <div style={{ borderTop: `1.5px solid ${kiosk.color.ink}`, padding: "6px 0", background: kiosk.color.paperWarm }}>
          <AMRow label={AM_L.abmelden} icon="⏻" mono color={kiosk.color.wine} lang={lang} hover={hoverIndex === 4} />
        </div>
      </div>
    </div>
  );
}

function AvatarMenuDesktop({ lang = "DE", admin = false }) {
  return (
    <div style={{ width: 1280, height: 540, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <div style={paperGrainStyle} />
      <KioskNav active="Forum" lang={lang} />
      {/* page behind stays fully live — no scrim, the menu is light */}
      <div style={{ opacity: 0.5, pointerEvents: "none" }}>
        <ForumTitleBlock lang={lang} />
      </div>
      <div style={{ position: "absolute", top: 74, right: 36, zIndex: 6 }}>
        <AvatarMenu lang={lang} admin={admin} hoverIndex={admin ? 3 : 4} />
      </div>
      <KioskAnnotate top={96} right={300} color={kiosk.color.ochre} rotate={-1.5}>
        klick auf EA-avatar öffnet · stamp-in 220ms SETTLE, transform-origin oben rechts · print-schatten, kein blur
      </KioskAnnotate>
      <KioskAnnotate top={admin ? 380 : 330} right={300} color={kiosk.color.wine} rotate={1}>
        „{lang === "DE" ? "Abmelden" : "Sign out"}“ immer als WORT, nie nur icon · wein + mono · eigener fuß-slot hinter ink-rule — nicht verwechselbar mit navigation
      </KioskAnnotate>
      {admin && (
        <KioskAnnotate top={300} right={300} color="#d8c7de" rotate={-1}>
          nur bei role==='admin': Moderation-slot in pflaume, mit queue-count · für alle anderen existiert die zeile nicht
        </KioskAnnotate>
      )}
      <KioskAnnotate bottom={24} left={36} color={kiosk.color.paperWarm} rotate={0}>
        schließen: ESC · klick außerhalb · routenwechsel · tastatur ↑↓ + enter, fokus kehrt zum avatar zurück · reduced-motion: sofort, ohne stamp-in
      </KioskAnnotate>
    </div>
  );
}

// Mobile Konto card — Gefahrenzone COLLAPSED by default (thumb-zone safety):
// Abmelden is routine, delete is once-ever; they never share a visual group on mobile.
function AMDangerFold({ lang = "DE", open = false }) {
  return (
    <div style={{ marginTop: 12, borderTop: `1.5px dashed ${kiosk.color.rule}` }}>
      <div style={{ padding: "13px 0", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.danger, letterSpacing: "0.14em" }}>{lang === "DE" ? "GEFAHRENZONE" : "DANGER ZONE"}</span>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.danger }}>{open ? "▾" : "▸"}</span>
      </div>
      {open && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 4 }}>
          <span style={{ fontFamily: kiosk.font.display, fontSize: 12.5, color: kiosk.color.inkSoft }}>{lang === "DE" ? "Konto dauerhaft löschen" : "Delete account permanently"}</span>
          <PBtn danger small>{lang === "DE" ? "löschen …" : "delete …"}</PBtn>
        </div>
      )}
    </div>
  );
}

function AMKontoMobileCard({ lang = "DE", open = false }) {
  return (
    <PCard>
      <PCardHead n="03" de="Konto" en="Account" lang={lang} />
      <PKontoRow label="E-MAIL" value={SEED_ME.email} action={lang === "DE" ? "ändern" : "change"} lang={lang} />
      <div style={{ marginTop: 14 }}>
        <PBtn small>{lang === "DE" ? "Abmelden" : "Log out"}</PBtn>
      </div>
      <AMDangerFold lang={lang} open={open} />
    </PCard>
  );
}

function AvatarMenuMobile({ lang = "DE" }) {
  return (
    <div style={{ width: 390, height: 700, boxSizing: "border-box", background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: "18px 16px" }}>
      <div style={paperGrainStyle} />
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.14em", marginBottom: 10 }}>
        {lang === "DE" ? "MOBIL · KEIN DROPDOWN · ZUSTAND 01 · ZU (DEFAULT)" : "MOBILE · NO DROPDOWN · STATE 01 · CLOSED (DEFAULT)"}
      </div>
      <AMKontoMobileCard lang={lang} open={false} />
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.14em", margin: "18px 0 10px" }}>
        {lang === "DE" ? "ZUSTAND 02 · AUFGEKLAPPT" : "STATE 02 · EXPANDED"}
      </div>
      <AMKontoMobileCard lang={lang} open={true} />
      <KioskAnnotate bottom={16} left={16} color={kiosk.color.ochre} rotate={-1}>
        mobil bleibt „Abmelden“ in der Konto-Karte (§03) · Gefahrenzone ist ZU per default — ein bewusster tap trennt routine (abmelden) von endgültig (löschen) · disclosure-zeile ≥ 44px · desktop bleibt offen (cursor-präzision + modal reichen)
      </KioskAnnotate>
    </div>
  );
}

Object.assign(window, { AvatarMenu, AvatarMenuDesktop, AvatarMenuMobile, AMKontoMobileCard, AMDangerFold });

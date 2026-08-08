/* global React */
// ══════════════════════════════════════════════════════════
//  TOUR PASS · „Die Führung“ (Gebrauchsanweisung) · Aug 6 2026
//  DECIDED: spotlight tour instead of the three explore
//  metaphors. Per-surface CHAPTERS (never cross a nav) ·
//  hello modal on first sign-in · restart via avatar menu ·
//  tour rides alone (no checklist/straps in v1, CC vote).
//  Storage: tours?: { forum?: Date, … } + tourHelloDismissedAt.
//  This file: forum-page mock + spotlight atoms + hello modal
//  + the 7-stop Forum chapter (desktop DE/EN + mobile).
// ══════════════════════════════════════════════════════════

const { kiosk: TR, paperGrainStyle: TR_grain, kioskFonts: TR_fonts, KioskAnnotate: TRNote } = window;
const TR_OCHRE_DEEP = "#b07515";

const TR_L = {
  DE: {
    nav: ["Forum", "Kalender", "Markt", "Kurier", "Kiez-Daten", "Blog"],
    chips: ["Alle", "Diskussionen", "Ankündigungen", "Empfehlungen", "Gespeichert", "Meine"],
    newTopic: "+ Neues Thema", search: "Forum durchsuchen…", kicker: "FÜHRUNG · FORUM",
    back: "← zurück", next: "weiter →", done: "Fertig ✓", nextCh: "Nächstes Kapitel: Kalender →",
    helloKicker: "WILLKOMMEN IM KIEZ", helloTitle: <span>Schön, dass du <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontWeight: 400, color: "#b07515" }}>da</span> bist, Emre.</span>,
    helloBody: "Kurze Führung durchs Forum? Sieben Stationen, ungefähr eine Minute. Du kannst jederzeit abbrechen — und sie später beliebig oft neu starten.",
    helloStart: "Führung starten →", helloLater: "Später vielleicht",
    helloFoot: "ERSCHEINT EINMAL · DANACH: AVATAR-MENÜ → „FÜHRUNG STARTEN“",
  },
  EN: {
    nav: ["Forum", "Calendar", "Market", "Courier", "Kiez Data", "Blog"],
    chips: ["All", "Discussions", "Announcements", "Recommendations", "Saved", "Mine"],
    newTopic: "+ New topic", search: "Search the forum…", kicker: "TOUR · FORUM",
    back: "← back", next: "next →", done: "Done ✓", nextCh: "Next chapter: Calendar →",
    helloKicker: "WELCOME TO THE KIEZ", helloTitle: <span>Good to have you <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontWeight: 400, color: "#b07515" }}>here</span>, Emre.</span>,
    helloBody: "A quick tour of the forum? Seven stops, about a minute. You can leave any time — and restart it as often as you like.",
    helloStart: "Start the tour →", helloLater: "Maybe later",
    helloFoot: "SHOWN ONCE · AFTER THAT: AVATAR MENU → “START TOUR”",
  },
};
const TR_STOPS = {
  DE: [
    { t: "Diskussionen", b: "Fragen, Gespräche, Kiez-Themen — hier landet, was Nachbar:innen gerade beschäftigt. Der Filter zeigt nur diese Beiträge." },
    { t: "Ankündigungen", b: "Offizielle Mitteilungen vom Team — in Teal, manchmal angepinnt. Selten, aber wichtig." },
    { t: "Empfehlungen", b: "Tipps aus der Nachbarschaft: Läden, Ärzt:innen, Ecken. Das Gedächtnis des Kiezes." },
    { t: "Gespeichert", b: "Alles, was du mit ◈ markierst, wartet hier — nichts geht verloren." },
    { t: "Meine", b: "Deine eigenen Beiträge und ihr Status — auch die, die gerade noch geprüft werden." },
    { t: "Tags", b: "Ein Klick auf einen Tag filtert den Kiez nach diesem Thema. Noch ein Klick auf denselben Tag — und alles kommt zurück." },
    { t: "Neues Thema", b: "Wenn du so weit bist: dein erster Beitrag. Eine „Hallo Kiez“-Vorlage liegt bereit — er wird kurz geprüft und ist meist in Minuten sichtbar." },
  ],
  EN: [
    { t: "Discussions", b: "Questions, conversations, Kiez topics — whatever neighbors are talking about right now. The filter shows only these posts." },
    { t: "Announcements", b: "Official notes from the team — in teal, sometimes pinned. Rare, but important." },
    { t: "Recommendations", b: "Tips from the neighborhood: shops, doctors, corners. The Kiez’s memory." },
    { t: "Saved", b: "Everything you mark with ◈ waits here — nothing gets lost." },
    { t: "Mine", b: "Your own posts and their status — including the ones still being reviewed." },
    { t: "Tags", b: "One click on a tag filters the Kiez by that topic. Click the same tag again — and everything comes back." },
    { t: "New topic", b: "When you’re ready: your first post. A “Hello Kiez” template is waiting — it gets a quick review and is usually visible within minutes." },
  ],
};

// ── spotlight atoms ───────────────────────────────────────
function TRRing() {
  return <span style={{ position: "absolute", inset: -6, borderRadius: 999, border: `2.5px solid ${TR.color.ochre}`, boxShadow: `0 0 0 4px ${TR.color.ochre}33`, pointerEvents: "none" }} />;
}
function TRTip({ lang, stop, align = "left", end }) {
  const L = TR_L[lang]; const s = TR_STOPS[lang][stop]; const total = 7;
  return (
    <div style={{ position: "absolute", top: "calc(100% + 16px)", [align]: -6, width: 380, background: TR.color.paperWarm, border: TR.border.inkBold, borderTop: `4px solid ${TR.color.ochre}`, borderRadius: TR.r.md, boxShadow: TR.shadow.print(TR.color.ochre), padding: "14px 18px 12px", zIndex: 40, fontFamily: TR.font.display, textAlign: "left", whiteSpace: "normal", cursor: "default" }}>
      <span style={{ position: "absolute", top: -11, [align]: 26, width: 14, height: 14, background: TR.color.ochre, borderLeft: TR.border.ink, borderTop: TR.border.ink, transform: "rotate(45deg)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: TR.font.mono, fontSize: 9, letterSpacing: "0.18em", color: TR_OCHRE_DEEP, fontWeight: 700 }}>{L.kicker}</span>
        <span style={{ fontFamily: TR.font.mono, fontSize: 12, color: TR.color.inkMute, lineHeight: 1 }}>✕</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.015em", margin: "6px 0 4px", color: TR.color.ink }}>{s.t}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: TR.color.inkSoft }}>{s.b}</div>
      {end && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, padding: "8px 10px", background: `${TR.color.moss}14`, border: `1.5px solid ${TR.color.moss}`, borderRadius: TR.r.sm }}>
          <span style={{ width: 40, height: 40, borderRadius: 999, border: `2px solid ${TR.color.moss}`, color: TR.color.moss, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: TR.font.mono, transform: "rotate(-8deg)", flexShrink: 0 }}><span style={{ fontSize: 12 }}>✓</span><span style={{ fontSize: 5.5, letterSpacing: "0.06em" }}>KAPITEL</span></span>
          <span style={{ fontSize: 11.5, color: TR.color.inkSoft, lineHeight: 1.4 }}>{lang === "DE" ? "Das war das Forum. Die anderen Bereiche haben eigene, kürzere Kapitel." : "That was the forum. The other areas have their own, shorter chapters."}</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, borderTop: `1px dashed ${TR.color.rule}`, paddingTop: 10 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: total }).map((_, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: 999, background: i === stop ? TR.color.ochre : "transparent", border: `1.5px solid ${i <= stop ? TR.color.ochre : TR.color.rule}` }} />)}
        </div>
        <span style={{ fontFamily: TR.font.mono, fontSize: 10, color: TR.color.inkMute }}>{stop + 1} / {total}</span>
        <span style={{ marginLeft: "auto", fontFamily: TR.font.mono, fontSize: 11, color: TR.color.inkMute, textDecoration: "underline", textUnderlineOffset: 3 }}>{stop > 0 ? L.back : ""}</span>
        <span style={{ padding: "6px 14px", borderRadius: TR.r.sm, background: TR.color.ink, color: TR.color.paper, fontSize: 12, fontWeight: 700 }}>{end ? L.done : L.next}</span>
      </div>
      {end && <div style={{ fontFamily: TR.font.mono, fontSize: 9.5, color: TR_OCHRE_DEEP, marginTop: 8, textDecoration: "underline", textUnderlineOffset: 3 }}>{L.nextCh}</div>}
    </div>
  );
}
function TRAnchor({ active, children, lang, stop, align, end }) {
  return (
    <span style={{ position: "relative", display: "inline-block", zIndex: active ? 30 : "auto", whiteSpace: "nowrap" }}>
      {children}
      {active && <TRRing />}
      {active && <TRTip lang={lang} stop={stop} align={align} end={end} />}
    </span>
  );
}

// ── forum page mock (simplified but faithful chrome) ──────
function TRChip({ label, active, spot, lang, stop, end }) {
  const inner = <span style={{ display: "inline-block", fontFamily: TR.font.mono, fontSize: 11.5, padding: "6px 14px", borderRadius: 999, border: `1.5px solid ${TR.color.ink}`, background: active ? TR.color.ink : TR.color.paperWarm, color: active ? TR.color.paper : TR.color.ink, fontWeight: active ? 700 : 400 }}>{label}</span>;
  return spot != null ? <TRAnchor active lang={lang} stop={spot} end={end}>{inner}</TRAnchor> : inner;
}
function TRCard({ strap, strapColor, title, body, meta }) {
  return (
    <div style={{ background: TR.color.paperWarm, border: TR.border.ink, borderRadius: TR.r.lg, padding: "16px 20px", boxShadow: TR.shadow.printSm() }}>
      <span style={{ fontFamily: TR.font.mono, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", color: TR.color.paper, background: strapColor, padding: "3px 9px", borderRadius: 4 }}>{strap}</span>
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.015em", margin: "8px 0 4px" }}>{title}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: TR.color.inkSoft }}>{body}</div>
      <div style={{ fontFamily: TR.font.mono, fontSize: 10, color: TR.color.inkMute, marginTop: 8 }}>{meta}</div>
    </div>
  );
}
function TRForumPage({ lang = "DE", stop = null, scrim = false, children }) {
  const L = TR_L[lang];
  const chipStops = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
  return (
    <div style={{ width: 1280, height: 900, boxSizing: "border-box", background: TR.color.paper, color: TR.color.ink, fontFamily: TR.font.display, position: "relative", overflow: "hidden" }}>
      <style>{TR_fonts}</style>
      <div style={TR_grain} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "16px 48px", borderBottom: `1.5px solid ${TR.color.ink}` }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>Mahalle<span style={{ color: TR.color.wine }}>.</span></span>
          <span style={{ display: "flex", gap: 18, fontFamily: TR.font.mono, fontSize: 11 }}>{L.nav.map((n, i) => <span key={n} style={{ fontWeight: i === 0 ? 700 : 400, borderBottom: i === 0 ? `2px solid ${TR.color.wine}` : "none", paddingBottom: 2 }}>{n}</span>)}</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontFamily: TR.font.mono, fontSize: 10.5, display: "flex", gap: 5 }}><span style={{ padding: "2px 8px", background: TR.color.ink, color: TR.color.paper, borderRadius: 999 }}>DE</span><span style={{ padding: "2px 8px", border: `1.5px solid ${TR.color.ink}`, borderRadius: 999 }}>EN</span></span>
            <span style={{ width: 34, height: 34, borderRadius: 999, background: TR.color.wine, color: TR.color.paper, border: TR.border.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TR.font.mono, fontSize: 12, fontWeight: 700 }}>EA</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "30px 48px 0" }}>
          <h1 style={{ fontSize: 54, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: 0 }}>Das <span style={{ fontFamily: TR.font.serif, fontStyle: "italic", fontWeight: 400, color: TR.color.wine }}>Forum</span></h1>
          <TRAnchor active={stop === 6} lang={lang} stop={6} align="right" end>
            <span style={{ display: "inline-block", padding: "11px 22px", borderRadius: TR.r.md, background: TR.color.wine, color: TR.color.paper, border: TR.border.ink, fontWeight: 700, fontSize: 14, boxShadow: TR.shadow.printSm() }}>{L.newTopic}</span>
          </TRAnchor>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "22px 48px 0", flexWrap: "wrap" }}>
          {L.chips.map((c, i) => <TRChip key={c} label={c} active={i === 0} spot={stop === chipStops[i] ? chipStops[i] : null} lang={lang} />)}
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, background: TR.color.paperSoft, border: `1px solid ${TR.color.rule}`, borderRadius: TR.r.md, padding: "8px 14px", fontSize: 12.5, color: TR.color.inkMute }}>⌕ {L.search}</span>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", padding: "14px 48px 0" }}>
          <span style={{ fontFamily: TR.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: TR.color.inkMute }}>TAGS</span>
          {["#flohmarkt", "#kinder", "#garten", "#kultur", "#hilfe"].map((t, i) => (
            i === 0
              ? <TRAnchor key={t} active={stop === 5} lang={lang} stop={5}><span style={{ display: "inline-block", fontFamily: TR.font.mono, fontSize: 10.5, padding: "3px 11px", borderRadius: 999, border: `1.5px solid ${TR.color.ink}`, background: TR.color.paperWarm }}>{t}</span></TRAnchor>
              : <span key={t} style={{ fontFamily: TR.font.mono, fontSize: 10.5, padding: "3px 11px", borderRadius: 999, border: `1.5px solid ${TR.color.ink}`, background: TR.color.paperWarm }}>{t}</span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, padding: "22px 48px" }}>
          <TRCard strap={lang === "DE" ? "DISKUSSION" : "DISCUSSION"} strapColor={TR.color.wine} title={lang === "DE" ? "Wer kennt einen guten Fahrradladen am Feld?" : "Anyone know a good bike shop near the Feld?"} body={lang === "DE" ? "Meins braucht neue Bremsen und ich will nicht bis Kreuzberg…" : "Mine needs new brakes and I don’t want to go all the way to Kreuzberg…"} meta="LENA B. · VOR 2 STD · 6 ANTWORTEN" />
          <TRCard strap={lang === "DE" ? "EMPFEHLUNG" : "RECOMMENDATION"} strapColor={TR.color.moss} title={lang === "DE" ? "Die neue Bäckerei auf der Okerstraße" : "The new bakery on Okerstraße"} body={lang === "DE" ? "Sauerteig wie früher. Sagt, dass Mahalle euch schickt." : "Sourdough like it used to be. Tell them Mahalle sent you."} meta="ADEM D. · GESTERN · 14 ♥" />
        </div>
        {scrim && <div style={{ position: "absolute", inset: 0, background: "rgba(27,26,23,0.5)", zIndex: 20 }} />}
        {children}
      </div>
    </div>
  );
}

// ── artboard exports ──────────────────────────────────────
function TourHelloDesktop({ lang = "DE" }) {
  const L = TR_L[lang];
  return (
    <TRForumPage lang={lang} scrim>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
        <div style={{ width: 520, background: TR.color.paperWarm, border: TR.border.inkBold, borderTop: `4px solid ${TR.color.ochre}`, borderRadius: TR.r.lg, boxShadow: TR.shadow.print(TR.color.ochre), padding: "30px 36px 24px", position: "relative" }}>
          <div style={{ fontFamily: TR.font.mono, fontSize: 10, letterSpacing: "0.22em", color: TR_OCHRE_DEEP, fontWeight: 700 }}>{L.helloKicker}</div>
          <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "10px 0 12px" }}>{L.helloTitle}</h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, color: TR.color.inkSoft, margin: 0 }}>{L.helloBody}</p>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 20 }}>
            <span style={{ padding: "11px 22px", borderRadius: TR.r.md, background: TR.color.ink, color: TR.color.paper, fontWeight: 700, fontSize: 14 }}>{L.helloStart}</span>
            <span style={{ fontFamily: TR.font.mono, fontSize: 12, color: TR.color.inkMute, textDecoration: "underline", textUnderlineOffset: 3 }}>{L.helloLater}</span>
          </div>
          <div style={{ fontFamily: TR.font.mono, fontSize: 8.5, letterSpacing: "0.1em", color: TR.color.inkMute, marginTop: 18, borderTop: `1px dashed ${TR.color.rule}`, paddingTop: 10 }}>{L.helloFoot}</div>
          <span style={{ position: "absolute", top: 14, right: 16, fontFamily: TR.font.mono, fontSize: 13, color: TR.color.inkMute }}>✕</span>
        </div>
      </div>
      <TRNote top={90} right={40} rotate={1.5}>„Später“ + ✕ schreiben tourHelloDismissedAt — Modal kommt nie wieder. Die Führung bleibt über das Avatar-Menü erreichbar, beliebig oft.</TRNote>
    </TRForumPage>
  );
}
function TourStopDesktop({ lang = "DE", stop = 0 }) {
  return <TRForumPage lang={lang} stop={stop} scrim />;
}

// ── mobile ────────────────────────────────────────────────
function TRMobileShell({ children, scrim }) {
  return (
    <div style={{ width: 390, height: 844, boxSizing: "border-box", background: TR.color.paper, color: TR.color.ink, fontFamily: TR.font.display, position: "relative", overflow: "hidden" }}>
      <style>{TR_fonts}</style>
      <div style={TR_grain} />
      <div style={{ position: "relative", height: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1.5px solid ${TR.color.ink}` }}>
          <span style={{ fontSize: 17, fontWeight: 800 }}>Mahalle<span style={{ color: TR.color.wine }}>.</span></span>
          <span style={{ width: 30, height: 30, borderRadius: 999, background: TR.color.wine, color: TR.color.paper, border: TR.border.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TR.font.mono, fontSize: 10.5, fontWeight: 700 }}>EA</span>
        </div>
        {children}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-around", padding: "12px 0 22px", borderTop: `1.5px solid ${TR.color.ink}`, background: TR.color.paperWarm, fontFamily: TR.font.mono, fontSize: 9, zIndex: 25 }}>
          {["FORUM", "KALENDER", "MARKT", "KURIER", "MEHR"].map((n, i) => <span key={n} style={{ fontWeight: i === 0 ? 700 : 400, color: i === 0 ? TR.color.wine : TR.color.inkMute }}>{n}</span>)}
        </div>
        {scrim && <div style={{ position: "absolute", inset: 0, background: "rgba(27,26,23,0.5)", zIndex: 20 }} />}
      </div>
    </div>
  );
}
function TourStopMobile({ lang = "DE" }) {
  const L = TR_L[lang]; const s = TR_STOPS[lang][5];
  return (
    <TRMobileShell scrim>
      <div style={{ padding: "20px 18px 0" }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Das <span style={{ fontFamily: TR.font.serif, fontStyle: "italic", fontWeight: 400, color: TR.color.wine }}>Forum</span></h1>
        <div style={{ display: "flex", gap: 6, marginTop: 14, overflow: "hidden" }}>
          {L.chips.slice(0, 4).map((c, i) => <span key={c} style={{ fontFamily: TR.font.mono, fontSize: 10.5, padding: "8px 13px", borderRadius: 999, border: `1.5px solid ${TR.color.ink}`, background: i === 0 ? TR.color.ink : TR.color.paperWarm, color: i === 0 ? TR.color.paper : TR.color.ink, whiteSpace: "nowrap" }}>{c}</span>)}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12, alignItems: "center", position: "relative" }}>
          <span style={{ position: "relative", display: "inline-block", zIndex: 30 }}>
            <span style={{ display: "inline-block", fontFamily: TR.font.mono, fontSize: 10.5, padding: "7px 13px", borderRadius: 999, border: `1.5px solid ${TR.color.ink}`, background: TR.color.paperWarm }}>#flohmarkt</span>
            <TRRing />
          </span>
          {["#kinder", "#garten", "#kultur"].map((t) => <span key={t} style={{ fontFamily: TR.font.mono, fontSize: 10.5, padding: "7px 13px", borderRadius: 999, border: `1.5px solid ${TR.color.ink}`, background: TR.color.paperWarm }}>{t}</span>)}
        </div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <TRCard strap="DISKUSSION" strapColor={TR.color.wine} title="Wer kennt einen guten Fahrradladen?" body="Meins braucht neue Bremsen…" meta="LENA B. · VOR 2 STD" />
        </div>
      </div>
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 78, background: TR.color.paperWarm, border: TR.border.inkBold, borderTop: `4px solid ${TR.color.ochre}`, borderRadius: TR.r.md, boxShadow: TR.shadow.print(TR.color.ochre), padding: "14px 16px 12px", zIndex: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: TR.font.mono, fontSize: 9, letterSpacing: "0.18em", color: TR_OCHRE_DEEP, fontWeight: 700 }}>{L.kicker}</span>
          <span style={{ fontFamily: TR.font.mono, fontSize: 13, color: TR.color.inkMute, width: 44, height: 24, textAlign: "right" }}>✕</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, margin: "4px 0 4px" }}>{s.t}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: TR.color.inkSoft }}>{s.b}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, borderTop: `1px dashed ${TR.color.rule}`, paddingTop: 10 }}>
          <span style={{ fontFamily: TR.font.mono, fontSize: 10, color: TR.color.inkMute }}>6 / 7</span>
          <span style={{ marginLeft: "auto", fontFamily: TR.font.mono, fontSize: 12, color: TR.color.inkMute, textDecoration: "underline", textUnderlineOffset: 3, padding: "10px 6px" }}>{L.back}</span>
          <span style={{ padding: "11px 18px", borderRadius: TR.r.sm, background: TR.color.ink, color: TR.color.paper, fontSize: 13, fontWeight: 700 }}>{L.next}</span>
        </div>
      </div>
    </TRMobileShell>
  );
}
function TourHelloMobile({ lang = "DE" }) {
  const L = TR_L[lang];
  return (
    <TRMobileShell scrim>
      <div style={{ padding: "20px 18px 0" }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Das <span style={{ fontFamily: TR.font.serif, fontStyle: "italic", fontWeight: 400, color: TR.color.wine }}>Forum</span></h1>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: TR.color.paperWarm, borderTop: TR.border.inkBold, borderRadius: `${TR.r.xl}px ${TR.r.xl}px 0 0`, boxShadow: TR.shadow.print(TR.color.ochre), padding: "10px 22px 30px", zIndex: 40 }}>
        <div style={{ width: 44, height: 4, borderRadius: 999, background: TR.color.rule, margin: "0 auto 16px" }} />
        <div style={{ fontFamily: TR.font.mono, fontSize: 9.5, letterSpacing: "0.2em", color: TR_OCHRE_DEEP, fontWeight: 700 }}>{L.helloKicker}</div>
        <h2 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "8px 0 10px" }}>{L.helloTitle}</h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: TR.color.inkSoft, margin: 0 }}>{L.helloBody}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
          <span style={{ padding: "14px 0", borderRadius: TR.r.md, background: TR.color.ink, color: TR.color.paper, fontWeight: 700, fontSize: 14.5, textAlign: "center" }}>{L.helloStart}</span>
          <span style={{ padding: "12px 0", fontFamily: TR.font.mono, fontSize: 12, color: TR.color.inkMute, textAlign: "center", textDecoration: "underline", textUnderlineOffset: 3 }}>{L.helloLater}</span>
        </div>
      </div>
    </TRMobileShell>
  );
}

Object.assign(window, { TourHelloDesktop, TourStopDesktop, TourHelloMobile, TourStopMobile, TRTip, TRRing, TR_L, TR_STOPS });

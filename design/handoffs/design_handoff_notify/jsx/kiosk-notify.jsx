/* global React, kiosk, kioskFonts, paperGrainStyle, ForumTitleBlock, KioskAnnotate */
// ══════════════════════════════════════════════════════════
//  MITTEILUNGEN · Notification panel (Aug 19 2026)
//  Chrome addendum, sibling of the avatar menu. Bell in the
//  KioskNav right cluster; desktop dropdown / mobile sheet.
//  Locked (user, Aug 19 2026): bell-in-disc · wine counter 9+ ·
//  hybrid type accents (nur Moderation plum + Amtlich teal) ·
//  Kurier-Verblassen + ink-Kante für frisch · Mono-Kopf + Ink-
//  Rule · warm-kiezige Leere · Fuß-Slot jetzt reserviert ·
//  KEINE Motion an Glocke/Badge.
// ══════════════════════════════════════════════════════════

// NC_L = i18n-Quelle. Wandert 1:1 nach kiosk-i18n unter nc.* (Basis-Copy dort überschreiben).
// tpl-Interpolation: {actor} {title} {n}. DE-Artikel je contentType (Thema/Empfehlung/Kommentar…)
// als Key-Varianten lösen (nc.comment.topic …) — die Vorlagen hier sind die Topic-Kanonik.
const NC_L = {
  head: { de: "MITTEILUNGEN", en: "NOTIFICATIONS" },
  neu: { de: "NEU", en: "NEW" },
  empty: { de: "Alles gelesen — der Kiez meldet sich, wenn's was Neues gibt.", en: "All caught up — the kiez will let you know when there's news." },
  tpl: {
    comment: { de: "{actor} hat auf dein Thema geantwortet: ‚{title}‘", en: "{actor} replied to your topic ‘{title}’" },
    market_contact: { de: "Neue Anfrage zu deinem Angebot ‚{title}‘", en: "New inquiry about your listing ‘{title}’" }, // KEIN {actor} — Käufer ist per Spec anonym
    moderation_approved: { de: "Dein Beitrag ‚{title}‘ ist veröffentlicht", en: "Your post ‘{title}’ is published" },
    moderation_warned: { de: "Dein Beitrag ‚{title}‘ ist veröffentlicht — mit Hinweis. Details in deinem Profil", en: "Your post ‘{title}’ is published — with a note. Details in your profile" },
    moderation_rejected: { de: "Dein Beitrag wurde abgelehnt — {n}. Verwarnung. Details in deinem Profil", en: "Your post was rejected — warning no. {n}. Details in your profile" },
    official: { de: "Amtliche Mitteilung: {title}", en: "Official notice: {title}" },
  },
};

const NC_ROWS = [
  { g: "✎", c: null, fresh: true, time: { de: "vor 5 Min.", en: "5 min ago" }, de: "Lena hat auf dein Thema geantwortet: ‚Rattenproblem Oderstraße‘", en: "Lena replied to your topic ‘Rat problem Oderstraße’" },
  { g: "⇄", c: null, fresh: true, time: { de: "vor 40 Min.", en: "40 min ago" }, de: "Neue Anfrage zu deinem Angebot ‚Kinderfahrrad 20 Zoll‘", en: "New inquiry about your listing ‘Kids’ bike 20 inch’" },
  { g: "◉", c: "teal", fresh: true, time: { de: "vor 2 Std.", en: "2 hrs ago" }, de: "Amtliche Mitteilung: Wasserabsperrung Herrfurthstraße am 21. August", en: "Official notice: water shut-off on Herrfurthstraße, Aug 21" },
  { g: "§", c: "plum", fresh: false, time: { de: "gestern", en: "yesterday" }, de: "Dein Beitrag ‚Flohmarkt am Sonntag‘ ist veröffentlicht", en: "Your post ‘Flea market on Sunday’ is published" },
  { g: "✎", c: null, fresh: false, time: { de: "gestern", en: "yesterday" }, de: "Deniz hat auf dein Thema geantwortet: ‚Leihladen öffnet wieder‘", en: "Deniz replied to your topic ‘Lending shop reopens’" },
  { g: "§", c: "plum", fresh: false, time: { de: "vor 3 Tagen", en: "3 days ago" }, de: "Dein Kommentar wurde abgelehnt — 1. Verwarnung. Details in deinem Profil", en: "Your comment was rejected — 1st warning. Details in your profile" },
];

function NcBellGlyph({ size = 18, color = kiosk.color.ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.4c-3.3 0-4.9 2.5-4.9 5.9v3.5L5.3 16.1h13.4l-1.8-2.3v-3.5c0-3.4-1.6-5.9-4.9-5.9z" fill="none" stroke={color} strokeWidth="1.7" strokeLinejoin="round"></path>
      <path d="M9.7 18.6a2.3 2.3 0 004.6 0" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round"></path>
    </svg>
  );
}

// Bell-in-disc — Geschwister des Avatar-Discs (36px), Badge = Wein-Zähler, cap 9+.
function NcBell({ count = 0, size = 36 }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: kiosk.color.paperWarm, border: kiosk.border.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <NcBellGlyph size={size * 0.52} />
      </div>
      {count > 0 && (
        <div style={{ position: "absolute", top: -5, right: -6, minWidth: 17, height: 17, boxSizing: "border-box", padding: "0 4px", borderRadius: kiosk.r.pill, background: kiosk.color.wine, color: kiosk.color.paper, border: `1px solid ${kiosk.color.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0" }}>{count > 9 ? "9+" : count}</div>
      )}
    </div>
  );
}

// KioskNav-Replik mit Glocke im rechten Cluster (Schalter · Glocke · Avatar).
function NcNav({ active = "Forum", lang = "DE", count = 3 }) {
  return (
    <header style={{ padding: "20px 36px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 42, height: 42, background: kiosk.color.wine, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: kiosk.color.paper, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 26, border: kiosk.border.ink }}>m</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>mahalle</div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginTop: 2 }}>SCHILLERKIEZ · NEUKÖLLN</div>
        </div>
      </div>
      <nav style={{ display: "flex", gap: 4 }}>
        {["Forum","Kalender","News","Markt","Kiez","Blog"].map((n) => (
          <span key={n} style={{ padding: "6px 14px", fontSize: 13.5, fontWeight: 600, background: n === active ? kiosk.color.ink : "transparent", color: n === active ? kiosk.color.paper : kiosk.color.ink, border: kiosk.border.ink, borderRadius: kiosk.r.pill }}>{n}</span>
        ))}
      </nav>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", border: kiosk.border.ink, borderRadius: kiosk.r.pill, overflow: "hidden", fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600 }}>
          <span style={{ padding: "5px 10px", background: lang === "DE" ? kiosk.color.ink : "transparent", color: lang === "DE" ? kiosk.color.paper : kiosk.color.ink }}>DE</span>
          <span style={{ padding: "5px 10px", background: lang === "EN" ? kiosk.color.ink : "transparent", color: lang === "EN" ? kiosk.color.paper : kiosk.color.ink, borderLeft: kiosk.border.ink }}>EN</span>
        </div>
        <NcBell count={count} />
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: kiosk.color.ochre, border: kiosk.border.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>EA</div>
      </div>
    </header>
  );
}

// Eine Zeile. Frisch = volle Tinte + Ink-Kante (Zweitanker) · gelesen = verblasst (Kurier-Regel).
// Hybrid-Akzent NUR auf der Glyphe, nur wo das System spricht: Moderation plum · Amtlich teal.
function NcRow({ row, lang = "DE", hover = false, big = false }) {
  const l = lang.toLowerCase();
  const accent = row.c ? kiosk.color[row.c] : kiosk.color.ink;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: big ? "13px 16px 13px 13px" : "11px 14px 11px 11px", cursor: "pointer", background: hover ? kiosk.color.paperSoft : "transparent", borderLeft: row.fresh ? `3px solid ${kiosk.color.ink}` : "3px solid transparent", opacity: 1 }}>
      <span style={{ fontFamily: kiosk.font.mono, fontSize: big ? 15 : 13, lineHeight: 1, marginTop: 2, color: row.fresh ? accent : `${accent}`, opacity: row.fresh ? 1 : 0.45, width: 16, textAlign: "center", flexShrink: 0 }}>{row.g}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: kiosk.font.display, fontSize: big ? 13.5 : 12.5, fontWeight: row.fresh ? 600 : 500, lineHeight: 1.4, letterSpacing: "-0.005em", color: row.fresh ? kiosk.color.ink : kiosk.color.inkMute }}>{row[l]}</div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.08em", marginTop: 3, opacity: row.fresh ? 1 : 0.75 }}>{row.time[l]}</div>
      </div>
    </div>
  );
}

// Das Panel — Papier + Ink-Rand + Druckschatten, Geschwister des Avatar-Menüs. 324px.
function NcPanel({ lang = "DE", rows = NC_ROWS, empty = false, hoverIndex = -1, caretRight = 52, width = 324, showFoot = false }) {
  const l = lang.toLowerCase();
  const freshCount = empty ? 0 : rows.filter((r) => r.fresh).length;
  return (
    <div style={{ position: "relative", width }}>
      <div style={{ position: "absolute", top: -7, right: caretRight, width: 12, height: 12, background: kiosk.color.paper, border: kiosk.border.ink, borderRight: "none", borderBottom: "none", transform: "rotate(45deg)" }}></div>
      <div style={{ background: kiosk.color.paper, border: kiosk.border.ink, borderRadius: kiosk.r.md, boxShadow: kiosk.shadow.print(), overflow: "hidden", position: "relative" }}>
        {/* Kopf: Mono-Zeile + Ink-Rule (kein Strap — das Panel ist Chrome, keine Rubrik) */}
        <div style={{ padding: "11px 14px 9px", borderBottom: kiosk.border.ink, display: "flex", alignItems: "baseline", justifyContent: "space-between", background: kiosk.color.paperWarm }}>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: kiosk.color.ink }}>{NC_L.head[l]}</span>
          {freshCount > 0 && <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", color: kiosk.color.wine }}>{freshCount} {NC_L.neu[l]}</span>}
        </div>
        {empty ? (
          <div style={{ padding: "26px 22px 28px", textAlign: "center", fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 14.5, lineHeight: 1.5, color: kiosk.color.inkSoft }}>{NC_L.empty[l]}</div>
        ) : (
          <div>
            {rows.map((r, i) => (
              <div key={i} style={{ borderTop: i > 0 ? `1px dashed ${kiosk.color.rule}` : "none" }}>
                <NcRow row={r} lang={lang} hover={hoverIndex === i} />
              </div>
            ))}
          </div>
        )}
        {/* Fuß-Slot: strukturell reserviert (R2 Push-Opt-in). R1 rendert NICHTS — hier nur als Spec sichtbar. */}
        {showFoot && (
          <div style={{ borderTop: kiosk.border.ink, background: kiosk.color.paperWarm, padding: "10px 14px" }}>
            <div style={{ border: `1.5px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm, height: 34 }}></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Artboards ───────────────────────────────────────────

function NotifyDesktop({ lang = "DE" }) {
  return (
    <div style={{ width: 1280, height: 660, boxSizing: "border-box", background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <NcNav active="Forum" lang={lang} count={3} />
      <div style={{ opacity: 0.5, pointerEvents: "none" }}>
        <ForumTitleBlock lang={lang} />
      </div>
      <div style={{ position: "absolute", top: 76, right: 64, zIndex: 6 }}>
        <NcPanel lang={lang} hoverIndex={2} />
      </div>
      <KioskAnnotate top={98} right={410} color={kiosk.color.ochre} rotate={-1.5}>
        glocke = umriss-disc, geschwister des avatar-discs · badge wein, zähler capped „9+“ · KEINE motion — der zähler selbst ist die nachricht · öffnen: stamp-in 220ms SETTLE wie avatar-menü
      </KioskAnnotate>
      <KioskAnnotate top={278} right={410} color={kiosk.color.paperWarm} rotate={1}>
        kurier-verblassen: frisch = volle tinte + 3px ink-kante · gelesen = gedämpft, glyphe 45 % · öffnen markiert alles gelesen (PATCH) — in der offenen session bleibt frisch sichtbar markiert
      </KioskAnnotate>
      <KioskAnnotate top={452} right={410} color="#cfe0e4" rotate={-1}>
        hybrid-akzente nur auf der glyphe, nur wo das SYSTEM spricht: § moderation pflaume · ◉ amtlich teal · nachbarschaft (✎ antwort, ⇄ markt-anfrage) bleibt tinte
      </KioskAnnotate>
      <KioskAnnotate bottom={22} left={36} color={kiosk.color.paperWarm} rotate={0}>
        schließen: ESC · klick außerhalb · routenwechsel · fokus kehrt zur glocke zurück · ganze zeile = link zum ziel · texte client-seitig aus i18n (DE/EN wirkt rückwirkend) · fuß-slot für R2 push-opt-in strukturell reserviert, R1 rendert ihn nicht · styles .nc-* in global.css
      </KioskAnnotate>
    </div>
  );
}

function NotifyDesktopEmpty({ lang = "EN" }) {
  return (
    <div style={{ width: 1280, height: 480, boxSizing: "border-box", background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <div style={paperGrainStyle} />
      <NcNav active="Forum" lang={lang} count={0} />
      <div style={{ opacity: 0.5, pointerEvents: "none" }}>
        <ForumTitleBlock lang={lang} />
      </div>
      <div style={{ position: "absolute", top: 76, right: 64, zIndex: 6 }}>
        <NcPanel lang={lang} empty={true} />
      </div>
      <KioskAnnotate top={110} right={410} color={kiosk.color.ochre} rotate={-1}>
        null ungelesen = KEIN badge (nie „0“) · leere = eine warme zeile, serif kursiv — kein illustrations-theater
      </KioskAnnotate>
    </div>
  );
}

function NotifyMobile({ lang = "DE", empty = false }) {
  const l = lang.toLowerCase();
  return (
    <div style={{ width: 390, height: 844, boxSizing: "border-box", background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <div style={paperGrainStyle} />
      {/* Mobile top bar: m-disc · glocke · avatar */}
      <header style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, background: kiosk.color.wine, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: kiosk.color.paper, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 21, border: kiosk.border.ink }}>m</div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>mahalle</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <NcBell count={empty ? 0 : 3} size={36} />
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: kiosk.color.ochre, border: kiosk.border.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700 }}>EA</div>
        </div>
      </header>
      {/* Seiteninhalt gedimmt */}
      <div style={{ padding: "18px 16px", opacity: 0.6 }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.12em" }}>FORUM · {lang === "DE" ? "MITTWOCH 25. APRIL" : "WEDNESDAY APRIL 25"}</div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "8px 0 14px" }}>{lang === "DE" ? "Was reden wir heute?" : "What are we talking about?"}</div>
        {[0, 1].map((i) => (
          <div key={i} style={{ border: kiosk.border.ink, borderRadius: kiosk.r.md, background: kiosk.color.paperWarm, padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ width: "62%", height: 11, background: `${kiosk.color.ink}22`, borderRadius: 4 }}></div>
            <div style={{ width: "88%", height: 8, background: `${kiosk.color.ink}14`, borderRadius: 4, marginTop: 8 }}></div>
            <div style={{ width: "74%", height: 8, background: `${kiosk.color.ink}14`, borderRadius: 4, marginTop: 6 }}></div>
          </div>
        ))}
      </div>
      {/* Scrim + Bottom-Sheet — mechanik-geschwister der tour-sheets */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(27,26,23,0.5)", zIndex: 8 }}></div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 9, background: kiosk.color.paper, borderTop: kiosk.border.ink, borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 44, height: 4, borderRadius: 999, background: `${kiosk.color.ink}40` }}></div>
        </div>
        <div style={{ padding: "4px 16px 10px", borderBottom: kiosk.border.ink, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em" }}>{NC_L.head[l]}</span>
          {!empty && <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: kiosk.color.wine }}>3 {NC_L.neu[l]}</span>}
        </div>
        {empty ? (
          <div style={{ padding: "26px 24px 24px", textAlign: "center", fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, lineHeight: 1.5, color: kiosk.color.inkSoft }}>{NC_L.empty[l]}</div>
        ) : (
          NC_ROWS.slice(0, 5).map((r, i) => (
            <div key={i} style={{ borderTop: i > 0 ? `1px dashed ${kiosk.color.rule}` : "none" }}>
              <NcRow row={r} lang={lang} big={true} />
            </div>
          ))
        )}
        <div style={{ height: 14 }}></div>
      </div>
      <KioskAnnotate top={120} left={16} color={kiosk.color.ochre} rotate={-1.5}>
        {empty ? "leer auch im sheet: EINE warme zeile, serif kursiv · kein badge bei 0 · fuß-slot bleibt auch mobil reservierte freie zone" : "mobil: bottom-sheet über scrim — gleiche mechanik wie tour-sheets · schließen: scrim-tap · wischen nach unten · zeilen ≥ 44px (13px padding + 2-zeilen-körper) · glocke bleibt in der top-bar, badge identisch"}
      </KioskAnnotate>
    </div>
  );
}

// ─── Spez-Board ──────────────────────────────────────────

function NcSpecCard({ n, t, children, span }) {
  return (
    <section style={{ background: kiosk.color.paperWarm, border: kiosk.border.ink, borderRadius: kiosk.r.md, padding: "14px 16px", gridColumn: span ? `span ${span}` : undefined }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, borderBottom: `1px dashed ${kiosk.color.rule}`, paddingBottom: 6, marginBottom: 12 }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.15em" }}>§{n}</span>
        <h3 style={{ fontSize: 15.5, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>{t}</h3>
      </div>
      {children}
    </section>
  );
}

function NcSpecNote({ children }) {
  return <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, lineHeight: 1.65, color: kiosk.color.inkSoft, marginTop: 10 }}>{children}</div>;
}

function NotifySpecBoard() {
  const typeRows = [
    { g: "✎", name: "comment", c: null, note: "antwort auf deinen beitrag · tinte" },
    { g: "⇄", name: "market_contact", c: null, note: "anfrage zu deinem angebot · tinte (statt ◈ — das ist ‚gespeichert‘ im avatar-menü)" },
    { g: "§", name: "moderation", c: "plum", note: "veröffentlicht / mit hinweis / abgelehnt (+ verwarnung) · pflaume" },
    { g: "◉", name: "official", c: "teal", note: "amtliche mitteilung, broadcast · teal (amtlich-präzedenz)" },
  ];
  return (
    <div style={{ width: 1280, height: 1165, boxSizing: "border-box", background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: "26px 40px" }}>
      <div style={paperGrainStyle} />
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.18em", color: kiosk.color.wine }}>MITTEILUNGEN · SPEZIFIKATION · STYLES ALS .nc-* IN GLOBAL.CSS</div>
      <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 18px" }}>Die Glocke, <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>seziert</span></h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, position: "relative" }}>
        <NcSpecCard n="01" t="Glocke & Badge">
          <div style={{ display: "flex", gap: 22, alignItems: "flex-start", padding: "6px 0 2px" }}>
            {[{ c: 0, l: "0 · KEIN BADGE" }, { c: 3, l: "3 · ZÄHLER" }, { c: 12, l: "12 → „9+“" }].map((b) => (
              <div key={b.l} style={{ textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", padding: "4px 6px 0" }}><NcBell count={b.c} /></div>
                <div style={{ fontFamily: kiosk.font.mono, fontSize: 8.5, color: kiosk.color.inkMute, letterSpacing: "0.08em", marginTop: 8 }}>{b.l}</div>
              </div>
            ))}
          </div>
          <NcSpecNote>umriss-disc 36px, paperWarm, ink-rand — geschwister des avatar-discs, sitzt links davon · tap-ziel ≥ 44px (unsichtbarer hit-bereich) · badge: wein, paper-ziffer, 1px ink-rand, cap „9+“ · KEINE motion an glocke oder badge — statisch, auch beim eintreffen</NcSpecNote>
        </NcSpecCard>
        <NcSpecCard n="02" t="Zeilen-Anatomie">
          <div style={{ border: kiosk.border.ink, borderRadius: kiosk.r.sm, background: kiosk.color.paper, overflow: "hidden" }}>
            <NcRow row={NC_ROWS[0]} lang="DE" big={true} />
          </div>
          <NcSpecNote>① 3px ink-kante = frisch (zweitanker) · ② glyphe mono 16px-spalte · ③ körper bricolage 13,5/1,4 — client-seitig aus i18n gerendert, DE/EN-toggle wirkt rückwirkend · ④ zeit mono relativ („vor 2 Std.“) · ganze zeile = link zum ziel · hover: paperSoft · kein einzel-dismiss, kein einzel-read</NcSpecNote>
        </NcSpecCard>
        <NcSpecCard n="03" t="Typen-Inventar (R1: 4)">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {typeRows.map((t) => (
              <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 26, height: 26, flexShrink: 0, border: kiosk.border.ink, borderRadius: kiosk.r.sm, background: kiosk.color.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: kiosk.font.mono, fontSize: 13, color: t.c ? kiosk.color[t.c] : kiosk.color.ink }}>{t.g}</span>
                <div>
                  <div style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em" }}>{t.name}</div>
                  <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, lineHeight: 1.45 }}>{t.note}</div>
                </div>
              </div>
            ))}
          </div>
          <NcSpecNote>hybrid-regel: tinte ist default — akzent NUR wo das system spricht (moderation pflaume, amtlich teal) · nachbarschaft untereinander bleibt tinte · keine typ-farbe im körpertext, nie im badge</NcSpecNote>
        </NcSpecCard>
        <NcSpecCard n="04" t="Frisch / Gelesen — Kurier-Verblassen">
          <div style={{ border: kiosk.border.ink, borderRadius: kiosk.r.sm, background: kiosk.color.paper, overflow: "hidden" }}>
            <NcRow row={NC_ROWS[1]} lang="DE" />
            <div style={{ borderTop: `1px dashed ${kiosk.color.rule}` }}><NcRow row={NC_ROWS[4]} lang="DE" /></div>
          </div>
          <NcSpecNote>frisch = volle tinte, gewicht 600, ink-kante · gelesen = inkMute, gewicht 500, glyphe 45 %, keine kante · öffnen des panels markiert ALLES gelesen (ein PATCH) — innerhalb der offenen session bleiben frische zeilen visuell markiert, erst der nächste besuch verblasst sie · kein stale-zustand: zeit ist relativ, wird beim öffnen berechnet</NcSpecNote>
        </NcSpecCard>
        <NcSpecCard n="05" t="Leer-Zustand">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ border: kiosk.border.ink, borderRadius: kiosk.r.sm, background: kiosk.color.paper, padding: "16px 16px", textAlign: "center", fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 13.5, lineHeight: 1.5, color: kiosk.color.inkSoft }}>{NC_L.empty.de}</div>
            <div style={{ border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm, background: kiosk.color.paper, padding: "12px 16px", textAlign: "center", fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12.5, lineHeight: 1.5, color: kiosk.color.inkMute }}>{NC_L.empty.en}</div>
          </div>
          <NcSpecNote>warm-kiezig, EINE zeile, serif kursiv · kein icon-theater, keine null („0 mitteilungen“ verboten — zero-regel der landing gilt auch hier) · badge verschwindet bei 0, zeigt nie „0“</NcSpecNote>
        </NcSpecCard>
        <NcSpecCard n="06" t="Fuß-Slot — reserviert für R2">
          <NcPanel lang="DE" rows={NC_ROWS.slice(0, 2)} showFoot={true} caretRight={260} width={280} />
          <NcSpecNote>banner-slot-lektion: der fuß ist ab R1 teil der anatomie (ink-rule + paperWarm-zone), rendert aber NICHTS bis R2 · R2: push-opt-in (PWA) zieht hier ein, ohne dass zeilen oder kopf umziehen · niemals werbung, niemals zweite aktion daneben</NcSpecNote>
        </NcSpecCard>
      </div>
      {/* Mechanik-Erbe — ink card */}
      <div style={{ marginTop: 16, background: kiosk.color.ink, color: kiosk.color.paper, border: kiosk.border.ink, borderRadius: kiosk.r.md, boxShadow: kiosk.shadow.print(kiosk.color.wine), padding: "14px 18px", position: "relative" }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, letterSpacing: "0.16em", color: kiosk.color.ochre, marginBottom: 6 }}>MECHANIK-ERBE · GESCHWISTER DES AVATAR-MENÜS</div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, lineHeight: 1.75, color: "#e9dfc9" }}>
          öffnen: stamp-in 220ms SETTLE, transform-origin oben rechts · print-schatten, kein blur · schließen: ESC / klick außerhalb / routenwechsel / erneuter glocken-klick — fokus kehrt zur glocke zurück · tastatur ↑↓ + enter durch die zeilen · mobil: bottom-sheet über scrim, scrim-tap + swipe-down schließen · reduced-motion: sofort, ohne stamp-in — glocke/badge sind ohnehin statisch · avatar-menü und panel schließen einander: nur eins offen · kein dedizierter seiten-link, panel ist die ganze fläche · counts: die glocke ist der EINZIGE zähler-träger (v1-regel bestätigt)
        </div>
      </div>
    </div>
  );
}

// ─── Nachträge (User-Review Aug 19): eigene State-Boards ─

function NcNoteCard({ title, ink = false, children }) {
  return (
    <div style={{ background: ink ? kiosk.color.ink : kiosk.color.paperWarm, color: ink ? "#e9dfc9" : kiosk.color.inkSoft, border: kiosk.border.ink, borderRadius: kiosk.r.md, padding: "12px 14px" }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: ink ? kiosk.color.ochre : kiosk.color.wine, marginBottom: 6 }}>{title}</div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

function NotifyFreshReadBoard() {
  const fresh = NC_ROWS.filter((r) => r.fresh).slice(0, 2);
  const read = NC_ROWS.filter((r) => !r.fresh).slice(0, 2);
  const box = { border: kiosk.border.ink, borderRadius: kiosk.r.sm, background: kiosk.color.paper, overflow: "hidden" };
  const lbl = { fontFamily: kiosk.font.mono, fontSize: 9.5, letterSpacing: "0.14em", color: kiosk.color.inkMute, marginBottom: 6 };
  return (
    <div style={{ width: 760, height: 500, boxSizing: "border-box", background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: "22px 28px" }}>
      <div style={paperGrainStyle} />
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, letterSpacing: "0.18em", color: kiosk.color.wine }}>FRISCH / GELESEN · KURIER-VERBLASSEN</div>
      <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: "4px 0 16px" }}>Verblassen, <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>nicht verschwinden</span></h2>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", position: "relative" }}>
        <div style={{ width: 340, flexShrink: 0 }}>
          <div style={lbl}>FRISCH — VOLLE TINTE · 600 · 3PX INK-KANTE</div>
          <div style={box}>
            {fresh.map((r, i) => (
              <div key={i} style={{ borderTop: i > 0 ? `1px dashed ${kiosk.color.rule}` : "none" }}><NcRow row={r} lang="DE" /></div>
            ))}
          </div>
          <div style={{ ...lbl, marginTop: 14 }}>GELESEN — INKMUTE · 500 · GLYPHE 45 % · KEINE KANTE</div>
          <div style={box}>
            {read.map((r, i) => (
              <div key={i} style={{ borderTop: i > 0 ? `1px dashed ${kiosk.color.rule}` : "none" }}><NcRow row={r} lang="DE" /></div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <NcNoteCard title="ÜBERGANG">öffnen feuert den read-POST — die offene session behält den pre-mark-zustand client-seitig: frisch bleibt frisch bis zum nächsten besuch · kein einzel-read, kein einzel-dismiss · zeit ist relativ, beim öffnen berechnet — nie stale</NcNoteCard>
          <NcNoteCard title="WARUM INK, NICHT WEIN" ink={true}>die frisch-kante ist INK — wein bleibt allein beim badge und beim „n NEU“-zähler im kopf. zwei wein-träger im panel würden den zähler entwerten.</NcNoteCard>
        </div>
      </div>
    </div>
  );
}

function NotifyEmptyBoard() {
  return (
    <div style={{ width: 760, height: 320, boxSizing: "border-box", background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: "22px 28px" }}>
      <div style={paperGrainStyle} />
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, letterSpacing: "0.18em", color: kiosk.color.wine }}>LEER-ZUSTAND · ZERO-REGEL</div>
      <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: "4px 0 18px" }}>Nie <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>eine Null</span></h2>
      <div style={{ display: "flex", gap: 24, paddingTop: 8 }}>
        <NcPanel lang="DE" empty={true} caretRight={40} />
        <NcPanel lang="EN" empty={true} caretRight={40} />
      </div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, lineHeight: 1.6, color: kiosk.color.inkMute, marginTop: 14 }}>badge verschwindet bei 0 · „0 mitteilungen“ verboten · EINE warme serif-zeile, DE/EN aus NC_L.empty → nc.empty</div>
    </div>
  );
}

Object.assign(window, { NcBell, NcBellGlyph, NcPanel, NcRow, NcNav, NcNoteCard, NotifyDesktop, NotifyDesktopEmpty, NotifyMobile, NotifySpecBoard, NotifyFreshReadBoard, NotifyEmptyBoard });

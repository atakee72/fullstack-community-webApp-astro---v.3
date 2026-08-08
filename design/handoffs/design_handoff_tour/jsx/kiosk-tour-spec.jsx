/* global React */
// ══════════════════════════════════════════════════════════
//  TOUR PASS · spec boards — anatomy + engine contract +
//  chapter map. Load AFTER kiosk-tour.jsx (uses TRTip/TR_STOPS).
// ══════════════════════════════════════════════════════════

const { kiosk: TS, paperGrainStyle: TS_grain, kioskFonts: TS_fonts } = window;
const TS_OCHRE_DEEP = "#b07515";

function TSPage({ children, minHeight }) {
  return (
    <div style={{ width: 1280, minHeight, boxSizing: "border-box", background: TS.color.paper, color: TS.color.ink, fontFamily: TS.font.display, position: "relative" }}>
      <style>{TS_fonts}</style>
      <div style={TS_grain} />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}
function TSHead({ kicker, title, sub }) {
  return (
    <div style={{ padding: "26px 48px 18px", borderBottom: `1.5px solid ${TS.color.ink}` }}>
      <div style={{ fontFamily: TS.font.mono, fontSize: 10, letterSpacing: "0.2em", color: TS_OCHRE_DEEP, fontWeight: 700 }}>{kicker}</div>
      <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "6px 0 4px" }}>{title}</h2>
      <div style={{ fontFamily: TS.font.serif, fontStyle: "italic", fontSize: 15.5, color: TS.color.inkSoft }}>{sub}</div>
    </div>
  );
}
function TSLabel({ children }) {
  return <div style={{ fontFamily: TS.font.mono, fontSize: 9.5, letterSpacing: "0.16em", color: TS.color.inkMute, marginBottom: 10, fontWeight: 700 }}>{children}</div>;
}
function TSCallout({ n, t, d }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ width: 20, height: 20, borderRadius: 999, background: TS.color.ochre, border: `1.5px solid ${TS.color.ink}`, fontFamily: TS.font.mono, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
      <div><b style={{ fontSize: 12.5 }}>{t}</b><div style={{ fontSize: 11.5, color: TS.color.inkSoft, lineHeight: 1.45 }}>{d}</div></div>
    </div>
  );
}

// ═══ Board 1 · anatomy + engine contract ═══
function TourSpecBoard() {
  return (
    <TSPage minHeight={1120}>
      <TSHead kicker="FÜHRUNG · SPEZIFIKATION" title={<span>Anatomie + <span style={{ fontFamily: TS.font.serif, fontStyle: "italic", fontWeight: 400, color: TS_OCHRE_DEEP }}>Engine-Kontrakt</span></span>} sub="Die Karte ist Styling — der Kontrakt ist die eigentliche Implementierungsarbeit. Beides hier, für die Übergabe." />
      <div style={{ display: "grid", gridTemplateColumns: "460px 1fr", gap: 36, padding: "26px 48px" }}>
        <div>
          <TSLabel>DIE SPOTLIGHT-KARTE · ANATOMIE</TSLabel>
          <div style={{ position: "relative", paddingTop: 40, paddingBottom: 250 }}>
            <span style={{ position: "relative", display: "inline-block", zIndex: 30 }}>
              <span style={{ display: "inline-block", fontFamily: TS.font.mono, fontSize: 11.5, padding: "6px 14px", borderRadius: 999, border: `1.5px solid ${TS.color.ink}`, background: TS.color.paperWarm }}>Ankündigungen</span>
              <window.TRRing />
            </span>
            <window.TRTip lang="DE" stop={1} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
            <TSCallout n="1" t="Ring" d="2.5px Ochre + weicher Hof. Kein Puls bei prefers-reduced-motion." />
            <TSCallout n="2" t="Scrim" d="rgba(ink, 0.5) über der ganzen Seite — der Anker liegt darüber (z-index), wird NICHT ausgeschnitten." />
            <TSCallout n="3" t="Kicker" d="FÜHRUNG · [KAPITEL] — sagt immer, wo man ist." />
            <TSCallout n="4" t="Fortschritt" d="Punkte + n / 7. Zeigt Kapitel-Länge ehrlich vorab." />
            <TSCallout n="5" t="Aktionen" d="weiter → (primär, ink) · ← zurück (leise) · ✕ bricht ab — Abbruch schreibt den Kapitel-Timestamp genauso." />
            <TSCallout n="6" t="Kapitel-Ende" d="Moss-Stempel + „Nächstes Kapitel“-Link (normale Navigation — die Führung selbst überquert NIE eine Nav)." />
          </div>
        </div>
        <div>
          <TSLabel>ENGINE-KONTRAKT · CC-ABGESTIMMT (AUG 6 2026)</TSLabel>
          <div style={{ background: TS.color.ink, color: TS.color.paper, borderRadius: TS.r.lg, padding: "20px 24px", fontFamily: TS.font.mono, fontSize: 10.5, lineHeight: 2 }}>
            <div style={{ color: TS.color.ochre, letterSpacing: "0.16em", marginBottom: 6 }}>DIE FÜNF PFLICHTEN</div>
            <div>01 · AUF HYDRATION WARTEN — Islands sind client:only; Anker existieren beim First Paint noch nicht</div>
            <div>02 · ANKER NEU FINDEN nach jedem Soft-Nav (ViewTransitions remountet Islands)</div>
            <div>03 · FEHLT EIN ANKER → Station STILL überspringen, Zähler passt sich an</div>
            <div>04 · JEDE STATION IN DEN VIEW SCROLLEN · content-visibility:auto → erst NACH dem Scroll messen</div>
            <div>05 · EIN KAPITEL ÜBERQUERT NIE EINE NAVIGATION — Kapitel beginnt und endet auf einer Seite</div>
            <div style={{ color: TS.color.ochre, letterSpacing: "0.16em", margin: "14px 0 6px" }}>REGELN</div>
            <div>· SICHERE ANKER: Chrome + Top-Level-Controls (Filter, Tags, Buttons, Toggles) — NIE die n-te Karte</div>
            <div>· Esc schließt · Pfeiltasten navigieren · Fokus bleibt in der Karte (Fokus-Falle)</div>
            <div>· Overlay im KioskLayout gemountet · Styles in global.css (.tour-*)</div>
            <div>· reduced-motion: Scrim + Karte nur faden, Ring statisch</div>
            <div>· DE/EN über kiosk-i18n.ts · mobil: Karte als Bottom-Sheet ÜBER der Bottom-Nav, Targets ≥44px</div>
          </div>
          <TSLabel><span style={{ display: "inline-block", marginTop: 22 }}>SPEICHERUNG · REVIDIERT FÜR KAPITEL</span></TSLabel>
          <div style={{ background: TS.color.paperWarm, border: TS.border.ink, borderRadius: TS.r.lg, padding: "16px 20px", boxShadow: TS.shadow.printSm(), fontFamily: TS.font.mono, fontSize: 10.5, lineHeight: 1.9, color: TS.color.inkSoft }}>
            <div style={{ color: TS.color.ink }}><b>tours?: {"{ forum?: Date, kalender?: Date, markt?: Date, kurier?: Date, kiezdaten?: Date, blog?: Date, profil?: Date }"}</b></div>
            <div><b style={{ color: TS.color.ink }}>tourHelloDismissedAt?: Date</b> — nur das Hallo-Modal</div>
            <div>· TIMESTAMPS, NIE BOOLEANS — Re-Offer nach künftigem Redesign-Cutoff bleibt möglich</div>
            <div>· localStorage-Spiegel = Paint-Speed-Cache, Server ist die Wahrheit (Muster: Warning-Label)</div>
            <div>· anonym: nur localStorage → Merge in den User-Doc bei Registrierung</div>
            <div>· Neustart über Avatar-Menü ändert NICHTS an den Timestamps</div>
          </div>
        </div>
      </div>
    </TSPage>
  );
}

// ═══ Board 2 · chapter map + entry points ═══
const TS_CHAPTERS = [
  { name: "Forum", color: TS.color.wine, n: 7, stops: ["Diskussionen", "Ankündigungen", "Empfehlungen", "Gespeichert", "Meine", "Tags (an/aus)", "Neues Thema + Hallo-Vorlage"] },
  { name: "Kalender", color: TS.color.teal, n: 4, stops: ["Monat / Agenda", "Ziehen-zum-Anlegen", "Zusagen (RSVP)", "Kategorien"] },
  { name: "Marktplatz", color: TS.color.wine, n: 4, stops: ["Verkaufen / Tausch / Verschenken", "Anzeige aufgeben", "Kontakt: Formular, keine DM", "Meine Anzeigen"] },
  { name: "Kurier", color: TS.color.ink, n: 4, stops: ["Masthead · tägliche Ausgabe", "◈ speichern", "Gelesenes verblasst", "Selbst einreichen (5/Tag)"] },
  { name: "Kiez-Daten", color: TS.color.moss, n: 3, stops: ["Planungsraum wählen", "Die Kanäle", "Kiez in Zahlen · A4"] },
  { name: "Blog", color: "#a3552e", n: 3, stops: ["Rubriken", "Archiv nach Monat", "Im Forum besprechen"] },
  { name: "Profil", color: TS.color.ochre, n: 3, stops: ["Steckbrief + Hobbys (= Interessen-Frage: Tags hier wählen → profile.hobbies)", "Dein Archiv", "Kiez-Chronik"] },
];
function TourChaptersBoard() {
  return (
    <TSPage minHeight={1120}>
      <TSHead kicker="FÜHRUNG · KAPITELKARTE" title={<span>Sieben <span style={{ fontFamily: TS.font.serif, fontStyle: "italic", fontWeight: 400, color: TS_OCHRE_DEEP }}>Kapitel</span>, drei Eingänge</span>} sub="Kein 25-Stationen-Marathon: jede Fläche hat ihr eigenes kurzes Kapitel. Forum ist hier voll ausgestaltet — die übrigen sechs sind Stop-Listen als Bauplan; ihre Karten nutzen dieselbe Anatomie." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: "24px 48px 8px" }}>
        {TS_CHAPTERS.map((c) => (
          <div key={c.name} style={{ background: TS.color.paperWarm, border: TS.border.ink, borderRadius: TS.r.lg, padding: "14px 16px", boxShadow: TS.shadow.printSm(), opacity: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1.5px solid ${TS.color.ink}`, paddingBottom: 8, marginBottom: 10 }}>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ width: 12, height: 12, borderRadius: 3, background: c.color, border: `1px solid ${TS.color.ink}` }} /><b style={{ fontSize: 15 }}>{c.name}</b></span>
              <span style={{ fontFamily: TS.font.mono, fontSize: 9.5, color: TS.color.inkMute }}>{c.n} STATIONEN</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {c.stops.map((s, i) => <div key={s} style={{ display: "flex", gap: 8, fontSize: 11.5, color: TS.color.inkSoft }}><span style={{ fontFamily: TS.font.mono, fontSize: 9.5, color: TS.color.inkMute, width: 14, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>{s}</div>)}
            </div>
            {c.name === "Forum" && <div style={{ fontFamily: TS.font.mono, fontSize: 8.5, color: TS_OCHRE_DEEP, marginTop: 8, letterSpacing: "0.08em" }}>★ VOLL AUSGESTALTET — S. FRAMES OBEN</div>}
          </div>
        ))}
        <div style={{ border: `1.5px dashed ${TS.color.rule}`, borderRadius: TS.r.lg, padding: "14px 16px", fontFamily: TS.font.mono, fontSize: 10, lineHeight: 1.8, color: TS.color.inkMute }}>
          NICHT IM V1:<br />Admin (Back-Office, eigene Doku) · Auth (vor dem Login gibt es nichts zu führen) · Kapitel-Inhalte der 6 Bauplan-Flächen = Design-Review vor Implementierung<br /><span style={{ color: TS_OCHRE_DEEP }}>GELÖST: INTERESSEN-FRAGE LEBT IN PROFIL-STATION 1 (HOBBYS) — KEIN EIGENES FORMULAR</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, padding: "22px 48px 30px" }}>
        <div>
          <TSLabel>EINGANG 1 · HALLO-MODAL (EINMALIG)</TSLabel>
          <div style={{ background: TS.color.paperWarm, border: TS.border.ink, borderRadius: TS.r.md, padding: "12px 16px", fontSize: 12, lineHeight: 1.55, color: TS.color.inkSoft, boxShadow: TS.shadow.printSm() }}>
            Nach dem ersten Sign-in, auf dem Forum. Bietet das Forum-Kapitel an. „Später“ / ✕ → <span style={{ fontFamily: TS.font.mono, fontSize: 10.5 }}>tourHelloDismissedAt</span>, kommt nie wieder.
          </div>
        </div>
        <div>
          <TSLabel>EINGANG 2 · KAPITEL-ANGEBOT (JE FLÄCHE, EINMALIG)</TSLabel>
          <div style={{ background: TS.color.paperWarm, border: TS.border.ink, borderRadius: TS.r.md, padding: "10px 14px", boxShadow: TS.shadow.printSm() }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontFamily: TS.font.mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: TS.color.paper, background: TS.color.teal, padding: "3px 8px", borderRadius: 4 }}>NEU HIER?</span>
              <span style={{ fontSize: 12, color: TS.color.inkSoft, flex: 1 }}>Kurze Führung durch den Kalender — 4 Stationen.</span>
              <span style={{ fontFamily: TS.font.mono, fontSize: 11, textDecoration: "underline", textUnderlineOffset: 3 }}>starten</span>
              <span style={{ fontFamily: TS.font.mono, fontSize: 11, color: TS.color.inkMute }}>✕</span>
            </div>
          </div>
          <div style={{ fontFamily: TS.font.mono, fontSize: 9, color: TS.color.inkMute, marginTop: 8, lineHeight: 1.7 }}>EINE ZEILE UNTERM SEITENTITEL, NUR ERSTER BESUCH + KAPITEL UNGESEHEN. TEIL DES TOUR-SYSTEMS — KEIN ZWEITES ONBOARDING (CHECKLISTE + STRAPS SIND RAUS, CC-VOTUM).</div>
        </div>
        <div>
          <TSLabel>EINGANG 3 · AVATAR-MENÜ (IMMER, BELIEBIG OFT)</TSLabel>
          <div style={{ background: TS.color.paperWarm, border: TS.border.ink, borderRadius: TS.r.md, padding: "6px 0", boxShadow: TS.shadow.printSm(), fontSize: 12.5 }}>
            <div style={{ padding: "8px 16px", color: TS.color.inkSoft }}>Mein Profil</div>
            <div style={{ padding: "8px 16px", color: TS.color.inkSoft }}>Gespeichert</div>
            <div style={{ padding: "8px 16px", background: `${TS.color.ochre}22`, borderLeft: `3px solid ${TS.color.ochre}`, fontWeight: 700, display: "flex", justifyContent: "space-between" }}><span>Führung starten</span><span style={{ fontFamily: TS.font.mono, fontSize: 10, color: TS.color.inkMute, fontWeight: 400 }}>⟲ AKTUELLE FLÄCHE</span></div>
            <div style={{ padding: "8px 16px", borderTop: `1px solid ${TS.color.rule}`, color: "#8d3232", fontFamily: TS.font.mono, fontSize: 11.5 }}>Abmelden</div>
          </div>
          <div style={{ fontFamily: TS.font.mono, fontSize: 9, color: TS.color.inkMute, marginTop: 8, lineHeight: 1.7 }}>EINE NEUE ZEILE IM BESTEHENDEN AVATAR-MENÜ (I18N-KEY + .AM-ROW). STARTET DAS KAPITEL DER AKTUELLEN FLÄCHE. KEIN HEADER-ⓘ IM V1 — ERST SEHEN, OB DER EINE EINGANG GEFUNDEN WIRD.</div>
        </div>
      </div>
    </TSPage>
  );
}

Object.assign(window, { TourSpecBoard, TourChaptersBoard });

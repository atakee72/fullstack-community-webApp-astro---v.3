/* global React */

// ══════════════════════════════════════════════════════════
//  PROFILE PASS · novel features
//  §01 Kiez-Chronik — tenure timeline, fully DERIVED from
//      existing data (createdAt, first post/listing, counts).
//  §02 Steckbrief — printable riso neighbor card (A6), for
//      pinboards + Kiezfest. Print CSS, 2-color riso look.
// ══════════════════════════════════════════════════════════

// ─── §01 · Kiez-Chronik (full anatomy) ───────────────────

function ChronikMilestone({ y, label, sub, now = false, first = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 150 }}>
      <div style={{ width: now ? 18 : 14, height: now ? 18 : 14, borderRadius: "50%", border: kiosk.border.inkBold, background: now ? PROFILE_ACCENT : first ? kiosk.color.wine : kiosk.color.ink, animation: now ? "profPulse 2.4s ease-in-out infinite" : "none", boxShadow: kiosk.shadow.printSm() }}></div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 12, fontWeight: 600 }}>{y}</div>
      <div style={{ fontFamily: kiosk.font.display, fontSize: 13, fontWeight: 700, textAlign: "center", lineHeight: 1.25 }}>{label}</div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, textAlign: "center", lineHeight: 1.5 }}>{sub}</div>
    </div>
  );
}

function ProfileNovelChronik({ lang = "DE" }) {
  const de = lang === "DE";
  const stops = de ? [
    { y: "Nov 2019", label: "Dabei", sub: "user.createdAt", first: false },
    { y: "Mär 2020", label: "Erstes Thema", sub: "ältester Forum-Post" },
    { y: "Jun 2021", label: "Erste Anzeige", sub: "ältestes Listing" },
    { y: "Okt 2024", label: "100. danke", sub: "aggregierte likes" },
    { y: "heute", label: "aktiv", sub: "letzte 7 Tage", now: true },
  ] : [
    { y: "Nov 2019", label: "Joined", sub: "user.createdAt", first: false },
    { y: "Mar 2020", label: "First topic", sub: "oldest forum post" },
    { y: "Jun 2021", label: "First listing", sub: "oldest listing" },
    { y: "Oct 2024", label: "100th danke", sub: "aggregated likes" },
    { y: "today", label: "active", sub: "last 7 days", now: true },
  ];
  return (
    <div style={{ width: 1280, minHeight: 640, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: "36px 40px" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.14em", color: PROFILE_ACCENT, fontWeight: 600 }}>NOVEL §01 · KIEZ-CHRONIK</div>
      <h2 style={{ fontFamily: kiosk.font.display, fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", margin: "8px 0 6px" }}>
        {de ? <React.Fragment>Sieben Jahre Kiez, <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>eine Linie</span></React.Fragment>
            : <React.Fragment>Seven years of kiez, <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>one line</span></React.Fragment>}
      </h2>
      <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, color: kiosk.color.inkSoft, marginBottom: 26 }}>
        {de ? "Ersetzt das hartkodierte „seit 2019“ durch eine ehrliche, komplett abgeleitete Zeitleiste." : "Replaces the hardcoded „since 2019“ with an honest, fully derived timeline."}
      </div>

      {/* the timeline */}
      <div style={{ background: kiosk.color.paperWarm, border: kiosk.border.ink, borderTop: `4px solid ${PROFILE_ACCENT}`, borderRadius: kiosk.r.lg, boxShadow: kiosk.shadow.print(), padding: "30px 26px 22px", position: "relative" }}>
        <div style={{ position: "absolute", left: 96, right: 96, top: 46, borderTop: `2px dashed ${kiosk.color.rule}` }}></div>
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
          {stops.map((s, i) => <ChronikMilestone key={i} {...s} />)}
        </div>
      </div>

      {/* rules ledger */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px", marginTop: 22, fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkSoft, lineHeight: 1.7 }}>
        {(de ? [
          "01 · NULL neue Schema-Felder: alles wird zur Lesezeit abgeleitet und 24h gecacht.",
          "02 · Meilenstein-Menü ist fix: dabei · erstes Thema · erste Anzeige · erster Termin · 100. danke. Nur vorhandene werden gezeigt (max 5).",
          "03 · Auf dem eigenen UND öffentlichen Profil — es gibt keine privaten Daten in der Chronik.",
          "04 · Kompakt-Variante (Strip) sitzt über dem Archiv; diese volle Anatomie ist die Referenz.",
        ] : [
          "01 · ZERO new schema fields: everything is derived at read time and cached for 24h.",
          "02 · Milestone menu is fixed: joined · first topic · first listing · first event · 100th danke. Only existing ones show (max 5).",
          "03 · On own AND public profiles — the Chronik contains no private data.",
          "04 · Compact variant (strip) sits above the archive; this full anatomy is the reference.",
        ]).map((s, i) => <div key={i} style={{ padding: "7px 0", borderBottom: `1px dashed ${kiosk.color.rule}` }}>{s}</div>)}
      </div>
    </div>
  );
}

// ─── §02 · Steckbrief (printable neighbor card) ──────────

function SteckbriefCard({ lang = "DE", person = SEED_ME }) {
  const de = lang === "DE";
  return (
    <div style={{ width: 420, height: 297, background: "#f9f3e4", border: kiosk.border.inkBold, borderRadius: 6, boxShadow: kiosk.shadow.print(PROFILE_ACCENT), position: "relative", overflow: "hidden", padding: "20px 22px", flexShrink: 0 }}>
      <div style={paperGrainStyle}></div>
      {/* riso corner stamp */}
      <div style={{ position: "absolute", top: -22, right: -22, width: 88, height: 88, borderRadius: "50%", background: PROFILE_ACCENT, opacity: 0.85, border: kiosk.border.ink }}></div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 8.5, letterSpacing: "0.2em", color: kiosk.color.wine, fontWeight: 600 }}>MAHALLE · STECKBRIEF · SCHILLERKIEZ</div>
      <div style={{ display: "flex", gap: 14, marginTop: 12, alignItems: "flex-start" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: kiosk.color.wine, border: kiosk.border.inkBold, display: "flex", alignItems: "center", justifyContent: "center", color: kiosk.color.paper, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 24, flexShrink: 0 }}>
          {person.name.split(" ").map((w) => w[0]).join("")}
        </div>
        <div>
          <div style={{ fontFamily: kiosk.font.display, fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>{person.name}</div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, marginTop: 4 }}>@{person.handle} · {de ? "im Kiez seit" : "in the kiez since"} {person.since}</div>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12.5, color: kiosk.color.inkSoft, marginTop: 6 }}>
            {de ? "„Man trifft mich in der Fahrrad-Werkstatt.“" : "“You'll find me at the bike workshop.”"}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 5 }}>
        {person.hobbies.map((h) => (
          <span key={h} style={{ padding: "3px 9px", border: `1.5px solid ${kiosk.color.ink}`, borderRadius: kiosk.r.pill, fontFamily: kiosk.font.display, fontSize: 10.5, fontWeight: 700 }}>{h}</span>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 16, left: 22, right: 22, display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `1.5px dashed ${kiosk.color.rule}`, paddingTop: 10 }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 8.5, color: kiosk.color.inkMute, lineHeight: 1.6 }}>
          mahalle.berlin/nachbarn/{person.handle}<br />{de ? "gedruckt Jul 2026 · 2-farb-riso" : "printed Jul 2026 · 2-color riso"}
        </div>
        <div style={{ width: 44, height: 44, border: kiosk.border.ink, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: kiosk.font.mono, fontSize: 7, color: kiosk.color.inkMute, textAlign: "center", background: kiosk.color.paperSoft }}>QR<br />{de ? "PROFIL" : "PROFILE"}</div>
      </div>
    </div>
  );
}

function ProfileNovelSteckbrief({ lang = "DE" }) {
  const de = lang === "DE";
  return (
    <div style={{ width: 1280, minHeight: 700, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: "36px 40px" }}>
      <style>{kioskFonts}{profileKeyframes}</style>
      <div style={paperGrainStyle}></div>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, letterSpacing: "0.14em", color: PROFILE_ACCENT, fontWeight: 600 }}>NOVEL §02 · STECKBRIEF</div>
      <h2 style={{ fontFamily: kiosk.font.display, fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", margin: "8px 0 6px" }}>
        {de ? <React.Fragment>Ein Profil zum <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>Anfassen</span></React.Fragment>
            : <React.Fragment>A profile you can <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: PROFILE_ACCENT }}>hold</span></React.Fragment>}
      </h2>
      <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, color: kiosk.color.inkSoft, marginBottom: 26 }}>
        {de ? "A6 quer, druckt sich aus dem Profil heraus — fürs Schwarze Brett, den Hausflur, das Kiezfest." : "A6 landscape, prints straight from the profile — for the pinboard, the hallway, the Kiezfest."}
      </div>
      <div style={{ display: "flex", gap: 36, alignItems: "flex-start" }}>
        <div style={{ position: "relative" }}>
          {/* cut marks */}
          <div style={{ position: "absolute", inset: -12, border: `1px dashed ${kiosk.color.inkMute}`, borderRadius: 8, pointerEvents: "none" }}></div>
          <SteckbriefCard lang={lang} />
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, marginTop: 20, textAlign: "center", letterSpacing: "0.1em" }}>{de ? "SCHNITTMARKEN · A6 QUER · 148 × 105 MM" : "CUT MARKS · A6 LANDSCAPE · 148 × 105 MM"}</div>
        </div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkSoft, lineHeight: 1.7, maxWidth: 520 }}>
          <div style={{ fontFamily: kiosk.font.display, fontSize: 17, fontWeight: 800, color: kiosk.color.ink, marginBottom: 10 }}>{de ? "Anatomie + Regeln" : "Anatomy + rules"}</div>
          {(de ? [
            "01 · Reiner Print-CSS-Weg: @media print auf einer /steckbrief-Route — kein PDF-Backend, kein Canvas.",
            "02 · Inhalt = nur Öffentliches: Name, Handle, seit, Interessen, optionales Motto (ein Satz, 80 Zeichen, neues freiwilliges Feld — das EINZIGE neue Datum dieses Passes).",
            "03 · QR-Platzhalter zeigt auf die öffentliche Profil-Route. Bibliothek: klein + lokal, kein externer Dienst.",
            "04 · 2-Farb-Riso-Look: Ink + Ochre. Avatar-Foto wird für den Druck als Monogramm gerendert (Riso-ehrlich, spart Tinte).",
            "05 · Button sitzt auf der Identitäts-Karte („Steckbrief drucken“) — eigener Screen ist die Druckvorschau.",
          ] : [
            "01 · Pure print-CSS path: @media print on a /steckbrief route — no PDF backend, no canvas.",
            "02 · Content = public only: name, handle, since, interests, optional motto (one line, 80 chars, a new voluntary field — the ONLY new datum of this pass).",
            "03 · QR placeholder points to the public profile route. Library: small + local, no external service.",
            "04 · 2-color riso look: ink + ochre. The avatar photo renders as a monogram for print (riso-honest, saves ink).",
            "05 · Button lives on the identity card („Print Steckbrief“) — its own screen is the print preview.",
          ]).map((s, i) => <div key={i} style={{ padding: "7px 0", borderBottom: `1px dashed ${kiosk.color.rule}` }}>{s}</div>)}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════

Object.assign(window, {
  ProfileNovelChronik, ProfileNovelSteckbrief, SteckbriefCard, ChronikMilestone,
});

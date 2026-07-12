/* global React */

// ══════════════════════════════════════════════════════════
//  ADMIN MODERATION · Flows
//  Kiosk modals replace browser prompt():
//  01 Reject modal (reason + strike consequence)
//  02 Ban-Bremse — 3rd-strike guard w/ inline strike ledger
//  03 Warning modal (text + live label preview)
//  04 Bulk-reject consequence preview (novel module)
//  05 Strike ledger popover
//  06 User-side suspended screens (login + banner)
// ══════════════════════════════════════════════════════════

// ─── Shared modal scaffold on dimmed queue backdrop ───
function AdmModalStage({ children, width = 1280, height = 820, annotate }) {
  const k = window.kiosk;
  return (
    <div style={{ width, height, background: k.color.paperSoft, position: "relative", overflow: "hidden", fontFamily: k.font.display, color: k.color.ink }}>
      <style>{window.kioskFonts}</style>
      <div style={window.paperGrainStyle}></div>
      {/* ghosted queue behind */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.22, filter: "blur(1.5px)", padding: "40px 60px", display: "flex", flexDirection: "column", gap: 16 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: 150, background: k.color.paper, border: k.border.ink, borderRadius: k.r.lg }}></div>
        ))}
      </div>
      <div style={{ position: "absolute", inset: 0, background: "rgba(27,26,23,0.28)" }}></div>
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
      {annotate}
    </div>
  );
}

function AdmModalCard({ children, width = 560, accent }) {
  const k = window.kiosk;
  return (
    <div style={{
      width, background: k.color.paperWarm, border: k.border.inkBold,
      borderTop: `5px solid ${accent || window.ADM_ACCENT}`,
      borderRadius: k.r.lg, boxShadow: k.shadow.print(accent || window.ADM_ACCENT),
      padding: "24px 28px", position: "relative",
    }}>{children}</div>
  );
}

function AdmModalHead({ kicker, title, italic }) {
  const k = window.kiosk;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: k.font.mono, fontSize: 10, letterSpacing: "0.14em", color: window.ADM_ACCENT }}>{kicker}</div>
      <h2 style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05 }}>
        {title} {italic ? <span style={{ fontFamily: k.font.serif, fontStyle: "italic", fontWeight: 400, color: window.ADM_ACCENT }}>{italic}</span> : null}
      </h2>
    </div>
  );
}

function AdmField({ label, hint, value, placeholder, rows = 3, required }) {
  const k = window.kiosk;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <label style={{ fontFamily: k.font.mono, fontSize: 10.5, letterSpacing: "0.1em", color: k.color.inkSoft, textTransform: "uppercase" }}>
          {label} {required ? <span style={{ color: k.color.danger }}>*</span> : null}
        </label>
        {hint ? <span style={{ fontFamily: k.font.mono, fontSize: 9.5, color: k.color.inkMute }}>{hint}</span> : null}
      </div>
      <div style={{
        background: k.color.paperSoft, border: value ? `1.5px solid ${k.color.ink}` : `1px solid ${k.color.rule}`,
        borderRadius: k.r.md, padding: "9px 12px", minHeight: rows * 18,
        fontSize: 13, lineHeight: 1.5, color: value ? k.color.ink : k.color.inkMute,
      }}>{value || placeholder}</div>
    </div>
  );
}

// ─── Mini content summary inside modals ───
function AdmCaseSummary({ item, lang = "DE" }) {
  const k = window.kiosk;
  return (
    <div style={{ background: k.color.paper, border: `1px solid ${k.color.rule}`, borderRadius: k.r.md, padding: "10px 14px", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
        <window.AdmSourceStrap item={item} lang={lang} />
        <window.AdmTypeChip type={item.type} lang={lang} />
        <span style={{ fontFamily: k.font.mono, fontSize: 10.5, color: k.color.inkMute, marginLeft: "auto" }}>{item.time}</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 7, letterSpacing: "-0.01em" }}>{item.title || <>„{item.body.slice(0, 76)}…“</>}</div>
      <div style={{ fontSize: 11.5, color: k.color.inkSoft, marginTop: 3, display: "flex", alignItems: "center", gap: 7 }}>
        von <b>{item.author.name}</b> <window.AdmStrikeDots n={item.author.strikes} size={6} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  01 · Reject modal — 2nd strike case
// ─────────────────────────────────────────────────────────
function AdmRejectModal({ lang = "DE" }) {
  const k = window.kiosk;
  const item = window.ADM_SEED[3]; // M. Berger, 1 strike → becomes 2
  return (
    <AdmModalStage annotate={
      <window.KioskAnnotate top={30} right={30} rotate={2}>
        Ersetzt das prompt() im Bestand. Grund = Pflichtfeld, geht an die Autorin. Interne Notiz bleibt im Protokoll.
      </window.KioskAnnotate>
    }>
      <AdmModalCard accent={k.color.danger}>
        <AdmModalHead kicker="ABLEHNEN · SCHRITT 1 VON 1" title="Beitrag" italic="ablehnen" />
        <AdmCaseSummary item={item} lang={lang} />
        <AdmField label="Grund der Ablehnung" hint="wird der Autorin angezeigt" required
          value="Persönlicher Angriff auf eine Nachbarin — verstößt gegen die Kiez-Regeln (§ respektvoller Ton)." />
        <AdmField label="Interne Notiz" hint="nur fürs Protokoll · optional" rows={2}
          placeholder="z. B. Kontext, Absprachen, Wiedervorlage…" />
        {/* strike consequence */}
        <div style={{ background: `${k.color.warn}14`, border: `1.5px solid ${k.color.warn}`, borderRadius: k.r.md, padding: "10px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <window.AdmStrikeDots n={2} size={10} />
          <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
            <b>2. Verwarnung für M. Berger.</b> Noch eine Ablehnung, dann wird das Konto gesperrt (3/3).
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <window.AdmActionBtn variant="outline">abbrechen</window.AdmActionBtn>
          <window.AdmActionBtn variant="danger">✕ ablehnen &amp; verwarnen</window.AdmActionBtn>
        </div>
      </AdmModalCard>
    </AdmModalStage>
  );
}

// ─────────────────────────────────────────────────────────
//  02 · Ban-Bremse — 3rd strike guard (NOVEL § 01)
// ─────────────────────────────────────────────────────────
function AdmBanBrake({ lang = "DE" }) {
  const k = window.kiosk;
  const item = window.ADM_SEED[2]; // Klaus W., 2 strikes → ban
  return (
    <AdmModalStage height={920} annotate={
      <window.KioskAnnotate bottom={26} left={26} rotate={-2} color={k.color.sky}>
        NOVEL § 01 · Ban-Bremse: Sperren passiert nie beiläufig. Ledger inline, Checkbox als bewusster zweiter Schritt. CC: Sperr-Durchsetzung (Login-Block, Content-APIs) ist TODO im Code — Screens dazu unten.
      </window.KioskAnnotate>
    }>
      <AdmModalCard accent={k.color.danger} width={600}>
        <div style={{ position: "absolute", top: -14, left: 24, background: k.color.danger, color: k.color.paper, fontFamily: k.font.mono, fontSize: 10, letterSpacing: "0.12em", padding: "4px 12px", borderRadius: k.r.sm, border: k.border.ink, boxShadow: k.shadow.printSm() }}>BAN-BREMSE · 3. VERWARNUNG</div>
        <AdmModalHead kicker="ABLEHNEN · MIT FOLGEN" title="Diese Ablehnung" italic="sperrt das Konto" />
        <AdmCaseSummary item={item} lang={lang} />
        {/* inline strike ledger */}
        <div style={{ border: k.border.ink, borderRadius: k.r.md, overflow: "hidden", marginBottom: 14, background: k.color.paper }}>
          <div style={{ padding: "8px 14px", borderBottom: `1px dashed ${k.color.rule}`, fontFamily: k.font.mono, fontSize: 10, letterSpacing: "0.12em", color: k.color.inkMute }}>STRIKE-KONTO · KLAUS W.</div>
          {[
            { n: 1, d: "12.05.2026", t: "Markt · „MacBook 120 € nur heute“", r: "Betrugsverdacht" },
            { n: 2, d: "01.07.2026", t: "Kommentar · Kita-Plätze 2026/27", r: "Persönlicher Angriff" },
            { n: 3, d: "heute", t: "Diskussion · „Schnell Geld verdienen“", r: "Spam + Betrugsverdacht", now: true },
          ].map((s) => (
            <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", borderBottom: s.n < 3 ? `1px dashed ${k.color.rule}` : "none", background: s.now ? `${k.color.danger}10` : "transparent" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: s.now ? k.color.danger : k.color.inkMute, color: k.color.paper, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: k.font.mono, fontSize: 11, fontWeight: 700, flex: "0 0 22px" }}>{s.n}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "-0.01em" }}>{s.t}</div>
                <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, marginTop: 2 }}>{s.d} · {s.r}</div>
              </div>
              {s.now ? <span style={{ fontFamily: k.font.mono, fontSize: 9.5, fontWeight: 600, color: k.color.danger }}>← DIESE</span> : null}
            </div>
          ))}
        </div>
        <AdmField label="Grund der Ablehnung" hint="wird dem Autor angezeigt" required
          value="Wiederholter Spam mit Betrugsverdacht — dritter Verstoß gegen die Kiez-Regeln." />
        {/* deliberate second step */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: `${k.color.danger}10`, border: `1.5px solid ${k.color.danger}`, borderRadius: k.r.md, padding: "11px 14px", marginBottom: 18 }}>
          <window.AdmCheckbox checked />
          <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
            <b>Ja, Klaus W. sperren.</b> Kein Login, kein Posten mehr — bis ein Admin die Sperre aufhebt. Bestehende Beiträge bleiben (Nachweis der Moderation).
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <window.AdmActionBtn variant="outline">abbrechen</window.AdmActionBtn>
          <window.AdmActionBtn variant="danger">✕ ablehnen &amp; sperren</window.AdmActionBtn>
        </div>
      </AdmModalCard>
    </AdmModalStage>
  );
}

// ─────────────────────────────────────────────────────────
//  03 · Warning modal — with live label preview
// ─────────────────────────────────────────────────────────
function AdmWarningModal({ lang = "DE" }) {
  const k = window.kiosk;
  const item = window.ADM_SEED[1];
  return (
    <AdmModalStage height={780} annotate={
      <window.KioskAnnotate top={30} left={30} rotate={-2}>
        Freigeben mit Hinweis: Inhalt bleibt online, trägt aber ein Ochre-Etikett. Vorschau zeigt live, wie es auf der Karte sitzt.
      </window.KioskAnnotate>
    }>
      <AdmModalCard accent={k.color.warn}>
        <AdmModalHead kicker="FREIGEBEN · MIT HINWEIS" title="Hinweis" italic="ergänzen" />
        <AdmCaseSummary item={item} lang={lang} />
        <AdmField label="Hinweistext" hint="öffentlich sichtbar · max. 200 Zeichen" required
          value="Vorsicht bei Vorkasse — Mahalle empfiehlt Übergabe &amp; Bezahlung persönlich im Kiez." />
        {/* live preview */}
        <div style={{ fontFamily: k.font.mono, fontSize: 10, letterSpacing: "0.12em", color: k.color.inkMute, marginBottom: 6 }}>VORSCHAU AUF DEM BEITRAG</div>
        <div style={{ background: k.color.paper, border: k.border.ink, borderRadius: k.r.md, padding: "12px 14px", marginBottom: 18 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: k.color.ochre, border: `1px solid ${k.color.ink}`, borderRadius: k.r.sm, padding: "4px 10px", fontFamily: k.font.mono, fontSize: 10, fontWeight: 500, marginBottom: 8 }}>⚠ HINWEIS DER MODERATION</div>
          <div style={{ fontSize: 12, fontStyle: "italic", fontFamily: k.font.serif, color: k.color.inkSoft, lineHeight: 1.5 }}>Vorsicht bei Vorkasse — Mahalle empfiehlt Übergabe &amp; Bezahlung persönlich im Kiez.</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 9, opacity: 0.55 }}>E-Bike Cube, neuwertig — 250 €</div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <window.AdmActionBtn variant="outline">abbrechen</window.AdmActionBtn>
          <window.AdmActionBtn variant="warn">⚠ freigeben mit hinweis</window.AdmActionBtn>
        </div>
      </AdmModalCard>
    </AdmModalStage>
  );
}

// ─────────────────────────────────────────────────────────
//  04 · Bulk-reject consequence preview (NOVEL § 02)
// ─────────────────────────────────────────────────────────
function AdmBulkPreview({ lang = "DE" }) {
  const k = window.kiosk;
  const rows = [
    { t: "E-Bike Cube, neuwertig — 250 €", a: "R. Novak", from: 0, to: 1 },
    { t: "Schnell Geld verdienen im Kiez 🚀", a: "Klaus W.", from: 2, to: 3, ban: true },
    { t: "Kommentar · „Späti-Sterben…“", a: "M. Berger", from: 1, to: 2 },
    { t: "Gratis-Coaching für Nachbarn!!", a: "R. Novak", from: 1, to: 2, note: "2. Treffer in dieser Auswahl" },
  ];
  return (
    <AdmModalStage height={900} annotate={
      <window.KioskAnnotate top={28} right={28} rotate={2} color={k.color.sky}>
        NOVEL § 02 · Folgen-Vorschau: Bulk-Reject zeigt VOR dem Bestätigen, wessen Strike-Konto sich wie ändert. Mehrere Treffer derselben Person werden aufsummiert — genau wie das API sie sequentiell verarbeitet (max. 50).
      </window.KioskAnnotate>
    }>
      <AdmModalCard accent={k.color.danger} width={620}>
        <AdmModalHead kicker="BULK · 4 AUSGEWÄHLT" title="Alle ablehnen —" italic="mit Folgen" />
        <AdmField label="Gemeinsamer Grund" hint="gilt für alle 4 · wird den Autor:innen angezeigt" required
          value="Verstößt gegen die Kiez-Regeln (Spam / kommerzielle Werbung)." rows={2} />
        <div style={{ fontFamily: k.font.mono, fontSize: 10, letterSpacing: "0.12em", color: k.color.inkMute, margin: "4px 0 6px" }}>FOLGEN FÜR DIE STRIKE-KONTEN</div>
        <div style={{ border: k.border.ink, borderRadius: k.r.md, overflow: "hidden", background: k.color.paper, marginBottom: 14 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: i < rows.length - 1 ? `1px dashed ${k.color.rule}` : "none", background: r.ban ? `${k.color.danger}10` : "transparent" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "-0.01em" }}>{r.t}</div>
                <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, marginTop: 2 }}>{r.a}{r.note ? ` · ${r.note}` : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                <window.AdmStrikeDots n={r.from} size={7} />
                <span style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute }}>→</span>
                <window.AdmStrikeDots n={Math.min(r.to, 3)} size={7} />
                {r.ban ? <span style={{ fontFamily: k.font.mono, fontSize: 9.5, fontWeight: 600, color: k.color.paper, background: k.color.danger, padding: "2px 8px", borderRadius: k.r.sm, border: `1px solid ${k.color.ink}` }}>WIRD GESPERRT</span> : null}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: `${k.color.danger}10`, border: `1.5px solid ${k.color.danger}`, borderRadius: k.r.md, padding: "11px 14px", marginBottom: 18 }}>
          <window.AdmCheckbox checked={false} />
          <div style={{ fontSize: 12.5, lineHeight: 1.45, color: k.color.inkSoft }}>
            <b style={{ color: k.color.ink }}>Mir ist klar: 1 Konto wird dabei gesperrt.</b> Ohne Häkchen bleibt „alle ablehnen“ deaktiviert.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
          <span style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, marginRight: "auto" }}>bereits geprüfte Fälle werden übersprungen</span>
          <window.AdmActionBtn variant="outline">abbrechen</window.AdmActionBtn>
          <button style={{ background: k.color.danger, color: k.color.paper, border: `1.5px solid ${k.color.ink}`, borderRadius: k.r.pill, padding: "8px 16px", fontFamily: k.font.display, fontSize: 13, fontWeight: 700, opacity: 0.4, cursor: "not-allowed" }}>✕ 4 ablehnen</button>
        </div>
      </AdmModalCard>
    </AdmModalStage>
  );
}

// ─────────────────────────────────────────────────────────
//  06 · User-side suspended screens (Sperr-Durchsetzung)
// ─────────────────────────────────────────────────────────
function AdmSuspendedScreens({ lang = "DE" }) {
  const k = window.kiosk;
  return (
    <div style={{ width: 1280, height: 720, background: k.color.paper, position: "relative", overflow: "hidden", fontFamily: k.font.display, color: k.color.ink, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
      <style>{window.kioskFonts}</style>
      <div style={window.paperGrainStyle}></div>

      {/* A · login blocked */}
      <div style={{ borderRight: `1.5px dashed ${k.color.rule}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", padding: 40 }}>
        <div style={{ position: "absolute", top: 18, left: 24, fontFamily: k.font.mono, fontSize: 10, letterSpacing: "0.12em", color: k.color.inkMute }}>A · LOGIN GESPERRT (auth callback)</div>
        <div style={{ width: 380, background: k.color.paperWarm, border: k.border.inkBold, borderTop: `5px solid ${k.color.danger}`, borderRadius: k.r.lg, boxShadow: k.shadow.print(k.color.danger), padding: "26px 28px", textAlign: "center" }}>
          <div style={{ width: 46, height: 46, margin: "0 auto 12px", background: k.color.danger, borderRadius: "50%", border: k.border.ink, display: "flex", alignItems: "center", justifyContent: "center", color: k.color.paper, fontSize: 20, fontWeight: 700 }}>✕</div>
          <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.025em" }}>Konto <span style={{ fontFamily: k.font.serif, fontStyle: "italic", fontWeight: 400, color: k.color.danger }}>gesperrt</span></h3>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: k.color.inkSoft, margin: "10px 0 0" }}>
            Dein Konto wurde nach drei Verstößen gegen die Kiez-Regeln gesperrt. Anmelden ist nicht mehr möglich.
          </p>
          <div style={{ fontFamily: k.font.mono, fontSize: 10.5, color: k.color.inkMute, marginTop: 14, padding: "9px 12px", background: k.color.paperSoft, borderRadius: k.r.sm, border: `1px solid ${k.color.rule}`, lineHeight: 1.5 }}>
            Fragen zur Sperre?<br />moderation@mahalle.berlin
          </div>
        </div>
      </div>

      {/* B · banner for already-logged-in banned user */}
      <div style={{ position: "relative", padding: "56px 36px 0" }}>
        <div style={{ position: "absolute", top: 18, left: 24, fontFamily: k.font.mono, fontSize: 10, letterSpacing: "0.12em", color: k.color.inkMute }}>B · BANNER · SESSION NOCH AKTIV</div>
        <div style={{ background: k.color.danger, color: k.color.paper, border: k.border.ink, borderRadius: k.r.md, boxShadow: k.shadow.printSm(), padding: "12px 18px", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 17 }}>✕</span>
          <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>
            <b>Dein Konto ist gesperrt.</b> Du kannst mitlesen, aber nichts mehr posten, kommentieren oder inserieren.
          </div>
        </div>
        {/* ghosted forum below w/ disabled composer */}
        <div style={{ marginTop: 18, opacity: 0.75 }}>
          <div style={{ height: 90, background: k.color.paperWarm, border: k.border.ink, borderRadius: k.r.lg, marginBottom: 12 }}></div>
          <div style={{ height: 90, background: k.color.paperWarm, border: k.border.ink, borderRadius: k.r.lg, marginBottom: 12 }}></div>
          <div style={{ background: k.color.paperSoft, border: `1px solid ${k.color.rule}`, borderRadius: k.r.md, padding: "12px 14px", fontSize: 12.5, color: k.color.inkMute, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontStyle: "italic", fontFamily: k.font.serif }}>Was möchtest du teilen?</span>
            <span style={{ fontFamily: k.font.mono, fontSize: 10, letterSpacing: "0.08em" }}>DEAKTIVIERT</span>
          </div>
        </div>
        <window.KioskAnnotate bottom={22} right={22} rotate={2}>
          CC: Sperr-Durchsetzung ist TODO im Code (review.ts Kommentar). Nötig: isBanned im Auth-Callback + Guard auf Content-APIs. Diese zwei Screens sind das UI dafür.
        </window.KioskAnnotate>
      </div>
    </div>
  );
}

Object.assign(window, {
  AdmModalStage, AdmModalCard, AdmModalHead, AdmField, AdmCaseSummary,
  AdmRejectModal, AdmBanBrake, AdmWarningModal, AdmBulkPreview, AdmSuspendedScreens,
});

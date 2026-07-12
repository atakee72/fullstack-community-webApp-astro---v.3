/* global React */

// ══════════════════════════════════════════════════════════
//  ADMIN MODERATION · State matrix — 9 states, 3 groups
//  Anzeige (01–03) · Aktionen (04–06) · Grenzen (07–09)
// ══════════════════════════════════════════════════════════

function AdmStateTile({ n, title, sub, children, color }) {
  const k = window.kiosk;
  return (
    <div style={{ background: k.color.paperWarm, border: k.border.ink, borderRadius: k.r.lg, overflow: "hidden", boxShadow: k.shadow.printSm(), display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 16px", borderBottom: `1.5px solid ${k.color.ink}`, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: k.font.mono, fontSize: 10, color: color || window.ADM_ACCENT, letterSpacing: "0.12em" }}>§{n}</span>
        <b style={{ fontSize: 14, letterSpacing: "-0.01em" }}>{title}</b>
        <span style={{ fontFamily: k.font.mono, fontSize: 9.5, color: k.color.inkMute, marginLeft: "auto", textAlign: "right" }}>{sub}</span>
      </div>
      <div style={{ padding: 16, flex: 1, position: "relative" }}>{children}</div>
    </div>
  );
}

function AdmSkeletonCard() {
  const k = window.kiosk;
  return (
    <div style={{ border: `1px solid ${k.color.rule}`, borderRadius: k.r.md, padding: "12px 14px", marginBottom: 10, background: k.color.paper }}>
      <div style={{ height: 10, width: "38%", borderRadius: 5, background: `linear-gradient(90deg, ${k.color.paperSoft} 25%, ${k.color.rule}66 50%, ${k.color.paperSoft} 75%)`, backgroundSize: "200% 100%", animation: "admSweep 1.4s linear infinite" }}></div>
      <div style={{ height: 10, width: "82%", borderRadius: 5, marginTop: 8, background: `linear-gradient(90deg, ${k.color.paperSoft} 25%, ${k.color.rule}66 50%, ${k.color.paperSoft} 75%)`, backgroundSize: "200% 100%", animation: "admSweep 1.4s linear infinite 0.15s" }}></div>
      <div style={{ height: 10, width: "64%", borderRadius: 5, marginTop: 8, background: `linear-gradient(90deg, ${k.color.paperSoft} 25%, ${k.color.rule}66 50%, ${k.color.paperSoft} 75%)`, backgroundSize: "200% 100%", animation: "admSweep 1.4s linear infinite 0.3s" }}></div>
    </div>
  );
}

function AdmToast({ children, color }) {
  const k = window.kiosk;
  return (
    <div style={{ background: k.color.ink, color: k.color.paper, border: `1.5px solid ${k.color.ink}`, borderLeft: `5px solid ${color || k.color.success}`, borderRadius: k.r.md, boxShadow: k.shadow.printSm(color || k.color.success), padding: "11px 16px", fontSize: 12.5, lineHeight: 1.5 }}>{children}</div>
  );
}

function AdminStatesDesktop({ lang = "DE" }) {
  const k = window.kiosk;
  return (
    <div style={{ width: 1280, minHeight: 1380, background: k.color.paper, color: k.color.ink, fontFamily: k.font.display, position: "relative", overflow: "hidden", padding: "36px 40px 40px" }}>
      <style>{window.kioskFonts}</style>
      <style>{`
        @keyframes admSweep { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes admPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
      `}</style>
      <div style={window.paperGrainStyle}></div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: k.font.mono, fontSize: 11, color: window.ADM_ACCENT, letterSpacing: "0.12em" }}>ADMIN MODERATION · ZUSTÄNDE · 9 STATES</div>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", margin: "6px 0 0", lineHeight: 1 }}>
          Jeder Zustand hat ein <span style={{ fontFamily: k.font.serif, fontStyle: "italic", fontWeight: 400, color: window.ADM_ACCENT }}>Gesicht</span>
        </h1>
        <div style={{ fontFamily: k.font.mono, fontSize: 10.5, color: k.color.inkMute, marginTop: 8 }}>GRUPPE A · ANZEIGE (01–03) — GRUPPE B · AKTIONEN (04–06) — GRUPPE C · GRENZEN (07–09)</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>

        {/* 01 loading */}
        <AdmStateTile n="01" title="Stapel lädt" sub="skeleton-sweep · 1.4s">
          <AdmSkeletonCard />
          <AdmSkeletonCard />
          <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, marginTop: 4 }}>reduced-motion: statisches paperSoft</div>
        </AdmStateTile>

        {/* 02 empty queue */}
        <AdmStateTile n="02" title="Stapel leer" sub="der gute Zustand" color={k.color.success}>
          <div style={{ textAlign: "center", padding: "26px 12px" }}>
            <div style={{ width: 44, height: 44, margin: "0 auto 12px", borderRadius: "50%", border: `1.5px solid ${k.color.success}`, display: "flex", alignItems: "center", justifyContent: "center", color: k.color.success, fontSize: 19, fontWeight: 700 }}>✓</div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Nichts zu prüfen.</div>
            <div style={{ fontFamily: k.font.serif, fontStyle: "italic", fontSize: 13.5, color: k.color.inkSoft, marginTop: 4 }}>Der Kiez benimmt sich.</div>
            <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, marginTop: 10 }}>letzter Entscheid: heute 08:02</div>
          </div>
        </AdmStateTile>

        {/* 03 empty history */}
        <AdmStateTile n="03" title="Protokoll leer" sub="frische Instanz">
          <div style={{ textAlign: "center", padding: "26px 12px" }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.015em" }}>Noch keine Entscheide.</div>
            <div style={{ fontSize: 12, color: k.color.inkSoft, marginTop: 5, lineHeight: 1.5 }}>Sobald du frei gibst oder ablehnst,<br />entsteht hier das Protokoll.</div>
            <div style={{ marginTop: 12, display: "inline-block", border: k.border.ink, borderRadius: k.r.pill, padding: "6px 14px", fontSize: 12, fontWeight: 700 }}>→ zum Prüfstapel</div>
          </div>
        </AdmStateTile>

        {/* 04 action in flight */}
        <AdmStateTile n="04" title="Aktion läuft" sub="optimistisch · Karte gedimmt" color={k.color.warn}>
          <div style={{ border: k.border.ink, borderRadius: k.r.md, padding: "12px 14px", background: k.color.paper, opacity: 0.55, position: "relative" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>E-Bike Cube, neuwertig — 250 €</div>
            <div style={{ fontSize: 11, color: k.color.inkMute, marginTop: 3 }}>R. Novak · Markt</div>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: k.font.mono, fontSize: 10.5, fontWeight: 600, background: k.color.paperWarm, border: k.border.ink, borderRadius: k.r.pill, padding: "5px 13px", animation: "admPulse 1.2s ease-in-out infinite" }}>wird abgelehnt…</span>
            </div>
          </div>
          <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, marginTop: 10 }}>Buttons deaktiviert bis Antwort · dann Karte raus (settle 220ms)</div>
        </AdmStateTile>

        {/* 05 bulk result */}
        <AdmStateTile n="05" title="Bulk-Ergebnis" sub="Teilerfolg wird aufgeschlüsselt">
          <AdmToast color={k.color.warn}>
            <b>Bulk abgeschlossen:</b> 4 abgelehnt · 1 bereits bearbeitet · 1 fehlgeschlagen
            <div style={{ fontFamily: k.font.mono, fontSize: 10, opacity: 0.7, marginTop: 4 }}>fehlgeschlagene bleiben im Stapel · erneut versuchen</div>
          </AdmToast>
          <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, marginTop: 10 }}>mappt das results[]-Array des bulk-review-API 1:1</div>
        </AdmStateTile>

        {/* 06 error */}
        <AdmStateTile n="06" title="Laden fehlgeschlagen" sub="503 / offline" color={k.color.danger}>
          <div style={{ border: `1.5px solid ${k.color.danger}`, borderRadius: k.r.md, background: `${k.color.danger}0d`, padding: "14px 16px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>Stapel nicht erreichbar.</div>
            <div style={{ fontSize: 12, color: k.color.inkSoft, marginTop: 4, lineHeight: 1.5 }}>Der Server antwortet nicht. Nichts ist verloren — der Stapel wartet.</div>
            <div style={{ marginTop: 10, display: "inline-block", background: k.color.ink, color: k.color.paper, borderRadius: k.r.pill, padding: "6px 14px", fontSize: 12, fontWeight: 700, boxShadow: k.shadow.printSm(k.color.danger) }}>⟳ erneut versuchen</div>
          </div>
        </AdmStateTile>

        {/* 07 urgent anatomy */}
        <AdmStateTile n="07" title="Dringend-Fall" sub="urgent_review · sortiert oben" color={k.color.danger}>
          <div style={{ border: `2px solid ${k.color.danger}`, borderRadius: k.r.md, background: k.color.paperWarm, boxShadow: k.shadow.printSm(k.color.danger), padding: "11px 13px" }}>
            <span style={{ fontFamily: k.font.mono, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.08em", background: k.color.danger, color: k.color.paper, padding: "2px 8px", borderRadius: k.r.sm, border: `1px solid ${k.color.ink}`, animation: "admPulse 1.6s ease-in-out infinite" }}>DRINGEND</span>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 7, letterSpacing: "-0.01em" }}>2-Zi-Wohnung — „keine Ausländer…“</div>
            <div style={{ marginTop: 6 }}><window.AdmCatChip k="hate" score={0.91} lang={lang} /></div>
          </div>
          <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, marginTop: 10 }}>score ≥ 0.85 in kritischer Kategorie ⇒ urgent · eigener Zähler</div>
        </AdmStateTile>

        {/* 08 ban triggered */}
        <AdmStateTile n="08" title="Sperre ausgelöst" sub="nach 3. Verwarnung" color={k.color.danger}>
          <AdmToast color={k.color.danger}>
            <b>Klaus W. wurde gesperrt</b> — 3/3 Verwarnungen.
            <div style={{ fontFamily: k.font.mono, fontSize: 10, opacity: 0.7, marginTop: 4 }}>Sperre aufheben: im Protokoll → Autor → „entsperren“</div>
          </AdmToast>
          <div style={{ fontFamily: k.font.mono, fontSize: 10, color: k.color.inkMute, marginTop: 10 }}>kommt nur nach bestätigter Ban-Bremse — nie überraschend</div>
        </AdmStateTile>

        {/* 09 forbidden */}
        <AdmStateTile n="09" title="Kein Zugriff" sub="403 · role !== admin">
          <div style={{ textAlign: "center", padding: "20px 12px" }}>
            <div style={{ width: 44, height: 44, margin: "0 auto 12px", borderRadius: "50%", background: window.ADM_ACCENT, border: k.border.ink, display: "flex", alignItems: "center", justifyContent: "center", color: k.color.paper, fontSize: 17 }}>⚑</div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.015em" }}>Dieser Bereich gehört der Moderation.</div>
            <div style={{ fontSize: 12, color: k.color.inkSoft, marginTop: 5 }}>Dein Konto hat keine Admin-Rechte.</div>
            <div style={{ marginTop: 12, display: "inline-block", border: k.border.ink, borderRadius: k.r.pill, padding: "6px 14px", fontSize: 12, fontWeight: 700 }}>← zurück zum Forum</div>
          </div>
        </AdmStateTile>
      </div>

      <window.KioskAnnotate bottom={26} right={30} rotate={2}>
        CC: §09 setzt echten Rollen-Check voraus — isAdmin() im Bestand ist noch ein Platzhalter (leere ADMIN_USER_IDS-Liste lässt JEDEN durch). Vor Umsetzung fixen.
      </window.KioskAnnotate>
    </div>
  );
}

Object.assign(window, { AdmStateTile, AdmSkeletonCard, AdmToast, AdminStatesDesktop });

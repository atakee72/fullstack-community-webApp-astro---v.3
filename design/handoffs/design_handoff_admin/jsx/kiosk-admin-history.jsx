/* global React */

// ══════════════════════════════════════════════════════════
//  ADMIN MODERATION · History table (Prüfprotokoll)
//  Maps the real history view: sortable columns, column
//  visibility menu, decision filter, pagination.
//  Special filter note: „Alle“ in history = approved OR
//  rejected — NIE pending (reviewStatus: 'reviewed' im API).
// ══════════════════════════════════════════════════════════

const ADM_HISTORY = [
  {
    date: "03.07. · 16:20", revDate: "03.07. · 18:02", source: "ai", type: "topic",
    title: "Möbel zu verschenken vor Hausnummer 12", author: "S. Öztürk",
    cats: [{ k: "spam_check:ad_promotional", score: 0.61 }],
    decision: "approved", note: { DE: "Fehlalarm — normale Kiez-Anzeige.", EN: "False positive — normal kiez post." },
  },
  {
    date: "03.07. · 11:44", revDate: "03.07. · 12:15", source: "report", type: "comment",
    title: "Kommentar zu „Lärm am Herrfurthplatz“", author: "T. Vogel", reportReason: "harassment",
    decision: "warning", warning: { DE: "Hinweis der Moderation: Ton bitte nachbarschaftlich.", EN: "Moderation note: keep the tone neighborly." },
  },
  {
    date: "02.07. · 21:05", revDate: "03.07. · 09:30", source: "ai", type: "marketplace",
    title: "iPhone 15 Pro, OVP — 180 €", author: "Klaus W.",
    cats: [{ k: "spam_check:scam", score: 0.93 }],
    decision: "rejected", reason: { DE: "Betrugsverdacht — Preis unrealistisch, Vorkasse gefordert.", EN: "Suspected scam — unrealistic price, upfront payment demanded." },
  },
  {
    date: "02.07. · 14:12", revDate: "02.07. · 14:40", source: "news", type: "news",
    title: "Neue Fahrradstraße Weisestraße beschlossen", author: "E. Aydın",
    cats: [{ k: "relevance", score: 0.84 }],
    decision: "approved", note: { DE: "In Kurier Nr. 181 aufgenommen.", EN: "Added to Kurier issue 181." },
  },
  {
    date: "01.07. · 19:58", revDate: "02.07. · 08:10", source: "ai", type: "comment",
    title: "Kommentar zu „Kita-Plätze 2026/27“", author: "Klaus W.",
    cats: [{ k: "harassment", score: 0.77 }],
    decision: "rejected", reason: { DE: "Persönlicher Angriff auf Nachbarin.", EN: "Personal attack on a neighbor." },
  },
  {
    date: "01.07. · 10:31", revDate: "01.07. · 10:52", source: "report", type: "event",
    title: "Flohmarkt-Termin doppelt eingestellt", author: "J. Brandt", reportReason: "spam",
    decision: "approved", note: { DE: "Meldung verworfen — Duplikat war schon gelöscht.", EN: "Report dismissed — duplicate already deleted." },
  },
];

// ─── Decision chip ───
function AdmDecisionChip({ decision, lang = "DE" }) {
  const k = window.kiosk;
  const map = {
    approved: { l: { DE: "✓ freigegeben", EN: "✓ approved" }, c: k.color.success },
    warning:  { l: { DE: "⚠ mit hinweis", EN: "⚠ with warning" }, c: k.color.warn },
    rejected: { l: { DE: "✕ abgelehnt", EN: "✕ rejected" }, c: k.color.danger },
  };
  const m = map[decision];
  return (
    <span style={{
      fontFamily: k.font.mono, fontSize: 10.5, fontWeight: 500, whiteSpace: "nowrap",
      color: m.c, background: k.color.paperWarm,
      padding: "3px 9px", borderRadius: k.r.sm, border: `1px solid ${m.c}66`,
    }}>{m.l[lang]}</span>
  );
}

// ─── Column visibility menu (floating) ───
function AdmColumnMenu({ lang = "DE" }) {
  const k = window.kiosk;
  const cols = lang === "DE"
    ? ["Datum", "Quelle", "Typ", "Inhalt", "Autor:in", "Markiert als", "Entscheid", "Grund / Hinweis"]
    : ["Date", "Source", "Type", "Content", "Author", "Flagged as", "Decision", "Reason / warning"];
  return (
    <div style={{
      position: "absolute", top: 40, right: 0, zIndex: 6, minWidth: 180,
      background: k.color.paperWarm, border: k.border.ink, borderRadius: k.r.md,
      boxShadow: k.shadow.print(), padding: "8px 0",
    }}>
      {cols.map((c, i) => (
        <div key={c} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 14px", fontSize: 12.5, fontWeight: 600, color: i === 7 ? k.color.inkMute : k.color.ink }}>
          <window.AdmCheckbox checked={i !== 7} />
          <span>{c}</span>
        </div>
      ))}
      <div style={{ fontFamily: k.font.mono, fontSize: 9.5, color: k.color.inkMute, padding: "6px 14px 0", borderTop: `1px dashed ${k.color.rule}`, marginTop: 6 }}>
        {lang === "DE" ? "mind. 1 Spalte bleibt sichtbar" : "at least 1 column stays visible"}
      </div>
    </div>
  );
}

// ─── History table view ───
function AdminHistoryDesktop({ lang = "DE", menuOpen = true }) {
  const k = window.kiosk;
  const H = lang === "DE"
    ? { date: "Datum ↓", source: "Quelle", type: "Typ", content: "Inhalt", author: "Autor:in", flagged: "Markiert als", decision: "Entscheid", reason: "Grund / Hinweis" }
    : { date: "Date ↓", source: "Source", type: "Type", content: "Content", author: "Author", flagged: "Flagged as", decision: "Decision", reason: "Reason / warning" };
  return (
    <div style={{ width: 1280, minHeight: 1120, background: k.color.paper, color: k.color.ink, fontFamily: k.font.display, position: "relative", overflow: "hidden" }}>
      <style>{window.kioskFonts}</style>
      <div style={window.paperGrainStyle}></div>
      <window.AdmMasthead lang={lang} />
      <window.AdmTitleBlock lang={lang} view="history" />

      {/* history-only controls: decision filter + column menu */}
      <div style={{ padding: "14px 36px", display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
        {(lang === "DE" ? ["Alle", "Freigegeben", "Abgelehnt"] : ["All", "Approved", "Rejected"]).map((f, i) => (
          <span key={f} style={{
            padding: "5px 12px", fontSize: 12.5, fontWeight: 600,
            background: i === 0 ? k.color.ink : "transparent",
            color: i === 0 ? k.color.paper : k.color.ink,
            border: k.border.ink, borderRadius: k.r.pill,
          }}>{f}</span>
        ))}
        <span style={{ fontFamily: k.font.mono, fontSize: 10.5, color: k.color.inkMute, marginLeft: 6 }}>
          {lang === "DE" ? "„Alle“ = freigegeben + abgelehnt — nie offen" : "“All” = approved + rejected — never pending"}
        </span>
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <span style={{ padding: "6px 14px", fontSize: 12.5, fontWeight: 700, border: k.border.ink, borderRadius: k.r.pill, background: menuOpen ? k.color.ink : "transparent", color: menuOpen ? k.color.paper : k.color.ink }}>
            ▦ {lang === "DE" ? "Spalten" : "Columns"}
          </span>
          {menuOpen ? <AdmColumnMenu lang={lang} /> : null}
        </div>
      </div>

      {/* table */}
      <div style={{ margin: "4px 36px 24px", border: k.border.ink, borderRadius: k.r.lg, overflow: "hidden", background: k.color.paperWarm, boxShadow: k.shadow.printSm() }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: `1.5px solid ${k.color.ink}` }}>
              {[H.date, H.source, H.type, H.content, H.author, H.flagged, H.decision].map((h, i) => (
                <th key={h} style={{
                  textAlign: "left", padding: "10px 14px",
                  fontFamily: k.font.mono, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: i === 0 ? window.ADM_ACCENT : k.color.inkMute,
                  whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADM_HISTORY.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: ri < ADM_HISTORY.length - 1 ? `1px dashed ${k.color.rule}` : "none", verticalAlign: "top" }}>
                <td style={{ padding: "12px 14px", fontFamily: k.font.mono, fontSize: 10.5, color: k.color.inkMute, whiteSpace: "nowrap" }}>
                  <div>{row.date}</div>
                  <div style={{ fontSize: 9, marginTop: 2 }}>{lang === "DE" ? "geprüft" : "rev"} {row.revDate}</div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <window.AdmSourceStrap item={{ source: row.source, reportCount: 1 }} lang={lang} />
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <window.AdmTypeChip type={row.type} lang={lang} />
                </td>
                <td style={{ padding: "12px 14px", maxWidth: 260 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em", lineHeight: 1.35 }}>{row.title}</div>
                </td>
                <td style={{ padding: "12px 14px", whiteSpace: "nowrap", fontSize: 12.5 }}>{row.author}</td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {row.reportReason
                      ? <span style={{ fontFamily: k.font.mono, fontSize: 10, fontWeight: 500, color: k.color.ink, background: k.color.ochre, padding: "2px 8px", borderRadius: k.r.sm, border: `1px solid ${k.color.ink}` }}>{window.ADM_REPORT_REASONS[row.reportReason][lang]}</span>
                      : (row.cats || []).map((c) => <window.AdmCatChip key={c.k} k={c.k} score={c.score} lang={lang} />)}
                  </div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <AdmDecisionChip decision={row.decision} lang={lang} />
                  {(row.reason || row.warning || row.note) ? (
                    <div style={{ marginTop: 5, fontSize: 11, lineHeight: 1.4, maxWidth: 200, color: row.reason ? k.color.danger : row.warning ? k.color.warn : k.color.inkMute, fontStyle: row.note ? "italic" : "normal", fontFamily: row.note ? k.font.serif : k.font.display }}>
                      {(row.reason || row.warning || row.note)[lang]}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div style={{ display: "flex", justifyContent: "center", gap: 14, alignItems: "center", fontFamily: k.font.mono, fontSize: 11, color: k.color.inkMute, paddingBottom: 26 }}>
        <span style={{ border: k.border.ink, borderRadius: k.r.pill, padding: "5px 14px", color: k.color.ink, fontWeight: 600 }}>{lang === "DE" ? "← zurück" : "← prev"}</span>
        <span>{lang === "DE" ? "Seite 1 von 6 · 53 Entscheide · zeige 10 | 25 | 50" : "page 1 of 6 · 53 decisions · show 10 | 25 | 50"}</span>
        <span style={{ border: k.border.ink, borderRadius: k.r.pill, padding: "5px 14px", color: k.color.ink, fontWeight: 600 }}>{lang === "DE" ? "weiter →" : "next →"}</span>
      </div>

      <window.KioskAnnotate top={330} left={22} rotate={-2}>
        {lang === "DE"
          ? "Sortierbar: Datum · Score · Entscheid (Klick auf Kopfzeile). Spaltenmenü wie im Bestand — „Grund“ standardmäßig aus."
          : "Sortable: date · score · decision (click header). Column menu as in current code — “Reason” hidden by default."}
      </window.KioskAnnotate>
    </div>
  );
}

Object.assign(window, { ADM_HISTORY, AdmDecisionChip, AdmColumnMenu, AdminHistoryDesktop });

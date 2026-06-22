/* global React, kiosk, kioskFonts, paperGrainStyle, KioskBtn, news, SEED_ARTICLES, TODAY, SektionTag, SourceChip, HeatChip, KuratiertChip, ReadDot, SaveToggle */

// ══════════════════════════════════════════════════════════
//  KIOSK · NEWSBOARD · NOVEL FEATURES
//  Three Kiosk-flavored modules the user picked:
//    01 Daily issue masthead
//    02 Mark-as-read opacity decay
//    03 Heat indicator (multi-Forum-link chip)
//  Each tile: anatomy diagram · trigger · timing rules · copy.
// ══════════════════════════════════════════════════════════

function Feature({ n, title, subtitle, color = kiosk.color.ink, children, lang }) {
  return (
    <section style={{
      background: kiosk.color.paperWarm,
      border: kiosk.border.ink,
      borderRadius: kiosk.r.lg,
      padding: 28,
      boxShadow: kiosk.shadow.print(color),
      position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 12, color: color, fontWeight: 700, letterSpacing: "0.15em" }}>§{n}</span>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.025em", margin: 0, lineHeight: 1.05 }}>{title}</h2>
      </div>
      <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, color: kiosk.color.inkSoft, margin: "0 0 18px" }}>{subtitle}</p>
      {children}
    </section>
  );
}

function FeatureNote({ color = kiosk.color.ink, lang, children }) {
  return (
    <div style={{
      marginTop: 14, padding: "10px 12px",
      background: kiosk.color.ink,
      borderRadius: kiosk.r.sm,
      fontFamily: kiosk.font.mono, fontSize: 10.5, lineHeight: 1.5,
      color: kiosk.color.paper, letterSpacing: "0.04em",
    }}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  01 · Daily issue masthead — anatomy diagram
// ═══════════════════════════════════════════════════════════════════

function MastheadAnatomy({ lang = "DE" }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 0.7fr", gap: 22 }}>
      {/* Masthead specimen with callouts */}
      <div style={{ position: "relative" }}>
        <div style={{
          padding: "20px 24px",
          background: kiosk.color.paper,
          border: kiosk.border.ink,
          borderRadius: kiosk.r.md,
        }}>
          {/* Top ribbon */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 600,
            color: kiosk.color.ink, letterSpacing: "0.16em",
            textTransform: "uppercase", paddingBottom: 8,
            borderBottom: `1px solid ${kiosk.color.ink}`,
          }}>
            <span>{lang === "DE" ? "Tagesausgabe" : "Daily edition"}</span>
            <span>{lang === "DE" ? TODAY.de : TODAY.en}</span>
            <span>Nr. {TODAY.issue}</span>
          </div>
          <h1 style={{
            fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400,
            fontSize: 56, lineHeight: 0.92, letterSpacing: "-0.025em",
            margin: "12px 0 4px", color: kiosk.color.ink, textAlign: "center",
          }}>Schillerkiez Kurier</h1>
          <div style={{ textAlign: "center", fontFamily: kiosk.font.display, fontSize: 12, color: kiosk.color.inkSoft, marginBottom: 10 }}>
            {lang === "DE" ? "Schillerkiezs tägliche Zusammenfassung" : "Schillerkiez's daily digest"}
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 8, borderTop: `1px solid ${kiosk.color.ink}`,
            fontFamily: kiosk.font.mono, fontSize: 9,
            color: kiosk.color.inkSoft, letterSpacing: "0.06em",
          }}>
            <span><b style={{ color: kiosk.color.ink }}>14</b> {lang === "DE" ? "Artikel heute" : "articles today"}</span>
            <span><b style={{ color: kiosk.color.ink }}>9</b> {lang === "DE" ? "Quellen" : "sources"}</span>
            <KuratiertChip lang={lang} />
          </div>
        </div>

        {/* Annotation callouts */}
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ padding: "8px 10px", background: kiosk.color.paper, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.wine, letterSpacing: "0.1em" }}>{lang === "DE" ? "DATUM" : "DATE"}</div>
            <div style={{ fontFamily: kiosk.font.display, fontSize: 11, color: kiosk.color.ink, lineHeight: 1.45, marginTop: 2 }}>
              {lang === "DE" ? "Wochentag · Datum · Jahr. Aus dem fetchDate des heutigen Cron-Laufs." : "Day · date · year. From today's fetchDate cron run."}
            </div>
          </div>
          <div style={{ padding: "8px 10px", background: kiosk.color.paper, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.wine, letterSpacing: "0.1em" }}>NR.</div>
            <div style={{ fontFamily: kiosk.font.display, fontSize: 11, color: kiosk.color.ink, lineHeight: 1.45, marginTop: 2 }}>
              {lang === "DE" ? "Tage seit Launch. Bestimmt fest, nicht je Re-Render." : "Days since launch. Determined fixed, not per re-render."}
            </div>
          </div>
          <div style={{ padding: "8px 10px", background: kiosk.color.paper, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.wine, letterSpacing: "0.1em" }}>{lang === "DE" ? "STATS" : "STATS"}</div>
            <div style={{ fontFamily: kiosk.font.display, fontSize: 11, color: kiosk.color.ink, lineHeight: 1.45, marginTop: 2 }}>
              {lang === "DE" ? "Artikelzahl + Quellenzahl. Verlinkt zur Quellen-Übersicht." : "Article count + source count. Links to source overview."}
            </div>
          </div>
          <div style={{ padding: "8px 10px", background: kiosk.color.paper, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.wine, letterSpacing: "0.1em" }}>{lang === "DE" ? "AI-CHIP" : "AI CHIP"}</div>
            <div style={{ fontFamily: kiosk.font.display, fontSize: 11, color: kiosk.color.ink, lineHeight: 1.45, marginTop: 2 }}>
              {lang === "DE" ? "„kuratiert“ — soft transparency. Hier, nicht pro-Artikel." : "„curated“ — soft transparency. Here, not per-article."}
            </div>
          </div>
        </div>
      </div>

      {/* Variants column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.12em" }}>{lang === "DE" ? "VARIANTEN" : "VARIANTS"}</div>
        {/* Degraded variant */}
        <div style={{
          padding: 10, background: kiosk.color.paper,
          border: `1px solid ${kiosk.color.warn}`,
          borderRadius: kiosk.r.sm,
        }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 8, color: kiosk.color.warn, letterSpacing: "0.15em", marginBottom: 4 }}>RSS-ONLY</div>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 22, lineHeight: 1, color: kiosk.color.ink, textAlign: "center" }}>Schillerkiez Kurier</div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 8, color: kiosk.color.warn, marginTop: 4, textAlign: "center" }}>{lang === "DE" ? "7 von 9 Quellen" : "7 of 9 sources"}</div>
        </div>
        {/* Sonntag-Edition / weekend variant */}
        <div style={{
          padding: 10, background: kiosk.color.paper,
          border: `1px solid ${kiosk.color.rule}`,
          borderRadius: kiosk.r.sm,
        }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 8, color: kiosk.color.inkMute, letterSpacing: "0.15em", marginBottom: 4 }}>{lang === "DE" ? "WOCHENENDE" : "WEEKEND"}</div>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 22, lineHeight: 1, color: kiosk.color.ink, textAlign: "center" }}>Schillerkiez Kurier</div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 8, color: kiosk.color.inkMute, marginTop: 4, textAlign: "center" }}>{lang === "DE" ? "Sa/So-Ausgabe" : "Sat/Sun edition"}</div>
        </div>
        {/* Mobile variant */}
        <div style={{
          padding: 8, background: kiosk.color.paper,
          border: `1px solid ${kiosk.color.rule}`,
          borderRadius: kiosk.r.sm,
        }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 8, color: kiosk.color.inkMute, letterSpacing: "0.15em", marginBottom: 4 }}>MOBILE</div>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 17, lineHeight: 1, color: kiosk.color.ink, textAlign: "center" }}>Schillerkiez Kurier</div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 8, color: kiosk.color.inkMute, marginTop: 3, textAlign: "center" }}>Nr. {TODAY.issue}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  02 · Mark-as-read decay — timeline diagram
// ═══════════════════════════════════════════════════════════════════

function ReadDecayTimeline({ lang = "DE" }) {
  const stages = [
    { state: "fresh",    opacity: 1,    label: lang === "DE" ? "ungelesen" : "unread",          sub: lang === "DE" ? "voller Kontrast" : "full contrast",        dot: false },
    { state: "seen",     opacity: 0.55, label: lang === "DE" ? "gelesen" : "read",              sub: lang === "DE" ? "geöffnet · opacity 0.55" : "opened · opacity 0.55", dot: true },
    { state: "archived", opacity: 0.32, label: lang === "DE" ? "archiviert" : "archived",       sub: lang === "DE" ? "nur in Leseliste" : "in saved view only",        dot: true },
  ];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {stages.map((s, i) => (
          <div key={s.state} style={{ position: "relative" }}>
            {/* Mock card at each opacity */}
            <div style={{
              padding: 12,
              background: kiosk.color.paper,
              border: kiosk.border.hair,
              borderRadius: kiosk.r.sm,
              opacity: s.opacity,
            }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 5 }}>
                <ReadDot read={s.dot} />
                <SektionTag id="verkehr" lang={lang} mini />
              </div>
              <div style={{ fontFamily: kiosk.font.display, fontSize: 13, fontWeight: 700, lineHeight: 1.2, marginBottom: 3 }}>
                {lang === "DE" ? "Karl-Marx-Straße: Verkehrsberuhigung" : "Karl-Marx-Straße: traffic calming"}
              </div>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute }}>
                rbb24 · {lang === "DE" ? "vor 2 Std." : "2h ago"}
              </div>
            </div>
            {/* Annotation */}
            <div style={{ marginTop: 10, padding: "6px 8px", background: kiosk.color.paperWarm, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ink, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.label}</span>
                <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.wine }}>opacity {s.opacity}</span>
              </div>
              <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 11, color: kiosk.color.inkSoft, lineHeight: 1.35, marginTop: 2 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Transition arrow */}
      <div style={{ marginTop: 14, padding: "10px 12px", background: kiosk.color.paper, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm, display: "flex", alignItems: "center", gap: 14, fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.ink, lineHeight: 1.5 }}>
        <span style={{ background: kiosk.color.ink, color: kiosk.color.paper, padding: "2px 6px", borderRadius: 3, fontWeight: 700 }}>→</span>
        <span style={{ fontFamily: kiosk.font.display, fontSize: 12.5, fontWeight: 500 }}>
          {lang === "DE"
            ? "Übergang ist sofortig (kein fade — die Markierung soll sich verbindlich anfühlen)."
            : "Transition is immediate (no fade — the mark should feel committed)."}
        </span>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  03 · Heat indicator — multi-Forum-link
// ═══════════════════════════════════════════════════════════════════

function HeatLogic({ lang = "DE" }) {
  // Pick an article with high heat
  const hot = SEED_ARTICLES.find((a) => a.forumLinks >= 4) || SEED_ARTICLES[0];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 0.85fr", gap: 22 }}>
      <div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.12em", marginBottom: 8 }}>{lang === "DE" ? "BEISPIEL" : "EXAMPLE"}</div>
        <div style={{ padding: 14, background: kiosk.color.paper, border: kiosk.border.ink, borderRadius: kiosk.r.md, boxShadow: kiosk.shadow.printSm(kiosk.color.ochre) }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <SektionTag id={hot.sektion} lang={lang} mini />
            <HeatChip count={hot.forumLinks} lang={lang} mini />
          </div>
          <div style={{ fontFamily: kiosk.font.display, fontSize: 18, fontWeight: 700, lineHeight: 1.15, color: kiosk.color.ink, marginBottom: 4 }}>
            {lang === "DE" ? hot.title : hot.titleEN}
          </div>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 13, color: kiosk.color.inkSoft, lineHeight: 1.35, marginBottom: 8 }}>
            {lang === "DE" ? hot.dek : hot.dekEN}
          </div>
          <SourceChip id={hot.quelle} lang={lang} mini />
        </div>

        {/* Forum-link list (showing what triggered the heat) */}
        <div style={{ marginTop: 12, padding: 12, background: kiosk.color.paperSoft, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 6 }}>
            {lang === "DE" ? `↳ ${hot.forumLinks} Forum-Beiträge verlinken auf diesen Artikel:` : `↳ ${hot.forumLinks} forum posts link to this article:`}
          </div>
          {[
            { who: "Aylin K.",   when: lang === "DE" ? "vor 3 Std." : "3h ago",   what: lang === "DE" ? "„Wirkliches Referendum oder Show?“" : "„Real referendum or show?“" },
            { who: "Marek P.",   when: lang === "DE" ? "vor 5 Std." : "5h ago",   what: lang === "DE" ? "„Wer organisiert die Gegen-Initiative?“" : "„Who organizes the opposition?“" },
            { who: "Henrike B.", when: lang === "DE" ? "vor 6 Std." : "6h ago",   what: lang === "DE" ? "„Pro Bebauung — wer noch?“" : "„Pro-development — who else?“" },
            { who: "Çiğdem A.",  when: lang === "DE" ? "vor 8 Std." : "8h ago",   what: lang === "DE" ? "„Klimagutachten verlinken!“" : "„Link the climate report!“" },
          ].slice(0, hot.forumLinks).map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 6, fontFamily: kiosk.font.display, fontSize: 11, color: kiosk.color.ink, lineHeight: 1.5, paddingTop: 4 }}>
              <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", color: kiosk.color.inkSoft, minWidth: 70 }}>{p.who}</span>
              <span style={{ flex: 1 }}>{p.what}</span>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute }}>{p.when}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Threshold spec */}
      <div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.12em", marginBottom: 8 }}>{lang === "DE" ? "SCHWELLENWERT" : "THRESHOLD"}</div>
        <div style={{ padding: 14, background: kiosk.color.paper, border: kiosk.border.ink, borderRadius: kiosk.r.md }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
            <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 56, lineHeight: 1, color: kiosk.color.ochre }}>≥ 2</span>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.06em" }}>{lang === "DE" ? "Forum-Verlinkungen" : "forum links"}</span>
          </div>
          <div style={{ fontFamily: kiosk.font.display, fontSize: 13.5, lineHeight: 1.5, color: kiosk.color.ink, marginBottom: 8 }}>
            {lang === "DE"
              ? "Sobald zwei oder mehr Forum-Beiträge auf einen Artikel verlinken, erscheint der ♨-Chip im Artikel."
              : "As soon as two or more forum posts link to an article, the ♨ chip appears on the article."}
          </div>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12, color: kiosk.color.inkSoft, lineHeight: 1.45 }}>
            {lang === "DE"
              ? "Asymmetrische Beziehung: Newsboard zeigt „im Forum diskutiert“; Forum-Threads zeigen den Artikel-Link wie gewohnt."
              : "Asymmetric: Newsboard shows „discussed in forum“; forum threads show the article link as normal."}
          </div>
        </div>

        {/* Counter copy variants */}
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em" }}>{lang === "DE" ? "COPY-LAYERN" : "COPY LAYERS"}</div>
          <div style={{ padding: "5px 8px", background: kiosk.color.paper, border: `1px dashed ${kiosk.color.rule}`, borderRadius: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <HeatChip count={2} lang={lang} mini />
            <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 10.5, color: kiosk.color.inkSoft }}>{lang === "DE" ? "knapp" : "low"}</span>
          </div>
          <div style={{ padding: "5px 8px", background: kiosk.color.paper, border: `1px dashed ${kiosk.color.rule}`, borderRadius: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <HeatChip count={4} lang={lang} mini />
            <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 10.5, color: kiosk.color.inkSoft }}>{lang === "DE" ? "mittel" : "medium"}</span>
          </div>
          <div style={{ padding: "5px 8px", background: kiosk.color.paper, border: `1px dashed ${kiosk.color.rule}`, borderRadius: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <HeatChip count={9} lang={lang} mini />
            <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 10.5, color: kiosk.color.inkSoft }}>{lang === "DE" ? "hoch · alles diskutiert" : "high · widely discussed"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Showcase artboard
// ═══════════════════════════════════════════════════════════════════

function NewsboardNovelDesktop({ lang = "DE" }) {
  return (
    <div style={{ width: 1280, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", padding: "30px 36px 40px" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative" }}>
        <header style={{ marginBottom: 24, paddingBottom: 14, borderBottom: `2px solid ${kiosk.color.ink}` }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.ink, letterSpacing: "0.18em" }}>NEWSBOARD · NOVEL FEATURES</div>
          <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "6px 0 6px" }}>
            {lang === "DE" ? "Drei Module, die das Kiosk-Heft tragen" : "Three modules that carry the Kiosk paper"}
          </h1>
          <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 16, color: kiosk.color.inkSoft, margin: 0, maxWidth: "70ch" }}>
            {lang === "DE"
              ? "Masthead rahmt jeden Tag. Read-Decay markiert Konsum. Heat verbindet Newsboard mit Forum. Drei kleine Ideen, die Newsboard zu einer Tageszeitung machen — keine Feed-App."
              : "Masthead frames each day. Read-decay marks consumption. Heat connects Newsboard to Forum. Three small ideas that make Newsboard feel like a daily paper — not a feed app."}
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* 01 Masthead */}
          <Feature n="01" title={lang === "DE" ? "Tagesausgabe-Masthead" : "Daily-issue masthead"} subtitle={lang === "DE" ? "Schillerkiez Kurier · Nr. 142 · 24. Mai 2026" : "Schillerkiez Kurier · No. 142 · May 24 2026"} color={kiosk.color.ink} lang={lang}>
            <MastheadAnatomy lang={lang} />
            <FeatureNote color={kiosk.color.ink} lang={lang}>
              ⚙ {lang === "DE"
                ? "TRIGGER: täglicher Cron-Lauf · TODAY.issue = Tage seit Launch (notional 3.1.2026) · Masthead wird nur einmal pro Tag gerendert · degradierte Variante zeigt RSS-only-Warnung im Bottom-Ribbon · Sa/So-Variante (optional, Pilot): „Sa/So-Ausgabe“ im Top-Ribbon · CC: TODAY-Konstante kommt aus serverseitigem fetchDate, nicht clientseitigem Date()."
                : "TRIGGER: daily cron · TODAY.issue = days since launch (notional Jan 3 2026) · masthead renders once per day · degraded variant shows RSS-only warning in bottom ribbon · Sat/Sun variant (optional, pilot): „Sat/Sun edition“ in top ribbon · CC: TODAY constant comes from server-side fetchDate, not client Date()."}
            </FeatureNote>
            <FeatureNote color={kiosk.color.warn} lang={lang}>
              ⚠ {lang === "DE"
                ? "fetchDate-Quirk: user-eingereichte Artikel haben fetchDate = Freigabe-Zeitstempel (NICHT Einreichung). Masthead-Copy „kuratiert für den…“ weicht bewusst aus, um nicht „heute passiert“ zu implizieren."
                : "fetchDate quirk: user-submitted articles use fetchDate = approval timestamp (NOT submission). Masthead copy „curated for…“ intentionally avoids implying „happened today“."}
            </FeatureNote>
          </Feature>

          {/* 02 Read decay */}
          <Feature n="02" title={lang === "DE" ? "Mark-as-read · Opacity-Decay" : "Mark-as-read · opacity decay"} subtitle={lang === "DE" ? "Wie eine durchgesehene Zeitung — was schon gelesen wurde, verblasst leise." : "Like a marked-up newspaper — what's been read fades quietly."} color={kiosk.color.wine} lang={lang}>
            <ReadDecayTimeline lang={lang} />
            <FeatureNote color={kiosk.color.wine} lang={lang}>
              ⚙ {lang === "DE"
                ? "TRIGGER: Artikel-Klick setzt read=true (eingeloggte User serverseitig, Gäste = kein Read-State) · CSS-Variable --news-read-opacity steuert global · Archive-Aktion nur in Saved-View · ARIA: aria-label=„gelesen“ wenn Decay aktiv, kein Hide. SR-Nutzer*innen sollen Inhalt weiterhin hören können."
                : "TRIGGER: article click sets read=true (logged-in users server-side; guests = no read-state) · CSS var --news-read-opacity controls globally · archive action only in saved view · ARIA: aria-label=„read“ when decay active, never hidden. Screen-reader users still hear content."}
            </FeatureNote>
            <FeatureNote color={kiosk.color.warn} lang={lang}>
              ⚠ {lang === "DE"
                ? "Auth-Gate: Read-State NUR für eingeloggte User serverseitig persistiert (keine localStorage-Fallback). Gäste sehen alle Artikel als ungelesen — der read-toggle ist für sie ausgeblendet."
                : "Auth-gate: read-state persists server-side ONLY for logged-in users (no localStorage fallback). Guests see all articles as unread — the read-toggle is hidden for them."}
            </FeatureNote>
          </Feature>

          {/* 03 Heat */}
          <Feature n="03" title={lang === "DE" ? "♨ Heat-Indikator" : "♨ Heat indicator"} subtitle={lang === "DE" ? "Wenn zwei oder mehr Forum-Beiträge auf einen Artikel verlinken: der ochre ♨-Chip taucht auf." : "When two or more forum posts link to an article: the ochre ♨ chip appears."} color={kiosk.color.ochre} lang={lang}>
            <HeatLogic lang={lang} />
            <FeatureNote color={kiosk.color.ochre} lang={lang}>
              ⚙ {lang === "DE"
                ? "TRIGGER: Berechnung serverseitig in den articles-Resolver · COUNT(distinct forum_post WHERE post.body CONTAINS article.id) · gecacht 10 min · Threshold = news.heat.threshold (default 2) · zeigt sich an: Feed-Card, Detail-Header, Mobile-Card · KEINE Reverse-Heat im Forum (Asymmetrie absichtlich — Forum kennt Newsboard nicht)."
                : "TRIGGER: server-side computed in articles resolver · COUNT(distinct forum_post WHERE post.body CONTAINS article.id) · cached 10 min · threshold = news.heat.threshold (default 2) · appears on: feed card, detail header, mobile card · NO reverse heat in forum (asymmetry intentional — forum doesn't know about newsboard)."}
            </FeatureNote>
            <FeatureNote color={kiosk.color.warn} lang={lang}>
              ⚠ {lang === "DE"
                ? "Spam-Schutz: nur Forum-Posts älter als 1 Std. zählen — verhindert, dass Bot-Account oder Gaming durch schnelle Postings einen Heat-Chip auslöst."
                : "Spam protection: only forum posts older than 1h count — prevents bots or gaming via rapid posts from triggering a heat chip."}
            </FeatureNote>
          </Feature>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 28, paddingTop: 14, borderTop: `1px dashed ${kiosk.color.rule}`, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.06em", lineHeight: 1.6 }}>
          → {lang === "DE" ? "Cut: „Smart digest“ Wochen-Email — eigenes Projekt (Resend hat noch keine Transactional-Infrastruktur über die Contact-Relay hinaus)." : "Cut: „smart digest“ weekly email — its own project (Resend has no transactional infra beyond contact-relay yet)."}<br/>
          → {lang === "DE" ? "Cut: Per-Artikel-AI-Score · soft-Transparenz via Masthead-Chip ist ausreichend." : "Cut: per-article AI score · soft transparency via masthead chip is enough."}<br/>
          → {lang === "DE" ? "Cut: Print-Archive — könnte später als „Nr. 141 anzeigen“-Link auf Masthead kommen." : "Cut: print archive — could come later as „show no. 141“ link on masthead."}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  NewsboardNovelDesktop,
});

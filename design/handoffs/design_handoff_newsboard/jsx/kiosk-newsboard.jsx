/* global React, kiosk, kioskFonts, paperGrainStyle, KioskBtn, KioskInput, KioskAvatar, FilterChip */

// ══════════════════════════════════════════════════════════
//  KIOSK · NEWSBOARD
//  Editorial Kiosk applied to AI-curated daily news.
//  Continuous reverse-chrono feed framed by a daily masthead.
//  Headlines + dek + AI summary + weiterlesen → source.
//  Reading-list saves with read/unread + opacity decay.
//  Three novel features: Masthead · Read-decay · Heat indicator.
//  Carved accent for this surface: INK (near-black) — newspaper-
//  traditional, restrained, lets headlines do the work.
//  Tokens here extend window.kiosk; do not duplicate.
// ══════════════════════════════════════════════════════════

const news = {
  // ─── 7 sections (Sektion / Kategorie) ───
  // Sections are taxonomy — they label articles, never flood backgrounds.
  // Colors used only on small inline tags + filter rail; rest of page is ink-on-paper.
  sektion: {
    politik:   { de: "Politik",   en: "Politics",   color: kiosk.color.wine,    textOn: kiosk.color.paper },
    kultur:    { de: "Kultur",    en: "Culture",    color: kiosk.color.plum,    textOn: kiosk.color.paper },
    lokales:   { de: "Lokales",   en: "Local",      color: kiosk.color.ink,     textOn: kiosk.color.paper },
    wirtschaft:{ de: "Wirtschaft",en: "Economy",    color: kiosk.color.moss,    textOn: kiosk.color.paper },
    verkehr:   { de: "Verkehr",   en: "Transit",    color: kiosk.color.teal,    textOn: kiosk.color.paper },
    klima:     { de: "Klima",     en: "Climate",    color: "#8aa67a",           textOn: kiosk.color.ink   },
    sport:     { de: "Sport",     en: "Sport",      color: kiosk.color.ochre,   textOn: kiosk.color.ink   },
  },

  // ─── 9 sources — realistic Berlin/Neukölln-aware ───
  // Each gets a one-letter mark, full name, and an editorial accent.
  // Accent surfaces only on the source chip; never as page accent.
  quelle: {
    rbb:        { name: "rbb24",                 short: "rbb", accent: kiosk.color.teal,    feed: "RSS"      },
    tsp:        { name: "Tagesspiegel",          short: "TS",  accent: kiosk.color.wine,    feed: "RSS"      },
    taz:        { name: "taz",                   short: "taz", accent: kiosk.color.ink,     feed: "RSS"      },
    bzb:        { name: "BZ Berlin",             short: "BZ",  accent: kiosk.color.ochre,   feed: "RSS"      },
    bmp:        { name: "Berliner Morgenpost",   short: "BM",  accent: kiosk.color.plum,    feed: "RSS"      },
    nwk:        { name: "Neuköllner Wochenkurier", short: "NWK", accent: kiosk.color.moss,  feed: "RSS"      },
    nkn:        { name: "neukoellner.net",       short: "n.n", accent: kiosk.color.wine,    feed: "RSS"      },
    nd:         { name: "Neues Deutschland",     short: "ND",  accent: kiosk.color.danger,  feed: "RSS"      },
    newsdata:   { name: "NewsData",              short: "ND·", accent: kiosk.color.inkMute, feed: "API"      }, // optional source
    // user-submitted bucket — explicit, separate from RSS/API
    user:       { name: "eingereicht",            short: "u·",  accent: kiosk.color.inkSoft, feed: "USER"    },
  },

  // ─── Opacity values for read-decay (novel feature 2) ───
  decay: {
    fresh:   1,      // unread, full
    seen:    0.55,   // user has opened it — visibly faded
    archived: 0.32,  // user marked done — even quieter (saved view only)
  },

  // ─── Heat indicator threshold (novel feature 3) ───
  // Articles with >= forumLinks count get the "wird viel diskutiert" chip.
  heat: { threshold: 2, color: kiosk.color.ochre },

  // ─── Masthead config ───
  masthead: {
    name:     { de: "Schillerkiez Kurier", en: "Schillerkiez Kurier" }, // same name in EN, it's a proper noun
    tagline:  { de: "Schillerkiezs tägliche Zusammenfassung",
                en: "Schillerkiez's daily digest" },
    edition:  { de: "Tagesausgabe", en: "Daily edition" },
    curatedBy:{ de: "kuratiert",    en: "AI-curated" },
  },
};

// ═══════════════════════════════════════════════════════════════════
//  Atomic components
// ═══════════════════════════════════════════════════════════════════

// ─── Source chip · "rbb24" with letter mark ───
function SourceChip({ id, lang = "DE", mini = false }) {
  const q = news.quelle[id];
  if (!q) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: kiosk.font.mono, fontSize: mini ? 9 : 10,
      fontWeight: 600, letterSpacing: "0.06em",
      color: kiosk.color.ink,
      border: `1px solid ${kiosk.color.ink}`,
      background: kiosk.color.paperWarm,
      padding: mini ? "1px 5px 1px 1px" : "2px 8px 2px 2px",
      borderRadius: kiosk.r.sm,
      whiteSpace: "nowrap",
    }}>
      <span style={{
        background: q.accent, color: kiosk.color.paper,
        fontWeight: 700, fontSize: mini ? 8 : 9,
        padding: mini ? "1px 4px" : "2px 5px",
        borderRadius: 3, letterSpacing: "0.05em",
      }}>{q.short.toUpperCase()}</span>
      <span style={{ textTransform: "lowercase" }}>{q.name}</span>
    </span>
  );
}

// ─── Section tag · small label ───
function SektionTag({ id, lang = "DE", mini = false }) {
  const s = news.sektion[id];
  if (!s) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontFamily: kiosk.font.mono, fontSize: mini ? 9 : 10,
      fontWeight: 600, letterSpacing: "0.12em",
      padding: mini ? "1px 6px" : "2px 8px",
      background: s.color, color: s.textOn,
      border: `1px solid ${kiosk.color.ink}`,
      borderRadius: kiosk.r.sm,
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{lang === "DE" ? s.de : s.en}</span>
  );
}

// ─── "kuratiert" chip — soft AI transparency, only on masthead ───
function KuratiertChip({ lang = "DE" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: kiosk.font.mono, fontSize: 9.5, fontWeight: 500,
      color: kiosk.color.inkMute, letterSpacing: "0.14em",
      padding: "3px 9px",
      background: "transparent",
      border: `1px dashed ${kiosk.color.inkMute}`,
      borderRadius: kiosk.r.sm,
      textTransform: "uppercase",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: kiosk.color.inkMute, opacity: 0.7 }} />
      {lang === "DE" ? news.masthead.curatedBy.de : news.masthead.curatedBy.en}
    </span>
  );
}

// ─── Heat indicator · "wird viel diskutiert" (novel feature 3) ───
function HeatChip({ count, lang = "DE", mini = false }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: kiosk.font.mono, fontSize: mini ? 9 : 10,
      fontWeight: 700, letterSpacing: "0.08em",
      color: kiosk.color.ink, background: news.heat.color,
      border: `1px solid ${kiosk.color.ink}`,
      padding: mini ? "1px 6px" : "2px 8px",
      borderRadius: kiosk.r.sm,
      boxShadow: kiosk.shadow.printSm(),
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: mini ? 9 : 10 }}>♨</span>
      {lang === "DE" ? `${count}× im Forum` : `${count}× in forum`}
    </span>
  );
}

// ─── Read indicator · small dot next to title ───
function ReadDot({ read }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: read ? "transparent" : kiosk.color.wine,
      border: read ? `1.5px solid ${kiosk.color.inkMute}` : `1.5px solid ${kiosk.color.wine}`,
      flexShrink: 0,
    }} />
  );
}

// ─── Save toggle · bookmark icon ───
function SaveToggle({ saved, mini = false }) {
  const size = mini ? 14 : 18;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size + 8, height: size + 8,
      border: `1.2px solid ${saved ? kiosk.color.ink : kiosk.color.rule}`,
      background: saved ? kiosk.color.ink : "transparent",
      color: saved ? kiosk.color.paper : kiosk.color.inkMute,
      borderRadius: 4, fontSize: size - 2, lineHeight: 1,
      cursor: "pointer",
    }}>{saved ? "■" : "□"}</span>
  );
}

// ─── 4-step image fallback placeholder ───
// Real pipeline: media:content → enclosure → <img> in description → og:image scrape.
// 15-20% of articles end up with no image — must render beautifully.
function ArticleImage({ article, ratio = "16/9", lead = false }) {
  // Pick a strap color from the section, fall back to inkMute.
  const sektion = news.sektion[article.sektion];
  const c = (sektion && sektion.color) || kiosk.color.inkMute;

  // If article has image: striped with section color.
  // If article.noImage: a quieter "no image" placeholder — a typographic block, not a stripe.
  if (article.noImage) {
    return (
      <div style={{
        width: "100%", aspectRatio: ratio,
        borderRadius: kiosk.r.md,
        border: `1px dashed ${kiosk.color.rule}`,
        background: kiosk.color.paperSoft,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: lead ? 42 : 26, color: kiosk.color.inkMute, lineHeight: 1, opacity: 0.6 }}>
          {news.quelle[article.quelle]?.short.toUpperCase().slice(0, 2) || "•"}
        </div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: lead ? 10 : 9, color: kiosk.color.inkMute, letterSpacing: "0.18em", marginTop: 8, textTransform: "uppercase" }}>
          {lead ? "kein bild · headline trägt" : "kein bild"}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: "100%", aspectRatio: ratio,
      borderRadius: kiosk.r.md,
      border: kiosk.border.ink,
      background: `repeating-linear-gradient(${lead ? 25 : 45}deg, ${c}30 0 ${lead ? 14 : 9}px, ${kiosk.color.paperWarm} ${lead ? 14 : 9}px ${lead ? 28 : 18}px)`,
      display: "flex", alignItems: "flex-end", justifyContent: "flex-start",
      padding: lead ? 16 : 8,
      position: "relative",
    }}>
      <span style={{
        background: kiosk.color.paper, padding: "2px 6px",
        border: `1px solid ${kiosk.color.rule}`, borderRadius: 4,
        fontFamily: kiosk.font.mono, fontSize: lead ? 10 : 9,
        color: kiosk.color.inkMute, letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}>{article.imgLabel || (lead ? "Pressefoto · 16:9" : "Foto")}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SEED DATA — 14 articles + 1 lead, real Neukölln/Berlin topics
//  "today" = Samstag 24. Mai 2026 · Nr. 142
//  Issue number = days since launch (notional Jan 3 2026).
// ═══════════════════════════════════════════════════════════════════

const TODAY = { de: "Samstag · 24. Mai 2026", en: "Saturday · May 24 2026", issue: 142 };

const SEED_ARTICLES = [
  // ─── LEAD ────────────────────────────────────────────
  {
    id: "N001", lead: true,
    quelle: "tsp", sektion: "politik",
    title:   "Tempelhofer Feld: Senat lässt neues Bebauungsreferendum prüfen",
    titleEN: "Tempelhofer Feld: Senate moves to examine a new development referendum",
    dek:     "Nach zehn Jahren Stillstand wagt die Koalition einen erneuten Anlauf — gegen den Willen der Bürgerinitiativen.",
    dekEN:   "After ten years of standstill, the coalition risks another attempt — against the will of citizens' initiatives.",
    summary: [
      "Der schwarz-rote Senat hat eine juristische Vorprüfung beauftragt, ob ein neues Referendum zur teilweisen Bebauung des Tempelhofer Felds rechtlich möglich ist. Das ursprüngliche Volksbegehren aus 2014 hatte jede Randbebauung untersagt.",
      "Befürworter*innen verweisen auf die akute Wohnungsnot — Berlin braucht laut neuestem Wohnungsbericht 230.000 zusätzliche Wohnungen bis 2035. Gegner*innen halten das Feld für unverzichtbares Kaltluft-Reservoir, gerade im Zuge der Klimaerwärmung.",
      "Eine Entscheidung über ein neues Referendum wird frühestens für Herbst 2026 erwartet. Bürgerinitiativen kündigen bereits Klagen an.",
    ],
    summaryEN: [
      "The black-red Senate has commissioned a legal pre-examination of whether a new referendum on partial development of Tempelhofer Feld is legally possible. The original 2014 plebiscite had forbidden any edge development.",
      "Supporters cite the acute housing shortage — Berlin needs 230,000 additional units by 2035 according to the latest housing report. Opponents view the field as indispensable cool-air reservoir, particularly with climate warming.",
      "A decision on a new referendum is expected at earliest by autumn 2026. Citizens' initiatives are already announcing lawsuits.",
    ],
    ts:    "vor 47 Min.", tsEN: "47 min ago",
    fetchDate: "24. Mai 2026 · 09:14",
    forumLinks: 4, // heat indicator triggers
    img: { ratio: "16/9" },
    imgLabel: "Luftbild · THF",
  },

  // ─── Today's articles (reverse-chrono) ────────────────
  {
    id: "N002",
    quelle: "rbb", sektion: "verkehr",
    title:   "Karl-Marx-Straße: Vorbereitung der Verkehrsberuhigung beginnt im Juli",
    titleEN: "Karl-Marx-Straße: traffic-calming preparations begin in July",
    dek:     "Erste Bauabschnitte zwischen Hermannplatz und Rathaus Neukölln werden im Juli markiert.",
    dekEN:   "First construction sections between Hermannplatz and Rathaus Neukölln marked in July.",
    summary: [
      "Die Bezirksverwaltung Neukölln hat den Zeitplan für die seit zwei Jahren angekündigte Verkehrsberuhigung der Karl-Marx-Straße bestätigt. Ab Juli werden zunächst Markierungen und Verkehrszeichen geändert — bauliche Maßnahmen folgen ab Herbst.",
      "Geplant sind durchgehende Radspuren, breitere Gehwege und der Wegfall von ca. 110 Parkplätzen. Eine Bürgerveranstaltung im Rathaus Neukölln am 12. Juni soll offene Fragen klären.",
    ],
    summaryEN: [
      "The Neukölln district administration has confirmed the timeline for the traffic-calming of Karl-Marx-Straße, announced two years ago. From July, markings and traffic signs will be changed first — construction measures follow from autumn.",
      "Plans include continuous bike lanes, wider sidewalks, and removal of approximately 110 parking spaces. A citizen event at Rathaus Neukölln on June 12 will address open questions.",
    ],
    ts: "vor 2 Std.", tsEN: "2h ago",
    fetchDate: "24. Mai 2026 · 07:50",
    forumLinks: 3,
  },
  {
    id: "N003",
    quelle: "nwk", sektion: "lokales",
    title:   "Schillerpromenade: Sanierung der mittleren Pflasterung startet Ende Mai",
    titleEN: "Schillerpromenade: middle cobblestone restoration starts end of May",
    dek:     "Zwischen Herrfurthplatz und Allerstraße werden Pflastersteine erneuert.",
    dekEN:   "Between Herrfurthplatz and Allerstraße, cobblestones will be renewed.",
    summary: [
      "Das Bezirksamt Neukölln hat die schon lange erwartete Sanierung des mittleren Abschnitts der Schillerpromenade angekündigt. Die Arbeiten beginnen am 30. Mai und sollen bis Mitte August abgeschlossen sein.",
      "Während der Bauphase bleibt die Promenade für Fußgänger*innen passierbar, Sitzgelegenheiten werden vorübergehend entfernt und im September neu installiert. Anwohner*innen wurden per Aushang informiert.",
    ],
    summaryEN: [
      "The Neukölln district has announced the long-awaited restoration of the middle section of Schillerpromenade. Work begins May 30 and should be completed by mid-August.",
      "During construction the promenade remains passable for pedestrians; seating will be temporarily removed and reinstalled in September. Residents were informed by posted notices.",
    ],
    ts: "vor 4 Std.", tsEN: "4h ago",
    fetchDate: "24. Mai 2026 · 06:02",
    forumLinks: 6,
    noImage: true, // tests the no-image placeholder
  },
  {
    id: "N004",
    quelle: "taz", sektion: "klima",
    title:   "BLUME-Messstation MC042 meldet erhöhte Feinstaubwerte für Mai",
    titleEN: "BLUME monitoring station MC042 reports elevated particulate values for May",
    dek:     "Im langjährigen Vergleich liegt der Mai-Mittelwert für PM10 um 22 % über dem Durchschnitt.",
    dekEN:   "In the long-term comparison, the May average for PM10 is 22% above normal.",
    summary: [
      "Die BLUME-Messstation an der Karl-Marx-Straße/Ecke Silbersteinstraße — von vielen Anwohner*innen schlicht MC042 genannt — hat für den bisherigen Mai 2026 erhöhte Feinstaubwerte gemeldet. Der Mittelwert liegt bei 31 µg/m³ PM10.",
      "Als Hauptursache nennt die Senatsverwaltung trockene Witterung kombiniert mit Sahara-Staub-Eintrag. Der Jahresgrenzwert liegt bei 40 µg/m³ und wurde 2025 nicht überschritten — die kurzfristige Spitze gibt aber zu denken.",
    ],
    summaryEN: [
      "The BLUME monitoring station at Karl-Marx-Straße / Silbersteinstraße corner — simply called MC042 by many residents — has reported elevated particulate values for May 2026. The average sits at 31 µg/m³ PM10.",
      "The Senate administration cites dry weather combined with Saharan dust as the main cause. The annual limit is 40 µg/m³ and was not exceeded in 2025 — but the short-term peak gives pause.",
    ],
    ts: "vor 5 Std.", tsEN: "5h ago",
    fetchDate: "24. Mai 2026 · 04:48",
    forumLinks: 2, // heat triggers
    img: { ratio: "4/3" },
    imgLabel: "Messstation",
  },
  {
    id: "N005",
    quelle: "bmp", sektion: "wirtschaft",
    title:   "U7-Verlängerung Richtung Schönefeld: Senat verschiebt Entscheidung",
    titleEN: "U7 extension toward Schönefeld: Senate postpones decision",
    dek:     "Finanzierungsfragen ungeklärt — Verkehrssenatorin spricht von „weiteren Prüfungen“.",
    dekEN:   "Financing questions unresolved — Transport Senator speaks of „further examinations“.",
    summary: [
      "Die seit langem angekündigte Verlängerung der U7 vom Rudow bis zum BER ist erneut verschoben worden. Verkehrssenatorin Anke Schaefer (CDU) sprach von „weiteren erforderlichen Prüfungen“ der Finanzierungsmodelle.",
      "Bereits 2025 hatte ein Gutachten Baukosten zwischen 1,2 und 1,8 Mrd. Euro veranschlagt. Brandenburg möchte sich beteiligen, beharrt aber auf einem gleichberechtigten Mitspracherecht. Frühestmöglicher Baustart: 2029.",
    ],
    summaryEN: [
      "The long-announced extension of the U7 from Rudow to BER airport has been postponed again. Transport Senator Anke Schaefer (CDU) spoke of „further necessary examinations“ of financing models.",
      "Already in 2025 an expert opinion estimated construction costs between 1.2 and 1.8 billion euros. Brandenburg wants to participate but insists on equal say. Earliest possible construction start: 2029.",
    ],
    ts: "vor 7 Std.", tsEN: "7h ago",
    fetchDate: "24. Mai 2026 · 02:18",
    forumLinks: 1,
    read: true, // example "read" state — fades on render
  },
  {
    id: "N006",
    quelle: "bzb", sektion: "kultur",
    title:   "Karneval der Kulturen kehrt nach Hermannplatz zurück — Programm vorgestellt",
    titleEN: "Carnival of Cultures returns to Hermannplatz — program revealed",
    dek:     "Pfingstwochenende: 5 Bühnen, 80 Gruppen, neue Route über Karl-Marx-Straße.",
    dekEN:   "Pentecost weekend: 5 stages, 80 groups, new route over Karl-Marx-Straße.",
    summary: [
      "Nach drei Jahren reduziertem Format kehrt der Karneval der Kulturen 2026 in fast voller Größe zurück. Der Veranstalter Werkstatt der Kulturen hat eine angepasste Route bekanntgegeben, die Hermannplatz und Karl-Marx-Straße einbindet.",
      "Höhepunkte: Eröffnung am Freitag 22. Mai mit Senatorin Cansel Kiziltepe, Straßenfest entlang der gesamten Route bis Sonntag, Abschlussparade Pfingstmontag ab Hermannplatz Richtung Yorckstraße.",
    ],
    summaryEN: [
      "After three years of reduced format, the Carnival of Cultures returns in 2026 at nearly full scale. Organizer Werkstatt der Kulturen has announced an adapted route incorporating Hermannplatz and Karl-Marx-Straße.",
      "Highlights: opening Friday May 22 with Senator Cansel Kiziltepe, street festival along the entire route until Sunday, closing parade Pentecost Monday from Hermannplatz toward Yorckstraße.",
    ],
    ts: "vor 9 Std.", tsEN: "9h ago",
    fetchDate: "24. Mai 2026 · 00:30",
    forumLinks: 0,
    saved: true, // example saved state
    img: { ratio: "16/9" },
    imgLabel: "Karneval 2024",
  },

  // ─── Gestern (yesterday) — sets up the chronology divider ───
  {
    id: "N007",
    quelle: "nkn", sektion: "lokales",
    title:   "Bürgerinitiative gegen Mietpreissteigerung in Schillerkiez gegründet",
    titleEN: "Citizens' initiative against rent increases founded in Schillerkiez",
    dek:     "Im Café Selig sammeln Anwohner*innen Unterschriften gegen Modernisierungsumlagen.",
    dekEN:   "Residents at Café Selig collect signatures against modernization surcharges.",
    summary: [
      "Eine neue Bürgerinitiative im Schillerkiez wendet sich gegen die in den letzten Monaten gehäuften Modernisierungsumlagen mehrerer Großvermieter. Treffpunkt der Gruppe ist das Café Selig in der Schillerpromenade.",
      "Ziel ist eine Petition an den Bezirk Neukölln sowie rechtliche Beratung für Betroffene. Eine erste öffentliche Versammlung findet am 31. Mai im Nachbarschaftshaus Centrum statt.",
    ],
    summaryEN: [
      "A new citizens' initiative in Schillerkiez opposes the modernization surcharges by several large landlords that have accumulated in recent months. The group's meeting point is Café Selig on Schillerpromenade.",
      "The aim is a petition to Neukölln district plus legal advice for those affected. A first public assembly takes place May 31 at Nachbarschaftshaus Centrum.",
    ],
    ts: "gestern · 21:14", tsEN: "yesterday · 21:14",
    fetchDate: "23. Mai 2026 · 21:14",
    forumLinks: 3,
    read: true,
  },
  {
    id: "N008",
    quelle: "nd", sektion: "politik",
    title:   "Bezirksverordnetenversammlung Neukölln beschließt Klimanotstand",
    titleEN: "Neukölln district assembly declares climate emergency",
    dek:     "Knapper Mehrheitsbeschluss verpflichtet Verwaltung zu Klimacheck bei Beschlüssen.",
    dekEN:   "Narrow majority resolution commits administration to climate check on decisions.",
    summary: [
      "Mit knapper Mehrheit hat die Bezirksverordnetenversammlung Neukölln den Klimanotstand erklärt. Künftige Verwaltungsentscheidungen mit klimarelevantem Bezug müssen einen sogenannten Klimacheck durchlaufen.",
      "Der Beschluss bleibt symbolischer Natur — verbindliche Maßnahmen folgen erst nach Erarbeitung eines konkreten Maßnahmenkatalogs. Grüne und Linke begrüßen den Schritt, CDU und FDP kritisieren ihn als „Verwaltungsbarriere“.",
    ],
    summaryEN: [
      "With a narrow majority, the Neukölln district assembly has declared a climate emergency. Future administrative decisions with climate-relevant impact must pass a so-called climate check.",
      "The resolution remains symbolic in nature — binding measures will only follow after development of a concrete catalog. Greens and Left welcome the step; CDU and FDP criticize it as „administrative barrier“.",
    ],
    ts: "gestern · 18:22", tsEN: "yesterday · 18:22",
    fetchDate: "23. Mai 2026 · 18:22",
    forumLinks: 1,
    read: true,
  },
  {
    id: "N009",
    quelle: "newsdata", sektion: "wirtschaft",
    title:   "Berlin pilots circular-economy hubs in four districts",
    titleEN: "Berlin pilots circular-economy hubs in four districts",
    dek:     "Neukölln is among the test districts — Hermannstraße site under negotiation.",
    dekEN:   "Neukölln is among the test districts — Hermannstraße site under negotiation.",
    summary: [
      "Berlin's Senate department for environment will pilot four neighborhood circular-economy hubs starting Q3 2026. The hubs combine repair-café, free-take shelves, and small recycling drop-off in one storefront.",
      "Neukölln is among the four test districts (alongside Wedding, Friedrichshain, and Spandau). The exact Hermannstraße site is still under negotiation; the district favors a vacant commercial space near Karl-Marx-Platz.",
      "Initial budget: 1.4 M EUR for the two-year pilot, jointly funded by Senate and the participating districts.",
    ],
    summaryEN: [
      "Berlin's Senate department for environment will pilot four neighborhood circular-economy hubs starting Q3 2026. The hubs combine repair-café, free-take shelves, and small recycling drop-off in one storefront.",
      "Neukölln is among the four test districts (alongside Wedding, Friedrichshain, and Spandau). The exact Hermannstraße site is still under negotiation; the district favors a vacant commercial space near Karl-Marx-Platz.",
      "Initial budget: 1.4 M EUR for the two-year pilot, jointly funded by Senate and the participating districts.",
    ],
    ts: "yesterday · 14:08", tsEN: "yesterday · 14:08",
    fetchDate: "23. Mai 2026 · 14:08",
    forumLinks: 2,
    englishOnly: true, // marker: this is one of the en-only NewsData entries
    noImage: true,
  },
  {
    id: "N010",
    quelle: "rbb", sektion: "sport",
    title:   "Tasmania Berlin sichert sich Aufstieg in die Regionalliga",
    titleEN: "Tasmania Berlin secures promotion to Regionalliga",
    dek:     "Heimsieg gegen Schalke II vor 4.200 Zuschauenden im Werner-Seelenbinder-Sportpark.",
    dekEN:   "Home win against Schalke II in front of 4,200 spectators at Werner-Seelenbinder-Sportpark.",
    summary: [
      "Mit einem 2:1-Heimsieg gegen die zweite Mannschaft des FC Schalke 04 hat Tasmania Berlin den Aufstieg in die Regionalliga Nordost gesichert. Vor 4.200 Zuschauenden im Werner-Seelenbinder-Sportpark traf Mehmet Yıldız in der 89. Minute zum Endstand.",
      "Trainer Almedin Civa: „Das ist für den ganzen Kiez ein Tag.“ Der Verein plant für den Aufstieg eine Saisonauftaktfeier am Tempelhofer Damm.",
    ],
    summaryEN: [
      "With a 2-1 home win against the second team of FC Schalke 04, Tasmania Berlin has secured promotion to Regionalliga Nordost. In front of 4,200 spectators at Werner-Seelenbinder-Sportpark, Mehmet Yıldız scored the final goal in the 89th minute.",
      "Coach Almedin Civa: „This is a day for the whole Kiez.“ The club is planning a season-opening celebration at Tempelhofer Damm.",
    ],
    ts: "gestern · 12:48", tsEN: "yesterday · 12:48",
    fetchDate: "23. Mai 2026 · 12:48",
    forumLinks: 0,
    read: true, archived: true, // example archived-after-read
  },

  // ─── Older — set up the "fall off naturally" feel ───
  {
    id: "N011",
    quelle: "tsp", sektion: "verkehr",
    title:   "Sonnenallee: Initiative fordert durchgehende Fahrradspur Richtung Treptow",
    titleEN: "Sonnenallee: initiative demands continuous bike lane toward Treptow",
    dek:     "Petition mit 4.200 Unterschriften wird Mittwoch übergeben.",
    dekEN:   "Petition with 4,200 signatures to be handed over Wednesday.",
    summary: [
      "Die Initiative „Sonnenallee sicher fahren“ übergibt am Mittwoch dem Bezirksamt 4.200 Unterschriften für eine durchgehende, baulich getrennte Fahrradspur von Hermannplatz bis Treptower Park.",
      "Aktuell endet die Spur an der Anzengruberstraße — danach teilen sich Radfahrer*innen die Fahrbahn mit Bussen. Im letzten Jahr wurden auf diesem Abschnitt 11 Radunfälle aktenkundig.",
    ],
    summaryEN: [
      "The initiative „Sonnenallee Safe Cycling“ hands the district 4,200 signatures Wednesday for a continuous, structurally separated bike lane from Hermannplatz to Treptower Park.",
      "Currently the lane ends at Anzengruberstraße — after that cyclists share the road with buses. Last year 11 bike accidents were recorded on this stretch.",
    ],
    ts: "vor 2 Tagen", tsEN: "2 days ago",
    fetchDate: "22. Mai 2026 · 16:30",
    forumLinks: 1,
    read: true,
    noImage: true,
  },
  {
    id: "N012",
    quelle: "nwk", sektion: "kultur",
    title:   "Boddinstraße: Wochenmarkt wird um zwei Stände erweitert",
    titleEN: "Boddinstraße: weekly market expanded by two stands",
    dek:     "Ab Juni: Käserei aus dem Spreewald, Imkerei aus Brandenburg.",
    dekEN:   "From June: cheesery from Spreewald, beekeeping from Brandenburg.",
    summary: [
      "Der Wochenmarkt an der Boddinstraße wird zum 1. Juni um zwei neue Stände erweitert. Eine Spreewälder Käserei sowie ein Brandenburger Imkereibetrieb ergänzen das bestehende Angebot — der Markt findet weiterhin samstags 8-14 Uhr statt.",
    ],
    summaryEN: [
      "The weekly market on Boddinstraße will be expanded by two new stands as of June 1. A Spreewald cheesery and a Brandenburg beekeeping operation supplement the existing offering — the market continues to take place Saturdays 8 AM to 2 PM.",
    ],
    ts: "vor 2 Tagen", tsEN: "2 days ago",
    fetchDate: "22. Mai 2026 · 11:08",
    forumLinks: 0,
    read: true,
  },
  {
    id: "N013",
    quelle: "user", sektion: "lokales",
    title:   "[eingereicht] Sommerfest Hasenheide: Programm jetzt online",
    titleEN: "[submitted] Summer fest Hasenheide: program now online",
    dek:     "Eingereicht von Daniela K. · freigegeben am 22. Mai durch Moderation.",
    dekEN:   "Submitted by Daniela K. · approved May 22 by moderation.",
    summary: [
      "Das Programm für das Hasenheide-Sommerfest 2026 (5.–7. Juni) ist veröffentlicht. Eingereicht von Daniela K., einer Nachbarin aus der Schillerpromenade, die aktiv in der Organisationsgruppe mitarbeitet.",
      "Schwerpunkte 2026: Kinder-Mitmachzelt, Reparatur-Café, drei Konzert-Bühnen, Foodcourt von 28 lokalen Anbieter*innen. Eintritt frei.",
    ],
    summaryEN: [
      "The program for Hasenheide Summer Fest 2026 (June 5-7) has been published. Submitted by Daniela K., a neighbor from Schillerpromenade who actively contributes to the organizing group.",
      "2026 focus: kids participation tent, repair café, three concert stages, food court with 28 local vendors. Free entry.",
    ],
    ts: "vor 2 Tagen", tsEN: "2 days ago",
    fetchDate: "22. Mai 2026 · 09:00", // = approval time, NOT submission
    submittedBy: { name: "Daniela K.", initials: "DK", color: kiosk.color.moss },
    forumLinks: 0,
    read: true,
  },
  {
    id: "N014",
    quelle: "taz", sektion: "klima",
    title:   "Klimaentscheid Berlin: 30 km/h auf Hermannstraße ab August beschlossen",
    titleEN: "Climate decision Berlin: 30 km/h on Hermannstraße decided from August",
    dek:     "Senatsbeschluss setzt erstes Ergebnis des Volksbegehrens um.",
    dekEN:   "Senate resolution implements first result of citizens' initiative.",
    summary: [
      "Als ersten Schritt der Umsetzung des Klimaentscheids hat der Senat beschlossen, ab dem 1. August 2026 auf der Hermannstraße ein Tempolimit von 30 km/h einzuführen. Beschilderung wird ab Juni montiert.",
      "Weitere Hauptstraßen sollen folgen — Karl-Marx-Straße im November, Sonnenallee voraussichtlich Anfang 2027.",
    ],
    summaryEN: [
      "As a first step in implementing the climate decision, the Senate has resolved to introduce a 30 km/h speed limit on Hermannstraße from August 1, 2026. Signage will be installed from June.",
      "Other main roads will follow — Karl-Marx-Straße in November, Sonnenallee expected early 2027.",
    ],
    ts: "vor 3 Tagen", tsEN: "3 days ago",
    fetchDate: "21. Mai 2026 · 14:22",
    forumLinks: 2,
    read: true,
  },
];

// ═══════════════════════════════════════════════════════════════════
//  Reusable building blocks
// ═══════════════════════════════════════════════════════════════════

// ─── Authoring meta (timestamp + source) ───
function ArticleMeta({ article, lang = "DE" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute,
      letterSpacing: "0.06em",
    }}>
      <SourceChip id={article.quelle} lang={lang} mini />
      <span>·</span>
      <span>{lang === "DE" ? article.ts : article.tsEN}</span>
      {article.submittedBy && (
        <>
          <span>·</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{
              width: 14, height: 14, borderRadius: "50%",
              background: article.submittedBy.color, color: kiosk.color.paper,
              fontSize: 8, fontWeight: 700,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: `1px solid ${kiosk.color.ink}`,
            }}>{article.submittedBy.initials}</span>
            {article.submittedBy.name}
          </span>
        </>
      )}
    </div>
  );
}

// ─── Lead card — full-bleed editorial treatment, top of feed ───
function NewsCardLead({ article, lang = "DE" }) {
  const title = lang === "DE" ? article.title : article.titleEN;
  const dek = lang === "DE" ? article.dek : article.dekEN;
  const summary = lang === "DE" ? article.summary : article.summaryEN;
  const showHeat = article.forumLinks >= news.heat.threshold;

  return (
    <article style={{
      background: kiosk.color.paperWarm,
      border: kiosk.border.ink,
      borderRadius: kiosk.r.lg,
      padding: 28,
      boxShadow: kiosk.shadow.print(),
      display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 28,
      position: "relative",
    }}>
      <div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
          <SektionTag id={article.sektion} lang={lang} />
          {showHeat && <HeatChip count={article.forumLinks} lang={lang} />}
        </div>
        <h2 style={{
          fontFamily: kiosk.font.display, fontWeight: 800,
          fontSize: 42, lineHeight: 1.02, letterSpacing: "-0.035em",
          margin: "0 0 12px", color: kiosk.color.ink,
        }}>{title}</h2>
        <p style={{
          fontFamily: kiosk.font.serif, fontStyle: "italic",
          fontSize: 19, lineHeight: 1.4, color: kiosk.color.inkSoft,
          margin: "0 0 18px", maxWidth: "62ch",
        }}>{dek}</p>
        <div style={{
          fontFamily: kiosk.font.display, fontSize: 14, lineHeight: 1.55,
          color: kiosk.color.ink, display: "flex", flexDirection: "column", gap: 10,
          maxWidth: "62ch",
        }}>
          {summary.slice(0, 2).map((p, i) => <p key={i} style={{ margin: 0 }}>{p}</p>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 22, paddingTop: 14, borderTop: `1px dashed ${kiosk.color.rule}` }}>
          <ArticleMeta article={article} lang={lang} />
          <div style={{ flex: 1 }} />
          <KioskBtn small>{lang === "DE" ? "weiterlesen →" : "read more →"}</KioskBtn>
          <SaveToggle saved={article.saved} />
        </div>
      </div>
      <div>
        <ArticleImage article={article} ratio="4/5" lead />
      </div>
    </article>
  );
}

// ─── Standard feed card — used in the continuous reverse-chrono list ───
function NewsCard({ article, lang = "DE" }) {
  const title = lang === "DE" ? article.title : article.titleEN;
  const dek = lang === "DE" ? article.dek : article.dekEN;
  const summary = lang === "DE" ? article.summary : article.summaryEN;
  const showHeat = article.forumLinks >= news.heat.threshold;
  const decay = article.archived ? news.decay.archived : (article.read ? news.decay.seen : news.decay.fresh);

  return (
    <article style={{
      background: kiosk.color.paper,
      border: kiosk.border.hair,
      borderRadius: kiosk.r.md,
      padding: 18,
      display: "grid", gridTemplateColumns: article.noImage ? "1fr" : "1fr 220px",
      gap: 22, alignItems: "start",
      opacity: decay,
      position: "relative",
    }}>
      <div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <ReadDot read={article.read} />
          <SektionTag id={article.sektion} lang={lang} mini />
          {showHeat && <HeatChip count={article.forumLinks} lang={lang} mini />}
        </div>
        <h3 style={{
          fontFamily: kiosk.font.display, fontWeight: 700,
          fontSize: 22, lineHeight: 1.15, letterSpacing: "-0.02em",
          margin: "0 0 6px", color: kiosk.color.ink,
        }}>{title}</h3>
        <p style={{
          fontFamily: kiosk.font.serif, fontStyle: "italic",
          fontSize: 14, lineHeight: 1.4, color: kiosk.color.inkSoft,
          margin: "0 0 10px", maxWidth: "70ch",
        }}>{dek}</p>
        <p style={{
          fontFamily: kiosk.font.display, fontSize: 13.5, lineHeight: 1.55,
          color: kiosk.color.ink, margin: "0 0 12px", maxWidth: "70ch",
        }}>{summary[0]}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ArticleMeta article={article} lang={lang} />
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkSoft, textDecoration: "underline dashed", textUnderlineOffset: 3 }}>
            {lang === "DE" ? "weiterlesen →" : "read more →"}
          </span>
          <SaveToggle saved={article.saved} mini />
        </div>
      </div>
      {!article.noImage && (
        <div>
          <ArticleImage article={article} ratio="4/3" />
        </div>
      )}
    </article>
  );
}

// ─── Date divider — "GESTERN · 23. Mai" between chrono groups ───
function DateDivider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0 4px" }}>
      <div style={{ flex: 1, height: 1, borderTop: `1px dashed ${kiosk.color.rule}` }} />
      <span style={{
        fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700,
        color: kiosk.color.inkMute, letterSpacing: "0.18em", textTransform: "uppercase",
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, borderTop: `1px dashed ${kiosk.color.rule}` }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Masthead — the novel feature that frames each day's curation
// ═══════════════════════════════════════════════════════════════════

function NewsMasthead({ lang = "DE", articleCount = 14, sourceCount = 9, degraded = false }) {
  return (
    <section style={{
      padding: "30px 36px 22px",
      borderBottom: `2px solid ${kiosk.color.ink}`,
      position: "relative",
    }}>
      {/* Top ribbon: edition + date + issue */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: kiosk.font.mono, fontSize: 10.5, fontWeight: 600,
        color: kiosk.color.ink, letterSpacing: "0.16em",
        textTransform: "uppercase", paddingBottom: 12,
        borderBottom: `1px solid ${kiosk.color.ink}`,
      }}>
        <span>{lang === "DE" ? news.masthead.edition.de : news.masthead.edition.en}</span>
        <span>{lang === "DE" ? TODAY.de : TODAY.en}</span>
        <span>Nr. {TODAY.issue}</span>
      </div>

      {/* The name — big, italic serif */}
      <h1 style={{
        fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400,
        fontSize: 88, lineHeight: 0.92, letterSpacing: "-0.025em",
        margin: "16px 0 6px", color: kiosk.color.ink,
        textAlign: "center",
      }}>{lang === "DE" ? news.masthead.name.de : news.masthead.name.en}</h1>

      {/* Tagline */}
      <div style={{
        fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 500,
        color: kiosk.color.inkSoft, letterSpacing: "0.02em",
        textAlign: "center", margin: "0 0 14px",
      }}>{lang === "DE" ? news.masthead.tagline.de : news.masthead.tagline.en}</div>

      {/* Bottom ribbon: stats + curated chip */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 12, borderTop: `1px solid ${kiosk.color.ink}`,
        fontFamily: kiosk.font.mono, fontSize: 10.5,
        color: kiosk.color.inkSoft, letterSpacing: "0.06em",
      }}>
        <span><b style={{ color: kiosk.color.ink }}>{articleCount}</b> {lang === "DE" ? "Artikel heute" : "articles today"}</span>
        <span>
          <b style={{ color: kiosk.color.ink }}>{sourceCount}</b> {lang === "DE" ? "Quellen" : "sources"}
          {degraded && <span style={{ color: kiosk.color.warn, marginLeft: 6 }}>· {lang === "DE" ? "RSS-only · einige Quellen heute nicht erreichbar" : "RSS-only · some sources unreachable today"}</span>}
        </span>
        <KuratiertChip lang={lang} />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Filter rail
// ═══════════════════════════════════════════════════════════════════

function NewsFilterRail({ activeSektion = "alle", activeQuelle = "alle", activeZeitraum = "today", savedOnly = false, unreadOnly = false, lang = "DE" }) {
  const labels = lang === "DE"
    ? { alle: "Alle", saved: "Meine gespeicherten", unread: "Ungelesen", today: "Heute", week: "Diese Woche", month: "Diesen Monat" }
    : { alle: "All", saved: "My reading list", unread: "Unread", today: "Today", week: "This week", month: "This month" };

  return (
    <section style={{ padding: "16px 36px", display: "flex", flexDirection: "column", gap: 10, borderBottom: `1px dashed ${kiosk.color.rule}` }}>
      {/* Row 1: Sektion */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.12em", marginRight: 4, width: 56 }}>SEKTION</span>
        <FilterChip label={labels.alle} active={activeSektion === "alle"} />
        {Object.keys(news.sektion).map((k) => (
          <FilterChip key={k} label={lang === "DE" ? news.sektion[k].de : news.sektion[k].en} active={activeSektion === k} />
        ))}
      </div>

      {/* Row 2: Quelle + Zeitraum + toggles */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.12em", width: 56 }}>QUELLE</span>
        <div style={{ display: "flex", gap: 5 }}>
          <FilterChip label={labels.alle} active={activeQuelle === "alle"} />
          <FilterChip label="rbb24" active={activeQuelle === "rbb"} />
          <FilterChip label="taz" active={activeQuelle === "taz"} />
          <FilterChip label="Tagesspiegel" active={activeQuelle === "tsp"} />
          <FilterChip label="+ 6 mehr" hashtag />
        </div>
        <div style={{ width: 1, height: 18, background: kiosk.color.rule }} />
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.12em" }}>ZEITRAUM</span>
        <div style={{ display: "flex", gap: 5 }}>
          <FilterChip label={labels.today} active={activeZeitraum === "today"} />
          <FilterChip label={labels.week} active={activeZeitraum === "week"} />
          <FilterChip label={labels.month} active={activeZeitraum === "month"} />
        </div>
        <div style={{ flex: 1 }} />
        <FilterChip label={`☆ ${labels.saved}`} active={savedOnly} />
        <FilterChip label={`● ${labels.unread}`} active={unreadOnly} />
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Top-of-page title block (sits between nav and masthead)
// ═══════════════════════════════════════════════════════════════════

function NewsTitleBlock({ lang = "DE" }) {
  return (
    <section style={{ padding: "20px 36px 14px", display: "flex", justifyContent: "space-between", alignItems: "end", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
      <div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.ink, letterSpacing: "0.16em" }}>NEWS · {lang === "DE" ? TODAY.de.toUpperCase() : TODAY.en.toUpperCase()}</div>
        <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "6px 0 0" }}>
          {lang === "DE" ? <>Was <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400 }}>passiert</span> heute im Kiez?</>
                         : <>What's <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400 }}>happening</span> in the Kiez today?</>}
        </h2>
      </div>
      <KioskBtn variant="outline">{lang === "DE" ? "+ news einreichen" : "+ submit news"}</KioskBtn>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  DESKTOP INDEX
// ═══════════════════════════════════════════════════════════════════

function NewsboardIndexDesktop({ lang = "DE", view = "all", degraded = false }) {
  // view: "all" | "saved" | "unread"
  const savedOnly = view === "saved";
  const unreadOnly = view === "unread";

  let items = SEED_ARTICLES;
  if (savedOnly) items = items.filter((a) => a.saved);
  if (unreadOnly) items = items.filter((a) => !a.read);

  const lead = items.find((a) => a.lead);
  const rest = items.filter((a) => !a.lead);

  // Group rest by day (rough — using ts heuristic)
  const today = rest.filter((a) => !a.ts.startsWith("gestern") && !a.tsEN.startsWith("yesterday") && !a.ts.startsWith("vor 2 Tag") && !a.tsEN.startsWith("2 days") && !a.ts.startsWith("vor 3 Tag") && !a.tsEN.startsWith("3 days"));
  const yesterday = rest.filter((a) => a.ts.startsWith("gestern") || a.tsEN.startsWith("yesterday"));
  const older = rest.filter((a) => a.ts.startsWith("vor 2 Tag") || a.tsEN.startsWith("2 days") || a.ts.startsWith("vor 3 Tag") || a.tsEN.startsWith("3 days"));

  return (
    <div style={{ width: 1280, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", minHeight: "100%" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative" }}>
        <window.KioskNav active="News" lang={lang} />
        <NewsTitleBlock lang={lang} />
        <NewsMasthead lang={lang} articleCount={items.length} sourceCount={degraded ? 7 : 9} degraded={degraded} />
        <NewsFilterRail lang={lang} savedOnly={savedOnly} unreadOnly={unreadOnly} />

        {/* Feed */}
        <div style={{ padding: "20px 36px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Lead — only shown in "all" view */}
          {!savedOnly && !unreadOnly && lead && <NewsCardLead article={lead} lang={lang} />}

          {/* Today bucket */}
          {today.length > 0 && (
            <>
              <DateDivider label={lang === "DE" ? "HEUTE · 24. MAI" : "TODAY · MAY 24"} />
              {today.map((a) => <NewsCard key={a.id} article={a} lang={lang} />)}
            </>
          )}

          {/* Yesterday */}
          {yesterday.length > 0 && (
            <>
              <DateDivider label={lang === "DE" ? "GESTERN · 23. MAI" : "YESTERDAY · MAY 23"} />
              {yesterday.map((a) => <NewsCard key={a.id} article={a} lang={lang} />)}
            </>
          )}

          {/* Older */}
          {older.length > 0 && (
            <>
              <DateDivider label={lang === "DE" ? "FRÜHER DIESE WOCHE" : "EARLIER THIS WEEK"} />
              {older.map((a) => <NewsCard key={a.id} article={a} lang={lang} />)}
            </>
          )}

          {/* Load more / pagination */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
            <KioskBtn variant="ghost">{lang === "DE" ? "ältere Artikel laden" : "load older articles"}</KioskBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MOBILE INDEX
// ═══════════════════════════════════════════════════════════════════

// ─── Mobile-specific compact masthead ───
function NewsMastheadMobile({ lang = "DE", articleCount = 14 }) {
  return (
    <section style={{ padding: "16px 18px 12px", borderBottom: `2px solid ${kiosk.color.ink}` }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 600,
        color: kiosk.color.ink, letterSpacing: "0.14em",
        textTransform: "uppercase", paddingBottom: 8,
        borderBottom: `1px solid ${kiosk.color.ink}`,
      }}>
        <span>{lang === "DE" ? "Tagesausgabe" : "Daily"}</span>
        <span>Nr. {TODAY.issue}</span>
      </div>
      <h1 style={{
        fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400,
        fontSize: 36, lineHeight: 0.95, letterSpacing: "-0.025em",
        margin: "10px 0 4px", color: kiosk.color.ink, textAlign: "center",
      }}>{lang === "DE" ? news.masthead.name.de : news.masthead.name.en}</h1>
      <div style={{ textAlign: "center", fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", paddingTop: 6, borderTop: `1px solid ${kiosk.color.ink}` }}>
        {lang === "DE" ? TODAY.de : TODAY.en} · {articleCount} {lang === "DE" ? "Artikel" : "articles"} · <KuratiertChip lang={lang} />
      </div>
    </section>
  );
}

// ─── Mobile filter row (sticky) ───
function NewsFilterRailMobile({ active = "alle", savedOnly, unreadOnly, lang = "DE" }) {
  const labels = lang === "DE"
    ? { alle: "Alle", saved: "☆ Gespeichert", unread: "● Ungelesen" }
    : { alle: "All", saved: "☆ Saved", unread: "● Unread" };
  return (
    <div style={{
      padding: "10px 16px", display: "flex", gap: 6,
      overflowX: "auto", borderBottom: `1px dashed ${kiosk.color.rule}`,
    }}>
      <FilterChip label={labels.alle} active={active === "alle" && !savedOnly && !unreadOnly} />
      <FilterChip label={lang === "DE" ? "Lokales" : "Local"} active={active === "lokales"} />
      <FilterChip label={lang === "DE" ? "Politik" : "Politics"} active={active === "politik"} />
      <FilterChip label={lang === "DE" ? "Verkehr" : "Transit"} active={active === "verkehr"} />
      <FilterChip label={lang === "DE" ? "Klima" : "Climate"} active={active === "klima"} />
      <FilterChip label={labels.saved} active={savedOnly} />
      <FilterChip label={labels.unread} active={unreadOnly} />
    </div>
  );
}

// ─── Mobile feed card — image above, condensed ───
function NewsCardMobile({ article, lang = "DE" }) {
  const title = lang === "DE" ? article.title : article.titleEN;
  const dek = lang === "DE" ? article.dek : article.dekEN;
  const decay = article.archived ? news.decay.archived : (article.read ? news.decay.seen : news.decay.fresh);
  const showHeat = article.forumLinks >= news.heat.threshold;

  return (
    <article style={{
      padding: "14px 16px", borderBottom: `1px dashed ${kiosk.color.rule}`,
      opacity: decay,
    }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
        <ReadDot read={article.read} />
        <SektionTag id={article.sektion} lang={lang} mini />
        {showHeat && <HeatChip count={article.forumLinks} lang={lang} mini />}
      </div>
      <h3 style={{
        fontFamily: kiosk.font.display, fontWeight: 700,
        fontSize: 17, lineHeight: 1.15, letterSpacing: "-0.015em",
        margin: "0 0 4px", color: kiosk.color.ink,
      }}>{title}</h3>
      <p style={{
        fontFamily: kiosk.font.serif, fontStyle: "italic",
        fontSize: 13, lineHeight: 1.35, color: kiosk.color.inkSoft,
        margin: "0 0 8px",
      }}>{dek}</p>
      {!article.noImage && (
        <div style={{ marginBottom: 8 }}>
          <ArticleImage article={article} ratio="16/9" />
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ArticleMeta article={article} lang={lang} />
        <div style={{ flex: 1 }} />
        <SaveToggle saved={article.saved} mini />
      </div>
    </article>
  );
}

function NewsboardIndexMobile({ lang = "DE", view = "all" }) {
  const savedOnly = view === "saved";
  const unreadOnly = view === "unread";

  let items = SEED_ARTICLES.filter((a) => !a.lead);
  if (savedOnly) items = items.filter((a) => a.saved);
  if (unreadOnly) items = items.filter((a) => !a.read);

  return (
    <div style={{ width: 390, height: 844, background: kiosk.color.paper, color: kiosk.color.ink, fontFamily: kiosk.font.display, position: "relative", overflow: "hidden" }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header style={{ padding: "10px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, background: kiosk.color.wine, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: kiosk.color.paper, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 18, border: kiosk.border.ink }}>m</div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.025em" }}>mahalle</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 600, padding: "3px 8px", border: kiosk.border.ink, borderRadius: kiosk.r.pill, background: lang === "DE" ? kiosk.color.ink : "transparent", color: lang === "DE" ? kiosk.color.paper : kiosk.color.ink }}>DE</span>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: kiosk.color.ochre, border: kiosk.border.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>EA</div>
          </div>
        </header>

        {/* Scrollable */}
        <div style={{ flex: 1, overflowY: "hidden" }}>
          <NewsMastheadMobile lang={lang} articleCount={items.length} />
          <NewsFilterRailMobile lang={lang} savedOnly={savedOnly} unreadOnly={unreadOnly} />

          {items.slice(0, 4).map((a) => <NewsCardMobile key={a.id} article={a} lang={lang} />)}
        </div>

        {/* Bottom nav */}
        <nav style={{
          padding: "8px 16px 14px", display: "flex", justifyContent: "space-around",
          borderTop: `1.5px solid ${kiosk.color.ink}`, background: kiosk.color.paperWarm,
        }}>
          {["Forum","Kalender","News","Markt","Kiez"].map((n) => (
            <span key={n} style={{
              fontFamily: kiosk.font.mono, fontSize: 9.5, fontWeight: 600,
              padding: "5px 9px", borderRadius: kiosk.r.sm,
              background: n === "News" ? kiosk.color.ink : "transparent",
              color: n === "News" ? kiosk.color.paper : kiosk.color.inkSoft,
              letterSpacing: "0.04em",
            }}>{n}</span>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Export
// ═══════════════════════════════════════════════════════════════════

Object.assign(window, {
  news, SEED_ARTICLES, TODAY,
  SourceChip, SektionTag, KuratiertChip, HeatChip, ReadDot, SaveToggle, ArticleImage,
  ArticleMeta, NewsCardLead, NewsCard, NewsCardMobile, DateDivider,
  NewsMasthead, NewsFilterRail, NewsTitleBlock,
  NewsboardIndexDesktop, NewsboardIndexMobile,
});

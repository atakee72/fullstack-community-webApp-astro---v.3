/* global React, kiosk, kioskFonts, paperGrainStyle, KioskBtn, KioskInput, KioskAvatar */

// ══════════════════════════════════════════════════════════
//  KIOSK · MARKETPLACE
//  Editorial Kiosk applied to listings: Verkaufen / Tausch /
//  Verschenken. Page-1 editorial lead + uniform 3-col grid.
//  Reuses Forum chrome (KioskNav, paper grain, type ramp).
//  Tokens here extend window.kiosk; do not duplicate.
// ══════════════════════════════════════════════════════════

// ─── Token extension: 8 categories, 10 straps, delivery enum ───

const market = {
  // 8 categories — Hybrid: marketplace-specific labels, Kiosk palette + 2 aux tokens.
  // Aux: pflanze (cool moss/sage, distinct from #4 moss) and kind (warm salmon).
  cat: {
    moebel:     { de: "Möbel & Wohnen",        en: "Furniture & Home",     color: kiosk.color.wine,       textOn: kiosk.color.paper },
    kleidung:   { de: "Kleidung & Mode",       en: "Clothing & Fashion",   color: kiosk.color.plum,       textOn: kiosk.color.paper },
    medien:     { de: "Bücher, Medien & Spiele", en: "Books, Media & Games", color: kiosk.color.ink,      textOn: kiosk.color.paper },
    werkzeug:   { de: "Werkzeug & Garten",     en: "Tools & Garden",       color: kiosk.color.moss,       textOn: kiosk.color.paper },
    pflanze:    { de: "Pflanzen & Tiere",      en: "Plants & Pets",        color: "#8aa67a",              textOn: kiosk.color.ink   }, // new aux token (sage-light)
    elektronik: { de: "Elektronik",            en: "Electronics",          color: kiosk.color.teal,       textOn: kiosk.color.paper },
    fahrrad:    { de: "Fahrräder & Mobilität", en: "Bikes & Mobility",     color: kiosk.color.ochre,      textOn: kiosk.color.ink   },
    kind:       { de: "Kinder",                en: "Kids",                 color: "#d77a6a",              textOn: kiosk.color.paper }, // new aux token (salmon)
    sonstiges:  { de: "Sonstiges",             en: "Other",                color: kiosk.color.inkMute,    textOn: kiosk.color.paper }, // fallback, no real swatch
  },

  // 10 straps — ONE component, color is the only variable.
  strap: {
    gratis:           { de: "GRATIS",            en: "FREE",          bg: kiosk.color.moss,    fg: kiosk.color.paper, struck: false },
    tausch:           { de: "TAUSCH",            en: "SWAP",          bg: kiosk.color.teal,    fg: kiosk.color.paper, struck: false },
    bump:             { de: "FRISCH HOCHGEHOLT", en: "FRESHLY BUMPED", bg: kiosk.color.ochre,   fg: kiosk.color.ink,   struck: false },
    altpapier:        { de: "ALTPAPIER",         en: "STALE",         bg: kiosk.color.inkMute, fg: kiosk.color.paper, struck: false, faded: true },
    altbestand:       { de: "ALTBESTAND",        en: "LEGACY",        bg: kiosk.color.inkMute, fg: kiosk.color.paper, struck: false },
    pruefung:         { de: "IN PRÜFUNG",        en: "UNDER REVIEW",  bg: kiosk.color.ochre,   fg: kiosk.color.ink,   struck: false },
    bildAbgelehnt:    { de: "BILD ABGELEHNT",    en: "IMAGE REJECTED", bg: kiosk.color.wine,    fg: kiosk.color.paper, struck: false },
    reserviert:       { de: "RESERVIERT",        en: "RESERVED",      bg: kiosk.color.plum,    fg: kiosk.color.paper, struck: false },
    verkauft:         { de: "VERKAUFT",          en: "SOLD",          bg: kiosk.color.inkMute, fg: kiosk.color.paper, struck: true  },
    entwurf:          { de: "ENTWURF",           en: "DRAFT",         bg: "transparent",       fg: kiosk.color.ink,   struck: false, outline: true },
  },

  // Delivery enum — ships on the listing schema.
  delivery: {
    abholung:        { de: "Nur Abholung",      en: "Pickup only",       icon: "↗" },
    versand:         { de: "Versand möglich",   en: "Shipping possible", icon: "✈" },
    abholungVersand: { de: "Abholung & Versand", en: "Pickup & shipping", icon: "↗✈" },
  },
};

// ─── Strap component (locked at 10 entries) ───
function MarketStrap({ kind, lang = "DE", small = false }) {
  const s = market.strap[kind];
  if (!s) return null;
  const label = lang === "DE" ? s.de : s.en;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontFamily: kiosk.font.mono, fontWeight: 600,
      fontSize: small ? 9 : 10.5, letterSpacing: "0.12em",
      padding: small ? "2px 7px" : "3px 9px",
      background: s.outline ? "transparent" : s.bg,
      color: s.fg,
      border: s.outline ? `1.2px dashed ${s.fg}` : `1px solid ${kiosk.color.ink}`,
      borderRadius: kiosk.r.sm,
      boxShadow: s.outline ? "none" : kiosk.shadow.printSm(kiosk.color.ink),
      textDecoration: s.struck ? "line-through" : "none",
      opacity: s.faded ? 0.55 : 1,
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

// ─── Category chip (for filter rail + card meta) ───
function CategoryChip({ id, lang = "DE", active = false, mini = false }) {
  const c = market.cat[id];
  if (!c) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: mini ? "2px 8px" : "5px 12px",
      fontSize: mini ? 11 : 12.5, fontWeight: 600,
      background: active ? c.color : "transparent",
      color: active ? c.textOn : kiosk.color.ink,
      border: `1.5px solid ${active ? kiosk.color.ink : c.color}`,
      borderRadius: kiosk.r.pill,
      fontFamily: kiosk.font.display,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, border: active ? `1px solid ${kiosk.color.ink}` : "none" }} />
      {lang === "DE" ? c.de : c.en}
    </span>
  );
}

// ─── Delivery pill ───
function DeliveryPill({ kind, lang = "DE" }) {
  const d = market.delivery[kind];
  if (!d) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 500,
      padding: "2px 7px",
      background: kiosk.color.paperSoft, color: kiosk.color.inkSoft,
      border: `1px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.sm,
    }}>
      <span style={{ fontSize: 9, opacity: 0.7 }}>{d.icon}</span>
      {lang === "DE" ? d.de : d.en}
    </span>
  );
}

// ─── Price tag (per-kind: Verkaufen € / Tausch ↔ / Verschenken gratis) ───
function PriceTag({ listing, lang = "DE", size = "md" }) {
  const sz = size === "lg" ? { num: 44, suffix: 14, glyph: 38 } : size === "sm" ? { num: 22, suffix: 9, glyph: 18 } : { num: 30, suffix: 11, glyph: 26 };

  if (listing.kind === "verschenken") {
    return <MarketStrap kind="gratis" lang={lang} />;
  }
  if (listing.kind === "tausch") {
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: sz.glyph, color: kiosk.color.teal, lineHeight: 1 }}>↔</span>
        <span style={{ fontFamily: kiosk.font.display, fontSize: sz.suffix, fontWeight: 600, color: kiosk.color.inkSoft, letterSpacing: "0.02em" }}>
          {lang === "DE" ? "Tauschvorschlag" : "Swap proposal"}
        </span>
      </div>
    );
  }
  // verkaufen
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: sz.num, fontWeight: 400, color: kiosk.color.ink, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {listing.price}
      </span>
      <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: sz.num * 0.7, color: kiosk.color.ink, lineHeight: 1 }}>€</span>
      {listing.vb && (
        <span style={{ fontFamily: kiosk.font.mono, fontSize: sz.suffix, color: kiosk.color.inkMute, marginLeft: 4, fontWeight: 600, letterSpacing: "0.05em" }}>VB</span>
      )}
    </div>
  );
}

// ─── Striped image placeholder, marketplace-flavored ───
function ListingImage({ category, ratio = "4/3", label, lead = false }) {
  const c = (market.cat[category] && market.cat[category].color) || kiosk.color.inkMute;
  return (
    <div style={{
      width: "100%", aspectRatio: ratio,
      borderRadius: kiosk.r.md,
      border: kiosk.border.ink,
      background: `repeating-linear-gradient(${lead ? 30 : 45}deg, ${c}33 0 ${lead ? 14 : 10}px, ${kiosk.color.paperWarm} ${lead ? 14 : 10}px ${lead ? 28 : 20}px)`,
      display: "flex", alignItems: "flex-end", justifyContent: "flex-start",
      padding: lead ? 18 : 10,
      fontFamily: kiosk.font.mono, fontSize: lead ? 11 : 9.5,
      color: kiosk.color.inkMute, letterSpacing: "0.12em",
      textTransform: "uppercase",
      position: "relative",
    }}>
      <span style={{ background: kiosk.color.paper, padding: "2px 6px", border: `1px solid ${kiosk.color.rule}`, borderRadius: 4 }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Seed data — 12 listings + 1 lead. Mix of kinds, all 8 cats.
//  "today" = Mi 7. Mai 2026 (Calendar+1 day).
// ─────────────────────────────────────────────────────────

const SEED_LISTINGS = [
  // Lead listing — featured, freshness-based pick
  {
    id: "L001", kind: "verkaufen", lead: true,
    cat: "moebel",
    title: "Eichentisch · 1960er · Schillerpromenade",
    titleEN: "Oak table · 1960s · Schillerpromenade",
    price: 180, vb: true,
    delivery: "abholung",
    body: "Massiver Esstisch, 140×80, ein paar ehrliche Kratzer. Stand 30 Jahre in der Wohnung meiner Großmutter, jetzt zieh ich um und passt nicht. Nur Abholung, ich helfe runtertragen.",
    bodyEN: "Solid dining table, 140×80, a few honest scratches. Sat in my grandmother's flat for 30 years, now I'm moving and it doesn't fit. Pickup only, I'll help carry.",
    a: "Henrike B.", aColor: kiosk.color.wine,
    seit: "seit 2018",
    ts: "vor 2 Std.", tsEN: "2h ago",
    bookmarks: 14, views: 89,
    img: { ratio: "16/9", label: "Eichentisch · 16:9 Foto" },
    images: 5,
    spot: "Schillerpromenade · Vorbeischauen-Punkt 3",
  },

  // Grid listings — 12 items
  {
    id: "L002", kind: "verkaufen", cat: "fahrrad",
    title: "Diamant-Rad · 28 Zoll · gut gewartet",
    titleEN: "Diamant bike · 28-inch · well-maintained",
    price: 220, vb: true,
    delivery: "abholung",
    a: "Lukas M.", aColor: kiosk.color.ochre,
    ts: "vor 4 Std.", tsEN: "4h ago",
    bookmarks: 8,
    img: { ratio: "4/3", label: "Diamant 28″" },
    images: 3,
  },
  {
    id: "L003", kind: "tausch", cat: "kleidung",
    title: "Vintage-Lederjacke L gegen S/M",
    titleEN: "Vintage leather jacket L for S/M",
    a: "Çiğdem A.", aColor: kiosk.color.plum,
    ts: "vor 6 Std.", tsEN: "6h ago",
    bookmarks: 5,
    img: { ratio: "4/3", label: "Lederjacke" },
    images: 2,
  },
  {
    id: "L004", kind: "verschenken", cat: "medien",
    title: "Stapel Romane · ca. 25 Bücher · Krimis & Lit.",
    titleEN: "Stack of novels · ~25 books · crime & lit",
    a: "Mauro R.", aColor: kiosk.color.moss,
    ts: "vor 8 Std.", tsEN: "8h ago",
    bookmarks: 12,
    img: { ratio: "4/3", label: "25 Bücher" },
    images: 1,
    delivery: "abholung",
  },
  {
    id: "L005", kind: "verkaufen", cat: "elektronik",
    title: "Sonos One · 1. Gen · funktioniert tadellos",
    titleEN: "Sonos One · 1st gen · works flawlessly",
    price: 95, vb: false,
    delivery: "abholungVersand",
    a: "Felix W.", aColor: kiosk.color.teal,
    ts: "vor 12 Std.", tsEN: "12h ago",
    bookmarks: 4,
    img: { ratio: "4/3", label: "Sonos One" },
    images: 4,
    bumped: true,
  },
  {
    id: "L006", kind: "verkaufen", cat: "moebel",
    title: "IKEA Malm Kommode · weiß · 4 Schubladen",
    titleEN: "IKEA Malm dresser · white · 4 drawers",
    price: 45, vb: true,
    delivery: "abholung",
    a: "Sofie L.", aColor: kiosk.color.wine,
    ts: "vor 1 Tag", tsEN: "1d ago",
    bookmarks: 3,
    img: { ratio: "4/3", label: "Malm 4-fach" },
    images: 2,
    reserved: true,
  },
  {
    id: "L007", kind: "verschenken", cat: "pflanze",
    title: "Monstera-Ableger · in Wasserglas, bewurzelt",
    titleEN: "Monstera cutting · rooted in water glass",
    a: "Jana B.", aColor: "#8aa67a",
    ts: "vor 1 Tag", tsEN: "1d ago",
    bookmarks: 18,
    img: { ratio: "4/3", label: "Monstera-Ableger" },
    images: 1,
    delivery: "abholung",
  },
  {
    id: "L008", kind: "verkaufen", cat: "kind",
    title: "Holz-Kinderwagen Hauck · gepflegt, alle Teile",
    titleEN: "Hauck wooden stroller · clean, all parts",
    price: 65, vb: false,
    delivery: "abholung",
    a: "Ronja K.", aColor: "#d77a6a",
    ts: "vor 1 Tag", tsEN: "1d ago",
    bookmarks: 7,
    img: { ratio: "4/3", label: "Hauck Wagen" },
    images: 6,
  },
  {
    id: "L009", kind: "verkaufen", cat: "werkzeug",
    title: "Bosch Akku-Bohrer · mit zwei Akkus",
    titleEN: "Bosch cordless drill · two batteries",
    price: 55, vb: true,
    delivery: "abholungVersand",
    a: "Tarik D.", aColor: kiosk.color.moss,
    ts: "vor 2 Tagen", tsEN: "2d ago",
    bookmarks: 2,
    img: { ratio: "4/3", label: "Bosch Set" },
    images: 3,
  },
  {
    id: "L010", kind: "tausch", cat: "medien",
    title: "Switch-Spiele tauschen · Zelda gg. Mario Kart",
    titleEN: "Switch game swap · Zelda for Mario Kart",
    a: "Niko P.", aColor: kiosk.color.ink,
    ts: "vor 2 Tagen", tsEN: "2d ago",
    bookmarks: 6,
    img: { ratio: "4/3", label: "Switch Cart" },
    images: 1,
  },
  {
    id: "L011", kind: "verkaufen", cat: "elektronik",
    title: "iPad Air 4 · 64GB · Hülle dabei",
    titleEN: "iPad Air 4 · 64GB · case included",
    price: 280, vb: true,
    delivery: "abholungVersand",
    a: "Hannah G.", aColor: kiosk.color.teal,
    ts: "vor 3 Tagen", tsEN: "3d ago",
    bookmarks: 11,
    img: { ratio: "4/3", label: "iPad Air 4" },
    images: 4,
  },
  {
    id: "L012", kind: "verkaufen", cat: "fahrrad",
    title: "Kindersitz Thule Yepp · für Lenker",
    titleEN: "Thule Yepp child seat · handlebar mount",
    price: 35, vb: false,
    delivery: "abholung",
    a: "Marek S.", aColor: kiosk.color.ochre,
    ts: "vor 4 Tagen", tsEN: "4d ago",
    bookmarks: 1,
    img: { ratio: "4/3", label: "Thule Yepp" },
    images: 2,
    altpapier: true, // freshness decay demo
  },
  {
    id: "L013", kind: "verkaufen", cat: "kleidung",
    title: "Wintermantel · Wolle, Größe 38, dunkelblau",
    titleEN: "Winter coat · wool, size 38, dark blue",
    price: 40, vb: true,
    delivery: "abholungVersand",
    a: "Beate W.", aColor: kiosk.color.plum,
    ts: "vor 5 Tagen", tsEN: "5d ago",
    bookmarks: 0,
    img: { ratio: "4/3", label: "Wollmantel" },
    images: 3,
    altbestand: true, // legacy demo
  },
];

// ─────────────────────────────────────────────────────────
//  Marketplace title block — same shape as Forum's
// ─────────────────────────────────────────────────────────
function MarketTitleBlock({ lang = "DE" }) {
  return (
    <section style={{ padding: "22px 36px 14px", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: 20, borderBottom: `1px dashed ${kiosk.color.rule}` }}>
      <div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.ochre, letterSpacing: "0.12em" }}>
          MARKT · {lang === "DE" ? "DONNERSTAG 7. MAI" : "THURSDAY MAY 7"} · 09:14
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "6px 0 0" }}>
          {lang === "DE"
            ? <>Was <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.ochre }}>wechselt</span> heute den Besitzer?</>
            : <>What's <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.ochre }}>changing</span> hands today?</>}
        </h1>
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute }}>
          <span><b style={{ color: kiosk.color.ink }}>342</b> {lang === "DE" ? "Anzeigen" : "listings"}</span>
          <span><b style={{ color: kiosk.color.ink }}>17</b> {lang === "DE" ? "neu seit gestern" : "new since yesterday"}</span>
          <span><b style={{ color: kiosk.color.ochre }}>●</b> {lang === "DE" ? "5 frisch im Kiez" : "5 fresh in the kiez"}</span>
        </div>
      </div>
      <KioskBtn>{lang === "DE" ? "+ neue anzeige" : "+ new listing"}</KioskBtn>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
//  Filter rail — categories + saved/mine + kind toggle
// ─────────────────────────────────────────────────────────
function MarketFilterRail({ activeCat = null, activeKind = "all", lang = "DE" }) {
  const labels = lang === "DE"
    ? { all: "Alle", verkaufen: "Verkaufen", tausch: "Tausch", verschenken: "Verschenken", saved: "Gespeichert", mine: "Meine Anzeigen" }
    : { all: "All", verkaufen: "For sale", tausch: "Swap", verschenken: "Free", saved: "Saved", mine: "My listings" };

  return (
    <>
      {/* Kind toggle row — outline-style, primary filter */}
      <section style={{ padding: "12px 36px 4px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.12em", marginRight: 4 }}>
          {lang === "DE" ? "ART" : "KIND"}
        </span>
        {[
          { id: "all", label: labels.all },
          { id: "verkaufen", label: labels.verkaufen },
          { id: "tausch", label: labels.tausch },
          { id: "verschenken", label: labels.verschenken },
        ].map((k) => (
          <span key={k.id} style={{
            padding: "5px 13px", fontSize: 12.5, fontWeight: 600,
            background: activeKind === k.id ? kiosk.color.ink : "transparent",
            color: activeKind === k.id ? kiosk.color.paper : kiosk.color.ink,
            border: kiosk.border.ink, borderRadius: kiosk.r.pill,
            fontFamily: kiosk.font.display,
          }}>{k.label}</span>
        ))}
        <span style={{ width: 1, height: 18, background: kiosk.color.rule, margin: "0 4px" }} />
        <span style={{
          padding: "5px 12px", fontSize: 12, fontWeight: 500,
          color: kiosk.color.inkSoft,
          border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.pill,
          fontFamily: kiosk.font.display,
        }}>{labels.saved}</span>
        <span style={{
          padding: "5px 12px", fontSize: 12, fontWeight: 500,
          color: kiosk.color.inkSoft,
          border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.pill,
          fontFamily: kiosk.font.display,
        }}>{labels.mine}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em" }}>
            {lang === "DE" ? "SUCHE" : "SEARCH"}
          </span>
          <div style={{ width: 200 }}><KioskInput placeholder={lang === "DE" ? "im Markt suchen…" : "search market…"} icon="🔍" /></div>
        </div>
      </section>

      {/* Category row — colored chips, secondary filter */}
      <section style={{ padding: "8px 36px 14px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.12em", marginRight: 4 }}>
          {lang === "DE" ? "KATEGORIE" : "CATEGORY"}
        </span>
        {Object.keys(market.cat).map((id) => (
          <CategoryChip key={id} id={id} lang={lang} active={activeCat === id} />
        ))}
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────
//  Editorial lead — page-1 only, freshness-based
// ─────────────────────────────────────────────────────────
function ListingLead({ listing, lang = "DE" }) {
  if (!listing) return null;
  const t = lang === "DE" ? listing.title : listing.titleEN;
  const b = lang === "DE" ? listing.body : listing.bodyEN;
  const ts = lang === "DE" ? listing.ts : listing.tsEN;
  const c = market.cat[listing.cat];

  return (
    <article style={{
      margin: "18px 36px",
      background: kiosk.color.paperWarm,
      border: `2px solid ${kiosk.color.ink}`,
      borderRadius: kiosk.r.lg,
      boxShadow: kiosk.shadow.print(c.color),
      display: "grid", gridTemplateColumns: "1.35fr 1fr",
      columnGap: 28,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Strap — top edge, full width */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        background: kiosk.color.ink, color: kiosk.color.paper,
        padding: "6px 18px",
        fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 600,
        letterSpacing: "0.18em", textTransform: "uppercase",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        zIndex: 2,
      }}>
        <span>★ {lang === "DE" ? "HEUTE FRISCH IM KIEZ" : "FRESH IN THE KIEZ TODAY"}</span>
        <span style={{ color: kiosk.color.ochre }}>● {lang === "DE" ? "vor 2 Std. eingestellt" : "posted 2h ago"}</span>
      </div>

      {/* Image side */}
      <div style={{ padding: "44px 0 18px 22px", borderRight: `1px dashed ${kiosk.color.rule}`, marginRight: -14, paddingRight: 14 }}>
        <ListingImage category={listing.cat} ratio={listing.img.ratio} label={listing.img.label} lead />
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          {Array.from({ length: listing.images }).map((_, i) => (
            <div key={i} style={{ width: 38, height: 30, border: kiosk.border.ink, borderRadius: 4, background: i === 0 ? c.color + "55" : kiosk.color.paperSoft, opacity: i === 0 ? 1 : 0.5 }} />
          ))}
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, alignSelf: "center", marginLeft: 6 }}>
            {listing.images} {lang === "DE" ? "Fotos" : "photos"}
          </span>
        </div>
      </div>

      {/* Content side */}
      <div style={{ padding: "44px 22px 18px 4px", display: "flex", flexDirection: "column", gap: 10 }}>
        <CategoryChip id={listing.cat} lang={lang} active />
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.022em", lineHeight: 1.1, margin: 0, color: kiosk.color.ink }}>
          {(() => {
            const parts = t.split(" · ");
            return <>
              <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: c.color }}>{parts[0]}</span>
              {parts.length > 1 && <span style={{ color: kiosk.color.inkSoft, fontWeight: 600 }}> · {parts.slice(1).join(" · ")}</span>}
            </>;
          })()}
        </h2>
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, lineHeight: 1.45, color: kiosk.color.inkSoft, margin: 0 }}>
          {b.length > 180 ? b.slice(0, 180) + "…" : b}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 12, borderTop: `1px dashed ${kiosk.color.rule}` }}>
          <PriceTag listing={listing} lang={lang} size="lg" />
          <DeliveryPill kind={listing.delivery} lang={lang} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute }}>
          <KioskAvatar initials={listing.a.split(" ").map(p => p[0]).join("")} color={listing.aColor} size={26} />
          <span><b style={{ color: kiosk.color.ink }}>{listing.a}</b> · {listing.seit}</span>
          <span style={{ marginLeft: "auto" }}>★ {listing.bookmarks} · 👁 {listing.views}</span>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────
//  Listing card — grid item (uniform 3-col)
// ─────────────────────────────────────────────────────────
function ListingCard({ listing, lang = "DE" }) {
  const t = lang === "DE" ? listing.title : listing.titleEN;
  const ts = lang === "DE" ? listing.ts : listing.tsEN;
  const c = market.cat[listing.cat] || market.cat.sonstiges;

  // Freshness decay applies a subtle fade
  const decayed = listing.altpapier;

  return (
    <article style={{
      background: kiosk.color.paperWarm,
      border: kiosk.border.ink,
      borderRadius: kiosk.r.md,
      boxShadow: kiosk.shadow.printSm(c.color),
      overflow: "hidden",
      position: "relative",
      opacity: decayed ? 0.7 : 1,
      filter: decayed ? "saturate(0.6)" : "none",
      display: "flex", flexDirection: "column",
    }}>
      {/* Image */}
      <div style={{ padding: 8, position: "relative" }}>
        <ListingImage category={listing.cat} ratio={listing.img.ratio} label={null} />
        {/* Image count badge — bottom-right, away from strap stack */}
        <span style={{
          position: "absolute", bottom: 14, right: 14,
          fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 600,
          background: kiosk.color.ink, color: kiosk.color.paper,
          padding: "2px 6px", borderRadius: 4, letterSpacing: "0.05em",
        }}>📷 {listing.images}</span>
        {/* Top-left strap stack — bumps + state straps */}
        <div style={{ position: "absolute", top: 14, left: 14, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
          {listing.entwurf && <MarketStrap kind="entwurf" lang={lang} small />}
          {listing.bumped && <MarketStrap kind="bump" lang={lang} small />}
          {listing.reserved && <MarketStrap kind="reserviert" lang={lang} small />}
          {listing.altpapier && <MarketStrap kind="altpapier" lang={lang} small />}
          {listing.altbestand && <MarketStrap kind="altbestand" lang={lang} small />}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
          <CategoryChip id={listing.cat} lang={lang} mini />
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>{ts}</span>
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.012em", lineHeight: 1.25, margin: 0, color: kiosk.color.ink }}>{t}</h3>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
          <PriceTag listing={listing} lang={lang} size="sm" />
          {listing.delivery && <DeliveryPill kind={listing.delivery} lang={lang} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 6, borderTop: `1px dashed ${kiosk.color.rule}` }}>
          <KioskAvatar initials={listing.a.split(" ").map(p => p[0]).join("")} color={listing.aColor} size={20} />
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkSoft }}>{listing.a}</span>
          <span style={{ marginLeft: "auto", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>★ {listing.bookmarks}</span>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────
//  Marketplace index — desktop (1280×1100)
//  Page-1 layout: title + filters + lead + uniform 3-col grid
// ─────────────────────────────────────────────────────────
function MarketplaceIndexDesktop({ lang = "DE", filterKind = null, view = "all" }) {
  // Owner-view: show only "your" listings (pick a slice + tag one as Entwurf)
  let pool = SEED_LISTINGS;
  if (view === "mine") {
    pool = SEED_LISTINGS.filter((_, i) => [0, 4, 5, 11].includes(i)).map((l, i) => i === 0 ? { ...l, entwurf: true, ts: lang === "DE" ? "Entwurf · nicht veröffentlicht" : "Draft · unpublished", tsEN: "Draft · unpublished" } : l);
  } else if (filterKind) {
    pool = SEED_LISTINGS.filter((l) => l.kind === filterKind);
  }
  const showLead = view !== "mine" && !filterKind;
  const lead = showLead ? pool[0] : null;
  const grid = showLead ? pool.slice(1) : pool;
  const sectionLabel = view === "mine"
    ? (lang === "DE" ? `MEINE ${pool.length} ANZEIGEN` : `MY ${pool.length} LISTINGS`)
    : filterKind
    ? (lang === "DE" ? `${pool.length} ${filterKind === "verschenken" ? "GESCHENKE" : filterKind === "tausch" ? "TAUSCH-ANZEIGEN" : "ANZEIGEN"}` : `${pool.length} RESULTS`)
    : (lang === "DE" ? "ALLE 342 ANZEIGEN" : "ALL 342 LISTINGS");

  return (
    <div style={{
      width: 1280, minHeight: 1100,
      background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, position: "relative", overflow: "hidden",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      <window.KioskNav active="Markt" lang={lang} />
      <MarketTitleBlock lang={lang} />
      <MarketFilterRail lang={lang} activeKind="all" />

      <ListingLead listing={lead} lang={lang} />

      {/* Section divider — strap */}
      <div style={{ margin: "0 36px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ink, letterSpacing: "0.18em", fontWeight: 700, padding: "3px 9px", background: kiosk.color.ochre, borderRadius: kiosk.r.sm, border: kiosk.border.ink }}>
          {sectionLabel}
        </span>
        <span style={{ flex: 1, height: 0, borderTop: `1px dashed ${kiosk.color.rule}` }} />
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em" }}>
          {lang === "DE" ? "SORTIERT NACH FRISCHE" : "SORTED BY FRESHNESS"}
        </span>
      </div>

      {/* 3-col grid */}
      <div style={{
        margin: "0 36px 24px",
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
      }}>
        {grid.map((l) => <ListingCard key={l.id} listing={l} lang={lang} />)}
      </div>

      {/* Footer rule */}
      <div style={{ borderTop: `1px dashed ${kiosk.color.rule}`, padding: "12px 36px", display: "flex", justifyContent: "space-between", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
        <span>{lang === "DE" ? "Seite 1 von 12 · 12 von 342 sichtbar" : "Page 1 of 12 · 12 of 342 shown"}</span>
        <span>{lang === "DE" ? "→ weitere laden" : "→ load more"}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Marketplace index — mobile (390×900)
// ─────────────────────────────────────────────────────────
function MarketplaceIndexMobile({ lang = "DE" }) {
  const lead = SEED_LISTINGS[0];
  const grid = SEED_LISTINGS.slice(1, 7);

  return (
    <div style={{
      width: 390, minHeight: 900,
      background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, position: "relative", overflow: "hidden",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      {/* Mobile header */}
      <header style={{ padding: "12px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, background: kiosk.color.wine, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: kiosk.color.paper, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 20, border: kiosk.border.ink }}>m</div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>mahalle</div>
        </div>
        <div style={{ display: "flex", border: kiosk.border.ink, borderRadius: kiosk.r.pill, overflow: "hidden", fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 600 }}>
          <span style={{ padding: "4px 8px", background: lang === "DE" ? kiosk.color.ink : "transparent", color: lang === "DE" ? kiosk.color.paper : kiosk.color.ink }}>DE</span>
          <span style={{ padding: "4px 8px", background: lang === "EN" ? kiosk.color.ink : "transparent", color: lang === "EN" ? kiosk.color.paper : kiosk.color.ink, borderLeft: kiosk.border.ink }}>EN</span>
        </div>
      </header>

      {/* Title */}
      <section style={{ padding: "14px 16px 8px" }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ochre, letterSpacing: "0.12em" }}>
          MARKT · {lang === "DE" ? "DO 7. MAI · 09:14" : "THU MAY 7 · 09:14"}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 0.98, margin: "4px 0 0" }}>
          {lang === "DE"
            ? <>Was <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.ochre }}>wechselt</span> heute den Besitzer?</>
            : <>What's <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.ochre }}>changing</span> hands?</>}
        </h1>
        <div style={{ display: "flex", gap: 10, marginTop: 8, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>
          <span><b style={{ color: kiosk.color.ink }}>342</b> {lang === "DE" ? "Anzeigen" : "listings"}</span>
          <span><b style={{ color: kiosk.color.ochre }}>●</b> 5 frisch</span>
        </div>
      </section>

      {/* Kind toggle scroll-row */}
      <section style={{ padding: "6px 16px 8px", display: "flex", gap: 6, overflowX: "auto" }}>
        {["Alle", "Verkaufen", "Tausch", "Verschenken"].map((k, i) => (
          <span key={k} style={{
            padding: "4px 11px", fontSize: 12, fontWeight: 600,
            background: i === 0 ? kiosk.color.ink : "transparent",
            color: i === 0 ? kiosk.color.paper : kiosk.color.ink,
            border: kiosk.border.ink, borderRadius: kiosk.r.pill,
            whiteSpace: "nowrap", flexShrink: 0,
          }}>{k}</span>
        ))}
      </section>

      {/* Category scroll-row */}
      <section style={{ padding: "0 16px 10px", display: "flex", gap: 5, overflowX: "auto", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        {Object.keys(market.cat).slice(0, 6).map((id) => (
          <div key={id} style={{ flexShrink: 0 }}><CategoryChip id={id} lang={lang} mini /></div>
        ))}
      </section>

      {/* Lead — mobile: stacked */}
      <article style={{
        margin: "12px 16px",
        background: kiosk.color.paperWarm,
        border: `2px solid ${kiosk.color.ink}`,
        borderRadius: kiosk.r.lg,
        boxShadow: kiosk.shadow.print(market.cat[lead.cat].color),
        overflow: "hidden",
      }}>
        <div style={{
          background: kiosk.color.ink, color: kiosk.color.paper,
          padding: "5px 12px", fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 600,
          letterSpacing: "0.18em", textTransform: "uppercase",
          display: "flex", justifyContent: "space-between",
        }}>
          <span>★ {lang === "DE" ? "FRISCH HEUTE" : "FRESH TODAY"}</span>
          <span style={{ color: kiosk.color.ochre }}>● 2h</span>
        </div>
        <div style={{ padding: 10 }}>
          <ListingImage category={lead.cat} ratio="16/9" label={lead.img.label} />
        </div>
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <CategoryChip id={lead.cat} lang={lang} mini active />
          <h2 style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15, margin: 0 }}>
            {lang === "DE" ? lead.title : lead.titleEN}
          </h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 8, borderTop: `1px dashed ${kiosk.color.rule}` }}>
            <PriceTag listing={lead} lang={lang} size="md" />
            <DeliveryPill kind={lead.delivery} lang={lang} />
          </div>
        </div>
      </article>

      {/* Section divider */}
      <div style={{ margin: "0 16px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.ink, letterSpacing: "0.18em", fontWeight: 700, padding: "2px 8px", background: kiosk.color.ochre, borderRadius: kiosk.r.sm, border: kiosk.border.ink }}>
          {lang === "DE" ? "ALLE 342" : "ALL 342"}
        </span>
        <span style={{ flex: 1, height: 0, borderTop: `1px dashed ${kiosk.color.rule}` }} />
      </div>

      {/* 1-col list (mobile uses single column for cards) */}
      <div style={{ margin: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {grid.map((l) => <ListingCard key={l.id} listing={l} lang={lang} />)}
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────
Object.assign(window, {
  market,
  SEED_LISTINGS,
  MarketStrap, CategoryChip, DeliveryPill, PriceTag, ListingImage,
  MarketTitleBlock, MarketFilterRail,
  ListingLead, ListingCard,
  MarketplaceIndexDesktop, MarketplaceIndexMobile,
});

/* global React, kiosk, kioskFonts, paperGrainStyle, KioskBtn, KioskAvatar,
   market, SEED_LISTINGS, MarketStrap, CategoryChip, DeliveryPill, PriceTag, ListingCard, ListingImage */

// ══════════════════════════════════════════════════════════
//  KIOSK · MARKETPLACE · STATE MATRIX
//  10 states laid out on one matrix artboard per platform.
//  States: loading · empty · search-empty · error · reserved ·
//  sold · mod-pending · image-rejected · listing-rejected ·
//  owner-view (lifecycle states on detail context).
// ══════════════════════════════════════════════════════════

// ─── State tile wrapper ───
function StateTile({ n, label, lang = "DE", color = kiosk.color.wine, hint, children, height = 280, span = 1 }) {
  return (
    <div style={{
      gridColumn: `span ${span}`,
      background: kiosk.color.paperWarm,
      border: `1.5px solid ${kiosk.color.ink}`,
      borderRadius: kiosk.r.md,
      boxShadow: kiosk.shadow.printSm(color),
      padding: "12px 14px 14px",
      display: "flex", flexDirection: "column", gap: 8,
      minHeight: height, position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, borderBottom: `1px dashed ${kiosk.color.rule}`, paddingBottom: 6 }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 700, color: kiosk.color.paper, background: color, padding: "2px 7px", borderRadius: kiosk.r.sm, letterSpacing: "0.15em" }}>§{n}</span>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: "-0.012em" }}>{label}</h3>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
      {hint && (
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, lineHeight: 1.45, letterSpacing: "0.02em", paddingTop: 6, borderTop: `1px dashed ${kiosk.color.rule}` }}>
          ↳ {hint}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton card (loading) ───
function SkeletonCard() {
  return (
    <div style={{ background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.md, padding: 8, position: "relative", overflow: "hidden" }}>
      <div style={{ aspectRatio: "4/3", background: kiosk.color.rule + "55", borderRadius: kiosk.r.sm, position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(90deg, transparent, ${kiosk.color.paper}66, transparent)`,
          animation: "shimmer 1.6s linear infinite",
        }} />
      </div>
      <div style={{ height: 8, background: kiosk.color.rule + "55", borderRadius: 4, marginTop: 8, width: "70%" }} />
      <div style={{ height: 8, background: kiosk.color.rule + "55", borderRadius: 4, marginTop: 4, width: "40%" }} />
    </div>
  );
}

// ─── Listing state mini-card ───
function StateListingCard({ listing, lang = "DE", straps = [], overlay, dim = false }) {
  const c = market.cat[listing.cat];
  const t = lang === "DE" ? listing.title : listing.titleEN;
  return (
    <div style={{
      background: kiosk.color.paperWarm,
      border: kiosk.border.ink, borderRadius: kiosk.r.sm,
      boxShadow: kiosk.shadow.printSm(c.color),
      overflow: "hidden", position: "relative",
      opacity: dim ? 0.6 : 1,
      filter: dim ? "saturate(0.6)" : "none",
    }}>
      <div style={{ position: "relative", padding: 6 }}>
        <div style={{
          aspectRatio: "4/3",
          background: `repeating-linear-gradient(45deg, ${c.color}33 0 8px, ${kiosk.color.paperWarm} 8px 16px)`,
          border: `1px solid ${kiosk.color.ink}`, borderRadius: 4,
        }} />
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 3 }}>
          {straps.map((s) => <MarketStrap key={s} kind={s} lang={lang} small />)}
        </div>
        {overlay && (
          <div style={{
            position: "absolute", inset: 6,
            background: kiosk.color.ink + "dd",
            border: `1.5px solid ${kiosk.color.ink}`, borderRadius: 4,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 6, padding: 8,
          }}>
            {overlay}
          </div>
        )}
      </div>
      <div style={{ padding: "0 10px 10px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, color: kiosk.color.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</div>
        <div style={{ marginTop: 4 }}>
          <PriceTag listing={listing} lang={lang} size="sm" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  DESKTOP STATE MATRIX — single artboard, all 10 states
// ─────────────────────────────────────────────────────────
function MarketplaceStatesDesktop({ lang = "DE" }) {
  return (
    <div style={{
      width: 1280, minHeight: 1700, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: 28,
    }}>
      <style>{kioskFonts}</style>
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
      <div style={paperGrainStyle} />

      {/* Header */}
      <header style={{ padding: "8px 8px 18px", borderBottom: `1.5px solid ${kiosk.color.ink}`, marginBottom: 18 }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.18em" }}>
          MARKT · {lang === "DE" ? "ZUSTANDSKARTE · 10 ZUSTÄNDE" : "STATE MATRIX · 10 STATES"}
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "6px 0 0" }}>
          {lang === "DE"
            ? <>Jeder Zustand <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>spricht</span> für sich.</>
            : <>Every state <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>speaks</span> for itself.</>}
        </h1>
        <div style={{ display: "flex", gap: 20, marginTop: 10, fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute }}>
          <span><b style={{ color: kiosk.color.wine }}>4</b> {lang === "DE" ? "Listen-Zustände" : "list states"}</span>
          <span><b style={{ color: kiosk.color.teal }}>4</b> {lang === "DE" ? "Lebenszyklus" : "lifecycle"}</span>
          <span><b style={{ color: kiosk.color.moss }}>2</b> {lang === "DE" ? "Moderation" : "moderation"}</span>
        </div>
      </header>

      {/* Section: list states */}
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 700, color: kiosk.color.wine, letterSpacing: "0.15em", marginBottom: 10 }}>
        ◆ {lang === "DE" ? "LISTEN-ZUSTÄNDE" : "LIST STATES"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {/* 01 LOADING */}
        <StateTile n="01" label={lang === "DE" ? "Lädt · Skeleton" : "Loading · Skeleton"} color={kiosk.color.inkMute} lang={lang}
          hint={lang === "DE" ? "Skeleton mit shimmer-Animation. 6 Karten, 220ms staggered fade-in beim Eintreffen der echten Daten." : "Skeleton with shimmer. 6 cards, 220ms staggered fade-in once real data arrives."}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </StateTile>

        {/* 02 EMPTY */}
        <StateTile n="02" label={lang === "DE" ? "Leer · noch nix" : "Empty · no listings"} color={kiosk.color.ochre} lang={lang}
          hint={lang === "DE" ? "Erste-Anzeige-Einladung. Direkter CTA, kein Stockfoto, kein „be the first to…“-Cliché." : "First-listing invite. Direct CTA, no stock illustration, no „be the first“ cliché."}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 0", textAlign: "center" }}>
            <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 48, color: kiosk.color.ochre, lineHeight: 1 }}>∅</div>
            <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 18, lineHeight: 1.3, color: kiosk.color.ink, maxWidth: 220 }}>
              {lang === "DE" ? "Heute steht hier noch nichts. Magst du anfangen?" : "Nothing here yet. Want to start?"}
            </div>
            <KioskBtn small>{lang === "DE" ? "+ erste anzeige" : "+ first listing"}</KioskBtn>
          </div>
        </StateTile>

        {/* 03 SEARCH-EMPTY */}
        <StateTile n="03" label={lang === "DE" ? "Filter · 0 Treffer" : "Filter · 0 hits"} color={kiosk.color.ochre} lang={lang}
          hint={lang === "DE" ? "Aktive Filter sichtbar, einzeln entfernbar. „Alarm setzen“ als alternativer Pfad statt Sackgasse." : "Active filters shown, dismissible. „Set alert“ offered as alternative path, not dead end."}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em" }}>
              {lang === "DE" ? "AKTIVE FILTER" : "ACTIVE FILTERS"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {["Fahrräder", "unter 100 €", "Verschenken"].map((f) => (
                <span key={f} style={{ fontFamily: kiosk.font.mono, fontSize: 10, padding: "2px 8px", background: kiosk.color.ink, color: kiosk.color.paper, borderRadius: kiosk.r.pill, display: "inline-flex", gap: 4, alignItems: "center" }}>
                  {f} <span style={{ opacity: 0.7 }}>✕</span>
                </span>
              ))}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8 }}>
              <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, color: kiosk.color.ink, lineHeight: 1.3, maxWidth: 200 }}>
                {lang === "DE" ? "Nichts dabei. Soll Mahalle benachrichtigen, sobald etwas auftaucht?" : "Nothing matches. Want a ping if something shows up?"}
              </div>
              <KioskBtn small variant="outline">🔔 {lang === "DE" ? "alarm setzen" : "set alert"}</KioskBtn>
            </div>
          </div>
        </StateTile>

        {/* 04 ERROR */}
        <StateTile n="04" label={lang === "DE" ? "Fehler · Netzwerk" : "Error · network"} color={kiosk.color.danger} lang={lang}
          hint={lang === "DE" ? "Cached-Daten bleiben sichtbar (oben Banner). Retry mit exponential backoff, manuell triggerbar." : "Cached data stays visible (top banner). Retry on exponential backoff, manually triggerable."}>
          <div style={{
            padding: "10px 12px", background: kiosk.color.danger, color: kiosk.color.paper,
            borderRadius: kiosk.r.sm, border: kiosk.border.ink,
            display: "flex", alignItems: "center", gap: 8, fontSize: 12,
          }}>
            <span>⚠</span>
            <span style={{ flex: 1, fontWeight: 600 }}>{lang === "DE" ? "Verbindung weg. Zeige zwischengespeichert." : "Lost connection. Showing cached."}</span>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, textDecoration: "underline" }}>{lang === "DE" ? "neu laden" : "retry"}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, opacity: 0.7, marginTop: 4 }}>
            <StateListingCard listing={SEED_LISTINGS[1]} lang={lang} />
            <StateListingCard listing={SEED_LISTINGS[3]} lang={lang} />
          </div>
        </StateTile>
      </div>

      {/* Section: lifecycle states */}
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 700, color: kiosk.color.teal, letterSpacing: "0.15em", marginBottom: 10 }}>
        ◆ {lang === "DE" ? "LEBENSZYKLUS" : "LIFECYCLE"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        {/* 05 RESERVED */}
        <StateTile n="05" label={lang === "DE" ? "Reserviert · Soft-Lock" : "Reserved · soft-lock"} color={kiosk.color.plum} lang={lang}
          hint={lang === "DE" ? "Käufer:in hat „Interesse“ geklickt. 48h Soft-Lock. Andere können sich auf Warteliste setzen." : "Buyer clicked „Interesse“. 48h soft-lock. Others can join waitlist."}>
          <StateListingCard listing={SEED_LISTINGS[5]} lang={lang} straps={["reserviert"]} />
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, lineHeight: 1.4 }}>
            <b style={{ color: kiosk.color.plum }}>48h</b> {lang === "DE" ? "Reserviert · 3 auf Warteliste" : "Reserved · 3 on waitlist"}
          </div>
        </StateTile>

        {/* 06 SOLD */}
        <StateTile n="06" label={lang === "DE" ? "Verkauft · archiviert" : "Sold · archived"} color={kiosk.color.inkMute} lang={lang}
          hint={lang === "DE" ? "Titel durchgestrichen, gedämpfte Farben. Bleibt 30 Tage sichtbar als Beweis, dann archiviert." : "Title struck through, muted colors. Stays visible 30 days as proof, then archived."}>
          <StateListingCard listing={SEED_LISTINGS[2]} lang={lang} straps={["verkauft"]} dim />
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, lineHeight: 1.4 }}>
            {lang === "DE" ? "Verkauft an Çiğdem A. · vor 3 Tagen" : "Sold to Çiğdem A. · 3d ago"}
          </div>
        </StateTile>

        {/* 07 FRESHNESS-DECAY (altpapier as part of lifecycle) */}
        <StateTile n="07" label={lang === "DE" ? "Altpapier · veraltet" : "Stale · aged out"} color={kiosk.color.inkMute} lang={lang}
          hint={lang === "DE" ? "Nach 21 Tagen ohne Aktivität: altpapier-Strap, Saturierung -40%. Owner-CTA: „auffrischen“." : "After 21 days idle: altpapier strap, -40% saturation. Owner CTA: „auffrischen“."}>
          <StateListingCard listing={SEED_LISTINGS[11]} lang={lang} straps={["altpapier"]} dim />
          <KioskBtn small variant="outline">{lang === "DE" ? "↻ auffrischen" : "↻ refresh"}</KioskBtn>
        </StateTile>

        {/* 08 OWNER-VIEW */}
        <StateTile n="08" label={lang === "DE" ? "Eigene Anzeige" : "Owner view"} color={kiosk.color.teal} lang={lang}
          hint={lang === "DE" ? "Owner sieht Statistiken + Aktionen direkt auf der Karte. Niemand sonst sieht „14 beobachten“." : "Owner sees stats + actions on the card. Nobody else sees „14 watching“."}>
          <StateListingCard listing={SEED_LISTINGS[7]} lang={lang} />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, padding: "2px 6px", background: kiosk.color.ink, color: kiosk.color.paper, borderRadius: 3 }}>{lang === "DE" ? "BEARBEITEN" : "EDIT"}</span>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, padding: "2px 6px", background: kiosk.color.paperSoft, color: kiosk.color.ink, border: `1px solid ${kiosk.color.ink}`, borderRadius: 3 }}>{lang === "DE" ? "BUMP" : "BUMP"}</span>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, padding: "2px 6px", background: kiosk.color.paperSoft, color: kiosk.color.ink, border: `1px solid ${kiosk.color.ink}`, borderRadius: 3 }}>{lang === "DE" ? "ALS VERKAUFT" : "SOLD"}</span>
          </div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.teal, letterSpacing: "0.05em" }}>
            👁 89 · 🔖 14 · 📩 3
          </div>
        </StateTile>
      </div>

      {/* Section: moderation */}
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 700, color: kiosk.color.moss, letterSpacing: "0.15em", marginBottom: 10 }}>
        ◆ {lang === "DE" ? "MODERATION" : "MODERATION"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 14 }}>
        {/* 09 MOD-PENDING */}
        <StateTile n="09" label={lang === "DE" ? "In Prüfung · nicht editierbar" : "Pending review · read-only"} color={kiosk.color.ochre} lang={lang}
          hint={lang === "DE" ? "Optimistic publish: Anzeige sofort live. KI prüft Bilder UND Text parallel (Schimpfwörter, Hass, Spam). Solange in Prüfung: Bearbeiten + Bumpen für Owner deaktiviert." : "Optimistic publish: live immediately. AI checks BOTH images and text in parallel (profanity, hate, spam). While under review: edit + bump disabled for owner."}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <StateListingCard listing={SEED_LISTINGS[4]} lang={lang} straps={["pruefung"]} />
            <div style={{ background: kiosk.color.ink, color: kiosk.color.paper, borderRadius: kiosk.r.sm, padding: "10px 12px", fontFamily: kiosk.font.mono, fontSize: 10, lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ color: kiosk.color.ochre, letterSpacing: "0.15em", fontWeight: 700 }}>◐ KI-CHECK LÄUFT</span>
              <div>{lang === "DE" ? "Bilder · Text · Spam · Hass: ~12s. Bearbeiten gesperrt." : "Images · text · spam · hate: ~12s. Editing locked."}</div>
              <div style={{ marginTop: 4, height: 3, background: kiosk.color.paper + "33", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: "63%", height: "100%", background: kiosk.color.ochre }} />
              </div>
            </div>
          </div>
        </StateTile>

        {/* 10 IMAGE-OR-TEXT REJECTED */}
        <StateTile n="10" label={lang === "DE" ? "Bild oder Text abgelehnt · ersetzbar" : "Image or text rejected · replaceable"} color={kiosk.color.wine} lang={lang}
          hint={lang === "DE" ? "GATED: braucht per-image-mod API. Bei Text-Flag: Owner sieht den problematischen Satz markiert. Bei Bild-Flag: einzelnes Bild ist unsichtbar. Listing bleibt sonst sichtbar; Owner kann ersetzen ohne re-publish." : "GATED: needs per-image-mod API. Text flag: owner sees the offending sentence highlighted. Image flag: single image hidden. Listing otherwise visible; owner can replace without republishing."}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <StateListingCard listing={SEED_LISTINGS[1]} lang={lang} straps={["bildAbgelehnt"]} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.wine, letterSpacing: "0.1em" }}>BILD 3 / 5</div>
              <div style={{
                aspectRatio: "4/3",
                background: `repeating-linear-gradient(45deg, ${kiosk.color.danger}33 0 6px, ${kiosk.color.paperWarm} 6px 12px)`,
                border: `1.5px solid ${kiosk.color.danger}`, borderRadius: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.danger, fontWeight: 700, textAlign: "center", padding: 6,
              }}>{lang === "DE" ? "ABGELEHNT" : "REJECTED"}</div>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkSoft, lineHeight: 1.4 }}>
                {lang === "DE" ? "Grund: Person erkennbar. Bitte unkenntlich machen." : "Reason: face visible. Please blur."}
              </div>
              <KioskBtn small>{lang === "DE" ? "ersetzen" : "replace"}</KioskBtn>
            </div>
          </div>
        </StateTile>
      </div>

      {/* Listing-rejected (full) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: 14 }}>
        <StateTile n="11" label={lang === "DE" ? "Anzeige vollständig abgelehnt · nur Owner sichtbar" : "Listing fully rejected · owner-only"} color={kiosk.color.danger} lang={lang} height={200}
          hint={lang === "DE" ? "Bleibt in DB als Moderations-Beweis. Owner sieht Grund + Einspruch-Pfad. Niemand sonst sieht die Anzeige." : "Stays in DB as moderation proof. Owner sees reason + appeal path. Nobody else sees the listing."}>
          <div style={{ display: "grid", gridTemplateColumns: "0.6fr 2fr", gap: 14 }}>
            <StateListingCard listing={SEED_LISTINGS[9]} lang={lang} dim overlay={<>
              <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 32, color: kiosk.color.paper, lineHeight: 1 }}>✕</span>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.paper, letterSpacing: "0.15em", fontWeight: 700, textAlign: "center" }}>{lang === "DE" ? "ABGELEHNT" : "REJECTED"}</span>
            </>} />
            <div style={{ background: kiosk.color.paperSoft, border: kiosk.border.ink, borderRadius: kiosk.r.md, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700, color: kiosk.color.paper, background: kiosk.color.danger, padding: "2px 7px", borderRadius: kiosk.r.sm, letterSpacing: "0.12em" }}>{lang === "DE" ? "VERWORFEN" : "REJECTED"}</span>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                  {lang === "DE" ? "Grund: Verbotene Ware · § 86a StGB" : "Reason: Prohibited item · § 86a StGB"}
                </h4>
              </div>
              <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 13, color: kiosk.color.inkSoft, margin: 0, lineHeight: 1.5 }}>
                {lang === "DE"
                  ? "Unsere KI hat Symbole erkannt, die in Deutschland nicht zum Verkauf angeboten werden dürfen. Falls das ein Irrtum ist, melde dich — ein Mensch schaut nochmal."
                  : "Our AI flagged symbols that can't legally be sold in Germany. If you think this is a mistake, write us — a human will look again."}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <KioskBtn small variant="outline">{lang === "DE" ? "Einspruch · menschlicher Check" : "Appeal · human review"}</KioskBtn>
                <KioskBtn small variant="ghost">{lang === "DE" ? "verstanden, löschen" : "got it, delete"}</KioskBtn>
              </div>
            </div>
          </div>
        </StateTile>
      </div>

      <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1.5px solid ${kiosk.color.ink}`, display: "flex", justifyContent: "space-between", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.08em" }}>
        <span>{lang === "DE" ? "ZUSTANDSKARTE · 11 KACHELN · LIVE" : "STATE MATRIX · 11 TILES · LIVE"}</span>
        <span>{lang === "DE" ? "STRAPS: einzige Variable = Farbe. Geometrie/Font/Shadow konstant." : "STRAPS: only color varies. Geometry/font/shadow constant."}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  MOBILE STATE MATRIX — vertical stack of 8 key states
// ─────────────────────────────────────────────────────────
function MarketplaceStatesMobile({ lang = "DE" }) {
  return (
    <div style={{
      width: 390, minHeight: 2400, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: 14,
    }}>
      <style>{kioskFonts}</style>
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
      <div style={paperGrainStyle} />

      <header style={{ paddingBottom: 14, borderBottom: `1.5px solid ${kiosk.color.ink}`, marginBottom: 14 }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.wine, letterSpacing: "0.18em" }}>MARKT · {lang === "DE" ? "ZUSTÄNDE" : "STATES"} · MOBILE</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1, margin: "4px 0 0" }}>
          {lang === "DE" ? "Jeder Zustand spricht für sich." : "Every state speaks for itself."}
        </h1>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* loading */}
        <StateTile n="01" label={lang === "DE" ? "Lädt" : "Loading"} color={kiosk.color.inkMute} lang={lang} height={180}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}><SkeletonCard /><SkeletonCard /></div>
        </StateTile>

        {/* empty */}
        <StateTile n="02" label={lang === "DE" ? "Leer" : "Empty"} color={kiosk.color.ochre} lang={lang} height={160}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 36, color: kiosk.color.ochre }}>∅</div>
            <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 15, textAlign: "center", lineHeight: 1.3 }}>
              {lang === "DE" ? "Magst du anfangen?" : "Want to start?"}
            </div>
            <KioskBtn small>{lang === "DE" ? "+ anzeige" : "+ listing"}</KioskBtn>
          </div>
        </StateTile>

        {/* search empty */}
        <StateTile n="03" label={lang === "DE" ? "0 Treffer" : "0 hits"} color={kiosk.color.ochre} lang={lang} height={170}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {["Fahrräder", "<100 €"].map((f) => (
              <span key={f} style={{ fontFamily: kiosk.font.mono, fontSize: 10, padding: "2px 8px", background: kiosk.color.ink, color: kiosk.color.paper, borderRadius: kiosk.r.pill }}>{f} ✕</span>
            ))}
          </div>
          <div style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
            <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 14 }}>{lang === "DE" ? "Nichts dabei." : "Nothing matches."}</div>
            <KioskBtn small variant="outline">🔔 {lang === "DE" ? "alarm setzen" : "set alert"}</KioskBtn>
          </div>
        </StateTile>

        {/* error */}
        <StateTile n="04" label={lang === "DE" ? "Fehler" : "Error"} color={kiosk.color.danger} lang={lang} height={150}>
          <div style={{ padding: "8px 10px", background: kiosk.color.danger, color: kiosk.color.paper, borderRadius: kiosk.r.sm, fontSize: 12 }}>
            ⚠ {lang === "DE" ? "Verbindung weg · neu laden" : "Lost connection · retry"}
          </div>
          <div style={{ opacity: 0.6 }}>
            <StateListingCard listing={SEED_LISTINGS[1]} lang={lang} />
          </div>
        </StateTile>

        {/* reserved */}
        <StateTile n="05" label={lang === "DE" ? "Reserviert" : "Reserved"} color={kiosk.color.plum} lang={lang} height={210}>
          <StateListingCard listing={SEED_LISTINGS[5]} lang={lang} straps={["reserviert"]} />
        </StateTile>

        {/* sold */}
        <StateTile n="06" label={lang === "DE" ? "Verkauft" : "Sold"} color={kiosk.color.inkMute} lang={lang} height={210}>
          <StateListingCard listing={SEED_LISTINGS[2]} lang={lang} straps={["verkauft"]} dim />
        </StateTile>

        {/* mod-pending */}
        <StateTile n="07" label={lang === "DE" ? "In Prüfung" : "Pending"} color={kiosk.color.ochre} lang={lang} height={210}>
          <StateListingCard listing={SEED_LISTINGS[4]} lang={lang} straps={["pruefung"]} />
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ochre }}>◐ {lang === "DE" ? "KI prüft · ~12s" : "AI checking · ~12s"}</div>
        </StateTile>

        {/* listing-rejected */}
        <StateTile n="08" label={lang === "DE" ? "Verworfen" : "Rejected"} color={kiosk.color.danger} lang={lang} height={220}>
          <StateListingCard listing={SEED_LISTINGS[9]} lang={lang} dim overlay={<>
            <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 28, color: kiosk.color.paper }}>✕</span>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.paper, letterSpacing: "0.15em", fontWeight: 700 }}>{lang === "DE" ? "ABGELEHNT" : "REJECTED"}</span>
          </>} />
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12.5, color: kiosk.color.inkSoft, lineHeight: 1.4 }}>
            {lang === "DE" ? "Grund: Verbotene Ware. Einspruch möglich." : "Reason: prohibited item. Appeal possible."}
          </div>
        </StateTile>
      </div>
    </div>
  );
}

Object.assign(window, {
  MarketplaceStatesDesktop, MarketplaceStatesMobile,
});

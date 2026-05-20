/* global React, kiosk, kioskFonts, paperGrainStyle, KioskBtn, KioskAvatar,
   market, SEED_LISTINGS, MarketStrap, CategoryChip, DeliveryPill, PriceTag, ListingImage */

// ══════════════════════════════════════════════════════════
//  KIOSK · MARKETPLACE · NOVEL FEATURES
//  Three Kiosk-flavored features beyond standard CRUD:
//    01 Bumps · 02 Freshness decay · 03 Bundles
//  Each module documents trigger · UI · timing rules for CC.
//
//  Removed (per user, May 2026):
//    · Saved-search alerts (overkill at v1 — users can re-search)
//    · Tausch matching (counter-offers go through ContactForm)
//    · Vorbeischauen pickup-spot pins (no map/spot surface in v1)
// ══════════════════════════════════════════════════════════

// ─── Feature module wrapper ───
function Feature({ n, title, subtitle, color, lang = "DE", children, height = 380 }) {
  return (
    <section style={{
      background: kiosk.color.paperWarm,
      border: `2px solid ${kiosk.color.ink}`,
      borderRadius: kiosk.r.lg,
      boxShadow: kiosk.shadow.print(color),
      padding: 0, overflow: "hidden",
      display: "flex", flexDirection: "column",
      minHeight: height,
    }}>
      <header style={{
        background: kiosk.color.ink, color: kiosk.color.paper,
        padding: "8px 14px", display: "flex", alignItems: "baseline", gap: 10,
      }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color }}>§{n}</span>
        <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.018em", margin: 0 }}>{title}</h3>
        <span style={{ marginLeft: "auto", fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12, color: kiosk.color.paper + "aa" }}>{subtitle}</span>
      </header>
      <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </section>
  );
}

// ─── Annotation label ───
function FeatureNote({ children, color = kiosk.color.ochre }) {
  return (
    <div style={{
      padding: "8px 10px", background: color, color: kiosk.color.ink,
      border: kiosk.border.ink, borderRadius: kiosk.r.sm,
      fontFamily: kiosk.font.mono, fontSize: 10.5, lineHeight: 1.45, fontWeight: 500,
      boxShadow: kiosk.shadow.printSm(),
    }}>{children}</div>
  );
}

// ─── Mini card ───
function MiniListing({ listing, lang = "DE", straps = [], dim = false }) {
  const c = market.cat[listing.cat];
  const t = lang === "DE" ? listing.title : listing.titleEN;
  return (
    <div style={{
      background: kiosk.color.paper, border: kiosk.border.ink, borderRadius: kiosk.r.sm,
      boxShadow: kiosk.shadow.printSm(c.color),
      overflow: "hidden", opacity: dim ? 0.55 : 1, filter: dim ? "saturate(0.5)" : "none",
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
      </div>
      <div style={{ padding: "0 8px 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</div>
        <div style={{ marginTop: 2 }}><PriceTag listing={listing} lang={lang} size="sm" /></div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  THE ARTBOARD — single tall sheet with 3 feature modules
// ─────────────────────────────────────────────────────────
function MarketplaceNovelDesktop({ lang = "DE" }) {
  return (
    <div style={{
      width: 1280, minHeight: 1700, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", padding: 32,
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      {/* Page header */}
      <header style={{ paddingBottom: 18, borderBottom: `1.5px solid ${kiosk.color.ink}`, marginBottom: 22 }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.wine, letterSpacing: "0.2em" }}>
          MARKT · {lang === "DE" ? "BESONDERE FUNKTIONEN" : "NOVEL FEATURES"}
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.98, margin: "6px 0 0" }}>
          {lang === "DE"
            ? <>Was Mahalle <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>anders</span> macht.</>
            : <>What Mahalle does <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>differently</span>.</>}
        </h1>
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 16, color: kiosk.color.inkSoft, maxWidth: 720, lineHeight: 1.5, margin: "10px 0 0" }}>
          {lang === "DE"
            ? "Drei Funktionen, die einen Nachbarschafts-Marktplatz von einem Kleinanzeigen-Verzeichnis unterscheiden. Designet für Vertrauen, Ehrlichkeit und das Tempo eines Kiezes."
            : "Three features that separate a neighborhood marketplace from a classifieds database. Designed for trust, honesty, and the pace of a kiez."}
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>

        {/* ═══ 01 BUMPS ═══ */}
        <Feature n="01" title={lang === "DE" ? "Hochholen · Bump" : "Bump"} subtitle={lang === "DE" ? "einmal pro Woche, kostenlos" : "once a week, free"} color={kiosk.color.ochre} lang={lang}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
            <div>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 6 }}>VORHER · {lang === "DE" ? "vor 6 Tagen eingestellt" : "posted 6d ago"}</div>
              <MiniListing listing={SEED_LISTINGS[8]} lang={lang} />
              <div style={{ marginTop: 8 }}><KioskBtn small variant="outline">↻ {lang === "DE" ? "frisch hochholen" : "bump"}</KioskBtn></div>
            </div>
            <div>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.ochre, letterSpacing: "0.1em", marginBottom: 6, fontWeight: 700 }}>NACHHER · {lang === "DE" ? "ganz oben im Markt" : "back to the top"}</div>
              <MiniListing listing={SEED_LISTINGS[8]} lang={lang} straps={["bump"]} />
              <div style={{ marginTop: 8, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkSoft, lineHeight: 1.5 }}>
                {lang === "DE" ? "Nächster Bump: in 7 Tagen verfügbar." : "Next bump: available in 7 days."}
              </div>
            </div>
          </div>
          <FeatureNote color={kiosk.color.ochre}>
            ⚙ {lang === "DE"
              ? "TRIGGER: Owner klickt Bump · POST-Endpoint setzt updatedAt = now · Strap „FRISCH HOCHGEHOLT“ verfällt nach 24h · Rate-Limit: 1×/Woche pro Anzeige."
              : "TRIGGER: Owner clicks Bump · POST sets updatedAt = now · „FRESHLY BUMPED“ strap expires after 24h · Rate-limit: 1×/week per listing."}
          </FeatureNote>
        </Feature>

        {/* ═══ 02 FRESHNESS DECAY ═══ */}
        <Feature n="02" title={lang === "DE" ? "Altpapier-Verfall" : "Stale decay"} subtitle={lang === "DE" ? "ehrlich, statt ewig" : "honest, not eternal"} color={kiosk.color.inkMute} lang={lang}>
          <div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 8 }}>
              {lang === "DE" ? "ZEITLEISTE · OPACITY + SATURATION" : "TIMELINE · OPACITY + SATURATION"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              {[
                { age: "T+0", op: 1, sat: 1, label: lang === "DE" ? "frisch" : "fresh", strap: null },
                { age: "T+7d", op: 0.95, sat: 0.85, label: "—", strap: null },
                { age: "T+14d", op: 0.85, sat: 0.7, label: "—", strap: null },
                { age: "T+21d", op: 0.6, sat: 0.45, label: lang === "DE" ? "altpapier" : "stale", strap: "altpapier" },
              ].map((s, i) => (
                <div key={i} style={{ opacity: s.op, filter: `saturate(${s.sat})` }}>
                  <MiniListing listing={SEED_LISTINGS[11]} lang={lang} straps={s.strap ? [s.strap] : []} />
                  <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, marginTop: 4, textAlign: "center" }}>{s.age} · {s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <FeatureNote color={kiosk.color.inkMute}>
            <span style={{ color: kiosk.color.paper }}>
              ⚙ {lang === "DE"
                ? "TRIGGER: bei Render-Zeit, age = now − updatedAt · ≥21d: Strap „altpapier“ + opacity 0.6 + saturate 0.45 · auffrischen-CTA für Owner · komplett ausblenden nach 60d ohne Bump."
                : "TRIGGER: at render time, age = now − updatedAt · ≥21d: „altpapier“ strap + opacity 0.6 + saturate 0.45 · refresh CTA for owner · hidden after 60d without a bump."}
            </span>
          </FeatureNote>
        </Feature>

        {/*
          DEFERRED to follow-up PR — see CLAUDE.md "Bundles" marker.
          Schema reserves bundleId?: ObjectId nullable FK + partial index.
          Un-defer trigger conditions documented in CLAUDE.md (un-defer when
          2-3 of: cross-link patterns in descriptions, 5+ active-listing
          sellers, forum requests for multi-item grouping).

          ORIGINAL SPEC — retained as reference, NOT for implementation in this PR:

          <div style={{ gridColumn: "span 2" }}>
            <Feature n="03" title={lang === "DE" ? "Bündel-Anzeige" : "Bundle listing"} subtitle={lang === "DE" ? "z.B. ganze Wohnungsauflösung" : "e.g. whole-flat clear-out"} color={kiosk.color.wine} lang={lang} height={420}>
              <div style={{
                background: kiosk.color.paper, border: `2px solid ${kiosk.color.ink}`, borderRadius: kiosk.r.md,
                boxShadow: kiosk.shadow.print(kiosk.color.wine),
                overflow: "hidden", position: "relative",
              }}>
                <div style={{
                  background: kiosk.color.ink, color: kiosk.color.paper,
                  padding: "4px 12px", fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.18em", display: "flex", justifyContent: "space-between",
                }}>
                  <span>★ {lang === "DE" ? "BÜNDEL · 6 ARTIKEL" : "BUNDLE · 6 ITEMS"}</span>
                  <span style={{ color: kiosk.color.ochre }}>{lang === "DE" ? "alles oder einzeln" : "all or individually"}</span>
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                    <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
                      <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>Wohnungsauflösung</span>
                      <span style={{ color: kiosk.color.ink }}> · Schillerpromenade</span>
                    </h3>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 26, lineHeight: 1 }}>320 €</div>
                      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute }}>{lang === "DE" ? "alles zusammen · -15%" : "all together · -15%"}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                    {[0, 5, 1, 8, 11, 3].map((idx) => (
                      <MiniListing key={idx} listing={SEED_LISTINGS[idx]} lang={lang} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
                    <KioskBtn small>{lang === "DE" ? "alles auf einmal" : "buy whole bundle"}</KioskBtn>
                    <KioskBtn small variant="outline">{lang === "DE" ? "einzeln kaufen →" : "buy individually →"}</KioskBtn>
                  </div>
                </div>
              </div>

              <FeatureNote color={kiosk.color.wine}>
                <span style={{ color: kiosk.color.paper }}>
                  ⚙ {lang === "DE"
                    ? "Owner gruppiert 2-12 Anzeigen · Bündel-Rabatt 5-20% · Käufer:in kann auch einzelne Artikel anfragen (über das Kontaktformular) · Bündel zerfällt automatisch, wenn ≥50% verkauft."
                    : "Owner groups 2-12 listings · bundle discount 5-20% · buyer can also request individual items (via contact form) · bundle auto-dissolves when ≥50% sold."}
                </span>
              </FeatureNote>
            </Feature>
          </div>
        */}

      </div>

      {/* Footer */}
      <div style={{ marginTop: 22, paddingTop: 14, borderTop: `1.5px solid ${kiosk.color.ink}`, display: "flex", justifyContent: "space-between", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.08em" }}>
        <span>{lang === "DE" ? "BESONDERE FUNKTIONEN · 3 MODULE · v1.0" : "NOVEL FEATURES · 3 MODULES · v1.0"}</span>
        <span>{lang === "DE" ? "alle Funktionen wiederverwenden das Strap-Komponenten + Token-System" : "all features reuse the strap component + token system"}</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  MarketplaceNovelDesktop,
});

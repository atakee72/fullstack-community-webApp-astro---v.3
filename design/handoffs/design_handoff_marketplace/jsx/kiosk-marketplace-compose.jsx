/* global React, kiosk, kioskFonts, paperGrainStyle, KioskBtn, KioskInput, KioskAvatar, KioskTextarea,
   market, SEED_LISTINGS, MarketStrap, CategoryChip, DeliveryPill, PriceTag, ListingImage, ListingCard */

// ══════════════════════════════════════════════════════════
//  KIOSK · MARKETPLACE · COMPOSE
//  Create-listing flow: single page, left = form, right =
//  sticky live preview. AI vision-mod runs in parallel on
//  submit. Three states: blank · filled · publishing.
// ══════════════════════════════════════════════════════════

// ─── Form section header ───
function FormSection({ n, t, lang = "DE", children, complete = false }) {
  return (
    <section style={{
      borderTop: `1px dashed ${kiosk.color.rule}`,
      padding: "16px 0 20px",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <span style={{
          fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700,
          background: complete ? kiosk.color.moss : kiosk.color.ink,
          color: kiosk.color.paper,
          padding: "2px 8px", borderRadius: kiosk.r.sm, letterSpacing: "0.15em",
        }}>§{n}</span>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: "-0.015em" }}>{t}</h3>
        {complete && <span style={{ marginLeft: "auto", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.moss, letterSpacing: "0.1em" }}>✓ {lang === "DE" ? "AUSGEFÜLLT" : "DONE"}</span>}
      </div>
      {children}
    </section>
  );
}

// ─── Kind selector — radio with visual differentiation ───
function KindPicker({ active, lang = "DE" }) {
  const kinds = [
    { id: "verkaufen", de: "Verkaufen", en: "For sale", note: lang === "DE" ? "Preis in €" : "Price in €", icon: "€", color: kiosk.color.wine },
    { id: "tausch", de: "Tausch", en: "Swap", note: lang === "DE" ? "gegen etwas anderes" : "for something else", icon: "↔", color: kiosk.color.teal },
    { id: "verschenken", de: "Verschenken", en: "Free", note: lang === "DE" ? "ohne Gegenleistung" : "no return expected", icon: "✦", color: kiosk.color.moss },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
      {kinds.map((k) => {
        const isActive = active === k.id;
        return (
          <div key={k.id} style={{
            background: isActive ? k.color : kiosk.color.paperWarm,
            color: isActive ? kiosk.color.paper : kiosk.color.ink,
            border: isActive ? `2px solid ${kiosk.color.ink}` : `1px solid ${kiosk.color.rule}`,
            borderRadius: kiosk.r.md,
            padding: "14px 16px",
            display: "flex", flexDirection: "column", gap: 6,
            cursor: "pointer",
            boxShadow: isActive ? kiosk.shadow.printSm(kiosk.color.ink) : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 28, lineHeight: 1, color: isActive ? kiosk.color.paper : k.color }}>{k.icon}</span>
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                border: `2px solid ${isActive ? kiosk.color.paper : kiosk.color.inkMute}`,
                background: isActive ? kiosk.color.paper : "transparent",
                position: "relative",
              }}>
                {isActive && <span style={{ position: "absolute", inset: 3, borderRadius: "50%", background: k.color }} />}
              </span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>{lang === "DE" ? k.de : k.en}</div>
            <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12, color: isActive ? kiosk.color.paper + "cc" : kiosk.color.inkMute }}>
              {k.note}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Image uploader slots ───
function ImageSlots({ filled = 0, lang = "DE", catColor = kiosk.color.wine }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => {
          const has = i < filled;
          return (
            <div key={i} style={{
              aspectRatio: "1/1",
              border: has ? `1.5px solid ${kiosk.color.ink}` : `1.5px dashed ${kiosk.color.rule}`,
              borderRadius: kiosk.r.sm,
              background: has ? `repeating-linear-gradient(45deg, ${catColor}33 0 8px, ${kiosk.color.paperWarm} 8px 16px)` : kiosk.color.paperSoft,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute,
              position: "relative",
            }}>
              {has ? (
                <>
                  <span style={{
                    position: "absolute", top: 4, left: 4,
                    fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 700,
                    background: kiosk.color.ink, color: kiosk.color.paper,
                    padding: "1px 5px", borderRadius: 3,
                  }}>{i === 0 ? (lang === "DE" ? "HAUPT" : "MAIN") : i + 1}</span>
                  <span style={{
                    position: "absolute", top: 4, right: 4, fontSize: 10,
                    background: kiosk.color.paper, border: `1px solid ${kiosk.color.rule}`,
                    width: 16, height: 16, borderRadius: 3,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>✕</span>
                </>
              ) : (
                <span style={{ fontSize: 22 }}>＋</span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
        <span>{filled}/5 {lang === "DE" ? "Fotos · Hauptbild wird zuerst gezeigt" : "photos · main shown first"}</span>
        <span>{lang === "DE" ? "Drag & drop zum sortieren" : "Drag & drop to reorder"}</span>
      </div>
    </div>
  );
}

// ─── Live preview pane (sticky on right) ───
function ComposePreview({ formState, lang = "DE", publishing = false }) {
  const { kind, cat, title, price, vb, delivery, images, body } = formState;
  const c = market.cat[cat] || market.cat.moebel;

  // If user hasn't chosen kind+cat yet, show a "preview comes alive" placeholder
  if (!kind || !cat) {
    return (
      <div style={{
        background: kiosk.color.paperSoft,
        border: `1.5px dashed ${kiosk.color.ink}`, borderRadius: kiosk.r.lg,
        padding: "22px 18px", position: "relative",
        display: "flex", flexDirection: "column", gap: 12, minHeight: 360,
      }}>
        <div style={{
          position: "absolute", top: -10, left: 16,
          background: kiosk.color.paperSoft, color: kiosk.color.inkMute,
          fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
          padding: "3px 10px", borderRadius: kiosk.r.sm, border: `1px dashed ${kiosk.color.inkMute}`,
        }}>★ {lang === "DE" ? "VORSCHAU WARTET" : "PREVIEW WAITING"}</div>
        <div style={{ marginTop: 14, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 52, color: kiosk.color.inkMute, lineHeight: 1 }}>∅</div>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 16, color: kiosk.color.inkSoft, maxWidth: 220, lineHeight: 1.35 }}>
            {lang === "DE"
              ? "Wähle Art + Kategorie, dann erwacht hier deine Anzeige."
              : "Pick kind + category, then your listing comes to life here."}
          </div>
        </div>
        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: `1px dashed ${kiosk.color.rule}`, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, lineHeight: 1.5 }}>
          {lang === "DE"
            ? "↻ Live-Vorschau aktualisiert sich bei jedem Tastendruck."
            : "↻ Live preview updates with every keystroke."}
        </div>
      </div>
    );
  }

  const listing = {
    id: "L---",
    kind, cat, title: title || (lang === "DE" ? "Titel deiner Anzeige" : "Listing title"),
    titleEN: title || "Listing title",
    price: price || 0, vb,
    delivery,
    a: "Henrike B.", aColor: kiosk.color.wine,
    ts: lang === "DE" ? "gerade eben" : "just now", tsEN: "just now",
    bookmarks: 0,
    img: { ratio: "4/3", label: title || "Vorschau" },
    images: images || 0,
  };

  return (
    <div style={{
      background: kiosk.color.paperSoft,
      border: `1.5px solid ${kiosk.color.ink}`, borderRadius: kiosk.r.lg,
      padding: 16, position: "relative",
    }}>
      {/* Header strap */}
      <div style={{
        position: "absolute", top: -10, left: 16,
        background: kiosk.color.ink, color: kiosk.color.paper,
        fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
        padding: "3px 10px", borderRadius: kiosk.r.sm,
      }}>{publishing ? (lang === "DE" ? "★ WIRD VERÖFFENTLICHT…" : "★ PUBLISHING…") : (lang === "DE" ? "★ LIVE-VORSCHAU" : "★ LIVE PREVIEW")}</div>

      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.05em", marginTop: 6, marginBottom: 12 }}>
        {lang === "DE" ? "So sieht deine Anzeige im Markt aus." : "How your listing appears in the market."}
      </div>

      {/* Faux marketplace card */}
      <div style={{ pointerEvents: "none" }}>
        <ListingCard listing={listing} lang={lang} />
      </div>

      {/* Publishing overlay */}
      {publishing && (
        <div style={{
          marginTop: 12, padding: "12px 14px",
          background: kiosk.color.ochre, border: kiosk.border.ink, borderRadius: kiosk.r.md,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>◐</span>
          <div style={{ flex: 1, fontFamily: kiosk.font.mono, fontSize: 11, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700, letterSpacing: "0.05em" }}>{lang === "DE" ? "BILDER WERDEN GEPRÜFT (KI)" : "IMAGES UNDER AI REVIEW"}</div>
            <div style={{ color: kiosk.color.inkSoft, marginTop: 2 }}>{lang === "DE" ? "Anzeige ist sichtbar. Bei Problemen wirst du benachrichtigt." : "Listing is live. We'll notify if anything flags."}</div>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 8 }}>
          {lang === "DE" ? "VOR DEM VERÖFFENTLICHEN" : "BEFORE PUBLISHING"}
        </div>
        {[
          { l: lang === "DE" ? "Art ausgewählt" : "Kind chosen", on: !!kind },
          { l: lang === "DE" ? "Kategorie" : "Category", on: !!cat },
          { l: lang === "DE" ? "Titel + Beschreibung" : "Title + description", on: !!title && !!body },
          { l: lang === "DE" ? "Mind. 1 Foto" : "At least 1 photo", on: (images || 0) > 0 },
          { l: lang === "DE" ? "Preis / Tauschangabe" : "Price / swap info", on: kind === "verschenken" || !!price || kind === "tausch" },
          { l: lang === "DE" ? "Lieferung" : "Delivery", on: !!delivery },
        ].map((x, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "3px 0" }}>
            <span style={{
              width: 14, height: 14, borderRadius: 3,
              border: `1.5px solid ${x.on ? kiosk.color.moss : kiosk.color.inkMute}`,
              background: x.on ? kiosk.color.moss : "transparent",
              color: kiosk.color.paper, fontSize: 10, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{x.on ? "✓" : ""}</span>
            <span style={{ color: x.on ? kiosk.color.ink : kiosk.color.inkMute, textDecoration: x.on ? "none" : "none" }}>{x.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared form shell ───
function ComposeFrame({ children, lang = "DE", title }) {
  return (
    <div style={{
      width: 1280, minHeight: 1100, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, position: "relative", overflow: "hidden",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <window.KioskNav active="Markt" lang={lang} />

      <section style={{ padding: "22px 36px 16px", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.18em" }}>
          MARKT · {lang === "DE" ? "NEUE ANZEIGE" : "NEW LISTING"}
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "6px 0 0" }}>
          {title}
        </h1>
      </section>

      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  BLANK — just opened, nothing filled
// ─────────────────────────────────────────────────────────
function MarketComposeBlank({ lang = "DE" }) {
  const formState = { kind: null, cat: null, title: "", price: 0, vb: false, delivery: null, images: 0, body: "" };
  return (
    <ComposeFrame lang={lang} title={lang === "DE" ? <>Was möchtest du <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.ochre }}>loswerden</span>?</> : <>What do you want to <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.ochre }}>part with</span>?</>}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 32, padding: "20px 36px 36px" }}>
        <div>
          <FormSection n="01" t={lang === "DE" ? "Art" : "Kind"} lang={lang}>
            <KindPicker active={null} lang={lang} />
          </FormSection>

          <FormSection n="02" t={lang === "DE" ? "Kategorie" : "Category"} lang={lang}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, opacity: 0.45 }}>
              {Object.keys(market.cat).map((id) => (
                <CategoryChip key={id} id={id} lang={lang} />
              ))}
            </div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, marginTop: 8, letterSpacing: "0.05em" }}>
              {lang === "DE" ? "→ Erst die Art wählen, dann passende Kategorien." : "→ Pick a kind first, then categories."}
            </div>
          </FormSection>

          <FormSection n="03" t={lang === "DE" ? "Titel & Beschreibung" : "Title & description"} lang={lang}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.45 }}>
              <KioskInput placeholder={lang === "DE" ? "z.B. „Eichentisch · 1960er · Schillerpromenade“" : "e.g. „Oak table · 1960s · Schillerpromenade“"} />
              <KioskTextarea placeholder={lang === "DE" ? "Beschreibe ehrlich: Maße, Zustand, warum du verkaufst." : "Describe honestly: size, condition, why you're selling."} />
            </div>
          </FormSection>

          <div style={{ borderTop: `1px dashed ${kiosk.color.rule}`, paddingTop: 18, display: "flex", alignItems: "center", gap: 14 }}>
            <KioskBtn variant="outline">{lang === "DE" ? "abbrechen" : "cancel"}</KioskBtn>
            <KioskBtn variant="ghost">{lang === "DE" ? "als Entwurf sichern" : "save as draft"}</KioskBtn>
            <span style={{ marginLeft: "auto", opacity: 0.5 }}>
              <KioskBtn>{lang === "DE" ? "veröffentlichen →" : "publish →"}</KioskBtn>
            </span>
          </div>
        </div>

        <div style={{ position: "sticky", top: 20, alignSelf: "flex-start" }}>
          <ComposePreview formState={formState} lang={lang} />
        </div>
      </div>
    </ComposeFrame>
  );
}

// ─────────────────────────────────────────────────────────
//  FILLED — fully filled, ready to publish
// ─────────────────────────────────────────────────────────
function MarketComposeFilled({ lang = "DE", publishing = false }) {
  const formState = {
    kind: "verkaufen", cat: "moebel",
    title: lang === "DE" ? "Eichentisch · 1960er · Schillerpromenade" : "Oak table · 1960s · Schillerpromenade",
    price: 180, vb: true,
    delivery: "abholung", images: 5,
    body: "Massiver Esstisch, 140×80, ein paar ehrliche Kratzer.",
  };

  return (
    <ComposeFrame lang={lang} title={lang === "DE" ? <>Was möchtest du <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.ochre }}>loswerden</span>?</> : <>What do you want to <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.ochre }}>part with</span>?</>}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 32, padding: "20px 36px 36px" }}>
        <div>
          <FormSection n="01" t={lang === "DE" ? "Art" : "Kind"} lang={lang} complete>
            <KindPicker active={formState.kind} lang={lang} />
          </FormSection>

          <FormSection n="02" t={lang === "DE" ? "Kategorie" : "Category"} lang={lang} complete>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.keys(market.cat).map((id) => (
                <CategoryChip key={id} id={id} lang={lang} active={id === formState.cat} />
              ))}
            </div>
          </FormSection>

          <FormSection n="03" t={lang === "DE" ? "Titel & Beschreibung" : "Title & description"} lang={lang} complete>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <KioskInput value={formState.title} focused />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.03em" }}>
                <span>{lang === "DE" ? "✓ Klar und konkret" : "✓ Clear and specific"}</span>
                <span>{formState.title.length}/80</span>
              </div>
              <div style={{
                background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.rule}`,
                borderRadius: kiosk.r.md, padding: "10px 12px", minHeight: 90,
                fontFamily: kiosk.font.display, fontSize: 13.5, color: kiosk.color.ink, lineHeight: 1.5,
              }}>
                {lang === "DE"
                  ? "Massiver Esstisch, 140×80, ein paar ehrliche Kratzer. Stand 30 Jahre in der Wohnung meiner Großmutter, jetzt zieh ich um und passt nicht. Nur Abholung, ich helfe runtertragen."
                  : "Solid dining table, 140×80, a few honest scratches. Sat in my grandmother's flat for 30 years, now I'm moving and it doesn't fit. Pickup only, I'll help carry."}
              </div>
            </div>
          </FormSection>

          <FormSection n="04" t={lang === "DE" ? "Fotos" : "Photos"} lang={lang} complete>
            <ImageSlots filled={formState.images} lang={lang} catColor={market.cat[formState.cat].color} />
            <div style={{
              marginTop: 8, padding: "8px 10px",
              background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.sm,
              fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkSoft, lineHeight: 1.5,
            }}>
              {lang === "DE"
                ? "🔒 Bilder UND Text werden vom KI-Modell auf Anstößiges geprüft. Du bekommst Bescheid, wenn etwas abgelehnt wird — du kannst es ersetzen."
                : "🔒 Both images AND text are AI-screened. You'll be told if something is rejected — you can replace it."}
            </div>
          </FormSection>

          <FormSection n="05" t={lang === "DE" ? "Preis & Lieferung" : "Price & delivery"} lang={lang} complete>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 4, textTransform: "uppercase" }}>{lang === "DE" ? "Preis" : "Price"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    flex: 1,
                    background: kiosk.color.paperSoft, border: `1.5px solid ${kiosk.color.ink}`,
                    borderRadius: kiosk.r.md, padding: "10px 12px",
                    fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 22, fontWeight: 400,
                  }}>{formState.price} €</div>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: kiosk.font.mono, fontSize: 11 }}>
                    <span style={{ width: 14, height: 14, border: `2px solid ${kiosk.color.ink}`, background: kiosk.color.ink, display: "inline-flex", alignItems: "center", justifyContent: "center", color: kiosk.color.paper, fontSize: 10 }}>✓</span>
                    VB
                  </label>
                </div>
                <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, marginTop: 4 }}>
                  {lang === "DE" ? "VB = Verhandlungsbasis" : "VB = negotiable"}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 4, textTransform: "uppercase" }}>{lang === "DE" ? "Lieferung" : "Delivery"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { id: "abholung", l: lang === "DE" ? "Nur Abholung" : "Pickup only" },
                    { id: "abholungVersand", l: lang === "DE" ? "Abholung & Versand" : "Pickup & shipping" },
                    { id: "versand", l: lang === "DE" ? "Nur Versand" : "Shipping only" },
                  ].map((o) => {
                    const on = o.id === formState.delivery;
                    return (
                      <label key={o.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 10px",
                        background: on ? kiosk.color.paperWarm : "transparent",
                        border: on ? `1.5px solid ${kiosk.color.ink}` : `1px solid ${kiosk.color.rule}`,
                        borderRadius: kiosk.r.sm, fontSize: 12, fontWeight: on ? 600 : 500,
                      }}>
                        <span style={{
                          width: 14, height: 14, borderRadius: "50%",
                          border: `2px solid ${on ? kiosk.color.ink : kiosk.color.inkMute}`,
                          background: on ? kiosk.color.ink : "transparent",
                          position: "relative",
                        }}>{on && <span style={{ position: "absolute", inset: 2, background: kiosk.color.paper, borderRadius: "50%" }} />}</span>
                        {o.l}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection n="06" t={lang === "DE" ? "Optionale Details · helfen beim Verkauf" : "Optional details · help buyers decide"} lang={lang} complete>
            <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 13, color: kiosk.color.inkSoft, marginBottom: 10 }}>
              {lang === "DE" ? "Alles freiwillig. Was du füllst, erscheint als Spec-Streifen auf der Anzeige." : "All optional. What you fill in shows as a spec strip on the listing."}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { l: lang === "DE" ? "Maße" : "Size", v: "140 × 80 × 75 cm", filled: true },
                { l: lang === "DE" ? "Material" : "Material", v: lang === "DE" ? "Massiv-Eiche" : "Solid oak", filled: true },
                { l: lang === "DE" ? "Baujahr" : "Year", v: "~ 1965", filled: true },
                { l: lang === "DE" ? "Farbe" : "Color", v: lang === "DE" ? "Natur · honig" : "Natural · honey", filled: true },
                { l: lang === "DE" ? "Gewicht" : "Weight", v: "~ 34 kg", filled: true },
                { l: lang === "DE" ? "Zustand" : "Condition", v: lang === "DE" ? "Gebraucht · ehrlich" : "Used · honest", filled: true },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 4, textTransform: "uppercase" }}>{s.l}</div>
                  <div style={{
                    background: s.filled ? kiosk.color.paperWarm : kiosk.color.paperSoft,
                    border: s.filled ? `1.5px solid ${kiosk.color.ink}` : `1px dashed ${kiosk.color.rule}`,
                    borderRadius: kiosk.r.sm, padding: "7px 10px",
                    fontSize: 13, fontWeight: s.filled ? 600 : 400,
                    color: s.filled ? kiosk.color.ink : kiosk.color.inkMute,
                  }}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 10, padding: "8px 10px",
              background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.sm,
              fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkSoft, lineHeight: 1.5,
            }}>
              {lang === "DE"
                ? "🔍 Auch der eingegebene Text wird automatisch geprüft (Schimpfwörter, Hass, Spam). Bei Auffälligkeit wirst du benachrichtigt."
                : "🔍 Text is also auto-screened (profanity, hate, spam). You'll be notified if anything flags."}
            </div>
          </FormSection>

          <div style={{ borderTop: `1.5px solid ${kiosk.color.ink}`, paddingTop: 18, marginTop: 6, display: "flex", alignItems: "center", gap: 14 }}>
            <KioskBtn variant="outline">{lang === "DE" ? "abbrechen" : "cancel"}</KioskBtn>
            <KioskBtn variant="ghost">{lang === "DE" ? "als Entwurf sichern" : "save as draft"}</KioskBtn>
            <span style={{ marginLeft: "auto" }}>
              <KioskBtn>{publishing ? (lang === "DE" ? "◐ veröffentlicht…" : "◐ publishing…") : (lang === "DE" ? "veröffentlichen →" : "publish →")}</KioskBtn>
            </span>
          </div>
        </div>

        <div style={{ position: "sticky", top: 20, alignSelf: "flex-start" }}>
          <ComposePreview formState={formState} lang={lang} publishing={publishing} />
        </div>
      </div>
    </ComposeFrame>
  );
}

// ─────────────────────────────────────────────────────────
//  MOBILE COMPOSE — scrolling form, sticky preview button
// ─────────────────────────────────────────────────────────
function MarketComposeMobile({ lang = "DE" }) {
  return (
    <div style={{
      width: 390, minHeight: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", paddingBottom: 70,
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      <header style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600 }}>← {lang === "DE" ? "abbrechen" : "cancel"}</span>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>{lang === "DE" ? "NEUE ANZEIGE" : "NEW LISTING"}</span>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 500, color: kiosk.color.inkMute, textDecoration: "underline", textDecorationStyle: "dashed" }}>{lang === "DE" ? "Entwurf" : "draft"}</span>
      </header>

      <section style={{ padding: "14px 14px 8px" }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.18em" }}>§01 · {lang === "DE" ? "ART" : "KIND"}</div>
        <div style={{ marginTop: 8 }}>
          <KindPicker active="verkaufen" lang={lang} />
        </div>
      </section>

      <section style={{ padding: "14px 14px 8px", borderTop: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.18em" }}>§02 · {lang === "DE" ? "KATEGORIE" : "CATEGORY"}</div>
        <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingTop: 8, paddingBottom: 4 }}>
          {Object.keys(market.cat).map((id, i) => (
            <div key={id} style={{ flexShrink: 0 }}>
              <CategoryChip id={id} lang={lang} mini active={i === 0} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "14px 14px 8px", borderTop: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.18em", marginBottom: 8 }}>§03 · {lang === "DE" ? "TITEL & BESCHREIBUNG" : "TITLE & DESCRIPTION"}</div>
        <KioskInput value={lang === "DE" ? "Eichentisch · 1960er · Schillerpromenade" : "Oak table · 1960s · Schillerpromenade"} focused />
        <div style={{ marginTop: 8, background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.md, padding: 10, fontSize: 13, lineHeight: 1.5 }}>
          {lang === "DE" ? "Massiver Esstisch, 140×80, ein paar ehrliche Kratzer…" : "Solid dining table, 140×80, a few honest scratches…"}
        </div>
      </section>

      <section style={{ padding: "14px 14px 8px", borderTop: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.18em", marginBottom: 8 }}>§04 · {lang === "DE" ? "FOTOS · 3/5" : "PHOTOS · 3/5"}</div>
        <ImageSlots filled={3} lang={lang} catColor={kiosk.color.wine} />
      </section>

      <section style={{ padding: "14px 14px 8px", borderTop: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.18em", marginBottom: 8 }}>§05 · {lang === "DE" ? "PREIS & LIEFERUNG" : "PRICE & DELIVERY"}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1, background: kiosk.color.paperSoft, border: `1.5px solid ${kiosk.color.ink}`, borderRadius: kiosk.r.md, padding: "8px 12px", fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 20 }}>180 €</div>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600 }}>VB ✓</span>
        </div>
        <div style={{ marginTop: 8, padding: "6px 10px", background: kiosk.color.paperWarm, border: kiosk.border.ink, borderRadius: kiosk.r.sm, fontSize: 12, fontWeight: 600 }}>
          📍 {lang === "DE" ? "Schillerpromenade · Nur Abholung" : "Schillerpromenade · Pickup only"}
        </div>
      </section>

      <section style={{ padding: "14px 14px 8px", borderTop: `1px dashed ${kiosk.color.rule}` }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.18em", marginBottom: 8 }}>§06 · {lang === "DE" ? "OPTIONALE DETAILS" : "OPTIONAL DETAILS"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            [lang === "DE" ? "Maße" : "Size", "140 × 80 × 75"],
            [lang === "DE" ? "Material" : "Material", lang === "DE" ? "Eiche" : "Oak"],
            [lang === "DE" ? "Baujahr" : "Year", "~1965"],
            [lang === "DE" ? "Zustand" : "Condition", lang === "DE" ? "Gebraucht" : "Used"],
          ].map(([l, v], i) => (
            <div key={i}>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 3, textTransform: "uppercase" }}>{l}</div>
              <div style={{ background: kiosk.color.paperWarm, border: `1.5px solid ${kiosk.color.ink}`, borderRadius: kiosk.r.sm, padding: "6px 9px", fontSize: 12.5, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, lineHeight: 1.4 }}>
          {lang === "DE" ? "Alles freiwillig — hilft Interessierten zu entscheiden." : "All optional — helps buyers decide."}
        </div>
      </section>

      {/* Sticky publish bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: kiosk.color.paper, borderTop: kiosk.border.ink, padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <KioskBtn variant="ghost" small>{lang === "DE" ? "vorschau" : "preview"}</KioskBtn>
        <KioskBtn small>{lang === "DE" ? "veröffentlichen →" : "publish →"}</KioskBtn>
      </div>
    </div>
  );
}

Object.assign(window, {
  MarketComposeBlank, MarketComposeFilled, MarketComposeMobile,
  KindPicker, ImageSlots, ComposePreview,
});

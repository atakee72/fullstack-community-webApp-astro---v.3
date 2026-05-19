/* global React, kiosk, kioskFonts, paperGrainStyle, KioskBtn, KioskInput, KioskAvatar,
   market, SEED_LISTINGS, MarketStrap, CategoryChip, DeliveryPill, PriceTag, ListingImage */

// ══════════════════════════════════════════════════════════
//  KIOSK · MARKETPLACE · DETAIL
//  Listing detail page: editorial gallery + contact form
//  (sender name + email + message; owner's email NEVER shown)
//  + owner-view affordances + seller card.
//  Desktop + mobile.
// ══════════════════════════════════════════════════════════

// Use the lead listing (L001 "Eichentisch") as the canonical detail.
const DETAIL = SEED_LISTINGS[0];

// ─── Image gallery — editorial lead + thumb strip ───
function DetailGallery({ listing, lang = "DE" }) {
  const c = market.cat[listing.cat];
  const count = listing.images || 5;
  return (
    <div style={{ position: "relative" }}>
      {/* Lead image */}
      <div style={{ position: "relative" }}>
        <ListingImage category={listing.cat} ratio="16/10" label={null} lead />
        <span style={{
          position: "absolute", bottom: 14, right: 14,
          fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600,
          background: kiosk.color.ink, color: kiosk.color.paper,
          padding: "4px 10px", borderRadius: 4, letterSpacing: "0.08em",
        }}>📷 1 / {count}</span>
        <div style={{ position: "absolute", top: 14, left: 14, display: "flex", flexDirection: "column", gap: 4 }}>
          <MarketStrap kind="bump" lang={lang} small />
        </div>
        <div style={{
          position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
          width: 36, height: 36, borderRadius: "50%",
          background: kiosk.color.paper + "ee", border: kiosk.border.ink,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 22,
          boxShadow: kiosk.shadow.printSm(),
        }}>‹</div>
        <div style={{
          position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
          width: 36, height: 36, borderRadius: "50%",
          background: kiosk.color.paper + "ee", border: kiosk.border.ink,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 22,
          boxShadow: kiosk.shadow.printSm(),
        }}>›</div>
      </div>

      {/* Thumb strip */}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            flex: 1, aspectRatio: "1/1",
            border: i === 0 ? `2px solid ${kiosk.color.ink}` : `1px solid ${kiosk.color.rule}`,
            borderRadius: 4,
            background: i === 0 ? c.color + "44" : `repeating-linear-gradient(45deg, ${c.color}22 0 6px, ${kiosk.color.paperWarm} 6px 12px)`,
            position: "relative",
          }}>
            {i === 0 && (
              <span style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.ink, fontWeight: 700,
              }}>●</span>
            )}
          </div>
        ))}
        <div style={{
          flex: 1, aspectRatio: "1/1",
          border: `1px dashed ${kiosk.color.rule}`, borderRadius: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, textTransform: "uppercase", letterSpacing: "0.1em",
          textAlign: "center", padding: 4, whiteSpace: "pre-line",
        }}>{lang === "DE" ? "alle\nansehen" : "view\nall"}</div>
      </div>

      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, marginTop: 8, letterSpacing: "0.05em" }}>
        ↗ {lang === "DE" ? "Klick = Lightbox · Pfeile = navigieren · Esc = schließen" : "Click = lightbox · arrows = navigate · Esc = close"}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Contact form — replaces contact-reveal.
//  Buyer fills name + email + message; server relays to owner.
//  Owner's email is NEVER shown to the buyer.
//  States: idle | sent. (For Tausch listings, the form
//  pre-fills a swap-proposal hint — same component, just copy.)
// ─────────────────────────────────────────────────────────
function ContactForm({ state = "idle", lang = "DE", listing = DETAIL }) {
  const isTausch = listing.kind === "tausch";
  const accent = state === "sent"
    ? kiosk.color.moss
    : isTausch ? kiosk.color.teal : kiosk.color.wine;

  if (state === "sent") {
    return (
      <div style={{
        background: kiosk.color.ink, color: kiosk.color.paper,
        border: kiosk.border.ink, borderRadius: kiosk.r.md, padding: "16px 18px",
        display: "flex", flexDirection: "column", gap: 10,
        boxShadow: kiosk.shadow.print(kiosk.color.moss),
      }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.moss, letterSpacing: "0.12em", fontWeight: 700 }}>
          ◆ {lang === "DE" ? "NACHRICHT GESENDET" : "MESSAGE SENT"}
        </div>
        <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 16, lineHeight: 1.4 }}>
          {lang === "DE"
            ? <>Deine Nachricht ist bei <b style={{ fontStyle: "normal", color: kiosk.color.ochre }}>{listing.a}</b> angekommen. Antworten landen direkt in deinem E-Mail-Postfach.</>
            : <>Your message reached <b style={{ fontStyle: "normal", color: kiosk.color.ochre }}>{listing.a}</b>. Replies arrive directly in your inbox.</>}
        </div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.paper + "99", lineHeight: 1.5 }}>
          🔒 {lang === "DE"
            ? "Mahalle leitet weiter — keine der E-Mail-Adressen wird offen geteilt."
            : "Mahalle relays — no email addresses are revealed."}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: kiosk.color.paperWarm, border: `2px solid ${kiosk.color.ink}`,
      borderRadius: kiosk.r.md, padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 12,
      boxShadow: kiosk.shadow.printSm(accent),
    }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: accent, letterSpacing: "0.12em", fontWeight: 700 }}>
        ◆ {isTausch
          ? (lang === "DE" ? "TAUSCH-VORSCHLAG SENDEN" : "SEND SWAP PROPOSAL")
          : (lang === "DE" ? "INTERESSE? NACHRICHT SENDEN" : "INTERESTED? SEND MESSAGE")}
      </div>

      {isTausch && (
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 13, lineHeight: 1.45, color: kiosk.color.inkSoft, margin: 0 }}>
          {lang === "DE"
            ? "Sag konkret, was du im Tausch anbietest. Foto-Link oder kurze Beschreibung hilft."
            : "Be specific about what you offer in return. A photo link or short description helps."}
        </p>
      )}

      <div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 4, textTransform: "uppercase" }}>
          {lang === "DE" ? "Dein Name" : "Your name"}
        </div>
        <KioskInput placeholder={lang === "DE" ? "z.B. Sina K." : "e.g. Sina K."} />
      </div>

      <div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 4, textTransform: "uppercase" }}>
          {lang === "DE" ? "Deine E-Mail (für die Antwort)" : "Your email (for the reply)"}
        </div>
        <KioskInput placeholder="sina@example.com" />
      </div>

      <div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 4, textTransform: "uppercase" }}>
          {lang === "DE" ? "Nachricht" : "Message"}
        </div>
        <div style={{
          background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.rule}`,
          borderRadius: kiosk.r.md, padding: "10px 12px", minHeight: 90,
          fontFamily: kiosk.font.display, fontSize: 13, color: kiosk.color.inkSoft, lineHeight: 1.5,
        }}>
          {isTausch
            ? (lang === "DE"
              ? "Ich hätte eine Lederjacke in S/M zum Tausch — Foto kann ich gern schicken. Würde das passen?"
              : "I'd swap a leather jacket in S/M — happy to send a photo. Would that work?")
            : (lang === "DE"
              ? "Hi Henrike, ist der Tisch noch da? Ich könnte am Samstag vormittags vorbeischauen."
              : "Hi Henrike, is the table still available? I could come by Saturday morning.")}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, marginTop: 4 }}>
          <span>{lang === "DE" ? "Direkt + freundlich. Nachrichten werden automatisch geprüft." : "Direct + kind. Messages are auto-screened."}</span>
          <span>148/600</span>
        </div>
      </div>

      <KioskBtn>{lang === "DE" ? "→ senden" : "→ send"}</KioskBtn>

      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.03em", lineHeight: 1.5 }}>
        🔒 {lang === "DE"
          ? "Keine E-Mail-Adresse wird preisgegeben. Mahalle leitet weiter — Antworten kommen in dein Postfach."
          : "No email addresses are revealed. Mahalle relays — replies arrive in your inbox."}
      </div>
    </div>
  );
}

// ─── Owner action bar ───
function OwnerActions({ lang = "DE", pending = false }) {
  return (
    <div style={{
      background: kiosk.color.paperSoft, border: `1.5px solid ${kiosk.color.ink}`,
      borderRadius: kiosk.r.md, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ink, letterSpacing: "0.12em" }}>
        ◆ {lang === "DE" ? "DEINE ANZEIGE · 14 Beobachter · 89 Aufrufe" : "YOUR LISTING · 14 watching · 89 views"}
      </div>

      {pending && (
        <div style={{
          padding: "8px 10px",
          background: kiosk.color.ochre, color: kiosk.color.ink,
          border: kiosk.border.ink, borderRadius: kiosk.r.sm,
          fontFamily: kiosk.font.mono, fontSize: 10.5, lineHeight: 1.5, fontWeight: 600,
        }}>
          ◐ {lang === "DE"
            ? "In Prüfung — Bearbeiten ist während der KI-Prüfung deaktiviert. Dauert nur ein paar Sekunden."
            : "Under review — editing is disabled while AI checks. Takes only a few seconds."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, opacity: pending ? 0.4 : 1, pointerEvents: pending ? "none" : "auto" }}>
        <KioskBtn small>{lang === "DE" ? "bearbeiten" : "edit"}</KioskBtn>
        <KioskBtn small variant="outline">{lang === "DE" ? "frisch hochholen" : "bump"}</KioskBtn>
        <KioskBtn small variant="outline">{lang === "DE" ? "als reserviert" : "mark reserved"}</KioskBtn>
        <KioskBtn small variant="outline">{lang === "DE" ? "als verkauft" : "mark sold"}</KioskBtn>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, borderTop: `1px dashed ${kiosk.color.rule}` }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>
          {lang === "DE" ? "letzter Bump: vor 6 Tagen" : "last bump: 6d ago"}
        </span>
        <button style={{
          background: "transparent", color: kiosk.color.danger,
          border: "none", fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600,
          textDecoration: "underline", textDecorationStyle: "dashed", textUnderlineOffset: 3,
          cursor: "pointer", letterSpacing: "0.05em",
        }}>{lang === "DE" ? "✕ anzeige löschen" : "✕ delete listing"}</button>
      </div>
    </div>
  );
}

// ─── Sidebar: seller card ───
function SellerCard({ listing, lang = "DE" }) {
  return (
    <div style={{
      background: kiosk.color.paperWarm, border: `1.5px solid ${kiosk.color.ink}`,
      borderRadius: kiosk.r.md, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.12em" }}>
        ◆ {lang === "DE" ? "VERKÄUFER:IN" : "SELLER"}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <KioskAvatar initials={listing.a.split(" ").map(p => p[0]).join("")} color={listing.aColor} size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{listing.a}</div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.03em" }}>
            {listing.seit || (lang === "DE" ? "seit 2018" : "since 2018")} · {lang === "DE" ? "12 Anzeigen" : "12 listings"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{
          fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 600,
          background: kiosk.color.moss, color: kiosk.color.paper,
          padding: "2px 7px", borderRadius: kiosk.r.sm,
          border: `1px solid ${kiosk.color.ink}`, letterSpacing: "0.08em",
        }}>✓ {lang === "DE" ? "VERIFIZIERT IM KIEZ" : "VERIFIED IN KIEZ"}</span>
        <span style={{
          fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 600,
          background: kiosk.color.paperSoft, color: kiosk.color.ink,
          padding: "2px 7px", borderRadius: kiosk.r.sm,
          border: `1px solid ${kiosk.color.rule}`, letterSpacing: "0.08em",
        }}>★★★★☆ 14</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: `1px dashed ${kiosk.color.rule}` }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft, cursor: "pointer" }}>
          → {lang === "DE" ? "weitere Anzeigen" : "more listings"}
        </span>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute, cursor: "pointer" }}>
          ⚑ {lang === "DE" ? "melden" : "report"}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  DESKTOP DETAIL — buyer view
// ─────────────────────────────────────────────────────────
function MarketDetailDesktop({ lang = "DE", contactState = "idle", ownerView = false, pending = false }) {
  const listing = DETAIL;
  const c = market.cat[listing.cat];
  const t = lang === "DE" ? listing.title : listing.titleEN;
  const b = lang === "DE" ? listing.body : listing.bodyEN;

  return (
    <div style={{
      width: 1280, minHeight: 1100, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, position: "relative", overflow: "hidden",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />
      <window.KioskNav active="Markt" lang={lang} />

      <section style={{ padding: "16px 36px 8px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute, cursor: "pointer", letterSpacing: "0.05em" }}>
          ← {lang === "DE" ? "zurück zum Markt" : "back to market"}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.08em" }}>
          MARKT · {(lang === "DE" ? listing.title : listing.titleEN).toUpperCase().slice(0, 60)}…
        </span>
      </section>

      <div style={{
        display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 28,
        padding: "22px 36px 36px",
      }}>
        {/* LEFT — gallery + body */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <DetailGallery listing={listing} lang={lang} />

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <CategoryChip id={listing.cat} lang={lang} active />
              {ownerView && pending && <MarketStrap kind="pruefung" lang={lang} small />}
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.05em", marginLeft: "auto" }}>
                {lang === "DE" ? listing.ts : listing.tsEN} · ID #{listing.id}
              </span>
            </div>

            <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.0, margin: 0 }}>
              {(() => {
                const parts = t.split(" · ");
                return <>
                  <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: c.color }}>{parts[0]}</span>
                  {parts.length > 1 && <span style={{ color: kiosk.color.ink, fontWeight: 700 }}> · {parts.slice(1).join(" · ")}</span>}
                </>;
              })()}
            </h1>

            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 14, borderBottom: `1.5px solid ${kiosk.color.ink}` }}>
              <PriceTag listing={listing} lang={lang} size="lg" />
              <DeliveryPill kind={listing.delivery} lang={lang} />
            </div>

            <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 18, lineHeight: 1.55, color: kiosk.color.inkSoft, margin: 0 }}>
              {b}
            </p>

            {/* Spec strip — shows only filled optional fields */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14,
              padding: "14px 16px",
              background: kiosk.color.paperSoft,
              border: `1px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.md,
            }}>
              {[
                { l: lang === "DE" ? "Maße" : "Size", v: "140 × 80 × 75 cm" },
                { l: lang === "DE" ? "Zustand" : "Condition", v: lang === "DE" ? "Gebraucht · ehrlich" : "Used · honest" },
                { l: lang === "DE" ? "Material" : "Material", v: lang === "DE" ? "Massiv-Eiche" : "Solid oak" },
                { l: lang === "DE" ? "Baujahr" : "Year", v: "~ 1965" },
                { l: lang === "DE" ? "Farbe" : "Color", v: lang === "DE" ? "Natur · honig" : "Natural · honey" },
                { l: lang === "DE" ? "Gewicht" : "Weight", v: "~ 34 kg" },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.12em", textTransform: "uppercase" }}>{s.l}</div>
                  <div style={{ fontFamily: kiosk.font.display, fontSize: 13, fontWeight: 600, color: kiosk.color.ink, marginTop: 2 }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Action row */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: kiosk.color.ochre, border: kiosk.border.ink,
                borderRadius: kiosk.r.pill, padding: "8px 16px",
                fontFamily: kiosk.font.display, fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>🔖 {lang === "DE" ? "merken" : "save"} · 14</button>
              <span style={{ marginLeft: "auto", display: "flex", gap: 14, fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute }}>
                <span style={{ cursor: "pointer" }}>↗ {lang === "DE" ? "teilen" : "share"}</span>
                <span style={{ cursor: "pointer" }}>⚑ {lang === "DE" ? "melden" : "report"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {ownerView
            ? <OwnerActions lang={lang} pending={pending} />
            : <ContactForm state={contactState} lang={lang} listing={listing} />}
          <SellerCard listing={listing} lang={lang} />

          {/* Similar listings */}
          <div style={{ background: kiosk.color.paperWarm, border: `1.5px solid ${kiosk.color.ink}`, borderRadius: kiosk.r.md, padding: "14px 16px" }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.moss, letterSpacing: "0.12em", marginBottom: 8 }}>
              ◆ {lang === "DE" ? "ÄHNLICHES IM KIEZ" : "SIMILAR IN KIEZ"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SEED_LISTINGS.slice(5, 8).map((s) => (
                <div key={s.id} style={{ display: "flex", gap: 10, paddingBottom: 8, borderBottom: `1px dashed ${kiosk.color.rule}`, cursor: "pointer" }}>
                  <div style={{ width: 56, height: 44, flexShrink: 0, border: `1px solid ${kiosk.color.rule}`, borderRadius: 4, background: `repeating-linear-gradient(45deg, ${market.cat[s.cat].color}33 0 6px, ${kiosk.color.paperWarm} 6px 12px)` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lang === "DE" ? s.title : s.titleEN}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>
                      <PriceTag listing={s} lang={lang} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  MOBILE DETAIL — contact form lives inline (not a modal)
// ─────────────────────────────────────────────────────────
function MarketDetailMobile({ lang = "DE", contactState = "idle", ownerView = false, pending = false }) {
  const listing = DETAIL;
  const c = market.cat[listing.cat];
  const t = lang === "DE" ? listing.title : listing.titleEN;
  const b = lang === "DE" ? listing.body : listing.bodyEN;

  return (
    <div style={{
      width: 390, minHeight: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, position: "relative", overflow: "hidden", paddingBottom: 80,
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      <header style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.ink, fontWeight: 600 }}>← Markt</span>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.08em" }}>#L001</span>
        <div style={{ display: "flex", gap: 6, fontFamily: kiosk.font.mono, fontSize: 11 }}>
          <span>🔖</span>
          <span>↗</span>
        </div>
      </header>

      <div style={{ padding: 14 }}>
        <DetailGallery listing={listing} lang={lang} />
      </div>

      <section style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <CategoryChip id={listing.cat} lang={lang} active mini />
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, marginLeft: "auto" }}>{lang === "DE" ? listing.ts : listing.tsEN}</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05, margin: 0 }}>
          {(() => {
            const parts = t.split(" · ");
            return <>
              <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: c.color }}>{parts[0]}</span>
              {parts.length > 1 && <span> · {parts.slice(1).join(" · ")}</span>}
            </>;
          })()}
        </h1>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 10, borderBottom: `1.5px solid ${kiosk.color.ink}` }}>
          <PriceTag listing={listing} lang={lang} size="md" />
          <DeliveryPill kind={listing.delivery} lang={lang} />
        </div>
        <p style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 14.5, lineHeight: 1.5, color: kiosk.color.inkSoft, margin: 0 }}>{b}</p>
      </section>

      <section style={{ padding: "0 16px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 12, background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.rule}`, borderRadius: kiosk.r.md }}>
          {[
            [lang === "DE" ? "Maße" : "Size", "140 × 80 × 75"],
            [lang === "DE" ? "Zustand" : "Condition", lang === "DE" ? "Gebraucht" : "Used"],
            [lang === "DE" ? "Material" : "Material", lang === "DE" ? "Eiche massiv" : "Solid oak"],
            [lang === "DE" ? "Baujahr" : "Year", "~1965"],
          ].map(([l, v], i) => (
            <div key={i}>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", textTransform: "uppercase" }}>{l}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 1 }}>{v}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "0 16px 14px" }}>
        <SellerCard listing={listing} lang={lang} />
      </section>

      {/* Contact form inline on mobile — no modal */}
      <section style={{ padding: "0 16px 14px" }}>
        {ownerView
          ? <OwnerActions lang={lang} pending={pending} />
          : <ContactForm state={contactState} lang={lang} listing={listing} />}
      </section>

      {/* Sticky bottom bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: kiosk.color.paper, borderTop: kiosk.border.ink,
        padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {ownerView ? (
          <>
            <KioskBtn small variant="outline">{lang === "DE" ? "bearbeiten" : "edit"}</KioskBtn>
            <KioskBtn small variant="outline">{lang === "DE" ? "bump" : "bump"}</KioskBtn>
            <span style={{ marginLeft: "auto", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>89 Aufrufe</span>
          </>
        ) : (
          <>
            <KioskBtn small>↑ {lang === "DE" ? "nachricht senden" : "send message"}</KioskBtn>
            <span style={{ marginLeft: "auto", fontFamily: kiosk.font.mono, fontSize: 18 }}>🔖</span>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  MarketDetailDesktop, MarketDetailMobile,
  DetailGallery, ContactForm, OwnerActions, SellerCard,
});

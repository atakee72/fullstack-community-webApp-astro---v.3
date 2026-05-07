/* global React, kiosk, kioskFonts, paperGrainStyle, StripedPlaceholder,
   FilterChip, KioskBtn, KioskInput, KioskAvatar, KioskNav,
   calCategory, SEED_EVENTS, TODAY, DOW, MONTHS,
   CalendarTitleBlock, CalCategoryRail, MobileShell */

// ══════════════════════════════════════════════════════════
//  KIOSK · CALENDAR · MODALS + STATES + MOBILE
// ══════════════════════════════════════════════════════════

// Pick a hero event for detail
const heroEvent = SEED_EVENTS.find((e) => e.id === "e06"); // Straßenfest Herrfurthplatz

// ─────────────────────────────────────────────────────────
//  EVENT DETAIL MODAL (over dimmed month grid)
// ─────────────────────────────────────────────────────────
function EventDetailModalArtboard({ lang = "DE" }) {
  const ev = heroEvent;
  const c = calCategory[ev.cat];
  const t = lang === "DE" ? ev.title : ev.titleEN;

  // Fake attendee avatars
  const goers = ["Selma Y.", "Mauro R.", "Lena K.", "David B.", "Aisha N.", "Tom S."];

  return (
    <div style={{
      width: 1280, height: 900, background: "#3d2a30", color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      {/* Dimmed background hint of calendar */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.18,
        background: kiosk.color.paper,
        backgroundImage: `repeating-linear-gradient(0deg, transparent 0 60px, ${kiosk.color.rule} 60px 61px),
                          repeating-linear-gradient(90deg, transparent 0 ${1280/7}px, ${kiosk.color.rule} ${1280/7}px ${1280/7+1}px)`,
      }} />

      {/* Modal sheet */}
      <div style={{
        position: "absolute", top: 60, left: 200, right: 200, bottom: 60,
        background: kiosk.color.paper,
        border: kiosk.border.ink,
        borderRadius: kiosk.r.lg,
        boxShadow: `12px 12px 0 ${kiosk.color.wine}, 12px 12px 0 1.5px ${kiosk.color.ink}`,
        overflow: "hidden",
        display: "grid", gridTemplateColumns: "1.3fr 1fr",
      }}>
        {/* Left — content */}
        <div style={{ padding: "26px 32px", overflow: "auto", borderRight: `1px dashed ${kiosk.color.rule}` }}>
          {/* Category strip */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "4px 12px", marginBottom: 14,
            background: c.color, color: kiosk.color.paper,
            border: kiosk.border.ink, borderRadius: kiosk.r.pill,
            fontFamily: kiosk.font.display, fontSize: 12, fontWeight: 700,
            letterSpacing: "0.04em",
          }}>
            <span>{c.glyph}</span>
            <span>{c.label[lang].toUpperCase()}</span>
            {ev.team && (
              <>
                <span style={{ width: 1, height: 12, background: kiosk.color.paper, opacity: 0.5 }} />
                <span style={{ fontSize: 10, letterSpacing: "0.08em" }}>{lang === "DE" ? "MAHALLE-TEAM" : "MAHALLE TEAM"}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.0,
            margin: "0 0 10px", textWrap: "balance",
          }}>
            {lang === "DE"
              ? <>Straßenfest <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>Herrfurthplatz</span></>
              : <>Street fest <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>Herrfurthplatz</span></>}
          </h1>

          {/* When + where slab */}
          <div style={{
            display: "grid", gridTemplateColumns: "auto 1fr",
            gap: "8px 16px", marginBottom: 18,
            paddingTop: 12, borderTop: `1.5px solid ${kiosk.color.ink}`,
          }}>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.12em", paddingTop: 4 }}>
              {lang === "DE" ? "WANN" : "WHEN"}
            </span>
            <div>
              <div style={{ fontFamily: kiosk.font.display, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {lang === "DE" ? "Sonntag, 3. Mai 2026" : "Sunday, May 3, 2026"}
              </div>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 13, color: kiosk.color.inkSoft, marginTop: 2 }}>
                14:00 – 20:00 · 6 {lang === "DE" ? "Stunden" : "hours"}
              </div>
            </div>

            <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.12em", paddingTop: 4 }}>
              {lang === "DE" ? "WO" : "WHERE"}
            </span>
            <div>
              <div style={{ fontFamily: kiosk.font.display, fontSize: 16, fontWeight: 600 }}>
                Herrfurthplatz
              </div>
              <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 13, color: kiosk.color.inkSoft, marginTop: 1 }}>
                Schillerkiez · {lang === "DE" ? "von der Genezarethkirche bis zur Herrfurthstraße" : "from the church to Herrfurthstraße"}
              </div>
              <div style={{
                marginTop: 8, height: 90,
                background: `repeating-linear-gradient(45deg, ${kiosk.color.paperWarm} 0 8px, ${kiosk.color.paper} 8px 16px)`,
                border: `1px dashed ${kiosk.color.rule}`,
                borderRadius: kiosk.r.sm,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em",
              }}>
                ◆ KARTE · OSM-PIN @ 52.4801, 13.4288
              </div>
            </div>

            <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.12em", paddingTop: 4 }}>
              {lang === "DE" ? "VON" : "BY"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <KioskAvatar name="Mahalle-Team" tone="wine" />
              <div>
                <div style={{ fontFamily: kiosk.font.display, fontSize: 13, fontWeight: 600 }}>Mahalle-Team</div>
                <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>
                  {lang === "DE" ? "verifiziert · seit 2024" : "verified · since 2024"}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{
            fontFamily: kiosk.font.serif, fontSize: 15, lineHeight: 1.6, color: kiosk.color.ink,
            paddingTop: 14, borderTop: `1px dashed ${kiosk.color.rule}`,
            marginBottom: 14,
          }}>
            {lang === "DE"
              ? <>Das jährliche Frühjahrsfest am Herrfurthplatz. Live-Musik aus dem Kiez, Stände vom <i>Türkenmarkt</i>, Kinderecke, Tausch-Bibliothek und ab 18 Uhr <b>DJ-Set Selma & Friends</b>. Bringt Geschirr & Becher mit — wir vermeiden Müll.</>
              : <>The annual spring fest at Herrfurthplatz. Live music from the Kiez, stalls from the <i>Turkish Market</i>, kids' corner, swap library, and from 6pm a <b>DJ set with Selma & Friends</b>. Bring your own plates & cups — let's keep it waste-free.</>}
          </div>

          {/* Practical info chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {[
              lang === "DE" ? "kostenfrei" : "free",
              lang === "DE" ? "kinderfreundlich" : "kid-friendly",
              lang === "DE" ? "rollstuhlgerecht" : "wheelchair-accessible",
              lang === "DE" ? "Hunde willkommen" : "dogs welcome",
              "BYO",
            ].map((tag) => (
              <span key={tag} style={{
                fontFamily: kiosk.font.mono, fontSize: 11,
                padding: "2px 8px",
                background: kiosk.color.paperWarm,
                border: `1px solid ${kiosk.color.rule}`,
                borderRadius: kiosk.r.pill,
                color: kiosk.color.inkSoft,
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Right — RSVP rail */}
        <div style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 16, background: kiosk.color.paperSoft }}>
          {/* RSVP Hero */}
          <div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.12em", marginBottom: 10 }}>
              ◆ {lang === "DE" ? "DEINE ZUSAGE" : "YOUR RSVP"}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <KioskBtn solid>{lang === "DE" ? "ich komme" : "I'm going"}</KioskBtn>
              <KioskBtn>{lang === "DE" ? "vielleicht" : "maybe"}</KioskBtn>
            </div>
            <div style={{
              padding: "10px 12px",
              background: kiosk.color.paper,
              border: `1.5px solid ${kiosk.color.success}`,
              borderRadius: kiosk.r.sm,
              fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12.5,
              color: kiosk.color.ink, lineHeight: 1.5,
            }}>
              ✓ {lang === "DE"
                ? <>Du hast zugesagt. <span style={{ color: kiosk.color.inkMute }}>3 deiner Nachbar:innen kommen auch.</span></>
                : <>You said yes. <span style={{ color: kiosk.color.inkMute }}>3 of your neighbours are also going.</span></>}
            </div>
          </div>

          {/* Attendance ledger */}
          <div>
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              borderBottom: `1.5px solid ${kiosk.color.ink}`, paddingBottom: 4, marginBottom: 8,
            }}>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ink, letterSpacing: "0.12em" }}>
                {lang === "DE" ? "WER KOMMT" : "WHO'S COMING"}
              </span>
              <span style={{ fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600 }}>
                47 / 200
              </span>
            </div>
            {/* Capacity bar */}
            <div style={{
              height: 8, background: kiosk.color.paper,
              border: `1px solid ${kiosk.color.ink}`, borderRadius: 2,
              marginBottom: 12, position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: "23.5%",
                background: c.color,
                borderRight: `1px solid ${kiosk.color.ink}`,
              }} />
              <div style={{
                position: "absolute", left: "23.5%", top: 0, bottom: 0,
                width: "9%",
                background: `repeating-linear-gradient(45deg, ${c.color}55 0 4px, transparent 4px 8px)`,
              }} />
            </div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, marginBottom: 8 }}>
              <b style={{ color: kiosk.color.success }}>47</b> {lang === "DE" ? "kommen" : "going"}
              <span style={{ marginLeft: 12 }}><b style={{ color: kiosk.color.warn }}>18</b> {lang === "DE" ? "vielleicht" : "maybe"}</span>
            </div>
            {/* Avatar stack */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              {goers.map((n, i) => (
                <KioskAvatar key={n} name={n} size={28} tone={["wine","ochre","teal","plum","moss","ink"][i % 6]} />
              ))}
              <span style={{
                width: 28, height: 28, borderRadius: "50%",
                background: kiosk.color.paper,
                border: kiosk.border.ink,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 600,
              }}>+41</span>
            </div>
            <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 11.5, color: kiosk.color.inkMute, lineHeight: 1.4 }}>
              {lang === "DE"
                ? "Selma, Mauro, Lena und 44 weitere"
                : "Selma, Mauro, Lena and 44 others"}
            </div>
          </div>

          {/* Add to calendar */}
          <div style={{ marginTop: "auto" }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.12em", marginBottom: 6 }}>
              {lang === "DE" ? "EXPORT" : "EXPORT"}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <KioskBtn small>.ics</KioskBtn>
              <KioskBtn small ghost>Google</KioskBtn>
              <KioskBtn small ghost>{lang === "DE" ? "teilen" : "share"}</KioskBtn>
            </div>
            <div style={{ marginTop: 16, paddingTop: 10, borderTop: `1px dashed ${kiosk.color.rule}`,
              fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, display: "flex", justifyContent: "space-between" }}>
              <span>{lang === "DE" ? "← zurück" : "← back"}</span>
              <span>{lang === "DE" ? "MELDEN" : "REPORT"}</span>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button style={{
          position: "absolute", top: 18, right: 22,
          width: 36, height: 36, borderRadius: "50%",
          background: kiosk.color.paper, border: kiosk.border.ink,
          fontFamily: kiosk.font.mono, fontSize: 16, fontWeight: 600,
          cursor: "pointer", color: kiosk.color.ink,
        }}>✕</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  CREATE EVENT FLOW (form artboard)
// ─────────────────────────────────────────────────────────
function CreateEventArtboard({ lang = "DE" }) {
  return (
    <div style={{
      width: 1280, height: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <div style={paperGrainStyle} />

      <KioskNav active="Kalender" lang={lang} />

      {/* Header */}
      <section style={{ padding: "22px 36px 14px", borderBottom: `1px dashed ${kiosk.color.rule}`, display: "flex", justifyContent: "space-between", alignItems: "end" }}>
        <div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.wine, letterSpacing: "0.12em" }}>
            ← {lang === "DE" ? "ZURÜCK ZUM KALENDER" : "BACK TO CALENDAR"}
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "6px 0 0" }}>
            {lang === "DE"
              ? <>neuer <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>termin</span></>
              : <>new <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>event</span></>}
          </h1>
        </div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute, letterSpacing: "0.06em", textAlign: "right", lineHeight: 1.5 }}>
          {lang === "DE" ? "AUTO-SPEICHERN · vor 4s" : "AUTOSAVED · 4s ago"}<br/>
          <span style={{ color: kiosk.color.success }}>✓ {lang === "DE" ? "Entwurf bereit" : "draft ready"}</span>
        </div>
      </section>

      {/* Form grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", height: 900 - 56 - 96 }}>
        {/* Left column — fields */}
        <div style={{ padding: "24px 36px", overflow: "auto", borderRight: `1px dashed ${kiosk.color.rule}` }}>
          {/* Category */}
          <FieldGroup label={lang === "DE" ? "Kategorie" : "Category"} step="1">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(calCategory).map(([k, c], i) => {
                const active = k === "kiez";
                return (
                  <span key={k} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 12px",
                    background: active ? c.color : "transparent",
                    color: active ? kiosk.color.paper : c.color,
                    border: `1.5px solid ${c.color}`,
                    borderRadius: kiosk.r.pill,
                    fontFamily: kiosk.font.display, fontSize: 13, fontWeight: 600,
                    boxShadow: active ? kiosk.shadow.printSm() : "none",
                  }}>
                    <span>{c.glyph}</span>
                    <span>{c.label[lang]}</span>
                  </span>
                );
              })}
            </div>
          </FieldGroup>

          {/* Title */}
          <FieldGroup label={lang === "DE" ? "Titel" : "Title"} step="2">
            <KioskInput
              value={lang === "DE" ? "Bücher-Tausch im Café Selig" : "Book swap at Café Selig"}
              big
            />
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute, marginTop: 4 }}>
              {lang === "DE" ? "26 / 80 Zeichen" : "26 / 80 chars"}
            </div>
          </FieldGroup>

          {/* When */}
          <FieldGroup label={lang === "DE" ? "Wann" : "When"} step="3">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <DateChip label={lang === "DE" ? "Datum" : "Date"} value={lang === "DE" ? "Sa, 9. Mai" : "Sat, May 9"} />
              <DateChip label={lang === "DE" ? "Start" : "Start"} value="15:00" />
              <DateChip label={lang === "DE" ? "Ende" : "End"} value="18:00" />
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 8, fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute }}>
              <label><input type="checkbox" style={{ marginRight: 4 }} /> {lang === "DE" ? "ganztägig" : "all-day"}</label>
              <label><input type="checkbox" style={{ marginRight: 4 }} /> {lang === "DE" ? "wiederkehrend" : "recurring"}</label>
              <label><input type="checkbox" style={{ marginRight: 4 }} /> {lang === "DE" ? "mehrtägig" : "multi-day"}</label>
            </div>
          </FieldGroup>

          {/* Where */}
          <FieldGroup label={lang === "DE" ? "Wo" : "Where"} step="4">
            <KioskInput value="Café Selig, Weisestr. 49" />
            <div style={{
              marginTop: 6, padding: "6px 10px",
              background: kiosk.color.paperWarm, border: `1px dashed ${kiosk.color.rule}`,
              borderRadius: kiosk.r.sm, display: "flex", justifyContent: "space-between",
              fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkSoft,
            }}>
              <span>◆ {lang === "DE" ? "Adresse erkannt · Pin gesetzt" : "Address found · pin set"}</span>
              <span style={{ color: kiosk.color.wine }}>{lang === "DE" ? "ändern" : "change"}</span>
            </div>
          </FieldGroup>

          {/* Description */}
          <FieldGroup label={lang === "DE" ? "Beschreibung" : "Description"} step="5">
            <div style={{
              border: kiosk.border.ink, borderRadius: kiosk.r.sm,
              background: kiosk.color.paper, padding: "10px 12px",
              minHeight: 90,
              fontFamily: kiosk.font.serif, fontSize: 14, lineHeight: 1.55,
              color: kiosk.color.ink,
            }}>
              {lang === "DE"
                ? "Bringt Bücher, die ihr nicht mehr braucht — nehmt mit, was euch interessiert. Kaffee gibt's vom Selig, alles auf Spendenbasis. Kinderecke vorhanden."
                : "Bring books you don't need anymore — take what interests you. Coffee from Selig, donation-based. Kids' corner available."}
              <span style={{
                display: "inline-block", width: 1.5, height: 16, marginLeft: 1,
                background: kiosk.color.wine, animation: "blink 1s step-end infinite", verticalAlign: "text-bottom",
              }} />
            </div>
            <style>{`@keyframes blink{50%{opacity:0}}`}</style>
          </FieldGroup>

          {/* Capacity + privacy */}
          <FieldGroup label={lang === "DE" ? "Optionen" : "Options"} step="6">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <DateChip label={lang === "DE" ? "Max Personen" : "Capacity"} value="40" />
              <DateChip label={lang === "DE" ? "Sichtbarkeit" : "Visibility"} value={lang === "DE" ? "öffentlich" : "public"} />
            </div>
          </FieldGroup>
        </div>

        {/* Right column — preview */}
        <div style={{ padding: "24px 28px", background: kiosk.color.paperSoft, overflow: "auto" }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.12em", marginBottom: 12 }}>
            ◆ {lang === "DE" ? "VORSCHAU · WIE ANDERE ES SEHEN" : "PREVIEW · HOW OTHERS SEE IT"}
          </div>

          {/* Mini event card preview */}
          <div style={{
            background: kiosk.color.paper, border: kiosk.border.ink,
            borderRadius: kiosk.r.md, padding: "14px 16px",
            boxShadow: kiosk.shadow.printSm(kiosk.color.wine),
            marginBottom: 18,
          }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.12em", marginBottom: 4 }}>
              ◆ KIEZ · 9.5. · 15:00–18:00
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.015em" }}>
              {lang === "DE" ? "Bücher-Tausch im Café Selig" : "Book swap at Café Selig"}
            </div>
            <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12.5, color: kiosk.color.inkMute, marginBottom: 8 }}>
              Café Selig · Weisestr. 49
            </div>
            <div style={{ fontFamily: kiosk.font.serif, fontSize: 13, lineHeight: 1.5, color: kiosk.color.ink }}>
              {lang === "DE"
                ? "Bringt Bücher, die ihr nicht mehr braucht — nehmt mit, was euch interessiert..."
                : "Bring books you don't need anymore — take what interests you..."}
            </div>
          </div>

          {/* Where it lands */}
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 8 }}>
            ◆ {lang === "DE" ? "WIRD ERSCHEINEN BEI" : "WILL APPEAR IN"}
          </div>
          <ul style={{ fontFamily: kiosk.font.serif, fontSize: 13, lineHeight: 1.7, color: kiosk.color.ink, paddingLeft: 18, margin: "0 0 16px" }}>
            <li>{lang === "DE" ? "Kalender · 9. Mai (Samstag-Spalte)" : "Calendar · May 9 (Sat column)"}</li>
            <li>{lang === "DE" ? "Schillerkiez-Wochenagenda · KW 19" : "Schillerkiez weekly · week 19"}</li>
            <li>{lang === "DE" ? "Wöchentlicher Newsletter · Donnerstag" : "Weekly newsletter · Thursday"}</li>
          </ul>

          {/* Submit row */}
          <div style={{
            paddingTop: 14, borderTop: `1.5px solid ${kiosk.color.ink}`,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
          }}>
            <KioskBtn ghost>{lang === "DE" ? "verwerfen" : "discard"}</KioskBtn>
            <KioskBtn solid>
              {lang === "DE" ? "veröffentlichen →" : "publish →"}
            </KioskBtn>
          </div>
          <div style={{ marginTop: 10, fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, lineHeight: 1.5 }}>
            {lang === "DE"
              ? "Wird durch die Mahalle-KI geprüft (≈ 8s) bevor es im Kiez sichtbar wird."
              : "Reviewed by Mahalle-AI (≈ 8s) before going live in the Kiez."}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ label, step, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8,
        paddingBottom: 4, borderBottom: `1px dashed ${kiosk.color.rule}`,
      }}>
        <span style={{
          fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.wine,
          letterSpacing: "0.1em", fontWeight: 700,
        }}>{step.padStart(2, "0")}</span>
        <span style={{ fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function DateChip({ label, value }) {
  return (
    <div style={{
      border: kiosk.border.ink, borderRadius: kiosk.r.sm,
      background: kiosk.color.paper, padding: "8px 12px",
    }}>
      <div style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginBottom: 2 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontFamily: kiosk.font.display, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  STATE MATRIX (5 states)
// ─────────────────────────────────────────────────────────
function CalendarStatesArtboard({ lang = "DE" }) {
  const states = [
    { k: "loading",  label: lang === "DE" ? "Laden" : "Loading" },
    { k: "empty",    label: lang === "DE" ? "Leer · keine Termine" : "Empty · no events" },
    { k: "filtered", label: lang === "DE" ? "Gefiltert · 0 Treffer" : "Filtered · 0 results" },
    { k: "error",    label: lang === "DE" ? "Fehler" : "Error" },
    { k: "rsvp",     label: lang === "DE" ? "RSVP-Speichern" : "RSVP saving" },
  ];

  return (
    <div style={{
      width: 1280, height: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <style>{`
        @keyframes scan { 0%{transform:translateY(-8px)} 100%{transform:translateY(140px)} }
        @keyframes pulseLive { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spinDash { to { stroke-dashoffset: -24; } }
      `}</style>
      <div style={paperGrainStyle} />

      {/* Header */}
      <div style={{ padding: "24px 36px 16px", borderBottom: `1.5px solid ${kiosk.color.ink}` }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.wine, letterSpacing: "0.12em" }}>
          ◆ KALENDER · {lang === "DE" ? "ZUSTÄNDE" : "STATES"}
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, margin: "6px 0 0" }}>
          {lang === "DE"
            ? <>fünf <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>Zustände</span> · ein Kalender</>
            : <>five <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>states</span> · one calendar</>}
        </h1>
      </div>

      {/* Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0,
        padding: "0", flex: 1,
      }}>
        {states.map((s, i) => (
          <div key={s.k} style={{
            borderRight: i % 3 !== 2 ? `1px dashed ${kiosk.color.rule}` : "none",
            borderBottom: i < 3 ? `1px dashed ${kiosk.color.rule}` : "none",
            padding: "20px 24px", height: 360,
            display: "flex", flexDirection: "column", gap: 12, position: "relative",
          }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.12em" }}>
              ◆ {String(i + 1).padStart(2, "0")} · {s.label.toUpperCase()}
            </div>
            <StateBody k={s.k} lang={lang} />
          </div>
        ))}

        {/* Footer cell with notes */}
        <div style={{
          padding: "20px 24px", height: 360,
          background: kiosk.color.ochre,
          color: kiosk.color.ink,
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, letterSpacing: "0.12em", fontWeight: 700 }}>
            ◆ {lang === "DE" ? "NOTIZEN FÜR DEV" : "DEV NOTES"}
          </div>
          <ul style={{ fontFamily: kiosk.font.serif, fontSize: 13, lineHeight: 1.55, paddingLeft: 16, margin: 0 }}>
            <li>{lang === "DE" ? "Loading: Skelett-Grid mit \u201Escan-line\u201C über 7 Spalten." : "Loading: skeleton grid with scanline over 7 columns."}</li>
            <li>{lang === "DE" ? "Empty: keine Aufforderung — Kiez ist leise." : "Empty: no CTA — the Kiez is quiet."}</li>
            <li>{lang === "DE" ? "Filtered: zeigt aktive Filter, einfaches \u201EReset\u201C." : "Filtered: shows active filters with quick reset."}</li>
            <li>{lang === "DE" ? "Error: kein Stack — nur \u201Enochmal\u201C." : "Error: no stack trace — just retry."}</li>
            <li>{lang === "DE" ? "RSVP: optimistisch + skewed loader; toleranter Server-Sync." : "RSVP: optimistic + skewed loader; tolerant server sync."}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StateBody({ k, lang }) {
  if (k === "loading") {
    return (
      <div style={{ flex: 1, position: "relative", overflow: "hidden", border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm }}>
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} style={{ background: kiosk.color.paperWarm, borderRadius: 2 }} />
          ))}
        </div>
        <div style={{
          position: "absolute", left: 0, right: 0, height: 8,
          background: `linear-gradient(180deg, transparent, ${kiosk.color.wine}55, transparent)`,
          animation: "scan 1.4s linear infinite", top: 0,
        }} />
      </div>
    );
  }
  if (k === "empty") {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
        background: kiosk.color.paperWarm, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm,
        padding: 16, gap: 6,
      }}>
        <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 18, color: kiosk.color.inkMute }}>
          {lang === "DE" ? "Im Kiez ist gerade Pause." : "The Kiez is on a break."}
        </div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute }}>
          {lang === "DE" ? "Diese Woche: 0 Termine." : "This week: 0 events."}
        </div>
        <KioskBtn small>{lang === "DE" ? "+ ersten termin posten" : "+ post first event"}</KioskBtn>
      </div>
    );
  }
  if (k === "filtered") {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
        background: kiosk.color.paper, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm, padding: 14,
      }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <FilterChip label={lang === "DE" ? "Sport" : "Sport"} active />
          <FilterChip label={lang === "DE" ? "Diese Woche" : "This week"} active />
        </div>
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 18, color: kiosk.color.inkMute, marginBottom: 4 }}>
            {lang === "DE" ? "Keine Sport-Termine diese Woche." : "No sport events this week."}
          </div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkSoft }}>
            {lang === "DE" ? "nächster: Lauftreff · 5. Mai · 10:00" : "next: running club · May 5 · 10:00"}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: kiosk.font.mono, fontSize: 11 }}>
          <span style={{ color: kiosk.color.wine }}>{lang === "DE" ? "filter zurücksetzen" : "clear filters"}</span>
          <span style={{ color: kiosk.color.inkMute }}>{lang === "DE" ? "alle anzeigen →" : "show all →"}</span>
        </div>
      </div>
    );
  }
  if (k === "error") {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center",
        background: kiosk.color.paper, border: `2px solid ${kiosk.color.danger}`, borderRadius: kiosk.r.sm, padding: 16, gap: 8,
        boxShadow: kiosk.shadow.printSm(kiosk.color.danger),
      }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.danger, letterSpacing: "0.12em", fontWeight: 700 }}>
          ◆ {lang === "DE" ? "VERBINDUNG VERLOREN" : "CONNECTION LOST"}
        </div>
        <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 16, lineHeight: 1.4 }}>
          {lang === "DE" ? "Wir konnten die Termine nicht laden." : "We couldn't load the events."}
        </div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkMute }}>
          ER_NETWORK · 14:42:31
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <KioskBtn small solid>{lang === "DE" ? "nochmal" : "retry"}</KioskBtn>
          <KioskBtn small ghost>{lang === "DE" ? "offline lesen" : "read offline"}</KioskBtn>
        </div>
      </div>
    );
  }
  if (k === "rsvp") {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", gap: 10,
        background: kiosk.color.paper, border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm, padding: 14,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
          {lang === "DE" ? "Hofkonzert Hertzbergstraße" : "Courtyard concert Hertzbergstraße"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{
            padding: "6px 14px",
            background: kiosk.color.success, color: kiosk.color.paper,
            border: kiosk.border.ink, borderRadius: kiosk.r.pill,
            fontFamily: kiosk.font.display, fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle cx="6" cy="6" r="5" fill="none" stroke={kiosk.color.paper} strokeWidth="2"
                strokeDasharray="6 6" strokeLinecap="round"
                style={{ animation: "spinDash 0.8s linear infinite", transformOrigin: "center" }}
              />
            </svg>
            ✓ {lang === "DE" ? "ich komme" : "going"}
          </button>
          <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>
            {lang === "DE" ? "synchronisiere…" : "syncing…"}
          </span>
        </div>
        <div style={{
          padding: "8px 10px",
          background: kiosk.color.paperWarm,
          border: `1px dashed ${kiosk.color.rule}`,
          borderRadius: kiosk.r.sm,
          fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12, color: kiosk.color.inkMute, lineHeight: 1.45,
        }}>
          {lang === "DE"
            ? "✓ Lokal gespeichert. Server-Sync in ein paar Sekunden."
            : "✓ Saved locally. Server sync in a few seconds."}
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>
          <span>{lang === "DE" ? "rückgängig (5s)" : "undo (5s)"}</span>
          <span style={{ color: kiosk.color.success }}>○ → ✓</span>
        </div>
      </div>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────
//  MOBILE — Month + Agenda + Detail + Create
// ─────────────────────────────────────────────────────────
function CalendarMobileMonth({ lang = "DE" }) {
  const cells = [];
  const firstDayIdx = 2;
  for (let i = 0; i < firstDayIdx; i++) cells.push({ d: 30 - firstDayIdx + 1 + i, prevMonth: true });
  for (let i = 1; i <= 30; i++) cells.push({ d: i });
  let mayDay = 1;
  while (cells.length < 35) cells.push({ d: mayDay++, nextMonth: true });

  return (
    <MobileShell title={lang === "DE" ? "Kalender" : "Calendar"} lang={lang} active="cal">
      {/* Month header */}
      <div style={{ padding: "10px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        <div>
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.wine, letterSpacing: "0.1em" }}>◆ APRIL 2026</div>
          <div style={{ fontFamily: kiosk.font.display, fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em" }}>
            {lang === "DE" ? "diese Woche · 12 Termine" : "this week · 12 events"}
          </div>
        </div>
        <KioskBtn small solid>+</KioskBtn>
      </div>
      {/* Mini scroll category rail */}
      <div style={{ padding: "8px 16px", display: "flex", gap: 6, overflowX: "auto", borderBottom: `1px dashed ${kiosk.color.rule}` }}>
        {Object.entries(calCategory).map(([k, c], i) => (
          <span key={k} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 9px",
            background: i === 0 ? c.color : "transparent",
            color: i === 0 ? kiosk.color.paper : c.color,
            border: `1.5px solid ${c.color}`, borderRadius: kiosk.r.pill,
            fontFamily: kiosk.font.display, fontSize: 11, fontWeight: 600,
            flexShrink: 0,
          }}>
            <span>{c.glyph}</span><span>{c.label[lang]}</span>
          </span>
        ))}
      </div>

      {/* Mini grid */}
      <div style={{ padding: "8px 8px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 0, paddingBottom: 4, borderBottom: `1px solid ${kiosk.color.ink}` }}>
          {DOW[lang].map((d) => (
            <div key={d} style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, padding: "4px 0", textAlign: "center", letterSpacing: "0.05em" }}>{d.charAt(0)}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridAutoRows: 38 }}>
          {cells.map((cell, i) => {
            const isToday = !cell.prevMonth && !cell.nextMonth && cell.d === TODAY;
            const dayEvs = !cell.prevMonth && !cell.nextMonth ? SEED_EVENTS.filter((ev) => ev.d <= cell.d && ev.d + ev.span - 1 >= cell.d && ev.d <= 30) : [];
            return (
              <div key={i} style={{
                position: "relative", padding: 3,
                opacity: cell.prevMonth || cell.nextMonth ? 0.3 : 1,
                background: isToday ? kiosk.color.paperWarm : "transparent",
                borderRight: `0.5px dashed ${kiosk.color.rule}`,
                borderBottom: `0.5px dashed ${kiosk.color.rule}`,
              }}>
                <div style={{
                  fontFamily: kiosk.font.display, fontSize: isToday ? 12 : 11,
                  fontWeight: isToday ? 800 : 500,
                  color: isToday ? kiosk.color.paper : kiosk.color.ink,
                  background: isToday ? kiosk.color.wine : "transparent",
                  borderRadius: isToday ? "50%" : 0,
                  width: isToday ? 18 : "auto", height: isToday ? 18 : "auto",
                  display: isToday ? "flex" : "inline",
                  alignItems: "center", justifyContent: "center",
                  marginLeft: isToday ? "auto" : 0, marginRight: isToday ? "auto" : 0,
                  textAlign: "center",
                }}>{cell.d}</div>
                <div style={{ display: "flex", gap: 1.5, marginTop: 2, justifyContent: "center" }}>
                  {dayEvs.slice(0, 3).map((ev) => (
                    <span key={ev.id} style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: calCategory[ev.cat].color,
                    }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's list */}
      <div style={{ padding: "12px 16px 0", marginTop: 6, borderTop: `1.5px solid ${kiosk.color.ink}` }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.12em", marginBottom: 6 }}>
          ◆ {lang === "DE" ? "HEUTE · MO 27. APRIL" : "TODAY · MON APR 27"}
        </div>
        {SEED_EVENTS.filter((e) => e.d === TODAY).map((ev) => {
          const c = calCategory[ev.cat];
          const t = lang === "DE" ? ev.title : ev.titleEN;
          const live = eventIsLive(ev);
          return (
            <div key={ev.id} style={{
              display: "grid", gridTemplateColumns: "44px 4px 1fr", gap: 8,
              padding: "8px 0", borderBottom: `1px dashed ${kiosk.color.rule}`,
              alignItems: "start",
            }}>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600, color: live ? kiosk.color.wine : kiosk.color.ink }}>
                {ev.ts}
                {live && <div style={{ marginTop: 2, fontSize: 8, color: kiosk.color.ochre, letterSpacing: "0.1em", fontWeight: 700 }}>● LIVE</div>}
              </div>
              <div style={{ background: c.color, alignSelf: "stretch", borderRadius: 1 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{t}</div>
                <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 11, color: kiosk.color.inkMute }}>{ev.place}</div>
              </div>
            </div>
          );
        })}
      </div>
    </MobileShell>
  );
}

function CalendarMobileDetail({ lang = "DE" }) {
  const ev = heroEvent;
  const c = calCategory[ev.cat];
  return (
    <MobileShell title={lang === "DE" ? "Termin" : "Event"} lang={lang} active="cal" back>
      {/* Hero */}
      <div style={{
        background: c.color, color: kiosk.color.paper,
        padding: "16px 18px", borderBottom: kiosk.border.ink,
      }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, letterSpacing: "0.12em", marginBottom: 4 }}>
          {c.glyph} KIEZ · 3.5. · 14:00–20:00
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
          {lang === "DE" ? "Straßenfest Herrfurthplatz" : "Street fest Herrfurthplatz"}
        </div>
        <div style={{ marginTop: 4, fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 13, opacity: 0.92 }}>
          Herrfurthplatz · Schillerkiez
        </div>
      </div>

      <div style={{ padding: "14px 16px" }}>
        {/* RSVP buttons */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <KioskBtn small solid>{lang === "DE" ? "ich komme" : "going"}</KioskBtn>
          <KioskBtn small>{lang === "DE" ? "vielleicht" : "maybe"}</KioskBtn>
        </div>
        <div style={{
          padding: "8px 10px", background: kiosk.color.paperSoft,
          border: `1.5px solid ${kiosk.color.success}`, borderRadius: kiosk.r.sm,
          fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12, lineHeight: 1.4, marginBottom: 14,
        }}>
          ✓ {lang === "DE" ? "Du kommst. 47 Nachbar:innen auch." : "You're going. 47 neighbours too."}
        </div>

        {/* Description */}
        <p style={{ fontFamily: kiosk.font.serif, fontSize: 14, lineHeight: 1.55, margin: "0 0 14px" }}>
          {lang === "DE"
            ? "Live-Musik aus dem Kiez, Stände vom Türkenmarkt, Kinderecke, Tausch-Bibliothek. Ab 18 Uhr DJ-Set Selma & Friends. BYO."
            : "Live music from the Kiez, market stalls, kids' corner, swap library. From 6pm DJ set Selma & Friends. BYO."}
        </p>

        {/* Capacity */}
        <div style={{ paddingTop: 10, borderTop: `1px dashed ${kiosk.color.rule}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, letterSpacing: "0.12em" }}>{lang === "DE" ? "WER KOMMT" : "WHO'S COMING"}</span>
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 600 }}>47 / 200</span>
          </div>
          <div style={{ height: 6, background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.ink}`, borderRadius: 2, marginBottom: 8 }}>
            <div style={{ width: "23.5%", height: "100%", background: c.color, borderRight: `1px solid ${kiosk.color.ink}` }} />
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {["Selma","Mauro","Lena","David","Aisha"].map((n, i) => (
              <KioskAvatar key={n} name={n} size={26} tone={["wine","ochre","teal","plum","moss"][i]} />
            ))}
            <span style={{
              width: 26, height: 26, borderRadius: "50%",
              background: kiosk.color.paper, border: kiosk.border.ink,
              fontFamily: kiosk.font.mono, fontSize: 9, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>+42</span>
          </div>
        </div>
      </div>

      {/* Sticky bottom export */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "10px 16px", borderTop: `1.5px solid ${kiosk.color.ink}`,
        background: kiosk.color.paper, display: "flex", gap: 6,
      }}>
        <KioskBtn small>.ics</KioskBtn>
        <KioskBtn small ghost>Google</KioskBtn>
        <KioskBtn small ghost>{lang === "DE" ? "teilen" : "share"}</KioskBtn>
      </div>
    </MobileShell>
  );
}

Object.assign(window, {
  EventDetailModalArtboard, CreateEventArtboard,
  CalendarStatesArtboard, CalendarMobileMonth, CalendarMobileDetail,
});

/* global React, kiosk, kioskFonts, paperGrainStyle, StripedPlaceholder,
   FilterChip, KioskBtn, KioskInput, KioskAvatar, KioskNav */

// ══════════════════════════════════════════════════════════
//  KIOSK · CALENDAR
//  Schillerkiez community calendar. Editorial Kiosk vocabulary.
//  Categories: kiez · privat · öffentlich · markt · kultur · sport
//  Distinct treatment per category (color + glyph), multi-day
//  events render as banners spanning days. Live "happening now"
//  marker. DE/EN.
// ══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
//  CATEGORY SYSTEM — extends kiosk-system tokens
// ─────────────────────────────────────────────────────────
const calCategory = {
  kiez:       { color: kiosk.color.wine,  label: { DE: "Kiez",       EN: "Kiez" },       glyph: "◆" }, // neighborhood
  oeffentlich:{ color: kiosk.color.teal,  label: { DE: "Öffentlich", EN: "Public" },     glyph: "▲" }, // city / official
  markt:      { color: kiosk.color.ochre, label: { DE: "Markt",      EN: "Market" },     glyph: "●" },
  kultur:     { color: kiosk.color.plum,  label: { DE: "Kultur",     EN: "Culture" },    glyph: "✦" },
  sport:      { color: kiosk.color.moss,  label: { DE: "Sport",      EN: "Sport" },      glyph: "▶" },
  privat:     { color: kiosk.color.inkSoft,label:{ DE: "Privat",     EN: "Private" },    glyph: "◇" },
};

// Days of week
const DOW = {
  DE: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  EN: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};
const MONTHS = {
  DE: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
  EN: ["January","February","March","April","May","June","July","August","September","October","November","December"],
};

// ─────────────────────────────────────────────────────────
//  SEED EVENTS — realistic Schillerkiez · April–May 2026
//  d = day (1–31), span = days, ts = "HH:MM"
// ─────────────────────────────────────────────────────────
const SEED_EVENTS = [
  { id: "e01", d: 25, span: 1, ts: "18:00", endTs: "21:00",
    cat: "kiez",
    title: "Hofkonzert Hertzbergstraße",
    titleEN: "Courtyard concert Hertzbergstraße",
    place: "Hertzbergstr. 22, Hinterhof",
    organizer: "Selma + Kerem",
    going: 18, maybe: 7, capacity: 40 },
  { id: "e02", d: 26, span: 1, ts: "08:00", endTs: "14:00",
    cat: "markt",
    title: "Türkenmarkt am Maybachufer",
    titleEN: "Turkish Market at Maybachufer",
    place: "Maybachufer · jeden Di + Fr",
    organizer: "Bezirk Neukölln",
    recurring: "weekly",
    going: 0, maybe: 0 },
  { id: "e03", d: 27, span: 1, ts: "19:30", endTs: "21:30",
    cat: "kultur",
    title: "Lesung · Şenocak liest aus \u201EDeutsche Schule\u201C",
    titleEN: "Reading · Şenocak reads from 'German School'",
    place: "Café Selig, Weisestr. 49",
    organizer: "Café Selig",
    going: 12, maybe: 4, capacity: 25 },
  { id: "e04", d: 30, span: 4, ts: "all-day",
    cat: "kiez",
    title: "Tag der offenen Höfe · 4 Tage",
    titleEN: "Open Courtyards · 4 days",
    place: "Schillerkiez · ganzes Viertel",
    organizer: "Quartiersmanagement",
    going: 87, maybe: 23 },
  { id: "e05", d: 1, span: 1, ts: "11:00", endTs: "18:00",
    cat: "oeffentlich",
    title: "1. Mai · Demo + Straßenfest",
    titleEN: "May 1 · Demo + Street fest",
    place: "Hermannplatz → Sonnenallee",
    organizer: "DGB Berlin + Kollektiv",
    going: 234, maybe: 56 },
  { id: "e06", d: 3, span: 1, ts: "14:00", endTs: "20:00",
    cat: "kiez",
    title: "Straßenfest Herrfurthplatz",
    titleEN: "Herrfurthplatz street fest",
    place: "Herrfurthplatz",
    organizer: "Mahalle-Team", team: true,
    going: 47, maybe: 18, capacity: 200,
    pinned: true },
  { id: "e07", d: 5, span: 1, ts: "10:00", endTs: "11:30",
    cat: "sport",
    title: "Lauftreff Tempelhofer Feld",
    titleEN: "Running club Tempelhofer Feld",
    place: "Eingang Oderstr.",
    organizer: "Lena K.", recurring: "weekly",
    going: 9, maybe: 3 },
  { id: "e08", d: 7, span: 1, ts: "19:00", endTs: "22:00",
    cat: "privat",
    title: "Geburtstag Mauro · BYO",
    titleEN: "Mauro's birthday · BYO",
    place: "Privat · Adresse per DM",
    organizer: "Mauro R.",
    going: 14, maybe: 2, capacity: 20,
    private: true },
  { id: "e09", d: 8, span: 1, ts: "16:00", endTs: "18:00",
    cat: "kultur",
    title: "Kinderworkshop · Linoldruck",
    titleEN: "Kids workshop · Linocut",
    place: "Buchladen Tucholsky",
    organizer: "Buchladen Tucholsky",
    going: 6, maybe: 4, capacity: 12 },
  { id: "e10", d: 10, span: 1, ts: "10:00", endTs: "16:00",
    cat: "markt",
    title: "Flohmarkt Schillerpromenade",
    titleEN: "Flea market Schillerpromenade",
    place: "Schillerpromenade",
    organizer: "Bezirk", recurring: "monthly",
    going: 0, maybe: 0 },
];

// Today is the 27th in this mock — for the "live" indicator
const TODAY = 27;
// "Happening now" event detection — anything on TODAY whose ts has started
const NOW_HOUR = 14; // 14:42 in the mockup, so anything starting <= 14 is "live"

// Helpers
const eventIsLive = (ev) => ev.d === TODAY && ev.ts !== "all-day" &&
  parseInt(ev.ts.split(":")[0], 10) <= NOW_HOUR &&
  (!ev.endTs || parseInt(ev.endTs.split(":")[0], 10) > NOW_HOUR);

// ─────────────────────────────────────────────────────────
//  CALENDAR HEADER (page title block)
// ─────────────────────────────────────────────────────────
function CalendarTitleBlock({ lang = "DE", view = "month", onView }) {
  return (
    <section style={{
      padding: "22px 36px 14px",
      display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: 20,
      borderBottom: `1px dashed ${kiosk.color.rule}`,
    }}>
      <div>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.wine, letterSpacing: "0.12em" }}>
          KALENDER · {lang === "DE" ? "APRIL — MAI 2026" : "APRIL — MAY 2026"}
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95, margin: "6px 0 0" }}>
          {lang === "DE"
            ? <>Was <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>passiert</span> im Kiez?</>
            : <>What's <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400, color: kiosk.color.wine }}>happening</span> in the Kiez?</>}
        </h1>
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontFamily: kiosk.font.mono, fontSize: 11, color: kiosk.color.inkMute }}>
          <span><b style={{ color: kiosk.color.ink }}>34</b> {lang === "DE" ? "Termine diese Woche" : "events this week"}</span>
          <span><b style={{ color: kiosk.color.ochre }}>3</b> {lang === "DE" ? "gerade live" : "live now"}</span>
          <span><b style={{ color: kiosk.color.ink }}>87</b> {lang === "DE" ? "Nachbar:innen kommen heute" : "neighbours going today"}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* View switcher */}
        <div style={{ display: "flex", border: kiosk.border.ink, borderRadius: kiosk.r.pill, overflow: "hidden", fontFamily: kiosk.font.mono, fontSize: 11, fontWeight: 600 }}>
          {[
            { k: "month", l: lang === "DE" ? "Monat" : "Month" },
            { k: "agenda", l: lang === "DE" ? "Agenda" : "Agenda" },
            { k: "day", l: lang === "DE" ? "Tag" : "Day" },
          ].map((v, i) => (
            <span key={v.k} style={{
              padding: "5px 12px",
              background: view === v.k ? kiosk.color.ink : "transparent",
              color: view === v.k ? kiosk.color.paper : kiosk.color.ink,
              borderLeft: i === 0 ? "none" : kiosk.border.ink,
            }}>{v.l}</span>
          ))}
        </div>
        <KioskBtn>{lang === "DE" ? "+ neuer termin" : "+ new event"}</KioskBtn>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
//  CATEGORY FILTER RAIL
// ─────────────────────────────────────────────────────────
function CalCategoryRail({ lang = "DE", active = ["kiez","oeffentlich","markt","kultur","sport"] }) {
  return (
    <section style={{
      padding: "12px 36px",
      display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
      borderBottom: `1px dashed ${kiosk.color.rule}`,
    }}>
      <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.1em", marginRight: 4 }}>
        {lang === "DE" ? "ZEIGEN" : "SHOW"}
      </span>
      {Object.entries(calCategory).map(([k, c]) => {
        const on = active.includes(k);
        return (
          <span key={k} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px",
            background: on ? c.color : "transparent",
            color: on ? kiosk.color.paper : c.color,
            border: `1.5px solid ${c.color}`,
            borderRadius: kiosk.r.pill,
            fontFamily: kiosk.font.display, fontSize: 12, fontWeight: 600,
          }}>
            <span>{c.glyph}</span>
            <span>{c.label[lang]}</span>
          </span>
        );
      })}
      <span style={{ width: 1, height: 18, background: kiosk.color.rule, margin: "0 4px" }} />
      <FilterChip label={lang === "DE" ? "Meine RSVPs" : "My RSVPs"} />
      <FilterChip label={lang === "DE" ? "Gespeichert" : "Saved"} />
      <span style={{ marginLeft: "auto", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.1em" }}>
        ↻ {lang === "DE" ? "live · 3 gerade" : "live · 3 now"}
      </span>
    </section>
  );
}

// ─────────────────────────────────────────────────────────
//  EVENT PILL — used inside month-grid cells
// ─────────────────────────────────────────────────────────
function EventPill({ ev, lang = "DE", spanStart, spanMid, spanEnd, isLive }) {
  const c = calCategory[ev.cat];
  const t = lang === "DE" ? ev.title : ev.titleEN;
  // Multi-day rendering
  const radiusL = spanStart || (!spanMid && !spanEnd) ? 4 : 0;
  const radiusR = spanEnd  || (!spanMid && !spanStart) ? 4 : 0;
  return (
    <div style={{
      background: c.color,
      color: kiosk.color.paper,
      padding: "1px 6px",
      borderTopLeftRadius: radiusL, borderBottomLeftRadius: radiusL,
      borderTopRightRadius: radiusR, borderBottomRightRadius: radiusR,
      borderLeft: spanStart || (!spanMid && !spanEnd) ? `1px solid ${kiosk.color.ink}` : "none",
      borderRight: spanEnd || (!spanMid && !spanStart) ? `1px solid ${kiosk.color.ink}` : "none",
      borderTop: `1px solid ${kiosk.color.ink}`,
      borderBottom: `1px solid ${kiosk.color.ink}`,
      marginRight: spanMid || spanStart ? -1 : 0,
      fontSize: 10.5, fontWeight: 600, lineHeight: 1.3,
      fontFamily: kiosk.font.display,
      display: "flex", alignItems: "center", gap: 4,
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      position: "relative",
    }}>
      {(spanStart || (!spanMid && !spanEnd)) && (
        <>
          {isLive && <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: kiosk.color.ochre, border: `1px solid ${kiosk.color.ink}`,
            animation: "pulseLive 1.4s ease-in-out infinite",
            flexShrink: 0,
          }} />}
          {ev.ts !== "all-day" && !ev.recurring && (
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, opacity: 0.85, fontWeight: 500 }}>{ev.ts}</span>
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t}</span>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  MONTH GRID · DESKTOP (1280×900)
//  April 2026 starts on Wednesday (d=1 → DOW idx 2)
// ─────────────────────────────────────────────────────────
function CalendarMonthDesktop({ lang = "DE" }) {
  // April 2026 starts Wed, has 30 days. Show last days of March + first days of May to fill grid.
  // Layout: Mon=0 ... Sun=6. April 1 = Wed = idx 2.
  const firstDayIdx = 2;
  const daysInApril = 30;
  const totalCells = 35; // 5 rows
  const cells = [];
  // Leading days (last days of March)
  for (let i = 0; i < firstDayIdx; i++) {
    cells.push({ d: 30 - firstDayIdx + 1 + i, prevMonth: true });
  }
  for (let i = 1; i <= daysInApril; i++) {
    cells.push({ d: i });
  }
  // Trailing into May
  let mayDay = 1;
  while (cells.length < totalCells) {
    cells.push({ d: mayDay++, nextMonth: true });
  }

  return (
    <div style={{
      width: 1280, height: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <style>{`
        @keyframes pulseLive { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.55; } }
      `}</style>
      <div style={paperGrainStyle} />

      <KioskNav active="Kalender" lang={lang} />
      <CalendarTitleBlock lang={lang} view="month" />
      <CalCategoryRail lang={lang} />

      {/* Month grid */}
      <div style={{ padding: "0 36px 24px", height: 900 - 56 - 130 - 50, overflow: "hidden" }}>
        {/* Day-of-week header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, paddingBottom: 4, borderBottom: `1.5px solid ${kiosk.color.ink}` }}>
          {DOW[lang].map((d, i) => (
            <div key={d} style={{
              fontFamily: kiosk.font.mono, fontSize: 10.5, letterSpacing: "0.12em",
              color: i >= 5 ? kiosk.color.wine : kiosk.color.inkMute,
              padding: "8px 8px 6px", textAlign: "left",
            }}>{d.toUpperCase()}</div>
          ))}
        </div>

        {/* Cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "1fr", height: "calc(100% - 30px)", borderLeft: `1px dashed ${kiosk.color.rule}` }}>
          {cells.map((cell, i) => {
            const isToday = !cell.prevMonth && !cell.nextMonth && cell.d === TODAY;
            const isWeekend = i % 7 >= 5;
            const dayEvents = !cell.prevMonth && !cell.nextMonth
              ? SEED_EVENTS.filter((ev) => ev.d <= cell.d && ev.d + ev.span - 1 >= cell.d && ev.d <= 30)
              : (cell.nextMonth
                ? SEED_EVENTS.filter((ev) => ev.d <= cell.d && ev.d + ev.span - 1 >= cell.d && ev.d > 30 - 5)
                : []);
            // For multi-day banners we mark spanStart / spanMid / spanEnd
            return (
              <div key={i} style={{
                borderRight: `1px dashed ${kiosk.color.rule}`,
                borderBottom: `1px dashed ${kiosk.color.rule}`,
                background: isToday ? kiosk.color.paperWarm : isWeekend ? "rgba(178,58,91,0.025)" : "transparent",
                padding: "5px 6px 4px",
                opacity: cell.prevMonth || cell.nextMonth ? 0.35 : 1,
                position: "relative",
                overflow: "hidden",
                minHeight: 0,
              }}>
                {/* Date number */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 3,
                }}>
                  <span style={{
                    fontFamily: kiosk.font.display,
                    fontSize: isToday ? 18 : 13,
                    fontWeight: isToday ? 800 : 600,
                    color: isToday ? kiosk.color.paper : kiosk.color.ink,
                    background: isToday ? kiosk.color.wine : "transparent",
                    border: isToday ? kiosk.border.ink : "none",
                    borderRadius: isToday ? "50%" : 0,
                    width: isToday ? 26 : "auto",
                    height: isToday ? 26 : "auto",
                    display: isToday ? "flex" : "inline",
                    alignItems: "center", justifyContent: "center",
                    letterSpacing: "-0.02em",
                  }}>{cell.d}</span>
                  {isToday && (
                    <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.wine, letterSpacing: "0.1em" }}>
                      {lang === "DE" ? "HEUTE" : "TODAY"}
                    </span>
                  )}
                  {cell.nextMonth && cell.d === 1 && (
                    <span style={{ fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute, letterSpacing: "0.08em" }}>
                      {lang === "DE" ? "MAI" : "MAY"}
                    </span>
                  )}
                </div>

                {/* Events */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {dayEvents.slice(0, 3).map((ev) => {
                    const spanStart = ev.d === cell.d;
                    const spanEnd = ev.d + ev.span - 1 === cell.d;
                    const spanMid = !spanStart && !spanEnd;
                    return (
                      <EventPill
                        key={ev.id}
                        ev={ev} lang={lang}
                        spanStart={spanStart} spanMid={spanMid} spanEnd={spanEnd}
                        isLive={eventIsLive(ev)}
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, padding: "0 4px" }}>
                      + {dayEvents.length - 3} {lang === "DE" ? "weitere" : "more"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer rule */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "10px 36px",
        display: "flex", justifyContent: "space-between",
        fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute,
        borderTop: `1px dashed ${kiosk.color.rule}`, background: kiosk.color.paper,
      }}>
        <span>{lang === "DE" ? "← MÄRZ" : "← MARCH"}</span>
        <span style={{ color: kiosk.color.wine }}>↻ {lang === "DE" ? "live · 3 termine gerade" : "live · 3 events now"}</span>
        <span>{lang === "DE" ? "MAI →" : "MAY →"}</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  CalendarMonthDesktop,
  CalendarTitleBlock, CalCategoryRail, EventPill,
  calCategory, SEED_EVENTS, TODAY, NOW_HOUR, eventIsLive, DOW, MONTHS,
});

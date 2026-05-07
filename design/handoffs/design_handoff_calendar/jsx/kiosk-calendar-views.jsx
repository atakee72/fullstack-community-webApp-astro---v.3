/* global React, kiosk, kioskFonts, paperGrainStyle,
   FilterChip, KioskBtn, KioskAvatar, KioskNav,
   calCategory, SEED_EVENTS, TODAY, NOW_HOUR, eventIsLive, DOW, MONTHS,
   CalendarTitleBlock, CalCategoryRail */

// ══════════════════════════════════════════════════════════
//  KIOSK · CALENDAR · AGENDA + DAY + DRAG-SELECT
// ══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
//  Reusable: Agenda event row
// ─────────────────────────────────────────────────────────
function AgendaRow({ ev, lang = "DE", live }) {
  const c = calCategory[ev.cat];
  const t = lang === "DE" ? ev.title : ev.titleEN;
  return (
    <article style={{
      display: "grid", gridTemplateColumns: "76px 6px 1fr auto",
      gap: 14, alignItems: "stretch",
      padding: "14px 0",
      borderBottom: `1px dashed ${kiosk.color.rule}`,
    }}>
      {/* Time column */}
      <div style={{ paddingTop: 2 }}>
        <div style={{ fontFamily: kiosk.font.mono, fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: live ? kiosk.color.wine : kiosk.color.ink }}>
          {ev.ts === "all-day" ? (lang === "DE" ? "ganztags" : "all-day") : ev.ts}
        </div>
        {ev.endTs && ev.ts !== "all-day" && (
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>
            – {ev.endTs}
          </div>
        )}
        {live && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            marginTop: 4,
            fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.ochre,
            letterSpacing: "0.1em", fontWeight: 600,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: kiosk.color.ochre, border: `1px solid ${kiosk.color.ink}`,
              animation: "pulseLive 1.4s ease-in-out infinite",
            }} />
            LIVE
          </div>
        )}
      </div>

      {/* Color rule */}
      <div style={{ background: c.color, borderRadius: 2, alignSelf: "stretch", border: `0.5px solid ${kiosk.color.ink}` }} />

      {/* Body */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{
            fontFamily: kiosk.font.mono, fontSize: 10, fontWeight: 600,
            color: c.color, letterSpacing: "0.1em",
          }}>{c.glyph} {c.label[lang].toUpperCase()}</span>
          {ev.span > 1 && (
            <span style={{
              fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute,
              padding: "1px 5px", border: `1px solid ${kiosk.color.rule}`, borderRadius: 3,
              letterSpacing: "0.05em",
            }}>{ev.span} {lang === "DE" ? "Tage" : "days"}</span>
          )}
          {ev.recurring && (
            <span style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
              ↻ {ev.recurring === "weekly" ? (lang === "DE" ? "wöchentlich" : "weekly") : (lang === "DE" ? "monatlich" : "monthly")}
            </span>
          )}
          {ev.team && (
            <span style={{
              fontFamily: kiosk.font.mono, fontSize: 8.5, fontWeight: 600,
              letterSpacing: "0.08em",
              padding: "1px 5px", borderRadius: 3,
              background: kiosk.color.ink, color: kiosk.color.paper,
              textTransform: "uppercase",
            }}>{lang === "DE" ? "Mahalle-Team" : "Mahalle Team"}</span>
          )}
          {ev.private && (
            <span style={{
              fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.inkMute,
              fontStyle: "italic",
            }}>· {lang === "DE" ? "privat" : "private"}</span>
          )}
        </div>
        <h4 style={{
          fontSize: 16.5, fontWeight: 700, margin: "0 0 4px",
          letterSpacing: "-0.018em", lineHeight: 1.2,
          textWrap: "balance",
        }}>{t}</h4>
        <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 12.5, color: kiosk.color.inkMute, marginBottom: 6 }}>
          {ev.place}
          <span style={{ fontFamily: kiosk.font.mono, fontStyle: "normal", fontSize: 10.5, color: kiosk.color.inkMute }}>
            {" · "}{lang === "DE" ? "von" : "by"} {ev.organizer}
          </span>
        </div>
        {(ev.going > 0 || ev.maybe > 0) && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: kiosk.font.mono, fontSize: 10.5, color: kiosk.color.inkSoft }}>
            <span><b style={{ color: kiosk.color.success }}>{ev.going}</b> {lang === "DE" ? "kommen" : "going"}</span>
            <span><b style={{ color: kiosk.color.warn }}>{ev.maybe}</b> {lang === "DE" ? "vielleicht" : "maybe"}</span>
            {ev.capacity && (
              <span style={{ color: kiosk.color.inkMute }}>
                · {lang === "DE" ? "max" : "cap"} {ev.capacity}
                <span style={{
                  display: "inline-block", width: 60, height: 5,
                  background: kiosk.color.paperSoft, border: `1px solid ${kiosk.color.rule}`,
                  borderRadius: 2, marginLeft: 6, verticalAlign: "middle",
                  position: "relative", overflow: "hidden",
                }}>
                  <span style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${Math.min(100, (ev.going / ev.capacity) * 100)}%`,
                    background: c.color,
                  }} />
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* RSVP buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        <KioskBtn small>{lang === "DE" ? "ich komme" : "going"}</KioskBtn>
        <span style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute }}>
          → {lang === "DE" ? "details" : "details"}
        </span>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────
//  Day separator with weekday + date
// ─────────────────────────────────────────────────────────
function AgendaDayHeader({ d, dow, lang, isToday }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", gap: 12,
      paddingBottom: 6, marginTop: 14,
      borderBottom: `1.5px solid ${kiosk.color.ink}`,
    }}>
      <span style={{
        fontSize: 32, fontWeight: 800, letterSpacing: "-0.025em",
        color: isToday ? kiosk.color.wine : kiosk.color.ink,
      }}>{d}.</span>
      <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 18, color: kiosk.color.inkSoft }}>
        {dow}
      </span>
      {isToday && (
        <span style={{
          fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.paper,
          background: kiosk.color.wine, padding: "2px 7px", borderRadius: 3,
          letterSpacing: "0.1em",
        }}>{lang === "DE" ? "HEUTE · 14:42" : "TODAY · 14:42"}</span>
      )}
      <span style={{ marginLeft: "auto", fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkMute, letterSpacing: "0.05em" }}>
        {lang === "DE" ? "April 2026" : "April 2026"}
      </span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
//  AGENDA · DESKTOP
// ═════════════════════════════════════════════════════════
function CalendarAgendaDesktop({ lang = "DE" }) {
  // Group events by day, only April-May upcoming
  const byDay = {};
  SEED_EVENTS.filter((ev) => ev.d >= TODAY || ev.d <= 10) // 25, 26, 27 ... and May 1, 3, 5
    .forEach((ev) => {
      const k = ev.d > 24 ? `apr-${ev.d}` : `may-${ev.d}`;
      if (!byDay[k]) byDay[k] = { d: ev.d, month: ev.d > 24 ? "apr" : "may", events: [] };
      byDay[k].events.push(ev);
    });

  const days = Object.values(byDay).sort((a, b) => {
    if (a.month !== b.month) return a.month === "apr" ? -1 : 1;
    return a.d - b.d;
  });

  // Day-of-week index for each day (April 2026: 1 = Wed, idx 2)
  const dowFor = (d, month) => {
    const aprFirst = 2; // Wed
    if (month === "apr") return DOW[lang][(aprFirst + d - 1) % 7];
    // May 1 = Friday, idx 4
    return DOW[lang][(4 + d - 1) % 7];
  };

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
      <CalendarTitleBlock lang={lang} view="agenda" />
      <CalCategoryRail lang={lang} />

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 320px",
        height: 900 - 56 - 130 - 50, overflow: "hidden",
      }}>
        {/* Agenda list */}
        <div style={{ padding: "0 36px 24px", overflow: "hidden" }}>
          {days.slice(0, 4).map((day) => (
            <div key={`${day.month}-${day.d}`}>
              <AgendaDayHeader
                d={day.d}
                dow={dowFor(day.d, day.month)}
                lang={lang}
                isToday={day.month === "apr" && day.d === TODAY}
              />
              <div>
                {day.events.map((ev) => (
                  <AgendaRow key={ev.id} ev={ev} lang={lang} live={eventIsLive(ev)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar — mini month nav + happening now */}
        <aside style={{
          borderLeft: `1px dashed ${kiosk.color.rule}`,
          background: kiosk.color.paperSoft,
          padding: "24px 22px",
          overflow: "hidden",
        }}>
          {/* Mini month grid */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.wine, letterSpacing: "0.12em", marginBottom: 10 }}>
              ◆ {lang === "DE" ? "APRIL 2026" : "APRIL 2026"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontFamily: kiosk.font.mono, fontSize: 9.5 }}>
              {DOW[lang].map((d) => (
                <div key={d} style={{ color: kiosk.color.inkMute, padding: "2px 0", textAlign: "center", letterSpacing: "0.05em" }}>{d.charAt(0)}</div>
              ))}
              {/* April 2026, starts Wed */}
              {[null, null].map((_, i) => <div key={`pad${i}`} />)}
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => {
                const isToday = d === TODAY;
                const hasEvent = SEED_EVENTS.some((ev) => ev.d <= d && ev.d + ev.span - 1 >= d && ev.d <= 30);
                const eventCat = hasEvent ? SEED_EVENTS.find((ev) => ev.d <= d && ev.d + ev.span - 1 >= d && ev.d <= 30).cat : null;
                return (
                  <div key={d} style={{
                    padding: "4px 0", textAlign: "center",
                    background: isToday ? kiosk.color.wine : "transparent",
                    color: isToday ? kiosk.color.paper : kiosk.color.ink,
                    fontWeight: isToday ? 700 : 500,
                    border: isToday ? `1px solid ${kiosk.color.ink}` : "none",
                    borderRadius: isToday ? 4 : 0,
                    position: "relative",
                    cursor: "pointer",
                  }}>
                    {d}
                    {hasEvent && !isToday && (
                      <div style={{
                        width: 4, height: 4, borderRadius: "50%",
                        background: calCategory[eventCat].color,
                        margin: "1px auto 0",
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Happening now */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ochre, letterSpacing: "0.12em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: kiosk.color.ochre, border: `1px solid ${kiosk.color.ink}`,
                animation: "pulseLive 1.4s ease-in-out infinite",
              }} />
              ◆ {lang === "DE" ? "GERADE LIVE" : "LIVE NOW"}
            </div>
            <div style={{
              background: kiosk.color.paper,
              border: `2px solid ${kiosk.color.ochre}`,
              borderRadius: kiosk.r.md, padding: "12px 14px",
              boxShadow: kiosk.shadow.printSm(kiosk.color.ochre),
            }}>
              <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.plum, letterSpacing: "0.1em", marginBottom: 4 }}>
                ✦ KULTUR · {lang === "DE" ? "BIS 21:30" : "UNTIL 21:30"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginBottom: 4 }}>
                {lang === "DE" ? "Lesung · Şenocak liest aus \u201EDeutsche Schule\u201C" : "Reading · Şenocak reads from 'German School'"}
              </div>
              <div style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 11.5, color: kiosk.color.inkMute }}>
                Café Selig
              </div>
              <div style={{ marginTop: 6, fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.inkSoft }}>
                12 {lang === "DE" ? "kommen · 9 sind schon da" : "going · 9 already there"}
              </div>
            </div>
          </div>

          {/* Quick add */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.teal, letterSpacing: "0.12em", marginBottom: 8 }}>
              ◆ {lang === "DE" ? "SCHNELL HINZUFÜGEN" : "QUICK ADD"}
            </div>
            <div style={{
              background: kiosk.color.paper, border: `1.5px solid ${kiosk.color.ink}`,
              borderRadius: kiosk.r.md, padding: "8px 12px",
              fontFamily: kiosk.font.display, fontSize: 12.5, color: kiosk.color.inkMute,
              minHeight: 60, lineHeight: 1.5,
            }}>
              <span style={{ fontStyle: "italic", fontFamily: kiosk.font.serif }}>
                {lang === "DE" ? "Tippe natürlich:" : "Type naturally:"}
              </span><br/>
              <span style={{ color: kiosk.color.ink }}>
                {lang === "DE" ? "\u201EBrunch Sonntag 11 Uhr bei mir\u201C" : "\"Brunch Sunday 11am at mine\""}
              </span>
            </div>
            <div style={{ fontFamily: kiosk.font.mono, fontSize: 9.5, color: kiosk.color.inkMute, marginTop: 4, lineHeight: 1.4 }}>
              {lang === "DE" ? "wir parsen Tag, Uhrzeit & Ort." : "we parse day, time & place."}
            </div>
          </div>

          {/* Annotation */}
          <div style={{
            padding: "10px 12px", background: kiosk.color.paperWarm,
            border: `1px dashed ${kiosk.color.rule}`, borderRadius: kiosk.r.sm,
            fontFamily: kiosk.font.serif, fontStyle: "italic", fontSize: 11.5,
            color: kiosk.color.inkSoft, lineHeight: 1.5,
          }}>
            {lang === "DE"
              ? "\u201EIm Kiez heißt Termin haben: man weiß, wo man hingehen kann.\u201C"
              : "\"In the Kiez, having a date means knowing where you can go.\""}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
//  DRAG-SELECT INTERACTION (showcase artboard)
//  Click + drag across days → floating "+" tooltip
// ═════════════════════════════════════════════════════════
function CalendarDragSelectDesktop({ lang = "DE" }) {
  // Same as month grid, but with a fake selection between April 26 and 28
  const firstDayIdx = 2;
  const cells = [];
  for (let i = 0; i < firstDayIdx; i++) cells.push({ d: 30 - firstDayIdx + 1 + i, prevMonth: true });
  for (let i = 1; i <= 30; i++) cells.push({ d: i });
  let mayDay = 1;
  while (cells.length < 35) cells.push({ d: mayDay++, nextMonth: true });

  const SELECTION = { from: 26, to: 28 }; // dates in April

  return (
    <div style={{
      width: 1280, height: 900, background: kiosk.color.paper, color: kiosk.color.ink,
      fontFamily: kiosk.font.display, overflow: "hidden", position: "relative",
    }}>
      <style>{kioskFonts}</style>
      <style>{`
        @keyframes pulseLive { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.55; } }
        @keyframes dashSlide { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -16; } }
      `}</style>
      <div style={paperGrainStyle} />

      <KioskNav active="Kalender" lang={lang} />
      <CalendarTitleBlock lang={lang} view="month" />
      <CalCategoryRail lang={lang} />

      {/* Month grid with selection overlay */}
      <div style={{ padding: "0 36px 24px", height: 900 - 56 - 130 - 50, overflow: "hidden", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, paddingBottom: 4, borderBottom: `1.5px solid ${kiosk.color.ink}` }}>
          {DOW[lang].map((d, i) => (
            <div key={d} style={{
              fontFamily: kiosk.font.mono, fontSize: 10.5, letterSpacing: "0.12em",
              color: i >= 5 ? kiosk.color.wine : kiosk.color.inkMute,
              padding: "8px 8px 6px", textAlign: "left",
            }}>{d.toUpperCase()}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "1fr", height: "calc(100% - 30px)", borderLeft: `1px dashed ${kiosk.color.rule}` }}>
          {cells.map((cell, i) => {
            const isToday = !cell.prevMonth && !cell.nextMonth && cell.d === TODAY;
            const isSelected = !cell.prevMonth && !cell.nextMonth &&
              cell.d >= SELECTION.from && cell.d <= SELECTION.to;
            const isSelStart = cell.d === SELECTION.from && !cell.prevMonth;
            const isSelEnd = cell.d === SELECTION.to && !cell.prevMonth;
            return (
              <div key={i} style={{
                borderRight: `1px dashed ${kiosk.color.rule}`,
                borderBottom: `1px dashed ${kiosk.color.rule}`,
                background: isSelected
                  ? `repeating-linear-gradient(45deg, ${kiosk.color.wine}28 0 6px, ${kiosk.color.paperWarm} 6px 12px)`
                  : isToday ? kiosk.color.paperWarm : "transparent",
                borderTop: isSelected ? `2px solid ${kiosk.color.wine}` : "none",
                borderLeft: isSelStart ? `2px solid ${kiosk.color.wine}` : "none",
                borderRightStyle: isSelEnd ? "solid" : "dashed",
                borderRightColor: isSelEnd ? kiosk.color.wine : kiosk.color.rule,
                borderRightWidth: isSelEnd ? 2 : 1,
                borderBottomStyle: isSelected ? "solid" : "dashed",
                borderBottomColor: isSelected ? kiosk.color.wine : kiosk.color.rule,
                borderBottomWidth: isSelected ? 2 : 1,
                padding: "5px 6px 4px",
                opacity: cell.prevMonth || cell.nextMonth ? 0.35 : 1,
                position: "relative",
              }}>
                <span style={{
                  fontFamily: kiosk.font.display, fontSize: isToday ? 18 : 13,
                  fontWeight: isToday ? 800 : 600,
                  color: isToday ? kiosk.color.paper : kiosk.color.ink,
                  background: isToday ? kiosk.color.wine : "transparent",
                  borderRadius: isToday ? "50%" : 0,
                  width: isToday ? 26 : "auto", height: isToday ? 26 : "auto",
                  display: isToday ? "flex" : "inline",
                  alignItems: "center", justifyContent: "center",
                  border: isToday ? kiosk.border.ink : "none",
                }}>{cell.d}</span>

                {/* Selection day labels */}
                {isSelStart && (
                  <div style={{
                    position: "absolute", bottom: 4, left: 6,
                    fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.wine,
                    letterSpacing: "0.08em", fontWeight: 600,
                  }}>{lang === "DE" ? "VON" : "FROM"}</div>
                )}
                {isSelEnd && (
                  <div style={{
                    position: "absolute", bottom: 4, right: 6,
                    fontFamily: kiosk.font.mono, fontSize: 9, color: kiosk.color.wine,
                    letterSpacing: "0.08em", fontWeight: 600,
                  }}>{lang === "DE" ? "BIS" : "TO"}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating + tooltip near the selection end (positioned roughly over April 28 cell) */}
        <div style={{
          position: "absolute",
          // Cell at April 28: Tuesday of week 5 → row 4, col 1.
          // Approx: 36px padding-left + (1/7)*(1280-72) + half cell = ~211px from grid left
          // Top: header ~30px + 3 rows * cellH (cellH = (height - 30)/5)
          left: 234, top: 308,
          background: kiosk.color.ink, color: kiosk.color.paper,
          border: kiosk.border.ink,
          borderRadius: kiosk.r.md, padding: "10px 14px",
          boxShadow: kiosk.shadow.print(kiosk.color.wine),
          minWidth: 240,
          zIndex: 5,
        }}>
          {/* Tail — small triangle pointing up-left to the selection */}
          <div style={{
            position: "absolute", top: -8, left: 16,
            width: 0, height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: `8px solid ${kiosk.color.ink}`,
          }} />
          <div style={{ fontFamily: kiosk.font.mono, fontSize: 10, color: kiosk.color.ochre, letterSpacing: "0.12em", marginBottom: 4 }}>
            ◆ {lang === "DE" ? "3 TAGE AUSGEWÄHLT" : "3 DAYS SELECTED"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.01em" }}>
            {lang === "DE" ? "26.–28. April · Mo–Mi" : "Apr 26–28 · Mon–Wed"}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{
              background: kiosk.color.ochre, color: kiosk.color.ink,
              border: `1.5px solid ${kiosk.color.paper}`,
              borderRadius: kiosk.r.pill, padding: "5px 12px",
              fontFamily: kiosk.font.display, fontSize: 12, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}>+ <span>{lang === "DE" ? "neuer termin" : "new event"}</span></button>
            <button style={{
              background: "transparent", color: kiosk.color.paper,
              border: `1.5px solid ${kiosk.color.paper}`,
              borderRadius: kiosk.r.pill, padding: "5px 12px",
              fontFamily: kiosk.font.display, fontSize: 12, fontWeight: 600,
              cursor: "pointer",
            }}>{lang === "DE" ? "abbrechen" : "cancel"}</button>
          </div>
        </div>

        {/* Annotation */}
        <div style={{
          position: "absolute", top: 60, right: 50, maxWidth: 220,
          background: kiosk.color.ochre, border: kiosk.border.ink,
          borderRadius: kiosk.r.sm, padding: "10px 12px",
          boxShadow: kiosk.shadow.print(),
          transform: "rotate(2.5deg)",
          fontFamily: kiosk.font.mono, fontSize: 10.5, lineHeight: 1.45,
          color: kiosk.color.ink, zIndex: 4,
        }}>
          <b>INTERACTION</b><br/>
          mousedown on a date<br/>→ drag across days<br/>→ release shows tooltip<br/>→ "+ neuer termin" pre-fills date range.
          <br/><br/>
          <span style={{ fontFamily: kiosk.font.serif, fontStyle: "italic", fontWeight: 400 }}>
            ESC = cancel selection
          </span>
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
        <span>{lang === "DE" ? "DRAG-SELECT INTERAKTION" : "DRAG-SELECT INTERACTION"}</span>
        <span style={{ color: kiosk.color.wine }}>{lang === "DE" ? "↳ tooltip folgt der Maus, snappt an Tagesgrenzen" : "↳ tooltip follows mouse, snaps to day edges"}</span>
        <span>{lang === "DE" ? "ENTER = thema öffnen · ESC = abbrechen" : "ENTER = open form · ESC = cancel"}</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  CalendarAgendaDesktop, CalendarDragSelectDesktop,
  AgendaRow, AgendaDayHeader,
});

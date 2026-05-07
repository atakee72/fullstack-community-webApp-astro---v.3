// Calendar date / event-time helpers — pure, framework-agnostic. Used
// by EventPill (live dot), AgendaRow (live label), CalendarSidebar
// ("GERADE LIVE" card), and the live-count stat in CalendarTitleBlock.

import {
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfDay,
  endOfDay,
  differenceInCalendarDays
} from 'date-fns';
import type { Event as EventDoc } from '../../types';

export interface EventLike {
  startDate: Date | string;
  endDate: Date | string;
  allDay?: boolean;
}

function asDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

/** Event covers the calendar day `day` (inclusive on both ends). */
export function eventCoversDay(ev: EventLike, day: Date): boolean {
  const start = asDate(ev.startDate);
  const end = asDate(ev.endDate);
  // Use day-precision interval so a 14:00 → 17:00 event on `day` matches.
  return isWithinInterval(startOfDay(day), {
    start: startOfDay(start),
    end: endOfDay(end)
  });
}

/** Inclusive day-count span. Single-day → 1, multi-day → N+1. */
export function eventSpanDays(ev: EventLike): number {
  return Math.max(1, differenceInCalendarDays(asDate(ev.endDate), asDate(ev.startDate)) + 1);
}

/** True if `now` (defaults to system time) sits inside the event window. */
export function isLiveNow(ev: EventLike, now: Date = new Date()): boolean {
  const start = asDate(ev.startDate);
  const end = asDate(ev.endDate);
  // "all-day" events that ended yesterday should not show LIVE; check
  // exact timestamp boundaries here.
  return !isBefore(now, start) && !isAfter(now, end);
}

/** Event starts on `day` (the leftmost cell in a multi-day banner). */
export function isSpanStart(ev: EventLike, day: Date): boolean {
  return isSameDay(asDate(ev.startDate), day);
}

/** Event ends on `day` (the rightmost cell in a multi-day banner). */
export function isSpanEnd(ev: EventLike, day: Date): boolean {
  return isSameDay(asDate(ev.endDate), day);
}

/** Sort events by startDate ascending, then by length descending so
 * multi-day banners surface above same-day chips when stacking. */
export function sortEventsForDay(events: EventDoc[]): EventDoc[] {
  return [...events].sort((a, b) => {
    const aStart = asDate(a.startDate).getTime();
    const bStart = asDate(b.startDate).getTime();
    if (aStart !== bStart) return aStart - bStart;
    return eventSpanDays(b) - eventSpanDays(a);
  });
}

/** Aggregate stat helpers for the title-block stats row. */
export function countLiveNow(events: EventLike[], now: Date = new Date()): number {
  return events.filter((ev) => isLiveNow(ev, now)).length;
}

export function countEventsThisWeek(
  events: EventLike[],
  weekStart: Date,
  weekEnd: Date
): number {
  return events.filter((ev) => {
    const start = asDate(ev.startDate);
    const end = asDate(ev.endDate);
    // Event overlaps week if it starts before week-end AND ends after week-start
    return !isAfter(start, weekEnd) && !isBefore(end, weekStart);
  }).length;
}

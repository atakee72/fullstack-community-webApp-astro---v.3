// Where a live touch-drag's moving end lands on the phone month grid.
// Pure and dependency-free beyond date-fns, so the island can import it
// and it can be unit-tested without a DOM.
//
//   anchor        the long-pressed day (never in the past — the island
//                 refuses to arm past days before this is ever called)
//   candidate     the day under the finger, or null when the finger is
//                 off the grid / over something that is not a cell
//   today         start of today (caller passes startOfDay(new Date()))
//   visibleMonth  the month the grid shows; out-of-month cells are inert
//   prev          the current moving end (kept when the finger is off)
//
// Rules: off-grid or out-of-month → keep prev; before today → clamp to
// today (no events in the past); back on the anchor day → null, i.e. a
// single-day selection; otherwise the candidate's local midnight.
import { isSameDay, isSameMonth, startOfDay } from 'date-fns';

export function resolveDragEnd(
  anchor: Date,
  candidate: Date | null,
  today: Date,
  visibleMonth: Date,
  prev: Date | null,
): Date | null {
  if (!candidate || !isSameMonth(candidate, visibleMonth)) return prev;
  const day = startOfDay(candidate);
  const floor = startOfDay(today);
  const clamped = day < floor ? floor : day;
  return isSameDay(clamped, anchor) ? null : clamped;
}

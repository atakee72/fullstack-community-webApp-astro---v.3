// Where a live touch-drag's moving end lands on the phone month grid.
// Pure and dependency-free beyond date-fns, so the island can import it
// and it can be unit-tested without a DOM.
//
//   anchor        the long-pressed day (never in the past — the island
//                 refuses to arm past days before this is ever called)
//   candidate     the day under the finger, or null when the finger is
//                 off the grid / over something that is not a cell
//   today         start of today (caller passes startOfDay(new Date()))
//   prev          the current moving end (kept when the finger is off)
//
// Rules: off-grid → keep prev; before today → clamp to today (no events
// in the past); back on the anchor day → null, i.e. a single-day
// selection; otherwise the candidate's local midnight. The grid's greyed
// out-of-month cells count like any other day (user decision 2026-09-12,
// parity with the desktop mouse drag) — a range may spill into the
// neighbouring month.
import { isSameDay, startOfDay } from 'date-fns';

export function resolveDragEnd(
  anchor: Date,
  candidate: Date | null,
  today: Date,
  prev: Date | null,
): Date | null {
  if (!candidate) return prev;
  const day = startOfDay(candidate);
  const floor = startOfDay(today);
  const clamped = day < floor ? floor : day;
  return isSameDay(clamped, anchor) ? null : clamped;
}

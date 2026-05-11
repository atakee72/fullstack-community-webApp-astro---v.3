/**
 * Calendar "now" ticker — a readable store of the current Date that
 * updates every 60 seconds while any component is subscribed.
 *
 * Pass `$now` as the second arg to `isLiveNow(ev, $now)` (and similar
 * time-bounded helpers) so the live dot / live-event card / live count
 * appear and disappear when an event's window opens or closes, even
 * if the user just sits on the page.
 *
 * The `readable` lifecycle handles start/stop automatically: the
 * setInterval runs only while there's at least one subscriber, and
 * is cleared as soon as the last one unmounts. Cheap, isolated, easy
 * to remove if it ever feels like overkill.
 */

import { readable } from 'svelte/store';

const TICK_MS = 60_000;

export const now = readable<Date>(new Date(), (set) => {
  // Align to the next wall-clock minute so the tick fires close to
  // "01.5 seconds past XX:01:00" instead of drifting an arbitrary
  // amount off-clock. Visual consistency on the live dot is the goal.
  const initial = new Date();
  const msToNextMinute = TICK_MS - (initial.getSeconds() * 1000 + initial.getMilliseconds());

  let intervalId: ReturnType<typeof setInterval> | null = null;

  const timeoutId = setTimeout(() => {
    set(new Date());
    intervalId = setInterval(() => set(new Date()), TICK_MS);
  }, msToNextMinute);

  return () => {
    clearTimeout(timeoutId);
    if (intervalId !== null) clearInterval(intervalId);
  };
});

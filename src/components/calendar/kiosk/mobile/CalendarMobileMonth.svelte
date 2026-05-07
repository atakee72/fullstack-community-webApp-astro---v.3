<script lang="ts">
  // Mobile month view — replaces the desktop CalendarTitleBlock +
  // CalCategoryRail + CalendarMonthGrid stack on viewports below `lg`.
  // Per CD's mock at `kiosk-calendar-flows.jsx:716–828`:
  //   compact stat-line title + tiny `+` disc CTA + horizontal-scroll
  //   filter rail + dot-only mini grid + day-detail bottom panel.
  //
  // Pure presentation: state still owned by CalendarPageInner.
  // Internal state: `selectedDay` (drives the bottom panel; defaults
  // to today; updates on cell tap).

  import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday as isTodayDate,
    isBefore,
    startOfDay,
    format
  } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';

  import { CATEGORIES, CATEGORY_ORDER } from '../../../../lib/calendar/categories';
  import {
    eventCoversDay,
    isLiveNow,
    sortEventsForDay
  } from '../../../../lib/calendar/eventTime';
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import type { EventCategory, Event as EventDoc } from '../../../../types';
  import DragSelectPin from '../DragSelectPin.svelte';

  let {
    visibleMonth = new Date(),
    events = [],
    active,
    onToggleCat,
    onPickEvent,
    onPrevMonth,
    onNextMonth,
    prevMonthLabel = '',
    nextMonthLabel = '',
    weekEvents = 0,
    liveCount = 0
  } = $props<{
    visibleMonth?: Date;
    events?: EventDoc[];
    active: Set<EventCategory>;
    onToggleCat: (cat: EventCategory) => void;
    onPickEvent?: (ev: EventDoc) => void;
    onPrevMonth?: () => void;
    onNextMonth?: () => void;
    prevMonthLabel?: string;
    nextMonthLabel?: string;
    weekEvents?: number;
    liveCount?: number;
  }>();

  let selectedDay = $state(new Date());

  // ─── Range-select state-machine ───────────────────────────────────
  // Ported 1:1 from origin/main:CalendarContainer.tsx:305 (handleDateClick)
  // — long-press arms range, next plain tap commits, plain tap on a
  // third day clears the range, long-press anywhere restarts.
  let rangeStart = $state<Date | null>(null);
  let rangeEnd = $state<Date | null>(null);
  let isRangeArmed = $state(false);
  let pulseCellKey = $state<string | null>(null);
  let pin = $state<{ x: number; y: number; from: Date; to: Date } | null>(null);

  // Non-reactive locals — internal flags only.
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressFired = false;
  let gridWrapper: HTMLDivElement | undefined = $state();

  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  // 1:1 port of the legacy state machine (RANGED → ANCHORED on plain
  // tap, long-press always re-anchors + arms, etc).
  function handleDateTap(date: Date, viaLongPress: boolean) {
    const isPast = isBefore(startOfDay(date), startOfDay(new Date()));

    // Always update the bottom-panel day.
    selectedDay = date;

    // Past date: clear all selection state. Bottom panel still shows
    // events for that day (above), but no range can start in the past.
    if (isPast) {
      rangeStart = null;
      rangeEnd = null;
      isRangeArmed = false;
      return;
    }

    const hasRange = !!(rangeStart && rangeEnd);
    const sameAsAnchor = rangeStart && isSameDay(date, rangeStart);

    // Long-press always re-anchors + arms.
    if (viaLongPress) {
      rangeStart = date;
      rangeEnd = null;
      isRangeArmed = true;
      return;
    }

    // RANGED state — plain tap clears range, anchors at D.
    if (hasRange) {
      rangeStart = date;
      rangeEnd = null;
      isRangeArmed = false;
      return;
    }

    // ANCHORED(-armed) + tap on the same day → no-op.
    if (sameAsAnchor) return;

    // ARMED + plain tap on a different day → form the range.
    if (rangeStart && isRangeArmed) {
      if (isBefore(date, rangeStart)) {
        rangeEnd = rangeStart;
        rangeStart = date;
      } else {
        rangeEnd = date;
      }
      isRangeArmed = false;
      return;
    }

    // IDLE / ANCHORED + plain tap on a different day → move/set anchor.
    rangeStart = date;
    rangeEnd = null;
    isRangeArmed = false;
  }

  function cellPointerDown(e: PointerEvent, date: Date, isInMonth: boolean) {
    longPressFired = false;
    if (e.pointerType !== 'touch' || !isInMonth) return;
    clearLongPress();
    longPressTimer = setTimeout(() => {
      longPressFired = true;
      if ('vibrate' in navigator) {
        try { navigator.vibrate([30, 30, 30]); } catch { /* ignore */ }
      }
      pulseCellKey = date.toISOString();
      setTimeout(() => (pulseCellKey = null), 400);
      // Commit IN the timer — iOS Safari swallows the post-long-press
      // synthetic click, so onclick won't fire reliably.
      handleDateTap(date, true);
    }, 450);
  }

  function cellClick(e: MouseEvent, date: Date, isInMonth: boolean) {
    if (longPressFired) {
      // Android sometimes still fires a click after the long-press
      // timer commits — swallow it so we don't double-trigger.
      longPressFired = false;
      e.preventDefault();
      return;
    }
    if (!isInMonth) return;
    handleDateTap(date, false);
  }

  // Pin positioning — when rangeStart/rangeEnd change, look up the
  // target cell's bounds and stash the pin's x/y. Cells expose a
  // `data-cell-date={cell.toISOString()}` attribute below. Coordinates
  // are clamped to the wrapper rect so the pin never bleeds past the
  // viewport edges (left/right) and flips above the cell when the
  // cell sits in the bottom half of the grid (else the pin would
  // render below the visible area).
  // Conservative width estimate so the pin always fits inside the
  // grid wrapper. Min-width is 180 but the rendered card grows to
  // ~220 with the '+ neuer termin' + 'abbrechen' buttons inside.
  const PIN_W = 230;
  const PIN_H = 100;
  $effect(() => {
    if (!rangeStart || !gridWrapper) {
      pin = null;
      return;
    }
    const target = rangeEnd ?? rangeStart;
    const sel = `[data-cell-date="${target.toISOString()}"]`;
    const cell = gridWrapper.querySelector<HTMLElement>(sel);
    if (!cell) return;
    const cellRect = cell.getBoundingClientRect();
    const wrapRect = gridWrapper.getBoundingClientRect();

    const lo = rangeEnd && rangeStart < rangeEnd ? rangeStart : (rangeEnd ?? rangeStart);
    const hi = rangeEnd && rangeStart < rangeEnd ? rangeEnd : rangeStart;

    // Horizontal clamp — keep [8 .. wrapRect.width − PIN_W − 8].
    const ideal = cellRect.left - wrapRect.left + cellRect.width / 2 - PIN_W / 2;
    const x = Math.max(8, Math.min(wrapRect.width - PIN_W - 8, ideal));

    // Vertical placement — by default below the cell. If the cell
    // sits in the bottom half of the grid, flip ABOVE so the pin
    // doesn't fall off the visible area.
    const cellTopRel = cellRect.top - wrapRect.top;
    const cellBottomRel = cellRect.bottom - wrapRect.top;
    const wouldOverflowDown = cellBottomRel + 8 + PIN_H > wrapRect.height;
    const y = wouldOverflowDown
      ? Math.max(8, cellTopRel - PIN_H - 8)
      : cellBottomRel + 8;

    pin = { x, y, from: lo, to: hi };
  });

  function clearSelection() {
    rangeStart = null;
    rangeEnd = null;
    isRangeArmed = false;
    pin = null;
  }

  function confirmPin() {
    if (!pin) return;
    const fromIso = format(pin.from, 'yyyy-MM-dd');
    const toIso = format(pin.to, 'yyyy-MM-dd');
    if (typeof window !== 'undefined') {
      window.location.href = `/events/create?from=${fromIso}&to=${toIso}`;
    }
    clearSelection();
  }

  // Helpers used by the cell template.
  function inCommittedRange(date: Date): boolean {
    if (!rangeStart || !rangeEnd) return false;
    const lo = rangeStart < rangeEnd ? rangeStart : rangeEnd;
    const hi = rangeStart < rangeEnd ? rangeEnd : rangeStart;
    return date >= lo && date <= hi;
  }
  function isEndpoint(date: Date): boolean {
    return (
      (rangeStart != null && isSameDay(rangeStart, date)) ||
      (rangeEnd != null && isSameDay(rangeEnd, date))
    );
  }
  function isArmedAnchor(date: Date): boolean {
    return !!(isRangeArmed && rangeStart && isSameDay(rangeStart, date));
  }

  const dateLocale = $derived($locale === 'de' ? deLocale : enUS);

  // Single-letter DOW labels (Mon-start) — same pattern as the desktop
  // grid, just narrowed.
  const DOW_NARROW_DE = ['M', 'D', 'M', 'D', 'F', 'S', 'S'];
  const DOW_NARROW_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dowLabels = $derived($locale === 'de' ? DOW_NARROW_DE : DOW_NARROW_EN);

  // Short labels for the bottom-panel kicker (`MO`, `DI`, … / `MON`, `TUE`, …).
  const DOW_SHORT_DE = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
  const DOW_SHORT_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const gridStart = $derived(
    startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 })
  );
  const gridEnd = $derived(
    endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 })
  );
  const cells = $derived(eachDayOfInterval({ start: gridStart, end: gridEnd }));
  const rows = $derived(Math.ceil(cells.length / 7));

  const monthKicker = $derived(
    format(visibleMonth, 'MMMM yyyy', { locale: dateLocale }).toUpperCase()
  );

  const titleText = $derived(
    ($t['cal.mobile.thisWeek'] as string).replace('{n}', String(weekEvents))
  );

  // Bottom-panel data
  const dayEvents = $derived(
    sortEventsForDay(events.filter((ev) => eventCoversDay(ev, selectedDay)))
  );
  const dayIsToday = $derived(isTodayDate(selectedDay));

  const dayKicker = $derived.by(() => {
    const dowArr = $locale === 'de' ? DOW_SHORT_DE : DOW_SHORT_EN;
    const dow = dowArr[selectedDay.getDay()];
    const d = selectedDay.getDate();
    const month = format(selectedDay, 'MMMM', { locale: dateLocale }).toUpperCase();
    if (dayIsToday) {
      return `◆ ${$t['cal.cell.today']} · ${dow} ${d}. ${month}`;
    }
    return `◆ ${dow} ${d}. ${month}`;
  });

  function liveLine(n: number): string {
    return ($t['cal.footer.live'] as string).replace('{n}', String(n));
  }

  // Pre-fill /events/create with the currently-selected day so tapping
  // the `+` disc after browsing a future date drops the user into the
  // compose form already set to that day.
  const createHref = $derived.by(() => {
    const iso = format(selectedDay, 'yyyy-MM-dd');
    return `/events/create?from=${iso}&to=${iso}`;
  });
</script>

<div class="lg:hidden">
  <!-- Header strip — kicker + stat title + tiny `+` disc CTA -->
  <header
    class="flex justify-between items-end gap-3 px-4 pt-3 pb-2 border-b border-dashed border-rule"
  >
    <div class="min-w-0">
      <div class="font-dmmono text-[9.5px] uppercase tracking-[0.1em] text-wine">
        ◆ {monthKicker}
      </div>
      <div class="font-bricolage font-extrabold text-[22px] tracking-[-0.025em] mt-0.5 leading-[1.1]">
        {titleText}
      </div>
    </div>
    <a
      href={createHref}
      aria-label={$t['cal.mobile.cta.aria']}
      class="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-ink text-paper border-2 border-ink font-bricolage font-bold text-[20px] sm:text-[22px] leading-none shadow-[3px_3px_0_var(--k-wine,#b23a5b)] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_var(--k-wine,#b23a5b)] transition-[transform,box-shadow] duration-[120ms] ease-out shrink-0"
    >+</a>
  </header>

  <!-- Filter rail — own compact render of the 6 category pills,
       horizontally scrollable (overflow-x-auto + flex-shrink-0).
       Scrollbar hidden via the `.no-scrollbar` rule below — the
       category-color cues are enough; an extra scrollbar is noise. -->
  <div
    class="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-2.5 border-b border-dashed border-rule"
  >
    {#each CATEGORY_ORDER as cat (cat)}
      {@const style = CATEGORIES[cat]}
      {@const on = active.has(cat)}
      <button
        type="button"
        onclick={() => onToggleCat(cat)}
        aria-pressed={on}
        class={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bricolage font-semibold text-[11px] border-[1.5px] transition-colors flex-shrink-0 ${
          on
            ? `${style.bgClass} ${style.borderClass} ${style.textOnFill}`
            : `bg-transparent ${style.borderClass} ${style.textClass}`
        }`}
      >
        <span aria-hidden="true">{style.glyph}</span>
        <span>{$t[`cal.cat.${cat}.label` as const]}</span>
      </button>
    {/each}
  </div>

  <!-- Mini dot-grid -->
  <div class="px-2 pt-2 relative" bind:this={gridWrapper}>
    <div class="grid grid-cols-7 border-b border-ink">
      {#each dowLabels as label, i (label + '-' + i)}
        <div
          class={`font-dmmono text-[10px] uppercase tracking-[0.1em] py-1.5 text-center ${
            i >= 5 ? 'text-wine' : 'text-ink-mute'
          }`}
        >
          {label}
        </div>
      {/each}
    </div>
    <div
      class="grid grid-cols-7"
      style:grid-template-rows={`repeat(${rows}, minmax(52px, 1fr))`}
      style:touch-action="manipulation"
    >
      {#each cells as cell, i (cell.toISOString())}
        {@const inMonth = isSameMonth(cell, visibleMonth)}
        {@const today = isTodayDate(cell)}
        {@const selected = isSameDay(cell, selectedDay)}
        {@const inRange = inCommittedRange(cell)}
        {@const endpoint = isEndpoint(cell)}
        {@const armed = isArmedAnchor(cell)}
        {@const pulsing = pulseCellKey === cell.toISOString()}
        {@const cellEvents = sortEventsForDay(
          events.filter((ev) => eventCoversDay(ev, cell))
        ).slice(0, 3)}
        <button
          type="button"
          data-cell-date={cell.toISOString()}
          onclick={(e) => cellClick(e, cell, inMonth)}
          onpointerdown={(e) => cellPointerDown(e, cell, inMonth)}
          onpointerup={clearLongPress}
          onpointercancel={clearLongPress}
          onpointerleave={clearLongPress}
          disabled={!inMonth}
          class={`flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
            inRange ? 'bg-wine/10' : selected && !today && !armed ? 'bg-wine/10' : ''
          } ${pulsing ? 'longpress-pulse' : ''} ${inMonth ? '' : 'opacity-35'} disabled:cursor-default`}
        >
          <span
            class={`flex items-center justify-center text-[13px] ${
              today || endpoint
                ? 'w-7 h-7 rounded-full bg-wine border-2 border-ink font-extrabold text-paper'
                : armed
                ? 'w-7 h-7 rounded-full bg-paper border-2 border-wine font-extrabold text-wine'
                : 'font-medium text-ink'
            }`}
          >
            {cell.getDate()}
          </span>
          <span class="flex gap-0.5 h-1 items-center">
            {#each cellEvents as ev (String(ev._id) + cell.toISOString())}
              {@const cellCat = (ev.category ?? 'kiez') as EventCategory}
              <span
                class={`w-1 h-1 rounded-full ${CATEGORIES[cellCat].bgClass}`}
                aria-hidden="true"
              ></span>
            {/each}
          </span>
        </button>
      {/each}
    </div>

    {#if pin}
      <DragSelectPin
        x={pin.x}
        y={pin.y}
        from={pin.from}
        to={pin.to}
        onConfirm={confirmPin}
        onCancel={clearSelection}
      />
    {/if}
  </div>

  <!-- Usage guidance — small italic note explaining tap vs long-press. -->
  <p
    class="px-4 mt-3 font-instrument italic text-[12px] text-ink-mute leading-[1.5]"
  >
    {$t['cal.mobile.guidance']}
  </p>

  <!-- Bottom day panel -->
  <div class="px-4 pt-4 mt-2 border-t-[1.5px] border-ink">
    <div class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-wine mb-2">
      {dayKicker}
    </div>
    {#if dayEvents.length === 0}
      <p class="font-instrument italic text-[14px] text-ink-mute py-3">
        {$t['cal.mobile.dayEmpty']}
      </p>
    {:else}
      <ul class="m-0 p-0 list-none">
        {#each dayEvents as ev (String(ev._id))}
          {@const live = isLiveNow(ev)}
          {@const start = ev.startDate instanceof Date ? ev.startDate : new Date(ev.startDate)}
          <li class="border-b border-dashed border-rule">
            <button
              type="button"
              onclick={() => onPickEvent?.(ev)}
              class="grid grid-cols-[44px_1fr] gap-2 py-2 w-full text-left items-start"
            >
              <span
                class={`font-dmmono text-[11px] font-semibold pt-0.5 ${
                  live ? 'text-wine' : 'text-ink'
                }`}
              >
                {ev.allDay
                  ? $t['cal.allDay']
                  : format(start, 'HH:mm', { locale: dateLocale })}
              </span>
              <div class="min-w-0">
                <div class="font-bricolage font-bold text-[13px] leading-[1.2] truncate">
                  {ev.title}
                </div>
                {#if ev.location}
                  <div class="font-instrument italic text-[11px] text-ink-mute truncate">
                    {ev.location}
                  </div>
                {/if}
              </div>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Footer month-nav -->
  {#if onPrevMonth || onNextMonth}
    <div
      class="mx-4 mt-4 pt-2 pb-4 flex justify-between items-center font-dmmono text-[10px] uppercase tracking-[0.05em] text-ink-mute border-t border-dashed border-rule"
    >
      <button type="button" onclick={onPrevMonth} class="hover:text-ink transition-colors">
        ← {prevMonthLabel}
      </button>
      <span class="text-wine">{liveLine(liveCount)}</span>
      <button type="button" onclick={onNextMonth} class="hover:text-ink transition-colors">
        {nextMonthLabel} →
      </button>
    </div>
  {/if}
</div>

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
  import { scrollFade } from '../../../../lib/scrollFade';
  import {
    eventCoversDay,
    isLiveNow,
    sortEventsForDay
  } from '../../../../lib/calendar/eventTime';
  import { now } from '../../../../lib/calendar/nowTicker';
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import { rsvpMutation } from '../../../../lib/calendarMutations';
  import { showError } from '../../../../utils/toast';
  import type { EventCategory, Event as EventDoc } from '../../../../types';
  import DragSelectPin from '../DragSelectPin.svelte';

  type View = 'month' | 'agenda' | 'day';

  let {
    visibleMonth = new Date(),
    events = [],
    active,
    onToggleCat,
    onPickEvent,
    onPrevMonth,
    onNextMonth,
    liveCount = 0,
    currentUserId = null,
    showToday = false,
    onToday,
    myRsvps = false,
    saved = false,
    onMyRsvps,
    onSaved,
    view = 'month',
    onView
  } = $props<{
    visibleMonth?: Date;
    events?: EventDoc[];
    active: Set<EventCategory>;
    onToggleCat: (cat: EventCategory) => void;
    onPickEvent?: (ev: EventDoc) => void;
    onPrevMonth?: () => void;
    onNextMonth?: () => void;
    liveCount?: number;
    currentUserId?: string | null;
    showToday?: boolean;
    onToday?: () => void;
    myRsvps?: boolean;
    saved?: boolean;
    onMyRsvps?: () => void;
    onSaved?: () => void;
    view?: View;
    onView?: (v: View) => void;
  }>();

  const views: { k: View; label: () => string }[] = [
    { k: 'month',  label: () => $t['cal.view.month']  },
    { k: 'agenda', label: () => $t['cal.view.agenda'] },
    { k: 'day',    label: () => $t['cal.view.day']    }
  ];

  // RSVP toggle for the day-panel rows. Mutation is bound to the
  // current user id at component init; clicking +/✓ on a row flips
  // between 'going' and 'cancel'. Logged-out users see no button.
  const rsvp = rsvpMutation(currentUserId ?? '__anon__');

  function isGoing(ev: EventDoc): boolean {
    if (!currentUserId) return false;
    const arr = (ev.rsvps?.going ?? []).map(String);
    return arr.includes(currentUserId);
  }

  function toggleRsvp(ev: EventDoc) {
    if (!currentUserId) return;
    const eventId = String(ev._id);
    const next: 'going' | 'cancel' = isGoing(ev) ? 'cancel' : 'going';
    rsvp.mutate(
      { eventId, status: next },
      {
        onError: (err) => {
          showError(err instanceof Error ? err.message : 'RSVP fehlgeschlagen.');
        }
      }
    );
  }

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

  // Hero header derivations.
  // - todayKicker: today's full date label (e.g., "MITTWOCH 6. MAI").
  //   Reads from $now so it ticks across midnight without a refresh.
  // - timeNow: live wall-clock "HH:mm", same $now ticker.
  // - italicMonth / visibleYear: split for the italic-serif + bold pair.
  const todayKicker = $derived(
    format($now, 'EEEE d. MMM', { locale: dateLocale }).toUpperCase()
  );
  const timeNow = $derived(format($now, 'HH:mm'));
  const italicMonth = $derived(format(visibleMonth, 'MMMM', { locale: dateLocale }));
  const visibleYear = $derived(format(visibleMonth, 'yyyy'));
  const visibleMonthLabel = $derived(
    format(visibleMonth, 'MMMM yyyy', { locale: dateLocale }).toUpperCase()
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

</script>

<div class="lg:hidden">
  <!-- Hero: today+time kicker · italic month + bold year · prev/next
       arrow steppers · month stats line. FAB moved to a fixed
       bottom-right element at the end of the component. -->
  <header class="px-4 pt-5 pb-3 border-b border-dashed border-rule">
    <div class="font-dmmono text-[10px] uppercase tracking-[0.1em] text-teal mb-2">
      {todayKicker} · {timeNow}
    </div>

    <!-- Hero title (mirrors the desktop CalendarTitleBlock H1). -->
    <h1
      class="font-bricolage font-extrabold text-ink leading-[0.95] tracking-tight mt-6 text-[40px] md:text-[48px]"
    >
      {$t['cal.title.q1']}
      <span class="font-instrument italic font-normal text-teal">
        {$t['cal.title.q2']}
      </span>
      {$t['cal.title.q3']}
    </h1>

    <!-- Combined month stepper: ‹ {Mai} {2026} › — italic teal month +
         bold year inside the same pill as the prev/next buttons. -->
    <div class="flex items-center justify-end gap-2 mt-5">
      <div
        class="inline-flex items-center border-[1.5px] border-ink rounded-full overflow-hidden font-dmmono text-[11px] font-semibold leading-none"
      >
        <button
          type="button"
          onclick={onPrevMonth}
          aria-label={$t['cal.nav.prevMonth.aria']}
          class="px-2.5 py-1 hover:bg-paper-warm transition-colors"
        >‹</button>
        <span
          class="px-3 py-1 border-l-[1.5px] border-r-[1.5px] border-ink uppercase tracking-[0.05em]"
        >
          {visibleMonthLabel}
        </span>
        <button
          type="button"
          onclick={onNextMonth}
          aria-label={$t['cal.nav.nextMonth.aria']}
          class="px-2.5 py-1 hover:bg-paper-warm transition-colors"
        >›</button>
      </div>
      {#if showToday}
        <button
          type="button"
          onclick={onToday}
          class="inline-flex items-center px-3 py-1.5 rounded-full border-[1.5px] border-ink font-dmmono text-[10px] uppercase tracking-[0.06em] hover:bg-paper-warm transition-colors shrink-0"
        >
          {$t['cal.cell.today']}
        </button>
      {/if}
    </div>

    <div class="flex items-center justify-between gap-3 mt-3">
      <div class="font-dmmono text-[11px] text-ink-mute">
        <b class="text-ink">{events.length}</b> {$t['cal.mobile.statsMonthEvents']}
        {#if liveCount > 0}
          · <b class="text-ochre">{liveCount}</b> {$t['cal.mobile.statsLiveNow']}
        {/if}
      </div>
      <div
        class="inline-flex border-2 border-ink rounded-full overflow-hidden font-dmmono text-[12px] font-semibold shrink-0"
        role="tablist"
        aria-label="View"
      >
        {#each views as v, i (v.k)}
          <button
            type="button"
            role="tab"
            aria-selected={view === v.k}
            onclick={() => onView?.(v.k)}
            class="px-3 py-1 transition-colors {
              view === v.k ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-warm'
            } {i > 0 ? 'border-l-2 border-ink' : ''}"
          >
            {v.label()}
          </button>
        {/each}
      </div>
    </div>
  </header>

  <!-- Filter rail — own compact render of the 6 category pills,
       horizontally scrollable (overflow-x-auto + flex-shrink-0).
       Scrollbar hidden via the `.no-scrollbar` rule below — the
       category-color cues are enough; an extra scrollbar is noise. -->
  <div
    use:scrollFade
    class="kiosk-scroll-fade no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-2.5 border-b border-dashed border-rule"
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

    <span class="w-px h-[18px] bg-rule mx-1 shrink-0" aria-hidden="true"></span>

    <button
      type="button"
      onclick={onMyRsvps}
      aria-pressed={myRsvps}
      class={`inline-flex items-center px-2 py-0.5 rounded-full font-bricolage font-semibold text-[11px] border-[1.5px] border-ink transition-colors flex-shrink-0 ${
        myRsvps ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-warm'
      }`}
    >
      {$t['cal.filter.myRsvps']}
    </button>

    <button
      type="button"
      onclick={onSaved}
      aria-pressed={saved}
      class={`inline-flex items-center px-2 py-0.5 rounded-full font-bricolage font-semibold text-[11px] border-[1.5px] border-ink transition-colors flex-shrink-0 ${
        saved ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-warm'
      }`}
    >
      {$t['cal.filter.saved']}
    </button>
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
    <div class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-teal mb-2">
      {dayKicker}
    </div>
    {#if dayEvents.length === 0}
      <p class="font-instrument italic text-[14px] text-ink-mute py-3">
        {$t['cal.mobile.dayEmpty']}
      </p>
    {:else}
      <ul class="m-0 p-0 list-none">
        {#each dayEvents as ev (String(ev._id))}
          {@const live = isLiveNow(ev, $now)}
          {@const start = ev.startDate instanceof Date ? ev.startDate : new Date(ev.startDate)}
          {@const going = isGoing(ev)}
          <li class="flex items-center gap-2 border-b border-dashed border-rule">
            <button
              type="button"
              onclick={() => onPickEvent?.(ev)}
              class="flex-1 min-w-0 grid grid-cols-[44px_1fr] gap-2 py-2 text-left items-start"
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

            {#if currentUserId}
              <button
                type="button"
                onclick={() => toggleRsvp(ev)}
                aria-pressed={going}
                aria-label={going ? $t['cal.mobile.rsvp.cancel.aria'] : $t['cal.mobile.rsvp.going.aria']}
                class={`shrink-0 w-9 h-9 rounded-full border-[1.5px] border-ink flex items-center justify-center font-bricolage font-bold text-[16px] leading-none transition-colors ${
                  going ? 'bg-moss text-paper' : 'bg-paper text-ink hover:bg-paper-warm'
                }`}
              >
                {going ? '✓' : '+'}
              </button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>

</div>

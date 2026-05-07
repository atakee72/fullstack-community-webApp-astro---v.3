<script lang="ts">
  // Month grid — Editorial Kiosk treatment.
  //
  // Dynamic 5- or 6-row layout: real months sometimes need 6 rows
  // (e.g. a 31-day month starting on Sunday). CD's JSX hardcodes 35
  // because the artboard targets one specific month — we compute the
  // row count via date-fns instead.
  //
  // Each event renders as a colored pill in every cell it spans, with
  // span-start/mid/end flags driving border-radius + side borders so
  // multi-day events read as a continuous banner across cells. The
  // negative-margin trick (`-mr-px`) eliminates the 1px gap between
  // adjacent cell borders so the banner is unbroken.
  //
  // Drag-select pointer-events land in Phase 4. For Phase 3 cells are
  // click-only (event-pill clicks bubble to parent's `onPickEvent`).

  import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isToday as isTodayDate,
    getDay
  } from 'date-fns';

  import EventPill from './EventPill.svelte';
  import {
    eventCoversDay,
    isLiveNow,
    isSpanStart,
    isSpanEnd,
    sortEventsForDay
  } from '../../../lib/calendar/eventTime';
  import { t, locale } from '../../../lib/kiosk-i18n';
  import type { Event as EventDoc } from '../../../types';

  let {
    visibleMonth = new Date(),
    events = [],
    onPickEvent
  } = $props<{
    visibleMonth?: Date;
    events?: EventDoc[];
    onPickEvent?: (ev: EventDoc) => void;
  }>();

  // Day-of-week labels — short, locale-specific. Hardcoded (matches
  // CD's JSX `DOW[lang]`); a date-fns `format(d, 'EEEEEE')` route would
  // be locale-pure but loses our period-free DE convention ("Mo" not "Mo.").
  const DOW_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const DOW_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dowLabels = $derived($locale === 'de' ? DOW_DE : DOW_EN);

  const gridStart = $derived(
    startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 })
  );
  const gridEnd = $derived(
    endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 })
  );
  const cells = $derived(eachDayOfInterval({ start: gridStart, end: gridEnd }));
  const rows = $derived(Math.ceil(cells.length / 7));

  function isWeekend(d: Date): boolean {
    // getDay: 0 = Sun, 6 = Sat — both are weekend.
    const g = getDay(d);
    return g === 0 || g === 6;
  }
</script>

<div class="px-4 md:px-9 lg:px-10 pb-6">
  <!-- DOW header -->
  <div
    class="grid grid-cols-7 border-b-[1.5px] border-ink"
    role="row"
  >
    {#each dowLabels as label, i (label)}
      <div
        class={`font-dmmono text-[10.5px] uppercase tracking-[0.12em] py-2 px-2 ${
          i >= 5 ? 'text-wine' : 'text-ink-mute'
        }`}
        role="columnheader"
      >
        {label}
      </div>
    {/each}
  </div>

  <!-- Grid cells -->
  <div
    class="grid grid-cols-7 border-l border-dashed border-rule"
    style:grid-template-rows={`repeat(${rows}, minmax(96px, 1fr))`}
    role="rowgroup"
  >
    {#each cells as cell, i (cell.toISOString())}
      {@const inMonth = isSameMonth(cell, visibleMonth)}
      {@const today = isTodayDate(cell)}
      {@const weekend = isWeekend(cell)}
      {@const dayEvents = sortEventsForDay(events.filter((ev) => eventCoversDay(ev, cell))).slice(0, 3)}
      {@const overflow = events.filter((ev) => eventCoversDay(ev, cell)).length - dayEvents.length}
      <div
        class={`relative border-r border-b border-dashed border-rule p-1.5 overflow-hidden flex flex-col gap-1 ${
          today ? 'bg-paper-warm' : weekend ? 'bg-wine/[0.025]' : ''
        } ${inMonth ? '' : 'opacity-35'}`}
        role="gridcell"
      >
        <!-- Date number row -->
        <div class="flex items-center justify-between">
          <span
            class={`font-bricolage tracking-[-0.02em] ${
              today
                ? 'inline-flex items-center justify-center w-[26px] h-[26px] rounded-full bg-wine text-paper border border-ink font-extrabold text-[18px]'
                : 'font-semibold text-[13px] text-ink'
            }`}
          >
            {cell.getDate()}
          </span>
          {#if today}
            <span class="font-dmmono text-[9px] tracking-[0.1em] text-wine">
              {$t['cal.cell.today']}
            </span>
          {/if}
        </div>

        <!-- Event pills -->
        <div class="flex flex-col gap-[2px] min-w-0">
          {#each dayEvents as ev (String(ev._id) + cell.toISOString())}
            {@const sStart = isSpanStart(ev, cell)}
            {@const sEnd = isSpanEnd(ev, cell)}
            {@const sMid = !sStart && !sEnd}
            <EventPill
              {ev}
              spanStart={sStart}
              spanMid={sMid}
              spanEnd={sEnd}
              isLive={isLiveNow(ev)}
              onclick={() => onPickEvent?.(ev)}
            />
          {/each}
          {#if overflow > 0}
            <span class="font-dmmono text-[9.5px] text-ink-mute px-1">
              + {overflow} {$t['cal.events.more']}
            </span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

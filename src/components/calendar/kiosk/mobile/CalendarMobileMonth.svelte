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

  function onCellTap(day: Date, isInMonth: boolean) {
    if (!isInMonth) return;
    selectedDay = day;
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
  <div class="px-2 pt-2">
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
    >
      {#each cells as cell, i (cell.toISOString())}
        {@const inMonth = isSameMonth(cell, visibleMonth)}
        {@const today = isTodayDate(cell)}
        {@const selected = isSameDay(cell, selectedDay)}
        {@const cellEvents = sortEventsForDay(
          events.filter((ev) => eventCoversDay(ev, cell))
        ).slice(0, 3)}
        <button
          type="button"
          onclick={() => onCellTap(cell, inMonth)}
          disabled={!inMonth}
          class={`flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
            selected && !today ? 'bg-wine/10' : ''
          } ${inMonth ? '' : 'opacity-35'} disabled:cursor-default`}
        >
          <span
            class={`flex items-center justify-center text-[13px] ${
              today
                ? 'w-7 h-7 rounded-full bg-wine border-2 border-ink font-extrabold text-paper'
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
  </div>

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

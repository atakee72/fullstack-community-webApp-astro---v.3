<script lang="ts">
  // Day view — single-day list of events. Reuses AgendaDayHeader +
  // AgendaRow so the visual treatment matches the agenda view.
  // Prev/next day nav at the bottom mirrors the month-grid footer.

  import { addDays, subDays, format, isToday as isTodayDate, isSameDay } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';

  import AgendaDayHeader from './AgendaDayHeader.svelte';
  import AgendaRow from './AgendaRow.svelte';
  import CalendarSidebar from './CalendarSidebar.svelte';

  import { eventCoversDay, isLiveNow } from '../../../lib/calendar/eventTime';
  import { now } from '../../../lib/calendar/nowTicker';
  import { CATEGORIES } from '../../../lib/calendar/categories';
  import { t, locale } from '../../../lib/kiosk-i18n';
  import type { Event as EventDoc, EventCategory } from '../../../types';

  let {
    events = [],
    onPickEvent,
    onRsvp,
    savedIds = new Set<string>(),
    onToggleSave,
    currentUserId = null,
    initialDay,
    onDayChange
  } = $props<{
    events?: EventDoc[];
    onPickEvent?: (ev: EventDoc) => void;
    onRsvp?: (ev: EventDoc) => void;
    savedIds?: Set<string>;
    onToggleSave?: (eventId: string) => void;
    currentUserId?: string | null;
    initialDay?: Date;
    // Fired on every internal day step so the parent can keep the header
    // month stepper (and the events query range) in sync when the user
    // crosses a month boundary day-by-day.
    onDayChange?: (day: Date) => void;
  }>();

  let selectedDay = $state(initialDay ?? new Date());

  const dateLocale = $derived($locale === 'de' ? deLocale : enUS);
  const dayEvents = $derived(events.filter((ev) => eventCoversDay(ev, selectedDay)));

  function goPrev() {
    selectedDay = subDays(selectedDay, 1);
    onDayChange?.(selectedDay);
  }
  function goNext() {
    selectedDay = addDays(selectedDay, 1);
    onDayChange?.(selectedDay);
  }
  function goToday() {
    selectedDay = new Date();
    onDayChange?.(selectedDay);
  }

  const isOnToday = $derived(isTodayDate(selectedDay));
  // The jump-to-today button is labeled with its target date only
  // ("30.8.2026") — a date link takes you to that date.
  const todayLabel = $derived(
    format($now, $locale === 'de' ? 'd.M.yyyy' : 'MMM d, yyyy', { locale: dateLocale })
  );
  const liveCount = $derived(dayEvents.filter((e) => isLiveNow(e, $now)).length);
  const termLabel = $derived(
    dayEvents.length === 1 ? $t['cal.agenda.term.one'] : $t['cal.agenda.term.many']
  );
  const prevLabel = $derived(
    format(subDays(selectedDay, 1), $locale === 'de' ? 'd. MMM' : 'MMM d', {
      locale: dateLocale
    })
  );
  const nextLabel = $derived(
    format(addDays(selectedDay, 1), $locale === 'de' ? 'd. MMM' : 'MMM d', {
      locale: dateLocale
    })
  );
</script>

<div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] lg:gap-0">
  <!-- Day list — same card treatment as the agenda view: today gets the
       dark ink block, other days get the date column + per-event paper
       cards with the category border. -->
  <div class="px-4 md:px-9 lg:px-10 py-3">
    {#if isOnToday}
      <div
        class="bg-ink rounded-md shadow-[3px_3px_0_var(--k-wine,#b23a5b)] mb-4 px-4 py-1 flex flex-col gap-1 lg:grid lg:grid-cols-[140px_1fr] lg:gap-4 lg:items-stretch"
      >
        <AgendaDayHeader day={selectedDay} eventCount={dayEvents.length} />
        <div class="border-t border-dashed border-paper/30 pt-2 lg:border-t-0 lg:border-l lg:pl-4 lg:pt-0 self-stretch">
          {#if dayEvents.length === 0}
            <p class="font-instrument italic text-[15px] text-paper/70 py-6">
              {$t['cal.state.empty.title']}
            </p>
          {:else}
            <div class="font-dmmono text-[10px] uppercase tracking-[0.1em] text-paper/60 pb-1 lg:pt-2">
              {dayEvents.length} {termLabel}{#if liveCount > 0}
                <span class="text-ochre"> · {liveCount} {$t['cal.agenda.today.running']}</span>
              {/if}
            </div>
            {#each dayEvents as ev (String(ev._id))}
              {@const eventId = String(ev._id)}
              <AgendaRow
                {ev}
                onPick={onPickEvent}
                {onRsvp}
                today
                {currentUserId}
                isSaved={savedIds.has(eventId)}
                onToggleSave={onToggleSave ? () => onToggleSave(eventId) : undefined}
              />
            {/each}
          {/if}
        </div>
      </div>
    {:else}
      <div class="flex flex-col gap-2 mb-4 lg:grid lg:grid-cols-[140px_1fr] lg:gap-5 lg:items-start">
        <AgendaDayHeader day={selectedDay} eventCount={dayEvents.length} />
        {#if dayEvents.length === 0}
          <p class="font-instrument italic text-[16px] text-ink-mute py-6">
            {$t['cal.state.empty.title']}
          </p>
        {:else}
          <div class="flex flex-col gap-3">
            {#each dayEvents as ev (String(ev._id))}
              {@const eventId = String(ev._id)}
              {@const catStyle = CATEGORIES[(ev.category ?? 'kiez') as EventCategory]}
              <div
                class={`bg-paper border-[1.5px] ${catStyle.borderClass} rounded-md shadow-sm overflow-hidden`}
              >
                <AgendaRow
                  {ev}
                  onPick={onPickEvent}
                  {onRsvp}
                  {currentUserId}
                  isSaved={savedIds.has(eventId)}
                  onToggleSave={onToggleSave ? () => onToggleSave(eventId) : undefined}
                />
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Day-nav footer: prev / today (when off today) / next. -->
    <div
      class="mt-6 pt-3 flex justify-between items-center font-dmmono text-[10px] uppercase tracking-[0.05em] text-ink-mute border-t border-dashed border-rule"
    >
      <button
        type="button"
        onclick={goPrev}
        class="hover:text-ink transition-colors"
      >
        ← {prevLabel}
      </button>
      {#if !isOnToday}
        <button
          type="button"
          onclick={goToday}
          class="text-wine hover:text-ink transition-colors"
        >
          {todayLabel}
        </button>
      {/if}
      <button
        type="button"
        onclick={goNext}
        class="hover:text-ink transition-colors"
      >
        {nextLabel} →
      </button>
    </div>
  </div>

  <CalendarSidebar
    visibleMonth={selectedDay}
    {events}
    {selectedDay}
    onPickDay={(d) => {
      selectedDay = d;
      onDayChange?.(d);
    }}
  />
</div>

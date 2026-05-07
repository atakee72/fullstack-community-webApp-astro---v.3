<script lang="ts">
  // Day view — single-day list of events. Reuses AgendaDayHeader +
  // AgendaRow so the visual treatment matches the agenda view.
  // Prev/next day nav at the bottom mirrors the month-grid footer.

  import { addDays, subDays, format, isToday as isTodayDate, isSameDay } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';

  import AgendaDayHeader from './AgendaDayHeader.svelte';
  import AgendaRow from './AgendaRow.svelte';
  import CalendarSidebar from './CalendarSidebar.svelte';

  import { eventCoversDay } from '../../../lib/calendar/eventTime';
  import { t, locale } from '../../../lib/kiosk-i18n';
  import type { Event as EventDoc } from '../../../types';

  let {
    events = [],
    onPickEvent,
    onRsvp
  } = $props<{
    events?: EventDoc[];
    onPickEvent?: (ev: EventDoc) => void;
    onRsvp?: (ev: EventDoc) => void;
  }>();

  let selectedDay = $state(new Date());

  const dateLocale = $derived($locale === 'de' ? deLocale : enUS);
  const dayEvents = $derived(events.filter((ev) => eventCoversDay(ev, selectedDay)));

  function goPrev() {
    selectedDay = subDays(selectedDay, 1);
  }
  function goNext() {
    selectedDay = addDays(selectedDay, 1);
  }
  function goToday() {
    selectedDay = new Date();
  }

  const isOnToday = $derived(isTodayDate(selectedDay));
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
  <!-- Day list -->
  <div class="px-4 md:px-9 lg:px-10 py-3">
    <AgendaDayHeader day={selectedDay} />

    {#if dayEvents.length === 0}
      <div class="py-10 text-center">
        <p class="font-instrument italic text-[16px] text-ink-mute">
          {$t['cal.state.empty.title']}
        </p>
      </div>
    {:else}
      <div>
        {#each dayEvents as ev (String(ev._id))}
          <AgendaRow {ev} onPick={onPickEvent} {onRsvp} />
        {/each}
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
          {$t['cal.cell.today']}
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

  <CalendarSidebar visibleMonth={selectedDay} {events} />
</div>

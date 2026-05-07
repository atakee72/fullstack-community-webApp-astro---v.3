<script lang="ts">
  // Agenda view — list of events grouped by day, with the editorial
  // sidebar on the right (lg+).
  // Per `kiosk-calendar-views.jsx:169–346`.

  import { format, isSameDay, startOfDay, isAfter, isBefore } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';

  import AgendaDayHeader from './AgendaDayHeader.svelte';
  import AgendaRow from './AgendaRow.svelte';
  import CalendarSidebar from './CalendarSidebar.svelte';

  import { eventCoversDay } from '../../../lib/calendar/eventTime';
  import { locale, t } from '../../../lib/kiosk-i18n';
  import type { Event as EventDoc } from '../../../types';

  let {
    events = [],
    visibleMonth = new Date(),
    onPickEvent,
    onRsvp
  } = $props<{
    events?: EventDoc[];
    visibleMonth?: Date;
    onPickEvent?: (ev: EventDoc) => void;
    onRsvp?: (ev: EventDoc) => void;
  }>();

  // Group events by their startDate's day-of-month bucket. Multi-day
  // events list once under their start day.
  const grouped = $derived.by(() => {
    const map = new Map<string, { day: Date; events: EventDoc[] }>();
    for (const ev of events) {
      const d = startOfDay(
        ev.startDate instanceof Date ? ev.startDate : new Date(ev.startDate)
      );
      const key = d.toISOString();
      if (!map.has(key)) map.set(key, { day: d, events: [] });
      map.get(key)!.events.push(ev);
    }
    // Sort days ascending; today + future first, then any leftover past.
    return [...map.values()].sort(
      (a, b) => a.day.getTime() - b.day.getTime()
    );
  });
</script>

<div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] lg:gap-0">
  <!-- Agenda list -->
  <div class="px-4 md:px-9 lg:px-10 py-3">
    {#if grouped.length === 0}
      <p class="font-instrument italic text-[16px] text-ink-mute py-6">
        {$t['cal.agenda.quote']}
      </p>
    {:else}
      {#each grouped as g (g.day.toISOString())}
        <AgendaDayHeader day={g.day} />
        <div>
          {#each g.events as ev (String(ev._id))}
            <AgendaRow {ev} onPick={onPickEvent} {onRsvp} />
          {/each}
        </div>
      {/each}
    {/if}
  </div>

  <CalendarSidebar {visibleMonth} {events} />
</div>

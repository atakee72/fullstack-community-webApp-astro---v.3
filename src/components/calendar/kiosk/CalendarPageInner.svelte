<script lang="ts">
  // Calendar page inner — view-state machine + events query.
  //
  // Phase 2 scope (this file): mount the kiosk shell (title block +
  // filter rail) and wire the events query so we can prove the data
  // layer end-to-end. The view bodies (month grid, agenda, day) land
  // in Phase 3, behind this same view state.
  //
  // Phase 4 will add drag-select state. Phase 5 will mount the detail
  // modal off the events list.

  import { createQuery } from '@tanstack/svelte-query';
  import { format, startOfWeek, endOfWeek } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';

  import CalendarTitleBlock from './CalendarTitleBlock.svelte';
  import CalCategoryRail from './CalCategoryRail.svelte';
  import CalendarMonthGrid from './CalendarMonthGrid.svelte';
  import CalendarAgendaView from './CalendarAgendaView.svelte';

  import { CATEGORY_ORDER } from '../../../lib/calendar/categories';
  import { countLiveNow, countEventsThisWeek } from '../../../lib/calendar/eventTime';
  import { locale } from '../../../lib/kiosk-i18n';
  import { getDefaultCalendarQueryOptions } from '../../../lib/calendarQueryOptions';
  import type { EventCategory, Event as EventDoc } from '../../../types';

  let { initialEvents = [], currentUserId = null } = $props<{
    initialEvents?: any[];
    currentUserId?: string | null;
  }>();

  type View = 'month' | 'agenda' | 'day';

  let view = $state<View>('month');
  let active = $state<Set<EventCategory>>(new Set(CATEGORY_ORDER));
  let myRsvps = $state(false);
  let saved = $state(false);

  function toggleCat(cat: EventCategory) {
    if (active.has(cat)) active.delete(cat);
    else active.add(cat);
  }

  // ─── Query ─────────────────────────────────────────────────────────
  const queryOpts = getDefaultCalendarQueryOptions();
  const queryKey = ['calendar', 'events', queryOpts] as const;

  async function fetchEvents(): Promise<EventDoc[]> {
    const params = new URLSearchParams();
    params.set('sortBy', queryOpts.sortBy);
    params.set('sortOrder', queryOpts.sortOrder);
    params.set('dateFrom', queryOpts.dateFrom.toISOString());
    params.set('dateTo', queryOpts.dateTo.toISOString());
    const res = await fetch(`/api/events?${params.toString()}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error(`fetch /api/events ${res.status}`);
    const json = await res.json();
    return (json.events ?? []) as EventDoc[];
  }

  // TanStack Svelte Query v6 requires the thunk form `() => options`
  // (NOT a plain options object). The plain-object signature is v5.
  const eventsQuery = createQuery<EventDoc[]>(() => ({
    queryKey: queryKey as unknown as readonly unknown[],
    queryFn: fetchEvents,
    initialData:
      initialEvents.length > 0 ? (initialEvents as EventDoc[]) : undefined,
    initialDataUpdatedAt:
      initialEvents.length > 0 ? Date.now() : undefined
  }));

  const events = $derived(eventsQuery.data ?? []);

  // ─── Derived display data ─────────────────────────────────────────
  const monthLabel = $derived.by(() => {
    const loc = $locale === 'de' ? deLocale : enUS;
    return format(new Date(), 'MMMM yyyy', { locale: loc }).toUpperCase();
  });

  const displayedEvents = $derived(
    events.filter((ev) => {
      if (ev.category && !active.has(ev.category as EventCategory)) return false;
      // myRsvps + saved filters wire in Phase 5/6 (need user RSVPs +
      // the saved-events list). For now they short-circuit to no-op.
      return true;
    })
  );

  // Stats — derived from current event list. `goingToday` is the
  // total RSVPs across all events occurring today (cheap to compute).
  const weekStart = $derived(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = $derived(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEvents = $derived(
    countEventsThisWeek(displayedEvents, weekStart, weekEnd)
  );
  const liveNow = $derived(countLiveNow(displayedEvents));
  const goingToday = $derived.by(() => {
    const today = new Date();
    let total = 0;
    for (const ev of displayedEvents) {
      const start = ev.startDate instanceof Date ? ev.startDate : new Date(ev.startDate);
      if (
        start.getFullYear() === today.getFullYear() &&
        start.getMonth() === today.getMonth() &&
        start.getDate() === today.getDate()
      ) {
        total += ev.rsvps?.going?.length ?? 0;
      }
    }
    return total;
  });

  const visibleMonth = $derived(new Date());
</script>

<div data-page="calendar">
  <CalendarTitleBlock
    {view}
    onView={(v) => (view = v)}
    {monthLabel}
    {weekEvents}
    {liveNow}
    {goingToday}
  />

  <CalCategoryRail
    {active}
    onToggle={toggleCat}
    {myRsvps}
    {saved}
    onMyRsvps={() => (myRsvps = !myRsvps)}
    onSaved={() => (saved = !saved)}
    liveCount={liveNow}
  />

  {#if eventsQuery.isPending && !events.length}
    <div class="px-4 md:px-9 lg:px-10 py-12">
      <p class="font-dmmono text-[11px] uppercase tracking-[0.1em] text-ink-mute">
        ◆ Laden…
      </p>
    </div>
  {:else if eventsQuery.isError}
    <div class="px-4 md:px-9 lg:px-10 py-12">
      <p class="font-dmmono text-[11px] uppercase tracking-[0.1em] text-danger">
        ◆ Fehler beim Laden.
      </p>
    </div>
  {:else if view === 'month'}
    <CalendarMonthGrid
      {visibleMonth}
      events={displayedEvents}
      onPickEvent={(ev) => {
        // Phase 5 will mount the detail modal off this callback.
        console.debug('[calendar] pick event', ev._id);
      }}
    />
  {:else if view === 'agenda'}
    <CalendarAgendaView
      events={displayedEvents}
      {visibleMonth}
      onPickEvent={(ev) => console.debug('[calendar] pick event', ev._id)}
      onRsvp={(ev) => console.debug('[calendar] rsvp', ev._id)}
    />
  {:else}
    <!-- Day view — slim v1 stub; CD's artboard prioritises month + agenda. -->
    <div class="px-4 md:px-9 lg:px-10 py-8">
      <p class="font-dmmono text-[11px] uppercase tracking-[0.1em] text-ink-mute">
        ◆ Day-View kommt in einer späteren Phase.
      </p>
    </div>
  {/if}
</div>

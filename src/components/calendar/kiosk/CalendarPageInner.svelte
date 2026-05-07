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
  import {
    format,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    addMonths,
    subMonths
  } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';

  import CalendarTitleBlock from './CalendarTitleBlock.svelte';
  import CalCategoryRail from './CalCategoryRail.svelte';
  import CalendarMonthGrid from './CalendarMonthGrid.svelte';
  import CalendarMobileMonth from './mobile/CalendarMobileMonth.svelte';
  import CalendarAgendaView from './CalendarAgendaView.svelte';
  import CalendarDayView from './CalendarDayView.svelte';
  import EventDetailModal from './EventDetailModal.svelte';
  import CalendarSkeleton from './states/CalendarSkeleton.svelte';
  import CalendarEmpty from './states/CalendarEmpty.svelte';
  import CalendarFilteredEmpty from './states/CalendarFilteredEmpty.svelte';
  import CalendarError from './states/CalendarError.svelte';

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

  function clearFilters() {
    // Re-enable all categories + drop "Meine RSVPs" + "Gespeichert"
    active = new Set(CATEGORY_ORDER);
    myRsvps = false;
    saved = false;
  }

  // ─── Visible month + month navigation ─────────────────────────────
  // Tracked as $state so the bottom month-nav (← MÄRZ / MAI →) can
  // walk through months. Defaults to today.
  let visibleMonth = $state(new Date());

  function goPrevMonth() {
    visibleMonth = subMonths(visibleMonth, 1);
  }
  function goNextMonth() {
    visibleMonth = addMonths(visibleMonth, 1);
  }
  function goToday() {
    visibleMonth = new Date();
  }

  // Show the "Heute" snap-back button only when the user has navigated
  // away from the current calendar month.
  const isOnTodayMonth = $derived.by(() => {
    const now = new Date();
    return (
      visibleMonth.getFullYear() === now.getFullYear() &&
      visibleMonth.getMonth() === now.getMonth()
    );
  });

  // ─── Query ─────────────────────────────────────────────────────────
  // queryOpts depends on visibleMonth so the events query refetches when
  // the user navigates months. The thunk form of createQuery() lets
  // Svelte-Query v6 see the reactive queryKey change.
  const queryOpts = $derived(getDefaultCalendarQueryOptions(visibleMonth));

  async function fetchEvents(): Promise<EventDoc[]> {
    const opts = queryOpts;
    const params = new URLSearchParams();
    params.set('sortBy', opts.sortBy);
    params.set('sortOrder', opts.sortOrder);
    params.set('dateFrom', opts.dateFrom.toISOString());
    params.set('dateTo', opts.dateTo.toISOString());
    const res = await fetch(`/api/events?${params.toString()}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error(`fetch /api/events ${res.status}`);
    const json = await res.json();
    return (json.events ?? []) as EventDoc[];
  }

  const eventsQuery = createQuery<EventDoc[]>(() => ({
    queryKey: ['calendar', 'events', queryOpts] as readonly unknown[],
    queryFn: fetchEvents,
    initialData:
      initialEvents.length > 0 ? (initialEvents as EventDoc[]) : undefined,
    initialDataUpdatedAt:
      initialEvents.length > 0 ? Date.now() : undefined
  }));

  const events = $derived(eventsQuery.data ?? []);

  // ─── Derived display data ─────────────────────────────────────────
  // Kicker reflects the months actually visible in the grid (Mon-start
  // weeks pull in trailing days from the previous month and leading
  // days from the next). When the visible window straddles two
  // months, label them as a range — `APRIL — MAI 2026` per CD's
  // header design.
  const monthLabel = $derived.by(() => {
    const loc = $locale === 'de' ? deLocale : enUS;
    const gridStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
    const sameMonth = gridStart.getMonth() === gridEnd.getMonth();
    const year = format(visibleMonth, 'yyyy', { locale: loc });
    if (sameMonth) {
      return format(visibleMonth, 'MMMM yyyy', { locale: loc }).toUpperCase();
    }
    const lo = format(gridStart, 'MMMM', { locale: loc }).toUpperCase();
    const hi = format(gridEnd, 'MMMM', { locale: loc }).toUpperCase();
    return `${lo} — ${hi} ${year}`;
  });

  const prevMonthLabel = $derived(
    format(subMonths(visibleMonth, 1), 'MMMM', {
      locale: $locale === 'de' ? deLocale : enUS
    }).toUpperCase()
  );
  const nextMonthLabel = $derived(
    format(addMonths(visibleMonth, 1), 'MMMM', {
      locale: $locale === 'de' ? deLocale : enUS
    }).toUpperCase()
  );

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

  // ─── Detail modal state ─────────────────────────────────────────
  let selectedEvent = $state<EventDoc | null>(null);

  function onPickEvent(ev: EventDoc) {
    selectedEvent = ev;
  }

  // Re-derive selected event from the live cache so RSVP optimistic
  // updates flow through to the open modal without re-opening it.
  const liveSelected = $derived.by(() => {
    if (!selectedEvent) return null;
    const id = String(selectedEvent._id);
    return (events.find((e) => String(e._id) === id) as EventDoc | undefined) ?? selectedEvent;
  });
</script>

<div data-page="calendar">
  <!-- Title block + category rail are hidden on mobile when month view —
       CalendarMobileMonth owns its own header + filter rail there. -->
  <div class={view === 'month' ? 'hidden lg:block' : 'block'}>
    <CalendarTitleBlock
      {view}
      onView={(v) => (view = v)}
      {monthLabel}
      {weekEvents}
      {liveNow}
      {goingToday}
      showToday={!isOnTodayMonth}
      onToday={goToday}
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
  </div>

  {#if eventsQuery.isPending && !events.length}
    <CalendarSkeleton />
  {:else if eventsQuery.isError}
    <CalendarError onRetry={() => eventsQuery.refetch()} />
  {:else if events.length === 0}
    <CalendarEmpty />
  {:else if displayedEvents.length === 0}
    <CalendarFilteredEmpty onClear={clearFilters} />
  {:else if view === 'month'}
    <!-- Mobile month: dot-grid + day-detail panel (owns its own header). -->
    <div class="lg:hidden">
      <CalendarMobileMonth
        {visibleMonth}
        events={displayedEvents}
        {active}
        onToggleCat={toggleCat}
        onPickEvent={onPickEvent}
        onPrevMonth={goPrevMonth}
        onNextMonth={goNextMonth}
        {prevMonthLabel}
        {nextMonthLabel}
        {weekEvents}
        liveCount={liveNow}
      />
    </div>
    <!-- Desktop month: full grid with event pills + drag-select. -->
    <div class="hidden lg:block">
      <CalendarMonthGrid
        {visibleMonth}
        events={displayedEvents}
        onPickEvent={onPickEvent}
        onPrevMonth={goPrevMonth}
        onNextMonth={goNextMonth}
        {prevMonthLabel}
        {nextMonthLabel}
        liveCount={liveNow}
      />
    </div>
  {:else if view === 'agenda'}
    <CalendarAgendaView
      events={displayedEvents}
      {visibleMonth}
      onPickEvent={onPickEvent}
      onRsvp={onPickEvent}
    />
  {:else}
    <CalendarDayView
      events={displayedEvents}
      onPickEvent={onPickEvent}
      onRsvp={onPickEvent}
    />
  {/if}

  <EventDetailModal
    event={liveSelected}
    open={!!liveSelected}
    currentUserId={currentUserId}
    onClose={() => (selectedEvent = null)}
  />
</div>

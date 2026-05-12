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
  import { locale, t } from '../../../lib/kiosk-i18n';
  import { getDefaultCalendarQueryOptions } from '../../../lib/calendarQueryOptions';
  import { createSavedEventsQuery, createSaveEventMutation } from '../../../lib/savedEventsQueries';
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

  // Desktop category rail uses single-select-with-all-reset semantics:
  //   Alle click → all categories on.
  //   Category click → isolate that category.
  //   Click already-isolated category → revert to "all".
  // Mobile filter rail (CalendarMobileMonth) still uses multi-toggle
  // via `toggleCat` — kept for backwards compatibility.
  const isAllActive = $derived(active.size === CATEGORY_ORDER.length);

  function selectAll() {
    active = new Set(CATEGORY_ORDER);
  }

  function selectOnly(cat: EventCategory) {
    if (active.size === 1 && active.has(cat)) {
      selectAll();
    } else {
      active = new Set([cat]);
    }
  }

  function toggleCat(cat: EventCategory) {
    if (active.has(cat)) active.delete(cat);
    else active.add(cat);
    active = new Set(active);
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

  // ─── Saved events ─────────────────────────────────────────────────
  // Query is gated on having a logged-in user; the mutation is the
  // single source of truth for the saved set (both the MERKEN button
  // state per row and the "Gespeichert" filter read from this cache).
  const savedEventsQuery = createSavedEventsQuery(() => !!currentUserId);
  const saveMutation = createSaveEventMutation();

  const savedIds = $derived.by(() => {
    const data = savedEventsQuery.data;
    return {
      ready: data !== undefined,
      ids: new Set(data ?? [])
    };
  });

  function onToggleSave(eventId: string) {
    if (!currentUserId) return;
    const action = savedIds.ids.has(eventId) ? 'unsave' : 'save';
    saveMutation.mutate({ eventId, action });
  }

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

  // Single-month form for the desktop header stepper — always `MAI 2026`,
  // never the grid-straddle range. Kicker keeps the range form via `monthLabel`.
  const visibleMonthLabel = $derived(
    format(visibleMonth, 'MMMM yyyy', {
      locale: $locale === 'de' ? deLocale : enUS
    }).toUpperCase()
  );

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
      if (myRsvps && currentUserId) {
        const going = ev.rsvps?.going ?? [];
        const maybe = ev.rsvps?.maybe ?? [];
        const inRsvps =
          going.some((id) => String(id) === currentUserId) ||
          maybe.some((id) => String(id) === currentUserId);
        if (!inRsvps) return false;
      }
      // Skip the saved filter until the savedEvents query hydrates —
      // otherwise the list flashes empty before resolving.
      if (saved && savedIds.ready && !savedIds.ids.has(String(ev._id))) return false;
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
      {monthLabel}
      {visibleMonthLabel}
      {weekEvents}
      {liveNow}
      {goingToday}
      onPrevMonth={goPrevMonth}
      onNextMonth={goNextMonth}
      {view}
      onView={(v) => (view = v)}
    />

    <CalCategoryRail
      {active}
      {isAllActive}
      onSelectAll={selectAll}
      onSelectOnly={selectOnly}
      {myRsvps}
      {saved}
      onMyRsvps={() => (myRsvps = !myRsvps)}
      onSaved={() => (saved = !saved)}
      {view}
      showToday={!isOnTodayMonth}
      onToday={goToday}
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
        liveCount={liveNow}
        {currentUserId}
        showToday={!isOnTodayMonth}
        onToday={goToday}
        {myRsvps}
        {saved}
        onMyRsvps={() => (myRsvps = !myRsvps)}
        onSaved={() => (saved = !saved)}
        {view}
        onView={(v) => (view = v)}
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
        {currentUserId}
      />
    </div>
  {:else if view === 'agenda'}
    <CalendarAgendaView
      events={displayedEvents}
      {visibleMonth}
      onPickEvent={onPickEvent}
      onRsvp={onPickEvent}
      savedIds={savedIds.ids}
      onToggleSave={currentUserId ? onToggleSave : undefined}
      {currentUserId}
    />
  {:else}
    <CalendarDayView
      events={displayedEvents}
      onPickEvent={onPickEvent}
      onRsvp={onPickEvent}
      {currentUserId}
    />
  {/if}

  <EventDetailModal
    event={liveSelected}
    open={!!liveSelected}
    currentUserId={currentUserId}
    onClose={() => (selectedEvent = null)}
  />

  <!-- Floating add-event FAB (mobile-only, all views). Parked above
       the bottom mobile nav (h-12 at z-40) with 16px clearance. Wine
       fill + ink print-shadow matches the kiosk vocabulary. -->
  <a
    href="/events/create"
    aria-label={$t['cal.mobile.cta.aria']}
    class="fixed bottom-16 right-4 z-30 w-14 h-14 rounded-full bg-wine text-paper border-2 border-ink font-bricolage font-bold text-[28px] leading-none shadow-[3px_3px_0_var(--k-ink,#0e1033)] flex items-center justify-center lg:hidden"
  >+</a>
</div>

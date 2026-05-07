<script lang="ts">
  // /events/create logic island — mirrors `forum/kiosk/compose/
  // ComposePageInner.svelte` but for events. Submit flow:
  //
  //   1. validate
  //   2. compose ISO startDate / endDate from date+time strings
  //   3. createEventMutation → POST /api/events/create
  //   4. on success → clearDraft + navigate to /calendar
  //   5. on RateLimitError → swap form for RateLimitPanel
  //   6. on other errors → surface inline below publish button
  //
  // Pre-fill from URL search params (?from=YYYY-MM-DD&to=YYYY-MM-DD&
  // allDay=1) handed off by the drag-select pin.

  import EventComposeForm, {
    type EventComposeValues
  } from './EventComposeForm.svelte';
  import EventComposePreview from './EventComposePreview.svelte';
  import EventComposeMiniPreview from './EventComposeMiniPreview.svelte';
  import ModeratingModal from '../../../forum/kiosk/compose/ModeratingModal.svelte';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';
  import RateLimitPanel from '../../../forum/kiosk/states/RateLimitPanel.svelte';

  import {
    createEventMutation,
    RateLimitError
  } from '../../../../lib/calendarMutations';
  import { eventDraft, type EventDraftValues } from '../../../../lib/eventDraftStore';
  import { t } from '../../../../lib/kiosk-i18n';
  import type { EventCategory } from '../../../../types';

  let { currentUser } = $props<{
    currentUser: { id: string; name?: string; image?: string | null };
  }>();

  // ─── Initial values — computed synchronously at script-top.
  // This component runs client-only (`client:only="svelte"` on the
  // Astro page), so `window` is always available at instantiation;
  // we don't need to defer to onMount. Computing synchronously here
  // means EventComposeForm's `$state` seeders fire with the right
  // values on first render.
  function computeInitialValues(): Partial<EventComposeValues> {
    const search =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const from = search.get('from');
    const to = search.get('to');
    const allDayParam = search.get('allDay') === '1';

    let saved: EventDraftValues | null = null;
    eventDraft.subscribe((v) => (saved = v))();

    if (from) {
      // URL params win — drag-select just landed on this page.
      return {
        title: '',
        body: '',
        category: 'kiez',
        startDate: from,
        endDate: to ?? from,
        allDay: allDayParam,
        location: '',
        capacity: null,
        tags: []
      };
    }
    if (saved) {
      const s = saved as EventDraftValues;
      return {
        title: s.title,
        body: s.body,
        category: s.category,
        startDate: s.startDate,
        startTime: s.startTime,
        endDate: s.endDate,
        endTime: s.endTime,
        allDay: s.allDay,
        location: s.location,
        capacity: s.capacity,
        tags: s.tags
      };
    }
    return {};
  }

  const initialValues: Partial<EventComposeValues> = computeInitialValues();

  // ─── Form values ─────────────────────────────────────────────────
  let values = $state<EventComposeValues>({
    title: '',
    body: '',
    category: 'kiez' as EventCategory,
    startDate: new Date().toISOString().slice(0, 10),
    startTime: '09:00',
    endDate: new Date().toISOString().slice(0, 10),
    endTime: '17:00',
    allDay: false,
    location: '',
    capacity: null,
    tags: []
  });

  // Auto-save debounced — same pattern as forum compose.
  let draftTimer: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    const snapshot: EventDraftValues = {
      title: values.title,
      body: values.body,
      category: values.category,
      startDate: values.startDate,
      startTime: values.startTime,
      endDate: values.endDate,
      endTime: values.endTime,
      allDay: values.allDay,
      location: values.location,
      capacity: values.capacity,
      tags: values.tags
    };
    if (!snapshot.title && !snapshot.body && !snapshot.location) return;
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => eventDraft.setDraft(snapshot), 500);
    return () => {
      if (draftTimer) clearTimeout(draftTimer);
    };
  });

  function handleChange(next: EventComposeValues) {
    values = next;
  }

  // ─── Mutation ───────────────────────────────────────────────────
  const create = createEventMutation();

  let submitting = $state(false);
  let modalOpen = $state(false);
  let rateLimited = $state(false);
  let inlineError = $state<string | null>(null);

  function validate(v: EventComposeValues): string | null {
    if (v.title.trim().length < 5) return 'Titel zu kurz (mind. 5 Zeichen).';
    if (v.title.length > 200) return 'Titel zu lang.';
    if (v.body.trim().length < 10) return 'Beschreibung zu kurz (mind. 10 Zeichen).';
    if (!v.startDate || !v.endDate) return 'Datum fehlt.';
    return null;
  }

  // Compose ISO datetime strings from the date+time inputs.
  function composeIso(date: string, time: string, allDay: boolean): string {
    if (allDay) return `${date}T00:00:00.000Z`;
    return new Date(`${date}T${time || '00:00'}`).toISOString();
  }

  async function onPublish() {
    if (submitting) return;
    inlineError = null;
    const err = validate(values);
    if (err) {
      inlineError = err;
      return;
    }

    submitting = true;
    modalOpen = true;
    try {
      const startISO = composeIso(values.startDate, values.startTime, values.allDay);
      const endISO = values.allDay
        ? new Date(`${values.endDate}T23:59:59.000Z`).toISOString()
        : composeIso(values.endDate, values.endTime, false);

      await create.mutateAsync({
        title: values.title.trim(),
        body: values.body.trim(),
        startDate: startISO,
        endDate: endISO,
        category: values.category,
        capacity: values.capacity ?? null,
        allDay: values.allDay,
        location: values.location.trim() || undefined,
        tags: values.tags
      });

      eventDraft.clearDraft();
      modalOpen = false;
      if (typeof window !== 'undefined') {
        window.location.href = '/calendar?just_posted=1';
      }
    } catch (caught) {
      modalOpen = false;
      submitting = false;
      if (caught instanceof RateLimitError) {
        rateLimited = true;
      } else {
        inlineError =
          caught instanceof Error ? caught.message : 'Veröffentlichen fehlgeschlagen.';
      }
    }
  }

  function onDiscard() {
    eventDraft.clearDraft();
    if (typeof window !== 'undefined') window.location.href = '/calendar';
  }
</script>

{#if rateLimited}
  <RateLimitPanel unlocksIn={null} />
{:else}
  <div
    class="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-0 min-h-[calc(100vh-180px)]"
  >
    <EventComposeForm
      {initialValues}
      onChange={handleChange}
      showBreadcrumb={true}
    />
    <EventComposePreview
      {values}
      submitting={submitting}
      onPublish={onPublish}
      onDiscard={onDiscard}
    />
  </div>

  {#if inlineError}
    <div class="px-4 md:px-9 lg:px-10 pb-6">
      <p
        class="font-bricolage text-sm text-danger px-3.5 py-2 bg-danger/10 border border-danger rounded-md"
        role="alert"
      >
        {inlineError}
      </p>
    </div>
  {/if}

  <!-- Mobile flow: mini preview + sticky publish at the bottom -->
  <div class="lg:hidden px-4 pt-4">
    <EventComposeMiniPreview {values} />
  </div>
  <div class="lg:hidden px-4 flex flex-col gap-2.5 pb-6">
    <KioskBtn
      variant="primary"
      size="lg"
      onclick={onPublish}
      disabled={submitting}
      class="w-full"
    >
      {$t['cal.compose.cta.publish']}
    </KioskBtn>
    <KioskBtn
      variant="ghost"
      size="lg"
      onclick={onDiscard}
      disabled={submitting}
      class="w-full"
    >
      {$t['cal.compose.cta.discard']}
    </KioskBtn>
    <p class="font-dmmono text-[9.5px] text-ink-mute leading-relaxed">
      {$t['cal.compose.aiNote']}
    </p>
  </div>

  <ModeratingModal open={modalOpen} onDismiss={() => (modalOpen = false)} />
{/if}

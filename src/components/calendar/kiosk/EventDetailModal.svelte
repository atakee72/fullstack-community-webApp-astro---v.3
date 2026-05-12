<script lang="ts">
  // Event detail modal — Editorial Kiosk treatment.
  //
  // Built on the native <dialog> element + showModal() so the browser
  // handles scroll-lock, focus trap, ESC dismiss, and ARIA modal
  // semantics for free. The modal renders in the top-layer which
  // escapes any backdrop-filter containing-block on ancestor elements
  // (see CLAUDE.md gotcha re: backdrop-blur).
  //
  // Layout per `kiosk-calendar-flows.jsx:16–276`:
  //   left  — category strip + title + when/where/by slab + description
  //   right — RSVP buttons + capacity bar + attendee stack + export

  import { format, differenceInHours } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';

  import RsvpButtons from './RsvpButtons.svelte';
  import CapacityBar from './CapacityBar.svelte';
  import AttendeeStack from './AttendeeStack.svelte';
  import KioskAvatar from '../../forum/kiosk/KioskAvatar.svelte';
  import KioskBtn from '../../forum/kiosk/KioskBtn.svelte';
  import StatusBadge from '../../forum/kiosk/StatusBadge.svelte';
  import OwnStatusBanner from '../../forum/kiosk/states/OwnStatusBanner.svelte';
  import KioskReportModal from '../../forum/kiosk/KioskReportModal.svelte';

  import { CATEGORIES } from '../../../lib/calendar/categories';
  import { isLiveNow } from '../../../lib/calendar/eventTime';
  import { now } from '../../../lib/calendar/nowTicker';
  import { t, locale } from '../../../lib/kiosk-i18n';
  import { createUserProfilesQuery } from '../../../lib/userProfilesQueries';
  import type { Event as EventDoc, EventCategory } from '../../../types';

  let {
    event,
    open = false,
    currentUserId = null,
    onClose
  } = $props<{
    event: EventDoc | null;
    open?: boolean;
    currentUserId?: string | null;
    onClose: () => void;
  }>();

  let dialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  // The browser fires a 'close' event when ESC or the close-via-form
  // mechanism dismisses the dialog; keep the parent state in sync.
  function onDialogClose() {
    if (open) onClose();
  }

  // Click-outside backdrop dismiss — `<dialog>::backdrop` is a
  // pseudo-element, but clicks on it surface as click events on the
  // dialog itself with target === dialog (NOT a child). Detect that.
  function onDialogClick(e: MouseEvent) {
    if (e.target === dialog) onClose();
  }

  // ─── Derived display ─────────────────────────────────────────────
  const dateLocale = $derived($locale === 'de' ? deLocale : enUS);
  const cat = $derived((event?.category ?? 'kiez') as EventCategory);
  const style = $derived(CATEGORIES[cat]);

  // ─── Moderation state (badge + own-banner) ───────────────────────
  // Badge precedence mirrors the forum cards (ForumPostCard.svelte:167-173).
  const inferredBadge = $derived(
    event?.moderationStatus === 'rejected' ? 'rejected'
    : event?.isUserReported && event?.moderationStatus === 'pending' ? 'reported'
    : event?.moderationStatus === 'pending' ? 'pending'
    : event?.hasWarningLabel ? 'warning'
    : null
  );

  // event.author can be a populated user object OR a plain id string,
  // depending on which endpoint produced the doc. Handle both.
  const authorId = $derived.by(() => {
    const a = event?.author as any;
    if (!a) return null;
    if (typeof a === 'string') return a;
    if (a._id) return typeof a._id === 'string' ? a._id : a._id.toString?.() ?? null;
    return null;
  });
  const isAuthor = $derived(!!currentUserId && currentUserId === authorId);

  // Author-only banner state. Non-authors get null → no banner.
  const ownState = $derived.by(() => {
    if (!isAuthor) return null;
    if (event?.moderationStatus === 'rejected') return 'rejected' as const;
    if (event?.isUserReported && event?.moderationStatus === 'pending') return 'reported' as const;
    if (event?.moderationStatus === 'pending') return 'pending' as const;
    return null;
  });

  const startDate = $derived(
    event?.startDate
      ? event.startDate instanceof Date
        ? event.startDate
        : new Date(event.startDate)
      : null
  );
  const endDate = $derived(
    event?.endDate
      ? event.endDate instanceof Date
        ? event.endDate
        : new Date(event.endDate)
      : null
  );

  const dateLabel = $derived(
    startDate
      ? format(startDate, $locale === 'de' ? 'EEEE, d. MMMM yyyy' : 'EEEE, MMMM d, yyyy', {
          locale: dateLocale
        })
      : ''
  );
  const timeLabel = $derived.by(() => {
    if (!startDate || !endDate) return '';
    if (event?.allDay) return $t['cal.allDay'];
    const start = format(startDate, 'HH:mm');
    const end = format(endDate, 'HH:mm');
    const hours = Math.max(1, differenceInHours(endDate, startDate));
    const unit = $locale === 'de' ? 'Stunden' : 'hours';
    return `${start} – ${end} · ${hours} ${unit}`;
  });

  const goingArr = $derived<string[]>((event?.rsvps?.going as string[]) ?? []);
  const maybeArr = $derived<string[]>((event?.rsvps?.maybe as string[]) ?? []);
  const goingCount = $derived(goingArr.length);
  const maybeCount = $derived(maybeArr.length);

  const myStatus = $derived<'going' | 'maybe' | null>(
    !currentUserId
      ? null
      : goingArr.includes(currentUserId)
      ? 'going'
      : maybeArr.includes(currentUserId)
      ? 'maybe'
      : null
  );

  // Author name for the BY slab.
  const authorName = $derived(
    typeof event?.author === 'object' && event?.author !== null && 'name' in event.author
      ? ((event.author as any).name as string) ?? ''
      : ''
  );

  // Mahalle-Team detection — for the second pill label next to the
  // category strip. Currently isOfficial ships as a server-only flag;
  // we ALSO honor an author-name heuristic so seeded "Mahalle-Team"
  // events render the badge before any admin-create endpoint exists.
  const isOfficial = $derived(
    !!event?.isOfficial || /mahalle.?team/i.test(authorName)
  );

  // Title carved-italic split — when the title is exactly two
  // whitespace-separated words, render the second as italic-serif
  // wine (matches CD's 'Straßenfest / Herrfurthplatz' treatment).
  // Longer / shorter titles fall through to the single-line render.
  const titleParts = $derived.by(() => {
    const raw = (event?.title ?? '').trim();
    if (!raw) return { single: '', split: null as null | { lead: string; tail: string } };
    const parts = raw.split(/\s+/);
    if (parts.length === 2) {
      return { single: '', split: { lead: parts[0], tail: parts[1] } };
    }
    return { single: raw, split: null };
  });

  // Practical-info chips reuse the event.tags array — design shows
  // 'kostenfrei / kinderfreundlich / BYO' as outlined DM Mono pills.
  // Whatever the user typed as tags gets rendered with the same
  // visual treatment.
  const practicalChips = $derived<string[]>(
    Array.isArray(event?.tags) ? (event!.tags as string[]) : []
  );

  const eventId = $derived(event?._id ? String(event._id) : '');

  // Live-now status, reactive on the shared minute-tick store so the
  // badge appears and disappears while the modal stays open.
  const live = $derived(event ? isLiveNow(event, $now) : false);

  // Attendee avatars — fetch real profiles (name + picture) only while
  // the modal is open. Empty when closed → query is disabled, no
  // background polling. The AttendeeStack receives both `users` (real
  // avatars) and `userIds` (colored-disc placeholders) so the cluster
  // paints immediately and upgrades when profiles resolve.
  const profilesQuery = createUserProfilesQuery(() =>
    open && goingArr.length > 0 ? goingArr : []
  );
  const attendees = $derived(profilesQuery.data ?? []);

  let reportOpen = $state(false);
  function onReportClick() {
    if (!currentUserId || isAuthor) return;
    reportOpen = true;
  }
</script>

<dialog
  bind:this={dialog}
  onclose={onDialogClose}
  onclick={onDialogClick}
  class="bg-transparent p-0 max-w-none w-full max-h-none outline-none backdrop:bg-[#3d2a30]/70 backdrop:backdrop-blur-[1px]"
>
  {#if event}
    {@const goingCountFx = goingCount}
    <div
      class="k-cal-modal-in mx-auto my-3 md:my-[40px] max-w-[1100px] w-[min(94vw,1100px)] max-h-[calc(100dvh-24px)] md:max-h-[calc(100dvh-80px)] relative bg-paper text-ink border-2 border-ink rounded-lg overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-[1.3fr_1fr] shadow-[12px_12px_0_var(--k-wine,#b23a5b)]"
    >
      <!-- Mobile-only close button — sticks to top of scrolling card. -->
      <button
        type="button"
        onclick={onClose}
        aria-label={$t['cal.detail.back']}
        class="md:hidden sticky top-2 z-20 justify-self-end mr-3 mt-3 -mb-9 w-9 h-9 rounded-full bg-paper border-[1.5px] border-ink flex items-center justify-center text-[18px] leading-none font-dmmono shadow-[2px_2px_0_var(--k-ink,#0e1033)]"
      >×</button>

      <!-- Left — content -->
      <div
        class="px-7 py-7 md:border-r md:border-dashed md:border-rule md:overflow-auto md:max-h-[calc(100vh-80px)]"
      >
        <!-- Category strip — adds an inline 'MAHALLE-TEAM' second
             label when the event is official (server flag) or the
             author name matches the team heuristic. Moderation badge
             sits next to it when the event is pending/reported/rejected
             or warning-labelled. -->
        <div class="flex items-center flex-wrap gap-2 mb-3.5">
          <div
            class={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${style.bgClass} ${style.textOnFill} border-2 border-ink font-bricolage font-bold text-[12px] tracking-[0.04em]`}
          >
            <span aria-hidden="true">{style.glyph}</span>
            <span>{($t[`cal.cat.${cat}.label` as const] as string)?.toUpperCase()}</span>
            {#if isOfficial}
              <span class="w-px h-3 bg-paper/50" aria-hidden="true"></span>
              <span class="text-[10px] tracking-[0.08em]">{($t['cal.team'] as string)?.toUpperCase()}</span>
            {/if}
          </div>
          {#if inferredBadge}
            <StatusBadge state={inferredBadge} size="md" />
          {/if}
        </div>

        <!-- Title — two-word events get the carved-italic accent on the
             second word per CD's design. Longer titles render as a
             single solid line. -->
        <h1
          class="font-bricolage font-extrabold text-[36px] md:text-[42px] tracking-[-0.03em] leading-[1] [text-wrap:balance] m-0 mb-3"
        >
          {#if titleParts.split}
            <span class="block">{titleParts.split.lead}</span>
            <span class="block font-instrument italic font-normal text-teal">
              {titleParts.split.tail}
            </span>
          {:else}
            {titleParts.single}
          {/if}
        </h1>

        <!-- When / where / by slab -->
        <div
          class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 mt-3 pt-3 border-t-[1.5px] border-ink mb-4"
        >
          <span class="font-dmmono text-[10px] tracking-[0.12em] text-ink-mute pt-1">
            {$t['cal.detail.when']}
          </span>
          <div>
            <div class="font-bricolage font-bold text-[16.5px] tracking-[-0.01em]">
              {dateLabel}
            </div>
            <div class="font-dmmono text-[12.5px] text-ink-soft mt-px flex items-center flex-wrap gap-x-2 gap-y-1">
              <span>{timeLabel}</span>
              {#if live}
                <span
                  class="inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-ochre/15 border border-ochre font-dmmono uppercase tracking-[0.1em] text-[10px] font-semibold text-ink"
                >
                  <span
                    class="inline-block w-[8px] h-[8px] rounded-full bg-ochre border border-ink k-cal-live-dot"
                    aria-hidden="true"
                  ></span>
                  {$t['cal.live.label']}
                </span>
              {/if}
            </div>
          </div>

          {#if event.location}
            <span class="font-dmmono text-[10px] tracking-[0.12em] text-ink-mute pt-1">
              {$t['cal.detail.where']}
            </span>
            <div>
              <div class="font-bricolage font-semibold text-[15.5px]">
                {event.location}
              </div>
              <!-- Striped diagonal map placeholder — visual cue only;
                   real OSM/Mapbox embed is a future feature. -->
              <div
                class="mt-2 px-3.5 py-3 rounded-sm border border-dashed border-rule bg-[repeating-linear-gradient(45deg,var(--k-paper-warm,#f7f0de)_0_8px,var(--k-paper,#f3ead8)_8px_16px)] font-dmmono text-[10px] tracking-[0.1em] text-ink-mute text-center"
              >
                ◆ KARTE · OSM-PIN
              </div>
            </div>
          {/if}

          {#if authorName}
            <span class="font-dmmono text-[10px] tracking-[0.12em] text-ink-mute pt-1">
              {$t['cal.detail.by']}
            </span>
            <div class="flex items-center gap-2">
              <KioskAvatar name={authorName} image={null} size="sm" />
              <div>
                <div class="font-bricolage font-semibold text-[13px]">{authorName}</div>
                <div class="font-dmmono text-[10px] text-ink-mute">
                  {$t['cal.detail.verifiziert']}
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Author-only moderation banner. Shows above the description
             when the event is pending / rejected / community-reported and
             the viewer is the author. Reuses the forum's banner component
             so copy + visuals match across surfaces. -->
        {#if ownState}
          <div class="mb-4">
            <OwnStatusBanner state={ownState} reason={event.rejectionReason} />
          </div>
        {/if}

        <!-- Description -->
        {#if event.body}
          <div
            class="font-instrument text-[15px] leading-[1.6] text-ink pt-3 border-t border-dashed border-rule whitespace-pre-line"
          >
            {event.body}
          </div>
        {/if}

        <!-- Practical info chips (rendered from event.tags). -->
        {#if practicalChips.length > 0}
          <div class="mt-4 flex flex-wrap gap-1.5">
            {#each practicalChips as chip (chip)}
              <span
                class="inline-flex items-center px-2.5 py-1 rounded-full border border-rule font-dmmono text-[11px] text-ink-soft"
              >
                {chip}
              </span>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Right — RSVP rail -->
      <div
        class="px-5 py-5 md:px-6 md:py-6 bg-paper-soft flex flex-col gap-3 md:overflow-auto md:max-h-[calc(100vh-80px)]"
      >
        <RsvpButtons
          eventId={eventId}
          myStatus={myStatus}
          currentUserId={currentUserId}
        />

        {#if myStatus}
          <div
            class="px-3 py-2 bg-paper border-[1.5px] border-success rounded-sm font-instrument italic text-[12.5px] text-ink leading-[1.5]"
          >
            ✓
            {myStatus === 'going'
              ? $t['cal.detail.rsvp.confirm.going']
              : $t['cal.detail.rsvp.confirm.maybe']}
            {#if goingCountFx > 1}
              <span class="text-ink-mute">
                {(goingCountFx - 1 === 1
                  ? $t['cal.detail.rsvp.others.one']
                  : $t['cal.detail.rsvp.others.many']
                ).replace('{n}', String(goingCountFx - 1))}
              </span>
            {/if}
          </div>
        {/if}

        <!-- Attendance ledger -->
        <div>
          <div
            class="flex items-baseline justify-between border-b-[1.5px] border-ink pb-1 mb-2"
          >
            <span
              class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-ink"
            >{$t['cal.detail.attendance.kicker']}</span>
            {#if event.capacity}
              <span class="font-dmmono text-[11px] font-semibold">
                {goingCount} / {event.capacity}
              </span>
            {/if}
          </div>

          {#if event.capacity}
            <div class="mb-2">
              <CapacityBar going={goingCount} maybe={maybeCount} capacity={event.capacity} />
            </div>
          {/if}

          <div class="font-dmmono text-[10.5px] text-ink-mute mb-1.5">
            <b class="text-success">{goingCount}</b>
            {$t['cal.detail.attendance.going']}
            <span class="ml-3">
              <b class="text-warn">{maybeCount}</b>
              {$t['cal.detail.attendance.maybe']}
            </span>
          </div>

          <div class="flex items-center flex-wrap gap-x-3 gap-y-1.5">
            <AttendeeStack users={attendees} userIds={goingArr} />
            {#if attendees.length > 0}
              {@const previewNames = attendees
                .slice(0, 2)
                .map((a) => (a.name ?? '').trim().split(/\s+/)[0])
                .filter(Boolean)
                .join(', ')}
              {@const more = Math.max(0, goingCount - 2)}
              <span class="font-dmmono text-[10.5px] text-ink-soft">
                {previewNames}{#if more > 0}
                  <span class="text-ink-mute">
                    {' '}{($t['cal.detail.attendance.others'] as string).replace('{n}', String(more))}
                  </span>
                {/if}
              </span>
            {/if}
          </div>
        </div>

        <!-- Export + footer -->
        <div class="mt-auto">
          <div
            class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-ink-mute mb-1.5"
          >{$t['cal.detail.export']}</div>
          <!-- Solid ink-filled pills per CD's design (was ghost-outlined). -->
          <div class="flex gap-1.5">
            {#each ['.ics', 'Google', $t['cal.detail.export.share']] as label, i (i)}
              <button
                type="button"
                class="inline-flex items-center px-3 py-1 rounded-full bg-ink text-paper border-2 border-ink font-bricolage font-semibold text-[12px] hover:scale-[1.02] transition-transform duration-[180ms] ease-out"
              >
                {label}
              </button>
            {/each}
          </div>
          <div
            class="mt-4 pt-2.5 border-t border-dashed border-rule flex justify-between font-dmmono text-[10px] text-ink-mute"
          >
            <button type="button" onclick={onClose} class="hover:text-ink">
              {$t['cal.detail.back']}
            </button>
            {#if currentUserId && !isAuthor}
              <button type="button" onclick={onReportClick} class="hover:text-danger">
                {$t['cal.detail.report']}
              </button>
            {/if}
          </div>
        </div>
      </div>

      <!-- Close button -->
      <button
        type="button"
        onclick={onClose}
        aria-label={$t['cal.detail.close']}
        class="absolute top-3 right-3 w-9 h-9 rounded-full bg-paper border-2 border-ink font-dmmono text-[16px] font-semibold hover:scale-105 transition-transform"
      >✕</button>
    </div>
  {/if}
</dialog>

{#if event}
  <KioskReportModal
    open={reportOpen}
    contentId={String(event._id)}
    contentType="event"
    contentTitle={event.title}
    onClose={() => (reportOpen = false)}
  />
{/if}

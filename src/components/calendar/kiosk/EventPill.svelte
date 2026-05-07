<script lang="ts">
  // Single in-grid event pill rendered inside one calendar cell. Per
  // `kiosk-calendar.jsx:215–255`, the same pill component is rendered
  // in every cell the event spans, with `spanStart` / `spanMid` /
  // `spanEnd` flags driving border-radius, side borders, and which
  // piece carries the title text.

  import { format } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';
  import { CATEGORIES } from '../../../lib/calendar/categories';
  import { eventSpanDays } from '../../../lib/calendar/eventTime';
  import { locale, t } from '../../../lib/kiosk-i18n';
  import type { Event as EventDoc, EventCategory } from '../../../types';

  let {
    ev,
    spanStart = true,
    spanMid = false,
    spanEnd = true,
    isLive = false,
    onclick
  } = $props<{
    ev: EventDoc;
    spanStart?: boolean;
    spanMid?: boolean;
    spanEnd?: boolean;
    isLive?: boolean;
    onclick?: () => void;
  }>();

  // Normalise — single-day events arrive with all three flags = true.
  const isLeading = $derived(spanStart || (!spanMid && !spanEnd));
  const isTrailing = $derived(spanEnd || (!spanMid && !spanStart));

  const cat = $derived((ev.category ?? 'kiez') as EventCategory);
  const style = $derived(CATEGORIES[cat]);
  const dateLocale = $derived($locale === 'de' ? deLocale : enUS);

  // Multi-day events render with a `· N Tage` suffix on the title
  // (per CD's spec: "Tag der offenen Höfe · 4 Tage"). Single-day
  // events keep the bare title.
  const span = $derived(eventSpanDays(ev));
  const title = $derived(
    span > 1 ? `${ev.title} · ${span} ${$t['cal.span.days']}` : ev.title
  );
  const startDate = $derived(ev.startDate instanceof Date ? ev.startDate : new Date(ev.startDate));
  const timeLabel = $derived(
    ev.allDay ? $t['cal.allDay'] ?? '' : format(startDate, 'HH:mm', { locale: dateLocale })
  );
</script>

<button
  type="button"
  {onclick}
  onpointerdown={(e) => e.stopPropagation()}
  aria-label={title}
  class={`block w-full text-left ${style.bgClass} ${style.textOnFill} font-bricolage font-semibold text-[10.5px] leading-[1.3] px-1.5 py-px relative overflow-hidden whitespace-nowrap text-ellipsis border-y border-ink ${
    isLeading ? 'border-l rounded-l-[4px]' : ''
  } ${isTrailing ? 'border-r rounded-r-[4px]' : ''} ${
    spanMid || spanStart ? '-mr-px' : ''
  } hover:brightness-95 transition-[filter] duration-150`}
>
  {#if isLeading}
    <span class="inline-flex items-center gap-1">
      {#if isLive}
        <span
          class="inline-block w-[5px] h-[5px] rounded-full bg-ochre border border-ink shrink-0 k-cal-live-dot"
          aria-hidden="true"
        ></span>
      {/if}
      {#if !ev.allDay}
        <span class="font-dmmono text-[9px] opacity-90 font-medium">{timeLabel}</span>
      {/if}
      <span class="overflow-hidden text-ellipsis">{title}</span>
    </span>
  {:else}
    <!-- mid / end pieces stay blank so the colored bar runs unbroken -->
    <span class="opacity-0 select-none" aria-hidden="true">·</span>
  {/if}
</button>

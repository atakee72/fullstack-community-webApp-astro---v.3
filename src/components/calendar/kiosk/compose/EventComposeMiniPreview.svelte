<script lang="ts">
  // Live preview card for the event compose route. Hand-rolled (not a
  // reused EventCard) because the composed event has no _id /
  // moderation state yet, and the scaled-down typography differs from
  // a production card. Per `kiosk-calendar-flows.jsx:407–443`.

  import { format, isValid } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';
  import { CATEGORIES } from '../../../../lib/calendar/categories';
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import type { EventCategory } from '../../../../types';

  type Values = {
    title: string;
    body: string;
    category: EventCategory;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    allDay: boolean;
    location: string;
  };

  let { values } = $props<{ values: Values }>();

  const dateLocale = $derived($locale === 'de' ? deLocale : enUS);
  const cat = $derived(values.category);
  const style = $derived(CATEGORIES[cat]);

  // Compose a Date object from date+time strings; show fallback dash
  // when invalid.
  const startObj = $derived.by(() => {
    if (!values.startDate) return null;
    const ts = values.allDay
      ? `${values.startDate}T00:00`
      : `${values.startDate}T${values.startTime || '00:00'}`;
    const d = new Date(ts);
    return isValid(d) ? d : null;
  });

  const dateLabel = $derived(
    startObj ? format(startObj, $locale === 'de' ? 'd.M.' : 'MMM d', { locale: dateLocale }) : '—'
  );
  const timeLabel = $derived(
    values.allDay
      ? $t['cal.allDay']
      : startObj
      ? `${values.startTime || '–'}${values.endTime ? '–' + values.endTime : ''}`
      : '—'
  );

  const catLabel = $derived(
    ($t[`cal.cat.${cat}.label` as const] as string)?.toUpperCase() ?? cat.toUpperCase()
  );
</script>

<p class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-wine mb-2">
  ◆ {$t['cal.compose.preview.kicker']}
</p>

<div
  class="bg-paper border-[1.5px] border-ink rounded-md p-3.5 mb-5 shadow-[2px_2px_0_var(--k-wine,#b23a5b)]"
>
  <div class={`font-dmmono text-[10px] uppercase tracking-[0.12em] ${style.textClass} mb-1`}>
    {style.glyph} {catLabel} · {dateLabel} · {timeLabel}
  </div>
  {#if values.title}
    <div
      class="font-bricolage font-bold text-[16px] tracking-[-0.015em] mb-1.5 break-words hyphens-auto"
    >
      {values.title}
    </div>
  {:else}
    <div class="font-instrument italic text-ink-mute/70 mb-1.5 text-[13px]">
      {$t['cal.compose.field.title.placeholder']}
    </div>
  {/if}
  {#if values.location}
    <div class="font-instrument italic text-[12px] text-ink-mute mb-1.5">
      {values.location}
    </div>
  {/if}
  {#if values.body}
    <p
      class="font-bricolage text-[12px] leading-[1.5] text-ink-soft m-0 break-words hyphens-auto line-clamp-3"
    >
      {values.body}
    </p>
  {/if}
</div>

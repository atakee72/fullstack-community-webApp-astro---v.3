<script lang="ts">
  // Single agenda event row — 4-column grid:
  //   time | colored rule | body | RSVP+details CTA
  // Per `kiosk-calendar-views.jsx:13–133`.

  import { format } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';
  import { CATEGORIES } from '../../../lib/calendar/categories';
  import { eventSpanDays, isLiveNow } from '../../../lib/calendar/eventTime';
  import { t, locale } from '../../../lib/kiosk-i18n';
  import type { Event as EventDoc, EventCategory } from '../../../types';

  let {
    ev,
    onPick,
    onRsvp
  } = $props<{
    ev: EventDoc;
    onPick?: (ev: EventDoc) => void;
    onRsvp?: (ev: EventDoc) => void;
  }>();

  const dateLocale = $derived($locale === 'de' ? deLocale : enUS);
  const cat = $derived((ev.category ?? 'kiez') as EventCategory);
  const style = $derived(CATEGORIES[cat]);

  const start = $derived(ev.startDate instanceof Date ? ev.startDate : new Date(ev.startDate));
  const end = $derived(ev.endDate instanceof Date ? ev.endDate : new Date(ev.endDate));

  const startTime = $derived(
    ev.allDay ? $t['cal.allDay'] : format(start, 'HH:mm', { locale: dateLocale })
  );
  const endTime = $derived(ev.allDay ? '' : format(end, 'HH:mm', { locale: dateLocale }));

  const span = $derived(eventSpanDays(ev));
  const live = $derived(isLiveNow(ev));

  const goingCount = $derived(ev.rsvps?.going?.length ?? 0);
  const maybeCount = $derived(ev.rsvps?.maybe?.length ?? 0);

  const author = $derived(
    typeof ev.author === 'object' && ev.author !== null && 'name' in ev.author
      ? (ev.author as any).name
      : null
  );

  function categoryLabel(c: EventCategory): string {
    return $t[`cal.cat.${c}.label` as const] as string;
  }
</script>

<article
  class="grid grid-cols-[76px_6px_1fr_auto] gap-3.5 items-stretch py-3.5 border-b border-dashed border-rule"
>
  <!-- Time column -->
  <div class="pt-0.5">
    <div
      class={`font-dmmono font-semibold text-[13px] tracking-[-0.01em] ${
        live ? 'text-wine' : 'text-ink'
      }`}
    >
      {startTime}
    </div>
    {#if endTime && !ev.allDay}
      <div class="font-dmmono text-[10px] text-ink-mute">– {endTime}</div>
    {/if}
    {#if live}
      <div
        class="inline-flex items-center gap-1 mt-1 font-dmmono text-[9px] uppercase tracking-[0.1em] font-semibold text-ochre"
      >
        <span
          class="w-[6px] h-[6px] rounded-full bg-ochre border border-ink k-cal-live-dot"
          aria-hidden="true"
        ></span>
        {$t['cal.live.label']}
      </div>
    {/if}
  </div>

  <!-- Color rule -->
  <div
    class={`${style.bgClass} rounded-[2px] self-stretch border-[0.5px] border-ink`}
    aria-hidden="true"
  ></div>

  <!-- Body -->
  <div class="min-w-0">
    <div class="flex items-center flex-wrap gap-1.5 mb-1">
      <span
        class={`font-dmmono font-semibold text-[10px] tracking-[0.1em] ${style.textClass}`}
      >
        {style.glyph} {categoryLabel(cat).toUpperCase()}
      </span>
      {#if span > 1}
        <span
          class="font-dmmono text-[9.5px] text-ink-mute tracking-[0.05em] px-[5px] py-px border border-rule rounded-[3px]"
        >
          {span} {$t['cal.span.days']}
        </span>
      {/if}
    </div>

    <h4
      class="font-bricolage font-bold text-[16.5px] tracking-[-0.018em] leading-[1.2] mb-1 [text-wrap:balance]"
    >
      <button
        type="button"
        onclick={() => onPick?.(ev)}
        class="text-left hover:underline decoration-wine underline-offset-2"
      >
        {ev.title}
      </button>
    </h4>

    {#if ev.location}
      <div class="font-instrument italic text-[12.5px] text-ink-mute mb-1.5">
        {ev.location}
        {#if author}
          <span class="font-dmmono not-italic text-[10.5px] text-ink-mute">
            {' · '}{$locale === 'de' ? 'von' : 'by'} {author}
          </span>
        {/if}
      </div>
    {/if}

    {#if goingCount > 0 || maybeCount > 0}
      <div class="flex flex-wrap gap-2.5 items-center font-dmmono text-[10.5px] text-ink-soft">
        <span><b class="text-success">{goingCount}</b> {$t['cal.agenda.row.going']}</span>
        <span><b class="text-warn">{maybeCount}</b> {$t['cal.agenda.row.maybe']}</span>
        {#if ev.capacity}
          <span class="text-ink-mute">
            · {$t['cal.agenda.row.cap']} {ev.capacity}
          </span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- RSVP / details column -->
  <div class="flex flex-col gap-1 items-end">
    <button
      type="button"
      onclick={() => onRsvp?.(ev)}
      class="px-3 py-1 rounded-full bg-wine text-paper border-2 border-ink font-bricolage font-semibold text-[11.5px] hover:scale-[1.02] transition-transform duration-[180ms] ease-out"
    >
      {$t['cal.rsvp.going.cta']}
    </button>
    <button
      type="button"
      onclick={() => onPick?.(ev)}
      class="font-dmmono text-[10px] text-ink-mute hover:text-ink underline-offset-2 hover:underline"
    >
      → {$t['cal.agenda.row.details']}
    </button>
  </div>
</article>

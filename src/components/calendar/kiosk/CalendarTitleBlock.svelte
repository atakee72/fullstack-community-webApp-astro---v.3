<script lang="ts">
  // Calendar page header — kicker + carved-italic display title + stats
  // row with the month stepper and new-event CTA on the right. The view
  // switcher / coachmark / Heute live on the category-rail row beneath
  // (see CalCategoryRail.svelte).

  import { t } from '../../../lib/kiosk-i18n';

  type View = 'month' | 'agenda' | 'day';

  let {
    monthLabel = '',
    visibleMonthLabel = '',
    weekEvents = 0,
    weekRange = '',
    liveNow = 0,
    goingToday = 0,
    onPrevMonth,
    onNextMonth,
    view = 'month',
    onView
  } = $props<{
    monthLabel?: string;
    visibleMonthLabel?: string;
    weekEvents?: number;
    weekRange?: string;
    liveNow?: number;
    goingToday?: number;
    onPrevMonth?: () => void;
    onNextMonth?: () => void;
    view?: View;
    onView?: (v: View) => void;
  }>();

  const views: { k: View; label: () => string }[] = [
    { k: 'month',  label: () => $t['cal.view.month']  },
    { k: 'agenda', label: () => $t['cal.view.agenda'] },
    { k: 'day',    label: () => $t['cal.view.day']    }
  ];
</script>

<section
  class="px-4 md:px-9 lg:px-10 pt-6 pb-4 border-b border-dashed border-rule"
>
  <div class="font-dmmono text-[11px] uppercase tracking-[0.12em] text-teal">
    {$t['cal.title.kicker']}{#if monthLabel} · {monthLabel}{/if}
  </div>
  <h1
    class="hidden lg:block font-bricolage font-extrabold text-ink leading-[0.95] tracking-tight mt-1.5 text-[40px] md:text-[48px] lg:text-[56px]"
  >
    {$t['cal.title.q1']}
    <span class="font-instrument italic font-normal text-teal">
      {$t['cal.title.q2']}
    </span>
    {$t['cal.title.q3']}
  </h1>

  <div class="mt-4 lg:mt-2.5 flex flex-wrap items-end justify-between gap-x-5 gap-y-5 lg:gap-y-3">
    <div class="flex flex-wrap gap-x-4 gap-y-1 font-dmmono text-[11px] text-ink-mute">
      <span
        ><b class="text-ink">{weekEvents}</b>
        {$t['cal.stat.weekEvents']}{#if weekRange}<span class="opacity-70 ml-1"
            >· {weekRange}</span
          >{/if}</span
      >
      <span><b class="text-ochre">{liveNow}</b> {$t['cal.stat.liveNow']}</span>
      <span><b class="text-ink">{goingToday}</b> {$t['cal.stat.goingToday']}</span>
    </div>

    <!-- Right side of the stats row: month stepper · view switcher ·
         new-event CTA. Coachmark `?` + Heute still live on the
         category-rail row beneath (see CalCategoryRail). -->
    <div class="flex items-center flex-wrap gap-3">
      <!-- Month stepper — ‹ MAI 2026 › per CD's desktop header. -->
      <!-- No `overflow-hidden` here on purpose: it used to clip the pill's
           corners, but it also clipped the buttons' invisible hit-area
           extenders, so the enlarged tap targets silently did nothing
           (rects measured right, `elementFromPoint` still missed). The end
           buttons carry `rounded-l/r-full` instead, which reproduces the
           same clipped-corner look without a clipping container. -->
      <div
        data-tour="cal-month-nav"
        class="inline-flex items-center border-2 border-ink rounded-full font-dmmono text-[11px] font-semibold"
      >
        <button
          type="button"
          onclick={onPrevMonth}
          aria-label={$t['cal.nav.prevMonth.aria']}
          class="relative rounded-l-full px-2.5 py-1 leading-none hover:bg-paper-warm transition-colors"
        >
          ‹
          <span aria-hidden="true" style="position:absolute; inset:-16px -9px -9px;"></span>
        </button>
        <span
          class="px-3 py-1 border-l-2 border-r-2 border-ink uppercase tracking-[0.05em]"
        >
          {visibleMonthLabel}
        </span>
        <button
          type="button"
          onclick={onNextMonth}
          aria-label={$t['cal.nav.nextMonth.aria']}
          class="relative rounded-r-full px-2.5 py-1 leading-none hover:bg-paper-warm transition-colors"
        >
          ›
          <span aria-hidden="true" style="position:absolute; inset:-16px -9px -9px;"></span>
        </button>
      </div>

      <!-- View switcher — Monat / Agenda / Tag. Modelled as a group of
           toggle buttons (`aria-pressed`), not a tablist: these switch the
           calendar body in place, and there is no `role="tabpanel"` /
           `aria-controls` target nor roving-tabindex arrow navigation to
           back up tab semantics. Mirrors CalCategoryRail's pills. -->
      <div
        data-tour="cal-view"
        class="inline-flex border-2 border-ink rounded-full font-dmmono text-[11px] font-semibold shrink-0"
        role="group"
        aria-label={$t['cal.view.switcher.aria']}
      >
        {#each views as v, i (v.k)}
          <button
            type="button"
            aria-pressed={view === v.k}
            onclick={() => onView?.(v.k)}
            class="relative px-3 py-1 transition-colors {
              view === v.k ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-warm'
            } {i > 0 ? 'border-l-2 border-ink' : ''} {
              i === 0 ? 'rounded-l-full' : i === views.length - 1 ? 'rounded-r-full' : ''
            }"
          >
            {v.label()}
            <!-- Vertical-only extender: the three buttons are flush
                 neighbours, so any horizontal growth would steal a
                 neighbour's tap zone. They are already ≥44px wide. -->
            <span aria-hidden="true" style="position:absolute; inset:-9px 0 -11px;"></span>
          </button>
        {/each}
      </div>

      <!-- New event CTA — ink fill + wine print shadow per CD's design.
           Hidden on mobile (`< lg`) since the floating FAB at the bottom
           right of `CalendarPageInner` handles new-event creation there. -->
      <a
        href="/events/create"
        class="hidden lg:inline-flex items-center px-6 py-2.5 rounded-full border-2 border-ink bg-ink text-paper font-bricolage font-semibold text-[13px] shadow-[3px_3px_0_var(--k-wine,#b23a5b)] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_var(--k-wine,#b23a5b)] transition-[transform,box-shadow] duration-[120ms] ease-out"
      >
        {$t['cal.cta.newEvent']}
      </a>
    </div>
  </div>
</section>

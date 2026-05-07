<script lang="ts">
  // Calendar page header — kicker + carved-italic display title + stat
  // bar + view switcher + new-event CTA.
  // Per JSX `kiosk-calendar.jsx:128–170`.

  import { t, locale } from '../../../lib/kiosk-i18n';

  type View = 'month' | 'agenda' | 'day';

  let {
    view = 'month',
    onView,
    monthLabel = '',
    weekEvents = 0,
    liveNow = 0,
    goingToday = 0,
    showToday = false,
    onToday
  } = $props<{
    view?: View;
    onView?: (v: View) => void;
    monthLabel?: string;
    weekEvents?: number;
    liveNow?: number;
    goingToday?: number;
    showToday?: boolean;
    onToday?: () => void;
  }>();

  const views: { k: View; label: () => string }[] = [
    { k: 'month',  label: () => $t['cal.view.month']  },
    { k: 'agenda', label: () => $t['cal.view.agenda'] },
    { k: 'day',    label: () => $t['cal.view.day']    }
  ];
</script>

<section
  class="px-4 md:px-9 lg:px-10 pt-6 pb-4 grid grid-cols-1 md:grid-cols-[1fr_auto] items-end gap-5 border-b border-dashed border-rule"
>
  <div>
    <div class="font-dmmono text-[11px] uppercase tracking-[0.12em] text-wine">
      {$t['cal.title.kicker']}{#if monthLabel} · {monthLabel}{/if}
    </div>
    <h1
      class="font-bricolage font-extrabold text-ink leading-[0.95] tracking-tight mt-1.5 text-[40px] md:text-[48px] lg:text-[56px]"
    >
      {$t['cal.title.q1']}
      <span class="font-instrument italic font-normal text-wine">
        {$t['cal.title.q2']}
      </span>
      {$t['cal.title.q3']}
    </h1>
    <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 font-dmmono text-[11px] text-ink-mute">
      <span><b class="text-ink">{weekEvents}</b> {$t['cal.stat.weekEvents']}</span>
      <span><b class="text-ochre">{liveNow}</b> {$t['cal.stat.liveNow']}</span>
      <span><b class="text-ink">{goingToday}</b> {$t['cal.stat.goingToday']}</span>
    </div>
  </div>

  <div class="flex items-center gap-2 self-end md:self-auto">
    <!-- "Heute" — appears only when visibleMonth has drifted off today. -->
    {#if showToday}
      <button
        type="button"
        onclick={onToday}
        class="inline-flex items-center px-2.5 py-1 rounded-full border border-rule font-dmmono text-[11px] uppercase tracking-[0.05em] text-ink-soft hover:text-ink hover:border-ink transition-colors"
      >
        {$t['cal.cell.today']}
      </button>
    {/if}

    <!-- Segmented view switcher -->
    <div
      class="hidden sm:inline-flex border-2 border-ink rounded-full overflow-hidden font-dmmono text-[11px] font-semibold"
      role="tablist"
      aria-label="View"
    >
      {#each views as v, i (v.k)}
        <button
          type="button"
          role="tab"
          aria-selected={view === v.k}
          onclick={() => onView?.(v.k)}
          class="px-3 py-1 transition-colors {
            view === v.k ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-warm'
          } {i > 0 ? 'border-l-2 border-ink' : ''}"
        >
          {v.label()}
        </button>
      {/each}
    </div>

    <!-- New event CTA — ink fill + wine print shadow per CD's design. -->
    <a
      href="/events/create"
      class="inline-flex items-center px-4 py-1.5 rounded-full border-2 border-ink bg-ink text-paper font-bricolage font-semibold text-[13px] shadow-[3px_3px_0_var(--k-wine,#b23a5b)] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_var(--k-wine,#b23a5b)] transition-[transform,box-shadow] duration-[120ms] ease-out"
    >
      {$t['cal.cta.newEvent']}
    </a>
  </div>
</section>

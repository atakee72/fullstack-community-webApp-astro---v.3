<script lang="ts">
  // Category filter rail — single-select with "Alle" reset pill on the
  // far left. Per-category pills default to outlined; only the isolated
  // active category fills with its color. After a vertical separator,
  // "Zugesagt" + "Gespeichert" toggle chips. On the right end the
  // desktop coachmark / Heute / view switcher cluster (mirrors
  // CalendarTitleBlock's stats-row stepper + CTA one row above).

  import { t } from '../../../lib/kiosk-i18n';
  import { CATEGORIES, CATEGORY_ORDER } from '../../../lib/calendar/categories';
  import { scrollFade } from '../../../lib/scrollFade';
  import type { EventCategory } from '../../../types';

  type View = 'month' | 'agenda' | 'day';

  let {
    active,
    isAllActive = false,
    onSelectAll,
    onSelectOnly,
    myRsvps = false,
    saved = false,
    onMyRsvps,
    onSaved,
    view = 'month',
    showToday = false,
    onToday
  } = $props<{
    active: Set<EventCategory>;
    isAllActive?: boolean;
    onSelectAll?: () => void;
    onSelectOnly?: (cat: EventCategory) => void;
    myRsvps?: boolean;
    saved?: boolean;
    onMyRsvps?: () => void;
    onSaved?: () => void;
    view?: View;
    showToday?: boolean;
    onToday?: () => void;
  }>();
</script>

<section
  class="px-4 md:px-9 lg:px-10 py-3 flex items-center flex-wrap gap-2 border-b border-dashed border-rule"
>
  <!-- Pills wrapper: horizontally-scrollable with peek/fade on mobile,
       dissolves into the parent flex (`lg:contents`) on desktop so the
       Alle + category + Zusagen/Gespeichert pills wrap inline next to
       the right-side cluster as before. -->
  <div
    use:scrollFade
    class="kiosk-scroll-fade no-scrollbar w-full overflow-x-auto flex items-center gap-2 lg:contents"
  >
    <!-- Alle (reset to all-on) — filled ink when isAllActive. -->
    <button
      type="button"
      onclick={() => onSelectAll?.()}
      aria-pressed={isAllActive}
      class="shrink-0 inline-flex items-center px-3.5 py-1 rounded-full font-bricolage font-semibold text-[12px] border-[1.5px] border-ink transition-colors {
        isAllActive ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-warm'
      }"
    >
      {$t['cal.filter.all']}
    </button>

    {#each CATEGORY_ORDER as cat (cat)}
      {@const style = CATEGORIES[cat]}
      {@const isOnly = !isAllActive && active.size === 1 && active.has(cat)}
      <button
        type="button"
        onclick={() => onSelectOnly?.(cat)}
        aria-pressed={isOnly}
        class="shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full font-bricolage font-semibold text-[12px] border-[1.5px] border-ink transition-colors {
          isOnly
            ? `${style.bgClass} ${style.textOnFill}`
            : 'bg-transparent text-ink hover:bg-paper-warm'
        }"
      >
        {#if !isOnly}
          <span
            class={`w-[8px] h-[8px] ${style.bgClass} border border-ink/40`}
            aria-hidden="true"
          ></span>
        {/if}
        <span>{$t[`cal.cat.${cat}.label` as const]}</span>
      </button>
    {/each}

    <span class="shrink-0 w-px h-[18px] bg-rule mx-1" aria-hidden="true"></span>

    <button
      type="button"
      onclick={onMyRsvps}
      aria-pressed={myRsvps}
      class="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full font-bricolage font-semibold text-[12px] border-[1.5px] border-ink transition-colors {
        myRsvps ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-warm'
      }"
    >
      {$t['cal.filter.myRsvps']}
    </button>

    <button
      type="button"
      onclick={onSaved}
      aria-pressed={saved}
      class="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full font-bricolage font-semibold text-[12px] border-[1.5px] border-ink transition-colors {
        saved ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-warm'
      }"
    >
      {$t['cal.filter.saved']}
    </button>
  </div>

  <!-- Right-side cluster: coachmark + Heute + view switcher. Mirrors the
       stats-row stepper + CTA one row above (see CalendarTitleBlock). -->
  <div class="ml-auto flex items-center gap-2">
    <!-- "?" — reopens the drag-select coachmark. Only relevant in the
         desktop month grid view (mobile has no drag-select; agenda/day
         views don't expose the date grid). Bridges to DragSelectCoachmark
         via a window CustomEvent so we don't have to prop-drill
         through CalendarPageInner + MonthGrid. -->
    {#if view === 'month'}
      <button
        type="button"
        onclick={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kiosk-calendar:coachmark.show'));
          }
        }}
        aria-label={$t['cal.coachmark.reopen.aria']}
        class="hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-full border border-rule font-dmmono text-[12px] font-semibold text-ink-soft hover:text-ink hover:border-ink transition-colors"
      >
        ?
      </button>
    {/if}

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

  </div>
</section>

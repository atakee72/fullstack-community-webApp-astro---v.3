<script lang="ts">
  // Floating tooltip ("+" pin) that springs in at the pointerup
  // location after a drag-select on the month grid. Per
  // `kiosk-calendar-views.jsx:449–510`. Animation: `k-cal-pin-pop`
  // keyframe in global.css.
  //
  // Two CTAs:
  //   "+ neuer termin" → navigate to /events/create with prefilled
  //                      ?from=...&to=... (parent owns the navigation
  //                      via onConfirm so unit-testing is easy)
  //   "abbrechen"      → dismiss without creating

  import { format, differenceInCalendarDays } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';
  import { t, locale } from '../../../lib/kiosk-i18n';

  let {
    x,
    y,
    from,
    to,
    flip = false,
    tailX = 12,
    onConfirm,
    onCancel
  } = $props<{
    x: number;
    y: number;
    from: Date;
    to: Date;
    /** Render ABOVE the anchor: `y` is then the pin's BOTTOM edge (the
     *  wrapper is pulled up by its own height), so the caller never has to
     *  estimate how tall the pin renders. Tail flips to point down. */
    flip?: boolean;
    /** Tail offset from the pin's left edge — points the tail at the anchor
     *  cell even after `x` has been clamped to stay inside the grid. */
    tailX?: number;
    onConfirm: () => void;
    onCancel: () => void;
  }>();

  const dateLocale = $derived($locale === 'de' ? deLocale : enUS);
  const days = $derived(differenceInCalendarDays(to, from) + 1);

  const dateLabel = $derived.by(() => {
    if (days === 1) {
      return format(from, $locale === 'de' ? 'd. MMMM · EEEE' : 'MMM d · EEEE', {
        locale: dateLocale
      });
    }
    // Same month: „29.–30. September" / "Sep 29–30". Across a month
    // boundary (a range may spill into the neighbouring month) both ends
    // name their month, abbreviated so the pin stays narrow.
    const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
    const f = sameMonth
      ? format(from, $locale === 'de' ? 'd.' : 'd', { locale: dateLocale })
      : format(from, $locale === 'de' ? 'd. MMM' : 'MMM d', { locale: dateLocale });
    const t2 = sameMonth
      ? format(to, $locale === 'de' ? 'd. MMMM' : 'MMM d', { locale: dateLocale })
      : format(to, $locale === 'de' ? 'd. MMM' : 'MMM d', { locale: dateLocale });
    const dowF = format(from, 'EEEEE', { locale: dateLocale });
    const dowT = format(to, 'EEEEE', { locale: dateLocale });
    return `${f}${sameMonth ? '–' : ' – '}${t2} · ${dowF}–${dowT}`;
  });

  const kicker = $derived(
    days === 1
      ? ($t['cal.drag.kicker.day'] as string)
      : ($t['cal.drag.kicker.days'] as string).replace('{n}', String(days))
  );

  // The pin renders BOTH a long and a short label for each button —
  // CSS picks which to show via responsive visibility classes:
  //   < lg → short ('+ termin' / 'abbr.')
  //   ≥ lg → long  ('+ neuer termin' / 'abbrechen')
  // Keeps the mobile tooltip compact without sacrificing desktop clarity.
</script>

<!-- The flip translate lives on this OUTER wrapper, never on `.k-cal-pin`:
     the pop keyframe animates `transform` with `both`, so a fill-forwards
     animated transform would win over an inline one on the same element. -->
<div
  class="absolute z-30"
  style:left="{x}px"
  style:top="{y}px"
  style:transform={flip ? 'translateY(-100%)' : null}
  role="dialog"
  aria-label={kicker}
>
 <div class="k-cal-pin">
  <div
    class="relative bg-ink text-paper border-2 border-ink rounded-md px-2.5 py-1.5 shadow-[4px_4px_0_var(--k-wine,#b23a5b)] min-w-[180px]"
  >
    <!-- Tail pointing at the anchor cell — up when the pin sits below it,
         down when it has been flipped above. -->
    {#if flip}
      <div
        class="absolute -bottom-1.5 w-0 h-0 border-l-[6px] border-r-[6px] border-l-transparent border-r-transparent border-t-[6px] border-t-ink"
        style:left="{tailX}px"
        aria-hidden="true"
      ></div>
    {:else}
      <div
        class="absolute -top-1.5 w-0 h-0 border-l-[6px] border-r-[6px] border-l-transparent border-r-transparent border-b-[6px] border-b-ink"
        style:left="{tailX}px"
        aria-hidden="true"
      ></div>
    {/if}

    <div class="font-dmmono text-[9px] uppercase tracking-[0.12em] text-ochre">
      ◆ {kicker}
    </div>
    <div class="font-bricolage font-bold text-[12.5px] mb-1.5 tracking-[-0.01em]">
      {dateLabel}
    </div>

    <div class="flex gap-1.5 whitespace-nowrap">
      <button
        type="button"
        onclick={onConfirm}
        class="bg-ochre text-ink border-[1.5px] border-paper rounded-full px-2.5 py-0.5 font-bricolage font-bold text-[12px] hover:scale-[1.02] transition-transform duration-[180ms] ease-out"
      >
        <span class="lg:hidden">{$t['cal.drag.confirm.short']}</span>
        <span class="hidden lg:inline">{$t['cal.drag.confirm']}</span>
      </button>
      <button
        type="button"
        onclick={onCancel}
        class="bg-transparent text-paper border-[1.5px] border-paper rounded-full px-2.5 py-0.5 font-bricolage font-semibold text-[12px] hover:bg-paper hover:text-ink transition-colors"
      >
        <span class="lg:hidden">{$t['cal.drag.cancel.short']}</span>
        <span class="hidden lg:inline">{$t['cal.drag.cancel']}</span>
      </button>
    </div>
  </div>
 </div>
</div>

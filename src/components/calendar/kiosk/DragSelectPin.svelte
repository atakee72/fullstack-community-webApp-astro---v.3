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
    onConfirm,
    onCancel
  } = $props<{
    x: number;
    y: number;
    from: Date;
    to: Date;
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
    const f = format(from, $locale === 'de' ? 'd.' : 'd', { locale: dateLocale });
    const t2 = format(to, $locale === 'de' ? 'd. MMMM' : 'MMM d', { locale: dateLocale });
    const dowF = format(from, 'EEEEE', { locale: dateLocale });
    const dowT = format(to, 'EEEEE', { locale: dateLocale });
    return `${f}–${t2} · ${dowF}–${dowT}`;
  });

  const kicker = $derived(
    days === 1
      ? ($t['cal.drag.kicker.day'] as string)
      : ($t['cal.drag.kicker.days'] as string).replace('{n}', String(days))
  );

  const ctaLabel = $derived(($t['cal.cta.newEvent'] as string).replace(/^[+\s]+/, '+ '));
</script>

<div
  class="absolute z-30 k-cal-pin"
  style:left="{x}px"
  style:top="{y}px"
  role="dialog"
  aria-label={kicker}
>
  <div
    class="relative bg-ink text-paper border-2 border-ink rounded-md px-3.5 py-2.5 shadow-[6px_6px_0_var(--k-wine,#b23a5b)] min-w-[240px]"
  >
    <!-- Tail pointing up to the pointerup cell -->
    <div
      class="absolute -top-2 left-4 w-0 h-0 border-l-[8px] border-r-[8px] border-l-transparent border-r-transparent border-b-[8px] border-b-ink"
      aria-hidden="true"
    ></div>

    <div class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-ochre mb-1">
      ◆ {kicker}
    </div>
    <div class="font-bricolage font-bold text-[14px] mb-2 tracking-[-0.01em]">
      {dateLabel}
    </div>

    <div class="flex gap-1.5">
      <button
        type="button"
        onclick={onConfirm}
        class="bg-ochre text-ink border-[1.5px] border-paper rounded-full px-3 py-1 font-bricolage font-bold text-[12px] hover:scale-[1.02] transition-transform duration-[180ms] ease-out"
      >
        {ctaLabel}
      </button>
      <button
        type="button"
        onclick={onCancel}
        class="bg-transparent text-paper border-[1.5px] border-paper rounded-full px-3 py-1 font-bricolage font-semibold text-[12px] hover:bg-paper hover:text-ink transition-colors"
      >
        {$t['cal.drag.cancel']}
      </button>
    </div>
  </div>
</div>

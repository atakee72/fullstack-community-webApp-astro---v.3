<script lang="ts">
  // Day separator in the agenda list — large date number + italic
  // weekday + "HEUTE · HH:MM" pill if today + month label on the
  // right. Per `kiosk-calendar-views.jsx:138–164`.

  import { format, isToday as isTodayDate } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';
  import { t, locale } from '../../../lib/kiosk-i18n';

  let { day } = $props<{ day: Date }>();

  // Short DOW per CD's design — '27. Mo', '30. Do', etc. Same hardcoded
  // arrays as CalendarMonthGrid's column header so the period-free DE
  // convention ('Mo' not 'Mo.') stays consistent.
  const DOW_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dateLocale = $derived($locale === 'de' ? deLocale : enUS);
  const today = $derived(isTodayDate(day));
  const dayNum = $derived(day.getDate());
  const dowShort = $derived(($locale === 'de' ? DOW_DE : DOW_EN)[day.getDay()]);
  const monthLong = $derived(format(day, 'MMMM yyyy', { locale: dateLocale }));
  const timeNow = $derived(format(new Date(), 'HH:mm'));
</script>

<div
  class="flex items-baseline gap-3 pb-1.5 mt-3.5 border-b-[1.5px] border-ink"
>
  <span
    class={`font-bricolage font-extrabold text-[32px] tracking-[-0.025em] ${
      today ? 'text-wine' : 'text-ink'
    }`}
  >{dayNum}.</span>

  <span class="font-instrument italic text-[18px] text-ink-soft">
    {dowShort}
  </span>

  {#if today}
    <span
      class="font-dmmono text-[10px] uppercase tracking-[0.1em] bg-wine text-paper px-[7px] py-px rounded-[3px]"
    >
      {$t['cal.cell.today']} · {timeNow}
    </span>
  {/if}

  <span class="ml-auto font-dmmono text-[10px] uppercase tracking-[0.05em] text-ink-mute">
    {monthLong}
  </span>
</div>

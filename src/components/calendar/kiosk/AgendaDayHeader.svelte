<script lang="ts">
  // Vertical date column on the left of each agenda day group.
  // Today: HEUTE · HH:MM mono label, big italic-serif day number,
  // italic weekday · month, no count line.
  // Other days: DOW mono label, big italic-serif day number, italic
  // month, wine "N TERMIN(E)" count.
  // Per CD's agenda design.

  import { format, isToday as isTodayDate, getISOWeek } from 'date-fns';
  import { de as deLocale, enUS } from 'date-fns/locale';
  import { t, locale } from '../../../lib/kiosk-i18n';

  let { day, eventCount = 0 } = $props<{
    day: Date;
    eventCount?: number;
  }>();

  const DOW_LONG_DE = ['SONNTAG', 'MONTAG', 'DIENSTAG', 'MITTWOCH', 'DONNERSTAG', 'FREITAG', 'SAMSTAG'];
  const DOW_LONG_EN = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  const DOW_INST_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const DOW_INST_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const dateLocale = $derived($locale === 'de' ? deLocale : enUS);
  const today = $derived(isTodayDate(day));
  const dayNum = $derived(day.getDate());
  const dowLong = $derived(($locale === 'de' ? DOW_LONG_DE : DOW_LONG_EN)[day.getDay()]);
  const dowInst = $derived(($locale === 'de' ? DOW_INST_DE : DOW_INST_EN)[day.getDay()]);
  const monthShort = $derived(format(day, 'MMM', { locale: dateLocale }));
  const weekNum = $derived(getISOWeek(day));
  const termLabel = $derived(
    eventCount === 1 ? $t['cal.agenda.term.one'] : $t['cal.agenda.term.many']
  );
</script>

<!-- Mobile layout — horizontal compact row. -->
<div class="lg:hidden flex items-baseline flex-wrap gap-x-2 gap-y-0.5 font-bricolage py-1">
  <span
    class={`font-instrument italic font-normal text-[28px] tracking-[-0.01em] leading-none ${
      today ? 'text-paper' : 'text-ink'
    }`}
  >
    {dayNum}.
  </span>
  <span
    class={`font-dmmono text-[10px] uppercase tracking-[0.1em] ${
      today ? 'text-ochre' : 'text-ink-mute'
    }`}
  >
    {today ? `${$t['cal.cell.today']} · ${$t['cal.week.prefix']} ${weekNum}` : dowLong}
  </span>
  <span class={`font-instrument italic text-[13px] ${today ? 'text-paper/70' : 'text-ink-soft'}`}>
    {today ? `${dowInst} · ${monthShort}` : monthShort}
  </span>
  {#if eventCount > 0 && !today}
    <span class="ml-auto font-dmmono text-[9.5px] uppercase tracking-[0.1em] text-wine">
      {eventCount} {termLabel}
    </span>
  {/if}
</div>

<!-- Desktop layout — vertical date column. -->
<div class="hidden lg:block font-bricolage pt-2">
  <div
    class={`font-dmmono text-[10px] uppercase tracking-[0.12em] ${
      today ? 'text-ochre' : 'text-ink-mute'
    }`}
  >
    {today ? `${$t['cal.cell.today']} · ${$t['cal.week.prefix']} ${weekNum}` : dowLong}
  </div>
  <div
    class={`font-instrument italic font-normal text-[64px] tracking-[-0.01em] leading-none mt-1 ${
      today ? 'text-paper' : 'text-ink'
    }`}
  >
    {dayNum}.
  </div>
  {#if today}
    <div class="font-instrument italic text-[14px] text-paper/80 mt-1">
      {dowInst} <span class="text-paper/60">· {monthShort}</span>
    </div>
  {:else}
    <div class="font-instrument italic text-[14px] text-ink-soft mt-1">
      {monthShort}
    </div>
  {/if}
  {#if eventCount > 0 && !today}
    <div class="font-dmmono text-[9.5px] uppercase tracking-[0.1em] text-wine mt-2">
      {eventCount} {termLabel}
    </div>
  {/if}
</div>

<script lang="ts">
  // Category filter rail — 6 colored pills (active = filled with category
  // color, inactive = outlined). Plus "Meine RSVPs" + "Gespeichert" toggle
  // chips and a live indicator on the right.
  // Per JSX `kiosk-calendar.jsx:175–210`.

  import { t } from '../../../lib/kiosk-i18n';
  import { CATEGORIES, CATEGORY_ORDER } from '../../../lib/calendar/categories';
  import type { EventCategory } from '../../../types';

  let {
    active,
    onToggle,
    myRsvps = false,
    saved = false,
    onMyRsvps,
    onSaved,
    liveCount = 0
  } = $props<{
    active: Set<EventCategory>;
    onToggle: (cat: EventCategory) => void;
    myRsvps?: boolean;
    saved?: boolean;
    onMyRsvps?: () => void;
    onSaved?: () => void;
    liveCount?: number;
  }>();

  function liveLabel(n: number) {
    return $t['cal.live.indicator'].replace('{n}', String(n));
  }
</script>

<section
  class="px-4 md:px-9 lg:px-10 py-3 flex items-center flex-wrap gap-2 border-b border-dashed border-rule"
>
  <span class="font-dmmono text-[10px] uppercase tracking-[0.1em] text-ink-mute mr-1">
    {$t['cal.filter.show']}
  </span>

  {#each CATEGORY_ORDER as cat (cat)}
    {@const style = CATEGORIES[cat]}
    {@const on = active.has(cat)}
    <button
      type="button"
      onclick={() => onToggle(cat)}
      aria-pressed={on}
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bricolage font-semibold text-[12px] border-[1.5px] transition-colors {
        on
          ? `${style.bgClass} ${style.borderClass} ${style.textOnFill}`
          : `bg-transparent ${style.borderClass} ${style.textClass}`
      }"
    >
      <span aria-hidden="true">{style.glyph}</span>
      <span>{$t[`cal.cat.${cat}.label` as const]}</span>
    </button>
  {/each}

  <span class="w-px h-[18px] bg-rule mx-1" aria-hidden="true"></span>

  <button
    type="button"
    onclick={onMyRsvps}
    aria-pressed={myRsvps}
    class="inline-flex items-center px-2.5 py-1 rounded-full font-bricolage font-semibold text-[12px] border-[1.5px] border-ink transition-colors {
      myRsvps ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-warm'
    }"
  >
    {$t['cal.filter.myRsvps']}
  </button>

  <button
    type="button"
    onclick={onSaved}
    aria-pressed={saved}
    class="inline-flex items-center px-2.5 py-1 rounded-full font-bricolage font-semibold text-[12px] border-[1.5px] border-ink transition-colors {
      saved ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-warm'
    }"
  >
    {$t['cal.filter.saved']}
  </button>

  <span
    class="ml-auto font-dmmono text-[10px] uppercase tracking-[0.1em] text-wine"
    aria-live="polite"
  >
    {liveLabel(liveCount)}
  </span>
</section>

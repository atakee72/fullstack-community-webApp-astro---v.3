<script lang="ts">
  // Empty state — active filter (tag or kind) returned zero matches.
  //
  // Replaces the entire feed (pinned + grid) when a filter is active and
  // produces no results. Per kiosk-forum-states.jsx ForumDesktopEmptyFilter
  // (line 91): paper-warm card on a 2px dashed rule border, an italic
  // "still." flourish in serif wine, headline + body, primary "+ erstes
  // Thema" + outline "Filter zurücksetzen" CTAs, and a row of related
  // tags at the bottom for redirection.
  //
  // The body interpolates the active filter label (e.g. "#kita" or
  // "Empfehlungen") via tStr().

  import KioskBtn from '../KioskBtn.svelte';
  import { t, tStr } from '../../../../lib/kiosk-i18n';

  let {
    filterLabel,
    relatedTags = [],
    onClear
  } = $props<{
    filterLabel: string;
    relatedTags?: string[];
    onClear: () => void;
  }>();
</script>

<div
  class="my-12 mx-2 md:mx-0 px-8 md:px-10 py-12 md:py-14 border-2 border-dashed border-rule rounded-2xl bg-paper-warm text-center"
>
  <div class="font-instrument italic text-wine text-5xl md:text-6xl leading-none mb-2">
    {$t['state.empty.filter.flourish']}
  </div>
  <h2 class="font-bricolage font-extrabold tracking-tight text-2xl md:text-[28px] text-ink mb-2">
    {$t['state.empty.filter.title']}
  </h2>
  <p
    class="font-instrument italic text-ink-soft text-base md:text-[17px] leading-relaxed max-w-lg mx-auto mb-5"
  >
    {tStr($t['state.empty.filter.body'], { filter: filterLabel })}
  </p>
  <div class="flex flex-wrap justify-center gap-2.5">
    <KioskBtn variant="primary" size="md" href="/topics/create">
      {$t['state.empty.filter.cta.start']}
    </KioskBtn>
    <KioskBtn variant="secondary" size="md" onclick={onClear}>
      {$t['state.empty.filter.cta.clear']}
    </KioskBtn>
  </div>
  {#if relatedTags.length > 0}
    <div
      class="mt-7 font-dmmono text-[10px] uppercase tracking-[0.05em] text-ink-mute flex items-center justify-center gap-2 flex-wrap"
    >
      <span>{$t['state.empty.filter.relatedTags']}</span>
      <span aria-hidden="true">·</span>
      <span class="flex flex-wrap gap-x-3 gap-y-1 normal-case tracking-normal">
        {#each relatedTags as tag (tag)}
          <span>#{tag}</span>
        {/each}
      </span>
    </div>
  {/if}
</div>

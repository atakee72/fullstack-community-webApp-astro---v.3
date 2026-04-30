<script lang="ts">
  // Empty state — zero posts in the entire feed (true cold-start).
  //
  // Per kiosk-forum-states.jsx ForumDesktopEmptyZero (line 119): ink-bg
  // hero panel with a riso-printed sun absolute-positioned top-right at
  // ~25 % opacity, mono ochre kicker, two-line headline (line 2 in
  // serif italic ochre), body paragraph, and primary "+ erstes Thema" +
  // outline "Wie funktioniert's?" CTAs.
  //
  // Replaces the entire feed (pinned + grid). Different mood from the
  // filter-empty panel: this is celebratory ("be the first voice"),
  // not consolatory.

  import KioskBtn from '../KioskBtn.svelte';
  import { t } from '../../../../lib/kiosk-i18n';
</script>

<div
  class="my-10 mx-2 md:mx-0 px-8 md:px-12 lg:px-14 py-14 md:py-16 lg:py-[60px] bg-ink text-paper rounded-2xl border-2 border-ink relative overflow-hidden shadow-[3px_3px_0_var(--k-wine)]"
>
  <!-- Riso sun decoration · top-right, ochre at 25% opacity -->
  <svg
    class="absolute -top-16 -right-16 opacity-25 pointer-events-none"
    width="280"
    height="280"
    viewBox="0 0 100 100"
    aria-hidden="true"
  >
    <circle cx="50" cy="50" r="30" fill="var(--k-ochre)" />
    {#each Array(12) as _, i}
      <rect
        x="49"
        y="4"
        width="2"
        height="12"
        fill="var(--k-ochre)"
        transform={`rotate(${i * 30} 50 50)`}
      />
    {/each}
  </svg>

  <div class="relative">
    <p class="font-dmmono text-[11px] uppercase tracking-[0.18em] text-ochre">
      {$t['state.empty.zero.kicker']}
    </p>
    <h2
      class="font-bricolage font-extrabold tracking-tight leading-[0.95] mt-2.5 mb-3.5 text-4xl md:text-5xl lg:text-[56px] max-w-2xl"
    >
      {$t['state.empty.zero.title.line1']}<br />
      <span class="font-instrument italic font-normal text-ochre">
        {$t['state.empty.zero.title.line2']}
      </span>
    </h2>
    <p
      class="text-[15px] leading-relaxed text-paper/75 max-w-xl mb-5"
    >
      {$t['state.empty.zero.body']}
    </p>
    <div class="flex flex-wrap gap-2.5">
      <KioskBtn variant="primary" size="md" href="/topics/create">
        {$t['state.empty.zero.cta.first']}
      </KioskBtn>
      <KioskBtn variant="secondary" size="md">
        {$t['state.empty.zero.cta.howto']}
      </KioskBtn>
    </div>
  </div>
</div>

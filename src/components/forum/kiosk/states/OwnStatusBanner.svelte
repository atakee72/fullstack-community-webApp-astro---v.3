<script lang="ts">
  // Author-status banner shown above (or wrapped with) a forum card whose
  // moderation status is non-trivial.
  //
  //   pending   → AI-flagged, awaiting review. Author-only visibility.
  //               Rendered inside a dashed-warn wrapper (managed by the
  //               parent so the banner stays single-purpose).
  //   rejected  → moderation declined. Author-only visibility. Rendered
  //               as a standalone block above a ghosted card.
  //   reported  → community-flagged. Author-only visibility (matches the
  //               other `state.own.*` cases — `Own` namespace = author).
  //               Rendered inside a dashed-plum wrapper above the
  //               author's own card. Non-authors see the post normally
  //               with a small ⚑ GEMELDET chip on the card itself; the
  //               banner is NOT shown to them (reports stay private to
  //               author + admin until acted on).
  //
  // Per-state colour maps to the JSX shadow-of-truth at lines 226 / 274 /
  // 332 of kiosk-forum-states.jsx — warn / danger / plum respectively.

  import StatusBadge from '../StatusBadge.svelte';
  import { t } from '../../../../lib/kiosk-i18n';

  type State = 'pending' | 'rejected' | 'reported';

  let { state, reason } = $props<{
    state: State;
    /** Admin's rejection note, when state === 'rejected' and the
     *  reviewer typed one. Rendered below the generic body as an
     *  italic quote so the author sees exactly why their post was
     *  declined. Other states ignore this prop. */
    reason?: string;
  }>();

  // Icon glyph + disc colour per state. These triple-up with the
  // StatusBadge inline so the banner is unmistakable even when colour
  // alone fails (high-contrast modes, screenshots, print).
  const config = $derived(
    state === 'pending'
      ? {
          glyph: '◐',
          discBg: 'bg-warn',
          surfaceBg: 'bg-warn/10',
          borderClass: '',
          badge: 'pending' as const
        }
      : state === 'rejected'
      ? {
          glyph: '✕',
          discBg: 'bg-danger',
          surfaceBg: 'bg-paper-warm',
          borderClass: 'border-[1.5px] border-danger',
          badge: 'rejected' as const
        }
      : {
          glyph: '⚑',
          discBg: 'bg-plum',
          surfaceBg: 'bg-plum/10',
          borderClass: 'border-[1.5px] border-plum',
          badge: null
        }
  );

  const titleKey = $derived(`state.own.${state}.title` as const);
  const bodyKey = $derived(`state.own.${state}.body` as const);
</script>

<div
  class={`px-4 py-2.5 rounded-md flex items-start gap-3 ${config.surfaceBg} ${config.borderClass}`}
  role="status"
  aria-live="polite"
>
  <span
    class={`shrink-0 inline-flex items-center justify-center text-paper text-[13px] font-bold ${config.discBg}`}
    style="width: 28px; height: 28px; border-radius: 50%;"
    aria-hidden="true"
  >
    {config.glyph}
  </span>
  <div class="flex-1 min-w-0">
    <div class="flex items-baseline justify-between gap-3 flex-wrap">
      <b class="font-bricolage text-[13.5px] text-ink">{$t[titleKey]}</b>
      {#if state === 'pending'}
        <span class="font-dmmono text-[10px] text-ink-mute">
          {$t['state.own.pending.usual']}
        </span>
      {/if}
    </div>
    <p class="font-bricolage text-[12.5px] text-ink-soft leading-relaxed mt-1">
      {$t[bodyKey]}
    </p>
    {#if state === 'rejected' && reason}
      <blockquote
        class="mt-2 pl-3 border-l-2 border-danger/60 font-instrument italic text-[13px] text-ink leading-snug"
      >
        „{reason}"
      </blockquote>
    {/if}
    {#if config.badge}
      <div class="mt-2 flex items-center gap-2">
        <StatusBadge state={config.badge} size="sm" />
        {#if state === 'pending'}
          <span class="font-dmmono text-[10px] text-ink-mute">
            {$t['state.own.pending.note']}
          </span>
        {/if}
      </div>
    {/if}
  </div>
</div>

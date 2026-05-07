<script lang="ts">
  // Live preview card for the compose route. Hand-rolled (not a reused
  // ForumPostCard) because the composed post doesn't yet have a real
  // _id or moderation state, and the scaled-down typography differs
  // from a production card.
  //
  // Used by:
  //   - ComposePreview.svelte  (desktop sidebar at lg+)
  //   - ComposePageInner.svelte (mobile flow at <lg, mounted between
  //     the form and the moderation note)

  import KioskAvatar from '../KioskAvatar.svelte';
  import { t } from '../../../../lib/kiosk-i18n';

  type Kind = 'discussion' | 'recommendation' | 'announcement';
  type Values = {
    title: string;
    body: string;
    kind: Kind;
    tags: string[];
  };

  let { values, currentUser } = $props<{
    values: Values;
    currentUser: { name?: string; image?: string | null };
  }>();

  // Truncate the body excerpt at ~140 chars so the preview card stays
  // a card-sized silhouette, not a full essay.
  const bodyExcerpt = $derived(
    values.body.length > 140 ? values.body.slice(0, 137).trimEnd() + '…' : values.body
  );

  // Mirrors the inline filled kind-chip on ForumPostCard / detail page —
  // wine/moss/teal fill, paper text, 1px ink border, rounded-lg.
  const chipBg = $derived(
    values.kind === 'announcement'
      ? 'bg-teal'
      : values.kind === 'recommendation'
      ? 'bg-moss'
      : 'bg-wine'
  );
  const chipLabel = $derived(($t[`chip.${values.kind}` as const] as string).toUpperCase());
</script>

<p class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-wine mb-2">
  ◆ {$t['compose.preview.kicker']}
</p>

<div
  class="bg-paper-warm border-[1.5px] border-ink rounded-md p-3.5 mb-5 shadow-[2px_2px_0_var(--k-ink)]"
>
  <div class="flex justify-between items-start mb-2">
    <div class="flex items-center gap-1.5">
      <KioskAvatar
        name={currentUser.name ?? 'du'}
        image={currentUser.image ?? null}
        size="sm"
      />
      <div>
        <div class="font-bricolage font-bold text-[11px] text-ink leading-tight">
          {currentUser.name ?? $t['compose.preview.you']}
        </div>
        <div class="font-dmmono text-[9px] text-ink-mute leading-tight">
          {$t['compose.preview.now']}
        </div>
      </div>
    </div>
    <span
      class={`inline-flex items-center font-dmmono font-medium text-[10px] tracking-[0.08em] text-paper border border-ink rounded-lg px-[9px] py-[3px] ${chipBg}`}
    >
      {chipLabel}
    </span>
  </div>

  {#if values.title}
    <div
      class="font-bricolage font-extrabold tracking-tight leading-tight mb-1.5 text-[14px] text-ink"
    >
      {values.title}
    </div>
  {:else}
    <div class="font-instrument italic text-ink-mute/70 mb-1.5 text-[12px]">
      {$t['compose.preview.titlePlaceholder']}
    </div>
  {/if}
  {#if bodyExcerpt}
    <p
      class={`text-[11.5px] leading-relaxed m-0 ${
        values.kind === 'recommendation' ? 'font-instrument italic' : 'font-bricolage'
      } text-ink-soft`}
    >
      {bodyExcerpt}
    </p>
  {/if}
  {#if values.tags.length}
    <div class="flex gap-1.5 mt-2 flex-wrap">
      {#each values.tags as tag (tag)}
        <span class="font-dmmono text-[9.5px] text-ink-mute">#{tag}</span>
      {/each}
    </div>
  {/if}
</div>

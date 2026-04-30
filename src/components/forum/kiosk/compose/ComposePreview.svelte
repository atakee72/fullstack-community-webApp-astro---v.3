<script lang="ts">
  // Live preview sidebar for the compose route. Per JSX
  // ForumComposeDesktop (line 562). Renders a mini ForumPostCard that
  // updates as the user types, plus the moderation note + submit row.
  //
  // The preview card here is hand-rolled (not a reused ForumPostCard)
  // because the composed post doesn't yet have a real `_id` or
  // moderation state, and the scaled-down typography differs from a
  // production card. Rolling a small dedicated preview keeps this file
  // self-contained.
  //
  // The submit row's three CTAs are wired up by the parent — this
  // component is presentational. Disabling the publish button when
  // values are invalid is also the parent's job (it has the form
  // validity context).
  //
  // Props:
  //   values     — current ComposeValues from the form
  //   currentUser — { name, image } for the byline avatar
  //   submitting — disables CTAs while a mutation is in flight
  //   onPublish/onSaveDraft/onDiscard — three CTA click handlers

  import KioskBtn from '../KioskBtn.svelte';
  import KioskAvatar from '../KioskAvatar.svelte';
  import PostTypeChip from '../PostTypeChip.svelte';
  import { t } from '../../../../lib/kiosk-i18n';

  type Kind = 'discussion' | 'recommendation' | 'announcement';
  type Values = {
    title: string;
    body: string;
    kind: Kind;
    tags: string[];
  };

  let {
    values,
    currentUser,
    submitting = false,
    onPublish,
    onSaveDraft,
    onDiscard
  } = $props<{
    values: Values;
    currentUser: { name?: string; image?: string | null };
    submitting?: boolean;
    onPublish: () => void;
    onSaveDraft?: () => void;
    onDiscard: () => void;
  }>();

  // Truncate the body excerpt at ~140 chars so the preview card stays
  // a card-sized silhouette, not a full essay.
  const bodyExcerpt = $derived(
    values.body.length > 140 ? values.body.slice(0, 137).trimEnd() + '…' : values.body
  );

  // Empty placeholders so the silhouette stays visible before the user
  // types — feels more alive than a blank box.
  const titleDisplay = $derived(values.title || '…');
  const hasContent = $derived(values.title.length + values.body.length > 0);
</script>

<aside
  class="bg-paper-soft border-l border-dashed border-rule px-5 py-7 flex flex-col h-full"
>
  <p class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-wine mb-2">
    ◆ {$t['compose.preview.kicker']}
  </p>

  <!-- Mini preview card -->
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
      <PostTypeChip
        kind={values.kind === 'discussion' ? 'discussion'
            : values.kind === 'recommendation' ? 'recommendation'
            : 'announcement'}
      />
    </div>

    <div
      class={`font-bricolage font-extrabold tracking-tight leading-tight mb-1.5 text-[14px] ${
        hasContent ? 'text-ink' : 'text-ink-mute/50'
      }`}
    >
      {titleDisplay}
    </div>
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

  <!-- Moderation note -->
  <div
    class="bg-paper border border-dashed border-rule rounded-sm px-3.5 py-3 mb-4"
  >
    <p class="font-dmmono text-[10px] uppercase tracking-[0.12em] text-teal mb-1.5">
      ◆ {$t['compose.moderation.kicker']}
    </p>
    <p class="font-dmmono text-[10.5px] leading-[1.65] text-ink-soft">
      {$t['compose.moderation.body']}
    </p>
  </div>

  <!-- Submit row -->
  <div class="mt-auto flex flex-col gap-2.5">
    <KioskBtn
      variant="primary"
      size="md"
      onclick={onPublish}
      disabled={submitting}
    >
      {$t['compose.cta.publish']}
    </KioskBtn>
    {#if onSaveDraft}
      <KioskBtn variant="secondary" size="md" onclick={onSaveDraft} disabled={submitting}>
        {$t['compose.cta.draft']}
      </KioskBtn>
    {/if}
    <KioskBtn variant="ghost" size="md" onclick={onDiscard} disabled={submitting}>
      {$t['compose.cta.discard']}
    </KioskBtn>
    <p class="font-dmmono text-[9.5px] text-ink-mute leading-relaxed mt-1.5">
      {$t['compose.terms']}
    </p>
  </div>
</aside>

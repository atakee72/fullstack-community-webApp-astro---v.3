<script lang="ts">
  // Sticky live-preview pane for the marketplace compose page.
  // Three states:
  //   placeholder — kind or category not yet chosen
  //   live        — renders an actual ListingCard with virtual listing data
  //   publishing  — overlays ochre KI-CHECK banner + checklist
  //
  // RAIL_TO_API: verkaufen → 'sell', tausch → 'exchange', verschenken → 'gift'
  import { t } from '../../../../lib/kiosk-i18n';
  import type { Listing } from '../../../../types/listing';
  import type { ListingType } from '../../../../types/listing';
  import ListingCard from '../browse/ListingCard.svelte';

  type RailKind = 'verkaufen' | 'tausch' | 'verschenken';

  const RAIL_TO_API: Record<RailKind, ListingType> = {
    verkaufen: 'sell',
    tausch: 'exchange',
    verschenken: 'gift',
  };

  let {
    formState,
    currentUserId,
    publishing = false
  }: {
    formState: {
      kind: RailKind | null;
      category: string | null;
      title: string;
      descriptionPlainText: string;
      price: number | null;
      originalPrice: number | null;
      delivery: 'abholung' | 'versand' | 'abholungVersand' | null;
      images: string[];
    };
    currentUserId: string | null;
    publishing?: boolean;
  } = $props();

  // Build virtual listing for preview — re-derives on every formState change
  const virtualListing = $derived.by((): Listing => {
    const { kind, category, title, descriptionPlainText, price, originalPrice, delivery, images } = formState;
    return {
      _id: 'preview',
      title: title || ($t['market.compose.preview.waitingBody']),
      description: descriptionPlainText || '',
      descriptionPlainText: descriptionPlainText || '',
      listingType: kind ? RAIL_TO_API[kind] : 'sell',
      category: category ?? 'sonstiges',
      price: price ?? 0,
      originalPrice: originalPrice ?? null,
      images: images ?? [],
      sellerId: currentUserId ?? 'preview-user',
      status: 'available',
      moderationStatus: 'approved',
      views: 0,
      savedBy: [],
      delivery: delivery ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  // Checklist items — derived from formState
  const checklist = $derived([
    {
      labelKey: 'market.compose.checklist.kind' as const,
      done: !!formState.kind,
    },
    {
      labelKey: 'market.compose.checklist.category' as const,
      done: !!formState.category,
    },
    {
      labelKey: 'market.compose.checklist.titleDesc' as const,
      done: !!formState.title && !!formState.descriptionPlainText,
    },
    {
      labelKey: 'market.compose.checklist.photo' as const,
      done: formState.images.length > 0,
    },
    {
      labelKey: 'market.compose.checklist.price' as const,
      done:
        formState.kind === 'verschenken' ||
        formState.kind === 'tausch' ||
        (formState.price !== null && formState.price > 0),
    },
    {
      labelKey: 'market.compose.checklist.delivery' as const,
      done: !!formState.delivery,
    },
  ]);

  const ready = $derived(!!formState.kind && !!formState.category);
</script>

{#if !ready}
  <!-- ── Placeholder state ── -->
  <div
    style="
      background: var(--k-paper-soft);
      border: 1.5px dashed var(--k-ink);
      border-radius: var(--k-radius-lg);
      padding: 22px 18px;
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 360px;
    "
  >
    <!-- Floating label -->
    <div
      style="
        position: absolute; top: -10px; left: 16px;
        background: var(--k-paper-soft);
        color: var(--k-ink-mute);
        font-family: var(--k-font-mono);
        font-size: 10px; font-weight: 700;
        letter-spacing: 0.15em;
        padding: 3px 10px;
        border-radius: var(--k-radius-sm);
        border: 1px dashed var(--k-ink-mute);
      "
    >{$t['market.compose.preview.waiting']}</div>

    <!-- Centered decorative content -->
    <div
      style="
        margin-top: 14px;
        text-align: center;
        display: flex; flex-direction: column;
        align-items: center; gap: 10px;
      "
    >
      <div
        style="
          font-family: var(--k-font-serif);
          font-style: italic;
          font-size: 52px;
          color: var(--k-ink-mute);
          line-height: 1;
        "
      >∅</div>
      <div
        style="
          font-family: var(--k-font-serif);
          font-style: italic;
          font-size: 16px;
          color: var(--k-ink-soft);
          max-width: 220px;
          line-height: 1.35;
        "
      >{$t['market.compose.preview.waitingBody']}</div>
    </div>

    <!-- Footer hint -->
    <div
      style="
        margin-top: auto;
        padding-top: 14px;
        border-top: 1px dashed var(--k-rule);
        font-family: var(--k-font-mono);
        font-size: 10px;
        color: var(--k-ink-mute);
        line-height: 1.5;
      "
    >{$t['market.compose.preview.liveFooter']}</div>
  </div>

{:else}
  <!-- ── Live / Publishing state ── -->
  <div
    style="
      background: var(--k-paper-soft);
      border: 1.5px solid var(--k-ink);
      border-radius: var(--k-radius-lg);
      padding: 16px;
      position: relative;
    "
  >
    <!-- Floating label -->
    <div
      style="
        position: absolute; top: -10px; left: 16px;
        background: var(--k-ink);
        color: var(--k-paper);
        font-family: var(--k-font-mono);
        font-size: 10px; font-weight: 700;
        letter-spacing: 0.15em;
        padding: 3px 10px;
        border-radius: var(--k-radius-sm);
      "
    >{publishing ? $t['market.compose.preview.publishing'] : $t['market.compose.preview.live']}</div>

    <!-- Sub-header -->
    <div
      style="
        font-family: var(--k-font-mono);
        font-size: 10px;
        color: var(--k-ink-mute);
        letter-spacing: 0.05em;
        margin-top: 6px;
        margin-bottom: 12px;
      "
    >{$t['market.compose.preview.liveBody']}</div>

    <!-- ListingCard (non-interactive) -->
    <div style="pointer-events: none;">
      <ListingCard listing={virtualListing} />
    </div>

    <!-- Publishing overlay -->
    {#if publishing}
      <div
        style="
          margin-top: 12px;
          padding: 12px 14px;
          background: var(--k-ochre);
          border: var(--k-border-ink);
          border-radius: var(--k-radius-md);
          display: flex; align-items: center; gap: 10px;
        "
      >
        <span
          style="
            font-family: var(--k-font-mono);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.1em;
          "
        >◐</span>
        <div style="flex: 1; font-family: var(--k-font-mono); font-size: 11px; line-height: 1.4;">
          <div style="font-weight: 700; letter-spacing: 0.05em;">{$t['market.compose.publishing.header']}</div>
          <div style="color: var(--k-ink-soft); margin-top: 2px;">{$t['market.compose.publishing.body']}</div>
        </div>
      </div>
    {/if}

    <!-- Checklist -->
    <div
      style="
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px dashed var(--k-rule);
      "
    >
      <div
        style="
          font-family: var(--k-font-mono);
          font-size: 10px;
          color: var(--k-ink-mute);
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        "
      >{$t['market.compose.checklist.header']}</div>

      {#each checklist as item, i (i)}
        <div
          style="
            display: flex; align-items: center; gap: 8px;
            font-family: var(--k-font-mono);
            font-size: 11px;
            padding: 3px 0;
          "
        >
          <!-- Checkbox -->
          <span
            style="
              width: 14px; height: 14px;
              border-radius: 3px;
              border: 1.5px solid {item.done ? 'var(--k-moss)' : 'var(--k-ink-mute)'};
              background: {item.done ? 'var(--k-moss)' : 'transparent'};
              color: var(--k-paper);
              font-size: 10px; font-weight: 700;
              display: inline-flex; align-items: center; justify-content: center;
              flex-shrink: 0;
            "
          >{item.done ? '✓' : ''}</span>

          <!-- Label -->
          <span
            style="color: {item.done ? 'var(--k-ink)' : 'var(--k-ink-mute)'};"
          >§0{i + 1} {$t[item.labelKey]}</span>
        </div>
      {/each}
    </div>
  </div>
{/if}

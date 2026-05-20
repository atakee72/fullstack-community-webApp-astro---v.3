<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import MarketStrap from './MarketStrap.svelte';
  import type { Listing } from '../../../../types/listing';

  type Size = 'sm' | 'md' | 'lg';

  let { listing, size = 'md' }: {
    listing: Pick<Listing, 'listingType' | 'price' | 'originalPrice'>;
    size?: Size;
  } = $props();

  const sz = $derived(size === 'lg'
    ? { num: 44, suffix: 14, glyph: 38 }
    : size === 'sm'
    ? { num: 22, suffix: 9, glyph: 18 }
    : { num: 30, suffix: 11, glyph: 26 });

  const vb = $derived(listing.originalPrice != null && listing.originalPrice > (listing.price ?? 0));
</script>

{#if listing.listingType === 'gift'}
  <MarketStrap kind="gratis" />
{:else if listing.listingType === 'exchange'}
  <div style="display:flex; align-items:baseline; gap:6px;">
    <span style="font-family: var(--k-font-serif); font-style: italic; font-size: {sz.glyph}px; color: var(--k-teal); line-height: 1;">↔</span>
    <span style="font-family: var(--k-font-display); font-size: {sz.suffix}px; font-weight: 600; color: var(--k-ink-soft); letter-spacing: 0.02em;">
      {$t['market.price.tausch.label']}
    </span>
  </div>
{:else}
  <div style="display:flex; align-items:baseline; gap:4px;">
    <span style="font-family: var(--k-font-serif); font-style: italic; font-size: {sz.num}px; font-weight: 400; color: var(--k-ink); letter-spacing: -0.02em; line-height: 1;">
      {listing.price}
    </span>
    <span style="font-family: var(--k-font-serif); font-style: italic; font-size: {sz.num * 0.7}px; color: var(--k-ink); line-height: 1;">€</span>
    {#if vb}
      <span style="font-family: var(--k-font-mono); font-size: {sz.suffix}px; color: var(--k-ink-mute); margin-left: 4px; font-weight: 600; letter-spacing: 0.05em;">
        {$t['market.price.vb.suffix']}
      </span>
    {/if}
  </div>
{/if}

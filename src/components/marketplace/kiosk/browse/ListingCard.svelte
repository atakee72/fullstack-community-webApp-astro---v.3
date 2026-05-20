<script lang="ts">
  import { locale, t } from '../../../../lib/kiosk-i18n';
  import { resolveCategory } from '../../../../lib/marketplaceResolvers';
  import { formatRelativeTime } from '../../../../lib/marketplaceFormat';
  import type { Listing } from '../../../../types/listing';

  import CategoryChip from '../primitives/CategoryChip.svelte';
  import DeliveryPill from '../primitives/DeliveryPill.svelte';
  import PriceTag from '../primitives/PriceTag.svelte';
  import ListingImagePlaceholder from '../primitives/ListingImagePlaceholder.svelte';
  import MarketStrap from '../primitives/MarketStrap.svelte';
  import KioskAvatar from '../../../forum/kiosk/KioskAvatar.svelte';

  let { listing }: { listing: Listing } = $props();

  // ── Derived strap state ──────────────────────────────────────────
  const now = new Date();
  const lastBumped = $derived(
    listing.lastBumpedAt ? new Date(listing.lastBumpedAt) : null
  );
  const bumped = $derived(
    lastBumped !== null &&
    (now.getTime() - lastBumped.getTime()) < 24 * 60 * 60 * 1000
  );
  const ageMs = $derived(now.getTime() - new Date(listing.createdAt).getTime());
  const stale = $derived(ageMs >= 21 * 24 * 60 * 60 * 1000); // 21 days
  const reserved = $derived(listing.status === 'reserved');
  const draft = $derived(listing.status === 'draft');

  const resolvedCat = $derived(resolveCategory(listing.category));
  const legacy = $derived(resolvedCat.legacy);

  // Category color for riso print shadow and thumb tint.
  const catShadowToken = $derived(resolvedCat.token ?? '--k-ink-mute');

  // Relative timestamp.
  const relTime = $derived(formatRelativeTime(listing.createdAt, $locale));

  // Photo count.
  const photoCount = $derived(listing.images?.length ?? 0);
</script>

<article
  class="market-card {stale ? 'market-stale' : 'market-fresh'}"
  style="
    background: var(--k-paper-warm);
    border: var(--k-border-ink);
    border-radius: var(--k-radius-md);
    box-shadow: 2px 2px 0 var({catShadowToken});
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  "
>
  <!-- Image area with strap stack + photo-count badge -->
  <div style="padding: 8px; position: relative;">
    <ListingImagePlaceholder category={listing.category} />

    <!-- Top-left strap stack: entwurf → bump → reserviert → altpapier → altbestand -->
    <div
      style="
        position: absolute; top: 14px; left: 14px;
        display: flex; flex-direction: column; gap: 4px;
        align-items: flex-start;
        z-index: 1;
      "
    >
      {#if draft}
        <MarketStrap kind="entwurf" small={true} />
      {/if}
      {#if bumped}
        <MarketStrap kind="bump" small={true} />
      {/if}
      {#if reserved}
        <MarketStrap kind="reserviert" small={true} />
      {/if}
      {#if stale}
        <MarketStrap kind="altpapier" small={true} />
      {/if}
      {#if legacy}
        <MarketStrap kind="altbestand" small={true} />
      {/if}
    </div>

    <!-- Image count badge — bottom-right -->
    {#if photoCount > 0}
      <span
        style="
          position: absolute; bottom: 14px; right: 14px;
          font-family: var(--k-font-mono); font-size: 10px; font-weight: 600;
          background: var(--k-ink); color: var(--k-paper);
          padding: 2px 6px; border-radius: 4px; letter-spacing: 0.05em;
        "
      >📷 {photoCount}</span>
    {/if}
  </div>

  <!-- Body -->
  <div
    style="
      padding: 4px 12px 12px;
      display: flex; flex-direction: column; gap: 8px; flex: 1;
    "
  >
    <!-- Category chip + timestamp -->
    <div
      style="
        display: flex; align-items: center; gap: 6px;
        justify-content: space-between;
      "
    >
      <CategoryChip id={listing.category} mini={true} />
      <span
        style="
          font-family: var(--k-font-mono); font-size: 10px;
          color: var(--k-ink-mute);
        "
      >{relTime}</span>
    </div>

    <!-- Title -->
    <h3
      style="
        font-size: 15px; font-weight: 700; letter-spacing: -0.012em;
        line-height: 1.25; margin: 0; color: var(--k-ink);
      "
    >{listing.title}</h3>

    <!-- Price + delivery, pushed to bottom -->
    <div
      style="
        margin-top: auto;
        display: flex; align-items: flex-end;
        justify-content: space-between; gap: 8px;
      "
    >
      <PriceTag {listing} size="sm" />
      {#if listing.delivery}
        <DeliveryPill kind={listing.delivery} />
      {/if}
    </div>

    <!-- Seller strip -->
    <div
      style="
        display: flex; align-items: center; gap: 6px;
        padding-top: 6px;
        border-top: 1px dashed var(--k-rule);
      "
    >
      <KioskAvatar
        name={listing.sellerName ?? '?'}
        image={listing.sellerImage ?? null}
        size="sm"
      />
      <span
        style="
          font-family: var(--k-font-mono); font-size: 10px;
          color: var(--k-ink-soft);
        "
      >{listing.sellerName ?? '—'}</span>
      <span
        style="
          margin-left: auto;
          font-family: var(--k-font-mono); font-size: 10px;
          color: var(--k-ink-mute);
        "
      >★ {listing.savedBy?.length ?? 0}</span>
    </div>
  </div>
</article>

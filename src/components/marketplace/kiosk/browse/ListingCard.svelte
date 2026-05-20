<script lang="ts">
  import { onMount } from 'svelte';
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
  import StatusBadge from '../../../forum/kiosk/StatusBadge.svelte';

  let {
    listing,
    currentUserId = null,
  }: {
    listing: Listing;
    currentUserId?: string | null;
  } = $props();

  // ── Derived strap state ──────────────────────────────────────────
  const now = new Date();
  // Prefer the server-computed `isBumped` virtual (safe for non-owners per A5).
  // Owners also receive `lastBumpedAt` so they could re-derive locally; the
  // virtual is the canonical signal regardless.
  const bumped = $derived(
    listing.isBumped ??
    (listing.lastBumpedAt
      ? now.getTime() - new Date(listing.lastBumpedAt).getTime() < 24 * 60 * 60 * 1000
      : false)
  );

  // ── Bump pop animation ──────────────────────────────────────────
  // Fires only on the transition from not-bumped → bumped (not on initial
  // render of already-bumped cards). prevBumped is sync'd to the initial
  // bumped state in onMount so the effect doesn't false-trigger on mount.
  let prevBumped = $state(false);
  let popClass = $state('');

  onMount(() => {
    prevBumped = bumped;
  });

  $effect(() => {
    if (bumped && !prevBumped) {
      popClass = 'market-bump';
      setTimeout(() => { popClass = ''; }, 400);
    }
    prevBumped = bumped;
  });
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

  // ── Moderation / author visibility ───────────────────────────────────
  const isAuthor = $derived(
    !!currentUserId && String(listing.sellerId) === currentUserId
  );

  const inferredBadge = $derived.by(() => {
    if (listing.moderationStatus === 'rejected') return 'rejected' as const;
    if (listing.isUserReported && listing.moderationStatus === 'pending') return 'reported' as const;
    if (listing.moderationStatus === 'pending') return 'pending' as const;
    if (listing.hasWarningLabel) return 'warning' as const;
    return null;
  });

  const ghostClass = $derived.by(() => {
    if (!isAuthor || !inferredBadge) return '';
    return {
      pending:  'outline outline-2 outline-dashed outline-warn outline-offset-[-2px] rounded-md',
      reported: 'outline outline-2 outline-dashed outline-plum outline-offset-[-2px] rounded-md',
      rejected: 'outline outline-2 outline-dashed outline-danger outline-offset-[-2px] rounded-md',
      warning:  '',
    }[inferredBadge] ?? '';
  });

  const ghostOpacity = $derived(isAuthor && inferredBadge ? 'opacity-70' : '');
</script>

<article
  class="market-card {popClass} {stale ? 'market-stale' : 'market-fresh'} {ghostClass}"
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
    <ListingImagePlaceholder
      category={listing.category}
      src={listing.images?.[0] ?? null}
      alt={listing.title}
    />

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
      <!-- Author-only moderation status badge in strap stack -->
      {#if isAuthor && inferredBadge}
        <StatusBadge state={inferredBadge} size="sm" />
      {/if}
    </div>

    <!-- Non-author GEMELDET chip (anti-stigma marker) -->
    {#if !isAuthor && listing.moderationStatus === 'pending' && listing.isUserReported}
      <span
        class="reported-chip font-dmmono"
        style="
          position: absolute; top: 14px; right: 14px;
          font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
          color: var(--k-plum, #7c3d8c);
          background: var(--k-paper);
          border: 1.5px solid var(--k-plum, #7c3d8c);
          border-radius: 4px;
          padding: 2px 6px;
          z-index: 1;
        "
      >⚑ {$t['status.reported']}</span>
    {/if}

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

  <!-- Body (opacity reduced for author-moderated cards) -->
  <div
    class={ghostOpacity}
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

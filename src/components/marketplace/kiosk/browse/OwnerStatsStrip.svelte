<script lang="ts">
  // Owner-only stats strip, shown in the kiosk "Meine Anzeigen" (?view=mine)
  // view. Replaces the legacy dark-glass StatsCards. Data comes from
  // /api/listings/my-listings (accurate aggregate, not the paginated grid).
  // Shows Total · Active · Sold · Stale (stale = live but >21d, hidden from the
  // public feed until bumped). Earnings intentionally dropped — weak signal for
  // a gift/swap-heavy neighbourhood marketplace.
  import { t } from '../../../../lib/kiosk-i18n';
  import type { ListingStats } from '../../../../types/listing';

  let { stats }: { stats: ListingStats } = $props();

  const cells = $derived([
    { label: $t['market.owner.stats.total'], value: stats.totalListings, accent: false },
    { label: $t['market.owner.stats.active'], value: stats.activeListings, accent: false },
    { label: $t['market.owner.stats.sold'], value: stats.soldItems, accent: false },
    // Stale is the actionable one — tint it ochre when > 0.
    { label: $t['market.owner.stats.stale'], value: stats.staleCount, accent: stats.staleCount > 0 },
  ]);
</script>

<div class="px-4 md:px-9 lg:px-10" style="padding-top: 12px;">
  <div
    style="
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px;
      background: var(--k-rule);
      border: 1px solid var(--k-rule);
      border-radius: var(--k-radius-md);
      overflow: hidden;
    "
  >
    {#each cells as cell}
      <div
        style="
          display: flex; flex-direction: column; gap: 2px;
          padding: 10px 12px;
          background: var(--k-paper-soft, var(--k-paper));
        "
      >
        <span
          style="
            font-family: var(--k-font-mono); font-size: 9.5px;
            color: var(--k-ink-mute); text-transform: uppercase;
            letter-spacing: 0.12em; line-height: 1.2;
          "
        >{cell.label}</span>
        <span
          style="
            font-family: var(--k-font-display); font-weight: 800;
            font-size: 22px; line-height: 1.1;
            color: {cell.accent ? 'var(--k-ochre)' : 'var(--k-ink)'};
          "
        >{cell.value}</span>
      </div>
    {/each}
  </div>
</div>

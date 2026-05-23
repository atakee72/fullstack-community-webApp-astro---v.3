<script lang="ts">
  import type { Listing } from '../../../../types/listing';
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import PendingLockBanner from './PendingLockBanner.svelte';

  let {
    listing,
    currentUserId,
    onBump,
    onStatusChange,
    onDelete,
  }: {
    listing: Listing;
    currentUserId: string;
    onBump: () => Promise<void>;
    onStatusChange: (status: 'available' | 'reserved' | 'sold') => Promise<void>;
    onDelete: () => Promise<void>;
  } = $props();

  // ─── Derived state ─────────────────────────────────────────────────────────

  const isPendingOrWarn = $derived(
    listing.moderationStatus === 'pending' || !!listing.hasWarningLabel,
  );

  const TWENTY_ONE_DAYS = 21 * 24 * 60 * 60 * 1000;

  // Stale (new semantics, May 2026 supersession of A5):
  // — keyed off max(createdAt, lastBumpedAt), the "freshness clock".
  // — When stale, the listing is hidden from the public feed entirely.
  // — Bump resets the clock and brings it back into public view.
  // The bump button's label swaps to "↻ Auffrischen" in this state — same
  // action, clearer intent. Bumping does NOT change createdAt; the next
  // bump-window starts from now.
  //
  // Freshness clock = max(createdAt, lastBumpedAt). When > 21d in the past,
  // the listing is hidden from public (server-side filter) and the bump
  // button shows the ↻ Auffrischen label so the owner knows what to do.
  const freshnessMs = $derived.by(() => {
    const lastBump = listing.lastBumpedAt ? new Date(listing.lastBumpedAt).getTime() : 0;
    const created = new Date(listing.createdAt).getTime();
    return Math.max(lastBump, created);
  });
  const isStale = $derived(Date.now() - freshnessMs >= TWENTY_ONE_DAYS);

  // A5 superseded May 2026: no 7-day bump cooldown. Bump is the freshness
  // reset; owners need to use it whenever the listing has slipped past the
  // 21d public-visibility clock. The only guards are still:
  //   - status === 'available' (can't bump reserved/sold/draft)
  //   - moderationStatus === 'approved' (can't bump while AI mid-scan)
  //   - !hasWarningLabel
  const canBump = $derived(
    listing.status === 'available' &&
    listing.moderationStatus === 'approved' &&
    !listing.hasWarningLabel,
  );

  const showReserveToggle = $derived(
    listing.status === 'available' || listing.status === 'reserved',
  );

  const showSoldButton = $derived(
    listing.status === 'available' || listing.status === 'reserved',
  );

  // Stats: savedBy count + views
  const savedCount = $derived(
    Array.isArray(listing.savedBy) ? listing.savedBy.length : 0,
  );

  // ─── Busy state (prevents double-click) ───────────────────────────────────

  // Last-bump label (derived so it doesn't inline an IIFE in the template)
  const lastBumpLabel = $derived.by((): string | null => {
    if (!listing.lastBumpedAt) return null;
    const days = Math.floor(
      (Date.now() - new Date(listing.lastBumpedAt).getTime()) / (24 * 60 * 60 * 1000),
    );
    return $locale === 'en' ? `last bump: ${days}d ago` : `letzter Bump: vor ${days} Tagen`;
  });

  let busy = $state(false);

  async function handleBump() {
    if (busy || !canBump) return;
    busy = true;
    try { await onBump(); } finally { busy = false; }
  }

  async function handleStatusChange(status: 'available' | 'reserved' | 'sold') {
    if (busy) return;
    busy = true;
    try { await onStatusChange(status); } finally { busy = false; }
  }

  async function handleDelete() {
    if (busy) return;
    busy = true;
    try { await onDelete(); } finally { busy = false; }
  }
</script>

<div class="owner-actions-panel">

  <!-- ─── Header strip ─────────────────────────────────────────────────────── -->
  <div class="owner-header">
    <span class="owner-kicker">
      <!-- wine kicker per page-accent rule -->
      {$t['market.owner.header']}
    </span>
    <span class="owner-stats">
      {savedCount} merkt · {listing.views ?? 0} Aufrufe
    </span>
  </div>

  {#if isPendingOrWarn}
    <!-- Pending / warning: lock banner replaces the action grid entirely -->
    <PendingLockBanner />
  {:else}
    <!-- ─── 2×2 action grid ───────────────────────────────────────────────── -->
    <div class="owner-grid">

      <!-- Bearbeiten -->
      <a
        href="/marketplace/edit/{listing._id}"
        class="owner-btn owner-btn--primary"
      >{$t['market.owner.edit']}</a>

      <!-- Frisch hochholen / Auffrischen — no rate limit (A5 superseded).
           Label swaps to "↻ Auffrischen" when listing is stale (past 21d
           freshness clock). A bump resets the clock and brings the listing
           back into the public feed. Still gated on status === 'available'
           + moderation approved + no warning label. -->
      {#if canBump}
        <button
          class="owner-btn owner-btn--outline"
          onclick={handleBump}
          disabled={busy}
          title={isStale ? $t['market.owner.refresh.tooltip'] : undefined}
        >{isStale ? `↻ ${$t['market.owner.refresh.cta']}` : $t['market.owner.bump']}</button>
      {:else}
        <!-- Not eligible: wrong status or not approved yet — show disabled -->
        <button
          class="owner-btn owner-btn--outline"
          disabled
          aria-disabled="true"
        >{isStale ? `↻ ${$t['market.owner.refresh.cta']}` : $t['market.owner.bump']}</button>
      {/if}

      <!-- Reserve toggle / sold toggle -->
      {#if showReserveToggle}
        {#if listing.status === 'available'}
          <button
            class="owner-btn owner-btn--outline"
            onclick={() => handleStatusChange('reserved')}
            disabled={busy}
          >{$t['market.owner.markReserved']}</button>
        {:else if listing.status === 'reserved'}
          <button
            class="owner-btn owner-btn--outline"
            onclick={() => handleStatusChange('available')}
            disabled={busy}
          >{$t['market.owner.clearReserved']}</button>
        {/if}
      {/if}

      <!-- Als verkauft markieren -->
      {#if showSoldButton}
        <button
          class="owner-btn owner-btn--outline"
          onclick={() => handleStatusChange('sold')}
          disabled={busy}
        >{$t['market.owner.markSold']}</button>
      {/if}

    </div>
    <!-- END 2×2 grid -->

    <!-- ─── Footer: last-bump info + delete link ─────────────────────────── -->
    <div class="owner-footer">
      {#if lastBumpLabel}
        <span class="owner-last-bump">{lastBumpLabel}</span>
      {:else}
        <span></span>
      {/if}

      <button
        class="owner-delete-link"
        onclick={handleDelete}
        disabled={busy}
      >{$t['market.owner.delete']}</button>
    </div>

  {/if}

</div>

<style>
  .owner-actions-panel {
    background: var(--k-paper-soft, #ede8db);
    border: 1.5px solid var(--k-ink, #1a1a18);
    border-radius: var(--k-radius-md, 8px);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* ─── Header ──────────────────────────────────────────────── */
  .owner-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .owner-kicker {
    font-family: var(--k-font-mono, 'DM Mono', monospace);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--k-wine, #b23a5b);
    text-transform: uppercase;
  }

  .owner-stats {
    font-family: var(--k-font-mono, 'DM Mono', monospace);
    font-size: 10px;
    color: var(--k-ink-mute, #8a8580);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  /* ─── 2×2 grid ────────────────────────────────────────────── */
  .owner-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  /* ─── Button base ─────────────────────────────────────────── */
  .owner-btn {
    font-family: var(--k-font-mono, 'DM Mono', monospace);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: lowercase;
    border-radius: var(--k-radius-sm, 4px);
    padding: 7px 10px;
    cursor: pointer;
    text-align: center;
    transition: opacity 120ms ease, box-shadow 120ms ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1.2;
  }

  .owner-btn--primary {
    background: var(--k-wine, #b23a5b);
    color: var(--k-paper, #f7f1e3);
    border: 1.5px solid var(--k-ink, #1a1a18);
    box-shadow: 2px 2px 0 var(--k-ink, #1a1a18);
  }

  .owner-btn--primary:hover {
    box-shadow: 1px 1px 0 var(--k-ink, #1a1a18);
    opacity: 0.92;
  }

  .owner-btn--outline {
    background: transparent;
    color: var(--k-ink, #1a1a18);
    border: 1.5px solid var(--k-ink, #1a1a18);
    box-shadow: 1px 1px 0 var(--k-ink, #1a1a18);
  }

  .owner-btn--outline:hover:not(:disabled) {
    background: var(--k-paper-warm, #f3ead8);
  }

  .owner-btn:disabled,
  .owner-btn[aria-disabled='true'] {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
    pointer-events: none;
  }

  /* Re-enable pointer-events on disabled bump so title tooltip works */
  .owner-btn[aria-disabled='true'] {
    pointer-events: auto;
    cursor: not-allowed;
  }

  /* ─── Footer ──────────────────────────────────────────────── */
  .owner-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 6px;
    border-top: 1px dashed var(--k-rule, #c8c2b6);
  }

  .owner-last-bump {
    font-family: var(--k-font-mono, 'DM Mono', monospace);
    font-size: 10px;
    color: var(--k-ink-mute, #8a8580);
    letter-spacing: 0.03em;
  }

  .owner-delete-link {
    background: transparent;
    color: var(--k-danger, #c0392b);
    border: none;
    font-family: var(--k-font-mono, 'DM Mono', monospace);
    font-size: 11px;
    font-weight: 600;
    text-decoration: underline;
    text-decoration-style: dashed;
    text-underline-offset: 3px;
    letter-spacing: 0.05em;
    cursor: pointer;
    padding: 0;
  }

  .owner-delete-link:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>

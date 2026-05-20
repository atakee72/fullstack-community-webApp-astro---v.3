<script lang="ts">
  import type { Listing } from '../../../../types/listing';
  import { showSuccess, showToast } from '../../../../utils/toast';

  import DetailGallery from './DetailGallery.svelte';
  import SpecStrip from './SpecStrip.svelte';
  import ContactForm from './ContactForm.svelte';
  import SellerCard from './SellerCard.svelte';
  import CategoryChip from '../primitives/CategoryChip.svelte';
  import PriceTag from '../primitives/PriceTag.svelte';
  import DeliveryPill from '../primitives/DeliveryPill.svelte';
  import OwnStatusBanner from '../../../forum/kiosk/states/OwnStatusBanner.svelte';

  // ─── Props ─────────────────────────────────────────────────────────────────

  let {
    initialListing,
    currentUserId,
    isOwner,
  }: {
    initialListing: Listing;
    currentUserId: string | null;
    isOwner: boolean;
  } = $props();

  let listing = $state(initialListing);

  // ─── Moderation state derivation ───────────────────────────────────────────

  type OwnState = 'pending' | 'rejected' | 'reported' | 'warning' | null;

  const ownModerationState = $derived.by((): OwnState => {
    if (!isOwner) return null;
    if (listing.moderationStatus === 'rejected') return 'rejected';
    if (listing.hasWarningLabel) return 'warning';
    if (listing.isUserReported && listing.moderationStatus === 'pending') return 'reported';
    if (listing.moderationStatus === 'pending') return 'pending';
    return null;
  });

  // Non-owner: community-reported pending → small GEMELDET chip (no banner)
  const showGemeldetChip = $derived(
    !isOwner &&
    listing.moderationStatus === 'pending' &&
    listing.isUserReported === true,
  );

  // Ghosting outline per state (owner-only)
  const ghostOutlineClass = $derived.by((): string => {
    if (!isOwner || !ownModerationState || ownModerationState === 'warning') return '';
    if (ownModerationState === 'pending') return 'outline outline-2 outline-dashed outline-warn outline-offset-[-2px] rounded-md';
    if (ownModerationState === 'reported') return 'outline outline-2 outline-dashed outline-plum outline-offset-[-2px] rounded-md';
    if (ownModerationState === 'rejected') return 'outline outline-2 outline-dashed outline-danger outline-offset-[-2px] rounded-md';
    return '';
  });

  // Map ownModerationState → OwnStatusBanner state prop (warning maps to pending visually)
  type BannerState = 'pending' | 'rejected' | 'reported';
  const bannerState = $derived.by((): BannerState | null => {
    if (ownModerationState === 'warning' || ownModerationState === 'pending') return 'pending';
    if (ownModerationState === 'rejected') return 'rejected';
    if (ownModerationState === 'reported') return 'reported';
    return null;
  });

  // ─── Save state ────────────────────────────────────────────────────────────

  const isSaved = $derived(
    currentUserId != null &&
    Array.isArray(listing.savedBy) &&
    listing.savedBy.map(String).includes(String(currentUserId)),
  );

  // ─── Action handlers ───────────────────────────────────────────────────────

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, url });
      } catch {
        // User cancelled or share failed — silently ignore
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showSuccess('Link kopiert!');
      } catch {
        showToast('Link konnte nicht kopiert werden.', { type: 'error' });
      }
    }
  }

  function scrollToContact() {
    const el = document.getElementById('market-contact-form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ─── Body text ─────────────────────────────────────────────────────────────

  const bodyText = $derived(
    typeof listing.description === 'string'
      ? listing.description
      : (listing.descriptionPlainText ?? ''),
  );

  // ─── Price+delivery row visibility ────────────────────────────────────────

  const showDelivery = $derived(listing.delivery != null);
</script>

<!-- ─── Wrapper article (ghosting applied here) ───────────────────────────── -->
<article class="market-detail-inner {ghostOutlineClass}">

  <!-- ─── Responsive two-column grid ─────────────────────────────────────── -->
  <div
    style="
      display: grid;
      gap: 32px;
      align-items: start;
    "
    class="market-detail-grid"
  >

    <!-- ══════════ LEFT COLUMN — main content ══════════ -->
    <div style="display: flex; flex-direction: column; gap: 20px;">

      <!-- Gallery -->
      <DetailGallery {listing} />

      <!-- OwnStatusBanner (owner-only, above description) -->
      {#if isOwner && bannerState}
        <OwnStatusBanner
          state={bannerState}
          reason={listing.rejectionReason}
        />
      {/if}

      <!-- Title block -->
      <header>
        <!-- Kicker -->
        <div
          class="kiosk-kicker"
          style="color: var(--k-wine); margin-bottom: 6px;"
        >MARKT · SCHILLERKIEZ</div>

        <!-- Headline -->
        <h1
          style="
            font-family: var(--k-font-display);
            font-size: clamp(28px, 5vw, 42px);
            font-weight: 800;
            letter-spacing: -0.02em;
            color: var(--k-ink);
            line-height: 1.1;
            margin: 0 0 10px;
          "
        >{listing.title}</h1>

        <!-- Category chip + GEMELDET chip row -->
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
          <CategoryChip id={listing.category} active={true} />

          {#if showGemeldetChip}
            <span
              style="
                font-family: var(--k-font-mono); font-size: 10px; font-weight: 700;
                color: var(--k-plum, #7c3d8c); letter-spacing: 0.1em;
                border: 1.5px solid var(--k-plum, #7c3d8c);
                border-radius: 4px; padding: 2px 6px;
              "
            >⚑ GEMELDET</span>
          {/if}
        </div>

        <!-- Price + delivery row -->
        <div style="display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap;">
          <PriceTag {listing} size="lg" />
          {#if showDelivery}
            <DeliveryPill kind={listing.delivery} />
          {/if}
        </div>
      </header>

      <!-- Description body -->
      {#if bodyText}
        <p
          style="
            font-family: var(--k-font-serif, Georgia, serif);
            font-style: italic;
            font-size: 16px;
            line-height: 1.6;
            color: var(--k-ink-soft, #4a4740);
            margin: 0;
          "
        >{bodyText}</p>
      {/if}

      <!-- SpecStrip (only when any spec is filled) -->
      <SpecStrip {listing} />

      <!-- Action toolbar: merken / share / melden -->
      <div
        style="
          display: flex; align-items: center; gap: 10px;
          padding-top: 4px;
        "
      >
        <!-- Save / merken -->
        <button
          title="Bald verfügbar"
          disabled
          style="
            font-family: var(--k-font-mono); font-size: 11px; font-weight: 600;
            letter-spacing: 0.06em;
            color: var(--k-ink-mute);
            background: none;
            border: 1.5px solid var(--k-rule);
            border-radius: var(--k-radius-sm, 4px);
            padding: 5px 10px;
            cursor: not-allowed;
            opacity: 0.6;
          "
        >{isSaved ? '🔖 GEMERKT' : '🔖 MERKEN'}</button>

        <!-- Share -->
        <button
          onclick={handleShare}
          style="
            font-family: var(--k-font-mono); font-size: 11px; font-weight: 600;
            letter-spacing: 0.06em;
            color: var(--k-ink);
            background: none;
            border: 1.5px solid var(--k-rule);
            border-radius: var(--k-radius-sm, 4px);
            padding: 5px 10px;
            cursor: pointer;
          "
        >↗ TEILEN</button>

        <!-- Report / melden (v1 placeholder — Task 6.4 wires it fully) -->
        <button
          title="Anzeige melden"
          onclick={() => showToast('Melden kommt bald.', { type: 'info' })}
          style="
            font-family: var(--k-font-mono); font-size: 11px; font-weight: 600;
            letter-spacing: 0.06em;
            color: var(--k-ink-mute);
            background: none;
            border: 1.5px solid var(--k-rule);
            border-radius: var(--k-radius-sm, 4px);
            padding: 5px 10px;
            cursor: pointer;
          "
        >⚑ MELDEN</button>
      </div>

    </div>
    <!-- END left column -->

    <!-- ══════════ RIGHT SIDEBAR ══════════ -->
    <aside style="display: flex; flex-direction: column; gap: 16px;">

      {#if isOwner}
        <!-- Owner Actions placeholder — Task 5.1 replaces this -->
        <div
          style="
            background: var(--k-paper-soft, #ede8db);
            border: 1.5px dashed var(--k-rule);
            border-radius: var(--k-radius-md);
            padding: 16px 18px;
            font-family: var(--k-font-mono); font-size: 11px;
            color: var(--k-ink-mute); letter-spacing: 0.04em;
          "
        >◆ Owner Actions — Phase 5</div>
      {:else}
        <!-- Contact form (anchor target for mobile CTA scroll) -->
        <div id="market-contact-form">
          <ContactForm {listing} />
        </div>
      {/if}

      <!-- Seller card -->
      <SellerCard
        sellerId={String(listing.sellerId)}
        sellerName={listing.sellerName}
        sellerImage={listing.sellerImage}
        listingCount={0}
        isVerified={true}
      />

      <!-- Similar listings placeholder — out of v1 scope -->
      <div
        style="
          background: var(--k-paper-soft, #ede8db);
          border: 1.5px dashed var(--k-rule);
          border-radius: var(--k-radius-md);
          padding: 14px 16px;
          font-family: var(--k-font-mono); font-size: 11px;
          color: var(--k-ink-mute); letter-spacing: 0.04em;
        "
      >◆ Ähnliches im Kiez — kommt bald</div>

    </aside>
    <!-- END sidebar -->

  </div>
  <!-- END grid -->

  <!-- ─── Mobile sticky bottom bar (non-owner only, lg:hidden) ──────────── -->
  {#if !isOwner}
    <div
      class="lg:hidden"
      style="
        position: fixed;
        bottom: 64px;
        left: 0;
        right: 0;
        z-index: 30;
        background: var(--k-paper-warm, #f3ead8);
        border-top: 2px solid var(--k-ink);
        padding: 10px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
      "
    >
      <!-- Primary CTA -->
      <button
        onclick={scrollToContact}
        style="
          flex: 1;
          font-family: var(--k-font-mono); font-size: 13px; font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--k-paper);
          background: var(--k-wine, #b23a5b);
          border: 2px solid var(--k-ink);
          border-radius: var(--k-radius-sm, 4px);
          padding: 10px 16px;
          cursor: pointer;
          box-shadow: 2px 2px 0 var(--k-ink);
        "
      >↑ Nachricht senden</button>

      <!-- Save icon button -->
      <button
        title="Bald verfügbar"
        disabled
        aria-label="Merken"
        style="
          flex-shrink: 0;
          font-size: 18px;
          background: none;
          border: 2px solid var(--k-rule);
          border-radius: var(--k-radius-sm, 4px);
          padding: 8px 12px;
          cursor: not-allowed;
          opacity: 0.5;
          line-height: 1;
        "
      >🔖</button>
    </div>

    <!-- Spacer so content isn't hidden behind sticky bar on mobile -->
    <div class="lg:hidden" style="height: 80px;"></div>
  {/if}

</article>

<style>
  .market-detail-inner {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px 32px;
  }

  /* Two-column on desktop, single on mobile */
  .market-detail-grid {
    grid-template-columns: 1fr;
  }

  @media (min-width: 1024px) {
    .market-detail-inner {
      padding: 32px 32px 48px;
    }

    .market-detail-grid {
      grid-template-columns: 60fr 40fr;
    }
  }
</style>

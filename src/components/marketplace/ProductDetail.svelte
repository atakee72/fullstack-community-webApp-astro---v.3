<script lang="ts">
  import type { Listing } from '../../types/listing';
  import { CONDITION_COLORS } from '../../types/listing';
  import RichTextDisplay from './RichTextDisplay.svelte';

  let { listingId, session } = $props<{ listingId: string; session: any }>();

  let listing = $state<Listing | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let selectedImage = $state(0);
  let isSaved = $state(false);
  let savingInProgress = $state(false);

  $effect(() => {
    fetchListing();
    incrementView();
  });

  async function fetchListing() {
    loading = true;
    error = null;

    try {
      const response = await fetch(`/api/listings/${listingId}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Listing not found');
        throw new Error('Failed to fetch listing');
      }

      const data = await response.json();
      listing = data.listing;

      // Check if user has saved this listing
      if (session?.user && listing?.savedBy) {
        isSaved = listing.savedBy.some((id: string) => id === session.user.id);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }

  async function incrementView() {
    try {
      await fetch(`/api/listings/${listingId}/view`, { method: 'POST' });
    } catch (e) {
      // Silent fail for view increment
    }
  }

  async function toggleSave() {
    if (!session?.user || savingInProgress) return;

    savingInProgress = true;
    try {
      const response = await fetch(`/api/listings/${listingId}/save`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        isSaved = data.saved;
      }
    } catch (e) {
      console.error('Failed to save listing');
    } finally {
      savingInProgress = false;
    }
  }

  const discount = $derived(
    listing?.originalPrice && listing.originalPrice > listing.price
      ? Math.round(((listing.originalPrice - listing.price) / listing.originalPrice) * 100)
      : 0
  );

  const savings = $derived(
    listing?.originalPrice && listing.originalPrice > listing.price
      ? (listing.originalPrice - listing.price).toFixed(2)
      : null
  );

  const conditionLabel = $derived(
    listing?.condition.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || ''
  );

  const formattedDate = $derived(
    listing?.createdAt ? new Date(listing.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) : ''
  );
</script>

<div>
  <!-- Back Link -->
  <a
    href="/marketplace"
    class="inline-flex items-center gap-2 text-gray-600 hover:text-[#4b9aaa] transition-colors mb-6"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
    Back to Marketplace
  </a>

  {#if loading}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="aspect-square bg-gray-200 rounded-2xl animate-pulse"></div>
      <div class="space-y-4">
        <div class="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div class="h-6 bg-gray-200 rounded animate-pulse w-1/4"></div>
        <div class="h-24 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  {:else if error}
    <div class="text-center py-12 bg-white rounded-2xl border border-[#aca89f]/30">
      <svg class="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">{error}</h3>
      <a href="/marketplace" class="text-[#4b9aaa] hover:underline font-medium">
        Browse other listings
      </a>
    </div>
  {:else if listing}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Image Gallery -->
      <div class="space-y-4">
        <div class="relative aspect-square bg-white rounded-2xl overflow-hidden border border-[#aca89f]/30">
          {#if listing.images && listing.images.length > 0}
            <img
              src={listing.images[selectedImage]}
              alt={listing.title}
              class="w-full h-full object-contain"
            />
          {:else}
            <div class="w-full h-full flex items-center justify-center text-[#aca89f]">
              <svg class="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          {/if}

          {#if discount > 0}
            <span class="absolute top-4 left-4 bg-red-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
              -{discount}% OFF
            </span>
          {/if}
        </div>

        <!-- Thumbnail Gallery -->
        {#if listing.images && listing.images.length > 1}
          <div class="flex gap-3 overflow-x-auto pb-2">
            {#each listing.images as image, index}
              <button
                onclick={() => selectedImage = index}
                class="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all {selectedImage === index ? 'border-[#4b9aaa]' : 'border-transparent'}"
              >
                <img src={image} alt="Thumbnail {index + 1}" class="w-full h-full object-cover" />
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Product Details -->
      <div class="space-y-6">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-[#814256] mb-2">{listing.title}</h1>
          <p class="text-gray-500">by {listing.sellerName || 'Unknown Seller'}</p>
        </div>

        <!-- Badges -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-3 py-1 rounded-full border text-sm {CONDITION_COLORS[listing.condition]}">
            {conditionLabel}
          </span>
          <span class="px-3 py-1 rounded-full bg-[#aca89f]/20 text-gray-600 text-sm capitalize">
            {listing.category.replace(/-/g, ' ')}
          </span>
        </div>

        <!-- Price -->
        <div class="bg-[#eccc6e]/20 rounded-xl p-4">
          <div class="flex items-baseline gap-3">
            <span class="text-3xl font-bold text-[#814256]">${listing.price.toFixed(2)}</span>
            {#if listing.originalPrice && listing.originalPrice > listing.price}
              <span class="text-lg text-gray-400 line-through">${listing.originalPrice.toFixed(2)}</span>
            {/if}
          </div>
          {#if savings}
            <p class="text-green-600 font-medium mt-1">You save ${savings}!</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <h3 class="font-semibold text-gray-800 mb-2">Description</h3>
          <RichTextDisplay content={listing.description} />
        </div>

        <!-- Listed Date -->
        <p class="text-sm text-gray-500">Listed on {formattedDate}</p>

        <!-- Action Buttons -->
        <div class="space-y-3">
          {#if listing.sellerEmail}
            <a
              href="mailto:{listing.sellerEmail}?subject=Interested in: {listing.title}"
              class="block w-full text-center bg-[#4b9aaa] text-white px-6 py-4 rounded-xl hover:bg-[#3a7a8a] transition-colors font-semibold text-lg"
            >
              Contact Seller
            </a>
          {/if}

          <div class="flex gap-3">
            <button
              onclick={toggleSave}
              disabled={!session?.user || savingInProgress}
              class="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#aca89f]/30 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="w-5 h-5 {isSaved ? 'text-red-500 fill-red-500' : 'text-gray-600'}" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {isSaved ? 'Saved' : 'Save'}
            </button>
            <button
              onclick={() => navigator.share?.({ title: listing?.title, url: window.location.href })}
              class="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#aca89f]/30 hover:bg-gray-50 transition-colors"
            >
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>

        {#if !session?.user}
          <p class="text-sm text-gray-500 text-center">
            <a href="/login?redirect=/marketplace/{listingId}" class="text-[#4b9aaa] hover:underline">Sign in</a> to save listings and contact sellers
          </p>
        {/if}
      </div>
    </div>
  {/if}
</div>

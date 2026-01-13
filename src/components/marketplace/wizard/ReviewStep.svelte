<script lang="ts">
  import { CONDITION_COLORS, type Delta } from '../../../types/listing';
  import RichTextDisplay from '../RichTextDisplay.svelte';

  let { listing, onSubmit, onPrev, isSubmitting } = $props<{
    listing: {
      title: string;
      description: string | Delta;
      category: string;
      condition: string;
      images: string[];
      price: number;
      originalPrice?: number;
    };
    onSubmit: () => void;
    onPrev: () => void;
    isSubmitting: boolean;
  }>();

  const conditionLabel = $derived(
    listing.condition.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  );

  const categoryLabel = $derived(
    listing.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  );

  const discount = $derived(
    listing.originalPrice && listing.originalPrice > listing.price
      ? Math.round(((listing.originalPrice - listing.price) / listing.originalPrice) * 100)
      : 0
  );
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-bold text-[#814256] mb-2">Review Your Listing</h2>
    <p class="text-gray-600">Make sure everything looks good before publishing</p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Photos Preview -->
    <div class="space-y-4">
      <h3 class="font-semibold text-gray-800">Photos</h3>
      {#if listing.images.length > 0}
        <div class="aspect-square rounded-xl overflow-hidden border border-[#aca89f]/30">
          <img src={listing.images[0]} alt="Main photo" class="w-full h-full object-cover" />
        </div>
        {#if listing.images.length > 1}
          <div class="grid grid-cols-4 gap-2">
            {#each listing.images.slice(1) as image, index}
              <div class="aspect-square rounded-lg overflow-hidden border border-[#aca89f]/30">
                <img src={image} alt="Photo {index + 2}" class="w-full h-full object-cover" />
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <!-- Details Preview -->
    <div class="space-y-6">
      <div>
        <h3 class="font-semibold text-gray-800 mb-3">Item Details</h3>
        <div class="bg-white rounded-xl border border-[#aca89f]/30 p-6 space-y-4">
          <h4 class="text-xl font-bold text-[#814256]">{listing.title}</h4>

          <div class="flex flex-wrap gap-2">
            <span class="px-3 py-1 rounded-full border text-sm {CONDITION_COLORS[listing.condition as keyof typeof CONDITION_COLORS] || 'bg-gray-100'}">
              {conditionLabel}
            </span>
            <span class="px-3 py-1 rounded-full bg-[#aca89f]/20 text-gray-600 text-sm">
              {categoryLabel}
            </span>
          </div>

          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold text-[#814256]">${listing.price.toFixed(2)}</span>
            {#if listing.originalPrice && listing.originalPrice > listing.price}
              <span class="text-gray-400 line-through">${listing.originalPrice.toFixed(2)}</span>
              <span class="text-green-600 text-sm font-medium">-{discount}%</span>
            {/if}
          </div>

          <div>
            <h5 class="font-medium text-gray-700 mb-1">Description</h5>
            <RichTextDisplay content={listing.description} />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Ready to Publish Banner -->
  <div class="bg-[#eccc6e]/30 rounded-xl p-4 flex items-center gap-3">
    <svg class="w-6 h-6 text-[#814256]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div>
      <p class="font-medium text-[#814256]">Ready to publish!</p>
      <p class="text-sm text-gray-600">Your listing will be live immediately and visible to all Mahalle members.</p>
    </div>
  </div>

  <!-- Navigation Buttons -->
  <div class="flex justify-between pt-4">
    <button
      onclick={onPrev}
      disabled={isSubmitting}
      class="text-gray-600 px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Edit Details
    </button>
    <button
      onclick={onSubmit}
      disabled={isSubmitting}
      class="bg-[#814256] text-white px-8 py-3 rounded-xl hover:bg-[#6a3646] transition-colors font-semibold flex items-center gap-2 disabled:opacity-50"
    >
      {#if isSubmitting}
        <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Publishing...
      {:else}
        Publish Listing
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      {/if}
    </button>
  </div>
</div>

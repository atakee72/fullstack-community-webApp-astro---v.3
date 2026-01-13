<script lang="ts">
  import type { Listing } from '../../types/listing';
  import { CONDITION_COLORS } from '../../types/listing';

  let { listing } = $props<{ listing: Listing }>();

  const discount = $derived(
    listing.originalPrice && listing.originalPrice > listing.price
      ? Math.round(((listing.originalPrice - listing.price) / listing.originalPrice) * 100)
      : 0
  );

  const conditionLabel = $derived(
    listing.condition.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  );
</script>

<a href="/marketplace/{listing._id}" class="group block">
  <div class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#aca89f]/30">
    <!-- Image -->
    <div class="relative aspect-square overflow-hidden bg-[#aca89f]/10">
      {#if listing.images && listing.images.length > 0}
        <img
          src={listing.images[0]}
          alt={listing.title}
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      {:else}
        <div class="w-full h-full flex items-center justify-center text-[#aca89f]">
          <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      {/if}

      {#if discount > 0}
        <span class="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
          -{discount}%
        </span>
      {/if}

      <!-- Save button (shows on hover) -->
      <button
        class="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
        onclick={(e) => e.preventDefault()}
      >
        <svg class="w-4 h-4 text-[#814256]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="p-4">
      <h3 class="font-semibold text-[#814256] line-clamp-2 group-hover:text-[#4b9aaa] transition-colors min-h-[3rem]">
        {listing.title}
      </h3>

      <div class="flex items-center gap-2 mt-2 flex-wrap">
        <span class="text-xs px-2 py-1 rounded-full border {CONDITION_COLORS[listing.condition]}">
          {conditionLabel}
        </span>
        <span class="text-xs px-2 py-1 rounded-full bg-[#aca89f]/20 text-gray-600 capitalize">
          {listing.category.replace(/-/g, ' ')}
        </span>
      </div>

      <div class="flex items-center justify-between mt-3">
        <div class="flex items-center gap-2">
          <span class="text-lg font-bold text-[#814256]">${listing.price.toFixed(2)}</span>
          {#if listing.originalPrice && listing.originalPrice > listing.price}
            <span class="text-sm text-gray-400 line-through">${listing.originalPrice.toFixed(2)}</span>
          {/if}
        </div>
        <span class="text-xs text-gray-500 flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {listing.views}
        </span>
      </div>
    </div>
  </div>
</a>

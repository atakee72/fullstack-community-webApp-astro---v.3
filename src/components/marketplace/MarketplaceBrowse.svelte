<script lang="ts">
  import type { Listing, ListingFilters } from '../../types/listing';
  import ProductCard from './ProductCard.svelte';
  import ProductFilters from './ProductFilters.svelte';
  import SearchBar from './SearchBar.svelte';

  let { session } = $props<{ session: any }>();

  let listings = $state<Listing[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let total = $state(0);

  let filters = $state<ListingFilters>({
    category: 'all',
    condition: 'all',
    sortBy: 'newest',
    limit: 12,
    offset: 0
  });

  async function fetchListings() {
    loading = true;
    error = null;

    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'all') params.set('category', filters.category);
      if (filters.condition && filters.condition !== 'all') params.set('condition', filters.condition);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.search) params.set('search', filters.search);
      if (filters.priceMin !== undefined) params.set('priceMin', String(filters.priceMin));
      if (filters.priceMax !== undefined) params.set('priceMax', String(filters.priceMax));
      params.set('limit', String(filters.limit || 12));
      params.set('offset', String(filters.offset || 0));

      const response = await fetch(`/api/listings?${params}`);
      if (!response.ok) throw new Error('Failed to fetch listings');

      const data = await response.json();
      listings = data.listings;
      total = data.pagination.total;
    } catch (e) {
      error = e instanceof Error ? e.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    fetchListings();
  });

  function handleFilterChange(newFilters: Partial<ListingFilters>) {
    filters = { ...filters, ...newFilters, offset: 0 };
  }

  function handleSearch(query: string) {
    filters = { ...filters, search: query, offset: 0 };
  }
</script>

<div class="space-y-6">
  <!-- Hero Section -->
  <div class="bg-gradient-to-r from-[#4b9aaa] to-[#3a7a8a] rounded-2xl p-8 text-white text-center">
    <h1 class="text-3xl md:text-4xl font-bold mb-3">Mahalle Marketplace</h1>
    <p class="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
      Buy and sell within your neighbourhood community. Find unique items from your neighbours!
    </p>
    <SearchBar onSearch={handleSearch} placeholder="Search by item name or description..." />
  </div>

  <!-- Action Bar -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <ProductFilters {filters} onChange={handleFilterChange} />

    {#if session?.user}
      <a
        href="/marketplace/sell"
        class="inline-flex items-center gap-2 bg-[#814256] text-white px-6 py-3 rounded-xl hover:bg-[#6a3646] transition-colors font-medium"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        List an Item
      </a>
    {/if}
  </div>

  <!-- Results Count -->
  {#if !loading}
    <p class="text-sm text-gray-600">
      {total} {total === 1 ? 'item' : 'items'} found
    </p>
  {/if}

  <!-- Product Grid -->
  {#if loading}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each Array(8) as _}
        <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#aca89f]/30">
          <div class="aspect-square bg-gray-200 animate-pulse"></div>
          <div class="p-4 space-y-3">
            <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div class="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            <div class="flex gap-2">
              <div class="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
              <div class="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else if error}
    <div class="text-center py-12 bg-white rounded-2xl border border-[#aca89f]/30">
      <svg class="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">Oops! Something went wrong</h3>
      <p class="text-gray-500 mb-4">{error}</p>
      <button
        onclick={fetchListings}
        class="text-[#4b9aaa] hover:underline font-medium"
      >
        Try again
      </button>
    </div>
  {:else if listings.length === 0}
    <div class="text-center py-12 bg-white rounded-2xl border border-[#aca89f]/30">
      <svg class="w-16 h-16 text-[#aca89f] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">No listings found</h3>
      <p class="text-gray-500 mb-4">Try adjusting your filters or check back later</p>
      {#if filters.search || filters.category !== 'all' || filters.condition !== 'all'}
        <button
          onclick={() => handleFilterChange({ category: 'all', condition: 'all', search: '', priceMin: undefined, priceMax: undefined })}
          class="text-[#4b9aaa] hover:underline font-medium"
        >
          Clear all filters
        </button>
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each listings as listing (listing._id)}
        <ProductCard {listing} />
      {/each}
    </div>
  {/if}

  <!-- Login CTA for non-authenticated users -->
  {#if !session?.user && !loading && listings.length > 0}
    <div class="bg-[#eccc6e]/30 rounded-2xl p-6 text-center">
      <h3 class="text-lg font-semibold text-[#814256] mb-2">Want to sell something?</h3>
      <p class="text-gray-600 mb-4">Join Mahalle to list your items and connect with your neighbours</p>
      <a
        href="/login?redirect=/marketplace/sell"
        class="inline-flex items-center gap-2 bg-[#4b9aaa] text-white px-6 py-3 rounded-xl hover:bg-[#3a7a8a] transition-colors font-medium"
      >
        Sign in to sell
      </a>
    </div>
  {/if}
</div>

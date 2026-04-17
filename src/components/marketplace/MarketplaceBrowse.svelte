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

  let pageSize = $state(12);

  // Filters describe "what to find". Pagination (pageSize, offset) is tracked
  // separately so the two can't drift out of sync.
  let filters = $state<ListingFilters>({
    category: 'all',
    condition: 'all',
    sortBy: 'newest',
    offset: 0
  });

  let currentPage = $derived(Math.floor((filters.offset || 0) / pageSize));
  let totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));

  function goToPage(page: number) {
    filters = { ...filters, offset: page * pageSize };
  }

  function handlePageSizeChange(size: number) {
    pageSize = size;
    filters = { ...filters, offset: 0 };
  }

  async function fetchListings() {
    loading = true;
    error = null;

    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'all') params.set('category', filters.category);
      if (filters.condition && filters.condition !== 'all') params.set('condition', filters.condition);
      if (filters.listingType && filters.listingType !== 'all') params.set('listingType', filters.listingType);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.search) params.set('search', filters.search);
      if (filters.priceMin !== undefined) params.set('priceMin', String(filters.priceMin));
      if (filters.priceMax !== undefined) params.set('priceMax', String(filters.priceMax));
      params.set('limit', String(pageSize));
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

  // --- Scroll-triggered stagger animation ---

  let columnsPerRow = $state(getColumnsPerRow());

  function getColumnsPerRow(): number {
    if (typeof window === 'undefined') return 1;
    if (window.innerWidth >= 1280) return 4;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  }

  $effect(() => {
    const handler = () => { columnsPerRow = getColumnsPerRow(); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  });

  function reveal(node: HTMLElement, delay: number) {
    let currentDelay = delay;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.style.animationDelay = `${currentDelay}s`;
            el.classList.add('animate-scroll-reveal');
            observer.unobserve(el);
          }
        }
      },
      { rootMargin: '-80px' }
    );

    observer.observe(node);

    return {
      update(newDelay: number) {
        currentDelay = newDelay;
      },
      destroy() {
        observer.disconnect();
      }
    };
  }
</script>

<div class="space-y-6">
  <!-- Search -->
  <SearchBar onSearch={handleSearch} placeholder="Search by item name or description..." />

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
    <p class="text-sm text-white/70">
      {total} {total === 1 ? 'item' : 'items'} found
    </p>
  {/if}

  <!-- Product Grid -->
  {#if loading}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each Array(8) as _}
        <div class="bg-white/[0.06] backdrop-blur-xl border border-white/[0.15] border-t-white/30 border-l-white/25 rounded-2xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <div class="aspect-square bg-white/10 animate-pulse"></div>
          <div class="p-4 space-y-3">
            <div class="h-4 bg-white/10 rounded animate-pulse"></div>
            <div class="h-4 bg-white/10 rounded w-2/3 animate-pulse"></div>
            <div class="flex gap-2">
              <div class="h-6 w-16 bg-white/10 rounded-full animate-pulse"></div>
              <div class="h-6 w-16 bg-white/10 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else if error}
    <div class="text-center py-12 bg-white/[0.06] backdrop-blur-xl border border-white/[0.15] border-t-white/30 border-l-white/25 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
      <svg class="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 class="text-xl font-semibold text-white/80 mb-2">Oops! Something went wrong</h3>
      <p class="text-white/60 mb-4">{error}</p>
      <button
        onclick={fetchListings}
        class="text-[#E79750] hover:underline font-medium"
      >
        Try again
      </button>
    </div>
  {:else if listings.length === 0}
    <div class="text-center py-12 bg-white/[0.06] backdrop-blur-xl border border-white/[0.15] border-t-white/30 border-l-white/25 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
      <svg class="w-16 h-16 text-[#aca89f] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      <h3 class="text-xl font-semibold text-white/80 mb-2">No listings found</h3>
      <p class="text-white/60 mb-4">Try adjusting your filters or check back later</p>
      {#if filters.search || filters.category !== 'all' || filters.condition !== 'all'}
        <button
          onclick={() => handleFilterChange({ category: 'all', condition: 'all', search: '', priceMin: undefined, priceMax: undefined })}
          class="text-[#E79750] hover:underline font-medium"
        >
          Clear all filters
        </button>
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each listings as listing, index (listing._id)}
        <div class="opacity-0" use:reveal={(index % columnsPerRow) * 0.12}>
          <ProductCard {listing} {session} />
        </div>
      {/each}
    </div>
  {/if}

  <!-- Pagination -->
  {#if totalPages > 1 || total > 12}
    <div class="flex flex-wrap justify-center items-center gap-4 mt-6">
      <div class="flex items-center gap-2">
        <label class="text-sm text-white/60" for="mp-page-size">Show</label>
        <select
          id="mp-page-size"
          bind:value={pageSize}
          onchange={() => handlePageSizeChange(pageSize)}
          class="px-2 py-1 border border-white/15 rounded-lg text-sm focus:ring-2 focus:ring-[#E79750]"
        >
          <option value={12}>12</option>
          <option value={24}>24</option>
          <option value={48}>48</option>
        </select>
      </div>

      <div class="flex items-center gap-1.5 sm:gap-2">
        <button
          onclick={() => goToPage(0)}
          disabled={currentPage === 0 || loading}
          class="hidden sm:inline-flex px-3 py-1.5 bg-white/[0.06] text-white/80 rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          First
        </button>
        <button
          onclick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 0 || loading}
          class="px-2.5 sm:px-3 py-1.5 bg-white/[0.06] text-white/80 rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          &larr;<span class="hidden sm:inline"> Prev</span>
        </button>
        <span class="text-sm text-white/60 px-1">
          <span class="sm:hidden">{currentPage + 1}/{totalPages}</span>
          <span class="hidden sm:inline">Page {currentPage + 1} of {totalPages} &middot; {total} items</span>
        </span>
        <button
          onclick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages - 1 || loading}
          class="px-2.5 sm:px-3 py-1.5 bg-[#E79750] text-white rounded-lg hover:bg-[#3a8999] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          <span class="hidden sm:inline">Next </span>&rarr;
        </button>
        <button
          onclick={() => goToPage(totalPages - 1)}
          disabled={currentPage >= totalPages - 1 || loading}
          class="hidden sm:inline-flex px-3 py-1.5 bg-white/[0.06] text-white/80 rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          Last
        </button>
      </div>
    </div>
  {/if}

  <!-- Login CTA for non-authenticated users -->
  {#if !session?.user && !loading && listings.length > 0}
    <div class="bg-[#eccc6e]/30 rounded-2xl p-6 text-center">
      <h3 class="text-lg font-semibold text-[#814256] mb-2">Want to sell something?</h3>
      <p class="text-white/70 mb-4">Join Mahalle to list your items and connect with your neighbours</p>
      <a
        href="/login?redirect=/marketplace/sell"
        class="inline-flex items-center gap-2 bg-[#E79750] text-white px-6 py-3 rounded-xl hover:bg-[#f0a85a] transition-colors font-medium"
      >
        Sign in to sell
      </a>
    </div>
  {/if}
</div>

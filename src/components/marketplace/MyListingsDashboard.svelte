<script lang="ts">
  import type { Listing, ListingStats } from '../../types/listing';
  import StatsCards from './dashboard/StatsCards.svelte';
  import ListingsTable from './dashboard/ListingsTable.svelte';

  let { session } = $props<{ session: any }>();

  let listings = $state<Listing[]>([]);
  let stats = $state<ListingStats>({
    totalListings: 0,
    activeListings: 0,
    soldItems: 0,
    totalEarnings: 0
  });
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Check for success message from redirect
  let showSuccess = $state(false);

  $effect(() => {
    fetchMyListings();

    // Check URL params for success message
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      showSuccess = true;
      // Remove the param from URL
      window.history.replaceState({}, '', window.location.pathname);
      // Hide after 5 seconds
      setTimeout(() => showSuccess = false, 5000);
    }
  });

  async function fetchMyListings() {
    loading = true;
    error = null;

    try {
      const response = await fetch('/api/listings/my-listings');
      if (!response.ok) throw new Error('Failed to fetch listings');

      const data = await response.json();
      listings = data.listings;
      stats = data.stats;
    } catch (e) {
      error = e instanceof Error ? e.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }

  async function handleStatusChange(id: string, status: 'available' | 'reserved' | 'sold') {
    try {
      const response = await fetch(`/api/listings/edit/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Update local state
        listings = listings.map(l =>
          l._id === id ? { ...l, status } : l
        );
        // Recalculate stats
        stats = {
          ...stats,
          activeListings: listings.filter(l => l.status === 'available').length,
          soldItems: listings.filter(l => l.status === 'sold').length,
          totalEarnings: listings.filter(l => l.status === 'sold').reduce((sum, l) => sum + l.price, 0)
        };
      }
    } catch (e) {
      console.error('Failed to update status');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const response = await fetch(`/api/listings/delete/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local state
        const deletedListing = listings.find(l => l._id === id);
        listings = listings.filter(l => l._id !== id);
        // Recalculate stats
        stats = {
          totalListings: listings.length,
          activeListings: listings.filter(l => l.status === 'available').length,
          soldItems: listings.filter(l => l.status === 'sold').length,
          totalEarnings: listings.filter(l => l.status === 'sold').reduce((sum, l) => sum + l.price, 0)
        };
      }
    } catch (e) {
      console.error('Failed to delete listing');
    }
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl md:text-3xl font-bold text-[#814256]">
        Welcome back, {session?.user?.name || 'Seller'}!
      </h1>
      <p class="text-gray-600">Manage your listings and track your sales</p>
    </div>
    <a
      href="/marketplace/sell"
      class="inline-flex items-center justify-center gap-2 bg-[#4b9aaa] text-white px-6 py-3 rounded-xl hover:bg-[#3a7a8a] transition-colors font-medium"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      New Listing
    </a>
  </div>

  <!-- Success Message -->
  {#if showSuccess}
    <div class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
      <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-green-700">Your listing has been published successfully!</p>
    </div>
  {/if}

  {#if loading}
    <!-- Loading State -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {#each Array(4) as _}
        <div class="bg-white rounded-xl border border-[#aca89f]/30 p-4 h-20 animate-pulse"></div>
      {/each}
    </div>
    <div class="bg-white rounded-xl border border-[#aca89f]/30 p-8 h-64 animate-pulse"></div>
  {:else if error}
    <!-- Error State -->
    <div class="text-center py-12 bg-white rounded-2xl border border-[#aca89f]/30">
      <svg class="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">Failed to load listings</h3>
      <p class="text-gray-500 mb-4">{error}</p>
      <button onclick={fetchMyListings} class="text-[#4b9aaa] hover:underline font-medium">
        Try again
      </button>
    </div>
  {:else}
    <!-- Stats Cards -->
    <StatsCards {stats} />

    <!-- Listings Section -->
    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-800">My Listings</h2>
        <span class="text-sm text-gray-500">{listings.length} items</span>
      </div>

      {#if listings.length === 0}
        <!-- Empty State -->
        <div class="text-center py-12 bg-white rounded-2xl border border-[#aca89f]/30">
          <svg class="w-16 h-16 text-[#aca89f] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 class="text-xl font-semibold text-gray-700 mb-2">No listings yet</h3>
          <p class="text-gray-500 mb-4">Create your first listing to start selling!</p>
          <a
            href="/marketplace/sell"
            class="inline-flex items-center gap-2 bg-[#4b9aaa] text-white px-6 py-3 rounded-xl hover:bg-[#3a7a8a] transition-colors font-medium"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Listing
          </a>
        </div>
      {:else}
        <ListingsTable {listings} onStatusChange={handleStatusChange} onDelete={handleDelete} />
      {/if}
    </div>
  {/if}

  <!-- Quick Links -->
  <div class="flex flex-wrap gap-4 pt-4">
    <a href="/marketplace" class="text-[#4b9aaa] hover:underline flex items-center gap-1">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Browse Marketplace
    </a>
  </div>
</div>

<script lang="ts">
  import type { Listing, ListingStats } from '../../types/listing';
  import StatsCards from './dashboard/StatsCards.svelte';
  import ListingsTable from './dashboard/ListingsTable.svelte';

  let { session } = $props<{ session: any }>();

  let listings = $state<Listing[]>([]);
  let drafts = $state<Listing[]>([]);
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
  let successMessage = $state('Your listing has been published successfully!');

  $effect(() => {
    fetchMyListings();

    // Check URL params for success message
    const params = new URLSearchParams(window.location.search);
    const successType = params.get('success');
    if (successType === 'true' || successType === 'moderation') {
      showSuccess = true;
      successMessage = successType === 'moderation'
        ? 'Your listing has been submitted and is under review by our moderation team.'
        : 'Your listing has been published successfully!';
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
      drafts = data.drafts || [];
      stats = data.stats;
    } catch (e) {
      error = e instanceof Error ? e.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }

  async function handleStatusChange(id: string, status: 'available' | 'reserved' | 'sold' | 'exchanged') {
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

  async function handleDeleteDraft(id: string) {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      const response = await fetch(`/api/listings/delete/${id}`, { method: 'DELETE' });
      if (response.ok) {
        drafts = drafts.filter(d => d._id !== id);
      }
    } catch (e) {
      console.error('Failed to delete draft');
    }
  }

  let publishingDraftId = $state<string | null>(null);

  async function handlePublishDraft(id: string) {
    if (publishingDraftId) return; // Prevent double-clicks
    publishingDraftId = id;
    try {
      const response = await fetch(`/api/listings/draft/${id}/publish`, { method: 'POST' });
      const data = await response.json();

      if (response.status === 429) {
        showSuccess = true;
        successMessage = data.message || 'Daily limit reached. Try again tomorrow.';
        setTimeout(() => showSuccess = false, 5000);
        return;
      }

      if (response.status === 400 && data.missingFields) {
        // Draft is incomplete — redirect to wizard to complete it
        window.location.href = `/marketplace/sell?draft=${id}`;
        return;
      }

      if (!response.ok) throw new Error(data.error || 'Failed to publish');

      // Move from drafts to listings
      await fetchMyListings();
      showSuccess = true;
      successMessage = data.moderationStatus === 'pending'
        ? 'Your listing has been submitted and is under review by our moderation team.'
        : 'Your listing has been published successfully!';
      setTimeout(() => showSuccess = false, 5000);
    } catch (e) {
      console.error('Failed to publish draft');
    } finally {
      publishingDraftId = null;
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
      <p class="text-green-700">{successMessage}</p>
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

    <!-- Drafts Section -->
    {#if drafts.length > 0}
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-gray-800">Drafts</h2>
          <span class="text-sm text-gray-500">{drafts.length} draft{drafts.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="bg-white rounded-xl border border-[#aca89f]/30 divide-y divide-[#aca89f]/20">
          {#each drafts as draft}
            <div class="p-4 flex items-center gap-4">
              <div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                {#if draft.images && draft.images.length > 0}
                  <img src={draft.images[0]} alt={draft.title} class="w-full h-full object-cover" />
                {:else}
                  <div class="w-full h-full flex items-center justify-center">
                    <svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-gray-800 truncate">{draft.title}</h3>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Draft</span>
                  <span class="text-xs text-gray-400">Last edited {new Date(draft.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <a
                  href="/marketplace/sell?draft={draft._id}"
                  class="text-[#4b9aaa] text-sm hover:underline"
                >Edit</a>
                <button
                  onclick={() => handlePublishDraft(draft._id as string)}
                  disabled={publishingDraftId === (draft._id as string)}
                  class="text-sm px-3 py-1.5 bg-[#4b9aaa] text-white rounded-lg hover:bg-[#3a7a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  {#if publishingDraftId === (draft._id as string)}
                    <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Publishing...
                  {:else}
                    Publish
                  {/if}
                </button>
                <button
                  onclick={() => handleDeleteDraft(draft._id as string)}
                  class="text-red-600 text-sm hover:underline"
                >Delete</button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

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

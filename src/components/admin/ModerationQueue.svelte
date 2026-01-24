<script lang="ts">
  import { onMount } from 'svelte';

  export let userId: string;

  interface FlaggedContent {
    _id: string;
    source: 'ai_moderation' | 'user_report';
    contentType: string;
    contentId?: string;
    title?: string;
    body?: string;
    tags?: string[];
    imageUrls?: string[];
    authorId: string;
    authorName?: string;
    authorEmail?: string;
    decision: 'approved' | 'pending_review' | 'urgent_review';
    flaggedCategories: string[];
    scores: Record<string, number>;
    highestCategory: string;
    maxScore: number;
    // User report specific fields
    reporterUserId?: string;
    reporterName?: string;
    reportReason?: string;
    reportDetails?: string;
    reportCount?: number;
    // Review fields
    reviewStatus: 'pending' | 'approved' | 'rejected';
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
    rejectionReason?: string;
    hasWarningLabel?: boolean;
    warningText?: string;
    createdAt: string;
  }

  interface QueueData {
    items: FlaggedContent[];
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
    counts: { pending: number; approved: number; rejected: number; urgent: number };
  }

  let data: QueueData | null = null;
  let loading = true;
  let error: string | null = null;
  let viewMode: 'queue' | 'history' = 'queue';
  let filterStatus: 'pending' | 'approved' | 'rejected' | 'all' = 'pending';
  let filterType = 'all';
  let actionLoading: string | null = null;

  async function fetchQueue() {
    loading = true;
    error = null;

    try {
      const params = new URLSearchParams();

      // For queue view, always show pending items
      // For history view, never show pending items (even with "all" filter)
      if (viewMode === 'queue') {
        params.set('reviewStatus', 'pending');
      } else if (filterStatus === 'all') {
        // History "all" = approved + rejected (NOT pending)
        params.set('reviewStatus', 'reviewed');
      } else {
        params.set('reviewStatus', filterStatus);
      }

      if (filterType !== 'all') params.set('contentType', filterType);

      const response = await fetch(`/api/admin/moderation?${params}`, { credentials: 'include' });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch');
      }

      data = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  async function handleReview(id: string, action: 'approve' | 'reject' | 'approve_with_warning', warningText?: string, rejectionReason?: string) {
    actionLoading = id;

    try {
      const response = await fetch('/api/admin/moderation/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ flaggedContentId: id, action, warningText, rejectionReason })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to review');
      }

      const result = await response.json();

      // Show result message (includes strike count for rejections)
      if (result.message) {
        alert(result.message);
      }

      await fetchQueue();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      actionLoading = null;
    }
  }

  function getCategoryColor(cat: string): string {
    if (cat.includes('sexual/minors')) return 'bg-red-600';
    if (cat.includes('self-harm')) return 'bg-orange-600';
    if (cat.includes('threatening')) return 'bg-red-500';
    if (cat.includes('hate')) return 'bg-purple-600';
    if (cat.includes('violence')) return 'bg-red-400';
    if (cat.includes('sexual')) return 'bg-pink-500';
    if (cat.includes('harassment')) return 'bg-yellow-600';
    if (cat === 'moderation_error') return 'bg-gray-500';
    return 'bg-gray-400';
  }

  function formatDate(date: string): string {
    return new Date(date).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  onMount(fetchQueue);

  // Track previous viewMode to detect changes
  let previousViewMode = viewMode;

  // Update filter when view mode changes
  $: {
    if (viewMode !== previousViewMode) {
      // View mode actually changed - clear items and update filter
      if (viewMode === 'queue') {
        filterStatus = 'pending';
      } else if (viewMode === 'history') {
        filterStatus = 'all';
      }
      // Clear items only on actual view change to prevent flash of stale data
      if (data) data = { ...data, items: [] };
      previousViewMode = viewMode;
    }
  }

  $: if (filterStatus || filterType) fetchQueue();
</script>

<div class="space-y-6 max-w-6xl mx-auto">
  <!-- Stats Cards -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
    <div class="bg-white rounded-lg p-4 shadow-md border-l-4 border-red-500">
      <p class="text-sm text-gray-500">Urgent</p>
      <p class="text-2xl font-bold text-red-600">{data?.counts.urgent ?? 0}</p>
    </div>
    <div class="bg-white rounded-lg p-4 shadow-md border-l-4 border-yellow-500">
      <p class="text-sm text-gray-500">Pending</p>
      <p class="text-2xl font-bold text-yellow-600">{data?.counts.pending ?? 0}</p>
    </div>
    <div class="bg-white rounded-lg p-4 shadow-md border-l-4 border-green-500">
      <p class="text-sm text-gray-500">Approved</p>
      <p class="text-2xl font-bold text-green-600">{data?.counts.approved ?? 0}</p>
    </div>
    <div class="bg-white rounded-lg p-4 shadow-md border-l-4 border-yellow-500">
      <p class="text-sm text-gray-500">With Warning</p>
      <p class="text-2xl font-bold text-yellow-600">{data?.counts.approvedWithWarning ?? 0}</p>
    </div>
    <div class="bg-white rounded-lg p-4 shadow-md border-l-4 border-gray-500">
      <p class="text-sm text-gray-500">Rejected</p>
      <p class="text-2xl font-bold text-gray-600">{data?.counts.rejected ?? 0}</p>
    </div>
  </div>

  <!-- View Mode Toggle -->
  <div class="bg-white rounded-lg p-4 shadow-md">
    <div class="flex gap-2 mb-4">
      <button
        on:click={() => viewMode = 'queue'}
        class="px-4 py-2 rounded-lg font-medium transition-colors {viewMode === 'queue' ? 'bg-[#814256] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
      >
        📋 Review Queue
      </button>
      <button
        on:click={() => viewMode = 'history'}
        class="px-4 py-2 rounded-lg font-medium transition-colors {viewMode === 'history' ? 'bg-[#814256] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
      >
        📜 Moderation History
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-4">
      {#if viewMode === 'history'}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Decision</label>
          <select bind:value={filterStatus} class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#814256]">
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      {/if}
      <!-- Content Type Filter Tabs -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
        <div class="flex flex-wrap gap-1">
          <button
            on:click={() => filterType = 'all'}
            class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors {filterType === 'all' ? 'bg-[#4b9aaa] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            All
          </button>
          <button
            on:click={() => filterType = 'topic'}
            class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors {filterType === 'topic' ? 'bg-[#4b9aaa] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            Discussions
          </button>
          <button
            on:click={() => filterType = 'comment'}
            class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors {filterType === 'comment' ? 'bg-[#4b9aaa] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            Comments
          </button>
          <button
            on:click={() => filterType = 'announcement'}
            class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors {filterType === 'announcement' ? 'bg-[#4b9aaa] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            Announcements
          </button>
          <button
            on:click={() => filterType = 'event'}
            class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors {filterType === 'event' ? 'bg-[#4b9aaa] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            Events
          </button>
          <button
            on:click={() => filterType = 'recommendation'}
            class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors {filterType === 'recommendation' ? 'bg-[#4b9aaa] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            Recommendations
          </button>
        </div>
      </div>
      <div class="flex items-end">
        <button on:click={fetchQueue} disabled={loading} class="px-4 py-2 bg-[#4b9aaa] text-white rounded-lg hover:bg-[#3a8999] disabled:opacity-50">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    </div>
  </div>

  <!-- Loading / Error -->
  {#if loading && !data}
    <div class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-[#814256] border-t-transparent"></div>
    </div>
  {:else if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
      <p class="font-bold">Error: {error}</p>
      <button on:click={fetchQueue} class="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Retry</button>
    </div>
  {:else if data?.items.length === 0}
    <div class="bg-white rounded-lg p-8 shadow-md text-center">
      <p class="text-gray-500 text-lg">{viewMode === 'queue' ? 'No items in the queue' : 'No moderation history found'}</p>
      <p class="text-xs text-gray-400 mt-2">Debug: viewMode={viewMode}, filterStatus={filterStatus}</p>
    </div>
  {:else if viewMode === 'history'}
    <!-- History Table View -->
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-700">Date</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">Source</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">Type</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">Content</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">Author</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">Flagged For</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">Decision</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700">Reason/Warning</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each data?.items ?? [] as item (item._id)}
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 whitespace-nowrap text-gray-500">
                  <div>{formatDate(item.createdAt)}</div>
                  {#if item.reviewedAt}
                    <div class="text-xs text-gray-400">Reviewed: {formatDate(item.reviewedAt)}</div>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  {#if item.source === 'user_report'}
                    <span class="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                      🚩 Report{item.reportCount && item.reportCount > 1 ? ` (${item.reportCount})` : ''}
                    </span>
                  {:else}
                    <span class="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">🤖 AI</span>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">{item.contentType}</span>
                </td>
                <td class="px-4 py-3 min-w-[200px] max-w-sm">
                  <div class="max-h-24 overflow-y-auto">
                    {#if item.title}
                      <p class="font-medium text-gray-900 break-words">{item.title}</p>
                    {/if}
                    {#if item.body}
                      <p class="text-gray-500 text-xs break-words whitespace-pre-wrap">{item.body}</p>
                    {/if}
                    {#if item.tags?.length}
                      <div class="mt-1 flex flex-wrap gap-1">
                        {#each item.tags as tag}
                          <span class="px-1 py-0.5 text-[10px] bg-amber-100 text-amber-800 border border-amber-200 rounded">{tag}</span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-gray-900">{item.authorName || 'Unknown'}</div>
                  <div class="text-xs text-gray-500">{item.authorEmail || ''}</div>
                </td>
                <td class="px-4 py-3">
                  {#if item.source === 'user_report'}
                    <div class="space-y-1">
                      <span class="px-1.5 py-0.5 text-xs rounded bg-orange-500 text-white">
                        {item.reportReason?.replace('_', ' ') || 'Other'}
                      </span>
                      {#if item.reporterName}
                        <div class="text-[10px] text-gray-400">by {item.reporterName}</div>
                      {/if}
                    </div>
                  {:else}
                    <div class="flex flex-wrap gap-1">
                      {#each item.flaggedCategories.slice(0, 2) as cat}
                        <span class="px-1.5 py-0.5 text-xs rounded text-white {getCategoryColor(cat)}">{cat}</span>
                      {/each}
                      {#if item.flaggedCategories.length > 2}
                        <span class="text-xs text-gray-500">+{item.flaggedCategories.length - 2}</span>
                      {/if}
                    </div>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  {#if item.reviewStatus === 'approved'}
                    <span class="px-2 py-1 text-xs font-medium rounded-full {item.hasWarningLabel ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
                      {item.hasWarningLabel ? '⚠ With Warning' : '✓ Approved'}
                    </span>
                  {:else if item.reviewStatus === 'rejected'}
                    <span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">✕ Rejected</span>
                  {:else}
                    <span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">⏳ Pending</span>
                  {/if}
                </td>
                <td class="px-4 py-3 max-w-xs">
                  {#if item.rejectionReason}
                    <p class="text-red-600 text-xs">{item.rejectionReason}</p>
                  {:else if item.warningText}
                    <p class="text-yellow-600 text-xs">{item.warningText}</p>
                  {:else if item.reviewNotes}
                    <p class="text-gray-500 text-xs italic">{item.reviewNotes}</p>
                  {:else}
                    <span class="text-gray-400 text-xs">-</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else}
    <!-- Queue Items (Card View) -->
    <div class="space-y-4">
      {#each data?.items ?? [] as item (item._id)}
        <div class="bg-white rounded-lg shadow-md overflow-hidden {item.decision === 'urgent_review' ? 'ring-2 ring-red-500' : ''}">
          <!-- Header -->
          <div class="bg-gray-50 px-4 py-3 border-b flex flex-wrap items-center gap-2">
            {#if item.source === 'user_report'}
              <span class="px-2 py-1 text-xs font-bold bg-orange-500 text-white rounded-full">
                🚩 User Report{item.reportCount && item.reportCount > 1 ? ` (${item.reportCount})` : ''}
              </span>
            {:else if item.decision === 'urgent_review'}
              <span class="px-2 py-1 text-xs font-bold bg-red-600 text-white rounded-full animate-pulse">URGENT</span>
            {:else}
              <span class="px-2 py-1 text-xs font-medium bg-yellow-500 text-white rounded-full">AI Flagged</span>
            {/if}
            <span class="px-2 py-1 text-xs font-medium bg-blue-500 text-white rounded-full">{item.contentType}</span>
            <span class="text-sm text-gray-500">by {item.authorName || item.authorEmail || 'Unknown'}</span>
            <span class="text-sm text-gray-400 ml-auto">{formatDate(item.createdAt)}</span>
          </div>

          <!-- Content -->
          <div class="p-4 max-h-60 overflow-y-auto">
            {#if item.title}
              <h3 class="font-bold text-lg text-[#814256] mb-2">{item.title}</h3>
            {/if}
            {#if item.body}
              <p class="text-gray-700 whitespace-pre-wrap">{item.body}</p>
            {/if}
            {#if item.tags?.length}
              <div class="mt-2 flex flex-wrap gap-1">
                <span class="text-xs text-gray-500 font-medium">Tags:</span>
                {#each item.tags as tag}
                  <span class="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 border border-amber-300 rounded font-medium">{tag}</span>
                {/each}
              </div>
            {/if}
            {#if item.imageUrls?.length}
              <div class="mt-3 flex gap-2 flex-wrap">
                {#each item.imageUrls as url, idx}
                  <img src={url} alt="Upload {idx + 1}" class="w-24 h-24 object-cover rounded-lg border blur-sm hover:blur-none transition-all cursor-pointer" on:click={() => window.open(url, '_blank')} />
                {/each}
              </div>
            {/if}
          </div>

          <!-- Flagged Categories / Report Reason -->
          <div class="px-4 pb-3">
            {#if item.source === 'user_report'}
              <p class="text-sm text-gray-500 mb-2">Reported for:</p>
              <div class="space-y-2">
                <span class="px-2 py-1 text-xs font-medium rounded-full text-white bg-orange-500">
                  {item.reportReason?.replace('_', ' ') || 'Other'}
                </span>
                {#if item.reportDetails}
                  <p class="text-xs text-gray-500 font-medium mt-1">Reporter's reasoning:</p>
                  <p class="text-sm text-gray-600 italic bg-gray-100 p-2 rounded">"{item.reportDetails}"</p>
                {/if}
                <p class="text-xs text-gray-400">
                  Reported by: {item.reporterName || 'Anonymous user'}
                </p>
              </div>
            {:else}
              <p class="text-sm text-gray-500 mb-2">Flagged for:</p>
              <div class="flex flex-wrap gap-2">
                {#each item.flaggedCategories as cat}
                  <span class="px-2 py-1 text-xs font-medium rounded-full text-white {getCategoryColor(cat)}">
                    {cat} ({((item.scores[cat] ?? 0) * 100).toFixed(0)}%)
                  </span>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Actions -->
          <!-- TODO: Notify reporter of outcome (future feature)
               When a user report is reviewed, the reporter should be notified:
               - If dismissed: "Your report was reviewed. The content was found to comply with guidelines."
               - If removed: "Thank you, the reported content has been removed."
               Options: Email notification, in-app notification badge, or notification center -->
          {#if item.reviewStatus === 'pending'}
            <div class="bg-gray-50 px-4 py-3 border-t flex flex-wrap gap-2">
              {#if item.source === 'user_report'}
                <!-- User Report Actions -->
                <button
                  on:click={() => handleReview(item._id, 'approve')}
                  disabled={actionLoading === item._id}
                  class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 font-medium"
                >
                  {actionLoading === item._id ? '...' : '✗ Dismiss User Report'}
                </button>
                <button
                  on:click={() => {
                    const warning = prompt('Warning text to show on content:');
                    if (warning !== null) handleReview(item._id, 'approve_with_warning', warning || 'Sensitive content');
                  }}
                  disabled={actionLoading === item._id}
                  class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 font-medium"
                >
                  ⚠ Add Warning
                </button>
                <button
                  on:click={() => {
                    const reason = prompt('Reason for removal (shown to content author):');
                    if (reason !== null) {
                      handleReview(item._id, 'reject', undefined, reason || 'Content violated community guidelines');
                    }
                  }}
                  disabled={actionLoading === item._id}
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  🗑️ Remove Reported Content
                </button>
              {:else}
                <!-- AI Moderation Actions -->
                <button
                  on:click={() => handleReview(item._id, 'approve')}
                  disabled={actionLoading === item._id}
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {actionLoading === item._id ? '...' : '✓ Approve'}
                </button>
                <button
                  on:click={() => {
                    const warning = prompt('Warning text (optional):');
                    if (warning !== null) handleReview(item._id, 'approve_with_warning', warning || 'Sensitive content');
                  }}
                  disabled={actionLoading === item._id}
                  class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 font-medium"
                >
                  ⚠ With Warning
                </button>
                <button
                  on:click={() => {
                    const reason = prompt('Rejection reason (shown to user):');
                    if (reason !== null) {
                      handleReview(item._id, 'reject', undefined, reason || 'Content violated community guidelines');
                    }
                  }}
                  disabled={actionLoading === item._id}
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  ✕ Reject
                </button>
              {/if}
            </div>
          {:else}
            <div class="bg-gray-50 px-4 py-3 border-t text-sm text-gray-500">
              <span class={item.reviewStatus === 'approved' ? 'text-green-600' : 'text-red-600'}>
                {item.reviewStatus === 'approved' ? '✓ Approved' : '✕ Rejected'}
              </span>
              {#if item.reviewedAt} on {formatDate(item.reviewedAt)}{/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

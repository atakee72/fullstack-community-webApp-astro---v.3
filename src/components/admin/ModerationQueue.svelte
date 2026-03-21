<script lang="ts">
  import { onMount } from 'svelte';
  import { showSuccess, showError } from '../../utils/toast';
  import { confirmAction } from '../../utils/toast';

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
    sourceUrl?: string;
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
  let currentPage = 0;
  let pageSize = 10;

  // Sorting state
  let sortBy: 'createdAt' | 'maxScore' | 'reviewStatus' = 'createdAt';
  let sortOrder: 'asc' | 'desc' = 'desc';

  // Column visibility state (only for history table)
  let hiddenColumns: Set<string> = new Set(['reason']);
  let showColumnMenu = false;

  const ALL_COLUMNS = [
    { key: 'date', label: 'Date' },
    { key: 'source', label: 'Source' },
    { key: 'type', label: 'Type' },
    { key: 'content', label: 'Content' },
    { key: 'author', label: 'Author' },
    { key: 'flagged', label: 'Flagged For' },
    { key: 'decision', label: 'Decision' },
    { key: 'reason', label: 'Reason/Warning' },
  ];

  // Row selection state
  let selectedIds: Set<string> = new Set();
  let bulkActionLoading = false;

  function toggleSort(field: 'createdAt' | 'maxScore' | 'reviewStatus') {
    if (sortBy === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = field;
      sortOrder = 'desc';
    }
  }

  function toggleColumnVisibility(key: string) {
    // Prevent hiding all columns
    const visibleCount = ALL_COLUMNS.length - hiddenColumns.size;
    if (!hiddenColumns.has(key) && visibleCount <= 1) return;

    if (hiddenColumns.has(key)) {
      hiddenColumns.delete(key);
    } else {
      hiddenColumns.add(key);
    }
    hiddenColumns = hiddenColumns; // trigger reactivity
  }

  function toggleSelectAll() {
    if (!data) return;
    const allIds = data.items.map(item => item._id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    if (allSelected) {
      selectedIds = new Set();
    } else {
      selectedIds = new Set(allIds);
    }
  }

  function toggleSelectItem(id: string) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    selectedIds = selectedIds; // trigger reactivity
  }

  function clearSelection() {
    selectedIds = new Set();
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    const confirmed = await confirmAction(
      `Approve ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}?`,
      { title: 'Bulk Approve', confirmLabel: 'Approve All' }
    );
    if (!confirmed) return;

    bulkActionLoading = true;
    try {
      const response = await fetch('/api/admin/moderation/bulk-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          flaggedContentIds: Array.from(selectedIds),
          action: 'approve'
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Bulk approve failed');
      }

      const result = await response.json();
      showSuccess(result.message);
      clearSelection();
      await fetchQueue();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Bulk approve failed');
    } finally {
      bulkActionLoading = false;
    }
  }

  async function handleBulkReject() {
    if (selectedIds.size === 0) return;
    const confirmed = await confirmAction(
      `Reject ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}? This will add strikes to the authors.`,
      { title: 'Bulk Reject', confirmLabel: 'Reject All', variant: 'danger' }
    );
    if (!confirmed) return;

    const reason = prompt('Shared rejection reason (leave blank for default):');
    if (reason === null) return; // cancelled

    bulkActionLoading = true;
    try {
      const response = await fetch('/api/admin/moderation/bulk-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          flaggedContentIds: Array.from(selectedIds),
          action: 'reject',
          rejectionReason: reason || 'Content violated community guidelines'
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Bulk reject failed');
      }

      const result = await response.json();
      let msg = result.message;
      if (result.bansTriggered > 0) {
        msg = `⚠ ${result.bansTriggered} user(s) BANNED. ${msg}`;
      }
      showSuccess(msg);
      clearSelection();
      await fetchQueue();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Bulk reject failed');
    } finally {
      bulkActionLoading = false;
    }
  }

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

      if (filterType === 'user_reported') {
        params.set('source', 'user_report');
      } else if (filterType !== 'all') {
        params.set('contentType', filterType);
      }

      params.set('limit', pageSize.toString());
      params.set('offset', (currentPage * pageSize).toString());
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

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
        showSuccess(result.message);
      }

      await fetchQueue();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed');
    } finally {
      actionLoading = null;
    }
  }

  const CATEGORY_LABELS: Record<string, string> = {
    // OpenAI moderation categories
    'harassment': 'Harassment',
    'harassment/threatening': 'Threats',
    'hate': 'Hate speech',
    'hate/threatening': 'Hate threats',
    'illicit': 'Illegal activity',
    'illicit/violent': 'Violent illegal',
    'self-harm': 'Self-harm',
    'self-harm/intent': 'Self-harm intent',
    'self-harm/instructions': 'Self-harm instructions',
    'sexual': 'Sexual content',
    'sexual/minors': 'Child safety',
    'violence': 'Violence',
    'violence/graphic': 'Graphic violence',
    // Spam check classifications
    'spam_check:spam': 'Spam',
    'spam_check:ad_promotional': 'Ad / promotion',
    'spam_check:scam': 'Scam',
    'spam_check:irrelevant_nonsense': 'Irrelevant content',
    // Image safety classifications
    'image_safety:sexual': 'Sexual image',
    'image_safety:violence': 'Violent image',
    'image_safety:hate': 'Hateful image',
    'image_safety:other_violation': 'Inappropriate image',
    // Other
    'turkish_profanity': 'Profanity (TR)',
    'moderation_error': 'Error',
  };

  function formatCategory(cat: string): string {
    return CATEGORY_LABELS[cat] || cat.replace(/[_:]/g, ' ');
  }

  function getCategoryColor(cat: string): string {
    if (cat.includes('sexual/minors') || cat === 'image_safety:sexual') return 'bg-red-600';
    if (cat.includes('self-harm')) return 'bg-orange-600';
    if (cat.includes('threatening')) return 'bg-red-500';
    if (cat.includes('hate') || cat === 'image_safety:hate') return 'bg-purple-600';
    if (cat.includes('violence') || cat === 'image_safety:violence') return 'bg-red-400';
    if (cat.includes('sexual')) return 'bg-pink-500';
    if (cat.includes('harassment') || cat === 'turkish_profanity') return 'bg-yellow-600';
    if (cat.startsWith('spam_check:')) return 'bg-amber-600';
    if (cat.startsWith('image_safety:')) return 'bg-pink-600';
    if (cat === 'moderation_error') return 'bg-gray-500';
    return 'bg-gray-400';
  }

  function formatDate(date: string): string {
    return new Date(date).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  // Computed: total pages
  $: totalPages = data ? Math.max(1, Math.ceil(data.pagination.total / pageSize)) : 1;

  // Computed: are all visible items selected?
  $: allSelected = data ? data.items.length > 0 && data.items.every(item => selectedIds.has(item._id)) : false;

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
      clearSelection();
    }
  }

  // Reset page and refetch when filters or sort change
  $: if (filterStatus || filterType || sortBy || sortOrder) {
    currentPage = 0;
    clearSelection();
    fetchQueue();
  }

  // Reset to page 0 when pageSize changes
  let previousPageSize = pageSize;
  $: if (pageSize !== previousPageSize) {
    previousPageSize = pageSize;
    currentPage = 0;
    clearSelection();
    fetchQueue();
  }

  // Refetch when page changes (but not on initial load — onMount handles that)
  function goToPage(page: number) {
    currentPage = page;
    clearSelection();
    fetchQueue();
  }
</script>

<div class="space-y-6 w-full px-4 mx-auto">
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
            on:click={() => filterType = 'recommendation'}
            class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors {filterType === 'recommendation' ? 'bg-[#4b9aaa] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            Recommendations
          </button>
          <button
            on:click={() => filterType = 'event'}
            class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors {filterType === 'event' ? 'bg-[#4b9aaa] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            Events
          </button>
          <button
            on:click={() => filterType = 'news'}
            class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors {filterType === 'news' ? 'bg-[#4b9aaa] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            News
          </button>
          <button
            on:click={() => filterType = 'marketplace'}
            class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors {filterType === 'marketplace' ? 'bg-[#4b9aaa] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            Marketplace
          </button>
          <button
            on:click={() => filterType = 'user_reported'}
            class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors {filterType === 'user_reported' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
          >
            User Reported
          </button>
        </div>
      </div>
      <div class="flex items-end gap-2">
        <!-- Column Visibility Toggle (history view only) -->
        {#if viewMode === 'history'}
          <div class="relative">
            <button
              on:click={() => showColumnMenu = !showColumnMenu}
              class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
              Columns
            </button>
            {#if showColumnMenu}
              <div class="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-2 min-w-[160px]">
                {#each ALL_COLUMNS as col}
                  <label class="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={!hiddenColumns.has(col.key)}
                      on:change={() => toggleColumnVisibility(col.key)}
                      class="rounded border-gray-300 text-[#4b9aaa] focus:ring-[#4b9aaa]"
                    />
                    {col.label}
                  </label>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
        <button on:click={fetchQueue} disabled={loading} class="px-4 py-2 bg-[#4b9aaa] text-white rounded-lg hover:bg-[#3a8999] disabled:opacity-50 flex items-center gap-2">
          <svg class="w-4 h-4 {loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    </div>
  </div>

  <!-- Bulk Action Bar (queue view only — history items are already reviewed) -->
  {#if selectedIds.size > 0 && viewMode === 'queue'}
    <div class="bg-[#814256]/10 border border-[#814256]/30 rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap">
      <span class="text-sm font-medium text-[#814256]">{selectedIds.size} selected</span>
      <button
        on:click={handleBulkApprove}
        disabled={bulkActionLoading}
        class="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
      >
        {bulkActionLoading ? '...' : '✓ Approve All'}
      </button>
      <button
        on:click={handleBulkReject}
        disabled={bulkActionLoading}
        class="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
      >
        {bulkActionLoading ? '...' : '✕ Reject All'}
      </button>
      <button
        on:click={clearSelection}
        class="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 font-medium"
      >
        Clear
      </button>
    </div>
  {/if}

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
    </div>
  {:else if viewMode === 'history'}
    <!-- History Table View -->
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              {#if !hiddenColumns.has('date')}
                <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:text-[#814256] select-none"
                    on:click={() => toggleSort('createdAt')}>
                  Date {sortBy === 'createdAt' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
              {/if}
              {#if !hiddenColumns.has('source')}
                <th class="px-4 py-3 text-left font-medium text-gray-700 min-w-[120px]">Source</th>
              {/if}
              {#if !hiddenColumns.has('type')}
                <th class="px-4 py-3 text-left font-medium text-gray-700">Type</th>
              {/if}
              {#if !hiddenColumns.has('content')}
                <th class="px-4 py-3 text-left font-medium text-gray-700">Content</th>
              {/if}
              {#if !hiddenColumns.has('author')}
                <th class="px-4 py-3 text-left font-medium text-gray-700">Author</th>
              {/if}
              {#if !hiddenColumns.has('flagged')}
                <th class="px-3 py-3 text-left font-medium text-gray-700 cursor-pointer hover:text-[#814256] select-none max-w-[140px]"
                    on:click={() => toggleSort('maxScore')}>
                  Flagged For {sortBy === 'maxScore' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
              {/if}
              {#if !hiddenColumns.has('decision')}
                <th class="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:text-[#814256] select-none"
                    on:click={() => toggleSort('reviewStatus')}>
                  Decision {sortBy === 'reviewStatus' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
              {/if}
              {#if !hiddenColumns.has('reason')}
                <th class="px-4 py-3 text-left font-medium text-gray-700">Reason/Warning</th>
              {/if}
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each data?.items ?? [] as item (item._id)}
              <tr class="hover:bg-gray-50">
                {#if !hiddenColumns.has('date')}
                  <td class="px-3 py-3 text-gray-500 text-xs">
                    <div class="whitespace-nowrap">{formatDate(item.createdAt)}</div>
                    {#if item.reviewedAt}
                      <div class="text-[10px] text-gray-400 whitespace-nowrap">Rev: {formatDate(item.reviewedAt)}</div>
                    {/if}
                  </td>
                {/if}
                {#if !hiddenColumns.has('source')}
                  <td class="px-4 py-3">
                    {#if item.source === 'user_report'}
                      <span class="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                        🚩 Report{item.reportCount && item.reportCount > 1 ? ` (${item.reportCount})` : ''}
                      </span>
                    {:else if item.contentType === 'news' && item.authorId === 'system'}
                      <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">🤖 AI Found</span>
                    {:else if item.contentType === 'news'}
                      <span class="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">👤 User News</span>
                    {:else}
                      <span class="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">🤖 AI</span>
                    {/if}
                  </td>
                {/if}
                {#if !hiddenColumns.has('type')}
                  <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">{item.contentType}</span>
                  </td>
                {/if}
                {#if !hiddenColumns.has('content')}
                  <td class="px-4 py-3 min-w-[150px] max-w-[250px]">
                    <div class="max-h-24 overflow-y-auto">
                      {#if item.title}
                        <p class="font-medium text-gray-900 break-words">{item.title}</p>
                      {/if}
                      {#if item.body}
                        <p class="text-gray-500 text-xs break-words whitespace-pre-wrap">{item.body}</p>
                      {/if}
                      {#if item.sourceUrl}
                        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs text-[#4b9aaa] hover:underline mt-1">
                          🔗 Source
                        </a>
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
                {/if}
                {#if !hiddenColumns.has('author')}
                  <td class="px-4 py-3">
                    <div class="text-gray-900">{item.authorName || 'Unknown'}</div>
                    <div class="text-xs text-gray-500">{item.authorEmail || ''}</div>
                  </td>
                {/if}
                {#if !hiddenColumns.has('flagged')}
                  <td class="px-3 py-3 max-w-[140px]">
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
                          <span class="px-1.5 py-0.5 text-xs rounded text-white {getCategoryColor(cat)}">{formatCategory(cat)}</span>
                        {/each}
                        {#if item.flaggedCategories.length > 2}
                          <span class="text-xs text-gray-500">+{item.flaggedCategories.length - 2}</span>
                        {/if}
                      </div>
                    {/if}
                  </td>
                {/if}
                {#if !hiddenColumns.has('decision')}
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
                {/if}
                {#if !hiddenColumns.has('reason')}
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
                {/if}
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
        <div class="bg-white rounded-lg shadow-md overflow-hidden {item.decision === 'urgent_review' ? 'ring-2 ring-red-500' : ''} {selectedIds.has(item._id) ? 'ring-2 ring-[#814256]' : ''}">
          <!-- Header -->
          <div class="bg-gray-50 px-4 py-3 border-b flex flex-wrap items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.has(item._id)}
              on:change={() => toggleSelectItem(item._id)}
              class="rounded border-gray-300 text-[#814256] focus:ring-[#814256] mr-1"
            />
            {#if item.source === 'user_report'}
              <span class="px-2 py-1 text-xs font-bold bg-orange-500 text-white rounded-full">
                🚩 User Report{item.reportCount && item.reportCount > 1 ? ` (${item.reportCount})` : ''}
              </span>
            {:else if item.decision === 'urgent_review'}
              <span class="px-2 py-1 text-xs font-bold bg-red-600 text-white rounded-full animate-pulse">URGENT</span>
            {:else if item.contentType === 'news' && item.authorId === 'system'}
              <span class="px-2 py-1 text-xs font-medium bg-[#4b9aaa] text-white rounded-full">🤖 AI Found</span>
            {:else if item.contentType === 'news'}
              <span class="px-2 py-1 text-xs font-medium bg-[#814256] text-white rounded-full">👤 User Submitted</span>
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
            {#if item.sourceUrl}
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 mt-2 text-sm text-[#4b9aaa] hover:underline">
                🔗 View original article
              </a>
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
            {:else if item.contentType === 'news' && item.scores?.relevance}
              <p class="text-sm text-gray-500 mb-2">AI Relevance:</p>
              <div class="flex flex-wrap gap-2 items-center">
                <span class="px-2 py-1 text-xs font-medium rounded-full text-white {item.scores.relevance >= 90 ? 'bg-green-600' : item.scores.relevance >= 80 ? 'bg-blue-600' : 'bg-[#4b9aaa]'}">
                  {item.highestCategory} — {item.scores.relevance}/100
                </span>
              </div>
            {:else}
              <p class="text-sm text-gray-500 mb-2">Flagged for:</p>
              <div class="flex flex-wrap gap-2">
                {#each item.flaggedCategories as cat}
                  <span class="px-2 py-1 text-xs font-medium rounded-full text-white {getCategoryColor(cat)}">
                    {formatCategory(cat)} ({((item.scores[cat] ?? 0) * 100).toFixed(0)}%)
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

  <!-- Pagination -->
  {#if data?.pagination && (data.pagination.total > pageSize || currentPage > 0)}
    <div class="flex flex-wrap justify-center items-center gap-4 mt-6">
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-500" for="page-size">Show</label>
        <select
          id="page-size"
          bind:value={pageSize}
          class="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#814256]"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <button
          on:click={() => goToPage(0)}
          disabled={currentPage === 0 || loading}
          class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          First
        </button>
        <button
          on:click={() => goToPage(currentPage - 1)}
          disabled={currentPage === 0 || loading}
          class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          ← Prev
        </button>
        <span class="text-sm text-gray-500">
          Page {currentPage + 1} of {totalPages} · {data.pagination.total} items
        </span>
        <button
          on:click={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages - 1 || loading}
          class="px-3 py-1.5 bg-[#4b9aaa] text-white rounded-lg hover:bg-[#3a8999] disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          Next →
        </button>
        <button
          on:click={() => goToPage(totalPages - 1)}
          disabled={currentPage >= totalPages - 1 || loading}
          class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          Last
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- Close column menu on outside click -->
<svelte:window on:click={(e) => {
  if (showColumnMenu && !(e.target as HTMLElement).closest('.relative')) {
    showColumnMenu = false;
  }
}} />

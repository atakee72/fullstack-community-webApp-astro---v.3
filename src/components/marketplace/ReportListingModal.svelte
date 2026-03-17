<script lang="ts">
  let { listingId, listingTitle, session, show = $bindable(false) } = $props<{
    listingId: string;
    listingTitle: string;
    session: any;
    show: boolean;
  }>();

  const REPORT_REASONS = [
    { value: 'spam', label: 'Spam or advertising' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'hate_speech', label: 'Hate speech' },
    { value: 'violence', label: 'Violence or threats' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'misinformation', label: 'Misinformation' },
    { value: 'other', label: 'Other' }
  ];

  let reason = $state('');
  let details = $state('');
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);
  let success = $state(false);

  function close() {
    show = false;
    // Reset state after animation
    setTimeout(() => {
      reason = '';
      details = '';
      error = null;
      success = false;
    }, 300);
  }

  async function handleSubmit() {
    if (!reason || details.length < 10) return;

    isSubmitting = true;
    error = null;

    try {
      const response = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: listingId,
          contentType: 'marketplace',
          reason,
          details
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.alreadyReported) {
          error = 'You have already reported this listing.';
        } else {
          throw new Error(data.error || 'Failed to submit report');
        }
        return;
      }

      success = true;
      setTimeout(close, 2000);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to submit report';
    } finally {
      isSubmitting = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    onkeydown={handleKeydown}
  >
    <!-- Backdrop -->
    <button
      class="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onclick={close}
      aria-label="Close"
    ></button>

    <!-- Modal -->
    <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
      <!-- Header -->
      <div class="bg-[#814256] px-6 py-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Report Listing</h3>
          <button onclick={close} aria-label="Close report dialog" class="text-white/80 hover:text-white transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div class="px-6 py-5 space-y-5">
        {#if success}
          <!-- Success State -->
          <div class="text-center py-4">
            <svg class="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-gray-700 font-medium">Thank you for reporting.</p>
            <p class="text-sm text-gray-500">Our team will review this listing.</p>
          </div>
        {:else}
          <!-- Content Preview -->
          <div class="bg-gray-50 rounded-lg p-3">
            <p class="text-xs text-gray-500 mb-1">Reporting:</p>
            <p class="text-sm text-gray-800 font-medium truncate">{listingTitle}</p>
          </div>

          <!-- Reason Selection -->
          <fieldset>
            <legend class="block text-sm font-medium text-gray-700 mb-2">
              Why are you reporting this? <span class="text-red-500">*</span>
            </legend>
            <div class="space-y-2">
              {#each REPORT_REASONS as opt}
                <label
                  class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                    {reason === opt.value
                      ? 'border-[#4b9aaa] bg-[#4b9aaa]/5'
                      : 'border-gray-200 hover:border-gray-300'}"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={opt.value}
                    checked={reason === opt.value}
                    onchange={() => reason = opt.value}
                    class="w-4 h-4 text-[#4b9aaa] focus:ring-[#4b9aaa]"
                  />
                  <span class="text-sm text-gray-700">{opt.label}</span>
                </label>
              {/each}
            </div>
          </fieldset>

          <!-- Details -->
          <div>
            <label for="report-details" class="block text-sm font-medium text-gray-700 mb-2">
              Please explain <span class="text-red-500">*</span>
            </label>
            <textarea
              id="report-details"
              bind:value={details}
              placeholder="Provide details about why you're reporting this listing (min 10 characters)..."
              rows="3"
              maxlength="500"
              class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4b9aaa] focus:border-transparent text-sm resize-none"
            ></textarea>
            <p class="text-xs text-gray-400 mt-1">{details.length}/500 characters (min 10)</p>
          </div>

          <!-- Error -->
          {#if error}
            <div class="bg-red-50 border border-red-200 rounded-lg p-3">
              <p class="text-sm text-red-700">{error}</p>
            </div>
          {/if}

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <button
              onclick={close}
              class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onclick={handleSubmit}
              disabled={!reason || details.length < 10 || isSubmitting}
              class="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

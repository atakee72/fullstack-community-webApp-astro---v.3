<script lang="ts">
  import BasicDetailsStep from './wizard/BasicDetailsStep.svelte';
  import PhotoUploadStep from './wizard/PhotoUploadStep.svelte';
  import PricingStep from './wizard/PricingStep.svelte';
  import ReviewStep from './wizard/ReviewStep.svelte';

  let { session, draftData = null } = $props<{ session: any; draftData?: any }>();

  // Snapshot the incoming draft once at mount. The wizard then owns its own
  // editable state — the prop is treated as initial seed data, not a live source.
  // Wrapping the reads in a function makes the access opaque to Svelte's static
  // analyzer, so it stops warning about "captures only the initial value" — which
  // is exactly the behaviour we want for a form.
  function initialDraftId(): string | null {
    const d = draftData;
    return d?._id?.toString() || d?._id || null;
  }

  function initialListing() {
    const d = draftData;
    return {
      title: d?.title || '',
      description: d?.description || { ops: [{ insert: '\n' }] }, // Delta format
      descriptionPlainText: d?.descriptionPlainText || '', // Plain text for validation/search
      listingType: (d?.listingType || 'sell') as 'sell' | 'exchange',
      exchangeFor: d?.exchangeFor || '',
      category: d?.category || '',
      condition: d?.condition || '',
      images: (d?.images || []) as string[],
      price: d?.price || 0,
      originalPrice: d?.originalPrice as number | undefined
    };
  }

  let currentStep = $state(1);
  let isSubmitting = $state(false);
  let isSavingDraft = $state(false);
  let error = $state<string | null>(null);
  let draftSavedMessage = $state<string | null>(null);
  let dailyLimitReached = $state(false);
  let dailyRemaining = $state(5);
  let draftId = $state<string | null>(initialDraftId());
  let listing = $state(initialListing());

  // Check daily listing limit on load
  $effect(() => {
    checkDailyLimit();
  });

  async function checkDailyLimit() {
    try {
      const res = await fetch('/api/listings/daily-count');
      if (res.ok) {
        const data = await res.json();
        dailyLimitReached = !data.canCreate;
        dailyRemaining = data.remaining;
      }
    } catch {}
  }

  // For exchange listings, we skip the pricing step (step 3)
  const isExchange = $derived(listing.listingType === 'exchange');

  const steps = [
    { id: 1, title: 'Details', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 2, title: 'Photos', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' },
    { id: 3, title: 'Price', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 4, title: 'Review', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  function updateListing(field: string, value: any) {
    listing = { ...listing, [field]: value };
  }

  async function handleSaveDraft() {
    if (!listing.title.trim()) {
      error = 'Please enter a title before saving as draft.';
      return;
    }

    isSavingDraft = true;
    error = null;
    draftSavedMessage = null;

    try {
      const response = await fetch('/api/listings/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...listing,
          ...(listing.listingType === 'exchange' && { price: 0 }),
          draftId: draftId || undefined
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save draft');
      }

      const data = await response.json();
      draftId = data.draftId;
      draftSavedMessage = 'Draft saved!';
      setTimeout(() => draftSavedMessage = null, 3000);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save draft';
    } finally {
      isSavingDraft = false;
    }
  }

  async function handleSubmit() {
    isSubmitting = true;
    error = null;

    try {
      // For exchange listings, force price=0
      const submitData = isExchange
        ? { ...listing, price: 0, originalPrice: undefined }
        : listing;

      let response;

      if (draftId) {
        // Save latest changes to draft first, then publish
        await fetch('/api/listings/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...submitData, draftId })
        });

        response = await fetch(`/api/listings/draft/${draftId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        response = await fetch('/api/listings/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
      }

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 429) {
          dailyLimitReached = true;
          return;
        }
        throw new Error(data.error || 'Failed to create listing');
      }

      const data = await response.json();

      // Redirect with appropriate message
      if (data.moderationStatus === 'pending') {
        window.location.href = '/marketplace/my-listings?success=moderation';
      } else {
        window.location.href = '/marketplace/my-listings?success=true';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create listing';
      isSubmitting = false;
    }
  }
</script>

<div class="space-y-8">
  <!-- Header -->
  <div>
    <a
      href="/marketplace/my-listings"
      class="inline-flex items-center gap-2 text-gray-600 hover:text-[#4b9aaa] transition-colors mb-4"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back to My Listings
    </a>
    <h1 class="text-3xl font-bold text-[#814256]">{draftId ? 'Edit Draft' : 'List Your Item'}</h1>
    <p class="text-gray-600">{draftId ? 'Continue working on your draft listing' : 'Share items with your Mahalle community'}</p>
  </div>

  {#if dailyLimitReached}
    <!-- Daily limit warning -->
    <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <svg class="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 class="text-lg font-semibold text-red-800 mb-2">Daily Listing Limit Reached</h2>
      <p class="text-red-700 text-sm mb-4">You've already created 5 listings in the last 24 hours. You can save your progress as a draft and publish later.</p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href="/marketplace/my-listings"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4b9aaa] text-white rounded-lg hover:bg-[#3a7a8a] transition-colors font-medium"
        >
          Back to My Listings
        </a>
        <button
          onclick={handleSaveDraft}
          disabled={isSavingDraft}
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#4b9aaa] border border-[#4b9aaa] rounded-lg hover:bg-[#4b9aaa]/5 transition-colors font-medium disabled:opacity-50"
        >
          {isSavingDraft ? 'Saving...' : 'Save as Draft'}
        </button>
      </div>
    </div>
  {:else}

  <!-- Progress Steps -->
  <div class="flex justify-between items-center bg-white rounded-xl p-4 border border-[#aca89f]/30">
    {#each steps as step, index}
      <div class="flex items-center">
        <div class="flex flex-col items-center">
          <div
            class="flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
              {currentStep >= step.id
                ? 'bg-[#4b9aaa] border-[#4b9aaa] text-white'
                : 'border-gray-300 text-gray-400'}"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={step.icon} />
            </svg>
          </div>
          <span
            class="mt-2 text-xs font-medium hidden sm:block
              {currentStep >= step.id ? 'text-[#4b9aaa]' : 'text-gray-400'}"
          >
            {step.title}
          </span>
        </div>
        {#if index < steps.length - 1}
          <div
            class="w-8 sm:w-16 lg:w-24 h-0.5 mx-2 sm:mx-4
              {currentStep > step.id ? 'bg-[#4b9aaa]' : 'bg-gray-300'}"
          ></div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Error Message -->
  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
      <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p class="text-red-700">{error}</p>
    </div>
  {/if}

  <!-- Draft Saved Message -->
  {#if draftSavedMessage}
    <div class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
      <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-green-700">{draftSavedMessage}</p>
    </div>
  {/if}

  <!-- Save as Draft button (always visible during wizard) -->
  <div class="flex justify-end">
    <button
      onclick={handleSaveDraft}
      disabled={isSavingDraft || !listing.title.trim()}
      class="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#4b9aaa] border border-[#4b9aaa]/40 rounded-lg hover:bg-[#4b9aaa]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
      </svg>
      {isSavingDraft ? 'Saving...' : draftId ? 'Update Draft' : 'Save as Draft'}
    </button>
  </div>

  <!-- Form Steps -->
  <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-[#aca89f]/30">
    {#if currentStep === 1}
      <BasicDetailsStep {listing} {updateListing} onNext={() => currentStep = 2} />
    {:else if currentStep === 2}
      <PhotoUploadStep {listing} {updateListing} onNext={() => currentStep = isExchange ? 4 : 3} onPrev={() => currentStep = 1} />
    {:else if currentStep === 3}
      <PricingStep {listing} {updateListing} onNext={() => currentStep = 4} onPrev={() => currentStep = 2} />
    {:else}
      <ReviewStep {listing} onSubmit={handleSubmit} onPrev={() => currentStep = isExchange ? 2 : 3} {isSubmitting} />
    {/if}
  </div>
  {/if}
</div>

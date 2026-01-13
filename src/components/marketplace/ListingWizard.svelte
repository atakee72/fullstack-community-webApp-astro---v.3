<script lang="ts">
  import BasicDetailsStep from './wizard/BasicDetailsStep.svelte';
  import PhotoUploadStep from './wizard/PhotoUploadStep.svelte';
  import PricingStep from './wizard/PricingStep.svelte';
  import ReviewStep from './wizard/ReviewStep.svelte';

  let { session } = $props<{ session: any }>();

  let currentStep = $state(1);
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  let listing = $state({
    title: '',
    description: '',
    category: '',
    condition: '',
    images: [] as string[],
    price: 0,
    originalPrice: undefined as number | undefined
  });

  const steps = [
    { id: 1, title: 'Details', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 2, title: 'Photos', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' },
    { id: 3, title: 'Price', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 4, title: 'Review', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  function updateListing(field: string, value: any) {
    listing = { ...listing, [field]: value };
  }

  async function handleSubmit() {
    isSubmitting = true;
    error = null;

    try {
      const response = await fetch('/api/listings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listing)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create listing');
      }

      // Redirect to dashboard on success
      window.location.href = '/marketplace/my-listings?success=true';
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
    <h1 class="text-3xl font-bold text-[#814256]">List Your Item</h1>
    <p class="text-gray-600">Share items with your Mahalle community</p>
  </div>

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
          />
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

  <!-- Form Steps -->
  <div class="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-[#aca89f]/30">
    {#if currentStep === 1}
      <BasicDetailsStep {listing} {updateListing} onNext={() => currentStep = 2} />
    {:else if currentStep === 2}
      <PhotoUploadStep {listing} {updateListing} onNext={() => currentStep = 3} onPrev={() => currentStep = 1} />
    {:else if currentStep === 3}
      <PricingStep {listing} {updateListing} onNext={() => currentStep = 4} onPrev={() => currentStep = 2} />
    {:else}
      <ReviewStep {listing} onSubmit={handleSubmit} onPrev={() => currentStep = 3} {isSubmitting} />
    {/if}
  </div>
</div>

<script lang="ts">
  import { LISTING_CATEGORIES, LISTING_CONDITIONS, type Delta } from '../../../types/listing';
  import { ListingStep1Schema } from '../../../schemas/listing.schema';
  import RichTextEditor from '../RichTextEditor.svelte';

  let { listing, updateListing, onNext } = $props<{
    listing: {
      title: string;
      description: Delta;
      descriptionPlainText: string;
      listingType: string;
      exchangeFor: string;
      category: string;
      condition: string;
    };
    updateListing: (field: string, value: any) => void;
    onNext: () => void;
  }>();

  let errors = $state<Record<string, string[]>>({});
  let touched = $state<Record<string, boolean>>({});

  // Validate single field on blur
  function validateField(field: string) {
    touched[field] = true;
    // Use descriptionPlainText for validation
    const validationData = {
      title: listing.title,
      description: listing.descriptionPlainText,
      category: listing.category,
      condition: listing.condition
    };
    const result = ListingStep1Schema.safeParse(validationData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      errors = Object.fromEntries(
        Object.entries(fieldErrors).map(([k, v]) => [k, v || []])
      );
    } else {
      errors = {};
    }
  }

  // Validate all fields on submit
  function validate(): boolean {
    // Use descriptionPlainText for validation
    const validationData = {
      title: listing.title,
      description: listing.descriptionPlainText,
      category: listing.category,
      condition: listing.condition
    };
    const result = ListingStep1Schema.safeParse(validationData);
    if (!result.success) {
      errors = Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v || []])
      );
      // Mark all as touched to show errors
      touched = { title: true, description: true, category: true, condition: true };
      return false;
    }
    errors = {};
    return true;
  }

  // Handle rich text editor changes
  function handleDescriptionChange(delta: Delta, plainText: string) {
    updateListing('description', delta);
    updateListing('descriptionPlainText', plainText);
  }

  function handleNext() {
    if (validate()) {
      onNext();
    }
  }

  // Helper to get first error for a field
  const getError = (field: string) => touched[field] && errors[field]?.[0];
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-bold text-[#814256] mb-2">Basic Details</h2>
    <p class="text-white/70">Tell us about your item</p>
  </div>

  <!-- Listing Type Toggle -->
  <div>
    <div id="listing-type-label" class="block text-sm font-medium text-white/80 mb-3">
      What would you like to do? <span class="text-red-500">*</span>
    </div>
    <div role="group" aria-labelledby="listing-type-label" class="grid grid-cols-2 gap-3">
      <button
        type="button"
        onclick={() => updateListing('listingType', 'sell')}
        class="flex items-center gap-3 p-4 rounded-xl border-2 transition-all
          {listing.listingType === 'sell' || !listing.listingType
            ? 'border-[#E79750] bg-[#E79750]/5'
            : 'border-white/15 hover:border-[#E79750]/50'}"
      >
        <svg class="w-6 h-6 {listing.listingType === 'sell' || !listing.listingType ? 'text-[#E79750]' : 'text-white/50'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-left">
          <span class="font-medium text-[#e8e6e1]">Sell</span>
          <p class="text-xs text-white/60">Set a price for your item</p>
        </div>
      </button>
      <button
        type="button"
        onclick={() => updateListing('listingType', 'exchange')}
        class="flex items-center gap-3 p-4 rounded-xl border-2 transition-all
          {listing.listingType === 'exchange'
            ? 'border-[#E79750] bg-[#E79750]/5'
            : 'border-white/15 hover:border-[#E79750]/50'}"
      >
        <svg class="w-6 h-6 {listing.listingType === 'exchange' ? 'text-[#E79750]' : 'text-white/50'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <div class="text-left">
          <span class="font-medium text-[#e8e6e1]">Exchange</span>
          <p class="text-xs text-white/60">Swap / Tausch — no price</p>
        </div>
      </button>
    </div>

    <!-- Exchange For (only shown when exchange is selected) -->
    {#if listing.listingType === 'exchange'}
      <div class="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
        <label for="exchangeFor" class="block text-sm font-medium text-purple-700 mb-2">
          What would you like in exchange?
        </label>
        <input
          id="exchangeFor"
          type="text"
          value={listing.exchangeFor}
          oninput={(e) => updateListing('exchangeFor', (e.target as HTMLInputElement).value)}
          placeholder="e.g., A bookshelf, kitchen appliances, or make an offer"
          maxlength="150"
          class="w-full px-4 py-2.5 rounded-lg border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm"
        />
        <p class="text-xs text-purple-500 mt-1">Optional — leave blank if you're open to any offers</p>
      </div>
    {/if}
  </div>

  <!-- Title -->
  <div>
    <label for="title" class="block text-sm font-medium text-white/80 mb-2">
      Item Title <span class="text-red-500">*</span>
    </label>
    <input
      id="title"
      type="text"
      value={listing.title}
      oninput={(e) => updateListing('title', (e.target as HTMLInputElement).value)}
      onblur={() => validateField('title')}
      placeholder="e.g., Vintage Oak Coffee Table"
      class="w-full px-4 py-3 rounded-xl border transition-colors
        {getError('title') ? 'border-red-500 focus:ring-red-500' : 'border-white/15 focus:ring-[#E79750]'}
        focus:outline-none focus:ring-2 focus:border-transparent"
    />
    {#if getError('title')}
      <p class="text-red-500 text-sm mt-1">{getError('title')}</p>
    {/if}
    <p class="text-xs text-white/50 mt-1">{listing.title?.length || 0}/100 characters (min 5)</p>
  </div>

  <!-- Category -->
  <div>
    <label for="category" class="block text-sm font-medium text-white/80 mb-2">
      Category <span class="text-red-500">*</span>
    </label>
    <select
      id="category"
      value={listing.category}
      onchange={(e) => { updateListing('category', (e.target as HTMLSelectElement).value); validateField('category'); }}
      class="w-full px-4 py-3 rounded-xl border transition-colors
        {getError('category') ? 'border-red-500 focus:ring-red-500' : 'border-white/15 focus:ring-[#E79750]'}
        focus:outline-none focus:ring-2 focus:border-transparent"
    >
      <option value="">Select a category</option>
      {#each LISTING_CATEGORIES as cat}
        <option value={cat.value}>{cat.label}</option>
      {/each}
    </select>
    {#if getError('category')}
      <p class="text-red-500 text-sm mt-1">{getError('category')}</p>
    {/if}
  </div>

  <!-- Condition -->
  <div>
    <label for="condition" class="block text-sm font-medium text-white/80 mb-3">
      Condition <span class="text-red-500">*</span>
    </label>
    <div class="space-y-2">
      {#each LISTING_CONDITIONS as cond}
        <label
          class="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
            {listing.condition === cond.value
              ? 'border-[#E79750] bg-[#E79750]/5'
              : getError('condition') ? 'border-red-300' : 'border-white/15 hover:border-[#E79750]/50'}"
        >
          <input
            type="radio"
            name="condition"
            value={cond.value}
            checked={listing.condition === cond.value}
            onchange={() => { updateListing('condition', cond.value); validateField('condition'); }}
            class="mt-1 w-4 h-4 text-[#E79750] focus:ring-[#E79750]"
          />
          <div>
            <span class="font-medium text-[#e8e6e1]">{cond.label}</span>
            <p class="text-sm text-white/60">{cond.description}</p>
          </div>
        </label>
      {/each}
    </div>
    {#if getError('condition')}
      <p class="text-red-500 text-sm mt-1">{getError('condition')}</p>
    {/if}
  </div>

  <!-- Description -->
  <div>
    <label for="description" class="block text-sm font-medium text-white/80 mb-2">
      Description <span class="text-red-500">*</span>
    </label>
    <RichTextEditor
      value={listing.description}
      onChange={handleDescriptionChange}
      placeholder="Describe your item in detail. Include brand, size, material, any flaws, etc."
      maxLength={2000}
      minLength={20}
    />
    {#if getError('description')}
      <p class="text-red-500 text-sm mt-1">{getError('description')}</p>
    {/if}
  </div>

  <!-- Next Button -->
  <div class="flex justify-end pt-4">
    <button
      onclick={handleNext}
      class="bg-[#E79750] text-white px-8 py-3 rounded-xl hover:bg-[#f0a85a] transition-colors font-medium flex items-center gap-2"
    >
      Next: Add Photos
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</div>

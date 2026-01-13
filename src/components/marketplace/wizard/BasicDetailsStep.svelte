<script lang="ts">
  import { LISTING_CATEGORIES, LISTING_CONDITIONS } from '../../../types/listing';
  import { ListingStep1Schema } from '../../../schemas/listing.schema';

  let { listing, updateListing, onNext } = $props<{
    listing: {
      title: string;
      description: string;
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
    const result = ListingStep1Schema.safeParse(listing);
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
    const result = ListingStep1Schema.safeParse(listing);
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
    <p class="text-gray-600">Tell us about your item</p>
  </div>

  <!-- Title -->
  <div>
    <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
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
        {getError('title') ? 'border-red-500 focus:ring-red-500' : 'border-[#aca89f]/30 focus:ring-[#4b9aaa]'}
        focus:outline-none focus:ring-2 focus:border-transparent"
    />
    {#if getError('title')}
      <p class="text-red-500 text-sm mt-1">{getError('title')}</p>
    {/if}
    <p class="text-xs text-gray-400 mt-1">{listing.title?.length || 0}/100 characters (min 5)</p>
  </div>

  <!-- Category -->
  <div>
    <label for="category" class="block text-sm font-medium text-gray-700 mb-2">
      Category <span class="text-red-500">*</span>
    </label>
    <select
      id="category"
      value={listing.category}
      onchange={(e) => { updateListing('category', (e.target as HTMLSelectElement).value); validateField('category'); }}
      class="w-full px-4 py-3 rounded-xl border transition-colors
        {getError('category') ? 'border-red-500 focus:ring-red-500' : 'border-[#aca89f]/30 focus:ring-[#4b9aaa]'}
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
    <label for="condition" class="block text-sm font-medium text-gray-700 mb-3">
      Condition <span class="text-red-500">*</span>
    </label>
    <div class="space-y-2">
      {#each LISTING_CONDITIONS as cond}
        <label
          class="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
            {listing.condition === cond.value
              ? 'border-[#4b9aaa] bg-[#4b9aaa]/5'
              : getError('condition') ? 'border-red-300' : 'border-[#aca89f]/30 hover:border-[#4b9aaa]/50'}"
        >
          <input
            type="radio"
            name="condition"
            value={cond.value}
            checked={listing.condition === cond.value}
            onchange={() => { updateListing('condition', cond.value); validateField('condition'); }}
            class="mt-1 w-4 h-4 text-[#4b9aaa] focus:ring-[#4b9aaa]"
          />
          <div>
            <span class="font-medium text-gray-800">{cond.label}</span>
            <p class="text-sm text-gray-500">{cond.description}</p>
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
    <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
      Description <span class="text-red-500">*</span>
    </label>
    <textarea
      id="description"
      value={listing.description}
      oninput={(e) => updateListing('description', (e.target as HTMLTextAreaElement).value)}
      onblur={() => validateField('description')}
      placeholder="Describe your item in detail. Include brand, size, material, any flaws, etc."
      rows={5}
      class="w-full px-4 py-3 rounded-xl border transition-colors
        {getError('description') ? 'border-red-500 focus:ring-red-500' : 'border-[#aca89f]/30 focus:ring-[#4b9aaa]'}
        focus:outline-none focus:ring-2 focus:border-transparent resize-none"
    ></textarea>
    <p class="text-xs text-gray-400 mt-1">{listing.description?.length || 0}/2000 characters (min 20)</p>
    {#if getError('description')}
      <p class="text-red-500 text-sm mt-1">{getError('description')}</p>
    {/if}
  </div>

  <!-- Next Button -->
  <div class="flex justify-end pt-4">
    <button
      onclick={handleNext}
      class="bg-[#4b9aaa] text-white px-8 py-3 rounded-xl hover:bg-[#3a7a8a] transition-colors font-medium flex items-center gap-2"
    >
      Next: Add Photos
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</div>

<script lang="ts">
  import type { ListingCategory, ListingCondition } from '../../../types/listing';
  import { LISTING_CATEGORIES, LISTING_CONDITIONS } from '../../../types/listing';

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

  let errors = $state<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!listing.title || listing.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }
    if (!listing.category) {
      newErrors.category = 'Please select a category';
    }
    if (!listing.condition) {
      newErrors.condition = 'Please select a condition';
    }
    if (!listing.description || listing.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validate()) {
      onNext();
    }
  }
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
      placeholder="e.g., Vintage Oak Coffee Table"
      class="w-full px-4 py-3 rounded-xl border border-[#aca89f]/30 focus:outline-none focus:ring-2 focus:ring-[#4b9aaa] focus:border-transparent"
    />
    {#if errors.title}
      <p class="text-red-500 text-sm mt-1">{errors.title}</p>
    {/if}
  </div>

  <!-- Category -->
  <div>
    <label for="category" class="block text-sm font-medium text-gray-700 mb-2">
      Category <span class="text-red-500">*</span>
    </label>
    <select
      id="category"
      value={listing.category}
      onchange={(e) => updateListing('category', (e.target as HTMLSelectElement).value)}
      class="w-full px-4 py-3 rounded-xl border border-[#aca89f]/30 focus:outline-none focus:ring-2 focus:ring-[#4b9aaa] focus:border-transparent"
    >
      <option value="">Select a category</option>
      {#each LISTING_CATEGORIES as cat}
        <option value={cat.value}>{cat.label}</option>
      {/each}
    </select>
    {#if errors.category}
      <p class="text-red-500 text-sm mt-1">{errors.category}</p>
    {/if}
  </div>

  <!-- Condition -->
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-3">
      Condition <span class="text-red-500">*</span>
    </label>
    <div class="space-y-2">
      {#each LISTING_CONDITIONS as cond}
        <label
          class="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
            {listing.condition === cond.value
              ? 'border-[#4b9aaa] bg-[#4b9aaa]/5'
              : 'border-[#aca89f]/30 hover:border-[#4b9aaa]/50'}"
        >
          <input
            type="radio"
            name="condition"
            value={cond.value}
            checked={listing.condition === cond.value}
            onchange={() => updateListing('condition', cond.value)}
            class="mt-1 w-4 h-4 text-[#4b9aaa] focus:ring-[#4b9aaa]"
          />
          <div>
            <span class="font-medium text-gray-800">{cond.label}</span>
            <p class="text-sm text-gray-500">{cond.description}</p>
          </div>
        </label>
      {/each}
    </div>
    {#if errors.condition}
      <p class="text-red-500 text-sm mt-1">{errors.condition}</p>
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
      placeholder="Describe your item in detail. Include brand, size, material, any flaws, etc."
      rows={5}
      class="w-full px-4 py-3 rounded-xl border border-[#aca89f]/30 focus:outline-none focus:ring-2 focus:ring-[#4b9aaa] focus:border-transparent resize-none"
    ></textarea>
    <p class="text-sm text-gray-500 mt-1">{listing.description?.length || 0}/2000 characters</p>
    {#if errors.description}
      <p class="text-red-500 text-sm mt-1">{errors.description}</p>
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

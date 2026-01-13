<script lang="ts">
  let { listing, updateListing, onNext, onPrev } = $props<{
    listing: {
      price: number;
      originalPrice?: number;
    };
    updateListing: (field: string, value: any) => void;
    onNext: () => void;
    onPrev: () => void;
  }>();

  let errors = $state<Record<string, string>>({});

  const discount = $derived(
    listing.originalPrice && listing.originalPrice > listing.price
      ? Math.round(((listing.originalPrice - listing.price) / listing.originalPrice) * 100)
      : 0
  );

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!listing.price || listing.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (listing.originalPrice && listing.originalPrice < listing.price) {
      newErrors.originalPrice = 'Original price should be higher than selling price';
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validate()) {
      onNext();
    }
  }

  function handlePriceInput(e: Event) {
    const value = parseFloat((e.target as HTMLInputElement).value) || 0;
    updateListing('price', value);
  }

  function handleOriginalPriceInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    updateListing('originalPrice', value ? parseFloat(value) : undefined);
  }
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-bold text-[#814256] mb-2">Set Your Price</h2>
    <p class="text-gray-600">Price your item competitively to attract buyers</p>
  </div>

  <!-- Selling Price -->
  <div>
    <label for="price" class="block text-sm font-medium text-gray-700 mb-2">
      Selling Price <span class="text-red-500">*</span>
    </label>
    <div class="relative">
      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
      <input
        id="price"
        type="number"
        step="0.01"
        min="0"
        value={listing.price || ''}
        oninput={handlePriceInput}
        placeholder="0.00"
        class="w-full pl-10 pr-4 py-3 rounded-xl border border-[#aca89f]/30 focus:outline-none focus:ring-2 focus:ring-[#4b9aaa] focus:border-transparent text-lg"
      />
    </div>
    {#if errors.price}
      <p class="text-red-500 text-sm mt-1">{errors.price}</p>
    {/if}
  </div>

  <!-- Original Price -->
  <div>
    <label for="originalPrice" class="block text-sm font-medium text-gray-700 mb-2">
      Original Retail Price <span class="text-gray-400">(optional)</span>
    </label>
    <div class="relative">
      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
      <input
        id="originalPrice"
        type="number"
        step="0.01"
        min="0"
        value={listing.originalPrice || ''}
        oninput={handleOriginalPriceInput}
        placeholder="0.00"
        class="w-full pl-10 pr-4 py-3 rounded-xl border border-[#aca89f]/30 focus:outline-none focus:ring-2 focus:ring-[#4b9aaa] focus:border-transparent"
      />
    </div>
    <p class="text-sm text-gray-500 mt-1">Showing the original price helps buyers see the value</p>
    {#if errors.originalPrice}
      <p class="text-red-500 text-sm mt-1">{errors.originalPrice}</p>
    {/if}
  </div>

  <!-- Discount Preview -->
  {#if discount > 0}
    <div class="bg-green-50 border border-green-200 rounded-xl p-4">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-green-700 font-medium">Great deal! {discount}% off original price</span>
      </div>
    </div>
  {/if}

  <!-- Pricing Tips -->
  <div class="bg-[#eccc6e]/20 rounded-xl p-4">
    <h4 class="font-medium text-[#814256] mb-2">Pricing Tips</h4>
    <ul class="text-sm text-gray-600 space-y-1">
      <li>• Check similar listings to price competitively</li>
      <li>• Consider the item's condition when pricing</li>
      <li>• Leave room for negotiation if you're open to it</li>
    </ul>
  </div>

  <!-- Navigation Buttons -->
  <div class="flex justify-between pt-4">
    <button
      onclick={onPrev}
      class="text-gray-600 px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors font-medium flex items-center gap-2"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
    <button
      onclick={handleNext}
      class="bg-[#4b9aaa] text-white px-8 py-3 rounded-xl hover:bg-[#3a7a8a] transition-colors font-medium flex items-center gap-2"
    >
      Review Listing
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</div>

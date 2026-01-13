<script lang="ts">
  import type { ListingFilters, ListingCategory, ListingCondition } from '../../types/listing';
  import { LISTING_CATEGORIES, LISTING_CONDITIONS } from '../../types/listing';

  let { filters, onChange } = $props<{
    filters: ListingFilters;
    onChange: (filters: Partial<ListingFilters>) => void;
  }>();

  const priceRanges = [
    { value: 'all', label: 'All Prices' },
    { value: '0-25', label: 'Under $25' },
    { value: '25-50', label: '$25 - $50' },
    { value: '50-100', label: '$50 - $100' },
    { value: '100-250', label: '$100 - $250' },
    { value: '250+', label: '$250+' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' }
  ];

  let selectedPriceRange = $state('all');

  function handleCategoryChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as ListingCategory | 'all';
    onChange({ category: value });
  }

  function handleConditionChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as ListingCondition | 'all';
    onChange({ condition: value });
  }

  function handlePriceChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    selectedPriceRange = value;

    if (value === 'all') {
      onChange({ priceMin: undefined, priceMax: undefined });
    } else if (value === '250+') {
      onChange({ priceMin: 250, priceMax: undefined });
    } else {
      const [min, max] = value.split('-').map(Number);
      onChange({ priceMin: min, priceMax: max });
    }
  }

  function handleSortChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as ListingFilters['sortBy'];
    onChange({ sortBy: value });
  }

  function clearAllFilters() {
    selectedPriceRange = 'all';
    onChange({
      category: 'all',
      condition: 'all',
      priceMin: undefined,
      priceMax: undefined,
      search: '',
      sortBy: 'newest'
    });
  }

  const hasActiveFilters = $derived(
    (filters.category && filters.category !== 'all') ||
    (filters.condition && filters.condition !== 'all') ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined ||
    filters.search
  );
</script>

<div class="flex flex-wrap items-center gap-3 py-4">
  <!-- Category Filter -->
  <select
    value={filters.category || 'all'}
    onchange={handleCategoryChange}
    class="px-4 py-2 rounded-lg border border-[#aca89f]/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4b9aaa]"
  >
    <option value="all">All Categories</option>
    {#each LISTING_CATEGORIES as cat}
      <option value={cat.value}>{cat.label}</option>
    {/each}
  </select>

  <!-- Condition Filter -->
  <select
    value={filters.condition || 'all'}
    onchange={handleConditionChange}
    class="px-4 py-2 rounded-lg border border-[#aca89f]/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4b9aaa]"
  >
    <option value="all">All Conditions</option>
    {#each LISTING_CONDITIONS as cond}
      <option value={cond.value}>{cond.label}</option>
    {/each}
  </select>

  <!-- Price Filter -->
  <select
    value={selectedPriceRange}
    onchange={handlePriceChange}
    class="px-4 py-2 rounded-lg border border-[#aca89f]/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4b9aaa]"
  >
    {#each priceRanges as range}
      <option value={range.value}>{range.label}</option>
    {/each}
  </select>

  <!-- Sort -->
  <select
    value={filters.sortBy || 'newest'}
    onchange={handleSortChange}
    class="px-4 py-2 rounded-lg border border-[#aca89f]/30 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4b9aaa]"
  >
    {#each sortOptions as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>

  <!-- Clear Filters -->
  {#if hasActiveFilters}
    <button
      onclick={clearAllFilters}
      class="px-4 py-2 text-sm text-[#814256] hover:text-[#4b9aaa] underline transition-colors"
    >
      Clear all
    </button>
  {/if}
</div>

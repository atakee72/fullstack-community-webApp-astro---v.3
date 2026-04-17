<script lang="ts">
  import type { ListingFilters, ListingCategory, ListingCondition, ListingType } from '../../types/listing';
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

  function handleTypeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as ListingType | 'all';
    onChange({ listingType: value });
  }

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
      listingType: 'all',
      priceMin: undefined,
      priceMax: undefined,
      search: '',
      sortBy: 'newest'
    });
  }

  const isExchangeFilter = $derived(filters.listingType === 'exchange');

  const hasActiveFilters = $derived(
    (filters.category && filters.category !== 'all') ||
    (filters.condition && filters.condition !== 'all') ||
    (filters.listingType && filters.listingType !== 'all') ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined ||
    filters.search
  );
</script>

<div class="flex flex-wrap items-center gap-3 py-4">
  <!-- Type Filter -->
  <select
    value={filters.listingType || 'all'}
    onchange={handleTypeChange}
    class="appearance-none pl-4 pr-10 py-2 rounded-lg border border-white/15 bg-white/[0.08] backdrop-blur-sm text-[#e8e6e1] text-sm focus:outline-none focus:ring-2 focus:ring-[#E79750]/50 bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%221.5%22%20stroke%3D%22%23ffffff99%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%20%2F%3E%3C%2Fsvg%3E')]"
  >
    <option value="all">All Types</option>
    <option value="sell">Buy</option>
    <option value="exchange">Exchange</option>
  </select>

  <!-- Category Filter -->
  <select
    value={filters.category || 'all'}
    onchange={handleCategoryChange}
    class="appearance-none pl-4 pr-10 py-2 rounded-lg border border-white/15 bg-white/[0.08] backdrop-blur-sm text-[#e8e6e1] text-sm focus:outline-none focus:ring-2 focus:ring-[#E79750]/50 bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%221.5%22%20stroke%3D%22%23ffffff99%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%20%2F%3E%3C%2Fsvg%3E')]"
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
    class="appearance-none pl-4 pr-10 py-2 rounded-lg border border-white/15 bg-white/[0.08] backdrop-blur-sm text-[#e8e6e1] text-sm focus:outline-none focus:ring-2 focus:ring-[#E79750]/50 bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%221.5%22%20stroke%3D%22%23ffffff99%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%20%2F%3E%3C%2Fsvg%3E')]"
  >
    <option value="all">All Conditions</option>
    {#each LISTING_CONDITIONS as cond}
      <option value={cond.value}>{cond.label}</option>
    {/each}
  </select>

  <!-- Price Filter (hidden for exchange) -->
  {#if !isExchangeFilter}
    <select
      value={selectedPriceRange}
      onchange={handlePriceChange}
      class="appearance-none pl-4 pr-10 py-2 rounded-lg border border-white/15 bg-white/[0.08] backdrop-blur-sm text-[#e8e6e1] text-sm focus:outline-none focus:ring-2 focus:ring-[#E79750]/50 bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%221.5%22%20stroke%3D%22%23ffffff99%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%20%2F%3E%3C%2Fsvg%3E')]"
    >
      {#each priceRanges as range}
        <option value={range.value}>{range.label}</option>
      {/each}
    </select>
  {/if}

  <!-- Sort -->
  <select
    value={filters.sortBy || 'newest'}
    onchange={handleSortChange}
    class="appearance-none pl-4 pr-10 py-2 rounded-lg border border-white/15 bg-white/[0.08] backdrop-blur-sm text-[#e8e6e1] text-sm focus:outline-none focus:ring-2 focus:ring-[#E79750]/50 bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke-width%3D%221.5%22%20stroke%3D%22%23ffffff99%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%20%2F%3E%3C%2Fsvg%3E')]"
  >
    {#each sortOptions as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>

  <!-- Clear Filters -->
  {#if hasActiveFilters}
    <button
      onclick={clearAllFilters}
      class="px-4 py-2 text-sm text-[#814256] hover:text-[#E79750] underline transition-colors"
    >
      Clear all
    </button>
  {/if}
</div>

<script lang="ts">
  import type { ListingStats } from '../../../types/listing';

  let { stats } = $props<{ stats: ListingStats }>();

  const cards = $derived([
    {
      label: 'Total Listings',
      value: stats.totalListings,
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'Active Listings',
      value: stats.activeListings,
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      color: 'bg-green-50 text-green-600'
    },
    {
      label: 'Items Sold',
      value: stats.soldItems,
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'bg-purple-50 text-purple-600'
    },
    {
      label: 'Total Earnings',
      value: `$${stats.totalEarnings.toFixed(2)}`,
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'bg-orange-50 text-orange-600'
    }
  ]);
</script>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {#each cards as card}
    <div class="bg-white rounded-xl border border-[#aca89f]/30 p-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg {card.color}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={card.icon} />
          </svg>
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-800">{card.value}</p>
          <p class="text-sm text-gray-500">{card.label}</p>
        </div>
      </div>
    </div>
  {/each}
</div>

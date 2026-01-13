<script lang="ts">
  import type { Listing } from '../../../types/listing';
  import { CONDITION_COLORS, STATUS_COLORS } from '../../../types/listing';

  let { listings, onStatusChange, onDelete } = $props<{
    listings: Listing[];
    onStatusChange: (id: string, status: 'available' | 'reserved' | 'sold') => void;
    onDelete: (id: string) => void;
  }>();

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getConditionLabel(condition: string) {
    return condition.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function getStatusLabel(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
</script>

<div class="bg-white rounded-xl border border-[#aca89f]/30 overflow-hidden">
  <!-- Mobile View -->
  <div class="md:hidden divide-y divide-[#aca89f]/20">
    {#each listings as listing}
      <div class="p-4">
        <div class="flex gap-4">
          <div class="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
            {#if listing.images && listing.images.length > 0}
              <img src={listing.images[0]} alt={listing.title} class="w-full h-full object-cover" />
            {:else}
              <div class="w-full h-full bg-gray-100 flex items-center justify-center">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            {/if}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-gray-800 truncate">{listing.title}</h3>
            <p class="text-lg font-bold text-[#814256]">${listing.price.toFixed(2)}</p>
            <div class="flex flex-wrap gap-1 mt-1">
              <span class="text-xs px-2 py-0.5 rounded-full {STATUS_COLORS[listing.status]}">
                {getStatusLabel(listing.status)}
              </span>
              <span class="text-xs px-2 py-0.5 rounded-full {CONDITION_COLORS[listing.condition]}">
                {getConditionLabel(listing.condition)}
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-[#aca89f]/20">
          <span class="text-xs text-gray-500">{formatDate(listing.createdAt)}</span>
          <div class="flex gap-2">
            <a href="/marketplace/{listing._id}" class="text-[#4b9aaa] text-sm hover:underline">View</a>
            <button onclick={() => onDelete(listing._id as string)} class="text-red-600 text-sm hover:underline">Delete</button>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Desktop View -->
  <table class="w-full hidden md:table">
    <thead class="bg-[#aca89f]/10">
      <tr>
        <th class="text-left py-3 px-4 text-sm font-medium text-gray-600">Item</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-gray-600">Condition</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-gray-600">Price</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-gray-600">Listed</th>
        <th class="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-[#aca89f]/20">
      {#each listings as listing}
        <tr class="hover:bg-[#aca89f]/5">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                {#if listing.images && listing.images.length > 0}
                  <img src={listing.images[0]} alt={listing.title} class="w-full h-full object-cover" />
                {:else}
                  <div class="w-full h-full bg-gray-100"></div>
                {/if}
              </div>
              <span class="font-medium text-gray-800 truncate max-w-[200px]">{listing.title}</span>
            </div>
          </td>
          <td class="py-3 px-4">
            <select
              value={listing.status}
              onchange={(e) => onStatusChange(listing._id as string, (e.target as HTMLSelectElement).value as 'available' | 'reserved' | 'sold')}
              class="text-xs px-2 py-1 rounded-full border-0 cursor-pointer {STATUS_COLORS[listing.status]}"
            >
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
            </select>
          </td>
          <td class="py-3 px-4">
            <span class="text-xs px-2 py-1 rounded-full {CONDITION_COLORS[listing.condition]}">
              {getConditionLabel(listing.condition)}
            </span>
          </td>
          <td class="py-3 px-4 font-medium text-[#814256]">${listing.price.toFixed(2)}</td>
          <td class="py-3 px-4 text-sm text-gray-500">{formatDate(listing.createdAt)}</td>
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end gap-3">
              <a href="/marketplace/{listing._id}" class="text-[#4b9aaa] hover:underline text-sm">View</a>
              <button onclick={() => onDelete(listing._id as string)} class="text-red-600 hover:underline text-sm">Delete</button>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

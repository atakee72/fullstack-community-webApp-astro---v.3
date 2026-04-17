<script lang="ts">
  let { onSearch, placeholder = 'Search listings...' } = $props<{
    onSearch: (query: string) => void;
    placeholder?: string;
  }>();

  let query = $state('');

  function handleSubmit(e: Event) {
    e.preventDefault();
    onSearch(query);
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    query = target.value;
  }
</script>

<form onsubmit={handleSubmit} class="relative w-full">
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
      <svg class="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <input
      type="text"
      value={query}
      oninput={handleInput}
      {placeholder}
      class="w-full pl-12 pr-12 py-3 bg-white/[0.06] backdrop-blur-xl border border-white/[0.15] border-t-white/30 border-l-white/25 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] focus:ring-2 focus:ring-[#E79750]/50 focus:border-[#E79750]/50 text-[#e8e6e1] placeholder-white/40"
    />
    {#if query}
      <button
        type="button"
        aria-label="Clear search"
        onclick={() => { query = ''; onSearch(''); }}
        class="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>
</form>

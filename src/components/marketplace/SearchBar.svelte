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

<form onsubmit={handleSubmit} class="relative w-full max-w-2xl mx-auto">
  <div class="relative">
    <svg
      class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      type="text"
      value={query}
      oninput={handleInput}
      {placeholder}
      class="w-full pl-12 pr-4 py-3 rounded-full border border-white/20 border-t-white/30 bg-white/[0.08] backdrop-blur-xl text-[#e8e6e1] placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#E79750]/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
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

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
      class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
      class="w-full pl-12 pr-4 py-3 rounded-full border border-[#aca89f]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#4b9aaa] focus:border-transparent shadow-sm"
    />
    {#if query}
      <button
        type="button"
        onclick={() => { query = ''; onSearch(''); }}
        class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>
</form>

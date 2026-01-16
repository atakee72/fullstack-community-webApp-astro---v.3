<script lang="ts">
  interface BlogPost {
    id: string;
    title: string;
    description: string;
    pubDate: string;
    author: string;
    tags: string[];
    cover?: string;
    coverAlt?: string;
  }

  interface Props {
    posts: BlogPost[];
  }

  let { posts }: Props = $props();

  let searchQuery = $state('');

  const filteredPosts = $derived(
    searchQuery.trim() === ''
      ? posts
      : posts.filter(post => {
          const query = searchQuery.toLowerCase();
          return (
            post.title.toLowerCase().includes(query) ||
            post.description.toLowerCase().includes(query) ||
            post.tags?.some(tag => tag.toLowerCase().includes(query))
          );
        })
  );

  function clearSearch() {
    searchQuery = '';
  }
</script>

<div class="mb-8">
  <!-- Search input -->
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Search posts by title, description, or tag..."
      class="w-full pl-12 pr-12 py-3 bg-white rounded-xl shadow-lg border-0 focus:ring-2 focus:ring-[#4b9aaa] text-gray-900 placeholder-gray-400"
    />
    {#if searchQuery}
      <button
        onclick={clearSearch}
        class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>

  <!-- Results count -->
  {#if searchQuery}
    <p class="mt-3 text-white/80 text-sm">
      {filteredPosts.length} {filteredPosts.length === 1 ? 'result' : 'results'} found
    </p>
  {/if}
</div>

<!-- Results grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#each filteredPosts as post (post.id)}
    <article class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
      <a href={`/blog/${post.id}`} class="block">
        {#if post.cover}
          <div class="relative h-48 overflow-hidden">
            <img
              src={post.cover}
              alt={post.coverAlt || post.title}
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        {:else}
          <div class="h-48 bg-gradient-to-br from-[#4b9aaa] to-[#3a7a8a] flex items-center justify-center">
            <svg class="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        {/if}
      </a>

      <div class="p-5">
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <time datetime={post.pubDate}>{new Date(post.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
          <span>•</span>
          <span>{post.author}</span>
        </div>

        <a href={`/blog/${post.id}`} class="block group">
          <h2 class="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#4b9aaa] transition-colors line-clamp-2">
            {post.title}
          </h2>
        </a>

        <p class="text-gray-600 mb-4 line-clamp-3">{post.description}</p>

        {#if post.tags && post.tags.length > 0}
          <div class="flex flex-wrap gap-2">
            {#each post.tags.slice(0, 3) as tag}
              <a
                href={`/blog/tag/${tag}`}
                class="px-2 py-1 bg-[#4b9aaa]/10 text-[#4b9aaa] rounded-full text-xs font-medium hover:bg-[#4b9aaa]/20 transition-colors"
              >
                {tag}
              </a>
            {/each}
            {#if post.tags.length > 3}
              <span class="px-2 py-1 text-gray-400 text-xs">+{post.tags.length - 3} more</span>
            {/if}
          </div>
        {/if}
      </div>
    </article>
  {:else}
    <div class="col-span-full text-center py-12">
      <svg class="w-16 h-16 mx-auto text-white/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-white/80 text-lg">No posts found matching "{searchQuery}"</p>
      <button
        onclick={clearSearch}
        class="mt-4 text-white underline hover:no-underline"
      >
        Clear search
      </button>
    </div>
  {/each}
</div>

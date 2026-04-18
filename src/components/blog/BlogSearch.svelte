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
  let pageSize = $state(12);
  let currentPage = $state(0);

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

  const totalPages = $derived(Math.max(1, Math.ceil(filteredPosts.length / pageSize)));
  const paginatedPosts = $derived(filteredPosts.slice(currentPage * pageSize, (currentPage + 1) * pageSize));

  // Reset to first page when search changes
  $effect(() => {
    searchQuery;
    currentPage = 0;
  });

  function clearSearch() {
    searchQuery = '';
    currentPage = 0;
  }

  function goToPage(page: number) {
    currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePageSizeChange(size: number) {
    pageSize = size;
    currentPage = 0;
  }

  // --- Scroll-triggered stagger animation ---

  let columnsPerRow = $state(getColumnsPerRow());

  function getColumnsPerRow(): number {
    if (typeof window === 'undefined') return 1;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
  }

  $effect(() => {
    const handler = () => { columnsPerRow = getColumnsPerRow(); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  });

  function reveal(node: HTMLElement, delay: number) {
    let currentDelay = delay;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.style.animationDelay = `${currentDelay}s`;
            el.classList.add('animate-scroll-reveal');
            observer.unobserve(el);
          }
        }
      },
      { rootMargin: '-80px' }
    );

    observer.observe(node);

    return {
      update(newDelay: number) {
        currentDelay = newDelay;
      },
      destroy() {
        observer.disconnect();
      }
    };
  }
</script>

<div class="mb-8">
  <!-- Search input -->
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
      <svg class="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Search posts by title, description, or tag..."
      class="w-full pl-12 pr-12 py-3 bg-white/[0.06] backdrop-blur-sm border border-white/[0.15] border-t-white/30 border-l-white/25 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] focus:ring-2 focus:ring-[#4b9aaa]/50 focus:border-[#4b9aaa]/50 text-[#e8e6e1] placeholder-white/40"
    />
    {#if searchQuery}
      <button
        onclick={clearSearch}
        class="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white/70"
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
  {#each paginatedPosts as post, index (post.id)}
    <div class="opacity-0" use:reveal={(index % columnsPerRow) * 0.12}>
    <a href={`/blog/${post.id}`} class="block group">
    <article class="rounded-xl overflow-hidden border border-transparent transition-all duration-300 cursor-pointer hover:bg-white/[0.06] hover:backdrop-blur-md hover:border-white/[0.15] hover:border-t-white/30 hover:border-l-white/25 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
        {#if post.cover}
          <div class="relative h-48 overflow-hidden">
            <img
              src={post.cover}
              alt={post.coverAlt || post.title}
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        {:else}
          <div class="h-48 bg-gradient-to-br from-[#4b9aaa]/30 to-[#3a7a8a]/30 flex items-center justify-center">
            <svg class="w-16 h-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        {/if}

      <div class="p-5">
        <div class="flex items-center gap-2 text-sm text-white/50 mb-3">
          <time datetime={post.pubDate}>{new Date(post.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
          <span>•</span>
          <span>{post.author}</span>
        </div>

        <h2 class="text-xl font-bold text-[#e8e6e1] mb-2 group-hover:text-[#4b9aaa] transition-colors line-clamp-2 font-['Space_Grotesk',sans-serif]">
          {post.title}
        </h2>

        <p class="text-white/70 mb-4 line-clamp-3">{post.description}</p>

        {#if post.tags && post.tags.length > 0}
          <div class="flex flex-wrap gap-2">
            {#each post.tags.slice(0, 3) as tag}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <a
                href={`/blog/tag/${tag}`}
                class="relative z-10 px-2 py-1 bg-[#4b9aaa]/20 text-[#4b9aaa] rounded-full text-xs font-medium hover:bg-[#4b9aaa]/30 transition-colors"
                onclick={(e) => e.stopPropagation()}
              >
                {tag}
              </a>
            {/each}
            {#if post.tags.length > 3}
              <span class="px-2 py-1 text-white/40 text-xs">+{post.tags.length - 3} more</span>
            {/if}
          </div>
        {/if}
      </div>
    </article>
    </a>
    </div>
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

<!-- Pagination -->
{#if totalPages > 1 || filteredPosts.length > 12}
  <div class="flex flex-wrap justify-center items-center gap-4 mt-8">
    <div class="flex items-center gap-2">
      <label class="text-sm text-white/70" for="blog-page-size">Show</label>
      <select
        id="blog-page-size"
        bind:value={pageSize}
        onchange={() => handlePageSizeChange(pageSize)}
        class="px-2 py-1 border border-white/30 bg-white/10 text-white rounded-lg text-sm focus:ring-2 focus:ring-white/50"
      >
        <option value={12}>12</option>
        <option value={24}>24</option>
        <option value={48}>48</option>
      </select>
    </div>

    <div class="flex items-center gap-1.5 sm:gap-2">
      <button
        onclick={() => goToPage(0)}
        disabled={currentPage === 0}
        class="hidden sm:inline-flex px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
      >
        First
      </button>
      <button
        onclick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 0}
        class="px-2.5 sm:px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
      >
        &larr;<span class="hidden sm:inline"> Prev</span>
      </button>
      <span class="text-sm text-white/70 px-1">
        <span class="sm:hidden">{currentPage + 1}/{totalPages}</span>
        <span class="hidden sm:inline">Page {currentPage + 1} of {totalPages} &middot; {filteredPosts.length} posts</span>
      </span>
      <button
        onclick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        class="px-2.5 sm:px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
      >
        <span class="hidden sm:inline">Next </span>&rarr;
      </button>
      <button
        onclick={() => goToPage(totalPages - 1)}
        disabled={currentPage >= totalPages - 1}
        class="hidden sm:inline-flex px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
      >
        Last
      </button>
    </div>
  </div>
{/if}

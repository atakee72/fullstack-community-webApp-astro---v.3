<script lang="ts">
  // Forum index inner — Phase 4a, loaded state.
  //
  // Layout (per kiosk-forum.jsx KioskForumDesktop):
  //   1. Header section (paper bg, dashed bottom rule)
  //      datetime crumb · h1 with italic serif accent · CTA top-right
  //      stats row underneath
  //   2. Filter rail (paper bg) — TagBar
  //   3. Card grid — featured pinned post first (col-span-3), then regular
  //      cards in 1/2/3-column grid.
  //
  // The synthetic Mahalle-Team welcome post is hardcoded as a featured
  // announcement card with `pinned: true` so the design's `📌 ANGEHEFTET`
  // marker shows in the strap. Phase 5 reads a real `pinned` boolean +
  // admin role from the database.

  import { createQuery } from '@tanstack/svelte-query';
  import { t, locale } from '../../../lib/kiosk-i18n';
  import { online } from '../../../lib/onlineStore';
  import ForumPostCard from './ForumPostCard.svelte';
  import TagBar, { type Filter } from './TagBar.svelte';
  import ForumIndexSkeleton from './states/ForumIndexSkeleton.svelte';
  import EmptyFilterPanel from './states/EmptyFilterPanel.svelte';
  import EmptyZeroPanel from './states/EmptyZeroPanel.svelte';
  import ErrorPanel from './states/ErrorPanel.svelte';
  import OfflineBanner from './states/OfflineBanner.svelte';
  import OwnStatusBanner from './states/OwnStatusBanner.svelte';
  import FeedStatusFooter from './states/FeedStatusFooter.svelte';

  let { initialTopics = [], currentUserId = null } = $props<{
    initialTopics?: any[];
    currentUserId?: string | null;
  }>();

  const query = createQuery(() => ({
    queryKey: ['forum', 'topics'],
    queryFn: async () => {
      const res = await fetch(
        '/api/topics?fields=_id,title,body,description,author,tags,images,comments,date,likes,likedBy,views,moderationStatus,isUserReported,hasWarningLabel&sortBy=date&sortOrder=desc'
      );
      if (!res.ok) throw new Error('forum fetch failed');
      const json = await res.json();
      return (json.items ?? json) as any[];
    },
    initialData: initialTopics,
    initialDataUpdatedAt: Date.now()
  }));

  const items = $derived((query.data ?? []) as any[]);

  // Synthetic Mahalle-Team welcome post — featured announcement card with
  // pinned + team flags. Sits ABOVE the real data; the regular feed
  // remains unaffected.
  const pinnedTopic = {
    _id: 'pinned-mahalle-team-001',
    title: 'Willkommen im Forum — schreibt, lest, redet mit.',
    body:
      'Wir sind die Mahalle-Crew. Hier könnt ihr Diskussionen starten, ' +
      'Empfehlungen teilen oder Kiez-Ankündigungen machen. Bitte respektvoll, ' +
      'kurz und auf den Punkt — eure Nachbar:innen lesen mit. Bei Fragen: meldet euch.',
    author: {
      name: 'Mahalle Team',
      image: null,
      createdAt: '2025-01-01T00:00:00Z'
    },
    tags: ['willkommen', 'kiezrat'],
    comments: [],
    likes: 47,
    date: new Date().toISOString()
  };

  // Filter state — Phase 4a applies tag filters locally only; type/saved/mine
  // filters toggle the active pill but don't reshape the data yet.
  let activeFilter = $state<Filter>('all');
  let activeTag = $state<string | null>(null);

  const filteredRest = $derived(
    activeTag
      ? items.filter((it) => (it.tags ?? []).includes(activeTag))
      : items
  );

  function topTags(input: any[], n = 6): string[] {
    const counts = new Map<string, number>();
    for (const it of input) {
      for (const tag of it.tags ?? []) {
        if (!tag) continue;
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([tag]) => tag);
  }
  const tags = $derived(topTags(items));

  // Stats: total / new since yesterday / "active now" stub (any comment in
  // the last 24h). Phase 4b wires real presence.
  const stats = $derived.by(() => {
    const now = Date.now();
    const yesterday = now - 24 * 60 * 60 * 1000;
    const total = items.length;
    let newSinceYesterday = 0;
    let activeNow = 0;
    for (const it of items) {
      const d = it.date ? new Date(it.date).getTime() : 0;
      if (d > yesterday) newSinceYesterday++;
      const lastComment = (it.comments ?? []).reduce((max: number, c: any) => {
        const cd = c?.date ? new Date(c.date).getTime() : 0;
        return cd > max ? cd : max;
      }, 0);
      if (lastComment > yesterday) activeNow++;
    }
    return { total, newSinceYesterday, activeNow };
  });

  let now = $state(new Date());
  $effect(() => {
    const id = setInterval(() => (now = new Date()), 60_000);
    return () => clearInterval(id);
  });

  const dayOfWeek = $derived(
    now.toLocaleDateString($locale === 'de' ? 'de-DE' : 'en-GB', { weekday: 'long' })
  );
  const dayMonth = $derived(
    now.toLocaleDateString($locale === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: 'long' })
  );
  const hhmm = $derived(
    now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  );

  function handleFilterChange(f: Filter) {
    activeFilter = f;
    // Phase 4b: trigger the relevant query / merge result.
  }
  function handleTagChange(tag: string | null) {
    activeTag = tag;
  }
  function clearFilters() {
    activeFilter = 'all';
    activeTag = null;
  }

  // ─── Phase 4b · state-matrix helpers ────────────────────────────────
  // Author-id extractor — schema returns either a string (raw _id) or a
  // populated `{ _id }` object depending on the SSR path.
  function authorIdOf(v: any): string | null {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v._id) return String(v._id);
    return null;
  }

  type OwnStatus = 'pending' | 'rejected' | 'reported' | null;

  // Mirror of ForumPostCard's inferredBadge logic (line 139), extended
  // to mark community-reported posts that the viewer is NOT the author of.
  function ownStatusFor(topic: any): OwnStatus {
    const isAuthor =
      currentUserId && authorIdOf(topic.author) === currentUserId;
    if (isAuthor && topic.moderationStatus === 'pending' && !topic.isUserReported) {
      return 'pending';
    }
    if (isAuthor && topic.moderationStatus === 'rejected') return 'rejected';
    if (
      !isAuthor &&
      topic.moderationStatus === 'pending' &&
      topic.isUserReported
    ) {
      return 'reported';
    }
    return null;
  }

  // Whether ANY card in the rendered feed is community-reported. Drives
  // the single feed-level plum banner — JSX shows it once per page,
  // not once per affected card.
  const hasReportedInFeed = $derived(
    filteredRest.some((t: any) => ownStatusFor(t) === 'reported')
  );

  // Localised label for the active filter (kind tab OR tag pill).
  // Keys here mirror the `filter.*` namespace in kiosk-i18n.ts.
  const KIND_LABELS_KEY = {
    discussion: 'filter.discussion',
    announcement: 'filter.announcement',
    recommendation: 'filter.recommendation',
    saved: 'filter.saved',
    mine: 'filter.mine'
  } as const;
  const filterLabel = $derived(
    activeTag
      ? `#${activeTag}`
      : activeFilter !== 'all'
      ? ($t as any)[KIND_LABELS_KEY[activeFilter as Exclude<Filter, 'all'>]]
      : ''
  );
  const FALLBACK_RELATED = ['familie', 'spielplatz', 'schule', 'betreuung'];
  const relatedTags = $derived(
    items.length > 0
      ? topTags(items, 5)
          .filter((tag) => tag !== activeTag)
          .slice(0, 4)
      : FALLBACK_RELATED
  );

  // Branching predicates (state precedence: error > loading > empty > grid).
  const showError = $derived(query.isError);
  const showSkeleton = $derived(!showError && query.isPending && !items.length);
  const showEmptyFilter = $derived(
    !showError &&
      !showSkeleton &&
      filteredRest.length === 0 &&
      (activeTag !== null || activeFilter !== 'all')
  );
  const showEmptyZero = $derived(
    !showError &&
      !showSkeleton &&
      !showEmptyFilter &&
      items.length === 0
  );
  const showGrid = $derived(!showError && !showSkeleton && !showEmptyFilter && !showEmptyZero);

  // Cached-minutes for OfflineBanner — null when no data has loaded yet.
  const cachedMinutes = $derived(
    query.dataUpdatedAt
      ? Math.max(0, Math.floor((Date.now() - query.dataUpdatedAt) / 60_000))
      : null
  );

  // Footer mode follows the same precedence as the grid branches.
  const footerMode = $derived(
    !$online ? 'offline' : query.isFetching || query.isPending ? 'loading' : 'fresh'
  );
</script>

<main class="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 py-8 md:py-10">
  <!-- ── Header section ─────────────────────────────────────────── -->
  <section class="mb-5 pb-4 border-b border-dashed border-rule">
    <p class="font-dmmono text-[11px] uppercase tracking-[0.18em] text-wine mb-2">
      FORUM · {dayOfWeek.toUpperCase()} {dayMonth.toUpperCase()} · {hhmm}
    </p>
    <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] md:items-end gap-4">
      <h1
        class="font-bricolage font-extrabold text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[0.95] text-ink"
      >
        {$t['forum.title.prefix']}
        <em class="font-instrument italic font-normal text-wine">{$t['forum.title.accent']}</em>
        {$t['forum.title.suffix']}
      </h1>
      <a
        href="/topics/create"
        class="self-start md:self-auto inline-flex items-center gap-2 px-5 py-2 rounded-full bg-ink text-paper font-bricolage font-medium text-sm border-2 border-ink shadow-[2px_2px_0_var(--k-wine)] hover:shadow-[3px_3px_0_var(--k-wine)] hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px transition-all duration-[180ms] ease-out shrink-0"
      >
        {$t['forum.cta.newTopic']}
      </a>
    </div>
    <div
      class="flex flex-wrap items-baseline gap-x-5 gap-y-1 mt-3 font-dmmono text-[11px] text-ink-mute"
    >
      <span><span class="font-bold text-ink">{stats.total}</span> {$t['forum.stats.topics']}</span>
      <span
        ><span class="font-bold text-ink">{stats.newSinceYesterday}</span>
        {$t['forum.stats.new']}</span
      >
      <span
        ><span class="font-bold text-ink">{stats.activeNow}</span> {$t['forum.stats.active']}</span
      >
    </div>
  </section>

  <!-- ── Filter rail (paper bg) ─────────────────────────────────── -->
  <div class="mb-5">
    <TagBar
      tone="paper"
      {activeFilter}
      {activeTag}
      {tags}
      onFilterChange={handleFilterChange}
      onTagChange={handleTagChange}
    />
  </div>

  <!-- ── State branch ladder ────────────────────────────────────────
       Precedence: error > skeleton > empty-filter > empty-zero > grid.
       Header + filter rail above stay visible on every branch so the
       user can still clear a bad filter or reach for a retry.        -->

  {#if showError}
    <ErrorPanel onReload={() => query.refetch()} />
  {:else if showSkeleton}
    <ForumIndexSkeleton />
  {:else if showEmptyFilter}
    <EmptyFilterPanel
      filterLabel={filterLabel}
      relatedTags={relatedTags}
      onClear={clearFilters}
    />
  {:else if showEmptyZero}
    <EmptyZeroPanel />
  {:else}
    <!-- ── Happy path · pinned + regular grid ──────────────────────── -->
    {#if !$online}
      <OfflineBanner cachedMinutes={cachedMinutes} />
    {/if}

    <div
      class={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 ${
        !$online ? 'k-grayscale-cached' : ''
      }`}
    >
      <!-- Pinned welcome (synthetic) — always col-span-3 in the happy path. -->
      <div class="md:col-span-2 lg:col-span-3">
        <a
          href="#"
          class="block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
          aria-label="Mahalle-Team Willkommensbeitrag"
        >
          <ForumPostCard
            topic={pinnedTopic}
            kind="announcement"
            featured
            pinned
            team
          />
        </a>
      </div>

      <!-- Single feed-level plum banner if any community-reported card exists. -->
      {#if hasReportedInFeed}
        <div class="md:col-span-2 lg:col-span-3">
          <OwnStatusBanner state="reported" />
        </div>
      {/if}

      <!-- Regular feed. Per-topic moderation status drives placement:
             pending  → dashed-warn wrapper around banner + own card (col-span-3)
             rejected → standalone banner block + ghosted card (both col-span-3)
             reported → ghosted card in normal grid flow (banner already at top)
             else     → normal grid card                                       -->
      {#each filteredRest as topic (topic._id)}
        {@const status = ownStatusFor(topic)}
        {#if status === 'pending'}
          <div
            class="md:col-span-2 lg:col-span-3 p-1 rounded-lg border-2 border-dashed border-warn"
          >
            <div class="px-2 pt-1.5 pb-2">
              <OwnStatusBanner state="pending" />
            </div>
            <a
              href={`/topics/${topic._id}`}
              class="block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
            >
              <ForumPostCard
                {topic}
                kind="discussion"
                optimistic
                statusBadgeOverride="pending"
              />
            </a>
          </div>
        {:else if status === 'rejected'}
          <div class="md:col-span-2 lg:col-span-3">
            <OwnStatusBanner state="rejected" />
          </div>
          <a
            href={`/topics/${topic._id}`}
            class="md:col-span-2 lg:col-span-3 block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
          >
            <ForumPostCard
              {topic}
              kind="discussion"
              ghosted
              statusBadgeOverride="rejected"
            />
          </a>
        {:else if status === 'reported'}
          <a
            href={`/topics/${topic._id}`}
            class="block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
          >
            <ForumPostCard
              {topic}
              kind="discussion"
              ghosted
              statusBadgeOverride="flagged"
            />
          </a>
        {:else}
          <a
            href={`/topics/${topic._id}`}
            class="block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
          >
            <ForumPostCard {topic} kind="discussion" />
          </a>
        {/if}
      {/each}
    </div>
  {/if}

  <FeedStatusFooter mode={footerMode} pageCount={1} currentPage={1} />
</main>

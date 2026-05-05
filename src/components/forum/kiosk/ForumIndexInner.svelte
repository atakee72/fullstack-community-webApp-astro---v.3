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

  let { initialItems = [], currentUserId = null } = $props<{
    initialItems?: any[];
    currentUserId?: string | null;
  }>();

  const query = createQuery(() => ({
    queryKey: ['forum', 'all'],
    queryFn: async () => {
      const fields =
        '_id,title,body,description,author,tags,images,comments,date,likes,likedBy,views,moderationStatus,isUserReported,hasWarningLabel';
      const url = (type: string) =>
        `/api/${type}?fields=${fields}&sortBy=date&sortOrder=desc`;
      // allSettled mirrors the SSR resilience: a failed collection
      // shouldn't blank the whole feed. Each handler also catches
      // network/parse errors so partial responses still render.
      const safe = (p: Promise<Response>) =>
        p
          .then((res) => (res.ok ? res.json() : { items: [] }))
          .catch(() => ({ items: [] }));
      const [tRes, aRes, rRes] = await Promise.allSettled([
        safe(fetch(url('topics'))),
        safe(fetch(url('announcements'))),
        safe(fetch(url('recommendations'))),
      ]);
      const t = tRes.status === 'fulfilled' ? tRes.value : { items: [] };
      const a = aRes.status === 'fulfilled' ? aRes.value : { items: [] };
      const r = rRes.status === 'fulfilled' ? rRes.value : { items: [] };
      const decorate = (arr: any[], kind: string) =>
        (arr ?? []).map((it: any) => ({ ...it, kind }));
      const merged = [
        ...decorate(t.items ?? t, 'discussion'),
        ...decorate(a.items ?? a, 'announcement'),
        ...decorate(r.items ?? r, 'recommendation'),
      ];
      merged.sort(
        (x: any, y: any) =>
          +new Date(y.date ?? 0) - +new Date(x.date ?? 0)
      );
      return merged;
    },
    initialData: initialItems,
    initialDataUpdatedAt: Date.now()
  }));

  const items = $derived((query.data ?? []) as any[]);

  // Pinned official announcement — at most one in the feed at a time
  // (server displaces older officials on create; see
  // /api/admin/announcements/create). After the 7-day pinnedUntil
  // expires, the card slips into the regular feed and this find()
  // returns undefined → top slot disappears.
  const pinnedOfficial = $derived(
    items.find(
      (it: any) =>
        it.kind === 'announcement' &&
        it.isOfficial === true &&
        it.pinnedUntil &&
        new Date(it.pinnedUntil).getTime() > Date.now()
    )
  );

  // Filter state — Phase 4a applies tag filters locally only; type/saved/mine
  // filters toggle the active pill but don't reshape the data yet.
  let activeFilter = $state<Filter>('all');
  let activeTag = $state<string | null>(null);

  // Filter ladder:
  //   1. kind filter (discussion / announcement / recommendation) when
  //      activeFilter is one of those — direct match against `it.kind`
  //      (the SSR fetch + client query both decorate items with kind).
  //   2. 'mine' filter → author-owned posts only (uses currentUserId).
  //   3. 'saved' is route-handled by handleFilterChange (navigates to
  //      /bookmarks) — never reaches this filter.
  //   4. tag filter (if any tag pill is active).
  const filteredRest = $derived(
    items
      // Pinned official renders separately at the top; exclude from
      // the regular feed so it doesn't appear twice.
      .filter((it: any) => it._id !== pinnedOfficial?._id)
      .filter((it: any) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'mine')
          return authorIdOf(it.author) === currentUserId;
        return it.kind === activeFilter;
      })
      .filter((it: any) =>
        !activeTag ? true : (it.tags ?? []).includes(activeTag)
      )
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
    // 'saved' routes to the dedicated /bookmarks page rather than
    // duplicating savedPosts join logic in-page.
    if (f === 'saved') {
      if (typeof window !== 'undefined') window.location.href = '/bookmarks';
      return;
    }
    activeFilter = f;
  }
  function handleTagChange(tag: string | null) {
    activeTag = tag;
  }
  function clearFilters() {
    activeFilter = 'all';
    activeTag = null;
  }

  // ─── Phase 4b · state-matrix helpers ────────────────────────────────
  // Per-kind detail route. Each forum sub-collection has its own
  // [id].astro page so edits/deletes/comments hit the right
  // /api/{collection}/* endpoints. Falls back to /topics for any
  // legacy item without a kind decoration.
  function detailHref(item: any): string {
    if (item.kind === 'announcement') return `/announcements/${item._id}`;
    if (item.kind === 'recommendation') return `/recommendations/${item._id}`;
    return `/topics/${item._id}`;
  }

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

  // ─── Just-posted detection ──────────────────────────────────────────
  // When a user just submitted a new topic from /topics/create and got
  // navigated back to /, the SSR fetch returns their post at the top.
  // We detect that by date (within last ~6 s) + author, and surface it
  // with a slide-in animation + live footer mode for a brief window.
  // No URL param needed — the 6 s wall-clock window naturally covers
  // the full-page-reload navigation.
  const LIVE_MS = 6000;
  let pageMountedAt = $state(Date.now());
  let liveTick = $state(0);
  $effect(() => {
    // Re-evaluate the live window every second so the badge clears.
    const id = setInterval(() => (liveTick = Date.now()), 1000);
    return () => clearInterval(id);
  });
  function isJustPosted(topic: any): boolean {
    if (!currentUserId) return false;
    if (authorIdOf(topic.author) !== currentUserId) return false;
    if (!topic.date) return false;
    const age = liveTick - new Date(topic.date).getTime();
    return age >= 0 && age < LIVE_MS;
  }
  const hasJustPosted = $derived(filteredRest.some((tt: any) => isJustPosted(tt)));

  // Footer mode follows the same precedence as the grid branches.
  // 'live' wins over 'fresh' when a just-posted card is in the feed.
  const footerMode = $derived(
    !$online
      ? 'offline'
      : query.isFetching || query.isPending
      ? 'loading'
      : hasJustPosted
      ? 'live'
      : 'fresh'
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
      <!-- Pinned official announcement (real DB doc). Hidden when the
           user narrows by a kind that wouldn't include announcements,
           and when no current official has pinnedUntil > now. -->
      {#if pinnedOfficial && (activeFilter === 'all' || activeFilter === 'announcement')}
        <div class="md:col-span-2 lg:col-span-3">
          <a
            href={detailHref(pinnedOfficial)}
            class="block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
            aria-label="Offizielle Ankündigung"
          >
            <ForumPostCard
              topic={pinnedOfficial}
              kind="announcement"
              featured
              pinned
              isOfficial
              team={pinnedOfficial.author?.role === 'admin'}
            />
          </a>
        </div>
      {/if}

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
        {@const justPosted = isJustPosted(topic)}
        {#if justPosted}
          <!-- ✓ DEIN POST celebration — full-width slide-in + green pill.
               Wins over the moderation status banner for the 6 s window
               after submit; falls through to the normal status branch
               once the celebration tick clears. -->
          <div
            class="md:col-span-2 lg:col-span-3 relative k-slide-in"
          >
            <span
              class="absolute -top-2 left-3 z-[2] px-2.5 py-0.5 rounded-full bg-success text-paper font-dmmono text-[9.5px] tracking-[0.1em] uppercase border border-ink"
            >
              {$t['feed.footer.live']}
            </span>
            <a
              href={detailHref(topic)}
              class="block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
            >
              <ForumPostCard
                {topic}
                kind={topic.kind ?? 'discussion'}
                optimistic
                isOfficial={topic.isOfficial === true}
                team={topic.author?.role === 'admin'}
                statusBadgeOverride={status === 'rejected' ? 'rejected' : 'pending'}
              />
            </a>
          </div>
        {:else if status === 'pending'}
          <div
            class="md:col-span-2 lg:col-span-3 p-1 rounded-lg border-2 border-dashed border-warn"
          >
            <div class="px-2 pt-1.5 pb-2">
              <OwnStatusBanner state="pending" />
            </div>
            <a
              href={detailHref(topic)}
              class="block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
            >
              <ForumPostCard
                {topic}
                kind={topic.kind ?? 'discussion'}
                optimistic
                isOfficial={topic.isOfficial === true}
                team={topic.author?.role === 'admin'}
                statusBadgeOverride="pending"
              />
            </a>
          </div>
        {:else if status === 'rejected'}
          <div class="md:col-span-2 lg:col-span-3">
            <OwnStatusBanner state="rejected" />
          </div>
          <a
            href={detailHref(topic)}
            class="md:col-span-2 lg:col-span-3 block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
          >
            <ForumPostCard
              {topic}
              kind={topic.kind ?? 'discussion'}
              ghosted
              isOfficial={topic.isOfficial === true}
              team={topic.author?.role === 'admin'}
              statusBadgeOverride="rejected"
            />
          </a>
        {:else if status === 'reported'}
          <a
            href={detailHref(topic)}
            class="block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
          >
            <ForumPostCard
              {topic}
              kind={topic.kind ?? 'discussion'}
              ghosted
              isOfficial={topic.isOfficial === true}
              team={topic.author?.role === 'admin'}
              statusBadgeOverride="flagged"
            />
          </a>
        {:else}
          <a
            href={detailHref(topic)}
            class="block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
          >
            <ForumPostCard
              {topic}
              kind={topic.kind ?? 'discussion'}
              isOfficial={topic.isOfficial === true}
              team={topic.author?.role === 'admin'}
            />
          </a>
        {/if}
      {/each}
    </div>
  {/if}

  <FeedStatusFooter mode={footerMode} pageCount={1} currentPage={1} />
</main>

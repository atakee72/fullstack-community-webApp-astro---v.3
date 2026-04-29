<script lang="ts">
  // Forum index inner — Phase 4a, loaded state only.
  //
  // Layout matches the Editorial Kiosk canvas:
  //   1. Header (paper bg)        — datetime crumb + title + CTA
  //   2. Stats line (paper bg)    — `247 Themen · 12 neu seit gestern · …`
  //   3. PinnedBlock (ink bg)     — TagBar + announcement strip + pinned hero
  //   4. Card grid (paper bg)     — regular topics
  //
  // 4a hardcodes the first topic as "pinned" so the visual matches the
  // canvas before any pinned/admin/role data fields are wired. Phase 5
  // wires real pinned-flag + admin role detection.

  import { createQuery } from '@tanstack/svelte-query';
  import { t, locale } from '../../../lib/kiosk-i18n';
  import ForumPostCard from './ForumPostCard.svelte';
  import PinnedBlock from './PinnedBlock.svelte';
  import TagBar, { type Filter } from './TagBar.svelte';

  let { initialTopics = [] } = $props<{
    initialTopics?: any[];
  }>();

  // Svelte Query 6: options is a function (re-evaluated on reactive deps),
  // and the return is a reactive proxy — access keys directly (`query.data`,
  // not `$query.data`).
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

  // Pinned (hardcoded for 4a) — synthetic Mahalle-Team welcome post. Sits
  // ABOVE the real data; the regular feed below is unaffected. Phase 5
  // reads a real `pinned` boolean + admin role from the database.
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
    views: 1287,
    date: new Date().toISOString()
  };
  const restItems = $derived(items);

  // Filter state — Phase 4a applies tag filters locally; type/saved/mine
  // filters toggle the active pill but don't reshape the data yet (we
  // only have one collection wired). Phase 4b wires the multi-collection
  // feed + saved/mine.
  let activeFilter = $state<Filter>('all');
  let activeTag = $state<string | null>(null);

  const filteredRest = $derived(
    activeTag
      ? restItems.filter((t) => (t.tags ?? []).includes(activeTag))
      : restItems
  );

  // Top-N tags from the full set (excluding the pinned topic so the
  // pinned hero's tags don't dominate the chip list).
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
  const tags = $derived(topTags(restItems));

  // Stats — Themen / neu seit gestern / aktiv jetzt.
  // "aktiv jetzt" is stubbed (no presence data yet); treat as topics with
  // a comment in the last 24 hours.
  const stats = $derived.by(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const yesterday = now - oneDay;

    const total = items.length;
    let newSinceYesterday = 0;
    let activeNow = 0;
    for (const it of items) {
      const d = it.date ? new Date(it.date).getTime() : 0;
      if (d > yesterday) newSinceYesterday++;
      // proxy: any comment in the last day = "aktiv"
      const lastComment = (it.comments ?? []).reduce((max: number, c: any) => {
        const cd = c?.date ? new Date(c.date).getTime() : 0;
        return cd > max ? cd : max;
      }, 0);
      if (lastComment > yesterday) activeNow++;
    }
    return { total, newSinceYesterday, activeNow };
  });

  // Live datetime crumb — `FORUM · MITTWOCH 25. APRIL · 14:42`.
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
    // Phase 4b: kick off the relevant query / merge result.
  }
  function handleTagChange(tag: string | null) {
    activeTag = tag;
  }
</script>

<main class="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 py-8 md:py-12">
  <!-- ── Header (paper bg) ────────────────────────────────────── -->
  <header class="mb-6">
    <p class="font-jetbrains text-[11px] uppercase tracking-[0.18em] text-ink-mute mb-3">
      FORUM · {dayOfWeek.toUpperCase()} {dayMonth.toUpperCase()} · {hhmm}
    </p>
    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-1">
      <h1 class="font-bricolage font-extrabold text-4xl md:text-6xl lg:text-7xl tracking-tight leading-[1.02] text-ink">
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
    <p class="font-inter text-ink-soft text-sm md:text-base max-w-2xl">
      {$t['forum.subtitle']}
    </p>
  </header>

  <!-- ── Stats line (paper bg) ────────────────────────────────── -->
  <div class="flex flex-wrap items-baseline gap-x-5 gap-y-1 mb-5 font-jetbrains text-[12px] text-ink-mute">
    <span><span class="font-bold text-ink">{stats.total}</span> {$t['forum.stats.topics']}</span>
    <span><span class="font-bold text-ink">{stats.newSinceYesterday}</span> {$t['forum.stats.new']}</span>
    <span><span class="font-bold text-ink">{stats.activeNow}</span> {$t['forum.stats.active']}</span>
  </div>

  <!-- ── Filter bar (paper bg) ────────────────────────────────── -->
  <div class="mb-6">
    <TagBar
      tone="paper"
      {activeFilter}
      {activeTag}
      {tags}
      onFilterChange={handleFilterChange}
      onTagChange={handleTagChange}
    />
  </div>

  <!-- ── PinnedBlock (ink bg, announcement + hero only) ──────── -->
  <div class="mb-6">
    <PinnedBlock pinnedTopic={pinnedTopic} />
  </div>

  <!-- ── Card grid (paper bg) ─────────────────────────────────── -->
  {#if filteredRest.length}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
      {#each filteredRest as topic (topic._id)}
        <a
          href={`/topics/${topic._id}`}
          class="block focus:outline-none focus:ring-2 focus:ring-ink rounded-lg"
        >
          <ForumPostCard {topic} />
        </a>
      {/each}
    </div>
  {/if}
</main>

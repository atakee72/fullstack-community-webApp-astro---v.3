<script lang="ts">
  // Single-row filter bar — Editorial Kiosk canvas:
  //   Alle | Diskussion | Ankündigung | Empfehlung │ Gespeichert | Meine
  //                                               TAGS  #kita #verkehr …
  //
  // Two color tones:
  //   - tone="paper" (default) — ink text on paper bg, ink fill when active
  //   - tone="ink"             — paper text on ink bg, paper fill when active
  //                              (used inside the pinned-block above the hero)
  //
  // Phase 4a: presentational + emits filter changes upward. The actual
  // filter logic (which items to show) lives in ForumIndexInner. Saved /
  // Mine + multi-collection feed land in Phase 4b.

  import { t } from '../../../lib/kiosk-i18n';

  export type Filter =
    | 'all'
    | 'discussion'
    | 'announcement'
    | 'recommendation'
    | 'saved'
    | 'mine';

  let {
    activeFilter = 'all',
    activeTag = null,
    tags = [],
    tone = 'paper',
    onFilterChange,
    onTagChange
  } = $props<{
    activeFilter?: Filter;
    activeTag?: string | null;
    tags?: string[];
    tone?: 'paper' | 'ink';
    onFilterChange?: (f: Filter) => void;
    onTagChange?: (tag: string | null) => void;
  }>();

  // Pill chrome — outlined rounded-full, two color states per tone.
  function pillClass(active: boolean): string {
    if (tone === 'ink') {
      return active
        ? 'bg-paper text-ink border-2 border-paper'
        : 'bg-transparent text-paper border-2 border-paper/40 hover:border-paper hover:text-paper';
    }
    return active
      ? 'bg-ink text-paper border-2 border-ink'
      : 'bg-transparent text-ink border-2 border-ink/30 hover:border-ink hover:bg-paper-warm';
  }

  const tagsLabelClass = $derived(
    tone === 'ink'
      ? 'font-dmmono text-[10px] uppercase tracking-[0.18em] text-paper/60'
      : 'font-dmmono text-[10px] uppercase tracking-[0.18em] text-ink-mute'
  );

  const sepClass = $derived(
    tone === 'ink' ? 'h-5 w-px bg-paper/30' : 'h-5 w-px bg-ink/20'
  );

  function setFilter(f: Filter) {
    onFilterChange?.(f);
  }
  function toggleTag(tag: string) {
    onTagChange?.(activeTag === tag ? null : tag);
  }

  // ─── Scroll-shadow + peek hint ──────────────────────────────────
  // Track per-row whether the user can still scroll left or right;
  // CSS uses these as data-attributes to apply an edge fade-mask
  // (peek = automatic from overflow; the mask softens the cut).
  // On desktop the wrapper has `display: contents` and produces no
  // box — scroll dimensions read 0, no mask applies. Self-disabling.
  let filtersEl: HTMLDivElement | null = $state(null);
  let tagsEl: HTMLDivElement | null = $state(null);
  let filtersScroll = $state({ left: false, right: false });
  let tagsScroll = $state({ left: false, right: false });

  function readScroll(el: HTMLDivElement): { left: boolean; right: boolean } {
    if (el.scrollWidth <= el.clientWidth + 1) return { left: false, right: false };
    return {
      left: el.scrollLeft > 1,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    };
  }

  $effect(() => {
    const el = filtersEl;
    if (!el) return;
    const update = () => (filtersScroll = readScroll(el));
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  });

  $effect(() => {
    const el = tagsEl;
    if (!el) return;
    const update = () => (tagsScroll = readScroll(el));
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  });

  const filters: { key: Filter; labelKey: string }[] = [
    { key: 'all',            labelKey: 'filter.all' },
    { key: 'discussion',     labelKey: 'filter.discussion' },
    { key: 'announcement',   labelKey: 'filter.announcement' },
    { key: 'recommendation', labelKey: 'filter.recommendation' }
  ];
  const personalFilters: { key: Filter; labelKey: string }[] = [
    { key: 'saved', labelKey: 'filter.saved' },
    { key: 'mine',  labelKey: 'filter.mine' }
  ];
</script>

<!--
  Mobile (< lg): two horizontally-scrollable rows — filters on top,
  tags below. `lg:contents` dissolves each row wrapper on desktop so
  the children re-flow into the original single `flex flex-wrap`
  parent (preserves the design's inline TAGS-after-filters look).
-->
<div class="lg:flex lg:flex-wrap lg:items-center lg:gap-2">
  <!-- Row 1: filters (type + personal). -->
  <div
    bind:this={filtersEl}
    class="kiosk-scroll-fade flex items-center gap-2 overflow-x-auto no-scrollbar lg:contents"
    data-scroll-left={filtersScroll.left}
    data-scroll-right={filtersScroll.right}
  >
    {#each filters as f (f.key)}
      <button
        type="button"
        onclick={() => setFilter(f.key)}
        class={`shrink-0 px-4 py-1 rounded-full font-bricolage font-medium text-sm transition-colors duration-150 ${pillClass(activeFilter === f.key)}`}
        aria-pressed={activeFilter === f.key}
      >{$t[f.labelKey]}</button>
    {/each}

    <span class={`shrink-0 ${sepClass}`} aria-hidden="true"></span>

    {#each personalFilters as f (f.key)}
      <button
        type="button"
        onclick={() => setFilter(f.key)}
        class={`shrink-0 px-4 py-1 rounded-full font-bricolage font-medium text-sm transition-colors duration-150 ${pillClass(activeFilter === f.key)}`}
        aria-pressed={activeFilter === f.key}
      >{$t[f.labelKey]}</button>
    {/each}
  </div>

  <!-- Row 2: tags. -->
  {#if tags.length}
    <div
      bind:this={tagsEl}
      class="kiosk-scroll-fade flex items-center gap-2 overflow-x-auto no-scrollbar mt-2 lg:mt-0 lg:contents"
      data-scroll-left={tagsScroll.left}
      data-scroll-right={tagsScroll.right}
    >
      <span class={`shrink-0 lg:ml-2 ${tagsLabelClass}`}>{$t['filter.tagsLabel']}</span>
      {#each tags as tag (tag)}
        <button
          type="button"
          onclick={() => toggleTag(tag)}
          class={`shrink-0 px-3 py-1 rounded-full font-bricolage font-medium text-sm transition-colors duration-150 ${pillClass(activeTag === tag)}`}
          aria-pressed={activeTag === tag}
        >#{tag}</button>
      {/each}
    </div>
  {/if}
</div>

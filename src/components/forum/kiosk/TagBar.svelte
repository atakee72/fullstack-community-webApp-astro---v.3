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
      ? 'font-jetbrains text-[10px] uppercase tracking-[0.18em] text-paper/60'
      : 'font-jetbrains text-[10px] uppercase tracking-[0.18em] text-ink-mute'
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

<div class="flex flex-wrap items-center gap-2">
  <!-- Type filters -->
  {#each filters as f (f.key)}
    <button
      type="button"
      onclick={() => setFilter(f.key)}
      class={`px-4 py-1 rounded-full font-bricolage font-medium text-sm transition-colors duration-150 ${pillClass(activeFilter === f.key)}`}
      aria-pressed={activeFilter === f.key}
    >{$t[f.labelKey]}</button>
  {/each}

  <!-- Separator -->
  <span class={sepClass} aria-hidden="true"></span>

  <!-- Personal filters -->
  {#each personalFilters as f (f.key)}
    <button
      type="button"
      onclick={() => setFilter(f.key)}
      class={`px-4 py-1 rounded-full font-bricolage font-medium text-sm transition-colors duration-150 ${pillClass(activeFilter === f.key)}`}
      aria-pressed={activeFilter === f.key}
    >{$t[f.labelKey]}</button>
  {/each}

  <!-- Tags -->
  {#if tags.length}
    <span class={`ml-2 ${tagsLabelClass}`}>{$t['filter.tagsLabel']}</span>
    {#each tags as tag (tag)}
      <button
        type="button"
        onclick={() => toggleTag(tag)}
        class={`px-3 py-1 rounded-full font-bricolage font-medium text-sm transition-colors duration-150 ${pillClass(activeTag === tag)}`}
        aria-pressed={activeTag === tag}
      >#{tag}</button>
    {/each}
  {/if}
</div>

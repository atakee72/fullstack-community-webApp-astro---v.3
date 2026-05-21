<script lang="ts">
  // Marketplace filter rail — two rows:
  //   Row 1: Kind toggle (Alle / Verkaufen / Tausch / Verschenken) +
  //           Saved + Mine toggles + Search input
  //   Row 2: Category chips (9 categories, horizontal scroll on mobile)
  //
  // Callback-prop pattern: this component is dumb. The parent orchestrator
  // (Task 2.5) owns URL persistence + state. The rail calls onKindChange,
  // onCatChange, onSearchChange, onViewChange and renders from its props.
  //
  // Svelte 5 syntax throughout ($props, $derived, $state).

  import { t } from '../../../../lib/kiosk-i18n';
  import { scrollFade } from '../../../../lib/scrollFade';
  import CategoryChip from '../primitives/CategoryChip.svelte';

  type KindKey = 'all' | 'verkaufen' | 'tausch' | 'verschenken';
  type CatKey =
    | 'moebel'
    | 'garten'
    | 'werkzeug'
    | 'kleidung'
    | 'medien'
    | 'elektronik'
    | 'fahrrad'
    | 'pflanze'
    | 'kinder'
    | 'spielzeug'
    | 'handgemacht'
    | 'sport'
    | 'sonstiges';

  let {
    activeKind = 'all',
    activeCat = null,
    searchQuery = '',
    activeView = null,
    isAuthenticated = false,
    onKindChange = (_k: string) => {},
    onCatChange = (_c: string | null) => {},
    onSearchChange = (_q: string) => {},
    onViewChange = (_v: string | null) => {},
  }: {
    activeKind?: KindKey;
    activeCat?: string | null;
    searchQuery?: string;
    activeView?: string | null;
    /** Gates the "Gespeichert" / "Meine" toggles. When false they render
        disabled with a tooltip prompting login (the view filter requires a
        session — without it the API returns the full feed, which would
        silently mislead the visitor). */
    isAuthenticated?: boolean;
    onKindChange?: (k: string) => void;
    onCatChange?: (c: string | null) => void;
    onSearchChange?: (q: string) => void;
    onViewChange?: (v: string | null) => void;
  } = $props();

  const KIND_PILLS: { id: KindKey; labelKey: string }[] = [
    { id: 'all',         labelKey: 'market.filter.kind.all' },
    { id: 'verkaufen',   labelKey: 'market.filter.kind.verkaufen' },
    { id: 'tausch',      labelKey: 'market.filter.kind.tausch' },
    { id: 'verschenken', labelKey: 'market.filter.kind.verschenken' },
  ];

  const CAT_KEYS: CatKey[] = [
    'moebel',
    'garten',
    'werkzeug',
    'kleidung',
    'medien',
    'elektronik',
    'fahrrad',
    'pflanze',
    'kinder',
    'spielzeug',
    'handgemacht',
    'sport',
    'sonstiges',
  ];

  function handleSearchInput(e: Event) {
    onSearchChange((e.target as HTMLInputElement).value);
  }

  function toggleView(v: string) {
    onViewChange(activeView === v ? null : v);
  }
</script>

<!-- ─── Filter rail wrapper ─────────────────────────────────────────────── -->
<div
  style="border-bottom: 1px dashed var(--k-rule);"
  class="px-4 md:px-9 lg:px-10"
>

  <!-- Row 1: Kind toggle + Saved + Mine + Search ──────────────────────── -->
  <div class="py-3 flex flex-wrap items-center gap-x-3 gap-y-2">

    <!-- Kind section: label + 4 pills -->
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Label -->
      <span
        class="font-dmmono uppercase shrink-0"
        style="font-size: 10px; color: var(--k-ink-mute); letter-spacing: 0.12em;"
      >
        {$t['market.filter.kind.label']}
      </span>

      <!-- 4 kind pills -->
      {#each KIND_PILLS as pill (pill.id)}
        <button
          type="button"
          onclick={() => onKindChange(pill.id)}
          class="shrink-0 font-bricolage font-semibold transition-colors duration-[150ms]"
          style="
            padding: 5px 13px;
            font-size: 12.5px;
            border: 2px solid var(--k-ink);
            border-radius: var(--k-radius-pill, 999px);
            background: {activeKind === pill.id ? 'var(--k-ink)' : 'transparent'};
            color: {activeKind === pill.id ? 'var(--k-paper)' : 'var(--k-ink)'};
          "
          aria-pressed={activeKind === pill.id}
        >
          {$t[pill.labelKey as keyof typeof $t]}
        </button>
      {/each}
    </div>

    <!-- Divider -->
    <div
      aria-hidden="true"
      style="width: 1px; height: 18px; background: var(--k-rule); margin: 0 4px; flex-shrink: 0;"
    ></div>

    <!-- Saved + Mine toggles — both require a session; disabled for logged-out
         visitors so the API call doesn't silently return the unfiltered feed
         under a misleading "Meine Anzeigen" heading. -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => toggleView('saved')}
        disabled={!isAuthenticated}
        title={!isAuthenticated ? 'Anmelden, um gespeicherte Anzeigen zu sehen.' : undefined}
        class="shrink-0 font-bricolage font-semibold transition-colors duration-[150ms] disabled:opacity-50 disabled:cursor-not-allowed"
        style="
          padding: 5px 13px;
          font-size: 12.5px;
          border-radius: var(--k-radius-pill, 999px);
          border: {activeView === 'saved'
            ? '2px solid var(--k-ink)'
            : '2px dashed var(--k-rule)'};
          background: {activeView === 'saved' ? 'var(--k-ink)' : 'transparent'};
          color: {activeView === 'saved' ? 'var(--k-paper)' : 'var(--k-ink-soft)'};
        "
        aria-pressed={activeView === 'saved'}
      >
        {$t['market.filter.saved']}
      </button>

      <button
        type="button"
        onclick={() => toggleView('mine')}
        disabled={!isAuthenticated}
        title={!isAuthenticated ? 'Anmelden, um eigene Anzeigen zu sehen.' : undefined}
        class="shrink-0 font-bricolage font-semibold transition-colors duration-[150ms] disabled:opacity-50 disabled:cursor-not-allowed"
        style="
          padding: 5px 13px;
          font-size: 12.5px;
          border-radius: var(--k-radius-pill, 999px);
          border: {activeView === 'mine'
            ? '2px solid var(--k-ink)'
            : '2px dashed var(--k-rule)'};
          background: {activeView === 'mine' ? 'var(--k-ink)' : 'transparent'};
          color: {activeView === 'mine' ? 'var(--k-paper)' : 'var(--k-ink-soft)'};
        "
        aria-pressed={activeView === 'mine'}
      >
        {$t['market.filter.mine']}
      </button>
    </div>

    <!-- Search: label + input (pushed right on large screens) -->
    <div class="flex items-center gap-2 lg:ml-auto">
      <span
        class="font-dmmono uppercase shrink-0 hidden sm:inline"
        style="font-size: 10px; color: var(--k-ink-mute); letter-spacing: 0.12em;"
      >
        {$t['market.filter.search.label']}
      </span>
      <input
        type="search"
        value={searchQuery}
        oninput={handleSearchInput}
        placeholder={$t['market.filter.search']}
        class="font-dmmono text-[12px] text-ink placeholder:text-ink-mute outline-none transition-colors duration-[150ms]
               focus:ring-1 focus:ring-ink"
        style="
          padding: 5px 10px;
          background: var(--k-paper-soft);
          border: 1px solid var(--k-rule);
          border-radius: var(--k-radius-md, 8px);
          min-width: 0;
          width: 180px;
        "
        aria-label={$t['market.filter.search.label']}
      />
    </div>
  </div>

  <!-- Row 2: Category chips ──────────────────────────────────────────── -->
  <div class="pb-3 flex items-center gap-3 flex-wrap lg:flex-nowrap">
    <!-- Label -->
    <span
      class="font-dmmono uppercase shrink-0"
      style="font-size: 10px; color: var(--k-ink-mute); letter-spacing: 0.12em;"
    >
      {$t['market.filter.category.label']}
    </span>

    <!-- Scrollable chip row — kiosk-scroll-fade on mobile, wraps on desktop -->
    <div
      use:scrollFade
      class="kiosk-scroll-fade no-scrollbar flex overflow-x-auto lg:flex-wrap gap-2 lg:overflow-visible"
    >
      <!-- "All categories" chip — plain pill, not a CategoryChip -->
      <button
        type="button"
        onclick={() => onCatChange(null)}
        class="shrink-0 font-bricolage font-semibold transition-colors duration-[150ms]"
        style="
          padding: 5px 12px;
          font-size: 12.5px;
          border-radius: var(--k-radius-pill, 999px);
          border: {activeCat === null
            ? '2px solid var(--k-ink)'
            : '1.5px solid var(--k-rule)'};
          background: {activeCat === null ? 'var(--k-ink)' : 'transparent'};
          color: {activeCat === null ? 'var(--k-paper)' : 'var(--k-ink-mute)'};
        "
        aria-pressed={activeCat === null}
      >
        {$t['market.filter.cat.all']}
      </button>

      {#each CAT_KEYS as key (key)}
        <!-- Wrap CategoryChip in a clickable button -->
        <button
          type="button"
          onclick={() => onCatChange(activeCat === key ? null : key)}
          class="shrink-0 rounded-full focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
          aria-pressed={activeCat === key}
        >
          <CategoryChip id={key} active={activeCat === key} />
        </button>
      {/each}
    </div>
  </div>

</div>

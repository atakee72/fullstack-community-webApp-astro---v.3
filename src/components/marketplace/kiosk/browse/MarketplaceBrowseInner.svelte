<script lang="ts">
  // Marketplace browse orchestrator (Svelte 5).
  //
  // Wires URL params → filter state → fetchListingsClient → MarketTitleBlock +
  // MarketFilterRail + optional ListingLead + ListingCard grid + pagination.
  //
  // URL shape:
  //   ?kind=verkaufen|tausch|verschenken   (DE display keys from the filter rail)
  //   ?cat=moebel|kleidung|…
  //   ?q=search+text
  //   ?view=mine|saved
  //   ?page=0             (0-indexed page number)
  //
  // Internal state uses ListingsQueryFilters which speaks the API/query layer
  // keys ('sell' | 'exchange' | 'gift'). The two maps below translate.

  import { onMount } from 'svelte';
  import { t } from '../../../../lib/kiosk-i18n';
  import { fetchListingsClient, type ListingsQueryFilters } from '../../../../hooks/api/useListingsQuery';
  import type { Listing } from '../../../../types/listing';
  import { showToast, showSuccess, showError } from '../../../../utils/toast';

  import MarketTitleBlock from './MarketTitleBlock.svelte';
  import MarketFilterRail from './MarketFilterRail.svelte';
  import ListingLead from './ListingLead.svelte';
  import ListingCard from './ListingCard.svelte';

  // ── Props ────────────────────────────────────────────────────────────
  let { initialData, currentUserId }: {
    initialData: { items: Listing[]; total: number };
    currentUserId: string | null;
  } = $props();

  // ── Kind key translation ─────────────────────────────────────────────
  // The filter rail speaks German display keys; the data layer speaks API keys.
  type RailKind = 'all' | 'verkaufen' | 'tausch' | 'verschenken';
  type ApiKind = 'all' | 'sell' | 'exchange' | 'gift';

  const RAIL_TO_API: Record<RailKind, ApiKind> = {
    all: 'all',
    verkaufen: 'sell',
    tausch: 'exchange',
    verschenken: 'gift',
  };
  const API_TO_RAIL: Record<ApiKind, RailKind> = {
    all: 'all',
    sell: 'verkaufen',
    exchange: 'tausch',
    gift: 'verschenken',
  };

  // ── State ────────────────────────────────────────────────────────────
  let filters = $state<ListingsQueryFilters>({
    kind: 'all',
    category: undefined,
    search: '',
    view: null,
    limit: 24,
    offset: 0,
  });

  let data = $state<{ items: Listing[]; total: number }>(initialData);
  let loading = $state(false);
  let error = $state<Error | null>(null);

  // ── Derived stats for MarketTitleBlock ───────────────────────────────
  const listingStats = $derived.by(() => {
    const now = Date.now();
    const yesterday = now - 24 * 60 * 60 * 1000;
    const threeHours = now - 3 * 60 * 60 * 1000;
    let newSinceYesterday = 0;
    let freshCount = 0;
    for (const it of data.items) {
      const d = it.createdAt ? new Date(it.createdAt as string).getTime() : 0;
      if (d > yesterday) newSinceYesterday++;
      if (d > threeHours) freshCount++;
    }
    return { newSinceYesterday, freshCount };
  });

  // ── Pagination derived ───────────────────────────────────────────────
  const PAGE_SIZE = 24;
  const currentPage = $derived(Math.floor((filters.offset ?? 0) / PAGE_SIZE));
  const totalPages = $derived(Math.max(1, Math.ceil(data.total / PAGE_SIZE)));

  // ── Lead visibility rule (A8) ────────────────────────────────────────
  // Show ListingLead only on page 1 + no filters + at least one listing.
  const hasFilters = $derived(
    filters.kind !== 'all' ||
    (!!filters.category && filters.category !== 'all') ||
    (!!filters.search && filters.search !== '') ||
    !!filters.view
  );
  const showLead = $derived(
    (filters.offset ?? 0) === 0 && !hasFilters && data.items.length > 0
  );

  // Grid items: skip the lead item when showLead is true.
  const gridItems = $derived(showLead ? data.items.slice(1) : data.items);

  // ── URL sync helpers ─────────────────────────────────────────────────
  function readFiltersFromUrl(): ListingsQueryFilters {
    if (typeof window === 'undefined') return filters;
    const params = new URL(window.location.href).searchParams;
    const railKind = (params.get('kind') as RailKind) ?? 'all';
    return {
      kind: RAIL_TO_API[railKind] ?? 'all',
      category: params.get('cat') ?? undefined,
      search: params.get('q') ?? '',
      view: (params.get('view') as 'mine' | 'saved' | null) ?? null,
      limit: PAGE_SIZE,
      offset: Number(params.get('page') ?? 0) * PAGE_SIZE,
    };
  }

  function writeFiltersToUrl(f: ListingsQueryFilters) {
    const url = new URL(window.location.href);
    const railKind = API_TO_RAIL[f.kind ?? 'all'] ?? 'all';

    if (railKind && railKind !== 'all') url.searchParams.set('kind', railKind);
    else url.searchParams.delete('kind');

    if (f.category && f.category !== 'all') url.searchParams.set('cat', f.category);
    else url.searchParams.delete('cat');

    if (f.search) url.searchParams.set('q', f.search);
    else url.searchParams.delete('q');

    if (f.view) url.searchParams.set('view', f.view);
    else url.searchParams.delete('view');

    const page = f.offset && f.limit ? Math.floor(f.offset / f.limit) : 0;
    if (page > 0) url.searchParams.set('page', String(page));
    else url.searchParams.delete('page');

    history.pushState({}, '', url.toString());
  }

  // ── Fetch ────────────────────────────────────────────────────────────
  // Monotonic sequencing guard: rapid filter changes (e.g. fast typing in
  // the search input) can produce out-of-order responses. We only accept a
  // settled response if its sequence number matches the latest issued one.
  let fetchSeq = 0;

  async function refetch() {
    const seq = ++fetchSeq;
    loading = true;
    error = null;
    try {
      const result = await fetchListingsClient(filters);
      if (seq !== fetchSeq) return; // stale response — newer fetch in flight
      data = result;
    } catch (e: any) {
      if (seq !== fetchSeq) return;
      error = e instanceof Error ? e : new Error(String(e));
    } finally {
      if (seq === fetchSeq) loading = false;
    }
  }

  function updateFilters(patch: Partial<ListingsQueryFilters>) {
    filters = { ...filters, ...patch, offset: 0 }; // reset to page 1 on filter change
    writeFiltersToUrl(filters);
    void refetch();
  }

  function goToPage(page: number) {
    filters = { ...filters, offset: page * PAGE_SIZE };
    writeFiltersToUrl(filters);
    void refetch();
    // Scroll to top on page change
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Mount: hydrate from URL if not default + consume flash params ───
  onMount(() => {
    // ── Flash toasts from compose / edit redirects ─────────────────────
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const flashes: Array<[string, string, () => void]> = [
      ['just_posted', '1',       () => showSuccess('Anzeige veröffentlicht!')],
      ['just_posted', 'pending', () => showToast('Deine Anzeige wird gerade geprüft. Sie erscheint, sobald sie freigegeben ist.', { type: 'info', duration: 6000 })],
      ['just_edited', '1',       () => showSuccess('Anzeige aktualisiert')],
      ['just_edited', 'pending', () => showToast('Änderungen werden geprüft.', { type: 'info', duration: 6000 })],
      ['edit_blocked', '1',      () => showToast('Bearbeiten gesperrt — die Anzeige wird gerade geprüft.', { type: 'warning', duration: 6000 })],
      ['not_owner', '1',         () => showError('Du kannst nur eigene Anzeigen bearbeiten.')],
      ['not_found', '1',         () => showError('Anzeige nicht gefunden.')],
    ];
    let consumed = false;
    for (const [key, val, fire] of flashes) {
      if (params.get(key) === val) {
        fire();
        params.delete(key);
        consumed = true;
      }
    }
    if (consumed) {
      window.history.replaceState({}, '', url.toString());
      void refetch(); // cache-bust so the new/updated listing appears
    }

    // ── Filter hydration from URL ──────────────────────────────────────
    const urlFilters = readFiltersFromUrl();
    const isDefault =
      urlFilters.kind === 'all' &&
      !urlFilters.category &&
      !urlFilters.search &&
      !urlFilters.view &&
      !urlFilters.offset;

    if (!isDefault) {
      filters = urlFilters;
      void refetch();
    }

    // popstate listener for browser back/forward
    function onPopState() {
      filters = readFiltersFromUrl();
      void refetch();
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  });

  // ── Filter clear (for filtered-empty state) ──────────────────────────
  function clearFilters() {
    filters = { kind: 'all', category: undefined, search: '', view: null, limit: PAGE_SIZE, offset: 0 };
    writeFiltersToUrl(filters);
    void refetch();
  }
</script>

<!-- ─── Title block ────────────────────────────────────────────────────── -->
<MarketTitleBlock
  listingsCount={data.total}
  newSinceYesterday={listingStats.newSinceYesterday}
  freshCount={listingStats.freshCount}
/>

<!-- ─── Filter rail ───────────────────────────────────────────────────── -->
<MarketFilterRail
  activeKind={API_TO_RAIL[filters.kind ?? 'all'] ?? 'all'}
  activeCat={filters.category ?? null}
  searchQuery={filters.search ?? ''}
  activeView={filters.view ?? null}
  isAuthenticated={currentUserId !== null}
  onKindChange={(k) => updateFilters({ kind: RAIL_TO_API[k as RailKind] ?? 'all' })}
  onCatChange={(c) => updateFilters({ category: c ?? undefined })}
  onSearchChange={(q) => updateFilters({ search: q })}
  onViewChange={(v) => updateFilters({ view: v as 'mine' | 'saved' | null })}
/>

<!-- ─── Loading overlay ───────────────────────────────────────────────── -->
{#if loading}
  <div
    style="padding: 40px 36px; text-align: center;"
    class="font-dmmono text-[12px] text-ink-mute uppercase tracking-widest"
    aria-live="polite"
  >
    {$t['ui.loading'] ?? 'laden…'}
  </div>
{/if}

<!-- ─── Error state ────────────────────────────────────────────────────── -->
{#if error && !loading}
  <div
    style="
      margin: 24px 36px;
      padding: 24px;
      background: var(--k-paper-warm);
      border: var(--k-border-ink);
      border-radius: var(--k-radius-md);
      text-align: center;
    "
  >
    <p class="font-bricolage font-semibold text-ink" style="font-size: 15px; margin: 0 0 12px;">
      Wir konnten den Markt nicht laden.
    </p>
    <button
      type="button"
      onclick={() => refetch()}
      class="font-dmmono text-[12px] uppercase tracking-wide"
      style="
        padding: 7px 18px;
        border: 2px solid var(--k-ink);
        border-radius: var(--k-radius-pill, 999px);
        background: transparent;
        color: var(--k-ink);
        cursor: pointer;
      "
    >
      ↺ erneut versuchen
    </button>
  </div>
{/if}

<!-- ─── Main content (no error) ───────────────────────────────────────── -->
{#if !error}
  <!-- Truly-empty: no listings at all, no filters active -->
  {#if data.total === 0 && !hasFilters && !loading}
    <div
      style="
        margin: 32px 36px;
        padding: 40px 24px;
        background: var(--k-paper-warm);
        border: 1px dashed var(--k-rule);
        border-radius: var(--k-radius-md);
        text-align: center;
      "
    >
      <p
        class="font-bricolage font-semibold text-ink"
        style="font-size: 18px; margin: 0 0 6px;"
      >
        Heute steht hier noch nichts.
      </p>
      <p class="font-instrument italic text-ink-soft" style="font-size: 15px; margin: 0 0 20px;">
        Magst du anfangen?
      </p>
      <a
        href="/marketplace/create"
        class="font-bricolage font-semibold"
        style="
          display: inline-block;
          padding: 9px 22px;
          background: var(--k-ink);
          color: var(--k-paper);
          border-radius: var(--k-radius-pill, 999px);
          font-size: 14px;
          text-decoration: none;
        "
      >
        + erste anzeige
      </a>
    </div>

  <!-- Filtered-empty: filters active, nothing matches -->
  {:else if data.total === 0 && hasFilters && !loading}
    <div
      style="
        margin: 24px 36px;
        padding: 28px 24px;
        background: var(--k-paper-warm);
        border: 1px dashed var(--k-rule);
        border-radius: var(--k-radius-md);
      "
    >
      <!-- Active filter chips (dismissible) -->
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
        {#if filters.kind && filters.kind !== 'all'}
          <span
            style="
              display: inline-flex; align-items: center; gap: 6px;
              padding: 4px 10px;
              background: var(--k-ink); color: var(--k-paper);
              border-radius: var(--k-radius-pill, 999px);
              font-family: var(--k-font-mono); font-size: 11px; font-weight: 600;
            "
          >
            {API_TO_RAIL[filters.kind] ?? filters.kind}
            <button
              type="button"
              onclick={() => updateFilters({ kind: 'all' })}
              aria-label="Filter entfernen"
              style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; line-height: 1;"
            >×</button>
          </span>
        {/if}
        {#if filters.category && filters.category !== 'all'}
          <span
            style="
              display: inline-flex; align-items: center; gap: 6px;
              padding: 4px 10px;
              background: var(--k-ink); color: var(--k-paper);
              border-radius: var(--k-radius-pill, 999px);
              font-family: var(--k-font-mono); font-size: 11px; font-weight: 600;
            "
          >
            {filters.category}
            <button
              type="button"
              onclick={() => updateFilters({ category: undefined })}
              aria-label="Filter entfernen"
              style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; line-height: 1;"
            >×</button>
          </span>
        {/if}
        {#if filters.search}
          <span
            style="
              display: inline-flex; align-items: center; gap: 6px;
              padding: 4px 10px;
              background: var(--k-ink); color: var(--k-paper);
              border-radius: var(--k-radius-pill, 999px);
              font-family: var(--k-font-mono); font-size: 11px; font-weight: 600;
            "
          >
            „{filters.search}"
            <button
              type="button"
              onclick={() => updateFilters({ search: '' })}
              aria-label="Suche löschen"
              style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; line-height: 1;"
            >×</button>
          </span>
        {/if}
        {#if filters.view}
          <span
            style="
              display: inline-flex; align-items: center; gap: 6px;
              padding: 4px 10px;
              background: var(--k-ink); color: var(--k-paper);
              border-radius: var(--k-radius-pill, 999px);
              font-family: var(--k-font-mono); font-size: 11px; font-weight: 600;
            "
          >
            {filters.view === 'mine' ? 'Meine' : 'Gespeichert'}
            <button
              type="button"
              onclick={() => updateFilters({ view: null })}
              aria-label="Filter entfernen"
              style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; line-height: 1;"
            >×</button>
          </span>
        {/if}
      </div>

      <p class="font-bricolage font-bold text-ink" style="font-size: 20px; margin: 0 0 12px;">
        Nichts dabei.
      </p>
      <!-- A8: navigational state-action, anchor not button. Bare /marketplace
           is the no-filters state; client-side clearFilters keeps interaction
           snappy without a full reload, but middle-click / right-click still
           work as expected because this is a real link. -->
      <a
        href="/marketplace"
        onclick={(e) => { e.preventDefault(); clearFilters(); }}
        class="font-dmmono text-[12px] uppercase tracking-wide text-ink-soft"
        style="text-decoration: underline; text-decoration-style: dashed;"
      >
        ← Filter zurücksetzen
      </a>
    </div>

  {:else if !loading}
    <!-- ─── Lead listing (page 1, no filters, has items) ─────────────── -->
    {#if showLead}
      <a
        href="/marketplace/{data.items[0]?._id}"
        style="display: block; text-decoration: none; color: inherit;"
      >
        <ListingLead listing={data.items[0] ?? null} />
      </a>

      <!-- Section divider between lead and grid -->
      <div
        style="
          margin: 0 36px;
          padding: 10px 0;
          border-top: 1px dashed var(--k-rule);
          display: flex; align-items: center; gap: 10px;
        "
      >
        <span
          class="font-dmmono uppercase tracking-widest"
          style="font-size: 10px; color: var(--k-ink-mute);"
        >
          {$t['market.divider.sortedBy'] ?? 'SORTIERT NACH FRISCHE'}
        </span>
        <div style="flex: 1; height: 1px; background: var(--k-rule);"></div>
        <span
          class="font-dmmono"
          style="font-size: 10px; color: var(--k-ink-mute);"
        >
          {data.total} {data.total === 1 ? 'Anzeige' : 'Anzeigen'}
        </span>
      </div>
    {/if}

    <!-- ─── Listing grid ───────────────────────────────────────────── -->
    {#if gridItems.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 px-5 py-5 lg:px-9 lg:py-6">
        {#each gridItems as item (item._id)}
          <a
            href="/marketplace/{item._id}"
            style="display: block; text-decoration: none; color: inherit;"
          >
            <ListingCard listing={item} />
          </a>
        {/each}
      </div>
    {/if}
  {/if}

  <!-- ─── Pagination ────────────────────────────────────────────────── -->
  {#if totalPages > 1 && !loading}
    <div
      style="
        display: flex; flex-wrap: wrap; justify-content: center; align-items: center;
        gap: 8px;
        padding: 20px 36px 32px;
        border-top: 1px dashed var(--k-rule);
        margin-top: 8px;
      "
    >
      <button
        type="button"
        onclick={() => goToPage(0)}
        disabled={currentPage === 0}
        class="font-dmmono text-[12px]"
        style="
          padding: 6px 14px;
          border: 1.5px solid var(--k-rule);
          border-radius: var(--k-radius-md, 8px);
          background: var(--k-paper);
          color: var(--k-ink);
          cursor: pointer;
          opacity: {currentPage === 0 ? '0.35' : '1'};
        "
        aria-label="Erste Seite"
      >⟪</button>

      <button
        type="button"
        onclick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 0}
        class="font-dmmono text-[12px]"
        style="
          padding: 6px 14px;
          border: 1.5px solid var(--k-rule);
          border-radius: var(--k-radius-md, 8px);
          background: var(--k-paper);
          color: var(--k-ink);
          cursor: pointer;
          opacity: {currentPage === 0 ? '0.35' : '1'};
        "
        aria-label="Vorherige Seite"
      >← Zurück</button>

      <span
        class="font-dmmono text-[12px] text-ink-mute"
        style="padding: 6px 8px;"
      >
        Seite {currentPage + 1} von {totalPages} · {data.total} Anzeigen
      </span>

      <button
        type="button"
        onclick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        class="font-dmmono text-[12px]"
        style="
          padding: 6px 14px;
          border: 2px solid var(--k-teal, #3f8f9f);
          border-radius: var(--k-radius-md, 8px);
          background: transparent;
          color: var(--k-teal, #3f8f9f);
          cursor: pointer;
          font-weight: 600;
          opacity: {currentPage >= totalPages - 1 ? '0.35' : '1'};
        "
        aria-label="Nächste Seite"
      >Weiter →</button>

      <button
        type="button"
        onclick={() => goToPage(totalPages - 1)}
        disabled={currentPage >= totalPages - 1}
        class="font-dmmono text-[12px]"
        style="
          padding: 6px 14px;
          border: 1.5px solid var(--k-rule);
          border-radius: var(--k-radius-md, 8px);
          background: var(--k-paper);
          color: var(--k-ink);
          cursor: pointer;
          opacity: {currentPage >= totalPages - 1 ? '0.35' : '1'};
        "
        aria-label="Letzte Seite"
      >⟫</button>
    </div>
  {/if}
{/if}

<!-- Floating "+ neue anzeige" FAB (mobile-only). Parked above the bottom
     mobile nav with 16 px clearance; wine fill + ink print-shadow matches
     the kiosk vocabulary and the calendar FAB pattern. The desktop CTA
     lives inside MarketTitleBlock (hidden < lg). -->
<a
  href="/marketplace/create"
  aria-label="Neue Anzeige erstellen"
  class="fixed bottom-16 right-4 z-30 w-14 h-14 rounded-full bg-wine text-paper border-2 border-ink font-bricolage font-bold text-[28px] leading-none shadow-[3px_3px_0_var(--k-ink,#0e1033)] flex items-center justify-center lg:hidden"
>+</a>

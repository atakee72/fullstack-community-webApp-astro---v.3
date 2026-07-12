<script lang="ts">
  // Archiv card — cross-surface activity ledger (§01). Filter chips
  // (Alle/Forum/Markt/Kalender/Kurier + own-view-only Gespeichert), rows,
  // "ältere laden" pagination, and the §02 empty state. Owns its own fetch
  // state (straight fetch, no TanStack) — mounted read-only into
  // ProfileInner's right column.
  // Design source: kiosk-profile.jsx (PActivityLedger, PFilterChip) +
  // kiosk-profile-states.jsx (§02 empty).

  import { t } from '../../../lib/kiosk-i18n';
  import { scrollFade } from '../../../lib/scrollFade';
  import { ACTIVITY_PAGE_SIZE } from '../../../lib/profile/profileShared';
  import type { ActivityFilter, ActivityItem, ActivityPage } from '../../../lib/profile/profileShared';
  import PCard from './atoms/PCard.svelte';
  import PCardHead from './atoms/PCardHead.svelte';
  import PBtn from './atoms/PBtn.svelte';
  import PFilterChip from './atoms/PFilterChip.svelte';
  import PActivityRow from './PActivityRow.svelte';

  let { publicView = false }: { publicView?: boolean } = $props();

  let filter = $state<ActivityFilter>('alle');
  let items = $state<ActivityItem[]>([]);
  let nextBefore = $state<string | null>(null);
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let loadingMore = $state(false);

  // Plain (non-reactive) counter — invalidates stale in-flight responses.
  // Mirrors ProfileInner's `seq`/`standingSeq` pattern.
  let seq = 0;

  async function fetchPage(before: string | null, append: boolean) {
    const mySeq = ++seq;
    if (append) loadingMore = true;
    else status = 'loading';
    try {
      const params = new URLSearchParams({ filter, limit: String(ACTIVITY_PAGE_SIZE) });
      if (before) params.set('before', before);
      const res = await fetch(`/api/profile/activity?${params.toString()}`);
      if (!res.ok) throw new Error('activity fetch failed');
      const data: ActivityPage = await res.json();
      if (mySeq !== seq) return; // stale response
      if (append) {
        const existingIds = new Set(items.map((i) => i.id));
        items = [...items, ...data.items.filter((i) => !existingIds.has(i.id))];
      } else {
        items = data.items;
      }
      nextBefore = data.nextBefore;
      status = 'ready';
    } catch {
      if (mySeq !== seq) return;
      status = 'error';
    } finally {
      if (mySeq === seq) loadingMore = false;
    }
  }

  // Filter change → reset list + fetch fresh page. Also fires once on mount.
  $effect(() => {
    void filter;
    items = [];
    nextBefore = null;
    fetchPage(null, false);
  });

  function selectFilter(f: ActivityFilter) {
    if (f === filter) return;
    filter = f;
  }

  function loadOlder() {
    if (!nextBefore || loadingMore) return;
    fetchPage(nextBefore, true);
  }

  function retry() {
    fetchPage(null, false);
  }

  const FILTERS: { key: ActivityFilter; labelKey: string }[] = [
    { key: 'alle', labelKey: 'profile.filter.alle' },
    { key: 'forum', labelKey: 'profile.filter.forum' },
    { key: 'markt', labelKey: 'profile.filter.markt' },
    { key: 'kalender', labelKey: 'profile.filter.kalender' },
    { key: 'kurier', labelKey: 'profile.filter.kurier' },
  ];

  const showSaved = $derived(filter === 'gespeichert');
  const isEmpty = $derived(status === 'ready' && items.length === 0);
  const showEmptyCtas = $derived(isEmpty && filter === 'alle');
</script>

<PCard pad={24}>
  <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; gap: 10px; flex-wrap: wrap;">
    <PCardHead n="01" title={$t['profile.archiv.title']} />
    <span style="font-family: var(--k-font-mono); font-size: 9.5px; color: var(--k-ink-mute); letter-spacing: 0.1em;">{$t['profile.archiv.note']}</span>
  </div>

  <div use:scrollFade class="kiosk-scroll-fade no-scrollbar flex overflow-x-auto" style="gap: 6px; margin-bottom: 8px; padding-bottom: 2px;">
    {#each FILTERS as f (f.key)}
      <PFilterChip
        label={$t[f.labelKey as keyof typeof $t]}
        active={filter === f.key}
        count={f.key === 'alle' && filter === 'alle' && status !== 'loading' ? items.length : null}
        onclick={() => selectFilter(f.key)}
      />
    {/each}
    {#if !publicView}
      <span style="width: 1px; height: 20px; background: var(--k-rule); margin: 2px 4px 0; flex-shrink: 0;"></span>
      <PFilterChip
        label={`◈ ${$t['profile.filter.gespeichert']}`}
        active={showSaved}
        onclick={() => selectFilter('gespeichert')}
      />
    {/if}
  </div>

  {#if status === 'error'}
    <div style="padding: 12px 0; font-family: var(--k-font-mono); font-size: 10.5px; color: var(--k-danger); display: flex; align-items: center; gap: 6px;">
      <span>{$t['profile.archiv.loadfailed']}</span>
      <button
        type="button"
        onclick={retry}
        style="font-family: var(--k-font-mono); font-size: 10.5px; font-weight: 700; color: var(--k-danger); background: none; border: none; border-bottom: 1.5px solid var(--k-danger); padding: 0; cursor: pointer;"
      >{$t['profile.save.retry']}</button>
    </div>
  {:else if isEmpty}
    <div style="padding: 20px 0; text-align: center;">
      <div style="font-family: var(--k-font-serif); font-style: italic; font-size: 15px; color: var(--k-ink-soft);">
        {$t['profile.empty.line']}
      </div>
      {#if showEmptyCtas}
        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-top: 12px;">
          <PBtn small href="/topics/create">{$t['profile.empty.cta.topic']}</PBtn>
          <PBtn small href="/marketplace/create">{$t['profile.empty.cta.listing']}</PBtn>
          <PBtn small href="/calendar">{$t['profile.empty.cta.events']}</PBtn>
        </div>
      {/if}
    </div>
  {:else}
    {#each items as item (item.id)}
      <PActivityRow {item} saved={showSaved} />
    {/each}
    {#if nextBefore}
      <div style="margin-top: 14px; text-align: center;">
        <PBtn small disabled={loadingMore} onclick={loadOlder}>{$t['profile.archiv.older']}</PBtn>
      </div>
    {/if}
  {/if}
</PCard>

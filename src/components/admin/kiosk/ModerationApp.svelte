<script lang="ts">
  /**
   * Admin moderation orchestrator — queue view (Task 4). Owns fetch state,
   * filter/pagination state, and the optimistic approve flow. `onWarn`/
   * `onReject` are stubs until Tasks 5/6 wire the reject/warning modals.
   *
   * State contract (consumed by Tasks 5–9 — keep names/shapes stable):
   *   view, filterType, items, counts, total, page, pageSize, loading,
   *   loadError, actioning, settling, fetchQueue(), runSingleAction().
   */
  import { onMount } from 'svelte';
  import { t, tStr } from '../../../lib/kiosk-i18n';
  import { ADM_TYPES, type FlaggedItem } from '../../../lib/adminModeration';
  import { showToast, showError } from '../../../utils/toast';
  import AdmStatRow from './AdmStatRow.svelte';
  import AdmTitleBlock from './AdmTitleBlock.svelte';
  import AdmFilterRail from './AdmFilterRail.svelte';
  import AdmQueueCard from './AdmQueueCard.svelte';

  let { adminName }: { adminName: string } = $props();

  // ── State contract ──────────────────────────────────────────────────────
  let view = $state<'queue' | 'history'>('queue');
  let filterType = $state<'all' | (typeof ADM_TYPES)[number] | 'reported'>('all');
  let items = $state<FlaggedItem[]>([]);
  let counts = $state<{ pending: number; approved: number; approvedWithWarning: number; rejected: number; urgent: number } | null>(null);
  let total = $state(0);
  let page = $state(0); // 0-indexed
  let pageSize = $state(10); // 10 | 25 | 50
  let loading = $state(true);
  let loadError = $state(false);
  let actioning = $state<Map<string, string>>(new Map()); // id → pending pill label
  let settling = $state<Set<string>>(new Set()); // id → settle-out animation

  // Local-only: bulk selection is not part of this task's scope (no bulk
  // bar yet — a later task builds it). The checkbox still needs somewhere
  // to write, so the visual "selected" border/shadow works once that bar
  // lands, without this component owning any bulk-action logic itself.
  let selectedIds = $state<Set<string>>(new Set());
  function toggleSelect(id?: string) {
    if (!id) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
  }

  const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));

  // ── Fetch (seq-guarded — marketplace `refetch()` pattern) ──────────────
  let fetchSeq = 0;

  async function fetchQueue(): Promise<void> {
    const seq = ++fetchSeq;
    loading = true;
    loadError = false;
    try {
      const params = new URLSearchParams();
      params.set('reviewStatus', 'pending');
      params.set('urgentFirst', 'true');
      params.set('sortBy', 'createdAt');
      params.set('sortOrder', 'desc');
      params.set('limit', String(pageSize));
      params.set('offset', String(page * pageSize));
      if (filterType === 'reported') {
        params.set('source', 'user_report');
      } else if (filterType !== 'all') {
        params.set('contentType', filterType);
      }

      const res = await fetch(`/api/admin/moderation?${params.toString()}`, { credentials: 'include' });
      if (seq !== fetchSeq) return; // stale — newer fetch in flight
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      if (seq !== fetchSeq) return;

      items = Array.isArray(json.items) ? json.items : [];
      counts = json.counts ?? null;
      total = json.pagination?.total ?? 0;
    } catch {
      if (seq !== fetchSeq) return;
      loadError = true;
    } finally {
      if (seq === fetchSeq) loading = false;
    }
  }

  function handleFilterChange(f: 'all' | (typeof ADM_TYPES)[number] | 'reported') {
    filterType = f;
    page = 0;
    void fetchQueue();
  }

  function handleViewChange(v: 'queue' | 'history') {
    view = v;
    // History (§03 empty / ledger list) is out of scope for Task 4 — the
    // toggle switches the local view flag only; a later task builds the
    // reviewed-items list behind it.
  }

  function handlePageChange(p: number) {
    if (p < 0 || p >= totalPages) return;
    page = p;
    void fetchQueue();
  }

  function handlePageSizeChange(size: number) {
    pageSize = size;
    page = 0;
    void fetchQueue();
  }

  onMount(() => {
    void fetchQueue();
  });

  // ── Review action (optimistic §04 flow) ─────────────────────────────────
  async function runSingleAction(
    id: string,
    action: 'approve' | 'reject' | 'approve_with_warning',
    opts?: { rejectionReason?: string; warningText?: string; notes?: string }
  ): Promise<{ ok: boolean; userBanned?: boolean; strikeCount?: number }> {
    const label =
      action === 'reject'
        ? $t['admin.act.pendingReject']
        : action === 'approve_with_warning'
          ? $t['admin.act.pendingWarn']
          : $t['admin.act.pendingApprove'];

    const startActioning = new Map(actioning);
    startActioning.set(id, label);
    actioning = startActioning;

    try {
      const res = await fetch('/api/admin/moderation/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ flaggedContentId: id, action, ...opts }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        /* non-JSON error body — fall through to generic message below */
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || json?.message || `Request failed (${res.status})`);
      }

      // Settle-out animation, then remove locally + resync from server.
      const startSettling = new Set(settling);
      startSettling.add(id);
      settling = startSettling;

      await new Promise((resolve) => setTimeout(resolve, 220));

      items = items.filter((it) => it._id !== id);

      const endSettling = new Set(settling);
      endSettling.delete(id);
      settling = endSettling;

      const endActioning = new Map(actioning);
      endActioning.delete(id);
      actioning = endActioning;

      void fetchQueue(); // refresh counts + backfill this page from the server

      return { ok: true, userBanned: json.userBanned, strikeCount: json.strikeCount };
    } catch (err) {
      const endActioning = new Map(actioning);
      endActioning.delete(id);
      actioning = endActioning;
      showError(err instanceof Error ? err.message : String(err));
      return { ok: false };
    }
  }

  // Approve is fully wired (also used for report-dismiss — same 'approve'
  // action per the API). Warn/reject are stubs until Tasks 5/6 add the
  // reason/warning-text modals.
  function handleApprove(item: FlaggedItem) {
    if (!item._id) return;
    void runSingleAction(item._id, 'approve');
  }
  function handleWarn(_item: FlaggedItem) {
    // Task 5/6 wires the modal
    showToast($t['admin.act.stub'], { type: 'info' });
  }
  function handleReject(_item: FlaggedItem) {
    // Task 5/6 wires the modal
    showToast($t['admin.act.stub'], { type: 'info' });
  }
</script>

<AdmStatRow {counts} />
<AdmTitleBlock {view} onViewChange={handleViewChange} />

{#if view === 'queue'}
  <AdmFilterRail active={filterType} onFilterChange={handleFilterChange} />

  <div style="padding: 0 36px 28px; display: flex; flex-direction: column; gap: 16px; position: relative;">
    {#if loading && items.length === 0}
      <!-- §01 loading — skeleton sweep -->
      {#each [0, 1, 2] as i (i)}
        <div style="border: 1px solid var(--k-rule); border-radius: var(--k-radius-md); padding: 12px 14px; background: var(--k-paper);">
          <div class="adm-skeleton-bar" style="height: 10px; width: 38%; border-radius: 5px;"></div>
          <div class="adm-skeleton-bar" style="height: 10px; width: 82%; border-radius: 5px; margin-top: 8px;"></div>
          <div class="adm-skeleton-bar" style="height: 10px; width: 64%; border-radius: 5px; margin-top: 8px;"></div>
        </div>
      {/each}

    {:else if loadError}
      <!-- §06 error -->
      <div style="border: 1.5px solid var(--k-danger); border-radius: var(--k-radius-md); background: var(--k-paper-warm); padding: 14px 16px;">
        <div class="font-bricolage" style="font-size: 13.5px; font-weight: 800;">{$t['admin.state.error.title']}</div>
        <div style="font-size: 12px; color: var(--k-ink-soft); margin-top: 4px; line-height: 1.5;">{$t['admin.state.error.body']}</div>
        <button
          type="button"
          onclick={() => fetchQueue()}
          class="font-bricolage"
          style="margin-top: 10px; display: inline-block; background: var(--k-ink); color: var(--k-paper); border-radius: var(--k-radius-pill); padding: 6px 14px; font-size: 12px; font-weight: 700; box-shadow: 2px 2px 0 var(--k-danger); border: none; cursor: pointer;"
        >{$t['admin.state.error.retry']}</button>
      </div>

    {:else if !items.length && counts}
      <!-- §02 empty — the good state -->
      <div style="text-align: center; padding: 26px 12px;">
        <div style="width: 44px; height: 44px; margin: 0 auto 12px; border-radius: 50%; border: 1.5px solid var(--k-success); display: flex; align-items: center; justify-content: center; color: var(--k-success); font-size: 19px; font-weight: 700;">✓</div>
        <div class="font-bricolage" style="font-size: 17px; font-weight: 800; letter-spacing: -0.02em;">{$t['admin.state.empty.title']}</div>
        <div class="font-instrument" style="font-style: italic; font-size: 13.5px; color: var(--k-ink-soft); margin-top: 4px;">{$t['admin.state.empty.sub']}</div>
      </div>

    {:else}
      {#each items as item (item._id)}
        <AdmQueueCard
          {item}
          selected={selectedIds.has(item._id ?? '')}
          onToggleSelect={() => toggleSelect(item._id)}
          onApprove={handleApprove}
          onWarn={handleWarn}
          onReject={handleReject}
          actioningLabel={item._id ? (actioning.get(item._id) ?? null) : null}
          settling={item._id ? settling.has(item._id) : false}
        />
      {/each}

      <!-- pagination footer -->
      <div style="display: flex; justify-content: center; gap: 14px; align-items: center; font-family: var(--k-font-mono); font-size: 11px; color: var(--k-ink-mute); padding-top: 6px; flex-wrap: wrap;">
        <button
          type="button"
          disabled={page === 0}
          onclick={() => handlePageChange(page - 1)}
          style="border: var(--k-border-ink); border-radius: var(--k-radius-pill); padding: 5px 14px; color: var(--k-ink); font-weight: 600; background: transparent; opacity: {page === 0 ? 0.5 : 1}; cursor: {page === 0 ? 'not-allowed' : 'pointer'};"
        >{$t['admin.page.prev']}</button>

        <span>
          {tStr($t['admin.page.of'], { p: page + 1, t: totalPages, n: total, what: $t['admin.page.pending'] })}
          <select
            value={pageSize}
            onchange={(e) => handlePageSizeChange(Number((e.target as HTMLSelectElement).value))}
            class="font-dmmono"
            style="margin-left: 4px; border: 1px solid var(--k-rule); border-radius: var(--k-radius-sm); background: var(--k-paper); color: var(--k-ink); font-size: 11px; padding: 2px 4px;"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </span>

        <button
          type="button"
          disabled={page >= totalPages - 1}
          onclick={() => handlePageChange(page + 1)}
          style="border: var(--k-border-ink); border-radius: var(--k-radius-pill); padding: 5px 14px; color: var(--k-ink); font-weight: 600; background: transparent; opacity: {page >= totalPages - 1 ? 0.5 : 1}; cursor: {page >= totalPages - 1 ? 'not-allowed' : 'pointer'};"
        >{$t['admin.page.next']}</button>
      </div>
    {/if}
  </div>

{:else}
  <!-- History (Protokoll) — later task builds the reviewed-items ledger. -->
  <div class="font-dmmono" style="padding: 36px; color: var(--k-ink-mute);">Protokoll folgt in einer späteren Aufgabe.</div>
{/if}

<script lang="ts">
  // Admin · Amtliche Mitteilungen — kiosk orchestrator.
  // Design: design/handoffs/design_handoff_announce/jsx/kiosk-admin-announce.jsx
  //
  // Task 3 (this pass): read side — kicker/H1/counter, board + archive
  // AnnCard lists, skeleton (state 01) + empty (state 02). The composer
  // (left 460px column) and all write actions (edit/unpin/repin/delete)
  // land in Task 4 — buttons/CTA render now, wired to no-ops.
  import { onMount } from 'svelte';
  import { t, tStr, locale } from '../../../../lib/kiosk-i18n';
  import { showError } from '../../../../utils/toast';
  import { isPinned, fmtKickerDate, type AnnLang } from './annFormat';
  import AnnCard from './AnnCard.svelte';

  let { initialItems = [], adminName = '' }: { initialItems?: any[]; adminName?: string } = $props();

  // ── State contract ──────────────────────────────────────────────────────
  let status = $state<'loading' | 'ready'>(initialItems.length > 0 ? 'ready' : 'loading');
  let items = $state<any[]>(initialItems);

  async function loadItems(): Promise<void> {
    status = 'loading';
    try {
      const res = await fetch('/api/admin/announcements', { credentials: 'include' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      items = Array.isArray(json.items) ? json.items : [];
    } catch {
      items = [];
      showError($t['admin.ann.toast.loadError']);
    } finally {
      status = 'ready';
    }
  }

  onMount(() => {
    // initialItems.length > 0 → SSR already delivered the real list, no
    // refetch needed. Empty array covers both a genuinely empty board AND
    // an SSR failure — either way a client-side fetch is the source of
    // truth before we commit to state 02.
    if (initialItems.length === 0) void loadItems();
  });

  const pinnedItem = $derived(items.find((it) => isPinned(it)) ?? null);
  const archiveItems = $derived(items.filter((it) => !isPinned(it)));

  // Live clock — re-derives the kicker every minute (mirrors AdmTitleBlock).
  let now = $state(new Date());
  $effect(() => {
    const id = setInterval(() => (now = new Date()), 60_000);
    return () => clearInterval(id);
  });

  const lang = $derived(($locale === 'de' ? 'DE' : 'EN') as AnnLang);
  // `now &&` forces a read of the ticking clock so this derivation re-runs
  // every minute — fmtKickerDate itself always uses `new Date()` internally
  // (it has no date param per spec) so nothing else here depends on `now`.
  const kicker = $derived(`${$t['admin.ann.kicker']} · ${now && fmtKickerDate(lang)}`);
  const counter = $derived(tStr($t['admin.ann.counter'], { n: items.length, p: pinnedItem ? 1 : 0 }));

  // Mobile card sizing — AnnCard's `compact` prop tracks the same md
  // breakpoint AdminLayout uses for its own desktop/mobile masthead split.
  let compactCards = $state(false);
  $effect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => (compactCards = mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  });

  // Write actions land in Task 4.
  function noop(_item: any) {}

  // Task 4: scrolls to + focuses the composer's title field once it mounts.
  function focusComposer() {}
</script>

<div class="mx-auto" style="max-width:1280px;">
  <section class="px-4 pt-5 md:px-9 md:pt-[22px]">
    <div class="font-dmmono text-[11px] tracking-[0.12em]" style="color: var(--k-accent);">{kicker}</div>
    <h1
      class="font-bricolage font-extrabold text-ink leading-[0.95] mt-1.5 text-[32px] md:text-[48px]"
      style="letter-spacing: -0.035em;"
    >{$t['admin.ann.title.a']}<span class="font-instrument italic font-normal" style="color: var(--k-accent);">{$t['admin.ann.title.accent']}</span>{$t['admin.ann.title.b']}</h1>
    {#if status === 'ready'}
      <div class="font-dmmono text-[11px] text-ink-mute mt-2.5 pb-3.5" style="border-bottom: 1px dashed var(--k-rule);">
        {counter}
      </div>
    {:else}
      <div class="pb-3.5" style="border-bottom: 1px dashed var(--k-rule);">
        <div class="ann-skel" style="width: 40%; height: 12px; border-radius: 4px; margin-top: 12px;"></div>
      </div>
    {/if}
  </section>

  <section class="px-4 pt-5 pb-8 md:px-9 md:pt-[22px] md:pb-8 grid grid-cols-1 md:[grid-template-columns:460px_1fr] gap-6 items-start">
    <div class="relative">
      {#if status === 'loading'}
        <div class="ann-skel" style="width: 100%; height: 230px; border-radius: var(--k-radius-lg);"></div>
      {:else}
        <!-- composer: Task 4 -->
      {/if}
    </div>

    <div class="flex flex-col gap-3.5">
      {#if status === 'loading'}
        <div class="ann-skel" style="width: 55%; height: 16px; border-radius: 4px;"></div>
        <div class="ann-skel" style="width: 100%; height: 140px; border-radius: var(--k-radius-lg);"></div>
        <div class="ann-skel" style="width: 40%; height: 14px; border-radius: 4px; margin-top: 8px;"></div>
        <div class="ann-skel" style="width: 100%; height: 90px; border-radius: var(--k-radius-lg);"></div>
        <div class="ann-skel" style="width: 100%; height: 90px; border-radius: var(--k-radius-lg);"></div>
      {:else if items.length === 0}
        <div class="text-center px-3 py-8">
          <div class="font-instrument italic text-ink-soft" style="font-size: 19px;">{$t['admin.ann.empty.title']}</div>
          <div class="text-[12.5px] text-ink-mute mt-1.5 leading-normal">{$t['admin.ann.empty.hint']}</div>
          <div class="mt-3">
            <button
              type="button"
              onclick={focusComposer}
              class="font-bricolage"
              style="background: transparent; color: var(--k-accent); border: 1.5px solid var(--k-accent); border-radius: var(--k-radius-pill); padding: 6px 13px; font-size: 12px; font-weight: 700; cursor: pointer;"
            >{$t['admin.ann.empty.cta']}</button>
          </div>
        </div>
      {:else}
        {#if pinnedItem}
          <div class="font-dmmono text-[10px] text-ink-mute tracking-[0.12em]">{$t['admin.ann.section.board']}</div>
          <AnnCard item={pinnedItem} compact={compactCards} onEdit={noop} onUnpin={noop} onRepin={noop} onDelete={noop} />
        {/if}
        {#if archiveItems.length > 0}
          <div class="font-dmmono text-[10px] text-ink-mute tracking-[0.12em]" style="margin-top: {pinnedItem ? '10px' : '0'};">
            {$t['admin.ann.section.archive']}
          </div>
          {#each archiveItems as item (item._id)}
            <AnnCard {item} compact={compactCards} onEdit={noop} onUnpin={noop} onRepin={noop} onDelete={noop} />
          {/each}
        {/if}
      {/if}
    </div>
  </section>
</div>

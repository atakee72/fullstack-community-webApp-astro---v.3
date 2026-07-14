<script lang="ts">
  import { t } from '../../../lib/kiosk-i18n';
  import type { KiezStatsResponse, AirQualityResponse, AirHistoryResponse } from '../../../types/kiezStats';
  import KzSkeleton from './KzSkeleton.svelte';
  import KzFooter from './KzFooter.svelte';
  import KzInstrumentStrip from './KzInstrumentStrip.svelte';

  let stats = $state<KiezStatsResponse | null>(null);
  let statsStatus = $state<'loading' | 'ready' | 'error'>('loading');
  let air = $state<AirQualityResponse | null>(null);
  let airStatus = $state<'loading' | 'ready' | 'off'>('loading');
  let history = $state<AirHistoryResponse | null>(null);
  let plr = $state('all');

  let seq = 0;
  let errorDetail = $state('');
  async function refetchStats() {
    const mySeq = ++seq;
    statsStatus = 'loading';
    try {
      const res = await fetch('/api/kiez-stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (mySeq !== seq) return;
      stats = body;
      statsStatus = 'ready';
    } catch (e) {
      if (mySeq !== seq) return;
      errorDetail = e instanceof Error && e.message.startsWith('HTTP') ? e.message : '';
      statsStatus = 'error';
    }
  }
  async function fetchAir() {
    try {
      const res = await fetch('/api/kiez-air');
      if (!res.ok) throw new Error('off');
      air = await res.json();
      airStatus = 'ready';
    } catch {
      airStatus = 'off'; // state §04 — the strip stays and says so
    }
  }
  async function fetchHistory() {
    try {
      const res = await fetch('/api/kiez-air-history');
      if (res.ok) history = await res.json();
    } catch { /* sparkline simply absent */ }
  }

  let started = $state(false);
  $effect(() => {
    if (started) return;
    started = true;
    refetchStats();
    fetchAir();
    fetchHistory();
  });

  const isEmpty = $derived(statsStatus === 'ready' && !stats?.demographics && !stats?.social);
  const isStale = $derived.by(() => {
    const d = stats?.lastUpdated;
    if (!d) return false;
    return Date.now() - new Date(d).getTime() > 8 * 30.44 * 24 * 3600 * 1000; // > 8 months
  });
</script>

<div class="mx-auto w-full max-w-[1280px]">
  <KzInstrumentStrip {air} {airStatus} {history} />

  {#if statsStatus === 'loading'}
    <KzSkeleton />
  {:else if statsStatus === 'error'}
    <section class="px-5 py-12 lg:px-9">
      <div class="rounded-lg border-[1.5px] border-dashed border-[var(--k-danger)] px-5 py-6 text-center">
        <p class="font-serif italic text-[17px] text-[var(--k-ink-soft)]">{$t['kiez.state.error.title']}</p>
        <p class="mt-1.5 font-mono text-[10px] text-[var(--k-ink-mute)]">{errorDetail || $t['kiez.state.error.network']} · /api/kiez-stats</p>
        <button
          class="mt-3 min-h-[44px] rounded-full bg-[var(--k-ink)] px-5 py-2 text-[13px] font-bold text-[var(--k-paper)]"
          onclick={refetchStats}
        >{$t['kiez.state.error.retry']}</button>
      </div>
    </section>
  {:else if isEmpty}
    <section class="px-5 py-12 lg:px-9">
      <div class="rounded-lg border-[1.5px] border-dashed border-[var(--k-rule)] px-5 py-6 text-center">
        <p class="font-serif italic text-[17px] text-[var(--k-ink-soft)]">{$t['kiez.state.empty.title']}</p>
        <p class="mt-2 text-[12.5px] leading-relaxed text-[var(--k-ink-mute)]">{$t['kiez.state.empty.body']}</p>
      </div>
    </section>
  {:else if stats}
    <!-- TASK 5: <KzTitleBlock {vm} {history} {isStale} /> (carries the §07 warn line; `vm` derivation lands in Task 5) -->
    <!-- TASK 6: <KzSelector {stats} bind:plr /> + Kanal 01 + Kanal 02 -->
    <!-- TASK 7: Kanal 03 + Kanal 04 -->
    <!-- TASK 8: {#if plr === 'all'} Kanal 05 {/if} -->
  {/if}

  <KzFooter />
</div>

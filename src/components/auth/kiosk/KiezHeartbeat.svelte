<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../../lib/kiosk-i18n';

  let { compact = false }: { compact?: boolean } = $props();

  // Ambient, not load-bearing: each stat resolves independently; any failure
  // leaves that stat null and its segment is simply omitted. Never throws,
  // never blocks paint, no spinner.
  let events = $state<number | null>(null);
  let posts = $state<number | null>(null);
  let air = $state<string | null>(null);

  function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  onMount(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const opts = { signal: ctrl.signal };

    // air — single cheap public call; show the LQI grade label (e.g. "gut")
    fetch('/api/kiez-air', opts)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.overallLabel) air = d.overallLabel; })
      .catch(() => {});

    // posts today — news total within today's window (limit=1, we only need the count)
    fetch(`/api/news?limit=1&dateFrom=${todayISO()}`, opts)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (typeof d?.pagination?.total === 'number') posts = d.pagination.total; })
      .catch(() => {});

    // events today — count events whose startDate is today
    fetch('/api/events', opts)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.events)) {
          const today = new Date().toDateString();
          events = d.events.filter((e: any) => e?.startDate && new Date(e.startDate).toDateString() === today).length;
        }
      })
      .catch(() => {});

    return () => { clearTimeout(timer); ctrl.abort(); };
  });
</script>

<div class="inline-flex items-center font-dmmono"
  style="gap:{compact ? '10px' : '16px'}; padding:{compact ? '7px 12px' : '9px 16px'};
         background:var(--k-paper-warm); border:1.5px solid var(--k-ink); border-radius:999px;
         box-shadow:2px 2px 0 var(--k-ink); font-size:{compact ? '10px' : '11px'}; color:var(--k-ink-soft);">
  <span class="inline-flex items-center uppercase" style="gap:6px; color:var(--k-ink); font-weight:600; letter-spacing:0.08em; font-size:{compact ? '9px' : '10px'};">
    <span style="position:relative; width:8px; height:8px;">
      <span class="kh-ping" style="position:absolute; inset:0; border-radius:50%; background:var(--k-success);"></span>
      <span style="position:absolute; inset:0; border-radius:50%; background:var(--k-success);"></span>
    </span>
    {$t['auth.heartbeat.live']}
  </span>

  {#if events !== null}
    <span class="inline-flex items-center" style="gap:5px;">
      <span style="width:1px; height:12px; background:var(--k-rule);"></span>
      <b style="color:var(--k-ink); font-weight:700;">{events}</b> {$t['auth.heartbeat.events']}
    </span>
  {/if}
  {#if posts !== null}
    <span class="inline-flex items-center" style="gap:5px;">
      <span style="width:1px; height:12px; background:var(--k-rule);"></span>
      <b style="color:var(--k-ink); font-weight:700;">{posts}</b> {$t['auth.heartbeat.posts']}
    </span>
  {/if}
  {#if air !== null}
    <span class="inline-flex items-center" style="gap:5px;">
      <span style="width:1px; height:12px; background:var(--k-rule);"></span>
      {$t['auth.heartbeat.air']}: <b style="color:var(--k-ink); font-weight:700;">{air}</b>
    </span>
  {/if}
</div>

<style>
  @keyframes khPing { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.55); opacity: 0.35; } }
  .kh-ping { animation: khPing 1.8s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) { .kh-ping { animation: none; } }
</style>

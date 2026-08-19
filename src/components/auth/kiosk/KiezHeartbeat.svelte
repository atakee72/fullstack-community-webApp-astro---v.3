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

  // LQI grade → label (matches /api/kiez-air's GRADE_LABELS, grades 1–5).
  const AIR_LABELS: Record<number, string> = { 1: 'sehr gut', 2: 'gut', 3: 'mäßig', 4: 'schlecht', 5: 'sehr schlecht' };

  onMount(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const opts = { signal: ctrl.signal };

    // Single public aggregate fetch — same source as the landing strip.
    // Each segment still resolves independently: a missing row leaves its
    // stat null and the segment is omitted (ambient, never blocks paint).
    fetch('/api/kiez-heartbeat', opts)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!Array.isArray(d?.rows)) return;
        for (const row of d.rows) {
          if (row.kind === 'air' && !row.mute && typeof row.value === 'number') {
            air = AIR_LABELS[row.value] ?? null;
          }
          if (row.kind === 'forum' && typeof row.value === 'number') posts = row.value;
          if (row.kind === 'events' && typeof row.value === 'number') events = row.value;
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

<script lang="ts">
  // Kanal 02 — Alter. 7-row horizontal bar chart, bar opacity scaled to the
  // row's share of the area's largest bucket. Precise (never-wobbled)
  // vertical gridlines every 10 % across a data-aware domain (≥42 %). Spec: kiosk-kiezdaten.jsx:328-358.
  import { t, locale } from '../../../lib/kiosk-i18n';
  import { KZ_SERIES_COLORS } from '../../../lib/kiez/kiezViewModel';
  import type { KzAreaVM, KiezVM } from '../../../lib/kiez/kiezViewModel';
  import KzKanal from './KzKanal.svelte';
  import KzBar from './primitives/KzBar.svelte';
  import KzMap from './primitives/KzMap.svelte';

  let { area, vm }: { area: KzAreaVM; vm: KiezVM } = $props();

  const color = $derived(KZ_SERIES_COLORS[area.code] ?? KZ_SERIES_COLORS.all);
  const maxPct = $derived(Math.max(...area.agePct) || 1);
  // X-domain: the spec's fixed 42 % floor, widened when the data outgrows
  // it (Gesamt 27–44 hit 43,9 % with the 2025h2 sync — the bar ran past
  // the last gridline and pushed its value label off the SVG). The 0.9
  // divisor keeps ~10 % of the plot width free for the label text.
  const domain = $derived(Math.max(42, Math.ceil(maxPct / 0.9)));
  const ticks = $derived(Array.from({ length: Math.floor(domain / 10) + 1 }, (_, i) => i * 10));

  const fmtPct = (n: number) => ($locale === 'de' ? String(n).replace('.', ',') : String(n)) + ' %';
  const fmtNum = (n: number) => n.toLocaleString($locale === 'de' ? 'de-DE' : 'en-GB');
  const roundedAbs = (n: number) => Math.round(n / 10) * 10;

  function barW(pct: number): number {
    return (pct / domain) * 990;
  }
</script>

{#snippet right()}
  <KzMap size={40} accent={color} highlight={area.code} />
{/snippet}

<KzKanal nr="02" title={$t['kiez.k02.title']} area={area.name} {right}>
  <div class="rounded-2xl border-[1.5px] border-ink bg-paper-warm px-4 py-3.5 lg:px-[22px]">
    <svg viewBox="0 0 1130 258" class="w-full">
      {#each ticks as p (p)}
        <g>
          <line x1={80 + barW(p)} x2={80 + barW(p)} y1={6} y2={238} stroke="var(--k-rule)" stroke-width="0.8" />
          <text x={80 + barW(p)} y="252" text-anchor="middle" font-family="var(--k-font-mono)" font-size="10" fill="var(--k-ink-mute)">{p}%</text>
        </g>
      {/each}
      <line x1={80} y1={4} x2={80} y2={238} stroke="var(--k-ink)" stroke-width="1.2" />
      {#each area.agePct as pct, i (vm.ageLabels[i])}
        {@const w = barW(pct)}
        {@const y = i * 33 + 8}
        <text x={70} y={y + 15} text-anchor="end" font-family="var(--k-font-mono)" font-size="11.5" fill="var(--k-ink-soft)">{vm.ageLabels[i]}</text>
        <KzBar x={80} y={y + 2} w={w} h={18} seed={i + 2} {color} opacity={0.28 + 0.55 * (pct / maxPct)} />
        <text x={88 + w} y={y + 15} font-family="var(--k-font-mono)" font-size="10.5" fill="var(--k-ink)" font-weight="500">
          {fmtPct(pct)} · {fmtNum(roundedAbs(area.ageAbs[i]))}
        </text>
      {/each}
    </svg>
  </div>
</KzKanal>

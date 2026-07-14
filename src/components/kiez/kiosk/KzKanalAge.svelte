<script lang="ts">
  // Kanal 02 — Alter. 7-row horizontal bar chart, bar opacity scaled to the
  // row's share of the area's largest bucket. Precise (never-wobbled)
  // vertical gridlines at 0/10/20/30/40 %. Spec: kiosk-kiezdaten.jsx:328-358.
  import { t, locale } from '../../../lib/kiosk-i18n';
  import { KZ_SERIES_COLORS } from '../../../lib/kiez/kiezViewModel';
  import type { KzAreaVM, KiezVM } from '../../../lib/kiez/kiezViewModel';
  import KzKanal from './KzKanal.svelte';
  import KzBar from './primitives/KzBar.svelte';
  import KzMap from './primitives/KzMap.svelte';

  let { area, vm }: { area: KzAreaVM; vm: KiezVM } = $props();

  const color = $derived(KZ_SERIES_COLORS[area.code] ?? KZ_SERIES_COLORS.all);
  const maxPct = $derived(Math.max(...area.agePct) || 1);

  const fmtPct = (n: number) => ($locale === 'de' ? String(n).replace('.', ',') : String(n)) + ' %';
  const fmtNum = (n: number) => n.toLocaleString($locale === 'de' ? 'de-DE' : 'en-GB');
  const roundedAbs = (n: number) => Math.round(n / 10) * 10;

  function barW(pct: number): number {
    return (pct / 42) * 990;
  }
</script>

{#snippet right()}
  <KzMap size={40} accent={color} highlight={area.code} />
{/snippet}

<KzKanal nr="02" title={$t['kiez.k02.title']} area={area.name} {right}>
  <div class="rounded-2xl border-[1.5px] border-ink bg-paper-warm px-4 py-3.5 lg:px-[22px]">
    <svg viewBox="0 0 1130 258" class="w-full">
      {#each [0, 10, 20, 30, 40] as p (p)}
        <g>
          <line x1={80 + (p / 42) * 990} x2={80 + (p / 42) * 990} y1={6} y2={238} stroke="var(--k-rule)" stroke-width="0.8" />
          <text x={80 + (p / 42) * 990} y="252" text-anchor="middle" font-family="var(--k-font-mono)" font-size="10" fill="var(--k-ink-mute)">{p}%</text>
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

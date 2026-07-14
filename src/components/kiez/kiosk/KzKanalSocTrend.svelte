<script lang="ts">
  // Kanal 05 — Soziale Entwicklung (LOR-2021 merge). Two desktop cards: a
  // 3-indicator Gesamt trend (alq/ka/tr) and an unemployment-by-area trend
  // that keeps the pre-2021 two-Planungsraum series alive by averaging their
  // 2021+ successors — a dashed "LOR 2021" marker keeps that merge honest.
  // Null points split the polyline into sub-segments; the merge NEVER draws
  // a line across a missing data point (see splitOnNull). Mobile collapses
  // to a single Gesamt-only chart carrying the same boundary marker for
  // context, no legend, short footnote. Only mounted for plr === 'all' when
  // vm.socTrend is non-null — see KiezPageInner.svelte. Spec:
  // kiosk-kiezdaten.jsx:486-539; mobile kiosk-kiezdaten-mobile.jsx:167-183.
  //
  // Unlike sibling Kanäle (K01/K03), the VALUE axis here is data-driven, not
  // a fixed pixel formula lifted from the design seed: real pre-2021 child-
  // poverty rates run up to ~76% (the old, larger Planungsräume were
  // poorer) — far outside the JSX mock's invented 6–48% domain. A fixed
  // domain would clip real history off the top of the chart. The X axis
  // (year spacing + LOR-2021 boundary position) still ports the design's
  // exact fixed-step pixel math, since that's purely a layout constant tied
  // to the current 6-period (2013–2023) sync cadence, not a data range.
  import { t, locale } from '../../../lib/kiosk-i18n';
  import type { KiezVM } from '../../../lib/kiez/kiezViewModel';
  import KzKanal from './KzKanal.svelte';
  import KzGrid from './primitives/KzGrid.svelte';
  import KzLine from './primitives/KzLine.svelte';

  let { vm }: { vm: KiezVM } = $props();

  // Narrowed once at the mount site (KiezPageInner only renders this
  // component when vm.socTrend is non-null); re-asserted here so the
  // template doesn't need optional chaining everywhere.
  const socTrend = $derived(vm.socTrend!);
  const gesamtName = $derived(vm.areas[0]?.name ?? 'Gesamt · Schillerkiez');

  function makeToY(min: number, max: number, yTop: number, yBottom: number): (v: number) => number {
    const span = max - min || 1;
    return (v: number) => yBottom - ((v - min) / span) * (yBottom - yTop);
  }

  // Splits a merged series at nulls so KzLine never draws a segment across a
  // missing successor average — each run of consecutive non-null points
  // becomes its own polyline. A lone point flanked by gaps still renders as
  // an isolated dot (KzLine draws no segment for a 1-point array), never a
  // line reaching across the missing value.
  function splitOnNull(vals: (number | null)[]): { v: number; i: number }[][] {
    const segments: { v: number; i: number }[][] = [];
    let current: { v: number; i: number }[] = [];
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (v === null) {
        if (current.length) segments.push(current);
        current = [];
      } else {
        current.push({ v, i });
      }
    }
    if (current.length) segments.push(current);
    return segments;
  }

  // Fixed year-step layout, ported from the design's `64 + i*106` — a
  // layout constant for the current 6-period cadence, not a data range.
  const CHART_X0 = 64;
  const CHART_STEP = 106;
  function xPos(i: number): number {
    return CHART_X0 + i * CHART_STEP;
  }
  const boundaryX = $derived(CHART_X0 + (socTrend.reformBeforeIndex - 0.5) * CHART_STEP);

  const gesamtSeries = $derived.by(() => [
    { key: 'alq' as const, color: 'var(--k-teal)', vals: socTrend.gesamt.alq },
    { key: 'ka' as const, color: 'var(--k-wine)', vals: socTrend.gesamt.ka },
    { key: 'tr' as const, color: 'var(--k-ochre)', vals: socTrend.gesamt.tr },
  ]);

  const leftToY = $derived.by(() => {
    const all = [...socTrend.gesamt.alq, ...socTrend.gesamt.ka, ...socTrend.gesamt.tr];
    return makeToY(Math.min(...all), Math.max(...all), 18, 130);
  });

  const rightToY = $derived.by(() => {
    const all = socTrend.series.flatMap((s) => s.alq.filter((v): v is number => v !== null));
    if (!all.length) return makeToY(0, 1, 18, 130);
    return makeToY(Math.min(...all), Math.max(...all), 18, 130);
  });

  const rangeLabel = $derived.by(() => {
    const ys = socTrend.years;
    if (!ys.length) return '';
    const yr = (y: string) => `20${y.slice(1)}`;
    return `${yr(ys[0])}–${yr(ys[ys.length - 1])}`;
  });
</script>

{#snippet right()}
  <div class="font-dmmono text-[10.5px] text-ink-mute">{rangeLabel}</div>
{/snippet}

{#snippet gesamtChart(showBoundary: boolean, showLegend: boolean)}
  <svg viewBox="0 0 640 168" class="mt-1 w-full">
    <KzGrid x1={38} x2={620} rows={4} top={20} step={36} />
    <line x1={38} y1={10} x2={38} y2={136} stroke="var(--k-ink)" stroke-width="1.1" />
    {#if showBoundary}
      <line x1={boundaryX} y1={8} x2={boundaryX} y2={140} stroke="var(--k-ink-mute)" stroke-width="1.2" stroke-dasharray="4 4" />
      <text x={boundaryX + 6} y={18} font-family="var(--k-font-mono)" font-size="8.5" fill="var(--k-ink-mute)" letter-spacing="0.08em">LOR 2021</text>
    {/if}
    {#each gesamtSeries as s, si (s.key)}
      <KzLine pts={s.vals.map((v, i) => [xPos(i), leftToY(v)] as [number, number])} color={s.color} seed={si * 4 + 1} width={2} />
    {/each}
    {#each socTrend.years as y, i (y)}
      <text x={xPos(i)} y="158" text-anchor="middle" font-family="var(--k-font-mono)" font-size="10.5" fill="var(--k-ink-mute)">{y}</text>
    {/each}
  </svg>
  {#if showLegend}
    <div class="flex flex-wrap gap-4 font-dmmono text-[9.5px] text-ink-soft">
      <span><span class="mr-1.5 inline-block h-[3px] w-3 align-middle" style="background:var(--k-teal)"></span>{$t['kiez.k05.alq']}</span>
      <span><span class="mr-1.5 inline-block h-[3px] w-3 align-middle" style="background:var(--k-wine)"></span>{$t['kiez.k05.ka']}</span>
      <span><span class="mr-1.5 inline-block h-[3px] w-3 align-middle" style="background:var(--k-ochre)"></span>{$t['kiez.k05.tr']}</span>
    </div>
  {/if}
{/snippet}

{#snippet byAreaChart()}
  <svg viewBox="0 0 640 168" class="mt-1 w-full">
    <KzGrid x1={38} x2={620} rows={4} top={20} step={36} />
    <line x1={38} y1={10} x2={38} y2={136} stroke="var(--k-ink)" stroke-width="1.1" />
    <!-- LOR-2021 boundary -->
    <line x1={boundaryX} y1={8} x2={boundaryX} y2={140} stroke="var(--k-ink-mute)" stroke-width="1.2" stroke-dasharray="4 4" />
    <text x={boundaryX + 6} y={18} font-family="var(--k-font-mono)" font-size="8.5" fill="var(--k-ink-mute)" letter-spacing="0.08em">LOR 2021</text>
    {#each socTrend.series as s, si (s.name)}
      {@const color = si === 0 ? 'var(--k-wine)' : 'var(--k-plum)'}
      {#each splitOnNull(s.alq) as seg, gi (gi)}
        <KzLine pts={seg.map((p) => [xPos(p.i), rightToY(p.v)] as [number, number])} {color} seed={si * 5 + 3 + gi} width={2} />
      {/each}
    {/each}
    {#each socTrend.years as y, i (y)}
      <text x={xPos(i)} y="158" text-anchor="middle" font-family="var(--k-font-mono)" font-size="10.5" fill="var(--k-ink-mute)">{y}</text>
    {/each}
  </svg>
  <div class="flex flex-wrap gap-4 font-dmmono text-[9.5px] text-ink-soft">
    {#each socTrend.series as s, si (s.name)}
      <span><span class="mr-1.5 inline-block h-[3px] w-3 align-middle" style={`background:${si === 0 ? 'var(--k-wine)' : 'var(--k-plum)'}`}></span>{s.name}</span>
    {/each}
  </div>
{/snippet}

<KzKanal nr="05" title={$t['kiez.k05.title']} area={gesamtName} {right}>
  <!-- Desktop: two side-by-side cards -->
  <div class="hidden gap-[22px] lg:grid lg:grid-cols-[1fr_440px]">
    <div class="rounded-2xl border-[1.5px] border-ink bg-paper-warm px-4 py-3 lg:px-[18px]">
      <div class="font-dmmono text-[9.5px] uppercase tracking-[0.14em] text-ink-mute">{$t['kiez.k05.left']}</div>
      {@render gesamtChart(false, true)}
    </div>
    <div class="rounded-2xl border-[1.5px] border-ink bg-paper-warm px-4 py-3 lg:px-[18px]">
      <div class="font-dmmono text-[9.5px] uppercase tracking-[0.14em] text-ink-mute">{$t['kiez.k05.right']}</div>
      {@render byAreaChart()}
    </div>
  </div>

  <!-- Mobile: single simplified card (Gesamt only, boundary kept for honesty) -->
  <div class="rounded-2xl border-[1.5px] border-ink bg-paper-warm px-4 py-3 lg:hidden">
    {@render gesamtChart(true, false)}
  </div>

  <div class="mt-3 hidden font-dmmono text-[10px] leading-relaxed text-ink-mute lg:block">
    § {$t['kiez.k05.reform']}
  </div>
  <div class="mt-3 font-dmmono text-[10px] leading-relaxed text-ink-mute lg:hidden">
    § {$t['kiez.k05.reformShort']}
  </div>
</KzKanal>

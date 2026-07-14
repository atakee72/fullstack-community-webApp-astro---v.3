<script lang="ts">
  // Novel §02 — Berlin-Vergleich. Per-indicator dumbbell (alq/ka/tr): a
  // connector line spanning whichever of {Schillerkiez, Berlin, Neukölln}
  // are present, Berlin = paper dot, Neukölln = sky dot, Schillerkiez =
  // moss double-struck dot with a value label. Mounted as `children` of
  // KzKanalSocial — see that component's header comment on why it only
  // renders inside the has-social-data branch (a yardstick against absent
  // data is meaningless). The caller (KiezPageInner) additionally gates on
  // plr === 'all' and `stats.reference` being present with at least one
  // non-null scope — quietly absent otherwise, exactly like the air strip.
  // Spec: kiosk-kiezdaten-novel.jsx:146-188 (§02 KNModule).
  import { t, tStr, locale } from '../../../lib/kiosk-i18n';
  import type { KiezStatsResponse } from '../../../types/kiezStats';

  let { reference, kiezSocial }: {
    reference: NonNullable<KiezStatsResponse['reference']>;
    kiezSocial: { alq: number; ka: number; tr: number };
  } = $props();

  const fmtPct = (n: number) => ($locale === 'de' ? String(n).replace('.', ',') : String(n)) + ' %';

  type Row = { key: 'alq' | 'ka' | 'tr'; label: string; kiez: number; berlin: number | null; neukoelln: number | null };

  const rows = $derived.by((): Row[] => [
    {
      key: 'alq',
      label: $t['kiez.k04.alq'],
      kiez: kiezSocial.alq,
      berlin: reference.berlin?.unemploymentRate ?? null,
      neukoelln: reference.neukoelln?.unemploymentRate ?? null,
    },
    {
      key: 'ka',
      label: $t['kiez.k04.ka'],
      kiez: kiezSocial.ka,
      berlin: reference.berlin?.childPovertyRate ?? null,
      neukoelln: reference.neukoelln?.childPovertyRate ?? null,
    },
    {
      key: 'tr',
      label: $t['kiez.k04.tr'],
      kiez: kiezSocial.tr,
      berlin: reference.berlin?.transferBenefitRate ?? null,
      neukoelln: reference.neukoelln?.transferBenefitRate ?? null,
    },
  ]);

  // Fixed 0–42% domain, ported from the design — every real value here
  // (unemployment, child poverty, transfer-benefit shares across three
  // Berlin scopes) comfortably fits, unlike K05's historical PLR series.
  function x(v: number): number {
    return 170 + (v / 42) * 500;
  }
</script>

<div class="mt-4 border-t-[1.5px] border-dashed border-rule pt-4">
  <div class="font-dmmono text-[10px] uppercase tracking-[0.14em] text-ink-mute">
    {tStr($t['kiez.bv.title'], { period: reference.period })}
  </div>
  <div class="mt-2 rounded-2xl border-[1.5px] border-ink bg-paper px-4 py-3.5 lg:px-5">
    <svg viewBox="0 0 700 168" class="w-full">
      {#each [0, 10, 20, 30, 40] as p (p)}
        <g>
          <line x1={x(p)} x2={x(p)} y1={4} y2={146} stroke="var(--k-rule)" stroke-width="0.8" />
          <text x={x(p)} y="160" text-anchor="middle" font-family="var(--k-font-mono)" font-size="9.5" fill="var(--k-ink-mute)">{p}%</text>
        </g>
      {/each}
      {#each rows as r, i (r.key)}
        {@const y = i * 46 + 14}
        {@const xs = [x(r.kiez), ...(r.berlin !== null ? [x(r.berlin)] : []), ...(r.neukoelln !== null ? [x(r.neukoelln)] : [])]}
        <text x={160} y={y + 11} text-anchor="end" font-size="12.5" font-weight="600" font-family="var(--k-font-display)" fill="var(--k-ink)">{r.label}</text>
        <line x1={Math.min(...xs)} x2={Math.max(...xs)} y1={y + 7} y2={y + 7} stroke="var(--k-ink-mute)" stroke-width="1.6" />
        {#if r.berlin !== null}
          <circle cx={x(r.berlin)} cy={y + 7} r="5.5" fill="var(--k-paper)" stroke="var(--k-ink)" stroke-width="1.5" />
        {/if}
        {#if r.neukoelln !== null}
          <circle cx={x(r.neukoelln)} cy={y + 7} r="5.5" fill="var(--k-sky)" stroke="var(--k-ink)" stroke-width="1.5" />
        {/if}
        <circle cx={x(r.kiez) + 1.5} cy={y + 8.2} r="6.5" fill="var(--k-moss)" opacity="0.45" />
        <circle cx={x(r.kiez)} cy={y + 7} r="6.5" fill="var(--k-moss)" stroke="var(--k-ink)" stroke-width="1.6" />
        <text x={x(r.kiez)} y={y + 28} text-anchor="middle" font-family="var(--k-font-mono)" font-size="9.5" fill="var(--k-ink)" font-weight="500">{fmtPct(r.kiez)}</text>
      {/each}
    </svg>
    <div class="mt-1 flex flex-wrap gap-4 font-dmmono text-[9.5px] text-ink-soft">
      <span><span class="mr-1.5 inline-block h-[9px] w-[9px] rounded-full border border-ink bg-moss align-middle"></span>Schillerkiez</span>
      <span><span class="mr-1.5 inline-block h-[9px] w-[9px] rounded-full border border-ink bg-sky align-middle"></span>Neukölln</span>
      <span><span class="mr-1.5 inline-block h-[9px] w-[9px] rounded-full border border-ink bg-paper align-middle"></span>Berlin</span>
    </div>
  </div>
  <div class="mt-2 font-dmmono text-[10px] text-ink-mute">{$t['kiez.bv.note']}</div>
</div>

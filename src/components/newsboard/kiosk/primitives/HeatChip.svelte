<script lang="ts">
  import { locale } from '../../../../lib/kiosk-i18n';
  import { HEAT_THRESHOLD } from '../../../../lib/newsboard/newsTaxonomy';
  let { count = 0, mini = false }: { count?: number; mini?: boolean } = $props();
  const show = $derived(count >= HEAT_THRESHOLD);
  const label = $derived($locale === 'de' ? `${count}× im Forum` : `${count}× in forum`);
</script>

{#if show}
  <span
    class="inline-flex items-center font-dmmono uppercase whitespace-nowrap"
    style="gap:5px; font-size:{mini ? 9 : 10}px; font-weight:700; letter-spacing:0.08em;
           color:var(--k-ink); background:var(--news-heat-color);
           border:1px solid var(--k-ink); padding:{mini ? '1px 6px' : '2px 8px'};
           border-radius:var(--k-radius-sm); box-shadow:2px 2px 0 var(--k-ink);"
  >
    <span style="font-size:{mini ? 9 : 10}px;">♨</span>{label}
  </span>
{/if}

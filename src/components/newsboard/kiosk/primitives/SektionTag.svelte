<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import { SEKTION_TOKEN, type SektionKey } from '../../../../lib/newsboard/newsTaxonomy';
  let { id, mini = false }: { id: SektionKey; mini?: boolean } = $props();
  const token = $derived(SEKTION_TOKEN[id]);
</script>

{#if token}
  <span
    class="inline-flex items-center font-dmmono uppercase whitespace-nowrap"
    style="font-size:{mini ? 9 : 10}px; font-weight:600; letter-spacing:0.12em;
           padding:{mini ? '1px 6px' : '2px 8px'};
           background:var({token}); color:var({token}-text);
           border:1px solid var(--k-ink); border-radius:var(--k-radius-sm);"
  >{$t[`news.sektion.${id}` as keyof typeof $t]}</span>
{/if}

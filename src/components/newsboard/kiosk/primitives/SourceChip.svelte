<script lang="ts">
  import { QUELLE_META, type QuelleKey } from '../../../../lib/newsboard/newsTaxonomy';
  let { id, mini = false }: { id: QuelleKey; mini?: boolean } = $props();
  const q = $derived(QUELLE_META[id]);
</script>

{#if q}
  <span
    class="inline-flex items-center font-dmmono whitespace-nowrap"
    style="gap:5px; font-size:{mini ? 9 : 10}px; font-weight:600; letter-spacing:0.06em;
           color:var(--k-ink); border:1px solid var(--k-ink); background:var(--k-paper-warm);
           padding:{mini ? '1px 5px 1px 1px' : '2px 8px 2px 2px'}; border-radius:var(--k-radius-sm);"
  >
    <span
      style="background:var({q.token}); color:var(--k-paper); font-weight:700;
             font-size:{mini ? 8 : 9}px; padding:{mini ? '1px 4px' : '2px 5px'};
             border-radius:3px; letter-spacing:0.05em;"
    >{q.short.toUpperCase()}</span>
    <span style="text-transform:lowercase;">{q.name}</span>
  </span>
{/if}

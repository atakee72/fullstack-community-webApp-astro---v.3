<script lang="ts">
  let {
    saved = false,
    mini = false,
    disabled = false,
    onToggle = (_e: MouseEvent) => {},
  }: { saved?: boolean; mini?: boolean; disabled?: boolean; onToggle?: (e: MouseEvent) => void } = $props();
  const size = $derived(mini ? 14 : 18);
</script>

<button
  type="button"
  {disabled}
  onclick={(e) => { e.stopPropagation(); onToggle(e); }}
  class="inline-flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
  style="width:{size + 8}px; height:{size + 8}px; position:relative;
         border:1.2px solid {saved ? 'var(--k-ink)' : 'var(--k-rule)'};
         background:{saved ? 'var(--k-ink)' : 'transparent'};
         color:{saved ? 'var(--k-paper)' : 'var(--k-ink-mute)'};
         border-radius:4px; font-size:{size - 2}px; line-height:1; cursor:pointer;"
  aria-pressed={saved}
  aria-label="save"
>{saved ? '■' : '□'}<!-- invisible hit-area extender: pads the tap target to ~40px
  without growing the visible box (absolute child, no layout impact; inset is
  measured from the padding box, so the values account for the 1.2px border)
  --><span aria-hidden="true" style="position:absolute; inset:{mini ? -11 : -9}px;"></span></button>

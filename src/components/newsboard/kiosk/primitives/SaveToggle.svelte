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
  class="inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
  style="width:{size + 8}px; height:{size + 8}px;
         border:1.2px solid {saved ? 'var(--k-ink)' : 'var(--k-rule)'};
         background:{saved ? 'var(--k-ink)' : 'transparent'};
         color:{saved ? 'var(--k-paper)' : 'var(--k-ink-mute)'};
         border-radius:4px; font-size:{size - 2}px; line-height:1; cursor:pointer;"
  aria-pressed={saved}
  aria-label="save"
>{saved ? '■' : '□'}</button>

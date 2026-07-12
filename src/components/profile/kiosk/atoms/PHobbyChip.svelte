<script lang="ts">
  // Interest pill — paperSoft fill, ink border, display font. `removable`
  // adds a small ✕ button (edit state); `newlyAdded` plays the chip-pop-in
  // animation once when the chip is first mounted (freshly typed hobby).
  // Design source: kiosk-profile.jsx (PHobbyChip).

  import type { Snippet } from 'svelte';

  let {
    removable = false,
    newlyAdded = false,
    onRemove,
    children,
  }: {
    removable?: boolean;
    newlyAdded?: boolean;
    onRemove?: () => void;
    children?: Snippet;
  } = $props();
</script>

<span
  class={newlyAdded ? 'prof-chip-in' : ''}
  style="
    display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px;
    background: var(--k-paper-soft); border: 1.5px solid var(--k-ink); border-radius: 999px;
    font-family: var(--k-font-display); font-size: 12.5px; font-weight: 600;
  "
>
  {@render children?.()}
  {#if removable}
    <button
      type="button"
      onclick={onRemove}
      aria-label="entfernen"
      style="
        font-family: var(--k-font-mono); font-size: 11px; color: var(--k-ink-mute);
        background: none; border: none; padding: 0; margin: 0; line-height: 1; cursor: pointer;
      "
    >✕</button>
  {/if}
</span>

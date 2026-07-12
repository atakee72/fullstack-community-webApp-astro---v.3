<script lang="ts">
  // Card surface — same anatomy as the auth kiosk cards: paperWarm bg,
  // 1.5px ink border, 4px accent top-rule, radius 16, offset print shadow.
  // Design source: design/handoffs/design_handoff_profile/jsx/kiosk-profile.jsx
  // (PCard). `accent` drives the top-rule color; every profile card defaults
  // to ochre but PModerationCard (Task 7) overrides it per moderation standing.

  import type { Snippet } from 'svelte';

  let {
    accent = 'var(--k-ochre)',
    pad = 20,
    children,
  }: {
    accent?: string;
    pad?: number;
    children?: Snippet;
  } = $props();
</script>

<div
  style="
    background: var(--k-paper-warm);
    border: 1.5px solid var(--k-ink);
    border-top: 4px solid {accent};
    border-radius: 16px;
    box-shadow: 3px 3px 0 var(--k-ink);
    padding: {pad}px;
    position: relative;
  "
>
  {@render children?.()}
</div>

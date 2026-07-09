<script lang="ts">
  /**
   * Strike dots ●●○ — used on cards + the (future) ledger. Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:163-177.
   */
  let { n, size = 8 }: { n: number; size?: number } = $props();

  const dots = [0, 1, 2];
</script>

<span style="display: inline-flex; gap: 3px; align-items: center;">
  {#each dots as i (i)}
    <span
      style="
        width: {size}px; height: {size}px; border-radius: 50%;
        background: {i < n ? 'var(--k-danger)' : 'transparent'};
        border: 1.5px solid {i < n ? 'var(--k-danger)' : 'var(--k-rule)'};
      "
    ></span>
  {/each}
</span>

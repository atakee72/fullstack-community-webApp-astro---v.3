<script lang="ts">
  // Three-dot strike indicator — filled danger when i < strikes, else hollow.
  // Design source: kiosk-profile.jsx (PStrikeDots).

  let { strikes = 0 }: { strikes?: number } = $props();
</script>

<span style="display: inline-flex; gap: 4px; align-items: center;">
  {#each [0, 1, 2] as i (i)}
    <span
      style="
        width: 11px; height: 11px; border-radius: 50%;
        border: 1.5px solid var(--k-ink);
        background: {i < strikes ? 'var(--k-danger)' : 'transparent'};
      "
    ></span>
  {/each}
</span>

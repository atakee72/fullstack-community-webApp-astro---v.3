<script lang="ts">
  // Precise axis hairlines. Spec: kiosk-kiezdaten.jsx:116-124. NEVER wobbled —
  // the grid carries the truth, the marks carry the print.
  let { x1, x2, rows, top, step } = $props<{
    x1: number;
    x2: number;
    rows: number;
    top: number;
    step: number;
  }>();
</script>

<g>
  {#each Array.from({ length: rows }, (_, i) => top + i * step) as y, i (i)}
    <line {x1} {x2} y1={y} y2={y} stroke="var(--k-rule, #c9beA3)" stroke-width="0.8" />
  {/each}
</g>

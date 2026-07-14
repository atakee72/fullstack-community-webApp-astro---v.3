<script lang="ts">
  // Riso chart hand — wobbled polyline segments + optional data dots.
  // Spec: kiosk-kiezdaten.jsx:101-115. Dots pop in via .kz-dot-in
  // (kiez.css) once their line has drawn.
  import { kzWobLine } from '../../../../lib/kiez/kzWobble';

  let { pts, color = '#6b8a4a', seed = 3, width = 2.2, dots = true } = $props<{
    pts: [number, number][];
    color?: string;
    seed?: number;
    width?: number;
    dots?: boolean;
  }>();
</script>

<g>
  {#each pts.slice(0, -1) as p, i (i)}
    <polyline
      points={kzWobLine(p[0], p[1], pts[i + 1][0], pts[i + 1][1], seed + i, 1.4, 5)}
      fill="none"
      stroke={color}
      stroke-width={width}
    />
  {/each}
  {#if dots}
    {#each pts as p, i (i)}
      <g>
        <circle cx={p[0] + 1.5} cy={p[1] + 1.2} r="3.4" fill={color} opacity="0.45" />
        <circle
          class="kz-dot-in"
          cx={p[0]}
          cy={p[1]}
          r="3.4"
          fill="var(--k-paper-warm)"
          stroke="var(--k-ink)"
          stroke-width="1.4"
        />
      </g>
    {/each}
  {/if}
</g>

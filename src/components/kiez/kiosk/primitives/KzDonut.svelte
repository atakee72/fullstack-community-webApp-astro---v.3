<script lang="ts">
  // Double-struck riso donut (ghost 0.4-opacity ring + 0.85-opacity ring)
  // plus two precise ink rings. Spec: kiosk-kiezdaten.jsx:362-383.
  let { segs, size = 148 } = $props<{
    segs: { v: number; c: string }[];
    size?: number;
  }>();

  const C = 2 * Math.PI * 40;

  const arcs = $derived.by(() => {
    let off = 0;
    return segs.map((s: { v: number; c: string }) => {
      const dash = (s.v / 100) * C;
      const arc = { color: s.c, dash, gap: C - dash, offset: -off };
      off += dash;
      return arc;
    });
  });
</script>

<svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
  {#each arcs as a, i (i)}
    <g>
      <circle
        cx="61.5"
        cy="61.2"
        r="40"
        fill="none"
        stroke={a.color}
        stroke-width="17"
        opacity="0.4"
        stroke-dasharray={`${a.dash} ${a.gap}`}
        stroke-dashoffset={a.offset}
        transform="rotate(-90 61.5 61.2)"
      />
      <circle
        cx="60"
        cy="60"
        r="40"
        fill="none"
        stroke={a.color}
        stroke-width="17"
        opacity="0.85"
        stroke-dasharray={`${a.dash} ${a.gap}`}
        stroke-dashoffset={a.offset}
        transform="rotate(-90 60 60)"
      />
    </g>
  {/each}
  <circle cx="60" cy="60" r="30.5" fill="none" stroke="var(--k-ink)" stroke-width="1.2" />
  <circle cx="60" cy="60" r="49.5" fill="none" stroke="var(--k-ink)" stroke-width="1.2" />
</svg>

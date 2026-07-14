<script lang="ts">
  // Mini PLR mini-map. Spec: kiosk-kiezdaten-explore.jsx:46-62 (KDMap) —
  // polygons come from the real LOR-2021 shapes, imported (not inlined).
  import { PLR_PATHS, PLR_VIEWBOX } from '../../plrPaths';

  let { size = 64, accent = '#6b8a4a', highlight = 'all' } = $props<{
    size?: number;
    accent?: string;
    highlight?: string;
  }>();

  const [vbW, vbH] = PLR_VIEWBOX.split(' ').slice(2).map(Number);
</script>

<svg viewBox={PLR_VIEWBOX} width={size} height={(size * vbH) / vbW} aria-hidden="true">
  {#each Object.entries(PLR_PATHS) as [code, d] (code)}
    <path
      {d}
      fill={highlight === 'all' || highlight === code ? accent : 'var(--k-paper-soft)'}
      opacity={highlight === 'all' || highlight === code ? 0.8 : 1}
      stroke="var(--k-ink)"
      stroke-width="1.6"
    />
  {/each}
</svg>

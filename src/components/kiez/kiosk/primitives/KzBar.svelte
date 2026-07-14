<script lang="ts">
  // Riso chart hand — ghost fill (offset copy) behind a precise ink outline.
  // Spec: kiosk-kiezdaten.jsx:93-100. Grows from the axis via .kz-bar-in
  // (kiez.css) when its Kanal first scrolls into view.
  import { kzWobRect } from '../../../../lib/kiez/kzWobble';

  let { x, y, w, h, seed, color = '#6b8a4a', opacity = 0.42 } = $props<{
    x: number;
    y: number;
    w: number;
    h: number;
    seed: number;
    color?: string;
    opacity?: number;
  }>();
</script>

<g class="kz-bar-in">
  <path d={kzWobRect(x + 2, y + 1.6, w, h, seed)} fill={color} {opacity} />
  <path d={kzWobRect(x, y, w, h, seed + 7)} fill="none" stroke="var(--k-ink)" stroke-width="1.5" />
</g>

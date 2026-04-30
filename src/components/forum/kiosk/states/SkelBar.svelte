<script lang="ts">
  // Skeleton primitive — a single shimmer bar.
  //
  // Used by SkelCard and ForumIndexSkeleton to compose loading states.
  // Reuses `.k-skeleton` (defined in styles/motion.css) for the shimmer
  // animation, so the keyframe lives in one place across the app.
  //
  // `dark` flips the tint for skeletons rendered on the ink-bg
  // announcement card — without it, the bars would disappear against
  // the dark surface.

  let {
    w = '100%',
    h = 12,
    mb = 6,
    dark = false
  } = $props<{
    w?: string | number;
    h?: number;
    mb?: number;
    dark?: boolean;
  }>();

  const widthCss = $derived(typeof w === 'number' ? `${w}px` : w);

  // Dark-on-ink variant: brighter bar + brighter shimmer so the bones
  // of the announcement card stay visible during loading.
  const darkStyle =
    'background: rgba(243,234,216,0.12); background-image: linear-gradient(90deg, transparent 0%, rgba(243,234,216,0.18) 50%, transparent 100%);';
</script>

<span
  class="block rounded-sm k-skeleton"
  style={`width: ${widthCss}; height: ${h}px; margin-bottom: ${mb}px;${
    dark ? ' ' + darkStyle : ''
  }`}
  aria-hidden="true"
></span>

<script lang="ts">
  import { resolveCategory } from '../../../../lib/marketplaceResolvers';
  import { optimizeCloudinary } from '../../../../utils/cloudinary';

  let {
    category,
    ratio = '4/3',
    label = '',
    lead = false,
    src = null,
    alt = '',
  }: {
    category?: string | null;
    ratio?: string;
    label?: string;
    lead?: boolean;
    /** When provided, renders the image on top of the riso-stripe placeholder.
        The stripes show through during load + on transparent edges of the image. */
    src?: string | null;
    alt?: string;
  } = $props();

  const resolved = $derived(resolveCategory(category));
  // Use the resolved CSS variable (or inkMute fallback for legacy).
  const colorVar = $derived(resolved.token ?? '--k-ink-mute');

  const stripeAngle = $derived(lead ? 30 : 45);
  const stripeWidth = $derived(lead ? 14 : 10);
  const stripeGap = $derived(lead ? 28 : 20);
  const padding = $derived(lead ? '18px' : '10px');
  const fontSize = $derived(lead ? '11px' : '9.5px');

  const imgUrl = $derived(src ? optimizeCloudinary(src) : null);
</script>

<div
  style="
    width: 100%;
    aspect-ratio: {ratio};
    border-radius: var(--k-radius-md);
    border: var(--k-border-ink);
    background: repeating-linear-gradient({stripeAngle}deg, color-mix(in srgb, var({colorVar}) 20%, transparent) 0 {stripeWidth}px, var(--k-paper-warm) {stripeWidth}px {stripeGap}px);
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    padding: {padding};
    font-family: var(--k-font-mono);
    font-size: {fontSize};
    color: var(--k-ink-mute);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    position: relative;
    overflow: hidden;
  "
>
  {#if imgUrl}
    <img
      src={imgUrl}
      alt={alt}
      loading="lazy"
      style="
        position: absolute; inset: 0;
        width: 100%; height: 100%;
        object-fit: cover;
        border-radius: calc(var(--k-radius-md) - 1px);
      "
    />
  {/if}
  {#if label && !imgUrl}
    <span style="background: var(--k-paper); padding: 2px 6px; border: 1px solid var(--k-rule); border-radius: 4px;">{label}</span>
  {/if}
</div>

<script lang="ts">
  import { resolveCategory } from '../../../../lib/marketplaceResolvers';

  let {
    category,
    ratio = '4/3',
    label = '',
    lead = false,
  }: {
    category?: string | null;
    ratio?: string;
    label?: string;
    lead?: boolean;
  } = $props();

  const resolved = $derived(resolveCategory(category));
  // Use the resolved CSS variable (or inkMute fallback for legacy).
  const colorVar = $derived(resolved.token ?? '--k-ink-mute');

  const stripeAngle = $derived(lead ? 30 : 45);
  const stripeWidth = $derived(lead ? 14 : 10);
  const stripeGap = $derived(lead ? 28 : 20);
  const padding = $derived(lead ? '18px' : '10px');
  const fontSize = $derived(lead ? '11px' : '9.5px');
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
  "
>
  {#if label}
    <span style="background: var(--k-paper); padding: 2px 6px; border: 1px solid var(--k-rule); border-radius: 4px;">{label}</span>
  {/if}
</div>

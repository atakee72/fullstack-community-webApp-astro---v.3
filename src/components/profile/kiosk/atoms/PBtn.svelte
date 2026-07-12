<script lang="ts">
  // Profile pill button — anatomy verbatim from kiosk-profile.jsx (PBtn):
  // primary = ink fill / paper text + ochre print shadow; plain = outline;
  // danger = danger-outline. Renders an <a> when `href` is set (mirrors
  // KioskBtn) so state §10's "anmelden" CTA can link to /login.

  import type { Snippet } from 'svelte';

  let {
    primary = false,
    danger = false,
    small = false,
    disabled = false,
    href,
    type = 'button',
    onclick,
    children,
  }: {
    primary?: boolean;
    danger?: boolean;
    small?: boolean;
    disabled?: boolean;
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  } = $props();

  const padding = $derived(small ? '6px 14px' : '9px 18px');
  const fontSize = $derived(small ? '12.5px' : '13.5px');
  const background = $derived(danger ? 'transparent' : primary ? 'var(--k-ink)' : 'transparent');
  const color = $derived(danger ? 'var(--k-danger)' : primary ? 'var(--k-paper)' : 'var(--k-ink)');
  const border = $derived(danger ? '1.5px solid var(--k-danger)' : '1.5px solid var(--k-ink)');
  const boxShadow = $derived(primary ? '2px 2px 0 var(--k-ochre)' : 'none');
  const style = $derived(
    `padding: ${padding}; background: ${background}; color: ${color}; border: ${border}; ` +
    `border-radius: 999px; font-family: var(--k-font-display); font-size: ${fontSize}; font-weight: 700; ` +
    `box-shadow: ${boxShadow}; cursor: ${disabled ? 'not-allowed' : 'pointer'}; opacity: ${disabled ? 0.45 : 1}; ` +
    `display: inline-flex; align-items: center; justify-content: center; text-decoration: none;`
  );
</script>

{#if href && !disabled}
  <a {href} {style}>{@render children?.()}</a>
{:else}
  <button {type} {disabled} {onclick} {style}>{@render children?.()}</button>
{/if}

<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    href,
    onclick,
    children,
    class: extraClass = ''
  } = $props<{
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    href?: string;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
    class?: string;
  }>();

  const sizeClass = $derived({
    sm: 'px-3 py-1 text-xs',
    md: 'px-5 py-2 text-sm',
    lg: 'px-7 py-3 text-base'
  }[size]);

  // Stacked print-shadow signature: --k-shadow-md = 4px 4px 0 wine
  // Hover lifts the surface and grows the shadow; active settles it back.
  const lift =
    'shadow-[2px_2px_0_var(--k-wine)] hover:shadow-[3px_3px_0_var(--k-wine)] active:shadow-[1px_1px_0_var(--k-wine)] hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px';

  const variantClass = $derived({
    primary:   `bg-ink text-paper hover:bg-ink-soft border-2 border-ink ${lift}`,
    secondary: `bg-paper text-ink border-2 border-ink hover:bg-paper-warm ${lift}`,
    ghost:     'bg-transparent text-ink hover:bg-paper-warm border-2 border-transparent'
  }[variant]);

  const baseClass =
    'inline-flex items-center justify-center font-bricolage font-semibold rounded-full transition-all duration-[180ms] ease-out disabled:opacity-50 disabled:cursor-not-allowed select-none';
</script>

{#if href}
  <a {href} class={`${baseClass} ${sizeClass} ${variantClass} ${extraClass}`}>
    {@render children()}
  </a>
{:else}
  <button {type} {disabled} {onclick} class={`${baseClass} ${sizeClass} ${variantClass} ${extraClass}`}>
    {@render children()}
  </button>
{/if}

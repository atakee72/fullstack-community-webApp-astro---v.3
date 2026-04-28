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
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    href?: string;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
    class?: string;
  }>();

  // Padding tightened to match canvas proportions (less vertical heft).
  const sizeClass = $derived({
    sm: 'px-3 py-0.5 text-xs',
    md: 'px-4 py-1 text-sm',
    lg: 'px-6 py-2 text-base'
  }[size]);

  // Stacked print shadow — primary uses wine offset (signature look).
  // Idle lift = 2px; hover grows to 3px; active settles to 1px (button "presses in").
  const liftWine =
    'shadow-[2px_2px_0_var(--k-wine)] hover:shadow-[3px_3px_0_var(--k-wine)] active:shadow-[1px_1px_0_var(--k-wine)] hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px';

  // Danger uses ink offset (wine button can't have wine shadow).
  const liftInk =
    'shadow-[2px_2px_0_var(--k-ink)] hover:shadow-[3px_3px_0_var(--k-ink)] active:shadow-[1px_1px_0_var(--k-ink)] hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px';

  // Secondary's shadow appears only on hover/active — keeps idle outlined buttons clean.
  const liftWineHoverOnly =
    'hover:shadow-[2px_2px_0_var(--k-wine)] active:shadow-[1px_1px_0_var(--k-wine)] hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px';

  const variantClass = $derived({
    primary:   `bg-ink text-paper hover:bg-ink-soft border-2 border-ink ${liftWine}`,
    secondary: `bg-paper text-ink border-2 border-ink hover:bg-paper-warm ${liftWineHoverOnly}`,
    ghost:     'bg-transparent text-ink hover:bg-paper-warm border-2 border-transparent',
    danger:    `bg-danger text-paper border-2 border-danger ${liftInk}`
  }[variant]);

  // Lighter weight (medium) reads cleaner at small sizes than semibold.
  const baseClass =
    'inline-flex items-center justify-center font-bricolage font-medium rounded-full transition-all duration-[180ms] ease-out disabled:opacity-50 disabled:cursor-not-allowed select-none';
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

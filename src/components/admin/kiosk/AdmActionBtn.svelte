<script lang="ts">
  /**
   * Review-action button (approve / warn / danger / outline). Transcribed
   * from design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:179-196.
   * printSm(c) → `2px 2px 0 <c>` (defaults to ink; danger uses ink offset
   * per the JSX's k.shadow.printSm()).
   */
  import type { Snippet } from 'svelte';

  let {
    variant = 'outline',
    small = false,
    disabled = false,
    onclick,
    children,
  }: {
    variant?: 'approve' | 'warn' | 'danger' | 'outline';
    small?: boolean;
    disabled?: boolean;
    onclick: () => void;
    children?: Snippet;
  } = $props();

  const styleMap = {
    approve: { bg: 'transparent', fg: 'var(--k-success)', b: 'var(--k-success)', sh: 'none' },
    warn: { bg: 'transparent', fg: 'var(--k-warn)', b: 'var(--k-warn)', sh: 'none' },
    danger: { bg: 'var(--k-danger)', fg: 'var(--k-paper)', b: 'var(--k-ink)', sh: '2px 2px 0 var(--k-ink)' },
    outline: { bg: 'transparent', fg: 'var(--k-ink)', b: 'var(--k-ink)', sh: 'none' },
  } as const;

  const s = $derived(styleMap[variant]);
</script>

<button
  {disabled}
  onclick={disabled ? undefined : onclick}
  class="font-bricolage"
  style="
    background: {s.bg}; color: {s.fg}; border: 1.5px solid {s.b};
    border-radius: var(--k-radius-pill); padding: {small ? '6px 13px' : '8px 16px'};
    font-size: {small ? '12px' : '13px'}; font-weight: 700;
    box-shadow: {s.sh}; cursor: {disabled ? 'not-allowed' : 'pointer'};
    opacity: {disabled ? 0.5 : 1};
  "
>{@render children?.()}</button>

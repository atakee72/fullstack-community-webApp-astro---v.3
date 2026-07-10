<script lang="ts">
  /**
   * Shared modal scaffold for admin decision flows (reject / Ban-Bremse /
   * future warning modal). Transcribed from
   * design/handoffs/design_handoff_admin/jsx/kiosk-admin-flows.jsx:36-46
   * (AdmModalCard) — dimmed backdrop + paper-warm card with a colored
   * top-rule + print shadow (k.shadow.print(accent) → `3px 3px 0 accent`,
   * k.border.inkBold → 2px solid ink, mapped to var(--k-border-ink)).
   *
   * Scroll-lock/backdrop/Escape pattern mirrors
   * src/components/forum/kiosk/KioskReportModal.svelte conceptually — this
   * shell renders as a plain `fixed inset-0` div (not a native <dialog>,
   * per the brief) so scroll-lock is done manually via
   * `document.body.style.overflow`, same technique as
   * src/components/blog/ImageGallery.svelte's lightbox.
   *
   * Mount-lifetime = open-state: the parent conditionally renders this
   * component (`{#if item}`) rather than passing an `open` boolean, so
   * onMount/onDestroy map cleanly to modal open/close.
   */
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  let {
    accent = 'var(--k-danger)',
    width = 560,
    onClose,
    children,
  }: {
    accent?: string;
    width?: number;
    onClose: () => void;
    children?: Snippet;
  } = $props();

  onMount(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="adm-modal-backdrop"
  style="position: fixed; inset: 0; z-index: var(--k-z-modal); background: rgba(27,26,23,0.28); display: flex; align-items: center; justify-content: center; padding: 24px;"
  onclick={handleBackdropClick}
  role="presentation"
>
  <div
    class="adm-modal-card"
    role="dialog"
    aria-modal="true"
    style="
      width: min(92vw, {width}px); max-height: calc(100dvh - 48px); overflow-y: auto;
      background: var(--k-paper-warm); border: var(--k-border-ink);
      border-top: 5px solid {accent}; border-radius: var(--k-radius-lg);
      box-shadow: 3px 3px 0 {accent}; padding: 24px 28px; position: relative;
    "
  >
    {@render children?.()}
  </div>
</div>

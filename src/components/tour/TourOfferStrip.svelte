<script lang="ts">
  // Entrance 2 — chapter-scoped offer strip. Rendered by TourController in
  // normal document flow (layout slot, below KioskNav — v1 deviation from
  // the "under the page title" handoff placement, see tour/CLAUDE.md).
  // Shown once per chapter (chapter unseen), independent of the hello modal
  // (which is signed-in only — this is the logged-out entrance too).
  import { t } from '../../lib/kiosk-i18n';

  // `page` matches TourController's exact prop contract (chapter.page) —
  // accepted for interface parity / possible future per-page copy, not
  // rendered in v1 (the copy is deliberately generic: "this page").
  let { page, onStart, onDismiss } = $props<{
    page: string;
    onStart: () => void;
    onDismiss: () => void;
  }>();

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closing = $state(false);

  function dismiss() {
    if (closing) return;
    if (reduced) { onDismiss(); return; }
    closing = true;
    setTimeout(onDismiss, 140);
  }
</script>

<div class="tour-offer" class:tour-offer-closing={closing} data-tour-page={page}>
  <div class="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex items-center gap-3">
    <span class="tour-offer-kicker font-dmmono">{$t['tour.offer.kicker']}</span>
    <span class="tour-offer-text truncate">{$t['tour.offer.text']}</span>
    <button class="tour-offer-start font-dmmono" onclick={onStart}>{$t['tour.offer.start']}</button>
    <button class="tour-offer-x font-dmmono" onclick={dismiss} aria-label={$t['tour.chrome.close']}>✕</button>
  </div>
</div>

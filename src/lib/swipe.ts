// Horizontal swipe → prev/next, as a Svelte action. Dependency-pure.
//
//   <div use:swipeX={{ onLeft: goNext, onRight: goPrev }}>
//
// Touch/pen only (mouse drags are text selection / desktop drag-select).
// A swipe counts when the horizontal travel beats `threshold` AND clearly
// exceeds the vertical travel, so normal page scrolling is never hijacked;
// a tap (no travel) still reaches the element's own click handlers.
// The action sets `touch-action: pan-y` on the node (restored on destroy):
// with horizontal panning allowed (auto/manipulation) mobile browsers fire
// `pointercancel` after the first sideways pointermove and claim the touch
// as a native pan, so the pointerup with the travel never arrives (found
// 2026-09-12 on device, reproduced headlessly). Vertical scrolling stays
// native. Ancestor/descendant touch-action values intersect, so a child's
// `manipulation` can't re-enable horizontal panning under this node.

export interface SwipeXOptions {
  onLeft?: () => void;   // finger moved left → "next"
  onRight?: () => void;  // finger moved right → "previous"
  threshold?: number;    // px, default 60
  ignore?: () => boolean; // true at pointerup → this gesture is someone else's (e.g. a live drag-select)
}

export function swipeX(node: HTMLElement, options: SwipeXOptions) {
  let opts = options;
  let startX = 0;
  let startY = 0;
  let pointerId: number | null = null;

  function onDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
  }
  function onUp(e: PointerEvent) {
    if (pointerId === null || e.pointerId !== pointerId) return;
    pointerId = null;
    // Asked at pointerup, not pointerdown: a drag-select only becomes one
    // 450 ms into the press, long after our onDown ran.
    if (opts.ignore?.()) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const threshold = opts.threshold ?? 60;
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) opts.onLeft?.();
    else opts.onRight?.();
  }
  function onCancel() { pointerId = null; }

  const prevTouchAction = node.style.touchAction;
  node.style.touchAction = 'pan-y';
  node.addEventListener('pointerdown', onDown, { passive: true });
  node.addEventListener('pointerup', onUp, { passive: true });
  node.addEventListener('pointercancel', onCancel, { passive: true });
  return {
    update(next: SwipeXOptions) { opts = next; },
    destroy() {
      node.style.touchAction = prevTouchAction;
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onCancel);
    },
  };
}

// Svelte action — pair with `.kiosk-scroll-fade` in global.css.
// Reads overflow / scroll position and writes data-scroll-left and
// data-scroll-right on the host node. CSS attribute selectors then
// apply the edge-fade mask. Cleans up listeners on destroy.
//
// Self-disables when the host has no box (e.g. display: contents on
// desktop): scrollWidth / clientWidth read 0, the overflowing check
// returns false, and both attrs stay "false" — no fade applies.

export function scrollFade(node: HTMLElement) {
  const update = () => {
    const overflowing = node.scrollWidth > node.clientWidth + 1;
    node.dataset.scrollLeft =
      overflowing && node.scrollLeft > 1 ? 'true' : 'false';
    node.dataset.scrollRight =
      overflowing &&
      node.scrollLeft + node.clientWidth < node.scrollWidth - 1
        ? 'true'
        : 'false';
  };

  update();
  node.addEventListener('scroll', update, { passive: true });
  const ro = new ResizeObserver(update);
  ro.observe(node);

  return {
    destroy() {
      node.removeEventListener('scroll', update);
      ro.disconnect();
    }
  };
}

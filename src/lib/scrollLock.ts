// Page scroll-lock for overlays that don't get it from the platform.
// Dependency-pure (browser globals only) — safe to import from any island.
//
// Why this exists: a native <dialog> opened with showModal() makes the page
// INERT but does NOT stop it from scrolling (wheel/touch on the backdrop
// still moves the document — verified 2026-09-09, Chromium, 390×844). The
// React modals get this from react-remove-scroll; the Svelte native-dialog
// modals call lockPageScroll() while open.
//
// Must lock <html> AND <body>: global.css sets `html { overflow-x: clip }`
// (the sticky fix), which stops body overflow from propagating to the
// viewport, so a body-only `overflow: hidden` is a silent no-op here.
// Inline styles are saved and restored so the stylesheet's `clip` survives.
// The scrollbar gutter is compensated on <body> so desktop content doesn't
// jump sideways when the scrollbar disappears.

export function lockPageScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  const html = document.documentElement;
  const body = document.body;
  const prev = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
  };
  const gutter = window.innerWidth - html.clientWidth;
  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  if (gutter > 0) body.style.paddingRight = `${gutter}px`;
  return () => {
    html.style.overflow = prev.htmlOverflow;
    body.style.overflow = prev.bodyOverflow;
    body.style.paddingRight = prev.bodyPaddingRight;
  };
}

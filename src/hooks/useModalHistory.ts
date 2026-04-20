import { useEffect, useRef } from 'react';

/**
 * Back-button-closes-modal UX, compatible with Astro ViewTransitions.
 *
 * When the modal is open, we push a dummy history entry so the next popstate
 * (browser back, iOS Safari swipe-back, Android back gesture) closes the modal
 * instead of navigating away. On programmatic close (X / Esc / backdrop), we
 * unwind by calling history.back() so we don't leave dummy entries behind.
 *
 * Astro compat note:
 *   Astro's ClientRouter listens for popstate and performs a full reload on
 *   unrecognized manual history entries (issue withastro/astro#13943, open
 *   since Jun 2025, unfixed). We work around this by registering our listener
 *   in the capture phase and calling stopImmediatePropagation(), so Astro's
 *   bubble-phase listener never runs for our pushed entries.
 *
 *   If Astro ever fixes #13943 (e.g. ships `history.pushState({ astro: { ignore: true } })`
 *   or `astro:before-popstate`), this hook can be simplified. Until then, the
 *   capture-phase hijack is the only reliable pattern.
 *
 * Nested modals: each instance tags its pushed entry with a unique id and
 * tracks itself in a module-level stack. Only the top-of-stack modal responds
 * to popstate, so back closes the topmost first.
 */

// Shared stack so nested modals close in correct order (topmost first).
// Each entry is the modal instance's unique id; the last-pushed id is "on top".
const modalStack: string[] = [];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useModalHistory(isOpen: boolean, onClose: () => void) {
  const idRef = useRef<string | null>(null);
  const pushedRef = useRef(false);
  // Remember the latest onClose without re-running the effect every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;

    // Strict-Mode-safe: only push once per open cycle.
    if (pushedRef.current) return;

    const id = uid();
    idRef.current = id;
    pushedRef.current = true;
    modalStack.push(id);

    try {
      window.history.pushState({ __modal: id }, '');
    } catch {
      // Cross-origin or other edge-case failure — bail silently, modal still works via X/Esc.
      modalStack.pop();
      pushedRef.current = false;
      idRef.current = null;
      return;
    }

    const handlePopState = (e: PopStateEvent) => {
      // Only the topmost modal responds (prevents a single back from closing nested modals).
      if (modalStack[modalStack.length - 1] !== id) return;

      // Stop Astro's ClientRouter popstate handler from running and triggering a full reload.
      e.stopImmediatePropagation();

      // Pop ourselves from the stack and reset local refs *before* onClose, so if the
      // parent's onClose synchronously unmounts us, the cleanup below sees a clean state.
      modalStack.pop();
      pushedRef.current = false;
      idRef.current = null;

      onCloseRef.current();
    };

    // Capture phase + stopImmediatePropagation = wins against Astro's bubble-phase listener.
    window.addEventListener('popstate', handlePopState, { capture: true });

    return () => {
      window.removeEventListener('popstate', handlePopState, { capture: true });

      // If modal is closing but our history entry is still pushed (X/Esc/backdrop path),
      // unwind it so the back-stack stays clean.
      if (pushedRef.current && idRef.current) {
        const closingId = idRef.current;
        // Remove ourselves from the stack first so the popstate-from-history.back()
        // above doesn't re-enter and double-close.
        const idx = modalStack.lastIndexOf(closingId);
        if (idx !== -1) modalStack.splice(idx, 1);
        pushedRef.current = false;
        idRef.current = null;

        // Only call history.back() if our entry is actually on top of the browser stack.
        // If something else pushed after us (edge case), we skip to avoid popping theirs.
        if (window.history.state?.__modal === closingId) {
          try {
            window.history.back();
          } catch {
            // Ignore — the entry will expire harmlessly on next navigation.
          }
        }
      }
    };
  }, [isOpen]);
}

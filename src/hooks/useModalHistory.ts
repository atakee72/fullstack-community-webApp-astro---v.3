import { useEffect, useRef } from 'react';

/**
 * Back-button-closes-modal UX, compatible with Astro ViewTransitions.
 *
 * When the modal is open, we push a dummy history entry so the next popstate
 * (browser back, iOS swipe-back, Android back gesture) closes the modal
 * instead of navigating away. On programmatic close (X / Esc / backdrop), we
 * unwind by calling history.back() so we don't leave dummy entries behind.
 *
 * Astro compat:
 *   Astro's ClientRouter handles popstate and, by default, performs a full
 *   swap on manual history entries. We use the officially documented pattern
 *   (withastro/astro#13943 resolved 2025-06-22): intercept
 *   `astro:before-preparation` for traverse+back nav, then no-op both the
 *   loader and the `astro:before-swap` so the current page stays as-is.
 *
 * Nested modals: each instance pushes a tagged entry onto a module-level
 * stack. A single module-level listener handles back navigation and pops
 * the topmost modal first (so ReportModal over ReadMoreModal closes in the
 * expected order).
 */

type StackEntry = {
  id: string;
  onClose: () => void;
  /** Set to true when the parent component closes the modal programmatically
   *  (X / Esc / backdrop), so our back-nav handler skips calling onClose again. */
  closing: boolean;
};

const modalStack: StackEntry[] = [];
let listenerInstalled = false;

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function installListener() {
  if (listenerInstalled || typeof document === 'undefined') return;
  listenerInstalled = true;

  document.addEventListener('astro:before-preparation', (event: any) => {
    // Only intercept back navigations (browser back, iOS swipe-back, Android gesture).
    if (event.navigationType !== 'traverse' || event.direction !== 'back') return;
    if (modalStack.length === 0) return;

    // Cancel Astro's page swap — current DOM stays as-is, just the modal closes.
    event.loader = async () => {};
    document.addEventListener(
      'astro:before-swap',
      (swapEvent: any) => {
        swapEvent.swap = async () => {};
      },
      { once: true }
    );

    // Pop the topmost modal from our stack.
    const top = modalStack.pop();
    if (!top) return;

    // If this back nav was triggered by a programmatic close (X/Esc/backdrop),
    // the parent already invoked onClose — skip to avoid a double call.
    if (!top.closing) {
      top.onClose();
    }
  });
}

export function useModalHistory(isOpen: boolean, onClose: () => void) {
  const idRef = useRef<string | null>(null);
  // Keep a fresh ref to onClose so the stack entry always calls the latest one.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    installListener();

    // Strict-Mode-safe: only push once per open cycle.
    if (idRef.current) return;

    const id = uid();
    idRef.current = id;
    const entry: StackEntry = {
      id,
      onClose: () => onCloseRef.current(),
      closing: false,
    };
    modalStack.push(entry);

    try {
      window.history.pushState({ __modal: id }, '');
    } catch {
      // Cross-origin / sandbox edge case — bail out, modal still works via X/Esc.
      const idx = modalStack.indexOf(entry);
      if (idx !== -1) modalStack.splice(idx, 1);
      idRef.current = null;
      return;
    }

    return () => {
      // Cleanup path: modal was programmatically closed (X/Esc/backdrop, or unmount).
      const closingId = idRef.current;
      idRef.current = null;
      if (!closingId) return;

      const entryIdx = modalStack.findIndex((e) => e.id === closingId);
      if (entryIdx === -1) {
        // Already popped by the back-nav handler — nothing to do.
        return;
      }

      // Mark closing so the back-nav handler won't invoke onClose again.
      modalStack[entryIdx].closing = true;

      // Unwind our pushed history entry only if it's still on top of the browser stack.
      if (window.history.state?.__modal === closingId) {
        try {
          window.history.back();
          // history.back() will fire astro:before-preparation async, which pops
          // the entry from modalStack and cancels Astro's page swap.
        } catch {
          // Fallback: just drop our stack entry.
          modalStack.splice(entryIdx, 1);
        }
      } else {
        // Something else is on top (shouldn't normally happen) — clean up our entry manually.
        modalStack.splice(entryIdx, 1);
      }
    };
  }, [isOpen]);
}

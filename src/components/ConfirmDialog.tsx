import { useEffect, useRef, useCallback } from 'react';

interface ConfirmDetail {
  message: string;
  resolve: (value: boolean) => void;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}

export default function ConfirmDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const detailRef = useRef<ConfirmDetail | null>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback((value: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleConfirmEvent = (e: Event) => {
      const detail = (e as CustomEvent<ConfirmDetail>).detail;

      // If a confirm is already open, resolve it with false
      if (resolveRef.current) {
        resolveRef.current(false);
      }

      resolveRef.current = detail.resolve;
      detailRef.current = detail;

      // Update DOM imperatively to avoid re-renders
      if (titleRef.current) {
        titleRef.current.textContent = detail.title || 'Are you sure?';
      }
      if (messageRef.current) {
        messageRef.current.textContent = detail.message;
      }
      if (confirmBtnRef.current) {
        confirmBtnRef.current.textContent = detail.confirmLabel || 'Confirm';
        // Update button color based on variant
        const isDanger = detail.variant === 'danger';
        confirmBtnRef.current.className = isDanger
          ? 'px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
          : 'px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2';
      }
      if (cancelBtnRef.current) {
        cancelBtnRef.current.textContent = detail.cancelLabel || 'Cancel';
      }

      dialog.showModal();
      // Focus the cancel button (safe action)
      cancelBtnRef.current?.focus();
    };

    // Native dialog cancel event (Esc key)
    const handleCancel = (e: Event) => {
      e.preventDefault();
      dismiss(false);
    };

    window.addEventListener('app:confirm', handleConfirmEvent);
    dialog.addEventListener('cancel', handleCancel);

    return () => {
      window.removeEventListener('app:confirm', handleConfirmEvent);
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [dismiss]);

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      className="fixed inset-0 z-[9999] m-auto p-0 border-0 rounded-xl shadow-2xl bg-white max-w-sm w-[calc(100%-2rem)] backdrop:bg-black/50"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === dialogRef.current) dismiss(false);
      }}
    >
      <div className="p-0">
        {/* Header */}
        <div className="bg-[#814256] px-5 py-3 rounded-t-xl">
          <h2
            ref={titleRef}
            id="confirm-title"
            className="text-white font-semibold text-base"
          >
            Are you sure?
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p
            ref={messageRef}
            id="confirm-message"
            className="text-gray-700 text-sm leading-relaxed"
          >
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 pb-4">
          <button
            ref={cancelBtnRef}
            onClick={() => dismiss(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            onClick={() => dismiss(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Confirm
          </button>
        </div>
      </div>
    </dialog>
  );
}

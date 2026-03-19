type ToastType = 'success' | 'error' | 'info' | 'warning' | 'message';

interface ToastDetail {
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

export function showToast(message: string, options?: Partial<Omit<ToastDetail, 'message'>>) {
  window.dispatchEvent(
    new CustomEvent('app:toast', {
      detail: { type: 'message', ...options, message } satisfies ToastDetail,
    })
  );
}

export function showSuccess(message: string, description?: string) {
  showToast(message, { type: 'success', description });
}

export function showError(message: string, description?: string) {
  showToast(message, { type: 'error', description });
}

export function confirmAction(message: string, options?: {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}): Promise<boolean> {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent('app:confirm', {
        detail: { message, resolve, ...options },
      })
    );
  });
}

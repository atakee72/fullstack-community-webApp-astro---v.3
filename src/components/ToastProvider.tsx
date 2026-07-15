import { Toaster, toast } from 'sonner';
import { useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';

export default function ToastProvider() {
  useEffect(() => {
    const handler = (e: Event) => {
      const { type, message, description, duration, action } = (e as CustomEvent).detail;
      const opts = { description, duration, action };
      switch (type) {
        case 'success': toast.success(message, opts); break;
        case 'error':   toast.error(message, opts); break;
        case 'warning': toast.warning(message, opts); break;
        case 'info':    toast.info(message, opts); break;
        default:        toast(message, opts);
      }
    };
    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, []);

  return (
    <>
      <Toaster
        position="bottom-center"
        theme="light"
        // Bottom-center keeps the toast near where the action happens — top
        // toasts were missed when the trigger (e.g. "als Entwurf sichern") sits
        // at the bottom of a long form. mobileOffset clears the fixed bottom-nav
        // (~48px) so the toast isn't hidden behind it on small screens.
        offset={{ bottom: '24px' }}
        mobileOffset={{ bottom: '80px' }}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: 'kiosk-toast',
            title: 'kiosk-toast__title',
            description: 'kiosk-toast__desc',
            success: 'kiosk-toast--success',
            error: 'kiosk-toast--error',
            warning: 'kiosk-toast--warning',
            info: 'kiosk-toast--info',
            closeButton: 'kiosk-toast__close',
            actionButton: 'kiosk-toast__action'
          }
        }}
      />
      <ConfirmDialog />
    </>
  );
}

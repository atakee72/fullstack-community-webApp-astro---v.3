import { Toaster, toast } from 'sonner';
import { useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';

export default function ToastProvider() {
  useEffect(() => {
    const handler = (e: Event) => {
      const { type, message, description, duration } = (e as CustomEvent).detail;
      const opts = { description, duration };
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
      <Toaster position="top-center" richColors toastOptions={{ style: { fontFamily: 'inherit' } }} />
      <ConfirmDialog />
    </>
  );
}

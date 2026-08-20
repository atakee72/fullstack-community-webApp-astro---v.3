/**
 * Client-side push helpers for the notification panel's opt-in UI.
 * DEPENDENCY-PURE (browser APIs only) — bundled into the KioskNav island.
 *
 * The service worker is registered LAZILY (at opt-in / state detection),
 * never at page load: registration persists across sessions once done, and
 * push wakes the SW regardless of open pages.
 */

const VAPID_PUBLIC_KEY = import.meta.env.PUBLIC_VAPID_PUBLIC_KEY as string | undefined;

export type PushUiState = 'hidden' | 'ios-install' | 'denied' | 'subscribed' | 'ready';

function supported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!VAPID_PUBLIC_KEY
  );
}

function isIOS(): boolean {
  // iPadOS 13+ reports as Mac — the maxTouchPoints check catches it.
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

/** What the foot slot should render right now. */
export async function detectPushState(): Promise<PushUiState> {
  // iOS Safari exposes the Push API only inside a home-screen-installed PWA —
  // an uninstalled iOS visitor sees the install hint, not a dead button.
  if (isIOS() && !isStandalone()) return supported() ? 'ready' : 'ios-install';
  if (!supported()) return 'hidden';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return sub ? 'subscribed' : 'ready';
  } catch {
    return 'ready';
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Register SW, request permission, subscribe, persist server-side. */
export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!supported()) return false;
    await navigator.serviceWorker.register('/sw.js');
    // subscribe() needs an ACTIVE worker — a freshly registered one is still
    // installing, and subscribing against it throws InvalidStateError.
    const reg = await navigator.serviceWorker.ready;
    // Must run inside the user gesture that triggered this call.
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
    });
    const r = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });
    if (!r.ok) {
      // Server rejected — don't leave a dangling browser subscription.
      await sub.unsubscribe().catch(() => {});
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Best-effort teardown: server row first, then the browser subscription. */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  } catch {
    /* best-effort */
  }
}

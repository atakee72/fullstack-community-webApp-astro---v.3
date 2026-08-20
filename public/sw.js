/**
 * Mahalle service worker — PUSH ONLY.
 * Deliberately NO fetch handler and NO caching (locked decision 2026-08-06):
 * live community content + auth-gated SSR = stale-cache misery. This worker
 * exists solely so web push can wake it. Do not add offline features here.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* malformed payload → generic notification below */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Mahalle', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { href: data.href || '/forum' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || '/forum';
  event.waitUntil(
    (async () => {
      // No fetch handler → pages are uncontrolled; must includeUncontrolled.
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          await w.focus();
          // navigate() rejects on clients this SW doesn't control (e.g. a
          // hard-reloaded tab) — swallow it; a focused window still wins.
          if ('navigate' in w) await w.navigate(href).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(href);
    })(),
  );
});

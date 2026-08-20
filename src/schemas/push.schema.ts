import { z } from 'zod';

/**
 * SSRF guard: the server later POSTs (VAPID-signed) to whatever endpoint is
 * stored here, so an unconstrained URL would be a blind SSRF primitive from
 * the fra1 function to any https host a member names. Browser push services
 * are a known finite set — allowlist their hosts. An unknown/self-hosted
 * push service is rejected at subscribe time (client shows the error toast);
 * extending the list is a one-line change if a real browser ever needs it.
 */
const PUSH_SERVICE_HOSTS_EXACT = new Set([
  'fcm.googleapis.com', // Chromium family (Chrome, Edge, Brave, Samsung Internet, …)
  'android.googleapis.com', // legacy GCM
  'updates.push.services.mozilla.com', // Firefox
  'web.push.apple.com', // Safari 16+
]);
const PUSH_SERVICE_HOST_SUFFIXES = [
  '.push.services.mozilla.com',
  '.web.push.apple.com',
  '.notify.windows.com', // legacy Edge (WNS)
];

function isAllowedPushEndpoint(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    return (
      PUSH_SERVICE_HOSTS_EXACT.has(h) ||
      PUSH_SERVICE_HOST_SUFFIXES.some((s) => h.endsWith(s))
    );
  } catch {
    return false;
  }
}

/** Body of POST /api/push/subscribe — PushSubscription.toJSON() shape.
 *  expirationTime is sent by browsers but unused; unknown keys are stripped. */
export const PushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2048).refine(isAllowedPushEndpoint, 'unsupported push service'),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

/** Unsubscribe only deletes the caller's own DB row (no outbound request),
 *  so legacy/odd endpoints must stay deletable — no allowlist here. */
export const PushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});

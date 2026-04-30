/**
 * Browser online/offline detection — Svelte writable store.
 *
 * Subscribers receive a boolean: `true` when the browser reports a network
 * connection, `false` when the `offline` event fires. SSR-safe: when there
 * is no `window`, the store initialises to `true` (assume online) so server
 * renders never show the offline banner.
 *
 * Usage:
 *   import { online } from '../lib/onlineStore';
 *   ...
 *   {#if !$online}
 *     <OfflineBanner />
 *   {/if}
 */

import { writable } from 'svelte/store';

function readInitial(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export const online = writable<boolean>(readInitial());

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => online.set(true));
  window.addEventListener('offline', () => online.set(false));
}

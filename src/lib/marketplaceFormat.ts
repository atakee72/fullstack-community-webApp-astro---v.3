// src/lib/marketplaceFormat.ts
// Pure formatting helpers for marketplace listings. Safe for server + client.

import type { Locale } from './kiosk-i18n';

export function formatRelativeTime(input: Date | string, locale: Locale): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const now = new Date();
  const ms = now.getTime() - date.getTime();
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(ms / 86_400_000);

  if (minutes < 1) return locale === 'de' ? 'gerade eben' : 'just now';
  if (minutes < 60) return locale === 'de' ? `vor ${minutes} Min.` : `${minutes} min ago`;
  if (hours < 24)   return locale === 'de' ? `vor ${hours} Std.` : `${hours}h ago`;
  if (days < 7)     return locale === 'de'
    ? `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
    : `${days} day${days === 1 ? '' : 's'} ago`;

  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return '·';
  return name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

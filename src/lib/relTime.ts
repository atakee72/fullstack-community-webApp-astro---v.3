// Short kiosk relative time — „vor 5 min" / "5 min ago", „vor 3 std" / "3h ago",
// „vor 2 t" / "2d ago", older → „12. Sep" / "12 Sep". Dependency-pure; one home
// for the copies that lived in ForumPostCard, ForumPostDetail and the
// ForumIndexInner pin bars (2026-09-11).
import type { Locale } from './kiosk-i18n';

export function relTime(input: string | number | Date | null | undefined, locale: Locale, now = Date.now()): string {
  if (input == null || input === '') return '';
  const ts = input instanceof Date ? input.getTime() : new Date(input).getTime();
  if (Number.isNaN(ts)) return '';
  const de = locale === 'de';
  const min = Math.floor((now - ts) / 60_000);
  if (min < 1) return de ? 'gerade eben' : 'just now';
  if (min < 60) return de ? `vor ${min} min` : `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return de ? `vor ${hr} std` : `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return de ? `vor ${day} t` : `${day}d ago`;
  return new Date(ts).toLocaleDateString(de ? 'de-DE' : 'en-GB', { day: '2-digit', month: 'short' });
}

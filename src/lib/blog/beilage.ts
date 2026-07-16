// „Die Beilage" — pure derivation helpers for the kiosk blog surface.
// Client-safe: imported by Svelte islands AND .astro frontmatter.
// All derivations run over the serialized BeilagePost shape, never
// over CollectionEntry (keeps this file dependency-pure).

export type BlogLocale = 'de' | 'en';

export interface BeilagePost {
  id: string;
  title: string;
  description: string;
  pubDateISO: string;            // ISO 8601
  tags: string[];
  layout: 'standard' | 'hero' | 'gallery';
  minutes: number;               // Lesezeit, precomputed at serialization
  cover?: string;                // processed asset URL (image().src)
  coverAlt?: string;
}

/** Lesezeit: word count / 200 wpm, minimum 1 (novel §01). */
export function readingMinutes(body: string): number {
  const words = body
    .replace(/^import .*$/gm, '')      // MDX import lines don't count
    .replace(/[#>*_`\[\]()!-]/g, ' ')  // light markdown strip
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const dateFmt = (locale: BlogLocale) =>
  new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin',
  });

/**
 * DE „8. Apr 2025" · EN „8 Apr 2025".
 * Month abbreviations: dots stripped AND truncated to 3 chars — German
 * ICU yields „März"/„Juni"/„Sept.", the design uses „Mär"/„Jun"/„Sep"
 * (en-GB also yields „Sept" on some ICU builds).
 */
const shortMonth = (raw: string) => raw.replace(/\./g, '').slice(0, 3);

export function fmtDate(iso: string, locale: BlogLocale): string {
  const parts = dateFmt(locale).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const month = shortMonth(get('month'));
  return locale === 'de'
    ? `${get('day')}. ${month} ${get('year')}`
    : `${get('day')} ${month} ${get('year')}`;
}

/** Uppercased kicker variant: „8. APR 2025" / „8 APR 2025". */
export function fmtDateKicker(iso: string, locale: BlogLocale): string {
  return fmtDate(iso, locale).toUpperCase();
}

/** Archive row label: „APR 2025" / „MÄR 2025" (3-char month, both locales). */
export function fmtMonthLabel(iso: string, locale: BlogLocale): string {
  const parts = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    month: 'short', year: 'numeric', timeZone: 'Europe/Berlin',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${shortMonth(get('month')).toUpperCase()} ${get('year')}`;
}

/** Grouping key, e.g. '2025-04' (Europe/Berlin). */
export function monthKey(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', timeZone: 'Europe/Berlin',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}`;
}

export interface MonthGroup { key: string; iso: string; count: number; }

/** Month groups, newest first. Only months WITH posts (never empty rows). */
export function monthGroups(posts: BeilagePost[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const p of posts) {
    const key = monthKey(p.pubDateISO);
    const g = map.get(key);
    if (g) g.count += 1;
    else map.set(key, { key, iso: p.pubDateISO, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export interface RelatedItem { post: BeilagePost; shared: string[]; }

/**
 * Novel §02 Rubrik-Rail: rank = count of shared tags, exclude self, max 3.
 * Ties and zero-shared fill: newest first. Zero-shared items get shared: []
 * (rendered as ZULETZT ERSCHIENEN).
 */
export function relatedFor(currentId: string, posts: BeilagePost[], max = 3): RelatedItem[] {
  const current = posts.find((p) => p.id === currentId);
  if (!current) return [];
  return posts
    .filter((p) => p.id !== currentId)
    .map((post) => ({ post, shared: post.tags.filter((t) => current.tags.includes(t)) }))
    .sort((a, b) =>
      b.shared.length - a.shared.length ||
      b.post.pubDateISO.localeCompare(a.post.pubDateISO))
    .slice(0, max);
}

/** [tag, count] pairs, count desc then alpha. */
export function tagCounts(posts: BeilagePost[]): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const p of posts) for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** № n/N: 1-based rank in ascending pubDate order (Decision 10). */
export function rankOf(id: string, posts: BeilagePost[]): { no: number; of: number } {
  const asc = [...posts].sort((a, b) => a.pubDateISO.localeCompare(b.pubDateISO));
  return { no: asc.findIndex((p) => p.id === id) + 1, of: asc.length };
}

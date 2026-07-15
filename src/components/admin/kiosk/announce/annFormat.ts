// Amtliche Mitteilungen — pure formatting helpers for AnnCard/AnnounceApp.
// No server imports (mongodb/fs/etc.) — this module is imported by a
// client:only="svelte" island, see root CLAUDE.md "Server-only modules
// bleeding into client bundles".
//
// Date formatters build from `Intl.DateTimeFormat#formatToParts` rather
// than raw `.format()` — the raw locale output carries commas/periods
// the kiosk design doesn't want (e.g. de-DE gives "Mi., 22. Jul." with a
// trailing period on the month abbreviation; formatToParts lets us pick
// only the parts we want and compose them ourselves).

export type AnnLang = 'DE' | 'EN';

/** True while the item's pin is live. At most one item satisfies this at
 * any time (server invariant enforced by the displacement update on
 * create/PATCH) — callers render that one under the "board" section and
 * everything else under "archive". */
export function isPinned(item: { pinnedUntil?: string | Date | null }): boolean {
  return !!item.pinnedUntil && new Date(item.pinnedUntil).getTime() > Date.now();
}

const BERLIN = { timeZone: 'Europe/Berlin' } as const;

function parts(iso: string, lang: AnnLang, opts: Intl.DateTimeFormatOptions) {
  const p = new Intl.DateTimeFormat(lang === 'DE' ? 'de-DE' : 'en-GB', { ...BERLIN, ...opts }).formatToParts(
    new Date(iso)
  );
  const get = (t: string) => p.find((x) => x.type === t)?.value.replace(/\./g, '') ?? '';
  return get;
}

// design: DE „MI 22. JUL" — weekday day. month; EN "WED JUL 22" — weekday month day
export function fmtPinDate(iso: string, lang: AnnLang): string {
  const get = parts(iso, lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const s =
    lang === 'DE' ? `${get('weekday')} ${get('day')}. ${get('month')}` : `${get('weekday')} ${get('month')} ${get('day')}`;
  return s.toUpperCase();
}

// design: DE „Di 15. Jul · 08:10"; EN "Tue Jul 15 · 08:10" — NOT uppercased
export function fmtCreated(iso: string, lang: AnnLang): string {
  const get = parts(iso, lang, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const date =
    lang === 'DE' ? `${get('weekday')} ${get('day')}. ${get('month')}` : `${get('weekday')} ${get('month')} ${get('day')}`;
  return `${date} · ${get('hour')}:${get('minute')}`;
}

// design: DE „DIENSTAG 15. JULI · 09:15"; EN "TUESDAY JULY 15 · 09:15" — live
// clock, uses the current time at call time (kicker line, re-derive on an
// interval like AdmTitleBlock does).
export function fmtKickerDate(lang: AnnLang): string {
  const nowIso = new Date().toISOString();
  const get = parts(nowIso, lang, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const date =
    lang === 'DE' ? `${get('weekday')} ${get('day')}. ${get('month')}` : `${get('weekday')} ${get('month')} ${get('day')}`;
  return `${date} · ${get('hour')}:${get('minute')}`.toUpperCase();
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

// Forum index view state ⇄ URL query. Dependency-pure (no DOM, no Svelte)
// so the island can import it and it can be unit-tested with node:test.
//
//   ?kind=discussion|announcement|recommendation|mine   (absent = all)
//   ?tag=garten                                         (absent = none)
//   ?more=2                                             (revealed pages, absent = 1)
//
// 'saved' is deliberately NOT a URL kind: the pill routes to /bookmarks.
// Params are omitted at their defaults; params this helper doesn't own
// (e.g. just_posted) pass through untouched.

export type IndexKind = 'all' | 'discussion' | 'announcement' | 'recommendation' | 'mine';

export interface IndexUrlState {
  kind: IndexKind;
  tag: string | null;
  pages: number;
}

const KINDS: ReadonlySet<string> = new Set(['discussion', 'announcement', 'recommendation', 'mine']);

export function parseIndexState(search: string): IndexUrlState {
  const params = new URLSearchParams(search);
  const rawKind = params.get('kind') ?? '';
  const kind: IndexKind = KINDS.has(rawKind) ? (rawKind as IndexKind) : 'all';
  const rawTag = (params.get('tag') ?? '').trim().replace(/^#/, '');
  const tag = rawTag.length ? rawTag : null;
  const more = Math.floor(Number(params.get('more')));
  const pages = Number.isFinite(more) && more >= 2 ? more : 1;
  return { kind, tag, pages };
}

export function serializeIndexState(state: IndexUrlState, currentHref: string): string {
  const url = new URL(currentHref);
  const p = url.searchParams;
  if (state.kind === 'all') p.delete('kind'); else p.set('kind', state.kind);
  if (state.tag) p.set('tag', state.tag); else p.delete('tag');
  if (state.pages >= 2) p.set('more', String(state.pages)); else p.delete('more');
  return url.toString();
}

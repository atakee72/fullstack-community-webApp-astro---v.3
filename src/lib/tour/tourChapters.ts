import type { ChapterKey } from './tourStore';

export interface TourStop { anchor: string; titleKey: string; bodyKey: string; }
export interface TourChapter {
  key: ChapterKey; page: string; kickerKey: string;
  stops: TourStop[]; endNoteKey: string; nextChapterKey: string; nextChapterHref: string;
}

// v1: Forum only. The other 6 chapters are confirm-before-code (design review
// pending) — add them here once their copy is approved. Safe anchors only:
// chrome + top-level controls, never the n-th card (handoff, non-negotiable).
export const CHAPTERS_BY_PAGE: Record<string, TourChapter> = {
  forum: {
    key: 'forum',
    page: 'forum',
    kickerKey: 'tour.forum.kicker',
    stops: [
      { anchor: '[data-tour="forum-filter-discussion"]',     titleKey: 'tour.forum.s1.title', bodyKey: 'tour.forum.s1.body' },
      { anchor: '[data-tour="forum-filter-announcement"]',   titleKey: 'tour.forum.s2.title', bodyKey: 'tour.forum.s2.body' },
      { anchor: '[data-tour="forum-filter-recommendation"]', titleKey: 'tour.forum.s3.title', bodyKey: 'tour.forum.s3.body' },
      { anchor: '[data-tour="forum-filter-saved"]',          titleKey: 'tour.forum.s4.title', bodyKey: 'tour.forum.s4.body' },
      { anchor: '[data-tour="forum-filter-mine"]',           titleKey: 'tour.forum.s5.title', bodyKey: 'tour.forum.s5.body' },
      { anchor: '[data-tour="forum-tag"]',                   titleKey: 'tour.forum.s6.title', bodyKey: 'tour.forum.s6.body' },
      { anchor: '[data-tour="forum-new-topic"]',             titleKey: 'tour.forum.s7.title', bodyKey: 'tour.forum.s7.body' },
    ],
    endNoteKey: 'tour.forum.end.note',
    nextChapterKey: 'tour.forum.end.next',
    nextChapterHref: '/calendar',
  },
};

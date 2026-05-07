// Calendar category catalogue — single source of truth used by every
// kiosk-calendar component. Tailwind needs FULL class names at parse time,
// so we expose pre-baked class strings here rather than templating
// `bg-${color}` at the call site (which would tree-shake the colors away).
//
// CD's spec:
//   kiez        wine   ◆   text-paper on fill
//   oeffentlich teal   ▲   text-paper on fill
//   markt       ochre  ●   text-ink   on fill (ochre is bright)
//   kultur      plum   ✦   text-paper on fill
//   sport       moss   ▶   text-paper on fill
//   privat      ink-soft ◇ text-paper on fill

import type { EventCategory } from '../../types';

export const CATEGORY_ORDER: EventCategory[] = [
  'kiez',
  'oeffentlich',
  'markt',
  'kultur',
  'sport',
  'privat'
];

export interface CategoryStyle {
  glyph: string;
  bgClass: string;          // background fill (active filter pill, event pill)
  textClass: string;        // text in this color (outline state)
  borderClass: string;      // border in this color
  textOnFill: 'text-paper' | 'text-ink';
}

export const CATEGORIES: Record<EventCategory, CategoryStyle> = {
  kiez: {
    glyph: '◆',
    bgClass: 'bg-wine',
    textClass: 'text-wine',
    borderClass: 'border-wine',
    textOnFill: 'text-paper'
  },
  oeffentlich: {
    glyph: '▲',
    bgClass: 'bg-teal',
    textClass: 'text-teal',
    borderClass: 'border-teal',
    textOnFill: 'text-paper'
  },
  markt: {
    glyph: '●',
    bgClass: 'bg-ochre',
    textClass: 'text-ochre',
    borderClass: 'border-ochre',
    textOnFill: 'text-ink'
  },
  kultur: {
    glyph: '✦',
    bgClass: 'bg-plum',
    textClass: 'text-plum',
    borderClass: 'border-plum',
    textOnFill: 'text-paper'
  },
  sport: {
    glyph: '▶',
    bgClass: 'bg-moss',
    textClass: 'text-moss',
    borderClass: 'border-moss',
    textOnFill: 'text-paper'
  },
  privat: {
    glyph: '◇',
    bgClass: 'bg-ink-soft',
    textClass: 'text-ink-soft',
    borderClass: 'border-ink-soft',
    textOnFill: 'text-paper'
  }
};

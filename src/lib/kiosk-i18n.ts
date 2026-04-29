/**
 * Kiosk i18n — dictionary-based, two locales (de · en), reactive via svelte/store.
 *
 * Why a writable store and not a Svelte 5 rune?
 *   The same module is imported by multiple Svelte islands (KioskNav,
 *   KioskFooter, ForumPostCard…) which each hydrate independently. A `$state`
 *   rune is scoped to its component instance — every island would get its own
 *   copy. A writable store is module-scoped and shared across all subscribers.
 *
 * Persistence: locale survives reloads via localStorage. Default = 'de'
 * (canvas language). On SSR there is no window, so the server always emits
 * the default; the client may briefly flash if a returning EN user lands
 * on a freshly-rendered page (acceptable until we add a cookie pipeline).
 */

import { writable, derived } from 'svelte/store';

export type Locale = 'de' | 'en';

const STORAGE_KEY = 'kiosk-locale';

function readInitial(): Locale {
  if (typeof localStorage === 'undefined') return 'de';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' ? 'en' : 'de';
  } catch {
    return 'de';
  }
}

export const locale = writable<Locale>(readInitial());

if (typeof window !== 'undefined') {
  locale.subscribe((v) => {
    try {
      localStorage.setItem(STORAGE_KEY, v);
      // Reflect on the <html lang> attribute so screen readers + browser UI
      // (translate prompts, hyphenation rules) match the active locale.
      if (document?.documentElement) document.documentElement.lang = v;
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  });
}

export function setLocale(l: Locale) {
  locale.set(l);
}

export function toggleLocale() {
  locale.update((l) => (l === 'de' ? 'en' : 'de'));
}

// ─────────────────────────────────────────────────────────────────────────
// Dictionaries — flat keys, namespaced with `area.key`.
// Add new keys to BOTH dictionaries; the type below enforces parity.
// ─────────────────────────────────────────────────────────────────────────

const de = {
  // brand
  'brand.name': 'mahalle',
  'brand.tagline': 'mahalle · forum',

  // top nav
  'nav.forum': 'Forum',
  'nav.calendar': 'Kalender',
  'nav.marketplace': 'Markt',
  'nav.news': 'News',
  'nav.kiez': 'Kiez',
  'nav.blog': 'Blog',

  // bottom mobile nav (compact)
  'nav.short.forum': 'forum',
  'nav.short.calendar': 'kal.',
  'nav.short.news': 'news',
  'nav.short.marketplace': 'markt',
  'nav.short.kiez': 'kiez',

  // forum page
  'forum.title': 'Was reden wir heute?',
  'forum.subtitle': 'Diskussionen aus deinem Kiez.',
  'forum.cta.newTopic': '+ neues thema',
  'forum.cta.readMore': 'mehr laden',

  // post type chips
  'chip.discussion': 'Diskussion',
  'chip.recommendation': 'Empfehlung',
  'chip.announcement': 'Ankündigung',

  // status badges
  'status.approved': 'veröffentlicht',
  'status.pending': 'in prüfung',
  'status.rejected': 'abgelehnt',
  'status.flagged': 'ai-markiert',
  'status.reported': 'gemeldet',
  'status.warning': 'mit hinweis',

  // footer
  'footer.copyright': '© {year} Ercan Atak — Mahalle.',
  'footer.licensedUnder': 'Lizenziert unter',
  'footer.license': 'PolyForm Noncommercial 1.0.0',

  // sandbox
  'sandbox.title': 'Editorial Kiosk',
  'sandbox.subtitle': 'Sandbox für die atomaren Komponenten. Visuelle Treue prüfen, bevor sie ins Forum übernommen werden.'
} as const;

type Dict = typeof de;

const en: Dict = {
  'brand.name': 'mahalle',
  'brand.tagline': 'mahalle · forum',

  'nav.forum': 'Forum',
  'nav.calendar': 'Calendar',
  'nav.marketplace': 'Market',
  'nav.news': 'News',
  'nav.kiez': 'Kiez',
  'nav.blog': 'Blog',

  'nav.short.forum': 'forum',
  'nav.short.calendar': 'cal.',
  'nav.short.news': 'news',
  'nav.short.marketplace': 'market',
  'nav.short.kiez': 'kiez',

  'forum.title': 'What are we talking about today?',
  'forum.subtitle': 'Conversations from your neighborhood.',
  'forum.cta.newTopic': '+ new topic',
  'forum.cta.readMore': 'load more',

  'chip.discussion': 'Discussion',
  'chip.recommendation': 'Recommendation',
  'chip.announcement': 'Announcement',

  'status.approved': 'published',
  'status.pending': 'in review',
  'status.rejected': 'rejected',
  'status.flagged': 'ai-flagged',
  'status.reported': 'reported',
  'status.warning': 'with notice',

  'footer.copyright': '© {year} Ercan Atak — Mahalle.',
  'footer.licensedUnder': 'Licensed under',
  'footer.license': 'PolyForm Noncommercial 1.0.0',

  'sandbox.title': 'Editorial Kiosk',
  'sandbox.subtitle': 'Sandbox for the atomic components. Verify visual fidelity here before wiring them into the Forum.'
};

export const dictionaries: Record<Locale, Dict> = { de, en };

/**
 * Reactive dictionary — `$t['nav.forum']` in a Svelte template re-renders
 * when the locale changes.
 */
export const t = derived(locale, ($locale) => dictionaries[$locale]);

/**
 * Variable interpolation. Replaces `{key}` placeholders with values.
 *   tStr($t['footer.copyright'], { year: 2026 })  →  "© 2026 Ercan Atak — Mahalle."
 */
export function tStr(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

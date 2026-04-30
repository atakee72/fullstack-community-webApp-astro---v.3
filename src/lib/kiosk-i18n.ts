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
  'brand.location': 'SCHILLERKIEZ · NEUKÖLLN',

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
  // The title carries an italic Instrument-Serif accent word, so it ships
  // as three pieces. Use `forum.title` for plain-text contexts (meta tags).
  'forum.title': 'Was reden wir heute?',
  'forum.title.prefix': 'Was',
  'forum.title.accent': 'reden',
  'forum.title.suffix': 'wir heute?',
  'forum.cta.newTopic': '+ neues thema',
  'forum.cta.readMore': 'mehr laden',

  // forum stats — counters above the filter bar
  'forum.stats.topics': 'Themen',
  'forum.stats.new': 'neu seit gestern',
  'forum.stats.active': 'aktiv jetzt',

  // forum filters
  'filter.all': 'Alle',
  'filter.discussion': 'Diskussion',
  'filter.announcement': 'Ankündigung',
  'filter.recommendation': 'Empfehlung',
  'filter.saved': 'Gespeichert',
  'filter.mine': 'Meine',
  'filter.tagsLabel': 'TAGS',

  // pinned block + post-card straps
  'pinned.banner.label': 'OFFIZIELLE ANKÜNDIGUNG · KIEZRAT',
  'pinned.banner.tag': 'ANGEHEFTET',
  'card.strap.recommendation': '✦ EMPFEHLUNG AUS DEM KIEZ',
  'card.cta.read': 'lesen',
  'card.saved': 'saved',
  'role.team': 'MAHALLE-TEAM',

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

  // detail page — breadcrumb + replies header + engagement strip
  'detail.crumb.live': 'live',
  'detail.crumb.reading': 'mitlesend',
  'detail.replies.heading.one': 'Antwort',
  'detail.replies.heading.other': 'Antworten',
  'detail.replies.newest': 'neueste zuerst',
  'detail.replies.unread': '{n} ungelesen',
  'detail.engagement.thanks': 'danke',
  'detail.engagement.replies': 'antworten',
  'detail.engagement.saved': 'gespeichert',
  'detail.share': 'teilen',
  'detail.report': 'melden',
  'detail.verified': 'VERIFIZIERT IM KIEZ',
  'detail.memberSince': 'seit {year}',

  // detail page — right rail sidebar
  'detail.people.heading': 'WER MITREDET',
  'detail.related.heading': 'ÄHNLICHE THEMEN',
  'detail.compose.heading': 'DEINE ANTWORT',
  'detail.compose.placeholder': 'Schreib was Hilfreiches…',
  'detail.compose.attach': 'anhang',
  'detail.compose.submit': 'antworten',
  'detail.compose.modNote':
    'Antworten werden automatisch geprüft (KI + Nachbarschaft). Sei direkt, sei freundlich.',
  'detail.trust.quote':
    '„Mahalle ist kein Forum für anonyme Wut. Jede Stimme hat eine Adresse — manchmal wörtlich."',
  'detail.composeLogin': 'Anmelden, um mitzudiskutieren.',
  'detail.empty.replies': 'Noch keine Antworten — sei die erste.',

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
  'brand.location': 'SCHILLERKIEZ · NEUKÖLLN',

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
  'forum.title.prefix': 'What are we',
  'forum.title.accent': 'talking',
  'forum.title.suffix': 'about today?',
  'forum.cta.newTopic': '+ new topic',
  'forum.cta.readMore': 'load more',

  'forum.stats.topics': 'topics',
  'forum.stats.new': 'new since yesterday',
  'forum.stats.active': 'active now',

  'filter.all': 'All',
  'filter.discussion': 'Discussion',
  'filter.announcement': 'Announcement',
  'filter.recommendation': 'Recommendation',
  'filter.saved': 'Saved',
  'filter.mine': 'Mine',
  'filter.tagsLabel': 'TAGS',

  'pinned.banner.label': 'OFFICIAL ANNOUNCEMENT · KIEZRAT',
  'pinned.banner.tag': 'PINNED',
  'card.strap.recommendation': '✦ RECOMMENDED IN THE KIEZ',
  'card.cta.read': 'read',
  'card.saved': 'saved',
  'role.team': 'MAHALLE TEAM',

  'chip.discussion': 'Discussion',
  'chip.recommendation': 'Recommendation',
  'chip.announcement': 'Announcement',

  'status.approved': 'published',
  'status.pending': 'in review',
  'status.rejected': 'rejected',
  'status.flagged': 'ai-flagged',
  'status.reported': 'reported',
  'status.warning': 'with notice',

  'detail.crumb.live': 'live',
  'detail.crumb.reading': 'reading',
  'detail.replies.heading.one': 'reply',
  'detail.replies.heading.other': 'replies',
  'detail.replies.newest': 'newest first',
  'detail.replies.unread': '{n} unread',
  'detail.engagement.thanks': 'thanks',
  'detail.engagement.replies': 'replies',
  'detail.engagement.saved': 'saved',
  'detail.share': 'share',
  'detail.report': 'report',
  'detail.verified': 'VERIFIED IN KIEZ',
  'detail.memberSince': 'since {year}',

  'detail.people.heading': "WHO'S IN",
  'detail.related.heading': 'RELATED TOPICS',
  'detail.compose.heading': 'YOUR REPLY',
  'detail.compose.placeholder': 'Write something helpful…',
  'detail.compose.attach': 'attach',
  'detail.compose.submit': 'reply',
  'detail.compose.modNote':
    'Replies are auto-screened (AI + neighbours). Be direct, be kind.',
  'detail.trust.quote':
    "“Mahalle isn't a forum for anonymous rage. Every voice has an address — sometimes literally.”",
  'detail.composeLogin': 'Sign in to join the conversation.',
  'detail.empty.replies': 'No replies yet — be the first.',

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

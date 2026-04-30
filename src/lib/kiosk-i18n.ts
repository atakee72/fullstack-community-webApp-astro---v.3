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

  // ─── Phase 4b · forum state matrix ─────────────────────────────────
  // Empty state — active filter (tag or kind) returned zero matches.
  'state.empty.filter.flourish': 'still.',
  'state.empty.filter.title': "Hier ist's gerade ruhig.",
  'state.empty.filter.body': 'Keine Beiträge mit {filter} in den letzten 30 Tagen. Magst du den Anfang machen?',
  'state.empty.filter.cta.start': '+ erstes Thema',
  'state.empty.filter.cta.clear': 'Filter zurücksetzen',
  'state.empty.filter.relatedTags': 'VERWANDTE TAGS',

  // Empty state — no posts in the database at all (true zero).
  'state.empty.zero.kicker': 'NEU IM KIEZ · TAG 01',
  'state.empty.zero.title.line1': 'Noch keine Beiträge.',
  'state.empty.zero.title.line2': 'Sei die erste Stimme.',
  'state.empty.zero.body':
    'Mahalle ist neu in Schillerkiez. Erzähl was — vom Späti um die Ecke, von einer Bauarbeit, einer Empfehlung. Andere Nachbarn werden mitlesen.',
  'state.empty.zero.cta.first': '+ erstes Thema',
  'state.empty.zero.cta.howto': "Wie funktioniert's?",

  // 503 error.
  'state.error.kicker': 'FEHLER · 503 · API NICHT ERREICHBAR',
  'state.error.title': "Da hakt's gerade.",
  'state.error.body':
    "Wir kommen gerade nicht ans Forum. Das liegt nicht an dir. Wir versuchen's gleich nochmal — oder du klickst auf neu laden.",
  'state.error.cta.reload': '↻ neu laden',

  // Offline banner. `body.cached` shows when in-memory data exists.
  'state.offline.label': 'OFFLINE',
  'state.offline.body.cached':
    'Du siehst gespeicherte Beiträge von vor {n} min. Neue Posts kommen, sobald du wieder online bist.',
  'state.offline.body.empty': 'Du bist offline — zwischengespeicherte Inhalte nicht verfügbar.',

  // Rate-limited compose (sandbox-only in 4b — wired in 5b).
  // Note: API enforces 5 per rolling 24h, not per hour as JSX implies.
  'state.rate.kicker': 'LIMIT ERREICHT · 5 BEITRÄGE / TAG',
  'state.rate.title': 'Pause für Mahalle.',
  'state.rate.body':
    'Du hast 5 Beiträge in den letzten 24 Stunden geschrieben — das ist viel! Wir geben Mahalle und allen anderen Lesenden ein bisschen Zeit.',
  'state.rate.unlocks': 'ZURÜCK ZUM POSTEN IN',
  'state.rate.coda':
    'In der Zwischenzeit: Lesen, Kommentieren, ein Beitrag merken. Auch Stille ist Teil der Nachbarschaft.',

  // Author-status banners — shown above the affected card in the feed.
  'state.own.pending.title': 'Dein Beitrag wird gerade gelesen.',
  'state.own.pending.body':
    'Während der Prüfung sehen andere Nachbar:innen den Beitrag noch nicht. Du musst nichts tun. Danach wird er freigegeben — manchmal mit Hinweis — oder nicht freigegeben.',
  'state.own.pending.note': 'nur du siehst diesen Status',
  'state.own.pending.usual': 'üblich: 30–90 sek',
  'state.own.rejected.title': 'Dein Beitrag wurde nicht freigegeben.',
  'state.own.rejected.body':
    'Andere Nachbar:innen sehen ihn nicht. Du siehst ihn weiterhin in deiner Übersicht. Wir behalten ihn intern, falls du dich an die Moderation wenden möchtest.',
  'state.own.reported.title': 'Ein Beitrag wurde von Nachbar:innen gemeldet.',
  'state.own.reported.body':
    'Während wir prüfen, ist er für andere ausgeblendet — du siehst nur, dass er existiert.',

  // Feed footer rule.
  'feed.footer.pages': '{current} / {total} SEITEN',
  'feed.footer.fresh': '↻ live · letzter post vor {n} min',
  'feed.footer.offline': '● OFFLINE · CACHED',
  'feed.footer.loading': 'LADE…',
  'feed.footer.loadMore': 'MEHR LADEN ↓',

  // sandbox
  // ─── Phase 5b · compose / edit / moderating / delete ───────────────
  // Compose form (create + edit shared sections).
  'compose.kicker': 'WORÜBER REDEN WIR HEUTE?',
  'compose.title.label': 'TITEL',
  'compose.title.placeholder': 'Was willst du teilen?',
  'compose.type.label': 'ART · WAS POSTEST DU?',
  'compose.type.discussion': 'Diskussion',
  'compose.type.discussion.hint': 'frage, problem, austausch',
  'compose.type.recommendation': 'Empfehlung',
  'compose.type.recommendation.hint': 'tipp, ort, person',
  'compose.type.announcement': 'Ankündigung',
  'compose.type.announcement.hint': 'info, hinweis, einladung',
  'compose.body.label': 'TEXT · MARKDOWN OK',
  'compose.body.placeholder': 'Schreib was Hilfreiches…',
  'compose.body.tip': 'tipp · @name erwähnt jemanden im kiez',
  'compose.images.label': 'BILDER · MAX 5',
  'compose.images.upload': 'hochladen',
  'compose.images.formats': 'JPG, PNG, WebP · ≤5 MB · alle Bilder werden geprüft',
  'compose.tags.label': 'TAGS · 1–3',
  'compose.tags.add': '+ tag',
  'compose.tags.suggested': 'vorgeschlagen:',
  'compose.preview.kicker': 'VORSCHAU · LIVE',
  'compose.preview.you': 'du',
  'compose.preview.now': 'gleich',
  'compose.moderation.kicker': 'MODERATION',
  'compose.moderation.body':
    'Dein Beitrag wird kurz auf Sprache und Inhalt geprüft, bevor er veröffentlicht wird. Die Prüfung ist anonym — keine persönlichen Daten werden verwendet, nur der Text und die Bilder.',
  'compose.cta.publish': 'veröffentlichen →',
  'compose.cta.draft': 'als Entwurf speichern',
  'compose.cta.discard': 'verwerfen',
  'compose.draft.saved': 'Entwurf wird gesichert',
  'compose.terms':
    'Indem du veröffentlichst, akzeptierst du die Kiez-Regeln. Wir sind eine Nachbarschaft, kein anonymes Board.',

  // Moderating modal — cosmetic 5-stage pipeline.
  'moderating.kicker': 'DEIN POST WIRD GEPRÜFT',
  'moderating.title.prefix': 'Wir',
  'moderating.title.accent': 'schauen',
  'moderating.title.suffix': 'kurz drüber.',
  'moderating.subtitle': 'Kurze, anonyme Prüfung. Du musst nichts tun.',
  'moderating.stage.language': 'Sprache geprüft',
  'moderating.stage.language.hint': 'TR · DE · EN',
  'moderating.stage.content': 'Inhalt geprüft',
  'moderating.stage.content.hint': 'keine Auffälligkeiten',
  'moderating.stage.context': 'Kontext-Prüfung',
  'moderating.stage.context.hint': 'läuft',
  'moderating.stage.images': 'Bilder werden geprüft',
  'moderating.stage.images.hint': 'Bild {n}/{total}',
  'moderating.stage.publish': 'Veröffentlichen',
  'moderating.stage.publish.hint': 'gleich live',
  'moderating.note':
    '✦ Im Hintergrund läuft schon der optimistische Eintrag — falls alles ok ist, ist dein Post bereits sichtbar, sobald du diesen Dialog wegklickst.',

  // Inline edit mode on the post detail page.
  'edit.banner.left': '✎ DU BEARBEITEST DEINEN POST · Änderungen werden mit „bearbeitet" markiert',
  'edit.banner.right': 'ESC = abbrechen',
  'edit.published.line': 'VERÖFFENTLICHT · vor {n} {unit} · {replies} Antworten',
  'edit.versions.label': 'VERSIONEN',
  'edit.versions.count': '{n}-mal bearbeitet',
  'edit.cta.save': 'speichern',
  'edit.cta.cancel': 'abbrechen',
  'edit.cta.delete': 'post löschen…',
  'edit.confirm.discard': 'Änderungen verwerfen?',

  // Delete-confirm card with type-to-confirm friction.
  'delete.kicker': 'POST LÖSCHEN?',
  'delete.title.prefix': 'Wirklich',
  'delete.title.accent': 'löschen',
  'delete.title.suffix': '?',
  'delete.body': '{replies} Antworten gehen verloren.',
  'delete.body.zero': 'Dieser Post wird endgültig gelöscht.',
  'delete.confirm.label': 'TIPPE „LÖSCHEN" ZUM BESTÄTIGEN',
  'delete.confirm.placeholder': 'lösch…',
  'delete.confirm.target': 'LÖSCHEN',
  'delete.cta.confirm': 'endgültig löschen',
  'delete.cta.cancel': 'abbrechen',
  'delete.friction':
    'Der Knopf links wird erst aktiv, wenn du „löschen" tippst. Bewusste Reibung — wir schützen den Thread.',

  // Static rate-limit copy (live surface — sandbox keeps the clock).
  'state.rate.body.short': '5 heute · komm morgen wieder.',

  // Live mode for the feed footer.
  'feed.footer.live': '● LIVE · post just landed',

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

  // ─── Phase 4b · forum state matrix ─────────────────────────────────
  'state.empty.filter.flourish': 'still.',
  'state.empty.filter.title': 'All quiet here.',
  'state.empty.filter.body': 'No posts tagged {filter} in the last 30 days. Want to start the conversation?',
  'state.empty.filter.cta.start': '+ start a topic',
  'state.empty.filter.cta.clear': 'clear filter',
  'state.empty.filter.relatedTags': 'RELATED TAGS',

  'state.empty.zero.kicker': 'NEW IN THE KIEZ · DAY 01',
  'state.empty.zero.title.line1': 'No posts yet.',
  'state.empty.zero.title.line2': 'Be the first voice.',
  'state.empty.zero.body':
    'Mahalle is new in Schillerkiez. Share something — about the Späti next door, a construction notice, a recommendation. Your neighbours will read.',
  'state.empty.zero.cta.first': '+ first post',
  'state.empty.zero.cta.howto': 'How it works',

  'state.error.kicker': 'ERROR · 503 · API UNREACHABLE',
  'state.error.title': "Something's stuck.",
  'state.error.body':
    "We can't reach the forum right now. Not your fault. We'll retry — or hit reload.",
  'state.error.cta.reload': '↻ reload',

  'state.offline.label': 'OFFLINE',
  'state.offline.body.cached':
    "You're viewing cached posts from {n} min ago. New posts arrive when you're back online.",
  'state.offline.body.empty': "You're offline — cached content unavailable.",

  'state.rate.kicker': 'LIMIT REACHED · 5 POSTS / DAY',
  'state.rate.title': 'Mahalle says: take a breath.',
  'state.rate.body':
    "You've made 5 posts in the last 24 hours — that's a lot! We're giving Mahalle and other readers some breathing room.",
  'state.rate.unlocks': 'POSTING UNLOCKS IN',
  'state.rate.coda':
    'Meanwhile: read, comment, bookmark. Quiet time is part of the neighborhood too.',

  'state.own.pending.title': "We're reading your post.",
  'state.own.pending.body':
    "While we review, other neighbours don't see the post yet. Nothing for you to do. Afterwards it goes live — sometimes with a notice — or it doesn't.",
  'state.own.pending.note': 'only you see this status',
  'state.own.pending.usual': 'usual: 30–90 sec',
  'state.own.rejected.title': "Your post wasn't approved.",
  'state.own.rejected.body':
    "Other neighbours can't see it. You still see it in your own view. We keep it internally in case you want to reach out to moderation.",
  'state.own.reported.title': 'A post was flagged by neighbors.',
  'state.own.reported.body':
    "While we review, it's hidden from others — you only see it exists.",

  'feed.footer.pages': '{current} / {total} PAGES',
  'feed.footer.fresh': '↻ live · last post {n} min ago',
  'feed.footer.offline': '● OFFLINE · CACHED',
  'feed.footer.loading': 'LOADING…',
  'feed.footer.loadMore': 'LOAD MORE ↓',

  // ─── Phase 5b · compose / edit / moderating / delete ───────────────
  'compose.kicker': "WHAT'S ON YOUR MIND?",
  'compose.title.label': 'TITLE',
  'compose.title.placeholder': 'What do you want to share?',
  'compose.type.label': 'TYPE · WHAT ARE YOU POSTING?',
  'compose.type.discussion': 'Discussion',
  'compose.type.discussion.hint': 'question, problem, exchange',
  'compose.type.recommendation': 'Recommendation',
  'compose.type.recommendation.hint': 'tip, place, person',
  'compose.type.announcement': 'Announcement',
  'compose.type.announcement.hint': 'info, notice, invite',
  'compose.body.label': 'BODY · MARKDOWN OK',
  'compose.body.placeholder': 'Write something helpful…',
  'compose.body.tip': 'tip · @name mentions someone in the kiez',
  'compose.images.label': 'IMAGES · MAX 5',
  'compose.images.upload': 'upload',
  'compose.images.formats': 'JPG, PNG, WebP · ≤5 MB · all images are screened',
  'compose.tags.label': 'TAGS · 1–3',
  'compose.tags.add': '+ tag',
  'compose.tags.suggested': 'suggested:',
  'compose.preview.kicker': 'PREVIEW · LIVE',
  'compose.preview.you': 'you',
  'compose.preview.now': 'now',
  'compose.moderation.kicker': 'MODERATION',
  'compose.moderation.body':
    'Your post is briefly checked for language and content before going live. The check is anonymous — no personal data is used, only the text and images.',
  'compose.cta.publish': 'publish →',
  'compose.cta.draft': 'save as draft',
  'compose.cta.discard': 'discard',
  'compose.draft.saved': 'draft auto-saved',
  'compose.terms':
    "By publishing you accept the kiez rules. We're a neighbourhood, not an anonymous board.",

  'moderating.kicker': 'YOUR POST IS BEING SCREENED',
  'moderating.title.prefix': 'One',
  'moderating.title.accent': 'moment',
  'moderating.title.suffix': 'screening.',
  'moderating.subtitle': 'Quick, anonymous screening. Nothing for you to do.',
  'moderating.stage.language': 'Language checked',
  'moderating.stage.language.hint': 'TR · DE · EN',
  'moderating.stage.content': 'Content checked',
  'moderating.stage.content.hint': 'nothing flagged',
  'moderating.stage.context': 'Context check',
  'moderating.stage.context.hint': 'running',
  'moderating.stage.images': 'Images being screened',
  'moderating.stage.images.hint': 'image {n}/{total}',
  'moderating.stage.publish': 'Publish',
  'moderating.stage.publish.hint': 'almost live',
  'moderating.note':
    "✦ Optimistic insert is already running — if everything's clean, your post is visible the moment you dismiss this dialog.",

  'edit.banner.left': '✎ YOU\'RE EDITING YOUR POST · changes are marked „edited"',
  'edit.banner.right': 'ESC = cancel',
  'edit.published.line': 'PUBLISHED · {n} {unit} ago · {replies} replies',
  'edit.versions.label': 'VERSION HISTORY',
  'edit.versions.count': 'edited {n} times',
  'edit.cta.save': 'save',
  'edit.cta.cancel': 'cancel',
  'edit.cta.delete': 'delete post…',
  'edit.confirm.discard': 'Discard changes?',

  'delete.kicker': 'DELETE POST?',
  'delete.title.prefix': 'Really',
  'delete.title.accent': 'delete',
  'delete.title.suffix': '?',
  'delete.body': '{replies} replies will disappear.',
  'delete.body.zero': 'This post will be permanently deleted.',
  'delete.confirm.label': 'TYPE „DELETE" TO CONFIRM',
  'delete.confirm.placeholder': 'del…',
  'delete.confirm.target': 'DELETE',
  'delete.cta.confirm': 'delete forever',
  'delete.cta.cancel': 'cancel',
  'delete.friction':
    'The left button stays disabled until you type „delete". Intentional friction — we protect the thread.',

  'state.rate.body.short': '5 today · come back tomorrow.',

  'feed.footer.live': '● LIVE · post just landed',

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

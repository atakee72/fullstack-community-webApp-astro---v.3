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
  'pinned.banner.label': 'OFFIZIELLE ANKÜNDIGUNG · MAHALLE-TEAM',
  'card.strap.announcement': 'ANKÜNDIGUNG · VON NUTZER:INNEN',
  'pinned.banner.tag': 'ANGEHEFTET',
  'card.strap.recommendation': '✦ EMPFEHLUNG · VON NUTZER:INNEN',
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
  'state.own.pending.title': 'Ein Mensch prüft deinen Beitrag.',
  'state.own.pending.body':
    'Während der Prüfung sehen andere Nachbar:innen den Beitrag noch nicht.',
  'state.own.pending.note': 'nur du siehst diesen Status',
  'state.own.pending.usual': 'kann etwas dauern',
  'state.own.rejected.title': 'Dein Beitrag wurde nicht freigegeben.',
  'state.own.rejected.body':
    'Andere Nachbar:innen sehen ihn nicht. Du siehst ihn weiterhin in deiner Übersicht. Wir behalten ihn intern, falls du dich an die Moderation wenden möchtest.',
  'state.own.reported.title': 'Dein Beitrag wurde von Nachbar:innen gemeldet.',
  'state.own.reported.body':
    'Wir prüfen ihn — er bleibt für alle sichtbar, bis wir entschieden haben.',

  // Feed footer rule.
  'feed.footer.pages': '{current} / {total} SEITEN',
  'feed.footer.fresh': '↻ live · letzter post vor {n} min',
  'feed.footer.offline': '● OFFLINE · CACHED',
  'feed.footer.loading': 'LADE…',
  'feed.footer.loadMore': 'MEHR LADEN ↓',

  // sandbox
  // ─── Phase 5b · compose / edit / moderating / delete ───────────────
  // Compose form (create + edit shared sections).
  'compose.crumb.forum': 'FORUM',
  'compose.crumb.new': 'NEUES THEMA',
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
  'compose.requiredNote': '* Pflichtfeld',
  'compose.images.label': 'BILDER · MAX 5',
  'compose.images.upload': 'hochladen',
  'compose.images.formats': 'JPG, PNG, WebP · ≤5 MB · alle Bilder werden geprüft',
  'compose.tags.label': 'TAGS · 1–3',
  'compose.tags.add': '+ tag',
  'compose.tags.suggested': 'vorgeschlagen:',
  'compose.preview.kicker': 'VORSCHAU · LIVE',
  'compose.preview.you': 'du',
  'compose.preview.now': 'gleich',
  'compose.preview.titlePlaceholder': 'dein Beitrag erscheint hier',
  'compose.moderation.kicker': 'MODERATION',
  'compose.moderation.body':
    'Dein Beitrag wird kurz auf Sprache und Inhalt geprüft, bevor er veröffentlicht wird. Die Prüfung ist anonym — keine persönlichen Daten werden verwendet, nur der Text und die Bilder.',
  'compose.cta.publish': 'veröffentlichen →',
  'compose.cta.draft': 'als Entwurf speichern',
  'compose.cta.discard': 'verwerfen',
  'compose.draft.saved': 'Entwurf wird gesichert',
  'compose.terms':
    'Indem du veröffentlichst, akzeptierst du die Kiez-Regeln. Wir sind eine Nachbarschaft, kein anonymes Board.',
  'compose.toast.pending': 'Dein Beitrag wird überprüft.',
  'compose.toast.approved': 'Veröffentlicht.',
  'compose.toast.editPending': 'Änderung wird überprüft.',
  'compose.toast.editApproved': 'Aktualisiert.',
  'compose.error.editBlocked':
    'Du kannst diesen Termin gerade nicht bearbeiten.',

  // Community report modal (shared across forum + calendar surfaces).
  'report.modal.title': 'Inhalt melden',
  'report.modal.subtitle': 'Du meldest:',
  'report.modal.reasonLabel': 'Warum meldest du das?',
  'report.modal.detailsLabel': 'Bitte erklären (min. 10 Zeichen)',
  'report.modal.detailsPlaceholder': 'Was stimmt nicht mit diesem Inhalt?',
  'report.modal.charCount': '{n}/500',
  'report.modal.cancel': 'abbrechen',
  'report.modal.submit': 'melden',
  'report.modal.submitting': 'wird gesendet…',
  'report.reason.spam': 'Spam oder Werbung',
  'report.reason.harassment': 'Belästigung',
  'report.reason.hate_speech': 'Hassrede',
  'report.reason.violence': 'Gewalt oder Drohung',
  'report.reason.inappropriate': 'Unangemessener Inhalt',
  'report.reason.misinformation': 'Falschinformation',
  'report.reason.other': 'Anderes',
  'report.toast.submitted': 'Danke. Wir prüfen den Inhalt.',
  'report.error.duplicate': 'Du hast diesen Inhalt bereits gemeldet.',
  'report.error.self': 'Eigene Inhalte kannst du nicht melden.',
  'report.error.generic': 'Melden fehlgeschlagen. Bitte später erneut versuchen.',

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

  // ─── Comment edit / delete ─────────────────────────────────────────
  'comment.actions.edit': 'bearbeiten',
  'comment.actions.delete': 'löschen',
  'comment.edited': 'bearbeitet',
  'comment.edit.save': 'speichern',
  'comment.edit.cancel': 'abbrechen',
  'comment.delete.confirm.title': 'Kommentar löschen?',
  'comment.delete.confirm.body': 'Wirklich löschen? Kann nicht rückgängig gemacht werden.',
  'comment.delete.confirm.cta': 'endgültig löschen',
  'comment.toast.edit.window': 'Bearbeiten nur in den ersten 15 Minuten möglich.',
  'comment.toast.edit.flagged': 'Bearbeiten gesperrt — Kommentar wird moderiert.',
  'comment.toast.edit.error': 'Konnte nicht gespeichert werden.',
  'comment.toast.delete.error': 'Konnte nicht gelöscht werden.',

  // Mobile sticky composer (CommentComposerMobile.svelte).
  'comment.composer.placeholder.short': 'Antworten…',
  'comment.composer.send': 'senden',

  // ─── Calendar (kiosk redesign) ─────────────────────────────────────
  'cal.title.kicker': 'KALENDER',
  'cal.title.q1': 'Was',
  'cal.title.q2': 'passiert',
  'cal.title.q3': 'im Kiez?',
  'cal.stat.weekEvents': 'Termine diese Woche',
  'cal.stat.liveNow': 'gerade live',
  'cal.stat.goingToday': 'Nachbar:innen kommen heute',
  'cal.view.month': 'Monat',
  'cal.view.agenda': 'Agenda',
  'cal.view.day': 'Tag',
  'cal.cta.newEvent': '+ neuer termin',
  'cal.filter.show': 'ZEIGEN',
  'cal.filter.all': 'Alle',
  'cal.filter.myRsvps': 'Zugesagt',
  'cal.filter.saved': 'Gespeichert',
  'cal.cat.kiez.label': 'Kiez',
  'cal.cat.oeffentlich.label': 'Öffentlich',
  'cal.cat.markt.label': 'Markt',
  'cal.cat.kultur.label': 'Kultur',
  'cal.cat.sport.label': 'Sport',
  'cal.cat.privat.label': 'Privat',
  'cal.live.indicator': '↻ live · {n} gerade',
  'cal.footer.live': '↻ live · {n} termine gerade',
  'cal.live.label': 'LIVE',

  'cal.allDay': 'ganztags',
  'cal.cell.today': 'HEUTE',
  'cal.events.more': 'weitere',
  'cal.span.days': 'Tage',
  'cal.recurring.weekly': 'wöchentlich',
  'cal.recurring.monthly': 'monatlich',
  'cal.team': 'Mahalle-Team',
  'cal.private': 'privat',

  'cal.agenda.live.kicker': 'GERADE LIVE',
  'cal.agenda.quick.kicker': 'SCHNELL HINZUFÜGEN',
  'cal.agenda.quick.parse': 'Tippe natürlich:',
  'cal.agenda.quick.example': '„Brunch Sonntag 11 Uhr bei mir“',
  'cal.agenda.quick.hint': 'wir parsen Tag, Uhrzeit & Ort.',
  'cal.agenda.quote': '„Im Kiez heißt Termin haben: man weiß, wo man hingehen kann.“',
  'cal.agenda.past.show': '{n} vergangene anzeigen',
  'cal.agenda.past.hide': 'vergangene ausblenden',
  'cal.agenda.term.one': 'TERMIN',
  'cal.agenda.term.many': 'TERMINE',
  'cal.week.prefix': 'KW',
  'cal.agenda.today.running': 'läuft jetzt',
  'cal.agenda.row.rsvp': 'zusagen',
  'cal.agenda.row.save': 'merken',
  'cal.agenda.row.confirmed': 'zugesagt',
  'cal.agenda.row.going': 'kommen',
  'cal.agenda.row.maybe': 'vielleicht',
  'cal.agenda.row.cap': 'max',
  'cal.agenda.row.details': 'details',
  'cal.rsvp.going.cta': 'ich komme',
  'cal.rsvp.maybe.cta': 'vielleicht',
  'cal.event.soldOut': 'ausverkauft',

  // ─── Compose (event create flow) ─────────────────────────────────
  'cal.compose.crumb.calendar': 'KALENDER',
  'cal.compose.crumb.new': 'NEUER TERMIN',
  'cal.compose.crumb.edit': 'TERMIN BEARBEITEN',
  'cal.compose.title.q1': 'neuer',
  'cal.compose.title.q2': 'termin',
  'cal.compose.title.edit.q1': 'termin',
  'cal.compose.title.edit.q2': 'bearbeiten',
  'cal.compose.submit.edit': 'speichern →',
  'calendar.flash.editBlocked':
    'Bearbeiten gesperrt: dieser Termin wird gerade geprüft.',
  'cal.compose.step.category': 'Kategorie',
  'cal.compose.step.category.hint': 'wähle eine Kategorie',
  'cal.compose.step.title': 'Titel',
  'cal.compose.step.when': 'Wann',
  'cal.compose.step.where': 'Wo',
  'cal.compose.step.description': 'Beschreibung',
  'cal.compose.step.options': 'Optionen',
  'cal.compose.field.date': 'Datum',
  'cal.compose.field.start': 'Start',
  'cal.compose.field.end': 'Ende',
  'cal.compose.field.allDay': 'ganztägig',
  'cal.compose.field.multiDay': 'mehrtägig',
  'cal.compose.field.endDate': 'Datum bis',
  'cal.compose.field.capacity': 'Max Personen',
  'cal.compose.field.titleHint': '{n} / 80 Zeichen',
  'cal.compose.field.location.placeholder': 'Café Selig, Weisestr. 49',
  'cal.compose.field.title.placeholder': 'kurzer, sprechender Titel',
  'cal.compose.field.body.placeholder': 'was passiert, was sollten Nachbar:innen wissen?',
  'cal.compose.field.capacity.placeholder': 'leer = unbegrenzt',
  'cal.compose.field.visibility': 'Sichtbarkeit',
  'cal.compose.field.visibility.public': 'öffentlich',
  'cal.compose.field.visibility.private': 'privat',
  'cal.compose.preview.kicker': 'VORSCHAU · WIE ANDERE ES SEHEN',
  'cal.compose.preview.willAppear': 'WIRD ERSCHEINEN BEI',
  'cal.compose.preview.appear.calendar': 'Kalender',
  'cal.compose.preview.appear.weekly': 'Schillerkiez-Wochenagenda',
  'cal.compose.preview.appear.newsletter': 'Wöchentlicher Newsletter',
  'cal.compose.cta.publish': 'veröffentlichen →',
  'cal.compose.cta.discard': 'verwerfen',
  'cal.compose.cta.back': '← ZURÜCK ZUM KALENDER',
  'cal.compose.aiNote': 'Wird durch die Mahalle-KI geprüft (≈ 8s) bevor es im Kiez sichtbar wird.',
  'cal.compose.requiredNote': '* Pflichtfeld',

  // ─── Drag-select tooltip ─────────────────────────────────────────
  'cal.drag.kicker.day': '1 TAG AUSGEWÄHLT',
  'cal.drag.kicker.days': '{n} TAGE AUSGEWÄHLT',
  'cal.drag.cancel': 'abbrechen',
  'cal.drag.cancel.short': 'abbr.',
  'cal.drag.confirm': '+ neuer termin',
  'cal.drag.confirm.short': '+ termin',

  // Drag-select first-time coachmark — sticky-note copy.
  'cal.coachmark.kicker': 'INTERAKTION',
  'cal.coachmark.line1': 'klick auf ein datum',
  'cal.coachmark.line2': '→ über tage ziehen',
  'cal.coachmark.line3': '→ loslassen zeigt tooltip',
  'cal.coachmark.line4': '→ „+ neuer termin“ füllt datum aus',
  'cal.coachmark.esc': 'ESC = auswahl abbrechen',
  'cal.coachmark.dismiss': 'verstanden',
  'cal.coachmark.reopen.aria': 'Hilfe zur Datumsauswahl anzeigen',
  'cal.nav.prevMonth.aria': 'Vorheriger Monat',
  'cal.nav.nextMonth.aria': 'Nächster Monat',

  // ─── Mobile month view ──────────────────────────────────────────
  'cal.mobile.thisWeek': 'diese Woche · {n} Termine',
  'cal.mobile.cta.aria': 'Neuen Termin erstellen',
  'cal.mobile.statsMonthEvents': 'Termine',
  'cal.mobile.statsLiveNow': 'jetzt',
  'cal.mobile.rsvp.going.aria': 'Zusagen',
  'cal.mobile.rsvp.cancel.aria': 'Zusage zurücknehmen',
  'cal.mobile.dayEmpty': 'Keine Termine an diesem Tag.',
  'cal.mobile.guidance':
    'Tippe auf einen Tag, um seine Termine zu sehen. Drücke lang, dann tippe auf einen anderen Tag, um einen Zeitraum auszuwählen.',

  // ─── Detail modal ────────────────────────────────────────────────
  'cal.detail.when': 'WANN',
  'cal.detail.where': 'WO',
  'cal.detail.by': 'VON',
  'cal.detail.rsvp.kicker': 'DEINE ZUSAGE',
  'cal.detail.rsvp.confirm.going': 'Du hast zugesagt.',
  'cal.detail.rsvp.confirm.maybe': 'Du hast vielleicht zugesagt.',
  'cal.detail.rsvp.others.one': 'Eine Nachbar:in kommt auch.',
  'cal.detail.rsvp.others.many': '{n} deiner Nachbar:innen kommen auch.',
  'cal.detail.attendance.kicker': 'WER KOMMT',
  'cal.detail.attendance.going': 'kommen',
  'cal.detail.attendance.maybe': 'vielleicht',
  'cal.detail.attendance.others': 'und {n} weitere',
  'cal.detail.export': 'EXPORT',
  'cal.detail.export.share': 'teilen',
  'cal.detail.back': '← zurück',
  'cal.detail.report': 'MELDEN',
  'detail.edit.label': 'bearbeiten',
  'detail.edit.tooltip': 'Termin bearbeiten',
  'detail.edit.blocked': 'Bearbeiten gesperrt während der Prüfung',
  'cal.detail.close': 'schließen',
  'cal.detail.loginPrompt': 'Anmelden, um zuzusagen.',
  'cal.detail.verifiziert': 'verifiziert · seit 2024',

  // ─── States ──────────────────────────────────────────────────────
  'cal.state.empty.title': 'Im Kiez ist gerade Pause.',
  'cal.state.empty.body': 'Diese Woche: 0 Termine.',
  'cal.state.filtered.title': 'Nichts Passendes diese Woche.',
  'cal.state.filtered.body': 'Versuche andere Filter oder zeige alles.',
  'cal.state.filtered.clear': 'filter zurücksetzen',
  'cal.state.filtered.showAll': 'alle anzeigen →',
  'cal.state.error.kicker': 'VERBINDUNG VERLOREN',
  'cal.state.error.title': 'Wir konnten die Termine nicht laden.',
  'cal.state.error.retry': 'nochmal',

  // ─── Marketplace ─ Browse ──────────────────────────────────────────────

  // Title block — three-part carved title (same pattern as forum/calendar).
  'market.title.q1': 'Was',
  'market.title.q1.italic': 'wechselt',
  'market.title.q1.suffix': 'heute den Besitzer?',

  // Title-block meta counters.
  'market.titlemeta.listings': 'Anzeigen',
  'market.titlemeta.new': 'neu seit gestern',
  'market.titlemeta.fresh': 'frisch im Kiez',

  // CTA button.
  'market.cta.newListing': '+ neue anzeige',

  // Filter rail — kind toggle labels.
  'market.filter.kind.all': 'Alle',
  'market.filter.kind.verkaufen': 'Verkaufen',
  'market.filter.kind.tausch': 'Tausch',
  'market.filter.kind.verschenken': 'Verschenken',

  // Filter rail — secondary filters.
  'market.filter.saved': 'Gespeichert',
  'market.filter.mine': 'Meine Anzeigen',
  'market.filter.search': 'im Markt suchen…',
  'market.filter.kind.label': 'ART',
  'market.filter.category.label': 'KATEGORIE',
  'market.filter.cat.all': 'Alle Kategorien',
  'market.filter.search.label': 'SUCHE',

  // Category labels (chip + filter rail). 13 keys per the expanded taxonomy.
  'market.cat.moebel': 'Möbel & Wohnen',
  'market.cat.garten': 'Garten',
  'market.cat.werkzeug': 'Werkzeug',
  'market.cat.kleidung': 'Kleidung & Mode',
  'market.cat.medien': 'Bücher, Medien & Spiele',
  'market.cat.elektronik': 'Elektronik',
  'market.cat.fahrrad': 'Fahrräder & Mobilität',
  'market.cat.pflanze': 'Pflanzen & Tiere',
  'market.cat.kinder': 'Kinder',
  'market.cat.spielzeug': 'Spielzeug',
  'market.cat.handgemacht': 'Handgemacht',
  'market.cat.sport': 'Sport',
  'market.cat.sonstiges': 'Sonstiges',

  // Strap labels (10 locked straps).
  'market.strap.gratis': 'GRATIS',
  'market.strap.tausch': 'TAUSCH',
  'market.strap.bump': 'FRISCH HOCHGEHOLT',
  'market.strap.altpapier': 'ALTPAPIER',
  'market.strap.altbestand': 'ALTBESTAND',
  'market.strap.pruefung': 'IN PRÜFUNG',
  'market.strap.bildAbgelehnt': 'BILD ABGELEHNT',
  'market.strap.reserviert': 'RESERVIERT',
  'market.strap.verkauft': 'VERKAUFT',
  'market.strap.entwurf': 'ENTWURF',

  // Delivery enum labels.
  'market.delivery.abholung': 'Nur Abholung',
  'market.delivery.versand': 'Versand möglich',
  'market.delivery.abholungVersand': 'Abholung & Versand',

  // Price labels.
  'market.price.tausch.label': 'Tauschvorschlag',
  'market.price.vb.suffix': 'VB',
  'market.price.vb.long': 'VB = Verhandlungsbasis',

  // Section divider labels.
  'market.divider.sortedBy': 'SORTIERT NACH FRISCHE',
  'market.divider.allListings': 'ALLE 342 ANZEIGEN',

  // Editorial lead banner.
  'market.lead.banner': 'HEUTE FRISCH IM KIEZ',
  'market.lead.posted': 'vor 2 Std. eingestellt',

  // ─── Marketplace ─ Detail page ─────────────────────────────────────────

  // Gallery legend / lightbox hint.
  'market.detail.gallery.hint': 'Klick = Lightbox · Pfeile = navigieren · Esc = schließen',
  'market.detail.gallery.viewAll': 'alle\nansehen',

  // Back breadcrumb.
  'market.detail.back': '← zurück zum Markt',

  // Spec-strip field labels.
  'market.detail.spec.masse': 'Maße',
  'market.detail.spec.zustand': 'Zustand',
  'market.detail.spec.material': 'Material',
  'market.detail.spec.baujahr': 'Baujahr',
  'market.detail.spec.farbe': 'Farbe',
  'market.detail.spec.gewicht': 'Gewicht',

  // Action row.
  'market.detail.action.save': 'merken',
  'market.detail.action.share': 'teilen',
  'market.detail.action.report': 'melden',

  // Similar listings sidebar header.
  'market.detail.similar.header': 'ÄHNLICHES IM KIEZ',

  // ─── Marketplace ─ Contact form ────────────────────────────────────────

  // Form headers (vary by listing kind).
  'market.contact.header': 'INTERESSE? NACHRICHT SENDEN',
  'market.contact.tausch.headline': 'TAUSCH-VORSCHLAG SENDEN',
  'market.contact.tausch.helper': 'Sag konkret, was du im Tausch anbietest. Foto-Link oder kurze Beschreibung hilft.',
  'market.contact.tausch.placeholder': 'Ich hätte eine Lederjacke in S/M zum Tausch — Foto kann ich gern schicken. Würde das passen?',

  // Form fields.
  'market.contact.name.label': 'Dein Name',
  'market.contact.email.label': 'Deine E-Mail (für die Antwort)',
  'market.contact.message.label': 'Nachricht',
  'market.contact.helper.text': 'Direkt + freundlich. Nachrichten werden automatisch geprüft.',

  // Send button + confirmation.
  'market.contact.send': '→ senden',
  'market.contact.sent.header': 'NACHRICHT GESENDET',
  'market.contact.sent.confirmation': 'Deine Nachricht ist angekommen. Antworten landen direkt in deinem E-Mail-Postfach.',
  'market.contact.sent.helper': 'Mahalle leitet weiter — keine der E-Mail-Adressen wird offen geteilt.',

  // Privacy footer (shown in both idle + sent states).
  'market.contact.privacy.footer': 'Keine E-Mail-Adresse wird preisgegeben. Mahalle leitet weiter — Antworten kommen in dein Postfach.',

  // Soft-note for reserved listings (A7).
  'market.contact.reserved.softnote': 'Reserviert — du kannst trotzdem anfragen, falls der Deal nicht zustande kommt.',

  // Contact form error codes (returned from /api/listings/[id]/contact).
  'market.contact.error.listing_pending_review': 'Diese Anzeige wird gerade geprüft.',
  'market.contact.error.rate_limited_hourly': 'Du hast in der letzten Stunde zu viele Nachrichten gesendet.',
  'market.contact.error.rate_limited_daily_to_owner': 'Du hast diesen Verkäufer heute schon mehrfach kontaktiert.',
  'market.contact.error.rate_limited_ip': 'Zu viele Anfragen aus deinem Netzwerk.',
  'market.contact.error.listing_flooded': 'Diese Anzeige bekommt gerade viele Nachrichten. Versuch es später.',
  'market.contact.error.message_flagged': 'Deine Nachricht wurde vom System markiert.',
  'market.contact.error.seller_unreachable': 'Der Verkäufer ist gerade nicht erreichbar.',

  // ─── Marketplace ─ Owner actions ───────────────────────────────────────

  'market.owner.header': 'DEINE ANZEIGE',
  'market.owner.edit': 'bearbeiten',
  'market.owner.bump': 'frisch hochholen',
  'market.owner.refresh.cta': 'auffrischen',
  'market.owner.refresh.tooltip': 'Anzeige hochholen, um sie wieder im public Feed sichtbar zu machen.',
  'market.owner.notInPublicFeed': 'Nicht im public Feed · bump zum Hochholen',
  'market.owner.markReserved': 'als reserviert',
  'market.owner.clearReserved': 'Reservierung aufheben',
  'market.owner.markSold': 'als verkauft',
  'market.owner.lastBump': 'letzter Bump: vor {n} Tagen',
  'market.owner.delete': '✕ anzeige löschen',
  'market.owner.pendingBanner': 'In Prüfung — Bearbeiten ist während der KI-Prüfung deaktiviert. Dauert nur ein paar Sekunden.',

  // ─── Marketplace ─ Seller card ─────────────────────────────────────────

  'market.seller.header': 'VERKÄUFER:IN',
  'market.seller.since': 'seit {year}',
  'market.seller.nListings': '{n} Anzeigen',
  'market.seller.verified': 'VERIFIZIERT IM KIEZ',
  'market.seller.moreListings': '→ weitere Anzeigen',
  'market.seller.report': 'melden',

  // ─── Marketplace ─ Compose flow ────────────────────────────────────────

  // Page title — same carved-italic pattern.
  'market.compose.title.q1': 'Was möchtest du',
  'market.compose.title.q1.italic': 'loswerden',
  'market.compose.title.q1.suffix': '?',
  'market.compose.crumb': 'NEUE ANZEIGE',

  // Section headings (§01–§06).
  'market.compose.section.kind': 'Art',
  'market.compose.section.category': 'Kategorie',
  'market.compose.section.titleDesc': 'Titel & Beschreibung',
  'market.compose.section.photos': 'Fotos',
  'market.compose.section.priceDelivery': 'Preis & Lieferung',
  'market.compose.section.optional': 'Optionale Details · helfen beim Verkauf',
  'market.compose.section.done': 'AUSGEFÜLLT',

  // Kind-picker card labels + descriptions.
  'market.compose.kind.verkaufen': 'Verkaufen',
  'market.compose.kind.verkaufen.note': 'Preis in €',
  'market.compose.kind.tausch': 'Tausch',
  'market.compose.kind.tausch.note': 'gegen etwas anderes',
  'market.compose.kind.verschenken': 'Verschenken',
  'market.compose.kind.verschenken.note': 'ohne Gegenleistung',

  // Category hint (disabled until kind chosen).
  'market.compose.category.hint': '→ Erst die Art wählen, dann passende Kategorien.',

  // Image slot labels.
  'market.compose.imageSlots.main': 'HAUPT',
  'market.compose.imageSlots.placeholder': '{filled}/5 Fotos · Hauptbild wird zuerst gezeigt',
  'market.compose.imageSlots.reorder': 'Drag & drop zum sortieren',
  'market.compose.imageSlots.modNote': '🔒 Bilder UND Text werden vom KI-Modell auf Anstößiges geprüft. Du bekommst Bescheid, wenn etwas abgelehnt wird — du kannst es ersetzen.',

  // Price labels.
  'market.compose.price.label': 'Preis',
  'market.compose.delivery.label': 'Lieferung',
  'market.compose.delivery.abholung': 'Nur Abholung',
  'market.compose.delivery.abholungVersand': 'Abholung & Versand',
  'market.compose.delivery.versand': 'Nur Versand',

  // Optional details section intro.
  'market.compose.optional.intro': 'Alles freiwillig. Was du füllst, erscheint als Spec-Streifen auf der Anzeige.',
  'market.compose.optional.masse': 'Maße',
  'market.compose.optional.material': 'Material',
  'market.compose.optional.baujahr': 'Baujahr',
  'market.compose.optional.farbe': 'Farbe',
  'market.compose.optional.gewicht': 'Gewicht',
  'market.compose.optional.modNote': '🔍 Auch der eingegebene Text wird automatisch geprüft (Schimpfwörter, Hass, Spam). Bei Auffälligkeit wirst du benachrichtigt.',

  // CTA buttons.
  'market.compose.cta.cancel': 'abbrechen',
  'market.compose.cta.draft': 'als Entwurf sichern',
  'market.compose.cta.publish': 'veröffentlichen →',
  'market.compose.cta.publishing': '◐ veröffentlicht…',

  // Live preview pane.
  'market.compose.preview.waiting': '★ VORSCHAU WARTET',
  'market.compose.preview.live': '★ LIVE-VORSCHAU',
  'market.compose.preview.publishing': '★ WIRD VERÖFFENTLICHT…',
  'market.compose.preview.waitingBody': 'Wähle Art + Kategorie, dann erwacht hier deine Anzeige.',
  'market.compose.preview.liveBody': 'So sieht deine Anzeige im Markt aus.',
  'market.compose.preview.liveFooter': '↻ Live-Vorschau aktualisiert sich bei jedem Tastendruck.',

  // Checklist labels (before publishing).
  'market.compose.checklist.header': 'VOR DEM VERÖFFENTLICHEN',
  'market.compose.checklist.kind': 'Art ausgewählt',
  'market.compose.checklist.category': 'Kategorie',
  'market.compose.checklist.titleDesc': 'Titel + Beschreibung',
  'market.compose.checklist.photo': 'Mind. 1 Foto',
  'market.compose.checklist.price': 'Preis / Tauschangabe',
  'market.compose.checklist.delivery': 'Lieferung',

  // Publishing overlay (inside preview pane).
  'market.compose.publishing.header': 'BILDER WERDEN GEPRÜFT (KI)',
  'market.compose.publishing.body': 'Anzeige ist sichtbar. Bei Problemen wirst du benachrichtigt.',

  // Moderation notice (images + text screening note).
  'market.compose.moderation.notice': '🔒 Bilder UND Text werden vom KI-Modell auf Anstößiges geprüft. Du bekommst Bescheid, wenn etwas abgelehnt wird — du kannst es ersetzen.',

  // ─── Marketplace ─ Condition enum (render-layer translation) ───────────

  'market.condition.like-new': 'Wie neu',
  'market.condition.excellent': 'Sehr gut',
  'market.condition.very-good': 'Gut',
  'market.condition.good': 'Akzeptabel',
  'market.condition.fair': 'Gebraucht',

  // ─── Marketplace ─ State matrix ────────────────────────────────────────

  // §01 Loading.
  'market.state.loading.label': 'Lädt · Skeleton',

  // §02 Empty (true zero — no listings in DB at all).
  'market.state.empty.truly.label': 'Leer · noch nix',
  'market.state.empty.truly.body': 'Heute steht hier noch nichts. Magst du anfangen?',
  'market.state.empty.truly.cta': '+ erste anzeige',

  // §03 Empty (filtered — active filter returned 0 results, A8).
  'market.state.empty.filtered.label': 'Filter · 0 Treffer',
  'market.state.empty.filtered.activeFilters': 'AKTIVE FILTER',
  'market.state.empty.filtered.body': 'Nichts dabei.',
  'market.state.empty.filtered.clear': '← Filter zurücksetzen',

  // §04 Error.
  'market.state.error.label': 'Fehler · Netzwerk',
  'market.state.error.banner': 'Verbindung weg. Zeige zwischengespeichert.',
  'market.state.error.retry': 'neu laden',

  // §05 Reserved.
  'market.state.reserved.label': 'Reserviert · Soft-Lock',

  // §06 Sold.
  'market.state.sold.label': 'Verkauft · archiviert',

  // §07 Altpapier (freshness decay).
  'market.state.altpapier.label': 'Altpapier · veraltet',
  'market.state.altpapier.cta': '↻ auffrischen',

  // §08 Owner view.
  'market.state.owner.label': 'Eigene Anzeige',
  'market.state.owner.actions.edit': 'BEARBEITEN',
  'market.state.owner.actions.bump': 'BUMP',
  'market.state.owner.actions.sold': 'ALS VERKAUFT',

  // §09 Moderation pending.
  'market.state.pending.label': 'In Prüfung · nicht editierbar',
  'market.state.pending.progress': 'KI-CHECK LÄUFT',
  'market.state.pending.detail': 'Bilder · Text · Spam · Hass: ~12s. Bearbeiten gesperrt.',

  // §10 Listing rejected (image/text flag — owner-only, A11 strap included).
  // Note: the full state-tile copy for §10 (per-image mod) is GATED and not rendered in v1.
  // The strap label (market.strap.bildAbgelehnt) is already included above.
  'market.state.bildRejected.label': 'Bild oder Text abgelehnt · ersetzbar',

  // §11 Listing fully rejected.
  'market.state.listingRejected.label': 'Anzeige vollständig abgelehnt · nur Owner sichtbar',
  'market.state.listingRejected.badge': 'VERWORFEN',
  'market.state.listingRejected.reason': 'Grund: Verbotene Ware · § 86a StGB',
  'market.state.listingRejected.body': 'Unsere KI hat Symbole erkannt, die in Deutschland nicht zum Verkauf angeboten werden dürfen. Falls das ein Irrtum ist, melde dich — ein Mensch schaut nochmal.',
  'market.state.listingRejected.appeal': 'Einspruch · menschlicher Check',
  'market.state.listingRejected.delete': 'verstanden, löschen',

  // ─── Marketplace ─ Novel features ──────────────────────────────────────

  // §01 Bump.
  'market.novel.bump.title': 'Hochholen · Bump',
  'market.novel.bump.subtitle': 'einmal pro Woche, kostenlos',
  'market.novel.bump.before': 'VORHER',
  'market.novel.bump.after': 'NACHHER',
  'market.novel.bump.afterLabel': 'ganz oben im Markt',
  'market.novel.bump.cta': '↻ frisch hochholen',
  'market.novel.bump.nextAvailable': 'Nächster Bump: in 7 Tagen verfügbar.',
  'market.novel.bump.trigger': 'TRIGGER: Owner klickt Bump · POST-Endpoint setzt updatedAt = now · Strap „FRISCH HOCHGEHOLT" verfällt nach 24h · Rate-Limit: 1×/Woche pro Anzeige.',

  // §02 Freshness decay (Altpapier-Verfall).
  'market.novel.decay.title': 'Altpapier-Verfall',
  'market.novel.decay.subtitle': 'ehrlich, statt ewig',
  'market.novel.decay.timeline': 'ZEITLEISTE · OPACITY + SATURATION',
  'market.novel.decay.fresh': 'frisch',
  'market.novel.decay.stale': 'altpapier',
  'market.novel.decay.trigger': 'TRIGGER: bei Render-Zeit, age = now − updatedAt · ≥21d: Strap „altpapier" + opacity 0.6 + saturate 0.45 · auffrischen-CTA für Owner · komplett ausblenden nach 60d ohne Bump.',

  // ─── Marketplace ─ Backfill ─────────────────────────────────────────────

  'market.backfill.banner': 'Diese Anzeige stammt aus der alten Marktplatz-Version und wurde noch nicht aktualisiert.',

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

  'pinned.banner.label': 'OFFICIAL ANNOUNCEMENT · MAHALLE-TEAM',
  'card.strap.announcement': 'ANNOUNCEMENT BY USERS',
  'pinned.banner.tag': 'PINNED',
  'card.strap.recommendation': '✦ RECOMMENDED BY USERS',
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

  'state.own.pending.title': 'A human is reviewing your post.',
  'state.own.pending.body':
    "While we review, other neighbours don't see the post yet.",
  'state.own.pending.note': 'only you see this status',
  'state.own.pending.usual': 'may take a moment',
  'state.own.rejected.title': "Your post wasn't approved.",
  'state.own.rejected.body':
    "Other neighbours can't see it. You still see it in your own view. We keep it internally in case you want to reach out to moderation.",
  'state.own.reported.title': 'Your post was flagged by neighbors.',
  'state.own.reported.body':
    "We're reviewing it — it stays visible to everyone until we've decided.",

  'feed.footer.pages': '{current} / {total} PAGES',
  'feed.footer.fresh': '↻ live · last post {n} min ago',
  'feed.footer.offline': '● OFFLINE · CACHED',
  'feed.footer.loading': 'LOADING…',
  'feed.footer.loadMore': 'LOAD MORE ↓',

  // ─── Phase 5b · compose / edit / moderating / delete ───────────────
  'compose.crumb.forum': 'FORUM',
  'compose.crumb.new': 'NEW TOPIC',
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
  'compose.requiredNote': '* required field',
  'compose.images.label': 'IMAGES · MAX 5',
  'compose.images.upload': 'upload',
  'compose.images.formats': 'JPG, PNG, WebP · ≤5 MB · all images are screened',
  'compose.tags.label': 'TAGS · 1–3',
  'compose.tags.add': '+ tag',
  'compose.tags.suggested': 'suggested:',
  'compose.preview.kicker': 'PREVIEW · LIVE',
  'compose.preview.you': 'you',
  'compose.preview.now': 'now',
  'compose.preview.titlePlaceholder': 'your post will appear here',
  'compose.moderation.kicker': 'MODERATION',
  'compose.moderation.body':
    'Your post is briefly checked for language and content before going live. The check is anonymous — no personal data is used, only the text and images.',
  'compose.cta.publish': 'publish →',
  'compose.cta.draft': 'save as draft',
  'compose.cta.discard': 'discard',
  'compose.draft.saved': 'draft auto-saved',
  'compose.terms':
    "By publishing you accept the kiez rules. We're a neighbourhood, not an anonymous board.",
  'compose.toast.pending': 'Your submission is under review.',
  'compose.toast.approved': 'Published.',
  'compose.toast.editPending': 'Your changes are under review.',
  'compose.toast.editApproved': 'Updated.',
  'compose.error.editBlocked': "You can't edit this event right now.",

  'report.modal.title': 'Report content',
  'report.modal.subtitle': "You're reporting:",
  'report.modal.reasonLabel': 'Why are you reporting this?',
  'report.modal.detailsLabel': 'Please explain (min. 10 chars)',
  'report.modal.detailsPlaceholder': "What's wrong with this content?",
  'report.modal.charCount': '{n}/500',
  'report.modal.cancel': 'cancel',
  'report.modal.submit': 'submit',
  'report.modal.submitting': 'submitting…',
  'report.reason.spam': 'Spam or advertising',
  'report.reason.harassment': 'Harassment or bullying',
  'report.reason.hate_speech': 'Hate speech',
  'report.reason.violence': 'Violence or threats',
  'report.reason.inappropriate': 'Inappropriate content',
  'report.reason.misinformation': 'Misinformation',
  'report.reason.other': 'Other',
  'report.toast.submitted': "Thanks. We'll review the content.",
  'report.error.duplicate': 'You have already reported this content.',
  'report.error.self': "You can't report your own content.",
  'report.error.generic': 'Report failed. Please try again later.',

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

  'comment.actions.edit': 'edit',
  'comment.actions.delete': 'delete',
  'comment.edited': 'edited',
  'comment.edit.save': 'save',
  'comment.edit.cancel': 'cancel',
  'comment.delete.confirm.title': 'Delete comment?',
  'comment.delete.confirm.body': 'Delete this comment? Cannot be undone.',
  'comment.delete.confirm.cta': 'delete forever',
  'comment.toast.edit.window': 'Edits are only allowed within the first 15 minutes.',
  'comment.toast.edit.flagged': 'Editing locked — comment is under moderation.',
  'comment.toast.edit.error': "Couldn't save your edit.",
  'comment.toast.delete.error': "Couldn't delete the comment.",

  'comment.composer.placeholder.short': 'Reply…',
  'comment.composer.send': 'send',

  // Calendar
  'cal.title.kicker': 'CALENDAR',
  'cal.title.q1': "What's",
  'cal.title.q2': 'happening',
  'cal.title.q3': 'in the Kiez?',
  'cal.stat.weekEvents': 'events this week',
  'cal.stat.liveNow': 'live now',
  'cal.stat.goingToday': 'neighbours going today',
  'cal.view.month': 'Month',
  'cal.view.agenda': 'Agenda',
  'cal.view.day': 'Day',
  'cal.cta.newEvent': '+ new event',
  'cal.filter.show': 'SHOW',
  'cal.filter.all': 'All',
  'cal.filter.myRsvps': 'Going',
  'cal.filter.saved': 'Saved',
  'cal.cat.kiez.label': 'Kiez',
  'cal.cat.oeffentlich.label': 'Public',
  'cal.cat.markt.label': 'Market',
  'cal.cat.kultur.label': 'Culture',
  'cal.cat.sport.label': 'Sport',
  'cal.cat.privat.label': 'Private',
  'cal.live.indicator': '↻ live · {n} now',
  'cal.footer.live': '↻ live · {n} events now',
  'cal.live.label': 'LIVE',

  'cal.allDay': 'all-day',
  'cal.cell.today': 'TODAY',
  'cal.events.more': 'more',
  'cal.span.days': 'days',
  'cal.recurring.weekly': 'weekly',
  'cal.recurring.monthly': 'monthly',
  'cal.team': 'Mahalle Team',
  'cal.private': 'private',

  'cal.agenda.live.kicker': 'LIVE NOW',
  'cal.agenda.quick.kicker': 'QUICK ADD',
  'cal.agenda.quick.parse': 'Type naturally:',
  'cal.agenda.quick.example': '“Brunch Sunday 11am at mine”',
  'cal.agenda.quick.hint': 'we parse day, time & place.',
  'cal.agenda.quote': '“In the Kiez, having a date means knowing where you can go.”',
  'cal.agenda.past.show': 'show {n} past',
  'cal.agenda.past.hide': 'hide past',
  'cal.agenda.term.one': 'EVENT',
  'cal.agenda.term.many': 'EVENTS',
  'cal.week.prefix': 'WK',
  'cal.agenda.today.running': 'live now',
  'cal.agenda.row.rsvp': 'rsvp',
  'cal.agenda.row.save': 'save',
  'cal.agenda.row.confirmed': 'confirmed',
  'cal.agenda.row.going': 'going',
  'cal.agenda.row.maybe': 'maybe',
  'cal.agenda.row.cap': 'cap',
  'cal.agenda.row.details': 'details',
  'cal.rsvp.going.cta': 'going',
  'cal.rsvp.maybe.cta': 'maybe',
  'cal.event.soldOut': 'sold out',

  // Compose
  'cal.compose.crumb.calendar': 'CALENDAR',
  'cal.compose.crumb.new': 'NEW EVENT',
  'cal.compose.crumb.edit': 'EDIT EVENT',
  'cal.compose.title.q1': 'new',
  'cal.compose.title.q2': 'event',
  'cal.compose.title.edit.q1': 'edit',
  'cal.compose.title.edit.q2': 'event',
  'cal.compose.submit.edit': 'save →',
  'calendar.flash.editBlocked':
    'Edits blocked: this event is under review.',
  'cal.compose.step.category': 'Category',
  'cal.compose.step.category.hint': 'select a tag',
  'cal.compose.step.title': 'Title',
  'cal.compose.step.when': 'When',
  'cal.compose.step.where': 'Where',
  'cal.compose.step.description': 'Description',
  'cal.compose.step.options': 'Options',
  'cal.compose.field.date': 'Date',
  'cal.compose.field.start': 'Start',
  'cal.compose.field.end': 'End',
  'cal.compose.field.allDay': 'all-day',
  'cal.compose.field.multiDay': 'multi-day',
  'cal.compose.field.endDate': 'End date',
  'cal.compose.field.capacity': 'Capacity',
  'cal.compose.field.titleHint': '{n} / 80 chars',
  'cal.compose.field.location.placeholder': 'Café Selig, Weisestr. 49',
  'cal.compose.field.title.placeholder': 'a short, descriptive title',
  'cal.compose.field.body.placeholder': "what's happening, what should neighbours know?",
  'cal.compose.field.capacity.placeholder': 'blank = unlimited',
  'cal.compose.field.visibility': 'Visibility',
  'cal.compose.field.visibility.public': 'public',
  'cal.compose.field.visibility.private': 'private',
  'cal.compose.preview.kicker': 'PREVIEW · HOW OTHERS SEE IT',
  'cal.compose.preview.willAppear': 'WILL APPEAR IN',
  'cal.compose.preview.appear.calendar': 'Calendar',
  'cal.compose.preview.appear.weekly': 'Schillerkiez weekly',
  'cal.compose.preview.appear.newsletter': 'Weekly newsletter',
  'cal.compose.cta.publish': 'publish →',
  'cal.compose.cta.discard': 'discard',
  'cal.compose.cta.back': '← BACK TO CALENDAR',
  'cal.compose.aiNote': 'Reviewed by Mahalle-AI (≈ 8s) before going live in the Kiez.',
  'cal.compose.requiredNote': '* required field',

  // Drag-select tooltip
  'cal.drag.kicker.day': '1 DAY SELECTED',
  'cal.drag.kicker.days': '{n} DAYS SELECTED',
  'cal.drag.cancel': 'cancel',
  'cal.drag.cancel.short': 'cancel',
  'cal.drag.confirm': '+ new event',
  'cal.drag.confirm.short': '+ event',

  // Drag-select first-time coachmark
  'cal.coachmark.kicker': 'INTERACTION',
  'cal.coachmark.line1': 'mousedown on a date',
  'cal.coachmark.line2': '→ drag across days',
  'cal.coachmark.line3': '→ release shows tooltip',
  'cal.coachmark.line4': '→ "+ new event" pre-fills the range',
  'cal.coachmark.esc': 'ESC = cancel selection',
  'cal.coachmark.dismiss': 'got it',
  'cal.coachmark.reopen.aria': 'Show date-selection help',
  'cal.nav.prevMonth.aria': 'Previous month',
  'cal.nav.nextMonth.aria': 'Next month',

  // Mobile month view
  'cal.mobile.thisWeek': 'this week · {n} events',
  'cal.mobile.cta.aria': 'Create new event',
  'cal.mobile.statsMonthEvents': 'events',
  'cal.mobile.statsLiveNow': 'now',
  'cal.mobile.rsvp.going.aria': 'RSVP going',
  'cal.mobile.rsvp.cancel.aria': 'Cancel RSVP',
  'cal.mobile.dayEmpty': 'No events on this day.',
  'cal.mobile.guidance':
    'Tap a day to see its events. Long-press, then tap another day to select a range.',

  // Detail modal
  'cal.detail.when': 'WHEN',
  'cal.detail.where': 'WHERE',
  'cal.detail.by': 'BY',
  'cal.detail.rsvp.kicker': 'YOUR RSVP',
  'cal.detail.rsvp.confirm.going': 'You said yes.',
  'cal.detail.rsvp.confirm.maybe': 'You said maybe.',
  'cal.detail.rsvp.others.one': 'One neighbour is also going.',
  'cal.detail.rsvp.others.many': '{n} of your neighbours are also going.',
  'cal.detail.attendance.kicker': "WHO'S COMING",
  'cal.detail.attendance.going': 'going',
  'cal.detail.attendance.maybe': 'maybe',
  'cal.detail.attendance.others': 'and {n} others',
  'cal.detail.export': 'EXPORT',
  'cal.detail.export.share': 'share',
  'cal.detail.back': '← back',
  'cal.detail.report': 'REPORT',
  'detail.edit.label': 'edit',
  'detail.edit.tooltip': 'Edit event',
  'detail.edit.blocked': 'Edits blocked during review',
  'cal.detail.close': 'close',
  'cal.detail.loginPrompt': 'Sign in to RSVP.',
  'cal.detail.verifiziert': 'verified · since 2024',

  // States
  'cal.state.empty.title': 'The Kiez is on a break.',
  'cal.state.empty.body': 'This week: 0 events.',
  'cal.state.filtered.title': 'No matches this week.',
  'cal.state.filtered.body': 'Try different filters or show everything.',
  'cal.state.filtered.clear': 'clear filters',
  'cal.state.filtered.showAll': 'show all →',
  'cal.state.error.kicker': 'CONNECTION LOST',
  'cal.state.error.title': "We couldn't load the events.",
  'cal.state.error.retry': 'retry',

  // ─── Marketplace ─ Browse ──────────────────────────────────────────────

  'market.title.q1': "What's",
  'market.title.q1.italic': 'changing',
  'market.title.q1.suffix': 'hands today?',

  'market.titlemeta.listings': 'listings',
  'market.titlemeta.new': 'new since yesterday',
  'market.titlemeta.fresh': 'fresh in the kiez',

  'market.cta.newListing': '+ new listing',

  'market.filter.kind.all': 'All',
  'market.filter.kind.verkaufen': 'For sale',
  'market.filter.kind.tausch': 'Swap',
  'market.filter.kind.verschenken': 'Free',

  'market.filter.saved': 'Saved',
  'market.filter.mine': 'My listings',
  'market.filter.search': 'search market…',
  'market.filter.kind.label': 'KIND',
  'market.filter.category.label': 'CATEGORY',
  'market.filter.cat.all': 'All categories',
  'market.filter.search.label': 'SEARCH',

  'market.cat.moebel': 'Furniture & Home',
  'market.cat.garten': 'Garden',
  'market.cat.werkzeug': 'Tools',
  'market.cat.kleidung': 'Clothing & Fashion',
  'market.cat.medien': 'Books, Media & Games',
  'market.cat.elektronik': 'Electronics',
  'market.cat.fahrrad': 'Bikes & Mobility',
  'market.cat.pflanze': 'Plants & Pets',
  'market.cat.kinder': 'Children',
  'market.cat.spielzeug': 'Toys',
  'market.cat.handgemacht': 'Handmade',
  'market.cat.sport': 'Sports',
  'market.cat.sonstiges': 'Other',

  'market.strap.gratis': 'FREE',
  'market.strap.tausch': 'SWAP',
  'market.strap.bump': 'FRESHLY BUMPED',
  'market.strap.altpapier': 'STALE',
  'market.strap.altbestand': 'LEGACY',
  'market.strap.pruefung': 'UNDER REVIEW',
  'market.strap.bildAbgelehnt': 'IMAGE REJECTED',
  'market.strap.reserviert': 'RESERVED',
  'market.strap.verkauft': 'SOLD',
  'market.strap.entwurf': 'DRAFT',

  'market.delivery.abholung': 'Pickup only',
  'market.delivery.versand': 'Shipping possible',
  'market.delivery.abholungVersand': 'Pickup & shipping',

  'market.price.tausch.label': 'Swap proposal',
  'market.price.vb.suffix': 'VB',
  'market.price.vb.long': 'VB = negotiable',

  'market.divider.sortedBy': 'SORTED BY FRESHNESS',
  'market.divider.allListings': 'ALL 342 LISTINGS',

  'market.lead.banner': 'FRESH IN THE KIEZ TODAY',
  'market.lead.posted': 'posted 2h ago',

  // ─── Marketplace ─ Detail page ─────────────────────────────────────────

  'market.detail.gallery.hint': 'Click = lightbox · arrows = navigate · Esc = close',
  'market.detail.gallery.viewAll': 'view\nall',

  'market.detail.back': '← back to market',

  'market.detail.spec.masse': 'Size',
  'market.detail.spec.zustand': 'Condition',
  'market.detail.spec.material': 'Material',
  'market.detail.spec.baujahr': 'Year',
  'market.detail.spec.farbe': 'Color',
  'market.detail.spec.gewicht': 'Weight',

  'market.detail.action.save': 'save',
  'market.detail.action.share': 'share',
  'market.detail.action.report': 'report',

  'market.detail.similar.header': 'SIMILAR IN KIEZ',

  // ─── Marketplace ─ Contact form ────────────────────────────────────────

  'market.contact.header': 'INTERESTED? SEND MESSAGE',
  'market.contact.tausch.headline': 'SEND SWAP PROPOSAL',
  'market.contact.tausch.helper': 'Be specific about what you offer in return. A photo link or short description helps.',
  'market.contact.tausch.placeholder': "I'd swap a leather jacket in S/M — happy to send a photo. Would that work?",

  'market.contact.name.label': 'Your name',
  'market.contact.email.label': 'Your email (for the reply)',
  'market.contact.message.label': 'Message',
  'market.contact.helper.text': 'Direct + kind. Messages are auto-screened.',

  'market.contact.send': '→ send',
  'market.contact.sent.header': 'MESSAGE SENT',
  'market.contact.sent.confirmation': 'Your message arrived. Replies arrive directly in your inbox.',
  'market.contact.sent.helper': 'Mahalle relays — no email addresses are revealed.',

  'market.contact.privacy.footer': 'No email addresses are revealed. Mahalle relays — replies arrive in your inbox.',

  'market.contact.reserved.softnote': "Reserved — you can still enquire in case the deal falls through.",

  // Contact form error codes (returned from /api/listings/[id]/contact).
  'market.contact.error.listing_pending_review': 'This listing is under review.',
  'market.contact.error.rate_limited_hourly': "You've sent too many messages in the last hour.",
  'market.contact.error.rate_limited_daily_to_owner': "You've already contacted this seller several times today.",
  'market.contact.error.rate_limited_ip': 'Too many requests from your network.',
  'market.contact.error.listing_flooded': 'This listing is getting a lot of messages right now. Try again later.',
  'market.contact.error.message_flagged': 'Your message was flagged by our system.',
  'market.contact.error.seller_unreachable': 'The seller is currently unreachable.',

  // ─── Marketplace ─ Owner actions ───────────────────────────────────────

  'market.owner.header': 'YOUR LISTING',
  'market.owner.edit': 'edit',
  'market.owner.bump': 'bump',
  'market.owner.refresh.cta': 'refresh',
  'market.owner.refresh.tooltip': 'Refresh this listing to make it visible in the public feed again.',
  'market.owner.notInPublicFeed': 'Not in public feed · bump to refresh',
  'market.owner.markReserved': 'mark reserved',
  'market.owner.clearReserved': 'clear reservation',
  'market.owner.markSold': 'mark sold',
  'market.owner.lastBump': 'last bump: {n}d ago',
  'market.owner.delete': '✕ delete listing',
  'market.owner.pendingBanner': 'Under review — editing is disabled while AI checks. Takes only a few seconds.',

  // ─── Marketplace ─ Seller card ─────────────────────────────────────────

  'market.seller.header': 'SELLER',
  'market.seller.since': 'since {year}',
  'market.seller.nListings': '{n} listings',
  'market.seller.verified': 'VERIFIED IN KIEZ',
  'market.seller.moreListings': '→ more listings',
  'market.seller.report': 'report',

  // ─── Marketplace ─ Compose flow ────────────────────────────────────────

  'market.compose.title.q1': 'What do you want to',
  'market.compose.title.q1.italic': 'part with',
  'market.compose.title.q1.suffix': '?',
  'market.compose.crumb': 'NEW LISTING',

  'market.compose.section.kind': 'Kind',
  'market.compose.section.category': 'Category',
  'market.compose.section.titleDesc': 'Title & description',
  'market.compose.section.photos': 'Photos',
  'market.compose.section.priceDelivery': 'Price & delivery',
  'market.compose.section.optional': 'Optional details · help buyers decide',
  'market.compose.section.done': 'DONE',

  'market.compose.kind.verkaufen': 'For sale',
  'market.compose.kind.verkaufen.note': 'Price in €',
  'market.compose.kind.tausch': 'Swap',
  'market.compose.kind.tausch.note': 'for something else',
  'market.compose.kind.verschenken': 'Free',
  'market.compose.kind.verschenken.note': 'no return expected',

  'market.compose.category.hint': '→ Pick a kind first, then categories.',

  'market.compose.imageSlots.main': 'MAIN',
  'market.compose.imageSlots.placeholder': '{filled}/5 photos · main shown first',
  'market.compose.imageSlots.reorder': 'Drag & drop to reorder',
  'market.compose.imageSlots.modNote': '🔒 Both images AND text are AI-screened. You\'ll be told if something is rejected — you can replace it.',

  'market.compose.price.label': 'Price',
  'market.compose.delivery.label': 'Delivery',
  'market.compose.delivery.abholung': 'Pickup only',
  'market.compose.delivery.abholungVersand': 'Pickup & shipping',
  'market.compose.delivery.versand': 'Shipping only',

  'market.compose.optional.intro': 'All optional. What you fill in shows as a spec strip on the listing.',
  'market.compose.optional.masse': 'Size',
  'market.compose.optional.material': 'Material',
  'market.compose.optional.baujahr': 'Year',
  'market.compose.optional.farbe': 'Color',
  'market.compose.optional.gewicht': 'Weight',
  'market.compose.optional.modNote': "🔍 Text is also auto-screened (profanity, hate, spam). You'll be notified if anything flags.",

  'market.compose.cta.cancel': 'cancel',
  'market.compose.cta.draft': 'save as draft',
  'market.compose.cta.publish': 'publish →',
  'market.compose.cta.publishing': '◐ publishing…',

  'market.compose.preview.waiting': '★ PREVIEW WAITING',
  'market.compose.preview.live': '★ LIVE PREVIEW',
  'market.compose.preview.publishing': '★ PUBLISHING…',
  'market.compose.preview.waitingBody': 'Pick kind + category, then your listing comes to life here.',
  'market.compose.preview.liveBody': 'How your listing appears in the market.',
  'market.compose.preview.liveFooter': '↻ Live preview updates with every keystroke.',

  'market.compose.checklist.header': 'BEFORE PUBLISHING',
  'market.compose.checklist.kind': 'Kind chosen',
  'market.compose.checklist.category': 'Category',
  'market.compose.checklist.titleDesc': 'Title + description',
  'market.compose.checklist.photo': 'At least 1 photo',
  'market.compose.checklist.price': 'Price / swap info',
  'market.compose.checklist.delivery': 'Delivery',

  'market.compose.publishing.header': 'IMAGES UNDER AI REVIEW',
  'market.compose.publishing.body': "Listing is live. We'll notify if anything flags.",

  'market.compose.moderation.notice': "🔒 Both images AND text are AI-screened. You'll be told if something is rejected — you can replace it.",

  // ─── Marketplace ─ Condition enum (render-layer translation) ───────────

  'market.condition.like-new': 'Like new',
  'market.condition.excellent': 'Excellent',
  'market.condition.very-good': 'Very good',
  'market.condition.good': 'Good',
  'market.condition.fair': 'Fair',

  // ─── Marketplace ─ State matrix ────────────────────────────────────────

  'market.state.loading.label': 'Loading · Skeleton',

  'market.state.empty.truly.label': 'Empty · no listings',
  'market.state.empty.truly.body': 'Nothing here yet. Want to start?',
  'market.state.empty.truly.cta': '+ first listing',

  'market.state.empty.filtered.label': 'Filter · 0 hits',
  'market.state.empty.filtered.activeFilters': 'ACTIVE FILTERS',
  'market.state.empty.filtered.body': 'Nothing matches.',
  'market.state.empty.filtered.clear': '← Clear filters',

  'market.state.error.label': 'Error · network',
  'market.state.error.banner': 'Lost connection. Showing cached.',
  'market.state.error.retry': 'retry',

  'market.state.reserved.label': 'Reserved · soft-lock',

  'market.state.sold.label': 'Sold · archived',

  'market.state.altpapier.label': 'Stale · aged out',
  'market.state.altpapier.cta': '↻ refresh',

  'market.state.owner.label': 'Owner view',
  'market.state.owner.actions.edit': 'EDIT',
  'market.state.owner.actions.bump': 'BUMP',
  'market.state.owner.actions.sold': 'SOLD',

  'market.state.pending.label': 'Pending review · read-only',
  'market.state.pending.progress': 'AI CHECK RUNNING',
  'market.state.pending.detail': 'Images · text · spam · hate: ~12s. Editing locked.',

  'market.state.bildRejected.label': 'Image or text rejected · replaceable',

  'market.state.listingRejected.label': 'Listing fully rejected · owner-only',
  'market.state.listingRejected.badge': 'REJECTED',
  'market.state.listingRejected.reason': 'Reason: Prohibited item · § 86a StGB',
  'market.state.listingRejected.body': "Our AI flagged symbols that can't legally be sold in Germany. If you think this is a mistake, write us — a human will look again.",
  'market.state.listingRejected.appeal': 'Appeal · human review',
  'market.state.listingRejected.delete': 'got it, delete',

  // ─── Marketplace ─ Novel features ──────────────────────────────────────

  'market.novel.bump.title': 'Bump',
  'market.novel.bump.subtitle': 'once a week, free',
  'market.novel.bump.before': 'BEFORE',
  'market.novel.bump.after': 'AFTER',
  'market.novel.bump.afterLabel': 'back to the top',
  'market.novel.bump.cta': '↻ bump',
  'market.novel.bump.nextAvailable': 'Next bump: available in 7 days.',
  'market.novel.bump.trigger': 'TRIGGER: Owner clicks Bump · POST sets updatedAt = now · „FRESHLY BUMPED" strap expires after 24h · Rate-limit: 1×/week per listing.',

  'market.novel.decay.title': 'Stale decay',
  'market.novel.decay.subtitle': 'honest, not eternal',
  'market.novel.decay.timeline': 'TIMELINE · OPACITY + SATURATION',
  'market.novel.decay.fresh': 'fresh',
  'market.novel.decay.stale': 'stale',
  'market.novel.decay.trigger': 'TRIGGER: at render time, age = now − updatedAt · ≥21d: „altpapier" strap + opacity 0.6 + saturate 0.45 · refresh CTA for owner · hidden after 60d without a bump.',

  // ─── Marketplace ─ Backfill ─────────────────────────────────────────────

  'market.backfill.banner': 'This listing is from the old marketplace version and has not been updated yet.',

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

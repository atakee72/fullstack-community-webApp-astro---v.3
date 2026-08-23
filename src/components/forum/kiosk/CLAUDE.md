# Forum (kiosk) notes

Loaded lazily when Claude reads/edits files in `src/components/forum/kiosk/` (or any subtree). The root `CLAUDE.md` keeps a pointer to this file so it can be pulled in even when working on related files outside this directory (e.g. `src/pages/api/topics/`, `src/lib/topicsQuery.ts`).

### Compose `initialValues` must be computed synchronously (NOT in onMount)
`ComposeForm.svelte` snapshots the `initialValues` prop into local `$state` at
init (`let title = $state(initialValues?.title ?? '')`). It does **not** re-read
the prop afterwards. So `ComposePageInner` must compute `initialValues`
**synchronously at script-init time**, before the child renders — computing it in
`onMount` (which fires *after* the child has already initialized from `undefined`)
silently leaves every field empty. The island is `client:only`, so `window` (for
the `?prefill_title`/`?prefill_body` params) is available at script init; the
draft-restore store read is synchronous too. This drives both the localStorage
draft-restore and the newsboard "im Forum diskutieren" prefill. The seeded values
propagate to the preview/submit mirror automatically via ComposeForm's
`$effect(() => onChange(...))`, which fires on mount. (Bug fixed 2026-06-22 — both
paths were dead because the compute lived in onMount.)

### Multi-collection feed on `/forum`
- **Index route moved to `/forum`** with the Aug 2026 landing release — `/` is now the public landing page (Das Schaufenster), which SSR-redirects logged-in members straight to `/forum`. `KioskNav.svelte`'s `FORUM_MATCH` no longer contains `/` (`['/forum', '/topics', '/announcements', '/recommendations']`).
- The forum index merges **topics + announcements + recommendations** into a single date-desc feed via `Promise.allSettled` parallel fetch (both SSR in `src/pages/forum.astro` and the client query in `ForumIndexInner.svelte`). Each item is decorated with `kind: 'discussion' | 'announcement' | 'recommendation'`. queryKey is `['forum', 'all']`.
- **Resilience**: a `safe()` helper wraps each fetch so a single-collection outage degrades to an empty array for that kind (others still render). Throws only when all three fetches fail (`okCount === 0`) — that's the case where `query.isError` flips and `ErrorPanel` renders with its `↻ neu laden` button.
- **Kind decoration field is required**: `FORUM_QUERY_OPTIONS.fields` (`src/lib/forumQueryOptions.ts`) projects only listed fields from MongoDB. `isOfficial`, `pinnedUntil`, `rejectionReason` etc. are explicitly listed there — do NOT remove them or the merged feed loses its differentiation logic.
- Mutation invalidations in `src/lib/forumMutations.ts` target `['forum', 'all']` (not `['forum', 'topics']`).

### Per-kind detail routes
- `/topics/[id].astro` (existing) + `/announcements/[id].astro` + `/recommendations/[id].astro` (new). All three pass a `collectionType` prop to `ForumPostDetail.svelte`, which threads it into the edit/delete fetch URLs (`/api/${collectionType}/edit/[id]`) and the comment-create body. **Don't hardcode `'topics'` anywhere in `ForumPostDetail`** — the same component serves all three.
- Card link routing in `ForumIndexInner.svelte` uses a `detailHref(item)` helper that returns the right route per `item.kind`.

### Moderation visibility (author-facing banners + non-author marks)
- `OwnStatusBanner.svelte` is **author-only by design** (matches the `state.own.*` i18n namespace). `ownStatusFor()` in `ForumIndexInner.svelte` returns `'pending'` / `'rejected'` / `'reported'` ONLY when `isAuthor === true`. Non-authors get `null` → fall through to the default render branch.
- **Three render branches in the loop** wrap the author's own card in a dashed-color border + the banner above it: pending → `border-warn`, reported → `border-plum`, rejected → `border-danger`. All sized to a normal grid card slot (no col-span-3).
- **Rejected items sort to the top of `filteredRest`** (stable sort, just under any pinned official). Highest-priority "you must act" signal for the author.
- **Rejection reason surfaced to author**: `OwnStatusBanner` accepts an optional `reason` prop; when `state="rejected"` and a reason is present, renders the admin's note as an italic blockquote (`font-instrument italic`, left border-danger) below the body. `topic.rejectionReason` flows through from the DB.
- **Non-author "subtle mark"**: community-reported pending posts that fall through to the default branch get a small `⚑ GEMELDET` chip on the card via `inferredBadge` precedence in `ForumPostCard.svelte` (the `isUserReported && pending` case wins over generic `pending`). No banner, no ghost — anti-stigma, matches HN/Reddit/X norms.
- **No feed-level reported banner**: a previous "Ein Beitrag wurde gemeldet" plum banner above the grid was removed (was leaking moderation state to the public + the copy lied). Reports are private to author + admin; admin uses `/admin/moderation`.
- **Detail-page parity**: `ForumPostDetail.svelte` has `showPendingBanner` / `showReportedBanner` / `showRejectedBanner` derives, all author-only.
- **`buildModerationFilter`** in `src/lib/topicsQuery.ts` was untouched throughout — community-reported pending posts STAY visible to non-authors (anti-abuse: prevents weaponized reports being used to silence others).

### Edit lockout during moderation
- All three post edit endpoints (`/api/topics/edit/[id].ts`, `/api/announcements/edit/[id].ts`, `/api/recommendations/edit/[id].ts`) return `403 'edit_blocked_by_moderation'` when `existingTopic.moderationStatus !== 'approved' || existingTopic.hasWarningLabel`. Mirrors the comment-edit gate at `/api/comments/edit/[commentId].ts:71-76`.
- **UI mirror**: `ForumPostDetail.svelte` has a `canEdit` derived (same predicate). Edit button stays VISIBLE but `disabled` with strikethrough + cursor-not-allowed + tooltip when not editable. Visible disabled state is a clearer signal to the author than hiding the button.

### Official admin announcements
- New fields on the `announcements` collection (server-controlled, not in `AnnouncementCreateSchema`):
  - `isOfficial?: boolean` — settable only via `/api/admin/announcements/create` (admin-gated).
  - `pinnedUntil?: Date | null` — set to `now + 7d` on official-create; cleared on displacement / unpin / natural expiry.
- **Pinning rule**: up to `MAX_PINS` (3) officials can be pinned concurrently; each auto-expires after 7 days. Pinning a new one beyond the cap displaces the OLDEST pin via `displaceForPin()` (`src/lib/announcements/pin.ts`), clearing that item's `pinnedUntil` — never a bulk `updateMany`.
- **Pinned slot on the forum index** is derived client-side: officials with `isOfficial && pinnedUntil > now`, sorted newest pin first, sliced to `MAX_PINS`. Only the first (`i === 0`) renders full-width (`col-span-3`); the rest render as regular grid cards. Excluded from `filteredRest` so none appear twice.
- **Admin endpoints** at `/api/admin/announcements/{create,index,[id]}.ts`: POST creates (bypasses AI moderation since admin is trusted), GET lists officials, PATCH edits + pins/unpins via `pinnedUntil` ISO string or `null`, DELETE hard-deletes. All gated by `requireAdminSession()` from `src/lib/auth.ts` which checks `session.user.role === 'admin'`.
- **Admin dashboard**: `/admin/announcements.astro` renders `AnnounceApp.svelte` (kiosk design system, own `AdminLayout` — composer + board/archive card lists + per-card edit/pin/unpin/delete). Optimistic updates throughout (create, unpin, re-pin, delete) with a `withMove()` View Transition animating the pin displacement between board and archive, plus a two-PATCH undo (unpin the newly created post, then restore the displaced pin). See `src/components/admin/CLAUDE.md` for the full architecture.
- **Visual differentiation**: `ForumPostCard.svelte` accepts an `isOfficial?: boolean` prop. The `isInkCard = isAnnouncement && isOfficial` derived flips bg to ink + text to paper + team-badge to ochre. Community announcements stay paper-warm. Strap copy differs per the convention below.

### Strap copy convention (kiosk-i18n.ts)
- Official admin announcement → `pinned.banner.label` = `'OFFIZIELLE ANKÜNDIGUNG · MAHALLE-TEAM'` / `'OFFICIAL ANNOUNCEMENT · MAHALLE-TEAM'`.
- Community announcement → `card.strap.announcement` = `'ANKÜNDIGUNG · VON NUTZER:INNEN'` / `'ANNOUNCEMENT BY USERS'`.
- Recommendation → `card.strap.recommendation` = `'✦ EMPFEHLUNG · VON NUTZER:INNEN'` / `'✦ RECOMMENDED BY USERS'`.
- Discussion → no strap.
- **"KIEZRAT" was removed product-wide** — the term doesn't exist in this app (was an early design idea the user rejected). The Mahalle-Team badge takes its place wherever an "official voice" needs to be signalled.

### Card visual hierarchy (`ForumPostCard.svelte`)
- Border colour matches strap colour per kind: teal (announcement official + community), moss (recommendation), wine (discussion). Uniform `1.5px` thickness; the `isInkCard` condition keeps officials' weight via `2px ink-bg + teal print shadow`.
- Print shadow: `2px_2px_0_var(--k-teal)` for announcements, `2px_2px_0_var(--k-moss)` for recommendations. Discussions stay flat (the "quiet kind").
- **Card kind chip** (rendered inline in `ForumPostCard` when no strap is shown) — pixel-port of the design HTML's chip: `bg-{kind}` (wine/teal/moss) + paper text + DM Mono 10px font weight 500 + `tracking-[0.08em]` + 1px ink border + `rounded-lg` (8px) + `px-[9px] py-[3px]`. Label flips with locale via `$t['chip.discussion']` etc.
- **NOT** `<PostTypeChip>` — that component is the OUTLINED filter-pill used in the filter rail. The card kind chip is filled and inline; intentionally separate from the filter-tab visual.

### Card height convergence
- Card heights varied 3.9× (164–641px) before this fix because of variable body length + image presence + tag wrap. Two complementary edits in `ForumPostCard.svelte` converge them to ~1.4× spread:
  - **`line-clamp-3`** on the body paragraph caps how many lines body can contribute (~3 lines × 12.5px ≈ 60px max body height).
  - **`min-h-[340px]`** on the article element (skipped when `featured === true`) baselines text-only short cards to 340px so they don't get inflated to row-max in `align-items: stretch` rows that mix images and text. Image cards stay at their natural ~379px.
  - The article also gets `h-full flex flex-col` so `min-h` takes effect inside the grid stretch and content stacks vertically.
- **`featured` exception**: the welcome / pinned-official card sizes to its own content (no `min-h`). Featured cards have larger padding / fonts / image height — a 340 floor would force empty space below their natural content.
- Tailwind 3.4 ships `line-clamp-N` natively (no plugin).

### Avatar menu (all viewports)
- **Component**: `AvatarMenu.svelte`, mounted from `KioskNav.svelte`'s right slot inside a `<div class="relative">` wrapping the existing avatar `<a>`. Desktop (≥1024px): absolute-positioned (`top: calc(100% + 10px); right: 0`), no scrim — click-outside (`pointerdown`, listener attached a tick late so the opening click doesn't self-close) and `Escape` are the only non-nav dismissal paths.
- **Click toggles on all viewports**: `KioskNav`'s `handleAvatarClick` always prevents the default `/profile` nav and toggles `menuOpen` — the same DOM renders as a fixed bottom sheet + scrim below 1024px, a CSS-only switch in `global.css` (`.am-menu`/`.am-card` repositioned, `.am-scrim` shown, both gated by the same `max-width: 1023px` media query — no JS branching on viewport). The header is z-bumped to 50 while the menu is open, because the fixed bottom nav is a later `z-40` sibling stacking context; the scrim sits at `z-49`, between them, so it visually darkens (and the sheet physically covers) the bottom nav rather than leaving it bright/tappable above the overlay. Scroll-lock applies mobile-only, gated in JS by the same `(max-width: 1023px)` breakpoint via `matchMedia` — sets `overflow: hidden` on both `<html>` and `<body>` inline styles, restoring previous inline values on close (html's inline style restoration preserves the global `overflow-x: clip` sticky-fix, which stops body overflow from propagating to the viewport when only the body has overflow lock).
- **Who-am-i data**: one lazy `GET /api/profile/me` fetch per menu open (inside AvatarMenu's own `$effect`, not lifted to KioskNav) populates the handle/since line (`@handle · IM KIEZ SEIT <year>`); the name itself renders immediately from the `user` prop (session snapshot), independent of the fetch.
- **Close semantics**: `onClose` fires AFTER the 140ms fade-out (instant under `prefers-reduced-motion: reduce`). `KioskNav`'s `closeMenu()` also returns focus to the avatar (`avatarEl?.focus()`) — required by the design's focus-return constraint. Route changes close the menu for free since every menu row is a real `<a>` navigation and the island remounts on the destination page.
- **Keyboard nav**: ↑↓ cycles `[role="menuitem"]` rows, Enter follows the focused link natively (no custom handler needed). The `i === -1` branch (nothing focused yet, i.e. mouse-opened menu) sends ArrowDown to index 0 and ArrowUp to the last row — a naive `(i-1+len)%len` with `i=-1` would land one row short of the last (audited off-by-one, fixed in the plan before implementation).
- **Constraints baked into the markup**: „Abmelden" is always a WORD (never an icon-only affordance), wine + mono, in its own foot slot behind a **solid** `1.5px` ink rule (`.am-foot { border-top: 1.5px solid var(--k-ink) }`) — visually distinct from the dashed rules used elsewhere in the card. Links straight to `/logout` (real sign-out, lands on `/login?abgemeldet=1`) — never call `signOut()` directly from this component. No item counts anywhere in the menu (v1 decision — counts are a possible v2 addition). Moderation row renders only when `user.role === 'admin'` (no disabled state for non-admins — the row doesn't exist at all), plum-colored (`--k-plum`).

### Notification bell + panel
- Bell lives in `KioskNav`'s right cluster, left of the avatar (logged-in only), with 90s visible-tab count polling (`?count=1`). Panel is a structural sibling of `AvatarMenu` (outside-click a tick late, `Escape`, dual `html`+`body` scroll-lock on mobile, header z-50 bump via `bellOpen`, styles in `global.css` `.nc-*` — orphan rule) with ONE deliberate deviation: close is INSTANT, no exit fade (CD ruling).
- Visual layer from `design/handoffs/design_handoff_notify/` (hybrid glyph accents — § plum / ◉ teal, ⇄ not ◈; ink fresh-edge, Kurier-Verblassen read state; NO motion on bell/badge ever).
- Open marks all read (`POST /api/notifications/read`) while `freshIds` keeps this session's unread rows visually fresh + feeds the head's „n NEU" counter.
- Mutual exclusion with the avatar menu is free via each other's outside-click handlers.
- Copy rendered client-side from `nc.*` i18n keys (CD's NC_L copy, per-contentType variants) so the locale toggle works retroactively.
- **Foot slot hosts the push opt-in (R2, Aug 2026)**: drives through `src/lib/pushClient.ts`, five states — `hidden` (unsupported browser/no secure context, incl. missing `PUBLIC_VAPID_PUBLIC_KEY`, e.g. preview deploys), `ready` (not yet subscribed), `subscribed` (browser-side subscription present, mirrored server-side in `pushSubscriptions`), `denied` (permission previously refused — no re-prompt, just copy pointing at browser settings), `ios-install` (Safari on iOS before the PWA is installed to the home screen — push requires the installed app, not the browser tab). Subscribe/unsubscribe failures surface via `showError` (`src/utils/toast.ts`), never a silent no-op.
- Deferred: swipe-down close on the sheet.
- Write side + hooks documented in root CLAUDE.md + spec (`docs/superpowers/specs/2026-08-18-notification-center-design.md`).

### Sticky bottom bars + `KioskLayout` footer math
- **`KioskLayout.astro` mounts `<KioskFooter>` after `<main class="flex-1">`**. The footer has `mt-16` (64px margin) + `py-6` + content (~82px total). That's ~146px of vertical space already sitting between the last in-flow element of any kiosk page and the document's bottom edge.
- **For kiosk pages with a `position: fixed` bottom bar** (`ComposeStickyPublish` on `/topics/create`, `CommentComposerMobile` on `/topics/[id]`, future analogues): the bar at `bottom-12` covers the bottom 88px (iPhone notch) to 64px (Android / non-notch) of the viewport. The footer's mt-16 + content **already** provide more clearance than the bar needs to overlay safely. Don't add a big extra spacer for "scroll-end clearance" — you'll be double-counting and end up with a visible band of empty paper above the bar.
- **Rule**: at the end of an `lg:hidden` mobile flow, use a small breathing-room spacer (`h-8` = 32px) or skip the spacer entirely. With nothing extra, the last interactive element sits ~10px (iPhone) / ~34px (Android) above the bar's top edge — fully visible, tight but clean.
- **First hit**: May 2026 — initial mobile-compose polish shipped with `h-24` (96px) spacer that double-counted the footer's clearance. Visible band of empty paper above the publish bar at scroll-bottom on real mobile (not just in screenshots). Trimmed to `h-8` after diagnosis.

---

## Legacy (pre-kiosk dark-glass forum) notes

These sections describe the **legacy React forum** (`ForumWrapper` / `ForumContainer` / `lucide-react` icons / `ReadMoreModal`) at top-level `src/components/`, NOT the kiosk Svelte forum that lives in this directory. Kept for reference while legacy code still exists. The shared bits (server SSR helpers in `topicsQuery.ts`, `savedPosts` collection, image upload at `/api/posts/upload`) still apply to both forums.

### Forum List (Pagination) — legacy
- **Sticky header**: Tabs + search bar stick at `top: 16px` (`sticky top-4 z-30`), CSS-only.
- **Pagination**: Client-side slicing of `filteredItems` into pages of 12 (configurable 12/24/48). Uses the shared `Pagination` component (`src/components/ui/Pagination.tsx`) with wine accent (`#814256`). Page resets to 0 on tab switch or search. Scroll-to-top on page change.
- **Applies to all 3 forums** (Topics, Announcements, Recommendations) via the shared `collectionType` prop.

### Forum Performance (SSR prefetch + batched author lookup)
- **Shared server util**: `src/lib/topicsQuery.ts` exports `fetchCollectionWithAuthors(collection, url, currentUserId)` — applies the standard moderation filter, paginates, and populates authors via a **single `$in` lookup** (replaces the old N+1 `findOne`-per-topic). Used by `/api/topics`, `/api/announcements`, `/api/recommendations`.
- **SSR initialData**: `src/pages/index.astro` calls `fetchForumItemsForSSR('topics', userId)` in frontmatter and threads it as `initialTopics` through `ForumWrapper → ForumContainer`. The default tab hydrates with data already in react-query cache — no `/api/topics` round-trip on first paint. Other tabs fetch normally on click.
- **queryKey match**: `src/lib/forumQueryOptions.ts` exports `FORUM_QUERY_OPTIONS` (fields, sortBy, sortOrder). Imported by both SSR fetch and the client `useTopicsQuery` call so the `queryKey: [type, options]` matches byte-for-byte — critical for initialData to hit. The constant lives in its own dependency-free file because `topicsQuery.ts` pulls in `connectDB` (see "Server-only modules bleeding" in root CLAUDE.md).
- **initialData plumbing**: `useTopicsQuery(type, options, extras?)` accepts `extras.initialData`. When present, it sets `initialDataUpdatedAt: Date.now()` so the hydrated data counts as fresh for the 60s `staleTime` window (no immediate refetch).

### Forum Post Images
- **Upload**: Up to 5 images per post (topics, announcements, recommendations), 5MB each. Uploaded to Cloudinary via `POST /api/posts/upload` (session auth, folder `mahalle/posts`, transform 1200x800 limit).
- **Data model**: `images?: { url: string; publicId: string }[]` on Topic, Announcement, Recommendation types. Validated by `PostImageSchema` in `forum.schema.ts`.
- **Moderation**: `checkImagesWithGPT()` runs in parallel with text moderation on create. Flagged images → post goes to `pending` review.
- **Card layout (desktop, >= md)**: Cards with images use `flex-row` — left half (`w-1/2`) contains all content, right half shows cover image (`object-contain` on `#c9c4b9` background). Cards without images use normal `flex-col` layout. All cards have fixed height `h-[300px] md:h-[400px]`.
- **Card layout (mobile, < md)**: Image cards use news-style overlay — hero image with gradient overlay, author/date bottom-left over gradient, title + icons below image. Image is clickable to open modal. Text-only cards unchanged.
- **Icon toolbar**: All action icons (bookmark, comment, eye, heart, report, edit, delete) in a single `justify-evenly` row above the tags section. Removed from the teal author ribbon. Consistent across all screen sizes.
- **PostModal**: Image picker section between body textarea and tags. File input with preview grid, X-to-remove, counter (N/5). Images uploaded to Cloudinary on form submit (not on select). Edit mode pre-populates existing images.
- **ReadMoreModal**: CSS scroll-snap carousel (`w-[65%]` per image, shows 1.5 images). `object-contain` with `max-h-64 sm:max-h-80`. Arrow nav buttons (`<` / `>`) for 2+ images. Single image shows full width. Bookmark + like icons in modal footer.
- **Comments**: Inline in ReadMoreModal (not on card face). Simple cards matching EventViewModal pattern, newest first. `useCommentsQuery(postId)` fetches full comment data.

### Forum Save/Bookmark
- **API**: `POST/GET /api/posts/save` — toggle save/unsave with `savedPosts` collection (`{ userId, postId, savedAt }`). Same pattern as newsboard's `savedNews`.
- **Hooks**: `useSavePostMutation()` with optimistic update (instant toggle, rollback on error) + `useSavedPostsQuery(enabled)` with 5min staleTime. In `useTopicsQuery.ts`.
- **UI**: BookmarkIcon from `lucide-react`. Wine-red fill when saved, wine-red outline when unsaved. Shown in card toolbar and ReadMoreModal footer. Only visible to logged-in users.

### Forum Search & Tag Filtering
- **Search bar**: Filters cards client-side by title, body/description, author name, and tags. X button to clear search. Result count shown below search bar when active.
- **Clickable tags**: Tags on cards act as buttons — clicking sets search value to that tag, filtering all cards with that tag. Works across tab switches (search persists).
- **Tab switch animation**: `AnimatePresence` + `motion.div` keyed by `collectionType + searchValue` — slide-up animation on tab switch and search changes. Smooth scroll to top on tab switch only; search preserves scroll position.

### Forum Card Interactions
- **Clickable content**: Post text and cover image are clickable to open ReadMoreModal (both mobile and desktop). On mobile image cards the **title is also tappable** (Read & Comment link omitted there to save space).
- **EyeIcon / HeartBtn**: Accept optional `color` prop for white-on-image variants (mobile overlay). Default wine-red `#814256`.
- **Author ribbon**: Semi-transparent teal `bg-[#4b9aaa]/70` (not solid).
- **Read & Comment link**: Whitish `text-[#d4f0f4] hover:text-white`, italic, small (`text-[11px] md:text-xs`), underlined. Omitted on mobile image cards.
- **Tag pills (cards + modal)**: `bg-[#4b9aaa]/30 border border-[#4b9aaa] text-[#d4f0f4]` (greenish-white outline). Card tags clickable → set search. Capped at **3 per card**; overflow shown as `+N more` button that opens the modal (full tag list there). Long single tags truncate at `max-w-[100px]` with `title=` tooltip on hover.

### Known SEO gap — topic detail page (deferred)

`/topics/[id].astro` mounts the forum island with `client:only="svelte"`, which means the topic body, comments, and metadata are NOT in raw HTML. Empirical Googlebot fetch (2026-05-20, during the marketplace SEO work) showed only ~255 chars of nav + footer chrome on a topic-detail URL — `<title>` is there, body content isn't. Same gap on the forum homepage (sampled 5 topic titles, 0 in raw HTML).

**Fix pattern**: hybrid SSR-static + island-hydrate, same as the marketplace detail page implemented in `/marketplace/[id].astro`. Render title + body + first image in the Astro template directly; let the Svelte island layer on for interactivity (likes, comments, action toolbar). See `src/components/marketplace/kiosk/CLAUDE.md` → "Hybrid SSR-static + island-hydrate pattern" for the recipe + rationale.

**Why deferred**: surfaced during the marketplace SEO investigation, not in the original forum redesign scope. Forum traffic is primarily logged-in users navigating in-app, so the SEO impact is lower than marketplace (which is search-discovery-driven). Worth a small separate PR after the marketplace stabilizes; not urgent.

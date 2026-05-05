# Forum (kiosk) notes

Loaded lazily when Claude reads/edits files in `src/components/forum/kiosk/` (or any subtree). The root `CLAUDE.md` keeps a pointer to this file so it can be pulled in even when working on related files outside this directory (e.g. `src/pages/api/topics/`, `src/lib/topicsQuery.ts`).

### Multi-collection feed on `/`
- The forum index merges **topics + announcements + recommendations** into a single date-desc feed via `Promise.allSettled` parallel fetch (both SSR in `src/pages/index.astro` and the client query in `ForumIndexInner.svelte`). Each item is decorated with `kind: 'discussion' | 'announcement' | 'recommendation'`. queryKey is `['forum', 'all']`.
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
- **Pinning rule**: latest official replaces previous AND auto-expires after 7 days, whichever first. Server enforces invariant `at most one announcement has isOfficial=true && pinnedUntil > now` via atomic `updateMany` displacement on create.
- **Pinned slot on `/`** is derived client-side: `items.find(it => kind === 'announcement' && isOfficial && pinnedUntil > now)`. Renders as full-width `col-span-3` above the rest of the feed. Excluded from `filteredRest` so it doesn't appear twice.
- **Admin endpoints** at `/api/admin/announcements/{create,index,[id]}.ts`: POST creates (bypasses AI moderation since admin is trusted), GET lists officials, PATCH edits + pins/unpins via `pinnedUntil` ISO string or `null`, DELETE hard-deletes. All gated by `requireAdminSession()` from `src/lib/auth.ts` which checks `session.user.role === 'admin'`.
- **Admin dashboard**: `/admin/announcements.astro` renders `AdminAnnouncementsPanel.svelte` (composer + list + per-row edit/pin/unpin/delete). Refetches the list on every action — no optimistic updates.
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

# Forum (kiosk) notes

Loaded lazily when Claude reads/edits files in `src/components/forum/kiosk/` (or any subtree). The root `CLAUDE.md` keeps a pointer to this file so it can be pulled in even when working on related files outside this directory (e.g. `src/pages/api/topics/`, `src/lib/topicsQuery.ts`).

### Forum List (Pagination)
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

### Sticky bottom bars + `KioskLayout` footer math
- **`KioskLayout.astro` mounts `<KioskFooter>` after `<main class="flex-1">`**. The footer has `mt-16` (64px margin) + `py-6` + content (~82px total). That's ~146px of vertical space already sitting between the last in-flow element of any kiosk page and the document's bottom edge.
- **For kiosk pages with a `position: fixed` bottom bar** (`ComposeStickyPublish` on `/topics/create`, `CommentComposerMobile` on `/topics/[id]`, future analogues): the bar at `bottom-12` covers the bottom 88px (iPhone notch) to 64px (Android / non-notch) of the viewport. The footer's mt-16 + content **already** provide more clearance than the bar needs to overlay safely. Don't add a big extra spacer for "scroll-end clearance" — you'll be double-counting and end up with a visible band of empty paper above the bar.
- **Rule**: at the end of an `lg:hidden` mobile flow, use a small breathing-room spacer (`h-8` = 32px) or skip the spacer entirely. With nothing extra, the last interactive element sits ~10px (iPhone) / ~34px (Android) above the bar's top edge — fully visible, tight but clean.
- **First hit**: May 2026 — initial mobile-compose polish shipped with `h-24` (96px) spacer that double-counted the footer's clearance. Visible band of empty paper above the publish bar at scroll-bottom on real mobile (not just in screenshots). Trimmed to `h-8` after diagnosis.

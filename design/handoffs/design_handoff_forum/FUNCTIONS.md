# Forum redesign — Function inventory

Two lists per area: what already exists in the app (just needs the Kiosk skin) vs. what CC must build new because the design implies behavior the codebase doesn't have yet.

Audit basis: `feature/dark-glass-redesign` branch (current state).
If something here contradicts the codebase, the **codebase wins** — re-confirm with CC before building.

---

## 1 · Forum list (feed)

### ✅ Reuses existing function
- Fetch all posts, paginate / "load more"
- Filter by post type: Diskussion / Empfehlung / Ankündigung
- "Alle" + "Meine" filters (already in current UI)
- Tag filter (#kita, #verkehr, …)
- Pin post (announcements)
- "Mahalle-Team" badge from `user.role === 'admin'`
- Bookmark toggle on a post

### 🔨 New function CC must build
- "Gespeichert" filter view (list of bookmarked posts) — bookmarking exists, dedicated view may not
- Live counters in title block: 247 topics / 12 new since yesterday / 34 active now → needs a lightweight stats endpoint
- "live · letzter post vor 28 min" footer ticker → needs `latestPostAt` or websocket heartbeat
- Per-kind card treatment (ink card for announcement, moss strap for recommendation) is purely visual — no backend
- Featured/full-width slot for pinned announcement on desktop grid → frontend-only

---

## 2 · Post detail

### ✅ Reuses existing function
- Open a single post by id
- Show comments / replies
- Like (danke) on the OP post
- Bookmark on the OP post
- Share button (hardcoded URL copy)
- Report post

### 🔨 New function CC must build
- "47 mitlesend" / "live · 47 reading" presence indicator → hardcoded for now per CLAUDE.md, but eventually needs presence tracking
- "Wer mitredet · 12" sidebar (avatars of thread participants with online dot) → frontend can derive from existing reply authors; "online" dot is hardcoded for now
- "Ähnliche Themen" / Related topics sidebar → needs a similarity query (tag overlap is the cheap version)
- "5 ungelesen" unread-replies count → needs per-user read state on replies (may not exist yet — confirm)
- Reply composer with "0/3 anhang" attachment counter → reply attachments may not exist; **CONFIRM with CC** whether replies support media
- "Verifiziert im Kiez" badge on author meta → hardcoded only, NO real procedure (per CLAUDE.md)

---

## 3 · Compose (new topic)

### ✅ Reuses existing function
- Title + body + type + tags + up to 5 images
- Cloudinary image upload
- AI moderation pipeline (5-state lifecycle)
- Submit → moderating → published / flagged / rejected

### 🔨 New function CC must build
- Auto-save draft ("automatisch gespeichert · vor 4s") → drafts may exist for marketplace but **CONFIRM** for forum
- Live preview pane (right sidebar mini-card) → frontend-only, just renders form state through `<ForumPostCard />`
- Title char counter (42/80), body char counter (184/2000) → frontend-only
- Tag suggestions ("vorgeschlagen: nachbarschaft, upcycling") → needs a tag-popularity endpoint OR hardcode top tags client-side
- Markdown toolbar (B / i / U / quote / code / link) → needs markdown parser; **CONFIRM** if forum body is plain text or markdown today

---

## 4 · Moderating transition (modal)

### ✅ Reuses existing function
- The 5-state AI moderation lifecycle exists
- Final outcomes (published / flagged-pending / rejected)

### 🔨 New function CC must build
- **Streaming pipeline status to the client** — current backend likely returns one final result; the design shows 5 stages with live progress
  - Either: server-sent events / websocket to push stage updates
  - Or: cheaper — client polls + stages are time-faked client-side while the real check runs in background
  - **DECISION NEEDED** with CC on which path
- "Cancel +Z" keyboard shortcut to abort submission → new
- Optimistic insert running in parallel with the modal → new (post appears in feed the moment dialog dismisses on a clean check)

---

## 5 · Edit + delete

### ✅ Reuses existing function
- Edit own post (title / body / tags / images)
- Delete own post
- "edited" marker on edited posts
- Edit count ("3-mal bearbeitet")

### 🔨 New function CC must build
- New-paragraph yellow-highlight diff while editing → frontend-only, just shows what's been added in the current session
- "Type LÖSCHEN to confirm" delete confirmation → frontend-only
- ESC-to-cancel keyboard handler → frontend-only

---

## 6 · State matrix (10 states)

For each: design is frontend-only unless flagged.

| # | State | New work? |
|---|---|---|
| 1 | Loading skeleton | ✅ frontend-only — render skeletons while fetching |
| 2 | Empty (filter has zero results) | ✅ frontend-only |
| 3 | Empty (zero posts ever) | ✅ frontend-only |
| 4 | Error 503 | ✅ frontend-only — needs error boundary + retry handler |
| 5 | Offline / cached | 🔨 needs **service worker + cached posts** if real offline support is wanted; otherwise just show banner when `navigator.onLine === false` and last-fetched data |
| 6 | Rate-limited | 🔨 needs backend to return `429` with `retryAfter` — **CONFIRM** if rate limiting exists on forum compose |
| 7 | AI-flagged · pending review (own post) | ✅ uses existing moderation lifecycle |
| 8 | Rejected (own post) | ✅ uses existing — author-only visibility per CLAUDE.md |
| 9 | Reported by others (content held) | 🔨 needs a "post is reported, content hidden behind banner" state — **CONFIRM** if backend already hides reported posts behind a flag |
| 10 | Optimistic submit (sliding-in card) | 🔨 needs optimistic update logic in the post-list state (insert temp post → reconcile when real post arrives) |

---

## 7 · Mobile (extras)

### ✅ Reuses existing function
- All of the above, condensed

### 🔨 New function CC must build
- **Search** screen (in `kiosk-forum-extras`) → needs a search endpoint over title + body + tags
- **Bookmarks** screen (mobile) → reuses bookmark data, just a dedicated route
- Floating compose FAB (`+`) → frontend-only
- Bottom tab bar → frontend-only

---

## 8 · Motion spec (12 animations)

All frontend-only. CSS keyframes from `motion.css` in the handoff folder. No backend work.

---

## ⚠ DECISIONS CC NEEDS TO CONFIRM BEFORE BUILDING

1. Are forum **drafts** auto-saved server-side? (compose auto-save indicator)
2. Does forum **body support markdown**, or plain text only? (markdown toolbar)
3. Do **replies support image attachments**? (reply composer 0/3 counter)
4. Is the moderation pipeline **streamed** or single-response? (5-stage modal needs streaming or client-side fakery)
5. Does the backend **rate-limit forum compose**? (state #6)
6. Does the backend **hide reported posts behind a flag** for non-author users? (state #9)
7. Are **per-user read receipts on replies** already tracked? ("5 ungelesen")
8. Is there a **tag popularity / suggestions** endpoint, or should the client hardcode top tags?

---

## Suggested PR sequence

The handoff already had this; restated with function-list framing:

1. **Tokens + atomic components** — pure frontend, no backend touchpoint
2. **ForumPostCard with all 10 states** — frontend only, no backend
3. **Forum list** — backend is unchanged; just restyle + filter / live-counter wiring
4. **Detail** — restyle; defer "mitlesend" presence + related topics until later if needed
5. **Compose + edit + delete** — restyle; auto-save + markdown + tag suggestions are scope items to confirm
6. **Moderation modal** — biggest backend question; pick streaming vs. faked stages
7. **Mobile** — restyle, plus dedicated search + bookmarks routes
8. **Motion** — drop in last, behind a `prefers-reduced-motion` guard

---

End of document. Open questions go to CC; design decisions stay with the user.

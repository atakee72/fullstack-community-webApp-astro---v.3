# Calendar Split-View Redesign Plan

## Overview
Transform the calendar from toggle views (Grid/List) to a unified split-view interface with master-detail pattern.

## Design Specifications

### Layout Structure
```
Desktop (≥768px):
┌─────────────────────────┬──────────────┐
│                         │              │
│   Calendar Grid         │  Day Events  │
│      (66.67%)           │   (33.33%)   │
│                         │              │
└─────────────────────────┴──────────────┘

Mobile (<768px):
┌─────────────────────────┐
│     Calendar Grid       │
├─────────────────────────┤
│      Day Events         │
└─────────────────────────┘
```

### Key Changes
1. **Remove view toggle** - No more Grid/List switch
2. **Split container** - Calendar left (2/3), Events right (1/3)
3. **Click interaction** - Click date → Show that day's events in sidebar
4. **Responsive stacking** - Mobile: Calendar on top, events below

## Implementation Tasks

### Phase 1: Layout Restructure (45 min)
**File: `CalendarContainer.tsx`**
- Remove view mode toggle UI and state
- Create split layout with CSS Grid:
  ```tsx
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="md:col-span-2">
      <CalendarGridView />
    </div>
    <div className="md:col-span-1">
      <DayEventsList />
    </div>
  </div>
  ```
- Keep `selectedDate` state for date selection
- Pass selected date to new `DayEventsList` component

### Phase 2: Day Events List Component (1 hr)
**New File: `DayEventsList.tsx`**
```tsx
interface DayEventsListProps {
  selectedDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onEventEdit: (event: Event) => void;
  onEventDelete: (eventId: string) => void;
  user?: any;
  locale?: Locale;
}
```

**Features:**
- Filter events for selected date only
- Group under date header (reuse AgendaView grouping logic)
- Show event time and title
- Display edit/delete icons inline (only for event author)
- Empty state: "No events on this date"
- Loading state while fetching

**List Item Structure:**
```tsx
<div className="flex items-center justify-between p-2 hover:bg-gray-50">
  <button onClick={() => onEventClick(event)} className="flex-1 text-left">
    <span className="text-sm font-medium">10:00 AM</span>
    <span className="ml-2">Event Title</span>
  </button>
  {isAuthor && (
    <div className="flex gap-1">
      <button onClick={() => onEventEdit(event)}>✏️</button>
      <button onClick={() => onEventDelete(event.id)}>❌</button>
    </div>
  )}
</div>
```

### Phase 3: Event View Modal (1 hr)
**New File: `EventViewModal.tsx`** (Replace EventCard modal usage)

**Structure:**
- **Header**: Event title, category badge, close button
- **Body**:
  - Date/time with calendar icon
  - Location with map pin icon
  - Full description
  - Author info with avatar
  - Tags
- **Stats Bar**: Views, likes, comments count
- **Comments Section** (NEW):
  - List of existing comments
  - Inline comment form at bottom
  - No separate comment modal
- **NO edit/delete buttons** (moved to list)

**Key Differences from EventModal:**
- View-only (no edit mode)
- Comments inline at bottom
- Larger, more spacious design
- Full event details visible

### Phase 4: Refactor Edit/Delete Flow (30 min)
**Updates to `EventModal.tsx`:**
- Remove view mode, keep edit mode only
- Rename to `EventEditModal.tsx` for clarity
- Triggered from list item edit icon
- No overlap with view modal

**Delete Confirmation:**
- Use browser confirm() or small inline confirmation
- No modal needed for delete

### Phase 5: Comment Integration (45 min)
**Inside `EventViewModal.tsx`:**
```tsx
{/* Comments Section */}
<div className="border-t pt-4 mt-4">
  <h3 className="font-semibold mb-3">Comments ({comments.length})</h3>

  {/* Existing Comments */}
  <div className="space-y-3 max-h-60 overflow-y-auto">
    {comments.map(comment => (
      <CommentItem key={comment.id} comment={comment} />
    ))}
  </div>

  {/* Add Comment Form */}
  {user && (
    <form onSubmit={handleAddComment} className="mt-4 flex gap-2">
      <input
        type="text"
        placeholder="Add a comment..."
        className="flex-1 px-3 py-2 border rounded-md"
      />
      <button type="submit" className="px-4 py-2 bg-[#4b9aaa] text-white rounded-md">
        Post
      </button>
    </form>
  )}
</div>
```

## Component Hierarchy

```
CalendarContainer
├── CalendarGridView (left 2/3)
│   └── (existing calendar grid)
├── DayEventsList (right 1/3)
│   ├── Date Header
│   └── Event Items
│       ├── Click → Opens EventViewModal
│       ├── Edit icon → Opens EventEditModal
│       └── Delete icon → Confirmation → Delete
├── EventViewModal
│   ├── Event Details
│   └── Inline Comments
└── EventEditModal
    └── Edit Form
```

## State Management

**CalendarContainer State:**
- `selectedDate` - Currently selected date
- `viewingEvent` - Event being viewed in modal
- `editingEvent` - Event being edited
- `showViewModal` - View modal visibility
- `showEditModal` - Edit modal visibility

**Data Flow:**
1. User clicks date → `setSelectedDate(date)`
2. DayEventsList filters events for selected date
3. User clicks event → `setViewingEvent(event)` + `setShowViewModal(true)`
4. User clicks edit icon → `setEditingEvent(event)` + `setShowEditModal(true)`
5. User clicks delete icon → Confirm → Delete mutation

## Mobile Responsiveness

**Breakpoint: md (768px)**
- Desktop: Side-by-side layout
- Mobile: Stacked layout with calendar on top
- Event list becomes full width on mobile
- Modals remain centered overlays

## Benefits

1. **Reduced Clicks** - See day events immediately on date selection
2. **Better Context** - View month and day together
3. **Cleaner Actions** - Edit/delete without opening modal first
4. **Familiar Pattern** - Like Outlook, Google Calendar
5. **No Modal Stacking** - Single-purpose modals only

## Testing Checklist

- [ ] Calendar and list render side-by-side on desktop
- [ ] Layout stacks vertically on mobile
- [ ] Clicking date updates event list
- [ ] Event click opens view modal
- [ ] Edit icon opens edit modal (authors only)
- [ ] Delete icon works with confirmation
- [ ] Comments can be added inline
- [ ] Empty state shows for dates without events
- [ ] Today is pre-selected on load
- [ ] Responsive at all breakpoints

## Estimated Time: ~4 hours

1. Phase 1: Layout - 45 min
2. Phase 2: Day Events List - 1 hr
3. Phase 3: Event View Modal - 1 hr
4. Phase 4: Edit/Delete Refactor - 30 min
5. Phase 5: Comments - 45 min

## Files to Modify/Create

**New Files:**
- `src/components/DayEventsList.tsx`
- `src/components/EventViewModal.tsx`

**Modify:**
- `src/components/CalendarContainer.tsx` (major refactor)
- `src/components/EventModal.tsx` → `EventEditModal.tsx` (rename, simplify)

**Remove:**
- `src/components/AgendaView.tsx` (functionality merged into DayEventsList)
- `src/components/EventListView.tsx` (no longer needed)
- `src/components/CommentModal.tsx` (comments now inline)

## Notes

- Preserve all existing event CRUD functionality
- Maintain locale support throughout
- Keep accessibility features (ARIA labels, keyboard nav)
- Ensure smooth animations for modal transitions
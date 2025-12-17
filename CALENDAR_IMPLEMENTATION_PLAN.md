# Neighbourhood Calendar Implementation Plan

## Architecture Overview

**Strategy:** Follow existing CRUD patterns (topics/announcements/recommendations)
- **Backend:** MongoDB + Zod validation + NextAuth authentication
- **Frontend:** React + React Query + Custom CSS Grid Calendar
- **Design:** Same color scheme and component patterns as existing features

---

## Phase 1: Dependencies & Types

### 1.1 Install Date Utility Library
```bash
npm install date-fns
```
- Purpose: Date manipulation and formatting for custom calendar grid
- Lightweight: ~15KB vs 100KB+ for calendar libraries
- Full control over calendar design and functionality

**Key Functions Needed:**
- `startOfMonth`, `endOfMonth` - Month boundaries
- `startOfWeek`, `endOfWeek` - Week boundaries for padding dates
- `eachDayOfInterval` - Generate array of dates in range
- `format` - Date formatting (use `'yyyy-MM-dd'` NOT `'YYYY-MM-DD'`!)
- `isSameMonth` - Detect padding dates from prev/next months
- `isToday` - Highlight current date
- `addMonths`, `subMonths` - Month navigation

### 1.2 Add Event TypeScript Interface
**File:** `src/types/index.ts`

```typescript
export interface Event {
  _id?: ObjectId | string;
  title: string;
  body: string; // description
  author: ObjectId | string | User;
  startDate: Date;
  endDate: Date;
  location?: string;
  category?: string;
  tags: string[];
  comments: (ObjectId | string)[];
  views: number;
  likes: number;
  likedBy: (ObjectId | string)[];
  date: number; // creation timestamp
  editHistory?: EditHistory[];
  isEdited?: boolean;
  lastEditedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 1.3 Add Zod Schemas
**File:** `src/schemas/forum.schema.ts`

```typescript
export const EventCreateSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  body: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .trim(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  location: z.string().max(200).optional(),
  category: z.enum([
    'community',
    'sports-health',
    'culture-education',
    'other'
  ]).optional().default('other'),
  tags: z.array(z.string().max(30))
    .max(5, 'Maximum 5 tags allowed')
    .default([]),
  type: z.literal('event').optional()
}).refine(
  data => data.endDate >= data.startDate,
  { message: 'End date must be after start date' }
);

export const EventUpdateSchema = EventCreateSchema.partial();
```

---

## Phase 2: Backend API Routes

### 2.1 CREATE Event
**File:** `src/pages/api/events/create.ts`

**Features:**
- Authentication check (NextAuth session)
- Zod validation with EventCreateSchema
- Store in MongoDB `events` collection
- Author population
- Return created event with author details

**Pattern:** Follow `src/pages/api/topics/create.ts`

### 2.2 READ Events (List)
**File:** `src/pages/api/events/index.ts`

**Features:**
- GET endpoint with query parameters
- Filtering: date range, category, tags, search
- Sorting: date, likes, views, comments
- Pagination: limit, offset
- Field selection
- Author population

**Uses:** `src/lib/queryUtils.ts` helpers

**Pattern:** Follow `src/pages/api/announcements/index.ts`

### 2.3 UPDATE Event
**File:** `src/pages/api/events/edit/[id].ts`

**Features:**
- PUT endpoint
- Ownership verification using `isOwner()` helper
- Zod validation with EventUpdateSchema
- Edit history tracking
- Updated timestamp

**Pattern:** Follow `src/pages/api/topics/edit/[id].ts`

### 2.4 DELETE Event
**File:** `src/pages/api/events/delete/[id].ts`

**Features:**
- DELETE endpoint
- Ownership verification
- Cascade delete related comments
- Return success message

**Pattern:** Follow `src/pages/api/topics/delete/[id].ts`

---

## Phase 3: React Query Hooks

### 3.1 Custom Hooks
**File:** `src/hooks/api/useEventsQuery.ts`

```typescript
export function useEventsQuery(options?: QueryOptions) {
  return useQuery({
    queryKey: ['events', options],
    queryFn: async () => {
      const params = new URLSearchParams(options as any);
      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    }
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create event');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`/api/events/edit/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update event');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/events/delete/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete event');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}
```

---

## Phase 4: React Components

### 4.1 EventModal.tsx
**Purpose:** Create/edit event modal

**Based on:** `src/components/PostModal.tsx`

**Additional Fields:**
- Start date/time picker (`<input type="datetime-local">`)
- End date/time picker (`<input type="datetime-local">`)
- Location input field
- Category dropdown (community, sports-health, culture-education, other)
- Tags selector (reuse TagSelector component)

**Validation:**
- Client-side Zod validation
- Character counts for title/description
- Date validation (end >= start)

**Styling:**
- Burgundy gradient header: `bg-gradient-to-r from-[#814256] to-[#6a3646]`
- Beige modal body: `bg-[#c9c4b9]`
- Yellow accents: `#eccc6e`

### 4.2 CalendarGridView.tsx
**Purpose:** Custom visual calendar built with CSS Grid

**Calendar Generation Pattern (Critical!):**
```typescript
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday
} from 'date-fns';

function generateCalendarDays(currentDate: Date) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Include padding dates from prev/next months for complete weeks
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return allDays.map(day => ({
    date: day,
    isCurrentMonth: isSameMonth(day, currentDate),
    isToday: isToday(day),
    dayNumber: format(day, 'd'),
    fullDate: format(day, 'yyyy-MM-dd'),
    events: getEventsForDate(day) // Filter events for this date
  }));
}
```

**ARIA Accessibility (Required!):**
```tsx
<div
  role="grid"
  aria-label="Event Calendar"
  className="calendar-grid"
  onKeyDown={handleKeyboardNav}
>
  {/* Week day headers */}
  <div role="row" className="weekday-header">
    <div role="columnheader">Sun</div>
    {/* ...Mon-Sat */}
  </div>

  {/* Calendar date cells */}
  {weeks.map(week => (
    <div role="row" key={week}>
      {week.map(day => (
        <button
          role="gridcell"
          aria-label={format(day.date, 'EEEE, MMMM d, yyyy')}
          aria-selected={isSelected(day)}
          tabIndex={day.isToday ? 0 : -1}
          onClick={() => handleDateClick(day)}
        >
          {day.dayNumber}
        </button>
      ))}
    </div>
  ))}
</div>
```

**Keyboard Navigation:**
- Arrow Keys: Navigate between dates
- Enter/Space: Select date / open events
- Escape: Close modal/return to list
- Tab: Only today's date is tabbable (single-tab-stop pattern)

**CSS Grid Layout:**
```css
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr); /* 7 equal columns */
  gap: 0.5rem;
}
```

**Features:**
- 6-week grid (42 days) for visual consistency
- Padding dates from prev/next months (muted/gray)
- Highlight today's date (teal border)
- Color-coded event dots/badges by category
- Click date cell to filter/view events
- Mobile-responsive: Stack to list on small screens
- Event indicators: Small dots or count badges per day

**Key Functions:**
- `generateCalendarDays()` - Creates 42-day array with metadata
- `getEventsForDate(date)` - Filters events for specific date
- `handleKeyboardNav(e)` - Arrow key navigation
- `handlePrevMonth()` / `handleNextMonth()` - Navigate months
- `getCategoryColor(category)` - Returns color based on category
- `formatMonthYear(date)` - "January 2025" header

### 4.3 EventListView.tsx
**Purpose:** List/table view of events

**Features:**
- Chronological event cards
- Compact layout with key info
- Filter and search controls
- Infinite scroll or pagination
- Sort toggle

**Layout:** Similar to topic cards in ForumContainer

### 4.4 CalendarContainer.tsx
**Purpose:** Main calendar logic component

**State Management:**
- View mode toggle (grid/list)
- Filter state (date range, category, search, tags)
- Sort state (date, likes, views)
- Modal state (create/edit/view)
- Selected event

**Features:**
- Filter controls UI
- View toggle button
- Create event button
- Event CRUD operations via React Query hooks
- Loading/error states

**Pattern:** Follow `src/components/ForumContainer.tsx`

### 4.5 CalendarWrapper.tsx
**Purpose:** Wrapper with QueryProvider

**Features:**
- Wraps CalendarContainer with React Query context
- Receives session prop from Astro
- Passes session to child components

**Pattern:** Follow `src/components/ForumWrapper.tsx`

### 4.6 EventCard.tsx
**Purpose:** Individual event display component

**Reusable in:** Both grid and list views

**Displays:**
- Event title
- Date/time (formatted)
- Location with icon
- Category badge
- Author info
- Like/comment counts
- Edit/delete buttons (if owner)
- View count

**Styling:** Card layout with teal accents, similar to topic cards

---

## Phase 5: Page & Navigation

### 5.1 Create Calendar Page
**File:** `src/pages/calendar.astro`

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getSession } from 'auth-astro/server';
import CalendarWrapper from '../components/CalendarWrapper';

const session = await getSession(Astro.request);
---

<BaseLayout title="Neighbourhood Calendar - Mahalle">
  <main class="min-h-[calc(100vh-60px)] py-4 md:py-8">
    <div class="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
      <h1 class="text-center text-2xl md:text-3xl lg:text-4xl font-bold mb-3 pb-1 text-[#814256]">
        Neighbourhood Calendar
      </h1>
      <p class="text-center text-gray-600 mb-6">
        Community events and gatherings
      </p>
      <div class="bg-[#4b9aaa] px-4 md:px-8 lg:px-12 py-6 md:py-8 rounded-lg mt-6 md:mt-8">
        <CalendarWrapper client:load session={session} />
      </div>
    </div>
  </main>
</BaseLayout>
```

### 5.2 Update Navbar
**File:** `src/components/Navbar.tsx`

**Location:** After line 98 (in authenticated section)

**Add:**
```tsx
<li>
  <a
    href="/calendar"
    className="text-sm md:text-base text-gray-700 no-underline font-medium hover:text-[#4b9aaa] hover:underline transition-all px-2 md:px-3 py-1 md:py-2 rounded-md hover:bg-gray-50"
  >
    <span>📅 Calendar</span>
  </a>
</li>
```

---

## Phase 6: Features & Polish

### 6.1 Event Comments
- Reuse existing `CommentModal.tsx`
- Store comments in `comments` collection with `eventId` reference
- Display comment count on event cards
- Comment section in event detail view

### 6.2 Event Likes
- Reuse existing like mutation pattern
- Toggle like/unlike
- Display like count
- Show liked state for current user

### 6.3 View Tracking
- Increment view count when event is opened
- Display view count on event cards

### 6.4 Category Colors
**Color Mapping:**
- Community: `#4b9aaa` (teal - project primary color)
- Sports & Health: `#28a745` (green - active/vitality)
- Culture & Education: `#6f42c1` (purple - creativity/learning)
- Other: `#6c757d` (gray - neutral)

### 6.5 Mobile Responsive
- Touch-friendly calendar navigation
- Swipe gestures for month/week change
- Responsive grid/list layouts
- Bottom sheet modals on mobile

### 6.6 Loading States
- Skeleton loaders during fetch
- Spinner for mutations
- Optimistic updates

### 6.7 Error Handling
- User-friendly error messages
- Toast notifications for success/error
- Form validation errors
- Network error recovery

---

## File Summary

### New Files (13 total)

**API Routes (4 files):**
1. `src/pages/api/events/create.ts`
2. `src/pages/api/events/index.ts`
3. `src/pages/api/events/edit/[id].ts`
4. `src/pages/api/events/delete/[id].ts`

**Components (6 files):**
1. `src/components/EventModal.tsx`
2. `src/components/CalendarGridView.tsx`
3. `src/components/EventListView.tsx`
4. `src/components/CalendarContainer.tsx`
5. `src/components/CalendarWrapper.tsx`
6. `src/components/EventCard.tsx`

**Hooks (1 file):**
1. `src/hooks/api/useEventsQuery.ts`

**Pages (1 file):**
1. `src/pages/calendar.astro`

**Dependencies (1 change):**
1. `package.json` - Add date-fns

### Modified Files (4 total)

1. `src/types/index.ts` - Add Event interface
2. `src/schemas/forum.schema.ts` - Add EventCreateSchema, EventUpdateSchema
3. `src/components/Navbar.tsx` - Add calendar link
4. `package.json` - Add dependencies

---

## Event Categories

1. **Community** - General community gatherings and social meetups
2. **Sports & Health** - Sports activities, fitness events, and wellness activities
3. **Culture & Education** - Cultural events, celebrations, workshops, and learning sessions
4. **Other** - Miscellaneous events that don't fit other categories

---

## Color Palette

**Primary Colors:**
- Yellow/Gold: `#eccc6e` (background)
- Teal/Turquoise: `#4b9aaa` (primary accent)
- Burgundy/Wine: `#814256` (secondary accent)
- Darker Burgundy: `#6a3646` (hover states)
- Beige: `#c9c4b9` (modal backgrounds)
- Gray: `#aca89f` (badges)

**Component Styling:**
- Rounded corners: `rounded-lg`, `rounded-2xl`
- Shadows: `shadow-lg`, `shadow-2xl`
- Transitions: `transition-all duration-300`
- Gradients: `bg-gradient-to-r from-[#814256] to-[#6a3646]`

---

## Implementation Order

1. ✅ **Phase 1:** Dependencies & Types (foundation)
2. ✅ **Phase 2:** Backend API Routes (data layer)
3. ✅ **Phase 3:** React Query Hooks (data fetching)
4. ✅ **Phase 4:** React Components (UI layer)
5. ✅ **Phase 5:** Page & Navigation (integration)
6. ✅ **Phase 6:** Features & Polish (enhancements)

---

## Testing Checklist

**Functionality:**
- [ ] Create event (authenticated)
- [ ] View event in grid view
- [ ] View event in list view
- [ ] Edit own event
- [ ] Delete own event
- [ ] Cannot edit/delete other's events
- [ ] Add comment to event
- [ ] Like/unlike event
- [ ] Filter by date range
- [ ] Filter by category
- [ ] Search events
- [ ] Sort events (date, likes, views)
- [ ] View event details
- [ ] Mobile responsive
- [ ] Error handling
- [ ] Loading states

**Calendar Grid Specific:**
- [ ] Calendar shows 6 weeks (42 days)
- [ ] Padding dates from prev/next months are muted
- [ ] Today's date is highlighted
- [ ] Events display as dots/badges on calendar dates
- [ ] Click date to filter/view events for that day
- [ ] Month navigation (prev/next) works
- [ ] Month/year header displays correctly

**Accessibility (Critical!):**
- [ ] Calendar has `role="grid"` and `aria-label`
- [ ] Date cells have `role="gridcell"`
- [ ] Arrow keys navigate between dates
- [ ] Enter/Space selects date
- [ ] Only today's date is in tab order (single-tab-stop)
- [ ] Screen reader announces dates properly
- [ ] Screen reader announces month changes
- [ ] Keyboard navigation works without mouse
- [ ] Focus indicators are visible
- [ ] Minimum 44px touch targets on mobile

---

## Notes

- **MongoDB Collection:** `events` (no Mongoose models - using raw driver)
- **Authentication:** NextAuth session required for create/edit/delete
- **Permissions:** Users can only edit/delete their own events
- **Comments:** Reuse existing comment system with `eventId` reference
- **Likes:** Follow same pattern as topics/announcements
- **Edit History:** Track edits like other content types
- **Responsive:** Mobile-first design approach
- **Accessibility:** ARIA grid pattern required, keyboard navigation, single-tab-stop

**⚠️ Critical date-fns Warning:**
- Use `format(date, 'yyyy-MM-dd')` for calendar dates
- **NEVER** use `'YYYY-MM-DD'` (ISO week-year - breaks at year boundaries!)
- Use lowercase `yyyy` for calendar year, lowercase `dd` for day of month

**Calendar Grid Requirements:**
- Show 6 weeks (42 days) for visual consistency
- Include padding dates from previous/next months (muted gray)
- Implement ARIA grid pattern (`role="grid"`, `role="gridcell"`)
- Keyboard navigation with arrow keys (single-tab-stop pattern)
- Only today's date in tab order (`tabIndex={isToday ? 0 : -1}`)

---

## Future Enhancements (Optional)

- [ ] Recurring events
- [ ] RSVP/attendance tracking
- [ ] Event reminders/notifications
- [ ] Export to calendar (iCal/Google Calendar)
- [ ] Event photos/gallery
- [ ] Event sharing (social media)
- [ ] Event map integration
- [ ] Calendar subscriptions
- [ ] Admin moderation tools
- [ ] Event analytics

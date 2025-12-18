# Calendar Enhancement Plan

## Phase 1: Quick Wins (30 min)

### 1. Today Button
Add button to quickly jump to current date
```tsx
const handleToday = () => {
  setCurrentMonth(new Date());
  setSelectedDate(new Date());
};
```

### 2. Disable Past Dates
Prevent event creation for past dates
```tsx
const isPastDate = day.date < startOfDay(new Date());
disabled={isPastDate}
```

### 3. Locale Support (Turkish & German)
```tsx
import { tr, de } from 'date-fns/locale';
format(date, 'MMMM yyyy', { locale: tr }); // "Aralık 2025"
format(date, 'MMMM yyyy', { locale: de }); // "Dezember 2025"
```

---

## Phase 2: Swipe Gestures (45 min)

### Installation
```bash
pnpm add react-swipeable
```

### Implementation
```tsx
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => onMonthChange(addMonths(currentMonth, 1)),
  onSwipedRight: () => onMonthChange(subMonths(currentMonth, 1)),
  trackMouse: true // Enable mouse swipes for desktop testing
});

<div {...handlers} className="calendar-grid">
```

---

## Phase 3: Multi-Day Event Spanning (1 hr)

### CSS Grid Technique
```css
/* Event spans multiple days */
.event[data-span] {
  grid-column: span var(--span);
  background: linear-gradient(90deg,
    var(--category-color) 0%,
    var(--category-color) 100%);
}

/* Visual continuity */
.event-start { border-radius: 8px 0 0 8px; }
.event-middle { border-radius: 0; }
.event-end { border-radius: 0 8px 8px 0; }
```

### JavaScript
```tsx
const getEventSpan = (event: Event, weekStart: Date) => {
  const start = max([new Date(event.startDate), weekStart]);
  const end = min([new Date(event.endDate), addDays(weekStart, 6)]);
  return differenceInDays(end, start) + 1;
};
```

---

## Phase 4: Agenda View (1 hr)

### Component Structure
```tsx
interface AgendaViewProps {
  events: Event[];
  dateRange: { start: Date; end: Date };
}

// Group events by date
const eventsByDate = groupBy(events, event =>
  format(event.startDate, 'yyyy-MM-dd')
);

// Render day sections
{Object.entries(eventsByDate).map(([date, dayEvents]) => (
  <div key={date} className="agenda-day">
    <h3>{format(parseISO(date), 'EEEE, MMMM d')}</h3>
    {dayEvents.map(event => (
      <AgendaEventCard event={event} />
    ))}
  </div>
))}
```

---

## Technical Stack

### Dependencies
- `date-fns` (already installed) - Date manipulation & locales
- `react-swipeable` (16KB) - Touch/mouse swipe gestures

### Browser Support
- Touch events: iOS Safari 10+, Chrome 55+
- CSS Grid: All modern browsers
- Pointer events: IE11+ with polyfill

### Accessibility
- Maintain keyboard navigation (arrow keys)
- ARIA labels for all interactive elements
- Screen reader announcements for month changes
- Focus management for date selection

---

## Implementation Order

1. **Phase 1** first - Immediate value, no dependencies
2. **Phase 2** next - Enhances mobile UX significantly
3. **Phase 3** - Visual improvement for multi-day events
4. **Phase 4** - Alternative view for power users

## Estimated Total Time: ~3.5 hours

---

## Testing Checklist

- [ ] Today button scrolls to current date
- [ ] Past dates are disabled for event creation
- [ ] Turkish locale shows correct month/day names
- [ ] German locale shows correct month/day names
- [ ] Swipe left advances month
- [ ] Swipe right goes to previous month
- [ ] Multi-day events span correctly
- [ ] Week-crossing events split properly
- [ ] Agenda view groups events by date
- [ ] All features work on mobile devices
- [ ] Keyboard navigation still functions
- [ ] Screen readers announce changes
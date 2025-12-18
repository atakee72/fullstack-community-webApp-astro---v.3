import React, { useState, useEffect, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  startOfDay,
  isBefore,
  type Locale
} from 'date-fns';
import type { Event } from '../types';

interface CalendarGridViewProps {
  events: Event[];
  currentMonth: Date;
  onMonthChange: (newMonth: Date) => void;
  onDateClick: (date: Date) => void;
  selectedDate?: Date;
  onEventClick?: (event: Event) => void;
  locale?: Locale;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayNumber: string;
  fullDate: string;
  events: Event[];
}

const categoryColors: Record<string, string> = {
  'community': '#4b9aaa',
  'sports-health': '#28a745',
  'culture-education': '#6f42c1',
  'other': '#6c757d'
};

export default function CalendarGridView({
  events,
  currentMonth,
  onMonthChange,
  onDateClick,
  selectedDate,
  onEventClick,
  locale
}: CalendarGridViewProps) {
  const [focusedDateIndex, setFocusedDateIndex] = useState<number>(0);

  // Generate calendar days (42 days for consistent 6-week grid)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Include padding dates from prev/next months for complete weeks
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return allDays.map((day): CalendarDay => {
      // Filter events that fall on this day
      const dayEvents = events.filter((event) => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        // Event falls on this day if day is between start and end (inclusive)
        return day >= new Date(format(eventStart, 'yyyy-MM-dd')) &&
               day <= new Date(format(eventEnd, 'yyyy-MM-dd'));
      });

      return {
        date: day,
        isCurrentMonth: isSameMonth(day, currentMonth),
        isToday: isToday(day),
        dayNumber: format(day, 'd'),
        fullDate: format(day, 'yyyy-MM-dd'),
        events: dayEvents
      };
    });
  }, [currentMonth, events]);

  // Set initial focus to today's date
  useEffect(() => {
    const todayIndex = calendarDays.findIndex(day => day.isToday);
    if (todayIndex !== -1) {
      setFocusedDateIndex(todayIndex);
    }
  }, [calendarDays]);

  // Keyboard navigation handler
  const handleKeyboardNav = (e: React.KeyboardEvent) => {
    const maxIndex = calendarDays.length - 1;
    let newIndex = focusedDateIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = Math.max(0, focusedDateIndex - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = Math.min(maxIndex, focusedDateIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.max(0, focusedDateIndex - 7);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.min(maxIndex, focusedDateIndex + 7);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onDateClick(calendarDays[focusedDateIndex].date);
        return;
      case 'Escape':
        e.preventDefault();
        // Could trigger close or other action
        return;
      default:
        return;
    }

    setFocusedDateIndex(newIndex);
    // Focus the button element
    const button = document.querySelector(`[data-date-index="${newIndex}"]`) as HTMLButtonElement;
    button?.focus();
  };

  const handlePrevMonth = () => {
    onMonthChange(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    const today = new Date();
    onMonthChange(today);
    onDateClick(today);
  };

  // Get localized weekday names
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      return format(day, 'EEE', { locale });
    });
  }, [locale]);

  // Swipe gesture handlers for month navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNextMonth(),
    onSwipedRight: () => handlePrevMonth(),
    delta: 50, // Minimum swipe distance (px)
    preventScrollOnSwipe: false, // Allow vertical scrolling
    trackMouse: true, // Enable mouse drag swipes on desktop
    trackTouch: true, // Enable touch swipes on mobile
  });

  // Split days into weeks for better structure
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 md:p-6" {...swipeHandlers}>
      {/* Calendar Header with Month Navigation */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <span className="text-xl md:text-2xl">◀</span>
        </button>

        <div className="flex items-center gap-3 flex-1 justify-center">
          <h2 className="text-xl md:text-2xl font-bold text-[#814256]">
            {format(currentMonth, 'MMMM yyyy', { locale })}
          </h2>
          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm font-medium bg-[#4b9aaa] text-white rounded-md hover:bg-[#3a7a8a] transition-colors"
            aria-label="Jump to today"
          >
            📍 Today
          </button>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <span className="text-xl md:text-2xl">▶</span>
        </button>
      </div>

      {/* Calendar Grid */}
      <div
        role="grid"
        aria-label={`Event Calendar for ${format(currentMonth, 'MMMM yyyy')}`}
        className="calendar-grid"
        onKeyDown={handleKeyboardNav}
      >
        {/* Week day headers */}
        <div role="row" className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              role="columnheader"
              className="text-center text-xs md:text-sm font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar date cells */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} role="row" className="grid grid-cols-7 gap-1">
            {week.map((day, dayIndex) => {
              const dateIndex = weekIndex * 7 + dayIndex;
              const isSelected = selectedDate && isSameDay(day.date, selectedDate);
              const isFocused = focusedDateIndex === dateIndex;
              const isPastDate = isBefore(startOfDay(day.date), startOfDay(new Date()));

              return (
                <button
                  key={day.fullDate}
                  role="gridcell"
                  data-date-index={dateIndex}
                  aria-label={`${format(day.date, 'EEEE, MMMM d, yyyy', { locale })}${
                    day.events.length > 0 ? `, ${day.events.length} event${day.events.length > 1 ? 's' : ''}` : ''
                  }${isPastDate ? ' (past date)' : ''}`}
                  aria-selected={isSelected}
                  tabIndex={day.isToday ? 0 : -1}
                  onClick={() => onDateClick(day.date)}
                  onFocus={() => setFocusedDateIndex(dateIndex)}
                  className={`
                    relative min-h-[60px] md:min-h-[80px] p-1 md:p-2 rounded-lg border-2 transition-all
                    ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${day.isToday ? 'border-[#4b9aaa] ring-2 ring-[#4b9aaa]/30' : 'border-gray-200'}
                    ${isSelected ? 'bg-[#eccc6e]/20 border-[#eccc6e]' : ''}
                    ${isFocused ? 'ring-2 ring-offset-1 ring-[#814256]' : ''}
                    ${isPastDate ? 'opacity-60 cursor-default' : 'hover:bg-gray-50 hover:border-[#4b9aaa]/50 cursor-pointer'}
                    focus:outline-none focus:ring-2 focus:ring-[#814256]
                  `}
                >
                  {/* Day number */}
                  <div
                    className={`
                      text-sm md:text-base font-medium mb-1
                      ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                      ${day.isToday ? 'text-[#4b9aaa] font-bold' : ''}
                    `}
                  >
                    {day.dayNumber}
                  </div>

                  {/* Event indicators - Enhanced with multi-day spanning */}
                  {day.events.length > 0 && (
                    <div className="flex flex-col gap-0.5 mt-1">
                      {day.events.slice(0, 3).map((event, idx) => {
                        const eventStart = startOfDay(new Date(event.startDate));
                        const eventEnd = startOfDay(new Date(event.endDate));
                        const currentDay = startOfDay(day.date);

                        // Check if this is a multi-day event
                        const isMultiDay = eventEnd.getTime() > eventStart.getTime();
                        const isEventStart = currentDay.getTime() === eventStart.getTime();
                        const isEventEnd = currentDay.getTime() === eventEnd.getTime();
                        const isEventMiddle = currentDay > eventStart && currentDay < eventEnd;

                        if (isMultiDay) {
                          // Show as a bar for multi-day events
                          return (
                            <div
                              key={idx}
                              className="h-1 md:h-1.5 relative -mx-1 md:-mx-2"
                              style={{
                                backgroundColor: categoryColors[event.category || 'other'],
                                borderRadius: isEventStart ? '4px 0 0 4px' : isEventEnd ? '0 4px 4px 0' : '0'
                              }}
                              title={`${event.title} ${isEventStart ? '(starts)' : isEventEnd ? '(ends)' : '(ongoing)'}`}
                            />
                          );
                        } else {
                          // Show as a dot for single-day events
                          return (
                            <div
                              key={idx}
                              className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full inline-block mr-0.5"
                              style={{ backgroundColor: categoryColors[event.category || 'other'] }}
                              title={event.title}
                            />
                          );
                        }
                      })}
                      {day.events.length > 3 && (
                        <span className="text-[10px] md:text-xs text-gray-600 font-medium">
                          +{day.events.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Event count badge (mobile) */}
                  {day.events.length > 0 && (
                    <div className="md:hidden absolute top-1 right-1 bg-[#4b9aaa] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                      {day.events.length}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#4b9aaa]"></div>
            <span className="text-gray-600">Community</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#28a745]"></div>
            <span className="text-gray-600">Sports & Health</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#6f42c1]"></div>
            <span className="text-gray-600">Culture & Education</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#6c757d]"></div>
            <span className="text-gray-600">Other</span>
          </div>
        </div>
      </div>
    </div>
  );
}

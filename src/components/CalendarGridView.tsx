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
    // weekStartsOn: 1 means Monday (German/European standard)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return allDays.map((day): CalendarDay => {
      // Filter events that fall on this day
      const dayEvents = events.filter((event) => {
        const eventStart = startOfDay(new Date(event.startDate));
        const eventEnd = startOfDay(new Date(event.endDate));
        const currentDay = startOfDay(day);

        // Event falls on this day if day is between start and end (inclusive)
        // Using startOfDay to normalize all dates to midnight for consistent comparison
        return currentDay >= eventStart && currentDay <= eventEnd;
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

  // Get localized weekday names starting with Monday
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
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
    <div className="bg-[#c9c4b9] rounded-lg shadow-lg p-2 md:p-3 lg:p-4" {...swipeHandlers}>
      {/* Calendar Header with Month Navigation */}
      <div className="mb-2 md:mb-3">
        <div className="flex items-center justify-between gap-1.5 md:gap-2 mb-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <span className="text-lg md:text-xl lg:text-2xl text-[#4b9aaa]">◀</span>
          </button>

          <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-[#814256]">
            {format(currentMonth, 'MMMM yyyy', { locale })}
          </h2>

          <button
            onClick={handleNextMonth}
            className="p-1 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <span className="text-lg md:text-xl lg:text-2xl text-[#4b9aaa]">▶</span>
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleToday}
            className="px-2 md:px-3 py-1 text-xs md:text-sm font-medium bg-[#4b9aaa] text-white rounded-md hover:bg-[#3a7a8a] transition-colors flex items-center gap-1"
            aria-label="Jump to today"
          >
            <span className="text-xs md:text-sm">📍</span>
            <span>Today</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        role="grid"
        aria-label={`Event Calendar for ${format(currentMonth, 'MMMM yyyy')}`}
        className="calendar-grid"
        onKeyDown={handleKeyboardNav}
      >
        {/* Week day headers */}
        <div role="row" className="grid grid-cols-7 gap-1 md:gap-1.5 lg:gap-2 mb-1.5 md:mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              role="columnheader"
              className="text-center text-[10px] md:text-xs lg:text-sm font-semibold text-gray-600 py-1 md:py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar date cells */}
        <div className="space-y-1 md:space-y-1.5 lg:space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} role="row" className="grid grid-cols-7 gap-1 md:gap-1.5 lg:gap-2">
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
                    relative min-h-[40px] md:min-h-[55px] lg:min-h-[65px] p-0.5 md:p-1 lg:p-2 rounded-md md:rounded-lg border-2 transition-all
                    ${day.isCurrentMonth ? (isPastDate ? 'bg-white' : 'bg-[#eccc6e]/70') : (isPastDate ? 'bg-gray-50' : 'bg-[#eccc6e]/30')}
                    ${day.isToday ? 'border-[#4b9aaa] ring-2 ring-[#4b9aaa]/30' : 'border-gray-200'}
                    ${isSelected ? 'bg-[#eccc6e] border-[#eccc6e]' : ''}
                    ${isFocused ? 'ring-2 ring-offset-1 ring-[#814256]' : ''}
                    ${isPastDate ? 'opacity-60 cursor-default' : 'hover:bg-[#eccc6e]/85 hover:border-[#4b9aaa]/50 cursor-pointer'}
                    focus:outline-none focus:ring-2 focus:ring-[#814256]
                  `}
                >
                  {/* Day number */}
                  <div
                    className={`
                      text-xs md:text-sm lg:text-base font-medium mb-0.5 md:mb-1
                      ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                      ${day.isToday ? 'text-[#4b9aaa] font-bold' : ''}
                    `}
                  >
                    {day.dayNumber}
                  </div>

                  {/* Event indicators - Dots for single-day, bars for multi-day */}
                  {day.events.length > 0 && (
                    <>
                      {/* Single-day event dots - Top right corner */}
                      <div className="absolute top-1 right-1 flex gap-0.5 justify-end z-10">
                        {day.events.filter(event => {
                          return isSameDay(new Date(event.startDate), new Date(event.endDate));
                        }).slice(0, 3).map((event, idx) => (
                          <div
                            key={`dot-${idx}`}
                            className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full"
                            style={{
                              backgroundColor: categoryColors[event.category || 'other']
                            }}
                            title={event.title}
                          />
                        ))}
                      </div>

                      {/* Multi-day event bars - Below day number */}
                      <div className="flex flex-col gap-0.5 mt-0.5 md:mt-1">
                        {day.events.filter(event => {
                          // Only multi-day events - use isSameDay
                          return !isSameDay(new Date(event.startDate), new Date(event.endDate));
                        }).slice(0, 3).map((event, idx) => {
                          const eventStart = new Date(event.startDate);
                          const eventEnd = new Date(event.endDate);

                          // Check if current day is start or end of event
                          const isEventStart = isSameDay(day.date, eventStart);
                          const isEventEnd = isSameDay(day.date, eventEnd);

                          // Show as a bar for multi-day events
                          return (
                            <div
                              key={`bar-${idx}`}
                              className="h-px md:h-0.5 relative -mx-0.5 md:-mx-1 lg:-mx-2"
                              style={{
                                backgroundColor: categoryColors[event.category || 'other'],
                                borderRadius: isEventStart ? '4px 0 0 4px' : isEventEnd ? '0 4px 4px 0' : '0'
                              }}
                              title={`${event.title} ${isEventStart ? '(starts)' : isEventEnd ? '(ends)' : '(ongoing)'}`}
                            />
                          );
                        })}
                        {day.events.filter(event => {
                          return !isSameDay(new Date(event.startDate), new Date(event.endDate));
                        }).length > 3 && (
                          <span className="text-[8px] md:text-[10px] lg:text-xs text-gray-600 font-medium">
                            +{day.events.filter(event => {
                              return !isSameDay(new Date(event.startDate), new Date(event.endDate));
                            }).length - 3}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                </button>
              );
            })}
          </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 md:mt-3 lg:mt-4 pt-2 md:pt-3 lg:pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-2 md:gap-3 text-[8px] md:text-[10px] lg:text-xs">
          <div className="flex items-center gap-1 md:gap-1.5">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#4b9aaa]"></div>
            <span className="text-gray-600">Community</span>
          </div>
          <div className="flex items-center gap-1 md:gap-1.5">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#28a745]"></div>
            <span className="text-gray-600">Sports & Health</span>
          </div>
          <div className="flex items-center gap-1 md:gap-1.5">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#6f42c1]"></div>
            <span className="text-gray-600">Culture & Education</span>
          </div>
          <div className="flex items-center gap-1 md:gap-1.5">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#6c757d]"></div>
            <span className="text-gray-600">Other</span>
          </div>
        </div>
      </div>
    </div>
  );
}

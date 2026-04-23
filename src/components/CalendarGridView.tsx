import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'motion/react';
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
import { CalendarCheck } from 'lucide-react';
import type { Event } from '../types';

interface CalendarGridViewProps {
  events: Event[];
  currentMonth: Date;
  onMonthChange: (newMonth: Date) => void;
  onClearSelection?: () => void;
  onDateClick: (date: Date, opts?: { range?: boolean }) => void;
  selectedDate?: Date;
  rangeStart?: Date;
  rangeEnd?: Date;
  onCreateFromRange?: () => void;
  isLoggedIn?: boolean;
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
  'sports-health': '#3ed77a',
  'culture-education': '#9775e8',
  'other': '#9ca3af'
};

export default function CalendarGridView({
  events,
  currentMonth,
  onMonthChange,
  onClearSelection,
  onDateClick,
  selectedDate,
  rangeStart,
  rangeEnd,
  onCreateFromRange,
  isLoggedIn,
  onEventClick,
  locale
}: CalendarGridViewProps) {
  const [focusedDateIndex, setFocusedDateIndex] = useState<number>(0);
  const direction = useRef(1); // 1 = forward (slide left), -1 = backward (slide right)

  // Long-press state for mobile range selection. If the pointer stays down on
  // a cell for >= 450ms we mark the next click as a "range click" and suppress
  // the tap visual. Touch users can't hold shift, so this is the mobile-
  // equivalent opt-in into range mode.
  const longPressFired = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pulseDateIndex, setPulseDateIndex] = useState<number | null>(null);
  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

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
    direction.current = -1;
    onMonthChange(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    direction.current = 1;
    onMonthChange(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    const today = new Date();
    direction.current = today > currentMonth ? 1 : -1;
    onMonthChange(today);
    onClearSelection?.();
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
    <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.15] border-t-white/30 border-l-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-lg p-2 md:p-3 lg:p-4 pb-5 md:pb-6 lg:pb-7" {...swipeHandlers}>
      {/* Calendar Header with Month Navigation */}
      <div className="mb-2 md:mb-3">
        <div className="flex items-center justify-between gap-1.5 md:gap-2 mb-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 md:p-2 bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <span className="text-lg md:text-xl lg:text-2xl text-white/70 hover:text-white">◀</span>
          </button>

          <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-[#d4af37] overflow-hidden font-['Space_Grotesk',sans-serif]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={format(currentMonth, 'yyyy-MM')}
                initial={{ y: direction.current * 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: direction.current * -20, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="inline-block"
              >
                {format(currentMonth, 'MMMM yyyy', { locale })}
              </motion.span>
            </AnimatePresence>
          </h2>

          <button
            onClick={handleNextMonth}
            className="p-1 md:p-2 bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <span className="text-lg md:text-xl lg:text-2xl text-white/70 hover:text-white">▶</span>
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleToday}
            className="px-3 md:px-4 py-1.5 text-xs md:text-sm font-semibold border-2 border-[#d4af37] text-[#d4af37] bg-[#d4af37]/10 rounded-md shadow-[0_0_12px_rgba(212,175,55,0.2)] hover:bg-[#d4af37]/20 hover:shadow-[0_0_16px_rgba(212,175,55,0.35)] transition-all flex items-center gap-1.5"
            aria-label="Jump to today"
          >
            <CalendarCheck className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={1.75} />
            <span>Today</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        role="grid"
        aria-label={`Event Calendar for ${format(currentMonth, 'MMMM yyyy')}`}
        className="calendar-grid overflow-x-clip"
        onKeyDown={handleKeyboardNav}
      >
        {/* Week day headers */}
        <div role="row" className="grid grid-cols-7 gap-1 md:gap-1.5 lg:gap-2 mb-1.5 md:mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              role="columnheader"
              className="text-center text-[10px] md:text-xs lg:text-sm font-semibold text-white/70 py-1 md:py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar date cells */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={format(currentMonth, 'yyyy-MM')}
            initial={{ x: direction.current * 150, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction.current * -150, opacity: 0 }}
            transition={{
              x: { type: 'spring', stiffness: 200, damping: 25, mass: 0.8 },
              opacity: { duration: 0.2 },
            }}
            className="space-y-1 md:space-y-1.5 lg:space-y-2"
          >
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} role="row" className="grid grid-cols-7 gap-1 md:gap-1.5 lg:gap-2">
            {week.map((day, dayIndex) => {
              const dateIndex = weekIndex * 7 + dayIndex;
              const isSelected = selectedDate && isSameDay(day.date, selectedDate);
              const isFocused = focusedDateIndex === dateIndex;
              const isPastDate = isBefore(startOfDay(day.date), startOfDay(new Date()));

              // Range selection state
              const hasRange = rangeStart && rangeEnd;
              const isRangeStart = rangeStart && isSameDay(day.date, rangeStart);
              const isRangeEnd = rangeEnd && isSameDay(day.date, rangeEnd);
              const isInRange = hasRange
                && startOfDay(day.date) >= startOfDay(rangeStart)
                && startOfDay(day.date) <= startOfDay(rangeEnd);
              const isActionDate = !isPastDate && (isRangeEnd || (!rangeEnd && isRangeStart));

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
                  title={isLoggedIn && !isPastDate && rangeStart && !isSameDay(day.date, rangeStart)
                    ? 'Shift+Click (or long-press on mobile) to select a date range'
                    : undefined}
                  onClick={(e) => {
                    const range = e.shiftKey || e.metaKey || e.ctrlKey || longPressFired.current;
                    longPressFired.current = false;
                    onDateClick(day.date, { range });
                  }}
                  onPointerDown={(e) => {
                    if (e.pointerType !== 'touch') return;
                    if (isPastDate) return;
                    clearLongPress();
                    longPressTimer.current = setTimeout(() => {
                      longPressFired.current = true;
                      // Haptic feedback where supported (Android Chrome/Firefox).
                      // iOS Safari has no Vibration API — visual pulse below
                      // acts as the cross-platform confirmation.
                      if ('vibrate' in navigator) {
                        try { navigator.vibrate([30, 30, 30]); } catch {}
                      }
                      // Visual ping: scale + gold ring pulse on the cell.
                      setPulseDateIndex(dateIndex);
                      setTimeout(() => setPulseDateIndex(null), 400);
                    }, 450);
                  }}
                  onPointerUp={clearLongPress}
                  onPointerCancel={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onFocus={() => setFocusedDateIndex(dateIndex)}
                  className={`
                    relative min-h-[40px] md:min-h-[55px] lg:min-h-[65px] p-0.5 md:p-1 lg:p-2 rounded-md md:rounded-lg border transition-all
                    ${hasRange && isInRange
                      ? (isRangeStart || isRangeEnd
                          ? 'bg-[#d4af37]/30 border-2 border-[#6F2F59]'
                          : 'bg-[#d4af37]/15 border-[#6F2F59]/40')
                      : (!rangeEnd && isRangeStart)
                        ? 'bg-[#d4af37]/30 border-[#d4af37]'
                        : isSelected
                          ? 'bg-[#d4af37] text-[#0e1033] border-[#d4af37]'
                          : day.isCurrentMonth
                            ? (isPastDate ? 'bg-transparent text-white/30 pointer-events-none border-transparent' : 'bg-white/[0.04] border-white/10 text-white/90 hover:bg-white/[0.08]')
                            : (isPastDate ? 'bg-transparent text-white/30 pointer-events-none border-transparent' : 'bg-transparent text-white/30 border-transparent')
                    }
                    ${day.isToday && !(hasRange && isInRange) && !(!rangeEnd && isRangeStart) ? 'border-[#d4af37] ring-2 ring-[#d4af37]/60' : (day.isToday ? 'ring-2 ring-[#d4af37]/60' : '')}
                    ${isFocused ? 'ring-2 ring-offset-1 ring-[#d4af37]' : ''}
                    ${pulseDateIndex === dateIndex ? 'longpress-pulse' : ''}
                    ${isPastDate ? ''
                      : hasRange && isInRange
                        ? 'hover:bg-[#d4af37]/40 hover:border-[#6F2F59] cursor-pointer'
                        : !rangeEnd && isRangeStart
                          ? 'hover:bg-[#d4af37]/40 hover:border-[#d4af37] cursor-pointer'
                          : 'hover:border-[#d4af37]/50 cursor-pointer'
                    }
                    focus:outline-none focus:ring-2 focus:ring-[#d4af37]
                  `}
                >
                  {/* Day number */}
                  <div
                    className={`
                      text-xs md:text-sm lg:text-base font-medium mb-0.5 md:mb-1
                      ${day.isCurrentMonth ? (isSelected ? 'text-[#0e1033]' : 'text-[#e8e6e1]') : 'text-white/40'}
                      ${day.isToday && !isSelected ? 'text-[#d4af37] font-bold' : ''}
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
                            className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full border"
                            style={{
                              borderColor: categoryColors[event.category || 'other']
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
                          <span className="text-[8px] md:text-[10px] lg:text-xs text-white/60 font-medium">
                            +{day.events.filter(event => {
                              return !isSameDay(new Date(event.startDate), new Date(event.endDate));
                            }).length - 3}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Speech-bubble tooltip to create event on action date */}
                  {isActionDate && isLoggedIn && onCreateFromRange && (
                    <div
                      className="absolute -top-9 left-1/2 -translate-x-1/2 z-30"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateFromRange();
                        }}
                        className="bg-[#d4af37] text-[#0e1033] rounded-lg
                                   px-2 py-0.5 md:px-2.5 md:py-1
                                   text-[10px] md:text-xs font-semibold
                                   hover:bg-[#b89030] transition-colors
                                   shadow-lg whitespace-nowrap
                                   flex items-center gap-0.5"
                        aria-label="Create event on selected date"
                      >
                        <span className="text-sm md:text-base leading-none">+</span>
                        <span className="hidden sm:inline">Event</span>
                      </button>
                      {/* Arrow pointing down */}
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-0 h-0
                                      border-l-[6px] border-l-transparent
                                      border-r-[6px] border-r-transparent
                                      border-t-[6px] border-t-[#d4af37]" />
                    </div>
                  )}

                </button>
              );
            })}
          </div>
          ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Range-selection hint — only shown when user is logged in, so we don't
          nag logged-out viewers with an action they can't take. Short, calm. */}
      {isLoggedIn && (
        <p className="mt-3 text-center text-[10px] md:text-xs text-white/50 italic">
          <span className="hidden md:inline">Tip: Shift+click another day to select a date range.</span>
          <span className="md:hidden">Tip: long-press another day to select a date range.</span>
        </p>
      )}

    </div>
  );
}

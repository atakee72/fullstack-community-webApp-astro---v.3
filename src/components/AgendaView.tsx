import React, { useMemo } from 'react';
import { format, parseISO, startOfDay, isSameDay } from 'date-fns';
import type { Locale } from 'date-fns';
import EventCard from './EventCard';
import type { Event } from '../types';

interface AgendaViewProps {
  events: Event[];
  user?: any;
  isLoading?: boolean;
  onEventEdit: (event: Event) => void;
  onEventDelete: (eventId: string) => void;
  onEventLike: (eventId: string, isCurrentlyLiked: boolean) => void;
  onCommentClick: (event: Event) => void;
  deletingEventId?: string;
  locale?: Locale;
  dateRange?: { start: Date; end: Date };
}

export default function AgendaView({
  events,
  user,
  isLoading = false,
  onEventEdit,
  onEventDelete,
  onEventLike,
  onCommentClick,
  deletingEventId,
  locale,
  dateRange
}: AgendaViewProps) {
  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, Event[]>();

    events.forEach(event => {
      const eventDate = format(new Date(event.startDate), 'yyyy-MM-dd');

      if (!grouped.has(eventDate)) {
        grouped.set(eventDate, []);
      }
      grouped.get(eventDate)!.push(event);
    });

    // Sort dates chronologically
    const sortedDates = Array.from(grouped.keys()).sort();

    // Create sorted map
    const sortedMap = new Map<string, Event[]>();
    sortedDates.forEach(date => {
      const dayEvents = grouped.get(date)!;
      // Sort events within each day by start time
      dayEvents.sort((a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      sortedMap.set(date, dayEvents);
    });

    return sortedMap;
  }, [events]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#4b9aaa]"></div>
        <p className="text-gray-600 mt-2">Loading events...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-bold text-gray-700 mb-2">No Events Found</h3>
        <p className="text-gray-600">
          Be the first to create an event for your neighbourhood!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(eventsByDate.entries()).map(([dateString, dayEvents]) => {
        const date = parseISO(dateString);
        const isToday = isSameDay(date, new Date());

        return (
          <div key={dateString} className="space-y-3">
            {/* Date Header */}
            <div className={`
              sticky top-0 z-10 bg-white border-l-4 px-4 py-2 rounded-r-lg shadow-sm
              ${isToday ? 'border-[#4b9aaa] bg-[#4b9aaa]/5' : 'border-gray-300'}
            `}>
              <div className="flex items-center gap-2">
                {isToday && (
                  <span className="px-2 py-0.5 bg-[#4b9aaa] text-white text-xs font-semibold rounded">
                    Today
                  </span>
                )}
                <h3 className="text-lg md:text-xl font-bold text-gray-800">
                  {format(date, 'EEEE, MMMM d, yyyy', { locale })}
                </h3>
                <span className="text-sm text-gray-500">
                  ({dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {/* Events for this date */}
            <div className="space-y-3 pl-4 md:pl-6">
              {dayEvents.map((event) => {
                const startTime = format(new Date(event.startDate), 'h:mm a');
                const endTime = format(new Date(event.endDate), 'h:mm a');
                const isSameDate = isSameDay(
                  new Date(event.startDate),
                  new Date(event.endDate)
                );

                return (
                  <div key={event._id as string} className="relative">
                    {/* Time indicator */}
                    <div className="absolute -left-4 md:-left-6 top-4 text-right">
                      <div className="text-xs md:text-sm font-medium text-[#814256] whitespace-nowrap">
                        {startTime}
                      </div>
                      {!isSameDate && (
                        <div className="text-[10px] md:text-xs text-gray-500">
                          Multi-day
                        </div>
                      )}
                    </div>

                    {/* Event Card */}
                    <EventCard
                      event={event}
                      user={user}
                      onEdit={onEventEdit}
                      onDelete={onEventDelete}
                      onLikeToggle={onEventLike}
                      onCommentClick={onCommentClick}
                      compact={false}
                      isDeleting={deletingEventId === event._id}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

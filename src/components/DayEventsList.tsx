import React, { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import type { Locale } from 'date-fns';
import type { Event } from '../types';
import { confirmAction } from '../utils/toast';

interface DayEventsListProps {
  selectedDate: Date | undefined;
  events: Event[];
  onEventClick: (event: Event) => void;
  onEventEdit: (event: Event) => void;
  onEventDelete: (eventId: string) => void;
  user?: any;
  locale?: Locale;
  isLoading?: boolean;
  deletingEventId?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export default function DayEventsList({
  selectedDate,
  events,
  onEventClick,
  onEventEdit,
  onEventDelete,
  user,
  locale,
  isLoading = false,
  deletingEventId,
  searchValue = '',
  onSearchChange
}: DayEventsListProps) {
  // Filter events - either by date or by search
  const filteredEvents = useMemo(() => {
    // If searching, search across all events
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase().trim();

      return events.filter(event => {
        // Search in title
        if (event.title?.toLowerCase().includes(searchLower)) return true;

        // Search in body/description
        if (event.body?.toLowerCase().includes(searchLower)) return true;

        // Search in category
        if (event.category?.toLowerCase().includes(searchLower)) return true;

        // Search in location
        if (event.location?.toLowerCase().includes(searchLower)) return true;

        // Search in tags
        if (event.tags?.some(tag => tag.toLowerCase().includes(searchLower))) return true;

        // Search in author name
        const authorName = typeof event.author === 'string'
          ? event.author
          : event.author?.userName;
        if (authorName?.toLowerCase().includes(searchLower)) return true;

        return false;
      }).sort((a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    }

    // Otherwise, filter by selected date
    if (!selectedDate) return [];

    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);

      // Event overlaps with selected date
      return (
        isSameDay(eventStart, selectedDate) ||
        isSameDay(eventEnd, selectedDate) ||
        (eventStart < selectedDate && eventEnd > selectedDate)
      );
    }).sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [selectedDate, events, searchValue]);

  if (isLoading) {
    return (
      <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.15] border-t-white/30 border-l-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-lg p-2 md:p-3 lg:p-4">
        <div className="text-center py-4 md:py-6">
          <div className="inline-block animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-[#eccc6e]"></div>
          <p className="text-white/70 text-xs md:text-sm mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!selectedDate) {
    return (
      <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.15] border-t-white/30 border-l-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-lg p-2 md:p-3 lg:p-4">
        <div className="text-center py-6 md:py-8">
          <div className="text-3xl md:text-4xl mb-2 md:mb-3">📅</div>
          <p className="text-white/70 text-xs md:text-sm">
            Select a date to view events
          </p>
        </div>
      </div>
    );
  }

  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.15] border-t-white/30 border-l-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-lg p-2 md:p-3 lg:p-4 h-full">
      {/* Search Box */}
      {onSearchChange && (
        <div className="mb-2 md:mb-3 relative">
          <input
            type="text"
            placeholder="Search events..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-2 md:px-3 py-1.5 md:py-2 pr-8 md:pr-10 bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-md text-xs md:text-sm text-[#e8e6e1] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#eccc6e]/50 focus:border-[#eccc6e]/50 transition-colors"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 p-0.5 md:p-1 text-white/60 hover:text-white/80 transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Header - Different for search mode vs day mode */}
      {searchValue.trim() ? (
        // Search Results Header
        <div className="border-l-4 border-[#eccc6e] px-2 md:px-3 py-1.5 md:py-2 mb-2 md:mb-3 rounded-lg bg-[#eccc6e]/10">
          <h3 className="text-sm md:text-base lg:text-lg font-bold text-[#e8e6e1]">
            Search Results
          </h3>
          <p className="text-[10px] md:text-xs text-white/70 mt-0.5 md:mt-1">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found for "{searchValue}"
          </p>
        </div>
      ) : (
        // Day Header
        <div className={`
          border-l-4 px-2 md:px-3 py-1.5 md:py-2 mb-2 md:mb-3 rounded-lg
          ${isToday ? 'border-[#eccc6e] bg-[#eccc6e]/15' : 'border-[#eccc6e]/60 bg-[#eccc6e]/10'}
        `}>
          <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
            {isToday && (
              <span className="px-1.5 md:px-2 py-0.5 bg-[#eccc6e] text-[#0e1033] text-[10px] md:text-xs font-semibold rounded">
                Today
              </span>
            )}
          </div>
          <h3 className="text-sm md:text-base lg:text-lg font-bold text-[#e8e6e1]">
            {format(selectedDate, 'EEEE', { locale })}
          </h3>
          <p className="text-xs md:text-sm text-white/70">
            {format(selectedDate, 'MMMM d, yyyy', { locale })}
          </p>
          <p className="text-[10px] md:text-xs text-white/60 mt-0.5 md:mt-1">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-4 md:py-6">
          <div className="text-2xl md:text-3xl mb-1.5 md:mb-2">🗓️</div>
          <p className="text-white/60 text-xs md:text-sm">
            {searchValue.trim() ? 'No events found matching your search' : 'No events on this date'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 md:space-y-2 overflow-y-auto max-h-[calc(100vh-400px)]">
          {filteredEvents.map((event) => {
            // Handle both populated author objects and author IDs
            const authorId = typeof event.author === 'string'
              ? event.author
              : event.author?._id;
            const isAuthor = user && (
              user._id === authorId ||
              user.id === authorId ||
              user._id === event.author?._id ||
              user.id === event.author?._id
            );

            const isDeleting = deletingEventId === event._id;
            const startTime = format(new Date(event.startDate), 'h:mm a');
            const endTime = format(new Date(event.endDate), 'h:mm a');
            const isSameDate = isSameDay(
              new Date(event.startDate),
              new Date(event.endDate)
            );

            const categoryColors: Record<string, string> = {
              'community': '#4b9aaa',
              'sports-health': '#3ed77a',
              'culture-education': '#9775e8',
              'other': '#9ca3af'
            };

            // Moderation status checks
            const isPending = event.moderationStatus === 'pending' && !event.isUserReported;
            const isReported = event.moderationStatus === 'pending' && event.isUserReported;
            const isRejected = event.moderationStatus === 'rejected';
            const showModerationBanner = isAuthor && (isPending || isReported || isRejected);

            // Determine border color based on moderation status
            const getBorderClass = () => {
              if (!isAuthor) return 'border-transparent';
              if (isRejected) return 'border-red-400/50 bg-red-500/10';
              if (isPending) return 'border-amber-400/50 bg-amber-500/10';
              if (isReported) return 'border-orange-400/50 bg-orange-500/10';
              return 'border-transparent';
            };

            return (
              <div
                key={event._id as string}
                className={`
                  group relative border rounded-xl p-1.5 md:p-2 transition-all duration-300
                  ${isDeleting ? 'opacity-50 pointer-events-none' : 'hover:bg-white/[0.06] hover:backdrop-blur-md hover:border-white/[0.15] hover:border-t-white/30 hover:border-l-white/25 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] cursor-pointer'}
                  ${getBorderClass()}
                `}
              >
                {/* Moderation Status Banner - Only visible to author */}
                {showModerationBanner && (
                  <div className={`
                    mb-1.5 px-2 py-1 rounded text-[10px] md:text-xs flex items-center gap-1.5
                    ${isRejected ? 'bg-red-100 text-red-700' : ''}
                    ${isPending ? 'bg-amber-100 text-amber-700' : ''}
                    ${isReported ? 'bg-orange-100 text-orange-700' : ''}
                  `}>
                    {isPending && <><span>⏳</span><span className="font-medium">Under review</span></>}
                    {isReported && <><span>🚩</span><span className="font-medium">Reported - under review</span></>}
                    {isRejected && <><span>✕</span><span className="font-medium">Removed by moderation</span></>}
                  </div>
                )}

                {/* Event Content - Clickable */}
                <button
                  onClick={() => onEventClick(event)}
                  className="w-full text-left"
                >
                  {/* Date & Time - Show full date in search mode */}
                  <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
                    {searchValue.trim() && (
                      <span className="text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 bg-[#eccc6e]/20 text-[#eccc6e] rounded font-medium">
                        {format(new Date(event.startDate), 'MMM d', { locale })}
                      </span>
                    )}
                    <span className="text-[10px] md:text-xs font-semibold text-[#eccc6e]">
                      {startTime}
                    </span>
                    {isSameDate ? (
                      <span className="text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 bg-[#eccc6e] text-[#0e1033] rounded font-medium">
                        Single-day
                      </span>
                    ) : (
                      <span className="text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 bg-white/10 text-white/70 rounded">
                        Multi-day
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="font-semibold text-xs md:text-sm text-[#e8e6e1] mb-0.5 line-clamp-2">
                    {event.title}
                  </h4>

                  {/* Author */}
                  <p className="text-[10px] md:text-xs text-white/60 mb-0.5 md:mb-1">
                    by {typeof event.author === 'object'
                      ? (event.author?.userName || event.author?.name || 'Unknown')
                      : 'Unknown'}
                  </p>

                  {/* Category Badge */}
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <span
                      className="inline-block px-1.5 md:px-2 py-0.5 text-[8px] md:text-[10px] font-medium text-white rounded"
                      style={{ backgroundColor: categoryColors[event.category || 'other'] }}
                    >
                      {event.category?.replace('-', ' ') || 'other'}
                    </span>

                    {/* Stats */}
                    <div className="flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] text-white/60">
                      <span>💬 {event.comments?.length || 0}</span>
                    </div>
                  </div>
                </button>

                {/* Action Icons - Only for author, disabled when under moderation */}
                {isAuthor && !showModerationBanner && (
                  <div className="absolute top-1 md:top-1.5 right-1 md:right-1.5 flex gap-0.5 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventEdit(event);
                      }}
                      className="p-0.5 md:p-1 text-white/60 hover:text-white/90 rounded transition-all bg-white/10 backdrop-blur-xl border border-white/15"
                      title="Edit event"
                      disabled={isDeleting}
                    >
                      <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (await confirmAction(`Delete "${event.title}"?`, { title: 'Delete Event', confirmLabel: 'Delete', variant: 'danger' })) {
                          onEventDelete(event._id as string);
                        }
                      }}
                      className="p-0.5 md:p-1 text-white/60 hover:text-red-400 rounded transition-all bg-white/10 backdrop-blur-xl border border-white/15"
                      title="Delete event"
                      disabled={isDeleting}
                    >
                      <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Deleting indicator */}
                {isDeleting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0e1033]/70 backdrop-blur-sm rounded-lg">
                    <div className="inline-block animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-red-500"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

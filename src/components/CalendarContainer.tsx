import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isBefore, isSameDay, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { useEventsQuery, useCreateEvent, useEditEvent, useDeleteEvent, useEventLikeMutation } from '../hooks/api/useEventsQuery';
import { useCreateComment } from '../hooks/api/useCommentsQuery';
import EventModal from './EventModal';
import CalendarGridView from './CalendarGridView';
import DayEventsList from './DayEventsList';
import EventViewModal from './EventViewModal';
import ReportModal from './ReportModal';
import { cn } from '../lib/utils';
import { CalendarPlus } from 'lucide-react';
import type { Event } from '../types';

interface CalendarContainerProps {
  initialSession?: any;
}

type SortBy = 'startDate' | 'likes' | 'views' | 'comments';

export default function CalendarContainer({ initialSession }: CalendarContainerProps) {
  const [isClient, setIsClient] = useState(false);
  const user = initialSession?.user;
  const queryClient = useQueryClient();

  // View state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date()); // Default to today
  const [rangeStart, setRangeStart] = useState<Date | undefined>(undefined);
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(undefined);

  // Modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);

  // Comment moderation feedback
  const [commentModerationMessage, setCommentModerationMessage] = useState<string | null>(null);

  // Event moderation feedback modal
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [eventModerationMessage, setEventModerationMessage] = useState<string | null>(null);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState<{
    id: string;
    contentType: 'event' | 'comment';
    preview: string;
  } | null>(null);
  const [showReportToast, setShowReportToast] = useState(false);
  const [reportedItems, setReportedItems] = useState<Set<string>>(new Set());

  // Filter state
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Build query options - Always filter by current month for calendar view
  const queryOptions = {
    sortBy,
    sortOrder,
    search: searchValue || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    // Date range filter for current month view
    dateFrom: startOfMonth(currentMonth),
    dateTo: endOfMonth(currentMonth)
  };

  // React Query hooks with placeholderData to keep previous month visible
  const { data: events = [], isLoading, error, refetch } = useEventsQuery(queryOptions, {
    placeholderData: (previousData) => previousData, // Keep showing previous month data during fetch
  });
  const createEvent = useCreateEvent();
  const editEvent = useEditEvent();
  const deleteEvent = useDeleteEvent();
  const likeMutation = useEventLikeMutation();
  const createComment = useCreateComment();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-dismiss report toast after 3 seconds
  useEffect(() => {
    if (showReportToast) {
      const timer = setTimeout(() => setShowReportToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showReportToast]);

  // Prefetch adjacent months for smooth swipe navigation (delayed to prioritize main content)
  useEffect(() => {
    const timer = setTimeout(() => {
      const nextMonth = addMonths(currentMonth, 1);
      const prevMonth = subMonths(currentMonth, 1);

      // Build query options for adjacent months
      const buildAdjacentQuery = (month: Date) => ({
        ...queryOptions,
        dateFrom: startOfMonth(month),
        dateTo: endOfMonth(month)
      });

      // Prefetch next and previous months in the background
      queryClient.prefetchQuery({
        queryKey: ['events', buildAdjacentQuery(nextMonth)],
        queryFn: async () => {
          const response = await fetch(`/api/events?${new URLSearchParams({
            dateFrom: new Date(buildAdjacentQuery(nextMonth).dateFrom!).toISOString(),
            dateTo: new Date(buildAdjacentQuery(nextMonth).dateTo!).toISOString(),
            ...(queryOptions.sortBy && { sortBy: queryOptions.sortBy }),
            ...(queryOptions.sortOrder && { sortOrder: queryOptions.sortOrder }),
            ...(queryOptions.category && { category: queryOptions.category }),
          } as any).toString()}`);
          const data = await response.json();
          return data.events || [];
        },
      });

      queryClient.prefetchQuery({
        queryKey: ['events', buildAdjacentQuery(prevMonth)],
        queryFn: async () => {
          const response = await fetch(`/api/events?${new URLSearchParams({
            dateFrom: new Date(buildAdjacentQuery(prevMonth).dateFrom!).toISOString(),
            dateTo: new Date(buildAdjacentQuery(prevMonth).dateTo!).toISOString(),
            ...(queryOptions.sortBy && { sortBy: queryOptions.sortBy }),
            ...(queryOptions.sortOrder && { sortOrder: queryOptions.sortOrder }),
            ...(queryOptions.category && { category: queryOptions.category }),
          } as any).toString()}`);
          const data = await response.json();
          return data.events || [];
        },
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [currentMonth, queryOptions.sortBy, queryOptions.sortOrder, queryOptions.category, queryClient]);

  // Handle event creation/editing
  const handleEventSubmit = async (data: {
    title: string;
    body: string;
    startDate: Date;
    endDate: Date;
    location?: string;
    category?: 'community' | 'sports-health' | 'culture-education' | 'other';
    tags: string[];
  }) => {
    try {
      // Clear any previous moderation message
      setEventModerationMessage(null);

      if (editingEvent) {
        // Edit mode
        await editEvent.mutateAsync({
          eventId: editingEvent._id as string,
          data
        });
        setEditingEvent(null);
      } else {
        // Create mode
        const response = await createEvent.mutateAsync(data);

        // Show moderation feedback modal if event was flagged
        if (response.moderationStatus === 'pending') {
          setEventModerationMessage(response.message || 'Your event is under review by our moderation team.');
          setShowModerationModal(true);
        }
      }

      // Refetch to ensure latest data
      await refetch();
      setShowEventModal(false);
    } catch (error) {
      console.error('Failed to save event:', error);
      throw error;
    }
  };

  // Handle event editing
  const handleEventEdit = (event: Event) => {
    setEditingEvent(event);
    setShowEventModal(true);
  };

  // Handle event deletion
  const handleEventDelete = async (eventId: string) => {
    try {
      await deleteEvent.mutateAsync(eventId);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  // Handle event like toggle
  const handleEventLike = async (eventId: string, isCurrentlyLiked: boolean) => {
    if (!user) return;

    try {
      await likeMutation.mutateAsync({
        eventId,
        action: isCurrentlyLiked ? 'unlike' : 'like'
      });
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // Handle event click - Open view modal
  const handleEventClick = (event: Event) => {
    setViewingEvent(event);
    setShowViewModal(true);
  };

  // Handle comment submission
  const handleCommentSubmit = async (comment: string) => {
    if (!viewingEvent) return;

    try {
      // Clear any previous moderation message
      setCommentModerationMessage(null);

      const response = await createComment.mutateAsync({
        body: comment,
        topicId: viewingEvent._id as string,
        collectionType: 'events' // Using 'events' as the collection type
      });

      // Show moderation feedback if comment was flagged
      if (response.moderationStatus === 'pending') {
        setCommentModerationMessage(response.message || 'Your comment is under review.');
      }

      // Refetch events to get updated data
      const result = await refetch();

      // Update the viewingEvent with the refreshed data
      if (result.data) {
        const updatedEvent = result.data.find((e: Event) => e._id === viewingEvent._id);
        if (updatedEvent) {
          setViewingEvent(updatedEvent);
        }
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  // Handle date click in grid view
  const handleDateClick = (date: Date) => {
    const isPast = isBefore(startOfDay(date), startOfDay(new Date()));

    // Always update sidebar
    setSelectedDate(date);

    // Past dates: clear range, don't start selection
    if (isPast) {
      setRangeStart(undefined);
      setRangeEnd(undefined);
      return;
    }

    // Range selection logic for future dates
    if (!rangeStart) {
      // Nothing selected → select start
      setRangeStart(date);
      setRangeEnd(undefined);
    } else if (!rangeEnd) {
      if (isSameDay(date, rangeStart)) {
        // Click same date → deselect everything
        setRangeStart(undefined);
      } else if (isBefore(date, rangeStart)) {
        // Clicked before start → swap
        setRangeEnd(rangeStart);
        setRangeStart(date);
      } else {
        // Clicked after start → set end
        setRangeEnd(date);
      }
    } else {
      // Both set
      if (isSameDay(date, rangeEnd)) {
        // Click end date → make it the new start
        setRangeStart(date);
        setRangeEnd(undefined);
      } else if (isBefore(startOfDay(rangeEnd), startOfDay(date))) {
        // Click after end → extend range forward
        setRangeEnd(date);
      } else if (isBefore(startOfDay(date), startOfDay(rangeStart))) {
        // Click before start → new selection
        setRangeStart(date);
        setRangeEnd(undefined);
      } else if (!isSameDay(date, rangeStart)) {
        // Click within range → shorten range to that day
        setRangeEnd(date);
      } else {
        // Click start date → collapse to single
        setRangeEnd(undefined);
      }
    }
  };

  // Handle create event from range selection
  const handleCreateFromRange = () => {
    if (!rangeStart) return;
    setShowEventModal(true);
  };

  // Memoize prefill dates to prevent unnecessary useEffect triggers in EventModal
  const prefillDates = useMemo(() => {
    if (editingEvent || !rangeStart) return undefined;
    const endDate = rangeEnd || rangeStart;

    // If start is today and it's already past 9 AM, use next full hour
    const now = new Date();
    let startHour = 9;
    if (isSameDay(rangeStart, now) && now.getHours() >= 9) {
      startHour = now.getMinutes() > 0 ? now.getHours() + 1 : now.getHours();
    }
    const endHour = Math.max(startHour + 1, 17);

    return {
      startDate: new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), startHour, 0),
      endDate: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), endHour, 0),
    };
  }, [editingEvent, rangeStart, rangeEnd]);

  // Handle report submission
  const handleReportSubmit = async (data: {
    contentId: string;
    contentType: 'event' | 'comment';
    reason: string;
    details?: string
  }) => {
    try {
      const response = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit report');
      }

      setShowReportModal(false);
      setReportContent(null);
      setReportedItems(prev => new Set([...prev, data.contentId]));

      // Show success toast
      setShowReportToast(true);

      // Refetch events to update moderation status
      await refetch();
      if (viewingEvent) {
        const updated = events.find((e: Event) => e._id === viewingEvent._id);
        if (updated) setViewingEvent(updated);
      }
    } catch (error) {
      console.error('Report submission error:', error);
      throw error;
    }
  };

  // Open report modal for comment
  const openCommentReportModal = (commentId: string, preview: string) => {
    setReportContent({
      id: commentId,
      contentType: 'comment',
      preview
    });
    setShowReportModal(true);
  };

  // Open report modal for event
  const openEventReportModal = (event: Event) => {
    setReportContent({
      id: event._id as string,
      contentType: 'event',
      preview: event.title
    });
    setShowReportModal(true);
  };

  // Show loading state
  if (!isClient || isLoading) {
    return (
      <div className="w-full">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37]"></div>
          <p className="text-white/70 mt-2">Loading calendar...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full">
        <div className="text-center py-8">
          <p className="text-red-400">Failed to load calendar data</p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-[#d4af37] text-[#0e1033] rounded hover:bg-[#b89030]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Event Moderation Feedback Modal */}
      {showModerationModal && eventModerationMessage && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowModerationModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-[#1a1d4a]/95 backdrop-blur-xl border border-white/20 border-t-white/30 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-amber-500/20 border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⏳</span>
                  <h2 className="text-xl font-bold text-[#e8e6e1]">Event Under Review</h2>
                </div>
              </div>
              {/* Body */}
              <div className="px-5 py-6">
                <p className="text-white/80 text-base leading-relaxed mb-4">
                  {eventModerationMessage}
                </p>
                <p className="text-white/60 text-sm">
                  You can view your event in the calendar, but it won't be visible to others until approved.
                </p>
              </div>
              {/* Footer */}
              <div className="px-5 py-4 bg-white/[0.04] border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setShowModerationModal(false)}
                  className="px-6 py-2 bg-[#d4af37] text-[#0e1033] font-medium rounded-lg hover:bg-[#b89030] transition-colors"
                >
                  I Understand
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Controls Section */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-lg shadow-md p-4 md:p-6 mb-4">
        {/* Create Event Button */}
        {user && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowEventModal(true)}
              className="w-full md:w-2/3 lg:w-1/2 px-3 md:px-6 py-2.5 md:py-3 text-xs sm:text-sm md:text-base border-2 border-[#d4af37] text-[#d4af37] bg-[#d4af37]/10 rounded-md shadow-[0_0_14px_rgba(212,175,55,0.25)] hover:bg-[#d4af37]/20 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all font-semibold flex items-center justify-center gap-2"
            >
              <CalendarPlus className="w-4 h-4 md:w-5 md:h-5" strokeWidth={1.75} />
              Create Event
            </button>
          </div>
        )}
      </div>

      {/* Split View: Calendar (2/3) + Day Events List (1/3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 px-0 md:px-0 mb-6">
        {/* Calendar Grid - 2/3 width on desktop */}
        <div className="md:col-span-2">
          <CalendarGridView
            events={events}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onDateClick={handleDateClick}
            selectedDate={selectedDate}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onCreateFromRange={handleCreateFromRange}
            onClearSelection={() => {
              setSelectedDate(new Date());
              setRangeStart(undefined);
              setRangeEnd(undefined);
            }}
            isLoggedIn={!!user}
            locale={de}
          />
        </div>

        {/* Day Events List - 1/3 width on desktop */}
        <div className="md:col-span-1">
          <DayEventsList
            selectedDate={selectedDate}
            events={events}
            onEventClick={handleEventClick}
            onEventEdit={handleEventEdit}
            onEventDelete={handleEventDelete}
            user={user}
            locale={de}
            isLoading={isLoading}
            deletingEventId={deleteEvent.isPending ? deleteEvent.variables : undefined}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        show={showEventModal}
        handleClose={() => {
          setShowEventModal(false);
          setEditingEvent(null);
        }}
        onSubmit={handleEventSubmit}
        editMode={!!editingEvent}
        initialData={editingEvent ? {
          id: editingEvent._id as string,
          title: editingEvent.title,
          body: editingEvent.body,
          startDate: editingEvent.startDate,
          endDate: editingEvent.endDate,
          location: editingEvent.location,
          category: editingEvent.category,
          tags: editingEvent.tags
        } : undefined}
        prefillDates={prefillDates}
      />

      {/* Event View Modal */}
      <EventViewModal
        show={showViewModal}
        event={viewingEvent}
        user={user}
        onClose={() => {
          setShowViewModal(false);
          setCommentModerationMessage(null);
        }}
        onAddComment={handleCommentSubmit}
        isAddingComment={createComment.isPending}
        commentModerationMessage={commentModerationMessage}
        onClearModerationMessage={() => setCommentModerationMessage(null)}
        onReportEvent={openEventReportModal}
        onReportComment={openCommentReportModal}
        reportedComments={reportedItems}
      />

      {/* Report Modal */}
      <ReportModal
        show={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setReportContent(null);
        }}
        contentId={reportContent?.id || ''}
        contentType={reportContent?.contentType || 'event'}
        contentPreview={reportContent?.preview || ''}
        onSubmit={handleReportSubmit}
      />

      {/* Report Success Toast */}
      {showReportToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-xl">✓</span>
            <span className="font-medium">Report submitted. Thank you!</span>
            <button
              onClick={() => setShowReportToast(false)}
              className="ml-2 text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

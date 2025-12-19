import React, { useState, useEffect } from 'react';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { useEventsQuery, useCreateEvent, useEditEvent, useDeleteEvent, useEventLikeMutation } from '../hooks/api/useEventsQuery';
import { useCreateComment } from '../hooks/api/useCommentsQuery';
import EventModal from './EventModal';
import CalendarGridView from './CalendarGridView';
import DayEventsList from './DayEventsList';
import EventViewModal from './EventViewModal';
import { cn } from '../lib/utils';
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

  // Modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);

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
    dateTo: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
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

  // Prefetch adjacent months for smooth swipe navigation
  useEffect(() => {
    const nextMonth = addMonths(currentMonth, 1);
    const prevMonth = subMonths(currentMonth, 1);

      // Build query options for adjacent months
      const buildAdjacentQuery = (month: Date) => ({
        ...queryOptions,
        dateFrom: startOfMonth(month),
        dateTo: new Date(month.getFullYear(), month.getMonth() + 1, 0)
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
      if (editingEvent) {
        // Edit mode
        await editEvent.mutateAsync({
          eventId: editingEvent._id as string,
          data
        });
        setEditingEvent(null);
      } else {
        // Create mode
        await createEvent.mutateAsync(data);
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
      await createComment.mutateAsync({
        body: comment,
        topicId: viewingEvent._id as string,
        collectionType: 'events' // Using 'events' as the collection type
      });

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
    setSelectedDate(date);
    // Switch to list view filtered by selected date
    // This could be enhanced to show a modal with events for that day
  };

  // Show loading state
  if (!isClient || isLoading) {
    return (
      <div className="w-full">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#4b9aaa]"></div>
          <p className="text-gray-600 mt-2">Loading calendar...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full">
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load calendar data</p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-[#4b9aaa] text-white rounded hover:bg-[#3a7a8a]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Controls Section */}
      <div className="bg-[#4b9aaa]/10 rounded-lg shadow-md p-4 md:p-6 mb-4">
        {/* Create Event Button */}
        {user && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowEventModal(true)}
              className="w-full md:w-2/3 lg:w-1/2 px-3 md:px-6 py-2 md:py-3 text-xs sm:text-sm md:text-base bg-[#814256] text-white rounded-md hover:bg-[#6a3646] transition-all shadow-md font-medium"
            >
              <span className="text-gray-400 text-sm md:text-base">✎</span> Create Event
            </button>
          </div>
        )}
      </div>

      {/* Split View: Calendar (2/3) + Day Events List (1/3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 px-[10px] min-[450px]:px-[clamp(10px,5vw,20px)] min-[500px]:px-[clamp(20px,8vw,60px)] md:px-0">
        {/* Calendar Grid - 2/3 width on desktop */}
        <div className="md:col-span-2">
          <CalendarGridView
            events={events}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onDateClick={handleDateClick}
            selectedDate={selectedDate}
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
      />

      {/* Event View Modal */}
      <EventViewModal
        show={showViewModal}
        event={viewingEvent}
        user={user}
        onClose={() => setShowViewModal(false)}
        onAddComment={handleCommentSubmit}
        isAddingComment={createComment.isPending}
      />
    </div>
  );
}

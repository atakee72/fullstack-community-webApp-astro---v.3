import React, { useState, useEffect } from 'react';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import { enUS, tr, de } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { useEventsQuery, useCreateEvent, useEditEvent, useDeleteEvent, useEventLikeMutation } from '../hooks/api/useEventsQuery';
import { useCreateComment } from '../hooks/api/useCommentsQuery';
import EventModal from './EventModal';
import CalendarGridView from './CalendarGridView';
import EventListView from './EventListView';
import CommentModal from './CommentModal';
import { cn } from '../lib/utils';
import type { Event } from '../types';

const locales = {
  'en': { locale: enUS, label: 'English' },
  'tr': { locale: tr, label: 'Türkçe' },
  'de': { locale: de, label: 'Deutsch' }
};

interface CalendarContainerProps {
  initialSession?: any;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'startDate' | 'likes' | 'views' | 'comments';
type LocaleKey = keyof typeof locales;

export default function CalendarContainer({ initialSession }: CalendarContainerProps) {
  const [isClient, setIsClient] = useState(false);
  const user = initialSession?.user;
  const queryClient = useQueryClient();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Filter state
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedLocale, setSelectedLocale] = useState<LocaleKey>('en');

  // Build query options
  const queryOptions = {
    sortBy,
    sortOrder,
    search: searchValue || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    // Date range filter for current month view in grid mode
    ...(viewMode === 'grid' && {
      dateFrom: startOfMonth(currentMonth),
      dateTo: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    })
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
    if (viewMode === 'grid') {
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
    }
  }, [currentMonth, viewMode, queryOptions.sortBy, queryOptions.sortOrder, queryOptions.category, queryClient]);

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

  // Handle comment click
  const handleCommentClick = (event: Event) => {
    setSelectedEvent(event);
    setShowCommentModal(true);
  };

  // Handle comment submission
  const handleCommentSubmit = async (comment: string) => {
    if (!selectedEvent) return;

    try {
      await createComment.mutateAsync({
        body: comment,
        topicId: selectedEvent._id as string,
        collectionType: 'events' // Using 'events' as the collection type
      });

      setShowCommentModal(false);
      await refetch();
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
      <div className="bg-[#4b9aaa]/10 rounded-lg shadow-md p-4 md:p-6 mb-6">
        {/* View Toggle and Create Button */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* View Toggle */}
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex-1 px-4 py-2 rounded-lg font-medium transition-all border-2',
                viewMode === 'grid'
                  ? 'bg-white text-[#4b9aaa] border-[#4b9aaa]'
                  : 'bg-white/50 text-gray-700 border-white hover:bg-white'
              )}
            >
              📅 Calendar View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex-1 px-4 py-2 rounded-lg font-medium transition-all border-2',
                viewMode === 'list'
                  ? 'bg-white text-[#4b9aaa] border-[#4b9aaa]'
                  : 'bg-white/50 text-gray-700 border-white hover:bg-white'
              )}
            >
              📋 List View
            </button>
          </div>

          {/* Create Event Button */}
          {user && (
            <button
              onClick={() => setShowEventModal(true)}
              className="px-6 py-2 bg-[#814256] text-white rounded-lg hover:bg-[#6a3646] transition-all shadow-md font-medium whitespace-nowrap"
            >
              ➕ Create Event
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search events..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#4b9aaa] transition-colors"
          />

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#4b9aaa] transition-colors"
          >
            <option value="all">All Categories</option>
            <option value="community">Community</option>
            <option value="sports-health">Sports & Health</option>
            <option value="culture-education">Culture & Education</option>
            <option value="other">Other</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border-2 border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#4b9aaa] transition-colors"
          >
            <option value="startDate">Sort by Date</option>
            <option value="likes">Sort by Likes</option>
            <option value="views">Sort by Views</option>
            <option value="comments">Sort by Comments</option>
          </select>

          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="px-3 py-2 border-2 border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#4b9aaa] transition-colors"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>

          {/* Locale Selector */}
          <select
            value={selectedLocale}
            onChange={(e) => setSelectedLocale(e.target.value as LocaleKey)}
            className="px-3 py-2 border-2 border-gray-200 rounded-md text-sm focus:outline-none focus:border-[#4b9aaa] transition-colors"
            aria-label="Select language"
          >
            {Object.entries(locales).map(([key, { label }]) => (
              <option key={key} value={key}>
                🌐 {label}
              </option>
            ))}
          </select>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          {events.length} event{events.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Calendar/List View */}
      {viewMode === 'grid' ? (
        <CalendarGridView
          events={events}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          onDateClick={handleDateClick}
          selectedDate={selectedDate}
          locale={locales[selectedLocale].locale}
        />
      ) : (
        <EventListView
          events={events}
          user={user}
          isLoading={isLoading}
          onEventEdit={handleEventEdit}
          onEventDelete={handleEventDelete}
          onEventLike={handleEventLike}
          onCommentClick={handleCommentClick}
          deletingEventId={deleteEvent.isPending ? deleteEvent.variables : undefined}
        />
      )}

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

      {/* Comment Modal */}
      <CommentModal
        show={showCommentModal}
        handleClose={() => setShowCommentModal(false)}
        postTitle={selectedEvent?.title || ''}
        postId={selectedEvent?._id as string || ''}
        onSubmit={handleCommentSubmit}
      />
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Event } from '../../types';

const API_URL = '/api';

// Query options for field selection and pagination
interface QueryOptions {
  fields?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'likes' | 'views' | 'comments' | 'startDate';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  tags?: string[];
  category?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
}

// Build query string from options
function buildQueryString(options: QueryOptions = {}): string {
  const params = new URLSearchParams();

  if (options.fields?.length) {
    params.set('fields', options.fields.join(','));
  }
  if (options.limit !== undefined) {
    params.set('limit', options.limit.toString());
  }
  if (options.offset !== undefined) {
    params.set('offset', options.offset.toString());
  }
  if (options.sortBy) {
    params.set('sortBy', options.sortBy);
  }
  if (options.sortOrder) {
    params.set('sortOrder', options.sortOrder);
  }
  if (options.search) {
    params.set('search', options.search);
  }
  if (options.tags?.length) {
    params.set('tags', options.tags.join(','));
  }
  if (options.category) {
    params.set('category', options.category);
  }
  if (options.dateFrom) {
    params.set('dateFrom', new Date(options.dateFrom).toISOString());
  }
  if (options.dateTo) {
    params.set('dateTo', new Date(options.dateTo).toISOString());
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

// Fetch events with options
async function fetchEvents(options: QueryOptions = {}): Promise<Event[]> {
  const queryString = buildQueryString(options);
  const response = await fetch(`${API_URL}/events${queryString}`);

  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }

  const data = await response.json();
  return data.events || [];
}

// Hook for fetching events
export function useEventsQuery(options: QueryOptions = {}) {
  return useQuery({
    queryKey: ['events', options],
    queryFn: () => fetchEvents(options),
    // Keep data fresh for 5 seconds for more responsive updates
    staleTime: 5 * 1000,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
  });
}

// Create a new event
async function createEvent(data: {
  title: string;
  body: string;
  startDate: Date | string;
  endDate: Date | string;
  location?: string;
  category?: 'community' | 'sports-health' | 'culture-education' | 'other';
  tags?: string[];
}) {
  const response = await fetch(`${API_URL}/events/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for NextAuth session
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create event');
  }

  const result = await response.json();
  return result.event || result;
}

// Hook for creating events
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEvent,
    onSuccess: async () => {
      // Immediately invalidate and refetch all related queries
      await queryClient.invalidateQueries({
        queryKey: ['events'],
        refetchType: 'all'
      });
    },
    onSettled: async () => {
      // Final refresh to ensure consistency
      await queryClient.invalidateQueries({
        queryKey: ['events'],
        refetchType: 'active'
      });
    },
    retry: false, // Disable automatic retries
  });
}

// Fetch a single event by ID
async function fetchEventById(id: string): Promise<Event> {
  const response = await fetch(`${API_URL}/events/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch event');
  }

  const data = await response.json();
  return data.event;
}

// Hook for fetching a single event
export function useEventQuery(id: string) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEventById(id),
    enabled: !!id,
  });
}

// Update likes
async function updateEventLikes(eventId: string, action: 'like' | 'unlike') {
  const response = await fetch(`${API_URL}/events/${eventId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for NextAuth session
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    throw new Error('Failed to update likes');
  }

  return response.json();
}

// Hook for updating event likes
export function useEventLikeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, action }: { eventId: string; action: 'like' | 'unlike' }) =>
      updateEventLikes(eventId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Edit an event
async function editEvent(
  eventId: string,
  data: {
    title?: string;
    body?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    location?: string;
    category?: 'community' | 'sports-health' | 'culture-education' | 'other';
    tags?: string[];
  }
) {
  const response = await fetch(`${API_URL}/events/edit/${eventId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for NextAuth session
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update event');
  }

  return response.json();
}

// Hook for editing events
export function useEditEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: Parameters<typeof editEvent>[1] }) =>
      editEvent(eventId, data),
    onSuccess: async () => {
      // Immediately invalidate and refetch all related queries
      await queryClient.invalidateQueries({
        queryKey: ['events'],
        refetchType: 'all'
      });
    },
    onSettled: async () => {
      // Final refresh to ensure consistency
      await queryClient.invalidateQueries({
        queryKey: ['events'],
        refetchType: 'active'
      });
    },
  });
}

// Delete an event
async function deleteEvent(eventId: string) {
  const response = await fetch(`${API_URL}/events/delete/${eventId}`, {
    method: 'DELETE',
    credentials: 'include', // Include cookies for NextAuth session
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete event');
  }

  return response.json();
}

// Hook for deleting events
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: (data, eventId) => {
      // Remove the deleted item from the cache
      queryClient.setQueryData(['events'], (old: Event[] | undefined) => {
        if (!old) return old;
        return old.filter(item => item._id !== eventId);
      });

      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

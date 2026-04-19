import React from 'react';
import EventCard from './EventCard';
import type { Event } from '../types';

interface EventListViewProps {
  events: Event[];
  user?: any;
  isLoading?: boolean;
  onEventEdit: (event: Event) => void;
  onEventDelete: (eventId: string) => void;
  onEventLike: (eventId: string, isCurrentlyLiked: boolean) => void;
  onCommentClick: (event: Event) => void;
  deletingEventId?: string;
}

export default function EventListView({
  events,
  user,
  isLoading = false,
  onEventEdit,
  onEventDelete,
  onEventLike,
  onCommentClick,
  deletingEventId
}: EventListViewProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#eccc6e]"></div>
        <p className="text-white/70 mt-2">Loading events...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.15] rounded-lg shadow-md p-6 md:p-8 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-bold text-[#e8e6e1] mb-2">No Events Found</h3>
        <p className="text-white/70">
          Be the first to create an event for your neighbourhood!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <EventCard
          key={event._id as string}
          event={event}
          user={user}
          onEdit={onEventEdit}
          onDelete={onEventDelete}
          onLikeToggle={onEventLike}
          onCommentClick={onCommentClick}
          compact={false}
          isDeleting={deletingEventId === event._id}
        />
      ))}
    </div>
  );
}

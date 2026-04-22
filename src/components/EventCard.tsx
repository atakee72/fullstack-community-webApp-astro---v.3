import React from 'react';
import { format } from 'date-fns';
import HeartBtn from './HeartBtn';
import EyeIcon from './EyeIcon';
import { isOwner } from '../utils/authHelpers';
import { confirmAction } from '../utils/toast';
import type { Event } from '../types';
import { usePrefetchComments } from '../hooks/api/useCommentsQuery';

interface EventCardProps {
  event: Event;
  user?: any;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  onLikeToggle?: (eventId: string, isCurrentlyLiked: boolean) => void;
  onCommentClick?: (event: Event) => void;
  onEventClick?: (event: Event) => void;
  compact?: boolean; // For grid view
  isDeleting?: boolean;
}

const categoryColors: Record<string, string> = {
  'community': '#4b9aaa',
  'sports-health': '#3ed77a',
  'culture-education': '#9775e8',
  'other': '#9ca3af'
};

const categoryLabels: Record<string, string> = {
  'community': 'Community',
  'sports-health': 'Sports & Health',
  'culture-education': 'Culture & Education',
  'other': 'Other'
};

export default function EventCard({
  event,
  user,
  onEdit,
  onDelete,
  onLikeToggle,
  onCommentClick,
  onEventClick,
  compact = false,
  isDeleting = false
}: EventCardProps) {
  const isUserOwner = isOwner(event.author, user);
  const isLiked = user ? event.likedBy?.includes(user.id) || false : false;

  // Hover-prefetch comments for this event so EventViewModal opens instantly.
  const prefetchComments = usePrefetchComments();
  const handleHover = () => prefetchComments(event._id?.toString() || '');
  const categoryColor = categoryColors[event.category || 'other'];
  const categoryLabel = categoryLabels[event.category || 'other'];

  // Format dates
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isSameDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');

  const dateDisplay = isSameDay
    ? format(startDate, 'EEE, MMM d, yyyy')
    : `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;

  const timeDisplay = isSameDay
    ? `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`
    : `${format(startDate, 'h:mm a')} → ${format(endDate, 'h:mm a')}`;

  if (compact) {
    // Compact card for grid view
    return (
      <div
        onClick={() => onEventClick?.(event)}
        onMouseEnter={handleHover}
        onFocus={handleHover}
        className="rounded-xl border border-transparent p-3 transition-all duration-300 cursor-pointer h-full flex flex-col hover:bg-white/[0.06] hover:backdrop-blur-md hover:border-white/[0.15] hover:border-t-white/30 hover:border-l-white/25 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
      >
        {/* Category Badge */}
        <div className="flex items-start justify-between mb-2">
          <span
            className="text-xs px-2 py-1 rounded-md border font-medium"
            style={{ color: categoryColor, borderColor: categoryColor }}
          >
            {categoryLabel}
          </span>
          {isUserOwner && (
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(event);
                }}
                className="text-white/60 hover:text-white/90 text-lg"
                title="Edit event"
              >
                ✎
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (await confirmAction('Are you sure you want to delete this event?', { title: 'Delete Event', confirmLabel: 'Delete', variant: 'danger' })) {
                    onDelete?.(event._id as string);
                  }
                }}
                className="text-white/60 hover:text-red-400 text-lg"
                title="Delete event"
                disabled={isDeleting}
              >
                {isDeleting ? '⏳' : '✕'}
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-[#e8e6e1] mb-2 line-clamp-2">
          {event.title}
        </h3>

        {/* Date/Time */}
        <div className="text-xs text-white/70 mb-1">
          📅 {format(startDate, 'MMM d, h:mm a')}
        </div>

        {/* Location */}
        {event.location && (
          <div className="text-xs text-white/70 mb-2 truncate">
            📍 {event.location}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-white/60 mt-auto pt-2 border-t border-white/10">
          <span>💬 {event.comments?.length || 0}</span>
          <span>❤️ {event.likes || 0}</span>
        </div>
      </div>
    );
  }

  // Full card for list view
  return (
    <div
      onMouseEnter={handleHover}
      onFocus={handleHover}
      className="rounded-xl border border-transparent p-4 md:p-6 transition-all duration-300 hover:bg-white/[0.06] hover:backdrop-blur-md hover:border-white/[0.15] hover:border-t-white/30 hover:border-l-white/25 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
      {/* Header with Category and Actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs md:text-sm px-3 py-1 rounded-md border font-medium"
            style={{ color: categoryColor, borderColor: categoryColor }}
          >
            {categoryLabel}
          </span>
          {event.isEdited && (
            <span
              className="text-xs text-white/70"
              title={event.lastEditedAt ? `Last edited: ${new Date(event.lastEditedAt).toLocaleString()}` : 'Edited'}
            >
              (edited)
            </span>
          )}
        </div>

        {isUserOwner && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit?.(event)}
              className="text-white/60 hover:text-white/90 text-xl md:text-2xl"
              title="Edit event"
            >
              ✎
            </button>
            <button
              onClick={async () => {
                if (await confirmAction('Are you sure you want to delete this event?', { title: 'Delete Event', confirmLabel: 'Delete', variant: 'danger' })) {
                  onDelete?.(event._id as string);
                }
              }}
              className="text-white/60 hover:text-red-400 text-xl md:text-2xl"
              title="Delete event"
              disabled={isDeleting}
            >
              {isDeleting ? '⏳' : '✕'}
            </button>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg md:text-xl font-bold text-[#d4af37] mb-3">
        {event.title}
      </h3>

      {/* Author Info */}
      <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 text-[#e8e6e1] px-3 py-2 rounded-md mb-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#d4af37] rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-[#0e1033] font-bold text-sm">
            {typeof event.author === 'object' && event.author !== null
              ? (event.author as any).name?.charAt(0)?.toUpperCase() || 'A'
              : 'A'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium">
            {typeof event.author === 'object' && event.author !== null
              ? (event.author as any).name || 'Anonymous'
              : 'Anonymous'}
          </span>
        </div>
        <div className="flex gap-3 items-center text-sm">
          <EyeIcon viewCount={event.views || 0} createdAt={new Date(event.date || event.createdAt || Date.now())} />
          <HeartBtn
            isLiked={isLiked}
            likeCount={event.likes || 0}
            onToggle={() => onLikeToggle?.(event._id as string, isLiked)}
            disabled={!user}
          />
        </div>
      </div>

      {/* Date/Time */}
      <div className="mb-3 space-y-1">
        <div className="flex items-center gap-2 text-sm md:text-base text-white/80">
          <span className="text-lg">📅</span>
          <span className="font-medium">{dateDisplay}</span>
        </div>
        <div className="flex items-center gap-2 text-sm md:text-base text-white/80">
          <span className="text-lg">🕐</span>
          <span>{timeDisplay}</span>
        </div>
      </div>

      {/* Location */}
      {event.location && (
        <div className="flex items-center gap-2 text-sm md:text-base text-white/80 mb-3">
          <span className="text-lg">📍</span>
          <span>{event.location}</span>
        </div>
      )}

      {/* Description */}
      <div className="mb-4">
        <p className="text-white/80 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
          {event.body}
        </p>
      </div>

      {/* Tags */}
      {Array.isArray(event.tags) && event.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {event.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-[#6F2F59]/20 border border-[#a86b7e]/40 text-[#a86b7e] text-xs md:text-sm rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer - Comments */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <button
          onClick={() => onCommentClick?.(event)}
          disabled={!user}
          className={`text-sm md:text-base ${
            user
              ? 'text-[#d4af37] hover:text-[#b89030] font-medium'
              : 'text-white/50 cursor-not-allowed'
          }`}
        >
          💬 {event.comments?.length || 0} Comments
          {user && ' • Add comment'}
        </button>
      </div>
    </div>
  );
}

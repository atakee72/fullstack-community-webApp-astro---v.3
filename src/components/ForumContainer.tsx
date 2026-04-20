import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTopicsQuery, useCreatePost, useDeletePost, useEditPost, useSavePostMutation, useSavedPostsQuery } from '../hooks/api/useTopicsQuery';
import { useMyReportedIdsQuery, useMarkAsReported } from '../hooks/api/useReportsQuery';
import { BookmarkIcon, Flag } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLikeMutation } from '../hooks/api/useLikeMutation';
import PostModal from './PostModal';
import ReadMoreModal from './ReadMoreModal';
import ReportModal from './ReportModal';
import HeartBtn from './HeartBtn';
import EyeIcon from './EyeIcon';
import { toast } from 'sonner';
import { confirmAction } from '../utils/toast';
import { cn } from '../lib/utils';
import { isOwner } from '../utils/authHelpers';
import { Pagination } from './ui/Pagination';
import type { Topic, Announcement, Recommendation } from '../types';

interface ForumContainerProps {
  initialSession?: any;
}

export default function ForumContainer({ initialSession }: ForumContainerProps) {
  const [isClient, setIsClient] = useState(false);
  const user = initialSession?.user;

  const [collectionType, setCollectionType] = useState<'topics' | 'announcements' | 'recommendations'>('topics');
  const [searchValue, setSearchValue] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReadMoreModal, setShowReadMoreModal] = useState(false);
  // Store just the ID; derive the live selectedPost from the query data each render so
  // optimistic updates from like/edit/delete mutations flow into the modal immediately.
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [revealedWarnings, setRevealedWarnings] = useState<Set<string>>(new Set());
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingItem, setReportingItem] = useState<{ id: string; type: 'topic' | 'comment'; preview?: string } | null>(null);
  const [reportToastItemId, setReportToastItemId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  // localStorage key for persisting revealed warnings
  const REVEALED_WARNINGS_KEY = 'mahalle_revealed_warnings';

  // Use React Query for data fetching with field selection
  const { data: items = [], isLoading, error, refetch } = useTopicsQuery(collectionType, {
    fields: ['_id', 'title', 'body', 'description', 'author', 'tags', 'images', 'comments', 'date', 'likes', 'likedBy', 'views', 'moderationStatus', 'isUserReported', 'rejectionReason', 'hasWarningLabel', 'warningText'],
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Mutations
  const createPost = useCreatePost(collectionType);
  const deletePost = useDeletePost(collectionType);
  const editPost = useEditPost(collectionType);
  const likeMutation = useLikeMutation(collectionType);
  const savePost = useSavePostMutation();
  const { data: savedPostsData } = useSavedPostsQuery(!!user);
  const savedPosts = new Set(savedPostsData?.savedIds || []);

  // Eager-load user's reported content IDs so flag buttons render filled-red on mount
  const { data: reportedIdsData } = useMyReportedIdsQuery(!!user);
  const reportedItems = new Set(reportedIdsData?.reportedIds || []);
  const markAsReported = useMarkAsReported();

  const queryClient = useQueryClient();

  useEffect(() => {
    setIsClient(true);
    // Load revealed warnings from localStorage
    try {
      const stored = localStorage.getItem(REVEALED_WARNINGS_KEY);
      if (stored) {
        const ids = JSON.parse(stored);
        if (Array.isArray(ids)) {
          setRevealedWarnings(new Set(ids));
        }
      }
    } catch (e) {
      // Ignore localStorage errors (private browsing, etc.)
    }
  }, []);

  // Helper to reveal a warning and persist to localStorage
  const revealWarning = (postId: string) => {
    setRevealedWarnings(prev => {
      const newSet = new Set([...prev, postId]);
      // Persist to localStorage
      try {
        localStorage.setItem(REVEALED_WARNINGS_KEY, JSON.stringify([...newSet]));
      } catch (e) {
        // Ignore localStorage errors
      }
      return newSet;
    });
  };

  // Prefetch other collections on mount for instant tab switching
  useEffect(() => {
    const queryOptions = {
      fields: ['_id', 'title', 'body', 'description', 'author', 'tags', 'images', 'comments', 'date', 'likes', 'likedBy', 'views', 'moderationStatus', 'isUserReported', 'rejectionReason', 'hasWarningLabel', 'warningText'],
      sortBy: 'date' as const,
      sortOrder: 'desc' as const,
    };

    // Prefetch the collections not currently selected
    const collectionsToFetch = ['topics', 'announcements', 'recommendations'].filter(c => c !== collectionType);
    collectionsToFetch.forEach(collection => {
      queryClient.prefetchQuery({
        queryKey: [collection, queryOptions],
        queryFn: () => fetch(`/api/${collection}?fields=${queryOptions.fields.join(',')}&sortBy=${queryOptions.sortBy}&sortOrder=${queryOptions.sortOrder}`)
          .then(res => res.json())
          .then(data => data[collection] || []),
        staleTime: 5 * 60 * 1000,
      });
    });
  }, [queryClient, collectionType]);

  // Live selectedPost derived from the current items list so React Query cache updates
  // (e.g. like toggled) reflect in the open modal without needing to close/reopen.
  const selectedPost = selectedPostId
    ? (items as any[]).find(i => i._id === selectedPostId) || null
    : null;

  const filteredItems = (items as any[]).filter(item => {
    const q = searchValue.toLowerCase();
    return (item.title?.toLowerCase() || '').includes(q) ||
      ((item.description || item.body || '')?.toLowerCase() || '').includes(q) ||
      ((item.author?.name || item.author?.userName || '')?.toLowerCase() || '').includes(q) ||
      (item.tags || []).some((tag: string) => tag.toLowerCase().includes(q));
  });

  // Client-side pagination: slice filteredItems into pages of `pageSize`.
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  // Reset to first page whenever the tab or search changes.
  useEffect(() => {
    setCurrentPage(0);
  }, [collectionType, searchValue]);

  // Scroll to top only on tab switch.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [collectionType]);

  const handlePostSubmit = async (data: { title: string; body: string; tags: string[]; images: { url: string; publicId: string }[] }) => {
    try {
      if (editingPost) {
        // Edit mode - update existing post
        await editPost.mutateAsync({
          postId: editingPost._id,
          data: { title: data.title, body: data.body, tags: data.tags, images: data.images }
        });
        setEditingPost(null);
      } else {
        // Create mode - new post
        const postData = { title: data.title, body: data.body, tags: data.tags, images: data.images };

        const result = await createPost.mutateAsync(postData);

        // Show moderation notice if content is pending review
        if (result?.moderationStatus === 'pending') {
          toast.info('Your post has been submitted for review. It will be visible once approved.');
        }
      }

      // Explicitly refetch to ensure latest data with correct sorting
      await refetch();

      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to save post:', error);
      // Re-throw error so PostModal can display it to the user
      throw error;
    }
  };

  // Increment view count
  const incrementViews = async (postId: string) => {
    try {
      await fetch('/api/views/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, collectionType })
      });
    } catch (error) {
      console.error('Failed to increment views:', error);
    }
  };

  // Handle read more click
  const handleReadMore = (item: any) => {
    setSelectedPostId(item._id);
    setShowReadMoreModal(true);
    // Increment views when read more is clicked (only if not the author)
    if (!isOwner(item.author, user)) {
      incrementViews(item._id);
    }
  };

  // Truncate text to approximately 3 lines (about 150 characters)
  const truncateText = (text: string, maxLength: number = 300) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Handle like toggle
  const handleLikeToggle = async (postId: string, isCurrentlyLiked: boolean) => {
    if (!user) return;

    try {
      await likeMutation.mutateAsync({
        postId,
        collectionType,
        action: isCurrentlyLiked ? 'unlike' : 'like'
      });
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // Handle report submission
  const handleReportSubmit = async (data: { contentId: string; contentType: 'topic' | 'comment' | 'announcement' | 'recommendation'; reason: string; details?: string }) => {
    try {
      const response = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        // Mark item as reported in the query cache so the flag flips immediately
        markAsReported(data.contentId);
        return { success: true };
      } else {
        return { success: false, error: result.error, alreadyReported: result.alreadyReported };
      }
    } catch (error) {
      console.error('Failed to submit report:', error);
      return { success: false, error: 'Failed to submit report' };
    }
  };

  // Open report modal (state is eager-loaded via useMyReportedIdsQuery, so no network check needed).
  // If already reported, show a brief tooltip toast instead of opening the modal.
  const openReportFor = (contentId: string, contentType: 'topic' | 'comment' | 'announcement' | 'recommendation', preview: string) => {
    if (reportedItems.has(contentId)) {
      setReportToastItemId(contentId);
      setTimeout(() => setReportToastItemId(null), 2000);
      return;
    }
    setReportingItem({ id: contentId, type: contentType as 'topic' | 'comment', preview });
    setShowReportModal(true);
  };

  // Open report modal for a post (use correct contentType based on current collection)
  const openReportModal = (item: any) => {
    const contentType = collectionType.slice(0, -1) as 'topic' | 'announcement' | 'recommendation';
    openReportFor(item._id, contentType, item.title);
  };

  // Open report modal for a comment
  const openCommentReportModal = (commentId: string, preview: string) => {
    openReportFor(commentId, 'comment', preview);
  };

  // Show loading state during SSR or data fetching
  if (!isClient || isLoading) {
    return (
      <div className="w-full">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b border-[#4b9aaa]"></div>
          <p className="text-white/70 mt-2">Loading forum...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full">
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load forum data</p>
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
    <div className="w-full max-w-4xl mx-auto">
      {/* Header Section with Collection Selector — sticky so tabs + search stay at top on scroll.
          bg-[#4b9aaa] matches the teal parent box (index.astro:14) so it blends seamlessly. */}
      <div className="w-full mb-4 md:mb-6">
        {/* Tab row + Plus button grouped together; plus stays visible even when search collapses. */}
        <div className="flex items-end gap-2 mt-0 md:mt-1 mb-1 md:mb-2 ml-2 md:ml-6">
        {/* Collection Type Buttons - Lifted Tab Style */}
        <div className="flex flex-wrap xs:flex-nowrap items-center xs:items-end justify-center xs:justify-start gap-1 flex-1">
          <button
            onClick={() => setCollectionType('topics')}
            className={cn(
              'px-2 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 text-xs sm:text-sm md:text-lg font-semibold transition-all duration-300 ease-out rounded-t-lg whitespace-nowrap',
              collectionType === 'topics'
                ? 'h-9 sm:h-12 md:h-14 bg-[#814256] text-white border-b border-[#814256] shadow-md'
                : 'h-8 sm:h-10 md:h-11 bg-white/[0.06] backdrop-blur-sm border border-white/[0.15] border-t-white/25 border-l-white/20 text-white/80 hover:bg-white/[0.1] hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]'
            )}
          >
            Discussions
          </button>
          <button
            onClick={() => setCollectionType('announcements')}
            className={cn(
              'px-2 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 text-xs sm:text-sm md:text-lg font-semibold transition-all duration-300 ease-out rounded-t-lg whitespace-nowrap',
              collectionType === 'announcements'
                ? 'h-9 sm:h-12 md:h-14 bg-[#814256] text-white border-b border-[#814256] shadow-md'
                : 'h-8 sm:h-10 md:h-11 bg-white/[0.06] backdrop-blur-sm border border-white/[0.15] border-t-white/25 border-l-white/20 text-white/80 hover:bg-white/[0.1] hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]'
            )}
          >
            Announcements
          </button>
          <button
            onClick={() => setCollectionType('recommendations')}
            className={cn(
              'px-2 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 text-xs sm:text-sm md:text-lg font-semibold transition-all duration-300 ease-out rounded-t-lg whitespace-nowrap',
              collectionType === 'recommendations'
                ? 'h-9 sm:h-12 md:h-14 bg-[#814256] text-white border-b border-[#814256] shadow-md'
                : 'h-8 sm:h-10 md:h-11 bg-white/[0.06] backdrop-blur-sm border border-white/[0.15] border-t-white/25 border-l-white/20 text-white/80 hover:bg-white/[0.1] hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]'
            )}
          >
            Recommendations
          </button>
        </div>
          {/* Plus button — in the tab row so it stays visible when the search bar collapses. */}
          {user && (
            <button
              onClick={() => setShowAddModal(true)}
              className="group relative text-[#eccc6e] hover:text-[#d4b85e] hover:scale-110 transition-all duration-200 font-bold text-4xl md:text-5xl leading-none flex-shrink-0 mr-2 md:mr-4 self-center"
              aria-label={`Add a new ${collectionType.slice(0, -1)}`}
            >
              +
              <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-[#eccc6e] text-[#814256] text-xs md:text-sm font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Add a new {collectionType.slice(0, -1)}
              </span>
            </button>
          )}
        </div>

        <div className="pt-1 pb-3 md:pt-1 md:pb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={`Search in ${collectionType === 'topics' ? 'discussions' : collectionType}...`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-white/[0.06] backdrop-blur-md border border-white/[0.15] border-t-white/30 border-l-white/25 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] text-[#e8e6e1] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#6F2F59]/50 focus:border-[#6F2F59]/50 transition-colors"
            />
            {searchValue && (
              <button
                onClick={() => setSearchValue('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white/70 transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchValue && (
            <p className="mt-3 text-white/70 text-sm">
              {filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'} found
            </p>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="mt-3 md:mt-4">
          {pagedItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
              <p className="text-white/70 text-base md:text-lg">No {collectionType} found. Be the first to create one!</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
            <motion.div
              key={`${collectionType}-${searchValue}`}
              className="space-y-4"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {pagedItems.map((item, index) => {
                return (
                  <div
                    key={item._id}
                    className={cn(
                      "bg-[#c9c4b9]/75 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden flex flex-col h-[340px] md:h-[400px] transition-all duration-300 ease-out border border-[#4b9aaa]/40 hover:ring-2 hover:ring-white/30 hover:shadow-[0_0_24px_rgba(255,255,255,0.12)]",
                      !item.images?.length && "p-4 md:p-6",
                      item.moderationStatus === 'pending' && !item.isUserReported && isOwner(item.author, user) && "ring-2 ring-amber-300",
                      item.moderationStatus === 'pending' && item.isUserReported && isOwner(item.author, user) && "ring-2 ring-orange-300",
                      item.moderationStatus === 'rejected' && isOwner(item.author, user) && "ring-2 ring-red-400"
                    )}>
                    {/* ===== MOBILE OVERLAY LAYOUT (image cards only, < md) ===== */}
                    {item.images?.length > 0 && (
                      <div className="md:hidden flex flex-col flex-1">
                        {/* Image hero area */}
                        <div className="relative h-48 overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => handleReadMore(item)}>
                          <img src={item.images[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          {/* Gradient overlay */}
                          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

                          {/* Moderation badges — top-left */}
                          {item.moderationStatus === 'pending' && !item.isUserReported && isOwner(item.author, user) && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] bg-amber-500 text-white rounded">Under review</span>
                          )}
                          {item.moderationStatus === 'pending' && item.isUserReported && isOwner(item.author, user) && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] bg-orange-500 text-white rounded">Reported</span>
                          )}
                          {item.moderationStatus === 'rejected' && isOwner(item.author, user) && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] bg-red-600 text-white rounded">Rejected</span>
                          )}
                          {item.hasWarningLabel && isOwner(item.author, user) && item.moderationStatus !== 'rejected' && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] bg-amber-600 text-white rounded">Warning</span>
                          )}

                          {/* Warning blur overlay */}
                          {item.hasWarningLabel && !isOwner(item.author, user) && !revealedWarnings.has(item._id) && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                              <div className="bg-orange-100 border border-orange-300 rounded-lg px-4 py-3 text-center max-w-[80%]">
                                <span className="text-2xl mb-1 block">{'\u26A0\uFE0F'}</span>
                                <p className="text-orange-800 font-semibold text-xs mb-1">Sensitive Content</p>
                                <button onClick={() => revealWarning(item._id)} className="px-3 py-1 bg-orange-500 text-white rounded text-xs">
                                  Click to reveal
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Author + date — bottom-left over gradient */}
                          <div className="absolute bottom-2 left-2 flex items-end gap-2 z-[5]">
                            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-[#4b9aaa] font-bold text-xs">
                                {item.author?.name?.charAt(0)?.toUpperCase() || item.author?.userName?.charAt(0)?.toUpperCase() || 'A'}
                              </span>
                            </div>
                            <div className="text-white">
                              <div className="text-xs font-medium drop-shadow">{item.author?.name || item.author?.userName || 'Anonymous'}</div>
                              <div className="text-[10px] opacity-80 drop-shadow">{new Date(item.date).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </div>

                        {/* Title + icons + tags below image */}
                        <div className="p-3 flex flex-col flex-1">
                          <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-gray-900">{item.title}</h3>

                          {/* Icon row — all icons evenly distributed */}
                          <div className="flex items-center justify-evenly mt-2">
                            {user && (
                              <button
                                onClick={() => { const action = savedPosts.has(item._id) ? 'unsave' : 'save'; savePost.mutate({ postId: item._id, action }); }}
                                className="particleButton relative p-1 bg-transparent border-none rounded-full cursor-pointer transition-all hover:bg-black/5"
                              >
                                <BookmarkIcon className={cn("w-5 h-5 transition-colors", savedPosts.has(item._id) ? "text-[#814256] fill-[#814256]" : "text-[#814256] hover:text-[#814256]/80")} strokeWidth={2} />
                              </button>
                            )}
                            <button onClick={() => handleReadMore(item)} className="particleButton relative p-1.5 bg-transparent border-none rounded-full cursor-pointer transition-all hover:bg-black/5">
                              {(item.comments?.length || 0) > 0 && (
                                <span className="absolute top-0 -right-1 bg-gray-300 text-gray-800 text-[7px] font-bold rounded-full min-w-[12px] h-[12px] flex items-center justify-center px-0.5">{item.comments.length}</span>
                              )}
                              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                                <path d="M21 11.5C21 16.75 16.97 21 12 21C10.67 21 9.4 20.71 8.25 20.2L3 21L4.39 16.88C3.52 15.38 3 13.5 3 11.5C3 6.25 7.03 2 12 2C16.97 2 21 6.25 21 11.5Z" stroke="#814256" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              </svg>
                            </button>
                            <EyeIcon viewCount={item.views || 0} createdAt={new Date(item.date || item.createdAt)} />
                            <HeartBtn
                              isLiked={user ? item.likedBy?.includes(user.id) || false : false}
                              likeCount={item.likes || 0}
                              onToggle={() => handleLikeToggle(item._id, item.likedBy?.includes(user?.id))}
                              disabled={!user || item.moderationStatus === 'pending' || item.moderationStatus === 'rejected'}
                            />
                            {user && !isOwner(item.author, user) && (
                              <div className="relative group">
                                <button
                                  onClick={() => openReportModal(item)}
                                  disabled={reportedItems.has(item._id)}
                                  className={cn("p-1 transition-colors text-[#6F2F59]", reportedItems.has(item._id) ? "cursor-not-allowed" : "hover:text-red-500")}
                                  aria-label={reportedItems.has(item._id) ? "Already reported" : "Report this post"}
                                ><Flag className={cn("w-5 h-5", reportedItems.has(item._id) && "fill-red-500")} strokeWidth={1.75} /></button>
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-[#1a1d4a]/95 border border-white/15 text-white/90 text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg z-20">
                                  {reportedItems.has(item._id) ? 'Already reported' : 'Report this post'}
                                </span>
                              </div>
                            )}
                            {isOwner(item.author, user) && (
                              <>
                                <button
                                  onClick={() => { if (item.moderationStatus !== 'pending' && item.moderationStatus !== 'rejected') { setEditingPost(item); setShowAddModal(true); } }}
                                  className="p-1.5 rounded-full transition-colors text-xl text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                  disabled={item.moderationStatus === 'pending' || item.moderationStatus === 'rejected'}
                                >{'\u270E'}</button>
                                <button
                                  onClick={async () => { if (item.moderationStatus !== 'pending' && item.moderationStatus !== 'rejected' && await confirmAction(`Delete this ${collectionType.slice(0, -1)}?`, { title: 'Delete', confirmLabel: 'Delete', variant: 'danger' })) deletePost.mutate(item._id); }}
                                  className="p-1.5 rounded-full transition-colors text-xl text-gray-500 hover:text-red-600 disabled:opacity-50"
                                  disabled={item.moderationStatus === 'pending' || item.moderationStatus === 'rejected' || deletePost.isPending}
                                >{deletePost.isPending && deletePost.variables === item._id ? '\u231B' : '\u2715'}</button>
                              </>
                            )}
                          </div>

                          <div className="flex-1"></div>
                          {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-2">
                              {item.tags.map((tag) => (
                                <button key={tag} onClick={() => setSearchValue(tag)} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#4b9aaa]/30 border border-[#4b9aaa] text-[#d4f0f4] hover:bg-[#4b9aaa]/50 transition-colors cursor-pointer">{tag}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ===== DESKTOP LAYOUT (image cards: 50/50 split, >= md) / TEXT CARDS: all sizes ===== */}
                    <div className={cn(
                      "flex flex-col flex-1 min-w-0",
                      item.images?.length ? "hidden md:flex md:flex-row" : ""
                    )}>
                    {/* Content side — takes w-1/2 when images on desktop */}
                    <div className={cn(
                      "flex flex-col flex-1 min-w-0",
                      item.images?.length && "w-1/2 p-4 md:p-6 overflow-hidden"
                    )}>
                    {/* Card Header Strip — Title + Edit/Delete Icons */}
                    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 px-3 md:px-6 py-3 mb-1">
                      <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                        <span className="inline-block whitespace-nowrap font-[550] italic text-sm md:text-base text-gray-900 px-1 pt-4 font-['Consolas',_monospace]">
                          {item.title}
                        </span>
                      </div>
                    </div>

                    {/* Moderation Pending Banner (AI flagged) - Only visible to the post author */}
                    {item.moderationStatus === 'pending' && !item.isUserReported && isOwner(item.author, user) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
                        <span className="text-amber-500 text-xl flex-shrink-0">⏳</span>
                        <div>
                          <p className="text-amber-800 font-medium text-sm">Your post is under review</p>
                          <p className="text-amber-700 text-xs mt-0.5">It will be visible to others after the moderation process is completed.</p>
                        </div>
                      </div>
                    )}

                    {/* User Reported Banner - Only visible to the post author */}
                    {item.moderationStatus === 'pending' && item.isUserReported && isOwner(item.author, user) && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
                        <Flag className="w-5 h-5 text-orange-500 flex-shrink-0" strokeWidth={1.75} />
                        <div>
                          <p className="text-orange-800 font-medium text-sm">Your post has been reported by the community</p>
                          <p className="text-orange-700 text-xs mt-0.5">It is currently under review. Editing and deletion are disabled until the review is complete.</p>
                        </div>
                      </div>
                    )}

                    {/* Moderation Rejected Banner - Only visible to the post author */}
                    {item.moderationStatus === 'rejected' && isOwner(item.author, user) && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
                        <span className="text-red-500 text-xl flex-shrink-0">⛔</span>
                        <div>
                          <p className="text-red-800 font-medium text-sm">Your post has been rejected</p>
                          <p className="text-red-700 text-xs mt-1">
                            <strong>Reason:</strong> {item.rejectionReason || 'Content violated community guidelines'}
                          </p>
                          <p className="text-red-600 text-xs mt-2 font-medium">
                            ⚠️ Repeated violations may result in account suspension. This post is only visible to you.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Approved with Warning Banner - Only visible to the post author */}
                    {item.hasWarningLabel && isOwner(item.author, user) && item.moderationStatus !== 'rejected' && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
                        <span className="text-orange-500 text-xl flex-shrink-0">⚠️</span>
                        <div>
                          <p className="text-orange-800 font-medium text-sm">Your post was approved with a warning</p>
                          <p className="text-orange-700 text-xs mt-1">
                            <strong>Warning:</strong> {item.warningText || 'Content may be sensitive to some community members'}
                          </p>
                          <p className="text-orange-600 text-xs mt-2">
                            Your post is visible to others but marked as potentially sensitive content.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="p-0 flex flex-col flex-1 relative">
                      {/* Blur Overlay for Warned Content - Only for non-authors */}
                      {/* TODO: Add age verification or "Show sensitive content" preference toggle
                          Options: A) Add birthDate to registration, B) User preference in settings, C) Skip for now
                          See: https://github.com/your-repo/issues/XXX */}
                      {item.hasWarningLabel && !isOwner(item.author, user) && !revealedWarnings.has(item._id) && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg">
                          <div className="bg-orange-100 border border-orange-300 rounded-lg px-6 py-4 text-center max-w-sm mx-4">
                            <span className="text-3xl mb-2 block">⚠️</span>
                            <p className="text-orange-800 font-semibold mb-1">Sensitive Content</p>
                            <p className="text-orange-700 text-sm mb-3">
                              This post may contain content that some users find sensitive.
                            </p>
                            <button
                              onClick={() => revealWarning(item._id)}
                              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors"
                            >
                              Click to reveal
                            </button>
                          </div>
                        </div>
                      )}

                      <div className={cn(
                          "flex flex-col flex-1",
                          item.hasWarningLabel && !isOwner(item.author, user) && !revealedWarnings.has(item._id) && "blur-sm pointer-events-none select-none"
                        )}>
                          {/* Author Info Header */}
                          <div className="bg-[#4b9aaa]/70 text-white px-1.5 md:px-2 py-0 rounded-md mt-0 mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs">
                            <div className="w-8 h-8 md:w-9 md:h-9 bg-white rounded-full flex items-center justify-center flex-shrink-0 -my-1">
                              <span className="text-[#4b9aaa] font-bold text-xs md:text-sm">
                                {item.author?.name?.charAt(0)?.toUpperCase() || item.author?.userName?.charAt(0)?.toUpperCase() || 'A'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-row items-center gap-1 sm:gap-2">
                                <span className="font-medium truncate">{item.author?.name || item.author?.userName || 'Anonymous'}</span>
                                <span className="text-gray-200 text-xs whitespace-nowrap">• {new Date(item.date).toLocaleDateString()}</span>
                                {item.isEdited && (
                                  <span className="text-gray-200 text-xs" title={item.lastEditedAt ? `Last edited: ${new Date(item.lastEditedAt).toLocaleString()}` : 'Edited'}>
                                    • (edited)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Post Content - Truncated */}
                          <div className="px-2 md:px-4 mb-3 md:mb-4 cursor-pointer" onClick={() => handleReadMore(item)}>
                            <p className={cn(
                              "text-gray-700 leading-relaxed text-sm md:text-base",
                              item.images?.length ? "line-clamp-3" : "line-clamp-5"
                            )}>
                              {item.description || item.body}
                            </p>
                            {/* Read & Comment link — always visible, under post text */}
                            <button
                              onClick={() => handleReadMore(item)}
                              className="mt-4 md:mt-5 text-[#4b9aaa] hover:text-[#3a7a8a] font-medium text-sm md:text-base underline"
                            >
                              Read & Comment
                            </button>
                          </div>

                          {/* Spacer pushes icons + tags to bottom */}
                          <div className="flex-1"></div>

                          {/* Icon toolbar */}
                          <div className="flex items-center justify-evenly px-2 md:px-4">
                              {user && (
                                <button
                                  onClick={() => { const action = savedPosts.has(item._id) ? 'unsave' : 'save'; savePost.mutate({ postId: item._id, action }); }}
                                  className="particleButton relative p-1 md:p-1.5 bg-transparent border-none rounded-full cursor-pointer transition-all hover:bg-black/5"
                                  aria-label={savedPosts.has(item._id) ? "Unsave post" : "Save post"}
                                >
                                  <BookmarkIcon className={cn("w-5 h-5 transition-colors", savedPosts.has(item._id) ? "text-[#814256] fill-[#814256]" : "text-[#814256] hover:text-[#814256]/80")} strokeWidth={2} />
                                </button>
                              )}
                              <button onClick={() => handleReadMore(item)} className="particleButton relative p-1 md:p-1.5 bg-transparent border-none rounded-full cursor-pointer transition-all hover:bg-black/5" aria-label="View comments">
                                {(item.comments?.length || 0) > 0 && (
                                  <span className="absolute top-0 -right-1 bg-gray-300 text-gray-800 text-[7px] md:text-[8px] font-bold rounded-full min-w-[12px] h-[12px] md:min-w-[14px] md:h-[14px] flex items-center justify-center px-0.5">{item.comments.length}</span>
                                )}
                                <svg viewBox="0 0 24 24" fill="none" className="relative block w-5 h-5 z-10">
                                  <path d="M21 11.5C21 16.75 16.97 21 12 21C10.67 21 9.4 20.71 8.25 20.2L3 21L4.39 16.88C3.52 15.38 3 13.5 3 11.5C3 6.25 7.03 2 12 2C16.97 2 21 6.25 21 11.5Z" stroke="#814256" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                              </button>
                              <EyeIcon viewCount={item.views || 0} createdAt={new Date(item.date || item.createdAt)} />
                              <HeartBtn
                                isLiked={user ? item.likedBy?.includes(user.id) || false : false}
                                likeCount={item.likes || 0}
                                onToggle={() => handleLikeToggle(item._id, item.likedBy?.includes(user?.id))}
                                disabled={!user || item.moderationStatus === 'pending' || item.moderationStatus === 'rejected'}
                              />
                              {user && !isOwner(item.author, user) && (
                                <button
                                  onClick={() => openReportModal(item)}
                                  disabled={reportedItems.has(item._id)}
                                  className={cn("p-1 transition-colors", reportedItems.has(item._id) ? "text-[#6F2F59] cursor-not-allowed" : "text-[#6F2F59] hover:text-red-500")}
                                  title={reportedItems.has(item._id) ? "Already reported" : "Report this post"}
                                ><Flag className={cn("w-5 h-5", reportedItems.has(item._id) && "fill-red-500")} strokeWidth={1.75} /></button>
                              )}
                              {isOwner(item.author, user) && (
                                <>
                                  <button
                                    onClick={() => { if (item.moderationStatus !== 'pending' && item.moderationStatus !== 'rejected') { setEditingPost(item); setShowAddModal(true); } }}
                                    className="p-1 md:p-1.5 rounded-full transition-colors text-xl text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                    disabled={item.moderationStatus === 'pending' || item.moderationStatus === 'rejected'}
                                  >{'\u270E'}</button>
                                  <button
                                    onClick={async () => { if (item.moderationStatus !== 'pending' && item.moderationStatus !== 'rejected' && await confirmAction(`Delete this ${collectionType.slice(0, -1)}?`, { title: 'Delete', confirmLabel: 'Delete', variant: 'danger' })) deletePost.mutate(item._id); }}
                                    className="p-1 md:p-1.5 rounded-full transition-colors text-xl text-gray-500 hover:text-red-600 disabled:opacity-50"
                                    disabled={item.moderationStatus === 'pending' || item.moderationStatus === 'rejected' || deletePost.isPending}
                                  >{deletePost.isPending && deletePost.variables === item._id ? '\u231B' : '\u2715'}</button>
                                </>
                              )}
                          </div>

                          {/* Tags */}
                          {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 md:gap-2 pt-4 px-2 md:px-4">
                              {item.tags.map((tag) => (
                                <button key={tag} onClick={() => setSearchValue(tag)} className="inline-flex items-center px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[11px] md:text-xs font-medium bg-[#4b9aaa]/30 border border-[#4b9aaa] text-[#d4f0f4] hover:bg-[#4b9aaa]/50 transition-colors cursor-pointer">{tag}</button>
                              ))}
                            </div>
                          )}
                        </div>
                    </div>
                    </div>{/* close content side */}
                    {item.images?.length > 0 && (
                      <div className="w-1/2 flex-shrink-0 relative cursor-pointer" onClick={() => handleReadMore(item)}>
                        <img
                          src={item.images[0].url}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    </div>{/* close desktop layout wrapper */}
                  </div>
                );
              })}
            </motion.div>
            </AnimatePresence>
          )}
          {filteredItems.length > pageSize && (
            <div className="mt-6 md:mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredItems.length}
                pageSize={pageSize}
                onPageChange={(p) => {
                  setCurrentPage(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                pageSizeOptions={[12, 24, 48]}
                onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(0); }}
                accentColor="bg-[#6F2F59]"
                accentHover="hover:bg-[#5a2548]"
                itemLabel={collectionType === 'topics' ? 'discussions' : collectionType}
              />
            </div>
          )}
        </div>

      {/* Post Modal */}
      <PostModal
        show={showAddModal}
        handleClose={() => {
          setShowAddModal(false);
          setEditingPost(null); // Clear editing state when closing
        }}
        collectionType={collectionType}
        onSubmit={handlePostSubmit}
        editMode={!!editingPost}
        initialData={editingPost ? {
          id: editingPost._id,
          title: editingPost.title,
          body: editingPost.body || editingPost.description,
          tags: editingPost.tags,
          images: editingPost.images
        } : undefined}
      />

      {/* Read More Modal */}
      <ReadMoreModal
        isOpen={showReadMoreModal}
        onClose={() => setShowReadMoreModal(false)}
        title={selectedPost?.title || ''}
        body={selectedPost?.body || selectedPost?.description || ''}
        author={selectedPost?.author?.name || selectedPost?.author?.userName || 'Anonymous'}
        date={selectedPost?.date}
        tags={selectedPost?.tags}
        images={selectedPost?.images}
        postId={selectedPost?._id}
        collectionType={collectionType}
        user={user}
        onReportComment={openCommentReportModal}
        reportedComments={reportedItems}
        isLiked={user ? selectedPost?.likedBy?.includes(user.id) || false : false}
        likeCount={selectedPost?.likes || 0}
        onToggleLike={selectedPost ? () => handleLikeToggle(selectedPost._id, selectedPost.likedBy?.includes(user?.id)) : undefined}
        isSaved={selectedPost ? savedPosts.has(selectedPost._id) : false}
        onToggleSave={selectedPost ? () => { const action = savedPosts.has(selectedPost._id) ? 'unsave' : 'save'; savePost.mutate({ postId: selectedPost._id, action }); } : undefined}
        isReportedByMe={selectedPost ? reportedItems.has(selectedPost._id) : false}
      />

      {/* Report Modal */}
      <ReportModal
        show={showReportModal}
        handleClose={() => {
          setShowReportModal(false);
          setReportingItem(null);
        }}
        contentType={reportingItem?.type || 'topic'}
        contentId={reportingItem?.id || ''}
        contentPreview={reportingItem?.preview}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
}
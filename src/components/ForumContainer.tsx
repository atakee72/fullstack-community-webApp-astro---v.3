import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTopicsQuery, useCreatePost, useDeletePost, useEditPost, useSavePostMutation, useSavedPostsQuery } from '../hooks/api/useTopicsQuery';
import { BookmarkIcon } from 'lucide-react';
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
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [revealedWarnings, setRevealedWarnings] = useState<Set<string>>(new Set());
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingItem, setReportingItem] = useState<{ id: string; type: 'topic' | 'comment'; preview?: string } | null>(null);
  const [reportedItems, setReportedItems] = useState<Set<string>>(new Set());
  const [reportCheckLoading, setReportCheckLoading] = useState<string | null>(null);
  const [reportToastItemId, setReportToastItemId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

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

  const queryClient = useQueryClient();

  // Publish the sticky header's rendered height (including its bottom margin)
  // as --forum-header-h on the forum root. Cards read this via calc() so their
  // sticky `top` lands cleanly below the header regardless of tab/search size.
  useLayoutEffect(() => {
    const header = headerRef.current;
    const root = rootRef.current;
    if (!header || !root) return;
    const measure = () => {
      const rect = header.getBoundingClientRect();
      const mb = parseFloat(getComputedStyle(header).marginBottom) || 0;
      root.style.setProperty('--forum-header-h', `${Math.ceil(rect.height + mb)}px`);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    measure();
    return () => ro.disconnect();
  }, [isClient, isLoading, items.length]);

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

  const filteredItems = (items as any[]).filter(item =>
    (item.title?.toLowerCase() || '').includes(searchValue.toLowerCase()) ||
    ((item.description || item.body || '')?.toLowerCase() || '').includes(searchValue.toLowerCase())
  );

  // Client-side pagination: slice filteredItems into pages of `pageSize`.
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = filteredItems.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  // Reset to first page and scroll to top whenever the tab or search changes.
  useEffect(() => {
    setCurrentPage(0);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [collectionType, searchValue]);

  // Disable click events on sticky cards hidden behind the active (topmost) one.
  // Without this, the peeking header strip of a hidden card would still receive
  // clicks — meaning a user could accidentally trigger "Write a comment", "Edit",
  // or "Delete" on the WRONG forum post. Pure CSS can't detect "visually topmost
  // sticky element" (all stuck cards match @container scroll-state(stuck: top)
  // equally), so we use a throttled scroll listener to toggle pointer-events.
  useEffect(() => {
    let rafId = 0;
    const update = () => {
      // Re-query cards every time — DOM nodes change after AnimatePresence transitions
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.forum-sticky-card'));
      if (cards.length === 0) return;

      const root = document.querySelector('[class*="max-w-4xl"]');
      const headerEl = root?.querySelector('[class*="sticky"]');
      const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 100;
      const pileTop = headerBottom - 10;
      const pileBottom = headerBottom + 120;

      let activeIndex = -1;
      for (let i = cards.length - 1; i >= 0; i--) {
        const rect = cards[i].getBoundingClientRect();
        if (rect.top >= pileTop && rect.top <= pileBottom) {
          activeIndex = i;
          break;
        }
      }

      for (let i = 0; i < cards.length; i++) {
        const isHidden = activeIndex >= 0 && i < activeIndex;
        cards[i].classList.toggle('is-hidden-behind', isHidden);
      }
    };

    const handleScroll = () => {
      if (rafId) return; // already scheduled for next frame
      rafId = requestAnimationFrame(() => {
        update();
        rafId = 0;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    update(); // initial run — in case cards are already stuck at mount

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [filteredItems, currentPage, pageSize, collectionType]);

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
    setSelectedPost(item);
    setShowReadMoreModal(true);
    // Increment views when read more is clicked (only if not the author)
    if (!isOwner(item.author, user)) {
      incrementViews(item._id);
    }
  };

  // Truncate text to approximately 3 lines (about 150 characters)
  const truncateText = (text: string, maxLength: number = 150) => {
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
        // Mark item as reported locally
        setReportedItems(prev => new Set([...prev, data.contentId]));
        return { success: true };
      } else {
        return { success: false, error: result.error, alreadyReported: result.alreadyReported };
      }
    } catch (error) {
      console.error('Failed to submit report:', error);
      return { success: false, error: 'Failed to submit report' };
    }
  };

  // Check if already reported, then open modal
  const checkAndOpenReportModal = async (contentId: string, contentType: 'topic' | 'comment', preview: string) => {
    // If already known to be reported, show tooltip
    if (reportedItems.has(contentId)) {
      setReportToastItemId(contentId);
      setTimeout(() => setReportToastItemId(null), 2000);
      return;
    }

    setReportCheckLoading(contentId);
    try {
      const response = await fetch(`/api/reports/check?contentId=${contentId}&contentType=${contentType}`);
      const result = await response.json();

      if (result.alreadyReported) {
        // Mark as reported locally and show tooltip
        setReportedItems(prev => new Set([...prev, contentId]));
        setReportToastItemId(contentId);
        setTimeout(() => setReportToastItemId(null), 2000);
      } else {
        // Open the modal
        setReportingItem({ id: contentId, type: contentType, preview });
        setShowReportModal(true);
      }
    } catch (error) {
      console.error('Failed to check report status:', error);
      // On error, still open modal - server will handle duplicate check
      setReportingItem({ id: contentId, type: contentType, preview });
      setShowReportModal(true);
    } finally {
      setReportCheckLoading(null);
    }
  };

  // Open report modal for a post (use correct contentType based on current collection)
  const openReportModal = (item: any) => {
    // Map collection name to singular content type: topics -> topic, announcements -> announcement, etc.
    const contentType = collectionType.slice(0, -1) as 'topic' | 'announcement' | 'recommendation';
    checkAndOpenReportModal(item._id, contentType, item.title);
  };

  // Open report modal for a comment
  const openCommentReportModal = (commentId: string, preview: string) => {
    checkAndOpenReportModal(commentId, 'comment', preview);
  };

  // Show loading state during SSR or data fetching
  if (!isClient || isLoading) {
    return (
      <div className="w-full">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b border-[#4b9aaa]"></div>
          <p className="text-gray-600 mt-2">Loading forum...</p>
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
    <div ref={rootRef} className="w-full max-w-4xl mx-auto">
      {/* Header Section with Collection Selector — sticky so tabs + search stay at top on scroll.
          bg-[#4b9aaa] matches the teal parent box (index.astro:14) so it blends seamlessly. */}
      <div ref={headerRef} className="sticky top-4 z-30 w-full mb-4 md:mb-6 bg-[#4b9aaa]">
        {/* Tab row + Plus button grouped together; plus stays visible even when search collapses. */}
        <div className="flex items-end gap-2 mt-2 md:mt-4 mb-3 md:mb-4 ml-2 md:ml-6">
        {/* Collection Type Buttons - Lifted Tab Style */}
        <div className="flex flex-wrap xs:flex-nowrap items-center xs:items-end justify-center xs:justify-start gap-1 flex-1 overflow-x-auto">
          <button
            onClick={() => setCollectionType('topics')}
            className={cn(
              'px-2 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 text-xs sm:text-sm md:text-lg font-semibold transition-all duration-300 ease-out rounded-t-lg whitespace-nowrap',
              collectionType === 'topics'
                ? 'h-9 sm:h-12 md:h-14 bg-[#814256] text-white border-b border-[#814256] shadow-md'
                : 'h-8 sm:h-10 md:h-11 bg-[#4b9aaa] text-white hover:bg-[#3a8a9a] opacity-80 blur-[0.1px] border-b border-[#eccc6e]'
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
                : 'h-8 sm:h-10 md:h-11 bg-[#4b9aaa] text-white hover:bg-[#3a8a9a] opacity-80 blur-[0.1px] border-b border-[#eccc6e]'
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
                : 'h-8 sm:h-10 md:h-11 bg-[#4b9aaa] text-white hover:bg-[#3a8a9a] opacity-80 blur-[0.1px] border-b border-[#eccc6e]'
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

        <div className="bg-[#4b9aaa]/10 rounded-lg shadow-md">
          <div className="p-3 md:p-4">
            <input
              type="text"
              placeholder={`Search in ${collectionType === 'topics' ? 'discussions' : collectionType}...`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full p-2 md:p-3 border-2 border-gray-200 rounded-md text-sm md:text-base focus:outline-none focus:border-[#4b9aaa] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="mt-3 md:mt-4">
          {pagedItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
              <p className="text-gray-600 text-base md:text-lg">No {collectionType} found. Be the first to create one!</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
            <motion.div
              key={collectionType}
              className="space-y-4"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {pagedItems.map((item, index) => {
                // Piling effect: cards stick just below the sticky header.
                // `--forum-header-h` is set live via ResizeObserver (see useEffect above)
                // so the pile adapts as the header grows/shrinks (search expanded/collapsed).
                // 20px step creates a 4-layer visible pile; cap at 80px total peek.
                const pileOffset = Math.min(index * 20, 80);
                const stickyTop = `calc(var(--forum-header-h, 140px) + 4px + ${pileOffset}px)`;
                // Deterministic pseudo-random horizontal offset for organic pile look.
                // Range [-10, +10] px; 8 and 21 are coprime (GCD=1, since 21=3·7 and 8=2³)
                // so all 21 values appear in the first 21 cards before cycling. Wide spread
                // for a dramatic "casually tossed" pile feel.
                const xOffset = ((index * 8) % 21) - 10;
                // Last card stays in normal flow (no sticky). At the bottom of
                // the list there's no scroll runway for sticky to release, so
                // a sticky last card would "float" above its natural position
                // and appear higher than the card before it.
                const isLast = index === pagedItems.length - 1;
                return (
                  <div
                    key={item._id}
                    style={{
                      top: isLast ? undefined : stickyTop,
                      transform: `translateX(${xOffset}px)`,
                    }}
                    className={cn(
                      "forum-sticky-card bg-[#c9c4b9] rounded-lg shadow-xl overflow-hidden flex min-h-[300px] md:min-h-[400px] transition-all duration-400 ease-out border border-[#4b9aaa]/40",
                      item.images?.length ? "flex-row" : "flex-col p-4 md:p-6",
                      !isLast && "sticky",
                      item.moderationStatus === 'pending' && !item.isUserReported && isOwner(item.author, user) && "ring-2 ring-amber-300",
                      item.moderationStatus === 'pending' && item.isUserReported && isOwner(item.author, user) && "ring-2 ring-orange-300",
                      item.moderationStatus === 'rejected' && isOwner(item.author, user) && "ring-2 ring-red-400"
                    )}>
                    {/* Content wrapper — takes w-1/2 when images, full width otherwise */}
                    <div className={cn(
                      "flex flex-col flex-1 min-w-0",
                      item.images?.length && "w-1/2 p-4 md:p-6 overflow-hidden"
                    )}>
                    {/* Card Header Strip — Title + Comment Count + Action Icons */}
                    <div className="bg-[#c9c4b9] -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-3 md:px-6 py-2 mb-4">
                      <div className="flex items-center gap-2">
                        {/* Post Title */}
                        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                          <span className="inline-block whitespace-nowrap font-medium text-sm md:text-base text-gray-900 px-1">
                            {item.title}
                          </span>
                        </div>

                        {/* Edit and Delete Icons - Disabled for pending/rejected posts */}
                        {isOwner(item.author, user) && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => {
                                if (item.moderationStatus !== 'pending' && item.moderationStatus !== 'rejected') {
                                  setEditingPost(item);
                                  setShowAddModal(true);
                                }
                              }}
                              className="p-0.5 md:p-1 rounded-md transition-colors text-sm md:text-base text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={item.moderationStatus === 'pending' ? "Editing disabled while pending review" : item.moderationStatus === 'rejected' ? "Editing disabled for rejected posts" : "Edit post"}
                              disabled={item.moderationStatus === 'pending' || item.moderationStatus === 'rejected'}
                            >
                              ✎
                            </button>
                            <button
                              onClick={async () => {
                                if (item.moderationStatus !== 'pending' && item.moderationStatus !== 'rejected' && await confirmAction(`Are you sure you want to delete this ${collectionType.slice(0, -1)}?`, { title: `Delete ${collectionType.slice(0, -1)}`, confirmLabel: 'Delete', variant: 'danger' })) {
                                  deletePost.mutate(item._id);
                                }
                              }}
                              className="p-0.5 md:p-1 rounded-md transition-colors text-sm md:text-base text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={item.moderationStatus === 'pending' ? "Deletion disabled while pending review" : item.moderationStatus === 'rejected' ? "Deletion disabled for rejected posts" : "Delete post"}
                              disabled={item.moderationStatus === 'pending' || item.moderationStatus === 'rejected' || deletePost.isPending}
                            >
                              {deletePost.isPending && deletePost.variables === item._id ? '⏳' : '✕'}
                            </button>
                          </div>
                        )}
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
                        <span className="text-orange-500 text-xl flex-shrink-0">🚩</span>
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
                          <div className="bg-[#4b9aaa] text-white px-1.5 md:px-2 py-0 rounded-md mt-0 mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs">
                            <div className="w-11 h-11 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0 -my-2">
                              <span className="text-[#4b9aaa] font-bold text-xs md:text-sm">
                                {item.author?.name?.charAt(0)?.toUpperCase() || item.author?.userName?.charAt(0)?.toUpperCase() || 'A'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2">
                                <span className="font-medium truncate">{item.author?.name || item.author?.userName || 'Anonymous'}</span>
                                <span className="text-gray-200 text-xs">• {new Date(item.date).toLocaleDateString()}</span>
                                {item.isEdited && (
                                  <span className="text-gray-200 text-xs" title={item.lastEditedAt ? `Last edited: ${new Date(item.lastEditedAt).toLocaleString()}` : 'Edited'}>
                                    • (edited)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-0 items-center text-xs md:text-sm">
                              {/* Bookmark icon */}
                              {user && (
                                <button
                                  onClick={() => {
                                    const action = savedPosts.has(item._id) ? 'unsave' : 'save';
                                    savePost.mutate({ postId: item._id, action });
                                  }}
                                  className="particleButton relative p-1 md:p-1.5 bg-transparent border-none rounded-full cursor-pointer transition-all hover:bg-white/10"
                                  aria-label={savedPosts.has(item._id) ? "Unsave post" : "Save post"}
                                >
                                  <BookmarkIcon
                                    className={cn(
                                      "w-4 h-4 md:w-5 md:h-5 transition-colors",
                                      savedPosts.has(item._id)
                                        ? "text-[#814256] fill-[#814256]"
                                        : "text-[#814256] hover:text-[#814256]/80"
                                    )}
                                    strokeWidth={2}
                                  />
                                </button>
                              )}
                              {/* Comment count icon */}
                              <button
                                onClick={() => handleReadMore(item)}
                                className="particleButton relative p-1 md:p-1.5 bg-transparent border-none rounded-full cursor-pointer transition-all hover:bg-white/10"
                                aria-label="View comments"
                              >
                                {(item.comments?.length || 0) > 0 && (
                                  <span className="absolute top-0 -right-1 bg-gray-300 text-gray-800 text-[8px] md:text-[10px] font-bold rounded-full min-w-[12px] h-[12px] md:min-w-[14px] md:h-[14px] flex items-center justify-center px-0.5">
                                    {item.comments.length}
                                  </span>
                                )}
                                <svg viewBox="0 0 24 24" fill="none" className="relative block w-4 h-4 md:w-5 md:h-5 z-10">
                                  <path
                                    d="M21 11.5C21 16.75 16.97 21 12 21C10.67 21 9.4 20.71 8.25 20.2L3 21L4.39 16.88C3.52 15.38 3 13.5 3 11.5C3 6.25 7.03 2 12 2C16.97 2 21 6.25 21 11.5Z"
                                    stroke="#814256"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                  />
                                </svg>
                              </button>
                              <EyeIcon viewCount={item.views || 0} createdAt={new Date(item.date || item.createdAt)} />
                              <HeartBtn
                                isLiked={user ? item.likedBy?.includes(user.id) || false : false}
                                likeCount={item.likes || 0}
                                onToggle={() => handleLikeToggle(item._id, item.likedBy?.includes(user?.id))}
                                disabled={!user || item.moderationStatus === 'pending' || item.moderationStatus === 'rejected'}
                              />
                              {/* Report Button - Hidden for own content */}
                              {user && !isOwner(item.author, user) && (
                                <div className="relative">
                                  <button
                                    onClick={() => openReportModal(item)}
                                    disabled={reportedItems.has(item._id) || reportCheckLoading === item._id}
                                    className={cn(
                                      "flex items-center gap-1 transition-colors",
                                      reportedItems.has(item._id)
                                        ? "text-gray-500 cursor-not-allowed opacity-50"
                                        : reportCheckLoading === item._id
                                          ? "text-gray-300 cursor-wait"
                                          : "text-gray-200 hover:text-red-300"
                                    )}
                                    title={reportedItems.has(item._id) ? "Already reported" : "Report this post"}
                                  >
                                    <span className="text-sm">{reportCheckLoading === item._id ? '⏳' : '🚩'}</span>
                                  </button>
                                  {/* Tooltip for already reported */}
                                  {reportToastItemId === item._id && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap z-50 animate-fade-in">
                                      <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg">
                                        Already reported
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Post Content - Truncated */}
                          <div className="px-2 md:px-4 mb-3 md:mb-4">
                            <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                              {truncateText(item.description || item.body)}
                            </p>
                            {/* Read & Comment link — always visible, under post text */}
                            <button
                              onClick={() => handleReadMore(item)}
                              className="mt-4 md:mt-5 text-[#4b9aaa] hover:text-[#3a7a8a] font-medium text-sm md:text-base underline"
                            >
                              Read & Comment
                            </button>
                          </div>

                          {/* Spacer pushes tags to bottom */}
                          <div className="flex-1"></div>

                          {/* Tags */}
                          {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 md:gap-2 pt-3 md:pt-4 px-2 md:px-4">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 md:px-3 py-0.5 md:py-1 bg-[#4b9aaa] text-white text-xs rounded-md underline"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                    </div>
                    </div>{/* close content wrapper */}
                    {item.images?.length > 0 && (
                      <div className="w-1/2 flex-shrink-0 bg-[#c9c4b9] relative">
                        <img
                          src={item.images[0].url}
                          alt=""
                          className="absolute inset-0 w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
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
                accentColor="bg-[#814256]"
                accentHover="hover:bg-[#6b3548]"
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
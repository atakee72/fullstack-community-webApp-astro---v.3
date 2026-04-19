"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { BookmarkIcon, X, ExternalLink, Plus, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNewsQuery, useSubmitNews, useSaveNewsMutation, useSavedNewsQuery } from "../../hooks/api/useNewsQuery";
import { Pagination } from "./Pagination";
import type { NewsItem } from "../../types";

interface NewsCardsProps {
  user?: any;
  enableAnimations?: boolean;
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function NewsCards({
  user,
  enableAnimations = true,
}: NewsCardsProps) {
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [page, setPage] = useState(0);
  const [showSubmitToast, setShowSubmitToast] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '', description: '', sourceUrl: '', sourceName: '', imageUrl: '', submitterComment: ''
  });

  const [pageSize, setPageSize] = useState(24);
  const shouldAnimate = enableAnimations && !prefersReducedMotion;

  // Responsive column count for row-based stagger delay
  const getColumnsPerRow = (): number => {
    if (typeof window === 'undefined') return 1;
    if (window.innerWidth >= 1280) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
  };
  const [columnsPerRow, setColumnsPerRow] = useState(1);

  useEffect(() => {
    setColumnsPerRow(getColumnsPerRow());
    const handler = () => setColumnsPerRow(getColumnsPerRow());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Compute date range based on filter selection
  const getDateRange = (): { dateFrom?: string; dateTo?: string } => {
    if (dateFilter === 'all') return {};
    if (dateFilter === 'archive') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return { dateTo: oneYearAgo.toISOString().split('T')[0] };
    }
    const now = new Date();
    if (dateFilter === '7d') now.setDate(now.getDate() - 7);
    else if (dateFilter === '30d') now.setDate(now.getDate() - 30);
    else if (dateFilter === '90d') now.setDate(now.getDate() - 90);
    else if (dateFilter === '6m') now.setMonth(now.getMonth() - 6);
    else if (dateFilter === '1y') now.setFullYear(now.getFullYear() - 1);
    return { dateFrom: now.toISOString().split('T')[0] };
  };

  const dateRange = getDateRange();

  // Data fetching
  const { data, isLoading, error } = useNewsQuery({
    limit: pageSize,
    offset: page * pageSize,
    sortBy: dateFilter === 'archive' ? 'publishedAt' : 'approvedAt',
    sortOrder: 'desc',
    search: debouncedSearch || undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });

  const submitMutation = useSubmitNews();
  const saveMutation = useSaveNewsMutation();
  const { data: serverSavedIds } = useSavedNewsQuery(!!user);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, []);

  // Load saved items: server data for logged-in users, localStorage as fallback
  useEffect(() => {
    if (serverSavedIds && serverSavedIds.length > 0) {
      setSavedItems(new Set(serverSavedIds));
    } else if (!user) {
      const saved = localStorage.getItem('savedNews');
      if (saved) {
        try {
          setSavedItems(new Set(JSON.parse(saved)));
        } catch {}
      }
    }
    const dismissed = localStorage.getItem('dismissedNewsWarnings');
    if (dismissed) {
      try {
        setDismissedWarnings(new Set(JSON.parse(dismissed)));
      } catch {}
    }
  }, [serverSavedIds, user]);

  // Debounced search — 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Auto-dismiss submit toast
  useEffect(() => {
    if (showSubmitToast) {
      const timer = setTimeout(() => setShowSubmitToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showSubmitToast]);

  const toggleSave = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      localStorage.setItem('savedNews', JSON.stringify([...newSet]));
      return newSet;
    });

    // Also persist to backend if user is logged in
    if (user) {
      const action = savedItems.has(itemId) ? 'unsave' : 'save';
      saveMutation.mutate({ newsId: itemId, action });
    }
  };

  const dismissWarning = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedWarnings(prev => {
      const newSet = new Set(prev);
      newSet.add(itemId);
      localStorage.setItem('dismissedNewsWarnings', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const [selectedIndex, setSelectedIndex] = useState(-1);

  const newsItems = data?.news || [];
  const pagination = data?.pagination;

  const openItem = (item: NewsItem, index: number) => {
    setSelectedItem(item);
    setSelectedIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeItem = () => {
    setSelectedItem(null);
    setSelectedIndex(-1);
    document.body.style.overflow = '';
  };

  const navigateItem = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? selectedIndex - 1 : selectedIndex + 1;
    if (newIndex >= 0 && newIndex < newsItems.length) {
      setSelectedItem(newsItems[newIndex]);
      setSelectedIndex(newIndex);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSubmitForm) setShowSubmitForm(false);
        else if (selectedItem) closeItem();
      } else if (selectedItem && !showSubmitForm) {
        if (e.key === 'ArrowLeft' && selectedIndex > 0) {
          navigateItem('prev');
        } else if (e.key === 'ArrowRight' && selectedIndex < newsItems.length - 1) {
          navigateItem('next');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, showSubmitForm, selectedIndex, newsItems]);

  const fetchPreview = async (url: string) => {
    if (!url) return;
    try {
      new URL(url);
    } catch {
      return; // Not a valid URL yet
    }

    setPreviewLoading(true);
    setPreviewError('');

    try {
      const response = await fetch(`/api/news/preview?url=${encodeURIComponent(url)}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok) {
        setPreviewError(data.error || 'Could not fetch preview');
        return;
      }

      setFormData(prev => ({
        ...prev,
        sourceUrl: url,
        title: data.title || prev.title,
        description: data.description || prev.description,
        sourceName: data.siteName || prev.sourceName,
        imageUrl: data.image || prev.imageUrl,
      }));
    } catch {
      setPreviewError('Failed to fetch article preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await submitMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        sourceUrl: formData.sourceUrl,
        sourceName: formData.sourceName,
        imageUrl: formData.imageUrl || undefined,
        submitterComment: formData.submitterComment || undefined,
      });
      setShowSubmitForm(false);
      setFormData({ title: '', description: '', sourceUrl: '', sourceName: '', imageUrl: '', submitterComment: '' });
      setShowSubmitToast(true);
    } catch (err) {
      // Error is handled by mutation state
    }
  };

  // Check if current user is the author of a news item
  const isAuthor = (item: NewsItem): boolean => {
    if (!user) return false;
    if (typeof item.submittedBy === 'string') return item.submittedBy === user.id;
    if (item.submittedBy && typeof item.submittedBy === 'object') {
      const sub = item.submittedBy as any;
      return sub._id?.toString() === user.id || sub.id === user.id;
    }
    return false;
  };

  const GENERIC_WARNING = 'This content may contain sensitive material.';

  const totalPages = pagination ? Math.ceil(pagination.total / pageSize) : 0;

  const clearSearch = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setPage(0);
  };

  const handleDateFilter = (filter: string) => {
    setDateFilter(filter);
    setPage(0);
  };


  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 text-[#e8e6e1]">
      {/* Submit News Button */}
      {user && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowSubmitForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3b5ce0] text-white rounded-lg hover:bg-[#2e48b8] transition-colors font-medium shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Submit News</span>
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search news..."
            className="w-full pl-10 pr-10 py-2 bg-white/[0.08] backdrop-blur-xl border border-white/15 text-[#e8e6e1] placeholder-white/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5ce0]/50 focus:border-[#3b5ce0]/50"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isLoading && debouncedSearch && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3b5ce0] animate-spin" />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All Time' },
            { value: '7d', label: '7 Days' },
            { value: '30d', label: '30 Days' },
            { value: '90d', label: '3 Months' },
            { value: '6m', label: '6 Months' },
            { value: '1y', label: '1 Year' },
            { value: 'archive', label: 'Archive' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleDateFilter(opt.value)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                dateFilter === opt.value
                  ? "bg-[#3b5ce0] text-white"
                  : "bg-white/10 text-white/70 hover:bg-gray-200"
              )}
            >
              {opt.label}
            </button>
          ))}
          {pagination && (
            <span className="flex items-center text-sm text-white/50 ml-auto">
              {pagination.total} {pagination.total === 1 ? 'article' : 'articles'}
            </span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && newsItems.length === 0 && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#3b5ce0] animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center">
          Failed to load news. Please try again later.
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && newsItems.length === 0 && (
        <div className="text-center py-16">
          <p className="text-white/60 text-lg mb-2">No news yet</p>
          <p className="text-white/50">
            {user ? 'Be the first to submit a news story!' : 'Check back later for community news.'}
          </p>
        </div>
      )}

      {/* News Cards Grid */}
      {newsItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {newsItems.map((item, index) => {
            const itemId = (item._id || '').toString();
            const isRejected = item.moderationStatus === 'rejected';
            const isPending = item.moderationStatus === 'pending';
            const hasWarning = item.hasWarningLabel && !isRejected;
            const isItemAuthor = isAuthor(item);
            const warningDismissed = dismissedWarnings.has(itemId);
            const showWarningOverlay = hasWarning && !warningDismissed && !isItemAuthor;

            const cardClassName = cn(
              "rounded-xl overflow-hidden border border-transparent group relative",
              "transition-all duration-300",
              !isRejected && "cursor-pointer hover:-translate-y-1 hover:scale-[1.01] hover:bg-white/[0.06] hover:backdrop-blur-md hover:border-white/[0.15] hover:border-t-white/30 hover:border-l-white/25 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]",
              isPending && "opacity-60 border-amber-300",
              isRejected && "opacity-50 border-red-300 grayscale"
            );

            const card = (
              <article
                className={cardClassName}
                onClick={() => !isRejected && !showWarningOverlay && openItem(item, index)}
              >
                {/* Warning overlay (blur until dismissed) */}
                {showWarningOverlay && (
                  <div className="absolute inset-0 z-10 backdrop-blur-sm bg-white/60 flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-2xl mb-2">⚠️</span>
                    <p className="text-sm font-medium text-white/80 mb-1">Content Warning</p>
                    <p className="text-xs text-white/60 mb-3">
                      {isAuthor(item)
                        ? (item.warningText || 'Your submission was approved with a warning.')
                        : GENERIC_WARNING}
                    </p>
                    <button
                      onClick={(e) => dismissWarning(itemId, e)}
                      className="px-3 py-1.5 text-xs bg-[#3b5ce0] text-white rounded hover:bg-[#2e48b8] transition-colors"
                    >
                      Show content anyway
                    </button>
                  </div>
                )}

                {/* Image */}
                <div className="relative h-48 md:h-56 overflow-hidden bg-white/10">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transform-gpu group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <img
                      src="/schillerpro-schilder.jpeg"
                      alt="Schillerkiez"
                      className="w-full h-full object-cover opacity-60"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/50 to-transparent" />

                  {/* Save icon */}
                  {!isRejected && (
                    <button
                      className="absolute top-3 right-3 p-1 transition-transform duration-200 hover:scale-110 active:scale-90"
                      onClick={(e) => toggleSave(itemId, e)}
                    >
                      <BookmarkIcon
                        className={cn(
                          "w-5 h-5 transition-colors",
                          savedItems.has(itemId)
                            ? "text-[#eccc6e] fill-[#eccc6e]"
                            : "text-white/80 hover:text-white"
                        )}
                      />
                    </button>
                  )}

                  {/* Status badges */}
                  {isPending && (
                    <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-amber-500 text-white rounded">
                      Pending approval
                    </span>
                  )}
                  {isRejected && (
                    <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-red-600 text-white rounded">
                      Rejected
                    </span>
                  )}
                  {hasWarning && (warningDismissed || isItemAuthor) && (
                    <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-amber-600 text-white rounded">
                      {isItemAuthor ? '⚠️ Sensitive for others' : '⚠️ Warning'}
                    </span>
                  )}
                  {dateFilter === 'archive' && (
                    <span className="absolute top-3 right-12 px-2 py-1 text-xs font-medium bg-white/[0.04]0/80 text-white rounded">
                      Archived
                    </span>
                  )}

                  {/* Source and time */}
                  <div className="absolute bottom-3 left-3 text-white">
                    <div className="text-xs mb-1 opacity-90">{item.sourceName}</div>
                    <div className="text-xs opacity-75">{formatTimeAgo(item.publishedAt)}</div>
                  </div>
                </div>

                {/* Title */}
                <div className="p-4 md:p-5">
                  <h3 className="font-semibold text-base md:text-lg leading-tight line-clamp-3 text-[#e8e6e1] group-hover:text-[#3b5ce0] transition-colors">
                    {item.title}
                  </h3>
                  {item.source === 'user_submitted' && item.submittedBy && typeof item.submittedBy === 'object' && (
                    <p className="text-xs text-white/50 mt-2">
                      Submitted by {(item.submittedBy as any).userName || (item.submittedBy as any).name || 'Member'}
                    </p>
                  )}
                </div>
              </article>
            );

            return shouldAnimate ? (
              <motion.div
                key={itemId}
                initial={{ opacity: 0, y: 80 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.8,
                  delay: (index % columnsPerRow) * 0.12,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              >
                {card}
              </motion.div>
            ) : (
              <div key={itemId}>{card}</div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={pagination?.total ?? 0}
        pageSize={pageSize}
        onPageChange={setPage}
        pageSizeOptions={[12, 24, 48]}
        onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
        accentColor="bg-[#3b5ce0]"
        accentHover="hover:bg-[#2e48b8]"
        itemLabel="articles"
      />

      {/* Expanded Card Modal */}
      {selectedItem && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in-simple"
            onClick={closeItem}
          />

          <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-[#1a1d4a]/95 backdrop-blur-xl border border-white/20 border-t-white/30 rounded-xl shadow-2xl overflow-hidden z-50 animate-slideUp">
            <button
              className="absolute top-4 right-4 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center z-10 shadow-md transition-transform duration-200 hover:scale-110 active:scale-90"
              onClick={closeItem}
            >
              <X className="w-4 h-4 text-white/80" />
            </button>

            {/* Navigation Arrows */}
            {selectedIndex > 0 && (
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center z-10 shadow-md transition-all duration-200 hover:scale-110 active:scale-90"
                onClick={(e) => { e.stopPropagation(); navigateItem('prev'); }}
              >
                <span className="text-white/80 text-lg">←</span>
              </button>
            )}
            {selectedIndex < newsItems.length - 1 && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center z-10 shadow-md transition-all duration-200 hover:scale-110 active:scale-90"
                onClick={(e) => { e.stopPropagation(); navigateItem('next'); }}
              >
                <span className="text-white/80 text-lg">→</span>
              </button>
            )}

            {/* Article counter */}
            <div className="absolute top-4 left-4 z-10 px-2 py-1 bg-white/90 rounded text-xs text-white/60 shadow-sm">
              {selectedIndex + 1} / {newsItems.length}
            </div>

            <div className="h-full overflow-y-auto">
              {/* Header Image */}
              <div className="relative h-48 md:h-72">
                {selectedItem.imageUrl ? (
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src="/schillerpro-schilder.jpeg"
                    alt="Schillerkiez"
                    className="w-full h-full object-cover opacity-60"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

                <div className="absolute bottom-4 left-4 text-white">
                  <div className="text-sm mb-1 opacity-90">{selectedItem.sourceName}</div>
                  <div className="text-sm opacity-75">{formatTimeAgo(selectedItem.publishedAt)}</div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 md:p-8">
                {/* Warning banner in modal */}
                {selectedItem.hasWarningLabel && (
                  <div className={cn(
                    "rounded-lg p-3 mb-4 flex items-center gap-2",
                    isAuthor(selectedItem)
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-amber-50 border border-amber-300"
                  )}>
                    <span className="text-lg">{isAuthor(selectedItem) ? 'ℹ️' : '⚠️'}</span>
                    <p className={cn("text-sm", isAuthor(selectedItem) ? "text-blue-800" : "text-amber-800")}>
                      {isAuthor(selectedItem)
                        ? 'Other users see this content behind a warning overlay.'
                        : GENERIC_WARNING}
                    </p>
                  </div>
                )}

                <h1 className="text-2xl md:text-3xl font-bold mb-4 text-[#3b5ce0] font-['Space_Grotesk',sans-serif]">
                  {selectedItem.title}
                </h1>

                <p className="text-white/70 text-lg mb-6 leading-relaxed">
                  {selectedItem.description}
                </p>

                {/* Submitter comment */}
                {selectedItem.submitterComment && (
                  <div className="bg-white/[0.04] border border-white/10 rounded-lg p-4 mb-6">
                    <p className="text-sm text-white/60 font-medium mb-1">Community note:</p>
                    <p className="text-white/80 italic">"{selectedItem.submitterComment}"</p>
                  </div>
                )}

                {/* Read full article link */}
                <a
                  href={selectedItem.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#3b5ce0] text-white rounded-lg hover:bg-[#2e48b8] transition-colors font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                  Read full article at {selectedItem.sourceName}
                </a>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Submit News Modal */}
      {showSubmitForm && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in-simple"
            onClick={() => setShowSubmitForm(false)}
          />

          <div className="fixed inset-4 md:inset-x-auto md:inset-y-8 md:max-w-lg md:mx-auto bg-[#1a1d4a]/95 backdrop-blur-xl border border-white/20 border-t-white/30 rounded-xl shadow-2xl overflow-hidden z-50 animate-slideUp">
            <div className="bg-[#3b5ce0] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Submit News</h2>
              <button
                onClick={() => setShowSubmitForm(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
              {/* URL Input — primary field */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Article URL *</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-white/[0.08] backdrop-blur-xl border border-white/15 text-[#e8e6e1] placeholder-white/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5ce0]/50 focus:border-[#3b5ce0]/50"
                    placeholder="Paste article link here..."
                  />
                  <button
                    type="button"
                    onClick={() => fetchPreview(formData.sourceUrl)}
                    disabled={previewLoading || !formData.sourceUrl}
                    className="px-4 py-2 bg-[#3b5ce0]/20 text-[#3b5ce0] border border-[#3b5ce0]/40 hover:bg-[#3b5ce0]/30 backdrop-blur-xl rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2 shrink-0"
                  >
                    {previewLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      'Fetch Info'
                    )}
                  </button>
                </div>
                {previewError && (
                  <p className="text-amber-600 text-xs mt-1">{previewError} — you can fill in the fields manually.</p>
                )}
              </div>

              {/* Loading indicator for preview */}
              {previewLoading && (
                <div className="flex items-center gap-3 p-3 bg-[#3b5ce0]/10 rounded-lg">
                  <Loader2 className="w-5 h-5 text-[#3b5ce0] animate-spin" />
                  <span className="text-sm text-[#3b5ce0] font-medium">Fetching article info...</span>
                </div>
              )}

              {/* Image preview */}
              {formData.imageUrl && !previewLoading && (
                <div className="relative h-32 rounded-lg overflow-hidden bg-white/10">
                  <img
                    src={formData.imageUrl}
                    alt="Article preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Article Title *</label>
                <input
                  required
                  minLength={5}
                  maxLength={200}
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/[0.08] backdrop-blur-xl border border-white/15 text-[#e8e6e1] placeholder-white/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5ce0]/50 focus:border-[#3b5ce0]/50"
                  placeholder="Title of the news article"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Source Name *</label>
                <input
                  required
                  maxLength={100}
                  value={formData.sourceName}
                  onChange={(e) => setFormData(prev => ({ ...prev, sourceName: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/[0.08] backdrop-blur-xl border border-white/15 text-[#e8e6e1] placeholder-white/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5ce0]/50 focus:border-[#3b5ce0]/50"
                  placeholder="e.g. Tagesspiegel, Berliner Zeitung"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Description *</label>
                <textarea
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/[0.08] backdrop-blur-xl border border-white/15 text-[#e8e6e1] placeholder-white/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5ce0]/50 focus:border-[#3b5ce0]/50 resize-none"
                  placeholder="Brief summary of the article"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Image URL (optional)</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/[0.08] backdrop-blur-xl border border-white/15 text-[#e8e6e1] placeholder-white/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5ce0]/50 focus:border-[#3b5ce0]/50"
                  placeholder="https://... (auto-filled from article)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Your Comment (optional)</label>
                <textarea
                  maxLength={500}
                  rows={2}
                  value={formData.submitterComment}
                  onChange={(e) => setFormData(prev => ({ ...prev, submitterComment: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/[0.08] backdrop-blur-xl border border-white/15 text-[#e8e6e1] placeholder-white/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b5ce0]/50 focus:border-[#3b5ce0]/50 resize-none"
                  placeholder="Why is this relevant to the community?"
                />
              </div>

              {submitMutation.error && (
                <p className="text-red-600 text-sm">{submitMutation.error.message}</p>
              )}

              <button
                type="submit"
                disabled={submitMutation.isPending || previewLoading}
                className="w-full py-3 bg-[#3b5ce0] text-white rounded-lg hover:bg-[#2e48b8] transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit for Review'
                )}
              </button>

              <p className="text-xs text-white/50 text-center">
                Your submission will be reviewed by an admin before appearing on the newsboard.
              </p>
            </form>
          </div>
        </>
      )}

      {/* Submit Success Toast */}
      {showSubmitToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-xl">✓</span>
            <span className="font-medium">News submitted for review!</span>
            <button onClick={() => setShowSubmitToast(false)} className="ml-2 text-white/80 hover:text-white">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

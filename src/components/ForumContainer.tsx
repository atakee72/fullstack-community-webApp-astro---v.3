import React, { useState, useEffect } from 'react';
import { useTopicsQuery, useCreatePost, useDeletePost, useEditPost } from '../hooks/api/useTopicsQuery';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateComment } from '../hooks/api/useCommentsQuery';
import { useLikeMutation } from '../hooks/api/useLikeMutation';
import PostModal from './PostModal';
import CommentModal from './CommentModal';
import CommentsList from './CommentsList';
import ReadMoreModal from './ReadMoreModal';
import HeartBtn from './HeartBtn';
import EyeIcon from './EyeIcon';
import { cn } from '../lib/utils';
import { isOwner } from '../utils/authHelpers';
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
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showReadMoreModal, setShowReadMoreModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [activeCardTabs, setActiveCardTabs] = useState<{ [key: string]: 'posts' | 'comments' | 'newComment' }>({});
  const [editingPost, setEditingPost] = useState<any>(null);

  // Use React Query for data fetching with field selection
  const { data: items = [], isLoading, error, refetch } = useTopicsQuery(collectionType, {
    fields: ['_id', 'title', 'body', 'description', 'author', 'tags', 'comments', 'date', 'likes', 'likedBy', 'views'],
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Mutations
  const createPost = useCreatePost(collectionType);
  const createComment = useCreateComment();
  const deletePost = useDeletePost(collectionType);
  const editPost = useEditPost(collectionType);
  const likeMutation = useLikeMutation(collectionType);

  const queryClient = useQueryClient();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prefetch other collections on mount for instant tab switching
  useEffect(() => {
    const queryOptions = {
      fields: ['_id', 'title', 'body', 'description', 'author', 'tags', 'comments', 'date', 'likes', 'likedBy', 'views'],
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

  const handlePostSubmit = async (data: { title: string; body: string; tags: string[] }) => {
    try {
      if (editingPost) {
        // Edit mode - update existing post
        await editPost.mutateAsync({
          postId: editingPost._id,
          data: { title: data.title, body: data.body, tags: data.tags }
        });
        setEditingPost(null);
      } else {
        // Create mode - new post
        const postData = collectionType === 'announcements'
          ? { title: data.title, body: data.body, tags: data.tags }
          : { title: data.title, body: data.body, tags: data.tags };

        await createPost.mutateAsync(postData);
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

  const handleCommentClick = (item: any) => {
    setSelectedPost(item);
    setShowCommentModal(true);
  };

  const getCardActiveTab = (itemId: string) => {
    return activeCardTabs[itemId] || 'posts';
  };

  const setCardActiveTab = (itemId: string, tab: 'posts' | 'comments' | 'newComment') => {
    setActiveCardTabs(prev => ({
      ...prev,
      [itemId]: tab
    }));
  };

  const handleCommentSubmit = async (comment: string) => {
    if (!selectedPost) return;

    try {
      // Use React Query mutation
      await createComment.mutateAsync({
        body: comment,
        topicId: selectedPost._id,
        collectionType
      });

      // Switch to comments tab BEFORE closing modal
      setCardActiveTab(selectedPost._id, 'comments');

      // Close modal after setting the tab
      setShowCommentModal(false);

      // Data will auto-refresh due to cache invalidation
    } catch (error) {
      console.error('Failed to add comment:', error);
      // You might want to show an error toast here
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

  // Handle comment tab click for view tracking
  const handleCommentTabClick = (itemId: string, item: any) => {
    setCardActiveTab(itemId, 'comments');
    // Increment views when comments tab is clicked (only if not the author)
    if (!isOwner(item.author, user)) {
      incrementViews(itemId);
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
    <div className="w-full max-w-4xl mx-auto">
      {/* Header Section with Collection Selector */}
      <div className="w-full mb-4 md:mb-6">
        {/* Collection Type Buttons - Lifted Tab Style */}
        <div className="flex items-end gap-1 mt-2 md:mt-4 mb-6 md:mb-8 ml-4 md:ml-6">
          <button
            onClick={() => setCollectionType('topics')}
            className={cn(
              'px-4 md:px-6 py-2 md:py-3 text-sm md:text-lg font-semibold transition-all duration-300 ease-out rounded-t-lg',
              collectionType === 'topics'
                ? 'h-12 md:h-14 bg-[#814256] text-white border-b border-[#814256] shadow-md'
                : 'h-10 md:h-11 bg-[#4b9aaa] text-white hover:bg-[#3a8a9a] opacity-80 blur-[0.1px] border-b border-[#eccc6e]'
            )}
          >
            Discussions
          </button>
          <button
            onClick={() => setCollectionType('announcements')}
            className={cn(
              'px-4 md:px-6 py-2 md:py-3 text-sm md:text-lg font-semibold transition-all duration-300 ease-out rounded-t-lg',
              collectionType === 'announcements'
                ? 'h-12 md:h-14 bg-[#814256] text-white border-b border-[#814256] shadow-md'
                : 'h-10 md:h-11 bg-[#4b9aaa] text-white hover:bg-[#3a8a9a] opacity-80 blur-[0.1px] border-b border-[#eccc6e]'
            )}
          >
            Announcements
          </button>
          <button
            onClick={() => setCollectionType('recommendations')}
            className={cn(
              'px-4 md:px-6 py-2 md:py-3 text-sm md:text-lg font-semibold transition-all duration-300 ease-out rounded-t-lg',
              collectionType === 'recommendations'
                ? 'h-12 md:h-14 bg-[#814256] text-white border-b border-[#814256] shadow-md'
                : 'h-10 md:h-11 bg-[#4b9aaa] text-white hover:bg-[#3a8a9a] opacity-80 blur-[0.1px] border-b border-[#eccc6e]'
            )}
          >
            Recommendations
          </button>
        </div>

        {/* Search and Add New in a teal/green box */}
        <div className="bg-[#4b9aaa]/10 rounded-lg shadow-md p-4 md:p-6">
          <div className="mb-2">
            <input
              type="text"
              placeholder={`Search in ${collectionType === 'topics' ? 'discussions' : collectionType}...`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full p-2 md:p-3 border-2 border-gray-200 rounded-md text-sm md:text-base focus:outline-none focus:border-[#4b9aaa] transition-colors"
            />
          </div>

          {user && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddModal(true)}
                className="group relative text-[#eccc6e] hover:text-[#d4b85e] hover:scale-110 transition-all duration-200 font-bold text-6xl md:text-7xl leading-none"
              >
                +
                <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#eccc6e] text-[#814256] text-sm font-medium px-3 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Add a new {collectionType.slice(0, -1)}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Posts Grid */}
        <div className="mt-3 md:mt-4">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
              <p className="text-gray-600 text-base md:text-lg">No {collectionType} found. Be the first to create one!</p>
            </div>
          ) : (
            <div className="space-y-4 transition-all duration-400 ease-out">
              {filteredItems.map((item) => {
                const currentTab = getCardActiveTab(item._id);
                return (
                  <div
                    key={item._id}
                    className="bg-[#c9c4b9] rounded-lg shadow-md overflow-hidden p-4 md:p-6 flex flex-col min-h-[300px] md:min-h-[400px] hover:shadow-lg transition-all duration-400 ease-out">
                    {/* Card Header with Tabs and Action Icons - Shared Gray Background Strip */}
                    <div className="bg-gray-200/60 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-2 md:px-6 py-2 mb-4 overflow-hidden">
                      <div className="flex items-center gap-1">
                        {/* Tabs Group */}
                        <div className="flex flex-1 gap-1 min-w-0">
                          <button
                            onClick={() => setCardActiveTab(item._id, 'posts')}
                            className={cn(
                              'px-2 md:px-3 py-1.5 md:py-2.5 text-xs md:text-sm transition-colors rounded-md border min-w-0',
                              currentTab === 'posts'
                                ? 'bg-white text-gray-900 border-gray-300 shadow-sm flex-1 md:flex-initial'
                                : 'bg-transparent text-gray-700 border-white hover:bg-white/50 flex-shrink-0 max-w-[40%]'
                            )}
                          >
                            <div className={cn(
                              "min-w-0",
                              currentTab === 'posts'
                                ? "overflow-x-auto scrollbar-hide"
                                : "truncate"
                            )}>
                              <span className={cn(
                                currentTab === 'posts'
                                  ? "inline-block whitespace-nowrap px-1"
                                  : "block"
                              )}>{item.title}</span>
                            </div>
                          </button>

                          <button
                            onClick={() => handleCommentTabClick(item._id, item)}
                            className={cn(
                              'px-2 md:px-3 py-1.5 md:py-2.5 text-xs md:text-sm transition-colors rounded-md border whitespace-nowrap flex-shrink-0',
                              currentTab === 'comments'
                                ? 'bg-white text-gray-900 border-gray-300 shadow-sm'
                                : 'bg-transparent text-gray-700 border-white hover:bg-white/50',
                              currentTab === 'posts' && 'ml-auto md:ml-0'
                            )}
                          >
                            Comments <span className="ml-0.5 px-1 md:px-2 py-0.5 bg-gray-500 text-white text-[10px] md:text-xs rounded-full">{item.comments?.length || 0}</span>
                          </button>
                          <button
                            onClick={() => {
                              if (user) {
                                setSelectedPost(item);
                                setShowCommentModal(true);
                                setCardActiveTab(item._id, 'newComment');
                              }
                            }}
                            disabled={!user}
                            className={cn(
                              'px-2 md:px-3 py-1.5 md:py-2.5 text-xs md:text-sm transition-colors rounded-md border whitespace-nowrap flex-shrink-0 hidden md:block',
                              currentTab === 'newComment'
                                ? 'bg-white text-gray-900 border-gray-300 shadow-sm'
                                : user
                                  ? 'bg-transparent text-gray-700 border-white hover:bg-white/50'
                                  : 'bg-transparent text-gray-400 border-white cursor-not-allowed'
                            )}
                          >
                            Write a comment
                          </button>
                        </div>

                        {/* Edit and Delete Icons - Always visible if user is author */}
                        {isOwner(item.author, user) && (
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setEditingPost(item);
                                  setShowAddModal(true);
                                }}
                                className="p-0.5 md:p-1 rounded-md transition-colors text-lg md:text-2xl text-gray-500 hover:text-gray-700"
                                title="Edit post"
                              >
                                ✎
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete this ${collectionType.slice(0, -1)}?`)) {
                                    deletePost.mutate(item._id);
                                  }
                                }}
                                className="p-0.5 md:p-1 rounded-md transition-colors text-lg md:text-2xl text-gray-500 hover:text-red-600"
                                title="Delete post"
                                disabled={deletePost.isPending}
                              >
                                {deletePost.isPending && deletePost.variables === item._id ? '⏳' : '✕'}
                              </button>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-0 flex flex-col flex-1">
                      {currentTab === 'posts' ? (
                        <div className="flex flex-col flex-1">
                          {/* Author Info Header */}
                          <div className="bg-[#4b9aaa] text-white px-2 md:px-3 py-1 md:py-2 rounded-md mt-0 mb-3 md:mb-4 flex items-center gap-2 md:gap-3 text-xs md:text-sm">
                            <div className="w-7 h-7 md:w-8 md:h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
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
                            <div className="flex gap-2 md:gap-3 items-center text-xs md:text-sm">
                              <EyeIcon viewCount={item.views || 0} createdAt={new Date(item.date || item.createdAt)} />
                              <HeartBtn
                                isLiked={user ? item.likedBy?.includes(user.id) || false : false}
                                likeCount={item.likes || 0}
                                onToggle={() => handleLikeToggle(item._id, item.likedBy?.includes(user?.id))}
                                disabled={!user}
                              />
                            </div>
                          </div>

                          {/* Post Content - Truncated with Read More */}
                          <div className="px-2 md:px-4 mb-3 md:mb-4">
                            <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                              {truncateText(item.description || item.body)}
                            </p>
                            {(item.description || item.body)?.length > 150 && (
                              <button
                                onClick={() => handleReadMore(item)}
                                className="mt-2 text-[#4b9aaa] hover:text-[#3a7a8a] font-medium text-sm md:text-base underline"
                              >
                                Read more
                              </button>
                            )}
                          </div>

                          {/* Spacer */}
                          <div className="flex-1"></div>

                          {/* Tags */}
                          {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 md:gap-2 pt-3 md:pt-4 border-t border-gray-300 px-2 md:px-4">
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
                      ) : currentTab === 'comments' ? (
                        <CommentsList
                          postId={item._id}
                          collectionType={collectionType}
                          postTitle={item.title}
                          onAddComment={() => {
                            setSelectedPost(item);
                            setShowCommentModal(true);
                          }}
                          user={user}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
          tags: editingPost.tags
        } : undefined}
      />

      {/* Comment Modal */}
      <CommentModal
        show={showCommentModal}
        handleClose={() => {
          setShowCommentModal(false);
          // Don't reset tab when closing - keep whatever tab is currently active
          // This preserves the comments tab after successful submission
        }}
        postTitle={selectedPost?.title || ''}
        postId={selectedPost?._id || ''}
        onSubmit={handleCommentSubmit}
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
      />
    </div>
  );
}
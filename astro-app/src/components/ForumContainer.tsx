import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useForumStore } from '../stores/forumStore';
import { useTopicsQuery, useCreatePost } from '../hooks/api/useTopicsQuery';
import { useCreateComment } from '../hooks/api/useCommentsQuery';
import PostModal from './PostModal';
import CommentModal from './CommentModal';
import CommentsList from './CommentsList';
import { cn } from '../lib/utils';
import type { Topic, Announcement, Recommendation } from '../types';

export default function ForumContainer() {
  const [isClient, setIsClient] = useState(false);
  const user = useAuthStore((state) => state.user);
  const [collectionType, setCollectionType] = useState<'topics' | 'announcements' | 'recommendations'>('topics');
  const [searchValue, setSearchValue] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [activeCardTabs, setActiveCardTabs] = useState<{ [key: string]: 'posts' | 'comments' | 'newComment' }>({});

  // Use React Query for data fetching with field selection
  const { data: items = [], isLoading, error, refetch } = useTopicsQuery(collectionType, {
    fields: ['_id', 'title', 'body', 'description', 'author', 'tags', 'comments', 'date', 'likes', 'likedBy', 'views'],
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Mutations
  const createPost = useCreatePost(collectionType);
  const createComment = useCreateComment();

  useEffect(() => {
    setIsClient(true);
    // Rehydrate stores on client side
    if (typeof window !== 'undefined') {
      useAuthStore.persist.rehydrate();
    }
  }, []);

  const filteredItems = (items as any[]).filter(item =>
    (item.title?.toLowerCase() || '').includes(searchValue.toLowerCase()) ||
    ((item.description || item.body || '')?.toLowerCase() || '').includes(searchValue.toLowerCase())
  );

  const handlePostSubmit = async (data: { title: string; body: string; tags: string[] }) => {
    try {
      // Use React Query mutation
      await createPost.mutateAsync(data);
      setShowAddModal(false);
      // Data will auto-refresh due to cache invalidation
    } catch (error) {
      console.error('Failed to create post:', error);
      // You might want to show an error toast here
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

      setShowCommentModal(false);

      // Switch to comments tab after posting
      if (selectedPost) {
        setCardActiveTab(selectedPost._id, 'comments');
      }

      // Data will auto-refresh due to cache invalidation
    } catch (error) {
      console.error('Failed to add comment:', error);
      // You might want to show an error toast here
    }
  };

  // Show loading state during SSR or data fetching
  if (!isClient || isLoading) {
    return (
      <div className="w-full">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#4b9aaa]"></div>
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
        {/* Collection Type Buttons */}
        <div className="bg-[#5ca9b8] rounded-lg p-1 flex flex-wrap gap-1 mb-6 md:mb-8 border-b-2 border-[#3a8899]">
          <button
            onClick={() => setCollectionType('topics')}
            className={cn(
              'px-3 md:px-5 py-1.5 md:py-2 text-sm md:text-base rounded-md font-medium transition-all',
              collectionType === 'topics'
                ? 'bg-white text-gray-900'
                : 'bg-transparent text-white hover:bg-white/10'
            )}
          >
            Discussions
          </button>
          <button
            onClick={() => setCollectionType('announcements')}
            className={cn(
              'px-3 md:px-5 py-1.5 md:py-2 text-sm md:text-base rounded-md font-medium transition-all',
              collectionType === 'announcements'
                ? 'bg-white text-gray-900'
                : 'bg-transparent text-white hover:bg-white/10'
            )}
          >
            Announcements
          </button>
          <button
            onClick={() => setCollectionType('recommendations')}
            className={cn(
              'px-3 md:px-5 py-1.5 md:py-2 text-sm md:text-base rounded-md font-medium transition-all',
              collectionType === 'recommendations'
                ? 'bg-white text-gray-900'
                : 'bg-transparent text-white hover:bg-white/10'
            )}
          >
            Recommendations
          </button>
        </div>

        {/* Section Title */}
        <div className="text-center mb-4 md:mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[#eccc6e]">
            {collectionType === 'topics' ? 'Discussions' : collectionType === 'announcements' ? 'Announcements' : 'Recommendations'}
          </h2>
        </div>

        {/* Search and Add New in a white box */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search in forum..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full p-2 md:p-3 border-2 border-gray-200 rounded-md text-sm md:text-base focus:outline-none focus:border-[#4b9aaa] transition-colors"
            />
          </div>

          {user && (
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 text-sm md:text-base bg-[#814256] text-white rounded-md hover:bg-[#6a3646] transition-all shadow-md font-medium"
            >
              ✏️ Add New {collectionType.charAt(0).toUpperCase() + collectionType.slice(1, -1)}
            </button>
          )}
        </div>

        {/* Posts Grid */}
        <div>
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
              <p className="text-gray-600 text-base md:text-lg">No {collectionType} found. Be the first to create one!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredItems.map((item) => {
                const currentTab = getCardActiveTab(item._id);
                return (
                  <div key={item._id} className="bg-[#c9c4b9] rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow p-4 md:p-6 min-h-[300px] md:min-h-[400px] flex flex-col">
                    {/* Card Header with Tabs */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      <button
                        onClick={() => setCardActiveTab(item._id, 'posts')}
                        className={cn(
                          'px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm transition-colors rounded-md border max-w-xs overflow-x-auto whitespace-nowrap scrollbar-hide',
                          currentTab === 'posts'
                            ? 'bg-gray-200 text-gray-900 border-gray-400'
                            : 'bg-transparent text-gray-700 border-white hover:bg-gray-100'
                        )}
                      >
                        {item.title}
                      </button>
                      <button
                        onClick={() => setCardActiveTab(item._id, 'comments')}
                        className={cn(
                          'px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm transition-colors rounded-md border',
                          currentTab === 'comments'
                            ? 'bg-gray-200 text-gray-900 border-gray-400'
                            : 'bg-transparent text-gray-700 border-white hover:bg-gray-100'
                        )}
                      >
                        Comments <span className="ml-1 px-1.5 md:px-2 py-0.5 bg-gray-500 text-white text-xs rounded-full">{item.comments?.length || 0}</span>
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
                          'px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm transition-colors rounded-md border',
                          currentTab === 'newComment'
                            ? 'bg-gray-200 text-gray-900 border-gray-400'
                            : user
                            ? 'bg-transparent text-gray-700 border-white hover:bg-gray-100'
                            : 'bg-transparent text-gray-400 border-white cursor-not-allowed'
                        )}
                      >
                        Write a comment
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="p-0 flex flex-col flex-1">
                      {currentTab === 'posts' ? (
                      <div className="flex flex-col flex-1">
                        {/* Author Info Header */}
                        <div className="bg-[#4b9aaa] text-white px-2 md:px-3 py-1 md:py-2 rounded-md mt-0 mb-3 md:mb-4 flex items-center gap-2 md:gap-3 text-xs md:text-sm">
                          <div className="w-7 h-7 md:w-8 md:h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-[#4b9aaa] font-bold text-xs md:text-sm">
                              {item.author?.userName?.charAt(0)?.toUpperCase() || 'A'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2">
                              <span className="font-medium truncate">{item.author?.userName || 'Anonymous'}</span>
                              <span className="text-gray-200 text-xs">• {new Date(item.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 md:gap-3 text-xs md:text-sm">
                            <button className="hover:scale-110 transition-transform whitespace-nowrap">👍 {item.likes?.length || 0}</button>
                            <button className="hover:scale-110 transition-transform whitespace-nowrap">👀 {item.views || 0}</button>
                          </div>
                        </div>

                        {/* Post Content */}
                        <p className="text-gray-700 mb-3 md:mb-4 leading-relaxed px-2 md:px-4 text-sm md:text-base">{item.description || item.body}</p>

                        {/* Action Buttons */}
                        {user && user._id === item.author?._id && (
                          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-3 md:pt-4 mb-3 md:mb-4 border-t border-gray-300 px-2 md:px-4">
                            <button className="px-3 md:px-4 py-1.5 md:py-2 bg-[#aca89f] text-white rounded-md hover:bg-[#8a8880] transition-colors text-xs md:text-sm font-medium">
                              ✏️ Edit
                            </button>
                            <button className="px-3 md:px-4 py-1.5 md:py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs md:text-sm font-medium">
                              🗑️ Delete
                            </button>
                          </div>
                        )}

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
        handleClose={() => setShowAddModal(false)}
        collectionType={collectionType}
        onSubmit={handlePostSubmit}
      />

      {/* Comment Modal */}
      <CommentModal
        show={showCommentModal}
        handleClose={() => {
          setShowCommentModal(false);
          // Reset tab to posts when closing without submitting
          if (selectedPost) {
            setCardActiveTab(selectedPost._id, 'posts');
          }
        }}
        postTitle={selectedPost?.title || ''}
        postId={selectedPost?._id || ''}
        onSubmit={handleCommentSubmit}
      />
    </div>
  );
}
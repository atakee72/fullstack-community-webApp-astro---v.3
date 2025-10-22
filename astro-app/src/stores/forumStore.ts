import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Topic, Comment, Announcement, Recommendation } from '../types';

interface ForumState {
  topics: Topic[];
  announcements: Announcement[];
  recommendations: Recommendation[];
  currentTopic: Topic | null;
  comments: Comment[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchTopics: (type: 'topics' | 'announcements' | 'recommendations') => Promise<void>;
  fetchSingleTopic: (id: string) => Promise<void>;
  fetchComments: (topicId: string) => Promise<void>;
  addTopic: (topic: Partial<Topic>) => Promise<void>;
  updateTopic: (id: string, updates: Partial<Topic>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  addComment: (comment: Partial<Comment>) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
  updateLikes: (topicId: string, userId: string) => Promise<void>;
  clearError: () => void;
}

// Use Astro's built-in API routes
const API_URL = '/api';

export const useForumStore = create<ForumState>()(
  devtools(
    persist(
      (set, get) => ({
        topics: [],
        announcements: [],
        recommendations: [],
        currentTopic: null,
        comments: [],
        loading: false,
        error: null,

        fetchTopics: async (type) => {
          set({ loading: true, error: null });
          try {
            const endpoint = type === 'topics'
              ? '/topics/all'
              : type === 'announcements'
              ? '/announcements/all'
              : '/recommendations/all';

            const response = await fetch(`${API_URL}${endpoint}`);
            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();

            if (type === 'topics') {
              set({ topics: data.requestedTopics || [], loading: false });
            } else if (type === 'announcements') {
              set({ announcements: data.requestedAnnouncements || [], loading: false });
            } else {
              set({ recommendations: data.requestedRecommendations || [], loading: false });
            }
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch', loading: false });
          }
        },

        fetchSingleTopic: async (id) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`${API_URL}/topics/${id}`);
            if (!response.ok) throw new Error('Failed to fetch topic');

            const data = await response.json();
            set({ currentTopic: data.topic, loading: false });
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch topic', loading: false });
          }
        },

        fetchComments: async (topicId) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`${API_URL}/comments/${topicId}`);
            if (!response.ok) throw new Error('Failed to fetch comments');

            const data = await response.json();
            set({ comments: data.comments || [], loading: false });
            return data.comments || [];
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch comments', loading: false });
            return [];
          }
        },

        addTopic: async (topicData) => {
          set({ loading: true, error: null });
          try {
            const token = localStorage.getItem('token');

            // Determine the endpoint based on the data type
            let endpoint = '/topics/create';
            let dataKey = 'topic';

            // You might pass a type field to distinguish
            const { type, ...postData } = topicData as any;

            if (type === 'announcement') {
              endpoint = '/announcements/create';
              dataKey = 'announcement';
            } else if (type === 'recommendation') {
              endpoint = '/recommendations/create';
              dataKey = 'recommendation';
            }

            const response = await fetch(`${API_URL}${endpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(postData)
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to create post');
            }

            const result = await response.json();
            const newItem = result[dataKey];

            // Update the appropriate collection
            set((state) => {
              if (type === 'announcement') {
                return {
                  announcements: [...state.announcements, newItem],
                  loading: false
                };
              } else if (type === 'recommendation') {
                return {
                  recommendations: [...state.recommendations, newItem],
                  loading: false
                };
              } else {
                return {
                  topics: [...state.topics, newItem],
                  loading: false
                };
              }
            });

            return newItem;
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to create post', loading: false });
            throw error;
          }
        },

        updateTopic: async (id, updates) => {
          set({ loading: true, error: null });
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/topics/updateTopic/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Failed to update topic');

            const updatedTopic = await response.json();
            set((state) => ({
              topics: state.topics.map(t => t._id === id ? updatedTopic.topic : t),
              currentTopic: state.currentTopic?._id === id ? updatedTopic.topic : state.currentTopic,
              loading: false
            }));
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update topic', loading: false });
          }
        },

        deleteTopic: async (id) => {
          set({ loading: true, error: null });
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/topics/deleteTopic/${id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (!response.ok) throw new Error('Failed to delete topic');

            set((state) => ({
              topics: state.topics.filter(t => t._id !== id),
              currentTopic: state.currentTopic?._id === id ? null : state.currentTopic,
              loading: false
            }));
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to delete topic', loading: false });
          }
        },

        addComment: async (commentData) => {
          set({ loading: true, error: null });
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/comments/create`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                body: commentData.body || commentData.comment,
                topicId: commentData.topicId || commentData.topic,
                collectionType: commentData.collectionType || 'topics'
              })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to add comment');
            }

            const result = await response.json();
            const newComment = result.comment;

            set((state) => ({
              comments: [...state.comments, newComment],
              loading: false
            }));

            // Update the parent post's comment count
            if (commentData.collectionType === 'announcements') {
              const announcements = get().announcements;
              const updated = announcements.map(a =>
                a._id === commentData.topicId
                  ? { ...a, comments: [...(a.comments || []), newComment._id] }
                  : a
              );
              set({ announcements: updated });
            } else if (commentData.collectionType === 'recommendations') {
              const recommendations = get().recommendations;
              const updated = recommendations.map(r =>
                r._id === commentData.topicId
                  ? { ...r, comments: [...(r.comments || []), newComment._id] }
                  : r
              );
              set({ recommendations: updated });
            } else {
              const topics = get().topics;
              const updated = topics.map(t =>
                t._id === commentData.topicId
                  ? { ...t, comments: [...(t.comments || []), newComment._id] }
                  : t
              );
              set({ topics: updated });
            }

            return newComment;
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to add comment', loading: false });
            throw error;
          }
        },

        deleteComment: async (id) => {
          set({ loading: true, error: null });
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/comments/delete/${id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to delete comment');
            }

            set((state) => ({
              comments: state.comments.filter(c => c._id !== id),
              loading: false
            }));

            // Also remove from parent posts
            const { topics, announcements, recommendations } = get();

            set({
              topics: topics.map(t => ({
                ...t,
                comments: (t.comments || []).filter(c => c !== id)
              })),
              announcements: announcements.map(a => ({
                ...a,
                comments: (a.comments || []).filter(c => c !== id)
              })),
              recommendations: recommendations.map(r => ({
                ...r,
                comments: (r.comments || []).filter(c => c !== id)
              }))
            });
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to delete comment', loading: false });
            throw error;
          }
        },

        updateLikes: async (topicId, userId) => {
          set({ loading: true, error: null });
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/topics/${topicId}/like`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ userId })
            });

            if (!response.ok) throw new Error('Failed to update likes');

            const updatedTopic = await response.json();
            set((state) => ({
              topics: state.topics.map(t => t._id === topicId ? updatedTopic.topic : t),
              currentTopic: state.currentTopic?._id === topicId ? updatedTopic.topic : state.currentTopic,
              loading: false
            }));
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update likes', loading: false });
          }
        },

        clearError: () => set({ error: null })
      }),
      {
        name: 'forum-storage',
        skipHydration: true,
        partialize: (state) => ({
          currentTopic: state.currentTopic
        })
      }
    )
  )
);
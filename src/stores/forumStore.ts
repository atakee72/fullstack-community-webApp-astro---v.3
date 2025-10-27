import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// This store now only handles UI state, not server data
// Server data is managed by React Query (see hooks/api/useTopicsQuery.ts)
// Following the principle: React Query for server state, Zustand for client state

interface ForumUIState {
  // UI State for modals
  isAddModalOpen: boolean;
  isCommentModalOpen: boolean;
  isEditModalOpen: boolean;
  selectedPostIdForModal: string | null;

  // UI State for tabs (per card)
  activeCardTabs: { [cardId: string]: 'posts' | 'comments' | 'newComment' };

  // UI State for filters/search
  searchFilter: string;
  selectedTags: string[];
  sortBy: 'date' | 'likes' | 'views' | 'comments';
  sortOrder: 'asc' | 'desc';

  // UI State for view preferences
  viewMode: 'grid' | 'list';
  showFilters: boolean;

  // Actions
  setAddModalOpen: (open: boolean) => void;
  setCommentModalOpen: (open: boolean) => void;
  setEditModalOpen: (open: boolean) => void;
  setSelectedPostIdForModal: (id: string | null) => void;

  setCardActiveTab: (cardId: string, tab: 'posts' | 'comments' | 'newComment') => void;
  getCardActiveTab: (cardId: string) => 'posts' | 'comments' | 'newComment';

  setSearchFilter: (search: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSortBy: (sort: 'date' | 'likes' | 'views' | 'comments') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  setViewMode: (mode: 'grid' | 'list') => void;
  toggleFilters: () => void;

  resetFilters: () => void;
  clearUIState: () => void;
}

export const useForumStore = create<ForumUIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial UI state
        isAddModalOpen: false,
        isCommentModalOpen: false,
        isEditModalOpen: false,
        selectedPostIdForModal: null,

        activeCardTabs: {},

        searchFilter: '',
        selectedTags: [],
        sortBy: 'date',
        sortOrder: 'desc',

        viewMode: 'list',
        showFilters: false,

        // Modal actions
        setAddModalOpen: (open) => set({ isAddModalOpen: open }),
        setCommentModalOpen: (open) => set({ isCommentModalOpen: open }),
        setEditModalOpen: (open) => set({ isEditModalOpen: open }),
        setSelectedPostIdForModal: (id) => set({ selectedPostIdForModal: id }),

        // Card tab actions
        setCardActiveTab: (cardId, tab) =>
          set((state) => ({
            activeCardTabs: {
              ...state.activeCardTabs,
              [cardId]: tab,
            },
          })),

        getCardActiveTab: (cardId) => {
          const state = get();
          return state.activeCardTabs[cardId] || 'posts';
        },

        // Filter actions
        setSearchFilter: (search) => set({ searchFilter: search }),
        setSelectedTags: (tags) => set({ selectedTags: tags }),
        setSortBy: (sort) => set({ sortBy: sort }),
        setSortOrder: (order) => set({ sortOrder: order }),

        // View actions
        setViewMode: (mode) => set({ viewMode: mode }),
        toggleFilters: () => set((state) => ({ showFilters: !state.showFilters })),

        // Utility actions
        resetFilters: () =>
          set({
            searchFilter: '',
            selectedTags: [],
            sortBy: 'date',
            sortOrder: 'desc',
          }),

        clearUIState: () =>
          set({
            isAddModalOpen: false,
            isCommentModalOpen: false,
            isEditModalOpen: false,
            selectedPostIdForModal: null,
            activeCardTabs: {},
          }),
      }),
      {
        name: 'forum-ui-storage',
        // Only persist view preferences, not temporary UI state
        partialize: (state) => ({
          viewMode: state.viewMode,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
        }),
      }
    ),
    {
      name: 'ForumUIStore',
    }
  )
);
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User, ApiResponse } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        login: async (email, password) => {
          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Login failed');
            }

            const { user, token } = data;

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            // Set authorization header for future requests
            if (typeof window !== 'undefined') {
              localStorage.setItem('token', token);
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Login failed',
              isLoading: false,
              isAuthenticated: false,
            });
            throw error;
          }
        },

        register: async (userName, email, password) => {
          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userName, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Registration failed');
            }

            const { user, token } = data;

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            // Set authorization header for future requests
            if (typeof window !== 'undefined') {
              localStorage.setItem('token', token);
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Signup failed',
              isLoading: false,
              isAuthenticated: false,
            });
            throw error;
          }
        },

        logout: () => {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });

          // Clear token from localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('auth-storage'); // Clear Zustand persistence
            window.location.href = '/';
          }
        },

        setUser: (user) => set({ user }),

        setToken: (token) => set({ token, isAuthenticated: !!token }),

        setError: (error) => set({ error }),

        clearError: () => set({ error: null }),

        checkAuth: async () => {
          const token = get().token;

          if (!token) {
            set({ isAuthenticated: false, user: null });
            return;
          }

          set({ isLoading: true });

          try {
            const response = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              throw new Error('Auth check failed');
            }

            const data = await response.json();

            set({
              user: data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: 'Session expired',
            });

            // Clear invalid token
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
            }
          }
        },

        updateProfile: async (updates) => {
          const token = get().token;
          if (!token) throw new Error('Not authenticated');

          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/auth/profile', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(updates),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to update profile');
            }

            set({
              user: data.user,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Update failed',
              isLoading: false,
            });
            throw error;
          }
        },
      }),
      {
        name: 'auth-storage',
        skipHydration: true, // For SSR compatibility
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Hydration helper for client-side
export const hydrateAuthStore = () => {
  if (typeof window !== 'undefined') {
    useAuthStore.persist.rehydrate();
  }
};
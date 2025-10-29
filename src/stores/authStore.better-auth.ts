import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { authClient } from '../lib/auth-client';
import type { User } from 'better-auth';

/**
 * Auth store for Better Auth integration
 * This store acts as a bridge between Better Auth and your existing UI components
 * It maintains compatibility with the existing auth store API while using Better Auth under the hood
 */

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;

  // Better Auth specific
  signInWithProvider: (provider: 'github' | 'google') => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        login: async (email, password) => {
          set({ isLoading: true, error: null });

          try {
            const result = await authClient.signIn.email({
              email,
              password,
            });

            if (result.error) {
              throw new Error(result.error.message || 'Login failed');
            }


            // Poll for the session
            const session = await pollForSession();

            if (session?.data?.user || session?.user) {
              const user = session.data?.user || session.user;
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              return session.data || session;
            } else {
              throw new Error('Session could not be established after login');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed';
            set({
              error: message,
              isLoading: false,
              isAuthenticated: false,
              user: null,
            });
            throw error;
          }
        },

        register: async (userName, email, password) => {
          set({ isLoading: true, error: null });

          try {
            const result = await authClient.signUp.email({
              email,
              password,
              name: userName,
              // Additional user data can be passed here
              data: {
                userName,
                roleBadge: 'resident',
                hobbies: [],
              },
            });

            if (result.error) {
              throw new Error(result.error.message || 'Registration failed');
            }


            // Poll for the session
            const session = await pollForSession();

            if (session?.data?.user || session?.user) {
              const user = session.data?.user || session.user;
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              return session.data || session;
            } else {
              throw new Error('Session could not be established after registration');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Registration failed';
            set({
              error: message,
              isLoading: false,
              isAuthenticated: false,
              user: null,
            });
            throw error;
          }
        },

        logout: async () => {
          set({ isLoading: true });

          try {
            await authClient.signOut();

            set({
              user: null,
              isAuthenticated: false,
              error: null,
              isLoading: false,
            });

            // Clear localStorage
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth-storage');
              localStorage.removeItem('token');
              // Use the logout page to ensure server-side session is cleared
              window.location.href = '/logout';
            }
          } catch (error) {
            console.error('Logout error:', error);
            // Even if logout fails, clear local state
            set({
              user: null,
              isAuthenticated: false,
              error: null,
              isLoading: false,
            });
            // Still redirect to logout page to clear server session
            if (typeof window !== 'undefined') {
              window.location.href = '/logout';
            }
          }
        },

        setUser: (user) => {
          set({
            user,
            isAuthenticated: !!user,
          });
        },

        setError: (error) => set({ error }),

        clearError: () => set({ error: null }),

        checkAuth: async () => {
          set({ isLoading: true });

          try {
            const session = await authClient.getSession();

            if (session?.data?.user) {
              set({
                user: session.data.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              return session.data;
            } else if (session?.user) {
              // Try different session structure
              set({
                user: session.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
              return session;
            } else {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
              });
              return null;
            }
          } catch (error) {
            console.error('Auth check error:', error);
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: 'Session check failed',
            });
            return null;
          }
        },

        updateProfile: async (updates) => {
          set({ isLoading: true, error: null });

          try {
            const result = await authClient.updateUser(updates);

            if (result.error) {
              throw new Error(result.error.message || 'Failed to update profile');
            }

            // Get updated session
            const session = await authClient.getSession();

            if (session?.user) {
              set({
                user: session.user,
                isLoading: false,
                error: null,
              });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Update failed';
            set({
              error: message,
              isLoading: false,
            });
            throw error;
          }
        },

        // Better Auth specific methods
        signInWithProvider: async (provider) => {
          set({ isLoading: true, error: null });

          try {
            await authClient.signIn.social({
              provider,
              callbackURL: "/",
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Social login failed';
            set({
              error: message,
              isLoading: false,
            });
            throw error;
          }
        },

        sendPasswordResetEmail: async (email) => {
          try {
            const result = await authClient.forgetPassword({
              email,
              redirectTo: "/reset-password",
            });

            if (result.error) {
              throw new Error(result.error.message || 'Failed to send reset email');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to send reset email';
            throw new Error(message);
          }
        },

        resetPassword: async (token, newPassword) => {
          try {
            const result = await authClient.resetPassword({
              token,
              newPassword,
            });

            if (result.error) {
              throw new Error(result.error.message || 'Failed to reset password');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reset password';
            throw new Error(message);
          }
        },
      }),
      {
        name: 'auth-storage',
        skipHydration: true,
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Helper function to poll for session
// Increased timeout for production environments with network latency
const pollForSession = async (retries = 20, delay = 500) => {
  for (let i = 0; i < retries; i++) {
    const session = await authClient.getSession();
    if (session?.user || session?.data?.user) {
      return session;
    }
    // Use exponential backoff for better reliability
    const backoffDelay = Math.min(delay * Math.pow(1.2, i), 2000);
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
  }
  return null;
};

// Hydration helper for client-side
export const hydrateAuthStore = () => {
  if (typeof window !== 'undefined') {
    useAuthStore.persist.rehydrate();
    // Also check Better Auth session
    useAuthStore.getState().checkAuth();
  }
};

// Export a hook that combines Zustand store with Better Auth session
export function useAuth() {
  const store = useAuthStore();

  // You can also use Better Auth's useSession hook directly here
  // const session = useSession();

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login: store.login,
    register: store.register,
    logout: store.logout,
    updateProfile: store.updateProfile,
    signInWithProvider: store.signInWithProvider,
    sendPasswordResetEmail: store.sendPasswordResetEmail,
    resetPassword: store.resetPassword,
  };
}
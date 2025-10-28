import { createAuthClient } from "better-auth/react";
import type { Auth } from "../auth";

/**
 * Better Auth client for React components
 * This provides all the hooks and methods needed for authentication
 */
export const authClient = createAuthClient<Auth>({
  baseURL: import.meta.env.PUBLIC_API_URL || "http://localhost:3000",
  // Session refresh configuration
  fetchOptions: {
    // Include credentials for cross-origin requests
    credentials: "include",
  },
});

// Export hooks for easy usage
export const {
  // Authentication hooks
  signIn,
  signUp,
  signOut,
  useSession,

  // User management hooks
  updateUser,
  deleteUser,

  // Password management
  forgetPassword,
  resetPassword,
  changePassword,

  // Email verification
  sendVerificationEmail,
  verifyEmail,

  // Social authentication (ready when you add providers)
  signInWithOAuth,
  linkSocial,
  unlinkSocial,

  // Two-factor authentication (if enabled)
  // enableTwoFactor,
  // disableTwoFactor,
  // verifyTwoFactor,
} = authClient;

// Helper function to check authentication status
export function useAuth() {
  const session = useSession();

  return {
    user: session.data?.user ?? null,
    session: session.data?.session ?? null,
    isAuthenticated: !!session.data,
    isLoading: session.isPending,
    error: session.error,
  };
}

// Helper to get auth headers for API calls
export function getAuthHeaders(): HeadersInit {
  const token = authClient.getSession()?.session?.token;

  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  return {};
}
import { useAuthStore } from '../stores/authStore';
import { useForumStore } from '../stores/forumStore';

export function initializeStores() {
  if (typeof window !== 'undefined') {
    // Rehydrate the stores on the client side
    useAuthStore.persist.rehydrate();
    useForumStore.persist.rehydrate();
  }
}

// Call this in your app initialization
if (typeof window !== 'undefined') {
  initializeStores();
}
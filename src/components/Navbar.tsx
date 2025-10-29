import React, { useEffect, useState } from 'react';
import { useAuthStore, hydrateAuthStore } from '../stores/authStore.better-auth';

export default function Navbar() {
  const [isClient, setIsClient] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    setIsClient(true);
    // Rehydrate the auth store and check for existing Better Auth session
    if (typeof window !== 'undefined') {
      hydrateAuthStore();
      // Check if there's an existing Better Auth session
      checkAuth().catch(error => {
        console.error('Auth check failed:', error);
        // Clear invalid state if auth check fails
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        });
      });
    }
  }, []);

  // Listen for storage changes to sync logout across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-storage' && e.newValue === null) {
        // Storage was cleared, user logged out in another tab
        window.location.reload();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  // Don't render user-specific content during SSR
  if (!isClient) {
    return (
      <div className="flex justify-between items-center px-4 md:px-8 py-3 md:py-4 bg-gray-50 shadow-md">
        <nav>
          <ul className="list-none m-0 p-0 flex items-center gap-4 md:gap-8">
            <div className="flex gap-4 md:gap-8">
              <li>
                <a href="/" className="text-sm md:text-base text-gray-800 no-underline font-medium hover:text-[#4b9aaa] transition-colors">
                  <span>Home</span>
                </a>
              </li>
              <li>
                <a href="/login" className="text-sm md:text-base text-gray-800 no-underline font-medium hover:text-[#4b9aaa] transition-colors">
                  <span>Login</span>
                </a>
              </li>
              <li>
                <a href="/register" className="text-sm md:text-base text-gray-800 no-underline font-medium hover:text-[#4b9aaa] transition-colors">
                  <span>Register</span>
                </a>
              </li>
            </div>
          </ul>
        </nav>
      </div>
    );
  }

  return (
    <>
      <div className="relative bg-white shadow-lg border-b-4 border-[#4b9aaa]">
        <nav className="px-4 md:px-8 py-3 md:py-4">
          <ul className="list-none m-0 p-0 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-3 md:gap-8 items-center flex-wrap">
              {/* Logo/Home */}
              <li>
                <a
                  href="/"
                  className="text-base md:text-lg font-bold text-[#814256] no-underline hover:text-[#4b9aaa] transition-all duration-300 flex items-center gap-1 md:gap-2"
                >
                  <span className="text-xl md:text-2xl">🏘️</span>
                  <span>Mahalle</span>
                </a>
              </li>

              {/* Navigation Links */}
              {!isAuthenticated && (
                <>
                  <li>
                    <a
                      href="/login"
                      className="text-sm md:text-base text-gray-700 no-underline font-medium hover:text-[#4b9aaa] hover:underline transition-all px-2 md:px-3 py-1 md:py-2 rounded-md hover:bg-gray-50"
                    >
                      <span>Login</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="/register"
                      className="text-sm md:text-base text-gray-700 no-underline font-medium hover:text-[#4b9aaa] hover:underline transition-all px-2 md:px-3 py-1 md:py-2 rounded-md hover:bg-gray-50"
                    >
                      <span>Register</span>
                    </a>
                  </li>
                </>
              )}
              {user && (
                <li className="hidden md:block">
                  <a
                    href="/profile"
                    className="text-sm md:text-base text-gray-700 no-underline font-medium hover:text-[#4b9aaa] hover:underline transition-all px-2 md:px-3 py-1 md:py-2 rounded-md hover:bg-gray-50"
                  >
                    <span>👤 User Profile</span>
                  </a>
                </li>
              )}
            </div>

            {/* Logout Button */}
            {user && (
              <li>
                <button
                  onClick={logout}
                  className="bg-[#814256] text-white border-none px-3 md:px-5 py-2 md:py-2.5 text-sm md:text-base rounded-md cursor-pointer font-medium hover:bg-[#6a3646] transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  🚪 Logout
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>

      {/* User Profile Sidebar - Hidden on mobile/tablet, visible on large screens */}
      {isAuthenticated && user && (
        <div className="hidden lg:flex fixed top-[45%] right-[5%] flex-col items-center gap-3 z-50">
          <a
            href="/profile"
            className="group"
          >
            <div className="relative">
              <img
                className="w-[60px] h-[60px] lg:w-[70px] lg:h-[70px] rounded-full object-cover bg-white shadow-xl cursor-pointer group-hover:scale-110 transition-transform duration-300 border-3 border-[#4b9aaa]"
                src={user.userPicture || `https://ui-avatars.com/api/?name=${user.userName}&background=4b9aaa&color=fff&size=140`}
                alt={user.userName}
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
          </a>
          <div className="text-center">
            <h2 className="text-[#4b9aaa] text-base lg:text-lg font-bold mb-1">{user.userName}</h2>
            {user.roleBadge && (
              <span className="inline-block px-2 py-1 bg-[#aca89f] text-white text-xs rounded-full">
                {user.roleBadge}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
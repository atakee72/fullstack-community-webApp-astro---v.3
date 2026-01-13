import React, { useEffect, useState } from 'react';
import { signOut } from 'auth-astro/client';

interface NavbarProps {
  user?: any;
}

export default function Navbar({ user: initialUser }: NavbarProps) {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    setIsClient(true);
    // Update user state if it changes from server
    setUser(initialUser);
  }, [initialUser]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = '/';
  };

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
              {!user && (
                <>
                  <li>
                    <a
                      href="/marketplace"
                      className="text-sm md:text-base text-gray-700 no-underline font-medium hover:text-[#4b9aaa] hover:underline transition-all px-2 md:px-3 py-1 md:py-2 rounded-md hover:bg-gray-50"
                    >
                      <span>🛒 Marketplace</span>
                    </a>
                  </li>
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
                <>
                  <li className="hidden md:block">
                    <a
                      href="/profile"
                      className="text-sm md:text-base text-gray-700 no-underline font-medium hover:text-[#4b9aaa] hover:underline transition-all px-2 md:px-3 py-1 md:py-2 rounded-md hover:bg-gray-50"
                    >
                      <span>👤 User Profile</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="/calendar"
                      className="text-sm md:text-base text-gray-700 no-underline font-medium hover:text-[#4b9aaa] hover:underline transition-all px-2 md:px-3 py-1 md:py-2 rounded-md hover:bg-gray-50"
                    >
                      <span>📅 Calendar</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="/marketplace"
                      className="text-sm md:text-base text-gray-700 no-underline font-medium hover:text-[#4b9aaa] hover:underline transition-all px-2 md:px-3 py-1 md:py-2 rounded-md hover:bg-gray-50"
                    >
                      <span>🛒 Marketplace</span>
                    </a>
                  </li>
                </>
              )}
            </div>

            {/* Logout Button */}
            {user && (
              <li>
                <button
                  onClick={handleLogout}
                  className="bg-[#814256] text-white border-none px-3 md:px-5 py-2 md:py-2.5 text-sm md:text-base rounded-md cursor-pointer font-medium hover:bg-[#6a3646] transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  🚪 Logout
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>

      {/* User Profile Avatar - Bottom right corner */}
      {user && (
        <div className="flex fixed bottom-[1%] right-[1%] z-50">
          <a
            href="/profile"
            className="group"
          >
            <div className="relative">
              <img
                className="w-[50px] h-[50px] lg:w-[60px] lg:h-[60px] rounded-full object-cover bg-white shadow-xl cursor-pointer group-hover:scale-110 transition-transform duration-300 border-3 border-[#4b9aaa]"
                src={user.image || `https://ui-avatars.com/api/?name=${user.name}&background=4b9aaa&color=fff&size=140`}
                alt={user.name}
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
          </a>
        </div>
      )}
    </>
  );
}
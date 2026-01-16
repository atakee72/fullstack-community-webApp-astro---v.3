import React, { useEffect, useState, useRef } from 'react';
import { signOut } from 'auth-astro/client';

interface NavbarProps {
  user?: any;
}

export default function Navbar({ user: initialUser }: NavbarProps) {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsClient(true);
    setUser(initialUser);
  }, [initialUser]);

  // Ensure video plays after hydration - runs when isClient becomes true
  useEffect(() => {
    if (isClient && videoRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        videoRef.current?.play().catch(() => {
          // Autoplay was prevented
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isClient]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut({ redirect: false });
    window.location.href = '/';
  };

  const closeMenu = () => setMenuOpen(false);

  // Navigation items configuration
  const publicNavItems = [
    { href: '/', label: 'Home', icon: '🏘️' },
    { href: '/blog', label: 'Blog', icon: '📝' },
    { href: '/marketplace', label: 'Marketplace', icon: '🛒' },
  ];

  const authNavItems = [
    { href: '/', label: 'Home', icon: '🏘️' },
    { href: '/blog', label: 'Blog', icon: '📝' },
    { href: '/calendar', label: 'Calendar', icon: '📅' },
    { href: '/marketplace', label: 'Marketplace', icon: '🛒' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  const navItems = user ? authNavItems : publicNavItems;

  // SSR fallback
  if (!isClient) {
    return (
      <>
        {/* Logo - fixed position */}
        <a href="/" className="fixed top-2 left-4 md:left-8 z-50">
          <video
            src="/LogoVideo.mp4"
            autoPlay
            muted
            playsInline
            className="w-36 md:w-44 lg:w-48"
            style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
          />
        </a>
        {/* Hamburger placeholder */}
        <div className="fixed top-4 right-4 md:right-8 z-50 p-2 rounded-lg bg-white/80 shadow-md">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Logo - fixed position, plays once on load */}
      <a href="/" className="fixed top-2 left-4 md:left-8 z-50">
        <video
          ref={videoRef}
          src="/LogoVideo.mp4"
          autoPlay
          muted
          playsInline
          onLoadedData={(e) => e.currentTarget.play().catch(() => {})}
          className="w-36 md:w-44 lg:w-48"
          style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
        />
      </a>

      {/* Hamburger Button - fixed position top right */}
      <button
        onClick={() => setMenuOpen(true)}
        className="fixed top-4 right-4 md:right-8 z-50 p-2 rounded-lg bg-white/80 hover:bg-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#4b9aaa]"
        aria-label="Open menu"
        aria-expanded={menuOpen}
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-72 md:w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#4b9aaa]">
          <span className="text-lg font-bold text-white">Menu</span>
          <button
            onClick={closeMenu}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Info (if logged in) */}
        {user && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <img
                className="w-12 h-12 rounded-full object-cover border-2 border-[#4b9aaa]"
                src={user.image || `https://ui-avatars.com/api/?name=${user.name}&background=4b9aaa&color=fff&size=96`}
                alt={user.name}
              />
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-[#4b9aaa]/10 hover:text-[#4b9aaa] transition-colors font-medium"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Auth Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-[#814256] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#6a3646] transition-colors shadow-md"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          ) : (
            <div className="space-y-2">
              <a
                href="/login"
                onClick={closeMenu}
                className="block w-full text-center bg-[#4b9aaa] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#3a7a8a] transition-colors shadow-md"
              >
                Login
              </a>
              <a
                href="/register"
                onClick={closeMenu}
                className="block w-full text-center bg-white text-[#4b9aaa] border-2 border-[#4b9aaa] px-4 py-3 rounded-lg font-medium hover:bg-[#4b9aaa]/10 transition-colors"
              >
                Register
              </a>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Avatar - Bottom right corner (logged in only) */}
      {user && (
        <div className="fixed bottom-4 right-4 z-30">
          <a href="/profile" className="group">
            <div className="relative">
              <img
                className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover bg-white shadow-xl cursor-pointer group-hover:scale-110 transition-transform duration-300 border-3 border-[#4b9aaa]"
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

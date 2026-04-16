import React, { useEffect, useState } from 'react';
import { signOut } from 'auth-astro/client';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, PenLine, Newspaper, Calendar, ShoppingBag, BarChart3, User, LogOut } from 'lucide-react';

interface NavbarProps {
  user?: any;
}

export default function Navbar({ user: initialUser }: NavbarProps) {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setUser(initialUser);
  }, [initialUser]);

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
    { href: '/', label: 'Forums', icon: MessageSquare },
    { href: '/blog', label: 'Blog', icon: PenLine },
    { href: '/newsboard', label: 'Newsboard', icon: Newspaper },
    { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { href: '/schillerkiez', label: 'Kiez Data', icon: BarChart3 },
  ];

  const authNavItems = [
    { href: '/', label: 'Forums', icon: MessageSquare },
    { href: '/blog', label: 'Blog', icon: PenLine },
    { href: '/newsboard', label: 'Newsboard', icon: Newspaper },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { href: '/schillerkiez', label: 'Kiez Data', icon: BarChart3 },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const navItems = user ? authNavItems : publicNavItems;

  // SSR fallback
  if (!isClient) {
    return (
      <>
        {/* Hamburger placeholder */}
        <div className="fixed top-4 right-4 md:right-8 z-50 p-2 rounded-lg bg-white/10 backdrop-blur-xl border border-white/10 shadow-md">
          <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Hamburger Button - fixed position top right */}
      <button
        onClick={() => setMenuOpen(true)}
        className="fixed top-4 right-4 md:right-8 z-50 p-2 rounded-lg bg-white/10 backdrop-blur-xl border border-white/10 hover:bg-white/20 shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#4b9aaa]/50"
        aria-label="Open menu"
        aria-expanded={menuOpen}
      >
        <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={closeMenu}
              aria-hidden="true"
            />

            {/* Slide-out Menu */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-72 md:w-80 bg-[#542CC8]/20 backdrop-blur-2xl border-l border-white/20 border-l-white/30 shadow-[inset_0_0_60px_rgba(84,44,200,0.15),-10px_0_40px_rgba(84,44,200,0.1)] z-50"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              {/* Menu Header */}
              <div className="flex items-center justify-end p-4 border-b border-white/15 bg-[#542CC8]/20">
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
                <div className="p-4 bg-white/[0.04] border-b border-white/15">
                  <div className="flex items-center gap-3">
                    <img
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#4b9aaa]"
                      src={user.image || `https://ui-avatars.com/api/?name=${user.name}&background=4b9aaa&color=fff&size=96`}
                      alt={user.name}
                    />
                    <div>
                      <p className="font-medium text-[#e8e6e1]">{user.name}</p>
                      <p className="text-sm text-white/50">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="p-4">
                <ul className="space-y-2">
                  {navItems.map((item, i) => (
                    <motion.li
                      key={item.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i, duration: 0.2 }}
                    >
                      <a
                        href={item.href}
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:bg-white/10 hover:text-[#4b9aaa] transition-colors font-medium"
                      >
                        <item.icon className="w-5 h-5" strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              {/* Auth Actions */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/15 bg-[#542CC8]/10">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 bg-[#814256]/30 border border-[#814256]/50 text-white/80 px-4 py-3 rounded-lg font-medium hover:bg-[#814256]/50 transition-colors backdrop-blur-xl"
                  >
                    <LogOut className="w-5 h-5" strokeWidth={1.5} />
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
                      className="block w-full text-center bg-white/10 text-[#4b9aaa] border-2 border-[#4b9aaa]/50 px-4 py-3 rounded-lg font-medium hover:bg-[#4b9aaa]/20 transition-colors"
                    >
                      Register
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NexoraLogo } from '../ui/NexoraLogo';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Competitions', path: '/competitions' },
    { label: 'Team', path: '/team' },
    { label: 'Profile', path: '/profile' }
  ];

  // Strictly enforce: Admin navigation visible ONLY when server-authorized admin
  if (isAdmin) {
    navLinks.push({ label: 'Admin', path: '/admin' });
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#08080D]/80 backdrop-blur-md border-b border-violet-500/15">
      {/* Top Banner Ribbon */}
      <div className="w-full bg-[#11101B]/80 border-b border-violet-500/10 px-4 py-1 text-center text-[11px] text-slate-400 flex items-center justify-center gap-2 select-none">
        <span className="text-violet-400 font-medium">BVM Initiative:</span>
        <span>Student Technology Community · Birla Vishvakarma Mahavidyalaya</span>
        <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] bg-violet-950/70 text-violet-300 border border-violet-500/20 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Firebase Cloud Connected
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          
          {/* Exact Master NEXORA Wordmark */}
          <Link
            to="/"
            className="group flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-sm shrink-0"
            aria-label="NEXORA Home"
          >
            <NexoraLogo size="md" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400 select-none"
            aria-label="Main Navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  isActive(link.path)
                    ? 'text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {link.label}
                {isActive(link.path) && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-400 rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* User Status / Join NEXORA */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {user ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-[#171426]/70 border border-violet-500/25 rounded-lg hover:border-violet-400 hover:text-white transition-all whitespace-nowrap shrink-0"
              >
                <div className="w-5 h-5 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 text-[10px] font-bold">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                <span className="max-w-[120px] truncate">{user.full_name}</span>
                {isAdmin && <Shield className="w-3.5 h-3.5 text-violet-400" />}
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:from-violet-500 hover:to-purple-500 transition-all shadow-[0_0_20px_-5px_rgba(139,92,246,0.5)] whitespace-nowrap shrink-0"
              >
                Sign In / Join
              </Link>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-violet-950/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-violet-500/15 bg-[#08080D]/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  isActive(link.path)
                    ? 'text-white bg-violet-950/40 font-semibold border-l-2 border-violet-400'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-violet-500/10">
            {user ? (
              <div className="space-y-2">
                <div className="px-3 py-2 text-xs text-slate-400">
                  Signed in as <span className="text-white font-medium">{user.full_name}</span>
                </div>
                <Link
                  to="/profile"
                  className="block w-full text-center py-2 px-4 text-xs font-semibold text-white bg-violet-600/30 border border-violet-500/40 rounded-lg"
                >
                  Go to Student Profile
                </Link>
              </div>
            ) : (
              <Link
                to="/login"
                className="block w-full text-center py-2 px-4 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg shadow-lg"
              >
                Sign In / Join NEXORA
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

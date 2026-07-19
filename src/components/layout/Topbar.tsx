import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, ChevronDown, LogOut, User, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import type { RoleType } from '../../models/property.models';

interface TopbarProps {
  title: string;
  subtitle?: string;
  role: RoleType;
  unreadCount?: number;
  mobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
  onNotificationsToggle?: () => void;
  rightExtra?: React.ReactNode;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  subtitle,
  role: _role,
  unreadCount = 0,
  mobileMenuOpen = false,
  onMobileMenuToggle,
  onNotificationsToggle,
  rightExtra,
}) => {
  const navigate = useNavigate();
  const currentUser = authService.currentUser();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleLogout = () => {
    setProfileOpen(false);
    authService.logout();
    navigate('/auth/login');
  };

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-white/[0.06] bg-dark-950/80 backdrop-blur-xl z-30">
      {/* Left: Hamburger (mobile) + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-dark-400 hover:text-white transition-all"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* Logo on mobile */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-cyan-600 flex items-center justify-center">
            <span className="text-white font-black text-[10px]">LL</span>
          </div>
          <span className="text-white font-bold text-base">Land<span className="gradient-text">Lens</span></span>
        </div>

        {/* Breadcrumb on desktop */}
        <div className="hidden lg:block">
          <h1 className="text-white font-semibold text-base leading-none">{title}</h1>
          {subtitle && <p className="text-dark-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* Right: Search + Notifications + Profile */}
      <div className="flex items-center gap-3">

        {/* Search (desktop) */}
        <div className="hidden md:flex items-center gap-2">
          <div className={`
            flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200
            ${searchFocused
              ? 'bg-white/[0.08] border-primary-500/40 shadow-[0_0_0_3px_rgba(37,99,235,0.12)]'
              : 'bg-white/[0.04] border-white/[0.08] hover:border-white/[0.12]'
            }
          `}>
            <Search className="w-3.5 h-3.5 text-dark-500" />
            <input
              type="text"
              placeholder="Search properties..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="bg-transparent text-white text-xs placeholder-dark-500 outline-none w-40"
            />
          </div>
        </div>

        {/* Right Extra slot */}
        {rightExtra}

        {/* Notification Bell */}
        <button
          onClick={onNotificationsToggle}
          className="relative w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] flex items-center justify-center text-dark-400 hover:text-white transition-all duration-200"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-dark-950">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">
                {(currentUser?.firstName?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <span className="text-white text-xs font-medium hidden sm:block max-w-[80px] truncate">
              {currentUser?.firstName}
            </span>
            <ChevronDown className={`w-3 h-3 text-dark-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 z-50 bg-dark-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.7)] overflow-hidden"
                >
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-white font-semibold text-sm truncate">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </p>
                    <p className="text-dark-500 text-xs truncate">{currentUser?.email}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-dark-400 hover:text-white hover:bg-white/[0.05] transition-all text-sm">
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-danger-400 hover:text-danger-300 hover:bg-danger-500/10 transition-all text-sm mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

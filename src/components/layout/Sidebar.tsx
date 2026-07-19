import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bookmark, Calendar, MessageSquare, Bell,
  Home, Plus, AlertOctagon, BarChart3, Key, LogOut,
  Shield, Eye, CheckCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { authService } from '../../services/auth.service';
import type { RoleType } from '../../models/property.models';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  navItems: NavItem[];
  role: RoleType;
  unreadCount?: number;
  className?: string;
}

const roleConfig: Record<RoleType, { label: string; color: string; badge: string }> = {
  ADMIN: {
    label: 'Admin Panel',
    color: 'text-danger-400',
    badge: 'bg-danger-500/15 border-danger-500/30 text-danger-400',
  },
  GOVERNMENT_OFFICER: {
    label: 'Govt Portal',
    color: 'text-primary-400',
    badge: 'bg-primary-500/15 border-primary-500/30 text-primary-400',
  },
  PROVIDER: {
    label: 'Provider Portal',
    color: 'text-accent-400',
    badge: 'bg-accent-500/15 border-accent-500/30 text-accent-400',
  },
  BUYER: {
    label: 'Buyer Portal',
    color: 'text-cyan-400',
    badge: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
  },
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  navItems,
  role,
  className = '',
}) => {
  const navigate = useNavigate();
  const currentUser = authService.currentUser();
  const cfg = roleConfig[role];

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  return (
    <aside className={`flex flex-col w-[260px] shrink-0 h-full glass-nav overflow-hidden ${className}`}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {/* Logo Mark */}
          <div className="relative w-9 h-9 shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl opacity-20 blur-sm" />
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-cyan-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-sm">LL</span>
            </div>
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight">
              Land<span className="gradient-text">Lens</span>
            </span>
          </div>
        </div>

        {/* Role badge */}
        <div className="mt-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
            <Shield className="w-2.5 h-2.5" />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-premium">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 text-left group relative
                ${isActive
                  ? 'sidebar-item-active'
                  : 'text-dark-400 hover:text-white hover:bg-white/[0.05]'
                }
              `}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-primary-400' : 'text-dark-500 group-hover:text-dark-300'}`} />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`
                  px-1.5 py-0.5 rounded-full text-[9px] font-bold min-w-[18px] text-center
                  ${isActive ? 'bg-primary-500/30 text-primary-300' : 'bg-danger-500/80 text-white'}
                `}>
                  {item.badge}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute right-2 w-1 h-5 bg-primary-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile at Bottom */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">
              {(currentUser?.firstName?.[0] || 'U').toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">
              {currentUser?.firstName} {currentUser?.lastName}
            </p>
            <p className="text-dark-500 text-[10px] truncate">{currentUser?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-dark-500 hover:text-danger-400 hover:bg-danger-500/10 transition-all duration-200 text-sm font-medium"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

// ─── Export nav item builders for each role ────────────────────────────
export const buyerNavItems = (unreadCount: number): NavItem[] => [
  { id: 'explore', label: 'Explore Lands', icon: Search },
  { id: 'visits', label: 'Scheduled Visits', icon: Calendar },
  { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
  { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
];

export const providerNavItems = (pendingVisits: number, unreadCount: number): NavItem[] => [
  { id: 'listings', label: 'My Listings', icon: Home },
  { id: 'add', label: 'Add Property', icon: Plus },
  { id: 'visits', label: 'Visits & Tours', icon: Calendar, badge: pendingVisits },
  { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
];

export const govtNavItems = (fraudCount: number, unreadCount: number): NavItem[] => [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'queue', label: 'Pending Verification', icon: Eye },
  { id: 'disputes', label: 'Community Disputes', icon: AlertOctagon, badge: fraudCount },
  { id: 'approved', label: 'Live Properties', icon: CheckCircle },
  { id: 'api', label: 'API Integration', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
];

export const adminNavItems = (unreadCount: number): NavItem[] => [
  { id: 'analytics', label: 'System Analytics', icon: BarChart3 },
  { id: 'developer', label: 'Developer Portal', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
];

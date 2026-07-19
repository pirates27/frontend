import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { RoleType, Notification } from '../../models/property.models';
import { propertyService } from '../../services/property.service';
import { Bell, X, Loader2, Sparkles, Shield, AlertTriangle, Calendar, Info } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  navItems: NavItem[];
  role: RoleType;
  title: string;
  subtitle?: string;
  unreadCount?: number;
  topbarRight?: React.ReactNode;

  // Mobile bottom nav
  mobileNavItems?: NavItem[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  navItems,
  role,
  title,
  subtitle,
  unreadCount: _propUnreadCount = 0,
  topbarRight,
  mobileNavItems,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const data = await propertyService.getNotifications();
      // Sort: unread first, then newest first
      const sorted = [...data].sort((a, b) => {
        if (a.isRead !== b.isRead) {
          return a.isRead ? 1 : -1;
        }
        return new Date(b.createdTime || 0).getTime() - new Date(a.createdTime || 0).getTime();
      });
      setNotifications(sorted);
    } catch (e) {
      console.error('Failed to load notifications in DashboardLayout', e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Poll notifications every 30 seconds for live updates
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await propertyService.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadList = notifications.filter(n => !n.isRead);
      await Promise.all(unreadList.map(n => propertyService.markNotificationRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error('Failed to mark all notifications as read', e);
    }
  };

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  // Sync unreadCount into the navItems list
  const syncedNavItems = navItems.map(item =>
    item.id === 'notifications' ? { ...item, badge: unreadCount } : item
  );

  const syncedMobileNavItems = mobileNavItems?.map(item =>
    item.id === 'notifications' ? { ...item, badge: unreadCount } : item
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-mesh">
      {/* Topbar */}
      <Topbar
        title={title}
        subtitle={subtitle}
        role={role}
        unreadCount={unreadCount}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuToggle={() => setMobileMenuOpen(v => !v)}
        onNotificationsToggle={() => setNotificationsOpen(true)}
        rightExtra={topbarRight}
      />

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 z-50 lg:hidden"
              >
                <Sidebar
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  navItems={syncedNavItems}
                  role={role}
                  unreadCount={unreadCount}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          navItems={syncedNavItems}
          role={role}
          unreadCount={unreadCount}
          className="hidden lg:flex"
        />

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto scrollbar-premium pb-20 lg:pb-0">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {syncedMobileNavItems && syncedMobileNavItems.length > 0 && (
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-dark-900/95 backdrop-blur-xl border-t border-white/[0.07]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center h-16">
            {syncedMobileNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 h-full relative"
                >
                  <div className={`
                    relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200
                    ${isActive ? 'bg-primary-500/20' : ''}
                  `}>
                    <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary-400' : 'text-dark-500'}`} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-semibold transition-colors ${isActive ? 'text-primary-400' : 'text-dark-500'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-active"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Right Drawer for Notifications */}
      <AnimatePresence>
        {notificationsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotificationsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[380px] bg-dark-950/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary-400 animate-pulse" />
                  <h3 className="text-white font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-400 text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-primary-400 hover:text-primary-300 text-xs font-semibold hover:underline px-2 py-1 rounded-lg transition-all"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-dark-400 hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-premium">
                {loadingNotifications && notifications.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map(n => {
                    const isUnread = !n.isRead;
                    let typeIcon = <Info className="w-4 h-4 text-dark-400" />;
                    let typeBg = 'bg-dark-900/60 border-white/[0.06]';
                    let iconBg = 'bg-white/[0.05] border-white/[0.1]';
                    
                    if (n.type === 'PROPERTY_VERIFIED') {
                      typeIcon = <Shield className="w-4 h-4 text-accent-400" />;
                      typeBg = isUnread ? 'bg-accent-500/[0.03] border-accent-500/20' : 'bg-dark-900/60 border-white/[0.06]';
                      iconBg = 'bg-accent-500/10 border-accent-500/20';
                    } else if (n.type === 'VISIT_SCHEDULED') {
                      typeIcon = <Calendar className="w-4 h-4 text-cyan-400" />;
                      typeBg = isUnread ? 'bg-cyan-500/[0.03] border-cyan-500/20' : 'bg-dark-900/60 border-white/[0.06]';
                      iconBg = 'bg-cyan-500/10 border-cyan-500/20';
                    } else if (n.type === 'FRAUD_ALERT') {
                      typeIcon = <AlertTriangle className="w-4 h-4 text-danger-400" />;
                      typeBg = isUnread ? 'bg-danger-500/[0.03] border-danger-500/20' : 'bg-dark-900/60 border-white/[0.06]';
                      iconBg = 'bg-danger-500/10 border-danger-500/20';
                    } else if (n.type === 'API_LIMIT_REACHED') {
                      typeIcon = <Sparkles className="w-4 h-4 text-warning-400" />;
                      typeBg = isUnread ? 'bg-warning-500/[0.03] border-warning-500/20' : 'bg-dark-900/60 border-white/[0.06]';
                      iconBg = 'bg-warning-500/10 border-warning-500/20';
                    }

                    return (
                      <div
                        key={n.id}
                        onClick={() => isUnread && handleMarkAsRead(n.id)}
                        className={`group relative flex gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left ${typeBg} ${isUnread ? 'cursor-pointer hover:border-white/20' : 'opacity-70'}`}
                      >
                        {/* Status Unread Dot */}
                        {isUnread && (
                          <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                        )}

                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${iconBg}`}>
                          {typeIcon}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-white text-xs font-semibold leading-snug group-hover:text-primary-300 transition-colors">
                            {n.title}
                          </p>
                          <p className="text-dark-400 text-[11px] leading-relaxed mt-1">
                            {n.message}
                          </p>
                          <p className="text-dark-600 text-[9px] mt-2">
                            {new Date(n.createdTime || Date.now()).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-70">
                    <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-3">
                      <Bell className="w-5 h-5 text-dark-500" />
                    </div>
                    <p className="text-white text-sm font-semibold">No notifications</p>
                    <p className="text-dark-500 text-xs mt-1">You are all caught up!</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

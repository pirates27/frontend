import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import type { AnalyticsDashboard, DeveloperKey, DeveloperKeyLog, Notification, Property } from '../../models/property.models';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { adminNavItems } from '../../components/layout/Sidebar';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Badge';
import { SkeletonStatCard, SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import {
  Eye, Search, Shield, AlertTriangle, Code2, Key, Plus,
  Copy, Trash2, Clock, CheckCircle, Bell, Terminal, RefreshCw, Activity, MapPin
} from 'lucide-react';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'developer' | 'notifications' | 'properties'>('analytics');

  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [developerKeys, setDeveloperKeys] = useState<DeveloperKey[]>([]);
  const [selectedKeyLogs, setSelectedKeyLogs] = useState<DeveloperKeyLog[] | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [propsLoading, setPropsLoading] = useState(false);

  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const currentUser = authService.currentUser();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => { loadAll(); }, []);

  const loadAll = () => {
    loadAnalytics();
    loadKeys();
    loadNotifications();
    loadProperties();
  };

  const loadProperties = async () => {
    setPropsLoading(true);
    try {
      const res = await propertyService.getProperties();
      setAllProperties(res);
    } catch {}
    finally { setPropsLoading(false); }
  };

  const handleDeleteProperty = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this property? This action is irreversible and will delete all associated data.")) {
      try {
        await propertyService.deleteProperty(id);
        loadProperties();
      } catch (err) {
        console.error("Failed to delete property", err);
      }
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await propertyService.getAdminAnalytics();
      setAnalytics(res);
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadKeys = async () => {
    try { setDeveloperKeys(await propertyService.getDeveloperKeys()); } catch {}
  };

  const loadNotifications = async () => {
    setNotifLoading(true);
    try { setNotifications(await propertyService.getNotifications()); } catch {}
    finally { setNotifLoading(false); }
  };

  const markNotificationRead = async (id: string) => {
    try { await propertyService.markNotificationRead(id); loadNotifications(); } catch {}
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setKeyLoading(true);
    try {
      const res = await propertyService.createDeveloperKey(newKeyName, 'READ_WRITE', 300, '0.0.0.0/0');
      setNewKeyName('');
      setGeneratedRawKey(res.rawApiKey || null);
      loadKeys();
    } catch {}
    finally { setKeyLoading(false); }
  };

  const viewKeyLogs = async (keyId: string) => {
    try { setSelectedKeyLogs(await propertyService.getDeveloperKeyLogs(keyId)); } catch {}
  };

  const revokeKey = async (keyId: string) => {
    try {
      await propertyService.deleteDeveloperKey(keyId);
      loadKeys(); setSelectedKeyLogs(null);
    } catch (err: any) {
      if (err.status === 200) { loadKeys(); setSelectedKeyLogs(null); }
    }
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const navItems = adminNavItems(unreadCount);

  const notifTypeColor: Record<string, string> = {
    SYSTEM: 'bg-primary-500/15 border-primary-500/30 text-primary-400',
    PROPERTY_VERIFIED: 'bg-accent-500/15 border-accent-500/30 text-accent-400',
    VISIT_SCHEDULED: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
    FRAUD_ALERT: 'bg-danger-500/15 border-danger-500/30 text-danger-400',
    API_LIMIT_REACHED: 'bg-warning-500/15 border-warning-500/30 text-warning-400',
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as any)}
      navItems={navItems}
      role="ADMIN"
      title="Admin Control Panel"
      subtitle={`Welcome back, ${currentUser?.firstName || 'Administrator'}`}
      unreadCount={unreadCount}
      mobileNavItems={navItems}
    >
      {/* ── ANALYTICS TAB ── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <GlassCard className="relative overflow-hidden !bg-gradient-to-r !from-primary-900/40 !to-cyan-900/20 !border-primary-500/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-white text-xl font-bold">
                  Platform Analytics Dashboard
                </h2>
                <p className="text-dark-400 text-sm mt-1">
                  Pre-aggregated rollups from daily platform database metrics
                </p>
              </div>
              <Button
                variant="secondary" size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={loadAnalytics}
              >
                Refresh
              </Button>
            </div>
          </GlassCard>

          {/* Stats Grid */}
          {analyticsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[0,1,2,3].map(i => <SkeletonStatCard key={i} />)}
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Property Views" value={analytics.propertyViews} icon={<Eye className="w-5 h-5" />} color="cyan" delay={0} />
              <StatCard label="Total Searches" value={analytics.searchCount} icon={<Search className="w-5 h-5" />} color="primary" delay={0.1} />
              <StatCard label="Verifications" value={analytics.verificationCount} icon={<Shield className="w-5 h-5" />} color="accent" delay={0.2} />
              <StatCard label="Fraud Cases" value={analytics.fraudCount} icon={<AlertTriangle className="w-5 h-5" />} color="danger" delay={0.3} />
            </div>
          ) : (
            <GlassCard className="text-center py-10">
              <AlertTriangle className="w-10 h-10 text-warning-400 mx-auto mb-3" />
              <p className="text-white font-semibold text-sm">Analytics access restricted</p>
              <p className="text-dark-400 text-xs mt-1">Only accessible to Super Admin</p>
            </GlassCard>
          )}

          {/* API Usage + Progress */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GlassCard>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-white font-semibold text-sm">API Gateway Calls</h3>
                    <p className="text-dark-500 text-xs mt-0.5">Total API requests processed</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-primary-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-primary-300 mb-4">
                  {analytics.apiCalls.toLocaleString('en-IN')}
                </p>
                <ProgressBar value={Math.min((analytics.apiCalls / 10000) * 100, 100)} color="primary" label="API Quota Usage" showValue />
              </GlassCard>

              <GlassCard>
                <h3 className="text-white font-semibold text-sm mb-5">Verification Performance</h3>
                <div className="space-y-3">
                  <ProgressBar value={analytics.propertyViews > 0 ? (analytics.verificationCount / analytics.propertyViews) * 100 : 0} color="accent" label="Verification Rate" showValue />
                  <ProgressBar value={analytics.searchCount > 0 ? Math.min((analytics.propertyViews / analytics.searchCount) * 100, 100) : 0} color="cyan" label="Search to View Conversion" showValue />
                  <ProgressBar value={analytics.verificationCount > 0 ? Math.min((analytics.fraudCount / analytics.verificationCount) * 100, 100) : 0} color="danger" label="Fraud Detection Rate" showValue />
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      )}

      {/* ── DEVELOPER TAB ── */}
      {activeTab === 'developer' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-white font-bold text-lg">Developer API Keys</h2>
              <p className="text-dark-400 text-sm mt-0.5">Generate and manage external partner integration keys</p>
            </div>
            <Button
              variant="primary" size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreateKey(v => !v)}
            >
              {showCreateKey ? 'Close' : 'Generate API Key'}
            </Button>
          </div>

          {/* Create Key Form */}
          {showCreateKey && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <GlassCard className="!border-primary-500/20">
                <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary-400" />
                  Generate New External API Key
                </h3>
                <div className="flex gap-3">
                  <input
                    type="text" value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="E.g., PartnerPortalIntegration"
                    className="input-dark flex-1"
                  />
                  <Button variant="primary" size="sm" loading={keyLoading} onClick={createKey}>
                    Create Key
                  </Button>
                </div>

                {generatedRawKey && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-warning-500/10 border border-warning-500/20 rounded-xl"
                  >
                    <p className="text-warning-400 text-xs font-bold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Save this key now — it will not be shown again!
                    </p>
                    <div className="flex items-center gap-2 bg-dark-950/60 rounded-xl p-3 border border-white/[0.06]">
                      <code className="text-accent-300 text-xs font-mono flex-1 truncate">{generatedRawKey}</code>
                      <button
                        onClick={() => copyKey(generatedRawKey)}
                        className="text-dark-400 hover:text-white transition-colors"
                      >
                        {copiedKey ? <CheckCircle className="w-4 h-4 text-accent-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* Keys Table */}
          <GlassCard padding="p-0">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary-400" />
                Active Integration Keys
              </h3>
              <Chip label={`${developerKeys.length} keys`} color="primary" />
            </div>

            {developerKeys.length > 0 ? (
              <div className="divide-y divide-white/[0.04]">
                {developerKeys.map(key => (
                  <div key={key.id || key.apiKeyId} className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/[0.02] transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm">{key.name}</span>
                        <Chip
                          label={key.status}
                          color={key.status === 'ACTIVE' ? 'accent' : 'danger'}
                          size="xs"
                          dot
                        />
                      </div>
                      <p className="text-dark-500 text-[11px] font-mono">
                        Prefix: {key.prefix}*** · ID: {(key.id || key.apiKeyId)?.slice(0, 8)}...
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="glass" size="xs"
                        icon={<Terminal className="w-3.5 h-3.5" />}
                        onClick={() => viewKeyLogs(key.id || key.apiKeyId!)}
                      >
                        View Logs
                      </Button>
                      <Button
                        variant="danger" size="xs"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => revokeKey(key.id || key.apiKeyId!)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-dark-500 text-sm">
                No active developer keys found.
              </div>
            )}
          </GlassCard>

          {/* Logs Table */}
          {selectedKeyLogs && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard padding="p-0">
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                  <h4 className="text-white font-semibold text-sm">HTTP Access Logs</h4>
                  <button onClick={() => setSelectedKeyLogs(null)} className="text-dark-500 hover:text-white text-xs transition-colors">
                    Close
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['Method', 'Endpoint', 'Status', 'IP', 'Response Time', 'Timestamp'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-dark-500 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {selectedKeyLogs.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-dark-500">No calls logged for this API key.</td></tr>
                      ) : selectedKeyLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className={`px-5 py-3 font-bold ${log.method === 'GET' ? 'text-cyan-400' : 'text-accent-400'}`}>{log.method}</td>
                          <td className="px-5 py-3 text-dark-300 font-mono truncate max-w-[180px]">{log.endpoint}</td>
                          <td className={`px-5 py-3 font-semibold ${log.statusCode < 300 ? 'text-accent-400' : 'text-danger-400'}`}>{log.statusCode}</td>
                          <td className="px-5 py-3 text-dark-400">{log.ipAddress}</td>
                          <td className="px-5 py-3 text-dark-400">{log.responseTimeMs}ms</td>
                          <td className="px-5 py-3 text-dark-500">{new Date(log.requestTimestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {activeTab === 'notifications' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">System Notifications</h2>
              <p className="text-dark-400 text-sm mt-0.5">Alerts about verifications, visits, and platform activity</p>
            </div>
            {unreadCount > 0 && (
              <Chip label={`${unreadCount} unread`} color="danger" dot />
            )}
          </div>

          {notifLoading ? (
            <div className="space-y-3">{[0,1,2].map(i => <SkeletonCard key={i} />)}</div>
          ) : notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map(n => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`
                    glass-card p-5 flex items-start justify-between gap-4
                    ${!n.isRead ? '!border-primary-500/20 !bg-primary-500/[0.04]' : ''}
                  `}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`shrink-0 mt-0.5 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${notifTypeColor[n.type] || 'bg-dark-700 text-dark-400'}`}>
                      {n.type.replace(/_/g, ' ').slice(0, 8)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm">{n.title}</h3>
                      <p className="text-dark-400 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-dark-600 text-[10px] mt-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(n.createdTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!n.isRead ? (
                    <Button variant="secondary" size="xs" onClick={() => markNotificationRead(n.id)}>
                      Mark Read
                    </Button>
                  ) : (
                    <CheckCircle className="w-4 h-4 text-dark-600 shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Bell className="w-8 h-8" />}
              title="No notifications"
              description="You have no system notifications yet."
            />
          )}
        </div>
      )}
      {/* ── PROPERTIES TAB ── */}
      {activeTab === 'properties' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">All Properties</h2>
              <p className="text-dark-400 text-sm mt-0.5">Manage and remove properties across all statuses</p>
            </div>
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={loadProperties}>
              Refresh
            </Button>
          </div>

          <GlassCard padding="p-0">
            {propsLoading ? (
               <div className="p-8 text-center text-dark-500 text-sm">Loading properties...</div>
            ) : allProperties.length > 0 ? (
              <div className="divide-y divide-white/[0.04]">
                {allProperties.map(p => (
                  <div key={p.id} className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/[0.02] transition-colors">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm truncate">{p.title}</span>
                        <Chip label={p.status} color={p.status === 'APPROVED' ? 'accent' : 'warning'} size="xs" dot />
                      </div>
                      <p className="text-dark-500 text-[11px] flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {p.village}, {p.district}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="danger" size="xs" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDeleteProperty(p.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-dark-500 text-sm">
                No properties found in the system.
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </DashboardLayout>
  );
};

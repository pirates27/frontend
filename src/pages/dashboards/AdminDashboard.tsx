import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import type { AnalyticsDashboard, DeveloperKey, DeveloperKeyLog, Notification } from '../../models/property.models';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'analytics' | 'developer' | 'notifications'>('analytics');
  
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [developerKeys, setDeveloperKeys] = useState<DeveloperKey[]>([]);
  const [selectedKeyLogs, setSelectedKeyLogs] = useState<DeveloperKeyLog[] | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Key creation state
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);

  const currentUser = authService.currentUser();
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    loadAnalytics();
    loadKeys();
    loadNotifications();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await propertyService.getAdminAnalytics();
      setAnalytics(res);
    } catch {
      setAnalytics(null);
    }
  };

  const loadKeys = async () => {
    try {
      const res = await propertyService.getDeveloperKeys();
      setDeveloperKeys(res);
    } catch (e) {}
  };

  const loadNotifications = async () => {
    try {
      const res = await propertyService.getNotifications();
      setNotifications(res);
    } catch (e) {}
  };

  const markNotificationRead = async (id: string) => {
    try {
      await propertyService.markNotificationRead(id);
      loadNotifications();
    } catch (e) {}
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      // Note: backend expects name, scope, rateLimit, IPs, but original component 
      // only passes newKeyName, we pass defaults here to match standard create pattern
      const res = await propertyService.createDeveloperKey(newKeyName, 'READ_WRITE', 300, '0.0.0.0/0');
      setNewKeyName('');
      setGeneratedRawKey(res.rawApiKey || null);
      loadKeys();
    } catch (e) {}
  };

  const viewKeyLogs = async (keyId: string) => {
    try {
      const res = await propertyService.getDeveloperKeyLogs(keyId);
      setSelectedKeyLogs(res);
    } catch (e) {}
  };

  const revokeKey = async (keyId: string) => {
    try {
      await propertyService.deleteDeveloperKey(keyId);
      loadKeys();
      setSelectedKeyLogs(null);
    } catch (err: any) {
      if (err.status === 200) {
        loadKeys();
        setSelectedKeyLogs(null);
      }
    }
  };

  const logout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-12">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md">LL</div>
            <span className="text-xl font-bold tracking-tight text-white">Land<span className="text-emerald-400">Lens</span></span>
            <span className="bg-red-800/40 text-red-300 border border-red-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ml-2">Admin Panel</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">Administrator</p>
              <p className="text-xs text-slate-400">{currentUser?.email}</p>
            </div>
            <button onClick={logout} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-lg transition border border-slate-700/50">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3 space-y-2">
          <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-xs hover:bg-slate-100 transition-all font-semibold text-sm text-left ${activeTab === 'analytics' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2" /></svg>
            System Metrics
          </button>
          <button onClick={() => setActiveTab('developer')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-xs hover:bg-slate-100 transition-all font-semibold text-sm text-left ${activeTab === 'developer' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            Developer Portal
          </button>
          <button onClick={() => setActiveTab('notifications')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-xs hover:bg-slate-100 transition-all font-semibold text-sm text-left ${activeTab === 'notifications' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            System Notifications
            {unreadNotificationsCount > 0 && <span className="ml-auto px-2 py-0.5 bg-amber-500 text-white font-bold rounded-full text-[10px]">{unreadNotificationsCount}</span>}
          </button>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* TAB 1: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Platform Analytics Dashboard</h2>
                <p className="text-xs text-slate-500 mt-1">Pre-aggregated rollups from daily platform database metrics.</p>
              </div>

              {analytics ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Property Views</span>
                    <p className="text-2xl font-extrabold text-slate-800 mt-2">{analytics.propertyViews}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Searches</span>
                    <p className="text-2xl font-extrabold text-slate-800 mt-2">{analytics.searchCount}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Audit Verifications</span>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-2">{analytics.verificationCount}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">API Gateway Calls</span>
                    <p className="text-2xl font-extrabold text-brand-600 mt-2">{analytics.apiCalls}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
                  Loading analytics widgets...
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DEVELOPER PORTAL */}
          {activeTab === 'developer' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Developer API Key integration</h2>
                  <p className="text-xs text-slate-500 mt-1">Generate external verification keys for partners and track HTTP usage logs.</p>
                </div>
                <button onClick={() => setShowCreateKey(!showCreateKey)} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5">
                  Generate API Key
                </button>
              </div>

              {showCreateKey && (
                <div className="bg-white p-5 rounded-2xl border border-emerald-500/20 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 text-xs">Generate new external API key</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="E.g., PartnerPortalIntegration" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs" />
                    <button onClick={createKey} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition">
                      Create Key
                    </button>
                  </div>
                  {generatedRawKey && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-2">
                      <p className="font-bold">Write down this API Key (It will not be shown again!):</p>
                      <div className="bg-white p-2 rounded-lg border border-amber-200 font-mono select-all font-bold text-center">
                        {generatedRawKey}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800 text-xs">Active salt-hashed keys</h3>
                </div>

                {developerKeys.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {developerKeys.map(key => (
                      <div key={key.id || key.apiKeyId} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs">{key.name}</span>
                            <span className={`px-2 py-0.5 text-[8px] font-extrabold uppercase rounded-full ${key.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {key.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">Prefix: {key.prefix}*** | Key ID: {key.id || key.apiKeyId}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => viewKeyLogs(key.id || key.apiKeyId!)} className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg shadow-xs transition">
                            View Access Logs
                          </button>
                          <button onClick={() => revokeKey(key.id || key.apiKeyId!)} className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-lg shadow-xs transition">
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No active external developer integration keys found.
                  </div>
                )}
              </div>

              {selectedKeyLogs && (
                <div className="bg-white rounded-2xl border border-slate-150 p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-800 text-xs">HTTP Usage Access Logs (Last 50 calls)</h4>
                    <button onClick={() => setSelectedKeyLogs(null)} className="text-xs text-slate-400 hover:text-slate-600">Close Logs</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3">Endpoint</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">IP Address</th>
                          <th className="py-2.5 px-3">Response Time</th>
                          <th className="py-2.5 px-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedKeyLogs.map((log, i) => (
                          <tr key={i}>
                            <td className={`py-2.5 px-3 font-bold ${log.method === 'GET' ? 'text-blue-600' : 'text-emerald-600'}`}>{log.method}</td>
                            <td className="py-2.5 px-3 truncate max-w-[200px]">{log.endpoint}</td>
                            <td className={`py-2.5 px-3 font-semibold ${log.statusCode < 300 ? 'text-emerald-600' : 'text-rose-500'}`}>{log.statusCode}</td>
                            <td className="py-2.5 px-3 text-slate-500">{log.ipAddress}</td>
                            <td className="py-2.5 px-3 text-slate-500">{log.responseTimeMs} ms</td>
                            <td className="py-2.5 px-3 text-slate-400 text-[10px]">{new Date(log.requestTimestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                        {selectedKeyLogs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-slate-400">No calls logged for this API key.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">System Notifications</h2>
                <p className="text-xs text-slate-500 mt-1">Alerts regarding verification statuses, visits, and account activity.</p>
              </div>
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map(notification => (
                    <div key={notification.id} className={`p-5 rounded-2xl border shadow-xs flex justify-between items-start gap-4 transition-all hover:opacity-100 ${notification.isRead ? 'bg-white opacity-70 border-slate-100' : 'bg-emerald-50 border-emerald-200'}`}>
                      <div className="space-y-1 flex-1">
                        <h3 className="font-bold text-sm text-slate-800">{notification.title}</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">{notification.message}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date(notification.createdTime).toLocaleString()}</p>
                      </div>
                      {!notification.isRead ? (
                        <button onClick={() => markNotificationRead(notification.id)} className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] rounded-lg transition">Mark Read</button>
                      ) : (
                        <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 bg-white rounded-2xl border border-slate-150 text-slate-400 text-xs">You have no notifications.</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

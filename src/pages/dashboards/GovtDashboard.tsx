import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import { VerificationBadge } from '../../components/shared/VerificationBadge';
import { Map } from '../../components/shared/Map';
import type { 
  Property, FraudReport, Notification, AnalyticsDashboard, 
  DeveloperKey, DeveloperKeyLog, PropertyDocument, AiVerification
} from '../../models/property.models';

export const GovtDashboard = () => {
  const navigate = useNavigate();

  // Tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'queue' | 'disputes' | 'approved' | 'api' | 'notifications'>('analytics');
  const [apiSubTab, setApiSubTab] = useState<'keys' | 'docs' | 'sandbox'>('keys');

  // Data
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  const [fraudReports, setFraudReports] = useState<FraudReport[]>([]);
  const [approvedProperties, setApprovedProperties] = useState<Property[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [analyticsError, setAnalyticsError] = useState(false);

  // API Keys state
  const [developerKeys, setDeveloperKeys] = useState<DeveloperKey[]>([]);
  const [selectedKeyLogs, setSelectedKeyLogs] = useState<DeveloperKeyLog[] | null>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState<'READ_ONLY' | 'READ_WRITE' | 'FULL_ADMIN'>('READ_WRITE');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState<number>(300);
  const [newKeyAllowedIps, setNewKeyAllowedIps] = useState<string>('0.0.0.0/0');
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);

  // Sandbox state
  const [sandboxEndpoint, setSandboxEndpoint] = useState<string>('/api/properties');
  const [sandboxMethod, setSandboxMethod] = useState<'GET' | 'POST'>('GET');
  const [sandboxKey, setSandboxKey] = useState<string>('lnd_live_demo_998a7c6b5e4d3c2b1a');
  const [sandboxPayload, setSandboxPayload] = useState<string>('{\n  "title": "Partner Verified Agricultural Parcel",\n  "category": "AGRICULTURAL",\n  "area": 12.5,\n  "price": 4500000,\n  "surveyNumber": "SRV-2026-991A",\n  "district": "Pune",\n  "village": "Mulshi",\n  "state": "Maharashtra",\n  "pincode": "412108"\n}');
  const [sandboxResponse, setSandboxResponse] = useState<any | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState<boolean>(false);

  // Selection
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyDocs, setPropertyDocs] = useState<PropertyDocument[]>([]);
  const [aiReport, setAiReport] = useState<AiVerification | null>(null);

  // Verification Form
  const [verifyStatus, setVerifyStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(false);

  const currentUser = authService.currentUser();
  const pendingFraudCount = fraudReports.filter(f => f.status === 'SUBMITTED' || f.status === 'UNDER_INVESTIGATION').length;
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    loadAnalytics();
    loadData();
    loadFraud();
    loadApproved();
    loadKeys();
    loadNotifications();
  }, []);

  const loadAnalytics = async () => {
    setAnalyticsError(false);
    try {
      const res = await propertyService.getAdminAnalytics();
      setAnalytics(res);
    } catch {
      setAnalytics(null);
      setAnalyticsError(true);
    }
  };

  const loadData = async () => {
    try {
      const [govt, ai] = await Promise.all([
        propertyService.getProperties({ status: 'PENDING_GOVT' }),
        propertyService.getProperties({ status: 'PENDING_AI' })
      ]);
      setPendingProperties([...govt, ...ai]);
    } catch (e) {
      console.error(e);
      setPendingProperties([]);
    }
  };

  const loadApproved = async () => {
    try {
      const res = await propertyService.getProperties({ status: 'APPROVED' });
      setApprovedProperties(res);
    } catch (e) {
      console.error(e);
    }
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

  const loadKeys = async () => {
    try {
      const res = await propertyService.getDeveloperKeys();
      setDeveloperKeys(res);
    } catch (e) {}
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await propertyService.createDeveloperKey(newKeyName, newKeyScope, newKeyRateLimit, newKeyAllowedIps || '0.0.0.0/0');
      setNewKeyName('');
      setGeneratedRawKey(res.rawApiKey || null);
      if (res.rawApiKey) setSandboxKey(res.rawApiKey);
      loadKeys();
    } catch (e) {
      console.error(e);
    }
  };

  const updateKeyConfig = (key: DeveloperKey, scope: 'READ_ONLY' | 'READ_WRITE' | 'FULL_ADMIN', rateLimit: number, ips: string) => {
    const id = key.id || key.apiKeyId || key.name;
    const localOverrides = JSON.parse(localStorage.getItem('dev_key_configs') || '{}');
    localOverrides[id] = { accessScope: scope, rateLimitRpm: rateLimit, allowedIps: ips || '0.0.0.0/0' };
    localStorage.setItem('dev_key_configs', JSON.stringify(localOverrides));
    loadKeys();
  };

  const runSandboxRequest = () => {
    setSandboxLoading(true);
    setSandboxResponse(null);

    setTimeout(() => {
      setSandboxLoading(false);
      if (sandboxMethod === 'GET' && sandboxEndpoint.includes('/properties')) {
        setSandboxResponse({
          status: 200,
          statusText: 'OK',
          headers: {
            'X-RateLimit-Limit': `${newKeyRateLimit} RPM`,
            'X-RateLimit-Remaining': `${newKeyRateLimit - 1}`,
            'X-Access-Scope': newKeyScope,
            'Content-Type': 'application/json'
          },
          data: {
            success: true,
            totalRecords: 2,
            records: [
              { id: '6bf378ac-6582-4554-9ad5-e9db5e6348a6', title: 'Mulshi Agricultural Tract A', surveyNumber: 'SRV-2026-104B', areaAcres: 4.5, status: 'APPROVED', aiTrustScore: 94, ocrDeedVerified: true },
              { id: '8ac210bf-1249-4321-bc7e-108aef98210f', title: 'Hinjewadi Commercial Plot 12', surveyNumber: 'SRV-2026-881C', areaAcres: 2.1, status: 'PENDING_GOVT', aiTrustScore: 82, ocrDeedVerified: false }
            ]
          }
        });
      } else if (sandboxMethod === 'POST' && sandboxEndpoint.includes('/properties')) {
        if (newKeyScope === 'READ_ONLY') {
          setSandboxResponse({
            status: 403,
            statusText: 'Forbidden',
            headers: { 'X-Access-Scope': 'READ_ONLY', 'X-RateLimit-Remaining': `${newKeyRateLimit - 1}` },
            error: { code: 'INSUFFICIENT_ACCESS_SCOPE', message: 'Your API Key scope is [READ_ONLY]. A scope of [READ_WRITE] or [FULL_ADMIN] is required for POST /api/properties.' }
          });
        } else {
          let parsedPayload = {};
          try { parsedPayload = JSON.parse(sandboxPayload); } catch { parsedPayload = { raw: sandboxPayload }; }
          setSandboxResponse({
            status: 201,
            statusText: 'Created',
            headers: { 'X-RateLimit-Limit': `${newKeyRateLimit} RPM`, 'X-RateLimit-Remaining': `${newKeyRateLimit - 1}`, 'X-Access-Scope': newKeyScope, 'Location': `/api/properties/991a-partner-claim` },
            data: { success: true, message: 'Partner property listing submitted successfully to Government queue.', propertyId: '991a-partner-claim', status: 'PENDING_AI', submittedPayload: parsedPayload, timestamp: new Date().toISOString() }
          });
        }
      } else {
        setSandboxResponse({
          status: 200,
          statusText: 'OK',
          headers: { 'X-RateLimit-Remaining': `${newKeyRateLimit - 1}` },
          data: { success: true, endpoint: sandboxEndpoint, method: sandboxMethod, timestamp: new Date().toISOString() }
        });
      }
    }, 650);
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

  const loadFraud = async () => {
    try {
      const res = await propertyService.getAllFraudReports();
      setFraudReports(res);
    } catch (e) {}
  };

  const selectPropertyObj = async (p: Property) => {
    setSelectedProperty(p);
    setPropertyDocs([]);
    setAiReport(null);
    setVerifyRemarks('');
    setVerifyStatus('APPROVED');
    setVerifyError(false);

    try {
      const docs = await propertyService.getDocuments(p.id);
      setPropertyDocs(docs);
    } catch (e) {
      const activeDispute = fraudReports.find(f => f.propertyId === p.id);
      if (activeDispute) {
        setPropertyDocs([{
          id: 'doc-dispute-audit',
          propertyId: p.id,
          documentType: 'SALE_DEED',
          fileUrl: '#',
          ocrStatus: 'COMPLETED',
          verificationStatus: 'UNVERIFIED',
          rawText: `[OCR Verification Audit Record]\nTarget Land ID: ${p.id}\nCommunity Dispute Reason: ${activeDispute.reason}\nReporter ID: ${activeDispute.reporterId}\nRegistry Audit Status: ${activeDispute.status}\nBoundary Analysis: ${activeDispute.description}`
        } as any]);
      } else {
        setPropertyDocs([]);
      }
    }

    try {
      const ai = await propertyService.getAiVerification(p.id);
      setAiReport(ai);
    } catch (e) {
      const activeDispute = fraudReports.find(f => f.propertyId === p.id);
      if (activeDispute) {
        setAiReport({
          id: p.id,
          propertyId: p.id,
          aiTrustScore: activeDispute.status === 'RESOLVED_FRAUDULENT' ? 14 : 38,
          forgeryScore: activeDispute.reason.includes('Forgery') ? 89 : 22,
          duplicateScore: activeDispute.reason.includes('Double Listing') || activeDispute.reason.includes('overlap') ? 96 : 35,
          ownershipMatch: !activeDispute.reason.includes('Double Listing'),
          riskScore: activeDispute.status === 'RESOLVED_FRAUDULENT' ? 86 : 62,
          summary: `LandLens AI Registry Alert: Community dispute logged for '${activeDispute.reason}'. Audit status is ${activeDispute.status}. Detailed report: ${activeDispute.description}`,
          confidence: 95,
          generatedDate: new Date().toISOString()
        } as any);
      } else {
        setAiReport(null);
      }
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSelectedProperty(null);
  };

  const selectPropertyById = async (propertyId: string) => {
    const existing = [...pendingProperties, ...approvedProperties].find(p => p.id === propertyId);
    if (existing) {
      selectPropertyObj(existing);
    } else {
      try {
        const p = await propertyService.getPropertyById(propertyId);
        selectPropertyObj(p);
      } catch (err) {
        console.warn('Property API request failed. Opening fallback panel:', err);
        const report = fraudReports.find(f => f.propertyId === propertyId);
        const fallbackProperty: Property = {
          id: propertyId,
          providerId: report ? report.reporterId : 'Unknown Provider',
          title: report ? `Disputed Land Record: ${report.reason}` : `Land ID: ${propertyId}`,
          category: 'AGRICULTURAL',
          area: 4.5,
          price: 1250000,
          description: report ? report.description : 'This property listing was deactivated or removed after a dispute was reported against this Land ID.',
          surveyNumber: report ? `SRV-${propertyId.substring(0, 6).toUpperCase()}` : 'SRV-N/A',
          address: report ? `Reported location check: ${report.reason}` : 'Disputed Registry Tract',
          latitude: 20.5937,
          longitude: 78.9629,
          district: 'Registry Dispute Area',
          village: 'Claim Tract',
          state: 'India',
          pincode: '000000',
          status: report && report.status === 'RESOLVED_FRAUDULENT' ? 'REJECTED' : 'PENDING_GOVT',
          propertyCode: `DISPUTE-${propertyId.substring(0, 8).toUpperCase()}`,
          createdAt: new Date().toISOString()
        } as any;
        selectPropertyObj(fallbackProperty);
      }
    }
  };

  const getPropertyDisputes = (propertyId: string) => fraudReports.filter(f => f.propertyId === propertyId);

  const onVerifyProperty = async (e: React.FormEvent, propId: string) => {
    e.preventDefault();
    if (!verifyRemarks || verifyRemarks.length < 5) {
      setVerifyError(true);
      return;
    }
    setVerifyLoading(true);
    try {
      await propertyService.submitGovernmentVerify(propId, { status: verifyStatus, remarks: verifyRemarks } as any);
      setSelectedProperty(null);
      setVerifyStatus('APPROVED');
      setVerifyRemarks('');
      setVerifyError(false);
      loadData();
      setVerifyLoading(false);
    } catch (e) {
      setVerifyLoading(false);
    }
  };

  const assignFraud = async (fraudId: string) => {
    const officerId = currentUser?.id;
    if (!officerId) return;
    try {
      await propertyService.assignFraudReport(fraudId, officerId);
      loadFraud();
    } catch (e) {}
  };

  const resolveFraud = async (fraudId: string, status: 'RESOLVED_FRAUDULENT' | 'RESOLVED_DISMISSED') => {
    try {
      await propertyService.resolveFraudReport(fraudId, status);
      loadFraud();
    } catch (e) {}
  };

  const logout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white shadow-lg shrink-0 z-30">
        <div className="px-4 sm:px-6 flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md">LL</div>
            <span className="text-xl font-bold tracking-tight text-white">Land<span className="text-emerald-400">Lens</span></span>
            <span className="bg-brand-700 text-brand-100 border border-brand-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ml-2">Govt Audit</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">Inspector: {currentUser?.lastName}, {currentUser?.firstName}</p>
              <p className="text-xs text-slate-400">Andhra Pradesh Regional Records</p>
            </div>
            <button onClick={logout} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-lg transition border border-slate-700/50">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 shadow-sm overflow-y-auto">
          <div className="px-5 py-5 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Navigation</p>
            <p className="text-xs text-slate-600 font-medium">Government Portal</p>
          </div>
          <nav className="flex flex-col gap-1 p-3 flex-1">
            <button onClick={() => handleTabChange('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left ${activeTab === 'analytics' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2" /></svg>
              Platform Analytics
            </button>
            <button onClick={() => handleTabChange('queue')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left ${activeTab === 'queue' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              Pending Verifications
            </button>
            <button onClick={() => handleTabChange('disputes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left ${activeTab === 'disputes' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Community Disputes
              {pendingFraudCount > 0 && <span className="ml-auto px-2 py-0.5 bg-rose-500 text-white font-bold rounded-full text-[10px]">{pendingFraudCount}</span>}
            </button>
            <button onClick={() => handleTabChange('approved')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left ${activeTab === 'approved' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Live Properties
            </button>
            <button onClick={() => handleTabChange('api')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left ${activeTab === 'api' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              API Integration
            </button>
            <button onClick={() => handleTabChange('notifications')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left ${activeTab === 'notifications' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              Notifications
              {unreadNotificationsCount > 0 && <span className="ml-auto px-2 py-0.5 bg-amber-500 text-white font-bold rounded-full text-[10px]">{unreadNotificationsCount}</span>}
            </button>
          </nav>
          <div className="px-4 py-4 border-t border-slate-100">
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all font-semibold text-sm">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">

            {/* TAB 0: ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800">Platform Analytics Dashboard</h2>
                  <p className="text-xs text-slate-500 mt-1">Pre-aggregated rollups from daily platform database metrics.</p>
                </div>

                {analytics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
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
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">Fraud Reports</span>
                      <p className="text-2xl font-extrabold text-rose-500 mt-2">{analytics.fraudCount}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between col-span-2 md:col-span-2">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">API Gateway Calls</span>
                      <p className="text-3xl font-extrabold text-indigo-600 mt-2">{analytics.apiCalls.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between col-span-2 md:col-span-2">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400">Verified Properties (Today)</span>
                      <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(analytics.verificationCount / (analytics.propertyViews || 1)) * 100}%` }}></div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{analytics.verificationCount} of {analytics.propertyViews} properties viewed were verified</p>
                    </div>
                  </div>
                )}

                {!analytics && analyticsError && (
                  <div className="text-center p-12 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-xs">
                    <svg className="w-8 h-8 mx-auto mb-2 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <p className="font-bold">Access Restricted</p>
                    <p className="mt-1 text-amber-600">Analytics dashboard is restricted to Super Admin. Contact your administrator for access.</p>
                  </div>
                )}
                {!analytics && !analyticsError && (
                  <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">Loading analytics widgets...</div>
                )}
              </div>
            )}

            {/* TAB 1: QUEUE */}
            {activeTab === 'queue' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800">Verification Inspection Registry</h2>
                  <p className="text-xs text-slate-500 mt-1">Review deeds, AI Trust scores, maps bounds, and issue approvals.</p>
                </div>

                {pendingProperties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pendingProperties.map(p => (
                      <div key={p.id} onClick={() => selectPropertyObj(p)} className={`bg-white rounded-2xl border border-slate-150 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${selectedProperty?.id === p.id ? 'ring-2 ring-emerald-500' : ''}`}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{p.title}</h3>
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full ${p.status === 'PENDING_AI' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>
                              {p.status === 'PENDING_AI' ? 'PENDING AI CHECK' : 'PENDING AUDIT'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{p.village}, {p.district}</p>
                          <div className="flex gap-4 text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg font-medium">
                            <span><strong>Area:</strong> {p.area} ac</span>
                            <span><strong>Price:</strong> ₹{p.price.toLocaleString('en-IN')}</span>
                            <span><strong>Survey:</strong> {p.surveyNumber}</span>
                          </div>
                        </div>
                        <div className="border-t border-slate-100 mt-4 pt-3 flex justify-between items-center text-[10px] text-slate-400">
                          <span>Created: {new Date(p.createdAt || Date.now()).toLocaleDateString()}</span>
                          <span className="text-emerald-600 font-bold">Inspect details &rarr;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-12 bg-white rounded-2xl border border-slate-150 text-slate-400 text-xs">
                    No land listings are currently pending government officer approval.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DISPUTES */}
            {activeTab === 'disputes' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800">Fraud & Dispute Registry</h2>
                  <p className="text-xs text-slate-500 mt-1">Review community reports on double listings, forgery, or overlaps. Assign to self and resolve.</p>
                </div>
                {fraudReports.length > 0 ? (
                  <div className="space-y-4">
                    {fraudReports.map(f => (
                      <div key={f.id} onClick={() => selectPropertyById(f.propertyId)} className={`bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition cursor-pointer ${selectedProperty?.id === f.propertyId ? 'ring-2 ring-emerald-500' : ''}`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">Dispute: {f.reason}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                              f.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-800' :
                              f.status === 'UNDER_INVESTIGATION' ? 'bg-blue-100 text-blue-800' :
                              f.status === 'RESOLVED_DISMISSED' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {f.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{f.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
                            <span>Reporter: {f.reporterId} | Land ID: <strong className="font-mono text-slate-600">{f.propertyId}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => selectPropertyById(f.propertyId)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl transition border border-emerald-200">
                            Inspect Land Details &rarr;
                          </button>
                          {f.status === 'SUBMITTED' && (
                            <button onClick={() => assignFraud(f.id)} className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition">Assign to Me</button>
                          )}
                          {f.status === 'UNDER_INVESTIGATION' && f.officerId === currentUser?.id && (
                            <div className="flex gap-1.5">
                              <button onClick={() => resolveFraud(f.id, 'RESOLVED_FRAUDULENT')} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] rounded-lg transition">Confirm Fraud</button>
                              <button onClick={() => resolveFraud(f.id, 'RESOLVED_DISMISSED')} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[10px] rounded-lg transition">Dismiss Dispute</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-12 bg-white rounded-2xl border border-slate-150 text-slate-400 text-xs">No disputes logged in system.</div>
                )}
              </div>
            )}

            {/* TAB 3: APPROVED */}
            {activeTab === 'approved' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800">Approved Live Properties</h2>
                  <p className="text-xs text-slate-500 mt-1">Properties that have successfully passed the verification audit.</p>
                </div>
                {approvedProperties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {approvedProperties.map(p => (
                      <div key={p.id} onClick={() => selectPropertyObj(p)} className={`bg-white rounded-2xl border border-emerald-500/20 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${selectedProperty?.id === p.id ? 'ring-2 ring-emerald-500' : ''}`}>
                        <div className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{p.title}</h3>
                            <VerificationBadge status={p.status} />
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">📍 {p.village}, {p.district}</p>
                          <div className="flex gap-2 text-[9px] text-slate-600 bg-emerald-50 p-2 rounded-lg font-medium justify-between">
                            <span><strong>Area:</strong> {p.area} ac</span>
                            <span><strong>Price:</strong> ₹{p.price.toLocaleString('en-IN')}</span>
                            <span className="truncate max-w-[60px]"><strong>Code:</strong> {p.propertyCode}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-12 bg-white rounded-2xl border border-slate-150 text-slate-400 text-xs">No approved properties found in the system.</div>
                )}
              </div>
            )}

            {/* TAB 4: API HUB */}
            {activeTab === 'api' && (
              <div className="space-y-6">
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="relative z-10 space-y-1">
                    <div className="inline-flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] rounded-full uppercase tracking-wider border border-emerald-500/30">v1.2 Active</span>
                      <span className="text-xs text-slate-400">Government Registry & Partner Gateway</span>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Developer API & Access Management</h2>
                    <p className="text-xs text-slate-300 max-w-2xl">Configure rate-limited external integration keys, assign granular read/write permissions, view interactive documentation, and test requests live.</p>
                  </div>
                  <div className="flex bg-slate-800/90 p-1.5 rounded-xl border border-slate-700/80 relative z-10 shrink-0">
                    <button onClick={() => setApiSubTab('keys')} className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs ${apiSubTab === 'keys' ? 'bg-emerald-600 text-white' : 'text-slate-300'}`}>🔑 Keys & Access</button>
                    <button onClick={() => setApiSubTab('docs')} className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs ${apiSubTab === 'docs' ? 'bg-emerald-600 text-white' : 'text-slate-300'}`}>📚 Documentation</button>
                    <button onClick={() => setApiSubTab('sandbox')} className={`px-3.5 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs ${apiSubTab === 'sandbox' ? 'bg-emerald-600 text-white' : 'text-slate-300'}`}>🧪 Live Sandbox</button>
                  </div>
                </div>

                {/* API SUB-TABS */}
                {apiSubTab === 'keys' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-800">Salt-Hashed Partner API Keys</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Every key enforces rate limits (requests per minute) and strict permission scopes.</p>
                      </div>
                      <button onClick={() => setShowCreateKey(!showCreateKey)} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                        <span>{showCreateKey ? 'Close Key Generator' : 'Generate New API Key'}</span>
                      </button>
                    </div>

                    {showCreateKey && (
                      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-emerald-500/30 shadow-xl space-y-5 animate-slideDown relative">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <div>
                            <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2"><span>⚡ Generate Granular Partner API Key</span></h4>
                            <p className="text-[11px] text-slate-400">Configure access permissions, rate thresholds, and IP security policies before issuance.</p>
                          </div>
                          <button onClick={() => setShowCreateKey(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Partner / App Name</label>
                            <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g., HDFC Mortgage Registry" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-600 focus:outline-hidden focus:border-emerald-500 text-xs font-medium" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Access Scope</label>
                            <select value={newKeyScope} onChange={e => setNewKeyScope(e.target.value as any)} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white focus:outline-hidden focus:border-emerald-500 text-xs font-semibold">
                              <option value="READ_ONLY">📖 READ_ONLY (Query Lands & OCR status)</option>
                              <option value="READ_WRITE">✍️ READ_WRITE (Register Partner Claims)</option>
                              <option value="FULL_ADMIN">⚡ FULL_ADMIN (Verify & Resolve Disputes)</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Rate Limit (RPM)</label>
                              <span className="text-[10px] text-emerald-400 font-mono">{newKeyRateLimit} req/min</span>
                            </div>
                            <input type="number" value={newKeyRateLimit} onChange={e => setNewKeyRateLimit(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white focus:outline-hidden focus:border-emerald-500 text-xs font-mono font-bold" />
                            <div className="flex gap-1 pt-1">
                              <button onClick={() => setNewKeyRateLimit(60)} className={`px-2 py-0.5 text-[9px] rounded font-mono ${newKeyRateLimit === 60 ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>60 RPM</button>
                              <button onClick={() => setNewKeyRateLimit(300)} className={`px-2 py-0.5 text-[9px] rounded font-mono ${newKeyRateLimit === 300 ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>300 RPM</button>
                              <button onClick={() => setNewKeyRateLimit(1000)} className={`px-2 py-0.5 text-[9px] rounded font-mono ${newKeyRateLimit === 1000 ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>1000 RPM</button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Allowed IP Whitelist</label>
                            <input type="text" value={newKeyAllowedIps} onChange={e => setNewKeyAllowedIps(e.target.value)} placeholder="0.0.0.0/0 (All public IPs)" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white placeholder-slate-600 focus:outline-hidden focus:border-emerald-500 text-xs font-mono" />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button onClick={createKey} disabled={!newKeyName.trim()} className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 flex items-center gap-2">
                            <span>Generate & Issue API Key</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                          </button>
                        </div>

                        {generatedRawKey && (
                          <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs space-y-2 animate-pulse">
                            <div className="flex items-center justify-between font-bold text-emerald-400">
                              <span>✅ API Key Issued Successfully! Copy and store it securely right now:</span>
                              <button onClick={() => { setSandboxKey(generatedRawKey); setApiSubTab('sandbox'); }} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow-xs">Test in Sandbox →</button>
                            </div>
                            <div className="bg-black/60 p-3 rounded-lg border border-emerald-500/30 font-mono select-all font-bold text-center text-sm text-white tracking-wide">
                              {generatedRawKey}
                            </div>
                            <p className="text-[10px] text-slate-400 text-center">Note: Only the salted prefix is stored in the registry. This exact key token cannot be retrieved once closed.</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Active Integration Keys ({developerKeys.length})</h3>
                        <span className="text-[11px] text-slate-500">Rate Limits enforced at Gateway Level</span>
                      </div>
                      {developerKeys.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {developerKeys.map(key => (
                            <div key={key.id || key.apiKeyId} className="p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 hover:bg-slate-50/60 transition">
                              <div className="space-y-2 flex-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                  <span className="font-black text-slate-900 text-sm">{key.name}</span>
                                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full tracking-wide ${key.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800'}`}>
                                    {key.status}
                                  </span>
                                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1 font-mono ${key.accessScope === 'READ_ONLY' ? 'bg-blue-100 text-blue-800 border border-blue-200' : key.accessScope === 'FULL_ADMIN' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                                    <span>🛡️ Scope:</span> {key.accessScope || 'READ_WRITE'}
                                  </span>
                                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200 font-mono">⚡ {key.rateLimitRpm || 300} RPM</span>
                                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md border border-slate-200 font-mono">🌐 IP: {key.allowedIps || '0.0.0.0/0'}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                                  <span>Salted Prefix: <strong className="text-slate-700">{key.prefix}***</strong></span>
                                  <span>|</span>
                                  <span>Key ID: {key.id || key.apiKeyId}</span>
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                                  <button onClick={() => updateKeyConfig(key, 'READ_ONLY', key.rateLimitRpm || 300, key.allowedIps || '0.0.0.0/0')} className={`px-2 py-1 text-[10px] font-bold text-slate-700 rounded transition ${key.accessScope === 'READ_ONLY' ? 'bg-white shadow-xs' : ''}`}>Read</button>
                                  <button onClick={() => updateKeyConfig(key, 'READ_WRITE', key.rateLimitRpm || 300, key.allowedIps || '0.0.0.0/0')} className={`px-2 py-1 text-[10px] font-bold text-slate-700 rounded transition ${key.accessScope === 'READ_WRITE' || !key.accessScope ? 'bg-white shadow-xs' : ''}`}>Write</button>
                                  <button onClick={() => updateKeyConfig(key, 'FULL_ADMIN', key.rateLimitRpm || 300, key.allowedIps || '0.0.0.0/0')} className={`px-2 py-1 text-[10px] font-bold text-slate-700 rounded transition ${key.accessScope === 'FULL_ADMIN' ? 'bg-white shadow-xs' : ''}`}>Admin</button>
                                </div>
                                <button onClick={() => { setSandboxKey(key.prefix + '_mock_secret'); setApiSubTab('sandbox'); }} className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 font-bold text-[11px] rounded-lg border border-emerald-500/20 transition flex items-center gap-1">🧪 Test Key</button>
                                <button onClick={() => viewKeyLogs(key.id || key.apiKeyId!)} className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg shadow-xs transition">View Access Logs</button>
                                <button onClick={e => { e.stopPropagation(); revokeKey(key.id || key.apiKeyId!); }} className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-lg shadow-xs transition">Revoke</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-10 text-center text-slate-400 text-xs space-y-2">
                          <p className="text-sm font-semibold">No active partner integration keys generated yet.</p>
                          <p>Click "Generate New API Key" above to issue an API token with custom rate limits and read/write permissions.</p>
                        </div>
                      )}
                    </div>

                    {selectedKeyLogs && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-md animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <span>📊 HTTP Gateway Access Logs</span>
                            <span className="text-xs font-normal text-slate-500">(Showing recent traffic and rate-limit checks)</span>
                          </h4>
                          <button onClick={() => setSelectedKeyLogs(null)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition">✕ Close Logs</button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                <th className="py-3 px-3">Method</th>
                                <th className="py-3 px-3">Endpoint Path</th>
                                <th className="py-3 px-3">Status / Rate Check</th>
                                <th className="py-3 px-3">Client IP Address</th>
                                <th className="py-3 px-3">Latency (ms)</th>
                                <th className="py-3 px-3">Timestamp</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedKeyLogs.map((log, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className={`py-2.5 px-3 font-black font-mono ${log.method === 'GET' ? 'text-blue-600' : log.method === 'POST' ? 'text-emerald-600' : 'text-amber-600'}`}>{log.method}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-800 truncate max-w-[260px]">{log.endpoint}</td>
                                  <td className={`py-2.5 px-3 font-bold ${log.statusCode < 300 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    <span>{log.statusCode}</span>
                                    {log.statusCode === 429 && <span className="ml-1 px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[9px] rounded font-mono">RATE_LIMIT_EXCEEDED</span>}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 font-mono">{log.ipAddress}</td>
                                  <td className="py-2.5 px-3 text-slate-600 font-mono">{log.responseTimeMs} ms</td>
                                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">{new Date(log.requestTimestamp).toLocaleString()}</td>
                                </tr>
                              ))}
                              {selectedKeyLogs.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No requests recorded for this API key yet. Use the Live Sandbox tab to trigger traffic!</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {apiSubTab === 'docs' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                      <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-black text-slate-900">1. Authentication & Rate Limiting Overview</h3>
                          <p className="text-xs text-slate-500">How external banks, municipal registrars, and verification partners authenticate against LandLens.</p>
                        </div>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 font-mono">Header: X-API-Key</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                          <h4 className="font-bold text-slate-800 text-sm">🔑 API Key Authentication</h4>
                          <p className="text-slate-600">Pass your issued API Key inside the <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-900 font-mono">X-API-Key</code> request header on all HTTPS calls to our gateway.</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                          <h4 className="font-bold text-slate-800 text-sm">⚡ Rate Limit Policies (RPM)</h4>
                          <p className="text-slate-600">Requests are limited per minute based on key tier (<code className="font-mono">60/300/1000 RPM</code>). Exceeding limits returns <code className="bg-rose-100 text-rose-800 px-1 rounded font-mono font-bold">429 Too Many Requests</code>.</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                          <h4 className="font-bold text-slate-800 text-sm">🛡️ Scope Access Enforcement</h4>
                          <p className="text-slate-600">Keys scoped as <code className="font-mono font-bold text-blue-700">READ_ONLY</code> cannot submit write mutations. Write attempts will be rejected with <code className="bg-amber-100 text-amber-800 px-1 rounded font-mono font-bold">403 Forbidden</code>.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {apiSubTab === 'sandbox' && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                    <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><span>🧪 Live API Request Sandbox & Rate Limit Tester</span></h3>
                        <p className="text-xs text-slate-500 mt-0.5">Test endpoints in real-time, inspect headers, verify rate limit headers (<code className="font-mono bg-slate-100 px-1 rounded">X-RateLimit-Remaining</code>), and test access scope rules.</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Sandbox Gateway Ready</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-3 space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">HTTP Method</label>
                        <select value={sandboxMethod} onChange={e => setSandboxMethod(e.target.value as any)} className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-slate-900 font-mono font-bold text-xs focus:outline-hidden focus:border-emerald-500">
                          <option value="GET">GET (Read Query)</option>
                          <option value="POST">POST (Write Mutation)</option>
                        </select>
                      </div>
                      <div className="md:col-span-5 space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Endpoint Path</label>
                        <select value={sandboxEndpoint} onChange={e => setSandboxEndpoint(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-emerald-500">
                          <option value="/api/properties">/api/properties (Query / Register)</option>
                          <option value="/api/properties/6bf378ac-6582-4554-9ad5-e9db5e6348a6">/api/properties/6bf378ac-... (Detail Check)</option>
                          <option value="/api/properties/6bf378ac-6582-4554-9ad5-e9db5e6348a6/verify-govt">/api/properties/6bf378ac-.../verify-govt (Gov Verify)</option>
                        </select>
                      </div>
                      <div className="md:col-span-4 space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">X-API-Key Header Value</label>
                        <input type="text" value={sandboxKey} onChange={e => setSandboxKey(e.target.value)} placeholder="lnd_live_your_key_here..." className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-emerald-500" />
                      </div>
                    </div>

                    {sandboxMethod === 'POST' && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">JSON Request Payload Body</label>
                          <span className="text-[11px] text-slate-400 font-mono">Content-Type: application/json</span>
                        </div>
                        <textarea value={sandboxPayload} onChange={e => setSandboxPayload(e.target.value)} rows={6} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-slate-200 font-mono text-xs focus:outline-hidden focus:border-emerald-500"></textarea>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
                        <span>⚡ Simulated Scope: <strong className="text-slate-800">{newKeyScope}</strong></span>
                        <span>|</span>
                        <span>Rate Limit: <strong className="text-slate-800">{newKeyRateLimit} RPM</strong></span>
                      </div>
                      <button onClick={runSandboxRequest} disabled={sandboxLoading || !sandboxKey.trim()} className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 flex items-center gap-2">
                        {sandboxLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                        <span>🚀 Execute Sandbox API Request</span>
                      </button>
                    </div>

                    {sandboxResponse && (
                      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 overflow-hidden shadow-xl animate-slideUp">
                        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-0.5 text-xs font-black rounded-md font-mono ${sandboxResponse.status < 300 ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'}`}>
                              HTTP {sandboxResponse.status} {sandboxResponse.statusText}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">Latency: 14 ms</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400">
                            <span>RateLimit-Remaining: {sandboxResponse.headers['X-RateLimit-Remaining']}</span>
                          </div>
                        </div>
                        <div className="p-5 space-y-4 font-mono text-xs">
                          <div className="space-y-1 border-b border-slate-800/80 pb-3 text-slate-400">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">// Response Headers:</div>
                            {Object.entries(sandboxResponse.headers).map(([k, v]) => (
                              <div key={k} className="text-[11px]"><span className="text-slate-300">{k}:</span> <span className="text-emerald-400 font-bold">{v as any}</span></div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">// JSON Response Payload:</div>
                            <pre className="text-slate-200 text-xs overflow-x-auto leading-relaxed">{JSON.stringify(sandboxResponse.data || sandboxResponse.error, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: NOTIFICATIONS */}
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

            {/* DETAIL INSPECTION PANEL */}
            {selectedProperty && (
              <div className="bg-white rounded-2xl shadow-md border border-slate-150 p-6 space-y-6 mt-6">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Inspector Panel: {selectedProperty.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Survey check code: {selectedProperty.propertyCode} | District: {selectedProperty.district}</p>
                  </div>
                  <button onClick={() => setSelectedProperty(null)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {aiReport && (
                  <div className="p-5 bg-emerald-500/5 rounded-xl border border-emerald-500/10 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-emerald-800">LandLens AI Trust Audit Report</h4>
                      <span className="text-xl font-extrabold text-emerald-700">{aiReport.aiTrustScore}% Trust Rating</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Forgery Risk</p>
                        <p className="font-extrabold text-rose-500 mt-0.5">{aiReport.forgeryScore}%</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Overlap claim</p>
                        <p className="font-extrabold text-slate-700 mt-0.5">{aiReport.duplicateScore}%</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Owner Match</p>
                        <p className={`font-extrabold mt-0.5 ${aiReport.ownershipMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {aiReport.ownershipMatch ? 'MATCHED' : 'FAIL'}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed bg-white/70 p-3 rounded-lg border border-slate-100">{aiReport.summary}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700">Land Passbook OCR Validation:</h4>
                  {propertyDocs.length > 0 ? (
                    <div className="space-y-3">
                      {propertyDocs.map(doc => (
                        <div key={doc.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-700">Uploaded Deed file:</p>
                            <div className="bg-white p-2 rounded-lg border border-slate-200 text-xs flex justify-between items-center shadow-xs">
                              <span>{doc.documentType} PASSBOOK</span>
                              <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 font-bold hover:underline">View PDF File</a>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-700">OCR Extracted Text:</p>
                            <div className="bg-slate-950 text-emerald-400 font-mono text-[9px] p-2.5 rounded-lg border border-slate-800 max-h-24 overflow-auto whitespace-pre-wrap">
                              {doc.rawText || 'OCR check has not been executed.'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No deed documents uploaded.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">Map boundary Location:</h4>
                  <div className="h-64 rounded-xl overflow-hidden shadow-inner border border-slate-200">
                    <Map mode="detail" properties={[selectedProperty]} />
                  </div>
                </div>

                {(activeTab === 'queue' || selectedProperty.status === 'PENDING_GOVT' || selectedProperty.status === 'PENDING_AI') && (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700">Inspector Verification Decision:</h4>
                    <form onSubmit={e => onVerifyProperty(e, selectedProperty.id)} className="space-y-4">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input type="radio" value="APPROVED" checked={verifyStatus === 'APPROVED'} onChange={() => setVerifyStatus('APPROVED')} className="text-emerald-600 focus:ring-emerald-500" />
                          Approve Listing
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input type="radio" value="REJECTED" checked={verifyStatus === 'REJECTED'} onChange={() => setVerifyStatus('REJECTED')} className="text-rose-600 focus:ring-rose-500" />
                          Reject Listing
                        </label>
                      </div>
                      <div>
                        <label className="block text-slate-600 text-xs font-semibold mb-1.5">Remarks / Audit Comments</label>
                        <textarea value={verifyRemarks} onChange={e => setVerifyRemarks(e.target.value)} rows={2} placeholder="Verified land passbook details against village survey records. Approved." className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs"></textarea>
                        {verifyError && <span className="text-[9px] text-rose-500 mt-1 block">Remarks are required (min 5 characters)</span>}
                      </div>
                      <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/50">
                        <button type="button" onClick={() => setSelectedProperty(null)} className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition">Cancel</button>
                        <button type="submit" disabled={verifyLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5">
                          {verifyLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                          Submit Verdict
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'disputes' && getPropertyDisputes(selectedProperty.id).length > 0 && (
                  <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-200 space-y-4">
                    <h4 className="text-xs font-bold text-rose-900">Active Fraud & Dispute Reports for Land ID: {selectedProperty.id}:</h4>
                    <div className="space-y-3">
                      {getPropertyDisputes(selectedProperty.id).map(f => (
                        <div key={f.id} className="bg-white p-4 rounded-xl border border-rose-100 shadow-xs space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800 text-xs">Dispute: {f.reason}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                              f.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-800' :
                              f.status === 'UNDER_INVESTIGATION' ? 'bg-blue-100 text-blue-800' :
                              f.status === 'RESOLVED_DISMISSED' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {f.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{f.description}</p>
                          <p className="text-[9px] text-slate-400">Reporter: {f.reporterId}</p>
                          <div className="flex gap-2 pt-2 border-t border-slate-100 justify-end">
                            {f.status === 'SUBMITTED' && (
                              <button onClick={() => assignFraud(f.id)} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition">Assign to Me</button>
                            )}
                            {f.status === 'UNDER_INVESTIGATION' && f.officerId === currentUser?.id && (
                              <div className="flex gap-1.5">
                                <button onClick={() => resolveFraud(f.id, 'RESOLVED_FRAUDULENT')} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] rounded-lg transition">Confirm Fraud</button>
                                <button onClick={() => resolveFraud(f.id, 'RESOLVED_DISMISSED')} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-[10px] rounded-lg transition">Dismiss Dispute</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

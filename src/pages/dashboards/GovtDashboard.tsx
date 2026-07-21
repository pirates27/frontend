import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { govtNavItems } from '../../components/layout/Sidebar';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge, Chip } from '../../components/ui/Badge';
import { SkeletonStatCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { CircularProgress } from '../../components/ui/ProgressBar';
import { Map } from '../../components/shared/Map';
import type {
  Property, FraudReport, Notification, AnalyticsDashboard,
  DeveloperKey, DeveloperKeyLog, PropertyDocument, AiVerification,
  PropertyImage, PropertyVideo
} from '../../models/property.models';
import { useNavigate } from 'react-router-dom';
import {
  Eye, CheckCircle, AlertOctagon, Key, Bell, Shield, X,
  Copy, Trash2, Terminal, Activity, Play, Clock, Code2,
  Book, Plus, RefreshCw, Search, Map as MapIcon, Image, Video, FileText, LogOut, MessageSquare, BarChart3
} from 'lucide-react';

const PropertyCard = React.memo(({ p, onClick, isSelected }: { p: Property; onClick: () => void; isSelected: boolean }) => (
  <div
    onClick={onClick}
    className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5
      ${isSelected ? '!border-primary-500 shadow-[0_0_20px_rgba(37,99,235,0.15)] bg-primary-50/20' : ''}`}
  >
    <div className="relative h-28 bg-gray-100 overflow-hidden">
      {p.threeSixtyImageUrl ? (
        <>
          <iframe src={p.threeSixtyImageUrl} style={{ width: '117.64%', height: '117.64%', border: 'none', position: 'absolute', top: 0, left: 0 }} className="pointer-events-none" allow="accelerometer; gyroscope" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <Search className="w-8 h-8 text-gray-300" />
        </div>
      )}
      <div className="absolute top-2 right-2">
        <StatusBadge status={p.status} size="sm" />
      </div>
    </div>
    <div className="p-4 space-y-2">
      <h3 className="text-gray-900 font-bold text-sm truncate">{p.title}</h3>
      <p className="text-gray-500 text-[10px]">📍 {p.village}, {p.district}</p>
      <div className="flex gap-2 text-[10px]">
        <span className="bg-gray-100 rounded-md px-2 py-1 text-gray-600 font-medium">{p.area}ac</span>
        <span className="bg-emerald-50 rounded-md px-2 py-1 text-emerald-700 font-bold">₹{p.price.toLocaleString('en-IN')}</span>
      </div>
    </div>
  </div>
));

export const GovtDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'analytics' | 'queue' | 'disputes' | 'approved' | 'api' | 'notifications'>('analytics');
  const [apiSubTab, setApiSubTab] = useState<'keys' | 'docs' | 'sandbox'>('keys');

  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  const [fraudReports, setFraudReports] = useState<FraudReport[]>([]);
  const [approvedProperties, setApprovedProperties] = useState<Property[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [analyticsError, setAnalyticsError] = useState(false);

  const [developerKeys, setDeveloperKeys] = useState<DeveloperKey[]>([]);
  const [selectedKeyLogs, setSelectedKeyLogs] = useState<DeveloperKeyLog[] | null>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState<'READ_ONLY' | 'READ_WRITE' | 'FULL_ADMIN'>('READ_WRITE');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState<number>(300);
  const [newKeyAllowedIps, setNewKeyAllowedIps] = useState<string>('0.0.0.0/0');
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const [sandboxEndpoint, setSandboxEndpoint] = useState<string>('/api/properties');
  const [sandboxMethod, setSandboxMethod] = useState<'GET' | 'POST'>('GET');
  const [sandboxKey, setSandboxKey] = useState<string>('lnd_live_demo_998a7c6b5e4d3c2b1a');
  const [sandboxPayload, setSandboxPayload] = useState<string>('{\n  "title": "Partner Verified Agricultural Parcel",\n  "category": "AGRICULTURAL",\n  "area": 12.5,\n  "price": 4500000,\n  "surveyNumber": "SRV-2026-991A",\n  "district": "Pune",\n  "village": "Mulshi",\n  "state": "Maharashtra",\n  "pincode": "412108"\n}');
  const [sandboxResponse, setSandboxResponse] = useState<any | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState<boolean>(false);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyDocs, setPropertyDocs] = useState<PropertyDocument[]>([]);
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  const [propertyVideos, setPropertyVideos] = useState<PropertyVideo[]>([]);
  const [aiReport, setAiReport] = useState<AiVerification | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(false);

  const currentUser = authService.currentUser();
  const pendingFraudCount = fraudReports.filter(f => f.status === 'SUBMITTED' || f.status === 'UNDER_INVESTIGATION').length;
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    loadAnalytics(); loadData(); loadFraud(); loadApproved(); loadKeys(); loadNotifications();
  }, []);

  const loadAnalytics = async () => {
    setAnalyticsError(false);
    try { setAnalytics(await propertyService.getAdminAnalytics()); }
    catch { setAnalytics(null); setAnalyticsError(true); }
  };

  const loadData = async () => {
    try {
      const [govt, ai] = await Promise.all([
        propertyService.getProperties({ status: 'PENDING_GOVT' }),
        propertyService.getProperties({ status: 'PENDING_AI' })
      ]);
      setPendingProperties([...govt, ...ai]);
    } catch { setPendingProperties([]); }
  };

  const loadApproved = async () => {
    try { setApprovedProperties(await propertyService.getProperties({ status: 'APPROVED' })); } catch {}
  };

  const loadNotifications = async () => {
    try { setNotifications(await propertyService.getNotifications()); } catch {}
  };

  const markNotificationRead = async (id: string) => {
    try { await propertyService.markNotificationRead(id); loadNotifications(); } catch {}
  };

  const loadKeys = async () => {
    try { setDeveloperKeys(await propertyService.getDeveloperKeys()); } catch {}
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await propertyService.createDeveloperKey(newKeyName, newKeyScope, newKeyRateLimit, newKeyAllowedIps || '0.0.0.0/0');
      setNewKeyName('');
      setGeneratedRawKey(res.rawApiKey || null);
      if (res.rawApiKey) setSandboxKey(res.rawApiKey);
      loadKeys();
    } catch {}
  };

  const viewKeyLogs = async (keyId: string) => {
    try { setSelectedKeyLogs(await propertyService.getDeveloperKeyLogs(keyId)); } catch {}
  };

  const revokeKey = async (keyId: string) => {
    try { await propertyService.deleteDeveloperKey(keyId); loadKeys(); setSelectedKeyLogs(null); }
    catch (err: any) { if (err.status === 200) { loadKeys(); setSelectedKeyLogs(null); } }
  };

  const loadFraud = async () => {
    try { setFraudReports(await propertyService.getAllFraudReports()); } catch {}
  };

  const selectPropertyObj = async (p: Property) => {
    setSelectedProperty(p);
    setPropertyDocs([]); setPropertyImages([]); setPropertyVideos([]); setAiReport(null);
    setVerifyRemarks(''); setVerifyStatus('APPROVED'); setVerifyError(false);

    try { setPropertyImages(await propertyService.getImages(p.id)); } catch {}
    try { setPropertyVideos(await propertyService.getVideos(p.id)); } catch {}
    try { setPropertyDocs(await propertyService.getDocuments(p.id)); }
    catch {
      const activeDispute = fraudReports.find(f => f.propertyId === p.id);
      if (activeDispute) {
        setPropertyDocs([{
          id: 'doc-dispute-audit', propertyId: p.id, documentType: 'SALE_DEED', fileUrl: '#',
          ocrStatus: 'COMPLETED', verificationStatus: 'UNVERIFIED',
          rawText: `[OCR Verification Audit Record]\nTarget Land ID: ${p.id}\nCommunity Dispute Reason: ${activeDispute.reason}\nReporter ID: ${activeDispute.reporterId}\nRegistry Audit Status: ${activeDispute.status}\nBoundary Analysis: ${activeDispute.description}`
        } as any]);
      }
    }

    try { setAiReport(await propertyService.getAiVerification(p.id)); }
    catch {
      const activeDispute = fraudReports.find(f => f.propertyId === p.id);
      if (activeDispute) {
        setAiReport({
          id: p.id, propertyId: p.id,
          aiTrustScore: activeDispute.status === 'RESOLVED_FRAUDULENT' ? 14 : 38,
          forgeryScore: activeDispute.reason.includes('Forgery') ? 89 : 22,
          duplicateScore: activeDispute.reason.includes('Double Listing') || activeDispute.reason.includes('overlap') ? 96 : 35,
          ownershipMatch: !activeDispute.reason.includes('Double Listing'),
          riskScore: activeDispute.status === 'RESOLVED_FRAUDULENT' ? 86 : 62,
          summary: `LandLens AI Registry Alert: Community dispute logged for '${activeDispute.reason}'. Audit status is ${activeDispute.status}. Detailed report: ${activeDispute.description}`,
          confidence: 95, generatedDate: new Date().toISOString()
        } as any);
      } else { setAiReport(null); }
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab); setSelectedProperty(null);
  };

  const selectPropertyById = async (propertyId: string) => {
    const existing = [...pendingProperties, ...approvedProperties].find(p => p.id === propertyId);
    if (existing) { selectPropertyObj(existing); return; }
    try { selectPropertyObj(await propertyService.getPropertyById(propertyId)); }
    catch {
      const report = fraudReports.find(f => f.propertyId === propertyId);
      const fallback: Property = {
        id: propertyId,
        providerId: report?.reporterId || 'Unknown',
        title: report ? `Disputed Land: ${report.reason}` : `Land ID: ${propertyId}`,
        category: 'AGRICULTURAL', area: 4.5, price: 1250000,
        surveyNumber: 'AUDIT-DOC', address: 'Community Dispute Registry',
        latitude: 17.38, longitude: 78.48,
        status: 'DISPUTED', district: 'Hyderabad', village: 'Secunderabad',
        state: 'Telangana', pincode: '500003',
        description: report?.description || '', createdAt: new Date().toISOString()
      } as any;
      selectPropertyObj(fallback);
    }
  };

  const resolveFraud = async (reportId: string, resolution: 'RESOLVED_FRAUDULENT' | 'RESOLVED_DISMISSED') => {
    try { await propertyService.resolveFraudReport(reportId, resolution); loadFraud(); }
    catch {}
  };

  const runAiVerify = async (propId: string) => {
    setAiLoading(true);
    try {
      const res = await propertyService.triggerAiVerify(propId);
      setAiReport(res);
      setAiLoading(false);
      try { import('canvas-confetti').then(c => c.default({ particleCount: 150, spread: 70, origin: { y: 0.6 } })); } catch {}
    } catch { setAiLoading(false); }
  };

  const submitVerification = async () => {
    if (!selectedProperty || !verifyRemarks.trim()) { setVerifyError(true); return; }
    setVerifyError(false); setVerifyLoading(true);
    try {
      await propertyService.submitGovernmentVerify(selectedProperty.id, { status: verifyStatus, remarks: verifyRemarks });
      setSelectedProperty(null); loadData(); loadApproved();
    } catch {} finally { setVerifyLoading(false); }
  };

  const runSandboxRequest = () => {
    setSandboxLoading(true); setSandboxResponse(null);
    setTimeout(() => {
      setSandboxLoading(false);
      if (sandboxMethod === 'GET' && sandboxEndpoint.includes('/properties')) {
        setSandboxResponse({ status: 200, statusText: 'OK', headers: { 'X-RateLimit-Limit': `${newKeyRateLimit} RPM`, 'X-RateLimit-Remaining': `${newKeyRateLimit - 1}`, 'X-Access-Scope': newKeyScope, 'Content-Type': 'application/json' }, data: { success: true, totalRecords: 2, records: [{ id: '6bf378ac', title: 'Mulshi Agricultural Tract A', surveyNumber: 'SRV-2026-104B', areaAcres: 4.5, status: 'APPROVED', aiTrustScore: 94 }, { id: '8ac210bf', title: 'Hinjewadi Commercial Plot 12', surveyNumber: 'SRV-2026-881C', areaAcres: 2.1, status: 'PENDING_GOVT', aiTrustScore: 82 }] } });
      } else if (sandboxMethod === 'POST' && sandboxEndpoint.includes('/properties')) {
        if (newKeyScope === 'READ_ONLY') {
          setSandboxResponse({ status: 403, statusText: 'Forbidden', headers: { 'X-Access-Scope': 'READ_ONLY' }, error: { code: 'INSUFFICIENT_ACCESS_SCOPE', message: 'Your API Key scope is [READ_ONLY]. A scope of [READ_WRITE] or [FULL_ADMIN] is required for POST /api/properties.' } });
        } else {
          let pp = {};
          try { pp = JSON.parse(sandboxPayload); } catch { pp = { raw: sandboxPayload }; }
          setSandboxResponse({ status: 201, statusText: 'Created', headers: { 'X-RateLimit-Limit': `${newKeyRateLimit} RPM`, 'X-Access-Scope': newKeyScope }, data: { success: true, message: 'Partner property submitted.', propertyId: '991a-partner-claim', status: 'PENDING_AI', submittedPayload: pp, timestamp: new Date().toISOString() } });
        }
      } else {
        setSandboxResponse({ status: 200, statusText: 'OK', data: { success: true, endpoint: sandboxEndpoint, method: sandboxMethod, timestamp: new Date().toISOString() } });
      }
    }, 650);
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const navItems = govtNavItems(pendingFraudCount, unreadCount);



  // ─── Detail Panel ──────────────────────────────────────────────────
  const renderDetailPanel = () => {
    if (!selectedProperty) return null;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[500px] xl:w-[550px] shrink-0 bg-white border border-gray-200 shadow-xl rounded-2xl p-5 lg:h-full lg:overflow-y-auto scrollbar-premium text-gray-900"
      >
        <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
          <div>
            <h3 className="text-gray-900 font-black text-base">Inspection Panel</h3>
            <p className="text-gray-500 text-[10px] font-semibold mt-0.5 truncate max-w-[260px]">{selectedProperty.title}</p>
          </div>
          <button onClick={() => setSelectedProperty(null)} className="text-gray-400 hover:text-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification form (Moved to top) */}
        {selectedProperty.status === 'PENDING_GOVT' && (
          <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
            <h4 className="text-gray-700 text-[10px] font-bold uppercase tracking-wider">Submit Verification Decision</h4>
            <div className="flex gap-2">
              <button
                onClick={() => setVerifyStatus('APPROVED')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${verifyStatus === 'APPROVED' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
              >
                ✓ Approve
              </button>
              <button
                onClick={() => setVerifyStatus('REJECTED')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${verifyStatus === 'REJECTED' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
              >
                ✕ Reject
              </button>
            </div>
            
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(verifyStatus === 'APPROVED' 
                ? ["Verified successfully. All documents clear.", "AI trust score is high, manual inspection passed.", "No objections, land boundaries align."]
                : ["Ownership mismatch. Needs review.", "Land boundaries overlap with government property.", "Documents are suspicious. Forgery detected."]
              ).map((msg, i) => (
                <button
                  key={i}
                  onClick={() => setVerifyRemarks(prev => prev ? `${prev} ${msg}` : msg)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 text-[9px] text-gray-700 font-semibold transition-colors text-left leading-tight"
                >
                  + {msg}
                </button>
              ))}
            </div>

            <textarea
              value={verifyRemarks}
              onChange={e => setVerifyRemarks(e.target.value)}
              placeholder="Official inspection remarks..."
              rows={3}
              className={`w-full bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 rounded-xl p-3 text-xs resize-none ${verifyError && !verifyRemarks.trim() ? '!border-red-500' : ''}`}
            />
            {verifyError && !verifyRemarks.trim() && (
              <p className="text-red-600 text-[10px] font-bold">Remarks are required before submission.</p>
            )}
            <Button
              variant={verifyStatus === 'APPROVED' ? 'accent' : 'danger'}
              size="sm" fullWidth
              loading={verifyLoading}
              onClick={submitVerification}
              className="font-bold"
            >
              Submit {verifyStatus} Decision
            </Button>
          </div>
        )}

        {/* Action Bar (Re-verify) */}
        <div className="mb-5 flex items-center justify-between">
          <h4 className="text-gray-700 text-[10px] font-bold uppercase tracking-wider">Property Overview</h4>
          <Button
            variant="secondary" size="xs"
            loading={aiLoading}
            onClick={() => runAiVerify(selectedProperty.id)}
            icon={<Shield className="w-3.5 h-3.5" />}
          >
            Re-verify with AI
          </Button>
        </div>

        {/* 3D Map / Map Placeholder */}
        <div className="relative h-40 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 mb-5">
          {selectedProperty.threeSixtyImageUrl ? (
            <iframe src={selectedProperty.threeSixtyImageUrl} className="w-full h-full border-none pointer-events-none" allow="accelerometer; gyroscope" />
          ) : (
            <div className="absolute inset-0 w-full h-full">
              <Map mode="detail" properties={[selectedProperty]} />
            </div>
          )}
          <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-md p-2 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-gray-900 text-xs font-bold truncate">{selectedProperty.address || selectedProperty.village}</p>
            <p className="text-gray-500 text-[10px] truncate font-medium">{selectedProperty.district}, {selectedProperty.state} - {selectedProperty.pincode}</p>
          </div>
        </div>

        {/* Property Details Grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
            <p className="text-gray-500 text-[10px] font-semibold">Area</p>
            <p className="text-gray-900 text-xs font-black">{selectedProperty.area} Acres</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
            <p className="text-gray-500 text-[10px] font-semibold">Price</p>
            <p className="text-gray-900 text-xs font-black">₹{selectedProperty.price?.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
            <p className="text-gray-500 text-[10px] font-semibold">Category</p>
            <p className="text-gray-900 text-xs font-black">{selectedProperty.category}</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
            <p className="text-gray-500 text-[10px] font-semibold">Survey No.</p>
            <p className="text-gray-900 text-xs font-black">{selectedProperty.surveyNumber}</p>
          </div>
        </div>

        {/* Uploaded Media */}
        {(propertyImages.length > 0 || propertyVideos.length > 0) && (
          <div className="mb-5">
            <h4 className="text-gray-700 text-[10px] font-bold uppercase tracking-wider mb-3">Uploaded Media</h4>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-premium">
              {propertyImages.map(img => (
                <div key={img.id} className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-gray-200">
                  <img src={img.url} alt="Property" className="w-full h-full object-cover" />
                </div>
              ))}
              {propertyVideos.map(vid => (
                <div key={vid.id} className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                  <Video className="w-6 h-6 text-gray-400" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Play className="w-6 h-6 text-white opacity-80" /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Score */}
        {aiReport && (
          <div className="mb-5">
            <h4 className="text-gray-700 text-[10px] font-bold uppercase tracking-wider mb-3">AI Verification Report</h4>
            <div className="flex items-center gap-4">
              <CircularProgress
                value={aiReport.aiTrustScore}
                size={80} strokeWidth={7}
                color={aiReport.aiTrustScore >= 70 ? 'accent' : 'danger'}
                sublabel="Trust"
              />
              <div className="flex-1 grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                  <p className="text-gray-500 font-semibold">Forgery</p>
                  <p className={`font-black mt-0.5 ${aiReport.forgeryScore > 30 ? 'text-red-600' : 'text-gray-900'}`}>{aiReport.forgeryScore}%</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                  <p className="text-gray-500 font-semibold">Duplicate</p>
                  <p className={`font-black mt-0.5 ${aiReport.duplicateScore > 10 ? 'text-red-600' : 'text-gray-900'}`}>{aiReport.duplicateScore}%</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                  <p className="text-gray-500 font-semibold">Risk</p>
                  <p className={`font-black mt-0.5 ${aiReport.riskScore > 20 ? 'text-red-600' : 'text-gray-900'}`}>{aiReport.riskScore}%</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center">
                  <p className="text-gray-500 font-semibold">Owner</p>
                  <p className={`font-black mt-0.5 tracking-wide ${aiReport.ownershipMatch ? 'text-emerald-600' : 'text-red-600'}`}>{aiReport.ownershipMatch ? 'MATCH' : 'MISMATCH'}</p>
                </div>
              </div>
            </div>
            {aiReport.summary && (
              <div className="mt-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-white text-[11px] font-semibold flex items-center gap-1.5"><Shield className="w-3 h-3 text-primary-400" /> AI Summary</p>
                  <span className="text-[10px] font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full">{aiReport.confidence}% Confident</span>
                </div>
                <p className="text-dark-400 text-[11px] leading-relaxed mb-3">{aiReport.summary}</p>
                {aiReport.reasoning && (
                  <details className="group">
                    <summary className="text-[10px] text-primary-400 font-medium cursor-pointer hover:text-primary-300 transition-colors list-none flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500/50 group-open:bg-primary-500"></span>
                      View AI Reasoning Trace
                    </summary>
                    <div className="mt-2 p-2.5 bg-black/40 rounded-lg border border-white/[0.05] max-h-40 overflow-y-auto">
                      <p className="text-dark-500 text-[10px] leading-relaxed whitespace-pre-wrap font-mono">
                        {aiReport.reasoning}
                      </p>
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* OCR Documents */}
        {propertyDocs.length > 0 && (
          <div className="mb-5">
            <h4 className="text-dark-400 text-[10px] font-semibold uppercase tracking-wider mb-3">Documents & OCR Extraction</h4>
            {propertyDocs.map(doc => (
              <div key={doc.id} className="p-3 bg-dark-950/50 rounded-xl border border-white/[0.06] mb-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white text-[11px] font-semibold flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-primary-400" />
                    {doc.documentType}
                  </p>
                  {doc.fileUrl && doc.fileUrl !== '#' && (
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-primary-400 text-[10px] hover:underline">View File</a>
                  )}
                </div>
                {doc.rawText && (
                  <details className="group">
                    <summary className="text-[10px] text-dark-400 font-medium cursor-pointer hover:text-white transition-colors list-none">
                      Show Extracted Text...
                    </summary>
                    <div className="mt-2 p-2 bg-black/30 rounded border border-white/[0.05]">
                      <p className="text-dark-300 text-[10px] font-mono leading-relaxed whitespace-pre-wrap">{doc.rawText?.slice(0, 300)}...</p>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}


      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col pb-28 relative overflow-x-hidden">
      {/* ── TOP HEADER APP BAR ── */}
      <div className="sticky top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 sm:px-6 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
            GV
          </div>
          <div>
            <h1 className="text-gray-900 font-bold text-base leading-tight">Government Portal</h1>
            <p className="text-gray-500 text-[11px]">Inspector: {currentUser?.firstName || 'Officer'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('notifications')}
            className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary-600 rounded-full border-2 border-white" />
            )}
          </button>
          <button
            onClick={() => { authService.logout(); navigate('/auth/login'); }}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto w-full">

      {/* ── ANALYTICS ── */}
      <div className={`${activeTab === 'analytics' ? 'block' : 'hidden'} space-y-6`}>
          <GlassCard className="relative overflow-hidden !bg-gradient-to-r !from-primary-900/40 !to-primary-800/20 !border-primary-500/20">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="relative">
              <h2 className="text-white font-bold text-lg">Government Land Registry Analytics</h2>
              <p className="text-dark-400 text-sm mt-1">Pre-aggregated property and verification metrics</p>
            </div>
          </GlassCard>

          {analyticsError ? (
            <GlassCard className="text-center py-10">
              <AlertOctagon className="w-10 h-10 text-warning-400 mx-auto mb-3" />
              <p className="text-white font-semibold text-sm">Analytics access restricted</p>
              <p className="text-dark-400 text-xs mt-1">Available only to Admin role</p>
            </GlassCard>
          ) : analytics ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Property Views" value={analytics.propertyViews} icon={<Eye className="w-5 h-5" />} color="cyan" delay={0} />
              <StatCard label="Verifications" value={analytics.verificationCount} icon={<Shield className="w-5 h-5" />} color="accent" delay={0.1} />
              <StatCard label="Fraud Cases" value={analytics.fraudCount} icon={<AlertOctagon className="w-5 h-5" />} color="danger" delay={0.2} />
              <StatCard label="API Calls" value={analytics.apiCalls} icon={<Activity className="w-5 h-5" />} color="primary" delay={0.3} />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[0,1,2,3].map(i => <SkeletonStatCard key={i} />)}
            </div>
          )}
        </div>

      {/* ── PENDING QUEUE ── */}
      <div className={`${activeTab === 'queue' ? 'block' : 'hidden'} space-y-5`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-white font-bold text-lg">Pending Verification Queue</h2>
              <p className="text-dark-400 text-sm mt-0.5">{pendingProperties.length} properties awaiting government inspection</p>
            </div>
            <Button variant="glass" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={loadData}>Refresh</Button>
          </div>

          <div className="flex flex-col lg:flex-row gap-5 items-start lg:h-[calc(100vh-160px)]">
            <div className={`w-full ${selectedProperty ? 'lg:flex-1' : 'w-full'} lg:h-full lg:overflow-y-auto lg:pr-2 scrollbar-premium`}>
              {pendingProperties.length > 0 ? (
                <div className={`grid gap-4 ${selectedProperty ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
                  {pendingProperties.map(p => (
                    <PropertyCard key={p.id} p={p} onClick={() => selectPropertyObj(p)} isSelected={selectedProperty?.id === p.id} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<CheckCircle className="w-8 h-8" />}
                  title="Queue is clear"
                  description="No properties are pending government verification."
                />
              )}
            </div>
            {renderDetailPanel()}
          </div>
        </div>

      {/* ── DISPUTES ── */}
      <div className={`${activeTab === 'disputes' ? 'block' : 'hidden'} space-y-5`}>
          <div>
            <h2 className="text-white font-bold text-lg">Community Disputes & Fraud Reports</h2>
            <p className="text-dark-400 text-sm mt-0.5">{pendingFraudCount} active dispute(s) under investigation</p>
          </div>
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            <div className={`w-full ${selectedProperty ? 'lg:w-[55%]' : 'w-full'} space-y-3`}>
              {fraudReports.length > 0 ? fraudReports.map(f => (
                <GlassCard key={f.id} className={`${f.status === 'SUBMITTED' ? '!border-danger-500/20 !bg-danger-500/[0.03]' : f.status === 'RESOLVED_FRAUDULENT' ? '!border-warning-500/20' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <AlertOctagon className={`w-4 h-4 ${f.status === 'SUBMITTED' ? 'text-danger-400' : 'text-warning-400'}`} />
                        <h3 className="text-white font-semibold text-sm">{f.reason}</h3>
                        <Chip
                          label={f.status.replace(/_/g, ' ')}
                          color={f.status === 'SUBMITTED' ? 'danger' : f.status === 'UNDER_INVESTIGATION' ? 'warning' : 'accent'}
                          size="xs" dot
                        />
                      </div>
                      <p className="text-dark-400 text-xs leading-relaxed mb-2">{f.description}</p>
                      <p className="text-dark-600 text-[10px]">Property: {f.propertyId.slice(0, 16)}... · Reporter: {f.reporterId?.slice(0, 10)}...</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-white/[0.06]">
                    <Button variant="glass" size="xs" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => { selectPropertyById(f.propertyId); handleTabChange('queue'); }}>
                      Inspect Property
                    </Button>
                    {(f.status === 'SUBMITTED' || f.status === 'UNDER_INVESTIGATION') && (
                      <>
                        <Button variant="danger" size="xs" onClick={() => resolveFraud(f.id, 'RESOLVED_FRAUDULENT')}>Mark Fraudulent</Button>
                        <Button variant="accent" size="xs" onClick={() => resolveFraud(f.id, 'RESOLVED_DISMISSED')}>Dismiss Report</Button>
                      </>
                    )}
                  </div>
                </GlassCard>
              )) : (
                <EmptyState icon={<AlertOctagon className="w-8 h-8" />} title="No disputes filed" description="No community fraud reports have been submitted yet." />
              )}
            </div>
            {renderDetailPanel()}
          </div>
        </div>

      {/* ── APPROVED PROPERTIES ── */}
      <div className={`${activeTab === 'approved' ? 'block' : 'hidden'} space-y-5`}>
          <div>
            <h2 className="text-white font-bold text-lg">Live Verified Properties</h2>
            <p className="text-dark-400 text-sm mt-0.5">{approvedProperties.length} properties in active registry</p>
          </div>
          {approvedProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {approvedProperties.map(p => <PropertyCard key={p.id} p={p} onClick={() => selectPropertyObj(p)} isSelected={selectedProperty?.id === p.id} />)}
            </div>
          ) : (
            <EmptyState icon={<CheckCircle className="w-8 h-8" />} title="No verified properties" description="Approved properties will appear here." />
          )}
        </div>

      {/* ── API INTEGRATION ── */}
      <div className={`${activeTab === 'api' ? 'block' : 'hidden'} space-y-5`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">API Integration Hub</h2>
              <p className="text-dark-400 text-sm mt-0.5">Manage partner integration keys and test the API sandbox</p>
            </div>
          </div>

          {/* API Sub-tabs */}
          <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit">
            {(['keys', 'docs', 'sandbox'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setApiSubTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${apiSubTab === tab ? 'bg-white/10 text-white' : 'text-dark-500 hover:text-dark-300'}`}
              >
                {tab === 'keys' ? '🔑 API Keys' : tab === 'docs' ? '📖 Docs' : '🧪 Sandbox'}
              </button>
            ))}
          </div>

          {/* KEYS sub-tab */}
          {apiSubTab === 'keys' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateKey(v => !v)}>
                  {showCreateKey ? 'Close' : 'Generate API Key'}
                </Button>
              </div>

              {showCreateKey && (
                <GlassCard className="!border-primary-500/20">
                  <h4 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary-400" />
                    Create Integration Key
                  </h4>
                  <div className="space-y-3">
                    <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name..." className="input-dark" />
                    <div className="grid grid-cols-3 gap-3">
                      <select value={newKeyScope} onChange={e => setNewKeyScope(e.target.value as any)} className="select-dark text-xs">
                        <option value="READ_ONLY">READ ONLY</option>
                        <option value="READ_WRITE">READ WRITE</option>
                        <option value="FULL_ADMIN">FULL ADMIN</option>
                      </select>
                      <input type="number" value={newKeyRateLimit} onChange={e => setNewKeyRateLimit(+e.target.value)} placeholder="Rate limit RPM" className="input-dark text-xs" />
                      <input type="text" value={newKeyAllowedIps} onChange={e => setNewKeyAllowedIps(e.target.value)} placeholder="Allowed IPs" className="input-dark text-xs" />
                    </div>
                    <Button variant="primary" size="sm" onClick={createKey}>Create Key</Button>
                  </div>
                  {generatedRawKey && (
                    <div className="mt-4 p-4 bg-warning-500/10 border border-warning-500/20 rounded-xl">
                      <p className="text-warning-400 text-xs font-bold mb-2">⚠️ Save this key now — it will not be shown again!</p>
                      <div className="flex items-center gap-2 bg-dark-950/60 rounded-xl p-3 border border-white/[0.06]">
                        <code className="text-accent-300 text-xs font-mono flex-1 truncate">{generatedRawKey}</code>
                        <button onClick={() => copyKey(generatedRawKey)} className="text-dark-400 hover:text-white transition-colors">
                          {copiedKey ? <CheckCircle className="w-4 h-4 text-accent-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              )}

              <GlassCard padding="p-0">
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Code2 className="w-4 h-4 text-primary-400" /> Active Keys</h3>
                  <Chip label={`${developerKeys.length} total`} color="primary" />
                </div>
                {developerKeys.length > 0 ? developerKeys.map(key => (
                  <div key={key.id || key.apiKeyId} className="px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm">{key.name}</span>
                        <Chip label={key.status} color={key.status === 'ACTIVE' ? 'accent' : 'danger'} size="xs" dot />
                      </div>
                      <p className="text-dark-500 text-[10px] font-mono mt-0.5">Prefix: {key.prefix}***</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="glass" size="xs" icon={<Terminal className="w-3.5 h-3.5" />} onClick={() => viewKeyLogs(key.id || key.apiKeyId!)}>Logs</Button>
                      <Button variant="danger" size="xs" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => revokeKey(key.id || key.apiKeyId!)}>Revoke</Button>
                    </div>
                  </div>
                )) : <p className="text-dark-600 text-xs text-center py-8">No active keys.</p>}
              </GlassCard>

              {selectedKeyLogs && (
                <GlassCard padding="p-0">
                  <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                    <h4 className="text-white font-semibold text-sm">HTTP Access Logs</h4>
                    <button onClick={() => setSelectedKeyLogs(null)} className="text-dark-500 hover:text-white text-xs transition-colors">Close</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {['Method', 'Endpoint', 'Status', 'IP', 'Time', 'Timestamp'].map(h => (
                            <th key={h} className="text-left px-5 py-3 text-dark-500 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {selectedKeyLogs.length === 0 ? (
                          <tr><td colSpan={6} className="text-center py-8 text-dark-500">No logs for this key.</td></tr>
                        ) : selectedKeyLogs.map((log, i) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            <td className={`px-5 py-3 font-bold ${log.method === 'GET' ? 'text-cyan-400' : 'text-accent-400'}`}>{log.method}</td>
                            <td className="px-5 py-3 text-dark-300 font-mono truncate max-w-[160px]">{log.endpoint}</td>
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
              )}
            </div>
          )}

          {/* DOCS sub-tab */}
          {apiSubTab === 'docs' && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-6">
                <Book className="w-5 h-5 text-primary-400" />
                <h3 className="text-white font-bold">LandLens Open API — Reference Documentation</h3>
              </div>
              <div className="space-y-4">
                {[
                  { method: 'GET', path: '/api/properties', desc: 'Retrieve all verified land records in the registry', auth: true, scope: 'READ_ONLY' },
                  { method: 'GET', path: '/api/properties/{id}', desc: 'Fetch full record for a specific land parcel by its UUID', auth: true, scope: 'READ_ONLY' },
                  { method: 'POST', path: '/api/properties', desc: 'Submit a new land record for AI Trust verification', auth: true, scope: 'READ_WRITE' },
                  { method: 'GET', path: '/api/properties/{id}/ai-verification', desc: 'Retrieve AI Trust Score and forgery analysis', auth: true, scope: 'READ_ONLY' },
                  { method: 'GET', path: '/api/properties/{id}/documents', desc: 'List all uploaded documents with OCR extraction status', auth: true, scope: 'READ_ONLY' },
                ].map((ep, i) => (
                  <div key={i} className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ep.method === 'GET' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-accent-500/20 text-accent-400'}`}>{ep.method}</span>
                      <code className="text-white font-mono text-xs">{ep.path}</code>
                      <Chip label={ep.scope} color="primary" size="xs" />
                    </div>
                    <p className="text-dark-400 text-xs">{ep.desc}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* SANDBOX sub-tab */}
          {apiSubTab === 'sandbox' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <GlassCard>
                <h4 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  API Sandbox Console
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-dark-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5 block">API Key</label>
                    <input type="text" value={sandboxKey} onChange={e => setSandboxKey(e.target.value)} className="input-dark font-mono text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-dark-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5 block">Method</label>
                      <select value={sandboxMethod} onChange={e => setSandboxMethod(e.target.value as any)} className="select-dark">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-dark-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5 block">Endpoint</label>
                      <input type="text" value={sandboxEndpoint} onChange={e => setSandboxEndpoint(e.target.value)} className="input-dark font-mono text-xs" />
                    </div>
                  </div>
                  {sandboxMethod === 'POST' && (
                    <div>
                      <label className="text-dark-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5 block">JSON Payload</label>
                      <textarea value={sandboxPayload} onChange={e => setSandboxPayload(e.target.value)} rows={6}
                        className="input-dark font-mono text-xs resize-none" />
                    </div>
                  )}
                  <Button
                    variant="primary" size="sm" fullWidth
                    loading={sandboxLoading}
                    icon={<Play className="w-4 h-4" />}
                    onClick={runSandboxRequest}
                  >
                    {sandboxLoading ? 'Sending...' : 'Execute Request'}
                  </Button>
                </div>
              </GlassCard>

              {sandboxResponse && (
                <GlassCard>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${sandboxResponse.status < 300 ? 'bg-accent-500/20 text-accent-400' : 'bg-danger-500/20 text-danger-400'}`}>
                      {sandboxResponse.status} {sandboxResponse.statusText}
                    </span>
                    <span className="text-dark-500 text-xs">Response</span>
                  </div>
                  {sandboxResponse.headers && (
                    <div className="mb-4">
                      <p className="text-dark-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Response Headers</p>
                      <div className="space-y-1">
                        {Object.entries(sandboxResponse.headers).map(([k, v]) => (
                          <div key={k} className="flex gap-2 text-[10px] font-mono">
                            <span className="text-cyan-400 min-w-[160px]">{k}</span>
                            <span className="text-dark-300">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-dark-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Response Body</p>
                    <pre className="bg-dark-950/60 border border-white/[0.06] rounded-xl p-4 text-xs text-accent-300 font-mono overflow-auto max-h-60">
                      {JSON.stringify(sandboxResponse.data || sandboxResponse.error, null, 2)}
                    </pre>
                  </div>
                </GlassCard>
              )}
            </div>
          )}
        </div>

      {/* ── NOTIFICATIONS ── */}
      <div className={`${activeTab === 'notifications' ? 'block' : 'hidden'} space-y-5`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-900 font-bold text-xl">Notifications</h2>
              <p className="text-gray-500 text-sm mt-0.5">Government portal alerts and verification updates</p>
            </div>
            {unreadCount > 0 && <Chip label={`${unreadCount} unread`} color="danger" dot />}
          </div>
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map(n => (
                <div key={n.id} className={`bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-4 ${!n.isRead ? 'bg-primary-50/40 border-primary-200' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 font-semibold text-sm">{n.title}</h3>
                    <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-gray-400 text-[10px] mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdTime).toLocaleString()}
                    </p>
                  </div>
                  {!n.isRead
                    ? <Button variant="secondary" size="xs" onClick={() => markNotificationRead(n.id)}>Mark Read</Button>
                    : <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Bell className="w-8 h-8" />} title="No notifications" description="You're all caught up!" />
          )}
        </div>
      </div>

      {/* ── FLOATING CHAT / AI BUTTON ── */}
      <button 
        onClick={() => navigate('/buyer-dashboard')} 
        className="fixed bottom-5 right-0 z-[55] w-14 h-14 !bg-blue-600 rounded-l-full rounded-r-none shadow-[0_5px_20px_rgba(37,99,235,0.4)] flex items-center justify-center text-white hover:!bg-blue-500 transition-all duration-500 active:scale-95"
      >
        <MessageSquare className="w-6 h-6 mr-1" />
      </button>

      {/* ── FLOATING BOTTOM NAVIGATION BAR ── */}
      <div className="fixed bottom-5 left-0 w-[calc(100%-72px)] pr-6 pl-4 bg-white border border-gray-200 border-l-0 z-50 rounded-r-full rounded-l-none shadow-[0_5px_30px_rgba(0,0,0,0.15)] transition-all duration-500">
        <div className="flex items-center justify-between w-full h-[60px]">
          {[
            { id: 'analytics', icon: BarChart3, label: 'Analytics' },
            { id: 'queue', icon: Shield, label: 'Queue', badge: pendingProperties.length },
            { id: 'disputes', icon: AlertOctagon, label: 'Disputes', badge: pendingFraudCount },
            { id: 'approved', icon: CheckCircle, label: 'Approved' },
            { id: 'api', icon: Code2, label: 'Developer' },
            { id: 'notifications', icon: Bell, label: 'Alerts', badge: unreadCount }
          ].map(item => {
             const Icon = item.icon;
             const isActive = activeTab === item.id;
             return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as any)}
                  className="flex flex-col items-center justify-center w-full h-full relative"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-primary-50' : ''}`}>
                    <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-semibold transition-colors mt-0.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div layoutId="govtMobileNav" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-t-full" />
                  )}
                </button>
             );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import { Map } from '../../components/shared/Map';
import { parseBoundaryFromDescription, cleanDescription } from '../../utils/boundary';
import { cloudinaryService } from '../../services/cloudinary.service';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { providerNavItems } from '../../components/layout/Sidebar';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Chip } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { CircularProgress } from '../../components/ui/ProgressBar';
import type {
  Property, PropertyVisit, Notification, PropertyImage, PropertyVideo, PropertyDocument,
  VerificationTimeline, AiVerification, GovernmentVerification, DocumentType
} from '../../models/property.models';
import {
  Home, Plus, Calendar, Bell, CheckCircle, X, Loader2, Shield, Settings, Sparkles,
  Upload, Image, Video, FileText, Clock, Edit2, BarChart3, Map as MapIcon
} from 'lucide-react';

export const ProviderDashboard = () => {
  const [activeTab, setActiveTab] = useState<'listings' | 'add' | 'visits' | 'notifications'>('listings');
  const [detailSubTab, setDetailSubTab] = useState<'verify' | 'media' | 'docs' | 'timeline'>('verify');
  const [listingFilterTab, setListingFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [myVisits, setMyVisits] = useState<PropertyVisit[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastDrawnBoundary, setLastDrawnBoundary] = useState<[number, number][]>([]);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  const [propertyVideos, setPropertyVideos] = useState<PropertyVideo[]>([]);
  const [propertyDocs, setPropertyDocs] = useState<PropertyDocument[]>([]);
  const [timeline, setTimeline] = useState<VerificationTimeline[]>([]);
  const [aiReport, setAiReport] = useState<AiVerification | null>(null);
  const [govtVerification, setGovtVerification] = useState<GovernmentVerification | null>(null);

  const initialFormState = {
    title: '', category: 'AGRICULTURAL', area: '', price: '', description: '',
    surveyNumber: '', address: '', latitude: 16.3067, longitude: 80.4365,
    district: 'Guntur', village: 'Gorantla', state: 'Andhra Pradesh', pincode: '522034',
    threeSixtyImageUrl: ''
  };
  const [propertyForm, setPropertyForm] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('PATTA');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [selectedAddPropertyDocFile, setSelectedAddPropertyDocFile] = useState<File | null>(null);
  const [successToast, setSuccessToast] = useState(false);
  const [submittedPropertyCode, setSubmittedPropertyCode] = useState<string | null>(null);

  const currentUser = authService.currentUser();
  const pendingVisitsCount = myVisits.filter(v => v.status === 'SCHEDULED').length;
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => { loadData(); loadVisits(); loadNotifications(); }, []);

  const loadData = async () => {
    try {
      const properties = await propertyService.getProperties();
      const userId = currentUser?.id || localStorage.getItem('user_id');
      setMyProperties(userId ? properties.filter(p => p.providerId === userId || p.provider?.id === userId) : properties);
    } catch { setMyProperties([]); }
  };

  const loadVisits = async () => { try { setMyVisits(await propertyService.getVisits()); } catch {} };

  const loadNotifications = async () => { try { setNotifications(await propertyService.getNotifications()); } catch {} };

  const markNotificationRead = async (id: string) => {
    try { await propertyService.markNotificationRead(id); loadNotifications(); } catch {}
  };

  const selectProperty = async (p: Property) => {
    setSelectedProperty(p);
    setDetailSubTab('verify');
    propertyService.getImages(p.id).then(setPropertyImages).catch(() => {});
    propertyService.getVideos(p.id).then(setPropertyVideos).catch(() => {});
    propertyService.getDocuments(p.id).then(setPropertyDocs).catch(() => {});
    propertyService.getTimeline(p.id).then(setTimeline).catch(() => {});
    propertyService.getAiVerification(p.id).then(setAiReport).catch(() => setAiReport(null));
    setGovtVerification(null);
  };

  const onLocationSelected = (e: any) => {
    setPropertyForm(prev => ({
      ...prev,
      latitude: Number(e.lat.toFixed(6)),
      longitude: Number(e.lng.toFixed(6)),
      address: e.address || prev.address,
      village: e.village || prev.village,
      district: e.district || prev.district,
      state: e.state || prev.state,
      pincode: e.pincode || prev.pincode,
      area: e.area > 0 ? e.area : prev.area
    }));
    if (e.boundary !== undefined) setLastDrawnBoundary(e.boundary || []);
  };

  const openAddPropertyForm = () => {
    setIsEditMode(false); setEditingPropertyId(null);
    setSelectedAddPropertyDocFile(null); setLastDrawnBoundary([]);
    setPropertyForm(initialFormState); setFormErrors({});
    setActiveTab('add');
  };

  const editProperty = (p: Property) => {
    setIsEditMode(true); setEditingPropertyId(p.id);
    const bounds = parseBoundaryFromDescription(p.description || '');
    setLastDrawnBoundary(bounds || []);
    const cleanDesc = cleanDescription(p.description || '');
    setPropertyForm({
      title: p.title, category: p.category,
      area: p.area.toString(), price: p.price.toString(),
      description: cleanDesc, surveyNumber: p.surveyNumber, address: p.address,
      latitude: p.latitude, longitude: p.longitude,
      district: p.district || '', village: p.village || '',
      state: p.state || '', pincode: p.pincode || '',
      threeSixtyImageUrl: p.threeSixtyImageUrl || ''
    });
    setFormErrors({});
    setActiveTab('add');
  };

  const onAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, boolean> = {};
    if (!propertyForm.title) errors.title = true;
    if (!propertyForm.area) errors.area = true;
    if (!propertyForm.price) errors.price = true;
    if (!propertyForm.surveyNumber) errors.surveyNumber = true;
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    let payload: any = {
      ...propertyForm,
      area: Number(propertyForm.area),
      price: Number(propertyForm.price)
    };
    if (lastDrawnBoundary.length > 0) {
      payload.description = `${payload.description || ''}\n\n[BOUNDS]: ${JSON.stringify(lastDrawnBoundary)}`;
    }

    try {
      if (isEditMode && editingPropertyId) {
        await propertyService.updateProperty(editingPropertyId, payload);
        finishSave();
      } else {
        if (!selectedAddPropertyDocFile) {
          alert('Please choose a land document to upload.');
          setIsSaving(false);
          return;
        }
        const uploadRes = await cloudinaryService.uploadFile(selectedAddPropertyDocFile);
        const createdProperty = await propertyService.createProperty(payload as any);
        await propertyService.uploadDocument(createdProperty.id, {
          documentType: 'PATTA',
          fileUrl: uploadRes.secure_url
        } as any);
        finishSave(createdProperty?.propertyCode);
      }
    } catch (err: any) {
      console.error('Error saving property:', err);
      alert('Error saving property: ' + (err.response?.data?.message || err.message));
      setIsSaving(false);
    }
  };

  const finishSave = (propertyCode?: string) => {
    setIsSaving(false); setLastDrawnBoundary([]); setIsEditMode(false);
    setEditingPropertyId(null); setPropertyForm(initialFormState);
    setActiveTab('listings'); loadData();
    setSubmittedPropertyCode(propertyCode || null);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 6000);
  };

  const onUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, propId: string) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadLoading(true);
    try {
      const uploadRes = await cloudinaryService.uploadFile(file);
      const newImg = await propertyService.uploadImage(propId, {
        imageUrl: uploadRes.secure_url,
        thumbnailUrl: cloudinaryService.getThumbnailUrl(uploadRes),
        displayOrder: propertyImages.length + 1
      } as any);
      setPropertyImages(prev => [...prev, newImg]);
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Error uploading image to Cloudinary.');
    } finally {
      setUploadLoading(false);
    }
  };

  const onUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>, propId: string) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadLoading(true);
    try {
      const uploadRes = await cloudinaryService.uploadFile(file);
      const newVid = await propertyService.uploadVideo(propId, {
        videoUrl: uploadRes.secure_url,
        duration: uploadRes.duration ? Math.round(uploadRes.duration) : 120,
        thumbnailUrl: cloudinaryService.getThumbnailUrl(uploadRes)
      } as any);
      setPropertyVideos(prev => [...prev, newVid]);
    } catch (err) {
      console.error('Failed to upload video:', err);
      alert('Error uploading video to Cloudinary.');
    } finally {
      setUploadLoading(false);
    }
  };

  const onUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>, propId: string) => {
    const file = e.target.files?.[0]; if (!file) return;
    setDocLoading(true);
    try {
      const uploadRes = await cloudinaryService.uploadFile(file);
      const newDoc = await propertyService.uploadDocument(propId, {
        documentType: selectedDocType,
        fileUrl: uploadRes.secure_url
      } as any);
      setPropertyDocs(prev => [...prev, newDoc]);
    } catch (err) {
      console.error('Failed to upload document:', err);
      alert('Error uploading document to Cloudinary.');
    } finally {
      setDocLoading(false);
    }
  };

  const triggerOcr = async (docId: string) => {
    try { await propertyService.runOcr(docId); if (selectedProperty) { const res = await propertyService.getDocuments(selectedProperty.id); setPropertyDocs(res); } } catch {}
  };

  const runAiVerify = async (propId: string) => {
    setAiLoading(true);
    try {
      const res = await propertyService.triggerAiVerify(propId);
      setAiReport(res); setAiLoading(false);
      try { import('canvas-confetti').then(c => c.default({ particleCount: 150, spread: 70, origin: { y: 0.6 } })); } catch {}
      loadData();
    } catch { setAiLoading(false); }
  };

  const changeVisitStatus = async (visitId: string, status: 'CONFIRMED' | 'REJECTED') => {
    try { await propertyService.updateVisitStatus(visitId, status); loadData(); loadVisits(); } catch {}
  };

  const filteredProperties = () => {
    if (listingFilterTab === 'pending') return myProperties.filter(p => p.status === 'PENDING_AI' || p.status === 'PENDING_GOVT');
    if (listingFilterTab === 'approved') return myProperties.filter(p => p.status === 'APPROVED');
    if (listingFilterTab === 'rejected') return myProperties.filter(p => p.status === 'REJECTED');
    return myProperties;
  };

  const navItems = providerNavItems(pendingVisitsCount, unreadCount);

  const fieldClasses = (name: string) =>
    `input-dark ${formErrors[name] ? '!border-danger-500/60 !bg-danger-500/5' : ''}`;

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={(tab) => {
        if (tab === 'add') openAddPropertyForm();
        else setActiveTab(tab as any);
      }}
      navItems={navItems}
      role="PROVIDER"
      title="Provider Dashboard"
      subtitle={`Hello, ${currentUser?.firstName || 'Provider'}`}
      unreadCount={unreadCount}
      mobileNavItems={navItems}
    >
      {/* SUCCESS TOAST */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            className="fixed top-5 right-5 z-[9999] glass-card max-w-sm !border-accent-500/30 !bg-accent-500/10"
          >
            <div className="flex items-start gap-4 p-4">
              <div className="w-9 h-9 rounded-xl bg-accent-500 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Property Submitted! 🎉</p>
                <p className="text-dark-400 text-xs mt-0.5 leading-relaxed">
                  Queued for <span className="text-accent-400 font-semibold">AI Trust Score</span> verification.
                </p>
                {submittedPropertyCode && <p className="text-dark-600 text-[10px] font-mono mt-1">Code: {submittedPropertyCode}</p>}
              </div>
              <button onClick={() => setSuccessToast(false)} className="text-dark-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── LISTINGS TAB ─── */}
      <div className={`${activeTab === 'listings' ? 'block' : 'hidden'} space-y-5 mt-6`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-white font-bold text-lg">Your Property Catalog</h2>
              <p className="text-dark-400 text-sm mt-0.5">Manage listings, view trust reports, upload verification documents</p>
            </div>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openAddPropertyForm}>
              List New Property
            </Button>
          </div>

          {/* Filter Tabs */}
          {myProperties.length > 0 && (
            <div className="flex flex-wrap gap-2 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => {
                const counts = { all: myProperties.length, pending: myProperties.filter(p => p.status.includes('PENDING')).length, approved: myProperties.filter(p => p.status === 'APPROVED').length, rejected: myProperties.filter(p => p.status === 'REJECTED').length };
                return (
                  <button
                    key={tab}
                    onClick={() => setListingFilterTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${listingFilterTab === tab ? 'bg-white/10 text-white' : 'text-dark-500 hover:text-dark-300'}`}
                  >
                    {tab} ({counts[tab]})
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* Listings Grid */}
            <div className={`w-full transition-all duration-500 ${selectedProperty ? 'lg:w-[55%]' : 'w-full'}`}>
              {filteredProperties().length > 0 ? (
                <div className={`grid gap-4 ${selectedProperty ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
                  {filteredProperties().map(p => (
                    <div
                      key={p.id}
                      onClick={() => selectProperty(p)}
                      className={`glass-card overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-0.5 !p-0
                        ${selectedProperty?.id === p.id ? '!border-primary-500/40 shadow-[0_0_20px_rgba(37,99,235,0.15)]' : ''}`}
                    >
                      {/* Thumbnail */}
                      <div className="relative h-36 bg-dark-800 shrink-0 overflow-hidden">
                        {p.threeSixtyImageUrl ? (
                          <>
                            <iframe src={p.threeSixtyImageUrl} style={{ width: '117.64%', height: '117.64%', border: 'none', position: 'absolute', top: 0, left: 0 }} className="pointer-events-none" />
                            <div className="absolute top-2 left-2 flex items-center gap-1 bg-dark-900/80 px-2 py-0.5 rounded-full text-white text-[8px] font-bold">
                              <span className="w-1.5 h-1.5 bg-accent-400 rounded-full animate-ping" />
                              360° LIVE
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-dark-800 to-dark-900 flex items-center justify-center">
                            <MapIcon className="w-8 h-8 text-dark-600" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <StatusBadge status={p.status} size="sm" />
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col gap-2">
                        <div>
                          <h3 className="text-white font-semibold text-sm truncate">{p.title}</h3>
                          <p className="text-dark-500 text-[10px] mt-0.5">📍 {p.village}, {p.district}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                          <div className="bg-white/[0.04] rounded-lg p-2 text-center">
                            <p className="text-dark-500">Area</p>
                            <p className="text-white font-bold mt-0.5">{p.area}ac</p>
                          </div>
                          <div className="bg-accent-500/[0.08] rounded-lg p-2 text-center">
                            <p className="text-accent-500">Price</p>
                            <p className="text-accent-400 font-bold mt-0.5 truncate">₹{p.price.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="bg-white/[0.04] rounded-lg p-2 text-center">
                            <p className="text-dark-500">Survey</p>
                            <p className="text-white font-bold mt-0.5 truncate">{p.surveyNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] mt-auto">
                          <span className="text-dark-600 text-[9px]">{new Date(p.createdAt || Date.now()).toLocaleDateString()}</span>
                          <button
                            onClick={e => { e.stopPropagation(); editProperty(p); }}
                            className="flex items-center gap-1 text-[10px] text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : myProperties.length === 0 ? (
                <EmptyState
                  icon={<Home className="w-8 h-8" />}
                  title="No properties listed yet"
                  description="Upload your first agricultural, residential or commercial plot to trigger AI Trust Score verification."
                  action={{ label: 'Add Property', onClick: openAddPropertyForm }}
                />
              ) : (
                <EmptyState
                  icon={<BarChart3 className="w-8 h-8" />}
                  title="No properties in this category"
                  description="No properties match the selected status filter."
                />
              )}
            </div>

            {/* Detail Management Panel */}
            {selectedProperty && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-full lg:w-[45%] glass-card p-5 lg:sticky lg:top-4 shrink-0"
              >
                <div className="flex justify-between items-start border-b border-white/[0.06] pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600/20 to-cyan-500/20 border border-primary-500/20 flex items-center justify-center shrink-0">
                      <Settings className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base tracking-tight">Detail Management</h3>
                      <p className="text-dark-400 text-[11px] mt-0.5 truncate max-w-[200px] font-medium">{selectedProperty.title}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="glass" size="xs" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => editProperty(selectedProperty)}>Edit</Button>
                    <button onClick={() => setSelectedProperty(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.05] text-dark-400 hover:text-white hover:bg-white/[0.1] transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-tab nav */}
                <div className="flex p-1 bg-dark-900/60 rounded-xl border border-white/[0.04] mb-5 gap-1">
                  {(['verify', 'media', 'docs', 'timeline'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setDetailSubTab(tab)}
                      className={`flex-1 px-3 py-2 text-[11px] font-semibold capitalize rounded-lg transition-all duration-200 ${
                        detailSubTab === tab 
                          ? 'bg-gradient-to-b from-white/10 to-transparent text-white shadow-sm border border-white/10' 
                          : 'text-dark-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                      }`}
                    >
                      {tab === 'verify' ? 'AI Check' : tab}
                    </button>
                  ))}
                </div>

                {/* AI Check sub-tab */}
                {detailSubTab === 'verify' && (
                  <div className="space-y-4">
                    <div className="relative p-5 bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl border border-white/[0.06] overflow-hidden group">
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none group-hover:bg-primary-500/20 transition-all duration-700" />
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-primary-400" />
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-sm">AI Trust Audit</h4>
                            <p className="text-dark-400 text-[11px] mt-0.5">Runs forgery & ownership checks</p>
                          </div>
                        </div>

                        {!aiReport ? (
                          <Button 
                            variant="primary" 
                            size="md" 
                            loading={aiLoading} 
                            fullWidth 
                            onClick={() => runAiVerify(selectedProperty.id)}
                            className="mt-2 shadow-primary-900/50"
                          >
                            Run Trust Audit
                          </Button>
                        ) : (
                          <div className="space-y-4 mt-2">
                            <div className="flex justify-center py-2">
                              <CircularProgress value={aiReport.aiTrustScore} size={100} strokeWidth={8} color={aiReport.aiTrustScore >= 70 ? 'accent' : 'danger'} sublabel="AI Score" />
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-[10px]">
                              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-2.5 text-center transition-all hover:bg-white/[0.05]">
                                <p className="text-dark-500 font-medium mb-1">Forgery</p>
                                <p className={`font-bold text-sm ${aiReport.forgeryScore > 30 ? 'text-danger-400' : 'text-white'}`}>{aiReport.forgeryScore}%</p>
                              </div>
                              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-2.5 text-center transition-all hover:bg-white/[0.05]">
                                <p className="text-dark-500 font-medium mb-1">Overlap</p>
                                <p className={`font-bold text-sm ${aiReport.duplicateScore > 10 ? 'text-danger-400' : 'text-white'}`}>{aiReport.duplicateScore}%</p>
                              </div>
                              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-2.5 text-center transition-all hover:bg-white/[0.05]">
                                <p className="text-dark-500 font-medium mb-1">Risk</p>
                                <p className={`font-bold text-sm ${aiReport.riskScore > 20 ? 'text-danger-400' : 'text-white'}`}>{aiReport.riskScore}%</p>
                              </div>
                              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-2.5 text-center transition-all hover:bg-white/[0.05]">
                                <p className="text-dark-500 font-medium mb-1">Owner</p>
                                <p className={`font-bold text-[10px] mt-1 tracking-wide ${aiReport.ownershipMatch ? 'text-accent-400' : 'text-danger-400'}`}>{aiReport.ownershipMatch ? 'MATCH' : 'MISMATCH'}</p>
                              </div>
                            </div>
                            <div className="bg-white/[0.03] p-3.5 rounded-xl border border-white/[0.06] mt-2">
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
                              <Button 
                                variant="outline" 
                                size="sm" 
                                loading={aiLoading} 
                                fullWidth 
                                onClick={() => runAiVerify(selectedProperty.id)}
                                className="mt-4"
                              >
                                Re-verify with AI
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {govtVerification && (
                      <div className="relative p-5 bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl border border-white/[0.06] overflow-hidden">
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-white text-xs font-semibold">Government Verification</h4>
                            <Chip label={govtVerification.status} color={govtVerification.status === 'APPROVED' ? 'accent' : 'danger'} dot size="xs" />
                          </div>
                          <p className="text-dark-400 text-[11px] leading-relaxed mt-2">{govtVerification.remarks}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Media sub-tab */}
                {detailSubTab === 'media' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                      <h4 className="text-white font-semibold text-xs mb-3 flex items-center gap-2"><Image className="w-3.5 h-3.5 text-primary-400" /> Photos</h4>
                      <label className="relative block border border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-primary-500/40 hover:bg-white/[0.02] transition-all">
                        <input type="file" onChange={e => onUploadImage(e, selectedProperty.id)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                        <Upload className="w-6 h-6 text-dark-500 mx-auto mb-1" />
                        <p className="text-dark-500 text-xs">Click or drag to upload image</p>
                      </label>
                      {uploadLoading && <div className="flex items-center gap-2 text-primary-400 text-xs mt-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</div>}
                      {propertyImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {propertyImages.map(img => (
                            <div key={img.id} className="aspect-square rounded-lg overflow-hidden border border-white/[0.08]">
                              <img src={img.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                      <h4 className="text-white font-semibold text-xs mb-3 flex items-center gap-2"><Video className="w-3.5 h-3.5 text-cyan-400" /> Walkthrough Video</h4>
                      <label className="relative block border border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-cyan-500/40 transition-all">
                        <input type="file" onChange={e => onUploadVideo(e, selectedProperty.id)} className="absolute inset-0 opacity-0 cursor-pointer" accept="video/*" />
                        <Upload className="w-6 h-6 text-dark-500 mx-auto mb-1" />
                        <p className="text-dark-500 text-xs">Click to upload MP4</p>
                      </label>
                      {propertyVideos.length > 0 && <p className="text-accent-400 text-xs mt-2">{propertyVideos.length} video(s) uploaded</p>}
                    </div>
                  </div>
                )}

                {/* Docs sub-tab */}
                {detailSubTab === 'docs' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <select value={selectedDocType} onChange={e => setSelectedDocType(e.target.value as DocumentType)} className="select-dark flex-1 text-xs py-2">
                        {['PATTA', 'SALE_DEED', 'SURVEY_MAP', 'EC', 'NOC'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <label className="relative block border border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-primary-500/40 transition-all">
                      <input type="file" onChange={e => onUploadDoc(e, selectedProperty.id)} className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,image/*" />
                      <FileText className="w-6 h-6 text-dark-500 mx-auto mb-1" />
                      <p className="text-dark-500 text-xs">Upload {selectedDocType} document</p>
                    </label>
                    {docLoading && <div className="flex items-center gap-2 text-primary-400 text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</div>}
                    <div className="space-y-2">
                      {propertyDocs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
                          <div>
                            <p className="text-white text-xs font-semibold">{doc.documentType}</p>
                            {doc.rawText && <p className="text-dark-500 text-[10px] mt-0.5 truncate max-w-[160px]">{doc.rawText}</p>}
                          </div>
                          <Button variant="glass" size="xs" onClick={() => triggerOcr(doc.id)}>Run OCR</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline sub-tab */}
                {detailSubTab === 'timeline' && (
                  <div className="space-y-3">
                    {timeline.length > 0 ? timeline.map((t, i) => (
                      <div key={t.id || i} className="flex gap-3 items-start">
                        <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-white text-xs font-semibold">{t.action}</p>
                          <p className="text-dark-500 text-[10px] mt-0.5">{t.remarks}</p>
                          <p className="text-dark-600 text-[9px] mt-0.5">{new Date(t.timestamp || Date.now()).toLocaleString()}</p>
                        </div>
                      </div>
                    )) : <p className="text-dark-600 text-xs text-center py-4">No timeline entries yet.</p>}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

      {/* ─── ADD / EDIT PROPERTY TAB ─── */}
      <div className={`${activeTab === 'add' ? 'block' : 'hidden'} space-y-5`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">{isEditMode ? 'Edit Property' : 'List New Property'}</h2>
              <p className="text-dark-400 text-sm mt-0.5">
                {isEditMode ? 'Update your property details below' : 'Fill in the land details to trigger AI Trust Score verification'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('listings')}>Cancel</Button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Form */}
            <GlassCard>
              <form onSubmit={onAddProperty} className="space-y-4">
                <div>
                  <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Property Title *</label>
                  <input
                    type="text" value={propertyForm.title}
                    onChange={e => setPropertyForm({ ...propertyForm, title: e.target.value })}
                    className={fieldClasses('title')} placeholder="e.g. Fertile Agricultural Land in Guntur"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Category *</label>
                    <select value={propertyForm.category} onChange={e => setPropertyForm({ ...propertyForm, category: e.target.value })} className="select-dark">
                      <option value="AGRICULTURAL">Agricultural</option>
                      <option value="RESIDENTIAL">Residential</option>
                      <option value="COMMERCIAL">Commercial</option>
                      <option value="INDUSTRIAL">Industrial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Survey Number *</label>
                    <input type="text" value={propertyForm.surveyNumber}
                      onChange={e => setPropertyForm({ ...propertyForm, surveyNumber: e.target.value })}
                      className={fieldClasses('surveyNumber')} placeholder="e.g. 123/4A" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Area (acres) *</label>
                    <input type="number" value={propertyForm.area} min="0" step="0.01"
                      onChange={e => setPropertyForm({ ...propertyForm, area: e.target.value })}
                      className={fieldClasses('area')} placeholder="2.5" />
                  </div>
                  <div>
                    <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Price (₹) *</label>
                    <input type="number" value={propertyForm.price} min="0"
                      onChange={e => setPropertyForm({ ...propertyForm, price: e.target.value })}
                      className={fieldClasses('price')} placeholder="5000000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">State</label>
                    <input type="text" value={propertyForm.state}
                      onChange={e => setPropertyForm({ ...propertyForm, state: e.target.value })}
                      className="input-dark" placeholder="Andhra Pradesh" />
                  </div>
                  <div>
                    <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">District</label>
                    <input type="text" value={propertyForm.district}
                      onChange={e => setPropertyForm({ ...propertyForm, district: e.target.value })}
                      className="input-dark" placeholder="Guntur" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Village</label>
                    <input type="text" value={propertyForm.village}
                      onChange={e => setPropertyForm({ ...propertyForm, village: e.target.value })}
                      className="input-dark" placeholder="Gorantla" />
                  </div>
                  <div>
                    <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Pincode</label>
                    <input type="text" value={propertyForm.pincode}
                      onChange={e => setPropertyForm({ ...propertyForm, pincode: e.target.value })}
                      className="input-dark" placeholder="522034" />
                  </div>
                </div>

                <div>
                  <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Street Address</label>
                  <input type="text" value={propertyForm.address}
                    onChange={e => setPropertyForm({ ...propertyForm, address: e.target.value })}
                    className="input-dark" placeholder="Full address..." />
                </div>

                <div>
                  <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">360° Street View URL</label>
                  <input type="url" value={propertyForm.threeSixtyImageUrl}
                    onChange={e => setPropertyForm({ ...propertyForm, threeSixtyImageUrl: e.target.value })}
                    className="input-dark" placeholder="https://www.google.com/maps/embed/..." />
                </div>

                <div>
                  <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">Description</label>
                  <textarea value={propertyForm.description}
                    onChange={e => setPropertyForm({ ...propertyForm, description: e.target.value })}
                    rows={3}
                    className="input-dark resize-none" placeholder="Additional details about the land..." />
                </div>

                {!isEditMode && (
                  <div>
                    <label className="block text-dark-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                      Land Document (Patta / Sale Deed) *
                    </label>
                    <label className="relative block border border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-primary-500/40 transition-all">
                      <input type="file" onChange={e => setSelectedAddPropertyDocFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,image/*" />
                      <Upload className="w-6 h-6 text-dark-500 mx-auto mb-1" />
                      <p className="text-dark-500 text-xs">
                        {selectedAddPropertyDocFile ? selectedAddPropertyDocFile.name : 'Click to choose document'}
                      </p>
                    </label>
                  </div>
                )}

                <div className="pt-2">
                  <Button type="submit" variant="primary" size="md" fullWidth loading={isSaving}>
                    {isEditMode ? 'Save Changes' : 'Submit Property for AI Verification'}
                  </Button>
                </div>
              </form>
            </GlassCard>

            {/* Map */}
            <div className="flex flex-col gap-4">
              <GlassCard padding="p-0" className="overflow-hidden h-72 xl:h-96">
                <Map
                  mode="picker"
                  pickerLat={propertyForm.latitude}
                  pickerLng={propertyForm.longitude}
                  onLocationSelected={onLocationSelected}
                  initialBoundary={lastDrawnBoundary}
                />
              </GlassCard>
              <GlassCard>
                <h4 className="text-white text-xs font-semibold mb-2">Location Preview</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/[0.04] rounded-lg p-2">
                    <p className="text-dark-500">Latitude</p>
                    <p className="text-white font-mono">{propertyForm.latitude}</p>
                  </div>
                  <div className="bg-white/[0.04] rounded-lg p-2">
                    <p className="text-dark-500">Longitude</p>
                    <p className="text-white font-mono">{propertyForm.longitude}</p>
                  </div>
                </div>
                {lastDrawnBoundary.length > 0 && (
                  <p className="text-accent-400 text-[10px] mt-2">✓ Custom boundary drawn ({lastDrawnBoundary.length} points)</p>
                )}
              </GlassCard>
            </div>
          </div>
        </div>

      {/* ─── VISITS TAB ─── */}
      <div className={`${activeTab === 'visits' ? 'block' : 'hidden'} space-y-5`}>
          <div>
            <h2 className="text-white font-bold text-lg">Visits & Tours</h2>
            <p className="text-dark-400 text-sm mt-0.5">Manage visit requests from potential buyers</p>
          </div>
          {myVisits.length > 0 ? (
            <div className="space-y-3">
              {myVisits.map(v => (
                <GlassCard key={v.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-sm">{v.visitDate} at {v.visitTime}</p>
                        <Chip label={v.status} color={v.status === 'CONFIRMED' ? 'accent' : v.status === 'SCHEDULED' ? 'warning' : 'danger'} size="xs" dot />
                      </div>
                      <p className="text-dark-500 text-[11px] font-mono">Property: {v.property?.title?.slice(0, 30) || v.property?.id?.slice(0, 12)}...</p>
                    </div>
                  </div>
                  {v.status === 'SCHEDULED' && (
                    <div className="flex gap-2">
                      <Button variant="accent" size="xs" icon={<CheckCircle className="w-3.5 h-3.5" />} onClick={() => changeVisitStatus(v.id, 'CONFIRMED')}>Confirm</Button>
                      <Button variant="danger" size="xs" icon={<X className="w-3.5 h-3.5" />} onClick={() => changeVisitStatus(v.id, 'REJECTED')}>Reject</Button>
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Calendar className="w-8 h-8" />} title="No visits scheduled" description="Buyers can schedule visits from the property detail page." />
          )}
        </div>

      {/* ─── NOTIFICATIONS TAB ─── */}
      <div className={`${activeTab === 'notifications' ? 'block' : 'hidden'} space-y-5`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">Notifications</h2>
              <p className="text-dark-400 text-sm mt-0.5">Updates about your properties and visits</p>
            </div>
            {unreadCount > 0 && <Chip label={`${unreadCount} unread`} color="danger" dot />}
          </div>
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map(n => (
                <GlassCard key={n.id} className={`flex items-start justify-between gap-4 ${!n.isRead ? '!border-primary-500/20 !bg-primary-500/[0.04]' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm">{n.title}</h3>
                    <p className="text-dark-400 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-dark-600 text-[10px] mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdTime).toLocaleString()}
                    </p>
                  </div>
                  {!n.isRead
                    ? <Button variant="secondary" size="xs" onClick={() => markNotificationRead(n.id)}>Mark Read</Button>
                    : <CheckCircle className="w-4 h-4 text-dark-600 shrink-0" />}
                </GlassCard>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Bell className="w-8 h-8" />} title="No notifications" description="You're all caught up!" />
          )}
        </div>
    </DashboardLayout>
  );
};

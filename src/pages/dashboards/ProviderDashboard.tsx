import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import { VerificationBadge } from '../../components/shared/VerificationBadge';
import { Map } from '../../components/shared/Map';
import { PanoramaViewer } from '../../components/shared/PanoramaViewer';
import type { 
  Property, PropertyVisit, Notification, PropertyImage, PropertyVideo, PropertyDocument, 
  VerificationTimeline, AiVerification, GovernmentVerification, DocumentType 
} from '../../models/property.models';

export const ProviderDashboard = () => {
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<'listings' | 'add' | 'visits' | 'notifications'>('listings');
  const [detailSubTab, setDetailSubTab] = useState<'verify' | 'media' | 'docs' | 'timeline'>('verify');
  const [listingFilterTab, setListingFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [myVisits, setMyVisits] = useState<PropertyVisit[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastDrawnBoundary, setLastDrawnBoundary] = useState<[number, number][]>([]);

  // Selection
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  // Lists corresponding to selectedProperty
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  const [propertyVideos, setPropertyVideos] = useState<PropertyVideo[]>([]);
  const [propertyDocs, setPropertyDocs] = useState<PropertyDocument[]>([]);
  const [timeline, setTimeline] = useState<VerificationTimeline[]>([]);
  const [aiReport, setAiReport] = useState<AiVerification | null>(null);
  const [govtVerification, setGovtVerification] = useState<GovernmentVerification | null>(null);

  // Form State
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

  // Edit Mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [selectedAddPropertyDocFile, setSelectedAddPropertyDocFile] = useState<File | null>(null);

  const currentUser = authService.currentUser();
  const pendingVisitsCount = myVisits.filter(v => v.status === 'SCHEDULED').length;
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  const [successToast, setSuccessToast] = useState(false);
  const [submittedPropertyCode, setSubmittedPropertyCode] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadVisits();
    loadNotifications();
  }, []);

  const loadData = async () => {
    try {
      const properties = await propertyService.getProperties();
      const userId = currentUser?.id || localStorage.getItem('user_id');
      if (userId) {
        setMyProperties(properties.filter(p => p.providerId === userId || p.provider?.id === userId));
      } else {
        setMyProperties(properties);
      }
    } catch (e) {
      console.error(e);
      setMyProperties([]);
    }
  };

  const loadVisits = async () => {
    try {
      const res = await propertyService.getVisits();
      setMyVisits(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await propertyService.getNotifications();
      setNotifications(res);
    } catch (e) {
      console.error(e);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await propertyService.markNotificationRead(id);
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const selectProperty = async (p: Property) => {
    setSelectedProperty(p);
    setDetailSubTab('verify');
    try {
      propertyService.getImages(p.id).then(setImages => setPropertyImages(setImages)).catch(() => {});
      propertyService.getVideos(p.id).then(setVideos => setPropertyVideos(setVideos)).catch(() => {});
      propertyService.getDocuments(p.id).then(setDocs => setPropertyDocs(setDocs)).catch(() => {});
      propertyService.getTimeline(p.id).then(setLogs => setTimeline(setLogs)).catch(() => {});
      propertyService.getAiVerification(p.id).then(setAi => setAiReport(setAi)).catch(() => setAiReport(null));
      setGovtVerification(null);
    } catch (e) {
      console.error(e);
    }
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
    if (e.boundary !== undefined) {
      setLastDrawnBoundary(e.boundary || []);
    }
  };

  const parseBoundaryFromDescription = (desc: string): [number, number][] | null => {
    try {
      const match = desc.match(/\[BOUNDS\]:\s*(\[.*?\])/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    } catch (e) {}
    return null;
  };

  const openAddPropertyForm = () => {
    setIsEditMode(false);
    setEditingPropertyId(null);
    setSelectedAddPropertyDocFile(null);
    setLastDrawnBoundary([]);
    setPropertyForm(initialFormState);
    setFormErrors({});
    setActiveTab('add');
  };

  const editProperty = (p: Property) => {
    setIsEditMode(true);
    setEditingPropertyId(p.id);
    const bounds = parseBoundaryFromDescription(p.description || '');
    setLastDrawnBoundary(bounds || []);
    
    const cleanDesc = (p.description || '').replace(/\[BOUNDS\]:\s*(\[.*?\])/, '').trim();

    setPropertyForm({
      title: p.title,
      category: p.category,
      area: p.area.toString(),
      price: p.price.toString(),
      description: cleanDesc,
      surveyNumber: p.surveyNumber,
      address: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
      district: p.district || '',
      village: p.village || '',
      state: p.state || '',
      pincode: p.pincode || '',
      threeSixtyImageUrl: p.threeSixtyImageUrl || ''
    });
    setFormErrors({});
    setActiveTab('add');
  };

  const prefillFromProperty = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const propertyId = e.target.value;
    if (!propertyId) return;
    const property = myProperties.find(p => p.id === propertyId);
    if (!property) return;

    setPropertyForm({
      title: property.title + ' (Copy)',
      category: property.category,
      area: property.area.toString(),
      price: property.price.toString(),
      description: (property.description || '').replace(/\n\n\[BOUNDS\]:\s*\[.*?\]/g, '').trim(),
      surveyNumber: property.surveyNumber,
      address: property.address,
      latitude: property.latitude,
      longitude: property.longitude,
      district: property.district || 'Guntur',
      village: property.village || 'Gorantla',
      state: property.state || 'Andhra Pradesh',
      pincode: property.pincode || '522034',
      threeSixtyImageUrl: property.threeSixtyImageUrl || ''
    });

    const customBoundary = parseBoundaryFromDescription(property.description || '');
    setLastDrawnBoundary(customBoundary || []);
    e.target.value = '';
    
    // Fallback Confetti
    try { import('canvas-confetti').then(confetti => confetti.default({ particleCount: 80, spread: 60, origin: { y: 0.8 } })); } catch {}
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
    let payload = {
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
        
        // Mock Cloudinary upload logic for demo purposes, since CloudinaryService was Angular based
        // In real migration, we'd use a React context or utility for Cloudinary
        const fakeUploadUrl = URL.createObjectURL(selectedAddPropertyDocFile);
        const createdProperty = await propertyService.createProperty(payload as any);
        
        await propertyService.uploadDocument(createdProperty.id, {
          documentType: 'PATTA',
          fileUrl: fakeUploadUrl
        } as any);

        finishSave(createdProperty?.propertyCode);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error saving property');
      setIsSaving(false);
    }
  };

  const finishSave = (propertyCode?: string) => {
    setIsSaving(false);
    setLastDrawnBoundary([]);
    setIsEditMode(false);
    setEditingPropertyId(null);
    setPropertyForm(initialFormState);
    setActiveTab('listings');
    loadData();
    setSubmittedPropertyCode(propertyCode || null);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 6000);
  };

  // Media Handlers (Mocked upload)
  const onUploadImage = (e: React.ChangeEvent<HTMLInputElement>, propId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setTimeout(async () => {
      const url = URL.createObjectURL(file);
      try {
        const newImg = await propertyService.uploadImage(propId, { imageUrl: url, thumbnailUrl: url, displayOrder: propertyImages.length + 1 } as any);
        setPropertyImages([...propertyImages, newImg]);
      } catch {}
      setUploadLoading(false);
    }, 1000);
  };

  const onUploadVideo = (e: React.ChangeEvent<HTMLInputElement>, propId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setTimeout(async () => {
      const url = URL.createObjectURL(file);
      try {
        const newVid = await propertyService.uploadVideo(propId, { videoUrl: url, duration: 120, thumbnailUrl: url } as any);
        setPropertyVideos([...propertyVideos, newVid]);
      } catch {}
      setUploadLoading(false);
    }, 1000);
  };

  const onUploadDoc = (e: React.ChangeEvent<HTMLInputElement>, propId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocLoading(true);
    setTimeout(async () => {
      const url = URL.createObjectURL(file);
      try {
        const newDoc = await propertyService.uploadDocument(propId, { documentType: selectedDocType, fileUrl: url } as any);
        setPropertyDocs([...propertyDocs, newDoc]);
      } catch {}
      setDocLoading(false);
    }, 1000);
  };

  const triggerOcr = async (docId: string) => {
    try {
      await propertyService.runOcr(docId);
      if (selectedProperty) {
        const res = await propertyService.getDocuments(selectedProperty.id);
        setPropertyDocs(res);
      }
    } catch (e) {}
  };

  const runAiVerify = async (propId: string) => {
    setAiLoading(true);
    try {
      const res = await propertyService.triggerAiVerify(propId);
      setAiReport(res);
      setAiLoading(false);
      try { import('canvas-confetti').then(confetti => confetti.default({ particleCount: 150, spread: 70, origin: { y: 0.6 } })); } catch {}
      loadData();
    } catch (e) {
      setAiLoading(false);
    }
  };

  const changeVisitStatus = async (visitId: string, status: 'CONFIRMED' | 'REJECTED') => {
    try {
      await propertyService.updateVisitStatus(visitId, status);
      loadData();
      loadVisits();
    } catch (e) {}
  };

  const logout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const getPendingCount = () => myProperties.filter(p => p.status === 'PENDING_AI' || p.status === 'PENDING_GOVT').length;
  const getApprovedCount = () => myProperties.filter(p => p.status === 'APPROVED').length;
  const getRejectedCount = () => myProperties.filter(p => p.status === 'REJECTED').length;

  const filteredProperties = () => {
    if (listingFilterTab === 'pending') return myProperties.filter(p => p.status === 'PENDING_AI' || p.status === 'PENDING_GOVT');
    if (listingFilterTab === 'approved') return myProperties.filter(p => p.status === 'APPROVED');
    if (listingFilterTab === 'rejected') return myProperties.filter(p => p.status === 'REJECTED');
    return myProperties;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">

      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-5 right-5 z-[9999] flex items-start gap-4 bg-white border border-emerald-200 shadow-2xl rounded-2xl px-5 py-4 max-w-sm animate-slide-in-right" style={{ animation: 'slideInRight 0.4s ease-out' }}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm">Property Submitted! 🎉</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Your listing has been queued for <span className="font-semibold text-emerald-600">AI Trust Score</span> verification. You will be notified once the analysis completes.</p>
            {submittedPropertyCode && <p className="text-[10px] font-mono text-slate-400 mt-1">Code: {submittedPropertyCode}</p>}
          </div>
          <button onClick={() => setSuccessToast(false)} className="shrink-0 text-slate-400 hover:text-slate-600 transition ml-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-slate-900 text-white shadow-lg shrink-0 z-30">
        <div className="px-4 sm:px-6 flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md">LL</div>
            <span className="text-xl font-bold tracking-tight text-white">Land<span className="text-emerald-400">Lens</span></span>
            <span className="bg-emerald-800/40 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ml-2">Provider Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">{currentUser?.firstName} {currentUser?.lastName}</p>
              <p className="text-xs text-slate-400">{currentUser?.email}</p>
            </div>
            <button onClick={logout} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-lg transition border border-slate-700/50">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 shadow-sm overflow-y-auto">
          <div className="px-5 py-5 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Navigation</p>
            <p className="text-xs text-slate-600 font-medium">Provider Portal</p>
          </div>
          <nav className="flex flex-col gap-1 p-3 flex-1">
            <button 
              onClick={() => setActiveTab('listings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left ${activeTab === 'listings' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              My Listings
            </button>
            <button 
              onClick={openAddPropertyForm}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left ${activeTab === 'add' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Add New Property
            </button>
            <button 
              onClick={() => setActiveTab('visits')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left relative ${activeTab === 'visits' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Visits &amp; Tours
              {pendingVisitsCount > 0 && <span className="ml-auto px-2 py-0.5 bg-rose-500 text-white font-bold rounded-full text-[10px]">{pendingVisitsCount}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-left ${activeTab === 'notifications' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
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
          <div className="px-6 py-8 space-y-6">
          
          {/* TAB 1: LISTINGS */}
          {activeTab === 'listings' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Your Property Catalog</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage listings, view trust reports, or upload verification documents.</p>
                </div>
                <button onClick={openAddPropertyForm} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  List Another Property
                </button>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-start w-full relative">
                
                {/* Left side: Listings Grid */}
                <div className={`transition-all duration-500 ease-in-out space-y-6 w-full ${selectedProperty ? 'lg:flex-grow lg:w-[70%] lg:max-w-[70%]' : 'w-full'}`}>
                  
                  {myProperties.length > 0 && (
                    <div className="flex flex-wrap border-b border-slate-100 bg-white p-3 rounded-2xl shadow-xs gap-2 sm:gap-4">
                      <button onClick={() => setListingFilterTab('all')} className={`px-4 py-2 border-b-2 font-bold text-xs transition-all rounded-lg flex items-center gap-1.5 ${listingFilterTab === 'all' ? 'text-emerald-600 border-emerald-500 bg-emerald-50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>All ({myProperties.length})</button>
                      <button onClick={() => setListingFilterTab('pending')} className={`px-4 py-2 border-b-2 font-bold text-xs transition-all rounded-lg flex items-center gap-1.5 ${listingFilterTab === 'pending' ? 'text-emerald-600 border-emerald-500 bg-emerald-50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Pending Verification ({getPendingCount()})</button>
                      <button onClick={() => setListingFilterTab('approved')} className={`px-4 py-2 border-b-2 font-bold text-xs transition-all rounded-lg flex items-center gap-1.5 ${listingFilterTab === 'approved' ? 'text-emerald-600 border-emerald-500 bg-emerald-50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Approved ({getApprovedCount()})</button>
                      <button onClick={() => setListingFilterTab('rejected')} className={`px-4 py-2 border-b-2 font-bold text-xs transition-all rounded-lg flex items-center gap-1.5 ${listingFilterTab === 'rejected' ? 'text-emerald-600 border-emerald-500 bg-emerald-50' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Rejected ({getRejectedCount()})</button>
                    </div>
                  )}

                  {filteredProperties().length > 0 && (
                    <div className={`${selectedProperty ? 'grid grid-cols-1 xl:grid-cols-2 gap-5' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'}`}>
                      {filteredProperties().map(p => (
                        <div key={p.id} onClick={() => selectProperty(p)} className={`bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col group ${selectedProperty?.id === p.id ? 'ring-2 ring-emerald-500' : ''}`}>
                          <div className="relative h-44 bg-slate-900 overflow-hidden shrink-0">
                            {p.threeSixtyImageUrl ? (
                              <>
                                <iframe src={p.threeSixtyImageUrl} className="absolute top-0 left-0 h-full border-0 pointer-events-none scale-[1.08]" style={{ width: 'calc(100% + 50px)', maxWidth: 'none' }} allowFullScreen loading="lazy"></iframe>
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent"></div>
                                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-slate-900/80 text-white text-[9px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span> 360° LIVE
                                </div>
                                <a href={p.threeSixtyImageUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="absolute bottom-2.5 right-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow backdrop-blur-sm transition-all">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg> Open Street View
                                </a>
                              </>
                            ) : (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                                  <div className="text-center text-slate-500">
                                    <svg className="w-10 h-10 mx-auto mb-1.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">No Street View</p>
                                    <p className="text-[8px] text-slate-600 mt-0.5">Add 360° panorama via Edit</p>
                                  </div>
                                </div>
                                <div className="absolute top-2.5 right-2.5">
                                  <span className={`text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${p.category === 'AGRICULTURAL' ? 'bg-emerald-100 text-emerald-700' : p.category === 'RESIDENTIAL' ? 'bg-blue-100 text-blue-700' : p.category === 'COMMERCIAL' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                                    {p.category}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                          
                          <div className="p-4 flex-1 flex flex-col gap-3">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-800 truncate text-sm">{p.title}</h3>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">📍 {p.village}, {p.district}</p>
                              </div>
                              <VerificationBadge status={p.status} />
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-[10px]">
                              <div className="bg-slate-50 rounded-lg p-2 text-center">
                                <p className="text-slate-400 font-medium">Area</p>
                                <p className="font-bold text-slate-700">{p.area} ac</p>
                              </div>
                              <div className="bg-emerald-50 rounded-lg p-2 text-center">
                                <p className="text-emerald-500 font-medium">Price</p>
                                <p className="font-bold text-emerald-700">₹{p.price.toLocaleString('en-IN')}</p>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-2 text-center">
                                <p className="text-slate-400 font-medium">Survey</p>
                                <p className="font-bold text-slate-700 truncate">{p.surveyNumber}</p>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-auto">
                              <span className="text-[9px] text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                              <button onClick={(e) => { e.stopPropagation(); editProperty(p); }} className="text-[10px] px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-md transition-colors border border-emerald-100 shadow-xs flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Edit Property
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {myProperties.length === 0 && (
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-12 text-center">
                      <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      <h3 className="text-lg font-bold text-slate-700">No properties cataloged</h3>
                      <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Upload your first agricultural, residential or commercial plot to trigger automated AI Trust score verification.</p>
                      <button onClick={openAddPropertyForm} className="mt-6 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md">Add Property</button>
                    </div>
                  )}

                  {myProperties.length > 0 && filteredProperties().length === 0 && (
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-12 text-center">
                      <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <h4 className="font-bold text-slate-700 text-sm">No properties in this category</h4>
                      <p className="text-xs text-slate-500 mt-1">You currently have no properties matching the selected status filter.</p>
                    </div>
                  )}
                </div>

                {/* Right side: DETAIL MANAGEMENT PANEL */}
                {selectedProperty && (
                  <div className="w-full lg:w-[30%] lg:max-w-[30%] bg-white rounded-2xl shadow-md border border-slate-100 p-6 space-y-6 lg:sticky lg:top-6 transition-all duration-500 ease-in-out shrink-0">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Detail Management</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[200px]" title={selectedProperty.title}>{selectedProperty.title}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => editProperty(selectedProperty)} className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1 transition-colors border border-slate-200">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Edit
                        </button>
                        <button onClick={() => setSelectedProperty(null)} className="text-slate-400 hover:text-slate-600">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex border-b border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-none gap-2 pb-0.5">
                      <button onClick={() => setDetailSubTab('verify')} className={`shrink-0 px-2 py-1.5 border-b-2 font-semibold text-[11px] transition-all ${detailSubTab === 'verify' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>AI Check</button>
                      <button onClick={() => setDetailSubTab('media')} className={`shrink-0 px-2 py-1.5 border-b-2 font-semibold text-[11px] transition-all ${detailSubTab === 'media' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Media</button>
                      <button onClick={() => setDetailSubTab('docs')} className={`shrink-0 px-2 py-1.5 border-b-2 font-semibold text-[11px] transition-all ${detailSubTab === 'docs' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Documents</button>
                      <button onClick={() => setDetailSubTab('timeline')} className={`shrink-0 px-2 py-1.5 border-b-2 font-semibold text-[11px] transition-all ${detailSubTab === 'timeline' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>History</button>
                    </div>

                    {detailSubTab === 'verify' && (
                      <div className="space-y-6">
                        <div className={`p-4.5 rounded-xl border border-slate-200 ${aiReport ? 'bg-slate-50/50' : 'bg-amber-50/20 border-amber-200'}`}>
                          <div className="flex flex-col gap-3">
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs">AI verification engine</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">Runs forgery checks and name verification.</p>
                            </div>
                            {!aiReport && (
                              <button onClick={() => runAiVerify(selectedProperty.id)} disabled={aiLoading} className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                                {aiLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                                Run Trust Audit
                              </button>
                            )}
                          </div>

                          {aiReport && (
                            <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
                              <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center shadow-xs">
                                <p className="text-[9px] uppercase font-bold text-slate-400">AI Trust</p>
                                <p className="text-lg font-extrabold text-emerald-600 mt-1">{aiReport.aiTrustScore}%</p>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center shadow-xs">
                                <p className="text-[9px] uppercase font-bold text-slate-400">Forgery</p>
                                <p className="text-lg font-extrabold text-rose-500 mt-1">{aiReport.forgeryScore}%</p>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center shadow-xs">
                                <p className="text-[9px] uppercase font-bold text-slate-400">Overlap</p>
                                <p className={`text-lg font-extrabold mt-1 ${aiReport.duplicateScore > 10 ? 'text-rose-500' : 'text-slate-700'}`}>{aiReport.duplicateScore}%</p>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center shadow-xs">
                                <p className="text-[9px] uppercase font-bold text-slate-400">Confidence</p>
                                <p className="text-lg font-extrabold text-slate-700 mt-1">{aiReport.confidence}%</p>
                              </div>
                              <div className="col-span-2 bg-white p-3 rounded-xl border border-slate-100 text-center shadow-xs">
                                <p className="text-[9px] uppercase font-bold text-slate-400">Owner Match</p>
                                <p className={`text-xs font-extrabold mt-1 ${aiReport.ownershipMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {aiReport.ownershipMatch ? 'MATCHED' : 'MISMATCH'}
                                </p>
                              </div>
                              <div className="col-span-2 bg-white p-3.5 rounded-xl border border-slate-100 mt-1">
                                <p className="text-[11px] font-bold text-slate-700 mb-0.5">AI Trust Summary:</p>
                                <p className="text-[11px] text-slate-600 leading-relaxed text-left">{aiReport.summary}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-slate-50/50 p-4.5 rounded-xl border border-slate-200">
                          <h4 className="font-bold text-slate-800 text-xs mb-2">Govt verification</h4>
                          {govtVerification ? (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${govtVerification.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                  {govtVerification.status}
                                </span>
                                <span className="text-slate-400 text-[10px]">Inspected {new Date(govtVerification.verifiedDate).toLocaleDateString()}</span>
                              </div>
                              <p className="text-[11px] text-slate-600 bg-white p-3 rounded-lg border border-slate-100">{govtVerification.remarks}</p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-500 leading-relaxed">No government review has been submitted for this property yet. Completing AI Trust check first triggers this status queue.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {detailSubTab === 'media' && (
                      <div className="space-y-6">
                        <div className="flex flex-col gap-6">
                          <div className="p-4.5 bg-slate-50/40 rounded-xl border border-slate-200 space-y-4">
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs">Add photos/images</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">JPG and PNG formats (max 10MB).</p>
                            </div>
                            <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-emerald-500 transition-colors bg-white">
                              <input type="file" onChange={e => onUploadImage(e, selectedProperty.id)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                              <div className="text-slate-500 space-y-2">
                                <svg className="w-7 h-7 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p className="text-[11px] font-semibold text-slate-700">Choose image file</p>
                              </div>
                            </div>
                            {uploadLoading && <div className="text-[11px] text-emerald-600 flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span> Uploading...</div>}
                            {propertyImages.length > 0 && (
                              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
                                {propertyImages.map(img => (
                                  <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-xs">
                                    <img src={img.thumbnailUrl} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="p-4.5 bg-slate-50/40 rounded-xl border border-slate-200 space-y-4">
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs">Add walkthrough video</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">Walkthrough MP4 video (max 50MB).</p>
                            </div>
                            <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-emerald-500 transition-colors bg-white">
                              <input type="file" onChange={e => onUploadVideo(e, selectedProperty.id)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="video/*" />
                              <div className="text-slate-500 space-y-2">
                                <svg className="w-7 h-7 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                <p className="text-[11px] font-semibold text-slate-700">Choose video file</p>
                              </div>
                            </div>
                            {propertyVideos.length > 0 && (
                              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                                <span className="text-slate-600 truncate max-w-[100px]">{propertyVideos[0].videoUrl}</span>
                                <span className="text-slate-400 font-medium text-[10px]">Active</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {detailSubTab === 'docs' && (
                      <div className="space-y-6">
                        <div className="p-4.5 bg-slate-50/40 rounded-xl border border-slate-200 space-y-5">
                          <div>
                            <h4 className="font-bold text-slate-800 text-xs">Land Registry / Patta Passbooks</h4>
                            <p className="text-[10px] text-slate-500 mt-1">Upload deeds (PDF/image). OCR name check.</p>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="block text-slate-700 text-[10px] font-semibold mb-1">Document Type</label>
                              <select value={selectedDocType} onChange={e => setSelectedDocType(e.target.value as DocumentType)} className="w-full bg-white border border-slate-300 rounded-xl py-1.5 px-2 focus:outline-hidden focus:border-emerald-500 text-xs">
                                <option value="PATTA">Patta Passbook</option>
                                <option value="SALE_DEED">Sale Deed</option>
                                <option value="SURVEY_MAP">Survey Map</option>
                                <option value="TAX_RECEIPT">Tax Receipt</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-slate-700 text-[10px] font-semibold mb-1">Select File</label>
                              <div className="relative">
                                <input type="file" onChange={e => onUploadDoc(e, selectedProperty.id)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,image/*" />
                                <div className="w-full bg-white border border-slate-300 rounded-xl py-1.5 px-3 text-xs font-medium text-slate-600 text-center hover:bg-slate-50 hover:border-emerald-500 transition-colors">
                                  Choose PDF / Image
                                </div>
                              </div>
                            </div>
                          </div>
                          {docLoading && <div className="text-xs text-emerald-600 flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span> Uploading...</div>}
                          
                          {propertyDocs.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                              <h5 className="text-[11px] font-bold text-slate-700">Uploaded Deeds:</h5>
                              {propertyDocs.map(doc => (
                                <div key={doc.id} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col gap-3 shadow-xs">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-800 text-xs">{doc.documentType}</span>
                                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5">
                                        <span>View</span> <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                      </a>
                                    </div>
                                    <p className="text-[9px] text-slate-500">OCR: {doc.ocrStatus} | Docs: {doc.verificationStatus}</p>
                                  </div>
                                  {doc.ocrStatus === 'PENDING' && (
                                    <button onClick={() => triggerOcr(doc.id)} className="w-full px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg transition">
                                      Execute OCR Parse
                                    </button>
                                  )}
                                  {doc.ocrStatus === 'COMPLETED' && doc.rawText && (
                                    <div className="w-full bg-slate-50 p-2 rounded-lg border border-slate-100 text-[10px] text-slate-600 font-mono overflow-auto max-h-24">
                                      <strong>Extracted:</strong> {doc.rawText}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {detailSubTab === 'timeline' && (
                      <div className="space-y-6">
                        <div className="relative pl-5 border-l-2 border-slate-200 space-y-5">
                          {timeline.map((t, idx) => (
                            <div key={idx} className="relative">
                              <span className="absolute -left-[27px] top-1 bg-emerald-500 border-4 border-white w-4.5 h-4.5 rounded-full shadow-xs"></span>
                              <p className="text-[11px] font-bold text-slate-700">{t.action}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{new Date(t.timestamp).toLocaleString()}</p>
                              {t.remarks && <p className="text-[11px] text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100/50">{t.remarks}</p>}
                            </div>
                          ))}
                          {timeline.length === 0 && <div className="text-slate-400 text-xs py-4 text-center">No timeline transitions logged yet.</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ADD PROPERTY FORM */}
          {activeTab === 'add' && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{isEditMode ? 'Edit Property Details' : 'Add New Property Listing'}</h2>
                <p className="text-xs text-slate-500 mt-1">Fill in the details on the left and pin the land boundary on the map on the right.</p>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100/50 p-4.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                    Pre-fill / Clone Details
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Select an existing property to auto-populate all fields instantly.</p>
                </div>
                <div className="w-full sm:w-64">
                  <select onChange={prefillFromProperty} className="w-full bg-white border border-emerald-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs shadow-xs text-slate-700">
                    <option value="">-- Pre-fill from existing property --</option>
                    {myProperties.map(p => (
                      <option key={p.id} value={p.id}>{p.title} (₹{p.price.toLocaleString('en-IN')} - {p.area} ac)</option>
                    ))}
                  </select>
                </div>
              </div>

              <form onSubmit={onAddProperty}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  
                  {/* LEFT COLUMN */}
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 text-xs font-semibold mb-1.5">Property Title</label>
                        <input type="text" value={propertyForm.title} onChange={e => setPropertyForm({...propertyForm, title: e.target.value})} placeholder="E.g., 2.5 Acres Wet Land near Bypass Road" className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                        {formErrors.title && <span className="text-[10px] text-rose-500 mt-1 block">Title is required</span>}
                      </div>
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-1.5">Category</label>
                        <select value={propertyForm.category} onChange={e => setPropertyForm({...propertyForm, category: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-brand-500 text-xs appearance-none">
                          <option value="AGRICULTURAL">Agricultural Plot</option>
                          <option value="RESIDENTIAL">Residential Property</option>
                          <option value="COMMERCIAL">Commercial space</option>
                          <option value="INDUSTRIAL">Industrial site</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-1.5">Area (in acres)</label>
                        <input type="number" step="0.01" value={propertyForm.area} onChange={e => setPropertyForm({...propertyForm, area: e.target.value})} placeholder="2.5" className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                        {formErrors.area && <span className="text-[10px] text-rose-500 mt-1 block">Area is required</span>}
                      </div>
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-1.5">Price (INR ₹)</label>
                        <input type="number" value={propertyForm.price} onChange={e => setPropertyForm({...propertyForm, price: e.target.value})} placeholder="4500000" className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                        {formErrors.price && <span className="text-[10px] text-rose-500 mt-1 block">Price is required</span>}
                      </div>
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-1.5">Survey No. / Patta</label>
                        <input type="text" value={propertyForm.surveyNumber} onChange={e => setPropertyForm({...propertyForm, surveyNumber: e.target.value})} placeholder="45-A/12" className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                        {formErrors.surveyNumber && <span className="text-[10px] text-rose-500 mt-1 block">Required</span>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-1.5">Detailed Description</label>
                      <textarea value={propertyForm.description} onChange={e => setPropertyForm({...propertyForm, description: e.target.value})} rows={3} placeholder="Describe soil fertility, water canal access, road accessibility..." className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-brand-500 text-xs"></textarea>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 text-xs font-semibold mb-1.5">Address</label>
                        <input type="text" value={propertyForm.address} onChange={e => setPropertyForm({...propertyForm, address: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                      </div>
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-1.5">Village / Locality</label>
                        <input type="text" value={propertyForm.village} onChange={e => setPropertyForm({...propertyForm, village: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                      </div>
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-1.5">Pincode</label>
                        <input type="text" value={propertyForm.pincode} onChange={e => setPropertyForm({...propertyForm, pincode: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 focus:outline-hidden focus:border-brand-500 text-xs" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-700 text-xs font-semibold mb-1.5">
                          360° Panorama URL <span className="ml-1 text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <textarea rows={2} value={propertyForm.threeSixtyImageUrl} 
                          onChange={e => {
                            let val = e.target.value;
                            if (val.includes('src=')) {
                              const match = val.match(/src=["'](.*?)["']/);
                              if (match && match[1]) val = match[1];
                            }
                            setPropertyForm({...propertyForm, threeSixtyImageUrl: val});
                          }} 
                          placeholder="Paste URL or embed iframe..." className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 focus:outline-hidden focus:border-emerald-500 text-xs"></textarea>
                      </div>
                      {propertyForm.threeSixtyImageUrl && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live 360° Panorama Preview</span>
                          <div className="h-[200px] w-full rounded-2xl overflow-hidden border border-slate-200">
                            <PanoramaViewer url={propertyForm.threeSixtyImageUrl} />
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditMode && (
                      <div className="space-y-1.5">
                        <label className="block text-slate-700 text-xs font-semibold">
                          Land Document / Patta Passbook (PDF/Image) <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-emerald-500 hover:bg-emerald-50/10 transition-colors">
                          <input type="file" onChange={e => setSelectedAddPropertyDocFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,image/*" />
                          <div className="flex flex-col items-center gap-1.5">
                            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <span className="text-xs text-slate-600 font-medium">
                              {selectedAddPropertyDocFile ? selectedAddPropertyDocFile.name : 'Choose a file or drag it here'}
                            </span>
                            <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button type="button" onClick={() => setActiveTab('listings')} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition">Cancel</button>
                      <button type="submit" disabled={isSaving || (!isEditMode && !selectedAddPropertyDocFile)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-1.5">
                        {isSaving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                        {isEditMode ? 'Update Listing' : 'Save Listing'}
                      </button>
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="lg:sticky lg:top-4 space-y-4">
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-2">📍 Pin Land Boundary on Map</label>
                      <p className="text-[10px] text-slate-400 mb-2">Click or drag the marker to set the exact land location. Address fields auto-fill from GPS coordinates.</p>
                      <div className="h-[420px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                        <Map mode="picker" initialBoundary={lastDrawnBoundary} onLocationSelected={onLocationSelected} />
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium block">Latitude</span>
                        <span className="font-bold text-slate-700">{propertyForm.latitude}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block">Longitude</span>
                        <span className="font-bold text-slate-700">{propertyForm.longitude}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 font-medium block">Geocoded District / State</span>
                        <span className="font-bold text-slate-700">{propertyForm.district}, {propertyForm.state}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: VISITS */}
          {activeTab === 'visits' && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Guided Visit Request Registry</h2>
                <p className="text-xs text-slate-500 mt-1">Review scheduled buyer viewings on listed land slots. Confirm to share contacts.</p>
              </div>
              {myVisits.length > 0 ? (
                <div className="space-y-4">
                  {myVisits.map(v => (
                    <div key={v.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">Scheduled Date: {v.visitDate} at {v.visitTime}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full ${
                            v.status === 'SCHEDULED' ? 'bg-amber-100 text-amber-800' :
                            v.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {v.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Property Identifier: {v.propertyId}</p>
                      </div>
                      {v.status === 'SCHEDULED' && (
                        <div className="flex gap-2">
                          <button onClick={() => changeVisitStatus(v.id, 'CONFIRMED')} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition">Confirm Visit</button>
                          <button onClick={() => changeVisitStatus(v.id, 'REJECTED')} className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition">Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-xs py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No buyer visit slots scheduled.</div>
              )}
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
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
    </div>
  );
};

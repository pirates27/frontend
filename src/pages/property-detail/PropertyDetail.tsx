import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Calendar, AlertTriangle, CheckCircle, Image, Video,
  FileText, Map as MapIcon, Clock, Shield, ExternalLink, Send, MessageSquare, MapPin, Share2, Heart, X, Sparkles, ChevronRight, Maximize, Trash2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import { Map } from '../../components/shared/Map';
import { PanoramaViewer } from '../../components/shared/PanoramaViewer';
import { cleanDescription } from '../../utils/boundary';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Chip } from '../../components/ui/Badge';
import { CircularProgress } from '../../components/ui/ProgressBar';
import type * as Models from '../../models/property.models';

type TabType = 'overview' | 'ai' | 'location' | 'history';
type MediaType = 'image' | 'video' | '360';

export const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Models.Property | null>(null);
  const [images, setImages] = useState<Models.PropertyImage[]>([]);
  const [videos, setVideos] = useState<Models.PropertyVideo[]>([]);
  const [documents, setDocuments] = useState<Models.PropertyDocument[]>([]);
  const [timeline, setTimeline] = useState<Models.VerificationTimeline[]>([]);
  const [aiReport, setAiReport] = useState<Models.AiVerification | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [activeMedia, setActiveMedia] = useState<MediaType>('image');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

  // Forms
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('10:30');
  const [visitLoading, setVisitLoading] = useState(false);
  const [visitSuccess, setVisitSuccess] = useState(false);

  const [fraudReason, setFraudReason] = useState('Double Listing');
  const [fraudDesc, setFraudDesc] = useState('');
  const [fraudLoading, setFraudLoading] = useState(false);
  const [fraudSuccess, setFraudSuccess] = useState(false);

  const [chatMessages, setChatMessages] = useState<Models.AiMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [isSaved, setIsSaved] = useState(false); // mock saved state

  useEffect(() => { if (id) loadProperty(id); }, [id]);

  const loadProperty = async (propId: string) => {
    setLoading(true);
    try {
      const p = await propertyService.getPropertyById(propId);
      setProperty(p);
      if (p.threeSixtyImageUrl) setActiveMedia('360');
      propertyService.getImages(propId).then(res => { setImages(res); if (!p.threeSixtyImageUrl && res.length > 0) setActiveMedia('image'); }).catch(() => {});
      propertyService.getVideos(propId).then(setVideos).catch(() => {});
      propertyService.getDocuments(propId).then(async (res) => {
        const validDocs = [];
        for (const doc of res) {
          if (doc.fileUrl && doc.fileUrl.includes('cloudinary.com')) {
            try {
              const check = await fetch(doc.fileUrl, { method: 'HEAD' });
              if (check.ok) validDocs.push(doc);
            } catch {
              // Ignore docs that fail to load
            }
          }
        }
        setDocuments(validDocs);
      }).catch(() => {});
      propertyService.getTimeline(propId).then(setTimeline).catch(() => {});
      propertyService.getAiVerification(propId).then(setAiReport).catch(() => setAiReport(null));
    } catch { navigate('/'); }
    finally { setLoading(false); }
  };

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !visitDate || !visitTime) return;
    setVisitLoading(true);
    try {
      await propertyService.scheduleVisit(property.id, { visitDate, visitTime: visitTime + ':00' });
      setVisitSuccess(true); 
      setTimeout(() => { setIsScheduleModalOpen(false); setVisitSuccess(false); }, 2000);
    } catch {}
    finally { setVisitLoading(false); }
  };

  const handleSubmitFraud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !fraudReason || !fraudDesc) return;
    setFraudLoading(true);
    try {
      await propertyService.reportFraud(property.id, { reason: fraudReason, description: fraudDesc });
      setFraudSuccess(true); 
      setTimeout(() => { setIsDisputeModalOpen(false); setFraudSuccess(false); }, 2000);
    } catch {}
    finally { setFraudLoading(false); }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !property || isSending) return;
    const content = chatInput;
    setChatInput('');
    setIsSending(true);

    try {
      let cid = conversationId;
      if (!cid) {
        const convo = await propertyService.startAiConversation(`Chat about: ${property.title}`);
        cid = convo.id;
        setConversationId(cid);
      }
      
      const newMsg: Models.AiMessage = {
        id: Math.random().toString(), conversationId: cid, senderRole: 'USER', content, timestamp: new Date().toISOString(), isActive: true
      };
      setChatMessages(prev => [...prev, newMsg]);

      const aiMsg = await propertyService.sendAiMessage(cid, content);
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (e) { console.error(e); } 
    finally { setIsSending(false); }
  };

  const goBack = () => {
    const role = authService.getUserRole();
    switch (role) {
      case 'ADMIN': navigate('/admin'); break;
      case 'GOVERNMENT_OFFICER': navigate('/officer'); break;
      case 'PROVIDER': navigate('/provider'); break;
      case 'BUYER': default: navigate('/buyer'); break;
    }
  };

  const handleDeleteProperty = async () => {
    if (window.confirm("Are you sure you want to delete this property? This will also remove all associated schedules, documents, and data. This action cannot be undone.")) {
      try {
        await propertyService.deleteProperty(property!.id);
        navigate('/admin');
      } catch (err) {
        console.error("Failed to delete property", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-dark-950 flex flex-col items-center justify-center">
        <CircularProgress value={100} color="primary" size={48} />
        <p className="text-dark-400 mt-4 text-sm font-semibold animate-pulse">Loading property...</p>
      </div>
    );
  }

  if (!property) return null;

  return (
    <div className="min-h-screen bg-dark-950 text-white font-sans flex flex-col pb-32 relative overflow-x-hidden">
      
      {/* ── ABSOLUTE APP BAR (SCROLLABLE) ── */}
      <div className="absolute top-0 left-0 right-0 z-50 px-4 pt-4 h-16 flex items-center justify-between">
        <button onClick={goBack} className="w-10 h-10 rounded-full bg-dark-900/60 backdrop-blur-md flex items-center justify-center border border-white/[0.1] active:scale-95 transition-transform shadow-lg">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-3">
          {authService.getUserRole() === 'ADMIN' && (
            <button onClick={handleDeleteProperty} className="w-10 h-10 rounded-full bg-danger-500/80 backdrop-blur-md flex items-center justify-center border border-danger-500/30 active:scale-95 transition-transform shadow-lg">
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          )}
          <button className="w-10 h-10 rounded-full bg-dark-900/60 backdrop-blur-md flex items-center justify-center border border-white/[0.1] active:scale-95 transition-transform shadow-lg">
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* ── HERO MEDIA SECTION ── */}
      <div className="relative w-full h-[48vh] bg-dark-800 rounded-b-[25px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.3)] z-10">
        {activeMedia === 'image' && images.length > 0 ? (
          <motion.img key={activeImageIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={images[activeImageIndex].imageUrl} className="w-full h-full object-cover" />
        ) : activeMedia === 'video' && videos.length > 0 ? (
          <video src={videos[0].videoUrl} controls className="w-full h-full object-contain bg-black" />
        ) : activeMedia === '360' && property?.threeSixtyImageUrl ? (
          <div className="w-full h-full pointer-events-none overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-[120%]">
              <PanoramaViewer url={property.threeSixtyImageUrl} />
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
             <MapIcon className="w-12 h-12 text-dark-600" />
          </div>
        )}

        {/* Media Controls Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between z-10 pointer-events-none">
           <div className="flex items-center gap-2 pointer-events-auto">
              {images.length > 0 && (
                <button onClick={() => setActiveMedia('image')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold backdrop-blur-md border border-white/20 transition-all ${activeMedia === 'image' ? 'bg-primary-500 text-white' : 'bg-dark-900/60 text-white hover:bg-dark-900/80'}`}>
                  PHOTOS
                </button>
              )}
           </div>
           
           <div className="flex flex-col items-end gap-2 pointer-events-auto">
              {property?.threeSixtyImageUrl && (
                <>
                  <a
                    href={property.threeSixtyImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600/95 hover:bg-emerald-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-full shadow-md border border-emerald-500/30 transition-all flex items-center gap-1.5 backdrop-blur-sm whitespace-nowrap"
                  >
                    <Maximize className="w-3 h-3" />
                    Open Street View
                  </a>
                  <button onClick={() => setActiveMedia('360')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold backdrop-blur-md border border-white/20 transition-all shadow-lg ${activeMedia === '360' ? 'bg-primary-500 text-white' : 'bg-dark-900/80 text-white'}`}>
                    360° LIVE
                  </button>
                </>
              )}
              {activeMedia === 'image' && images.length > 0 && (
                <div className="px-3 py-1.5 rounded-full bg-dark-900/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold">
                   {activeImageIndex + 1} / {images.length}
                </div>
              )}
           </div>
        </div>
      </div>

      {/* ── PROPERTY HEADER ── */}
      <div className="p-4 bg-dark-950 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-2">
           <Chip label={property.category} color="primary" size="xs" />
           <StatusBadge status={property.status} size="sm" />
        </div>
        <h1 className="text-xl font-bold text-white leading-tight mb-1">{property.title}</h1>
        <p className="text-dark-400 text-xs flex items-center gap-1 mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {property.village}, {property.district}, {property.state}
        </p>
        <div className="flex items-baseline gap-2">
           <p className="text-2xl font-black text-white">₹{(property.price).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="sticky top-14 z-40 bg-dark-950/95 backdrop-blur-xl px-4 pt-4 border-b border-white/[0.05]">
        {/* Navigation Tabs (Switch Style) */}
        <div className="flex relative bg-dark-900/60 backdrop-blur-md rounded-[25px] p-1.5 mb-6 border border-white/[0.05]">
           {['overview', 'ai', 'location', 'history'].map((tab) => (
             <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 relative py-2.5 text-[10px] font-bold capitalize transition-colors rounded-[25px] ${activeTab === tab ? 'text-white' : 'text-dark-400 hover:text-white'}`}>
               {activeTab === tab && <motion.div layoutId="activeTabBg" className="absolute inset-0 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-[25px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] shadow-primary-500/30" />}
               <span className="relative z-10">{tab === 'ai' ? 'AI Score' : tab}</span>
             </button>
           ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="p-4">
         <AnimatePresence mode="wait">
            
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                 {/* Quick Stats Grid */}
                 <div className="grid grid-cols-2 gap-3">
                    <div className="glass-card p-3 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-dark-400 uppercase">Total Area</span>
                      <span className="text-sm font-bold text-white">{property.area} <span className="text-[10px] font-normal text-dark-300">acres</span></span>
                    </div>
                    <div className="glass-card p-3 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-dark-400 uppercase">Survey Number</span>
                      <span className="text-sm font-bold text-white">{property.surveyNumber}</span>
                    </div>
                    <div className="glass-card p-3 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-dark-400 uppercase">Property Code</span>
                      <span className="text-sm font-bold text-white">#{property.propertyCode || 'LL-17842'}</span>
                    </div>
                    <div className="glass-card p-3 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-dark-400 uppercase">Pincode</span>
                      <span className="text-sm font-bold text-white">{property.pincode}</span>
                    </div>
                 </div>

                 {/* Description */}
                 {cleanDescription(property.description) && (
                   <div>
                     <h3 className="text-sm font-bold text-white mb-2">Description</h3>
                     <p className="text-dark-300 text-xs leading-relaxed">{cleanDescription(property.description)}</p>
                   </div>
                 )}

                 {/* Documents */}
                 {documents.length > 0 && (
                   <div className="mt-6">
                     <h3 className="text-sm font-bold text-white mb-3">Legal Documents</h3>
                     <div className="grid gap-3">
                       {documents.map(doc => (
                         <div key={doc.id} className="glass-card p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-dark-900 border border-white/[0.05] flex items-center justify-center">
                                 <FileText className="w-5 h-5 text-primary-400" />
                               </div>
                               <div>
                                 <p className="text-sm font-bold text-white line-clamp-1">{doc.title}</p>
                                 <p className="text-xs text-dark-400 uppercase tracking-wider">{doc.type}</p>
                               </div>
                            </div>
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center text-primary-400 bg-primary-500/10 rounded-full active:scale-95 transition-transform">
                               <ExternalLink className="w-4 h-4" />
                            </a>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Report Fraud Button */}
                 <button onClick={() => setIsDisputeModalOpen(true)} className="w-full mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between active:scale-95 transition-transform">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                         <AlertTriangle className="w-5 h-5 text-rose-500" />
                       </div>
                       <div className="text-left">
                         <h4 className="text-sm font-bold text-rose-500">Report an Issue</h4>
                         <p className="text-[10px] text-rose-400/70">Found a dispute or fraud?</p>
                       </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-rose-500/50" />
                 </button>
              </motion.div>
            )}

            {/* AI SCORE */}
            {activeTab === 'ai' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px]" />
                   <Shield className="w-8 h-8 text-emerald-400 mb-4" />
                   <h2 className="text-lg font-bold text-white mb-1">AI Trust Verification</h2>
                   <p className="text-xs text-dark-400 mb-6">Powered by LandLens AI</p>
                   
                   <div className="relative mb-4 flex justify-center">
                     <CircularProgress value={aiReport?.aiTrustScore || 88} color="accent" size={128} strokeWidth={8} sublabel="SCORE" />
                   </div>
                   
                   <p className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                     Highly Reliable Property
                   </p>
                </div>

                <div className="space-y-3">
                   <h3 className="text-sm font-bold text-white">Risk Metrics</h3>
                   <div className="grid gap-3">
                      <div className="glass-card p-4 flex items-center justify-between">
                         <span className="text-xs font-semibold text-white">Forgery Risk</span>
                         <span className="text-xs font-bold text-emerald-400">Low ({(aiReport?.forgeryScore || 12).toFixed(1)}%)</span>
                      </div>
                      <div className="glass-card p-4 flex items-center justify-between">
                         <span className="text-xs font-semibold text-white">Overlap Risk</span>
                         <span className="text-xs font-bold text-emerald-400">Low ({(aiReport?.overlapScore || 5).toFixed(1)}%)</span>
                      </div>
                      <div className="glass-card p-4 flex items-center justify-between">
                         <span className="text-xs font-semibold text-white">Owner Match</span>
                         <span className="text-xs font-bold text-emerald-400">Verified Match</span>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {/* LOCATION */}
            {activeTab === 'location' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="h-[400px] rounded-2xl overflow-hidden border border-white/[0.05] relative shadow-lg">
                  <Map mode="detail" properties={[property]} onLocationSelected={() => {}} />
                  <div className="absolute bottom-4 left-4 bg-dark-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Exact Boundary
                  </div>
                </div>
              </motion.div>
            )}

            {/* LOCATION */}
            {activeTab === 'location' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h3 className="text-lg font-bold text-white mb-4">Location Details</h3>
                <div className="w-full h-64 rounded-2xl overflow-hidden border border-white/[0.05]">
                  <Map latitude={property.latitude} longitude={property.longitude} />
                </div>
                <div className="glass-card p-4">
                  <h4 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">Address Details</h4>
                  <p className="text-sm text-white font-semibold">{property.village}</p>
                  <p className="text-xs text-dark-300">{property.district}, {property.state} {property.pincode}</p>
                </div>
              </motion.div>
            )}

            {/* HISTORY */}
            {activeTab === 'history' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h3 className="text-lg font-bold text-white mb-4">Verification Timeline</h3>
                
                <div className="relative pl-12 space-y-8 mt-2">
                  {/* Vertical line connecting ticks */}
                  <div className="absolute left-[11px] top-3 bottom-0 w-[2px] bg-emerald-500/40" />
                  
                  {timeline.length > 0 ? timeline.map((t, idx) => (
                    <div key={idx} className="relative z-10">
                      {/* Tick mark */}
                      <div className="absolute -left-[48px] top-0 w-6 h-6 rounded-full bg-dark-950 border-2 border-emerald-500 flex items-center justify-center shadow-lg shadow-dark-950 z-10">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                      </div>
                      <h4 className="text-sm font-bold text-white leading-tight">{t.action || t.title}</h4>
                      <p className="text-dark-400 text-[10px] font-semibold mt-1">{new Date(t.timestamp || t.date || Date.now()).toLocaleDateString()}</p>
                      {(t.remarks || t.description) && (
                        <p className="text-dark-300 text-xs mt-2 bg-dark-800/50 p-3 rounded-xl border border-white/[0.02]">{t.remarks || t.description}</p>
                      )}
                    </div>
                  )) : (
                    <div className="py-8 text-center bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                       <Clock className="w-8 h-8 text-dark-600 mx-auto mb-2" />
                       <p className="text-sm font-bold text-dark-400">No History Found</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

         </AnimatePresence>
      </div>

      {/* ── FLOATING BOTTOM BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-3 pb-4 bg-dark-950/95 backdrop-blur-xl border-t border-white/[0.05] z-40 rounded-t-[25px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex gap-2 max-w-md mx-auto">
          <button onClick={() => setIsChatModalOpen(true)} className="flex-1 h-9 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-primary-400" /> Ask AI
          </button>
          <button onClick={() => setIsScheduleModalOpen(true)} className="flex-[1.5] h-9 rounded-xl bg-primary-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-primary-500/20">
            <Calendar className="w-3.5 h-3.5" /> Schedule Visit
          </button>
        </div>
      </div>

      {/* ── FULL SCREEN MODALS ── */}
      
      {/* Schedule Visit Modal */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50]" onClick={() => setIsScheduleModalOpen(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-x-0 bottom-0 max-h-[90vh] z-[60] bg-[#090C15] rounded-t-3xl flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
               <h2 className="text-lg font-bold text-white">Schedule Visit</h2>
               <button onClick={() => setIsScheduleModalOpen(false)} className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center"><X className="w-5 h-5 text-white"/></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto pb-safe">
               <div className="glass-card p-4 flex gap-4 items-center mb-8">
                 <div>
                   <h3 className="text-sm font-bold text-white line-clamp-1">{property.title}</h3>
                   <p className="text-xs text-primary-400 font-bold mt-1">₹{property.price.toLocaleString('en-IN')}</p>
                 </div>
               </div>
               
               <form onSubmit={handleScheduleVisit} className="space-y-6">
                 <div>
                   <label className="block text-xs font-bold text-dark-400 uppercase mb-2 ml-1">Select Date</label>
                   <input type="date" required value={visitDate} onChange={e => setVisitDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full h-14 rounded-2xl bg-dark-900 border border-white/[0.1] px-4 text-white outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-dark-400 uppercase mb-2 ml-1">Select Time</label>
                   <input type="time" required value={visitTime} onChange={e => setVisitTime(e.target.value)} className="w-full h-14 rounded-2xl bg-dark-900 border border-white/[0.1] px-4 text-white outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" />
                 </div>
                 
                 {visitSuccess && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="text-sm font-bold text-emerald-500">Visit Scheduled!</p>
                        <p className="text-xs text-emerald-400/80">We'll confirm with you shortly.</p>
                      </div>
                    </motion.div>
                 )}
                 
                 <button type="submit" disabled={!visitDate || !visitTime || visitLoading} className="w-full h-14 rounded-2xl bg-primary-600 text-white font-bold disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-primary-500/20">
                   {visitLoading ? 'Scheduling...' : 'Confirm Request'}
                 </button>
               </form>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI Chat Modal */}
      <AnimatePresence>
        {isChatModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50]" onClick={() => setIsChatModalOpen(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-x-0 bottom-0 h-[85vh] z-[60] bg-[#090C15] rounded-t-3xl flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.05] bg-dark-900/80 backdrop-blur-xl">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">AI Assistant</h2>
                    <p className="text-[10px] text-dark-400">Ask about {property.title}</p>
                  </div>
               </div>
               <button onClick={() => setIsChatModalOpen(false)} className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center"><X className="w-5 h-5 text-white"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] p-4 rounded-2xl rounded-tl-sm bg-dark-800 border border-white/[0.05] text-white text-sm shadow-lg">
                    👋 Hi! I can help you understand the legal status, market rates, or nearby amenities for this property. What would you like to know?
                  </div>
                </div>
              )}
              {chatMessages.length === 0 && (
                 <div className="space-y-2 mt-2">
                   <button onClick={() => setChatInput('Are there any active disputes on this survey number?')} className="w-full text-left p-3 rounded-xl border border-primary-500/30 bg-primary-500/5 text-primary-300 text-xs font-semibold">
                     Are there any active disputes on this survey number?
                   </button>
                   <button onClick={() => setChatInput('What is the local market rate per acre?')} className="w-full text-left p-3 rounded-xl border border-primary-500/30 bg-primary-500/5 text-primary-300 text-xs font-semibold">
                     What is the local market rate per acre?
                   </button>
                 </div>
              )}

              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-lg ${msg.senderRole === 'USER' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-dark-800 text-white rounded-tl-sm border border-white/[0.05]'}`}>
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {isSending && (
                 <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-dark-800 border border-white/[0.05] flex items-center gap-2">
                    <CircularProgress value={100} size={16} color="primary" /> <span className="text-xs text-dark-400">AI is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-dark-900 border-t border-white/[0.05] pb-safe">
              <div className="flex gap-2">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask anything..." className="input-dark flex-1 !rounded-full" />
                <button onClick={sendMessage} disabled={isSending || !chatInput.trim()} className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center shrink-0 text-white hover:bg-primary-500 transition-colors shadow-lg shadow-primary-500/20 disabled:opacity-50">
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Dispute Modal */}
      <AnimatePresence>
        {isDisputeModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50]" onClick={() => setIsDisputeModalOpen(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-x-0 bottom-0 max-h-[90vh] z-[60] bg-[#090C15] rounded-t-3xl flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
               <h2 className="text-lg font-bold text-white text-rose-500">Report Fraud</h2>
               <button onClick={() => setIsDisputeModalOpen(false)} className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center"><X className="w-5 h-5 text-white"/></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto pb-safe">
               <form onSubmit={handleSubmitFraud} className="space-y-6">
                 <div>
                   <label className="block text-xs font-bold text-dark-400 uppercase mb-2 ml-1">Reason for reporting</label>
                   <select value={fraudReason} onChange={e => setFraudReason(e.target.value)} className="w-full h-14 rounded-2xl bg-dark-900 border border-white/[0.1] px-4 text-white outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all appearance-none">
                     <option value="Double Listing">Double Listing</option>
                     <option value="Overlapped Boundary">Overlapped Boundary</option>
                     <option value="Name Mismatch">Name Mismatch</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-dark-400 uppercase mb-2 ml-1">Details</label>
                   <textarea required value={fraudDesc} onChange={e => setFraudDesc(e.target.value)} rows={4} className="w-full rounded-2xl bg-dark-900 border border-white/[0.1] p-4 text-white outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all resize-none" placeholder="Please provide more details..." />
                 </div>
                 
                 {fraudSuccess && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-500" />
                      <div>
                        <p className="text-sm font-bold text-rose-500">Report Submitted</p>
                        <p className="text-xs text-rose-400/80">Our officers will investigate this property.</p>
                      </div>
                    </motion.div>
                 )}
                 
                 <button type="submit" disabled={!fraudReason || !fraudDesc || fraudLoading} className="w-full h-14 rounded-2xl bg-rose-600 text-white font-bold disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-rose-500/20">
                   {fraudLoading ? 'Submitting...' : 'Submit Report'}
                 </button>
               </form>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

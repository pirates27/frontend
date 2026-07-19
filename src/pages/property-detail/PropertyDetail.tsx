import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Calendar, AlertTriangle, CheckCircle, Image, Video,
  FileText, Map as MapIcon, Clock, Shield, ExternalLink, Send, MessageSquare
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
import { GlassCard } from '../../components/ui/GlassCard';
import { Modal } from '../../components/ui/Modal';
import { CircularProgress, ProgressBar } from '../../components/ui/ProgressBar';
import type * as Models from '../../models/property.models';

type TabType = 'spec' | '360' | 'report' | 'map' | 'timeline';
type MediaType = 'image' | 'video' | '360';

const tabConfig: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'spec', label: 'Specifications', icon: <FileText className="w-4 h-4" /> },
  { id: '360', label: '360° Tour', icon: <Image className="w-4 h-4" /> },
  { id: 'report', label: 'AI Trust Score', icon: <Shield className="w-4 h-4" /> },
  { id: 'map', label: 'Location', icon: <MapIcon className="w-4 h-4" /> },
  { id: 'timeline', label: 'History', icon: <Clock className="w-4 h-4" /> },
];

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

  const [activeTab, setActiveTab] = useState<TabType>('spec');
  const [activeMedia, setActiveMedia] = useState<MediaType>('image');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('10:30');
  const [visitLoading, setVisitLoading] = useState(false);
  const [visitSuccess, setVisitSuccess] = useState(false);

  const [fraudReason, setFraudReason] = useState('Double Listing');
  const [fraudDesc, setFraudDesc] = useState('');
  const [fraudLoading, setFraudLoading] = useState(false);
  const [fraudSuccess, setFraudSuccess] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);

  const [chatMessages, setChatMessages] = useState<Models.AiMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => { if (id) loadProperty(id); }, [id]);

  const loadProperty = async (propId: string) => {
    setLoading(true);
    try {
      const p = await propertyService.getPropertyById(propId);
      setProperty(p);
      if (p.threeSixtyImageUrl) setActiveMedia('360');
      propertyService.getImages(propId).then(setImages).catch(() => {});
      propertyService.getVideos(propId).then(setVideos).catch(() => {});
      propertyService.getDocuments(propId).then(setDocuments).catch(() => {});
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
      setVisitSuccess(true); setVisitDate(''); setVisitTime('10:30');
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
      setFraudReason('Double Listing'); 
      setFraudDesc('');
      setTimeout(() => {
        setIsDisputeModalOpen(false);
        setFraudSuccess(false);
      }, 2000);
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
        id: Math.random().toString(),
        conversationId: cid,
        senderRole: 'USER',
        content,
        timestamp: new Date().toISOString(),
        isActive: true
      };
      setChatMessages(prev => [...prev, newMsg]);

      const aiMsg = await propertyService.sendAiMessage(cid, content);
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-cyan-600 flex items-center justify-center animate-pulse">
            <span className="text-white font-black text-sm">LL</span>
          </div>
          <div className="text-white text-sm animate-pulse">Loading property...</div>
        </div>
      </div>
    );
  }

  if (!property) return null;

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      
      {/* ── TOP NAV ── */}
      <nav className="shrink-0 h-12 bg-slate-900 text-white flex items-center px-6 border-b border-slate-800 z-30">
        <div className="w-full flex items-center justify-between">
          <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Properties
          </button>
        </div>
      </nav>

      {/* ── PROPERTY HEADER ── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-3 z-20">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-[1600px] mx-auto">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-bold text-slate-900">{property.title}</h1>
            <p className="text-slate-500 text-xs flex items-center gap-1.5">
              <MapIcon className="w-3.5 h-3.5" />
              {property.village}, {property.district}, {property.state}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono text-[10px] px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                #{property.propertyCode || 'LL-17842'}
              </span>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                <CheckCircle className="w-3 h-3" /> APPROVED
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold uppercase">
                <Shield className="w-3 h-3" /> {property.category}
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block" />

            {/* AI Trust Score */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50/50">
              <Shield className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="text-[9px] text-emerald-700/70 font-bold uppercase leading-none">AI Trust Score</p>
                <p className="text-xs text-emerald-700 font-bold leading-none mt-0.5">Verified {aiReport?.aiTrustScore || '88.5'}%</p>
              </div>
            </div>

            <button onClick={() => setIsChatOpen(!isChatOpen)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isChatOpen ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-inner' : 'bg-white border-purple-200 text-purple-700 hover:bg-purple-50 hover:shadow-sm'}`}>
              <MessageSquare className="w-3.5 h-3.5" /> AI Assistant
            </button>
            
            <button onClick={() => {}} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-sm">
              <AlertTriangle className="w-3.5 h-3.5" /> Report a Dispute
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENT GRID ── */}
      <div className="flex-1 w-full px-6 py-3 max-w-[1600px] mx-auto min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 h-full">

          {/* ── LEFT COLUMN (50%) ── */}
          <div className="lg:col-span-5 flex flex-col gap-2 h-full overflow-hidden pr-1">
            
            {/* Media Viewer — taller */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 shrink-0">
              <div className="relative h-[38vh] min-h-[220px] rounded-lg overflow-hidden bg-slate-100 border border-slate-200 mb-2">
                {activeMedia === 'image' && images.length > 0 ? (
                  <motion.img key={activeImageIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={images[activeImageIndex].imageUrl} className="w-full h-full object-cover" />
                ) : activeMedia === 'video' && videos.length > 0 ? (
                  <video src={videos[0].videoUrl} controls className="w-full h-full object-contain" />
                ) : activeMedia === '360' && property?.threeSixtyImageUrl ? (
                  <div className="w-full h-full pointer-events-auto">
                    <PanoramaViewer url={property.threeSixtyImageUrl} />
                  </div>
                ) : null}
              </div>

              {/* Tab strip + thumbnails row */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 shrink-0">
                  {property?.threeSixtyImageUrl && (
                    <button onClick={() => setActiveMedia('360')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${activeMedia === '360' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      360°
                    </button>
                  )}
                  {images.length > 0 && (
                    <button onClick={() => setActiveMedia('image')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${activeMedia === 'image' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      Photos
                    </button>
                  )}
                  {videos.length > 0 && (
                    <button onClick={() => setActiveMedia('video')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${activeMedia === 'video' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      Video
                    </button>
                  )}
                </div>
                {images.length > 1 && activeMedia === 'image' && (
                  <div className="flex items-center gap-1 overflow-hidden flex-1">
                    {images.map((img, idx) => (
                      <div key={idx} onClick={() => { setActiveImageIndex(idx); setActiveMedia('image'); }} className={`w-12 h-8 rounded-md overflow-hidden border-2 cursor-pointer shrink-0 transition-all ${activeImageIndex === idx ? 'border-slate-900' : 'border-transparent hover:border-slate-300'}`}>
                        <img src={img.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                      </div>
                    ))}
                    {images.length > 5 && (
                      <div className="w-10 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-[9px] shrink-0 cursor-pointer">
                        +{images.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom row: Map LEFT · Stats+Location+Description RIGHT */}
            <div className="flex gap-2 flex-1 min-h-0 mb-2">

              {/* Map — left half */}
              <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm flex flex-col w-1/2 min-h-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-slate-900 font-bold text-[11px]">Location & Boundary</h3>
                  <div className="flex items-center gap-1 text-slate-400 text-[8px]"><MapIcon className="w-2.5 h-2.5"/> Mapbox</div>
                </div>
                <div className="flex-1 rounded-md overflow-hidden border border-slate-200 relative">
                  <Map mode="detail" properties={[property]} onLocationSelected={() => {}} />
                  <div className="absolute top-1.5 right-1.5 flex gap-0.5 bg-white rounded shadow-sm border border-slate-200 p-0.5 z-10 pointer-events-none">
                    <div className="px-1.5 py-0.5 text-[8px] font-semibold bg-slate-100 text-slate-800 rounded-sm">Map</div>
                    <div className="px-1.5 py-0.5 text-[8px] font-semibold text-slate-500 rounded-sm">Satellite</div>
                  </div>
                  <div className="absolute bottom-1.5 left-1.5 bg-slate-900/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 z-10 pointer-events-none">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"/>
                    Boundary (Exact)
                  </div>
                </div>
              </div>

              {/* Stats + Location + Description — right half */}
              <div className="flex flex-col gap-2 w-1/2 min-h-0">

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-1.5 shrink-0">
                  <div className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 flex flex-col shadow-sm">
                    <p className="text-slate-400 text-[7px] font-bold uppercase tracking-wide">Area / Size</p>
                    <p className="text-slate-900 font-bold text-[11px] leading-tight">{property.area} <span className="text-[8px] font-normal text-slate-500">acres</span></p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 flex flex-col shadow-sm">
                    <p className="text-slate-400 text-[7px] font-bold uppercase tracking-wide">Price</p>
                    <p className="text-slate-900 font-bold text-[11px] leading-tight">₹{(property.price).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 flex flex-col shadow-sm">
                    <p className="text-slate-400 text-[7px] font-bold uppercase tracking-wide">Survey No.</p>
                    <p className="text-slate-900 font-bold text-[11px] leading-tight">{property.surveyNumber}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 flex flex-col shadow-sm">
                    <p className="text-slate-400 text-[7px] font-bold uppercase tracking-wide">Category</p>
                    <p className="text-slate-900 font-bold text-[11px] leading-tight">{property.category}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 shrink-0 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-[9px]"><span className="font-semibold text-slate-700">State:</span> <span className="text-slate-600">{property.state}</span></div>
                    <div className="flex items-center gap-1 text-[9px]"><span className="font-semibold text-slate-700">District:</span> <span className="text-slate-600">{property.district}</span></div>
                    <div className="flex items-center gap-1 text-[9px]"><span className="font-semibold text-slate-700">Pincode:</span> <span className="text-slate-600">{property.pincode}</span></div>
                  </div>
                </div>

                {/* Description */}
                {cleanDescription(property.description) && (
                  <div className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm flex-1 overflow-hidden">
                    <h3 className="text-slate-700 font-bold mb-1 text-[9px] uppercase tracking-wide">Description</h3>
                    <p className="text-slate-600 text-[9px] leading-snug line-clamp-4">{cleanDescription(property.description)}</p>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* ── MIDDLE COLUMN (20%) ── */}
          <div className="lg:col-span-2 flex flex-col gap-2 h-full overflow-hidden pr-1">

            {/* Schedule Site Visit — moved to top */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm shrink-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <h3 className="text-slate-900 font-bold text-[11px]">Schedule Visit</h3>
              </div>
              
              <form onSubmit={handleScheduleVisit} className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input type="date" required value={visitDate} onChange={e => setVisitDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full border border-slate-300 rounded px-1.5 py-1 text-[10px] text-slate-800 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <input type="time" required value={visitTime} onChange={e => setVisitTime(e.target.value)} className="w-full border border-slate-300 rounded px-1.5 py-1 text-[10px] text-slate-800 focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                
                {visitSuccess && (
                  <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-1 text-emerald-700 text-[9px]">
                    <CheckCircle className="w-3 h-3 shrink-0" /> Sent!
                  </div>
                )}

                <button type="submit" disabled={!visitDate || !visitTime || visitLoading} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-1 rounded text-[10px] transition-colors shadow-sm disabled:opacity-50">
                  {visitLoading ? 'Wait...' : 'Request'}
                </button>
              </form>
            </div>

            {/* Verification Timeline */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col flex-1 min-h-0">
              <h3 className="text-slate-900 font-bold mb-2 text-[11px]">Verification Timeline</h3>
              
              <div className="relative pl-5 space-y-2 flex-1 overflow-y-auto scrollbar-premium">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-200" />
                
                {timeline.length > 0 ? timeline.map((t, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[24px] top-0 w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center z-10">
                      <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                    </div>
                    <h4 className="text-slate-900 text-[10px] font-bold leading-none">{t.action}</h4>
                    <p className="text-slate-500 text-[8px] mt-0.5">{new Date(t.timestamp || Date.now()).toLocaleDateString()}</p>
                    <p className="text-slate-600 text-[9px] leading-tight mt-0.5 truncate">{t.remarks}</p>
                  </div>
                )) : (
                  <>
                    <div className="relative">
                      <div className="absolute -left-[24px] top-0 w-4 h-4 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center z-10">
                        <CheckCircle className="w-2 h-2 text-emerald-600" />
                      </div>
                      <h4 className="text-slate-900 text-[10px] font-bold leading-none">Property Listed</h4>
                      <p className="text-slate-500 text-[8px] mt-0.5">May 10, 2024</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[24px] top-0 w-4 h-4 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center z-10">
                        <CheckCircle className="w-2 h-2 text-blue-600" />
                      </div>
                      <h4 className="text-slate-900 text-[10px] font-bold leading-none">Approved</h4>
                      <p className="text-slate-500 text-[8px] mt-0.5">May 20, 2024</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Report Dispute */}
            <div className="bg-white border border-rose-200 rounded-lg p-3 shadow-sm relative overflow-hidden shrink-0 mb-2">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <h3 className="text-rose-600 font-bold text-[11px]">Report Fraud</h3>
              </div>
              
              <form onSubmit={handleSubmitFraud} className="space-y-2">
                <select value={fraudReason} onChange={e => setFraudReason(e.target.value)} className="w-full border border-slate-300 rounded px-1.5 py-1 text-[10px] text-slate-800 bg-white focus:outline-none focus:border-rose-500">
                  <option value="Double Listing">Select reason</option>
                  <option value="Double Listing">Overlapped Boundary</option>
                  <option value="Forgery Name">Name Mismatch</option>
                </select>
                <textarea rows={1} required value={fraudDesc} onChange={e => setFraudDesc(e.target.value)} placeholder="Details..." className="w-full border border-slate-300 rounded px-1.5 py-1 text-[10px] text-slate-800 resize-none focus:outline-none focus:border-rose-500" />
                
                {fraudSuccess && (
                  <div className="p-1.5 bg-rose-50 border border-rose-200 rounded flex items-center gap-1 text-rose-700 text-[9px]">
                    <AlertTriangle className="w-3 h-3 shrink-0" /> Reported!
                  </div>
                )}

                <button type="submit" disabled={!fraudReason || !fraudDesc || fraudLoading} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-1 rounded text-[10px] transition-colors shadow-sm disabled:opacity-50">
                  {fraudLoading ? 'Wait...' : 'Submit'}
                </button>
              </form>
            </div>

          </div>

          {/* ── RIGHT COLUMN (30%) ── */}
          {isChatOpen && (
            <div className="lg:col-span-3 h-full pb-4">
              <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-full shadow-sm overflow-hidden">
                
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center">
                      <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-slate-900 text-xs font-bold">AI Assistant</h4>
                      <p className="text-slate-500 text-[9px]">Property: {property.title} (#{property.propertyCode || 'LL-17842'})</p>
                    </div>
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 flex flex-col scrollbar-premium">
                  {/* Initial Greeting */}
                  {chatMessages.length === 0 && (
                    <div className="flex justify-start">
                      <div className="max-w-[90%] px-3 py-2 rounded-xl text-[11px] leading-relaxed bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm">
                        <p>👋 Hello! I'm your AI Assistant for this property. Ask me anything about land details, legal status, market rates, nearby amenities, or any other information you need.</p>
                      </div>
                    </div>
                  )}

                  {/* Suggested Chips (Only show if no messages yet) */}
                  {chatMessages.length === 0 && (
                    <div className="space-y-1.5 mt-1">
                      <button onClick={() => setChatInput('Are there any active disputes on this survey number?')} className="block text-left w-auto px-3 py-1.5 border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 text-[10px] rounded-lg shadow-sm transition-colors">
                        Are there any active disputes on this survey number?
                      </button>
                      <button onClick={() => setChatInput('What is the local market rate per acre?')} className="block text-left w-auto px-3 py-1.5 border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 text-[10px] rounded-lg shadow-sm transition-colors">
                        What is the local market rate per acre?
                      </button>
                    </div>
                  )}

                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] px-3 py-2 rounded-xl text-[11px] leading-relaxed shadow-sm ${
                        msg.senderRole === 'USER'
                          ? 'bg-purple-100 text-purple-900 rounded-tr-sm border border-purple-200'
                          : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                      }`}>
                        <div className="markdown-body !text-inherit">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 text-[11px] rounded-tl-sm shadow-sm flex items-center gap-1.5">
                        <CircularProgress value={100} size={14} strokeWidth={2} color="primary" /> AI is thinking...
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                  <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl p-1 shadow-sm focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400">
                    <input
                      type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      placeholder="Ask anything about this property..."
                      className="flex-1 bg-transparent px-2 py-1.5 text-[11px] text-slate-800 focus:outline-none"
                    />
                    <button onClick={sendMessage} disabled={isSending || !chatInput.trim()} className="w-7 h-7 rounded-lg bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center disabled:opacity-50 transition-colors shrink-0">
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-center text-[9px] text-slate-400 mt-1.5">AI responses are for informational purposes only.</p>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

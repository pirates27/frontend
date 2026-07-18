import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import { VerificationBadge } from '../../components/shared/VerificationBadge';
import { Map } from '../../components/shared/Map';
import { PanoramaViewer } from '../../components/shared/PanoramaViewer';
import type * as Models from '../../models/property.models';

type TabType = 'spec' | '360' | 'report' | 'map' | 'timeline';
type MediaType = 'image' | 'video';

export const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Models.Property | null>(null);
  const [images, setImages] = useState<Models.PropertyImage[]>([]);
  const [videos, setVideos] = useState<Models.PropertyVideo[]>([]);
  const [documents, setDocuments] = useState<Models.PropertyDocument[]>([]);
  const [timeline, setTimeline] = useState<Models.VerificationTimeline[]>([]);
  const [aiReport, setAiReport] = useState<Models.AiVerification | null>(null);

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

  useEffect(() => {
    if (id) {
      loadProperty(id);
    }
  }, [id]);

  const loadProperty = async (propId: string) => {
    try {
      const p = await propertyService.getPropertyById(propId);
      setProperty(p);

      propertyService.getImages(propId).then(setImages).catch(() => {});
      propertyService.getVideos(propId).then(setVideos).catch(() => {});
      propertyService.getDocuments(propId).then(setDocuments).catch(() => {});
      propertyService.getTimeline(propId).then(setTimeline).catch(() => {});
      propertyService.getAiVerification(propId).then(setAiReport).catch(() => setAiReport(null));
    } catch (error) {
      navigate('/');
    }
  };

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !visitDate || !visitTime) return;
    
    setVisitLoading(true);
    try {
      await propertyService.scheduleVisit(property.id, { visitDate, visitTime: visitTime + ':00' });
      setVisitSuccess(true);
      setVisitDate('');
      setVisitTime('10:30');
    } catch {
      // Handle error
    } finally {
      setVisitLoading(false);
    }
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
    } catch {
      // Handle error
    } finally {
      setFraudLoading(false);
    }
  };

  const goBack = () => {
    const role = authService.getUserRole();
    if (role) {
      switch (role) {
        case 'ADMIN': navigate('/admin'); break;
        case 'GOVERNMENT_OFFICER': navigate('/officer'); break;
        case 'PROVIDER': navigate('/provider'); break;
        case 'BUYER': default: navigate('/buyer'); break;
      }
    } else {
      navigate('/');
    }
  };

  if (!property) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-12">
      {/* Sub-Navbar Header */}
      <nav className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-3">
            <VerificationBadge status={property.status} aiScore={aiReport?.aiTrustScore} />
            <span className="text-xs text-slate-400 font-mono">Code: {property.propertyCode}</span>
          </div>
        </div>
      </nav>

      {/* Main Layout Grid */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Left details panel (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Image Carousel & Gallery */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
            <div className="relative h-96 bg-slate-900 flex items-center justify-center">
              {activeMedia === 'image' && images.length > 0 && (
                <img src={images[activeImageIndex].imageUrl} className="w-full h-full object-cover" alt="Property" />
              )}

              {activeMedia === 'video' && videos.length > 0 && (
                <video src={videos[0].videoUrl} controls className="w-full h-full object-contain"></video>
              )}

              {images.length === 0 && videos.length === 0 && (
                <div className="text-slate-500 text-xs text-center">
                  No photos or walkthrough videos uploaded for this land.
                </div>
              )}

              {/* Media Toggles */}
              <div className="absolute bottom-4 right-4 flex gap-1.5 bg-slate-900/80 px-2 py-1.5 rounded-lg border border-slate-700/50 backdrop-blur-xs z-10">
                {images.length > 0 && (
                  <button 
                    onClick={() => setActiveMedia('image')}
                    className={`text-xs font-semibold px-2 ${activeMedia === 'image' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}`}>
                    Photos
                  </button>
                )}
                {videos.length > 0 && (
                  <button 
                    onClick={() => setActiveMedia('video')}
                    className={`text-xs font-semibold px-2 border-l border-slate-700 ${activeMedia === 'video' ? 'text-emerald-400' : 'text-slate-300 hover:text-white'}`}>
                    Walkthrough
                  </button>
                )}
              </div>
            </div>

            {/* Thumbnail strips */}
            {activeMedia === 'image' && images.length > 1 && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5 overflow-x-auto">
                {images.map((img, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shrink-0 ${activeImageIndex === idx ? 'ring-2 ring-emerald-500' : ''}`}>
                    <img src={img.thumbnailUrl} className="w-full h-full object-cover" alt="Thumbnail" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main tabs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
            <div className="flex border-b border-slate-100 overflow-x-auto">
              {(['spec', '360', 'report', 'map', 'timeline'] as TabType[]).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 border-b-2 font-semibold text-xs transition-all shrink-0 ${activeTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                  {tab === 'spec' ? 'Specifications' : tab === '360' ? '360° Virtual Tour' : tab === 'report' ? 'AI Trust Score' : tab === 'map' ? 'Location Map' : 'Timeline History'}
                </button>
              ))}
            </div>

            {/* 1. Specifications */}
            {activeTab === 'spec' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{property.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">Listed under category: {property.category} • {property.area} acres area size.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Price</span>
                    <p className="text-lg font-bold text-emerald-600">₹{property.price.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Survey Code</span>
                    <p className="text-sm font-bold text-slate-800">{property.surveyNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Village</span>
                    <p className="text-sm font-bold text-slate-800">{property.village}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Pincode</span>
                    <p className="text-sm font-bold text-slate-800">{property.pincode}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">Land Description:</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{property.description || 'No custom description provided.'}</p>
                </div>

                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-700">Deed Documents (OCR Parsed):</h4>
                  <div className="space-y-2">
                    {documents.map((doc, i) => (
                      <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-xs font-semibold text-slate-700">{doc.documentType} PASSBOOK</span>
                        <span className="px-2.5 py-0.5 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 rounded-full uppercase">{doc.verificationStatus}</span>
                      </div>
                    ))}
                    {documents.length === 0 && <p className="text-xs text-slate-400 italic">No passbook documents cataloged.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* 2. 360 Virtual Tour */}
            {activeTab === '360' && (
              <div className="h-[450px]">
                <PanoramaViewer url={property.threeSixtyImageUrl || ''} />
              </div>
            )}

            {/* 3. AI Trust Score */}
            {activeTab === 'report' && (
              <div className="space-y-5">
                {aiReport ? (
                  <>
                    <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-sm">LandLens AI Trust Rating</h4>
                        <p className="text-xs text-slate-500">Verification complete. Boundaries matched local survey passbooks.</p>
                      </div>
                      <span className="text-3xl font-extrabold text-emerald-600">{aiReport.aiTrustScore}%</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Forgery Risk</p>
                        <p className="text-lg font-extrabold text-rose-500 mt-1">{aiReport.forgeryScore}%</p>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Overlapping claim</p>
                        <p className="text-lg font-extrabold mt-1 text-slate-700">{aiReport.duplicateScore}%</p>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Confidence Match</p>
                        <p className="text-lg font-extrabold text-emerald-600 mt-1">{aiReport.confidence}%</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-700 mb-1">AI Analyst Remarks:</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{aiReport.summary}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 italic py-6 text-center">AI Trust checks pending execution on listing files.</p>
                )}
              </div>
            )}

            {/* 4. Location Map */}
            {activeTab === 'map' && (
              <div className="h-[400px]">
                <Map mode="detail" properties={[property]} />
              </div>
            )}

            {/* 5. Timeline */}
            {activeTab === 'timeline' && (
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                {timeline.map((t, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[31px] top-1 bg-emerald-500 border-4 border-white w-4.5 h-4.5 rounded-full shadow-xs"></span>
                    <p className="text-xs font-bold text-slate-700">{t.action}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(t.timestamp).toLocaleString()}</p>
                    {t.remarks && <p className="text-xs text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100/50">{t.remarks}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side sidebar booking / fraud (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Schedule Guided Tour Visit Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Schedule guided on-site tour</h3>
              <p className="text-xs text-slate-500 mt-0.5">Select date/time to visit. Owner contacts will show after approval.</p>
            </div>

            <form onSubmit={handleScheduleVisit} className="space-y-4">
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1">Visit Date</label>
                <input type="date" required value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs" />
              </div>
              
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1">Preferred Time</label>
                <input type="time" required value={visitTime} onChange={e => setVisitTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs" />
              </div>

              {visitSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] rounded-lg">
                  Tour visit scheduled successfully! Waiting for owner confirmation.
                </div>
              )}

              <button 
                type="submit" 
                disabled={!visitDate || !visitTime || visitLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all disabled:opacity-50">
                Book Inspection Slot
              </button>
            </form>
          </div>

          {/* Report Fraud / Overlap disputes Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-rose-500 text-sm">Dispute / Report fraud</h3>
              <p className="text-xs text-slate-500 mt-0.5">Flag double listing, boundaries mismatch, or forgery details.</p>
            </div>

            <form onSubmit={handleSubmitFraud} className="space-y-4">
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1">Reason</label>
                <select value={fraudReason} onChange={e => setFraudReason(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs">
                  <option value="Double Listing">Double Listing / Overlapped boundary</option>
                  <option value="Forgery Name">Ownership Name mismatch</option>
                  <option value="False specifications">False details / area size</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1">Evidence / Remarks</label>
                <textarea rows={3} required value={fraudDesc} onChange={e => setFraudDesc(e.target.value)} placeholder="Provide details to investigate..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs"></textarea>
              </div>

              {fraudSuccess && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[10px] rounded-lg">
                  Fraud report submitted. regional officer will resolve this.
                </div>
              )}

              <button 
                type="submit" 
                disabled={!fraudDesc || fraudLoading}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50">
                File Dispute Report
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

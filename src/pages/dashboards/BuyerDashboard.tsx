import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Map } from '../../components/shared/Map';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { buyerNavItems } from '../../components/layout/Sidebar';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Chip } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Property, PropertyVisit, AiConversation, AiMessage, Notification, PropertyImage, PropertyVideo, PropertyDocument, AiVerification } from '../../models/property.models';
import {
  Search, Calendar, MessageSquare, Bell, Map as MapIcon,
  Heart, ExternalLink, Clock, CheckCircle, Send, Plus,
  Filter, LayoutGrid, RefreshCw, X, Shield, Play, Video, FileText
} from 'lucide-react';

const PropertyCard = React.memo(({ p, isBookmarked, toggleBookmark, onClick, isSelected }: { p: Property; isBookmarked: (id: string) => boolean; toggleBookmark: (id: string) => void; onClick: () => void; isSelected: boolean }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    onClick={onClick}
    className={`glass-card overflow-hidden flex flex-col group hover:-translate-y-1 transition-all duration-300 cursor-pointer ${isSelected ? '!border-primary-500/40 shadow-[0_0_20px_rgba(37,99,235,0.15)]' : ''}`}
  >
    {/* Thumbnail */}
    <div className="relative h-36 bg-dark-800 overflow-hidden shrink-0">
      {p.threeSixtyImageUrl ? (
        <>
          <iframe src={p.threeSixtyImageUrl} style={{ width: '117.64%', height: '117.64%', border: 'none', position: 'absolute', top: 0, left: 0 }} className="pointer-events-none" allow="accelerometer; gyroscope" />
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-dark-900/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
            <span className="w-1.5 h-1.5 bg-accent-400 rounded-full animate-ping" />
            <span className="text-white text-[8px] font-bold">360° LIVE</span>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-dark-800 to-dark-900 flex items-center justify-center">
          <div className="text-center text-dark-600">
            <MapIcon className="w-8 h-8 mx-auto mb-1" />
            <p className="text-[9px] font-medium uppercase tracking-wider">No Preview</p>
          </div>
        </div>
      )}
      {/* Category chip */}
      <div className="absolute top-2 right-2">
        <Chip label={p.category} color={p.category === 'AGRICULTURAL' ? 'accent' : p.category === 'RESIDENTIAL' ? 'cyan' : p.category === 'COMMERCIAL' ? 'warning' : 'neutral'} size="xs" />
      </div>
    </div>

    {/* Content */}
    <div className="p-4 flex-1 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-sm truncate group-hover:text-primary-300 transition-colors">
            {p.title}
          </h3>
          <p className="text-dark-500 text-[11px] mt-0.5 truncate">📍 {p.village}, {p.district}</p>
        </div>
        <StatusBadge status={p.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-white/[0.04] rounded-lg p-2.5">
          <p className="text-dark-500">Area</p>
          <p className="text-white font-bold mt-0.5">{p.area} ac</p>
        </div>
        <div className="bg-accent-500/[0.08] rounded-lg p-2.5">
          <p className="text-accent-500">Price</p>
          <p className="text-accent-400 font-bold mt-0.5">₹{p.price?.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-white/[0.06]">
        <Link to={`/properties/${p.id}`} onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" size="xs" iconRight={<ExternalLink className="w-3 h-3" />}>
            View Property
          </Button>
        </Link>
      </div>
    </div>
  </motion.div>
));

export const BuyerDashboard = () => {
  const [viewTab, setViewTab] = useState<'explore' | 'saved' | 'visits' | 'chat' | 'notifications'>('explore');
  const [listMode, setListMode] = useState<'list' | 'map'>('list');

  const [properties, setProperties] = useState<Property[]>([]);
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [visits, setVisits] = useState<PropertyVisit[]>([]);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Detail panel states
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyDocs, setPropertyDocs] = useState<PropertyDocument[]>([]);
  const [propertyImages, setPropertyImages] = useState<PropertyImage[]>([]);
  const [propertyVideos, setPropertyVideos] = useState<PropertyVideo[]>([]);
  const [aiReport, setAiReport] = useState<AiVerification | null>(null);

  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<{ state: string; district: string; category: any }>({ state: '', district: '', category: '' });
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const currentUser = authService.currentUser();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => { loadData(); loadBookmarks(); loadVisits(); loadNotifications(); }, []);

  const setViewMode = (tab: typeof viewTab) => {
    setViewTab(tab);
    if (tab === 'saved') loadBookmarks();
    else if (tab === 'visits') loadVisits();
    else if (tab === 'chat') loadConversations();
    else if (tab === 'notifications') loadNotifications();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await propertyService.getProperties(filters);
      setProperties(res);
    } catch {} finally { setLoading(false); }
  };

  const selectPropertyObj = async (p: Property) => {
    setSelectedProperty(p);
    setPropertyDocs([]); setPropertyImages([]); setPropertyVideos([]); setAiReport(null);
    try { setPropertyImages(await propertyService.getImages(p.id)); } catch {}
    try { setPropertyVideos(await propertyService.getVideos(p.id)); } catch {}
    try { setPropertyDocs(await propertyService.getDocuments(p.id)); } catch {}
    
    // Attempt to load AI report if it exists
    try {
      const report = await propertyService.getAiReport(p.id);
      setAiReport(report);
    } catch {}
  };

  const loadBookmarks = async () => {
    try {
      const res = await propertyService.getSavedProperties();
      setSavedProperties(res);
      setBookmarkIds(new Set(res.map(p => p.id)));
    } catch {}
  };

  const loadVisits = async () => {
    try { setVisits(await propertyService.getVisits()); } catch {}
  };

  const loadNotifications = async () => {
    try { setNotifications(await propertyService.getNotifications()); } catch {}
  };

  const markNotificationRead = async (id: string) => {
    try { await propertyService.markNotificationRead(id); loadNotifications(); } catch {}
  };

  const isBookmarked = (id: string) => bookmarkIds.has(id);

  const toggleBookmark = async (id: string) => {
    try {
      isBookmarked(id) ? await propertyService.unsaveProperty(id) : await propertyService.saveProperty(id);
      loadBookmarks();
    } catch {}
  };

  const applyFilters = (e: React.FormEvent) => { e.preventDefault(); loadData(); };
  const resetFilters = () => { setFilters({ state: '', district: '', category: '' }); loadData(); };

  const loadConversations = async () => {
    try {
      const res = await propertyService.getAiConversations();
      setConversations(res);
      if (res.length > 0 && !selectedConvoId) selectConversation(res[0].id);
    } catch {}
  };

  const selectConversation = async (id: string) => {
    setSelectedConvoId(id);
    try { setMessages(await propertyService.getAiMessages(id)); } catch {}
  };

  const createNewChat = async (topicSuggestion?: string) => {
    const title = prompt('Enter chat topic:', typeof topicSuggestion === 'string' ? topicSuggestion : 'Land Document Query');
    if (!title) return;
    try {
      const res = await propertyService.startAiConversation(title);
      loadConversations();
      selectConversation(res.id);
      setViewMode('chat');
    } catch {}
  };

  const handleRequestVisit = async () => {
    if (!selectedProperty) return;
    const dateStr = prompt('Enter preferred date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!dateStr) return;
    const timeStr = prompt('Enter preferred time (HH:MM):', '10:00');
    if (!timeStr) return;
    try {
      await propertyService.scheduleVisit(selectedProperty.id, { visitDate: dateStr, visitTime: timeStr });
      loadVisits();
      setViewMode('visits');
    } catch (e) {
      alert('Failed to request visit. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !selectedConvoId) return;
    const text = chatInput;
    setChatInput('');
    const opt: AiMessage = { id: Math.random().toString(), conversationId: selectedConvoId, senderRole: 'USER', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, opt]);
    try { await propertyService.sendAiMessage(selectedConvoId, text); selectConversation(selectedConvoId); } catch {}
  };

  const navItems = buyerNavItems(unreadCount);

  // ─── Detail Panel ──────────────────────────────────────────────────
  const renderDetailPanel = () => {
    if (!selectedProperty) return null;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-[420px] shrink-0 glass-card p-5 lg:sticky lg:top-4 h-fit max-h-[85vh] overflow-y-auto scrollbar-premium"
      >
        <div className="flex justify-between items-start border-b border-white/[0.06] pb-4 mb-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Property Details</h3>
            <p className="text-dark-500 text-[10px] mt-0.5 truncate max-w-[260px]">{selectedProperty.title}</p>
          </div>
          <button onClick={() => setSelectedProperty(null)} className="text-dark-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Map / Map Placeholder */}
        <div className="relative h-40 rounded-xl overflow-hidden bg-dark-900 border border-white/[0.06] mb-5">
          {selectedProperty.threeSixtyImageUrl ? (
            <iframe src={selectedProperty.threeSixtyImageUrl} className="w-full h-full border-none pointer-events-none" allow="accelerometer; gyroscope" />
          ) : (
            <div className="absolute inset-0 w-full h-full">
              <Map mode="detail" properties={[selectedProperty]} />
            </div>
          )}
          <div className="absolute bottom-2 left-2 right-2 bg-dark-950/80 backdrop-blur-md p-2 rounded-lg border border-white/[0.06]">
            <p className="text-white text-xs font-semibold truncate">{selectedProperty.address || selectedProperty.village}</p>
            <p className="text-dark-400 text-[10px] truncate">{selectedProperty.district}, {selectedProperty.state} - {selectedProperty.pincode}</p>
          </div>
        </div>

        {/* Property Details Grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
            <p className="text-dark-500 text-[10px]">Area</p>
            <p className="text-white text-xs font-semibold">{selectedProperty.area} Acres</p>
          </div>
          <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
            <p className="text-dark-500 text-[10px]">Price</p>
            <p className="text-white text-xs font-semibold">₹{selectedProperty.price?.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
            <p className="text-dark-500 text-[10px]">Category</p>
            <p className="text-white text-xs font-semibold">{selectedProperty.category}</p>
          </div>
          <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
            <p className="text-dark-500 text-[10px]">Survey No.</p>
            <p className="text-white text-xs font-semibold">{selectedProperty.surveyNumber}</p>
          </div>
        </div>

        <p className="text-dark-300 text-[11px] mb-5 leading-relaxed">{selectedProperty.description?.split('[BOUNDS]:')[0].trim()}</p>

        {/* Uploaded Media */}
        {(propertyImages.length > 0 || propertyVideos.length > 0) && (
          <div className="mb-5">
            <h4 className="text-dark-400 text-[10px] font-semibold uppercase tracking-wider mb-3">Media Gallery</h4>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-premium">
              {propertyImages.map(img => (
                <div key={img.id} className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-white/[0.1]">
                  <img src={img.url} alt="Property" className="w-full h-full object-cover" />
                </div>
              ))}
              {propertyVideos.map(vid => (
                <div key={vid.id} className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-white/[0.1] bg-dark-900 flex items-center justify-center">
                  <Video className="w-6 h-6 text-dark-500" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Play className="w-6 h-6 text-white opacity-80" /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-2">
          <Button variant="primary" size="sm" className="flex-1" icon={<Calendar className="w-4 h-4" />} onClick={handleRequestVisit}>
            Request Visit
          </Button>
          <Button variant="secondary" size="sm" className="flex-1" icon={<MessageSquare className="w-4 h-4" />} onClick={() => createNewChat(`Query about: ${selectedProperty.title}`)}>
            Ask AI
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <DashboardLayout
      activeTab={viewTab}
      onTabChange={(tab) => setViewMode(tab as any)}
      navItems={navItems}
      role="BUYER"
      title="Buyer Dashboard"
      subtitle={`Welcome, ${currentUser?.firstName || 'Explorer'}`}
      unreadCount={unreadCount}
      mobileNavItems={navItems}
    >

      {/* ── EXPLORE ── */}
      <div className={`${viewTab === 'explore' ? 'block' : 'hidden'} space-y-5`}>
          {/* Search Bar */}
          <GlassCard padding="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setShowFilters(v => !v)} className="flex items-center gap-2 text-dark-300 hover:text-white text-sm transition-colors">
                <Filter className="w-4 h-4" />
                Filters
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.form
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    onSubmit={applyFilters}
                    className="w-full flex flex-wrap gap-3 mt-2"
                  >
                    <input type="text" value={filters.state} onChange={e => setFilters({ ...filters, state: e.target.value })}
                      placeholder="State..." className="input-dark flex-1 min-w-[140px]" />
                    <input type="text" value={filters.district} onChange={e => setFilters({ ...filters, district: e.target.value })}
                      placeholder="District..." className="input-dark flex-1 min-w-[140px]" />
                    <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className="select-dark flex-1 min-w-[140px]">
                      <option value="">All Categories</option>
                      <option value="AGRICULTURAL">Agricultural</option>
                      <option value="RESIDENTIAL">Residential</option>
                      <option value="COMMERCIAL">Commercial</option>
                      <option value="INDUSTRIAL">Industrial</option>
                    </select>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" type="submit" icon={<Search className="w-3.5 h-3.5" />}>Search</Button>
                      <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="ml-auto flex items-center gap-2">
                <span className="text-dark-500 text-xs">{properties.length} properties</span>
                <div className="flex bg-white/[0.05] rounded-lg p-0.5 border border-white/[0.08]">
                  <button onClick={() => setListMode('list')} className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${listMode === 'list' ? 'bg-white/10 text-white' : 'text-dark-500'}`}>
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setListMode('map')} className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${listMode === 'map' ? 'bg-white/10 text-white' : 'text-dark-500'}`}>
                    <MapIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Button variant="glass" size="xs" icon={<RefreshCw className="w-3 h-3" />} onClick={loadData} />
              </div>
            </div>
          </GlassCard>

          <div className="flex flex-col lg:flex-row gap-5 items-start">
            <div className="flex-1 w-full space-y-5">
              {/* LIST MODE */}
              {listMode === 'list' && (
                loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[0,1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
                  </div>
                ) : properties.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {properties.map(p => (
                      <PropertyCard 
                        key={p.id} p={p} 
                        isBookmarked={isBookmarked} toggleBookmark={toggleBookmark}
                        onClick={() => selectPropertyObj(p)}
                        isSelected={selectedProperty?.id === p.id}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Search className="w-8 h-8" />}
                    title="No properties found"
                    description="Try adjusting your filters or search in a different area."
                    action={{ label: 'Reset Filters', onClick: resetFilters }}
                  />
                )
              )}

              {/* MAP MODE */}
              {listMode === 'map' && (
                <div className="h-[500px] rounded-2xl overflow-hidden border border-white/[0.08]">
                  <Map mode="view" properties={properties} onLocationSelected={() => {}} />
                </div>
              )}
            </div>

            {renderDetailPanel()}
          </div>
        </div>


      {/* ── VISITS ── */}
      <div className={`${viewTab === 'visits' ? 'block' : 'hidden'} space-y-5`}>
          <div>
            <h2 className="text-white font-bold text-lg">Scheduled Visits</h2>
            <p className="text-dark-400 text-sm mt-0.5">Track status of your scheduled property tours</p>
          </div>
          {visits.length > 0 ? (
            <div className="space-y-3">
              {visits.map(v => (
                <GlassCard key={v.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-primary-400" />
                      <span className="text-white font-semibold text-sm">{v.visitDate} at {v.visitTime}</span>
                      <Chip
                        label={v.status}
                        color={v.status === 'CONFIRMED' ? 'accent' : v.status === 'SCHEDULED' ? 'warning' : v.status === 'REJECTED' ? 'danger' : 'neutral'}
                        size="xs"
                        dot
                      />
                    </div>
                    <p className="text-dark-500 text-xs font-mono">Property: {v.property?.title?.slice(0, 30) || v.property?.id?.slice(0, 12)}...</p>
                  </div>
                  <Link to={`/properties/${v.property?.id}`}>
                    <Button variant="glass" size="xs" iconRight={<ExternalLink className="w-3 h-3" />}>
                      View Property
                    </Button>
                  </Link>
                </GlassCard>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Calendar className="w-8 h-8" />}
              title="No visits scheduled"
              description="Visit property detail pages to schedule guided tours."
              action={{ label: 'Explore Properties', onClick: () => setViewMode('explore') }}
            />
          )}
        </div>

      {/* ── AI CHAT ── */}
      <div className={`${viewTab === 'chat' ? 'flex' : 'hidden'} gap-4 h-[calc(100vh-200px)]`}>
          {/* Conversations */}
          <div className="w-64 shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-semibold text-sm">Conversations</h3>
              <Button variant="ghost" size="xs" icon={<Plus className="w-3.5 h-3.5" />} onClick={createNewChat}>New</Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-premium">
              {conversations.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => selectConversation(convo.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    selectedConvoId === convo.id
                      ? 'bg-primary-500/15 border border-primary-500/30 text-primary-300'
                      : 'glass-card text-dark-400 hover:text-white'
                  }`}
                >
                  <p className="truncate">{convo.title || 'Untitled Chat'}</p>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-dark-600 text-xs px-2 py-4 text-center">No conversations yet. Click New to start.</p>
              )}
            </div>
          </div>

          {/* Message Area */}
          <div className="flex-1 glass-card flex flex-col overflow-hidden !p-0">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-white text-sm font-semibold">LandLens AI Assistant</h4>
                <p className="text-dark-500 text-[10px]">Ask about land records, Patta verification, and survey boundaries</p>
              </div>
              <div className="ml-auto status-dot-online" />
            </div>

            {/* Messages */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-premium">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                    <p className="text-dark-500 text-sm">Select a conversation or start a new one</p>
                  </div>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[72%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.senderRole === 'USER'
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'glass-card text-dark-200 rounded-tl-sm'
                  }`}>
                    <div className="markdown-body space-y-3">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-3 border border-white/[0.08] rounded-xl bg-dark-900/50 backdrop-blur-md">
                            <table className="w-full text-left border-collapse" {...props} />
                          </div>
                        ),
                        th: ({ node, ...props }) => <th className="p-3 text-xs font-semibold text-white border-b border-white/[0.08] bg-white/[0.02]" {...props} />,
                        td: ({ node, ...props }) => <td className="p-3 text-xs text-dark-300 border-b border-white/[0.04]" {...props} />,
                        a: ({ node, ...props }) => <a className="text-primary-400 hover:text-primary-300 underline underline-offset-2" {...props} />,
                        code: ({ node, inline, className, children, ...props }: any) => {
                          const match = /language-(\w+)/.exec(className || '');
                          if (!inline && match && match[1] === 'json') {
                            try {
                              const data = JSON.parse(String(children).replace(/\n$/, ''));
                              if (data.type === 'property' && data.propertyId) {
                                const p = properties.find(prop => prop.id === data.propertyId) || savedProperties.find(prop => prop.id === data.propertyId);
                                if (p) {
                                  return (
                                    <div className="w-[300px] my-4 cursor-pointer" onClick={() => { selectPropertyObj(p); setViewMode('explore'); }}>
                                      <PropertyCard 
                                        p={p} 
                                        isBookmarked={isBookmarked} 
                                        toggleBookmark={toggleBookmark}
                                        onClick={() => { selectPropertyObj(p); setViewMode('explore'); }}
                                        isSelected={false}
                                      />
                                    </div>
                                  );
                                }
                              }
                            } catch (e) {}
                          }
                          return <code className={inline ? "bg-white/10 rounded px-1.5 py-0.5 text-xs font-mono" : "block bg-dark-950/80 p-3 rounded-lg text-xs font-mono overflow-x-auto border border-white/[0.06] my-2"} {...props}>{children}</code>;
                        },
                        p: ({ node, ...props }) => <p className="leading-relaxed" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t border-white/[0.06] flex gap-3">
              <input
                type="text" value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about land records, Patta verification..."
                className="input-dark flex-1"
              />
              <Button variant="primary" size="sm" icon={<Send className="w-4 h-4" />} onClick={sendMessage} />
            </div>
          </div>
        </div>

      {/* ── NOTIFICATIONS ── */}
      <div className={`${viewTab === 'notifications' ? 'block' : 'hidden'} space-y-5`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">Notifications</h2>
              <p className="text-dark-400 text-sm mt-0.5">Alerts about verifications, visits, and account activity</p>
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
                    : <CheckCircle className="w-4 h-4 text-dark-600 shrink-0" />
                  }
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

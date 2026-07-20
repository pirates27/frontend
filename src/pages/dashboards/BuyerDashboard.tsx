import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Map } from '../../components/shared/Map';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Chip } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { CircularProgress } from '../../components/ui/ProgressBar';
import type { Property, PropertyVisit, AiConversation, AiMessage, Notification, PropertyImage, PropertyVideo, PropertyDocument, AiVerification } from '../../models/property.models';
import {
  Search, Calendar, MessageSquare, Bell, Map as MapIcon,
  Heart, ExternalLink, Clock, CheckCircle, Send, Plus,
  Filter, User, Settings, LogOut, ChevronRight, Home, Bookmark, 
  RefreshCw, X, Shield, Play, Video, FileText, ArrowLeft, Star, MapPin, Menu
} from 'lucide-react';

const MobilePropertyCard = ({ p, vertical = false, isHidden = false }: { p: Property, vertical?: boolean, isHidden?: boolean }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/properties/${p.id}`)}
      className={`relative glass-card overflow-hidden shrink-0 flex ${vertical ? 'flex-col w-full' : 'flex-col w-64'} cursor-pointer !p-0 ${isHidden ? 'hidden' : ''}`}
    >
      <div className={`relative ${vertical ? 'h-48' : 'h-36'} bg-dark-800 overflow-hidden`}>
        {p.threeSixtyImageUrl ? (
          <>
            <iframe src={p.threeSixtyImageUrl} style={{ width: '117.64%', height: '117.64%', border: 'none', position: 'absolute', top: 0, left: 0 }} className="pointer-events-none" />
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-dark-900/80 px-2 py-0.5 rounded-full backdrop-blur-sm z-10">
              <span className="w-1.5 h-1.5 bg-accent-400 rounded-full animate-ping" />
              <span className="text-white text-[8px] font-bold">360° LIVE</span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark-800 to-dark-900 flex items-center justify-center">
            <MapIcon className="w-8 h-8 text-dark-600" />
          </div>
        )}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex justify-between items-end pointer-events-none">
            <Chip label={p.category} color="primary" size="xs" />
            <StatusBadge status={p.status} size="sm" />
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2">
        <h3 className="text-white font-semibold text-sm truncate">{p.title}</h3>
        <p className="text-dark-400 text-xs flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0"/> {p.village}, {p.district}</p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.05]">
          <p className="text-white font-bold text-sm">₹{p.price?.toLocaleString('en-IN')}</p>
          <p className="text-dark-300 text-xs">{p.area} acres</p>
        </div>
      </div>
    </div>
  );
};

export const BuyerDashboard = () => {
  const navigate = useNavigate();
  const [viewTab, setViewTab] = useState<'home' | 'map' | 'chat' | 'wishlist' | 'schedule' | 'settings'>('home');
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
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<{ state: string; district: string; category: any }>({ state: '', district: '', category: '' });
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isNotificationSidebarOpen, setIsNotificationSidebarOpen] = useState(false);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY <= 0) {
      setIsNavVisible(true);
      setLastScrollY(0);
      return;
    }
    if (currentScrollY > lastScrollY + 10) {
      setIsNavVisible(false);
      setLastScrollY(currentScrollY);
    } else if (currentScrollY < lastScrollY - 10) {
      setIsNavVisible(true);
      setLastScrollY(currentScrollY);
    }
  };

  const heroSlides = [
    { title: 'Find Your Perfect Piece of Land', subtitle: 'Discover verified agricultural properties across India.', cta: 'Explore Farms', image: '/images/hero_agriculture.png' },
    { title: 'Build Your Dream Home Today', subtitle: 'Explore premium residential plots with clear titles.', cta: 'View Residential', image: '/images/hero_residential.png' },
    { title: 'Prime Commercial Spaces', subtitle: 'High ROI commercial lands in rapidly growing hubs.', cta: 'View Commercial', image: '/images/hero_commercial.png' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlideIndex(prev => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);
  
  const currentUser = authService.currentUser();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const userLocRef = useRef<{lat: number, lng: number} | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const sortPropertiesByLocation = (props: Property[], loc: { lat: number, lng: number }) => {
    return [...props].sort((a, b) => {
      const distA = Math.hypot(a.latitude - loc.lat, a.longitude - loc.lng);
      const distB = Math.hypot(b.latitude - loc.lat, b.longitude - loc.lng);
      return distA - distB;
    });
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          userLocRef.current = loc;
          setUserLocation(loc);
          setProperties(prev => prev.length > 0 ? sortPropertiesByLocation(prev, loc) : prev);
        },
        (error) => console.error("Error getting location", error)
      );
    }
    loadData(filters); loadBookmarks(); loadVisits(); loadNotifications();
  }, []);

  const loadData = async (currentFilters: any) => {
    setLoading(true);
    try {
      const { category, ...backendFilters } = currentFilters;
      let res = await propertyService.getProperties(backendFilters);
      if (userLocRef.current) res = sortPropertiesByLocation(res, userLocRef.current);
      setProperties(res);
    } catch {} finally { setLoading(false); }
  };

  const handleCategoryClick = (categoryId: string) => {
    const newCategory = filters.category === categoryId ? '' : categoryId;
    const newFilters = { ...filters, category: newCategory };
    setFilters(newFilters);
    // Removed loadData(newFilters) to prevent backend fetching on category change
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

  const isBookmarked = (id: string) => bookmarkIds.has(id);

  const toggleBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      isBookmarked(id) ? await propertyService.unsaveProperty(id) : await propertyService.saveProperty(id);
      loadBookmarks();
    } catch {}
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

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
    const title = prompt('Enter chat topic:', typeof topicSuggestion === 'string' ? topicSuggestion : 'Land Query');
    if (!title) return;
    try {
      const res = await propertyService.startAiConversation(title);
      loadConversations();
      selectConversation(res.id);
      setIsChatOpen(true);
    } catch {}
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !selectedConvoId) return;
    const text = chatInput;
    setChatInput('');
    const opt: AiMessage = { id: Math.random().toString(), conversationId: selectedConvoId, senderRole: 'USER', content: text, timestamp: new Date().toISOString(), isActive: true };
    setMessages(prev => [...prev, opt]);
    try { await propertyService.sendAiMessage(selectedConvoId, text); selectConversation(selectedConvoId); } catch {}
  };

  const handleTabChange = (tab: typeof viewTab) => {
    setViewTab(tab);
    if (tab === 'wishlist') loadBookmarks();
    else if (tab === 'schedule') loadVisits();
    else if (tab === 'chat') loadConversations();
  };



  return (
    <div className="relative h-screen bg-dark-950 flex flex-col overflow-hidden text-white font-sans">
      
      {/* ── APP BAR ── */}
      <div 
        style={{ borderBottomLeftRadius: '25px', borderBottomRightRadius: '25px' }}
        className={`absolute top-0 left-0 right-0 bg-dark-900/90 backdrop-blur-xl border-b border-white/[0.05] px-4 py-3 flex items-center justify-between z-40 shadow-[0_5px_20px_rgba(0,0,0,0.3)] transition-transform duration-300 ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <MapIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold tracking-wide text-lg">LandLense</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setIsNotificationSidebarOpen(true)} className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center border border-white/[0.1]">
              <Bell className="w-4 h-4 text-dark-300" />
            </button>
            {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-danger-500 border-2 border-dark-900 rounded-full" />}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-primary-500/20"
            >
              <User className="w-5 h-5 text-white" />
            </button>
            
            <AnimatePresence>
              {isProfileMenuOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" 
                    onClick={() => setIsProfileMenuOpen(false)} 
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-12 w-48 !bg-black border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-white/[0.05]">
                      <p className="text-dark-400 text-[10px] font-bold uppercase tracking-wider">Signed in as</p>
                      <p className="text-white text-sm font-semibold truncate">{currentUser?.firstName || 'Explorer'}</p>
                    </div>
                    <div className="py-2">
                      <button className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/[0.05] flex items-center gap-2">
                        <User className="w-4 h-4 text-dark-400" /> Profile
                      </button>
                      <button 
                        onClick={() => { authService.logout(); navigate('/login'); }}
                        className="w-full px-4 py-2 text-left text-sm text-danger-500 hover:bg-danger-500/10 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> Log out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div onScroll={handleScroll} className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pt-[68px] ${viewTab === 'map' ? 'pb-0' : 'pb-20'}`}>
        <AnimatePresence mode="wait">
          {/* ── HOME TAB ── */}
          {viewTab === 'home' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-8">
              
              {/* Hero Slider Section */}
              <div className="px-4 pt-6 pb-2 bg-gradient-to-br from-primary-900/30 to-dark-950 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
                
                {/* Carousel Area */}
                <div className="relative h-[200px] w-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={heroSlideIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 flex items-center justify-between"
                    >
                       {/* Left side text */}
                       <div className="w-[55%] flex flex-col justify-center relative z-10">
                          <h1 className="text-xl font-bold text-white mb-2 leading-tight">{heroSlides[heroSlideIndex].title}</h1>
                          <p className="text-dark-400 text-[10px] mb-4">{heroSlides[heroSlideIndex].subtitle}</p>
                          <button className="bg-primary-600 hover:bg-primary-500 text-white text-[10px] font-bold px-4 py-2 rounded-xl shadow-lg shadow-primary-500/20 w-max transition-all active:scale-95">
                            {heroSlides[heroSlideIndex].cta}
                          </button>
                       </div>
                       
                       {/* Right side illustration (Placeholder) */}
                       <div className="w-[45%] h-full flex items-center justify-end relative z-0">
                         {/* Optional masking to blend solid background images nicely */}
                         <img src={heroSlides[heroSlideIndex].image} alt="Hero Illustration" className="h-full w-full object-cover rounded-2xl opacity-90 mix-blend-lighten" />
                       </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Slider Indicators */}
                <div className="flex justify-center gap-1.5 mt-2 mb-2 relative z-10">
                  {heroSlides.map((_, i) => (
                    <button key={i} onClick={() => setHeroSlideIndex(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === heroSlideIndex ? 'w-5 bg-primary-400' : 'w-1.5 bg-white/20 hover:bg-white/40'}`} />
                  ))}
                </div>
                
              </div>

              {/* Categories */}
              <div className="px-4 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white">Categories</h2>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'AGRICULTURAL', label: 'Agricultural', color: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
                    { id: 'RESIDENTIAL', label: 'Residential', color: 'bg-cyan-500/10 border-cyan-500/20', text: 'text-cyan-400' },
                    { id: 'COMMERCIAL', label: 'Commercial', color: 'bg-primary-500/10 border-primary-500/20', text: 'text-primary-400' },
                    { id: 'INDUSTRIAL', label: 'Industrial', color: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400' },
                  ].map(cat => {
                    const isActive = filters.category === cat.id;
                    return (
                      <button key={cat.id} onClick={() => handleCategoryClick(cat.id)} className="flex flex-col items-center gap-2 w-full">
                        <div className={`w-14 h-14 rounded-full border flex items-center justify-center transition-transform active:scale-95 mx-auto ${isActive ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/30' : `${cat.color} ${cat.text}`}`}>
                           <MapIcon className="w-6 h-6" />
                        </div>
                        <span className={`text-[10px] font-semibold text-center leading-tight break-words w-full ${isActive ? 'text-primary-400' : 'text-white'}`}>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Latest Added Properties */}
              <div className="mb-8">
                <div className="px-4 flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white">Latest Additions</h2>
                  <button className="text-xs font-semibold text-primary-400 flex items-center">See All <ChevronRight className="w-3 h-3 ml-0.5" /></button>
                </div>
                {loading ? (
                  <div className="flex gap-4 overflow-x-auto px-4 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {[0,1,2].map(i => <div key={i} className="w-64 shrink-0"><SkeletonCard /></div>)}
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto px-4 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {properties.slice(0, 5).map(p => (
                      <MobilePropertyCard key={p.id} p={p} isHidden={!!filters.category && p.category !== filters.category} />
                    ))}
                  </div>
                )}
                {!loading && properties.slice(0, 5).filter(p => !filters.category || p.category === filters.category).length === 0 && (
                  <div className="py-8 flex flex-col items-center justify-center text-center opacity-60 px-4">
                    <MapIcon className="w-10 h-10 text-dark-500 mb-2" />
                    <p className="text-sm font-semibold text-white">No properties found</p>
                    <p className="text-xs text-dark-400 mt-1">There are currently no properties available for the selected filters.</p>
                  </div>
                )}
              </div>

              {/* Top Rated Properties */}
              {properties.length > 5 && properties.slice(5, 10).filter(p => !filters.category || p.category === filters.category).length > 0 && (
                <div className="mb-4">
                  <div className="px-4 flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400 fill-amber-400"/> Top Verified</h2>
                    <button className="text-xs font-semibold text-primary-400 flex items-center">See All <ChevronRight className="w-3 h-3 ml-0.5" /></button>
                  </div>
                  <div className="px-4 flex flex-col gap-4">
                     {properties.slice(5, 10).map(p => (
                       <MobilePropertyCard key={p.id} p={p} vertical={true} isHidden={!!filters.category && p.category !== filters.category} />
                     ))}
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* ── MAP TAB ── */}
          {viewTab === 'map' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative">
              <Map mode="view" properties={properties} onLocationSelected={() => {}} className="!rounded-none !border-none" />
              <div className="absolute top-4 left-4 right-4 bg-dark-900/90 backdrop-blur-xl rounded-2xl border border-white/[0.1] p-3 flex items-center gap-3 shadow-2xl">
                <Search className="w-5 h-5 text-dark-400" />
                <input type="text" placeholder="Search location..." className="bg-transparent text-sm text-white w-full outline-none" />
              </div>
            </motion.div>
          )}

          {/* ── WISHLIST TAB ── */}
          {viewTab === 'wishlist' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <h1 className="text-xl font-bold text-white mb-2">Saved Properties</h1>
              {savedProperties.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {savedProperties.map(p => <MobilePropertyCard key={p.id} p={p} vertical={true} />)}
                </div>
              ) : (
                <EmptyState icon={<Bookmark className="w-12 h-12" />} title="Your wishlist is empty" description="Save properties you love to view them later." />
              )}
            </motion.div>
          )}

          {/* ── SCHEDULE TAB (Visits) ── */}
          {viewTab === 'schedule' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <h1 className="text-xl font-bold text-white mb-2">My Schedule</h1>
              {visits.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {visits.map(v => (
                    <div key={v.id} className="glass-card p-4 flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] text-primary-400 font-bold uppercase">{new Date(v.visitDate).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-sm text-white font-bold">{new Date(v.visitDate).getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">{v.property?.title || 'Unknown Property'}</h3>
                        <p className="text-xs text-dark-400 flex items-center gap-1 mt-1"><Clock className="w-3 h-3"/> {v.visitTime}</p>
                      </div>
                      <StatusBadge status={v.status} size="sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Calendar className="w-12 h-12" />} title="No upcoming visits" description="Schedule a site visit to view properties." />
              )}
            </motion.div>
          )}

          {/* ── CHAT TAB ── */}
          {/* Moved to full-screen modal triggered by FAB */}

          {/* ── SETTINGS TAB ── */}
          {viewTab === 'settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
              <h1 className="text-xl font-bold text-white mb-6">Settings</h1>
              
              <div className="glass-card p-4 flex items-center gap-4 mb-6">
                 <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary-600 to-cyan-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                 </div>
                 <div className="flex-1">
                   <h2 className="text-white font-bold">{currentUser?.firstName} {currentUser?.lastName}</h2>
                   <p className="text-dark-400 text-xs">{currentUser?.email}</p>
                 </div>
                 <Button variant="ghost" size="xs">Edit</Button>
              </div>

              <div className="space-y-2 mb-6">
                <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-2 ml-1">Account</h3>
                {['Profile Information', 'Saved Addresses', 'Payment Methods'].map(item => (
                  <button key={item} className="w-full p-4 glass-card flex items-center justify-between hover:bg-white/[0.05] transition-colors">
                    <span className="text-sm font-semibold text-white">{item}</span>
                    <ChevronRight className="w-4 h-4 text-dark-500" />
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-2 ml-1">Preferences</h3>
                {['Notifications', 'Language & Region', 'Privacy & Security'].map(item => (
                  <button key={item} className="w-full p-4 glass-card flex items-center justify-between hover:bg-white/[0.05] transition-colors">
                    <span className="text-sm font-semibold text-white">{item}</span>
                    <ChevronRight className="w-4 h-4 text-dark-500" />
                  </button>
                ))}
              </div>

              <button onClick={handleLogout} className="w-full mt-8 p-4 rounded-2xl bg-danger-500/10 border border-danger-500/20 text-danger-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-danger-500/20 transition-colors">
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── NOTIFICATION SIDEBAR ── */}
      <AnimatePresence>
        {isNotificationSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setIsNotificationSidebarOpen(false)} />
            
            {/* Sidebar */}
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 w-80 bg-[#090C15] border-l border-white/[0.05] z-[70] flex flex-col shadow-[-10px_0_50px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
                <h2 className="text-lg font-bold text-white">Notifications</h2>
                <button onClick={() => setIsNotificationSidebarOpen(false)} className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center hover:bg-white/[0.1]"><X className="w-4 h-4 text-white"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length > 0 ? notifications.map(notif => (
                  <div key={notif.id} className={`p-4 rounded-xl border ${notif.isRead ? 'bg-dark-900/50 border-white/[0.02]' : 'bg-primary-500/10 border-primary-500/20'}`}>
                    <h3 className="text-sm font-bold text-white">{notif.title}</h3>
                    <p className="text-xs text-dark-400 mt-1">{notif.message}</p>
                    <span className="text-[10px] text-dark-500 mt-2 block">{new Date(notif.createdAt).toLocaleDateString()}</span>
                  </div>
                )) : (
                  <div className="text-center text-dark-500 py-8 text-sm">No new notifications</div>
                )}
              </div>
            </motion.div>
          </>
        )}

        {/* Chat History Sidebar */}
        {isChatSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[105]" onClick={() => setIsChatSidebarOpen(false)} />
            
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 w-80 bg-[#090C15] border-l border-white/[0.05] z-[110] flex flex-col shadow-[-10px_0_50px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
                <h2 className="text-lg font-bold text-white">Chat History</h2>
                <button onClick={() => setIsChatSidebarOpen(false)} className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center hover:bg-white/[0.1]"><X className="w-4 h-4 text-white"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {conversations.length > 0 ? conversations.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => { selectConversation(c.id); setIsChatSidebarOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${selectedConvoId === c.id ? 'bg-primary-600/20 border-primary-500/30 text-primary-400' : 'bg-dark-900/50 border-white/[0.05] text-white hover:bg-dark-800'}`}
                  >
                    <h3 className="text-sm font-semibold truncate">{c.title}</h3>
                  </button>
                )) : (
                  <div className="text-center text-dark-500 py-8 text-sm">No chat history</div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CHAT MODAL ── */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed inset-0 z-[100] bg-[#090C15] flex flex-col">
            <div className="px-4 py-3 bg-dark-900 border-b border-white/[0.05] flex justify-between items-center shrink-0 pt-safe">
               <div>
                 <h2 className="text-white font-bold">AI Assistant</h2>
                 <p className="text-[10px] text-dark-400">Ask about any property or land record.</p>
               </div>
               <div className="flex items-center gap-2">
                 <Button variant="ghost" size="xs" onClick={() => createNewChat()}>New</Button>
                 <button onClick={() => setIsChatSidebarOpen(true)} className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center border border-white/[0.1] hover:bg-white/[0.1]">
                   <Menu className="w-4 h-4 text-white" />
                 </button>
                 <button onClick={() => setIsChatOpen(false)} className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center border border-white/[0.1] hover:bg-white/[0.1]">
                   <X className="w-4 h-4 text-white" />
                 </button>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                    <MessageSquare className="w-12 h-12 text-dark-500 mb-3" />
                    <p className="text-sm font-semibold text-white">Start a conversation</p>
                    <p className="text-xs text-dark-400 mt-1">Ask questions about land laws, prices, and more.</p>
                  </div>
               ) : (
                 messages.map(msg => (
                   <div key={msg.id} className={`flex ${msg.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.senderRole === 'USER' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-dark-800 text-dark-100 rounded-tl-sm border border-white/[0.05]'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                     </div>
                   </div>
                 ))
               )}
            </div>

            <div className="p-4 bg-dark-900 border-t border-white/[0.05] shrink-0 pb-safe">
              <div className="flex gap-2 mb-4">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Message AI..." className="input-dark flex-1 !rounded-full" />
                <button onClick={sendMessage} className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center shrink-0 text-white hover:bg-primary-500 transition-colors">
                  <Send className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FLOATING CHAT BUTTON ── */}
      <button 
        onClick={() => { 
          loadConversations(); 
          setIsChatOpen(true);
          if (selectedProperty) {
            setChatInput(`I have a question about property ${selectedProperty.propertyCode} - ${selectedProperty.title}: `);
          }
        }}
        className={`fixed bottom-[68px] right-4 z-[55] w-14 h-14 !bg-blue-600 rounded-full shadow-[0_5px_20px_rgba(37,99,235,0.4)] flex items-center justify-center text-white hover:!bg-blue-500 transition-all duration-300 active:scale-95 ${isNavVisible ? 'translate-y-0 opacity-100' : 'translate-y-[150px] opacity-0'}`}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* ── BOTTOM NAVIGATION BAR ── */}
      <div className={`flex-none bg-dark-900/95 backdrop-blur-xl border-t border-white/[0.05] fixed bottom-0 left-0 right-0 z-50 pb-safe rounded-t-[25px] shadow-[0_-5px_30px_rgba(0,0,0,0.4)] transition-transform duration-300 ${isNavVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-around h-[51px]">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'map', icon: MapIcon, label: 'Map' },
            { id: 'schedule', icon: Calendar, label: 'Visits' }
          ].map(item => {
             const Icon = item.icon;
             const isActive = viewTab === item.id;
             return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as any)}
                  className="flex flex-col items-center justify-center w-full h-full relative"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-primary-500/20' : ''}`}>
                    <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary-400' : 'text-dark-500'}`} />
                  </div>
                  <span className={`text-[9px] font-semibold transition-colors mt-0.5 ${isActive ? 'text-primary-400' : 'text-dark-500'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div layoutId="mobileNav" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-t-full" />
                  )}
                </button>
             );
          })}
        </div>
      </div>
      
      {/* Spacer for pb-safe */}
      <style dangerouslySetInnerHTML={{__html: `
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `}} />
    </div>
  );
};

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
import logo from '../../assets/logo.png';
import logoText from '../../assets/logo-text.png';
import noPropertiesImg from '../../assets/no-properties.png';

const MobilePropertyCard = ({ p, vertical = false, isHidden = false }: { p: Property, vertical?: boolean, isHidden?: boolean }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/properties/${p.id}`)}
      className={`relative bg-white shadow-md border border-gray-200 rounded-2xl overflow-hidden shrink-0 flex ${vertical ? 'flex-col w-full' : 'flex-col w-64'} cursor-pointer !p-0 ${isHidden ? 'hidden' : ''}`}
    >
      <div className={`relative ${vertical ? 'h-48' : 'h-36'} bg-gray-100 overflow-hidden`}>
        {p.threeSixtyImageUrl ? (
          <>
            <iframe src={p.threeSixtyImageUrl} style={{ width: '117.64%', height: '117.64%', border: 'none', position: 'absolute', top: 0, left: 0 }} className="pointer-events-none" />
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 px-2 py-0.5 rounded-full z-10 shadow-sm">
              <span className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-ping" />
              <span className="text-gray-900 text-[8px] font-bold">360° LIVE</span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <MapIcon className="w-8 h-8 text-gray-300" />
          </div>
        )}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex justify-between items-end pointer-events-none">
            <Chip label={p.category} color="primary" size="xs" />
            <StatusBadge status={p.status} size="sm" />
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2">
        <h3 className="text-gray-900 font-semibold text-sm truncate">{p.title}</h3>
        <p className="text-gray-500 text-xs flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0"/> {p.village}, {p.district}</p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <p className="text-gray-900 font-bold text-sm">₹{p.price?.toLocaleString('en-IN')}</p>
          <p className="text-gray-400 text-xs">{p.area} acres</p>
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
    { title: 'AI-Powered Insights', subtitle: 'Get smart recommendations and answers for your land queries.', cta: 'Ask AI', image: 'https://i.ibb.co/1Y111NdG/ai.png' },
    { title: 'Explore in 360°', subtitle: 'Experience properties virtually with our immersive LandLense technology.', cta: 'View 360°', image: 'https://i.ibb.co/xS14Sht7/lens.png' },
    { title: 'Build Your Future', subtitle: 'Find the perfect plots for your next big construction project.', cta: 'Start Building', image: 'https://i.ibb.co/LWVw1BW/buld.png' },
    { title: 'Interactive Mapping', subtitle: 'Discover properties easily with our advanced interactive map.', cta: 'Open Map', image: 'https://i.ibb.co/jPY8RxBB/map.png' },
    { title: 'Secure & Verified', subtitle: 'Invest with confidence in 100% verified properties and clear titles.', cta: 'View Verified', image: 'https://i.ibb.co/jc8q9gm/security.png' }
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
      let res = await propertyService.getProperties({ ...backendFilters, status: 'APPROVED' });
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
    <div className="relative h-screen bg-gray-50 flex flex-col overflow-hidden text-gray-900 font-sans">
      
      {/* ── APP BAR ── */}
      <div 
        style={{ borderBottomLeftRadius: '25px', borderBottomRightRadius: '25px' }}
        className={`absolute top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-40 shadow-sm transition-transform duration-300 ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="flex items-center gap-2">
          <img src={logo} alt="LandLense Logo" className="h-8 w-auto object-contain" />
          <img src={logoText} alt="LandLense" className="h-6 w-auto object-contain" />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setIsNotificationSidebarOpen(true)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 hover:bg-gray-200">
              <Bell className="w-4 h-4 text-gray-600" />
            </button>
            {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-danger-500 border-2 border-white rounded-full" />}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center shadow-sm"
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
                    className="fixed inset-0 z-40 bg-black/20" 
                    onClick={() => setIsProfileMenuOpen(false)} 
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Signed in as</p>
                      <p className="text-gray-900 text-sm font-semibold truncate">{currentUser?.firstName || 'Explorer'}</p>
                    </div>
                    <div className="py-2">
                      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" /> Profile
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
      <div onScroll={handleScroll} className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide ${viewTab === 'map' ? 'pt-0 pb-0' : 'pt-[68px] pb-20'}`}>
        <AnimatePresence mode="wait">
          {/* ── HOME TAB ── */}
          {viewTab === 'home' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-8">
              
              {/* Hero Slider Section */}
              <div className="px-4 pt-6 pb-2 bg-gray-50 relative overflow-hidden">
                
                {/* Carousel Area */}
                <div className="relative h-[200px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={heroSlideIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 flex items-center justify-between"
                    >
                       {/* Background image stretched to cover full section */}
                       <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none">
                         <img src={heroSlides[heroSlideIndex].image} alt="Hero Illustration" className="w-full h-full object-cover" />
                       </div>
                       
                       {/* Overlay text over the full width */}
                       <div className="w-full h-full flex flex-col justify-center relative z-10 p-4 pointer-events-none bg-gradient-to-r from-black/80 via-black/40 to-transparent">
                          <h1 className="text-xl font-bold text-white mb-2 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] max-w-[60%]" style={{ WebkitTextStroke: '0.5px black' }}>{heroSlides[heroSlideIndex].title}</h1>
                          <p className="text-white text-[10px] mb-4 max-w-[55%] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" style={{ WebkitTextStroke: '0.2px black' }}>{heroSlides[heroSlideIndex].subtitle}</p>
                          <button className="pointer-events-auto group relative overflow-hidden bg-black text-white text-[11px] font-bold px-5 py-2.5 rounded-xl w-max transition-all duration-300 hover:bg-gray-800 active:scale-95 flex items-center gap-2 border border-white/20">
                            <span className="relative z-10">{heroSlides[heroSlideIndex].cta}</span>
                            <ChevronRight className="w-3.5 h-3.5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                          </button>
                       </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
                
              </div>

              {/* Categories */}
              <div className="px-4 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-gray-900">Categories</h2>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'AGRICULTURAL', label: 'Agricultural', image: 'https://i.ibb.co/60v5FYDV/AGRI.png' },
                    { id: 'RESIDENTIAL', label: 'Residential', image: 'https://i.ibb.co/PsHG0SXN/HOME.png' },
                    { id: 'COMMERCIAL', label: 'Commercial', image: 'https://i.ibb.co/5WJXZKxf/comersial.png' },
                    { id: 'INDUSTRIAL', label: 'Industrial', image: 'https://i.ibb.co/jkmhLV7J/INDUSTRY.png' },
                  ].map(cat => {
                    const isActive = filters.category === cat.id;
                    return (
                      <button key={cat.id} onClick={() => handleCategoryClick(cat.id)} className="flex flex-col items-center gap-2 w-full">
                        <div className={`flex items-center justify-center transition-transform active:scale-95 mx-auto ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'opacity-90'}`}>
                           <img src={cat.image} alt={cat.label} className="w-[58px] h-[58px] object-contain drop-shadow-md" />
                        </div>
                        <span className={`text-[10px] font-semibold text-center leading-tight break-words w-full ${isActive ? 'text-primary-600' : 'text-gray-700'}`}>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Latest Added Properties */}
              <div className="mb-8">
                <div className="px-4 flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-gray-900">Latest Additions</h2>
                  <button className="text-xs font-semibold text-primary-600 flex items-center">See All <ChevronRight className="w-3 h-3 ml-0.5" /></button>
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
                  <div className="py-8 flex flex-col items-center justify-center text-center px-4">
                    <img src={noPropertiesImg} alt="No properties found" className="w-64 h-auto object-contain" />
                  </div>
                )}
              </div>

              {/* Top Rated Properties */}
              {properties.length > 5 && properties.slice(5, 10).filter(p => !filters.category || p.category === filters.category).length > 0 && (
                <div className="mb-4">
                  <div className="px-4 flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500 fill-amber-500"/> Top Verified</h2>
                    <button className="text-xs font-semibold text-primary-600 flex items-center">See All <ChevronRight className="w-3 h-3 ml-0.5" /></button>
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
              <div className="absolute top-[84px] left-4 bg-white rounded-full border border-gray-200 px-4 py-3 flex items-center gap-3 shadow-md w-[80vw] max-w-[350px]">
                <Search className="w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search location..." className="bg-transparent text-sm text-gray-900 w-full outline-none" />
              </div>
            </motion.div>
          )}

          {/* ── WISHLIST TAB ── */}
          {viewTab === 'wishlist' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Saved Properties</h1>
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
              <h1 className="text-xl font-bold text-gray-900 mb-2">My Schedule</h1>
              {visits.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {visits.map(v => (
                    <div key={v.id} className="bg-white shadow-sm border border-gray-200 rounded-xl p-4 flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-100 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] text-primary-600 font-bold uppercase">{new Date(v.visitDate).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-sm text-gray-900 font-bold">{new Date(v.visitDate).getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{v.property?.title || 'Unknown Property'}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Clock className="w-3 h-3"/> {v.visitTime}</p>
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
              <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>
              
              <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-4 flex items-center gap-4 mb-6">
                 <div className="w-14 h-14 rounded-full bg-primary-600 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                 </div>
                 <div className="flex-1">
                   <h2 className="text-gray-900 font-bold">{currentUser?.firstName} {currentUser?.lastName}</h2>
                   <p className="text-gray-500 text-xs">{currentUser?.email}</p>
                 </div>
                 <Button variant="ghost" size="xs">Edit</Button>
              </div>

              <div className="space-y-2 mb-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Account</h3>
                {['Profile Information', 'Saved Addresses', 'Payment Methods'].map(item => (
                  <button key={item} className="w-full p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-semibold text-gray-900">{item}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Preferences</h3>
                {['Notifications', 'Language & Region', 'Privacy & Security'].map(item => (
                  <button key={item} className="w-full p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-semibold text-gray-900">{item}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
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
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 w-80 bg-white border-l border-gray-200 z-[70] flex flex-col shadow-[[-10px_0_50px_rgba(0,0,0,0.1)]]">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
                <button onClick={() => setIsNotificationSidebarOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X className="w-4 h-4 text-gray-600"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length > 0 ? notifications.map(notif => (
                  <div key={notif.id} className={`p-4 rounded-xl border ${notif.isRead ? 'bg-gray-50 border-gray-100' : 'bg-primary-50 border-primary-100'}`}>
                    <h3 className="text-sm font-bold text-gray-900">{notif.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                    <span className="text-[10px] text-gray-400 mt-2 block">{new Date(notif.createdAt).toLocaleDateString()}</span>
                  </div>
                )) : (
                  <div className="text-center text-gray-500 py-8 text-sm">No new notifications</div>
                )}
              </div>
            </motion.div>
          </>
        )}

        {/* Chat History Sidebar */}
        {isChatSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[105]" onClick={() => setIsChatSidebarOpen(false)} />
            
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 w-80 bg-white border-l border-gray-200 z-[110] flex flex-col shadow-[-10px_0_50px_rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Chat History</h2>
                <button onClick={() => setIsChatSidebarOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X className="w-4 h-4 text-gray-600"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {conversations.length > 0 ? conversations.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => { selectConversation(c.id); setIsChatSidebarOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${selectedConvoId === c.id ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                  >
                    <h3 className="text-sm font-semibold truncate">{c.title}</h3>
                  </button>
                )) : (
                  <div className="text-center text-gray-500 py-8 text-sm">No chat history</div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CHAT MODAL ── */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed inset-0 z-[100] bg-gray-50 flex flex-col">
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex justify-between items-center shrink-0 pt-safe shadow-sm">
               <div>
                 <h2 className="text-gray-900 font-bold">AI Assistant</h2>
                 <p className="text-[10px] text-gray-500">Ask about any property or land record.</p>
               </div>
               <div className="flex items-center gap-2">
                 <Button variant="ghost" size="xs" onClick={() => createNewChat()}>New</Button>
                 <button onClick={() => setIsChatSidebarOpen(true)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 hover:bg-gray-200">
                   <Menu className="w-4 h-4 text-gray-600" />
                 </button>
                 <button onClick={() => setIsChatOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 hover:bg-gray-200">
                   <X className="w-4 h-4 text-gray-600" />
                 </button>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-sm font-semibold text-gray-900">Start a conversation</p>
                    <p className="text-xs text-gray-500 mt-1">Ask questions about land laws, prices, and more.</p>
                  </div>
               ) : (
                 messages.map(msg => (
                   <div key={msg.id} className={`flex ${msg.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.senderRole === 'USER' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 rounded-tl-sm border border-gray-200 shadow-sm'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                     </div>
                   </div>
                 ))
               )}
            </div>

            <div className="p-4 bg-white border-t border-gray-200 shrink-0 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex gap-2 mb-4">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Message AI..." className="bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 flex-1 !rounded-full px-4 py-2" />
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

      {/* ── FLOATING BOTTOM NAVIGATION BAR ── */}
      <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 w-max px-6 bg-white border border-gray-200 z-50 rounded-full shadow-[0_5px_30px_rgba(0,0,0,0.15)] transition-all duration-300 ${isNavVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <div className="flex items-center justify-center gap-6 h-[60px]">
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
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-primary-50' : ''}`}>
                    <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-[9px] font-semibold transition-colors mt-0.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
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

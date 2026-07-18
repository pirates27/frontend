import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import { VerificationBadge } from '../../components/shared/VerificationBadge';
import { Map } from '../../components/shared/Map';
import type { Property, PropertyVisit, AiConversation, AiMessage, Notification } from '../../models/property.models';

export const BuyerDashboard = () => {
  const navigate = useNavigate();

  // State
  const [viewTab, setViewTab] = useState<'explore' | 'saved' | 'visits' | 'chat' | 'notifications'>('explore');
  const [listMode, setListMode] = useState<'list' | 'map'>('list');

  const [properties, setProperties] = useState<Property[]>([]);
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [visits, setVisits] = useState<PropertyVisit[]>([]);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Signals/Derived
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(new Set());

  // Filter Form state
  const [filters, setFilters] = useState<{ state: string; district: string; category: any }>({ state: '', district: '', category: '' });

  // AI Chat states
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  const currentUser = authService.currentUser();

  useEffect(() => {
    loadData();
    loadBookmarks();
    loadVisits();
    loadNotifications();
  }, []);

  const setViewMode = (tab: 'explore' | 'saved' | 'visits' | 'chat' | 'notifications') => {
    setViewTab(tab);
    if (tab === 'saved') loadBookmarks();
    else if (tab === 'visits') loadVisits();
    else if (tab === 'chat') loadConversations();
    else if (tab === 'notifications') loadNotifications();
  };

  const loadData = async () => {
    try {
      const res = await propertyService.getProperties(filters);
      setProperties(res.filter(p => p.status === 'APPROVED'));
    } catch (e) {
      console.error(e);
    }
  };

  const loadBookmarks = async () => {
    try {
      const res = await propertyService.getSavedProperties();
      setSavedProperties(res);
      setBookmarkIds(new Set(res.map(p => p.id)));
    } catch (e) {
      console.error(e);
    }
  };

  const loadVisits = async () => {
    try {
      const res = await propertyService.getVisits();
      setVisits(res);
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

  const isBookmarked = (id: string) => bookmarkIds.has(id);

  const toggleBookmark = async (id: string) => {
    try {
      if (isBookmarked(id)) {
        await propertyService.unsaveProperty(id);
      } else {
        await propertyService.saveProperty(id);
      }
      loadBookmarks();
    } catch (e) {
      console.error(e);
    }
  };

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const resetFilters = () => {
    setFilters({ state: '', district: '', category: '' });
    loadData(); // Note: passing empty in actual implementation is needed if loadData uses stale state
  };

  const onMapMarkerClick = () => {
    // Navigate to property detail or open card
  };

  // AI Chat
  const loadConversations = async () => {
    try {
      const res = await propertyService.getAiConversations();
      setConversations(res);
      if (res.length > 0 && !selectedConvoId) {
        selectConversation(res[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectConversation = async (id: string) => {
    setSelectedConvoId(id);
    try {
      const res = await propertyService.getAiMessages(id);
      setMessages(res);
    } catch (e) {
      console.error(e);
    }
  };

  const createNewChat = async () => {
    const title = prompt('Enter chat topic:', 'Land Document Query');
    if (!title) return;
    try {
      const res = await propertyService.startAiConversation(title);
      loadConversations();
      selectConversation(res.id);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !selectedConvoId) return;
    const text = chatInput;
    setChatInput('');

    // Append user message mock optimistically
    const optimisticMsg: AiMessage = {
      id: Math.random().toString(),
      conversationId: selectedConvoId,
      senderRole: 'USER',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await propertyService.sendAiMessage(selectedConvoId, text);
      selectConversation(selectedConvoId);
    } catch (e) {
      console.error(e);
    }
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
            <span className="bg-emerald-800/40 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ml-2 hidden sm:inline-flex">Buyer Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">{currentUser?.firstName} {currentUser?.lastName}</p>
              <p className="text-xs text-slate-400">Buyer Account</p>
            </div>
            <button onClick={logout} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-lg transition border border-slate-700/50">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Body: Sidebar + Scrollable Content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Fixed Left Sidebar (Desktop only) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 shadow-sm overflow-y-auto">
          <div className="px-5 py-5 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Navigation</p>
            <p className="text-xs text-slate-600 font-medium">Buyer Portal</p>
          </div>
          <nav className="flex flex-col gap-1 p-3 flex-1">
            <button 
              onClick={() => setViewMode('explore')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-xs text-left ${viewTab === 'explore' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Explore Lands
            </button>
            <button 
              onClick={() => setViewMode('saved')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-xs text-left ${viewTab === 'saved' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              Saved Watchlist
            </button>
            <button 
              onClick={() => setViewMode('visits')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-xs text-left ${viewTab === 'visits' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              My Scheduled Visits
            </button>
            <button 
              onClick={() => setViewMode('chat')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-xs text-left ${viewTab === 'chat' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'}`}>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              AI Assistant Chat
            </button>
            <button 
              onClick={() => setViewMode('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all font-semibold text-xs text-left relative ${viewTab === 'notifications' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'}`}>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              Notifications
              {unreadNotificationsCount > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-amber-500 text-white font-bold rounded-full text-[10px]">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </nav>
          <div className="px-4 py-4 border-t border-slate-100">
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all font-semibold text-xs">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Scrollable Main Content Pane */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="px-6 py-6 space-y-6">

          {/* TAB 1: EXPLORE LANDS */}
          {viewTab === 'explore' && (
            <div className="space-y-6 flex flex-col h-full">
              
              {/* Filters Card */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4">
                <h2 className="text-base font-bold text-slate-800">Search Properties</h2>
                
                <form onSubmit={applyFilters} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">State</label>
                    <input type="text" value={filters.state} onChange={e => setFilters({...filters, state: e.target.value})} placeholder="Andhra Pradesh" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs" />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">District</label>
                    <input type="text" value={filters.district} onChange={e => setFilters({...filters, district: e.target.value})} placeholder="Guntur" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs" />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Category</label>
                    <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:border-emerald-500 text-xs">
                      <option value="">All Categories</option>
                      <option value="AGRICULTURAL">Agricultural Plot</option>
                      <option value="RESIDENTIAL">Residential Plot</option>
                      <option value="COMMERCIAL">Commercial space</option>
                      <option value="INDUSTRIAL">Industrial site</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <button type="submit" className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all">
                      Search
                    </button>
                    <button type="button" onClick={resetFilters} className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all">
                      Reset
                    </button>
                  </div>
                </form>
              </div>

              {/* View Toggle & Count */}
              <div className="flex justify-between items-center bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">{properties.length} properties matched</span>
                
                <div className="flex gap-1.5 bg-slate-100 p-0.5 rounded-lg">
                  <button 
                    onClick={() => setListMode('list')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all shadow-xs ${listMode === 'list' ? 'bg-white text-slate-800' : 'text-slate-500'}`}>
                    List
                  </button>
                  <button 
                    onClick={() => setListMode('map')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all shadow-xs ${listMode === 'map' ? 'bg-white text-slate-800' : 'text-slate-500'}`}>
                    Map View
                  </button>
                </div>
              </div>

              {/* LIST MODE */}
              {listMode === 'list' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition-all">
                      
                      <div className="p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <Link to={`/properties/${p.id}`} className="font-bold text-slate-800 truncate text-sm hover:text-emerald-600 transition-colors block">{p.title}</Link>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{p.village}, {p.district}</p>
                          </div>
                          <VerificationBadge status={p.status} />
                        </div>

                        <div className="flex justify-between text-[11px] text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                          <span><strong>Area:</strong> {p.area} ac</span>
                          <span><strong>Price:</strong> ₹{p.price.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 px-5 py-3 border-t border-slate-100/50 flex justify-between items-center">
                        <button onClick={() => toggleBookmark(p.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                          <svg className={`w-5 h-5 ${isBookmarked(p.id) ? 'fill-rose-500 text-rose-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                        <Link to={`/properties/${p.id}`} className="text-xs text-emerald-600 font-bold hover:underline">
                          View Details &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MAP MODE */}
              {listMode === 'map' && (
                <div className="h-[500px] w-full rounded-2xl overflow-hidden shadow-md">
                  <Map mode="view" properties={properties} onLocationSelected={onMapMarkerClick} />
                </div>
              )}

            </div>
          )}

          {/* TAB 2: SAVED WATCHLIST */}
          {viewTab === 'saved' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">Saved Property Watchlist</h2>
                <p className="text-xs text-slate-500 mt-1">Lands bookmarked for comparison, AI score tracking, and visits planning.</p>
              </div>

              {savedProperties.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedProperties.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden flex flex-col justify-between">
                      <div className="p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <Link to={`/properties/${p.id}`} className="font-bold text-slate-800 truncate text-sm hover:text-emerald-600 transition-colors block">{p.title}</Link>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{p.village}, {p.district}</p>
                          </div>
                          <VerificationBadge status={p.status} />
                        </div>
                        
                        <div className="flex justify-between text-[11px] text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                          <span><strong>Area:</strong> {p.area} ac</span>
                          <span><strong>Price:</strong> ₹{p.price.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 px-5 py-3 border-t border-slate-100/50 flex justify-between items-center">
                        <button onClick={() => toggleBookmark(p.id)} className="text-xs text-rose-500 font-semibold hover:underline">Remove</button>
                        <Link to={`/properties/${p.id}`} className="text-xs text-emerald-600 font-bold hover:underline">Explore Details &rarr;</Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 bg-white rounded-2xl shadow-xs border border-slate-100">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  <p className="text-xs text-slate-500">Your bookmark watchlist is empty.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VISITS */}
          {viewTab === 'visits' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">Your Guided Visits Registry</h2>
                <p className="text-xs text-slate-500 mt-1">Track status of scheduled tours on your bookmarked properties.</p>
              </div>

              {visits.length > 0 ? (
                <div className="space-y-4">
                  {visits.map(v => (
                    <div key={v.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
                      <div>
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
                        <p className="text-[10px] text-slate-400 mt-1">Property Reference ID: {v.propertyId}</p>
                      </div>
                      <Link to={`/properties/${v.propertyId}`} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition">
                        Inspect Land Profile
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 bg-white rounded-2xl shadow-xs border border-slate-100">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-xs text-slate-500">No scheduled visits on registry.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AI CHAT ASSISTANT */}
          {viewTab === 'chat' && (
            <div className="h-[600px] flex gap-4">
              
              {/* Conversations list (left) */}
              <div className="w-64 bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col justify-between shrink-0">
                <div className="space-y-4 flex-1 overflow-auto">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-xs">AI Chat threads</h3>
                    <button onClick={createNewChat} className="text-emerald-600 hover:text-emerald-500 text-xs font-bold flex items-center gap-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      New
                    </button>
                  </div>

                  <div className="space-y-2">
                    {conversations.map(convo => (
                      <button 
                        key={convo.id}
                        onClick={() => selectConversation(convo.id)}
                        className={`w-full text-left p-3 border rounded-xl text-xs font-medium transition truncate ${
                          selectedConvoId === convo.id 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                            : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700'
                        }`}>
                        {convo.title || 'Untitled Chat'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Messages view (right) */}
              <div className="flex-1 bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between overflow-hidden">
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md">AI</div>
                  <div>
                    <h4 className="text-xs font-bold">LandLens AI Verification Assistant</h4>
                    <p className="text-[10px] text-slate-400">Ask questions about land records, Patta passbooks or survey boundaries.</p>
                  </div>
                </div>

                {/* Message Window */}
                <div className="flex-1 p-6 overflow-auto space-y-4 bg-slate-50/50">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.senderRole === 'USER' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                        msg.senderRole === 'USER' 
                          ? 'bg-emerald-600 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {messages.length === 0 && (
                    <div className="text-center text-slate-400 py-12 text-xs">
                      Select a chat thread or click 'New' to consult LandLens AI about property records check.
                    </div>
                  )}
                </div>

                {/* Input bar */}
                <div className="p-4 border-t border-slate-100 flex gap-2">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask explaining Patta verification..." 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-hidden focus:border-emerald-500 text-xs" />
                  <button 
                    onClick={sendMessage}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition font-semibold text-xs">
                    Send
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: NOTIFICATIONS */}
          {viewTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">System Notifications</h2>
                <p className="text-xs text-slate-500 mt-1">Alerts regarding verification statuses, visits, and account activity.</p>
              </div>

              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map(notification => (
                    <div key={notification.id} className={`p-5 rounded-2xl border shadow-xs flex justify-between items-start gap-4 transition-all hover:opacity-100 ${
                      notification.isRead ? 'bg-white opacity-70 border-slate-100' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <div className="space-y-1 flex-1">
                        <h3 className="font-bold text-sm text-slate-800">{notification.title}</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">{notification.message}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date(notification.createdTime).toLocaleString()}</p>
                      </div>
                      
                      {!notification.isRead ? (
                        <button onClick={() => markNotificationRead(notification.id)} className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] rounded-lg transition">
                          Mark Read
                        </button>
                      ) : (
                        <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-12 bg-white rounded-2xl border border-slate-150 text-slate-400 text-xs">
                  You have no notifications.
                </div>
              )}
            </div>
          )}

          </div>{/* /px-6 wrapper */}
        </main>
      </div>

      {/* Mobile Navigation Bar (Bottom Nav) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-end justify-around h-16">

          <button onClick={() => setViewMode('explore')} className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative group">
            <div className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-2xl transition-all ${viewTab === 'explore' ? 'bg-emerald-100' : ''}`}>
              <svg className={`w-5 h-5 transition-colors ${viewTab === 'explore' ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span className={`text-[9px] font-medium mt-0.5 transition-colors ${viewTab === 'explore' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>Explore</span>
            </div>
          </button>

          <button onClick={() => setViewMode('saved')} className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative group">
            <div className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-2xl transition-all ${viewTab === 'saved' ? 'bg-emerald-100' : ''}`}>
              <svg className={`w-5 h-5 transition-colors ${viewTab === 'saved' ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              <span className={`text-[9px] font-medium mt-0.5 transition-colors ${viewTab === 'saved' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>Watchlist</span>
            </div>
          </button>

          <button onClick={() => setViewMode('visits')} className="flex flex-col items-center justify-center flex-1 h-full">
            <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all -mt-4 shadow-md ${viewTab === 'visits' ? 'bg-emerald-600 shadow-lg' : 'bg-slate-100'}`}>
              <svg className={`w-6 h-6 transition-colors ${viewTab === 'visits' ? 'text-white' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className={`text-[8px] mt-0.5 transition-colors ${viewTab === 'visits' ? 'text-white font-bold' : 'text-slate-500 font-bold'}`}>Visits</span>
            </div>
          </button>

          <button onClick={() => setViewMode('chat')} className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative group">
            <div className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-2xl transition-all ${viewTab === 'chat' ? 'bg-emerald-100' : ''}`}>
              <svg className={`w-5 h-5 transition-colors ${viewTab === 'chat' ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <span className={`text-[9px] font-medium mt-0.5 transition-colors ${viewTab === 'chat' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>AI Chat</span>
            </div>
          </button>

          <button onClick={() => setViewMode('notifications')} className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative group">
            <div className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-2xl transition-all relative ${viewTab === 'notifications' ? 'bg-emerald-100' : ''}`}>
              <svg className={`w-5 h-5 transition-colors ${viewTab === 'notifications' ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className={`text-[9px] font-medium mt-0.5 transition-colors ${viewTab === 'notifications' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>Alerts</span>
              {unreadNotificationsCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white"></span>}
            </div>
          </button>

        </div>
      </nav>

    </div>
  );
};

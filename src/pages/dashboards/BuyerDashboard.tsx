import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Filter, Eye } from 'lucide-react';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import { VerificationBadge } from '../../components/shared/VerificationBadge';
import type { Property } from '../../models/property.models';

export const BuyerDashboard = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const data = await propertyService.getAllProperties();
      setProperties(data.filter(p => p.status === 'APPROVED')); // Buyers mostly see approved
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  const filteredProperties = properties.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.village.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">Land<span className="text-brand-500">Lens</span></span>
            <span className="text-[10px] uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">Buyer</span>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Explore Verified Lands</h1>
          <p className="text-sm text-slate-500 mt-1">Discover AI-verified properties securely.</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by title or village..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-hidden focus:border-brand-500"
            />
          </div>
          <button className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MapPin className="w-12 h-12 mb-4 text-slate-300" />
            <p>No properties found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(property => (
              <div key={property.id} className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                <div className="h-48 bg-slate-200 relative overflow-hidden">
                  <img src="https://i.ibb.co/ccmGDYJT/5ea71be8-b3a8-4cc7-84c6-ec15a7d6b37d.jpg" alt="Land" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3">
                    <VerificationBadge status={property.status} />
                  </div>
                  <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                    ₹{property.price.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1">{property.title}</h3>
                  <div className="flex items-center text-xs text-slate-500 gap-1.5 mb-4">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{property.village}, {property.district}</span>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-600">{property.area} Acres</div>
                    <button 
                      onClick={() => navigate(`/property/${property.id}`)}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

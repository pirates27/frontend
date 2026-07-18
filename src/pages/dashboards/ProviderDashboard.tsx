import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import { VerificationBadge } from '../../components/shared/VerificationBadge';
import type { Property } from '../../models/property.models';

export const ProviderDashboard = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyProperties();
  }, []);

  const loadMyProperties = async () => {
    try {
      const data = await propertyService.getProviderProperties();
      setProperties(data);
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">Land<span className="text-brand-500">Lens</span></span>
            <span className="text-[10px] uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">Provider</span>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Property Listings</h1>
            <p className="text-sm text-slate-500 mt-1">Manage and track your listed properties.</p>
          </div>
          <button className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Property
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-12 text-center">
            <p className="text-slate-500 mb-4">You haven't listed any properties yet.</p>
            <button className="text-brand-600 font-bold text-sm hover:underline">List your first property</button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                    <th className="px-6 py-4">Title / Code</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {properties.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 text-sm">{p.title}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{p.propertyCode}</p>
                      </td>
                      <td className="px-6 py-4">
                        <VerificationBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 text-sm">
                        ₹{p.price.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => navigate(`/property/${p.id}`)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors bg-white rounded-lg border border-slate-200 shadow-xs">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-white rounded-lg border border-slate-200 shadow-xs">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-rose-600 transition-colors bg-white rounded-lg border border-slate-200 shadow-xs">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

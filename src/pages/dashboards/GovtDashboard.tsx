import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, XSquare, Eye, ShieldAlert } from 'lucide-react';
import { propertyService } from '../../services/property.service';
import { authService } from '../../services/auth.service';
import { VerificationBadge } from '../../components/shared/VerificationBadge';
import type { Property } from '../../models/property.models';

export const GovtDashboard = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingProperties();
  }, []);

  const loadPendingProperties = async () => {
    try {
      const data = await propertyService.getAllProperties();
      // Govt sees everything but mainly PENDING_GOVT
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

  const pendingCount = properties.filter(p => p.status === 'PENDING_GOVT').length;
  const disputedCount = properties.filter(p => p.status === 'DISPUTED').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-slate-900 text-white shadow-md border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">Land<span className="text-brand-500">Lens</span></span>
            <span className="text-[10px] uppercase tracking-wider bg-blue-600 px-2 py-0.5 rounded-full text-white font-bold">Govt Officer</span>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Verification Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Review AI-processed lands and approve listings.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between border-l-4 border-l-blue-500">
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Pending Review</p>
              <p className="text-2xl font-extrabold text-slate-800">{pendingCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between border-l-4 border-l-rose-500">
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Active Disputes</p>
              <p className="text-2xl font-extrabold text-slate-800">{disputedCount}</p>
            </div>
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-12 text-center text-slate-500">
            Queue is empty.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                    <th className="px-6 py-4">Title / Code</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Village</th>
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
                        {p.village}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => navigate(`/property/${p.id}`)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-white rounded-lg border border-slate-200 shadow-xs">
                            <Eye className="w-4 h-4" />
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

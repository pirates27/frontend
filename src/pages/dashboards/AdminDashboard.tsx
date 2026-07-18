import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Settings, Shield } from 'lucide-react';
import { authService } from '../../services/auth.service';

export const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-slate-900 text-white shadow-md border-b-4 border-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">Land<span className="text-brand-500">Lens</span></span>
            <span className="text-[10px] uppercase tracking-wider bg-purple-600 px-2 py-0.5 rounded-full text-white font-bold">Admin Portal</span>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">System Administration</h1>
          <p className="text-sm text-slate-500 mt-1">Manage users, AI model configurations, and system health.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex items-center justify-between border-l-4 border-l-purple-500 hover:shadow-md transition-shadow cursor-pointer">
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Total Users</p>
              <p className="text-2xl font-extrabold text-slate-800">1,248</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-500">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow cursor-pointer">
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Listings</p>
              <p className="text-2xl font-extrabold text-slate-800">3,042</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex items-center justify-between border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer">
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">AI Health</p>
              <p className="text-2xl font-extrabold text-slate-800">100%</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
              <Shield className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between border-l-4 border-l-amber-500 hover:shadow-md transition-shadow cursor-pointer">
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">System</p>
              <p className="text-2xl font-extrabold text-slate-800">Settings</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
              <Settings className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-12 text-center text-slate-500">
          Admin metrics and logs will appear here.
        </div>
      </div>
    </div>
  );
};

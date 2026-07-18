import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { authService } from '../../services/auth.service';

export const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'BUYER',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await authService.register(formData);
      setSuccessMsg('Account registered successfully! Redirecting to login page...');
      setTimeout(() => navigate('/auth/login'), 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to register account. Email might be in use.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl"></div>

      <img src="https://i.ibb.co/0yYZhMN0/f013f5e9-2f96-4f07-8dae-5d60087d250e.jpg" alt="Land aerial view" className="absolute bottom-0 left-0 w-40 sm:w-[32rem] object-contain pointer-events-none z-0" style={{ WebkitMaskImage: 'linear-gradient(to top right, black 60%, transparent 100%)', maskImage: 'linear-gradient(to top right, black 60%, transparent 100%)' }} />
      <img src="https://i.ibb.co/ccmGDYJT/5ea71be8-b3a8-4cc7-84c6-ec15a7d6b37d.jpg" alt="Land scenery" className="absolute top-0 right-0 w-40 sm:w-[32rem] object-contain pointer-events-none z-0" style={{ WebkitMaskImage: 'linear-gradient(to bottom left, black 60%, transparent 100%)', maskImage: 'linear-gradient(to bottom left, black 60%, transparent 100%)' }} />

      <div className="w-full max-w-lg p-8 glass-card-dark rounded-2xl shadow-2xl relative z-10 animate-slide-up border border-slate-800/60">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-2xl font-bold tracking-tight text-white">Land<span className="text-brand-500">Lens</span></span>
          </div>
          <p className="text-slate-400 text-sm">Join a trusted platform for verified property listings</p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl flex items-start gap-2.5">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="firstName">First Name</label>
              <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleChange} required className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm" placeholder="Prasad" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="lastName">Last Name</label>
              <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleChange} required className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm" placeholder="Builder" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="email">Email Address</label>
            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm" placeholder="name@domain.com" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="phoneNumber">Phone Number</label>
              <input id="phoneNumber" name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handleChange} required className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm" placeholder="9876543210" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="role">Register As</label>
              <select id="role" name="role" value={formData.role} onChange={handleChange} className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 px-4 text-white focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm appearance-none">
                <option value="BUYER">Buyer (Explore Lands)</option>
                <option value="PROVIDER">Provider (Sell/List Lands)</option>
                <option value="GOVERNMENT_OFFICER">Government Officer (Inspector)</option>
                <option value="ADMIN">Admin (System Administrator)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required minLength={6} className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm" placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} className="w-full mt-2 py-3 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-sm flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
          <span>Already have an account? </span>
          <Link to="/auth/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

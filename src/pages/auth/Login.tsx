import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '../../services/auth.service';
import slashVideo from '../../assets/slash.mp4';
import mobSplashVideo from '../../assets/mob-spals.mp4';

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoFinished, setVideoFinished] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await authService.login({ email, password });
      
      // Load profile after login to get the exact role details if needed
      await authService.getProfile();
      
      switch (res.role) {
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'GOVERNMENT_OFFICER':
          navigate('/officer');
          break;
        case 'PROVIDER':
          navigate('/provider');
          break;
        case 'BUYER':
        default:
          navigate('/buyer');
          break;
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl animate-pulse md:hidden"></div>
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl md:hidden"></div>

      {/* Desktop Background Video */}
      <video 
        src={slashVideo}
        autoPlay
        muted
        playsInline
        onEnded={() => setVideoFinished(true)}
        className={`hidden md:block absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000 ${videoFinished ? 'opacity-0' : 'opacity-100'}`}
      />

      {/* Mobile Background Video */}
      <video 
        src={mobSplashVideo}
        autoPlay
        muted
        playsInline
        onEnded={() => setVideoFinished(true)}
        className={`block md:hidden absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000 ${videoFinished ? 'opacity-0' : 'opacity-100'}`}
      />

      {/* Decorative Images */}
      <img 
        src="https://i.ibb.co/0yYZhMN0/f013f5e9-2f96-4f07-8dae-5d60087d250e.jpg"
        alt="Land aerial view"
        className={`absolute bottom-0 left-0 w-40 sm:w-[32rem] object-contain pointer-events-none z-0 transition-opacity duration-1000 ${videoFinished ? 'opacity-100' : 'opacity-0'}`}
        style={{ WebkitMaskImage: 'linear-gradient(to top right, black 60%, transparent 100%)', maskImage: 'linear-gradient(to top right, black 60%, transparent 100%)' }}
      />
      <img 
        src="https://i.ibb.co/ccmGDYJT/5ea71be8-b3a8-4cc7-84c6-ec15a7d6b37d.jpg"
        alt="Land scenery"
        className={`absolute top-0 right-0 w-40 sm:w-[32rem] object-contain pointer-events-none z-0 transition-opacity duration-1000 ${videoFinished ? 'opacity-100' : 'opacity-0'}`}
        style={{ WebkitMaskImage: 'linear-gradient(to bottom left, black 60%, transparent 100%)', maskImage: 'linear-gradient(to bottom left, black 60%, transparent 100%)' }}
      />

      {/* Glass Login Card */}
      <div className={`w-full max-w-md p-8 glass-card-dark rounded-2xl shadow-2xl relative z-10 border border-slate-800/60 transition-all duration-1000 delay-300 ${videoFinished ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
        
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-2xl font-bold tracking-tight text-white">Land<span className="text-brand-500">Lens</span></span>
          </div>
          <p className="text-slate-400 text-sm">AI-Powered Government Land Verification Portal</p>
        </div>

        {/* Alert messages */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email Input */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="email">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail className="w-5 h-5" />
              </span>
              <input 
                id="email"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                placeholder="you@domain.com" />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="password">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="w-5 h-5" />
              </span>
              <input 
                id="password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm"
                placeholder="••••••••" />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={!email || !password || loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-sm flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Form Footer */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <span>Don't have an account? </span>
          <Link to="/auth/register" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">Create account</Link>
        </div>

      </div>
    </div>
  );
};

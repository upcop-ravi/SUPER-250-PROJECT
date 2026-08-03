import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Lock, Mail, Scale, ArrowLeft } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const inputUser = email.trim();

    // Check for SuperAdmin credentials
    if ((inputUser === 'SuperAdmin' || inputUser.toLowerCase() === 'superadmin' || inputUser.toLowerCase() === 'superadmin@advocategunjanyadav.legal' || inputUser.toLowerCase() === 'superadmin@advocategunjanyadav.in') && password === '$uper@dmin') {
      const customSession = {
        user: { id: 'super-admin-01', email: 'SuperAdmin' },
        access_token: 'superadmin-local-access-token'
      };
      localStorage.setItem('admin_custom_session', JSON.stringify(customSession));
      onLoginSuccess(customSession);
      setLoading(false);
      return;
    }

    try {
      const loginEmail = inputUser.includes('@') ? inputUser : `${inputUser}@advocategunjanyadav.legal`;
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials' ? 'Invalid Admin User ID or Password.' : authError.message);
      } else if (data.session) {
        onLoginSuccess(data.session);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#031712] px-4 sm:px-6 lg:px-8">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#072C22] via-[#031712] to-[#010806] opacity-80 pointer-events-none"></div>

      <div className="max-w-md w-full space-y-6 bg-[#072C22]/40 backdrop-blur-xl border border-gold-500/20 p-8 rounded-2xl shadow-2xl relative">
        
        {/* Navigation back to homepage */}
        <div className="flex justify-between items-center border-b border-gold-500/10 pb-4">
          <a
            href="../index.html"
            className="inline-flex items-center text-xs font-semibold text-stone-400 hover:text-gold-400 transition-colors font-sans gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Website Home
          </a>
          <span className="text-[10px] text-gold-500/70 uppercase tracking-widest font-mono">Portal Console</span>
        </div>

        <div className="text-center pt-2">
          <div className="mx-auto h-16 w-16 bg-gold-500/10 border border-gold-400/30 rounded-full flex items-center justify-center animate-pulse">
            <Scale className="h-8 w-8 text-gold-400" />
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white font-serif">
            Adv. Gunjan Yadav
          </h2>
          <p className="mt-2 text-sm text-stone-400 font-sans">
            &amp; Legal — Admin Portal
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm text-center font-sans">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gold-400 uppercase tracking-wider mb-2 font-sans">
                Admin User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-stone-500" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 border border-stone-800 bg-[#031712]/60 placeholder-stone-650 text-white focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-sm font-sans"
                  placeholder="SuperAdmin"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gold-400 uppercase tracking-wider mb-2 font-sans">
                Secure Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-stone-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 border border-stone-800 bg-[#031712]/60 placeholder-stone-650 text-white focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-sm font-sans"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-gold-500/40 text-sm font-semibold rounded-xl text-[#031712] bg-gold-400 hover:bg-gold-500 hover:shadow-[0_0_20px_rgba(197,160,89,0.3)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 font-sans"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#031712]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Shield className="mr-2 h-4 w-4" /> Sign In securely
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

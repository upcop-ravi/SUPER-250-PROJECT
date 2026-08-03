import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SEOManager from './components/SEOManager';
import PageManager from './components/PageManager';
import TeamManager from './components/TeamManager';
import ChangePassword from './components/ChangePassword';
import {
  Scale,
  LogOut,
  LayoutDashboard,
  Settings,
  Menu,
  X,
  UserCheck,
  FileText,
  Users,
  KeyRound
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [currentTab, setCurrentTab] = useState('security'); // Default or active tab
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved local SuperAdmin session first
    const localSession = localStorage.getItem('admin_custom_session');
    if (localSession) {
      try {
        setSession(JSON.parse(localSession));
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('admin_custom_session');
      }
    }

    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSession(session);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('admin_custom_session');
    setSession(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log('Signed out locally');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#031712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-400"></div>
          <span className="text-stone-300 font-sans text-sm tracking-wider">Loading System Console...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show the login portal
  if (!session) {
    return <Login onLoginSuccess={(sess) => setSession(sess)} />;
  }

  return (
    <div className="min-h-screen bg-[#031712] flex flex-col md:flex-row text-stone-100 font-sans">
      
      {/* Mobile Top Header */}
      <header className="md:hidden bg-[#072C22] border-b border-gold-500/10 px-4 py-3 flex justify-between items-center z-25">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gold-500/10 border border-gold-400/20 rounded-full flex items-center justify-center">
            <Scale className="h-4 w-4 text-gold-400" />
          </div>
          <span className="font-serif font-bold text-white text-md">Adv. Gunjan Yadav</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-stone-300 hover:text-white p-1"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        w-64 bg-[#072C22]/80 backdrop-blur-xl md:bg-[#072C22]/30 border-r border-gold-500/10 p-6 flex flex-col justify-between z-20 h-full min-h-screen
      `}>
        <div className="space-y-8">
          {/* Logo Brand */}
          <div className="hidden md:flex items-center gap-3">
            <div className="h-10 w-10 bg-gold-500/10 border border-gold-400/30 rounded-full flex items-center justify-center">
              <Scale className="h-5 w-5 text-gold-400" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-white text-sm">Adv. Gunjan Yadav</h2>
              <p className="text-[10px] text-stone-400 font-sans uppercase tracking-wider mt-0.5">Legal Console</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <button
              onClick={() => {
                setCurrentTab('security');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                currentTab === 'security'
                  ? 'bg-gold-500 text-[#031712] shadow-md font-bold'
                  : 'text-stone-300 hover:bg-gold-500/10 hover:text-white border border-transparent hover:border-gold-500/10'
              }`}
            >
              <KeyRound className="h-4 w-4" />
              Security &amp; Password
            </button>

            <button
              onClick={() => {
                setCurrentTab('team');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                currentTab === 'team'
                  ? 'bg-gold-500 text-[#031712] shadow-md font-bold'
                  : 'text-stone-300 hover:bg-gold-500/10 hover:text-white border border-transparent hover:border-gold-500/10'
              }`}
            >
              <Users className="h-4 w-4" />
              Team Members Control
            </button>

            <button
              onClick={() => {
                setCurrentTab('pagemanager');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                currentTab === 'pagemanager'
                  ? 'bg-gold-500 text-[#031712] shadow-md font-bold'
                  : 'text-stone-300 hover:bg-gold-500/10 hover:text-white border border-transparent hover:border-gold-500/10'
              }`}
            >
              <FileText className="h-4 w-4" />
              Dynamic Page Manager
            </button>

            <button
              onClick={() => {
                setCurrentTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                currentTab === 'dashboard'
                  ? 'bg-gold-500 text-[#031712] shadow-md font-bold'
                  : 'text-stone-300 hover:bg-gold-500/10 hover:text-white border border-transparent hover:border-gold-500/10'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Telemetry Analytics
            </button>

            <button
              onClick={() => {
                setCurrentTab('seo');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                currentTab === 'seo'
                  ? 'bg-gold-500 text-[#031712] shadow-md font-bold'
                  : 'text-stone-300 hover:bg-gold-500/10 hover:text-white border border-transparent hover:border-gold-500/10'
              }`}
            >
              <Settings className="h-4 w-4" />
              SEO &amp; Schema Meta
            </button>
          </nav>
        </div>

        {/* User Footer Profile & Logout */}
        <div className="space-y-4 border-t border-gold-500/10 pt-4 mt-6">
          <div className="flex items-center gap-2.5 px-2">
            <div className="h-8 w-8 bg-[#115243]/30 border border-gold-500/20 rounded-full flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-gold-400" />
            </div>
            <div className="truncate max-w-[150px]">
              <p className="text-xs font-bold text-white leading-none">Console Administrator</p>
              <p className="text-[10px] text-stone-400 mt-1 truncate" title={session.user.email}>{session.user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out Securely
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow overflow-x-hidden">
        {currentTab === 'security' ? (
          <ChangePassword session={session} />
        ) : currentTab === 'team' ? (
          <TeamManager session={session} />
        ) : currentTab === 'pagemanager' ? (
          <PageManager session={session} />
        ) : currentTab === 'dashboard' ? (
          <Dashboard session={session} />
        ) : (
          <SEOManager session={session} />
        )}
      </main>

    </div>
  );
}

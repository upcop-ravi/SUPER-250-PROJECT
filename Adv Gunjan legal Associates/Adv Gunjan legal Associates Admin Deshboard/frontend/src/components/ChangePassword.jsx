import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  AlertCircle,
  RefreshCw,
  Lock,
  RotateCcw
} from 'lucide-react';

export default function ChangePassword({ session }) {
  // Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility Toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status & Feedback States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // --- PASSWORD REQUIREMENT CHECKS ---
  const requirements = [
    { label: 'Minimum 8 characters long', valid: newPassword.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { label: 'At least one numeric digit (0-9)', valid: /[0-9]/.test(newPassword) },
    { label: 'At least one special character (!, @, #, $, %, etc.)', valid: /[^a-zA-Z0-9]/.test(newPassword) }
  ];

  // Calculate Strength Rating
  const validCount = requirements.filter(r => r.valid).length;
  
  const getStrengthLabel = () => {
    if (!newPassword) return { label: 'None', color: 'bg-stone-700', textColor: 'text-stone-500', percent: 0 };
    if (validCount <= 2) return { label: 'Weak', color: 'bg-red-500', textColor: 'text-red-400', percent: 25 };
    if (validCount <= 4) return { label: 'Medium', color: 'bg-amber-500', textColor: 'text-amber-400', percent: 65 };
    return { label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400', percent: 100 };
  };

  const strength = getStrengthLabel();

  // Reset form fields
  const handleResetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  // Submit Password Change
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Pre-flight Client Validation
    if (!currentPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }
    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setErrorMsg('New password cannot be the same as your current password.');
      return;
    }
    if (validCount < 5) {
      setErrorMsg('Please ensure your new password satisfies all security requirements.');
      return;
    }

    setLoading(true);

    try {
      const token = session?.access_token || localStorage.getItem('admin_custom_session_token') || 'superadmin-local-access-token';

      const response = await fetch(`${backendUrl}/api/admin/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setSuccessMsg(data.message || 'Password changed successfully!');
      handleResetForm();
    } catch (err) {
      console.error('Change password error:', err);
      setErrorMsg(err.message || 'Server error occurred while updating password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#072C22] via-[#0B3B2E] to-[#031712] p-6 md:p-8 rounded-2xl border border-gold-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-12 w-12 bg-gold-500/10 border border-gold-400/30 rounded-2xl flex items-center justify-center shadow-inner">
            <ShieldCheck className="h-6 w-6 text-gold-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-white tracking-tight">Security &amp; Change Password</h1>
            <p className="text-stone-300 text-xs md:text-sm font-sans mt-0.5">
              Update your administrator credentials. All requests are protected by rate limiting and bcrypt hashing.
            </p>
          </div>
        </div>
      </div>

      {/* Main Password Change Form Card */}
      <div className="bg-[#072C22]/30 border border-gold-500/15 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
        
        {/* Alert Notifications */}
        {errorMsg && (
          <div className="flex items-start gap-3 p-4 bg-red-950/80 border border-red-500/40 rounded-xl text-red-200 text-sm animate-fade-in">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-3 p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-200 text-sm animate-fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Password Successfully Changed!</span>
              <span className="text-xs text-emerald-300/80 leading-relaxed block">{successMsg}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Field 1: Current Password */}
          <div className="space-y-2">
            <label className="block text-stone-200 text-xs font-bold uppercase tracking-wider">
              Current Password *
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                placeholder="Enter your current active password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[#031712] border border-gold-500/20 rounded-xl pl-4 pr-12 py-3 text-sm text-stone-100 placeholder-stone-500 focus:border-gold-400 focus:outline-none transition shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-3.5 text-stone-400 hover:text-gold-400 transition"
                title={showCurrent ? 'Hide Password' : 'Show Password'}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Field 2: New Password */}
            <div className="space-y-2">
              <label className="block text-stone-200 text-xs font-bold uppercase tracking-wider">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  placeholder="Enter strong new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#031712] border border-gold-500/20 rounded-xl pl-4 pr-12 py-3 text-sm text-stone-100 placeholder-stone-500 focus:border-gold-400 focus:outline-none transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-3.5 text-stone-400 hover:text-gold-400 transition"
                  title={showNew ? 'Hide Password' : 'Show Password'}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Field 3: Confirm New Password */}
            <div className="space-y-2">
              <label className="block text-stone-200 text-xs font-bold uppercase tracking-wider">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full bg-[#031712] border rounded-xl pl-4 pr-12 py-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none transition shadow-inner ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-gold-500/20 focus:border-gold-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3.5 text-stone-400 hover:text-gold-400 transition"
                  title={showConfirm ? 'Hide Password' : 'Show Password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-red-400 text-[11px] font-medium">Passwords do not match.</p>
              )}
            </div>
          </div>

          {/* Real-Time Password Strength Meter */}
          {newPassword && (
            <div className="space-y-2 bg-[#031712]/60 p-4 rounded-xl border border-gold-500/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400 font-bold uppercase tracking-wider">Password Strength:</span>
                <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
              </div>
              <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${strength.percent}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Password Complexity Visual Checklist */}
          <div className="bg-[#031712]/40 border border-gold-500/10 p-4 md:p-5 rounded-xl space-y-3">
            <h4 className="text-stone-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-gold-400" />
              Password Security Checklist
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {requirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  {req.valid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-stone-600 flex-shrink-0" />
                  )}
                  <span className={req.valid ? 'text-emerald-300 font-medium' : 'text-stone-400'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-gold-500/10 pt-6">
            <button
              type="button"
              onClick={handleResetForm}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-stone-600 text-stone-300 font-bold text-xs uppercase tracking-wider hover:bg-white/5 transition"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Form
            </button>

            <button
              type="submit"
              disabled={loading || validCount < 5 || (confirmPassword && confirmPassword !== newPassword)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 bg-gradient-to-r from-gold-500 to-amber-500 text-[#031712] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:from-gold-400 hover:to-amber-400 disabled:opacity-40 transition-all transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Updating Credentials...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" /> Update Password
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}

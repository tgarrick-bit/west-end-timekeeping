'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setInterval(() => setResendCooldown(p => Math.max(0, p - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [resendCooldown]);

  useEffect(() => {
    const s = localStorage.getItem('passwordResetAttempts');
    if (s) { const a = JSON.parse(s); if (Date.now() - (a.timestamp || 0) > 3600000) localStorage.removeItem('passwordResetAttempts'); else setAttemptCount(a.count || 0); }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address'); return; }
    if (attemptCount >= 5) { setError('Too many attempts. Contact your administrator.'); return; }
    setLoading(true);
    try {
      const { data: emp } = await supabase.from('employees').select('email, is_active').eq('email', email.toLowerCase().trim()).single();
      if (!emp) { setSubmitted(true); setResendCooldown(60); }
      else if (!emp.is_active) { setError('Account inactive. Contact your administrator.'); setLoading(false); return; }
      else {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), { redirectTo: `${window.location.origin}/auth/reset-password` });
        if (e) { setError(e.message.includes('rate limit') ? 'Too many requests. Wait a few minutes.' : 'Failed to send reset email.'); if (e.message.includes('rate limit')) setResendCooldown(180); }
        else { setSubmitted(true); setResendCooldown(60); const n = attemptCount + 1; setAttemptCount(n); localStorage.setItem('passwordResetAttempts', JSON.stringify({ count: n, timestamp: Date.now() })); }
      }
    } catch { setError('An unexpected error occurred.'); }
    finally { setLoading(false); }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(227, 28, 121, 0.06) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'rgba(211, 173, 107, 0.03)', filter: 'blur(80px)' }} />
      <div className="relative w-full max-w-sm mx-4">
        <div className="rounded-2xl p-10" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(229, 221, 216, 0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          {children}
        </div>
        <p className="text-center text-xs mt-6" style={{ color: '#6b6360' }}>W|E Always Find a Way.</p>
      </div>
    </div>
  );

  const GlassBtn = ({ children, onClick, disabled, type = 'button' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }) => (
    <button type={type} onClick={onClick} disabled={disabled}
      className="w-full py-3 px-5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: 'rgba(229, 221, 216, 0.08)', border: '1px solid rgba(229, 221, 216, 0.12)' }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = 'rgba(229, 221, 216, 0.12)'; e.currentTarget.style.borderColor = 'rgba(229, 221, 216, 0.2)'; }}}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(229, 221, 216, 0.08)'; e.currentTarget.style.borderColor = 'rgba(229, 221, 216, 0.12)'; }}>
      {children}
    </button>
  );

  if (submitted) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mb-6"><path d="M5 13l4 4L19 7" stroke="#d3ad6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <h2 className="text-lg font-semibold text-white mb-2">Check Your Email</h2>
          <p className="text-xs mb-5" style={{ color: '#6b6360' }}>If an account exists, reset instructions were sent to:</p>
          <div className="w-full px-4 py-3 rounded-xl mb-6" style={{ background: 'rgba(229, 221, 216, 0.04)', border: '1px solid rgba(229, 221, 216, 0.06)' }}>
            <p className="font-mono text-xs text-white break-all">{email}</p>
          </div>
          <div className="w-full space-y-2.5">
            <GlassBtn onClick={() => { if (resendCooldown <= 0) { setSubmitted(false); handleSubmit(new Event('submit') as any); }}} disabled={resendCooldown > 0}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
            </GlassBtn>
            <GlassBtn onClick={() => { setSubmitted(false); setEmail(''); setError(null); }}>Try Another Email</GlassBtn>
            <GlassBtn onClick={() => router.push('/auth/login')}>Back to Login</GlassBtn>
          </div>
          <p className="text-[10px] mt-5" style={{ color: '#4a4340' }}>
            Need help? <a href="mailto:support@westendworkforce.com" className="underline" style={{ color: '#6b6360' }}>support@westendworkforce.com</a>
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col items-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mb-4">
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="#6b6360" strokeWidth="1.5" />
          <path d="M7 11V7a5 5 0 0110 0v4" stroke="#6b6360" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <h2 className="text-lg font-semibold text-white mb-1">Reset Password</h2>
        <p className="text-xs mb-6" style={{ color: '#6b6360' }}>Enter your email to receive instructions</p>
      </div>
      <div className="w-full h-px mb-6" style={{ background: 'rgba(229, 221, 216, 0.08)' }} />

      {error && (
        <div className="px-4 py-3 rounded-xl text-xs mb-5" style={{ background: 'rgba(227, 28, 121, 0.06)', border: '1px solid rgba(227, 28, 121, 0.12)', color: '#e31c79' }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} className="w-full space-y-5">
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#6b6360' }}>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} autoFocus
            placeholder="you@westendworkforce.com"
            className="w-full py-3 px-4 rounded-xl text-sm text-white placeholder-[#4a4340] outline-none transition-all duration-200 disabled:opacity-50"
            style={{ background: 'rgba(229, 221, 216, 0.04)', border: '1px solid rgba(229, 221, 216, 0.08)' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(229, 221, 216, 0.16)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(229, 221, 216, 0.08)'; }}
          />
        </div>
        <div className="space-y-2.5">
          <GlassBtn type="submit" disabled={loading || attemptCount >= 5}>
            {loading ? 'Sending...' : attemptCount >= 5 ? 'Too Many Attempts' : 'Send Reset Instructions'}
          </GlassBtn>
          <GlassBtn onClick={() => router.push('/auth/login')}>Back to Login</GlassBtn>
        </div>
      </form>

      {attemptCount > 0 && attemptCount < 5 && (
        <p className="text-center text-[10px] mt-4" style={{ color: '#4a4340' }}>Attempts: {attemptCount}/5</p>
      )}
    </Shell>
  );
}

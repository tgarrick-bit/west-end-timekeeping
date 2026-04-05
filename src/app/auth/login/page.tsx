'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

type UserRole = 'admin' | 'manager' | 'employee';

interface Employee {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  first_name?: string;
  last_name?: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  const redirectBasedOnRole = (role: UserRole) => {
    if (typeof window !== 'undefined') localStorage.setItem('userRole', role);
    switch (role.toLowerCase()) {
      case 'admin': router.push('/admin'); break;
      case 'manager': router.push('/manager'); break;
      default: router.push('/employee'); break;
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: employee, error: err } = await supabase
            .from('employees')
            .select('id, email, role, is_active, first_name, last_name')
            .eq('id', session.user.id)
            .single();
          if (!err && employee && employee.is_active) {
            redirectBasedOnRole(employee.role as UserRole);
          } else {
            await supabase.auth.signOut();
          }
        }
      } catch (err) { console.error('Session check error:', err); }
    };
    checkSession();
  }, [supabase, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter both email and password'); return; }
    if (cooldown > 0) { setError(`Please wait ${cooldown} seconds`); return; }
    setError(null);
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password
      });
      if (authError) {
        if (authError.message?.toLowerCase().includes('rate limit') || authError.message?.toLowerCase().includes('too many')) {
          setError('Too many attempts. Please wait.'); setCooldown(60);
        } else if (authError.message?.toLowerCase().includes('invalid')) {
          setError('Invalid email or password.');
        } else {
          setError(authError.message || 'Authentication failed.');
        }
        setLoading(false); return;
      }
      if (!authData?.user) { setError('Authentication failed.'); setLoading(false); return; }

      let employee: Employee | null = null;
      const { data: byId } = await supabase.from('employees').select('id, email, role, is_active, first_name, last_name').eq('id', authData.user.id).single();
      if (byId) { employee = byId; }
      else {
        const { data: byEmail } = await supabase.from('employees').select('id, email, role, is_active, first_name, last_name').eq('email', email.trim().toLowerCase()).single();
        if (byEmail) employee = byEmail;
      }

      if (!employee) { setError('Employee profile not found. Contact your administrator.'); await supabase.auth.signOut(); setLoading(false); return; }
      if (!employee.is_active) { setError('Account deactivated. Contact your administrator.'); await supabase.auth.signOut(); setLoading(false); return; }

      if (rememberMe) localStorage.setItem('rememberEmail', email);
      else localStorage.removeItem('rememberEmail');

      redirectBasedOnRole(employee.role as UserRole);
    } catch (err) {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string) => { setEmail(demoEmail); setPassword('TestDemo123!'); setError(null); };

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('rememberEmail') : null;
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(227, 28, 121, 0.06) 0%, transparent 70%)',
      }} />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{
        background: 'rgba(211, 173, 107, 0.03)', filter: 'blur(80px)',
      }} />

      <div className="relative w-full max-w-sm mx-4">
        {/* Glass card */}
        <div className="rounded-2xl p-10 flex flex-col items-center" style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(229, 221, 216, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          {/* Wordmark */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="flex items-center gap-[3px]">
              <span className="text-2xl font-bold tracking-tight text-white">W</span>
              <span className="text-2xl font-bold tracking-tight" style={{ color: '#e31c79' }}>|</span>
              <span className="text-2xl font-bold tracking-tight text-white">E</span>
              <span className="text-2xl font-bold tracking-tight text-white ml-1">Timekeeping</span>
            </div>
            <p className="text-xs tracking-widest uppercase" style={{ color: '#6b6360' }}>
              West End Workforce
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px mb-8" style={{ background: 'rgba(229, 221, 216, 0.08)' }} />

          {/* Form */}
          <form onSubmit={handleSignIn} className="w-full space-y-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#6b6360' }}>
                Email
              </label>
              <input
                type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || cooldown > 0}
                placeholder="you@westendworkforce.com"
                className="w-full py-3 px-4 rounded-xl text-sm text-white placeholder-[#4a4340] outline-none transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'rgba(229, 221, 216, 0.04)',
                  border: '1px solid rgba(229, 221, 216, 0.08)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(229, 221, 216, 0.16)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(229, 221, 216, 0.08)'; }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest mb-2" style={{ color: '#6b6360' }}>
                Password
              </label>
              <input
                type="password" autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || cooldown > 0}
                placeholder="Enter your password"
                className="w-full py-3 px-4 rounded-xl text-sm text-white placeholder-[#4a4340] outline-none transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'rgba(229, 221, 216, 0.04)',
                  border: '1px solid rgba(229, 221, 216, 0.08)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(229, 221, 216, 0.16)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(229, 221, 216, 0.08)'; }}
              />
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#4a4340] bg-transparent accent-[#e31c79]" />
                <span className="text-xs" style={{ color: '#6b6360' }}>Remember me</span>
              </label>
              <a href="/auth/reset-password" className="text-xs transition-colors" style={{ color: '#6b6360' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#a0978e')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6b6360')}>
                Forgot password?
              </a>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl text-xs" style={{
                background: 'rgba(227, 28, 121, 0.06)',
                border: '1px solid rgba(227, 28, 121, 0.12)',
                color: '#e31c79',
              }}>
                {error}
                {cooldown > 0 && <span className="block mt-1" style={{ color: '#6b6360' }}>Wait {cooldown}s</span>}
              </div>
            )}

            {/* Sign in button */}
            <button
              type="submit" disabled={loading || cooldown > 0}
              className="w-full py-3 px-5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? 'rgba(229, 221, 216, 0.06)' : 'rgba(229, 221, 216, 0.08)',
                border: '1px solid rgba(229, 221, 216, 0.12)',
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = 'rgba(229, 221, 216, 0.12)'; e.currentTarget.style.borderColor = 'rgba(229, 221, 216, 0.2)'; }}}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(229, 221, 216, 0.08)'; e.currentTarget.style.borderColor = 'rgba(229, 221, 216, 0.12)'; }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                    <path d="M12.5 7a5.5 5.5 0 00-5.5-5.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Signing in...
                </span>
              ) : cooldown > 0 ? `Wait (${cooldown}s)` : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="w-full h-px my-7" style={{ background: 'rgba(229, 221, 216, 0.08)' }} />

          {/* Demo accounts */}
          <div className="w-full">
            <p className="text-[10px] font-medium uppercase tracking-widest mb-3" style={{ color: '#4a4340' }}>
              Demo Accounts
            </p>
            <div className="space-y-1.5">
              {[
                { label: 'Admin', email: 'admin@westend-test.com' },
                { label: 'Manager', email: 'manager@westend-test.com' },
                { label: 'Employee', email: 'employee@westend-test.com' },
              ].map((a) => (
                <button key={a.email} type="button" onClick={() => quickFill(a.email)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all duration-200"
                  style={{ color: '#6b6360', border: '1px solid rgba(229, 221, 216, 0.06)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(229, 221, 216, 0.04)'; e.currentTarget.style.borderColor = 'rgba(229, 221, 216, 0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(229, 221, 216, 0.06)'; }}
                >
                  <span><span className="font-medium text-white">{a.label}</span> <span className="ml-2 font-mono">{a.email}</span></span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>
                </button>
              ))}
            </div>
            <p className="text-center text-[10px] mt-3" style={{ color: '#4a4340' }}>
              Password: <span className="font-mono text-[#6b6360]">TestDemo123!</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: '#6b6360' }}>
          W|E Always Find a Way.
        </p>
      </div>
    </div>
  );
}

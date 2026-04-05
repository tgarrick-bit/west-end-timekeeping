'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';

type UserRole = 'admin' | 'manager' | 'employee';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  // Check existing session
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: emp } = await supabase.from('employees')
            .select('role, is_active').eq('id', session.user.id).single();
          if (emp?.is_active) {
            const r = emp.role?.toLowerCase();
            router.push(r === 'admin' ? '/admin' : r === 'manager' ? '/manager' : '/employee');
          } else { await supabase.auth.signOut(); }
        }
      } catch {}
    })();
  }, [supabase, router]);

  // Remembered email
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('rememberEmail') : null;
    if (saved) setEmail(saved);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Enter both email and password'); return; }
    setLoading(true); setError('');

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (authErr) {
        setError(authErr.message?.includes('invalid') ? 'Invalid email or password' : authErr.message || 'Login failed');
        setLoading(false); return;
      }
      if (!data?.user) { setError('Login failed'); setLoading(false); return; }

      // Look up employee
      let emp = (await supabase.from('employees').select('id, role, is_active').eq('id', data.user.id).single()).data;
      if (!emp) emp = (await supabase.from('employees').select('id, role, is_active').eq('email', email.trim().toLowerCase()).single()).data;

      if (!emp) { setError('Employee profile not found'); await supabase.auth.signOut(); setLoading(false); return; }
      if (!emp.is_active) { setError('Account deactivated'); await supabase.auth.signOut(); setLoading(false); return; }

      if (rememberMe) localStorage.setItem('rememberEmail', email);
      else localStorage.removeItem('rememberEmail');
      localStorage.setItem('userRole', emp.role);
      const r = emp.role?.toLowerCase();
      router.push(r === 'admin' ? '/admin' : r === 'manager' ? '/manager' : '/employee');
    } catch (err: any) {
      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET';
      const hasKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'YES' : 'NO';
      setError(`${err?.message || 'Unknown error'} | URL: ${supaUrl.substring(0, 30)}... | Key: ${hasKey}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Pink radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%', right: '-15%', width: '60%', height: '140%',
          background: 'radial-gradient(ellipse at center, rgba(227,28,120,0.14) 0%, rgba(227,28,120,0.05) 40%, transparent 65%)',
        }}
      />
      {/* Gold glow */}
      <div
        className="absolute bottom-0 left-[15%] w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'rgba(211, 173, 107, 0.03)', filter: 'blur(80px)' }}
      />

      <div className="relative z-10 w-[360px] mx-4 text-center">
        {/* Logo */}
        <div className="mx-auto mb-5" style={{ width: 180, height: 50 }}>
          <Image
            src="/WE-logo-SEPT2024v3-WHT.png"
            alt="West End Workforce"
            width={180}
            height={50}
            className="w-full h-full object-contain"
            priority
          />
        </div>

        {/* Title */}
        <div className="text-[17px] mb-1" style={{ color: '#e8e8e8', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, letterSpacing: '0.2px' }}>
          W<span style={{ color: '#e31c79' }}>|</span>E Timekeeping
        </div>
        <p className="text-[12px] mb-7" style={{ color: 'rgba(232,232,232,0.35)', letterSpacing: '0.2px' }}>
          Sign in to your account
        </p>

        {/* Form */}
        <form onSubmit={handleSignIn}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full mb-2.5 outline-none transition-all"
            style={{
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: '#e8e8e8',
              fontSize: 12,
            }}
            onFocus={() => {}}
            onBlur={() => {}}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full mb-2.5 outline-none transition-all"
            style={{
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: '#e8e8e8',
              fontSize: 12,
            }}
            onFocus={() => {}}
            onBlur={() => {}}
          />

          {/* Remember me */}
          <label className="flex items-center gap-2 mb-2.5 cursor-pointer" style={{ justifyContent: 'flex-start' }}>
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3 h-3 rounded accent-[#e31c79]"
              style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)' }} />
            <span className="text-[11px]" style={{ color: 'rgba(232,232,232,0.3)' }}>Remember me</span>
          </label>

          {error && (
            <div className="flex items-center gap-2 mb-2.5 px-3 py-2 text-[12px]" style={{
              color: '#dc2626', background: 'rgba(220,38,38,0.08)', borderRadius: '8px',
            }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full mt-1 transition-all duration-200"
            style={{
              padding: '10px',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.3px',
              color: '#e31c79',
              background: 'rgba(227,28,120,0.1)',
              border: '0.5px solid rgba(227,28,120,0.22)',
              borderRadius: '8px',
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              opacity: loading || !email || !password ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(227,28,120,0.18)';
                e.currentTarget.style.borderColor = 'rgba(227,28,120,0.35)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(227,28,120,0.1)';
              e.currentTarget.style.borderColor = 'rgba(227,28,120,0.22)';
            }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mx-auto" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Forgot password */}
        <a
          href="/auth/reset-password"
          className="inline-block mt-4 text-[11px] transition-colors"
          style={{ color: 'rgba(232,232,232,0.25)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(232,232,232,0.5)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(232,232,232,0.25)')}
        >
          Forgot password?
        </a>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setInterval(() => setResendCooldown(p => Math.max(0, p - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email'); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        { redirectTo: `${window.location.origin}/auth/reset-password` }
      );
      if (err) { setError(err.message.includes('rate') ? 'Too many requests' : 'Failed to send email'); }
      else { setSubmitted(true); setResendCooldown(60); }
    } catch { setError('Unexpected error'); }
    finally { setLoading(false); }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0a0a0a' }}>
      <div className="absolute pointer-events-none" style={{
        top: '-20%', right: '-15%', width: '60%', height: '140%',
        background: 'radial-gradient(ellipse at center, rgba(227,28,120,0.14) 0%, rgba(227,28,120,0.05) 40%, transparent 65%)',
      }} />
      <div className="relative z-10 w-[360px] mx-4 text-center">
        <div className="mx-auto mb-5" style={{ width: 180, height: 50 }}>
          <Image src="/WE-logo-SEPT2024v3-WHT.png" alt="West End Workforce" width={180} height={50} className="w-full h-full object-contain" priority />
        </div>
        {children}
      </div>
    </div>
  );

  if (submitted) {
    return (
      <Shell>
        <div className="text-[22px] mb-1" style={{ color: '#e8e8e8', letterSpacing: '-0.3px' }}>
          <span className="font-semibold">Check your email</span>
        </div>
        <p className="text-[12px] mb-5" style={{ color: 'rgba(232,232,232,0.35)' }}>
          If an account exists, reset instructions were sent to <span style={{ color: 'rgba(232,232,232,0.6)' }}>{email}</span>
        </p>
        <div className="space-y-2.5">
          <button onClick={() => { if (resendCooldown <= 0) { setSubmitted(false); } }} disabled={resendCooldown > 0}
            className="w-full transition-all duration-200" style={{
              padding: '10px', fontSize: 12, fontWeight: 500, color: '#e31c79',
              background: 'rgba(227,28,120,0.1)', border: '0.5px solid rgba(227,28,120,0.22)', borderRadius: '8px',
              opacity: resendCooldown > 0 ? 0.5 : 1, cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
            }}>
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
          </button>
          <button onClick={() => router.push('/auth/login')}
            className="w-full transition-all duration-200" style={{
              padding: '10px', fontSize: 12, fontWeight: 500, color: 'rgba(232,232,232,0.5)',
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
            Back to login
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-[22px] mb-1" style={{ color: '#e8e8e8', letterSpacing: '-0.3px' }}>
        <span className="font-semibold">Reset password</span>
      </div>
      <p className="text-[12px] mb-7" style={{ color: 'rgba(232,232,232,0.35)' }}>
        Enter your email to receive reset instructions
      </p>

      <form onSubmit={handleSubmit}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address" required autoFocus
          className="w-full mb-2.5 outline-none transition-all" style={{
            padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e8e8e8', fontSize: 12,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(227,28,120,0.40)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        />

        {error && (
          <div className="flex items-center gap-2 mb-2.5 px-3 py-2 text-[12px]" style={{
            color: '#dc2626', background: 'rgba(220,38,38,0.08)', borderRadius: '8px',
          }}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
          </div>
        )}

        <button type="submit" disabled={loading || !email} className="w-full mt-1 transition-all duration-200" style={{
          padding: '10px', fontSize: 12, fontWeight: 500, color: '#e31c79',
          background: 'rgba(227,28,120,0.1)', border: '0.5px solid rgba(227,28,120,0.22)', borderRadius: '8px',
          opacity: loading || !email ? 0.5 : 1, cursor: loading || !email ? 'not-allowed' : 'pointer',
        }}
          onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = 'rgba(227,28,120,0.18)'; e.currentTarget.style.borderColor = 'rgba(227,28,120,0.35)'; }}}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(227,28,120,0.1)'; e.currentTarget.style.borderColor = 'rgba(227,28,120,0.22)'; }}>
          {loading ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mx-auto" /> : 'Send instructions'}
        </button>
      </form>

      <a href="/auth/login" className="inline-block mt-4 text-[11px] transition-colors"
        style={{ color: 'rgba(232,232,232,0.25)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(232,232,232,0.5)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(232,232,232,0.25)')}>
        Back to login
      </a>
    </Shell>
  );
}

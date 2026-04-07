'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Supabase automatically picks up the token from the URL hash and establishes a session
  useEffect(() => {
    const checkSession = async () => {
      // Give Supabase a moment to process the hash token
      await new Promise(r => setTimeout(r, 500));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        setError('Invalid or expired reset link. Please request a new one.');
      }
      setChecking(false);
    };

    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
        setChecking(false);
      }
    });

    checkSession();
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Unexpected error updating password.');
    } finally {
      setLoading(false);
    }
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

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#e8e8e8',
    fontSize: 12,
  };

  if (checking) {
    return (
      <Shell>
        <div style={{ color: 'rgba(232,232,232,0.5)', fontSize: 13 }}>Verifying reset link...</div>
      </Shell>
    );
  }

  if (success) {
    return (
      <Shell>
        <CheckCircle style={{ width: 40, height: 40, color: '#2d9b6e', margin: '0 auto 16px' }} />
        <div className="text-[22px] mb-1" style={{ color: '#e8e8e8', letterSpacing: '-0.3px' }}>
          <span className="font-semibold">Password updated</span>
        </div>
        <p className="text-[12px] mb-5" style={{ color: 'rgba(232,232,232,0.35)' }}>
          Your password has been changed successfully.
        </p>
        <button
          onClick={() => router.push('/auth/login')}
          className="w-full transition-all duration-200"
          style={{
            padding: '10px',
            fontSize: 12,
            fontWeight: 600,
            color: '#fff',
            background: '#e31c79',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#cc1069'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; }}
        >
          Sign in with new password
        </button>
      </Shell>
    );
  }

  if (!sessionReady) {
    return (
      <Shell>
        <AlertCircle style={{ width: 40, height: 40, color: '#b91c1c', margin: '0 auto 16px' }} />
        <div className="text-[22px] mb-1" style={{ color: '#e8e8e8', letterSpacing: '-0.3px' }}>
          <span className="font-semibold">Link expired</span>
        </div>
        <p className="text-[12px] mb-5" style={{ color: 'rgba(232,232,232,0.35)' }}>
          {error || 'This reset link is invalid or has expired.'}
        </p>
        <div className="space-y-2.5">
          <button
            onClick={() => router.push('/auth/reset-password')}
            className="w-full transition-all duration-200"
            style={{
              padding: '10px', fontSize: 12, fontWeight: 500, color: '#e31c79',
              background: 'rgba(227,28,120,0.1)', border: '0.5px solid rgba(227,28,120,0.22)', borderRadius: '8px',
            }}
          >
            Request new reset link
          </button>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full transition-all duration-200"
            style={{
              padding: '10px', fontSize: 12, fontWeight: 500, color: 'rgba(232,232,232,0.5)',
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px',
            }}
          >
            Back to login
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-[22px] mb-1" style={{ color: '#e8e8e8', letterSpacing: '-0.3px' }}>
        <span className="font-semibold">Set new password</span>
      </div>
      <p className="text-[12px] mb-7" style={{ color: 'rgba(232,232,232,0.35)' }}>
        Enter your new password below
      </p>

      <form onSubmit={handleSubmit}>
        <div className="relative mb-2.5">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            required
            autoFocus
            className="w-full outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(227,28,120,0.40)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgba(232,232,232,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <input
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
          className="w-full mb-2.5 outline-none transition-all"
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(227,28,120,0.40)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        />

        {password && (
          <div className="mb-3 text-left" style={{ fontSize: 10 }}>
            <div style={{ color: password.length >= 8 ? '#2d9b6e' : 'rgba(232,232,232,0.3)' }}>
              {password.length >= 8 ? '\u2713' : '\u2022'} At least 8 characters
            </div>
            {confirmPassword && (
              <div style={{ color: password === confirmPassword ? '#2d9b6e' : '#b91c1c' }}>
                {password === confirmPassword ? '\u2713' : '\u2022'} Passwords match
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 mb-3 text-left" style={{ fontSize: 11, color: '#b91c1c' }}>
            <AlertCircle size={12} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || password.length < 8 || password !== confirmPassword}
          className="w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            padding: '10px',
            fontSize: 12,
            fontWeight: 600,
            color: '#fff',
            background: '#e31c79',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#cc1069'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; }}
        >
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>

      <button
        onClick={() => router.push('/auth/login')}
        className="w-full mt-2.5 transition-all duration-200"
        style={{
          padding: '10px', fontSize: 12, fontWeight: 500, color: 'rgba(232,232,232,0.5)',
          background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      >
        Back to login
      </button>
    </Shell>
  );
}

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
  const [focusedField, setFocusedField] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    const storedAttempts = localStorage.getItem('passwordResetAttempts');
    if (storedAttempts) {
      const attempts = JSON.parse(storedAttempts);
      const now = Date.now();
      if (attempts.timestamp && now - attempts.timestamp > 3600000) {
        localStorage.removeItem('passwordResetAttempts');
      } else {
        setAttemptCount(attempts.count || 0);
      }
    }
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (attemptCount >= 5) {
      setError('Too many reset attempts. Please contact your administrator or try again later.');
      return;
    }

    setLoading(true);

    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('email, is_active')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (!employee) {
        setSubmitted(true);
        setResendCooldown(60);
      } else if (!employee.is_active) {
        setError('This account is inactive. Please contact your administrator.');
        setLoading(false);
        return;
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.toLowerCase().trim(),
          { redirectTo: `${window.location.origin}/auth/reset-password` }
        );

        if (resetError) {
          if (resetError.message.includes('rate limit')) {
            setError('Too many requests. Please wait a few minutes and try again.');
            setResendCooldown(180);
          } else {
            setError('Failed to send reset email. Please try again or contact support.');
          }
        } else {
          setSubmitted(true);
          setResendCooldown(60);
          const newCount = attemptCount + 1;
          setAttemptCount(newCount);
          localStorage.setItem('passwordResetAttempts', JSON.stringify({
            count: newCount,
            timestamp: Date.now()
          }));
        }
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setSubmitted(false);
    await handleSubmit(new Event('submit') as any);
  };

  // Shared page wrapper
  const PageShell = ({ children }: { children: React.ReactNode }) => (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      {/* Ambient glows */}
      <div
        className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(227, 28, 121, 0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-[-15%] left-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(211, 173, 107, 0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.015) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      <div className="relative w-full max-w-[400px] mx-4">
        {children}
        <p
          className="text-center mt-8"
          style={{ fontSize: '11px', color: '#a18b75', letterSpacing: '0.04em' }}
        >
          W|E Always Find a Way.
        </p>
      </div>
    </div>
  );

  // Glass button helper
  const GlassButton = ({
    children,
    onClick,
    variant = 'secondary',
    disabled = false,
    type = 'button',
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    type?: 'button' | 'submit';
  }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        padding: '13px 20px',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'var(--font-body), sans-serif',
        letterSpacing: '0.02em',
        ...(variant === 'primary'
          ? { background: '#000000', color: '#ffffff', border: 'none' }
          : {
              background: 'transparent',
              color: '#000000',
              border: '0.5px solid rgba(0, 0, 0, 0.1)',
            }),
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          if (variant === 'primary') {
            e.currentTarget.style.background = '#1a1a1a';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
          } else {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.02)';
            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.15)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'primary') {
          e.currentTarget.style.background = '#000000';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        } else {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
        }
      }}
    >
      {children}
    </button>
  );

  if (submitted) {
    return (
      <PageShell>
        <div
          className="rounded-2xl p-10"
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            border: '0.5px solid rgba(0, 0, 0, 0.08)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div className="flex flex-col items-center text-center">
            {/* Success icon */}
            <div
              className="flex items-center justify-center mb-6"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'rgba(34, 197, 94, 0.06)',
                border: '0.5px solid rgba(34, 197, 94, 0.15)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2
              className="text-[22px] font-bold mb-2"
              style={{ color: '#000000', fontFamily: 'var(--font-heading), sans-serif' }}
            >
              Check Your Email
            </h2>
            <p className="text-[13px] mb-5" style={{ color: '#a18b75' }}>
              If an account exists, we&apos;ve sent reset instructions to:
            </p>

            {/* Email display */}
            <div
              className="w-full px-4 py-3 rounded-lg mb-6"
              style={{
                background: 'rgba(0, 0, 0, 0.02)',
                border: '0.5px solid rgba(0, 0, 0, 0.06)',
              }}
            >
              <p className="font-mono text-[13px] font-semibold break-all" style={{ color: '#000000' }}>
                {email}
              </p>
            </div>

            {/* Info box */}
            <div
              className="w-full rounded-xl p-4 mb-6 text-left"
              style={{
                background: 'rgba(211, 173, 107, 0.04)',
                border: '0.5px solid rgba(211, 173, 107, 0.15)',
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: '#d3ad6b' }}>
                Important
              </p>
              <ul className="space-y-1">
                {[
                  'Check your spam or junk folder',
                  'The link expires in 1 hour',
                  'Only the most recent link will work',
                  'Contact support if not received within 5 minutes',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[13px] mt-0.5" style={{ color: '#d3ad6b' }}>&#8226;</span>
                    <span className="text-[13px]" style={{ color: '#a18b75' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="w-full space-y-2.5">
              <GlassButton onClick={handleResend} disabled={resendCooldown > 0}>
                {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Email'}
              </GlassButton>
              <GlassButton onClick={() => { setSubmitted(false); setEmail(''); setError(null); }}>
                Try Another Email
              </GlassButton>
              <GlassButton onClick={() => router.push('/auth/login')} variant="primary">
                Back to Login
              </GlassButton>
            </div>
          </div>

          {/* Support link */}
          <div className="mt-6 text-center">
            <p className="text-[11px]" style={{ color: '#a18b75' }}>
              Need help?{' '}
              <a
                href="mailto:support@westendworkforce.com"
                className="transition-colors duration-200"
                style={{ color: '#e31c79' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#c91865')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#e31c79')}
              >
                support@westendworkforce.com
              </a>
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div
        className="rounded-2xl p-10"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          border: '0.5px solid rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="flex items-center justify-center"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(211, 173, 107, 0.06)',
              border: '0.5px solid rgba(211, 173, 107, 0.15)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#d3ad6b" strokeWidth="1.5" />
              <path d="M7 11V7a5 5 0 0110 0v4" stroke="#d3ad6b" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <h2
              className="text-[22px] font-bold mb-1"
              style={{ color: '#000000', fontFamily: 'var(--font-heading), sans-serif' }}
            >
              Reset Password
            </h2>
            <p className="text-[13px]" style={{ color: '#a18b75' }}>
              Enter your email to receive reset instructions
            </p>
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-full mb-7"
          style={{ height: '0.5px', background: 'rgba(0, 0, 0, 0.06)' }}
        />

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl mb-6"
            style={{
              background: 'rgba(227, 28, 121, 0.04)',
              border: '0.5px solid rgba(227, 28, 121, 0.12)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
              <circle cx="8" cy="8" r="7" stroke="#e31c79" strokeWidth="1" />
              <path d="M8 5v3.5M8 10.5v.5" stroke="#e31c79" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <p className="text-[13px] font-medium" style={{ color: '#e31c79' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email field */}
          <div className="mb-6">
            <label
              htmlFor="email"
              className="block text-[11px] font-semibold uppercase tracking-[0.08em] mb-2"
              style={{ color: focusedField ? '#e31c79' : '#a18b75' }}
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField(true)}
              onBlur={() => setFocusedField(false)}
              disabled={loading}
              autoFocus
              placeholder="you@westendworkforce.com"
              className="w-full transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                padding: '12px 14px',
                fontSize: '14px',
                fontFamily: 'var(--font-body), sans-serif',
                fontWeight: 500,
                color: '#000000',
                background: 'rgba(0, 0, 0, 0.02)',
                border: `0.5px solid ${focusedField ? 'rgba(227, 28, 121, 0.3)' : 'rgba(0, 0, 0, 0.08)'}`,
                borderRadius: '10px',
              }}
            />
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <GlassButton type="submit" variant="primary" disabled={loading || attemptCount >= 5}>
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                    <path d="M14 8a6 6 0 00-6-6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Sending Instructions...
                </>
              ) : attemptCount >= 5 ? (
                'Too Many Attempts'
              ) : (
                'Send Reset Instructions'
              )}
            </GlassButton>

            <GlassButton onClick={() => router.push('/auth/login')}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Login
            </GlassButton>
          </div>
        </form>

        {/* Password requirements */}
        <div
          className="mt-7 pt-6"
          style={{ borderTop: '0.5px solid rgba(0, 0, 0, 0.06)' }}
        >
          <div
            className="rounded-xl p-4"
            style={{
              background: 'rgba(0, 0, 0, 0.02)',
              border: '0.5px solid rgba(0, 0, 0, 0.04)',
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2"
              style={{ color: '#a18b75' }}
            >
              Password Requirements
            </p>
            <ul className="space-y-1">
              {[
                'At least 8 characters long',
                'Include uppercase and lowercase letters',
                'Include at least one number',
                'Include at least one special character',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-[13px] mt-0.5" style={{ color: '#a18b75' }}>&#8226;</span>
                  <span className="text-[12px]" style={{ color: '#a18b75' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {attemptCount > 0 && attemptCount < 5 && (
          <p className="text-center mt-4 text-[11px]" style={{ color: '#a18b75' }}>
            Reset attempts: {attemptCount}/5
          </p>
        )}
      </div>
    </PageShell>
  );
}

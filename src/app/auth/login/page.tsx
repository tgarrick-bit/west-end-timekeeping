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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [cooldown, setCooldown] = useState<number>(0);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createSupabaseClient();

  const addDebugInfo = (info: string) => {
    if (process.env.NODE_ENV === 'development') {
      setDebugInfo(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]}: ${info}`]);
      console.log(`[Auth Debug] ${info}`);
    }
  };

  const redirectBasedOnRole = (role: UserRole, employeeName?: string) => {
    addDebugInfo(`Redirecting ${employeeName || 'user'} with role: ${role}`);
    if (typeof window !== 'undefined') {
      localStorage.setItem('userRole', role);
    }
    switch (role.toLowerCase()) {
      case 'admin':
        router.push('/admin');
        break;
      case 'manager':
        router.push('/manager');
        break;
      case 'employee':
      default:
        router.push('/employee');
        break;
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          addDebugInfo(`Found existing session for user: ${session.user.email}`);
          const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('id, email, role, is_active, first_name, last_name')
            .eq('id', session.user.id)
            .single();
          if (!employeeError && employee && employee.is_active) {
            const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ');
            redirectBasedOnRole(employee.role as UserRole, fullName);
          } else {
            await supabase.auth.signOut();
            addDebugInfo('Cleared invalid session');
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    };
    checkExistingSession();
  }, [supabase, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before trying again`);
      return;
    }
    setError(null);
    setLoading(true);
    setDebugInfo([]);

    try {
      addDebugInfo(`Attempting login for: ${email}`);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (authError) {
        addDebugInfo(`Auth error: ${authError.message}`);
        if (authError.message?.toLowerCase().includes('rate limit') ||
            authError.message?.toLowerCase().includes('too many')) {
          setError('Too many login attempts. Please wait before trying again.');
          setCooldown(60);
        } else if (authError.message?.toLowerCase().includes('invalid')) {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(authError.message || 'Authentication failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      if (!authData?.user) {
        addDebugInfo('No user data returned from authentication');
        setError('Authentication failed. Please try again.');
        setLoading(false);
        return;
      }

      addDebugInfo(`Auth successful for user ID: ${authData.user.id}`);

      let employee: Employee | null = null;
      let employeeError: any = null;

      const { data: employeeById, error: errorById } = await supabase
        .from('employees')
        .select('id, email, role, is_active, first_name, last_name')
        .eq('id', authData.user.id)
        .single();

      if (employeeById) {
        employee = employeeById;
      } else {
        employeeError = errorById;
        addDebugInfo(`Employee not found by ID, trying email lookup`);
        const { data: employeeByEmail, error: errorByEmail } = await supabase
          .from('employees')
          .select('id, email, role, is_active, first_name, last_name')
          .eq('email', email.trim().toLowerCase())
          .single();
        if (employeeByEmail) {
          employee = employeeByEmail;
        } else {
          employeeError = errorByEmail;
        }
      }

      if (!employee) {
        addDebugInfo(`No employee record found: ${employeeError?.message}`);
        setError('Your employee profile was not found. Please contact your administrator.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (!employee.is_active) {
        addDebugInfo('Employee account is inactive');
        setError('Your account has been deactivated. Please contact your administrator.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (rememberMe && typeof window !== 'undefined') {
        localStorage.setItem('rememberEmail', email);
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('rememberEmail');
      }

      const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ');
      addDebugInfo(`Login successful for ${fullName || email}`);
      redirectBasedOnRole(employee.role as UserRole, fullName);

    } catch (err) {
      console.error('Unexpected login error:', err);
      addDebugInfo(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      setError('An unexpected error occurred. Please try again later.');
      setLoading(false);
    }
  };

  const quickFillCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('TestDemo123!');
    setError(null);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rememberedEmail = localStorage.getItem('rememberEmail');
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      {/* Ambient liquid glows */}
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
      <div
        className="absolute top-[30%] left-[20%] w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(161, 139, 117, 0.04) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Subtle grid texture */}
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

      {/* Main card */}
      <div className="relative w-full max-w-[400px] mx-4">
        {/* Glass card */}
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
          {/* Logo wordmark */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex items-center gap-[2px]">
              <span
                className="text-[28px] font-extrabold tracking-tight"
                style={{ color: '#000000', fontFamily: 'var(--font-heading), sans-serif' }}
              >
                W
              </span>
              <span
                className="text-[28px] font-extrabold tracking-tight"
                style={{ color: '#e31c79' }}
              >
                |
              </span>
              <span
                className="text-[28px] font-extrabold tracking-tight"
                style={{ color: '#000000', fontFamily: 'var(--font-heading), sans-serif' }}
              >
                E
              </span>
              <span className="ml-1" />
              <span
                className="text-[28px] font-extrabold tracking-tight"
                style={{ color: '#000000', fontFamily: 'var(--font-heading), sans-serif' }}
              >
                Timekeeping
              </span>
            </div>
            <p
              className="text-[11px] font-medium tracking-[0.2em] uppercase"
              style={{ color: '#a18b75' }}
            >
              West End Workforce
            </p>
          </div>

          {/* Divider */}
          <div
            className="w-full mb-8"
            style={{ height: '0.5px', background: 'rgba(0, 0, 0, 0.06)' }}
          />

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-semibold uppercase tracking-[0.08em] mb-2"
                style={{ color: focusedField === 'email' ? '#e31c79' : '#a18b75' }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                disabled={loading || cooldown > 0}
                placeholder="you@westendworkforce.com"
                className="w-full transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  padding: '12px 14px',
                  fontSize: '14px',
                  fontFamily: 'var(--font-body), sans-serif',
                  fontWeight: 500,
                  color: '#000000',
                  background: 'rgba(0, 0, 0, 0.02)',
                  border: `0.5px solid ${focusedField === 'email' ? 'rgba(227, 28, 121, 0.3)' : 'rgba(0, 0, 0, 0.08)'}`,
                  borderRadius: '10px',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-semibold uppercase tracking-[0.08em] mb-2"
                style={{ color: focusedField === 'password' ? '#e31c79' : '#a18b75' }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                disabled={loading || cooldown > 0}
                placeholder="Enter your password"
                className="w-full transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  padding: '12px 14px',
                  fontSize: '14px',
                  fontFamily: 'var(--font-body), sans-serif',
                  fontWeight: 500,
                  color: '#000000',
                  background: 'rgba(0, 0, 0, 0.02)',
                  border: `0.5px solid ${focusedField === 'password' ? 'rgba(227, 28, 121, 0.3)' : 'rgba(0, 0, 0, 0.08)'}`,
                  borderRadius: '10px',
                }}
              />
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  className="relative flex items-center justify-center transition-all duration-200"
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: `0.5px solid ${rememberMe ? '#e31c79' : 'rgba(0, 0, 0, 0.12)'}`,
                    background: rememberMe ? 'rgba(227, 28, 121, 0.08)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading || cooldown > 0}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {rememberMe && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="#e31c79" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-[12px] font-medium" style={{ color: '#a18b75' }}>
                  Remember me
                </span>
              </label>

              <a
                href="/auth/reset-password"
                className="text-[12px] font-medium transition-colors duration-200"
                style={{ color: '#a18b75' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#e31c79')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a18b75')}
              >
                Forgot password?
              </a>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{
                  background: 'rgba(227, 28, 121, 0.04)',
                  border: '0.5px solid rgba(227, 28, 121, 0.12)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                  <circle cx="8" cy="8" r="7" stroke="#e31c79" strokeWidth="1" />
                  <path d="M8 5v3.5M8 10.5v.5" stroke="#e31c79" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: '#e31c79' }}>{error}</p>
                  {cooldown > 0 && (
                    <p className="text-[12px] mt-1" style={{ color: '#a18b75' }}>
                      Please wait {cooldown} seconds before trying again.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Sign In button */}
            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full relative overflow-hidden transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                padding: '13px 20px',
                borderRadius: '10px',
                background: '#000000',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'var(--font-body), sans-serif',
                letterSpacing: '0.02em',
                border: 'none',
              }}
              onMouseEnter={(e) => {
                if (!loading && cooldown <= 0) {
                  e.currentTarget.style.background = '#1a1a1a';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#000000';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                    <path d="M14 8a6 6 0 00-6-6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Signing in...
                </span>
              ) : cooldown > 0 ? (
                `Please wait (${cooldown}s)`
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            className="w-full my-7"
            style={{ height: '0.5px', background: 'rgba(0, 0, 0, 0.06)' }}
          />

          {/* Demo accounts */}
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-4"
              style={{ color: '#a18b75' }}
            >
              Demo Accounts
            </p>
            <div className="space-y-2">
              {[
                { label: 'Admin', email: 'admin@westend-test.com' },
                { label: 'Manager', email: 'manager@westend-test.com' },
                { label: 'Employee', email: 'employee@westend-test.com' },
              ].map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => quickFillCredentials(account.email)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200"
                  style={{
                    background: 'transparent',
                    border: '0.5px solid rgba(0, 0, 0, 0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.02)';
                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.06)';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: account.label === 'Admin'
                          ? 'rgba(211, 173, 107, 0.1)'
                          : account.label === 'Manager'
                          ? 'rgba(227, 28, 121, 0.06)'
                          : 'rgba(161, 139, 117, 0.08)',
                        border: `0.5px solid ${
                          account.label === 'Admin'
                            ? 'rgba(211, 173, 107, 0.2)'
                            : account.label === 'Manager'
                            ? 'rgba(227, 28, 121, 0.12)'
                            : 'rgba(161, 139, 117, 0.15)'
                        }`,
                      }}
                    >
                      <span
                        className="text-[11px] font-bold"
                        style={{
                          color: account.label === 'Admin'
                            ? '#d3ad6b'
                            : account.label === 'Manager'
                            ? '#e31c79'
                            : '#a18b75',
                        }}
                      >
                        {account.label[0]}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-[12px] font-semibold block" style={{ color: '#000000' }}>
                        {account.label}
                      </span>
                      <span className="text-[11px] font-mono block" style={{ color: '#a18b75' }}>
                        {account.email}
                      </span>
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.3 }}>
                    <path d="M5.5 3.5L9 7L5.5 10.5" stroke="#000000" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}

              <p
                className="text-center pt-2"
                style={{ fontSize: '11px', color: '#a18b75' }}
              >
                Password: <span className="font-mono font-semibold" style={{ color: '#000000' }}>TestDemo123!</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p
          className="text-center mt-8"
          style={{ fontSize: '11px', color: '#a18b75', letterSpacing: '0.04em' }}
        >
          W|E Always Find a Way.
        </p>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
          <div
            className="mt-4 p-4 rounded-xl"
            style={{
              background: 'rgba(0, 0, 0, 0.02)',
              border: '0.5px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#a18b75' }}>
                Debug Log
              </p>
              <button
                type="button"
                onClick={() => setDebugInfo([])}
                className="text-[11px] transition-colors duration-200"
                style={{ color: '#a18b75' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#e31c79')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a18b75')}
              >
                Clear
              </button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto font-mono">
              {debugInfo.slice(-5).map((info, index) => (
                <div key={index} className="text-[11px] truncate" style={{ color: '#a18b75' }}>
                  {info}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

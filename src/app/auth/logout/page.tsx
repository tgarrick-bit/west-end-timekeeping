'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type LogoutStatus = 'logging-out' | 'success' | 'error' | 'clearing';

interface LogoutStats {
  sessionDuration?: string;
  lastActivity?: string;
}

export default function LogoutPage() {
  const [status, setStatus] = useState<LogoutStatus>('clearing');
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState<LogoutStats>({});
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  const calculateSessionStats = useCallback(() => {
    if (typeof window !== 'undefined') {
      const loginTime = localStorage.getItem('sessionStartTime');
      const lastActivity = localStorage.getItem('lastActivity');
      if (loginTime) {
        const duration = Date.now() - parseInt(loginTime);
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        setStats({
          sessionDuration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`,
          lastActivity: lastActivity ? new Date(parseInt(lastActivity)).toLocaleTimeString() : undefined
        });
      }
    }
  }, []);

  const clearApplicationData = useCallback(async () => {
    setStatus('clearing');
    setProgress(10);
    try {
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('session') || key.includes('user') ||
              key.includes('lastActivity') || key.includes('currentProject') ||
              key.includes('remember') || key.includes('role'))) {
            keysToRemove.push(key);
          }
        }
        setProgress(30);
        keysToRemove.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
        setProgress(50);
        if (document.cookie) {
          document.cookie.split(";").forEach((c) => {
            document.cookie = c
              .replace(/^ +/, "")
              .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          });
        }
      }
      setProgress(70);
    } catch (error) {
      console.error('Error clearing application data:', error);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      calculateSessionStats();
      await clearApplicationData();
      setStatus('logging-out');
      setProgress(80);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        try {
          await supabase.from('audit_logs').insert({
            user_id: session.user.id,
            action: 'logout',
            timestamp: new Date().toISOString(),
            metadata: { session_duration: stats.sessionDuration, method: 'manual' }
          });
        } catch (auditError) {
          console.error('Audit log error:', auditError);
        }
      }

      setProgress(90);
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
        setErrorMessage(error.message);
        setStatus('error');
        setTimeout(() => { window.location.href = '/auth/login'; }, 2000);
      } else {
        setProgress(100);
        setStatus('success');
        setTimeout(() => { window.location.href = '/auth/login'; }, 1500);
      }
    } catch (err) {
      console.error('Unexpected logout error:', err);
      setStatus('error');
      setErrorMessage('An unexpected error occurred during logout');
      setTimeout(() => { window.location.href = '/auth/login'; }, 2000);
    }
  }, [supabase, clearApplicationData, calculateSessionStats, stats.sessionDuration]);

  useEffect(() => { handleLogout(); }, [handleLogout]);

  useEffect(() => {
    if (status === 'success') {
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = () => { window.history.go(1); };
    }
  }, [status]);

  return (
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
            {(status === 'clearing' || status === 'logging-out') && (
              <>
                <div
                  className="flex items-center justify-center mb-6"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: 'rgba(227, 28, 121, 0.04)',
                    border: '0.5px solid rgba(227, 28, 121, 0.1)',
                  }}
                >
                  <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="rgba(227, 28, 121, 0.15)" strokeWidth="2" />
                    <path d="M21 12a9 9 0 00-9-9" stroke="#e31c79" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <h2
                  className="text-[22px] font-bold mb-2"
                  style={{ color: '#000000', fontFamily: 'var(--font-heading), sans-serif' }}
                >
                  {status === 'clearing' ? 'Clearing Session' : 'Logging Out'}
                </h2>
                <p className="text-[13px] mb-6" style={{ color: '#a18b75' }}>
                  Please wait while we securely log you out...
                </p>

                {/* Progress */}
                <div
                  className="w-full rounded-full overflow-hidden mb-4"
                  style={{ height: '3px', background: 'rgba(0, 0, 0, 0.04)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%`, background: '#e31c79' }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="2" y="5" width="8" height="6" rx="1" stroke="#a18b75" strokeWidth="1" />
                    <path d="M4 5V3.5a2 2 0 014 0V5" stroke="#a18b75" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                  <span className="text-[11px]" style={{ color: '#a18b75' }}>
                    Secure logout in progress
                  </span>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
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
                  Signed Out
                </h2>
                <p className="text-[13px] mb-5" style={{ color: '#a18b75' }}>
                  You have been securely logged out.
                </p>

                {(stats.sessionDuration || stats.lastActivity) && (
                  <div
                    className="w-full rounded-xl p-4 mb-5"
                    style={{
                      background: 'rgba(0, 0, 0, 0.02)',
                      border: '0.5px solid rgba(0, 0, 0, 0.06)',
                    }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: '#a18b75' }}>
                      Session Summary
                    </p>
                    {stats.sessionDuration && (
                      <p className="text-[12px]" style={{ color: '#000000' }}>
                        Duration: <span className="font-semibold">{stats.sessionDuration}</span>
                      </p>
                    )}
                    {stats.lastActivity && (
                      <p className="text-[12px]" style={{ color: '#000000' }}>
                        Last activity: <span className="font-semibold">{stats.lastActivity}</span>
                      </p>
                    )}
                  </div>
                )}

                <p className="text-[12px] mb-5" style={{ color: '#a18b75' }}>
                  Redirecting to login...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div
                  className="flex items-center justify-center mb-6"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: 'rgba(227, 28, 121, 0.04)',
                    border: '0.5px solid rgba(227, 28, 121, 0.1)',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#e31c79" strokeWidth="1.5" />
                    <path d="M12 8v4M12 16v.5" stroke="#e31c79" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h2
                  className="text-[22px] font-bold mb-2"
                  style={{ color: '#000000', fontFamily: 'var(--font-heading), sans-serif' }}
                >
                  Logout Issue
                </h2>
                <p className="text-[13px] mb-4" style={{ color: '#a18b75' }}>
                  We encountered an issue, but your session will be terminated.
                </p>
                {errorMessage && (
                  <div
                    className="w-full rounded-xl p-4 mb-5"
                    style={{
                      background: 'rgba(227, 28, 121, 0.04)',
                      border: '0.5px solid rgba(227, 28, 121, 0.12)',
                    }}
                  >
                    <p className="text-[13px]" style={{ color: '#e31c79' }}>{errorMessage}</p>
                  </div>
                )}
                <p className="text-[12px]" style={{ color: '#a18b75' }}>
                  Redirecting to login...
                </p>
              </>
            )}

            {/* Manual redirect */}
            {(status === 'success' || status === 'error') && (
              <button
                onClick={() => (window.location.href = '/auth/login')}
                className="w-full mt-5 transition-all duration-200"
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
                  e.currentTarget.style.background = '#1a1a1a';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#000000';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {status === 'success' ? 'Return to Login' : 'Go to Login'}
              </button>
            )}

            {/* Security tip */}
            {status === 'success' && (
              <div
                className="w-full rounded-xl p-4 mt-4"
                style={{
                  background: 'rgba(211, 173, 107, 0.04)',
                  border: '0.5px solid rgba(211, 173, 107, 0.12)',
                }}
              >
                <div className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0">
                    <rect x="3" y="6" width="8" height="6" rx="1" stroke="#d3ad6b" strokeWidth="1" />
                    <path d="M5 6V4.5a2 2 0 014 0V6" stroke="#d3ad6b" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: '#d3ad6b' }}>Security Tip</p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#a18b75' }}>
                      Close this browser tab for additional security.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p style={{ fontSize: '11px', color: '#a18b75', letterSpacing: '0.04em' }}>
            W|E Always Find a Way.
          </p>
        </div>
      </div>
    </div>
  );
}

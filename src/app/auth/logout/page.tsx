'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type LogoutStatus = 'clearing' | 'logging-out' | 'success' | 'error';

export default function LogoutPage() {
  const [status, setStatus] = useState<LogoutStatus>('clearing');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = useCallback(async () => {
    try {
      setProgress(20);
      if (typeof window !== 'undefined') {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.includes('session') || k.includes('user') || k.includes('lastActivity') || k.includes('currentProject') || k.includes('remember') || k.includes('role'))) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
        sessionStorage.clear();
      }
      setProgress(50); setStatus('logging-out'); setProgress(80);
      const { error } = await supabase.auth.signOut();
      if (error) { setErrorMessage(error.message); setStatus('error'); }
      else { setProgress(100); setStatus('success'); }
      setTimeout(() => { window.location.href = '/auth/login'; }, 1500);
    } catch (err) {
      setStatus('error'); setErrorMessage('Unexpected error during logout');
      setTimeout(() => { window.location.href = '/auth/login'; }, 2000);
    }
  }, [supabase]);

  useEffect(() => { handleLogout(); }, [handleLogout]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(227, 28, 121, 0.06) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-sm mx-4">
        <div className="rounded-2xl p-10 flex flex-col items-center text-center" style={{
          background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(229, 221, 216, 0.08)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        }}>
          {(status === 'clearing' || status === 'logging-out') && (
            <>
              <svg className="animate-spin mb-5" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="rgba(229, 221, 216, 0.1)" strokeWidth="1.5" />
                <path d="M18 10a8 8 0 00-8-8" stroke="#e31c79" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-sm font-medium text-white mb-3">
                {status === 'clearing' ? 'Clearing session...' : 'Signing out...'}
              </p>
              <div className="w-full rounded-full overflow-hidden" style={{ height: '2px', background: 'rgba(229, 221, 216, 0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: '#e31c79' }} />
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mb-5">
                <path d="M4 10.5l4 4L16 6" stroke="#d3ad6b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm font-medium text-white mb-2">Signed out</p>
              <p className="text-xs" style={{ color: '#6b6360' }}>Redirecting to login...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="text-sm font-medium text-white mb-2">Logout issue</p>
              {errorMessage && <p className="text-xs mb-3" style={{ color: '#e31c79' }}>{errorMessage}</p>}
              <p className="text-xs" style={{ color: '#6b6360' }}>Redirecting...</p>
            </>
          )}

          {(status === 'success' || status === 'error') && (
            <button onClick={() => (window.location.href = '/auth/login')}
              className="w-full mt-6 py-3 px-5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
              style={{ background: 'rgba(229, 221, 216, 0.08)', border: '1px solid rgba(229, 221, 216, 0.12)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(229, 221, 216, 0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(229, 221, 216, 0.08)'; }}>
              Go to Login
            </button>
          )}
        </div>
        <p className="text-center text-xs mt-6" style={{ color: '#6b6360' }}>W|E Always Find a Way.</p>
      </div>
    </div>
  );
}

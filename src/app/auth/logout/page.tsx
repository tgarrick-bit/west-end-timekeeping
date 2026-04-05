'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function LogoutPage() {
  const [done, setDone] = useState(false);
  const supabase = createClient();

  const handleLogout = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        ['session', 'user', 'lastActivity', 'currentProject', 'remember', 'role'].forEach(k => {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key?.includes(k)) localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
      }
      await supabase.auth.signOut();
    } catch {}
    setDone(true);
    setTimeout(() => { window.location.href = '/auth/login'; }, 1500);
  }, [supabase]);

  useEffect(() => { handleLogout(); }, [handleLogout]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0a0a0a' }}>
      <div className="absolute pointer-events-none" style={{
        top: '-20%', right: '-15%', width: '60%', height: '140%',
        background: 'radial-gradient(ellipse at center, rgba(227,28,120,0.14) 0%, rgba(227,28,120,0.05) 40%, transparent 65%)',
      }} />

      <div className="relative z-10 w-[360px] mx-4 text-center">
        <div className="mx-auto mb-5" style={{ width: 180, height: 50 }}>
          <Image src="/WE-logo-SEPT2024v3-WHT.png" alt="West End Workforce" width={180} height={50} className="w-full h-full object-contain" priority />
        </div>

        {!done ? (
          <>
            <div className="w-4 h-4 border-2 border-[rgba(227,28,120,0.3)] border-t-[#e31c79] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[12px]" style={{ color: 'rgba(232,232,232,0.35)' }}>Signing out...</p>
          </>
        ) : (
          <>
            <p className="text-[14px] font-medium mb-2" style={{ color: '#e8e8e8' }}>Signed out</p>
            <p className="text-[12px]" style={{ color: 'rgba(232,232,232,0.35)' }}>Redirecting to login...</p>
          </>
        )}

        <button onClick={() => (window.location.href = '/auth/login')}
          className="mt-6 transition-all duration-200" style={{
            padding: '10px 20px', fontSize: 12, fontWeight: 500, color: 'rgba(232,232,232,0.5)',
            background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
          Go to login
        </button>
      </div>
    </div>
  );
}

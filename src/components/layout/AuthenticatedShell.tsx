'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from './AppShell';
import type { UserRole } from './Sidebar';

interface Props {
  children: React.ReactNode;
  role: UserRole;
}

export function AuthenticatedShell({ children, role }: Props) {
  const { employee, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-4 h-4 border-2 border-[#e8e4df] border-t-[#e31c79] rounded-full animate-spin" />
          <p style={{ fontSize: 12, color: '#ccc' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      role={role}
      userName={employee?.first_name}
      userEmail={employee?.email}
      onSignOut={async () => { await signOut(); router.push('/auth/login'); }}
    >
      {children}
    </AppShell>
  );
}

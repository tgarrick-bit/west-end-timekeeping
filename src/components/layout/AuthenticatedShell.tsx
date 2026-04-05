'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from './AppShell';
import type { UserRole } from './Sidebar';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface AuthenticatedShellProps {
  children: React.ReactNode;
  role: UserRole;
  showBottomNav?: boolean;
}

export function AuthenticatedShell({ children, role, showBottomNav = false }: AuthenticatedShellProps) {
  const { employee, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <AppShell
      role={role}
      userName={employee?.first_name}
      userEmail={employee?.email}
      onSignOut={async () => {
        await signOut();
        router.push('/auth/login');
      }}
      showBottomNav={showBottomNav}
    >
      {children}
    </AppShell>
  );
}

'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthenticatedShell } from '@/components/layout/AuthenticatedShell';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthenticatedShell role="client_approver">
        {children}
      </AuthenticatedShell>
    </AuthProvider>
  );
}

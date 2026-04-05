'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthenticatedShell } from '@/components/layout/AuthenticatedShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthenticatedShell role="admin">
        {children}
      </AuthenticatedShell>
    </AuthProvider>
  );
}

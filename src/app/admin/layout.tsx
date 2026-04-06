'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminFilterProvider } from '@/contexts/AdminFilterContext';
import { AuthenticatedShell } from '@/components/layout/AuthenticatedShell';
import { AdminNav } from '@/components/layout/AdminNav';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminFilterProvider>
        <AuthenticatedShell role="admin">
          <AdminNav />
          {children}
        </AuthenticatedShell>
      </AdminFilterProvider>
    </AuthProvider>
  );
}

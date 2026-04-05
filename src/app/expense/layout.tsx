'use client';
import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthenticatedShell } from '@/components/layout/AuthenticatedShell';

export default function ExpenseLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthenticatedShell role="employee">
        {children}
      </AuthenticatedShell>
    </AuthProvider>
  );
}

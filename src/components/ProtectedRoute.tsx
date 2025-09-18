'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

type Props = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
};

// Coerce anything into a valid UserRole; fallback to 'employee'
function toUserRole(role: unknown): UserRole {
  const r = typeof role === 'string' ? role : '';
  const valid = ['employee', 'manager', 'admin', 'client_approver', 'payroll'] as const;
  return (valid as readonly string[]).includes(r as any) ? (r as UserRole) : 'employee';
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, employee } = useAuth();
  const router = useRouter();

  // prefer employee.role, then user.role, then fallback
  const role: UserRole = toUserRole((employee as any)?.role ?? (user as any)?.role);

  useEffect(() => {
    if (isLoading) return;

    // Not logged in → send to login
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    // Logged in but role not allowed → unauthorized
    if (!allowedRoles.includes(role)) {
      router.replace('/unauthorized');
    }
  }, [isLoading, user, role, allowedRoles, router]);

  // While loading or redirecting, render nothing
  if (isLoading) return null;
  if (!user) return null;
  if (!allowedRoles.includes(role)) return null;

  return <>{children}</>;
}

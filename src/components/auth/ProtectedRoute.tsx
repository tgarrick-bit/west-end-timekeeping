'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type UserRole = 'employee' | 'manager' | 'admin' | 'time_approver';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

function toUserRole(role?: string | null): UserRole {
  if (role === 'admin' || role === 'manager' || role === 'time_approver') {
    return role;
  }
  return 'employee';
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, employee } = useAuth();
  const router = useRouter();

  // prefer employee.role, then user.role, then fallback
  const role: UserRole = toUserRole((employee as any)?.role ?? (user as any)?.role);

  useEffect(() => {
    // Not logged in → send to login
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    // If specific roles are required, check them
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(role)) {
        // Not authorized for this page, redirect to appropriate dashboard
        if (role === 'admin') {
          router.replace('/admin');
        } else if (role === 'manager') {
          router.replace('/manager');
        } else {
          router.replace('/dashboard');
        }
      }
    }
  }, [user, employee, role, allowedRoles, router]);

  // Don't render children until we confirm user is authorized
  if (!user) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}

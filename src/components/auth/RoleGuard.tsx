'use client';

// src/components/auth/RoleGuard.tsx

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { UserRole, Employee } from '@/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export default function RoleGuard({ 
  children, 
  allowedRoles, 
  redirectTo = '/auth/login' 
}: RoleGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      console.log('RoleGuard: Checking authorization for roles:', allowedRoles);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('RoleGuard: No session found, redirecting to login');
        router.push('/auth/login');
        return;
      }

      console.log('RoleGuard: Session found for user:', session.user.id);

      // Get employee data
      const { data: employeeData, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !employeeData) {
        console.error('RoleGuard: Error fetching employee:', error);
        
        // Try fetching by email as fallback
        const { data: employeeByEmail } = await supabase
          .from('employees')
          .select('*')
          .eq('email', session.user.email!)
          .single();

        if (!employeeByEmail) {
          console.log('RoleGuard: No employee profile found');
          router.push('/auth/login');
          return;
        }

        setEmployee(employeeByEmail as Employee);
        checkRoleAndRedirect(employeeByEmail as Employee);
        return;
      }

      console.log('RoleGuard: Employee found:', employeeData.email, 'Role:', employeeData.role);
      setEmployee(employeeData as Employee);
      checkRoleAndRedirect(employeeData as Employee);

    } catch (error) {
      console.error('RoleGuard: Unexpected error:', error);
      router.push('/auth/login');
    }
  };

  const checkRoleAndRedirect = (employeeData: Employee) => {
    const userRole = employeeData.role.toLowerCase() as UserRole;
    
    if (!employeeData.is_active) {
      console.log('RoleGuard: Employee is inactive');
      router.push('/auth/login');
      return;
    }

    if (allowedRoles.includes(userRole)) {
      console.log('RoleGuard: User authorized');
      setIsAuthorized(true);
      setIsLoading(false);
    } else {
      console.log('RoleGuard: User not authorized for this page, redirecting based on role');
      
      // Redirect to appropriate dashboard based on role
      switch (userRole) {
        case 'admin':
          router.push('/admin');
          break;
        case 'manager':
          router.push('/manager');
          break;
        case 'employee':
        default:
          router.push('/dashboard');
          break;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-white">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-white">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
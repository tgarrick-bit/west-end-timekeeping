'use client';

// src/components/auth/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/supabase-js';
import type { Employee, UserRole } from '@/types';
import type { Database } from '@/types/supabase';

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshEmployee: () => Promise<void>;
  checkRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

  // Fetch employee data
  const fetchEmployee = async (userId: string) => {
    try {
      console.log('Fetching employee data for user:', userId);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching employee:', error);
        // Try to fetch by email as fallback
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.email) {
          const { data: employeeByEmail } = await supabase
            .from('employees')
            .select('*')
            .eq('email', userData.user.email)
            .single();
          
          if (employeeByEmail) {
            setEmployee(employeeByEmail);
            return employeeByEmail;
          }
        }
        setError('Employee profile not found');
        return null;
      }

      console.log('Employee data fetched:', data);
      setEmployee(data);
      return data;
    } catch (err) {
      console.error('Unexpected error fetching employee:', err);
      setError('Failed to fetch employee profile');
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          await fetchEmployee(session.user.id);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (session?.user) {
        setUser(session.user);
        if (event === 'SIGNED_IN') {
          await fetchEmployee(session.user.id);
        }
      } else {
        setUser(null);
        setEmployee(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'No user returned from sign in' };
      }

      // Fetch employee data
      const employeeData = await fetchEmployee(data.user.id);
      
      if (!employeeData) {
        return { success: false, error: 'Employee profile not found. Please contact administrator.' };
      }

      // Route based on role
      const role = employeeData.role.toLowerCase() as UserRole;
      console.log('User role:', role);
      
      switch (role) {
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

      return { success: true };
    } catch (err) {
      console.error('Unexpected sign in error:', err);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setEmployee(null);
      router.push('/auth/login');
    } catch (err) {
      console.error('Sign out error:', err);
      setError('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const refreshEmployee = async () => {
    if (user) {
      await fetchEmployee(user.id);
    }
  };

  const checkRole = (allowedRoles: UserRole[]) => {
    if (!employee) return false;
    return allowedRoles.includes(employee.role as UserRole);
  };

  const value = {
    user,
    employee,
    loading,
    error,
    signIn,
    signOut,
    refreshEmployee,
    checkRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
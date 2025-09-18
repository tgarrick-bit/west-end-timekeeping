'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department?: string;
  hourly_rate?: number;
  overtime_rate?: number;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  employee: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Demo users for testing - these should match what's in your Supabase
const DEMO_USERS = {
  'admin@westend-test.com': {
    password: 'TestDemo123!',
    role: 'admin',
    name: 'Admin Demo'
  },
  'manager@westend-test.com': {
    password: 'TestDemo123!',
    role: 'manager',
    name: 'Manager Demo'
  },
  'employee@westend-test.com': {
    password: 'TestDemo123!',
    role: 'employee',
    name: 'Employee Demo'
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        
        // Fetch employee data from database
        const { data: employeeData, error } = await supabase
          .from('employees')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (!error && employeeData) {
          setEmployee(employeeData);
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Check if it's a demo user first
      const demoUser = DEMO_USERS[email as keyof typeof DEMO_USERS];
      
      if (demoUser && password === demoUser.password) {
        // For demo users, try Supabase auth first
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.user) {
          // Fetch the employee data
          const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .select('*')
            .eq('email', email)
            .single();

          if (!employeeError && employeeData) {
            setUser(data.user);
            setEmployee(employeeData);
            
            // Route based on role
            const role = employeeData.role || demoUser.role;
            if (role === 'admin') {
              router.push('/admin/dashboard');
            } else if (role === 'manager' || role === 'approver') {
              router.push('/manager/pending');
            } else {
              router.push('/dashboard');
            }
            return;
          }
        }
      }
      
      // For non-demo users, use regular Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch the actual employee data from database
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', email)
          .single();

        if (employeeError) {
          console.error('Employee fetch error:', employeeError);
          throw new Error('Employee record not found');
        }

        setUser(data.user);
        setEmployee(employeeData);
        
        // Route based on actual role from database
        const role = employeeData.role || 'employee';
        
        if (role === 'admin') {
          router.push('/admin/dashboard');
        } else if (role === 'manager' || role === 'approver') {
          router.push('/manager/pending');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setEmployee(null);
      router.push('/auth/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, employee, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
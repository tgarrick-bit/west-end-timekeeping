'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

// Define types inline if not available in external files
type UserRole = 'admin' | 'manager' | 'employee';

interface Employee {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  first_name?: string;
  last_name?: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [cooldown, setCooldown] = useState<number>(0);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  // Debug helper function
  const addDebugInfo = (info: string) => {
    if (process.env.NODE_ENV === 'development') {
      setDebugInfo(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]}: ${info}`]);
      console.log(`[Auth Debug] ${info}`);
    }
  };

  // Role-based redirect function
  const redirectBasedOnRole = (role: UserRole, employeeName?: string) => {
    addDebugInfo(`Redirecting ${employeeName || 'user'} with role: ${role}`);
    
    // Store role in localStorage for client-side checks
    if (typeof window !== 'undefined') {
      localStorage.setItem('userRole', role);
    }

    switch (role.toLowerCase()) {
      case 'admin':
        router.push('/admin');
        break;
      case 'manager':
        router.push('/manager');
        break;
      case 'employee':
      default:
        router.push('/employee'); 
        break;
    }
  };

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          addDebugInfo(`Found existing session for user: ${session.user.email}`);
          
          const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('id, email, role, is_active, first_name, last_name')
            .eq('id', session.user.id)
            .single();

          if (!employeeError && employee && employee.is_active) {
            const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ');
            redirectBasedOnRole(employee.role as UserRole, fullName);
          } else {
            // Clear invalid session
            await supabase.auth.signOut();
            addDebugInfo('Cleared invalid session');
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    };

    checkExistingSession();
  }, [supabase, router]);

  // Main sign-in handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before trying again`);
      return;
    }

    setError(null);
    setLoading(true);
    setDebugInfo([]);

    try {
      addDebugInfo(`Attempting login for: ${email}`);

      // Attempt authentication
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      // Handle authentication errors
      if (authError) {
        addDebugInfo(`Auth error: ${authError.message}`);
        
        // Check for rate limiting
        if (authError.message?.toLowerCase().includes('rate limit') || 
            authError.message?.toLowerCase().includes('too many')) {
          setError('Too many login attempts. Please wait before trying again.');
          setCooldown(60);
        } 
        // Check for invalid credentials
        else if (authError.message?.toLowerCase().includes('invalid')) {
          setError('Invalid email or password. Please try again.');
        } 
        // Generic error
        else {
          setError(authError.message || 'Authentication failed. Please try again.');
        }
        
        setLoading(false);
        return;
      }

      // Verify we have user data
      if (!authData?.user) {
        addDebugInfo('No user data returned from authentication');
        setError('Authentication failed. Please try again.');
        setLoading(false);
        return;
      }

      addDebugInfo(`Auth successful for user ID: ${authData.user.id}`);

      // Fetch employee record
      let employee: Employee | null = null;
      let employeeError: any = null;

      // First try to fetch by auth user ID
      const { data: employeeById, error: errorById } = await supabase
        .from('employees')
        .select('id, email, role, is_active, first_name, last_name')
        .eq('id', authData.user.id)
        .single();

      if (employeeById) {
        employee = employeeById;
      } else {
        employeeError = errorById;
        addDebugInfo(`Employee not found by ID, trying email lookup`);
        
        // Fallback to email lookup
        const { data: employeeByEmail, error: errorByEmail } = await supabase
          .from('employees')
          .select('id, email, role, is_active, first_name, last_name')
          .eq('email', email.trim().toLowerCase())
          .single();

        if (employeeByEmail) {
          employee = employeeByEmail;
        } else {
          employeeError = errorByEmail;
        }
      }

      // Handle missing employee record
      if (!employee) {
        addDebugInfo(`No employee record found: ${employeeError?.message}`);
        setError('Your employee profile was not found. Please contact your administrator.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Check if account is active
      if (!employee.is_active) {
        addDebugInfo('Employee account is inactive');
        setError('Your account has been deactivated. Please contact your administrator.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Store remember me preference
      if (rememberMe && typeof window !== 'undefined') {
        localStorage.setItem('rememberEmail', email);
      } else if (typeof window !== 'undefined') {
        localStorage.removeItem('rememberEmail');
      }

      // Success - redirect based on role
      const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(' ');
      addDebugInfo(`Login successful for ${fullName || email}`);
      redirectBasedOnRole(employee.role as UserRole, fullName);

    } catch (err) {
      console.error('Unexpected login error:', err);
      addDebugInfo(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      setError('An unexpected error occurred. Please try again later.');
      setLoading(false);
    }
  };

  // Quick fill helper for demo accounts
  const quickFillCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('TestDemo123!');
    setError(null);
  };

  // Load remembered email on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rememberedEmail = localStorage.getItem('rememberEmail');
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#05202E] to-[#0a3044]">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            {/* WE Logo - White version for dark background */}
            <img 
              src="/WE-logo-SEPT2024v3-WHT.png" 
              alt="West End Workforce Logo" 
              className="h-20 w-auto"
              onError={(e) => {
                // Fallback if logo doesn't load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            {/* Fallback if logo doesn't load */}
            <div className="hidden w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">WE</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">West End Workforce</h1>
          <p className="text-gray-300 text-sm">Time Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>

          <form onSubmit={handleSignIn} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || cooldown > 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#e31c79] focus:border-[#e31c79] disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="you@example.com"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || cooldown > 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#e31c79] focus:border-[#e31c79] disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading || cooldown > 0}
                  className="h-4 w-4 text-[#e31c79] focus:ring-[#e31c79] border-gray-300 rounded disabled:cursor-not-allowed"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <a href="/auth/forgot-password" className="text-sm text-[#e31c79] hover:text-[#c91865]">
                Forgot password?
              </a>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 20 20">
                      <path fill="currentColor" fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                    {cooldown > 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        Please wait {cooldown} seconds before trying again.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#e31c79] hover:bg-[#c91865] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : cooldown > 0 ? (
                `Please wait (${cooldown}s)`
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 rounded-md p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">Demo Accounts for Testing:</p>
              <div className="space-y-2">
                {/* Admin Account */}
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-semibold text-gray-700">Admin:</span>
                    <span className="ml-2 font-mono text-gray-600">admin@westend-test.com</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => quickFillCredentials('admin@westend-test.com')}
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
                  >
                    Use
                  </button>
                </div>

                {/* Manager Account */}
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-semibold text-gray-700">Manager:</span>
                    <span className="ml-2 font-mono text-gray-600">manager@westend-test.com</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => quickFillCredentials('manager@westend-test.com')}
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
                  >
                    Use
                  </button>
                </div>

                {/* Employee Account */}
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-semibold text-gray-700">Employee:</span>
                    <span className="ml-2 font-mono text-gray-600">employee@westend-test.com</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => quickFillCredentials('employee@westend-test.com')}
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors"
                  >
                    Use
                  </button>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Password for all accounts: <span className="font-mono font-semibold">TestDemo123!</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Debug Info (Development Only) */}
          {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
            <div className="mt-4 p-3 bg-gray-100 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-semibold text-gray-600">Debug Log:</p>
                <button
                  type="button"
                  onClick={() => setDebugInfo([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              <div className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto font-mono">
                {debugInfo.slice(-5).map((info, index) => (
                  <div key={index} className="truncate">
                    {info}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
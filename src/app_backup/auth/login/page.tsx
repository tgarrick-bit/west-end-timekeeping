'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setDebugInfo('Starting login...');
    setLoading(true);

    try {
      console.log('Attempting login with:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      
      console.log('Auth response:', { data, error });
      
      if (error) {
        console.error('Login error:', error);
        setDebugInfo(`Auth error: ${error.message}`);
        throw error;
      }

      if (data?.user) {
        console.log('Login successful for user:', data.user.id);
        setDebugInfo('Login successful! Checking profile...');
        
        // Check if profiles table exists and has data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        console.log('Profile lookup:', { profile, profileError });
        
        if (profileError) {
          console.warn('Profile lookup failed:', profileError);
          setDebugInfo(`Profile error: ${profileError.message}. Redirecting to dashboard anyway...`);
          // Still redirect even if profile lookup fails
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        } else {
          setDebugInfo(`Found role: ${profile?.role}. Redirecting...`);
          
          // Redirect based on role
          setTimeout(() => {
            if (profile?.role === 'manager' || profile?.role === 'time_approver') {
              router.push('/manager/pending');
            } else {
              router.push('/dashboard');
            }
          }, 1000);
        }
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Invalid email or password');
      setDebugInfo('');
    } finally {
      setLoading(false);
    }
  };

  // Test connection button
  const testConnection = async () => {
    setDebugInfo('Testing Supabase connection...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setDebugInfo(`Already logged in as: ${user.email}`);
        router.push('/dashboard');
      } else {
        setDebugInfo('Not logged in. Connection successful.');
      }
    } catch (err: any) {
      setDebugInfo(`Connection error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#05202E]">West End Workforce</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent outline-none transition"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent outline-none transition"
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          {debugInfo && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              Debug: {debugInfo}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#c91865] transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button
          onClick={testConnection}
          className="mt-4 w-full py-2 px-4 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition"
        >
          Test Supabase Connection
        </button>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Demo Accounts:</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Employee: employee@demo.com / Demo123!</p>
            <p>Manager: manager@demo.com / Demo123!</p>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 text-center">
          Check browser console for detailed logs
        </div>
      </div>
    </div>
  );
}
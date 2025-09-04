'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LogOut, CheckCircle, Loader2, AlertCircle, Shield } from 'lucide-react';

type LogoutStatus = 'logging-out' | 'success' | 'error' | 'clearing';

interface LogoutStats {
  sessionDuration?: string;
  lastActivity?: string;
}

export default function LogoutPage() {
  const [status, setStatus] = useState<LogoutStatus>('clearing');
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState<LogoutStats>({});
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Calculate session statistics
  const calculateSessionStats = useCallback(() => {
    if (typeof window !== 'undefined') {
      const loginTime = localStorage.getItem('sessionStartTime');
      const lastActivity = localStorage.getItem('lastActivity');
      
      if (loginTime) {
        const duration = Date.now() - parseInt(loginTime);
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        
        setStats({
          sessionDuration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`,
          lastActivity: lastActivity ? new Date(parseInt(lastActivity)).toLocaleTimeString() : undefined
        });
      }
    }
  }, []);

  // Clear all application data
  const clearApplicationData = useCallback(async () => {
    setStatus('clearing');
    setProgress(10);

    try {
      if (typeof window !== 'undefined') {
        // Clear all localStorage items with your app prefix
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            // Add keys that belong to your application
            if (key.includes('session') || 
                key.includes('user') || 
                key.includes('lastActivity') || 
                key.includes('currentProject') ||
                key.includes('remember') ||
                key.includes('role')) {
              keysToRemove.push(key);
            }
          }
        }
        
        setProgress(30);
        
        // Remove identified keys
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear sessionStorage as well
        sessionStorage.clear();
        
        setProgress(50);
        
        // Clear any cookies if you're using them
        if (document.cookie) {
          document.cookie.split(";").forEach((c) => {
            document.cookie = c
              .replace(/^ +/, "")
              .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
          });
        }
      }
      
      setProgress(70);
    } catch (error) {
      console.error('Error clearing application data:', error);
    }
  }, []);

  // Main logout handler
  const handleLogout = useCallback(async () => {
    try {
      // First calculate stats before clearing
      calculateSessionStats();
      
      // Clear application data
      await clearApplicationData();
      
      setStatus('logging-out');
      setProgress(80);
      
      // Get current session before signing out (for audit logging)
      const { data: { session } } = await supabase.auth.getSession();
      
      // Log the logout event (if you have an audit table)
      if (session?.user?.id) {
        try {
          await supabase.from('audit_logs').insert({
            user_id: session.user.id,
            action: 'logout',
            timestamp: new Date().toISOString(),
            metadata: {
              session_duration: stats.sessionDuration,
              method: 'manual' // vs 'timeout' or 'forced'
            }
          });
        } catch (auditError) {
          console.error('Audit log error:', auditError);
          // Don't block logout if audit fails
        }
      }
      
      setProgress(90);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        setErrorMessage(error.message);
        setStatus('error');
        
        // Force redirect even on error
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 2000);
      } else {
        setProgress(100);
        setStatus('success');
        
        // Use location.href for a hard redirect to clear any React state
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 1500);
      }
    } catch (err) {
      console.error('Unexpected logout error:', err);
      setStatus('error');
      setErrorMessage('An unexpected error occurred during logout');
      
      // Force redirect on any error
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 2000);
    }
  }, [supabase, clearApplicationData, calculateSessionStats, stats.sessionDuration]);

  // Run logout on mount
  useEffect(() => {
    handleLogout();
  }, [handleLogout]);

  // Prevent back button after logout
  useEffect(() => {
    if (status === 'success') {
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = () => {
        window.history.go(1);
      };
    }
  }, [status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#05202E] to-[#0a3044]">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="text-center">
            {(status === 'clearing' || status === 'logging-out') && (
              <>
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4 relative">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {status === 'clearing' ? 'Clearing Session Data' : 'Logging Out'}
                </h2>
                <p className="text-gray-600 mb-4">
                  Please wait while we securely log you out...
                </p>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-[#e31c79] h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-center text-xs text-gray-500">
                  <Shield className="h-3 w-3 mr-1" />
                  Secure logout in progress
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Successfully Logged Out
                </h2>
                <p className="text-gray-600 mb-4">
                  You have been securely logged out of your account.
                </p>
                
                {/* Session stats */}
                {(stats.sessionDuration || stats.lastActivity) && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Session Summary</p>
                    {stats.sessionDuration && (
                      <p className="text-xs text-gray-600">
                        Duration: {stats.sessionDuration}
                      </p>
                    )}
                    {stats.lastActivity && (
                      <p className="text-xs text-gray-600">
                        Last activity: {stats.lastActivity}
                      </p>
                    )}
                  </div>
                )}
                
                <p className="text-sm text-gray-500">
                  Redirecting to login page...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Logout Issue
                </h2>
                <p className="text-gray-600 mb-2">
                  We encountered an issue, but your session will be terminated.
                </p>
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-700">
                      {errorMessage}
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-500">
                  Redirecting to login page...
                </p>
              </>
            )}
          </div>

          {/* Manual redirect button */}
          {status !== 'clearing' && status !== 'logging-out' && (
            <div className="mt-6">
              <button
                onClick={() => window.location.href = '/auth/login'}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#e31c79] hover:bg-[#c91865] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] transition-colors"
              >
                {status === 'success' ? 'Return to Login' : 'Go to Login Page'}
              </button>
            </div>
          )}

          {/* Security notice */}
          {status === 'success' && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex">
                <Shield className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="ml-2">
                  <p className="text-xs text-blue-800 font-medium">Security Tip</p>
                  <p className="text-xs text-blue-700 mt-1">
                    For additional security, close this browser tab or window after logging out.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-300">
            West End Workforce
          </p>
          <p className="text-xs text-gray-400">
            Time Management System © {new Date().getFullYear()}
            </p>
        </div>
      </div>
    </div>
  );
}
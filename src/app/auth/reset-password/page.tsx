'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Mail, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  KeyRound,
  Info,
  RefreshCw
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  // Load attempt count from localStorage
  useEffect(() => {
    const storedAttempts = localStorage.getItem('passwordResetAttempts');
    if (storedAttempts) {
      const attempts = JSON.parse(storedAttempts);
      const now = Date.now();
      // Reset if more than 1 hour has passed
      if (attempts.timestamp && now - attempts.timestamp > 3600000) {
        localStorage.removeItem('passwordResetAttempts');
      } else {
        setAttemptCount(attempts.count || 0);
      }
    }
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email format
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check for too many attempts
    if (attemptCount >= 5) {
      setError('Too many reset attempts. Please contact your administrator or try again later.');
      return;
    }

    setLoading(true);

    try {
      // Check if email exists in the system first
      const { data: employee } = await supabase
        .from('employees')
        .select('email, is_active')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (!employee) {
        // Don't reveal if email exists or not for security
        setSubmitted(true);
        setResendCooldown(60); // 60 second cooldown
      } else if (!employee.is_active) {
        setError('This account is inactive. Please contact your administrator.');
        setLoading(false);
        return;
      } else {
        // Send reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.toLowerCase().trim(),
          {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          }
        );

        if (resetError) {
          // Handle specific error types
          if (resetError.message.includes('rate limit')) {
            setError('Too many requests. Please wait a few minutes and try again.');
            setResendCooldown(180); // 3 minute cooldown
          } else {
            setError('Failed to send reset email. Please try again or contact support.');
          }
        } else {
          setSubmitted(true);
          setResendCooldown(60); // 60 second cooldown before allowing resend
          
          // Update attempt count
          const newCount = attemptCount + 1;
          setAttemptCount(newCount);
          localStorage.setItem('passwordResetAttempts', JSON.stringify({
            count: newCount,
            timestamp: Date.now()
          }));
        }
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    setSubmitted(false);
    await handleSubmit(new Event('submit') as any);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#05202E] to-[#0a3044]">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Check Your Email
              </h2>
              <p className="text-gray-600 mb-4">
                If an account exists for this email, we've sent password reset instructions to:
              </p>
              <div className="bg-gray-50 rounded-lg px-4 py-2 mb-6">
                <p className="font-mono text-sm font-medium text-gray-900 break-all">
                  {email}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mb-6">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">
                      Important Notes:
                    </p>
                    <ul className="mt-2 text-sm text-blue-800 space-y-1">
                      <li>• Check your spam or junk folder</li>
                      <li>• The link expires in 1 hour</li>
                      <li>• Only the most recent link will work</li>
                      <li>• Contact support if you don't receive it within 5 minutes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {resendCooldown > 0 
                      ? `Resend available in ${resendCooldown}s` 
                      : 'Resend Email'
                    }
                  </span>
                </button>

                <button
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                    setError(null);
                  }}
                  className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79]"
                >
                  Try Another Email
                </button>

                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#e31c79] hover:bg-[#c91865] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-300">
              Need immediate help? Contact support:
            </p>
            <a 
              href="mailto:support@westendworkforce.com" 
              className="text-xs text-white hover:text-gray-200"
            >
              support@westendworkforce.com
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#05202E] to-[#0a3044]">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
            <KeyRound className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">West End Workforce</h1>
          <p className="text-gray-300 text-sm">Password Recovery</p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Forgot Your Password?
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error
                  </h3>
                  <div className="mt-1 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#e31c79] focus:border-[#e31c79] sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="you@example.com"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Enter the email address associated with your account
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || attemptCount >= 5}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#e31c79] hover:bg-[#c91865] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Instructions...
                  </>
                ) : attemptCount >= 5 ? (
                  'Too Many Attempts'
                ) : (
                  'Send Reset Instructions'
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">
                Password Requirements:
              </h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Include uppercase and lowercase letters</li>
                <li>• Include at least one number</li>
                <li>• Include at least one special character</li>
              </ul>
            </div>
          </div>

          {attemptCount > 0 && attemptCount < 5 && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Reset attempts: {attemptCount}/5
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
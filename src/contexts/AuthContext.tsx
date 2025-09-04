'use client';

// Shim adapter: keep old imports working by re-exporting the new context
// and providing legacy names (appUser, logout, isLoading).

export { AuthProvider } from '@/components/auth/AuthContext';

import { useAuth as useNewAuth } from '@/components/auth/AuthContext';

export const useAuth = () => {
  const ctx = useNewAuth();
  // Map legacy names expected in older components
  return {
    ...ctx,
    appUser: ctx.employee,   // legacy alias
    logout: ctx.signOut,     // legacy alias
    isLoading: ctx.loading,  // legacy alias
  };
};


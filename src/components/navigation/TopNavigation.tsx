'use client';

import React from 'react';
import Image from 'next/image';  // Add this import
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

function getRoleColor(role: UserRole | string) {
  switch (role) {
    case 'admin':
      return 'from-purple-500 to-purple-700';
    case 'manager':
      return 'from-blue-500 to-blue-700';
    case 'client_approver':
      return 'from-emerald-500 to-emerald-700';
    case 'payroll':
      return 'from-amber-500 to-amber-700';
    default:
      return 'from-slate-500 to-slate-700';
  }
}

type MaybeNamed = {
  first_name?: string | null;
  last_name?: string | null;
  role?: UserRole | string;
};

export default function TopNavigation() {
  const { user, employee } = useAuth();

  // Prefer employee profile fields, fallback to user
  const profile: MaybeNamed = (employee as MaybeNamed) ?? (user as MaybeNamed) ?? {};
  const first = profile.first_name ?? '';
  const last = profile.last_name ?? '';
  const emailInitial = (user?.email?.[0] ?? '').toUpperCase();

  const initials =
    (first || last)
      ? `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
      : emailInitial || 'U';

  const role: UserRole = (profile.role as UserRole) ?? 'employee';

  return (
    <div className="w-full bg-[#05202E] text-white">  {/* Changed to dark blue background */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Replace the text with the logo */}
        <div className="flex items-center space-x-3">
          <Image
            src="/WE-logo-SEPT2024v3-WHT.png"
            alt="West End Workforce"
            width={180}
            height={50}
            className="h-8 w-auto"
            priority
          />
          <span className="text-sm text-gray-300 border-l border-gray-600 pl-3">
            Employee Portal
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 bg-gradient-to-r ${getRoleColor(
              role
            )} rounded-full flex items-center justify-center text-white font-semibold`}
            aria-label={`User role: ${role.replace(/_/g, ' ')}`}
          >
            {initials}
          </div>

          <div className="hidden sm:block">
            <div className="text-sm font-medium text-white">  {/* Changed to white */}
              {(first || last) ? `${first} ${last}`.trim() : user?.email ?? 'User'}
            </div>
            <div className="text-xs text-gray-300 capitalize">  {/* Changed to gray-300 */}
              {role.replace(/_/g, ' ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

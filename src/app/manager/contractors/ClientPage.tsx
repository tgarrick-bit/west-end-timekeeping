'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Users } from 'lucide-react';

export default function ContractorsIndexClient() {
  const router = useRouter();
  const { user } = useAuth() as any;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-[#232020] flex items-center gap-2">
        <Users className="w-6 h-6 text-[#e31c79]" />
        Contractors
      </h1>
      <p className="text-sm text-[#465079] mt-1">
        Signed in as {user?.email ?? 'manager'}.
      </p>

      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
        <button
          onClick={() => router.push('/manager')}
          className="px-4 py-2 bg-[#05202E] text-white rounded-lg hover:bg-[#0a2f3f] transition-colors"
        >
          Back to Manager
        </button>
      </div>
    </main>
  );
}

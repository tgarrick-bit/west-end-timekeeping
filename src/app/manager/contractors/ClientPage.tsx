'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Users, ArrowLeft } from 'lucide-react';

export default function ContractorsIndexClient() {
  const router = useRouter();
  const { user } = useAuth() as any;

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
          Contractors
        </h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#bbb', marginTop: 4 }}>
          Signed in as {user?.email ?? 'manager'}
        </p>
      </div>

      <div
        style={{
          background: '#fff',
          border: '0.5px solid #e8e4df',
          borderRadius: 10,
          padding: 24,
        }}
      >
        <button
          onClick={() => router.push('/manager')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'white',
            border: '0.5px solid #e0dcd7',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 500,
            color: '#777',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Manager
        </button>
      </div>
    </div>
  );
}

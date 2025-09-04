// REPLACE THE ENTIRE FILE'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SupervisorDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to pending approvals - this is now the PRIMARY view
    router.replace('/dashboard/supervisor/pending');
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '400px' 
    }}>
      <p>Redirecting to pending approvals...</p>
    </div>
  );
}
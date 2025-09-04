'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManagerPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/manager/pending');
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
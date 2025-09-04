'use client';

import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function TestLogin() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const loginEmployee = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'employee@westendworkforce.com',
      password: 'Employee123!'
    });
    
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Success! Redirecting...');
      router.push('/dashboard');
    }
  };

  const loginManager = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'manager@westendworkforce.com',
      password: 'Manager123!'
    });
    
    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Success! Redirecting...');
      router.push('/manager/pending');
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Quick Test Login</h1>
      <button 
        onClick={loginEmployee}
        style={{
          padding: '10px 20px',
          margin: '10px',
          backgroundColor: '#e31c79',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Login as Employee
      </button>
      <button 
        onClick={loginManager}
        style={{
          padding: '10px 20px',
          margin: '10px',
          backgroundColor: '#05202e',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Login as Manager
      </button>
    </div>
  );
}
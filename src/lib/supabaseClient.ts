import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Add retry logic to prevent timeouts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-application-name': 'west-end-timekeeping',
    },
  },
});

// Wrapper to handle timeouts
export async function safeQuery(queryFn: () => Promise<any>) {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Query timeout')), 5000)
  );
  
  try {
    return await Promise.race([queryFn(), timeout]);
  } catch (error) {
    console.error('Query failed:', error);
    throw error;
  }
}
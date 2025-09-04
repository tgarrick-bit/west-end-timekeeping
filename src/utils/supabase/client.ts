import { createBrowserClient } from '@supabase/ssr';

// Export the function to create a Supabase client
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Export a default client instance
export const supabase = createClient();
import { createBrowserClient } from '@supabase/ssr';

// DEMO MODE: Using service role key to bypass all security
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY! // Changed this line
  );
}

export const supabase = createClient();
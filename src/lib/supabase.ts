// src/lib/supabase.ts
// Re-exports for backward compatibility — all code that imports from here still works

import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// For client components (used by expense/[id]/page.tsx and others)
export const createSupabaseClient = () => {
  return createBrowserSupabaseClient()
}

// For server-side operations with service role
export const supabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Default client for general use in client components (lazy to avoid SSR prerender issues)
let _supabase: ReturnType<typeof createBrowserSupabaseClient> | null = null
export const supabase = new Proxy({} as ReturnType<typeof createBrowserSupabaseClient>, {
  get(_target, prop) {
    if (!_supabase) _supabase = createBrowserSupabaseClient()
    return (_supabase as any)[prop]
  }
})

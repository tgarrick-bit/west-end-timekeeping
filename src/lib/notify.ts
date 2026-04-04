// src/lib/notify.ts
// Create in-app notifications for users

import { SupabaseClient } from '@supabase/supabase-js'

interface NotifyParams {
  user_id: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  link?: string
}

/**
 * Create an in-app notification. Fails silently.
 */
export async function createNotification(
  supabase: SupabaseClient,
  params: NotifyParams
): Promise<void> {
  try {
    await supabase.from('in_app_notifications').insert({
      user_id: params.user_id,
      title: params.title,
      message: params.message,
      type: params.type || 'info',
      link: params.link || null,
      is_read: false,
    })
  } catch (err) {
    console.error('In-app notification failed (non-blocking):', err)
  }
}

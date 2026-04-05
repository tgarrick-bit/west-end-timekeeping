// src/lib/audit.ts
// Convenience wrapper around auditLog.ts for simpler call sites

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Log an audit event. Fails silently -- never blocks the parent operation.
 */
export async function logAudit(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    });
  } catch (err) {
    console.error('Audit log write failed (non-blocking):', err);
  }
}

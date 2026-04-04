// src/lib/auditLog.ts
// Centralized audit trail — call from any API route on status changes

import { SupabaseClient } from '@supabase/supabase-js'

export interface AuditEntry {
  user_id: string          // who performed the action
  action: string           // e.g. 'timesheet.approve', 'expense.reject', 'user.create'
  metadata: {
    entity_type: string    // 'timesheet', 'expense', 'expense_report', 'employee'
    entity_id: string      // the record ID
    old_status?: string
    new_status?: string
    reason?: string        // rejection reason
    employee_id?: string   // the affected employee (for timesheets/expenses)
    [key: string]: any
  }
}

/**
 * Write an audit log entry. Fails silently — never blocks the parent operation.
 */
export async function writeAuditLog(
  supabase: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: entry.user_id,
      action: entry.action,
      timestamp: new Date().toISOString(),
      metadata: entry.metadata,
    })
  } catch (err) {
    console.error('Audit log write failed (non-blocking):', err)
  }
}

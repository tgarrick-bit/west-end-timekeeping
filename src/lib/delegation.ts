// src/lib/delegation.ts
// Check if a user has delegation authority to approve on behalf of another manager

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get all active delegates for a given manager (people who can approve on their behalf).
 */
export async function getDelegatesForManager(
  supabase: SupabaseClient,
  managerId: string
): Promise<string[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('approval_delegations')
    .select('delegate_id')
    .eq('delegator_id', managerId)
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)

  return (data || []).map(d => d.delegate_id)
}

/**
 * Get all managers who have delegated to a given user.
 * Returns the list of manager IDs whose teams this user can approve for.
 */
export async function getDelegationsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('approval_delegations')
    .select('delegator_id')
    .eq('delegate_id', userId)
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)

  return (data || []).map(d => d.delegator_id)
}

/**
 * Check if a user can approve timesheets for a given employee
 * (either they're the direct manager, or they have an active delegation).
 */
export async function canApproveFor(
  supabase: SupabaseClient,
  approverId: string,
  employeeManagerId: string | null
): Promise<boolean> {
  if (!employeeManagerId) return false
  if (approverId === employeeManagerId) return true

  const delegations = await getDelegationsForUser(supabase, approverId)
  return delegations.includes(employeeManagerId)
}

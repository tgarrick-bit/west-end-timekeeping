import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

// GET /api/delegations — list delegations for current user (as delegator or delegate)
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: asManager } = await supabase
    .from('approval_delegations')
    .select(`
      *,
      delegate:employees!approval_delegations_delegate_id_fkey (
        id, first_name, last_name, email
      )
    `)
    .eq('delegator_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const { data: asDelegate } = await supabase
    .from('approval_delegations')
    .select(`
      *,
      delegator:employees!approval_delegations_delegator_id_fkey (
        id, first_name, last_name, email
      )
    `)
    .eq('delegate_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    myDelegations: asManager || [],
    delegatedToMe: asDelegate || [],
  })
}

// POST /api/delegations — create a new delegation
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { delegate_id, start_date, end_date, reason } = body

  if (!delegate_id || !start_date) {
    return NextResponse.json({ error: 'delegate_id and start_date required' }, { status: 400 })
  }

  if (delegate_id === user.id) {
    return NextResponse.json({ error: 'Cannot delegate to yourself' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('approval_delegations')
    .upsert({
      delegator_id: user.id,
      delegate_id,
      start_date,
      end_date: end_date || null,
      reason: reason || null,
      is_active: true,
    }, { onConflict: 'delegator_id,delegate_id,start_date' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ delegation: data })
}

// DELETE /api/delegations — deactivate a delegation
export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('approval_delegations')
    .update({ is_active: false })
    .eq('id', id)
    .eq('delegator_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { generatePeriods, type PayPeriodType } from '@/lib/payPeriods'

// GET /api/pay-periods — list pay periods (optionally filter by date range)
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')

  let query = supabase
    .from('pay_periods')
    .select('*')
    .order('start_date', { ascending: false })

  if (from) query = query.gte('start_date', from)
  if (to) query = query.lte('end_date', to)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ periods: data })
}

// POST /api/pay-periods — generate pay periods for a date range
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check admin role
  const { data: emp } = await supabase
    .from('employees')
    .select('role')
    .eq('id', user.id)
    .single()

  if (emp?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { action } = body

  if (action === 'generate') {
    // Generate periods from company settings
    const { data: settings } = await supabase
      .from('company_settings')
      .select('pay_period_type, pay_period_start_date')
      .single()

    if (!settings) {
      return NextResponse.json({ error: 'Company settings not found' }, { status: 400 })
    }

    const fromDate = body.from || settings.pay_period_start_date
    const toDate = body.to || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0] // 90 days ahead

    const periods = generatePeriods(
      settings.pay_period_type as PayPeriodType,
      settings.pay_period_start_date,
      fromDate,
      toDate
    )

    // Upsert to avoid duplicates
    const { data, error } = await supabase
      .from('pay_periods')
      .upsert(
        periods.map(p => ({
          period_type: p.period_type,
          start_date: p.start_date,
          end_date: p.end_date,
          is_locked: false,
          status: 'open',
        })),
        { onConflict: 'period_type,start_date' }
      )
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ periods: data, generated: periods.length })
  }

  if (action === 'lock') {
    const { periodId } = body
    if (!periodId) {
      return NextResponse.json({ error: 'periodId required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('pay_periods')
      .update({
        is_locked: true,
        locked_at: new Date().toISOString(),
        locked_by: user.id,
        status: 'closed',
      })
      .eq('id', periodId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ period: data })
  }

  if (action === 'unlock') {
    const { periodId } = body
    if (!periodId) {
      return NextResponse.json({ error: 'periodId required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('pay_periods')
      .update({
        is_locked: false,
        locked_at: null,
        locked_by: null,
        status: 'open',
      })
      .eq('id', periodId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ period: data })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

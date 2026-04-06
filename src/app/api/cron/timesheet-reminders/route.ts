import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/sendEmail'

// Vercel cron: runs every Friday at 8pm UTC (3pm CT)
// Sends reminder emails to all active employees who haven't submitted a timesheet for the current week

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (authHeader !== `Bearer ${cronSecret}`) {
    // In development or if no CRON_SECRET set, allow anyway
    if (cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // Calculate current week ending (Saturday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const saturday = new Date(now)
    saturday.setDate(now.getDate() + (6 - dayOfWeek))
    const weekEnding = saturday.toISOString().split('T')[0]

    // Get all active employees (employees and managers who enter time)
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, email, first_name, last_name, manager_id')
      .eq('is_active', true)
      .eq('role', 'employee')

    if (empError || !employees) {
      console.error('Cron: Failed to load employees:', empError)
      return NextResponse.json({ error: 'Failed to load employees' }, { status: 500 })
    }

    // Get all timesheets for current week
    const { data: timesheets, error: tsError } = await supabase
      .from('timesheets')
      .select('employee_id, status')
      .eq('week_ending', weekEnding)

    if (tsError) {
      console.error('Cron: Failed to load timesheets:', tsError)
      return NextResponse.json({ error: 'Failed to load timesheets' }, { status: 500 })
    }

    // Find employees missing timesheets or still in draft
    const submittedEmployees = new Set(
      (timesheets || [])
        .filter(t => t.status !== 'draft')
        .map(t => t.employee_id)
    )

    const needsReminder = employees.filter(e => !submittedEmployees.has(e.id))

    if (needsReminder.length === 0) {
      return NextResponse.json({ message: 'All timesheets submitted', sent: 0 })
    }

    // Send reminder emails
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let sent = 0
    let failed = 0

    for (const emp of needsReminder) {
      try {
        const name = [emp.first_name, emp.last_name].filter(Boolean).join(' ')
        const weekLabel = new Date(weekEnding + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric'
        })

        await sendEmail({
          to: emp.email,
          subject: `Timesheet reminder — week ending ${weekLabel}`,
          html: `
            <div style="max-width:600px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;">
              <div style="background:#1a1a1a;padding:20px;text-align:center;">
                <div style="color:#ffffff;font-size:20px;font-weight:700;">West End Workforce</div>
              </div>
              <div style="padding:24px 20px;background:#ffffff;">
                <h2 style="color:#e31c79;font-size:18px;margin:0 0 16px;">Timesheet Reminder</h2>
                <p style="color:#555;line-height:1.6;">Hi ${name},</p>
                <p style="color:#555;line-height:1.6;">
                  Your timesheet for the week ending <strong>${weekLabel}</strong> has not been submitted yet.
                  Please submit your hours before the end of the day.
                </p>
                <div style="text-align:center;margin:24px 0;">
                  <a href="${appUrl}/timesheet/entry"
                     style="background:#e31c79;color:#ffffff;padding:12px 28px;border-radius:7px;text-decoration:none;font-weight:600;display:inline-block;">
                    Submit Timesheet
                  </a>
                </div>
              </div>
              <div style="background:#FAFAF8;padding:12px;text-align:center;font-size:12px;color:#c0bab2;border-top:1px solid #e31c79;">
                West End Workforce &middot; Automated Reminder
              </div>
            </div>
          `,
        })
        sent++
      } catch (err) {
        console.error(`Cron: Failed to send reminder to ${emp.email}:`, err)
        failed++
      }
    }

    // Log to audit
    await supabase.from('audit_logs').insert({
      user_id: null,
      action: 'cron.timesheet_reminders',
      timestamp: new Date().toISOString(),
      metadata: {
        week_ending: weekEnding,
        total_employees: employees.length,
        missing: needsReminder.length,
        sent,
        failed,
      },
    })

    return NextResponse.json({
      message: `Sent ${sent} reminders (${failed} failed)`,
      week_ending: weekEnding,
      missing: needsReminder.length,
      sent,
      failed,
    })
  } catch (err) {
    console.error('Cron: Unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

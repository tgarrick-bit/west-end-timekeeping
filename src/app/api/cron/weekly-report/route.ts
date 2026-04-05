import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/sendEmail'

// Vercel cron: runs every Monday at 8am UTC
// Sends a weekly summary report to all admin users

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (authHeader !== `Bearer ${cronSecret}`) {
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
    // Calculate the previous week range (Mon-Sun)
    const now = new Date()
    const dayOfWeek = now.getDay()
    // Previous Sunday
    const prevSunday = new Date(now)
    prevSunday.setDate(now.getDate() - dayOfWeek)
    // Previous Monday
    const prevMonday = new Date(prevSunday)
    prevMonday.setDate(prevSunday.getDate() - 6)

    const weekStart = prevMonday.toISOString().split('T')[0]
    const weekEnd = prevSunday.toISOString().split('T')[0]

    const weekLabel = `${prevMonday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${prevSunday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

    // Get all timesheets for the previous week
    const { data: timesheets, error: tsError } = await supabase
      .from('timesheets')
      .select(`
        id, employee_id, week_ending, total_hours, overtime_hours, status,
        employee:employees!timesheets_employee_id_fkey (
          first_name, last_name, department
        )
      `)
      .gte('week_ending', weekStart)
      .lte('week_ending', weekEnd)

    if (tsError) {
      console.error('Weekly report cron: Failed to load timesheets:', tsError)
      return NextResponse.json({ error: 'Failed to load timesheets' }, { status: 500 })
    }

    const allTimesheets = timesheets || []

    // Calculate summary stats
    const totalSubmitted = allTimesheets.filter(t => t.status !== 'draft').length
    const totalApproved = allTimesheets.filter(t => t.status === 'approved' || t.status === 'client_approved' || t.status === 'payroll_approved').length
    const totalPending = allTimesheets.filter(t => t.status === 'submitted').length
    const totalRejected = allTimesheets.filter(t => t.status === 'rejected').length
    const totalDraft = allTimesheets.filter(t => t.status === 'draft').length
    const totalHours = allTimesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0)
    const totalOvertimeHours = allTimesheets.reduce((sum, t) => sum + (t.overtime_hours || 0), 0)

    // Hours by project via timesheet entries
    const tsIds = allTimesheets.map(t => t.id)
    let projectBreakdown: { name: string; hours: number }[] = []

    if (tsIds.length > 0) {
      const { data: entries } = await supabase
        .from('timesheet_entries')
        .select(`
          hours,
          project:projects!timesheet_entries_project_id_fkey (
            name,
            client:clients (name)
          )
        `)
        .in('timesheet_id', tsIds)

      if (entries) {
        const projectMap = new Map<string, number>()
        entries.forEach((entry: any) => {
          const clientName = entry.project?.client?.name || 'No Client'
          const projectName = entry.project?.name || 'General'
          const key = `${clientName} / ${projectName}`
          projectMap.set(key, (projectMap.get(key) || 0) + (entry.hours || 0))
        })

        projectBreakdown = Array.from(projectMap.entries())
          .map(([name, hours]) => ({ name, hours }))
          .sort((a, b) => b.hours - a.hours)
      }
    }

    // Get active employee count for context
    const { count: activeEmployeeCount } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .in('role', ['employee', 'manager'])

    // Build the project table rows
    const projectRows = projectBreakdown.length > 0
      ? projectBreakdown.map(p =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0ece7;font-size:13px;color:#555;">${p.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0ece7;font-size:13px;color:#1a1a1a;font-weight:600;text-align:right;">${p.hours.toFixed(1)}</td>
          </tr>`
        ).join('')
      : '<tr><td colspan="2" style="padding:12px;text-align:center;color:#c0bab2;font-size:12px;">No timesheet entries for this period</td></tr>'

    // Build the email HTML
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://time.westendworkforce.ca'
    const emailHtml = `
      <div style="max-width:640px;margin:0 auto;font-family:'Montserrat',Arial,sans-serif;background:#FAFAF8;">
        <div style="background:#1a1a1a;padding:20px 24px;text-align:center;">
          <div style="color:#ffffff;font-size:20px;font-weight:700;">West End Workforce</div>
          <div style="color:#c0bab2;font-size:12px;margin-top:4px;">Weekly Timesheet Report</div>
        </div>

        <div style="padding:24px;">
          <h2 style="color:#1a1a1a;font-size:16px;font-weight:700;margin:0 0 4px;">
            Week of ${weekLabel}
          </h2>
          <p style="color:#999;font-size:12px;margin:0 0 20px;">
            Automated summary from the Timekeeping system
          </p>

          <!-- Stats Grid -->
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
            <div style="flex:1;min-width:120px;background:#ffffff;border:1px solid #e8e4df;border-radius:8px;padding:16px;">
              <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:#c0bab2;margin-bottom:6px;">Total Hours</div>
              <div style="font-size:24px;font-weight:700;color:#e31c79;">${totalHours.toFixed(1)}</div>
            </div>
            <div style="flex:1;min-width:120px;background:#ffffff;border:1px solid #e8e4df;border-radius:8px;padding:16px;">
              <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:#c0bab2;margin-bottom:6px;">Approved</div>
              <div style="font-size:24px;font-weight:700;color:#2d9b6e;">${totalApproved}</div>
            </div>
            <div style="flex:1;min-width:120px;background:#ffffff;border:1px solid #e8e4df;border-radius:8px;padding:16px;">
              <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:#c0bab2;margin-bottom:6px;">Pending</div>
              <div style="font-size:24px;font-weight:700;color:#d4a017;">${totalPending}</div>
            </div>
            <div style="flex:1;min-width:120px;background:#ffffff;border:1px solid #e8e4df;border-radius:8px;padding:16px;">
              <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:#c0bab2;margin-bottom:6px;">Rejected</div>
              <div style="font-size:24px;font-weight:700;color:#b91c1c;">${totalRejected}</div>
            </div>
          </div>

          <!-- Additional info -->
          <div style="background:#ffffff;border:1px solid #e8e4df;border-radius:8px;padding:16px;margin-bottom:24px;">
            <table style="width:100%;font-size:12px;color:#555;">
              <tr>
                <td style="padding:4px 0;">Timesheets submitted</td>
                <td style="text-align:right;font-weight:600;color:#1a1a1a;">${totalSubmitted}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;">Still in draft</td>
                <td style="text-align:right;font-weight:600;color:#1a1a1a;">${totalDraft}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;">Overtime hours</td>
                <td style="text-align:right;font-weight:600;color:#1a1a1a;">${totalOvertimeHours.toFixed(1)}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;">Active employees</td>
                <td style="text-align:right;font-weight:600;color:#1a1a1a;">${activeEmployeeCount || 0}</td>
              </tr>
            </table>
          </div>

          <!-- Project Breakdown -->
          <div style="background:#ffffff;border:1px solid #e8e4df;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <div style="padding:12px 16px;border-bottom:1px solid #e8e4df;">
              <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#c0bab2;">Hours by Client / Project</div>
            </div>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;color:#c0bab2;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8e4df;">Project</th>
                  <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:600;color:#c0bab2;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e8e4df;">Hours</th>
                </tr>
              </thead>
              <tbody>
                ${projectRows}
              </tbody>
            </table>
          </div>

          <!-- CTA -->
          <div style="text-align:center;margin:24px 0;">
            <a href="${appUrl}/admin"
               style="background:#e31c79;color:#ffffff;padding:12px 28px;border-radius:7px;text-decoration:none;font-weight:600;display:inline-block;font-size:13px;">
              View Admin Dashboard
            </a>
          </div>
        </div>

        <div style="background:#FAFAF8;padding:12px;text-align:center;font-size:11px;color:#c0bab2;border-top:1px solid #e8e4df;">
          West End Workforce &middot; Automated Weekly Report &middot; ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    `

    // Get all admin users
    const { data: admins, error: adminError } = await supabase
      .from('employees')
      .select('id, email, first_name, last_name')
      .eq('role', 'admin')
      .eq('is_active', true)

    if (adminError || !admins || admins.length === 0) {
      console.error('Weekly report cron: No admins found:', adminError)
      return NextResponse.json({ error: 'No admin users found' }, { status: 500 })
    }

    let sent = 0
    let failed = 0

    for (const admin of admins) {
      try {
        await sendEmail({
          to: admin.email,
          subject: `Weekly Timesheet Report - ${weekLabel}`,
          html: emailHtml,
        })
        sent++
      } catch (err) {
        console.error(`Weekly report: Failed to send to ${admin.email}:`, err)
        failed++
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: null,
      action: 'cron.weekly_report',
      timestamp: new Date().toISOString(),
      metadata: {
        week_start: weekStart,
        week_end: weekEnd,
        total_timesheets: allTimesheets.length,
        total_hours: totalHours,
        total_approved: totalApproved,
        total_pending: totalPending,
        admins_emailed: admins.length,
        sent,
        failed,
      },
    })

    return NextResponse.json({
      message: `Weekly report sent to ${sent} admin(s)`,
      week: weekLabel,
      stats: {
        totalHours,
        totalSubmitted,
        totalApproved,
        totalPending,
        totalRejected,
      },
      sent,
      failed,
    })
  } catch (err) {
    console.error('Weekly report cron: Unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

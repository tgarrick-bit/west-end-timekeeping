// src/app/api/notifications/test-email/route.ts
import { NextResponse } from 'next/server'
import { EmailService } from '@/lib/emailService'

// POST /api/notifications/test-email
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { toEmail, testType = 'configuration' } = body as {
      toEmail?: string
      testType?: 'configuration' | 'notification'
    }

    const svc = EmailService.getInstance()

    if (testType === 'configuration') {
      const result = await svc.testEmailConfiguration()
      return NextResponse.json(
        {
          success: result.success,
          message: result.message,
          type: 'configuration',
        },
        { status: result.success ? 200 : 500 }
      )
    }

    if (testType === 'notification') {
      if (!toEmail) {
        return NextResponse.json(
          { error: 'Email address is required for notification test' },
          { status: 400 }
        )
      }

      // Minimal test notification payload (shape doesn’t need to be exact for a test)
      const testNotification = {
        id: 'test-notification',
        type: 'timesheet_submitted',
        title: 'Test Notification',
        message:
          'This is a test notification email to verify the email service is working correctly.',
        priority: 'medium',
        userId: 'test-user',
        isRead: false,
        isEmailSent: false,
        createdAt: new Date(),
      } as any

      const ok = await svc.sendEmailNotification(toEmail, testNotification, {
        employeeName: 'Test Employee',
        managerName: 'Test Manager',
        period: 'Test Period',
        totalHours: '40',
        approvalUrl: '#',
      })

      return NextResponse.json(
        {
          success: ok,
          message: ok
            ? `Test notification email sent successfully to ${toEmail}`
            : 'Failed to send test notification email',
          type: 'notification',
        },
        { status: ok ? 200 : 500 }
      )
    }

    return NextResponse.json(
      { error: 'Invalid test type. Use "configuration" or "notification"' },
      { status: 400 }
    )
  } catch (err) {
    console.error('Error testing email service:', err)
    return NextResponse.json(
      { error: 'Failed to test email service' },
      { status: 500 }
    )
  }
}

// GET /api/notifications/test-email
// Returns the same configuration check as a quick status endpoint
export async function GET() {
  try {
    const svc = EmailService.getInstance()
    const result = await svc.testEmailConfiguration()
    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        type: 'configuration',
      },
      { status: result.success ? 200 : 500 }
    )
  } catch (err) {
    console.error('Error getting email service status:', err)
    return NextResponse.json(
      { error: 'Failed to get email service status' },
      { status: 500 }
    )
  }
}

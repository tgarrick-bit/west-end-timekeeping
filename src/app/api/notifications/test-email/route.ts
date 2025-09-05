import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/emailService';

// POST /api/notifications/test-email - Test email configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toEmail, testType = 'configuration' } = body;

    if (testType === 'configuration') {
      // Test email service configuration
      const result = await emailService.testEmailConfiguration();
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message,
          type: 'configuration'
        });
      } else {
        return NextResponse.json({
          success: false,
          message: result.message,
          type: 'configuration'
        }, { status: 500 });
      }
    } else if (testType === 'notification') {
      // Test sending a notification email
      if (!toEmail) {
        return NextResponse.json(
          { error: 'Email address is required for notification test' },
          { status: 400 }
        );
      }

      // Create a test notification
      const testNotification = {
        id: 'test-notification',
        type: 'timesheet_submitted' as const,
        title: 'Test Notification',
        message: 'This is a test notification email to verify the email service is working correctly.',
        priority: 'medium' as const,
        userId: 'test-user',
        isRead: false,
        isEmailSent: false,
        createdAt: new Date()
      };

      const success = await emailService.sendEmailNotification(
        toEmail,
        testNotification,
        {
          employeeName: 'Test Employee',
          managerName: 'Test Manager',
          period: 'Test Period',
          totalHours: '40',
          approvalUrl: '#'
        }
      );

      if (success) {
        return NextResponse.json({
          success: true,
          message: `Test notification email sent successfully to ${toEmail}`,
          type: 'notification'
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Failed to send test notification email',
          type: 'notification'
        }, { status: 500 });
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid test type. Use "configuration" or "notification"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error testing email service:', error);
    return NextResponse.json(
      { error: 'Failed to test email service' },
      { status: 500 }
    );
  }
}

// GET /api/notifications/test-email - Get email service status
export async function GET() {
  try {
    return NextResponse.json({ ok: true });
    
    return NextResponse.json({
      success: true,
      status,
      message: 'Email service status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting email service status:', error);
    return NextResponse.json(
      { error: 'Failed to get email service status' },
      { status: 500 }
    );
  }
}

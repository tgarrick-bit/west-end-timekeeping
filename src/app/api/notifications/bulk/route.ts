import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notificationService';
import { NOTIFICATION_TYPES, PRIORITIES } from '@/types/notifications';

// POST /api/notifications/bulk - Send bulk notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type, 
      userIds, 
      title, 
      message, 
      priority = PRIORITIES.MEDIUM,
      sendEmail = true,
      metadata = {}
    } = body;

    if (!type || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Type and userIds array are required' },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Validate notification type
    if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // Validate priority
    if (!Object.values(PRIORITIES).includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority level' },
        { status: 400 }
      );
    }

    const results = {
      successful: [] as string[],   // userIds where notification was created
      failed: [] as string[],       // userIds where notification failed
      notifications: [] as any[]
    };

    // Create notifications for each user
    for (const userId of userIds) {
      try {
        const notification = notificationService.createNotification(
          type,
          userId,
          undefined,
          'system',
          {
            ...metadata,
            bulkNotification: true,
            totalRecipients: userIds.length
          }
        );

        results.notifications.push(notification);
        results.successful.push(userId);
      } catch (error) {
        console.error(`Failed to create notification for user ${userId}:`, error);
        results.failed.push(userId);
      }
    }

    // Send bulk emails if requested
    if (sendEmail && results.successful.length > 0) {
      try {
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // TODO: replace this with a real lookup of user emails from your DB
        const userEmails = results.successful.map(
          (userId) => `${userId}@westendworkforce.com`
        );

        // Send a simple email to each recipient using your existing send-email route
        const emailPromises = userEmails.map(async (email) => {
          const emailPayload = {
            to: email,
            subject: title,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #e31c79; padding: 16px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 20px;">West End Workforce</h1>
                </div>
                <div style="background-color: #f5f5f5; padding: 20px;">
                  <h2 style="color: #33393c; margin-top: 0;">${title}</h2>
                  <p style="color: #333; font-size: 14px;">${message}</p>
                </div>
                <div style="background-color: #33393c; padding: 12px; text-align: center;">
                  <p style="color: white; margin: 0; font-size: 11px;">© 2025 West End Workforce</p>
                </div>
              </div>
            `
          };

          const res = await fetch(`${APP_URL}/api/notifications/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload)
          });

          if (!res.ok) {
            console.error(`Bulk email failed for ${email}:`, await res.text());
          }

          return { email, ok: res.ok };
        });

        const emailResults = await Promise.allSettled(emailPromises);

        // Optional: log email failures separately
        const emailFailures = emailResults
          .filter((r) => r.status === 'fulfilled' && !r.value.ok)
          .map((r: any) => r.value.email);

        if (emailFailures.length > 0) {
          console.warn('Some bulk emails failed:', emailFailures);
        }
      } catch (error) {
        console.error('Failed to send bulk emails:', error);
        // Don’t fail the entire operation if email sending fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk notification created for ${results.successful.length} users`,
      results,
      summary: {
        total: userIds.length,
        successful: results.successful.length,
        failed: results.failed.length
      }
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send bulk notifications' },
      { status: 500 }
    );
  }
}

// GET /api/notifications/bulk - Get bulk notification statistics
export async function GET() {
  try {
    // In a real implementation, this would query the database for bulk notification stats
    const stats = {
      totalBulkNotifications: 0,
      totalRecipients: 0,
      averageRecipientsPerNotification: 0,
      mostCommonType: 'system',
      lastBulkNotification: null
    };

    return NextResponse.json({
      success: true,
      stats,
      message: 'Bulk notification statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting bulk notification statistics:', error);
    return NextResponse.json(
      { error: 'Failed to get bulk notification statistics' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notificationService';
import { emailService } from '@/lib/emailService';
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
      successful: [] as string[],
      failed: [] as string[],
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
        // Get user emails (in real implementation, this would query the database)
        const userEmails = results.successful.map(userId => `${userId}@westendworkforce.com`);
        
        // Create a sample notification for email template
        const sampleNotification = {
          id: 'bulk-notification',
          type,
          title,
          message,
          priority,
          userId: 'bulk',
          isRead: false,
          isEmailSent: false,
          createdAt: new Date()
        };

        const emailResults = await emailService.sendBulkEmailNotifications(
          userEmails,
          sampleNotification,
          {
            ...metadata,
            bulkNotification: true,
            totalRecipients: userIds.length
          }
        );

        // Update results with email status
        results.successful = emailResults.success;
        results.failed = [...results.failed, ...emailResults.failed];
      } catch (error) {
        console.error('Failed to send bulk emails:', error);
        // Don't fail the entire operation if emails fail
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

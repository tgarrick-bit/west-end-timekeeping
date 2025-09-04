import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notificationService';
import { emailService } from '@/lib/emailService';
import { NOTIFICATION_TYPES, PRIORITIES } from '@/types/notifications';

// GET /api/notifications - Get notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    let notifications = notificationService.getUserNotifications(userId);

    // Apply filters
    if (type && type !== 'all') {
      notifications = notifications.filter(n => n.type === type);
    }

    if (priority && priority !== 'all') {
      notifications = notifications.filter(n => n.priority === priority);
    }

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.isRead);
    }

    // Get stats
    const stats = notificationService.getNotificationStats(userId);

    return NextResponse.json({
      notifications,
      stats,
      success: true
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, userId, relatedId, relatedType, metadata } = body;

    if (!type || !userId) {
      return NextResponse.json(
        { error: 'Type and userId are required' },
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

    const notification = notificationService.createNotification(
      type,
      userId,
      relatedId,
      relatedType,
      metadata
    );

    return NextResponse.json({
      notification,
      success: true
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications - Update notification (mark as read, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, notificationId, userId } = body;

    if (!action || !notificationId) {
      return NextResponse.json(
        { error: 'Action and notificationId are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'mark-read':
        notificationService.markAsRead(notificationId);
        break;
      case 'mark-all-read':
        if (!userId) {
          return NextResponse.json(
            { error: 'UserId is required for mark-all-read action' },
            { status: 400 }
          );
        }
        notificationService.markAllAsRead(userId);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Notification ${action} completed successfully`
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete a notification
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    notificationService.deleteNotification(notificationId);

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { NotificationPreferences } from '@/types/notifications';

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, this would query the database
    // For now, return default preferences
    const preferences: NotificationPreferences = {
      userId,
      email: true,
      browser: true,
      timesheets: true,
      expenses: true,
      deadlines: true,
      system: true,
      frequency: 'immediate',
      quietHours: {
        start: '22:00',
        end: '08:00',
        enabled: false
      }
    };

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Notification preferences retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/preferences - Create or update user notification preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...preferences } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate preferences
    const validPreferences: NotificationPreferences = {
      userId,
      email: Boolean(preferences.email),
      browser: Boolean(preferences.browser),
      timesheets: Boolean(preferences.timesheets),
      expenses: Boolean(preferences.expenses),
      deadlines: Boolean(preferences.deadlines),
      system: Boolean(preferences.system),
      frequency: preferences.frequency || 'immediate',
      quietHours: {
        start: preferences.quietHours?.start || '22:00',
        end: preferences.quietHours?.end || '08:00',
        enabled: Boolean(preferences.quietHours?.enabled)
      }
    };

    // In a real implementation, this would save to the database
    // For now, save to localStorage
    try {
      localStorage.setItem(`notification_preferences_${userId}`, JSON.stringify(validPreferences));
    } catch (error) {
      console.warn('Failed to save preferences to localStorage:', error);
    }

    return NextResponse.json({
      success: true,
      preferences: validPreferences,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/preferences - Update specific notification preferences
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, updates } = body;

    if (!userId || !updates) {
      return NextResponse.json(
        { error: 'User ID and updates are required' },
        { status: 400 }
      );
    }

    // Get current preferences
    let currentPreferences: NotificationPreferences;
    try {
      const saved = localStorage.getItem(`notification_preferences_${userId}`);
      currentPreferences = saved ? JSON.parse(saved) : {
        userId,
        email: true,
        browser: true,
        timesheets: true,
        expenses: true,
        deadlines: true,
        system: true,
        frequency: 'immediate',
        quietHours: {
          start: '22:00',
          end: '08:00',
          enabled: false
        }
      };
    } catch (error) {
      console.warn('Failed to load current preferences:', error);
      currentPreferences = {
        userId,
        email: true,
        browser: true,
        timesheets: true,
        expenses: true,
        deadlines: true,
        system: true,
        frequency: 'immediate',
        quietHours: {
          start: '22:00',
          end: '08:00',
          enabled: false
        }
      };
    }

    // Apply updates
    const updatedPreferences: NotificationPreferences = {
      ...currentPreferences,
      ...updates,
      userId // Ensure userId is not overwritten
    };

    // Save updated preferences
    try {
      localStorage.setItem(`notification_preferences_${userId}`, JSON.stringify(updatedPreferences));
    } catch (error) {
      console.warn('Failed to save updated preferences to localStorage:', error);
    }

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/preferences - Reset user notification preferences to defaults
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Reset to default preferences
    const defaultPreferences: NotificationPreferences = {
      userId,
      email: true,
      browser: true,
      timesheets: true,
      expenses: true,
      deadlines: true,
      system: true,
      frequency: 'immediate',
      quietHours: {
        start: '22:00',
        end: '08:00',
        enabled: false
      }
    };

    // Save default preferences
    try {
      localStorage.setItem(`notification_preferences_${userId}`, JSON.stringify(defaultPreferences));
    } catch (error) {
      console.warn('Failed to save default preferences to localStorage:', error);
    }

    return NextResponse.json({
      success: true,
      preferences: defaultPreferences,
      message: 'Notification preferences reset to defaults successfully'
    });
  } catch (error) {
    console.error('Error resetting notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to reset notification preferences' },
      { status: 500 }
    );
  }
}

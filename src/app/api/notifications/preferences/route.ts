import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NotificationPreferences } from '@/types/notifications';

const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'userId'> = {
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
    enabled: false,
  },
};

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;

    // Only allow users to read their own preferences (unless admin)
    if (userId !== user.id) {
      const { data: emp } = await supabase.from('employees').select('role').eq('id', user.id).single();
      if (!emp || emp.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!prefs) {
      // Return defaults if no preferences saved yet
      return NextResponse.json({
        success: true,
        preferences: { userId, ...DEFAULT_PREFERENCES },
        message: 'Default notification preferences returned',
      });
    }

    const preferences: NotificationPreferences = {
      userId: prefs.user_id,
      email: prefs.email,
      browser: prefs.browser,
      timesheets: prefs.timesheets,
      expenses: prefs.expenses,
      deadlines: prefs.deadlines,
      system: prefs.system,
      frequency: prefs.frequency,
      quietHours: {
        start: prefs.quiet_hours_start || '22:00',
        end: prefs.quiet_hours_end || '08:00',
        enabled: prefs.quiet_hours_enabled || false,
      },
    };

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Notification preferences retrieved successfully',
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
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, ...preferences } = body;

    // Users can only update their own preferences
    const targetUserId = userId || user.id;
    if (targetUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dbPayload = {
      user_id: targetUserId,
      email: Boolean(preferences.email),
      browser: Boolean(preferences.browser),
      timesheets: Boolean(preferences.timesheets),
      expenses: Boolean(preferences.expenses),
      deadlines: Boolean(preferences.deadlines),
      system: Boolean(preferences.system),
      frequency: preferences.frequency || 'immediate',
      quiet_hours_start: preferences.quietHours?.start || '22:00',
      quiet_hours_end: preferences.quietHours?.end || '08:00',
      quiet_hours_enabled: Boolean(preferences.quietHours?.enabled),
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await supabase
      .from('notification_preferences')
      .upsert(dbPayload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to save notification preferences' },
        { status: 500 }
      );
    }

    const validPreferences: NotificationPreferences = {
      userId: upserted.user_id,
      email: upserted.email,
      browser: upserted.browser,
      timesheets: upserted.timesheets,
      expenses: upserted.expenses,
      deadlines: upserted.deadlines,
      system: upserted.system,
      frequency: upserted.frequency,
      quietHours: {
        start: upserted.quiet_hours_start,
        end: upserted.quiet_hours_end,
        enabled: upserted.quiet_hours_enabled,
      },
    };

    return NextResponse.json({
      success: true,
      preferences: validPreferences,
      message: 'Notification preferences updated successfully',
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
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, updates } = body;

    if (!updates) {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      );
    }

    const targetUserId = userId || user.id;
    if (targetUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get current preferences or defaults
    const { data: current } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    const merged = {
      user_id: targetUserId,
      email: updates.email ?? current?.email ?? true,
      browser: updates.browser ?? current?.browser ?? true,
      timesheets: updates.timesheets ?? current?.timesheets ?? true,
      expenses: updates.expenses ?? current?.expenses ?? true,
      deadlines: updates.deadlines ?? current?.deadlines ?? true,
      system: updates.system ?? current?.system ?? true,
      frequency: updates.frequency ?? current?.frequency ?? 'immediate',
      quiet_hours_start: updates.quietHours?.start ?? current?.quiet_hours_start ?? '22:00',
      quiet_hours_end: updates.quietHours?.end ?? current?.quiet_hours_end ?? '08:00',
      quiet_hours_enabled: updates.quietHours?.enabled ?? current?.quiet_hours_enabled ?? false,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await supabase
      .from('notification_preferences')
      .upsert(merged, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      );
    }

    const updatedPreferences: NotificationPreferences = {
      userId: upserted.user_id,
      email: upserted.email,
      browser: upserted.browser,
      timesheets: upserted.timesheets,
      expenses: upserted.expenses,
      deadlines: upserted.deadlines,
      system: upserted.system,
      frequency: upserted.frequency,
      quietHours: {
        start: upserted.quiet_hours_start,
        end: upserted.quiet_hours_end,
        enabled: upserted.quiet_hours_enabled,
      },
    };

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
      message: 'Notification preferences updated successfully',
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
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;

    if (userId !== user.id) {
      const { data: emp } = await supabase.from('employees').select('role').eq('id', user.id).single();
      if (!emp || emp.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Delete the preferences row (will return defaults on next GET)
    await supabase
      .from('notification_preferences')
      .delete()
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      preferences: { userId, ...DEFAULT_PREFERENCES },
      message: 'Notification preferences reset to defaults successfully',
    });
  } catch (error) {
    console.error('Error resetting notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to reset notification preferences' },
      { status: 500 }
    );
  }
}

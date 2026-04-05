// src/app/api/admin/tracker-sync/route.ts
// Manual sync trigger for Tracker RMS integration (admin only)

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { syncPlacementsToTimekeeping } from '@/lib/trackerSync';

export const maxDuration = 120;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * GET: Return last sync status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get last sync info from company_settings
    const { data: settings } = await getSupabaseAdmin()
      .from('company_settings')
      .select('tracker_rms_enabled, tracker_rms_config')
      .single();

    return NextResponse.json({
      enabled: settings?.tracker_rms_enabled || false,
      lastSync: settings?.tracker_rms_config?.last_sync_at || null,
      lastResult: settings?.tracker_rms_config?.last_sync_result || null,
    });
  } catch (err: any) {
    console.error('GET tracker-sync error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: Trigger a manual sync
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from('employees')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if integration is enabled
    const { data: settings } = await getSupabaseAdmin()
      .from('company_settings')
      .select('tracker_rms_enabled')
      .single();

    if (!settings?.tracker_rms_enabled) {
      return NextResponse.json(
        { error: 'Tracker RMS integration is not enabled' },
        { status: 400 }
      );
    }

    // Run the sync with admin client (service role)
    const result = await syncPlacementsToTimekeeping(getSupabaseAdmin());

    // Log to audit
    await getSupabaseAdmin().from('audit_logs').insert({
      user_id: user.id,
      action: 'admin.tracker_sync',
      timestamp: new Date().toISOString(),
      metadata: {
        ...result,
        trigger: 'manual',
      },
    });

    // Store last sync result
    await getSupabaseAdmin()
      .from('company_settings')
      .update({
        tracker_rms_config: {
          last_sync_at: result.completedAt,
          last_sync_result: result,
        },
      })
      .not('id', 'is', null);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('POST tracker-sync error:', err);
    return NextResponse.json(
      { error: 'Sync failed', message: err.message },
      { status: 500 }
    );
  }
}

// src/app/api/cron/tracker-sync/route.ts
// Daily cron: syncs active Tracker RMS placements into timekeeping

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncPlacementsToTimekeeping } from '@/lib/trackerSync';

export const maxDuration = 120; // allow up to 2 min for full sync

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (authHeader !== `Bearer ${cronSecret}`) {
    if (cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // Check if Tracker integration is enabled
    const { data: settings } = await supabase
      .from('company_settings')
      .select('tracker_rms_enabled')
      .single();

    if (!settings?.tracker_rms_enabled) {
      return NextResponse.json({
        message: 'Tracker RMS integration is disabled',
        skipped: true,
      });
    }

    // Run the sync
    const result = await syncPlacementsToTimekeeping(supabase);

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: null,
      action: 'cron.tracker_sync',
      timestamp: new Date().toISOString(),
      metadata: {
        ...result,
        trigger: 'cron',
      },
    });

    // Store last sync result in company_settings
    await supabase
      .from('company_settings')
      .update({
        tracker_rms_config: {
          last_sync_at: result.completedAt,
          last_sync_result: result,
        },
      })
      .not('id', 'is', null); // update all rows (there's only one)

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Cron tracker-sync error:', err);

    await supabase.from('audit_logs').insert({
      user_id: null,
      action: 'cron.tracker_sync',
      timestamp: new Date().toISOString(),
      metadata: {
        success: false,
        error: err.message,
        trigger: 'cron',
      },
    });

    return NextResponse.json(
      { error: 'Sync failed', message: err.message },
      { status: 500 }
    );
  }
}

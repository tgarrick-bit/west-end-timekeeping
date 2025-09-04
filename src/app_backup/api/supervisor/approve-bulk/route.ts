// COPY THIS ENTIRE FILE

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();
    const { itemIds, approvalType, comments } = body;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const batchId = crypto.randomUUID();
    const approvedAt = new Date().toISOString();
    const errors = [];
    let approvedCount = 0;

    // Process each item
    for (const item of itemIds) {
      try {
        if (item.type === 'timesheet' || approvalType === 'both') {
          const { error } = await supabase
            .from('timesheets')
            .update({
              status: 'approved',
              approved_by: user.id,
              approved_at: approvedAt,
              batch_approval_id: batchId,
              approved_in_bulk: true,
              approval_comments: comments
            })
            .eq('id', item.id)
            .eq('status', 'pending');

          if (!error) approvedCount++;
        }

        if (item.type === 'expense' || approvalType === 'both') {
          const { error } = await supabase
            .from('expenses')
            .update({
              status: 'approved',
              approved_by: user.id,
              approved_at: approvedAt,
              approval_comments: comments
            })
            .eq('id', item.id)
            .eq('status', 'pending');

          if (!error) approvedCount++;
        }
      } catch (err) {
        errors.push({ itemId: item.id, error: err });
      }
    }

    return NextResponse.json({
      success: true,
      approvedCount,
      batchId,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk approval error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk approval' },
      { status: 500 }
    );
  }
}
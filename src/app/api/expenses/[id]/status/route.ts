// src/app/api/expenses/[id]/status/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

type LineStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Next.js 15-compatible
) {
  const { id: lineId } = await params;            // ✅ await params and keep lineId name
  const supabase = createRouteHandlerClient({ cookies });

  try {
    if (!lineId) {
      return NextResponse.json(
        { error: 'Missing expense line id.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const action = body.action as 'approve' | 'reject';
    const rejectionReason: string | undefined = body.rejectionReason;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action (approve or reject).' },
        { status: 400 }
      );
    }

    // 1) Load the line so we know which report it belongs to
    const { data: line, error: lineError } = await supabase
      .from('expenses')
      .select('id, report_id, status')
      .eq('id', lineId)
      .single();

    if (lineError || !line) {
      console.error('Line not found:', lineError);
      return NextResponse.json(
        { error: 'Expense line not found.' },
        { status: 404 }
      );
    }

    const reportId = line.report_id as string;

    // 2) Build update payload for this line
    const updatePayload: Record<string, any> = {};

    if (action === 'approve') {
      updatePayload.status = 'approved';
      updatePayload.rejection_reason = null;
      updatePayload.rejected_at = null;
      updatePayload.approved_at = new Date().toISOString();
      // TODO: set approved_by using auth if you want
    } else {
      // reject
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json(
          { error: 'Rejection reason is required.' },
          { status: 400 }
        );
      }
      updatePayload.status = 'rejected';
      updatePayload.rejection_reason = rejectionReason.trim();
      updatePayload.rejected_at = new Date().toISOString();
      updatePayload.approved_at = null;
    }

    const { error: updateLineError } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', lineId);

    if (updateLineError) {
      console.error('Error updating expense line:', updateLineError);
      return NextResponse.json(
        { error: 'Failed to update expense line.' },
        { status: 500 }
      );
    }

    // 3) Recalculate the report's *intermediate* status based on all line statuses
    const { data: allLines, error: allLinesError } = await supabase
      .from('expenses')
      .select('status')
      .eq('report_id', reportId);

    if (allLinesError || !allLines) {
      console.error('Error loading all lines for report:', allLinesError);
      return NextResponse.json(
        { error: 'Failed to recalculate report status.' },
        { status: 500 }
      );
    }

    const statuses = (allLines as { status: LineStatus }[]).map(
      (l) => l.status
    );

    const allDraft = statuses.every((s) => s === 'draft');
    const allApproved = statuses.every((s) => s === 'approved');
    const hasSubmitted = statuses.some((s) => s === 'submitted');
    const hasRejected = statuses.some((s) => s === 'rejected');

    let reportStatus: 'draft' | 'submitted' | 'approved' | 'rejected';

    if (allDraft) reportStatus = 'draft';
    else if (allApproved) reportStatus = 'approved';
    else if (hasSubmitted) reportStatus = 'submitted';
    else if (hasRejected) reportStatus = 'rejected';
    else reportStatus = 'draft';

    const { error: reportUpdateError } = await supabase
      .from('expense_reports')
      .update({
        status: reportStatus,
        // FINAL approval/rejection timestamps are set in your finalize API, not here
      })
      .eq('id', reportId);

    if (reportUpdateError) {
      console.error('Error updating expense report status:', reportUpdateError);
      return NextResponse.json(
        { error: 'Failed to update expense report.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lineStatus: updatePayload.status,
      reportStatus,
    });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/expenses/[id]/status:', err);
    return NextResponse.json(
      { error: 'Unexpected error updating line.' },
      { status: 500 }
    );
  }
}

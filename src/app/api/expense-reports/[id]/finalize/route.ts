import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

type LineStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }   // ✅ Next.js 15 required type
) {
  const { id: reportId } = await params;           // ✅ Must await params
  const supabase = createRouteHandlerClient({ cookies });

  try {
    if (!reportId) {
      return NextResponse.json(
        { error: 'Missing expense report id.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const action = body.action as 'approve' | 'reject';
    const reason = body.reason?.trim() || null;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated.' },
        { status: 401 }
      );
    }

    // Load statuses for all lines in this report
    const { data: lines, error: lineError } = await supabase
      .from('expenses')
      .select('status')
      .eq('report_id', reportId);

    if (lineError || !lines) {
      console.error('Error loading lines:', lineError);
      return NextResponse.json(
        { error: 'Unable to load line statuses.' },
        { status: 500 }
      );
    }

    const statuses = lines.map((l) => l.status as LineStatus);

    const hasSubmitted = statuses.some((s) => s === 'submitted');
    const hasRejected = statuses.some((s) => s === 'rejected');
    const hasDraft = statuses.some((s) => s === 'draft');

    if (hasSubmitted || hasRejected || hasDraft) {
      return NextResponse.json(
        {
          error:
            'All entries must be approved before finalizing this report.',
        },
        { status: 400 }
      );
    }

    // -------------------------
    // FINAL APPROVAL LOGIC
    // -------------------------
    if (action === 'approve') {
      const { error: reportError } = await supabase
        .from('expense_reports')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (reportError) {
        console.error('Error finalizing report:', reportError);
        return NextResponse.json(
          { error: 'Failed to finalize report.' },
          { status: 500 }
        );
      }

      // TODO: send final approval email
      return NextResponse.json({ success: true, status: 'approved' });
    }

    // -------------------------
    // FINAL REJECTION LOGIC
    // -------------------------
    if (action === 'reject') {
      const { error: rejectError } = await supabase
        .from('expense_reports')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (rejectError) {
        console.error('Error rejecting report:', rejectError);
        return NextResponse.json(
          { error: 'Failed to reject report.' },
          { status: 500 }
        );
      }

      // TODO: send final rejection email
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    return NextResponse.json(
      { error: 'Invalid action.' },
      { status: 400 }
    );
  } catch (err) {
    console.error('Unexpected error finalizing report:', err);
    return NextResponse.json(
      { error: 'Unexpected error finalizing report.' },
      { status: 500 }
    );
  }
}

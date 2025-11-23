import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

type LineStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const reportId = params.id;
  const supabase = createSupabaseClient();

  try {
    const { data: { user }, error: userError } =
      await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated.' },
        { status: 401 }
      );
    }

    // 1) Ensure report belongs to the current employee
    const { data: report, error: reportError } = await supabase
      .from('expense_reports')
      .select('id, employee_id')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Expense report not found.' },
        { status: 404 }
      );
    }

    if (report.employee_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not allowed to submit this report.' },
        { status: 403 }
      );
    }

    // 2) Load lines
    const { data: lines, error: linesError } = await supabase
      .from('expenses')
      .select('id, status, expense_date, category, amount, project_id')
      .eq('report_id', reportId);

    if (linesError || !lines || lines.length === 0) {
      return NextResponse.json(
        { error: 'No expense lines found for this report.' },
        { status: 400 }
      );
    }

    // 3) Basic validation (you can tighten this as needed)
    for (const [idx, line] of lines.entries()) {
      if (
        !line.expense_date ||
        !line.category ||
        !line.amount ||
        line.amount <= 0 ||
        !line.project_id
      ) {
        return NextResponse.json(
          {
            error: `Line #${
              idx + 1
            } is missing a valid date, project, category or amount.`,
          },
          { status: 400 }
        );
      }
    }

    // 4) Move draft/rejected → submitted, leave approved as-is
    const updatableLines = lines.filter(
      (l) => l.status === 'draft' || l.status === 'rejected'
    );

    if (updatableLines.length > 0) {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ status: 'submitted' })
        .in(
          'id',
          updatableLines.map((l) => l.id)
        );

      if (updateError) {
        console.error(updateError);
        return NextResponse.json(
          { error: 'Failed to update line statuses.' },
          { status: 500 }
        );
      }
    }

    // 5) Update report status + timestamps (reset any prior final state)
    const totalAmount = lines.reduce((sum, l) => sum + (l.amount || 0), 0);

    const { error: reportUpdateError } = await supabase
      .from('expense_reports')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        total_amount: totalAmount,
        approved_at: null,
        rejected_at: null,
      })
      .eq('id', reportId);

    if (reportUpdateError) {
      console.error(reportUpdateError);
      return NextResponse.json(
        { error: 'Failed to update report.' },
        { status: 500 }
      );
    }

    // TODO: optional – send "Report Submitted" email

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Submit report error:', err);
    return NextResponse.json(
      { error: 'Unexpected error submitting report.' },
      { status: 500 }
    );
  }
}

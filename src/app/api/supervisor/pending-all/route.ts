// COPY THIS ENTIRE FILE

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch pending timesheets
    const { data: timesheets, error: timesheetError } = await supabase
      .from('timesheets')
      .select(`
        *,
        employee:users!timesheets_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        entries:timesheet_entries (
          hours,
          project:projects (
            name
          )
        )
      `)
      .eq('status', 'pending')
      .order('week_ending', { ascending: false });

    // Fetch pending expenses
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select(`
        *,
        employee:users!expenses_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        project:projects (
          name
        )
      `)
      .eq('status', 'pending')
      .order('expense_date', { ascending: false });

    if (timesheetError || expenseError) {
      throw new Error('Failed to fetch pending items');
    }

    // Format the combined response
    const pendingItems: any[] = [];

    // Add timesheets
    timesheets?.forEach(timesheet => {
      const totalHours = timesheet.entries?.reduce((sum: number, entry: any) => 
        sum + (entry.hours || 0), 0) || 0;
      
      pendingItems.push({
        id: timesheet.id,
        type: 'timesheet',
        employeeId: timesheet.employee.id,
        employeeName: `${timesheet.employee.first_name} ${timesheet.employee.last_name}`,
        employeeEmail: timesheet.employee.email,
        amount: totalHours, // Store hours as amount for timesheets
        hours: totalHours,
        weekEnding: timesheet.week_ending,
        projectName: timesheet.entries?.[0]?.project?.name || 'Multiple Projects',
        submittedAt: timesheet.submitted_at || timesheet.created_at,
        status: timesheet.status
      });
    });

    // Add expenses
    expenses?.forEach(expense => {
      pendingItems.push({
        id: expense.id,
        type: 'expense',
        employeeId: expense.employee.id,
        employeeName: `${expense.employee.first_name} ${expense.employee.last_name}`,
        employeeEmail: expense.employee.email,
        amount: expense.amount,
        weekEnding: expense.expense_date,
        projectName: expense.project?.name || 'No Project',
        submittedAt: expense.submitted_at || expense.created_at,
        status: expense.status
      });
    });

    // Calculate statistics
    const stats = {
      pendingTimesheets: timesheets?.length || 0,
      pendingExpenses: expenses?.length || 0,
      urgentItems: pendingItems.filter(item => {
        const daysOld = Math.floor((Date.now() - new Date(item.submittedAt).getTime()) / (1000 * 60 * 60 * 24));
        return daysOld > 3;
      }).length,
      totalPendingHours: timesheets?.reduce((sum, t) => 
        sum + (t.entries?.reduce((s: number, e: any) => s + (e.hours || 0), 0) || 0), 0) || 0,
      totalPendingAmount: expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
    };

    return NextResponse.json({ 
      items: pendingItems,
      stats 
    });

  } catch (error) {
    console.error('Error fetching pending items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending items' },
      { status: 500 }
    );
  }
}
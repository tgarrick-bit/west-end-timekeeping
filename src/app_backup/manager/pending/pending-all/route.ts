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
        employee:employees (
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
      .order('week_end', { ascending: false });

    // Fetch pending expense reports
    const { data: expenses, error: expenseError } = await supabase
      .from('expense_reports')
      .select(`
        *,
        employee:employees (
          id,
          first_name,
          last_name,
          email
        ),
        items:expense_items (
          amount,
          project:projects (
            name
          )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (timesheetError) {
      console.error('Timesheet error:', timesheetError);
    }
    if (expenseError) {
      console.error('Expense error:', expenseError);
    }

    // Format the combined response
    const pendingItems: any[] = [];

    // Add timesheets
    if (timesheets) {
      timesheets.forEach(timesheet => {
        const totalHours = timesheet.entries?.reduce((sum: number, entry: any) => 
          sum + (entry.hours || 0), 0) || timesheet.total_hours || 0;
        
        pendingItems.push({
          id: timesheet.id,
          type: 'timesheet',
          employeeId: timesheet.employee?.id || timesheet.employee_id,
          employeeName: timesheet.employee 
            ? `${timesheet.employee.first_name} ${timesheet.employee.last_name}`
            : 'Unknown Employee',
          employeeEmail: timesheet.employee?.email || '',
          amount: totalHours,
          hours: totalHours,
          weekEnding: timesheet.week_end,
          projectName: timesheet.entries?.[0]?.project?.name || 'Multiple Projects',
          submittedAt: timesheet.created_at,
          status: timesheet.status
        });
      });
    }

    // Add expense reports  
    if (expenses) {
      expenses.forEach(expense => {
        const totalAmount = expense.items?.reduce((sum: number, item: any) => 
          sum + (item.amount || 0), 0) || 0;
        
        pendingItems.push({
          id: expense.id,
          type: 'expense',
          employeeId: expense.employee?.id || expense.employee_id,
          employeeName: expense.employee 
            ? `${expense.employee.first_name} ${expense.employee.last_name}`
            : 'Unknown Employee',
          employeeEmail: expense.employee?.email || '',
          amount: totalAmount,
          weekEnding: expense.created_at,
          projectName: expense.items?.[0]?.project?.name || 'Various',
          submittedAt: expense.created_at,
          status: expense.status
        });
      });
    }

    // Calculate statistics
    const stats = {
      pendingTimesheets: timesheets?.length || 0,
      pendingExpenses: expenses?.length || 0,
      urgentItems: pendingItems.filter(item => {
        const daysOld = Math.floor((Date.now() - new Date(item.submittedAt).getTime()) / (1000 * 60 * 60 * 24));
        return daysOld > 3;
      }).length,
      totalPendingHours: timesheets?.reduce((sum, t) => 
        sum + (t.total_hours || 0), 0) || 0,
      totalPendingAmount: expenses?.reduce((sum, e) => {
        const total = e.items?.reduce((s: number, i: any) => s + (i.amount || 0), 0) || 0;
        return sum + total;
      }, 0) || 0
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
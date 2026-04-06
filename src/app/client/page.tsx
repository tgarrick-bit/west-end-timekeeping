'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  Clock,
  CheckCircle,
  Users,
  FolderKanban,
  Eye,
  Check,
  X,
  Receipt,
} from 'lucide-react';
import { format } from 'date-fns';

interface ClientRecord {
  id: string;
  name: string;
}

interface PendingTimesheet {
  id: string;
  employee_id: string;
  employee_name: string;
  week_ending: string;
  total_hours: number;
  status: string;
  submitted_at: string | null;
}

interface PendingExpense {
  id: string;
  employee_id: string;
  employee_name: string;
  expense_date: string;
  amount: number;
  category: string;
  status: string;
  description: string | null;
}

const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  submitted: { dot: '#c4983a', bg: 'rgba(196,152,58,0.08)', text: '#c4983a', label: 'Pending' },
  approved: { dot: '#2d9b6e', bg: 'rgba(45,155,110,0.08)', text: '#2d9b6e', label: 'Approved' },
  rejected: { dot: '#b91c1c', bg: 'rgba(185,28,28,0.08)', text: '#b91c1c', label: 'Rejected' },
  draft: { dot: '#c0bab2', bg: 'rgba(192,186,178,0.08)', text: '#999', label: 'Draft' },
  client_approved: { dot: '#2d9b6e', bg: 'rgba(45,155,110,0.08)', text: '#2d9b6e', label: 'Client Approved' },
};

export default function ClientDashboard() {
  const { employee } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [clientRecord, setClientRecord] = useState<ClientRecord | null>(null);
  const [pendingTimesheets, setPendingTimesheets] = useState<PendingTimesheet[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [stats, setStats] = useState({
    pendingApproval: 0,
    approvedThisMonth: 0,
    totalEmployees: 0,
    activeProjects: 0,
  });
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!employee?.client_id) return;

    try {
      setLoading(true);

      // Fetch client record
      const { data: client } = await supabase
        .from('clients')
        .select('id, name')
        .eq('id', employee.client_id)
        .single();

      setClientRecord(client);

      if (!client) return;

      // Fetch employees assigned to this client
      const { data: clientEmployees } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('client_id', client.id)
        .eq('is_active', true);

      const empIds = clientEmployees?.map(e => e.id) || [];
      const empMap = new Map((clientEmployees || []).map(e => [e.id, `${e.first_name} ${e.last_name}`]));

      // Also get employees assigned to this client's projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('client_id', client.id);

      const projectIds = projects?.map(p => p.id) || [];
      const activeProjects = projects?.filter(p => p.status === 'active').length || 0;

      // Get project assignments to find all employees working on client projects
      let allEmpIds = [...empIds];
      if (projectIds.length > 0) {
        const { data: assignments } = await supabase
          .from('project_employees')
          .select('employee_id, employees!inner(id, first_name, last_name)')
          .in('project_id', projectIds);

        if (assignments) {
          for (const a of assignments) {
            const emp = a.employees as any;
            if (emp && !allEmpIds.includes(emp.id)) {
              allEmpIds.push(emp.id);
              empMap.set(emp.id, `${emp.first_name} ${emp.last_name}`);
            }
          }
        }
      }

      const uniqueEmployeeIds = [...new Set(allEmpIds)];

      // Fetch timesheets for these employees
      let timesheets: any[] = [];
      if (uniqueEmployeeIds.length > 0) {
        const { data: tsData } = await supabase
          .from('timesheets')
          .select('id, employee_id, week_ending, total_hours, status, submitted_at')
          .in('employee_id', uniqueEmployeeIds)
          .in('status', ['submitted', 'approved', 'client_approved'])
          .order('week_ending', { ascending: false });

        timesheets = tsData || [];
      }

      // Fetch expenses for these employees
      let expenses: any[] = [];
      if (uniqueEmployeeIds.length > 0) {
        const { data: expData } = await supabase
          .from('expenses')
          .select('id, employee_id, expense_date, amount, category, status, description')
          .in('employee_id', uniqueEmployeeIds)
          .in('status', ['submitted', 'approved'])
          .order('expense_date', { ascending: false });

        expenses = expData || [];
      }

      // Calculate stats
      const pendingTS = timesheets.filter(t => t.status === 'submitted');
      const pendingExp = expenses.filter(e => e.status === 'submitted');

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const approvedThisMonthTS = timesheets.filter(
        t => (t.status === 'approved' || t.status === 'client_approved') && t.week_ending >= monthStart.split('T')[0]
      );
      const approvedThisMonthExp = expenses.filter(
        e => e.status === 'approved' && e.expense_date >= monthStart.split('T')[0]
      );

      setStats({
        pendingApproval: pendingTS.length + pendingExp.length,
        approvedThisMonth: approvedThisMonthTS.length + approvedThisMonthExp.length,
        totalEmployees: uniqueEmployeeIds.length,
        activeProjects: activeProjects,
      });

      setPendingTimesheets(
        pendingTS.slice(0, 10).map(t => ({
          ...t,
          employee_name: empMap.get(t.employee_id) || 'Unknown',
        }))
      );

      setPendingExpenses(
        pendingExp.slice(0, 10).map(e => ({
          ...e,
          employee_name: empMap.get(e.employee_id) || 'Unknown',
        }))
      );
    } catch (error) {
      console.error('Error fetching client dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [employee?.client_id, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApproveTimesheet = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/timesheets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'client_approve' }),
      });
      if (!res.ok) {
        // If client_approve requires approved status, try approve first
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to approve');
      }
      toast('success', 'Timesheet approved.');
      await fetchData();
    } catch (err: any) {
      // Fallback: try standard approve if client_approve needs prior approval
      try {
        const res2 = await fetch(`/api/timesheets/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        });
        if (!res2.ok) {
          const body = await res2.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to approve');
        }
        toast('success', 'Timesheet approved.');
        await fetchData();
      } catch (err2: any) {
        toast('error', err2?.message || 'Error approving timesheet');
      }
    } finally {
      setProcessing(null);
    }
  };

  const handleApproveExpense = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/expenses/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to approve');
      }
      toast('success', 'Expense approved.');
      await fetchData();
    } catch (err: any) {
      toast('error', err?.message || 'Error approving expense');
    } finally {
      setProcessing(null);
    }
  };

  const statCards = [
    { label: 'Pending Approval', value: stats.pendingApproval, icon: Clock, color: '#c4983a' },
    { label: 'Approved This Month', value: stats.approvedThisMonth, icon: CheckCircle, color: '#2d9b6e' },
    { label: 'Total Employees', value: stats.totalEmployees, icon: Users, color: '#e31c79' },
    { label: 'Active Projects', value: stats.activeProjects, icon: FolderKanban, color: '#6366f1' },
  ];

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Header */}
      <div className="anim-slide-up stagger-1" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em' }}>
          Client Portal
        </h1>
        {clientRecord && (
          <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            {clientRecord.name}
          </p>
        )}
      </div>

      {/* Stats */}
      {loading ? (
        <SkeletonStats count={4} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`anim-slide-up stagger-${i + 1}`}
                style={{
                  background: '#fff',
                  border: '0.5px solid #e8e4df',
                  borderRadius: 10,
                  padding: '20px 22px',
                }}
              >
                <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                  <Icon size={13} strokeWidth={1.5} style={{ color: card.color }} />
                  <span style={{ fontSize: 10, fontWeight: 500, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {card.label}
                  </span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 600, color: '#1a1a1a', margin: 0, lineHeight: 1 }}>
                  {card.value}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Timesheets */}
      <div className="anim-slide-up stagger-5" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>
          Pending Timesheets
        </h2>
        {loading ? (
          <SkeletonList rows={4} />
        ) : pendingTimesheets.length === 0 ? (
          <div style={{
            background: '#fff',
            border: '0.5px solid #e8e4df',
            borderRadius: 10,
            padding: '32px 22px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 12, color: '#999' }}>No pending timesheets</p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #f5f2ee' }}>
                  {['Employee', 'Week Ending', 'Hours', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px',
                      fontSize: 9,
                      fontWeight: 500,
                      color: '#c0bab2',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      textAlign: h === 'Actions' ? 'right' : 'left',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingTimesheets.map((ts) => {
                  const sc = statusConfig[ts.status] || statusConfig.draft;
                  return (
                    <tr key={ts.id} style={{ borderBottom: '0.5px solid #f5f2ee' }}>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>
                        {ts.employee_name}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#666' }}>
                        {format(new Date(ts.week_ending + 'T00:00:00'), 'MMM d, yyyy')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#666' }}>
                        {ts.total_hours?.toFixed(1) || '0.0'}h
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 10,
                          fontWeight: 500,
                          color: sc.text,
                          background: sc.bg,
                          padding: '3px 10px',
                          borderRadius: 3,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleApproveTimesheet(ts.id)}
                          disabled={processing === ts.id}
                          style={{
                            background: '#e31c79',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 5,
                            padding: '5px 14px',
                            fontSize: 10,
                            fontWeight: 500,
                            cursor: 'pointer',
                            opacity: processing === ts.id ? 0.6 : 1,
                          }}
                        >
                          {processing === ts.id ? 'Approving...' : 'Approve'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Expenses */}
      <div className="anim-slide-up stagger-6" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>
          Pending Expenses
        </h2>
        {loading ? (
          <SkeletonList rows={4} />
        ) : pendingExpenses.length === 0 ? (
          <div style={{
            background: '#fff',
            border: '0.5px solid #e8e4df',
            borderRadius: 10,
            padding: '32px 22px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 12, color: '#999' }}>No pending expenses</p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #f5f2ee' }}>
                  {['Employee', 'Date', 'Amount', 'Category', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px',
                      fontSize: 9,
                      fontWeight: 500,
                      color: '#c0bab2',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      textAlign: h === 'Actions' ? 'right' : 'left',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingExpenses.map((exp) => (
                  <tr key={exp.id} style={{ borderBottom: '0.5px solid #f5f2ee' }}>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, color: '#1a1a1a' }}>
                      {exp.employee_name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#666' }}>
                      {format(new Date(exp.expense_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#666' }}>
                      ${exp.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#666' }}>
                      {exp.category}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleApproveExpense(exp.id)}
                        disabled={processing === exp.id}
                        style={{
                          background: '#e31c79',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 5,
                          padding: '5px 14px',
                          fontSize: 10,
                          fontWeight: 500,
                          cursor: 'pointer',
                          opacity: processing === exp.id ? 0.6 : 1,
                        }}
                      >
                        {processing === exp.id ? 'Approving...' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

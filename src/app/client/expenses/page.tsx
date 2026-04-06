'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  Receipt,
  Search,
  Download,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

interface Expense {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  expense_date: string;
  amount: number;
  category: string;
  description: string | null;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  receipt_url: string | null;
  vendor: string | null;
  project_name: string | null;
  rejection_reason: string | null;
}

const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  submitted: { dot: '#c4983a', bg: 'rgba(196,152,58,0.08)', text: '#c4983a', label: 'Pending' },
  approved: { dot: '#2d9b6e', bg: 'rgba(45,155,110,0.08)', text: '#2d9b6e', label: 'Approved' },
  rejected: { dot: '#b91c1c', bg: 'rgba(185,28,28,0.08)', text: '#b91c1c', label: 'Rejected' },
  draft: { dot: '#c0bab2', bg: 'rgba(192,186,178,0.08)', text: '#999', label: 'Draft' },
};

type StatusFilter = 'all' | 'submitted' | 'approved' | 'rejected';

export default function ClientExpenses() {
  const { employee } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [processing, setProcessing] = useState<string | null>(null);

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // Detail modal
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!employee?.client_id) return;

    try {
      setLoading(true);

      // Get the client record
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', employee.client_id)
        .single();

      if (!client) return;

      // Get employees assigned to this client
      const { data: clientEmployees } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('client_id', client.id)
        .eq('is_active', true);

      const empMap = new Map<string, { name: string; email: string }>();
      (clientEmployees || []).forEach(e => {
        empMap.set(e.id, { name: `${e.first_name} ${e.last_name}`, email: e.email });
      });

      // Also get employees from project assignments
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', client.id);

      const projectIds = projects?.map(p => p.id) || [];

      if (projectIds.length > 0) {
        const { data: assignments } = await supabase
          .from('project_employees')
          .select('employee_id, employees!inner(id, first_name, last_name, email)')
          .in('project_id', projectIds);

        if (assignments) {
          for (const a of assignments) {
            const emp = a.employees as any;
            if (emp && !empMap.has(emp.id)) {
              empMap.set(emp.id, { name: `${emp.first_name} ${emp.last_name}`, email: emp.email });
            }
          }
        }
      }

      const allEmpIds = [...empMap.keys()];
      if (allEmpIds.length === 0) {
        setExpenses([]);
        return;
      }

      // Fetch expenses
      const { data: expData } = await supabase
        .from('expenses')
        .select(`
          id, employee_id, expense_date, amount, category, description, status,
          submitted_at, approved_at, receipt_url, vendor, rejection_reason,
          project:projects!expenses_project_id_fkey(name)
        `)
        .in('employee_id', allEmpIds)
        .neq('status', 'draft')
        .order('expense_date', { ascending: false });

      setExpenses(
        (expData || []).map(e => ({
          ...e,
          employee_name: empMap.get(e.employee_id)?.name || 'Unknown',
          employee_email: empMap.get(e.employee_id)?.email || '',
          project_name: (e.project as any)?.name || null,
          receipt_url: e.receipt_url || null,
        }))
      );
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [employee?.client_id, supabase]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleApprove = async (id: string) => {
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
      await fetchExpenses();
      if (selectedExpense?.id === id) setSelectedExpense(null);
    } catch (err: any) {
      toast('error', err?.message || 'Error approving expense');
    } finally {
      setProcessing(null);
    }
  };

  const promptReject = (id: string) => {
    setRejectTargetId(id);
    setRejectModalOpen(true);
  };

  const handleReject = async (reason: string) => {
    if (!rejectTargetId) return;
    setProcessing(rejectTargetId);
    try {
      const res = await fetch(`/api/expenses/${rejectTargetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to reject');
      }
      toast('success', 'Expense rejected.');
      await fetchExpenses();
      if (selectedExpense?.id === rejectTargetId) setSelectedExpense(null);
    } catch (err: any) {
      toast('error', err?.message || 'Error rejecting expense');
    } finally {
      setProcessing(null);
      setRejectModalOpen(false);
      setRejectTargetId(null);
    }
  };

  const exportToCSV = () => {
    const filtered = getFilteredExpenses();
    const headers = ['Employee', 'Date', 'Amount', 'Category', 'Vendor', 'Project', 'Status', 'Description'];
    const rows = filtered.map(e => [
      e.employee_name,
      e.expense_date,
      e.amount.toFixed(2),
      e.category,
      e.vendor || '',
      e.project_name || '',
      e.status,
      (e.description || '').replace(/,/g, ';'),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client_expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getFilteredExpenses = () => {
    let filtered = [...expenses];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.employee_name.toLowerCase().includes(term) ||
        e.employee_email.toLowerCase().includes(term) ||
        (e.category || '').toLowerCase().includes(term)
      );
    }
    return filtered;
  };

  const filtered = getFilteredExpenses();

  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0);

  const statusTabs: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: expenses.length },
    { value: 'submitted', label: 'Pending', count: expenses.filter(e => e.status === 'submitted').length },
    { value: 'approved', label: 'Approved', count: expenses.filter(e => e.status === 'approved').length },
    { value: 'rejected', label: 'Rejected', count: expenses.filter(e => e.status === 'rejected').length },
  ];

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Header */}
      <div className="anim-slide-up stagger-1" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em' }}>
            Expenses
          </h1>
          <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            Review and approve employee expenses
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#999' }}>
            Total: <strong style={{ color: '#1a1a1a' }}>${totalFiltered.toFixed(2)}</strong>
          </span>
          <button
            onClick={exportToCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#fff',
              border: '0.5px solid #e8e4df',
              borderRadius: 6,
              padding: '7px 16px',
              fontSize: 11,
              fontWeight: 500,
              color: '#666',
              cursor: 'pointer',
            }}
          >
            <Download size={12} strokeWidth={1.5} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="anim-slide-up stagger-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16 }}>
        <div style={{ display: 'flex', gap: 2, background: '#f5f2ee', borderRadius: 6, padding: 2 }}>
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              style={{
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: statusFilter === tab.value ? 600 : 400,
                color: statusFilter === tab.value ? '#1a1a1a' : '#999',
                background: statusFilter === tab.value ? '#fff' : 'transparent',
                border: statusFilter === tab.value ? '0.5px solid #e8e4df' : '0.5px solid transparent',
                borderRadius: 5,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
              <span style={{ marginLeft: 4, fontSize: 9, color: statusFilter === tab.value ? '#e31c79' : '#c0bab2' }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={13} strokeWidth={1.5} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#c0bab2' }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '7px 12px 7px 30px',
              fontSize: 11,
              border: '0.5px solid #e8e4df',
              borderRadius: 6,
              background: '#fff',
              outline: 'none',
              width: 200,
              color: '#1a1a1a',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e8e4df'; }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="anim-slide-up stagger-3">
        {loading ? (
          <SkeletonList rows={6} />
        ) : filtered.length === 0 ? (
          <div style={{
            background: '#fff',
            border: '0.5px solid #e8e4df',
            borderRadius: 10,
            padding: '48px 22px',
            textAlign: 'center',
          }}>
            <Receipt size={24} strokeWidth={1} style={{ color: '#e8e4df', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 12, color: '#999' }}>No expenses found</p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #f5f2ee' }}>
                  {['Employee', 'Date', 'Amount', 'Category', 'Project', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px',
                      fontSize: 9,
                      fontWeight: 500,
                      color: '#c0bab2',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      textAlign: h === 'Actions' ? 'right' : h === 'Amount' ? 'right' : 'left',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp) => {
                  const sc = statusConfig[exp.status] || statusConfig.draft;
                  return (
                    <tr
                      key={exp.id}
                      style={{ borderBottom: '0.5px solid #f5f2ee' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FAFAF8'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{exp.employee_name}</p>
                        <p style={{ fontSize: 10, color: '#bbb', margin: 0 }}>{exp.employee_email}</p>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#666' }}>
                        {format(new Date(exp.expense_date + 'T00:00:00'), 'MMM d, yyyy')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, color: '#1a1a1a', textAlign: 'right' }}>
                        ${exp.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: '#666' }}>
                        {exp.category}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: '#999' }}>
                        {exp.project_name || '--'}
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
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {exp.description && (
                            <button
                              onClick={() => setSelectedExpense(selectedExpense?.id === exp.id ? null : exp)}
                              title="View details"
                              style={{
                                background: 'transparent',
                                border: '0.5px solid #e8e4df',
                                borderRadius: 4,
                                padding: '4px 8px',
                                cursor: 'pointer',
                                color: '#999',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Eye size={12} strokeWidth={1.5} />
                            </button>
                          )}
                          {exp.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => handleApprove(exp.id)}
                                disabled={processing === exp.id}
                                style={{
                                  background: '#e31c79',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 5,
                                  padding: '5px 12px',
                                  fontSize: 10,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  opacity: processing === exp.id ? 0.6 : 1,
                                }}
                              >
                                <Check size={11} strokeWidth={2} />
                                Approve
                              </button>
                              <button
                                onClick={() => promptReject(exp.id)}
                                disabled={processing === exp.id}
                                style={{
                                  background: 'transparent',
                                  color: '#b91c1c',
                                  border: '0.5px solid rgba(185,28,28,0.3)',
                                  borderRadius: 5,
                                  padding: '5px 12px',
                                  fontSize: 10,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  opacity: processing === exp.id ? 0.6 : 1,
                                }}
                              >
                                <X size={11} strokeWidth={2} />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense detail panel */}
      {selectedExpense && (
        <div className="anim-slide-up" style={{
          marginTop: 16,
          background: '#fff',
          border: '0.5px solid #e8e4df',
          borderRadius: 10,
          padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
              Expense Detail
            </h3>
            <button
              onClick={() => setSelectedExpense(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 2 }}
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 500, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Employee</p>
              <p style={{ fontSize: 12, color: '#1a1a1a', margin: 0 }}>{selectedExpense.employee_name}</p>
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 500, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Amount</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>${selectedExpense.amount.toFixed(2)}</p>
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 500, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Vendor</p>
              <p style={{ fontSize: 12, color: '#1a1a1a', margin: 0 }}>{selectedExpense.vendor || '--'}</p>
            </div>
          </div>
          {selectedExpense.description && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 9, fontWeight: 500, color: '#c0bab2', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Description</p>
              <p style={{ fontSize: 12, color: '#666', margin: 0, lineHeight: 1.5 }}>{selectedExpense.description}</p>
            </div>
          )}
          {selectedExpense.rejection_reason && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(185,28,28,0.04)', borderRadius: 6, border: '0.5px solid rgba(185,28,28,0.15)' }}>
              <p style={{ fontSize: 9, fontWeight: 500, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Rejection Reason</p>
              <p style={{ fontSize: 12, color: '#b91c1c', margin: 0 }}>{selectedExpense.rejection_reason}</p>
            </div>
          )}
          {selectedExpense.receipt_url && (
            <div style={{ marginTop: 12 }}>
              <a
                href={selectedExpense.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#e31c79', textDecoration: 'none', fontWeight: 500 }}
              >
                View Receipt
              </a>
            </div>
          )}
        </div>
      )}

      {/* Reject modal */}
      <ConfirmModal
        open={rejectModalOpen}
        title="Reject Expense"
        message="Please provide a reason for rejection:"
        confirmLabel="Reject"
        variant="danger"
        inputLabel="Reason"
        inputPlaceholder="Enter rejection reason..."
        inputRequired
        onConfirm={(val?: string) => { if (val) handleReject(val); }}
        onCancel={() => { setRejectModalOpen(false); setRejectTargetId(null); }}
      />
    </div>
  );
}

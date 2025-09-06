'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Clock, Receipt, Search, Filter, Calendar, Eye, Download,
  DollarSign, Users as UsersIcon, LogOut, Check, X,
} from 'lucide-react';

/** ========= Types ========= */
type Role = 'admin' | 'manager' | 'employee' | string;
type Status = 'draft' | 'submitted' | 'approved' | 'rejected';

interface Employee {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department?: string | null;
  role: Role;
  hourly_rate?: number | null;
  is_active: boolean | null; // tolerate nulls in seed data
  manager_id?: string | null;
}

type ItemType = 'timesheet' | 'expense';

interface CombinedCard {
  id: string;
  type: ItemType;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeDept?: string | null;

  status: Status;
  submittedAt: string | null;

  // timesheet
  weekEnd?: string;
  totalHours?: number;
  regularHours?: number;
  overtimeHours?: number;
  hourlyRate?: number;
  amount?: number;

  // expense
  expenseDate?: string;
  expenseAmount?: number;
  category?: string | null;
  description?: string | null;
}

interface HeaderTotals {
  pendingTimesheets: number;
  pendingExpenses: number;
  pendingAmount: number;
  teamCount: number;
}

/** ========= Page ========= */
export default function ManagerDashboard() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [me, setMe] = useState<Employee | null>(null);
  const [team, setTeam] = useState<Employee[]>([]);
  const [items, setItems] = useState<CombinedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // UI
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ItemType>('all');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // 1) Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }

        // 2) Who am I?
        const { data: myEmp } = await supabase
          .from('employees')
          .select('*')
          .or(`id.eq.${user.id},email.eq.${user.email}`)
          .single();

        if (!myEmp) {
          router.push('/dashboard');
          return;
        }
        if (myEmp.role !== 'manager' && myEmp.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        setMe(myEmp as Employee);

        // 3) Determine visible employees
        let visible: Employee[] = [];
        let visibleIds: string[] = [];
        const isAdmin = myEmp.role === 'admin';

        if (isAdmin) {
          // Admin: see everyone considered "active" (true OR null to support seeds)
          const { data } = await supabase
            .from('employees')
            .select('id,email,first_name,last_name,department,role,hourly_rate,is_active,manager_id')
            .or('is_active.is.null,is_active.eq.true');
          visible = data ?? [];
          visibleIds = visible.map(v => v.id);
        } else {
          // Manager: try mapping table first
          const map = await supabase
            .from('manager_employee_access')
            .select('employee_id')
            .eq('manager_id', myEmp.id);

          if (!map.error && (map.data?.length ?? 0) > 0) {
            visibleIds = (map.data ?? []).map(r => r.employee_id);
            const { data } = await supabase
              .from('employees')
              .select('id,email,first_name,last_name,department,role,hourly_rate,is_active,manager_id')
              .in('id', visibleIds)
              .eq('role', 'employee')
              .or('is_active.is.null,is_active.eq.true');
            visible = data ?? [];
          } else {
            // Fallback: employees.manager_id
            const { data } = await supabase
              .from('employees')
              .select('id,email,first_name,last_name,department,role,hourly_rate,is_active,manager_id')
              .eq('manager_id', myEmp.id)
              .eq('role', 'employee')
              .or('is_active.is.null,is_active.eq.true');
            visible = data ?? [];
            visibleIds = visible.map(v => v.id);
          }
        }

        setTeam(visible);

        if (visibleIds.length === 0) {
          setItems([]);
          return;
        }

        // 4) Fetch data (wide window so demo data appears)
        const SINCE_DAYS = 3650; // ~10 years for demos
        const since = new Date();
        since.setDate(since.getDate() - SINCE_DAYS);
        const sinceISO = since.toISOString().split('T')[0];

        const [tRes, eRes] = await Promise.all([
          supabase
            .from('timesheets')
            .select('id,employee_id,week_ending,total_hours,regular_hours,overtime_hours,total_overtime,status,submitted_at,approved_at,approved_by')
            .in('employee_id', visibleIds)
            .gte('week_ending', sinceISO),
          supabase
            .from('expenses')
            .select('id,employee_id,expense_date,amount,category,description,status,submitted_at,approved_at,approved_by')
            .in('employee_id', visibleIds)
            .gte('expense_date', sinceISO),
        ]);

        const byId = new Map(visible.map(e => [e.id, e]));
        const cards: CombinedCard[] = [];

        // Timesheets → cards
        for (const t of (tRes.data ?? [])) {
          const emp = byId.get(t.employee_id);
          if (!emp) continue;

          const rate = Number(emp.hourly_rate ?? 25);
          const reg = Number(t.regular_hours ?? t.total_hours ?? 0);
          const ot = Number(t.overtime_hours ?? t.total_overtime ?? 0);
          const amount = reg * rate + ot * rate * 1.5;

          cards.push({
            id: t.id,
            type: 'timesheet',
            employeeId: emp.id,
            employeeName: `${emp.first_name} ${emp.last_name}`,
            employeeEmail: emp.email,
            employeeDept: emp.department ?? null,
            status: (t.status ?? 'draft') as Status,
            submittedAt: t.submitted_at ?? null,
            weekEnd: t.week_ending,
            totalHours: reg + ot,
            regularHours: reg,
            overtimeHours: ot,
            hourlyRate: rate,
            amount,
          });
        }

        // Expenses → cards
        for (const ex of (eRes.data ?? [])) {
          const emp = byId.get(ex.employee_id);
          if (!emp) continue;

          cards.push({
            id: ex.id,
            type: 'expense',
            employeeId: emp.id,
            employeeName: `${emp.first_name} ${emp.last_name}`,
            employeeEmail: emp.email,
            employeeDept: emp.department ?? null,
            status: (ex.status ?? 'draft') as Status,
            submittedAt: ex.submitted_at ?? null,
            expenseDate: ex.expense_date,
            expenseAmount: Number(ex.amount ?? 0),
            category: ex.category ?? null,
            description: ex.description ?? null,
          });
        }

        // Newest first
        cards.sort((a, b) => {
          const da = a.type === 'timesheet' ? a.weekEnd! : a.expenseDate!;
          const db = b.type === 'timesheet' ? b.weekEnd! : b.expenseDate!;
          return new Date(db).getTime() - new Date(da).getTime();
        });

        setItems(cards);
      } catch (e) {
        console.error('Manager dashboard error:', e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ===== Derived UI ===== */
  const filtered = useMemo(() => {
    return items.filter(i => {
      if (typeFilter !== 'all' && i.type !== typeFilter) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        i.employeeName.toLowerCase().includes(s) ||
        i.employeeEmail.toLowerCase().includes(s) ||
        (i.type === 'expense' && (i.category?.toLowerCase().includes(s) || i.description?.toLowerCase().includes(s)))
      );
    });
  }, [items, typeFilter, statusFilter, search]);

  const totals: HeaderTotals = useMemo(() => {
    let pendingTS = 0, pendingEX = 0, pendingAmt = 0;
    for (const i of items) {
      if (i.status === 'submitted') {
        if (i.type === 'timesheet') {
          pendingTS += 1;
          pendingAmt += Number(i.amount ?? 0);
        } else {
          pendingEX += 1;
          pendingAmt += Number(i.expenseAmount ?? 0);
        }
      }
    }
    // show employees only in the ‘Team Members’ number
    const teamCount = team.filter(t => t.role === 'employee').length;
    return { pendingTimesheets: pendingTS, pendingExpenses: pendingEX, pendingAmount: pendingAmt, teamCount };
  }, [items, team]);

  /** ===== Helpers & Actions ===== */
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const approve = async (card: CombinedCard) => {
    setProcessing(true);
    try {
      if (card.type === 'timesheet') {
        await supabase.from('timesheets').update({
          status: 'approved', approved_at: new Date().toISOString(), approved_by: me?.id ?? null,
        }).eq('id', card.id);
      } else {
        await supabase.from('expenses').update({
          status: 'approved', approved_at: new Date().toISOString(), approved_by: me?.id ?? null,
        }).eq('id', card.id);
      }
      setItems(prev => prev.map(i => (i.id === card.id ? { ...i, status: 'approved' } : i)));
    } finally {
      setProcessing(false);
    }
  };

  const reject = async (card: CombinedCard) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    setProcessing(true);
    try {
      if (card.type === 'timesheet') {
        await supabase.from('timesheets').update({
          status: 'rejected', approved_at: new Date().toISOString(), approved_by: me?.id ?? null, comments: reason,
        }).eq('id', card.id);
      } else {
        await supabase.from('expenses').update({
          status: 'rejected', approved_at: new Date().toISOString(), approved_by: me?.id ?? null, comments: reason,
        }).eq('id', card.id);
      }
      setItems(prev => prev.map(i => (i.id === card.id ? { ...i, status: 'rejected' } : i)));
    } finally {
      setProcessing(false);
    }
  };

  const review = (card: CombinedCard) => {
    const typeParam = card.type === 'timesheet' ? 'timesheet' : 'expense';
    router.push(`/manager/approvals?employee=${card.employeeId}&type=${typeParam}&id=${card.id}`);
  };

  /** ===== Render ===== */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading Manager Dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">West End Workforce</h1>
                <span className="text-xs text-gray-300">Manager Portal</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-200">{me?.email}</span>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login'); }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome strip */}
      <div className="bg-gray-900 text-white pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <h2 className="text-2xl font-bold">Welcome back, {me?.first_name || 'Manager'}!</h2>
          <p className="text-gray-300 mt-1">
            {me?.role === 'admin' ? 'Admin View' : 'Manager View'} • West End Workforce
          </p>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 pb-10">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pending Timesheets</p>
                <p className="text-2xl font-bold text-gray-900">{totals.pendingTimesheets}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pending Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{totals.pendingExpenses}</p>
              </div>
              <Receipt className="h-8 w-8 text-gray-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-gray-900">{totals.teamCount}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-gray-300" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pending Amount</p>
                <p className="text-xl font-bold text-green-600">{fmtMoney(totals.pendingAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-300" />
            </div>
          </div>
        </div>

        {/* Search/Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by employee, email, category, description…"
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="timesheet">Timesheets</option>
                  <option value="expense">Expenses</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mixed List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-[#e31c79]" />
              Timesheets & Expenses
            </h2>
            <button className="bg-[#05202E] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#0a2f3f] transition-colors flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export All
            </button>
          </div>

          {filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((card) => {
                const isTS = card.type === 'timesheet';
                const statusPill =
                  card.status === 'submitted'
                    ? 'bg-orange-100 text-orange-800'
                    : card.status === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : card.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800';

                return (
                  <div key={`${card.type}-${card.id}`} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      {/* Identity */}
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 ${isTS ? 'bg-[#e31c79] bg-opacity-10' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                          {isTS ? <Clock className="w-6 h-6 text-[#e31c79]" /> : <Receipt className="w-6 h-6 text-blue-700" />}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{card.employeeName}</h3>
                          <p className="text-sm text-gray-600">{card.employeeEmail}</p>
                          <p className="text-xs text-gray-500 mt-1">{card.employeeDept || '—'}</p>
                          <p className="text-xs text-gray-500">
                            Submitted: {fmtDate(card.submittedAt ?? (isTS ? card.weekEnd : card.expenseDate))}
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex items-center gap-8">
                        <div className="text-sm text-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusPill}`}>
                              {card.status === 'submitted' ? 'Pending Approval' : card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                            </span>
                          </div>

                          {isTS ? (
                            <>
                              <p className="text-gray-600">
                                Week ending <span className="font-medium text-gray-900">{fmtDate(card.weekEnd)}</span>
                              </p>
                              <p className="text-gray-600">
                                Hours: <span className="font-medium text-gray-900">{(card.totalHours ?? 0).toFixed(1)}</span>
                                {Number(card.overtimeHours ?? 0) > 0 && (
                                  <span className="ml-2 text-[#e31c79]">+{(card.overtimeHours ?? 0).toFixed(1)}h OT</span>
                                )}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-gray-600">
                                Date <span className="font-medium text-gray-900">{fmtDate(card.expenseDate)}</span>
                              </p>
                              <p className="text-gray-600">
                                {card.category ? <span className="font-medium text-gray-900">{card.category}</span> : 'Expense'}
                                {card.description && <span className="text-gray-500"> — {card.description}</span>}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Right: $ / actions */}
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {isTS ? fmtMoney(Number(card.amount ?? 0)) : fmtMoney(Number(card.expenseAmount ?? 0))}
                          </p>
                          <p className="text-sm text-gray-500">{isTS ? `Rate $${card.hourlyRate ?? 0}/hr` : 'Amount'}</p>

                          <div className="mt-3 flex flex-col gap-2">
                            {card.status === 'submitted' && (
                              <>
                                <button
                                  onClick={() => approve(card)}
                                  disabled={processing}
                                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => reject(card)}
                                  disabled={processing}
                                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center disabled:opacity-50"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => review(card)}
                              className="bg-[#e31c79] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#c41a6b] transition-colors flex items-center justify-center"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No items found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

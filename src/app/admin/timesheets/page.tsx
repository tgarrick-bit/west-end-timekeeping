'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdminFilter } from '@/contexts/AdminFilterContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  Clock,
  Calendar,
  Check,
  X,
  Users,
  Download,
  Upload
} from 'lucide-react';
import { format } from 'date-fns';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  hourly_rate?: number;
  role: string;
  manager_id?: string;
}

interface Timesheet {
  id: string;
  employee_id: string;
  employee?: {
    id?: string;
    first_name: string;
    last_name: string;
    email: string;
    department?: string;
    client_id?: string;
    department_id?: string;
    hourly_rate?: number;
    manager_id?: string;
  };
  week_ending: string;
  total_hours?: number;
  overtime_hours?: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  comments?: string;
  created_at?: string;
  updated_at?: string;
  entries?: TimesheetEntry[];
}

interface TimesheetEntry {
  id: string;
  timesheet_id: string;
  date: string;
  project_id: string;
  hours: number;
  description: string | null;
  project?: {
    id: string;
    name: string;
    code: string;
  };
}

const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  submitted: { dot: '#c4983a', bg: 'rgba(196,152,58,0.08)', text: '#c4983a', label: 'Pending' },
  approved: { dot: '#2d9b6e', bg: 'rgba(45,155,110,0.08)', text: '#2d9b6e', label: 'Approved' },
  rejected: { dot: '#b91c1c', bg: 'rgba(185,28,28,0.08)', text: '#b91c1c', label: 'Rejected' },
  draft: { dot: '#c0bab2', bg: 'rgba(192,186,178,0.08)', text: '#999', label: 'Draft' },
};

export default function AdminTimesheets() {
  const [allTimesheets, setAllTimesheets] = useState<Timesheet[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimesheet, setSelectedTimesheet] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'submitted' | 'approved' | 'rejected'>('all');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [filterManager, setFilterManager] = useState<string>('all');

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  const { selectedClientId, selectedDepartmentId } = useAdminFilter();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch all employees
      const { data: employeeData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .order('last_name');

      setEmployees(employeeData || []);

      // Extract managers from employees
      const managersData = employeeData?.filter(emp => emp.role === 'manager') || [];
      setManagers(managersData);

      // Fetch ALL timesheets with employee details including manager_id
      const { data: timesheetData, error: tsError } = await supabase
        .from('timesheets')
        .select(`
          *,
          employee:employees!timesheets_employee_id_fkey (
            id,
            first_name,
            last_name,
            email,
            department,
            client_id,
            department_id,
            hourly_rate,
            manager_id
          )
        `)
        .order('week_ending', { ascending: false });

      if (tsError) {
        console.error('Timesheets error:', tsError);
      }
      setAllTimesheets(timesheetData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTimesheet = async (timesheetId: string) => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/timesheets/${timesheetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to approve timesheet');
      }

      toast('success', 'Timesheet approved successfully.');
      await fetchAllData();

      if (selectedTimesheet?.id === timesheetId) {
        setIsModalOpen(false);
        setSelectedTimesheet(null);
      }
    } catch (error: any) {
      console.error('Error approving timesheet:', error);
      toast('error', error?.message || 'Error approving timesheet');
    } finally {
      setProcessing(false);
    }
  };

  const promptRejectTimesheet = (timesheetId: string) => {
    setRejectTargetId(timesheetId);
    setRejectModalOpen(true);
  };

  const handleRejectTimesheet = async (reason: string) => {
    if (!rejectTargetId) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/timesheets/${rejectTargetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to reject timesheet');
      }

      toast('success', 'Timesheet rejected.');
      await fetchAllData();

      if (selectedTimesheet?.id === rejectTargetId) {
        setIsModalOpen(false);
        setSelectedTimesheet(null);
      }
    } catch (error: any) {
      console.error('Error rejecting timesheet:', error);
      toast('error', error?.message || 'Error rejecting timesheet');
    } finally {
      setProcessing(false);
      setRejectModalOpen(false);
      setRejectTargetId(null);
    }
  };

  const openTimecardDetail = async (timesheet: Timesheet) => {
    // Fetch entries for this specific timesheet with project information
    const { data: entries, error } = await supabase
      .from('timesheet_entries')
      .select(`
        *,
        project:projects (
          id,
          name,
          code
        )
      `)
      .eq('timesheet_id', timesheet.id)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching entries:', error);
      return;
    }

    // Calculate overtime if not already set
    const totalHours = timesheet.total_hours || 0;
    const overtimeHours = timesheet.overtime_hours ?? Math.max(0, totalHours - 40);

    // Create the timesheet object with the correct structure for TimesheetModal
    const timesheetWithEntries: any = {
      ...timesheet,
      total_hours: totalHours,
      overtime_hours: overtimeHours,
      entries: entries || []
    };

    setSelectedTimesheet(timesheetWithEntries);
    setIsModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Week Ending', 'Employee', 'Department', 'Manager', 'Hours', 'Status'];
    const rows: string[][] = [];

    // Apply all filters
    const dataToExport = getFullyFilteredTimesheets();

    dataToExport.forEach(ts => {
      const emp = getEmployeeInfo(ts.employee_id);
      const manager = getManagerName(ts.employee?.manager_id || '');
      rows.push([
        ts.week_ending,
        emp.name,
        emp.department,
        manager,
        (ts.total_hours || 0).toString(),
        ts.status
      ]);
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheets_${filterWeek === 'all' ? 'all_weeks' : filterWeek}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Get fully filtered timesheets based on all filters
  const getFullyFilteredTimesheets = () => {
    let filtered = [...allTimesheets];

    // Filter by admin context (client + department)
    if (selectedClientId) {
      filtered = filtered.filter(ts => ts.employee?.client_id === selectedClientId);
    }
    if (selectedDepartmentId) {
      filtered = filtered.filter(ts => ts.employee?.department_id === selectedDepartmentId);
    }

    // Filter by manager
    if (filterManager !== 'all') {
      if (filterManager === 'unassigned') {
        filtered = filtered.filter(ts => !ts.employee?.manager_id);
      } else {
        filtered = filtered.filter(ts => ts.employee?.manager_id === filterManager);
      }
    }

    // Filter by week
    if (filterWeek !== 'all') {
      filtered = filtered.filter(ts => ts.week_ending === filterWeek);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(ts => ts.status === filterStatus);
    }

    return filtered;
  };

  // Group timesheets by week (after filtering)
  const groupedByWeek = new Map<string, Timesheet[]>();
  const filteredData = getFullyFilteredTimesheets();

  filteredData.forEach(ts => {
    const week = ts.week_ending;
    if (!groupedByWeek.has(week)) {
      groupedByWeek.set(week, []);
    }
    groupedByWeek.get(week)!.push(ts);
  });

  // Sort weeks (most recent first)
  const sortedWeeks = Array.from(groupedByWeek.entries()).sort((a, b) =>
    new Date(b[0]).getTime() - new Date(a[0]).getTime()
  );

  // Get unique weeks for dropdown (from all timesheets, not filtered)
  const availableWeeks = [...new Set(allTimesheets.map(ts => ts.week_ending))].sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Calculate stats based on filtered data
  const getFilteredStats = () => {
    const relevantTimesheets = getFullyFilteredTimesheets();

    // Get unique employees in filtered timesheets
    const uniqueEmployees = new Set(relevantTimesheets.map(ts => ts.employee_id));

    return {
      totalEmployees: uniqueEmployees.size,
      pendingApproval: relevantTimesheets.filter(ts => ts.status === 'submitted').length,
      approved: relevantTimesheets.filter(ts => ts.status === 'approved').length,
      draft: relevantTimesheets.filter(ts => ts.status === 'draft').length,
      rejected: relevantTimesheets.filter(ts => ts.status === 'rejected').length,
      totalHours: relevantTimesheets.reduce((sum, ts) => sum + (ts.total_hours || 0), 0)
    };
  };

  const stats = getFilteredStats();

  const getEmployeeInfo = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return {
      name: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
      email: employee?.email || '',
      department: employee?.department || '-',
      hourlyRate: employee?.hourly_rate || 75
    };
  };

  const getManagerName = (managerId: string) => {
    if (!managerId) return 'Unassigned';
    const manager = managers.find(m => m.id === managerId);
    return manager ? `${manager.first_name} ${manager.last_name}` : 'Unknown';
  };

  // Format week display
  const formatWeekDisplay = (weekEnding: string) => {
    const weekDate = new Date(weekEnding);
    const weekStart = new Date(weekDate);
    weekStart.setDate(weekDate.getDate() - 6);
    return `${format(weekStart, 'MMM d')} - ${format(weekDate, 'MMM d, yyyy')}`;
  };

  // Skeleton loading state
  if (loading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div className="mb-6">
          <div className="anim-shimmer" style={{ width: 140, height: 24, borderRadius: 6, marginBottom: 8 }} />
          <div className="anim-shimmer" style={{ width: 300, height: 14, borderRadius: 4 }} />
        </div>

        {/* Tab skeleton */}
        <div className="flex items-center gap-6 mb-6" style={{ borderBottom: '0.5px solid #f0ece7', paddingBottom: 10 }}>
          {[40, 60, 70, 60].map((w, i) => (
            <div key={i} className="anim-shimmer" style={{ width: w, height: 12, borderRadius: 3 }} />
          ))}
        </div>

        {/* Controls skeleton */}
        <div className="anim-slide-up stagger-1" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '16px 22px', marginBottom: 24 }}>
          <div className="flex items-center gap-4">
            <div className="anim-shimmer" style={{ width: 120, height: 28, borderRadius: 7 }} />
            <div className="anim-shimmer" style={{ width: 140, height: 28, borderRadius: 7 }} />
            <div className="anim-shimmer" style={{ width: 80, height: 28, borderRadius: 7 }} />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className={`anim-slide-up stagger-${n}`} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div className="anim-shimmer" style={{ width: 70, height: 8, borderRadius: 3, marginBottom: 12 }} />
              <div className="anim-shimmer" style={{ width: 40, height: 28, borderRadius: 4 }} />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="anim-slide-up stagger-5" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
            <div className="anim-shimmer" style={{ width: 220, height: 14, borderRadius: 4 }} />
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ padding: '12px 20px', borderBottom: '0.5px solid #f5f2ee' }} className="flex items-center gap-6">
              <div className="anim-shimmer" style={{ width: 140, height: 14, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 80, height: 14, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 80, height: 14, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 50, height: 14, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 60, height: 18, borderRadius: 3 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Content */}
      <div style={{ padding: '36px 40px' }}>
        {/* Page Header */}
        <div className="mb-6 anim-slide-up stagger-1">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>Timesheets</h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#999' }}>Review and manage all employee timesheets</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-6 mb-6 anim-slide-up stagger-1" style={{ borderBottom: '0.5px solid #f0ece7' }}>
          {([
            { key: 'all', label: 'All' },
            { key: 'submitted', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key as any)}
              style={{
                fontSize: 12,
                fontWeight: filterStatus === tab.key ? 600 : 400,
                color: filterStatus === tab.key ? '#1a1a1a' : '#999',
                borderBottom: filterStatus === tab.key ? '2px solid #e31c79' : '2px solid transparent',
                paddingBottom: 10,
                transition: 'color 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Controls Bar */}
        <div className="anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '16px 22px', marginBottom: 24 }}>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={filterWeek}
              onChange={(e) => setFilterWeek(e.target.value)}
              style={{ border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, padding: '6px 10px' }}
              className="focus:outline-none focus:border-[#d3ad6b] focus:shadow-[0_0_0_3px_rgba(211,173,107,0.08)]"
            >
              <option value="all">All Weeks</option>
              {availableWeeks.map(week => (
                <option key={week} value={week}>
                  Week of {formatWeekDisplay(week)}
                </option>
              ))}
            </select>

            <select
              value={filterManager}
              onChange={(e) => setFilterManager(e.target.value)}
              style={{ border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, padding: '6px 10px' }}
              className="focus:outline-none focus:border-[#d3ad6b] focus:shadow-[0_0_0_3px_rgba(211,173,107,0.08)]"
            >
              <option value="all">All Managers</option>
              {managers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.first_name} {manager.last_name}
                </option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 transition-colors"
              style={{ padding: '8px 18px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
            >
              <Download className="h-4 w-4" />
              Export
            </button>

            <button
              onClick={() => router.push('/admin/timesheets/import')}
              className="flex items-center gap-2 transition-colors"
              style={{ padding: '8px 18px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
            >
              <Upload className="h-4 w-4" />
              Import
            </button>

            <span style={{ fontSize: 11, color: '#c0bab2', marginLeft: 'auto' }}>
              {sortedWeeks.length} week{sortedWeeks.length !== 1 ? 's' : ''}
              {filterManager !== 'all' && ` \u00b7 ${getManagerName(filterManager)}`}
            </span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Employees', value: stats.totalEmployees, accent: true },
            { label: 'Pending', value: stats.pendingApproval, pink: true },
            { label: 'Approved', value: stats.approved },
            { label: 'Total Hours', value: stats.totalHours.toFixed(0) },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`anim-slide-up stagger-${i + 1}`}
              style={{
                background: '#fff',
                border: '0.5px solid #e8e4df',
                borderRadius: 10,
                padding: '22px 24px',
                transition: 'border-color 0.15s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = i === 0 ? '#e31c79' : '#d3ad6b' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e8e4df' }}
            >
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.2, color: '#c0bab2' }}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: stat.pink ? '#e31c79' : '#1a1a1a' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Timesheets by Week */}
        <div className="space-y-6">
          {sortedWeeks.length === 0 ? (
            <div className="anim-slide-up stagger-5" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#999' }}>No timesheets found for the selected filters.</p>
            </div>
          ) : (
            sortedWeeks.map(([weekEnding, weekTimesheets], weekIdx) => {
              const weekDate = new Date(weekEnding);
              const weekStart = new Date(weekDate);
              weekStart.setDate(weekDate.getDate() - 6);

              return (
                <div key={weekEnding} className={`anim-slide-up stagger-${Math.min(weekIdx + 5, 6)}`} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Week Header */}
                  <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                    <div className="flex items-center justify-between">
                      <h2 style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
                        Week of {weekStart.toLocaleDateString()} - {weekDate.toLocaleDateString()}
                      </h2>
                      <span style={{ fontSize: 10.5, color: '#c0bab2' }}>
                        {weekTimesheets.length} timesheets
                      </span>
                    </div>
                  </div>

                  {/* Timesheet List */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          {['Employee', 'Department', 'Manager', 'Hours', 'Status', 'Actions'].map(h => (
                            <th
                              key={h}
                              className="text-left"
                              style={{ padding: '11px 20px', fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase', borderBottom: '0.5px solid #f0ece7' }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {weekTimesheets.map((timesheet) => {
                          const empInfo = getEmployeeInfo(timesheet.employee_id);
                          const managerName = getManagerName(timesheet.employee?.manager_id || '');
                          const badge = statusConfig[timesheet.status] || statusConfig.draft;
                          return (
                            <tr key={timesheet.id} className="hover:bg-[#FDFCFB]" style={{ borderBottom: '0.5px solid #f5f2ee', transition: 'background 0.15s ease', cursor: 'pointer' }} onClick={() => router.push(`/manager/timesheet/${timesheet.id}`)}>
                              <td style={{ padding: '12px 20px' }} className="whitespace-nowrap">
                                <div>
                                  <p style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                                    {empInfo.name}
                                  </p>
                                  <p style={{ fontSize: 10.5, color: '#c0bab2' }}>{empInfo.email}</p>
                                </div>
                              </td>
                              <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555' }} className="whitespace-nowrap">
                                {empInfo.department}
                              </td>
                              <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555' }} className="whitespace-nowrap">
                                {managerName}
                              </td>
                              <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555' }} className="whitespace-nowrap">
                                {timesheet.total_hours || 0} hrs
                                {timesheet.overtime_hours ? ` (+${timesheet.overtime_hours} OT)` : ''}
                              </td>
                              <td style={{ padding: '12px 20px' }} className="whitespace-nowrap">
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  fontSize: 9,
                                  fontWeight: 500,
                                  borderRadius: 3,
                                  padding: '2px 8px',
                                  background: badge.bg,
                                  color: badge.text,
                                }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: badge.dot }} />
                                  {badge.label}
                                </span>
                              </td>
                              <td style={{ padding: '12px 20px' }} className="whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {timesheet.status === 'submitted' && (
                                    <>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleApproveTimesheet(timesheet.id); }}
                                        disabled={processing}
                                        className="p-1 rounded disabled:opacity-50 transition-colors"
                                        style={{ color: '#2d9b6e' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(45,155,110,0.06)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); promptRejectTimesheet(timesheet.id); }}
                                        disabled={processing}
                                        className="p-1 rounded disabled:opacity-50 transition-colors"
                                        style={{ color: '#b91c1c' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(185,28,28,0.06)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                      >
                                        <X className="h-4 w-4" />
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
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reject reason modal */}
      <ConfirmModal
        open={rejectModalOpen}
        title="Reject Timesheet"
        message="Please provide a reason for rejection. This will be visible to the employee."
        confirmLabel="Reject"
        variant="danger"
        inputLabel="Rejection Reason"
        inputPlaceholder="Enter the reason for rejection..."
        inputRequired
        onConfirm={(reason) => handleRejectTimesheet(reason || '')}
        onCancel={() => { setRejectModalOpen(false); setRejectTargetId(null); }}
      />
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import TimesheetModal from '@/components/TimesheetModal';
import { 
  Clock,
  Calendar,
  Check,
  X,
  Users,
  Download,
  Eye
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
  
  const supabase = createClient();
  const router = useRouter();

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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('timesheets')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', timesheetId);

      if (error) throw error;
      
      // Refresh data
      await fetchAllData();
      
      // Close modal if this was the selected timesheet
      if (selectedTimesheet?.id === timesheetId) {
        setIsModalOpen(false);
        setSelectedTimesheet(null);
      }
    } catch (error) {
      console.error('Error approving timesheet:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTimesheet = async (timesheetId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({ 
          status: 'rejected',
          comments: 'Please review and resubmit'
        })
        .eq('id', timesheetId);

      if (error) throw error;
      
      // Refresh data
      await fetchAllData();
      
      // Close modal if this was the selected timesheet
      if (selectedTimesheet?.id === timesheetId) {
        setIsModalOpen(false);
        setSelectedTimesheet(null);
      }
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
    } finally {
      setProcessing(false);
    }
  };

  const openTimecardDetail = async (timesheet: Timesheet) => {
    console.log('Opening timecard for timesheet:', timesheet.id);
    console.log('Employee ID:', timesheet.employee_id);
    
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
    
    console.log('Raw entries from database:', entries);
    console.log('Number of entries:', entries?.length || 0);

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
    
    console.log('Final timesheet with entries:', timesheetWithEntries);
    console.log('Entries in timesheet:', timesheetWithEntries.entries);
    
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#e8e4df] border-t-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-[#777]">Loading all timesheets...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Content */}
      <div style={{ padding: '36px 40px' }}>
        {/* Page Header */}
        <div className="mb-6">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>Timesheets</h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#bbb' }}>Review and manage all employee timesheets</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-6 mb-6" style={{ borderBottom: '0.5px solid #f0ece7' }}>
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
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Controls Bar */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '16px 22px', marginBottom: 24 }}>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={filterWeek}
              onChange={(e) => setFilterWeek(e.target.value)}
              style={{ border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, padding: '6px 10px' }}
              className="focus:outline-none focus:border-[#d3ad6b]"
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
              className="focus:outline-none focus:border-[#d3ad6b]"
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
              className="flex items-center gap-2 hover:border-[#ccc] hover:text-[#555]"
              style={{ padding: '6px 14px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 500 }}
            >
              <Download className="h-4 w-4" />
              Export
            </button>

            <span style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>
              {sortedWeeks.length} week{sortedWeeks.length !== 1 ? 's' : ''}
              {filterManager !== 'all' && ` \u00b7 ${getManagerName(filterManager)}`}
            </span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>Employees</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{stats.totalEmployees}</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>Pending</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#e31c79' }}>{stats.pendingApproval}</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>Approved</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{stats.approved}</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>Total Hours</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>{stats.totalHours.toFixed(0)}</div>
          </div>
        </div>

        {/* Timesheets by Week */}
        <div className="space-y-6">
          {sortedWeeks.length === 0 ? (
            <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#999' }}>No timesheets found for the selected filters.</p>
            </div>
          ) : (
            sortedWeeks.map(([weekEnding, weekTimesheets]) => {
              const weekDate = new Date(weekEnding);
              const weekStart = new Date(weekDate);
              weekStart.setDate(weekDate.getDate() - 6);
              
              return (
                <div key={weekEnding} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Week Header */}
                  <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                    <div className="flex items-center justify-between">
                      <h2 style={{ fontSize: 12, fontWeight: 600 }}>
                        Week of {weekStart.toLocaleDateString()} - {weekDate.toLocaleDateString()}
                      </h2>
                      <span style={{ fontSize: 11, color: '#999' }}>
                        {weekTimesheets.length} timesheets
                      </span>
                    </div>
                  </div>

                  {/* Timesheet List */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="px-6 py-2 text-left" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Employee</th>
                          <th className="px-6 py-2 text-left" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Department</th>
                          <th className="px-6 py-2 text-left" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Manager</th>
                          <th className="px-6 py-2 text-left" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Hours</th>
                          <th className="px-6 py-2 text-left" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Status</th>
                          <th className="px-6 py-2 text-left" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekTimesheets.map((timesheet) => {
                          const empInfo = getEmployeeInfo(timesheet.employee_id);
                          const managerName = getManagerName(timesheet.employee?.manager_id || '');
                          return (
                            <tr key={timesheet.id} className="hover:bg-[#FDFCFB]" style={{ borderBottom: '0.5px solid #f5f2ee' }}>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div>
                                  <p style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                                    {empInfo.name}
                                  </p>
                                  <p style={{ fontSize: 11, color: '#999' }}>{empInfo.email}</p>
                                </div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap" style={{ fontSize: 12.5, color: '#555' }}>
                                {empInfo.department}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap" style={{ fontSize: 12.5, color: '#555' }}>
                                {managerName}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap" style={{ fontSize: 12.5, color: '#555' }}>
                                {timesheet.total_hours || 0} hrs
                                {timesheet.overtime_hours ? ` (+${timesheet.overtime_hours} OT)` : ''}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-[3px] ${
                                  timesheet.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                                  timesheet.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  timesheet.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-[#FAFAF8] text-[#1a1a1a]'
                                }`} style={{ fontSize: 9, fontWeight: 500 }}>
                                  {timesheet.status}
                                </span>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openTimecardDetail(timesheet)}
                                    className="p-1 hover:bg-[#FDFCFB] rounded"
                                    style={{ color: '#777' }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  {timesheet.status === 'submitted' && (
                                    <>
                                      <button
                                        onClick={() => handleApproveTimesheet(timesheet.id)}
                                        disabled={processing}
                                        className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleRejectTimesheet(timesheet.id)}
                                        disabled={processing}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
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

      {/* Timesheet Modal - Updated with correct props */}
      {selectedTimesheet && (
        <TimesheetModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTimesheet(null);
          }}
          timesheet={selectedTimesheet}
          onApprove={() => {
            handleApproveTimesheet(selectedTimesheet.id);
          }}
          onReject={() => {
            handleRejectTimesheet(selectedTimesheet.id);
          }}
        />
      )}
    </>
  );
}
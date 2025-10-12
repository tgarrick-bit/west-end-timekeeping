'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import TimesheetModal from '@/components/TimesheetModal';
import { 
  Clock,
  ChevronLeft,
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
  
  const supabase = createClientComponentClient();
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading all timesheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 text-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">All Timesheets</h1>
                <p className="text-sm text-gray-300">
                  Complete timesheet history - {allTimesheets.length} records
                </p>
              </div>
            </div>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/auth/login');
              }}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Bar with All Filters */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4 border border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="text-sm text-gray-600">
              Showing {sortedWeeks.length} weeks of timesheet data
              {filterStatus !== 'all' && (
                <span className="ml-2 font-medium">
                  (Status: {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)})
                </span>
              )}
              {filterManager !== 'all' && (
                <span className="ml-2 font-medium">
                  (Manager: {getManagerName(filterManager)})
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={filterWeek}
                onChange={(e) => setFilterWeek(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Weeks</option>
                {availableWeeks.map(week => (
                  <option key={week} value={week}>
                    Week of {formatWeekDisplay(week)}
                  </option>
                ))}
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              
              <select
                value={filterManager}
                onChange={(e) => setFilterManager(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats - Updates based on filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-yellow-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-green-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-blue-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-xl font-bold text-blue-600">{stats.totalHours.toFixed(0)}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Timesheets by Week */}
        <div className="space-y-6">
          {sortedWeeks.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">No timesheets found for the selected filters.</p>
            </div>
          ) : (
            sortedWeeks.map(([weekEnding, weekTimesheets]) => {
              const weekDate = new Date(weekEnding);
              const weekStart = new Date(weekDate);
              weekStart.setDate(weekDate.getDate() - 6);
              
              return (
                <div key={weekEnding} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Week Header */}
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <h2 className="text-lg font-semibold">
                          Week of {weekStart.toLocaleDateString()} - {weekDate.toLocaleDateString()}
                        </h2>
                      </div>
                      <span className="text-sm text-gray-500">
                        {weekTimesheets.length} timesheets
                      </span>
                    </div>
                  </div>
                  
                  {/* Timesheet List */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Manager
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {weekTimesheets.map((timesheet) => {
                          const empInfo = getEmployeeInfo(timesheet.employee_id);
                          const managerName = getManagerName(timesheet.employee?.manager_id || '');
                          return (
                            <tr key={timesheet.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {empInfo.name}
                                  </p>
                                  <p className="text-xs text-gray-500">{empInfo.email}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {empInfo.department}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {managerName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {timesheet.total_hours || 0} hrs
                                {timesheet.overtime_hours ? ` (+${timesheet.overtime_hours} OT)` : ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                  timesheet.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                                  timesheet.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  timesheet.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {timesheet.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openTimecardDetail(timesheet)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
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
    </div>
  );
}
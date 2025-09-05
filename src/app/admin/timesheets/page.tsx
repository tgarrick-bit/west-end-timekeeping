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

interface Timesheet {
  id: string;
  employee_id: string;
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
    department?: string;
    client_id?: string;
    hourly_rate?: number;
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
}

interface TimecardDetail {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_department?: string;
  week_ending: string;
  total_hours: number;
  total_overtime: number;
  total_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  notes?: string;
  entries?: TimecardEntry[];
}

interface TimecardEntry {
  id: string;
  date: string;
  project_id?: string;
  project_name?: string;
  project_code?: string;
  hours: number;
  overtime_hours?: number;
  description?: string;
}

export default function AdminTimesheets() {
  const [allTimesheets, setAllTimesheets] = useState<Timesheet[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimecard, setSelectedTimecard] = useState<TimecardDetail | null>(null);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'submitted' | 'approved' | 'rejected'>('all');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  
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
      
      // Fetch ALL timesheets
      const { data: timesheetData, error: tsError } = await supabase
        .from('timesheets')
        .select('*')
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
      
      await supabase
        .from('timesheets')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', timesheetId);
      
      fetchAllData();
    } catch (error) {
      console.error('Error approving timesheet:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTimesheet = async (timesheetId: string) => {
    setProcessing(true);
    try {
      await supabase
        .from('timesheets')
        .update({ 
          status: 'rejected',
          comments: 'Please review and resubmit'
        })
        .eq('id', timesheetId);
      
      fetchAllData();
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleModalApprove = async () => {
    if (selectedTimecard) {
      await handleApproveTimesheet(selectedTimecard.id);
      setSelectedTimecard(null);
    }
  };

  const handleModalReject = async () => {
    if (selectedTimecard) {
      await handleRejectTimesheet(selectedTimecard.id);
      setSelectedTimecard(null);
    }
  };

  const openTimecardDetail = async (timesheet: Timesheet) => {
    const employee = employees.find(e => e.id === timesheet.employee_id);
    
    console.log('Opening timecard for timesheet:', timesheet.id);
    console.log('Employee ID:', timesheet.employee_id);
    
    // Fetch entries for this specific timesheet
    const { data: entries, error } = await supabase
      .from('timesheet_entries')
      .select(`
        *,
        projects (
          id,
          name,
          code
        )
      `)
      .eq('timesheet_id', timesheet.id)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching entries:', error);
    }
    
    console.log('Raw entries from database:', entries);
    console.log('Number of entries:', entries?.length || 0);

    // Calculate overtime properly
    const totalHours = timesheet.total_hours || 0;
    const calculatedOvertime = Math.max(0, totalHours - 40);
    const hourlyRate = employee?.hourly_rate || 75;

    const timecardDetail: TimecardDetail = {
      id: timesheet.id,
      employee_id: timesheet.employee_id,
      employee_name: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
      employee_email: employee?.email || '',
      employee_department: employee?.department,
      week_ending: timesheet.week_ending,
      total_hours: totalHours,
      total_overtime: calculatedOvertime,  // Calculate overtime instead of using stored value
      total_amount: (totalHours * hourlyRate) + (calculatedOvertime * hourlyRate * 0.5),  // Include overtime in total amount
      status: timesheet.status,
      submitted_at: timesheet.submitted_at || null,
      approved_at: timesheet.approved_at,
      approved_by: timesheet.approved_by,
      notes: timesheet.comments,
      entries: entries?.map(e => {
        console.log('Processing entry:', e);
        return {
          id: e.id,
          date: e.date,
          project_id: e.project_id || undefined,
          project_name: e.projects?.name || 'General Work',
          project_code: e.projects?.code || undefined,
          hours: parseFloat(e.hours) || 0,  // Ensure hours is a number
          overtime_hours: undefined,
          description: e.description || undefined
        };
      }) || []
    };
    
    console.log('Final timecard detail:', timecardDetail);
    console.log('Entries in timecard:', timecardDetail.entries);
    console.log('First entry (if exists):', timecardDetail.entries?.[0]);
    console.log('Calculated overtime:', calculatedOvertime);
    
    setSelectedTimecard(timecardDetail);
  };

  const exportToCSV = () => {
    const headers = ['Week Ending', 'Employee', 'Department', 'Hours', 'Status'];
    const rows: string[][] = [];

    // Export only filtered data
    const dataToExport = filterWeek === 'all' 
      ? allTimesheets 
      : allTimesheets.filter(ts => ts.week_ending === filterWeek);
    
    const filteredData = dataToExport.filter(ts => 
      filterStatus === 'all' || ts.status === filterStatus
    );

    filteredData.forEach(ts => {
      const emp = getEmployeeInfo(ts.employee_id);
      rows.push([
        ts.week_ending,
        emp.name,
        emp.department,
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

  // Group timesheets by week
  const groupedByWeek = new Map<string, Timesheet[]>();
  allTimesheets.forEach(ts => {
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

  // Get unique weeks for dropdown
  const availableWeeks = sortedWeeks.map(([week]) => week);

  // Filter weeks based on selection
  const filteredWeeks = filterWeek === 'all' 
    ? sortedWeeks 
    : sortedWeeks.filter(([week]) => week === filterWeek);

  // Apply status filters
  const getFilteredTimesheets = (timesheets: Timesheet[]) => {
    if (filterStatus === 'all') {
      return timesheets;
    }
    return timesheets.filter(ts => ts.status === filterStatus);
  };

  // Calculate stats based on filtered data
  const getFilteredStats = () => {
    const relevantTimesheets = filterWeek === 'all' 
      ? allTimesheets 
      : allTimesheets.filter(ts => ts.week_ending === filterWeek);
    
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

  const getEmployeeInfo = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return {
      name: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
      email: employee?.email || '',
      department: employee?.department || '-',
      hourlyRate: employee?.hourly_rate || 75
    };
  };

  // Format week display
  const formatWeekDisplay = (weekEnding: string) => {
    const weekDate = new Date(weekEnding);
    const weekStart = new Date(weekDate);
    weekStart.setDate(weekDate.getDate() - 6);
    return `${format(weekStart, 'MMM d')} - ${format(weekDate, 'MMM d, yyyy')}`;
  };

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
        {/* Controls Bar with Week Filter */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filterWeek === 'all' ? `${sortedWeeks.length} weeks` : '1 week'} of timesheet data
              {filterStatus !== 'all' && (
                <span className="ml-2 font-medium">
                  (Status: {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)})
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
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
          {filteredWeeks.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">No timesheets found for the selected filters.</p>
            </div>
          ) : (
            filteredWeeks.map(([weekEnding, weekTimesheets]) => {
              const filteredTimesheets = getFilteredTimesheets(weekTimesheets);
              if (filteredTimesheets.length === 0) return null;
              
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
                        {filteredTimesheets.length} timesheets
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
                        {filteredTimesheets.map((timesheet) => {
                          const empInfo = getEmployeeInfo(timesheet.employee_id);
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

      {/* Timesheet Modal */}
      {selectedTimecard && (
        <TimesheetModal
          isOpen={true}
          onClose={() => setSelectedTimecard(null)}
          timesheet={selectedTimecard as any}
          onApprove={handleModalApprove}
          onReject={handleModalReject}
          processing={processing}
        />
      )}
    </div>
  );
}
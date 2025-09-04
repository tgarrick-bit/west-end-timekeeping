'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { 
  Clock,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Calendar,
  Check,
  X,
  AlertCircle,
  Building2,
  Users,
  FileText,
  Download,
  Filter
} from 'lucide-react';

interface Timesheet {
  id: string;
  employee_id: string;
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
    department?: string;
    client_id?: string;
  };
  week_ending: string;
  total_hours?: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  comments?: string;
  created_at?: string;
  updated_at?: string;
}

interface ClientGroup {
  client_id: string;
  client_name: string;
  employees: EmployeeTimesheets[];
  totalPending: number;
  totalApproved: number;
  totalEmployees: number;
  missingCount: number;
  expanded: boolean;
}

interface EmployeeTimesheets {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  department?: string;
  timesheets: Timesheet[];
  totalHours: number;
  hasSubmitted: boolean;
}

export default function AdminTimesheets() {
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'missing'>('all');
  
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    fetchTimesheets();
  }, [selectedWeek]);

  const getWeekDates = (date: Date) => {
    const week = new Date(date);
    const day = week.getDay();
    const diff = week.getDate() - day;
    const sunday = new Date(week.setDate(diff));
    const saturday = new Date(week.setDate(diff + 6));
    return { sunday, saturday };
  };

  const fetchTimesheets = async () => {
    try {
      const { sunday, saturday } = getWeekDates(selectedWeek);
      const weekEndingDate = saturday.toISOString().split('T')[0];
      
      // Fetch all clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      // Fetch all employees with their client assignments
      const { data: employees } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          department,
          client_id
        `)
        .eq('is_active', true);

      // Fetch all timesheets for the week
      const { data: timesheets } = await supabase
        .from('timesheets')
        .select(`
          *,
          employee:employees!employee_id (
            first_name,
            last_name,
            email,
            department,
            client_id
          )
        `)
        .eq('week_ending', weekEndingDate)
        .order('created_at', { ascending: true });

      console.log('Fetched timesheets:', timesheets); // Debug log

      // Group by client
      const groups: ClientGroup[] = [];
      
      for (const client of clients || []) {
        const clientEmployees = employees?.filter(emp => emp.client_id === client.id) || [];
        const employeeTimesheets: EmployeeTimesheets[] = [];
        let totalPending = 0;
        let totalApproved = 0;
        let missingCount = 0;

        for (const employee of clientEmployees) {
          const empTimesheets = timesheets?.filter(ts => ts.employee_id === employee.id) || [];
          const totalHours = empTimesheets.reduce((sum, ts) => sum + (ts.total_hours || 0), 0);
          const hasSubmitted = empTimesheets.length > 0 && empTimesheets.some(ts => ts.status !== 'draft');

          if (!hasSubmitted) {
            missingCount++;
          }

          totalPending += empTimesheets.filter(ts => ts.status === 'submitted').length;
          totalApproved += empTimesheets.filter(ts => ts.status === 'approved').length;

          employeeTimesheets.push({
            employee_id: employee.id,
            employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
            employee_email: employee.email,
            department: employee.department,
            timesheets: empTimesheets,
            totalHours,
            hasSubmitted
          });
        }

        if (clientEmployees.length > 0) {
          groups.push({
            client_id: client.id,
            client_name: client.name,
            employees: employeeTimesheets,
            totalPending,
            totalApproved,
            totalEmployees: clientEmployees.length,
            missingCount,
            expanded: false
          });
        }
      }

      // Also add employees without clients
      const unassignedEmployees = employees?.filter(emp => !emp.client_id) || [];
      if (unassignedEmployees.length > 0) {
        const employeeTimesheets: EmployeeTimesheets[] = [];
        let totalPending = 0;
        let totalApproved = 0;
        let missingCount = 0;

        for (const employee of unassignedEmployees) {
          const empTimesheets = timesheets?.filter(ts => ts.employee_id === employee.id) || [];
          const totalHours = empTimesheets.reduce((sum, ts) => sum + (ts.total_hours || 0), 0);
          const hasSubmitted = empTimesheets.length > 0 && empTimesheets.some(ts => ts.status !== 'draft');

          if (!hasSubmitted) {
            missingCount++;
          }

          totalPending += empTimesheets.filter(ts => ts.status === 'submitted').length;
          totalApproved += empTimesheets.filter(ts => ts.status === 'approved').length;

          employeeTimesheets.push({
            employee_id: employee.id,
            employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
            employee_email: employee.email,
            department: employee.department,
            timesheets: empTimesheets,
            totalHours,
            hasSubmitted
          });
        }

        groups.push({
          client_id: 'unassigned',
          client_name: 'Unassigned Employees',
          employees: employeeTimesheets,
          totalPending,
          totalApproved,
          totalEmployees: unassignedEmployees.length,
          missingCount,
          expanded: false
        });
      }

      setClientGroups(groups);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClientExpanded = (clientId: string) => {
    setClientGroups(groups => 
      groups.map(group => 
        group.client_id === clientId 
          ? { ...group, expanded: !group.expanded }
          : group
      )
    );
  };

  const handleApproveTimesheet = async (timesheetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('timesheets')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.email || 'admin'
        })
        .eq('id', timesheetId);
      
      fetchTimesheets();
      setShowModal(false);
    } catch (error) {
      console.error('Error approving timesheet:', error);
    }
  };

  const handleRejectTimesheet = async (timesheetId: string, reason: string) => {
    try {
      await supabase
        .from('timesheets')
        .update({ 
          status: 'rejected',
          comments: reason
        })
        .eq('id', timesheetId);
      
      fetchTimesheets();
      setShowModal(false);
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
    }
  };

  const handleBulkApprove = async (clientId: string) => {
    if (!confirm('Approve all pending timesheets for this client?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const client = clientGroups.find(g => g.client_id === clientId);
      if (!client) return;

      const pendingTimesheets = client.employees
        .flatMap(emp => emp.timesheets)
        .filter(ts => ts.status === 'submitted');

      await Promise.all(
        pendingTimesheets.map(ts =>
          supabase
            .from('timesheets')
            .update({ 
              status: 'approved',
              approved_at: new Date().toISOString(),
              approved_by: user?.email || 'admin'
            })
            .eq('id', ts.id)
        )
      );

      fetchTimesheets();
    } catch (error) {
      console.error('Error bulk approving:', error);
    }
  };

  const exportToCSV = () => {
    const { sunday, saturday } = getWeekDates(selectedWeek);
    const headers = ['Client', 'Employee', 'Department', 'Week Ending', 'Hours', 'Status'];
    const rows: string[][] = [];

    clientGroups.forEach(group => {
      group.employees.forEach(emp => {
        emp.timesheets.forEach(ts => {
          rows.push([
            group.client_name,
            emp.employee_name,
            emp.department || '',
            ts.week_ending,
            (ts.total_hours || 0).toString(),
            ts.status
          ]);
        });
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheets_week_${saturday.toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate);
  };

  const filteredGroups = clientGroups.map(group => {
    if (filterStatus === 'all') return group;
    
    const filteredEmployees = group.employees.filter(emp => {
      if (filterStatus === 'pending') {
        return emp.timesheets.some(ts => ts.status === 'submitted');
      } else if (filterStatus === 'missing') {
        return !emp.hasSubmitted;
      }
      return true;
    });

    return { ...group, employees: filteredEmployees };
  }).filter(group => group.employees.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading timesheets...</p>
        </div>
      </div>
    );
  }

  const { sunday, saturday } = getWeekDates(selectedWeek);
  const totalPendingCount = clientGroups.reduce((sum, g) => sum + g.totalPending, 0);
  const totalMissingCount = clientGroups.reduce((sum, g) => sum + g.missingCount, 0);
  const totalApprovedCount = clientGroups.reduce((sum, g) => sum + g.totalApproved, 0);

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
                <h1 className="text-2xl font-bold">Timesheet Overview</h1>
                <p className="text-sm text-gray-300">Review all timesheets across clients</p>
              </div>
            </div>
            <button 
              onClick={() => router.push('/auth/logout')}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Bar */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => changeWeek('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="text-sm text-gray-600">Week of</p>
                <p className="font-semibold">
                  {sunday.toLocaleDateString()} - {saturday.toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => changeWeek('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Employees</option>
                <option value="pending">Pending Only</option>
                <option value="missing">Missing Only</option>
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

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{clientGroups.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-yellow-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{totalPendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-red-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Missing Timesheets</p>
                <p className="text-2xl font-bold text-red-600">{totalMissingCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-green-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{totalApprovedCount}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Client Groups */}
        <div className="space-y-4">
          {filteredGroups.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500">No timesheets found for this week.</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div 
                key={group.client_id} 
                className="bg-white rounded-lg shadow-sm overflow-hidden border"
                style={{ borderColor: group.totalPending > 0 ? '#facc15' : '#e5e7eb' }}
              >
                {/* Client Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleClientExpanded(group.client_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {group.expanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <Building2 className="h-5 w-5 text-blue-500" />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {group.client_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {group.totalEmployees} employees
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {group.missingCount > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                          {group.missingCount} missing
                        </span>
                      )}
                      {group.totalPending > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          {group.totalPending} pending
                        </span>
                      )}
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        {group.totalApproved} approved
                      </span>
                      {group.totalPending > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBulkApprove(group.client_id);
                          }}
                          className="px-3 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                        >
                          Approve All
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Employee List */}
                {group.expanded && (
                  <div className="border-t">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {group.employees.map((employee) => (
                          <tr key={employee.employee_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {employee.employee_name}
                                </p>
                                <p className="text-xs text-gray-500">{employee.employee_email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {employee.department || '-'}
                            </td>
                            <td className="px-6 py-4">
                              {!employee.hasSubmitted ? (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                                  Not Submitted
                                </span>
                              ) : employee.timesheets.some(ts => ts.status === 'submitted') ? (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                                  Pending Review
                                </span>
                              ) : employee.timesheets.some(ts => ts.status === 'approved') ? (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                                  Approved
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded">
                                  Draft
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {employee.totalHours.toFixed(1)} hrs
                            </td>
                            <td className="px-6 py-4">
                              {employee.timesheets.length > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedTimesheet(employee.timesheets[0]);
                                    setShowModal(true);
                                  }}
                                  className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                  View Details
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Timesheet Detail Modal */}
      {showModal && selectedTimesheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Timesheet Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Employee</p>
                  <p className="font-medium">
                    {selectedTimesheet.employee?.first_name} {selectedTimesheet.employee?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Week Ending</p>
                  <p className="font-medium">{selectedTimesheet.week_ending}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Hours</p>
                  <p className="font-medium">{selectedTimesheet.total_hours || 0} hours</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium capitalize">{selectedTimesheet.status}</p>
                </div>
              </div>

              {selectedTimesheet.comments && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-1">Comments</p>
                  <p className="text-gray-900">{selectedTimesheet.comments}</p>
                </div>
              )}

              {selectedTimesheet.status === 'submitted' && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleRejectTimesheet(selectedTimesheet.id, 'Please review and resubmit')}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproveTimesheet(selectedTimesheet.id)}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
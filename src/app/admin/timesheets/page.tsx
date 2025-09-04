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

interface Timecard {
  id: string;
  employee_id: string;
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
    department?: string;
    client_id?: string;
    client?: {
      name: string;
      code: string;
    };
  };
  work_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  total_hours: number;
  project_id?: string;
  project?: {
    name: string;
    code: string;
  };
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
}

interface ClientGroup {
  client_id: string;
  client_name: string;
  client_code: string;
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
  timecards: Timecard[];
  totalHours: number;
  hasSubmitted: boolean;
}

export default function AdminTimesheets() {
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedTimecard, setSelectedTimecard] = useState<Timecard | null>(null);
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
      
      // Fetch all clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, code')
        .eq('active', true)
        .order('name');

      // Fetch all employees with their clients
      const { data: employees } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          department,
          client_id,
          client:client_id (
            name,
            code
          )
        `)
        .eq('status', 'active');

      // Fetch all timecards for the week
      const { data: timecards } = await supabase
        .from('timecards')
        .select(`
          *,
          employee:employee_id (
            first_name,
            last_name,
            email,
            department,
            client_id,
            client:client_id (
              name,
              code
            )
          ),
          project:project_id (
            name,
            code
          )
        `)
        .gte('work_date', sunday.toISOString().split('T')[0])
        .lte('work_date', saturday.toISOString().split('T')[0])
        .order('work_date', { ascending: true });

      // Group by client
      const groups: ClientGroup[] = [];
      
      for (const client of clients || []) {
        const clientEmployees = employees?.filter(emp => emp.client_id === client.id) || [];
        const employeeTimesheets: EmployeeTimesheets[] = [];
        let totalPending = 0;
        let totalApproved = 0;
        let missingCount = 0;

        for (const employee of clientEmployees) {
          const empTimecards = timecards?.filter(tc => tc.employee_id === employee.id) || [];
          const totalHours = empTimecards.reduce((sum, tc) => sum + tc.total_hours, 0);
          const hasSubmitted = empTimecards.length > 0;

          if (!hasSubmitted) {
            missingCount++;
          }

          totalPending += empTimecards.filter(tc => tc.status === 'pending').length;
          totalApproved += empTimecards.filter(tc => tc.status === 'approved').length;

          employeeTimesheets.push({
            employee_id: employee.id,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            employee_email: employee.email,
            department: employee.department,
            timecards: empTimecards,
            totalHours,
            hasSubmitted
          });
        }

        if (clientEmployees.length > 0) {
          groups.push({
            client_id: client.id,
            client_name: client.name,
            client_code: client.code,
            employees: employeeTimesheets,
            totalPending,
            totalApproved,
            totalEmployees: clientEmployees.length,
            missingCount,
            expanded: false
          });
        }
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

  const handleApproveTimecard = async (timecardId: string) => {
    try {
      await supabase
        .from('timecards')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'admin@westendworkforce.com'
        })
        .eq('id', timecardId);
      
      fetchTimesheets();
      setShowModal(false);
    } catch (error) {
      console.error('Error approving timecard:', error);
    }
  };

  const handleRejectTimecard = async (timecardId: string, reason: string) => {
    try {
      await supabase
        .from('timecards')
        .update({ 
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', timecardId);
      
      fetchTimesheets();
      setShowModal(false);
    } catch (error) {
      console.error('Error rejecting timecard:', error);
    }
  };

  const handleBulkApprove = async (clientId: string) => {
    if (!confirm('Approve all pending timecards for this client?')) return;

    try {
      const client = clientGroups.find(g => g.client_id === clientId);
      if (!client) return;

      const pendingTimecards = client.employees
        .flatMap(emp => emp.timecards)
        .filter(tc => tc.status === 'pending');

      await Promise.all(
        pendingTimecards.map(tc =>
          supabase
            .from('timecards')
            .update({ 
              status: 'approved',
              approved_at: new Date().toISOString(),
              approved_by: 'admin@westendworkforce.com'
            })
            .eq('id', tc.id)
        )
      );

      fetchTimesheets();
    } catch (error) {
      console.error('Error bulk approving:', error);
    }
  };

  const exportToCSV = () => {
    const { sunday, saturday } = getWeekDates(selectedWeek);
    const headers = ['Client', 'Employee', 'Department', 'Date', 'Hours', 'Project', 'Status'];
    const rows: string[][] = [];

    clientGroups.forEach(group => {
      group.employees.forEach(emp => {
        emp.timecards.forEach(tc => {
          rows.push([
            group.client_name,
            emp.employee_name,
            emp.department || '',
            tc.work_date,
            tc.total_hours.toString(),
            tc.project?.name || '',
            tc.status
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
    a.download = `timesheets_${sunday.toISOString().split('T')[0]}_to_${saturday.toISOString().split('T')[0]}.csv`;
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
        return emp.timecards.some(tc => tc.status === 'pending');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading timesheets...</p>
        </div>
      </div>
    );
  }

  const { sunday, saturday } = getWeekDates(selectedWeek);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ backgroundColor: '#05202e' }} className="text-white">
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
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4" style={{ borderWidth: '1px', borderColor: '#05202e' }}>
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
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
          <div className="bg-white rounded-lg shadow-sm p-6" style={{ borderWidth: '1px', borderColor: '#05202e' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{clientGroups.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6" style={{ borderWidth: '1px', borderColor: '#e31c79' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {clientGroups.reduce((sum, g) => sum + g.totalPending, 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6" style={{ borderWidth: '1px', borderColor: '#e31c79' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Missing Timesheets</p>
                <p className="text-2xl font-bold text-red-600">
                  {clientGroups.reduce((sum, g) => sum + g.missingCount, 0)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6" style={{ borderWidth: '1px', borderColor: '#05202e' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {clientGroups.reduce((sum, g) => sum + g.totalApproved, 0)}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Client Groups */}
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <div 
              key={group.client_id} 
              className="bg-white rounded-lg shadow-sm overflow-hidden"
              style={{ borderWidth: '1px', borderColor: group.totalPending > 0 ? '#e31c79' : '#05202e' }}
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
                        {group.client_name} ({group.client_code})
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
                        className="px-3 py-1 text-xs text-white rounded hover:opacity-90"
                        style={{ backgroundColor: '#e31c79' }}
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
                            ) : employee.timecards.some(tc => tc.status === 'pending') ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                                Pending Review
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                                Approved
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {employee.totalHours.toFixed(1)} hrs
                          </td>
                          <td className="px-6 py-4">
                            {employee.timecards.length > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedTimecard(employee.timecards[0]);
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
          ))}
        </div>
      </div>

      {/* Timecard Detail Modal */}
      {showModal && selectedTimecard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Timecard Details</h2>
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
                    {selectedTimecard.employee?.first_name} {selectedTimecard.employee?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">{selectedTimecard.work_date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hours</p>
                  <p className="font-medium">{selectedTimecard.total_hours} hours</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Project</p>
                  <p className="font-medium">{selectedTimecard.project?.name || 'N/A'}</p>
                </div>
              </div>

              {selectedTimecard.description && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <p className="text-gray-900">{selectedTimecard.description}</p>
                </div>
              )}

              {selectedTimecard.status === 'pending' && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleRejectTimecard(selectedTimecard.id, 'Please review hours')}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproveTimecard(selectedTimecard.id)}
                    className="px-4 py-2 text-white rounded-lg hover:opacity-90"
                    style={{ backgroundColor: '#e31c79' }}
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
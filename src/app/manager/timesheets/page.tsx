'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Clock, CheckCircle, XCircle, Eye, AlertCircle } from 'lucide-react';

interface Employee {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department?: string;
  hourly_rate?: number;
}

interface Timesheet {
  id: string;
  employee_id: string;
  week_ending: string;
  total_hours: number;
  overtime_hours?: number;
  status: string;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  employee?: Employee;
}

export default function ManagerTimesheets() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, submitted, approved, rejected
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadTimesheets();
  }, [filter]);

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('timesheets')
        .select(`
          *,
          employee:employees(
            id,
            email,
            first_name,
            last_name,
            department,
            hourly_rate
          )
        `)
        .order('week_ending', { ascending: false });

      // Apply filter
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading timesheets:', error);
      } else {
        setTimesheets(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTimesheet = async (timesheetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', timesheetId);

      if (error) {
        console.error('Error approving timesheet:', error);
        alert('Failed to approve timesheet: ' + error.message);
      } else {
        alert('Timesheet approved successfully!');
        await loadTimesheets(); // Reload data
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while approving the timesheet');
    }
  };

  const handleRejectTimesheet = async (timesheetId: string) => {
    try {
      // Get rejection reason
      const reason = prompt('Please provide a reason for rejection:');
      
      if (!reason || reason.trim() === '') {
        alert('Rejection reason is required');
        return;
      }

      console.log('Rejecting timesheet:', timesheetId, 'Reason:', reason);

      const { data, error } = await supabase
        .from('timesheets')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', timesheetId)
        .select(); // Return the updated record

      console.log('Update result:', data);
      console.log('Update error:', error);

      if (error) {
        console.error('Error rejecting timesheet:', error);
        alert('Failed to reject timesheet: ' + error.message);
      } else {
        alert('Timesheet rejected successfully!');
        await loadTimesheets(); // Reload data
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while rejecting the timesheet');
    }
  };

  const handleViewTimesheet = (timesheet: Timesheet) => {
    // You can implement a modal or navigate to a detail page
    console.log('View timesheet:', timesheet);
    // For now, just show an alert with details
    alert(`
      Employee: ${timesheet.employee?.first_name} ${timesheet.employee?.last_name}
      Week Ending: ${new Date(timesheet.week_ending).toLocaleDateString()}
      Total Hours: ${timesheet.total_hours}
      Overtime: ${timesheet.overtime_hours || 0}
      Status: ${timesheet.status}
      ${timesheet.rejection_reason ? `Rejection Reason: ${timesheet.rejection_reason}` : ''}
    `);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Submitted
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading timesheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#05202E]">Timesheet Management</h1>
          <p className="text-gray-600 mt-2">Review and approve employee timesheets</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setFilter('all')}
                className={`py-2 px-6 border-b-2 font-medium text-sm ${
                  filter === 'all'
                    ? 'border-[#e31c79] text-[#e31c79]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('submitted')}
                className={`py-2 px-6 border-b-2 font-medium text-sm ${
                  filter === 'submitted'
                    ? 'border-[#e31c79] text-[#e31c79]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending Review
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`py-2 px-6 border-b-2 font-medium text-sm ${
                  filter === 'approved'
                    ? 'border-[#e31c79] text-[#e31c79]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`py-2 px-6 border-b-2 font-medium text-sm ${
                  filter === 'rejected'
                    ? 'border-[#e31c79] text-[#e31c79]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Rejected
              </button>
            </nav>
          </div>
        </div>

        {/* Timesheets Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week Ending
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
              {timesheets.map((timesheet) => (
                <tr key={timesheet.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {timesheet.employee?.first_name} {timesheet.employee?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {timesheet.employee?.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(timesheet.week_ending).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {timesheet.total_hours} hrs
                    </div>
                    {timesheet.overtime_hours && timesheet.overtime_hours > 0 && (
                      <div className="text-sm text-gray-500">
                        OT: {timesheet.overtime_hours} hrs
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(timesheet.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewTimesheet(timesheet)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {timesheet.status === 'submitted' && (
                        <>
                          <button
                            onClick={() => handleApproveTimesheet(timesheet.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRejectTimesheet(timesheet.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {timesheets.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">No timesheets found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

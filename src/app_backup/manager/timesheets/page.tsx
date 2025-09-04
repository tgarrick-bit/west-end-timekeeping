
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Use your existing supabase client - adjust based on your file structure
import { supabase } from '@/lib/supabaseClient'; // or '@/utils/supabase/client'
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TimesheetSummary {
  id: string;
  week_ending: string;
  total_hours: number;
  overtime_hours?: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  employee_name?: string;
}

interface TimesheetStats {
  totalSubmitted: number;
  totalApproved: number;
  totalPending: number;
  totalHoursThisMonth: number;
}

export default function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [stats, setStats] = useState<TimesheetStats>({
    totalSubmitted: 0,
    totalApproved: 0,
    totalPending: 0,
    totalHoursThisMonth: 0
  });
  const router = useRouter();

  useEffect(() => {
    fetchTimesheets();
  }, [filter]);

  const fetchTimesheets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      // Build query
      let query = supabase
        .from('timesheets')
        .select('*')
        .eq('user_id', user.id)
        .order('week_ending', { ascending: false });

      // Apply filter
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const timesheetsData = data || [];
      setTimesheets(timesheetsData);
      
      // Calculate stats
      calculateStats(timesheetsData);
    } catch (error: any) {
      console.error('Error fetching timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (timesheetsData: TimesheetSummary[]) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const stats = timesheetsData.reduce((acc, ts) => {
      const tsDate = new Date(ts.week_ending);
      
      // Count by status
      if (ts.status === 'approved') acc.totalApproved++;
      if (ts.status === 'pending') acc.totalPending++;
      acc.totalSubmitted++;
      
      // Sum hours for current month
      if (tsDate.getMonth() === currentMonth && tsDate.getFullYear() === currentYear) {
        acc.totalHoursThisMonth += ts.total_hours || 0;
      }
      
      return acc;
    }, {
      totalSubmitted: 0,
      totalApproved: 0,
      totalPending: 0,
      totalHoursThisMonth: 0
    });
    
    setStats(stats);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timesheet?')) return;
    
    try {
      const { error } = await supabase
        .from('timesheets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchTimesheets();
    } catch (error: any) {
      console.error('Error deleting timesheet:', error);
      alert('Failed to delete timesheet');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading timesheets...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Timesheets</h1>
          <p className="text-gray-600 mt-1">Manage and track your weekly timesheets</p>
        </div>
        <Button onClick={() => router.push('/timesheet/entry')}>
          + New Timesheet
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Submitted</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalSubmitted}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Approved</h3>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.totalApproved}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Pending</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.totalPending}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Hours This Month</h3>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalHoursThisMonth.toFixed(1)}</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 mb-4 border-b">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              filter === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Timesheets Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Week Ending
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Overtime
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted
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
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(timesheet.week_ending)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{timesheet.total_hours.toFixed(1)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {timesheet.overtime_hours && timesheet.overtime_hours > 0 ? (
                    <div className="text-sm font-medium text-orange-600">
                      {timesheet.overtime_hours.toFixed(1)}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">-</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusBadge(timesheet.status)}
                  </div>
                  {timesheet.rejection_reason && (
                    <div className="text-xs text-red-600 mt-1">
                      {timesheet.rejection_reason}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {timesheet.submitted_at ? formatDate(timesheet.submitted_at) : formatDate(timesheet.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => router.push(`/timesheet/${timesheet.id}`)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      View
                    </button>
                    {timesheet.status === 'draft' && (
                      <>
                        <button
                          onClick={() => router.push(`/timesheet/${timesheet.id}/edit`)}
                          className="text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(timesheet.id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Delete
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
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg mb-2">No timesheets found</div>
            <div className="text-sm">
              {filter !== 'all' 
                ? `No ${filter} timesheets. Try changing the filter.`
                : 'Create your first timesheet to get started.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
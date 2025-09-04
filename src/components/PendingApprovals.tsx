'use client'

import { useState, useEffect } from 'react'
import { 
  Clock, 
  Receipt, 
  CheckCircle, 
  XCircle, 
  Eye, 
  AlertCircle,
  Calendar,
  User,
  Building2,
  DollarSign,
  X
} from 'lucide-react'
import { Timesheet, ExpenseReport, User as UserType, Project, Client } from '@/types'
import { supabase } from '@/lib/supabase'
import { useNotifications } from '@/hooks/useNotifications'

interface PendingItem {
  id: string
  type: 'timesheet' | 'expense'
  user: UserType
  project?: Project
  client?: Client
  date: string
  amount?: number
  hours?: number
  status: string
  submitted_at: string
}

export default function PendingApprovals() {
  const { notifyTimesheetApproved, notifyTimesheetRejected, notifyExpenseApproved, notifyExpenseRejected } = useNotifications()
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'timesheet' | 'expense'>('all')
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null)

  useEffect(() => {
    fetchPendingItems()
  }, [])

  const fetchPendingItems = async () => {
    try {
      setLoading(true)
      
      // Fetch pending timesheets
      const { data: timesheets, error: timesheetError } = await supabase
        .from('timesheets')
        .select(`
          *,
          user:users(*),
          project:projects(*)
        `)
        .in('status', ['submitted', 'client_approved'])
        .order('submitted_at', { ascending: false })

      if (timesheetError) throw timesheetError

      // Fetch pending expense reports
      const { data: expenses, error: expenseError } = await supabase
        .from('expense_reports')
        .select(`
          *,
          user:users(*),
          project:projects(*)
        `)
        .in('status', ['submitted', 'client_approved'])
        .order('submitted_at', { ascending: false })

      if (expenseError) throw expenseError

      // Combine and format data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedTimesheets: PendingItem[] = (timesheets || []).map((ts: any) => ({
        id: ts.id,
        type: 'timesheet' as const,
        user: ts.user,
        project: ts.project,
        client: ts.project?.client,
        date: `${ts.week_start_date} - ${ts.week_end_date}`,
        hours: ts.total_hours / 60, // Convert from minutes
        status: ts.status,
        submitted_at: ts.submitted_at || ts.created_at
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedExpenses: PendingItem[] = (expenses || []).map((exp: any) => ({
        id: exp.id,
        type: 'expense' as const,
        user: exp.user,
        project: exp.project,
        client: exp.project?.client,
        date: `${exp.month}/${exp.year}`,
        amount: exp.total_amount,
        status: exp.status,
        submitted_at: exp.submitted_at || exp.created_at
      }))

      setPendingItems([...formattedTimesheets, ...formattedExpenses])
    } catch (error) {
      console.error('Error fetching pending items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (item: PendingItem) => {
    try {
      if (item.type === 'timesheet') {
        const { error } = await supabase
          .from('timesheets')
          .update({
            status: item.status === 'submitted' ? 'client_approved' : 'payroll_approved',
            client_approved_at: item.status === 'submitted' ? new Date().toISOString() : undefined,
            payroll_approved_at: item.status === 'client_approved' ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)

        if (error) throw error
        
        // Notify employee about timesheet approval (now includes email)
        notifyTimesheetApproved(item.user.id, item.date)
        
        // ALSO NOTIFY ADMIN when timesheet is approved (for oversight)
        if (item.status === 'submitted') {
          // Client approval - notify admin
          await fetch('/api/notifications/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: 'tgarrick@westendworkforce.com', // For testing (represents admin)
              notification: {
                id: `admin_approval_notice_${Date.now()}`,
                type: 'timesheet_approved',
                title: 'Timesheet Approved - Admin Notification',
                message: `Admin notification: Client approved ${item.user.first_name} ${item.user.last_name}'s timesheet`,
                priority: 'medium',
                userId: item.user.id,
                relatedId: item.id,
                relatedType: 'timesheet',
                isRead: false,
                isEmailSent: false,
                createdAt: new Date(),
                metadata: {
                  employeeName: `${item.user.first_name} ${item.user.last_name}`,
                  managerName: 'Client Approver',
                  hours: item.hours,
                  approvedDate: new Date().toLocaleDateString(),
                  action: 'Timesheet Approved by Client',
                  project: item.project?.name || 'Unknown Project'
                }
              },
              customData: {
                employeeName: `${item.user.first_name} ${item.user.last_name}`,
                managerName: 'Client Approver',
                hours: item.hours,
                approvedDate: new Date().toLocaleDateString(),
                action: 'Timesheet Approved by Client',
                project: item.project?.name || 'Unknown Project',
                actionUrl: '#',
                viewUrl: '#'
              }
            }),
          });
        }
      } else {
        const { error } = await supabase
          .from('expense_reports')
          .update({
            status: item.status === 'submitted' ? 'client_approved' : 'payroll_approved',
            client_approved_at: item.status === 'submitted' ? new Date().toISOString() : undefined,
            payroll_approved_at: item.status === 'client_approved' ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)

        if (error) throw error
        
        // Notify employee about expense approval (now includes email)
        notifyExpenseApproved(item.user.id, item.amount || 0)
        
        // ALSO NOTIFY ADMIN when expense is approved (for oversight)
        if (item.status === 'submitted') {
          // Client approval - notify admin
          await fetch('/api/notifications/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: 'tgarrick@westendworkforce.com', // For testing (represents admin)
              notification: {
                id: `admin_expense_approval_${Date.now()}`,
                type: 'expense_approved',
                title: 'Expense Approved - Admin Notification',
                message: `Admin notification: Client approved ${item.user.first_name} ${item.user.last_name}'s expense report`,
                priority: 'medium',
                userId: item.user.id,
                relatedId: item.id,
                relatedType: 'expense',
                isRead: false,
                isEmailSent: false,
                createdAt: new Date(),
                metadata: {
                  employeeName: `${item.user.first_name} ${item.user.last_name}`,
                  managerName: 'Client Approver',
                  amount: item.amount,
                  approvedDate: new Date().toLocaleDateString(),
                  action: 'Expense Approved by Client',
                  project: item.project?.name || 'Unknown Project'
                }
              },
              customData: {
                employeeName: `${item.user.first_name} ${item.user.last_name}`,
                managerName: 'Client Approver',
                amount: item.amount,
                approvedDate: new Date().toLocaleDateString(),
                action: 'Expense Approved by Client',
                project: item.project?.name || 'Unknown Project',
                actionUrl: '#',
                viewUrl: '#'
              }
            }),
          });
        }
      }
      
      // Refresh the list
      await fetchPendingItems()
      
      // Show success message
      alert(`✅ ${item.type === 'timesheet' ? 'Timesheet' : 'Expense'} approved successfully!
      
• Employee notified of approval (in-app + email)
• Admin notification sent for oversight
• Status updated in database`)
      
    } catch (error) {
      console.error('Approval failed:', error)
      alert(`❌ Failed to approve ${item.type}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleReject = async (item: PendingItem, reason: string) => {
    try {
      if (item.type === 'timesheet') {
        const { error } = await supabase
          .from('timesheets')
          .update({
            status: 'rejected',
            rejection_reason: reason,
            rejected_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)

        if (error) throw error
        
        // Notify employee about timesheet rejection
        notifyTimesheetRejected(item.user.id, item.date, reason)
      } else {
        const { error } = await supabase
          .from('expense_reports')
          .update({
            status: 'rejected',
            rejection_reason: reason,
            rejected_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)

        if (error) throw error
        
        // Notify employee about expense rejection
        notifyExpenseRejected(item.user.id, item.amount || 0, reason)
      }

      // Refresh data
      fetchPendingItems()
    } catch (error) {
      console.error('Error rejecting item:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      submitted: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      client_approved: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      payroll_approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig]
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>
    )
  }

  const filteredItems = pendingItems.filter(item => {
    if (filter === 'all') return true
    return item.type === filter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#232020]">Pending Approvals</h2>
          <p className="text-[#465079]">Review and approve timesheets and expense reports</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-[#465079]">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'timesheet' | 'expense')}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
          >
            <option value="all">All Items</option>
            <option value="timesheet">Timesheets</option>
            <option value="expense">Expenses</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[#465079]">Pending Timesheets</p>
              <p className="text-2xl font-semibold text-[#232020]">
                {pendingItems.filter(item => item.type === 'timesheet').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[#465079]">Pending Expenses</p>
              <p className="text-2xl font-semibold text-[#232020]">
                {pendingItems.filter(item => item.type === 'expense').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-[#e31c79]">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[#465079]">Total Pending</p>
              <p className="text-2xl font-semibold text-[#232020]">
                {pendingItems.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Items List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#232020]">
            Pending Items ({filteredItems.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredItems.length === 0 ? (
            <div className="px-6 py-8 text-center text-[#465079]">
              No pending items found. All submissions have been processed.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      item.type === 'timesheet' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {item.type === 'timesheet' ? (
                        <Clock className="h-6 w-6 text-blue-600" />
                      ) : (
                        <Receipt className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-[#232020]">
                        {item.user.first_name} {item.user.last_name}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-[#465079] mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {item.date}
                        </span>
                        {item.project && (
                          <span className="flex items-center">
                            <Building2 className="h-4 w-4 mr-1" />
                            {item.project.name}
                          </span>
                        )}
                        {item.hours && (
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {item.hours}h
                          </span>
                        )}
                        {item.amount && (
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            ${item.amount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(item.status)}
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="p-2 text-gray-400 hover:text-[#e31c79] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleApprove(item)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Please provide a reason for rejection:')
                        if (reason) handleReject(item, reason)
                      }}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#232020]">
                  {selectedItem.type === 'timesheet' ? 'Timesheet Details' : 'Expense Report Details'}
                </h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#465079]">Employee</label>
                  <p className="text-[#232020]">
                    {selectedItem.user.first_name} {selectedItem.user.last_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#465079]">Type</label>
                  <p className="text-[#232020] capitalize">
                    {selectedItem.type}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#465079]">Date</label>
                  <p className="text-[#232020]">{selectedItem.date}</p>
                </div>
                {selectedItem.project && (
                  <div>
                    <label className="block text-sm font-medium text-[#465079]">Project</label>
                    <p className="text-[#232020]">{selectedItem.project.name}</p>
                  </div>
                )}
                {selectedItem.hours && (
                  <div>
                    <label className="block text-sm font-medium text-[#465079]">Total Hours</label>
                    <p className="text-[#232020]">{selectedItem.hours} hours</p>
                  </div>
                )}
                {selectedItem.amount && (
                  <div>
                    <label className="block text-sm font-medium text-[#465079]">Total Amount</label>
                    <p className="text-[#232020]">${selectedItem.amount}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[#465079]">Status</label>
                  {getStatusBadge(selectedItem.status)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#465079]">Submitted</label>
                  <p className="text-[#232020]">
                    {new Date(selectedItem.submitted_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-[#465079] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleApprove(selectedItem)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Please provide a reason for rejection:')
                  if (reason) {
                    handleReject(selectedItem, reason)
                    setSelectedItem(null)
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Users, 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Eye,
  Download,
  MessageSquare,
  BarChart3,
  ArrowRight,
  User,
  Building2,
  Receipt,
  TrendingUp,
  LogOut,
  Menu,
  X
} from 'lucide-react'

interface ContractorData {
  id: string
  name: string
  role: string
  status: 'timesheet_pending' | 'expense_pending' | 'both_pending' | 'up_to_date'
  totalHours: number
  yourHours: number
  otherHours: number
  pendingExpenses: number
  employeeId: string
  hourlyRate: number
}

interface ManagerStats {
  pendingTimesheets: number
  pendingExpenses: number
  totalAmount: number
  totalContractors: number
}

export default function ManagerDashboardPage() {
  const router = useRouter()
  const { appUser, signOut } = useAuth()
  const [contractors, setContractors] = useState<ContractorData[]>([])
  const [stats, setStats] = useState<ManagerStats>({
    pendingTimesheets: 0,
    pendingExpenses: 0,
    totalAmount: 0,
    totalContractors: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Simulate loading manager data
    setTimeout(() => {
      const mockContractors: ContractorData[] = [
        {
          id: '1',
          name: 'Mike Chen',
          role: 'Tech Infrastructure',
          status: 'timesheet_pending',
          totalHours: 40.0,
          yourHours: 26.0,
          otherHours: 14.0,
          pendingExpenses: 0,
          employeeId: 'emp1',
          hourlyRate: 95
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          role: 'Software Development',
          status: 'both_pending',
          totalHours: 37.5,
          yourHours: 37.5,
          otherHours: 0.0,
          pendingExpenses: 245.80,
          employeeId: 'emp2',
          hourlyRate: 110
        },
        {
          id: '3',
          name: 'David Kim',
          role: 'Data Analysis',
          status: 'expense_pending',
          totalHours: 35.0,
          yourHours: 22.0,
          otherHours: 13.0,
          pendingExpenses: 156.30,
          employeeId: 'emp3',
          hourlyRate: 85
        },
        {
          id: '4',
          name: 'Lisa Wang',
          role: 'Project Management',
          status: 'up_to_date',
          totalHours: 40.0,
          yourHours: 40.0,
          otherHours: 0.0,
          pendingExpenses: 0,
          employeeId: 'emp4',
          hourlyRate: 120
        }
      ]

      const mockStats: ManagerStats = {
        pendingTimesheets: 3,
        pendingExpenses: 2,
        totalAmount: 2847.50,
        totalContractors: 4
      }

      setContractors(mockContractors)
      setStats(mockStats)
      setIsLoading(false)
    }, 1000)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'timesheet_pending':
        return <Clock className="w-4 h-4 text-orange-500" />
      case 'expense_pending':
        return <DollarSign className="w-4 h-4 text-blue-500" />
      case 'both_pending':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'up_to_date':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'timesheet_pending':
        return 'Timesheet Pending'
      case 'expense_pending':
        return 'Expense Pending'
      case 'both_pending':
        return 'Both Pending'
      case 'up_to_date':
        return 'Up to Date'
      default:
        return 'Unknown'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'timesheet_pending':
        return 'bg-orange-100 text-orange-800'
      case 'expense_pending':
        return 'bg-blue-100 text-blue-800'
      case 'both_pending':
        return 'bg-red-100 text-red-800'
      case 'up_to_date':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCardClick = (route: string) => {
    router.push(route)
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'timesheets':
        alert('📋 Timesheet Summary:\n\n• Mike Chen: 2 entries pending\n• Sarah Johnson: 2 entries pending\n• David Kim: 2 entries pending\n\nClick individual "Review Timesheet" buttons to see details.');
        break
      case 'expenses':
        alert('💰 Expense Summary:\n\n• Sarah Johnson: $245.80 (Dinner)\n• David Kim: $156.30 (Travel)\n\nClick individual "Review Expenses" buttons to see details.');
        break
      case 'reports':
        alert('📊 Reports feature coming soon!\n\nThis will include:\n• Weekly summaries\n• Cost analysis\n• Productivity reports\n• Export capabilities');
        break
      case 'contractors':
        alert('👥 Contractor Management:\n\n• Total: 4 contractors\n• Active: 4\n• Pending approvals: 3\n• Up to date: 1\n\nUse the contractor list below for detailed actions.');
        break
      default:
        break
    }
  }

  const handleContractorAction = async (contractor: ContractorData, action: string) => {
    if (action === 'timesheet') {
      try {
        const response = await fetch(`/api/manager/approvals?employee=${contractor.employeeId}&type=timesheet`);
        const data = await response.json();
        
        if (data.success) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalAmount = data.data.reduce((sum: number, item: any) => sum + item.amount, 0);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalHours = data.data.reduce((sum: number, item: any) => sum + item.hours, 0);
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const entries = data.data.map((entry: any) => 
            `📅 ${entry.date}: ${entry.hours}h - ${entry.description} ($${entry.amount})`
          ).join('\n');
          
          alert(`📋 Timesheet Review for ${data.employee.name}

📊 Summary:
• ${data.count} timesheet entries
• ${totalHours} total hours
• $${totalAmount.toFixed(2)} total amount

📝 Recent Entries:
${entries}

✅ Ready for approval!`);
        } else {
          alert(`❌ Error: ${data.error}`);
        }
      } catch (error) {
        alert(`❌ Connection Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (action === 'expense') {
      try {
        const response = await fetch(`/api/manager/approvals?employee=${contractor.employeeId}&type=expense`);
        const data = await response.json();
        
        if (data.success && data.count > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalAmount = data.data.reduce((sum: number, item: any) => sum + item.amount, 0);
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const entries = data.data.map((entry: any) => 
            `📅 ${entry.date}: ${entry.description} - $${entry.amount} (${entry.category})`
          ).join('\n');
          
          alert(`💰 Expense Review for ${data.employee.name}

📊 Summary:
• ${data.count} expense entries
• $${totalAmount.toFixed(2)} total amount

📝 Expenses:
${entries}

✅ Ready for approval!`);
        } else {
          alert(`📄 No expenses found for ${contractor.name}`);
        }
      } catch (error) {
        alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (action === 'both') {
      // Handle both timesheet and expense review
      try {
        // Get timesheet data
        const timesheetResponse = await fetch(`/api/manager/approvals?employee=${contractor.employeeId}&type=timesheet`);
        const timesheetData = await timesheetResponse.json();
        
        // Get expense data
        const expenseResponse = await fetch(`/api/manager/approvals?employee=${contractor.employeeId}&type=expense`);
        const expenseData = await expenseResponse.json();
        
        let summary = `📋 Complete Review for ${contractor.name}\n\n`;
        
        // Add timesheet summary
        if (timesheetData.success && timesheetData.count > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalHours = timesheetData.data.reduce((sum: number, item: any) => sum + item.hours, 0);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalTimesheetAmount = timesheetData.data.reduce((sum: number, item: any) => sum + item.amount, 0);
          summary += `⏰ TIMESHEETS:\n• ${timesheetData.count} entries, ${totalHours} hours\n• $${totalTimesheetAmount.toFixed(2)}\n\n`;
        }
        
        // Add expense summary
        if (expenseData.success && expenseData.count > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const totalExpenseAmount = expenseData.data.reduce((sum: number, item: any) => sum + item.amount, 0);
          summary += `💰 EXPENSES:\n• ${expenseData.count} entries\n• $${totalExpenseAmount.toFixed(2)}\n\n`;
        }
        
        summary += `✅ All items ready for approval!`;
        
        alert(summary);
      } catch (error) {
        alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (action === 'details') {
      // For now, show a summary of the contractor
      alert(`👤 Contractor Details: ${contractor.name}

📋 Role: ${contractor.role}
🆔 Employee ID: ${contractor.employeeId}
⏰ Total Hours: ${contractor.totalHours}
💰 Hourly Rate: $${contractor.hourlyRate}
📊 Status: ${getStatusText(contractor.status)}

${contractor.pendingExpenses > 0 ? `💸 Pending Expenses: $${contractor.pendingExpenses}` : '📄 No pending expenses'}`);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading Manager Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - EXACTLY matching Admin Dashboard */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {appUser ? `${appUser.first_name} ${appUser.last_name}` : 'Jane'}!
            </h1>
            <p className="text-gray-600 mt-1">
              ABC Corporation - External Approver
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Manager
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Manager ID</p>
            <p className="font-mono text-gray-900">{appUser?.id || 'manager-demo'}</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards - EXACTLY matching Admin Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          className="p-6 rounded-lg border bg-pink-50 text-pink-700 border-pink-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleQuickAction('timesheets')}
        >
          <h3 className="text-sm font-medium opacity-75">Pending Timesheets</h3>
          <p className="text-2xl font-bold mt-1">{stats.pendingTimesheets}</p>
          <p className="text-sm opacity-75 mt-1">Awaiting review</p>
        </div>

        <div 
          className="p-6 rounded-lg border bg-[#05202E]/10 text-[#05202E] border-[#05202E]/20 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleQuickAction('expenses')}
        >
          <h3 className="text-sm font-medium opacity-75">Pending Expenses</h3>
          <p className="text-2xl font-bold mt-1">{stats.pendingExpenses}</p>
          <p className="text-sm opacity-75 mt-1">Awaiting approval</p>
        </div>

        <div 
          className="p-6 rounded-lg border bg-[#E5DDD8]/50 text-[#05202E] border-[#E5DDD8] cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleQuickAction('reports')}
        >
          <h3 className="text-sm font-medium opacity-75">Total Amount</h3>
          <p className="text-2xl font-bold mt-1">${stats.totalAmount.toLocaleString()}</p>
          <p className="text-sm opacity-75 mt-1">Pending approval</p>
        </div>

        <div 
          className="p-6 rounded-lg border bg-pink-50 text-pink-700 border-pink-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleQuickAction('contractors')}
        >
          <h3 className="text-sm font-medium opacity-75">Your Contractors</h3>
          <p className="text-2xl font-bold mt-1">{stats.totalContractors}</p>
          <p className="text-sm opacity-75 mt-1">Assigned team</p>
        </div>
      </div>

      {/* Quick Actions - EXACTLY matching Admin Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          className="block p-6 rounded-lg border bg-pink-50 border-pink-200 hover:bg-pink-100 text-pink-700 transition-all hover:shadow-md cursor-pointer"
          onClick={() => handleQuickAction('timesheets')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-white">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Review Timesheets</h3>
                <p className="text-sm opacity-75">Approve weekly submissions</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 opacity-75" />
          </div>
        </div>

        <div 
          className="block p-6 rounded-lg border bg-[#05202E]/10 border-[#05202E]/20 hover:bg-[#05202E]/20 text-[#05202E] transition-all hover:shadow-md cursor-pointer"
          onClick={() => handleQuickAction('expenses')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-white">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Review Expenses</h3>
                <p className="text-sm opacity-75">Approve expense reports</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 opacity-75" />
          </div>
        </div>

        <div 
          className="block p-6 rounded-lg border bg-[#E5DDD8]/50 border-[#E5DDD8] hover:bg-[#E5DDD8]/70 text-[#05202E] transition-all hover:shadow-md cursor-pointer"
          onClick={() => handleQuickAction('reports')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-white">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Generate Reports</h3>
                <p className="text-sm opacity-75">Create detailed reports</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 opacity-75" />
          </div>
        </div>

        <div 
          className="block p-6 rounded-lg border bg-pink-50 border-pink-200 hover:bg-pink-100 text-pink-700 transition-all hover:shadow-md cursor-pointer"
          onClick={() => handleQuickAction('contractors')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-lg bg-white">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Contractor List</h3>
                <p className="text-sm opacity-75">Manage your team</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 opacity-75" />
          </div>
        </div>
      </div>

      {/* Contractor List - EXACTLY matching Admin Dashboard style */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Contractors - Pending Approvals</h2>
        <div className="space-y-4">
          {contractors.map((contractor) => (
            <div key={contractor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#e31c79] bg-opacity-10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-[#e31c79]" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{contractor.name}</h3>
                  <p className="text-sm text-gray-600">Employee ID: {contractor.employeeId}</p>
                  <p className="text-sm text-gray-600">{contractor.role}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-1">
                    {getStatusIcon(contractor.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contractor.status)}`}>
                      {getStatusText(contractor.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {contractor.totalHours} hrs this week
                  </p>
                  <p className="text-sm text-gray-600">
                    Your Hours: {contractor.yourHours} hrs | Other: {contractor.otherHours} hrs
                  </p>
                  {contractor.pendingExpenses > 0 && (
                    <p className="text-sm text-blue-600 font-medium">
                      Expenses: ${contractor.pendingExpenses}
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {contractor.status === 'timesheet_pending' || contractor.status === 'both_pending' ? (
                    <button 
                      onClick={() => handleContractorAction(contractor, 'timesheet')}
                      className="bg-[#e31c79] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#c41a6b] transition-colors"
                    >
                      Review Timesheet
                    </button>
                  ) : null}
                  {contractor.status === 'expense_pending' || contractor.status === 'both_pending' ? (
                    <button 
                      onClick={() => handleContractorAction(contractor, 'expense')}
                      className="bg-[#05202E] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#0a2f3f] transition-colors"
                    >
                      Review Expenses
                    </button>
                  ) : null}
                  {contractor.status === 'both_pending' && (
                    <button 
                      onClick={() => handleContractorAction(contractor, 'both')}
                      className="bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      Review All
                    </button>
                  )}
                  <button 
                    onClick={() => handleContractorAction(contractor, 'details')}
                    className="bg-[#E5DDD8] text-[#05202E] px-3 py-2 rounded-md text-sm font-medium hover:bg-[#d4cac3] transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

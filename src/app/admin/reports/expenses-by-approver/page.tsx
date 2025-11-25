'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import * as XLSX from 'xlsx'
import { 
  Clock, 
  LogOut,
  Calendar,
  ChevronRight,
  FileText,
  Download
} from 'lucide-react'

interface ExpenseData {
  id: string
  employee_id: string
  project_id?: string
  expense_date: string
  amount: number
  category: string
  description: string
  receipt_url?: string
  status: string
  payment_method?: string
  is_reimbursable: boolean
  is_billable: boolean
  submitted_at?: string
  approved_at?: string
  approved_by?: string
  employees?: {
    first_name: string
    last_name: string
    department?: string
    email: string
  }
  projects?: {
    name: string
    code: string
  }
  approver?: {
    first_name: string
    last_name: string
    email: string
  } | null
}

export default function ExpensesByApproverReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [startDate, setStartDate] = useState('2025-09-01')
  const [endDate, setEndDate] = useState('2025-09-30')
  const [selectedUser, setSelectedUser] = useState('')
  const [includeUnapproved, setIncludeUnapproved] = useState(false)
  const [reportData, setReportData] = useState<ExpenseData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleRunReport = async () => {
    setIsLoading(true)
    
    try {
      // Build query
      let query = supabase
        .from('expenses')
        .select(`
          *,
          employees!inner (
            first_name,
            last_name,
            department,
            email
          ),
          projects (
            name,
            code
          )
        `)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)

      // Filter based on approval status
      if (!includeUnapproved) {
        query = query.eq('status', 'approved')
      } else {
        // Include all statuses
        query = query.in('status', ['approved', 'pending', 'submitted', 'rejected'])
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching report data:', error)
      } else if (data) {
        // Fetch approver details if needed
        const dataWithApprovers = await Promise.all(
          (data as ExpenseData[]).map(async (expense) => {
            if (expense.approved_by) {
              const { data: approverData } = await supabase
                .from('employees')
                .select('first_name, last_name, email')
                .eq('id', expense.approved_by)
                .single()
              
              return { ...expense, approver: approverData }
            }
            return expense
          })
        )
        setReportData(dataWithApprovers)
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportToExcel = () => {
    if (reportData.length === 0) {
      alert('No data to export. Please run the report first.')
      return
    }

    // Format data for Excel
    const exportData: any[] = []
    
    // Group by approver
    const approverGroups: { [key: string]: ExpenseData[] } = {}
    reportData.forEach(expense => {
      const key = expense.approved_by || 'unapproved'
      if (!approverGroups[key]) {
        approverGroups[key] = []
      }
      approverGroups[key].push(expense)
    })

    // Create export rows
    Object.entries(approverGroups).forEach(([approverId, expenses]) => {
      const approver = expenses[0].approver
      const approverName = approver 
        ? `${approver.first_name} ${approver.last_name}`
        : approverId === 'unapproved' ? 'Unapproved' : 'Unknown Approver'
      
      expenses.forEach(expense => {
        exportData.push({
          'Approver': approverName,
          'Employee': expense.employees 
            ? `${expense.employees.first_name} ${expense.employees.last_name}` 
            : 'Unknown',
          'Department': expense.employees?.department || '',
          'Date': expense.expense_date,
          'Category': expense.category,
          'Description': expense.description,
          'Amount': expense.amount.toFixed(2),
          'Payment Method': expense.payment_method || '',
          'Reimbursable': expense.is_reimbursable ? 'Yes' : 'No',
          'Billable': expense.is_billable ? 'Yes' : 'No',
          'Status': expense.status,
          'Approved Date': expense.approved_at 
            ? new Date(expense.approved_at).toLocaleDateString() 
            : 'N/A'
        })
      })
    })

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    // Auto-size columns
    if (exportData.length > 0) {
      const colWidths = Object.keys(exportData[0]).map(key => {
        const maxLength = Math.max(
          key.length,
          ...exportData.map((row) => {
            const value = row[key]
            return value ? String(value).length : 0
          })
        )
        return { wch: Math.min(maxLength + 2, 30) }
      })
      ws['!cols'] = colWidths
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses by Approver')
    
    // Generate filename with date range
    const fileName = `expenses_by_approver_${startDate}_to_${endDate}.xlsx`
    
    // Write the file
    XLSX.writeFile(wb, fileName)
  }

  // Calculate totals
  const totals = reportData.reduce((acc, expense) => {
    acc.totalAmount += expense.amount
    acc.approved += expense.status === 'approved' ? expense.amount : 0
    acc.pending += (expense.status === 'pending' || expense.status === 'submitted') ? expense.amount : 0
    acc.approvedCount += expense.status === 'approved' ? 1 : 0
    acc.pendingCount += (expense.status === 'pending' || expense.status === 'submitted') ? 1 : 0
    return acc
  }, { totalAmount: 0, approved: 0, pending: 0, approvedCount: 0, pendingCount: 0 })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-900 shadow-lg">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">West End Workforce</h1>
                <span className="text-xs text-gray-300">Reports</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-200">{user?.email}</span>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login'); }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-200 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-gray-100 border-b">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button 
              onClick={() => router.push('/manager')}
              className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Review
            </button>
            <button className="py-3 text-sm font-medium text-gray-900 border-b-2 border-[#e31c79]">
              Reports
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-64 bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Time Reports</h3>
            <div className="space-y-1">
              <a href="/manager/reports/time-by-project" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Time by Project
              </a>
              <a href="/manager/reports/time-by-employee" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Time by Employee
              </a>
              <a href="/manager/reports/time-by-class" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Time by Class
              </a>
              <a href="/manager/reports/time-by-approver" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Time by Approver
              </a>
              <a href="/manager/reports/time-missing" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Time Missing
              </a>
            </div>

            <h3 className="font-semibold text-gray-900 mt-6 mb-4">Expense Reports</h3>
            <div className="space-y-1">
              <a href="/manager/reports/expenses-by-employee" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Expenses by Employee
              </a>
              <a href="/manager/reports/expenses-by-project" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Expenses by Project
              </a>
              <a href="/manager/reports/expenses-by-approver" className="flex items-center justify-between px-3 py-2 text-sm bg-gray-100 text-gray-900 rounded">
                Expenses by Approver
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Report Configuration */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Report Details: Expenses by Approver</h2>

            <div className="space-y-6">
              {/* Date Range */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Start</label>
                  <div className="flex items-center">
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Stop</label>
                  <div className="flex items-center">
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* User Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select 
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value=""></option>
                </select>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={includeUnapproved}
                    onChange={(e) => setIncludeUnapproved(e.target.checked)}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Unapproved</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                {reportData.length > 0 && (
                  <button 
                    onClick={handleExportToExcel}
                    className="px-6 py-2 bg-[#33393c] text-white rounded-md hover:bg-gray-800 font-medium flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export to Excel
                  </button>
                )}
                <button 
                  onClick={handleRunReport}
                  disabled={isLoading}
                  className={`px-6 py-2 rounded-md font-medium ${
                    isLoading 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isLoading ? 'Running...' : 'Run'}
                </button>
              </div>

              {/* Results */}
              {reportData.length > 0 && (
                <div className="mt-6">
                  <div className="p-4 bg-gray-50 rounded mb-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Expenses</p>
                        <p className="text-xl font-semibold">${totals.totalAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Approved</p>
                        <p className="text-xl font-semibold text-green-600">
                          ${totals.approved.toFixed(2)}
                          <span className="text-sm text-gray-600 ml-1">({totals.approvedCount})</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Pending</p>
                        <p className="text-xl font-semibold text-yellow-600">
                          ${totals.pending.toFixed(2)}
                          <span className="text-sm text-gray-600 ml-1">({totals.pendingCount})</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Count</p>
                        <p className="text-xl font-semibold">{reportData.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Approver
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Approved Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData
                          .sort((a, b) => {
                            // Sort by approver name first, then by date
                            const approverA = a.approver ? `${a.approver.first_name} ${a.approver.last_name}` : 'zzz'
                            const approverB = b.approver ? `${b.approver.first_name} ${b.approver.last_name}` : 'zzz'
                            if (approverA !== approverB) return approverA.localeCompare(approverB)
                            return new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
                          })
                          .map((expense) => (
                            <tr key={expense.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {expense.approver 
                                  ? `${expense.approver.first_name} ${expense.approver.last_name}`
                                  : expense.status === 'approved' 
                                    ? 'Unknown Approver'
                                    : '-'
                                }
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {expense.employees ? `${expense.employees.first_name} ${expense.employees.last_name}` : 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {expense.employees?.department || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(expense.expense_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {expense.category}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {expense.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                ${expense.amount.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  expense.status === 'approved' 
                                    ? 'bg-green-100 text-green-800' 
                                    : expense.status === 'pending' || expense.status === 'submitted'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : expense.status === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {expense.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                {expense.approved_at 
                                  ? new Date(expense.approved_at).toLocaleDateString()
                                  : '-'
                                }
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot className="bg-gray-100">
                        <tr>
                          <td colSpan={6} className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                            Total
                          </td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                            ${totals.totalAmount.toFixed(2)}
                          </td>
                          <td colSpan={2} className="px-6 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
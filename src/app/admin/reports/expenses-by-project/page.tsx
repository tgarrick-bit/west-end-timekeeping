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
    client_name?: string
  }
}

export default function ExpensesByProjectReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [startDate, setStartDate] = useState('2025-09-01')
  const [endDate, setEndDate] = useState('2025-09-30')
  const [selectedProject, setSelectedProject] = useState('-All-')
  const [selectedExpenseType, setSelectedExpenseType] = useState('-All-')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('-All-')
  const [reimbursableOnly, setReimbursableOnly] = useState(false)
  const [nonReimbursableOnly, setNonReimbursableOnly] = useState(false)
  const [billableOnly, setBillableOnly] = useState(false)
  const [nonBillableOnly, setNonBillableOnly] = useState(false)
  const [includeDetails, setIncludeDetails] = useState(false)
  const [summaryOnly, setSummaryOnly] = useState(false)
  const [reportData, setReportData] = useState<ExpenseData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const expenseTypes = [
    '-All-',
    'Airfare',
    'Breakfast',
    'Dinner',
    'Fuel',
    'Incidental',
    'Lodging',
    'Lunch',
    'Meals and Incidentals(GSA)',
    'Mileage',
    'Miscellaneous',
    'Parking',
    'Rental Car - Standard size'
  ]

  const paymentMethods = [
    '-All-',
    'Company Card',
    'Personal Card',
    'Cash',
    'Check',
    'Direct Bill'
  ]

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
            code,
            client_name
          )
        `)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)

      // Add project filter if not "All"
      if (selectedProject !== '-All-') {
        query = query.eq('project_id', selectedProject)
      }

      // Add expense type filter
      if (selectedExpenseType !== '-All-') {
        query = query.eq('category', selectedExpenseType)
      }

      // Add payment method filter
      if (selectedPaymentMethod !== '-All-') {
        query = query.eq('payment_method', selectedPaymentMethod)
      }

      // Add reimbursable filters
      if (reimbursableOnly) {
        query = query.eq('is_reimbursable', true)
      } else if (nonReimbursableOnly) {
        query = query.eq('is_reimbursable', false)
      }

      // Add billable filters
      if (billableOnly) {
        query = query.eq('is_billable', true)
      } else if (nonBillableOnly) {
        query = query.eq('is_billable', false)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching report data:', error)
      } else if (data) {
        setReportData(data as ExpenseData[])
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
    
    if (summaryOnly) {
      // Group by project for summary
      const projectGroups: { [key: string]: ExpenseData[] } = {}
      reportData.forEach(expense => {
        const key = expense.project_id || 'no-project'
        if (!projectGroups[key]) {
          projectGroups[key] = []
        }
        projectGroups[key].push(expense)
      })

      Object.values(projectGroups).forEach(expenses => {
        const project = expenses[0].projects
        const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)
        const reimbursableAmount = expenses.filter(e => e.is_reimbursable).reduce((sum, exp) => sum + exp.amount, 0)
        const billableAmount = expenses.filter(e => e.is_billable).reduce((sum, exp) => sum + exp.amount, 0)
        
        exportData.push({
          'Project': project ? `${project.name} (${project.code})` : 'No Project Assigned',
          'Client': project?.client_name || '',
          'Total Expenses': totalAmount.toFixed(2),
          'Reimbursable': reimbursableAmount.toFixed(2),
          'Billable': billableAmount.toFixed(2),
          'Expense Count': expenses.length.toString(),
          'Employee Count': new Set(expenses.map(e => e.employee_id)).size.toString()
        })
      })
    } else {
      // Detailed view
      reportData.forEach(expense => {
        exportData.push({
          'Project': expense.projects ? `${expense.projects.name} (${expense.projects.code})` : 'No Project',
          'Client': expense.projects?.client_name || '',
          'Employee': expense.employees ? `${expense.employees.first_name} ${expense.employees.last_name}` : 'Unknown',
          'Date': expense.expense_date,
          'Category': expense.category,
          'Description': expense.description,
          'Amount': expense.amount.toFixed(2),
          'Payment Method': expense.payment_method || '',
          'Reimbursable': expense.is_reimbursable ? 'Yes' : 'No',
          'Billable': expense.is_billable ? 'Yes' : 'No',
          'Status': expense.status
        })
      })
    }

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
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses by Project')
    
    // Generate filename with date range
    const fileName = `expenses_by_project_${startDate}_to_${endDate}.xlsx`
    
    // Write the file
    XLSX.writeFile(wb, fileName)
  }

  // Calculate totals
  const totals = reportData.reduce((acc, expense) => {
    acc.totalAmount += expense.amount
    acc.reimbursable += expense.is_reimbursable ? expense.amount : 0
    acc.billable += expense.is_billable ? expense.amount : 0
    acc.count += 1
    return acc
  }, { totalAmount: 0, reimbursable: 0, billable: 0, count: 0 })

  // Count unique projects
  const uniqueProjects = new Set(reportData.map(e => e.project_id || 'no-project')).size

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
              <a href="/manager/reports/expenses-by-project" className="flex items-center justify-between px-3 py-2 text-sm bg-gray-100 text-gray-900 rounded">
                Expenses by Project
                <ChevronRight className="h-4 w-4" />
              </a>
              <a href="/manager/reports/expenses-by-approver" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Expenses by Approver
              </a>
            </div>
          </div>

          {/* Report Configuration */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Report Details: Expenses by Project</h2>

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

              {/* Filters */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                  <select 
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option>-All-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                  <select 
                    value={selectedExpenseType}
                    onChange={(e) => setSelectedExpenseType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {expenseTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select 
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {paymentMethods.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={reimbursableOnly}
                    onChange={(e) => {
                      setReimbursableOnly(e.target.checked)
                      if (e.target.checked) setNonReimbursableOnly(false)
                    }}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Reimbursable Only</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={nonReimbursableOnly}
                    onChange={(e) => {
                      setNonReimbursableOnly(e.target.checked)
                      if (e.target.checked) setReimbursableOnly(false)
                    }}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Non-Reimbursable Only</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={billableOnly}
                    onChange={(e) => {
                      setBillableOnly(e.target.checked)
                      if (e.target.checked) setNonBillableOnly(false)
                    }}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Billable Only</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={nonBillableOnly}
                    onChange={(e) => {
                      setNonBillableOnly(e.target.checked)
                      if (e.target.checked) setBillableOnly(false)
                    }}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Non-Billable Only</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={includeDetails}
                    onChange={(e) => setIncludeDetails(e.target.checked)}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Details</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={summaryOnly}
                    onChange={(e) => setSummaryOnly(e.target.checked)}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Summary Only</span>
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
                    <div className="grid grid-cols-5 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Expenses</p>
                        <p className="text-xl font-semibold">${totals.totalAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Projects</p>
                        <p className="text-xl font-semibold">{uniqueProjects}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Reimbursable</p>
                        <p className="text-xl font-semibold text-green-600">${totals.reimbursable.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Billable</p>
                        <p className="text-xl font-semibold text-blue-600">${totals.billable.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Count</p>
                        <p className="text-xl font-semibold">{totals.count}</p>
                      </div>
                    </div>
                  </div>

                  {/* Results Table */}
                  {!summaryOnly ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Project
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Employee
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
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.map((expense) => (
                            <tr key={expense.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {expense.projects ? `${expense.projects.name} (${expense.projects.code})` : 'No Project'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {expense.employees ? `${expense.employees.first_name} ${expense.employees.last_name}` : 'Unknown'}
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    // Summary View
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Project
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Client
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Amount
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reimbursable
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Billable
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Expenses
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Employees
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(() => {
                            const projectGroups: { [key: string]: ExpenseData[] } = {}
                            reportData.forEach(expense => {
                              const key = expense.project_id || 'no-project'
                              if (!projectGroups[key]) {
                                projectGroups[key] = []
                              }
                              projectGroups[key].push(expense)
                            })

                            return Object.values(projectGroups).map((expenses, index) => {
                              const project = expenses[0].projects
                              const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)
                              const reimbursableAmount = expenses.filter(e => e.is_reimbursable).reduce((sum, exp) => sum + exp.amount, 0)
                              const billableAmount = expenses.filter(e => e.is_billable).reduce((sum, exp) => sum + exp.amount, 0)
                              const uniqueEmployees = new Set(expenses.map(e => e.employee_id)).size
                              
                              return (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {project ? `${project.name} (${project.code})` : 'No Project Assigned'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {project?.client_name || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                    ${totalAmount.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                                    ${reimbursableAmount.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">
                                    ${billableAmount.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                    {expenses.length}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                                    {uniqueEmployees}
                                  </td>
                                </tr>
                              )
                            })
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
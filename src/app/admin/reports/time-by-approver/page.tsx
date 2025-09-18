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

interface ReportData {
  id: string
  week_ending: string
  total_hours: number
  overtime_hours: number
  status: string
  employee_id: string
  approved_by?: string
  approved_at?: string
  project_id?: string
  employees?: {
    first_name: string
    last_name: string
    department: string
    hourly_rate: number
  }
  projects?: {
    name: string
    code: string
  }
  approver?: {
    first_name: string
    last_name: string
  }
}

export default function TimeByApproverReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [startDate, setStartDate] = useState('2025-09-07')
  const [endDate, setEndDate] = useState('2025-09-13')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedTimeType, setSelectedTimeType] = useState('-All-')
  const [forceCompleteWeeks, setForceCompleteWeeks] = useState(false)
  const [byProject, setByProject] = useState(false)
  const [includeUnapproved, setIncludeUnapproved] = useState(false)
  const [includeDetails, setIncludeDetails] = useState(false)
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const timeTypes = [
    '-All-',
    'Regular',
    'Overtime', 
    'Doubletime',
    'Sick',
    'Vacation',
    'Holiday',
    'Non-billable',
    'Overtime *',
    'regular *'
  ]

  const handleRunReport = async () => {
    setIsLoading(true)
    
    try {
      // Build query
      let query = supabase
        .from('timesheets')
        .select(`
          *,
          employees!inner (
            first_name,
            last_name,
            department,
            hourly_rate
          ),
          projects (
            name,
            code
          )
        `)
        .gte('week_ending', startDate)
        .lte('week_ending', endDate)

      // Add status filter based on includeUnapproved
      if (!includeUnapproved) {
        query = query.eq('status', 'approved')
      } else {
        // Include both approved and pending for review
        query = query.in('status', ['approved', 'pending', 'submitted'])
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching report data:', error)
      } else if (data) {
        // Fetch approver details if needed
        const dataWithApprovers = await Promise.all(
          data.map(async (item) => {
            if (item.approved_by) {
              const { data: approverData } = await supabase
                .from('employees')
                .select('first_name, last_name')
                .eq('id', item.approved_by)
                .single()
              
              return { ...item, approver: approverData }
            }
            return item
          })
        )
        setReportData(dataWithApprovers as ReportData[])
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
    const exportData = reportData.map(row => {
      const regularHours = Math.min(row.total_hours || 0, 40)
      const overtimeHours = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
      const hourlyRate = row.employees?.hourly_rate || 0
      const regularAmount = regularHours * hourlyRate
      const overtimeAmount = overtimeHours * hourlyRate * 1.5
      
      const rowData: any = {
        'Employee': `${row.employees?.first_name} ${row.employees?.last_name}`,
        'Department': row.employees?.department || '',
        'Week Ending': row.week_ending,
        'Approver': row.approver ? `${row.approver.first_name} ${row.approver.last_name}` : 'Not Approved',
        'Regular Hours': regularHours.toFixed(2),
        'Overtime Hours': overtimeHours.toFixed(2),
        'Total Hours': row.total_hours?.toFixed(2) || '0.00',
        'Status': row.status.charAt(0).toUpperCase() + row.status.slice(1),
        'Approved Date': row.approved_at ? new Date(row.approved_at).toLocaleDateString() : 'N/A'
      }

      if (byProject && row.projects) {
        rowData['Project'] = row.projects.name
        rowData['Project Code'] = row.projects.code || ''
      }

      return rowData
    })

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => {
      const maxLength = Math.max(
        key.length,
        ...exportData.map(row => String(row[key]).length)
      )
      return { wch: Math.min(maxLength + 2, 30) }
    })
    ws['!cols'] = colWidths
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Time by Approver')
    
    // Generate filename with date range
    const fileName = `time_by_approver_${startDate}_to_${endDate}.xlsx`
    
    // Write the file
    XLSX.writeFile(wb, fileName)
  }

  // Calculate totals
  const totals = reportData.reduce((acc, row) => {
    const regularHours = Math.min(row.total_hours || 0, 40)
    const overtimeHours = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
    
    acc.regularHours += regularHours
    acc.overtimeHours += overtimeHours
    acc.totalHours += row.total_hours || 0
    acc.approvedCount += row.status === 'approved' ? 1 : 0
    acc.pendingCount += row.status === 'pending' || row.status === 'submitted' ? 1 : 0
    
    return acc
  }, { regularHours: 0, overtimeHours: 0, totalHours: 0, approvedCount: 0, pendingCount: 0 })

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
              <a href="/manager/reports/time-by-approver" className="flex items-center justify-between px-3 py-2 text-sm bg-gray-100 text-gray-900 rounded">
                Time by Approver
                <ChevronRight className="h-4 w-4" />
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
              <a href="/manager/reports/expenses-by-approver" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Expenses by Approver
              </a>
            </div>
          </div>

          {/* Report Configuration */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Report Details: Time by Approver</h2>

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
                <div className="flex items-center mt-6">
                  <input 
                    type="checkbox"
                    checked={forceCompleteWeeks}
                    onChange={(e) => setForceCompleteWeeks(e.target.checked)}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <label className="ml-2 text-sm text-gray-700">Force Complete Weeks</label>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-6">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Type</label>
                  <select 
                    value={selectedTimeType}
                    onChange={(e) => setSelectedTimeType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {timeTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={byProject}
                    onChange={(e) => setByProject(e.target.checked)}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">By Project</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={includeUnapproved}
                    onChange={(e) => setIncludeUnapproved(e.target.checked)}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Unapproved</span>
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
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                {reportData.length > 0 && (
                  <button 
                    onClick={handleExportToExcel}
                    className="px-6 py-2 bg-[#05202E] text-white rounded-md hover:bg-gray-800 font-medium flex items-center"
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
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Records: <span className="font-semibold">{reportData.length}</span></p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Approved: <span className="font-semibold text-green-600">{totals.approvedCount}</span></p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Pending Review: <span className="font-semibold text-yellow-600">{totals.pendingCount}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Week Ending
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Approver
                          </th>
                          {byProject && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Project
                            </th>
                          )}
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Regular
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Overtime
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.map((row) => {
                          const regularHours = Math.min(row.total_hours || 0, 40)
                          const overtimeHours = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
                          
                          return (
                            <tr key={row.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row.employees?.first_name} {row.employees?.last_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row.employees?.department || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(row.week_ending).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row.approver ? `${row.approver.first_name} ${row.approver.last_name}` : '-'}
                              </td>
                              {byProject && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {row.projects?.name || 'N/A'}
                                </td>
                              )}
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                {regularHours.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                {overtimeHours.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                {(row.total_hours || 0).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  row.status === 'approved' 
                                    ? 'bg-green-100 text-green-800' 
                                    : row.status === 'pending' || row.status === 'submitted'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-gray-100">
                        <tr>
                          <td colSpan={byProject ? 5 : 4} className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                            Total
                          </td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                            {totals.regularHours.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                            {totals.overtimeHours.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                            {totals.totalHours.toFixed(2)}
                          </td>
                          <td className="px-6 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Details Section */}
                  {includeDetails && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                      <h3 className="text-sm font-semibold text-blue-900 mb-2">Report Details</h3>
                      <p className="text-sm text-blue-800">
                        This report shows all timesheets grouped by their approvers for the selected period.
                        {includeUnapproved && ' Including unapproved entries allows you to see pending items awaiting review.'}
                        {byProject && ' Project breakdown helps identify which projects are consuming the most resources.'}
                      </p>
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
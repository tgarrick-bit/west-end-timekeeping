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
  Download,
  AlertCircle
} from 'lucide-react'

interface Employee {
  id: string
  first_name: string
  last_name: string
  department?: string | null
  employee_type?: string | null
  email: string
  hourly_rate?: number | null
  status?: string | null
}

interface MissingTimeData {
  employee: Employee
  missing_dates: string[]
  weeks_missing: number
  last_submission?: string | null
  assigned_projects?: string[]
}

export default function TimeMissingReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [startDate, setStartDate] = useState('2025-09-07')
  const [endDate, setEndDate] = useState('')
  const [selectedUser, setSelectedUser] = useState('-All-')
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('-All-')
  const [selectedProject, setSelectedProject] = useState('-All-')
  const [byProject, setByProject] = useState(false)
  const [byDay, setByDay] = useState(false)
  const [reportData, setReportData] = useState<MissingTimeData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const employeeTypes = [
    '-All-',
    'Internal',
    'Hourly',
    '1099',
    'Corp2Corp',
    'Salary',
    'External'
  ]

  const handleRunReport = async () => {
    setIsLoading(true)
    
    try {
      // First, fetch all employees based on employee type filter
      let employeeQuery = supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')

      if (selectedEmployeeType !== '-All-') {
        employeeQuery = employeeQuery.eq('employee_type', selectedEmployeeType)
      }

      const { data: employees, error: empError } = await employeeQuery

      if (empError) {
        console.error('Error fetching employees:', empError)
        setIsLoading(false)
        return
      }

      // For each employee, check if they have submitted timesheets in the date range
      const missingTimeData: MissingTimeData[] = []
      
      for (const employee of employees || []) {
        // Check for submitted timesheets
        const { data: timesheets } = await supabase
          .from('timesheets')
          .select('week_ending')
          .eq('employee_id', employee.id)
          .gte('week_ending', startDate)
          .lte('week_ending', endDate || startDate)

        // Calculate missing weeks
        const submittedWeeks = timesheets?.map(t => t.week_ending) || []
        const allWeeks = getAllWeeksInRange(startDate, endDate || startDate)
        const missingWeeks = allWeeks.filter(week => !submittedWeeks.includes(week))

        if (missingWeeks.length > 0) {
          // Get last submission date
          const { data: lastTimesheet } = await supabase
            .from('timesheets')
            .select('week_ending')
            .eq('employee_id', employee.id)
            .order('week_ending', { ascending: false })
            .limit(1)
            .single()

          missingTimeData.push({
            employee: employee,
            missing_dates: missingWeeks,
            weeks_missing: missingWeeks.length,
            last_submission: lastTimesheet?.week_ending,
            assigned_projects: []
          })
        }
      }

      setReportData(missingTimeData)
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getAllWeeksInRange = (start: string, end: string): string[] => {
    const weeks: string[] = []
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    // Adjust to nearest Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay())
    
    while (startDate <= endDate) {
      // Add the Saturday (end of week) date
      const weekEnd = new Date(startDate)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weeks.push(weekEnd.toISOString().split('T')[0])
      
      // Move to next week
      startDate.setDate(startDate.getDate() + 7)
    }
    
    return weeks
  }

  const handleExportToExcel = () => {
    if (reportData.length === 0) {
      alert('No data to export. Please run the report first.')
      return
    }

    // Format data for Excel
    let exportData: any[] = []
    
    if (byDay) {
      // Create a row for each missing date
      reportData.forEach(row => {
        row.missing_dates.forEach(date => {
          exportData.push({
            'Employee': `${row.employee.first_name} ${row.employee.last_name}`,
            'Department': row.employee.department || '',
            'Employee Type': row.employee.employee_type || '',
            'Email': row.employee.email,
            'Missing Date': date,
            'Last Submission': row.last_submission || 'Never',
            'Status': 'Missing'
          })
        })
      })
    } else {
      // Single row per employee
      reportData.forEach(row => {
        exportData.push({
          'Employee': `${row.employee.first_name} ${row.employee.last_name}`,
          'Department': row.employee.department || '',
          'Employee Type': row.employee.employee_type || '',
          'Email': row.employee.email,
          'Weeks Missing': row.weeks_missing.toString(),
          'Missing Dates': row.missing_dates.join(', '),
          'Last Submission': row.last_submission || 'Never'
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
    XLSX.utils.book_append_sheet(wb, ws, 'Time Missing')
    
    // Generate filename with date range
    const fileName = `time_missing_${startDate}_to_${endDate || startDate}.xlsx`
    
    // Write the file
    XLSX.writeFile(wb, fileName)
  }

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
              <a href="/manager/reports/time-missing" className="flex items-center justify-between px-3 py-2 text-sm bg-gray-100 text-gray-900 rounded">
                Time Missing
                <ChevronRight className="h-4 w-4" />
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
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Report Details: Time Missing</h2>

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
                      placeholder=" "
                    />
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <select 
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option>-All-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Type</label>
                  <select 
                    value={selectedEmployeeType}
                    onChange={(e) => setSelectedEmployeeType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {employeeTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

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
                    checked={byDay}
                    onChange={(e) => setByDay(e.target.checked)}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">By Day</span>
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
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4 flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">
                        {reportData.length} employees with missing timesheets
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Total of {reportData.reduce((sum, d) => sum + d.weeks_missing, 0)} weeks missing across all employees
                      </p>
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
                            Employee Type
                          </th>
                          {!byDay && (
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Weeks Missing
                            </th>
                          )}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {byDay ? 'Missing Date' : 'Missing Dates'}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Submission
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {byDay ? (
                          // Show one row per missing date
                          reportData.flatMap(row => 
                            row.missing_dates.map((date, index) => (
                              <tr key={`${row.employee.id}-${date}`} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {row.employee.first_name} {row.employee.last_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {row.employee.department || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {row.employee.employee_type || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {row.last_submission 
                                    ? new Date(row.last_submission).toLocaleDateString()
                                    : 'Never'}
                                </td>
                              </tr>
                            ))
                          )
                        ) : (
                          // Show one row per employee
                          reportData.map((row) => (
                            <tr key={row.employee.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row.employee.first_name} {row.employee.last_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row.employee.department || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row.employee.employee_type || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  {row.weeks_missing}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="max-w-xs overflow-hidden text-ellipsis">
                                  {row.missing_dates.map(d => new Date(d).toLocaleDateString()).join(', ')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row.last_submission 
                                  ? new Date(row.last_submission).toLocaleDateString()
                                  : <span className="text-gray-400">Never</span>}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* No Missing Time Found */}
              {reportData.length === 0 && !isLoading && endDate && (
                <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded text-center">
                  <AlertCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-green-800">
                    All employees have submitted timesheets
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    No missing time entries found for the selected period.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
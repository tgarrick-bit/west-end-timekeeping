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
  Download
} from 'lucide-react'

interface ReportData {
  id: string
  week_ending: string
  total_hours: number
  overtime_hours: number
  status: string
  employee_id: string
  project_id?: string
  employees?: {
    first_name: string
    last_name: string
    department: string
    hourly_rate: number
    employee_type?: string
  }
  projects?: {
    name: string
    code: string
  }
}

export default function TimeByEmployeeReport() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [startDate, setStartDate] = useState('2025-09-07')
  const [endDate, setEndDate] = useState('2025-09-13')
  const [selectedUser, setSelectedUser] = useState('-All-')
  const [selectedProject, setSelectedProject] = useState('-All-')
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('-All-')
  const [selectedTimeType, setSelectedTimeType] = useState('-All-')
  const [selectedClass, setSelectedClass] = useState('-All-')
  const [forceCompleteWeeks, setForceCompleteWeeks] = useState(false)
  const [includeUnapproved, setIncludeUnapproved] = useState(false)
  const [includeBillRates, setIncludeBillRates] = useState(false)
  const [includePayRates, setIncludePayRates] = useState(false)
  const [includeDetails, setIncludeDetails] = useState(false)
  const [includeZeroHours, setIncludeZeroHours] = useState(false)
  const [summaryOnly, setSummaryOnly] = useState(false)
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
      let query = supabase
        .from('timesheets')
        .select(`
          *,
          employees!inner (
            first_name,
            last_name,
            department,
            hourly_rate,
            employee_type
          ),
          projects (
            name,
            code
          )
        `)
        .gte('week_ending', startDate)
        .lte('week_ending', endDate)

      if (!includeUnapproved) {
        query = query.eq('status', 'approved')
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching report data:', error)
      } else if (data) {
        setReportData(data as ReportData[])
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

    const exportData = reportData.map(row => {
      const regularHours = Math.min(row.total_hours || 0, 40)
      const overtimeHours = row.overtime_hours || Math.max(0, (row.total_hours || 0) - 40)
      const hourlyRate = row.employees?.hourly_rate || 0
      const regularAmount = regularHours * hourlyRate
      const overtimeAmount = overtimeHours * hourlyRate * 1.5
      
      const rowData: any = {
        'Employee': `${row.employees?.first_name} ${row.employees?.last_name}`,
        'Department': row.employees?.department || '',
        'Employee Type': row.employees?.employee_type || 'Regular',
        'Project': row.projects?.name || 'No Project Assigned',
        'Project Code': row.projects?.code || '',
        'Week Ending': row.week_ending,
        'Regular Hours': regularHours.toFixed(2),
        'Overtime Hours': overtimeHours.toFixed(2),
        'Total Hours': row.total_hours?.toFixed(2) || '0.00',
        'Status': row.status.charAt(0).toUpperCase() + row.status.slice(1)
      }

      if (includePayRates) {
        rowData['Pay Rate'] = `$${hourlyRate.toFixed(2)}`
        rowData['Regular Amount'] = `$${regularAmount.toFixed(2)}`
        rowData['Overtime Amount'] = `$${overtimeAmount.toFixed(2)}`
        rowData['Total Amount'] = `$${(regularAmount + overtimeAmount).toFixed(2)}`
      }

      if (includeBillRates) {
        rowData['Bill Rate'] = 'N/A'
        rowData['Billed Amount'] = 'N/A'
      }

      return rowData
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    
    const colWidths = Object.keys(exportData[0] || {}).map(key => {
      const maxLength = Math.max(
        key.length,
        ...exportData.map(row => String(row[key]).length)
      )
      return { wch: Math.min(maxLength + 2, 30) }
    })
    ws['!cols'] = colWidths
    
    XLSX.utils.book_append_sheet(wb, ws, 'Time by Employee')
    
    const fileName = `time_by_employee_${startDate}_to_${endDate}.xlsx`
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
              <a href="/manager/reports/time-by-employee" className="flex items-center justify-between px-3 py-2 text-sm bg-gray-100 text-gray-900 rounded">
                Time by Employee
                <ChevronRight className="h-4 w-4" />
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
              <a href="/manager/reports/expenses-by-approver" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Expenses by Approver
              </a>
            </div>
          </div>

          {/* Report Configuration */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Report Details: Time by Employee</h2>

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
                    <option>-All-</option>
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
                <div></div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select 
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
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
                    checked={includeUnapproved}
                    onChange={(e) => setIncludeUnapproved(e.target.checked)}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Unapproved</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={includeBillRates}
                    onChange={(e) => setIncludeBillRates(e.target.checked)}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Bill Rates</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={includePayRates}
                    onChange={(e) => setIncludePayRates(e.target.checked)}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Pay Rates</span>
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
                    checked={includeZeroHours}
                    onChange={(e) => setIncludeZeroHours(e.target.checked)}
                    className="rounded border-gray-300 text-[#e31c79]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Zero Hours</span>
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

              {/* Results Summary */}
              {reportData.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">
                    Found {reportData.length} timesheet records for the selected period.
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
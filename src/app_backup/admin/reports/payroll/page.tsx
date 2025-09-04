'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ArrowLeft,
  Download,
  FileText,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Eye,
  FileSpreadsheet,
  FileSpreadsheet as FileCsv,
  Settings,
  AlertCircle
} from 'lucide-react'

interface PayrollData {
  employee_id: string
  name: string
  client: string
  regular_hours: number
  overtime_hours: number
  weekend_hours: number
  holiday_hours: number
  hourly_rate: number
  gross_pay: number
  status: string
}

export default function PayrollReportsPage() {
  const router = useRouter()
  const { user: appUser, isLoading } = useAuth()
  const [selectedWeek, setSelectedWeek] = useState('2025-01-13')
  const [payrollData, setPayrollData] = useState<PayrollData[]>([])
  const [exportFormat, setExportFormat] = useState('csv')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!isLoading && (!appUser || appUser.role !== 'admin')) {
      router.push('/auth/signin')
    }
  }, [appUser, isLoading, router])

  useEffect(() => {
    // Simulate payroll data
    setPayrollData([
      {
        employee_id: 'emp1',
        name: 'Mike Chen',
        client: 'ABC Corp',
        regular_hours: 40.0,
        overtime_hours: 2.5,
        weekend_hours: 0,
        holiday_hours: 0,
        hourly_rate: 95,
        gross_pay: 4156.25,
        status: 'approved'
      },
      {
        employee_id: 'emp2',
        name: 'Sarah Johnson',
        client: 'ABC Corp',
        regular_hours: 38.0,
        overtime_hours: 0,
        weekend_hours: 4.0,
        holiday_hours: 0,
        hourly_rate: 85,
        gross_pay: 3910.00,
        status: 'approved'
      },
      {
        employee_id: 'emp3',
        name: 'Tom Wilson',
        client: 'XYZ Tech',
        regular_hours: 40.0,
        overtime_hours: 0,
        weekend_hours: 0,
        holiday_hours: 0,
        hourly_rate: 90,
        gross_pay: 3600.00,
        status: 'approved'
      }
    ])
  }, [])

  const weekOptions = [
    { value: '2025-01-13', label: 'Week of January 13-19, 2025' },
    { value: '2025-01-06', label: 'Week of January 6-12, 2025' },
    { value: '2024-12-30', label: 'Week of December 30, 2024' }
  ]

  const totalHours = payrollData.reduce((sum, emp) => 
    sum + emp.regular_hours + emp.overtime_hours + emp.weekend_hours + emp.holiday_hours, 0
  )
  const totalGross = payrollData.reduce((sum, emp) => sum + emp.gross_pay, 0)
  const approvedCount = payrollData.filter(emp => emp.status === 'approved').length

  const handleExport = async () => {
    setIsExporting(true)
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsExporting(false)
    
    // In real implementation, generate and download file
    alert(`Exported ${payrollData.length} employee records in ${exportFormat.toUpperCase()} format`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payroll reports...</p>
        </div>
      </div>
    )
  }

  if (!appUser || appUser.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Match Admin Dashboard exactly */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/admin/reports')}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#232020]">Payroll Reports</h1>
              <p className="text-[#465079]">Weekly summaries for EOR payroll processing</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-[#465079]">Role</p>
              <p className="text-sm font-medium text-[#232020] capitalize">Admin</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#465079]">Admin ID</p>
              <p className="text-sm font-medium text-[#232020]">admin-demo</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="space-y-8">
          {/* Week Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#232020]">Select Payroll Week</h2>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  {weekOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center px-4 py-2 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#d4156a] transition-colors disabled:opacity-50"
                >
                  {isExporting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export to {exportFormat.toUpperCase()}
                </button>
              </div>
            </div>

            {/* Export Format Selection */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-[#465079]">Export Format:</span>
              <div className="flex space-x-2">
                {['csv', 'excel'].map(format => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      exportFormat === format
                        ? 'bg-[#e31c79] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {format === 'csv' ? (
                      <FileCsv className="h-4 w-4 inline mr-1" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 inline mr-1" />
                    )}
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Current Week Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">
              📊 Week of January 13-19, 2025
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Total Approved Hours</p>
                    <p className="text-2xl font-bold">{totalHours.toFixed(1)} hours</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#05202E] to-[#0a2f3f] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <Users className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Total Contractors</p>
                    <p className="text-2xl font-bold">{payrollData.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#E5DDD8] to-[#d5c5c0] rounded-lg p-4 text-[#05202E]">
                <div className="flex items-center">
                  <AlertCircle className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Pending Approvals</p>
                    <p className="text-2xl font-bold">{payrollData.length - approvedCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Estimated Payroll</p>
                    <p className="text-2xl font-bold">${totalGross.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contractor Payroll Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Contractor Payroll Breakdown</h2>
            <div className="space-y-4">
              {payrollData.map((employee, index) => (
                <div key={employee.employee_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#232020]">
                        {employee.name} ({employee.employee_id})
                      </h3>
                      <p className="text-[#465079]">Client: {employee.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#465079]">Status</p>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        employee.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {employee.status === 'approved' ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-[#465079]">Regular Hours</p>
                      <p className="font-medium">{employee.regular_hours} hrs @ ${employee.hourly_rate}/hr</p>
                    </div>
                    {employee.overtime_hours > 0 && (
                      <div>
                        <p className="text-sm text-[#465079]">Overtime Hours</p>
                        <p className="font-medium">{employee.overtime_hours} hrs @ ${(employee.hourly_rate * 1.5).toFixed(2)}/hr</p>
                      </div>
                    )}
                    {employee.weekend_hours > 0 && (
                      <div>
                        <p className="text-sm text-[#465079]">Weekend Hours</p>
                        <p className="font-medium">{employee.weekend_hours} hrs @ ${(employee.hourly_rate * 2).toFixed(2)}/hr</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-[#465079]">Total Gross</p>
                      <p className="font-bold text-lg">${employee.gross_pay.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="text-sm text-[#465079]">
                      Ready for payroll: {employee.status === 'approved' ? '✅ Yes' : '⏳ Pending approval'}
                    </div>
                    <div className="flex space-x-2">
                      <button className="flex items-center px-3 py-1 text-sm text-[#e31c79] hover:bg-pink-50 rounded-md transition-colors">
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </button>
                      <button className="flex items-center px-3 py-1 text-sm text-[#05202E] hover:bg-blue-50 rounded-md transition-colors">
                        <Download className="h-4 w-4 mr-1" />
                        Export Data
                      </button>
                      {employee.status === 'approved' && (
                        <button className="flex items-center px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Processed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EOR Export Functions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">EOR Export Functions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Export Options</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <FileCsv className="h-5 w-5 text-[#e31c79]" />
                    <span className="text-sm">CSV Format for EOR payroll system upload</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="h-5 w-5 text-[#05202E]" />
                    <span className="text-sm">Excel Format with calculations and summaries</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Settings className="h-5 w-5 text-[#E5DDD8]" />
                    <span className="text-sm">Custom Format matching EOR requirements</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Export Data Includes</h3>
                <div className="space-y-2 text-sm text-[#465079]">
                  <p>• Employee ID and personal information</p>
                  <p>• Hours breakdown (regular, overtime, weekend, holiday)</p>
                  <p>• Rate calculations and gross pay</p>
                  <p>• Client assignments and project codes</p>
                  <p>• Approval timestamps and approver information</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center px-6 py-3 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#d4156a] transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Download className="h-5 w-5 mr-2" />
                )}
                Batch Export All Approved
              </button>
              <button className="flex items-center px-6 py-3 bg-[#05202E] text-white rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors">
                <FileText className="h-5 w-5 mr-2" />
                Generate Payroll Summary
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

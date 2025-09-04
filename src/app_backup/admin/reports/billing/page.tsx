'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ArrowLeft,
  Download,
  FileText,
  Receipt,
  Building2,
  DollarSign,
  Users,
  Calendar,
  Eye,
  FileSpreadsheet,
  FileSpreadsheet as FileCsv,
  Settings,
  CheckCircle,
  TrendingUp,
  PieChart,
  Clock
} from 'lucide-react'

interface ClientBillingData {
  client_id: string
  client_name: string
  month: string
  total_hours: number
  total_amount: number
  projects: ProjectBilling[]
  approval_rate: number
  rejected_hours: number
}

interface ProjectBilling {
  project_id: string
  project_name: string
  hours: number
  amount: number
  status: string
}

export default function ClientBillingPage() {
  const router = useRouter()
  const { user: appUser, isLoading } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState('2025-01')
  const [selectedClient, setSelectedClient] = useState('all')
  const [billingData, setBillingData] = useState<ClientBillingData[]>([])
  const [exportFormat, setExportFormat] = useState('csv')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!isLoading && (!appUser || appUser.role !== 'admin')) {
      router.push('/auth/signin')
    }
  }, [appUser, isLoading, router])

  useEffect(() => {
    // Simulate billing data
    setBillingData([
      {
        client_id: 'client1',
        client_name: 'ABC Corporation',
        month: '2025-01',
        total_hours: 687,
        total_amount: 67450,
        approval_rate: 98.5,
        rejected_hours: 4,
        projects: [
          {
            project_id: 'proj1',
            project_name: 'Project Alpha',
            hours: 287,
            amount: 28950,
            status: 'active'
          },
          {
            project_id: 'proj2',
            project_name: 'Project Beta',
            hours: 245,
            amount: 24700,
            status: 'active'
          },
          {
            project_id: 'proj3',
            project_name: 'Project Gamma',
            hours: 155,
            amount: 13800,
            status: 'completed'
          }
        ]
      },
      {
        client_id: 'client2',
        client_name: 'XYZ Technologies',
        month: '2025-01',
        total_hours: 432,
        total_amount: 38900,
        approval_rate: 99.2,
        rejected_hours: 1,
        projects: [
          {
            project_id: 'proj4',
            project_name: 'Mobile App Development',
            hours: 280,
            amount: 25200,
            status: 'active'
          },
          {
            project_id: 'proj5',
            project_name: 'API Integration',
            hours: 152,
            amount: 13700,
            status: 'active'
          }
        ]
      }
    ])
  }, [])

  const monthOptions = [
    { value: '2025-01', label: 'January 2025' },
    { value: '2024-12', label: 'December 2024' },
    { value: '2024-11', label: 'November 2024' }
  ]

  const clientOptions = [
    { value: 'all', label: 'All Clients' },
    { value: 'client1', label: 'ABC Corporation' },
    { value: 'client2', label: 'XYZ Technologies' }
  ]

  const totalHours = billingData.reduce((sum, client) => sum + client.total_hours, 0)
  const totalAmount = billingData.reduce((sum, client) => sum + client.total_amount, 0)
  const totalProjects = billingData.reduce((sum, client) => sum + client.projects.length, 0)

  const handleExport = async () => {
    setIsExporting(true)
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsExporting(false)
    
    // In real implementation, generate and download file
    alert(`Exported billing data for ${billingData.length} clients in ${exportFormat.toUpperCase()} format`)
  }

  const handleGenerateInvoice = (clientId: string) => {
    alert(`Generating invoice for client ${clientId}...`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing reports...</p>
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
              <h1 className="text-2xl font-bold text-[#232020]">Client Billing Reports</h1>
              <p className="text-[#465079]">Billing reports and project breakdowns for client invoicing</p>
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
          {/* Month and Client Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#232020]">Select Billing Period</h2>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  {monthOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  {clientOptions.map(option => (
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

          {/* Billing Overview Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">
              📊 January 2025 Billing Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Total Billable Hours</p>
                    <p className="text-2xl font-bold">{totalHours.toFixed(0)} hours</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#05202E] to-[#0a2f3f] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Total Amount Due</p>
                    <p className="text-2xl font-bold">${totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#E5DDD8] to-[#d5c5c0] rounded-lg p-4 text-[#05202E]">
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Active Projects</p>
                    <p className="text-2xl font-bold">{totalProjects}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Average Approval Rate</p>
                    <p className="text-2xl font-bold">98.8%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client Billing Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Client Billing Breakdown</h2>
            <div className="space-y-6">
              {billingData.map((client) => (
                <div key={client.client_id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[#232020]">
                        🏢 {client.client_name} - {monthOptions.find(m => m.value === client.month)?.label} Billing
                      </h3>
                      <p className="text-[#465079]">Total: {client.total_hours} hours • ${client.total_amount.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#465079]">Approval Rate</p>
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {client.approval_rate}%
                      </div>
                    </div>
                  </div>

                  {/* Project Breakdown */}
                  <div className="mb-4">
                    <h4 className="font-medium text-[#232020] mb-3">Project Breakdown:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {client.projects.map((project) => (
                        <div key={project.project_id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-[#232020]">{project.project_name}</h5>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              project.status === 'active' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {project.status === 'active' ? 'Active' : 'Completed'}
                            </span>
                          </div>
                          <p className="text-sm text-[#465079]">
                            {project.hours} hours • ${project.amount.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Client Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-[#465079]">
                      {client.rejected_hours > 0 && (
                        <span className="text-orange-600">
                          ⚠️ {client.rejected_hours} hours rejected
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => handleGenerateInvoice(client.client_id)}
                        className="flex items-center px-4 py-2 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#d4156a] transition-colors"
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Generate Invoice
                      </button>
                      <button className="flex items-center px-4 py-2 bg-[#05202E] text-white rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors">
                        <Download className="h-4 w-4 mr-2" />
                        Export Details
                      </button>
                      <button className="flex items-center px-4 py-2 bg-[#E5DDD8] text-[#05202E] rounded-lg font-medium hover:bg-[#d5c5c0] transition-colors">
                        <FileText className="h-4 w-4 mr-2" />
                        Send to ATS
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Government Compliance Reporting */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">🏛️ Government Project Compliance Report</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Project Funding Compliance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[#465079]">Project:</span>
                    <span className="text-sm font-medium">Federal IT Modernization (Grant #12345)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#465079]">Funding Period:</span>
                    <span className="text-sm font-medium">Jan 1 - Dec 31, 2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#465079]">Total Budget:</span>
                    <span className="text-sm font-medium">$500,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#465079]">Hours Used:</span>
                    <span className="text-sm font-medium">1,247 hrs (25% of allocation)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#465079]">Amount Billed:</span>
                    <span className="text-sm font-medium">$124,700 (25% of budget)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#465079]">Remaining Budget:</span>
                    <span className="text-sm font-medium">$375,300</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#465079]">Compliance Status:</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      On track
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Compliance Actions</h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-[#465079]">Detailed Breakdown</span>
                    <Eye className="h-4 w-4 text-[#e31c79]" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-[#465079]">Audit Report</span>
                    <FileText className="h-4 w-4 text-[#05202E]" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-[#465079]">Export for Review</span>
                    <Download className="h-4 w-4 text-[#E5DDD8]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ATS Integration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">ATS Integration & Export</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Export Templates</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <FileCsv className="h-5 w-5 text-[#e31c79]" />
                    <span className="text-sm">CSV format for ATS import</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="h-5 w-5 text-[#05202E]" />
                    <span className="text-sm">Excel with project breakdowns</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Settings className="h-5 w-5 text-[#E5DDD8]" />
                    <span className="text-sm">Custom ATS format</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Export Data Includes</h3>
                <div className="space-y-2 text-sm text-[#465079]">
                  <p>• Client and project information</p>
                  <p>• Hours by project and employee</p>
                  <p>• Rate applications and billing calculations</p>
                  <p>• Approval audit trail</p>
                  <p>• Ready for ATS import formatting</p>
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
                Export All Client Data
              </button>
              <button className="flex items-center px-6 py-3 bg-[#05202E] text-white rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors">
                <FileText className="h-5 w-5 mr-2" />
                Generate Billing Summary
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

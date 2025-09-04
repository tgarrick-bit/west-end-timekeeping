'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ArrowLeft,
  Download,
  FileText,
  FileSpreadsheet,
  FileSpreadsheet as FileCsv,
  Settings,
  Clock,
  DollarSign,
  Users,
  Building2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Database,
  Zap,
  RefreshCw,
  Eye
} from 'lucide-react'

interface ExportJob {
  id: string
  name: string
  type: 'payroll' | 'billing' | 'compliance' | 'analytics'
  format: 'csv' | 'excel' | 'json' | 'pdf'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
  file_size?: string
  record_count?: number
}

interface ExportTemplate {
  id: string
  name: string
  description: string
  type: 'payroll' | 'billing' | 'compliance'
  format: 'csv' | 'excel' | 'pdf'
  last_used?: string
  is_default: boolean
}

export default function ExportCenterPage() {
  const router = useRouter()
  const { user: appUser, isLoading } = useAuth()
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [exportTemplates, setExportTemplates] = useState<ExportTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!isLoading && (!appUser || appUser.role !== 'admin')) {
      router.push('/auth/signin')
    }
  }, [appUser, isLoading, router])

  useEffect(() => {
    // Simulate export jobs data
    setExportJobs([
      {
        id: 'job1',
        name: 'Weekly Payroll Export - Jan 13-19',
        type: 'payroll',
        format: 'csv',
        status: 'completed',
        created_at: '2025-01-20 09:00 AM',
        completed_at: '2025-01-20 09:02 AM',
        file_size: '2.4 MB',
        record_count: 47
      },
      {
        id: 'job2',
        name: 'Client Billing Report - January 2025',
        type: 'billing',
        format: 'excel',
        status: 'processing',
        created_at: '2025-01-20 10:15 AM'
      },
      {
        id: 'job3',
        name: 'Compliance Report - Q4 2024',
        type: 'compliance',
        format: 'pdf',
        status: 'pending',
        created_at: '2025-01-20 11:30 AM'
      }
    ])

    // Simulate export templates
    setExportTemplates([
      {
        id: 'template1',
        name: 'EOR Payroll Export',
        description: 'Standard format for EOR payroll system upload',
        type: 'payroll',
        format: 'csv',
        last_used: '2025-01-20 09:00 AM',
        is_default: true
      },
      {
        id: 'template2',
        name: 'ATS Billing Export',
        description: 'Client billing data for ATS import',
        type: 'billing',
        format: 'excel',
        last_used: '2025-01-15 02:30 PM',
        is_default: false
      },
      {
        id: 'template3',
        name: 'Government Compliance',
        description: 'Audit-ready compliance reports',
        type: 'compliance',
        format: 'pdf',
        last_used: '2025-01-10 11:00 AM',
        is_default: false
      }
    ])
  }, [])

  const handleExport = async (templateId: string) => {
    setIsExporting(true)
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsExporting(false)
    
    // In real implementation, generate and download file
    const template = exportTemplates.find(t => t.id === templateId)
    alert(`Exported data using ${template?.name} template`)
  }

  const handleCreateTemplate = () => {
    alert('Create new export template...')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'failed':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading export center...</p>
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
              <h1 className="text-2xl font-bold text-[#232020]">Export Center</h1>
              <p className="text-[#465079]">Data exports for EOR, ATS, and external systems</p>
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
          {/* Export Overview Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">
              📊 Export Center Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <Database className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Total Exports Today</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#05202E] to-[#0a2f3f] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <Zap className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Active Templates</p>
                    <p className="text-2xl font-bold">{exportTemplates.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#E5DDD8] to-[#d5c5c0] rounded-lg p-4 text-[#05202E]">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Success Rate</p>
                    <p className="text-2xl font-bold">98.5%</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Avg Export Time</p>
                    <p className="text-2xl font-bold">2.3s</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Templates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#232020]">Export Templates</h2>
              <button
                onClick={handleCreateTemplate}
                className="flex items-center px-4 py-2 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#d4156a] transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                Create Template
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exportTemplates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {template.format === 'csv' ? (
                        <FileCsv className="h-5 w-5 text-[#e31c79]" />
                      ) : (
                        <FileSpreadsheet className="h-5 w-5 text-[#05202E]" />
                      )}
                      <h3 className="font-semibold text-[#232020]">{template.name}</h3>
                    </div>
                    {template.is_default && (
                      <span className="px-2 py-1 bg-[#e31c79] text-white text-xs rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-[#465079] mb-3">{template.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#465079] capitalize">{template.type}</span>
                    <span className="text-xs text-[#465079] uppercase">{template.format}</span>
                  </div>
                  
                  {template.last_used && (
                    <p className="text-xs text-[#465079] mb-3">
                      Last used: {template.last_used}
                    </p>
                  )}
                  
                  <button
                    onClick={() => handleExport(template.id)}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center px-3 py-2 bg-[#05202E] text-white rounded-lg text-sm font-medium hover:bg-[#0a2f3f] transition-colors disabled:opacity-50"
                  >
                    {isExporting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Export with Template
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* EOR Integration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">EOR Integration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Payroll Export</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <FileCsv className="h-5 w-5 text-[#e31c79]" />
                    <span className="text-sm">Direct format for your EOR system</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-[#05202E]" />
                    <span className="text-sm">Scheduled weekly payroll exports</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-[#E5DDD8]" />
                    <span className="text-sm">Only export approved hours</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-[#e31c79]" />
                    <span className="text-sm">Error checking before export</span>
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
                onClick={() => handleExport('template1')}
                disabled={isExporting}
                className="flex items-center px-6 py-3 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#d4156a] transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Download className="h-5 w-5 mr-2" />
                )}
                Export Payroll Data
              </button>
              <button className="flex items-center px-6 py-3 bg-[#05202E] text-white rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors">
                <Settings className="h-5 w-5 mr-2" />
                Configure EOR Settings
              </button>
            </div>
          </div>

          {/* ATS Integration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">ATS Integration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Billing Export</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="h-5 w-5 text-[#e31c79]" />
                    <span className="text-sm">Client invoicing data format</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-[#05202E]" />
                    <span className="text-sm">Hours by client and project</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-[#E5DDD8]" />
                    <span className="text-sm">Billing calculations included</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-[#e31c79]" />
                    <span className="text-sm">Ready for client billing</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Export Templates</h3>
                <div className="space-y-2 text-sm text-[#465079]">
                  <p>• CSV format for ATS import</p>
                  <p>• Excel with project breakdowns</p>
                  <p>• Custom ATS format</p>
                  <p>• Invoice-ready data structure</p>
                  <p>• Project allocation tracking</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => handleExport('template2')}
                disabled={isExporting}
                className="flex items-center px-6 py-3 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#d4156a] transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Download className="h-5 w-5 mr-2" />
                )}
                Export Billing Data
              </button>
              <button className="flex items-center px-6 py-3 bg-[#05202E] text-white rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors">
                <Settings className="h-5 w-5 mr-2" />
                Configure ATS Settings
              </button>
            </div>
          </div>

          {/* Custom Exports */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Custom Exports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <FileCsv className="h-8 w-8 text-[#e31c79] mb-2" />
                <span className="text-sm font-medium text-[#232020]">CSV Downloads</span>
                <span className="text-xs text-[#465079]">Spreadsheet analysis</span>
              </button>
              
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <FileText className="h-8 w-8 text-[#05202E] mb-2" />
                <span className="text-sm font-medium text-[#232020]">PDF Reports</span>
                <span className="text-xs text-[#465079]">Client presentations</span>
              </button>
              
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <FileSpreadsheet className="h-8 w-8 text-[#E5DDD8] mb-2" />
                <span className="text-sm font-medium text-[#232020]">Excel Workbooks</span>
                <span className="text-xs text-[#465079]">Multiple worksheets</span>
              </button>
              
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <Database className="h-8 w-8 text-[#e31c79] mb-2" />
                <span className="text-sm font-medium text-[#232020]">JSON Data</span>
                <span className="text-xs text-[#465079]">API integrations</span>
              </button>
            </div>
          </div>

          {/* Recent Export Jobs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Recent Export Jobs</h2>
            <div className="space-y-3">
              {exportJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    {job.format === 'csv' ? (
                      <FileCsv className="h-5 w-5 text-[#e31c79]" />
                    ) : job.format === 'excel' ? (
                      <FileSpreadsheet className="h-5 w-5 text-[#05202E]" />
                    ) : (
                      <FileText className="h-5 w-5 text-[#E5DDD8]" />
                    )}
                    <div>
                      <h4 className="font-medium text-[#232020]">{job.name}</h4>
                      <p className="text-sm text-[#465079]">
                        {job.type} • {job.format.toUpperCase()} • {job.created_at}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                        <span className="ml-1 capitalize">{job.status}</span>
                      </div>
                      {job.status === 'completed' && (
                        <p className="text-xs text-[#465079] mt-1">
                          {job.file_size} • {job.record_count} records
                        </p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button className="p-1 text-[#465079] hover:text-[#e31c79] transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      {job.status === 'completed' && (
                        <button className="p-1 text-[#465079] hover:text-[#e31c79] transition-colors">
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

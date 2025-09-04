'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ArrowLeft,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Users,
  Building2,
  Calendar,
  Eye,
  FileSpreadsheet,
  FileSpreadsheet as FileCsv,
  Settings,
  Shield,
  TrendingUp,
  BarChart3
} from 'lucide-react'

interface ComplianceProject {
  id: string
  name: string
  grant_number: string
  funding_source: string
  total_budget: number
  start_date: string
  end_date: string
  hours_used: number
  amount_billed: number
  remaining_budget: number
  compliance_status: 'on_track' | 'review_required' | 'at_risk' | 'compliant'
  last_audit: string
  next_review: string
}

interface ComplianceReport {
  id: string
  name: string
  type: 'quarterly' | 'annual' | 'audit' | 'compliance'
  period: string
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  created_at: string
  approved_at?: string
  file_size?: string
}

export default function ComplianceReportsPage() {
  const router = useRouter()
  const { user: appUser, isLoading } = useAuth()
  const [complianceProjects, setComplianceProjects] = useState<ComplianceProject[]>([])
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('2025-Q1')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!isLoading && (!appUser || appUser.role !== 'admin')) {
      router.push('/auth/signin')
    }
  }, [appUser, isLoading, router])

  useEffect(() => {
    // Simulate compliance projects data
    setComplianceProjects([
      {
        id: 'proj1',
        name: 'Federal IT Modernization',
        grant_number: 'GRANT-12345',
        funding_source: 'Federal Government',
        total_budget: 500000,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        hours_used: 1247,
        amount_billed: 124700,
        remaining_budget: 375300,
        compliance_status: 'on_track',
        last_audit: '2024-12-15',
        next_review: '2025-03-15'
      },
      {
        id: 'proj2',
        name: 'State Healthcare Portal',
        grant_number: 'CONTRACT-67890',
        funding_source: 'State Government',
        total_budget: 250000,
        start_date: '2025-03-01',
        end_date: '2025-08-31',
        hours_used: 456,
        amount_billed: 112500,
        remaining_budget: 137500,
        compliance_status: 'review_required',
        last_audit: '2025-01-10',
        next_review: '2025-02-15'
      },
      {
        id: 'proj3',
        name: 'Local Education Platform',
        grant_number: 'GRANT-11111',
        funding_source: 'Local Government',
        total_budget: 150000,
        start_date: '2024-09-01',
        end_date: '2025-06-30',
        hours_used: 890,
        amount_billed: 89000,
        remaining_budget: 61000,
        compliance_status: 'compliant',
        last_audit: '2024-12-01',
        next_review: '2025-06-01'
      }
    ])

    // Simulate compliance reports data
    setComplianceReports([
      {
        id: 'report1',
        name: 'Q4 2024 Compliance Summary',
        type: 'quarterly',
        period: '2024-Q4',
        status: 'approved',
        created_at: '2025-01-15',
        approved_at: '2025-01-20',
        file_size: '3.2 MB'
      },
      {
        id: 'report2',
        name: 'Annual Compliance Report 2024',
        type: 'annual',
        period: '2024',
        status: 'pending',
        created_at: '2025-01-10'
      },
      {
        id: 'report3',
        name: 'Federal IT Modernization Audit',
        type: 'audit',
        period: '2024-12',
        status: 'approved',
        created_at: '2024-12-20',
        approved_at: '2024-12-25',
        file_size: '1.8 MB'
      }
    ])
  }, [])

  const periodOptions = [
    { value: '2025-Q1', label: 'Q1 2025' },
    { value: '2024-Q4', label: 'Q4 2024' },
    { value: '2024-Q3', label: 'Q3 2024' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-800'
      case 'review_required':
        return 'bg-yellow-100 text-yellow-800'
      case 'at_risk':
        return 'bg-red-100 text-red-800'
      case 'compliant':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle className="h-4 w-4" />
      case 'review_required':
        return <AlertCircle className="h-4 w-4" />
      case 'at_risk':
        return <AlertCircle className="h-4 w-4" />
      case 'compliant':
        return <Shield className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsGenerating(false)
    
    alert('Compliance report generated successfully')
  }

  const totalBudget = complianceProjects.reduce((sum, proj) => sum + proj.total_budget, 0)
  const totalBilled = complianceProjects.reduce((sum, proj) => sum + proj.amount_billed, 0)
  const totalHours = complianceProjects.reduce((sum, proj) => sum + proj.hours_used, 0)
  const onTrackProjects = complianceProjects.filter(proj => proj.compliance_status === 'on_track').length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-between">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading compliance reports...</p>
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
              <h1 className="text-2xl font-bold text-[#232020]">Compliance Reports</h1>
              <p className="text-[#465079]">Government project tracking and audit reports</p>
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
          {/* Period Selection and Report Generation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#232020]">Generate Compliance Report</h2>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                >
                  {periodOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="flex items-center px-4 py-2 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#d4156a] transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <FileSpreadsheet className="h-6 w-6 text-[#e31c79] mb-2" />
                <span className="text-sm font-medium text-[#232020]">Excel Report</span>
                <span className="text-xs text-[#465079]">Detailed analysis</span>
              </button>
              
              <button className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <FileCsv className="h-6 w-6 text-[#05202E] mb-2" />
                <span className="text-sm font-medium text-[#232020]">CSV Export</span>
                <span className="text-xs text-[#465079]">Data processing</span>
              </button>
              
              <button className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <FileText className="h-6 w-6 text-[#E5DDD8] mb-2" />
                <span className="text-sm font-medium text-[#232020]">PDF Report</span>
                <span className="text-xs text-[#465079]">Audit ready</span>
              </button>
              
              <button className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <BarChart3 className="h-6 w-6 text-[#e31c79] mb-2" />
                <span className="text-sm font-medium text-[#232020]">Dashboard</span>
                <span className="text-xs text-[#465079]">Visual summary</span>
              </button>
            </div>
          </div>

          {/* Compliance Overview Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">
              🏛️ Government Project Compliance Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Total Budget</p>
                    <p className="text-2xl font-bold">${(totalBudget / 1000).toFixed(0)}k</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#05202E] to-[#0a2f3f] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Total Hours</p>
                    <p className="text-2xl font-bold">{totalHours.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#E5DDD8] to-[#d5c5c0] rounded-lg p-4 text-[#05202E]">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">On Track</p>
                    <p className="text-2xl font-bold">{onTrackProjects}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg p-4 text-white">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 mr-3" />
                  <div>
                    <p className="text-sm opacity-90">Utilization</p>
                    <p className="text-2xl font-bold">{((totalBilled / totalBudget) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Government Project Tracking */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Government Project Tracking</h2>
            <div className="space-y-6">
              {complianceProjects.map((project) => (
                <div key={project.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[#232020]">
                        🏛️ {project.name}
                      </h3>
                      <p className="text-[#465079]">
                        {project.grant_number} • {project.funding_source} • {project.start_date} - {project.end_date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#465079]">Status</p>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.compliance_status)}`}>
                        {getStatusIcon(project.compliance_status)}
                        <span className="ml-1 capitalize">
                          {project.compliance_status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Project Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-[#465079]">Total Budget</p>
                      <p className="font-semibold text-[#232020]">${project.total_budget.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-[#465079]">Hours Used</p>
                      <p className="font-semibold text-[#232020]">{project.hours_used.toLocaleString()} hrs</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-[#465079]">Amount Billed</p>
                      <p className="font-semibold text-[#232020]">${project.amount_billed.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-[#465079]">Remaining Budget</p>
                      <p className="font-semibold text-[#232020]">${project.remaining_budget.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-[#465079] mb-2">
                      <span>Budget Utilization</span>
                      <span>{((project.amount_billed / project.total_budget) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#e31c79] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(project.amount_billed / project.total_budget) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Project Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-[#465079]">
                      <p>Last Audit: {project.last_audit}</p>
                      <p>Next Review: {project.next_review}</p>
                    </div>
                    <div className="flex space-x-3">
                      <button className="flex items-center px-3 py-2 bg-[#e31c79] text-white rounded-lg text-sm font-medium hover:bg-[#d4156a] transition-colors">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                      <button className="flex items-center px-3 py-2 bg-[#05202E] text-white rounded-lg text-sm font-medium hover:bg-[#0a2f3f] transition-colors">
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </button>
                      <button className="flex items-center px-3 py-2 bg-[#E5DDD8] text-[#05202E] rounded-lg text-sm font-medium hover:bg-[#d5c5c0] transition-colors">
                        <FileText className="h-4 w-4 mr-2" />
                        Audit Report
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance Reports Library */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Compliance Reports Library</h2>
            <div className="space-y-3">
              {complianceReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    {report.type === 'quarterly' ? (
                      <Calendar className="h-5 w-5 text-[#e31c79]" />
                    ) : report.type === 'annual' ? (
                      <FileText className="h-5 w-5 text-[#05202E]" />
                    ) : (
                      <Shield className="h-5 w-5 text-[#E5DDD8]" />
                    )}
                    <div>
                      <h4 className="font-medium text-[#232020]">{report.name}</h4>
                      <p className="text-sm text-[#465079]">
                        {report.type} • {report.period} • {report.created_at}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        report.status === 'approved' ? 'bg-green-100 text-green-800' :
                        report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {report.status === 'approved' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : report.status === 'pending' ? (
                          <Clock className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        <span className="capitalize">{report.status}</span>
                      </div>
                      {report.file_size && (
                        <p className="text-xs text-[#465079] mt-1">{report.file_size}</p>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button className="p-1 text-[#465079] hover:text-[#e31c79] transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      {report.status === 'approved' && (
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

          {/* Regulatory Compliance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#232020] mb-4">Regulatory Compliance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Labor Law Compliance</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Overtime calculations compliant</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Break requirements met</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Minimum wage compliance</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm">Holiday pay review needed</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-[#232020] mb-3">Government Contract Requirements</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">SLA tracking active</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Project milestones met</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Budget utilization on track</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Reporting requirements met</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <button className="flex items-center px-6 py-3 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#d4156a] transition-colors">
                <Shield className="h-5 w-5 mr-2" />
                Generate Compliance Summary
              </button>
              <button className="flex items-center px-6 py-3 bg-[#05202E] text-white rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors">
                <Download className="h-5 w-5 mr-2" />
                Export Audit Package
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

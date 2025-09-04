'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  Clock, 
  DollarSign,
  Download,
  Calendar,
  Filter,
  Receipt,
  AlertCircle,
  FileText,
  CheckCircle,
  X,
  ArrowLeft
} from 'lucide-react'

interface AdminReportsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any
}

export default function AdminReportsPage() {
  const router = useRouter()
  const { user: appUser, isLoading } = useAuth()
  const [reportStats, setReportStats] = useState({
    totalReports: 0,
    pendingExports: 0,
    totalRevenue: 0,
    activeProjects: 0
  })

  useEffect(() => {
    if (!isLoading && (!appUser || appUser.role !== 'admin')) {
      router.push('/auth/signin')
    }
  }, [appUser, isLoading, router])

  useEffect(() => {
    // Simulate fetching report stats
    setReportStats({
      totalReports: 156,
      pendingExports: 23,
      totalRevenue: 125000,
      activeProjects: 12
    })
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
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
              onClick={() => router.push('/admin')}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#232020]">System Reports</h1>
              <p className="text-[#465079]">Operational reporting and data exports for business operations</p>
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
        {/* Essential Reports Cards - Same styling as admin action cards */}
        <div className="space-y-8">
          {/* Reports Overview Cards */}
          <div>
            <h2 className="text-xl font-semibold text-[#232020] mb-6">Reports Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#e31c79]">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#465079]">Total Reports</p>
                    <p className="text-2xl font-semibold text-[#232020]">{reportStats.totalReports}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#05202E]">
                    <Download className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#465079]">Pending Exports</p>
                    <p className="text-2xl font-semibold text-[#232020]">{reportStats.pendingExports}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#E5DDD8]">
                    <DollarSign className="h-6 w-6 text-[#05202E]" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#465079]">Total Revenue</p>
                    <p className="text-2xl font-semibold text-[#232020]">${reportStats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#e31c79]">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#465079]">Active Projects</p>
                    <p className="text-2xl font-semibold text-[#232020]">{reportStats.activeProjects}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Essential Reports Cards - Same styling as admin action cards */}
          <div>
            <h2 className="text-xl font-semibold text-[#232020] mb-6">Essential Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Payroll Reports */}
              <div 
                className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-all duration-200"
                onClick={() => router.push('/admin/reports/payroll')}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-full">
                    <DollarSign className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Payroll Reports</h3>
                    <p className="text-pink-100 mt-1">Weekly summaries for EOR export</p>
                  </div>
                </div>
              </div>

              {/* Client Billing */}
              <div 
                className="bg-gradient-to-r from-[#05202E] to-[#0a2f3f] rounded-lg shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-all duration-200"
                onClick={() => router.push('/admin/reports/billing')}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-full">
                    <Receipt className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Client Billing</h3>
                    <p className="text-blue-100 mt-1">Project breakdowns for invoicing</p>
                  </div>
                </div>
              </div>

              {/* Export Center */}
              <div 
                className="bg-gradient-to-r from-[#E5DDD8] to-[#d5c5c0] rounded-lg shadow-lg p-6 text-[#05202E] cursor-pointer hover:shadow-xl transition-all duration-200"
                onClick={() => router.push('/admin/reports/export')}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-[#05202E] bg-opacity-20 rounded-full">
                    <Download className="h-8 w-8 text-[#05202E]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Export Center</h3>
                    <p className="text-[#465079] mt-1">CSV/Excel exports for EOR and ATS</p>
                  </div>
                </div>
              </div>

              {/* Compliance Reports */}
              <div 
                className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-all duration-200"
                onClick={() => router.push('/admin/reports/compliance')}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-full">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Compliance Reports</h3>
                    <p className="text-pink-100 mt-1">Government project tracking</p>
                  </div>
                </div>
              </div>

              {/* Approval Analytics */}
              <div 
                className="bg-gradient-to-r from-[#05202E] to-[#0a2f3f] rounded-lg shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-all duration-200"
                onClick={() => router.push('/admin/reports/approvals')}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-full">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Approval Analytics</h3>
                    <p className="text-blue-100 mt-1">Workflow monitoring</p>
                  </div>
                </div>
              </div>

              {/* Operational Dashboard */}
              <div 
                className="bg-gradient-to-r from-[#E5DDD8] to-[#d5c5c0] rounded-lg shadow-lg p-6 text-[#05202E] cursor-pointer hover:shadow-xl transition-all duration-200"
                onClick={() => router.push('/admin/reports/operational')}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-[#05202E] bg-opacity-20 rounded-full">
                    <TrendingUp className="h-8 w-8 text-[#05202E]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Operational Dashboard</h3>
                    <p className="text-[#465079] mt-1">Real-time status overview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access Links */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-[#232020] mb-4">Quick Access</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/admin/reports/payroll')}
                className="flex items-center px-4 py-3 bg-[#e31c79] text-white rounded-lg font-medium hover:bg-[#d4156a] transition-colors"
              >
                <DollarSign className="h-5 w-5 mr-2" />
                Payroll Export
              </button>
              <button
                onClick={() => router.push('/admin/reports/billing')}
                className="flex items-center px-4 py-3 bg-[#05202E] text-white rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors"
              >
                <Receipt className="h-5 w-5 mr-2" />
                Client Billing
              </button>
              <button
                onClick={() => router.push('/admin/reports/export')}
                className="flex items-center px-4 py-3 bg-[#E5DDD8] text-[#05202E] rounded-lg font-medium hover:bg-[#d5c5c0] transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Export Center
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

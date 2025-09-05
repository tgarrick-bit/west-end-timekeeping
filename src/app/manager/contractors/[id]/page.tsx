'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  User,
  Clock,
  DollarSign,
  Building2,
  Mail,
  Phone,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  BarChart3,
  Users,
  Receipt,
  TrendingUp,
  FileText
} from 'lucide-react'

interface ContractorDetail {
  id: string
  name: string
  role: string
  email: string
  phone?: string
  status: 'active' | 'inactive' | 'pending'
  hourlyRate: number
  totalHours: number
  totalAmount: number
  lastActive: string
  projects: string[]
  employeeId: string
  startDate: string
  skills: string[]
  notes?: string
}

export default function ContractorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [contractor, setContractor] = useState<ContractorDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ------- SAFE DISPLAY NAME FOR SUPABASE USER --------
  const meta: any = (user as any)?.user_metadata ?? {}
  const displayName =
    (meta.first_name && meta.last_name)
      ? `${meta.first_name} ${meta.last_name}`
      : (user?.email ?? '')
  // ----------------------------------------------------

  const contractorId = params.id as string

  useEffect(() => {
    // Simulate loading contractor data
    setTimeout(() => {
      const mockContractor: ContractorDetail = {
        id: '1',
        name: contractorId === 'emp1' ? 'Mike Chen' : 'Sarah Johnson',
        role: contractorId === 'emp1' ? 'Tech Infrastructure' : 'Software Development',
        email: contractorId === 'emp1' ? 'mike.chen@techcorp.com' : 'sarah.johnson@devcorp.com',
        phone: contractorId === 'emp1' ? '+1 (555) 123-4567' : '+1 (555) 234-5678',
        status: 'active',
        hourlyRate: contractorId === 'emp1' ? 95 : 110,
        totalHours: contractorId === 'emp1' ? 156.5 : 142.0,
        totalAmount: contractorId === 'emp1' ? 14867.50 : 15620.00,
        lastActive: '2025-01-19',
        projects: contractorId === 'emp1'
          ? ['ABC Corp - Tech Infrastructure', 'ABC Corp - System Maintenance']
          : ['ABC Corp - Software Development', 'ABC Corp - API Integration'],
        employeeId: contractorId,
        startDate: '2024-06-01',
        skills: contractorId === 'emp1'
          ? ['Network Administration', 'System Security', 'Cloud Infrastructure', 'DevOps']
          : ['Full-Stack Development', 'React/Node.js', 'API Design', 'Database Design'],
        notes: contractorId === 'emp1'
          ? 'Excellent technical skills, very reliable, great communication with stakeholders.'
          : 'Strong problem-solving abilities, quick learner, excellent team player.'
      }
      setContractor(mockContractor)
      setIsLoading(false)
    }, 1000)
  }, [contractorId])

  const handleContact = (method: 'email' | 'phone') => {
    if (!contractor) return
    if (method === 'email') {
      window.open(`mailto:${contractor.email}`)
    } else if (method === 'phone' && contractor.phone) {
      window.open(`tel:${contractor.phone}`)
    }
  }

  const handleViewTimesheets = () => {
    router.push(`/manager/approvals?employee=${contractorId}&type=timesheet`)
  }

  const handleViewExpenses = () => {
    router.push(`/manager/approvals?employee=${contractorId}&type=expense`)
  }

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, active: false },
    { id: 'contractors', label: 'Contractors', icon: Users, active: true },
    { id: 'timesheets', label: 'Timesheets', icon: Clock, active: false },
    { id: 'expenses', label: 'Expenses', icon: Receipt, active: false },
    { id: 'reports', label: 'Reports', icon: TrendingUp, active: false },
    { id: 'approvals', label: 'Approvals', icon: FileText, active: false }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading Contractor Details...</p>
        </div>
      </div>
    )
  }

  if (!contractor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Contractor not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 bg-[#e31c79] text-white px-4 py-2 rounded-lg hover:bg-[#c41a6b] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#05202E] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-700">
          <div className="flex items-center">
            <span className="text-white font-semibold text-lg">Manager Portal</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-6 px-4">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    onClick={() =>
                      router.push(`/manager/${item.id === 'dashboard' ? '' : item.id}`)
                    }
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      item.active
                        ? 'bg-[#e31c79] text-white shadow-sm'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-700">
          <div className="text-white text-sm">
            <p className="font-medium truncate">{displayName}</p>
            <p className="text-gray-300 text-xs">Manager</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="ml-4 lg:ml-0">
                <h1 className="text-2xl font-bold text-[#232020]">Contractor Details</h1>
                <p className="text-[#465079]">View detailed information about {contractor.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-[#465079]">Company</p>
                <p className="text-sm font-medium text-[#232020]">ABC Corporation</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#465079]">Role</p>
                <p className="text-sm font-medium text-[#232020] capitalize">Manager</p>
              </div>
              <button
                onClick={signOut}
                className="ml-4 px-4 py-2 text-[#465079] hover:text-[#e31c79] hover:bg-gray-100 rounded-lg transition-colors flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="space-y-6">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-[#e31c79] hover:text-[#c41a6b] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Contractors</span>
            </button>

            {/* Contractor Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-[#e31c79] bg-opacity-10 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-[#e31c79]" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-[#232020]">{contractor.name}</h1>
                  <p className="text-xl text-[#465079]">{contractor.role}</p>
                  <p className="text-sm text-gray-500">Employee ID: {contractor.employeeId}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleContact('email')}
                    className="bg-[#e31c79] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#c41a6b] transition-colors flex items-center space-x-2"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </button>
                  {contractor.phone && (
                    <button
                      onClick={() => handleContact('phone')}
                      className="bg-[#05202E] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors flex items-center space-x-2"
                    >
                      <Phone className="h-4 w-4" />
                      <span>Call</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#e31c79]">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#465079]">Hourly Rate</p>
                    <p className="text-2xl font-semibold text-[#232020]">${contractor.hourlyRate}/hr</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#465079]">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#465079]">Total Hours</p>
                    <p className="text-2xl font-semibold text-[#232020]">{contractor.totalHours} hrs</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-500">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#465079]">Total Amount</p>
                    <p className="text-2xl font-semibold text-[#232020]">
                      ${contractor.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-orange-500">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#465079]">Projects</p>
                    <p className="text-2xl font-semibold text-[#232020]">{contractor.projects.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-[#232020] mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleViewTimesheets}
                  className="bg-[#e31c79] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#c41a6b] transition-colors flex items-center justify-center space-x-2"
                >
                  <Clock className="h-5 w-5" />
                  <span>Review Timesheets</span>
                </button>
                <button
                  onClick={handleViewExpenses}
                  className="bg-[#05202E] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors flex items-center justify-center space-x-2"
                >
                  <DollarSign className="h-5 w-5" />
                  <span>Review Expenses</span>
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-[#232020] mb-4">Personal Information</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-[#465079]">Email:</span>
                    <p className="text-[#232020]">{contractor.email}</p>
                  </div>
                  {contractor.phone && (
                    <div>
                      <span className="text-sm font-medium text-[#465079]">Phone:</span>
                      <p className="text-[#232020]">{contractor.phone}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-[#465079]">Start Date:</span>
                    <p className="text-[#232020]">{new Date(contractor.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[#465079]">Last Active:</span>
                    <p className="text-[#232020]">{new Date(contractor.lastActive).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[#465079]">Status:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        contractor.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {contractor.status.charAt(0).toUpperCase() + contractor.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-[#232020] mb-4">Skills & Expertise</h2>
                <div className="flex flex-wrap gap-2">
                  {contractor.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-[#e31c79] bg-opacity-10 text-[#e31c79] text-sm rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Projects */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-[#232020] mb-4">Current Projects</h2>
              <div className="space-y-3">
                {contractor.projects.map((project, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-[#e31c79]" />
                    <span className="text-[#232020]">{project}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {contractor.notes && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-[#232020] mb-4">Manager Notes</h2>
                <p className="text-[#465079]">{contractor.notes}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}


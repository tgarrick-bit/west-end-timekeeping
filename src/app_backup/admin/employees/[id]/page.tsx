'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ArrowLeft,
  Edit,
  Users,
  Building2,
  Calendar,
  Mail,
  Phone,
  DollarSign,
  Clock,
  TrendingUp
} from 'lucide-react'

interface Employee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  department: string
  employmentType: string
  hourlyRate: number
  status: string
  startDate: string
  assignedClients: string[]
  totalWeeklyHours: number
  utilization: number
}

export default function EmployeeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isLoading } = useAuth()
  const [employee, setEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    // Simulate fetching employee data
    if (params.id) {
      setEmployee({
        id: params.id as string,
        employeeId: 'emp1',
        firstName: 'Mike',
        lastName: 'Chen',
        email: 'mike.chen@westendworkforce.com',
        phone: '(555) 234-5678',
        role: 'Software Developer',
        department: 'Tech Infrastructure',
        employmentType: 'Full-time W2',
        hourlyRate: 95,
        status: 'active',
        startDate: 'January 15, 2024',
        assignedClients: ['ABC Corp (40h)', 'XYZ Tech (10h)'],
        totalWeeklyHours: 50,
        utilization: 95
      })
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Employee not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/admin/employees')}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#232020]">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="text-[#465079]">{employee.role} • {employee.department}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push(`/admin/employees/${employee.id}/edit`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#465079] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] transition-colors duration-200"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Employee
            </button>
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
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Employee Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#232020] flex items-center">
                <Users className="h-5 w-5 mr-2 text-[#e31c79]" />
                Employee Overview
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-md font-medium text-[#232020] mb-4">Personal Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Users className="h-4 w-4 text-[#465079]" />
                      <span className="text-sm text-[#465079]">Employee ID:</span>
                      <span className="text-sm font-medium text-[#232020]">{employee.employeeId}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-[#465079]" />
                      <span className="text-sm text-[#465079]">Email:</span>
                      <span className="text-sm font-medium text-[#232020]">{employee.email}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-[#465079]" />
                      <span className="text-sm text-[#465079]">Phone:</span>
                      <span className="text-sm font-medium text-[#232020]">{employee.phone}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-[#465079]" />
                      <span className="text-sm text-[#465079]">Start Date:</span>
                      <span className="text-sm font-medium text-[#232020]">{employee.startDate}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-md font-medium text-[#232020] mb-4">Professional Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-4 w-4 text-[#465079]" />
                      <span className="text-sm text-[#465079]">Department:</span>
                      <span className="text-sm font-medium text-[#232020]">{employee.department}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Users className="h-4 w-4 text-[#465079]" />
                      <span className="text-sm text-[#465079]">Employment Type:</span>
                      <span className="text-sm font-medium text-[#232020]">{employee.employmentType}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-4 w-4 text-[#465079]" />
                      <span className="text-sm text-[#465079]">Hourly Rate:</span>
                      <span className="text-sm font-medium text-[#232020]">${employee.hourlyRate}/hr</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-4 w-4 text-[#465079]" />
                      <span className="text-sm text-[#465079]">Status:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : employee.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Assignments */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#232020] flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-[#e31c79]" />
                Current Assignments
              </h2>
            </div>
            <div className="p-6">
              {employee.assignedClients.length > 0 ? (
                <div className="space-y-4">
                  {employee.assignedClients.map((client, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-[#232020]">{client}</h3>
                          <p className="text-sm text-[#465079]">Active assignment</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No current assignments</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This employee is not currently assigned to any clients.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#232020] flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-[#e31c79]" />
                Performance Metrics
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#e31c79]">{employee.totalWeeklyHours}h</div>
                  <div className="text-sm text-[#465079]">Weekly Hours</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#05202E]">{employee.utilization}%</div>
                  <div className="text-sm text-[#465079]">Utilization Rate</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#E5DDD8]">${(employee.hourlyRate * employee.totalWeeklyHours).toLocaleString()}</div>
                  <div className="text-sm text-[#465079]">Weekly Revenue</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}








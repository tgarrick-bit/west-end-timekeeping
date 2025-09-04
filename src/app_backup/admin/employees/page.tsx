'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Users, 
  UserPlus, 
  Settings, 
  BarChart3, 
  Search,
  Filter,
  ArrowLeft,
  Eye,
  Edit,
  UserCheck,
  TrendingUp,
  X,
  AlertCircle,
  Upload
} from 'lucide-react'

interface Employee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  role: string
  department: string
  hourlyRate: number
  status: 'active' | 'inactive' | 'terminated'
  startDate: string
  assignedClients: string[]
  totalWeeklyHours: number
  utilization: number
  timeApprover: string
}

interface EmployeeStats {
  totalEmployees: number
  assignedEmployees: number
  pendingAssignments: number
  averageUtilization: number
}

export default function EmployeeManagementPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats>({
    totalEmployees: 0,
    assignedEmployees: 0,
    pendingAssignments: 0,
    averageUtilization: 0
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    // Simulate fetching employee data
    setEmployeeStats({
      totalEmployees: 47,
      assignedEmployees: 43,
      pendingAssignments: 4,
      averageUtilization: 87
    })

          setEmployees([
        {
          id: '1',
          employeeId: 'emp1',
          firstName: 'Mike',
          lastName: 'Chen',
          email: 'mike.chen@westendworkforce.com',
          role: 'Software Developer',
          department: 'Tech Infrastructure',
          hourlyRate: 95,
          status: 'active',
          startDate: 'Jan 15, 2024',
          assignedClients: ['ABC Corp (40h)', 'XYZ Tech (10h)'],
          totalWeeklyHours: 50,
          utilization: 95,
          timeApprover: 'manager-demo'
        },
      {
        id: '2',
        employeeId: 'emp2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@westendworkforce.com',
        role: 'UI/UX Designer',
        department: 'Software Development',
        hourlyRate: 85,
        status: 'active',
        startDate: 'Feb 3, 2024',
        assignedClients: ['ABC Corp (30h)', 'StartupCo (15h)'],
        totalWeeklyHours: 45,
        utilization: 90,
        timeApprover: 'manager-demo'
      },
      {
        id: '3',
        employeeId: 'emp3',
        firstName: 'Tom',
        lastName: 'Wilson',
        email: 'tom.wilson@westendworkforce.com',
        role: 'DevOps Engineer',
        department: 'Tech Infrastructure',
        hourlyRate: 90,
        status: 'active',
        startDate: 'Mar 10, 2024',
        assignedClients: ['ABC Corp (35h)'],
        totalWeeklyHours: 35,
        utilization: 85,
        timeApprover: 'manager2-demo'
      },
      {
        id: '4',
        employeeId: 'emp4',
        firstName: 'Lisa',
        lastName: 'Garcia',
        email: 'lisa.garcia@westendworkforce.com',
        role: 'QA Engineer',
        department: 'Software Development',
        hourlyRate: 80,
        status: 'active',
        startDate: 'Apr 5, 2024',
        assignedClients: ['XYZ Tech (25h)', 'StartupCo (10h)'],
        totalWeeklyHours: 35,
        utilization: 80,
        timeApprover: 'manager3-demo'
      }
    ])
  }, [])

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

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || employee.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      case 'department':
        return a.department.localeCompare(b.department)
      case 'utilization':
        return b.utilization - a.utilization
      case 'startDate':
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      default:
        return 0
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Match Admin Dashboard exactly */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button 
              onClick={() => router.push('/admin')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#232020]">Employee Management</h1>
              <p className="text-[#465079]">Manage your workforce and client assignments</p>
            </div>
          </div>
                      <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/admin/employees/import')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Import Employees</span>
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
        {/* Stats Cards Row - Same 4-card layout as admin dashboard */}
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-[#232020] mb-6">Workforce Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Employees */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#e31c79]">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#465079]">Total Employees</p>
                    <p className="text-2xl font-semibold text-[#232020]">{employeeStats.totalEmployees}</p>
                    <p className="text-sm text-[#465079]">Active workforce</p>
                  </div>
                </div>
              </div>

              {/* Assigned Employees */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#05202E]">
                    <UserCheck className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#465079]">Assigned Employees</p>
                    <p className="text-2xl font-semibold text-[#232020]">{employeeStats.assignedEmployees}</p>
                    <p className="text-sm text-[#465079]">Currently assigned to clients</p>
                  </div>
                </div>
              </div>

              {/* Pending Assignments */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#E5DDD8]">
                    <AlertCircle className="h-6 w-6 text-[#05202E]" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#465079]">Pending Assignments</p>
                    <p className="text-2xl font-semibold text-[#232020]">{employeeStats.pendingAssignments}</p>
                    <p className="text-sm text-[#465079]">Awaiting client assignment</p>
                  </div>
                </div>
              </div>

              {/* Average Utilization */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-[#e31c79]">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#465079]">Average Utilization</p>
                    <p className="text-2xl font-semibold text-[#232020]">{employeeStats.averageUtilization}%</p>
                    <p className="text-sm text-[#465079]">Workforce utilization rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards Row - Same styling as admin dashboard */}
          <div>
            <h2 className="text-xl font-semibold text-[#232020] mb-6">Employee Operations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Add New Employee */}
              <div 
                className="bg-gradient-to-r from-[#e31c79] to-[#d4156a] rounded-lg shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-all duration-200"
                onClick={() => router.push('/admin/employees/new')}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-full">
                    <UserPlus className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Add New Employee</h3>
                    <p className="text-pink-100 mt-1">Add individual employees</p>
                  </div>
                </div>
              </div>

              {/* Bulk Operations */}
              <div 
                className="bg-gradient-to-r from-[#05202E] to-[#0a2f3f] rounded-lg shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-all duration-200"
                onClick={() => router.push('/admin/employees/bulk')}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-full">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Bulk Operations</h3>
                    <p className="text-blue-100 mt-1">Mass updates and assignments</p>
                  </div>
                </div>
              </div>

              {/* Import Employees */}
              <div 
                className="bg-gradient-to-r from-[#059669] to-[#047857] rounded-lg shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-all duration-200"
                onClick={() => router.push('/admin/employees/import')}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-full">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Import Employees</h3>
                    <p className="text-green-100 mt-1">Bulk import from Excel</p>
                  </div>
                </div>
              </div>

              {/* Employee Analytics */}
              <div 
                className="bg-gradient-to-r from-[#E5DDD8] to-[#d5c5c0] rounded-lg shadow-lg p-6 text-[#05202E] cursor-pointer hover:shadow-xl transition-all duration-200"
                onClick={() => router.push('/admin/employees/analytics')}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-[#05202E] bg-opacity-20 rounded-full">
                    <BarChart3 className="h-8 w-8 text-[#05202E]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Employee Analytics</h3>
                    <p className="text-[#05202E] mt-1">Performance and utilization reports</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Employee List Section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#232020] mb-4 sm:mb-0">Employee Directory</h2>
              
              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent w-full sm:w-64"
                  />
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                  >
                    <option value="all">All Employees</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="terminated">Terminated</option>
                  </select>
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                  >
                    <option value="name">Sort: Name</option>
                    <option value="department">Sort: Department</option>
                    <option value="utilization">Sort: Utilization</option>
                    <option value="startDate">Sort: Start Date</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Employee Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sortedEmployees.map((employee) => (
                <div key={employee.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-[#e31c79] rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {employee.firstName[0]}{employee.lastName[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#232020]">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        <p className="text-sm text-[#465079]">Employee ID: {employee.employeeId}</p>
                      </div>
                    </div>
                    <div className="text-right">
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

                  <div className="space-y-3 mb-4">
                    <p className="text-sm text-[#465079]">
                      <span className="font-medium">{employee.role}</span> • {employee.department}
                    </p>
                    <p className="text-sm text-[#465079]">
                      Time Approver: {employee.timeApprover === 'manager-demo' ? 'Jane Doe' : 
                                    employee.timeApprover === 'manager2-demo' ? 'Tom Wilson' : 
                                    employee.timeApprover === 'manager3-demo' ? 'Lisa Chen' : 'Not Assigned'}
                    </p>
                    <p className="text-sm text-[#465079]">
                      Assigned Clients: {employee.assignedClients.join(', ')}
                    </p>
                    <p className="text-sm text-[#465079]">
                      Hourly Rate: ${employee.hourlyRate} • Total Weekly Hours: {employee.totalWeeklyHours}h
                    </p>
                    <p className="text-sm text-[#465079]">
                      Status: {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)} • 
                      Utilization: {employee.utilization}% • 
                      Start Date: {employee.startDate}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push(`/admin/employees/${employee.id}`)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#e31c79] hover:bg-[#d4156a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] transition-colors duration-200"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </button>
                    <button
                      onClick={() => router.push(`/admin/employees/${employee.id}/edit`)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#465079] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] transition-colors duration-200"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => alert('Assign Client functionality coming soon')}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#465079] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] transition-colors duration-200"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Assign Client
                    </button>
                    <button
                      onClick={() => alert('Reports functionality coming soon')}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#465079] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] transition-colors duration-200"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Reports
                    </button>
                    <button
                      onClick={() => alert('Deactivate functionality coming soon')}
                      className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Deactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {sortedEmployees.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by adding your first employee.'
                  }
                </p>
                {!searchTerm && filterStatus === 'all' && (
                  <div className="mt-6">
                    <button
                      onClick={() => router.push('/admin/employees/new')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#e31c79] hover:bg-[#d4156a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] transition-colors duration-200"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Employee
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}








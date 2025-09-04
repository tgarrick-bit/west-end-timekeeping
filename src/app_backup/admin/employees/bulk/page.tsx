'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ArrowLeft,
  Users,
  Download,
  Upload,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Building2,
  DollarSign,
  Calendar,
  Filter
} from 'lucide-react'

interface BulkOperation {
  id: string
  type: 'rate_update' | 'client_assignment' | 'status_change' | 'department_update'
  description: string
  affectedEmployees: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  createdAt: string
}

interface EmployeeSelection {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  department: string
  currentRate: number
  selected: boolean
}

export default function BulkOperationsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [selectedOperation, setSelectedOperation] = useState<string>('')
  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeSelection[]>([])
  const [bulkOperations, setBulkOperations] = useState<BulkOperation[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Initialize employee data when component mounts
  useEffect(() => {
    if (user && user.role === 'admin') {
      setSelectedEmployees([
        {
          id: '1',
          employeeId: 'emp1',
          firstName: 'Mike',
          lastName: 'Chen',
          department: 'Tech Infrastructure',
          currentRate: 95,
          selected: false
        },
        {
          id: '2',
          employeeId: 'emp2',
          firstName: 'Sarah',
          lastName: 'Johnson',
          department: 'Software Development',
          currentRate: 85,
          selected: false
        },
        {
          id: '3',
          employeeId: 'emp3',
          firstName: 'Tom',
          lastName: 'Wilson',
          department: 'Tech Infrastructure',
          currentRate: 90,
          selected: false
        },
        {
          id: '4',
          employeeId: 'emp4',
          firstName: 'Lisa',
          lastName: 'Garcia',
          department: 'Software Development',
          currentRate: 80,
          selected: false
        }
      ])

      setBulkOperations([
        {
          id: '1',
          type: 'rate_update',
          description: 'Annual rate increase for Tech Infrastructure team',
          affectedEmployees: 12,
          status: 'completed',
          createdAt: '2025-01-15'
        },
        {
          id: '2',
          type: 'client_assignment',
          description: 'Assign 8 employees to new ABC Corp project',
          affectedEmployees: 8,
          status: 'in_progress',
          createdAt: '2025-01-18'
        }
      ])
    }
  }, [user])

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

  const handleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, selected: !emp.selected }
          : emp
      )
    )
  }

  const handleSelectAll = () => {
    const allSelected = selectedEmployees.every(emp => emp.selected)
    setSelectedEmployees(prev => 
      prev.map(emp => ({ ...emp, selected: !allSelected }))
    )
  }

  const getSelectedCount = () => selectedEmployees.filter(emp => emp.selected).length

  const handleBulkOperation = async () => {
    if (getSelectedCount() === 0) {
      alert('Please select at least one employee')
      return
    }

    if (!selectedOperation) {
      alert('Please select an operation type')
      return
    }

    setIsProcessing(true)
    
    try {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const newOperation: BulkOperation = {
        id: Date.now().toString(),
        type: selectedOperation as any,
        description: `Bulk ${selectedOperation} for ${getSelectedCount()} employees`,
        affectedEmployees: getSelectedCount(),
        status: 'completed',
        createdAt: new Date().toISOString().split('T')[0]
      }
      
      setBulkOperations(prev => [newOperation, ...prev])
      alert(`Bulk operation completed successfully for ${getSelectedCount()} employees`)
      
      // Reset selections
      setSelectedEmployees(prev => prev.map(emp => ({ ...emp, selected: false })))
      setSelectedOperation('')
    } catch (error) {
      alert('Error processing bulk operation. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'rate_update': return <DollarSign className="h-5 w-5" />
      case 'client_assignment': return <Building2 className="h-5 w-5" />
      case 'status_change': return <Users className="h-5 w-5" />
      case 'department_update': return <Filter className="h-5 w-5" />
      default: return <Users className="h-5 w-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
              <h1 className="text-2xl font-bold text-[#232020]">Bulk Operations</h1>
              <p className="text-[#465079]">Mass updates and assignments for multiple employees</p>
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
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Bulk Operation Setup */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#232020] flex items-center">
                <Users className="h-5 w-5 mr-2 text-[#e31c79]" />
                Bulk Operation Setup
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Operation Type Selection */}
              <div>
                <label className="block text-sm font-medium text-[#465079] mb-3">
                  Select Operation Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { value: 'rate_update', label: 'Rate Update', description: 'Update hourly rates' },
                    { value: 'client_assignment', label: 'Client Assignment', description: 'Assign to clients' },
                    { value: 'status_change', label: 'Status Change', description: 'Change employment status' },
                    { value: 'department_update', label: 'Department Update', description: 'Move to new department' }
                  ].map((operation) => (
                    <div
                      key={operation.value}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedOperation === operation.value
                          ? 'border-[#e31c79] bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedOperation(operation.value)}
                    >
                      <h3 className="font-medium text-[#232020]">{operation.label}</h3>
                      <p className="text-sm text-[#465079] mt-1">{operation.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-[#465079]">
                    Select Employees ({getSelectedCount()} selected)
                  </label>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-[#e31c79] hover:text-[#d4156a] font-medium"
                  >
                    {selectedEmployees.every(emp => emp.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-[#465079]">
                      <div className="col-span-1">Select</div>
                      <div className="col-span-2">Employee ID</div>
                      <div className="col-span-3">Name</div>
                      <div className="col-span-3">Department</div>
                      <div className="col-span-3">Current Rate</div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {selectedEmployees.map((employee) => (
                      <div key={employee.id} className="px-4 py-3 hover:bg-gray-50">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-1">
                            <input
                              type="checkbox"
                              checked={employee.selected}
                              onChange={() => handleEmployeeSelection(employee.id)}
                              className="h-4 w-4 text-[#e31c79] focus:ring-[#e31c79] border-gray-300 rounded"
                            />
                          </div>
                          <div className="col-span-2 text-sm font-medium text-[#232020]">
                            {employee.employeeId}
                          </div>
                          <div className="col-span-3 text-sm text-[#232020]">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="col-span-3 text-sm text-[#465079]">
                            {employee.department}
                          </div>
                          <div className="col-span-3 text-sm text-[#465079]">
                            ${employee.currentRate}/hr
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.push('/admin/employees')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-[#465079] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] transition-colors duration-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleBulkOperation}
                  disabled={getSelectedCount() === 0 || !selectedOperation || isProcessing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#e31c79] hover:bg-[#d4156a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e31c79] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Execute Operation'}
                </button>
              </div>
            </div>
          </div>

          {/* Recent Bulk Operations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#232020] flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-[#e31c79]" />
                Recent Bulk Operations
              </h2>
            </div>

            <div className="p-6">
              {bulkOperations.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No bulk operations yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Execute your first bulk operation above to see it here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bulkOperations.map((operation) => (
                    <div key={operation.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-[#e31c79] rounded-full">
                          {getOperationIcon(operation.type)}
                        </div>
                        <div>
                          <h3 className="font-medium text-[#232020]">{operation.description}</h3>
                          <p className="text-sm text-[#465079]">
                            {operation.affectedEmployees} employees • {operation.createdAt}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(operation.status)}`}>
                        {operation.status.replace('_', ' ').charAt(0).toUpperCase() + operation.status.slice(1).replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Bulk Operations Best Practices</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Always review selected employees before executing operations</li>
                    <li>Use bulk operations for consistent changes across similar employee groups</li>
                    <li>Consider the impact on payroll, billing, and client assignments</li>
                    <li>Test operations on a small group before applying to larger sets</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}








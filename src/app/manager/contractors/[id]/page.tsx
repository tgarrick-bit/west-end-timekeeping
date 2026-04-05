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
  const { user } = useAuth()
  const [contractor, setContractor] = useState<ContractorDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin" width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="8" stroke="rgba(227, 28, 121, 0.15)" strokeWidth="2" />
            <path d="M19 11a8 8 0 00-8-8" stroke="#e31c79" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-[13px]" style={{ color: '#bbb' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!contractor) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-gray-600">Contractor not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 bg-[#e31c79] text-white px-4 py-2 rounded-lg hover:bg-[#c91865] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
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
                    className="bg-[#e31c79] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#c91865] transition-colors flex items-center space-x-2"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </button>
                  {contractor.phone && (
                    <button
                      onClick={() => handleContact('phone')}
                      className="bg-[#1a1a1a] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors flex items-center space-x-2"
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
                  className="bg-[#e31c79] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#c91865] transition-colors flex items-center justify-center space-x-2"
                >
                  <Clock className="h-5 w-5" />
                  <span>Review Timesheets</span>
                </button>
                <button
                  onClick={handleViewExpenses}
                  className="bg-[#1a1a1a] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors flex items-center justify-center space-x-2"
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
    </>
  )
}


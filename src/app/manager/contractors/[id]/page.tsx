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

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-[#FAFAF8] text-[#777] border-[#e8e4df]',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  const cls = colors[status] || 'bg-[#FAFAF8] text-[#777] border-[#e8e4df]'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 border font-medium ${cls}`}
      style={{ fontSize: 9, borderRadius: 3 }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
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
          <p style={{ fontSize: 13, color: '#999' }}>Contractor not found</p>
          <button
            onClick={() => router.back()}
            style={{
              marginTop: 16,
              background: '#e31c79',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 20px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1,
    color: '#c0bab2',
    textTransform: 'uppercase',
    marginBottom: 16,
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '0.5px solid #e8e4df',
    borderRadius: 10,
    padding: 24,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: '#999',
  }

  const valueStyle: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 400,
    color: '#555',
    marginTop: 2,
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Back link */}
      <button
        onClick={() => router.back()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          color: '#e31c79',
          fontSize: 12,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 24,
        }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Contractors
      </button>

      {/* Header card */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(227,28,121,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User className="w-6 h-6" style={{ color: '#e31c79' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
              {contractor.name}
            </h1>
            <p style={{ fontSize: 13, fontWeight: 400, color: '#bbb', marginTop: 2 }}>
              {contractor.role}
            </p>
            <p style={{ fontSize: 11, color: '#ccc', marginTop: 2 }}>
              ID: {contractor.employeeId}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleContact('email')}
              style={{
                background: '#e31c79',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </button>
            {contractor.phone && (
              <button
                onClick={() => handleContact('phone')}
                style={{
                  background: 'white',
                  color: '#777',
                  border: '0.5px solid #e0dcd7',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Hourly Rate', value: `$${contractor.hourlyRate}/hr` },
          { label: 'Total Hours', value: `${contractor.totalHours} hrs` },
          { label: 'Total Amount', value: `$${contractor.totalAmount.toLocaleString()}` },
          { label: 'Projects', value: `${contractor.projects.length}` },
        ].map((stat) => (
          <div key={stat.label} style={cardStyle}>
            <p style={labelStyle}>{stat.label}</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', marginTop: 4 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <h2 style={sectionHeaderStyle}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            onClick={handleViewTimesheets}
            style={{
              background: '#e31c79',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '12px 20px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Clock className="h-4 w-4" />
            Review Timesheets
          </button>
          <button
            onClick={handleViewExpenses}
            style={{
              background: 'white',
              color: '#777',
              border: '0.5px solid #e0dcd7',
              borderRadius: 6,
              padding: '12px 20px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <DollarSign className="h-4 w-4" />
            Review Expenses
          </button>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Personal Info */}
        <div style={cardStyle}>
          <h2 style={sectionHeaderStyle}>Personal Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <span style={labelStyle}>Email</span>
              <p style={valueStyle}>{contractor.email}</p>
            </div>
            {contractor.phone && (
              <div>
                <span style={labelStyle}>Phone</span>
                <p style={valueStyle}>{contractor.phone}</p>
              </div>
            )}
            <div>
              <span style={labelStyle}>Start Date</span>
              <p style={valueStyle}>{new Date(contractor.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <span style={labelStyle}>Last Active</span>
              <p style={valueStyle}>{new Date(contractor.lastActive).toLocaleDateString()}</p>
            </div>
            <div>
              <span style={labelStyle}>Status</span>
              <div style={{ marginTop: 4 }}>
                <StatusBadge status={contractor.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div style={cardStyle}>
          <h2 style={sectionHeaderStyle}>Skills & Expertise</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {contractor.skills.map((skill, index) => (
              <span
                key={index}
                style={{
                  padding: '4px 12px',
                  background: 'rgba(227,28,121,0.06)',
                  color: '#e31c79',
                  fontSize: 11,
                  borderRadius: 3,
                  fontWeight: 500,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Projects */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <h2 style={sectionHeaderStyle}>Current Projects</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contractor.projects.map((project, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: '#FDFCFB',
                borderRadius: 7,
                border: '0.5px solid #f5f2ee',
              }}
            >
              <Building2 className="w-4 h-4" style={{ color: '#ccc' }} />
              <span style={{ fontSize: 12.5, color: '#555' }}>{project}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {contractor.notes && (
        <div style={cardStyle}>
          <h2 style={sectionHeaderStyle}>Manager Notes</h2>
          <p style={{ fontSize: 12.5, color: '#555', lineHeight: 1.6 }}>
            {contractor.notes}
          </p>
        </div>
      )}
    </div>
  )
}

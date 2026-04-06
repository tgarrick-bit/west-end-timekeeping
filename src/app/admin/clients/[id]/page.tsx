'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, Edit, Trash2, GitBranch, ExternalLink } from 'lucide-react'
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton'

interface Client {
  id: string
  name: string
  code: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  bill_rate?: number
  contract_start?: string
  contract_end?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface Department {
  id: string
  client_id: string
  name: string
  code: string | null
  is_active: boolean
}

interface Project {
  id: string
  name: string
  code?: string
  status?: string
  is_active: boolean
  department_id?: string
  department_name?: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  department_id?: string
  department_name?: string
  manager_id?: string
  manager_name?: string
  is_active: boolean
}

type TabType = 'overview' | 'departments' | 'projects' | 'employees' | 'billing'

const TAB_ORDER: TabType[] = ['overview', 'departments', 'projects', 'employees', 'billing']

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
]

// Shared styles
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '0.5px solid #e8e4df',
  borderRadius: 7,
  fontSize: 12,
  color: '#1a1a1a',
  outline: 'none',
  background: '#fff',
  marginTop: 4,
}

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: '#c0bab2',
}

const focusHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = '#d3ad6b'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)'
}
const blurHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = '#e8e4df'
  e.currentTarget.style.boxShadow = 'none'
}

const thStyle: React.CSSProperties = {
  padding: '11px 20px',
  textAlign: 'left',
  fontSize: 9,
  fontWeight: 500,
  letterSpacing: 1.2,
  color: '#c0bab2',
  textTransform: 'uppercase',
  borderBottom: '0.5px solid #f0ece7',
  background: 'transparent',
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params?.id as string
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Client>>({
    is_active: true,
    state: 'OK',
    bill_rate: 150,
    contract_start: new Date().toISOString().split('T')[0],
  })

  // Departments tab
  const [departments, setDepartments] = useState<Department[]>([])
  const [deptLoading, setDeptLoading] = useState(false)
  const [deptFormName, setDeptFormName] = useState('')
  const [deptFormCode, setDeptFormCode] = useState('')
  const [editingDept, setEditingDept] = useState<Department | null>(null)

  // Projects tab
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)

  // Employees tab
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)

  // Billing tab
  const [billingData, setBillingData] = useState({
    totalHours: 0,
    totalRevenue: 0,
    activeProjectsCount: 0,
    employeeCount: 0,
  })
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingStart, setBillingStart] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [billingEnd, setBillingEnd] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    const init = async () => {
      try {
        if (clientId && clientId !== 'new') {
          await loadClient()
        }
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  // Load tab data when tab changes
  useEffect(() => {
    if (!clientId || clientId === 'new') return
    if (activeTab === 'departments') loadDepartments()
    if (activeTab === 'projects') loadProjects()
    if (activeTab === 'employees') loadEmployees()
    if (activeTab === 'billing') loadBilling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, clientId])

  const loadClient = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (error) throw error

      setClient(data as Client)
      setFormData((prev) => ({ ...prev, ...(data as Client) }))
    } catch (err) {
      console.error('Error loading client:', err)
    }
  }

  const loadDepartments = async () => {
    setDeptLoading(true)
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('client_id', clientId)
      .order('name')
    if (!error && data) setDepartments(data)
    setDeptLoading(false)
  }

  const loadProjects = async () => {
    setProjectsLoading(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, code, status, is_active, department_id')
        .eq('client_id', clientId)
        .order('name')

      if (error) throw error

      // Fetch department names for those that have department_id
      const deptIds = (data || []).filter(p => p.department_id).map(p => p.department_id!)
      let deptMap: Record<string, string> = {}
      if (deptIds.length > 0) {
        const { data: depts } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', deptIds)
        if (depts) {
          deptMap = depts.reduce((acc: Record<string, string>, d: any) => {
            acc[d.id] = d.name
            return acc
          }, {})
        }
      }

      setProjects((data || []).map(p => ({
        ...p,
        department_name: p.department_id ? deptMap[p.department_id] || '' : '',
      })))
    } catch (err) {
      console.error('Error loading projects:', err)
    } finally {
      setProjectsLoading(false)
    }
  }

  const loadEmployees = async () => {
    setEmployeesLoading(true)
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, role, department_id, manager_id, is_active')
        .eq('client_id', clientId)
        .order('last_name')

      if (error) throw error

      // Fetch department names
      const deptIds = (data || []).filter(e => e.department_id).map(e => e.department_id!)
      let deptMap: Record<string, string> = {}
      if (deptIds.length > 0) {
        const { data: depts } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', [...new Set(deptIds)])
        if (depts) {
          deptMap = depts.reduce((acc: Record<string, string>, d: any) => {
            acc[d.id] = d.name
            return acc
          }, {})
        }
      }

      // Fetch manager names
      const mgrIds = (data || []).filter(e => e.manager_id).map(e => e.manager_id!)
      let mgrMap: Record<string, string> = {}
      if (mgrIds.length > 0) {
        const { data: mgrs } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .in('id', [...new Set(mgrIds)])
        if (mgrs) {
          mgrMap = mgrs.reduce((acc: Record<string, string>, m: any) => {
            acc[m.id] = `${m.first_name} ${m.last_name}`
            return acc
          }, {})
        }
      }

      setEmployees((data || []).map(e => ({
        ...e,
        department_name: e.department_id ? deptMap[e.department_id] || '' : '',
        manager_name: e.manager_id ? mgrMap[e.manager_id] || '' : '',
      })))
    } catch (err) {
      console.error('Error loading employees:', err)
    } finally {
      setEmployeesLoading(false)
    }
  }

  const loadBilling = async () => {
    setBillingLoading(true)
    try {
      // Active projects count
      const { count: activeProjectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_active', true)

      // Employee count
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_active', true)

      // Time entries for date range - get project IDs first
      const { data: clientProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', clientId)

      let totalMinutes = 0
      if (clientProjects && clientProjects.length > 0) {
        const projectIds = clientProjects.map(p => p.id)
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('minutes')
          .in('project_id', projectIds)
          .gte('date', billingStart)
          .lte('date', billingEnd)

        if (timeEntries) {
          totalMinutes = timeEntries.reduce((sum, te) => sum + (te.minutes || 0), 0)
        }
      }

      const totalHours = totalMinutes / 60
      const billRate = formData.bill_rate || 0

      setBillingData({
        totalHours: Math.round(totalHours * 100) / 100,
        totalRevenue: Math.round(totalHours * billRate * 100) / 100,
        activeProjectsCount: activeProjectsCount || 0,
        employeeCount: employeeCount || 0,
      })
    } catch (err) {
      console.error('Error loading billing data:', err)
    } finally {
      setBillingLoading(false)
    }
  }

  // Department CRUD
  const handleAddDept = async () => {
    if (!clientId || clientId === 'new') {
      alert('Please save the client before adding departments.')
      return
    }
    if (!deptFormName.trim()) return

    const { error } = await supabase.from('departments').insert([{
      client_id: clientId,
      name: deptFormName.trim(),
      code: deptFormCode.trim() || null,
      is_active: true,
    }])
    if (error) {
      alert(error.message.includes('unique')
        ? 'A department with this name already exists for this client.'
        : `Error: ${error.message}`)
      return
    }
    setDeptFormName('')
    setDeptFormCode('')
    await loadDepartments()
  }

  const handleUpdateDept = async () => {
    if (!editingDept || !deptFormName.trim()) return
    const { error } = await supabase
      .from('departments')
      .update({ name: deptFormName.trim(), code: deptFormCode.trim() || null })
      .eq('id', editingDept.id)
    if (error) {
      alert(`Error: ${error.message}`)
      return
    }
    setEditingDept(null)
    setDeptFormName('')
    setDeptFormCode('')
    await loadDepartments()
  }

  const handleToggleDeptActive = async (dept: Department) => {
    const { error } = await supabase
      .from('departments')
      .update({ is_active: !dept.is_active })
      .eq('id', dept.id)
    if (error) {
      alert(`Error: ${error.message}`)
      return
    }
    await loadDepartments()
  }

  const handleDeleteDept = async (dept: Department) => {
    if (!confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('departments').delete().eq('id', dept.id)
    if (error) {
      alert(error.message.includes('violates foreign key')
        ? 'Cannot delete -- employees or projects are still assigned to this department. Deactivate it instead.'
        : `Error: ${error.message}`)
      return
    }
    await loadDepartments()
  }

  const startEditDept = (dept: Department) => {
    setEditingDept(dept)
    setDeptFormName(dept.name)
    setDeptFormCode(dept.code || '')
  }

  const cancelEditDept = () => {
    setEditingDept(null)
    setDeptFormName('')
    setDeptFormCode('')
  }

  // Save client
  const saveClient = async () => {
    if (!formData.name || !formData.name.trim()) {
      alert('Please enter a client name.')
      return null
    }
    if (!formData.code || !formData.code.trim()) {
      alert('Please enter a client code.')
      return null
    }

    const payload = {
      name: (formData.name || '').trim(),
      code: (formData.code || '').trim(),
      contact_name: formData.contact_name?.trim() || null,
      contact_email: formData.contact_email?.trim() || null,
      contact_phone: formData.contact_phone?.trim() || null,
      address: formData.address?.trim() || null,
      city: formData.city?.trim() || null,
      state: formData.state || null,
      zip: formData.zip?.trim() || null,
      bill_rate: formData.bill_rate != null && !isNaN(Number(formData.bill_rate)) ? Number(formData.bill_rate) : null,
      contract_start: formData.contract_start || null,
      contract_end: formData.contract_end || null,
      is_active: formData.is_active ?? true,
    }

    setSaving(true)
    try {
      if (clientId === 'new') {
        const { data, error } = await supabase
          .from('clients')
          .insert([payload])
          .select()
          .single()

        if (error) throw error

        const created = data as Client
        setClient(created)
        setFormData((prev) => ({ ...prev, ...created }))
        alert('Client created successfully!')
        return created.id as string
      } else {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', clientId)

        if (error) throw error

        alert('Client saved successfully!')
        return clientId
      }
    } catch (err: any) {
      console.error('Error saving client:', err)
      alert(`Error saving client: ${err.message || 'Unknown error'}`)
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    const id = await saveClient()
    if (clientId === 'new' && id && id !== 'new') {
      router.replace(`/admin/clients/${id}`)
    }
  }

  const handleSaveAndExit = async () => {
    const id = await saveClient()
    if (id) router.push('/admin/clients')
  }

  const nextTabFor = (tab: TabType): TabType | null => {
    const idx = TAB_ORDER.indexOf(tab)
    if (idx === -1 || idx === TAB_ORDER.length - 1) return null
    return TAB_ORDER[idx + 1]
  }

  const handleSaveAndNext = async () => {
    const id = await saveClient()
    if (!id) return
    if (clientId === 'new' && id !== 'new') {
      router.replace(`/admin/clients/${id}`)
    }
    const next = nextTabFor(activeTab)
    if (next) setActiveTab(next)
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview' },
    { id: 'departments' as TabType, label: 'Departments' },
    { id: 'projects' as TabType, label: 'Projects' },
    { id: 'employees' as TabType, label: 'Employees' },
    { id: 'billing' as TabType, label: 'Billing' },
  ]

  const tabLabelMap = tabs.reduce<Record<TabType, string>>((acc, t) => {
    acc[t.id] = t.label
    return acc
  }, {} as Record<TabType, string>)

  if (loading) {
    return (
      <div style={{ padding: '36px 40px' }} className="space-y-6">
        <div>
          <div className="anim-shimmer" style={{ width: 200, height: 24, borderRadius: 4, marginBottom: 8 }} />
          <div className="anim-shimmer" style={{ width: 340, height: 14, borderRadius: 4 }} />
        </div>
        <SkeletonStats count={3} />
        <SkeletonList rows={4} />
      </div>
    )
  }

  const isActive = formData.is_active ?? true
  const pageName = clientId === 'new' ? 'New Client' : formData.name || 'Client'
  const hasSummary = !!client && clientId !== 'new'
  const nextTab = nextTabFor(activeTab)
  const nextTabLabel = nextTab ? tabLabelMap[nextTab] : null

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page Title */}
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div>
          <div className="flex items-center gap-1" style={{ fontSize: 11, color: '#c0bab2', marginBottom: 4 }}>
            <button
              onClick={() => router.push('/admin/clients')}
              style={{ color: '#c0bab2', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#e31c79' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#c0bab2' }}
            >
              <ArrowLeft style={{ width: 12, height: 12, display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Clients
            </button>
            <span>/</span>
            <span style={{ color: '#999' }}>{pageName}</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3, margin: 0 }}>
            {pageName}
          </h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>
            Configure client details, departments, and view assignments.
          </p>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 9,
            fontWeight: 500,
            padding: '2px 10px',
            borderRadius: 3,
            background: isActive ? '#f0faf5' : '#f7f6f4',
            color: isActive ? '#2d9b6e' : '#999',
            border: `0.5px solid ${isActive ? '#d1eee0' : '#e8e4df'}`,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? '#2d9b6e' : '#ccc' }} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1" style={{ marginBottom: 24, borderBottom: '0.5px solid #f0ece7' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#e31c79' : '#999',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #e31c79' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              marginBottom: -1,
            }}
            onMouseEnter={e => {
              if (activeTab !== tab.id) e.currentTarget.style.color = '#777'
            }}
            onMouseLeave={e => {
              if (activeTab !== tab.id) e.currentTarget.style.color = '#999'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary card once client exists */}
      {hasSummary && (
        <div
          className="anim-slide-up stagger-1"
          style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', marginBottom: 14 }}>
            Client Summary
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Code', value: formData.code || 'Not set' },
              { label: 'Status', value: isActive ? 'Active' : 'Inactive' },
              { label: 'Contract', value: `${formData.contract_start || 'Not set'} \u2192 ${formData.contract_end || 'Ongoing'}` },
              { label: 'Contact', value: formData.contact_name || 'Not set' },
              { label: 'Bill Rate', value: formData.bill_rate ? `$${formData.bill_rate}/hr` : 'Not set' },
              { label: 'Location', value: formData.city && formData.state ? `${formData.city}, ${formData.state}` : 'Not set' },
            ].map(item => (
              <div key={item.label}>
                <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: 0 }}>
                  {item.label}
                </p>
                <p style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a', marginTop: 4 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div
          className="anim-slide-up stagger-2"
          style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '24px' }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 20 }}>
            Client details
          </div>
          <div className="space-y-6">
            {/* Name and code */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label style={labelStyle}>Client name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
              <div>
                <label style={labelStyle}>Client code *</label>
                <input
                  type="text"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. CHK001"
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
            </div>

            {/* Contact info */}
            <div style={{ borderTop: '0.5px solid #f0ece7', paddingTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 16 }}>
                Contact information
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label style={labelStyle}>Contact name</label>
                  <input
                    type="text"
                    value={formData.contact_name || ''}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    style={inputStyle}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Contact email</label>
                  <input
                    type="email"
                    value={formData.contact_email || ''}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    style={inputStyle}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Contact phone</label>
                  <input
                    type="tel"
                    value={formData.contact_phone || ''}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    style={inputStyle}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div style={{ borderTop: '0.5px solid #f0ece7', paddingTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 16 }}>
                Address
              </div>
              <div className="space-y-4">
                <div>
                  <label style={labelStyle}>Street address</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={inputStyle}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  />
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label style={labelStyle}>City</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      style={inputStyle}
                      onFocus={focusHandler}
                      onBlur={blurHandler}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>State</label>
                    <select
                      value={formData.state || 'OK'}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      style={inputStyle}
                      onFocus={focusHandler}
                      onBlur={blurHandler}
                    >
                      {US_STATES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>ZIP code</label>
                    <input
                      type="text"
                      value={formData.zip || ''}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      style={inputStyle}
                      onFocus={focusHandler}
                      onBlur={blurHandler}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Billing and contract */}
            <div style={{ borderTop: '0.5px solid #f0ece7', paddingTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 16 }}>
                Billing & contract
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label style={labelStyle}>Bill rate ($/hr)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.bill_rate ?? ''}
                    onChange={(e) => setFormData({ ...formData, bill_rate: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="0.00"
                    style={inputStyle}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Contract start</label>
                  <input
                    type="date"
                    value={formData.contract_start || ''}
                    onChange={(e) => setFormData({ ...formData, contract_start: e.target.value })}
                    style={inputStyle}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Contract end</label>
                  <input
                    type="date"
                    value={formData.contract_end || ''}
                    onChange={(e) => setFormData({ ...formData, contract_end: e.target.value })}
                    style={inputStyle}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div style={{ borderTop: '0.5px solid #f0ece7', paddingTop: 24 }}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label style={labelStyle}>Client status</label>
                  <div className="flex gap-3" style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: true })}
                      style={{
                        padding: '6px 16px',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 7,
                        border: `0.5px solid ${isActive ? '#d1eee0' : '#e8e4df'}`,
                        background: isActive ? '#f0faf5' : '#fff',
                        color: isActive ? '#2d9b6e' : '#777',
                        cursor: 'pointer',
                      }}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: false })}
                      style={{
                        padding: '6px 16px',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 7,
                        border: `0.5px solid ${!isActive ? '#e8b4b4' : '#e8e4df'}`,
                        background: !isActive ? '#fef8f8' : '#fff',
                        color: !isActive ? '#b91c1c' : '#777',
                        cursor: 'pointer',
                      }}
                    >
                      Inactive
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENTS TAB */}
      {activeTab === 'departments' && (
        <div className="anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 0, overflow: 'hidden' }}>
          {/* Add / Edit form */}
          <div style={{ padding: '16px 24px', borderBottom: '0.5px solid #f0ece7', background: '#FDFCFB' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>
              {editingDept ? 'Edit department' : 'Add department'}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label style={{ ...labelStyle, display: 'block', marginBottom: 4 }}>
                  Department Name {!editingDept && <span style={{ color: '#e31c79' }}>*</span>}
                </label>
                <input
                  type="text"
                  value={deptFormName}
                  onChange={(e) => setDeptFormName(e.target.value)}
                  placeholder="e.g. Department of Commerce"
                  style={{ width: '100%', fontSize: 12, padding: '7px 10px', border: '0.5px solid #e8e4df', borderRadius: 6, outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#d3ad6b' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e8e4df' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, display: 'block', marginBottom: 4 }}>
                  Code
                </label>
                <input
                  type="text"
                  value={deptFormCode}
                  onChange={(e) => setDeptFormCode(e.target.value)}
                  placeholder="e.g. DOC"
                  style={{ width: '100%', fontSize: 12, padding: '7px 10px', border: '0.5px solid #e8e4df', borderRadius: 6, outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#d3ad6b' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e8e4df' }}
                />
              </div>
              {editingDept ? (
                <>
                  <button
                    onClick={handleUpdateDept}
                    disabled={!deptFormName.trim()}
                    style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: '#e31c79', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap', opacity: deptFormName.trim() ? 1 : 0.5 }}
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEditDept}
                    style={{ fontSize: 11, color: '#999', background: 'none', border: '0.5px solid #e8e4df', borderRadius: 6, padding: '7px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleAddDept}
                  disabled={!deptFormName.trim()}
                  style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: '#e31c79', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap', opacity: deptFormName.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus style={{ width: 12, height: 12 }} />
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Department list */}
          <div style={{ padding: 0 }}>
            {deptLoading ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 12, color: '#999' }}>Loading...</div>
            ) : departments.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <GitBranch style={{ width: 20, height: 20, color: '#d0cbc4', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: '#999', margin: 0 }}>No departments yet</p>
                <p style={{ fontSize: 11, color: '#ccc', marginTop: 4 }}>Add departments above to organize employees and projects.</p>
              </div>
            ) : (
              departments.map((dept) => (
                <div
                  key={dept.id}
                  style={{
                    padding: '12px 24px',
                    borderBottom: '0.5px solid #f5f2ee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: dept.is_active ? 1 : 0.5,
                  }}
                >
                  <div>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>{dept.name}</span>
                    {dept.code && (
                      <span style={{ fontSize: 10.5, color: '#c0bab2', marginLeft: 8 }}>{dept.code}</span>
                    )}
                    {!dept.is_active && (
                      <span style={{ fontSize: 9, color: '#b91c1c', marginLeft: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditDept(dept)}
                      style={{ background: 'none', border: '0.5px solid #e0dcd7', borderRadius: 4, padding: '3px 5px', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#d3ad6b' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0dcd7' }}
                      title="Edit"
                    >
                      <Edit style={{ width: 11, height: 11, color: '#777' }} />
                    </button>
                    <button
                      onClick={() => handleToggleDeptActive(dept)}
                      style={{ background: 'none', border: '0.5px solid #e0dcd7', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', fontSize: 10, color: '#777' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = dept.is_active ? '#b91c1c' : '#2d9b6e'; e.currentTarget.style.color = dept.is_active ? '#b91c1c' : '#2d9b6e' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0dcd7'; e.currentTarget.style.color = '#777' }}
                      title={dept.is_active ? 'Deactivate' : 'Reactivate'}
                    >
                      {dept.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteDept(dept)}
                      style={{ background: 'none', border: '0.5px solid #e0dcd7', borderRadius: 4, padding: '3px 5px', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#b91c1c' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0dcd7' }}
                      title="Delete"
                    >
                      <Trash2 style={{ width: 11, height: 11, color: '#777' }} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PROJECTS TAB */}
      {activeTab === 'projects' && (
        <div className="anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
              Projects ({projects.length})
            </span>
          </div>
          {projectsLoading ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 12, color: '#999' }}>Loading...</div>
          ) : projects.length === 0 ? (
            <div style={{ padding: '48px 22px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#999', margin: 0 }}>No projects found</p>
              <p style={{ fontSize: 11, color: '#ccc', marginTop: 4 }}>Projects assigned to this client will appear here.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Code', 'Department', 'Status', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((proj) => (
                  <tr
                    key={proj.id}
                    onClick={() => router.push(`/admin/projects/${proj.id}`)}
                    style={{
                      borderBottom: '0.5px solid #f5f2ee',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FDFCFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 500, color: '#e31c79' }}>
                      {proj.name}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555' }}>
                      {proj.code || '--'}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555' }}>
                      {proj.department_name || '--'}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 9,
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 3,
                          backgroundColor: proj.is_active ? '#f0faf5' : '#f7f6f4',
                          color: proj.is_active ? '#2d9b6e' : '#999',
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: proj.is_active ? '#2d9b6e' : '#ccc' }} />
                        {proj.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <ExternalLink style={{ width: 12, height: 12, color: '#c0bab2' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div className="anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
              Employees ({employees.length})
            </span>
          </div>
          {employeesLoading ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 12, color: '#999' }}>Loading...</div>
          ) : employees.length === 0 ? (
            <div style={{ padding: '48px 22px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#999', margin: 0 }}>No employees found</p>
              <p style={{ fontSize: 11, color: '#ccc', marginTop: 4 }}>Employees assigned to this client will appear here.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Email', 'Role', 'Department', 'Manager', 'Status', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => router.push(`/admin/employees?edit=${emp.id}`)}
                    style={{
                      borderBottom: '0.5px solid #f5f2ee',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FDFCFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 500, color: '#e31c79' }}>
                      {emp.first_name} {emp.last_name}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555' }}>
                      {emp.email}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555', textTransform: 'capitalize' }}>
                      {emp.role}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555' }}>
                      {emp.department_name || '--'}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555' }}>
                      {emp.manager_name || '--'}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 9,
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 3,
                          backgroundColor: emp.is_active ? '#f0faf5' : '#f7f6f4',
                          color: emp.is_active ? '#2d9b6e' : '#999',
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: emp.is_active ? '#2d9b6e' : '#ccc' }} />
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <ExternalLink style={{ width: 12, height: 12, color: '#c0bab2' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* BILLING TAB */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Date range picker */}
          <div
            className="anim-slide-up stagger-1"
            style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 24px' }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 16 }}>
              Date range
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label style={labelStyle}>From</label>
                <input
                  type="date"
                  value={billingStart}
                  onChange={(e) => setBillingStart(e.target.value)}
                  style={{ ...inputStyle, width: 180 }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
              <div>
                <label style={labelStyle}>To</label>
                <input
                  type="date"
                  value={billingEnd}
                  onChange={(e) => setBillingEnd(e.target.value)}
                  style={{ ...inputStyle, width: 180 }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
              <div style={{ paddingTop: 16 }}>
                <button
                  onClick={loadBilling}
                  style={{
                    background: '#e31c79',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 7,
                    padding: '8px 18px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#cc1069'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#e31c79'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {billingLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Hours', value: billingData.totalHours.toLocaleString(), accent: false },
              { label: 'Total Revenue', value: `$${billingData.totalRevenue.toLocaleString()}`, accent: true },
              { label: 'Active Projects', value: billingData.activeProjectsCount },
              { label: 'Active Employees', value: billingData.employeeCount },
            ].map((card, i) => (
              <div
                key={card.label}
                className={`anim-slide-up stagger-${i + 2}`}
                style={{
                  background: '#fff',
                  border: '0.5px solid #e8e4df',
                  borderRadius: 10,
                  padding: '22px 24px',
                  cursor: 'default',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = card.accent ? '#e31c79' : '#d3ad6b'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e8e4df'
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.2, color: '#c0bab2', marginBottom: 8 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: card.accent ? '#e31c79' : '#1a1a1a' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between" style={{ borderTop: '0.5px solid #e8e4df', paddingTop: 20, marginTop: 24 }}>
        <button
          onClick={() => router.push('/admin/clients')}
          style={{ fontSize: 12, color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#e31c79' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#999' }}
        >
          &larr; Back to list
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/clients')}
            style={{
              background: '#fff',
              border: '0.5px solid #e0dcd7',
              borderRadius: 7,
              padding: '8px 18px',
              fontSize: 12,
              color: '#777',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          {(activeTab === 'overview' || activeTab === 'departments') && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: '#fff',
                  border: '0.5px solid #e31c79',
                  borderRadius: 7,
                  padding: '8px 18px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#e31c79',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {nextTab && nextTabLabel && (
                <button
                  onClick={handleSaveAndNext}
                  disabled={saving}
                  style={{
                    background: '#fff',
                    border: '0.5px solid #e0dcd7',
                    borderRadius: 7,
                    padding: '8px 18px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Saving...' : `Save & ${nextTabLabel}`}
                </button>
              )}
            </>
          )}
          <button
            onClick={handleSaveAndExit}
            disabled={saving}
            style={{
              background: '#e31c79',
              border: 'none',
              borderRadius: 7,
              padding: '8px 18px',
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = '#cc1069'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
            onMouseLeave={e => { e.currentTarget.style.background = '#e31c79'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {saving ? 'Saving...' : 'Save & exit'}
          </button>
        </div>
      </div>
    </div>
  )
}

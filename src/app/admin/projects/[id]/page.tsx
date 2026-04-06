'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton'

interface Project {
  id: string
  name: string
  short_name?: string
  project_number?: string
  client_id: string
  client_name?: string
  start_date?: string
  end_date?: string
  department?: string
  department_id?: string
  track_time: boolean
  track_expenses: boolean
  is_billable: boolean
  // budget & invoicing (saved to DB)
  billing_rate?: number
  budget?: number
  active_po?: string
  invoice_item?: string
  time_type?: string
  max_daily_hours?: number
  time_increment?: number
  ar_account?: string
  ap_contact?: string
  company_name?: string
  shipping_company?: string
  invoice_address?: string
  shipping_address?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  pay_rate?: number
  bill_rate?: number
}

interface TimeApprover {
  id: string
  project_id: string
  employee_id: string
  can_approve: boolean
  employee?: {
    first_name: string
    last_name: string
    email: string
  }
}

type TabType =
  | 'overview'
  | 'budget'
  | 'invoicing'
  | 'people'
  | 'approvers'
  | 'time-settings'

const TAB_ORDER: TabType[] = [
  'overview',
  'budget',
  'invoicing',
  'people',
  'approvers',
  'time-settings',
]

/**
 * Only include columns that actually exist on the "projects" table.
 * Adjust this list if your Supabase schema differs.
 */
const buildProjectPayload = (data: Partial<Project>) => {
  return {
    // required
    client_id: data.client_id!, // validated before use
    name: (data.name || '').trim(),

    // likely columns
    short_name: data.short_name ?? null,
    project_number: data.project_number ?? null,
    start_date: data.start_date ?? null,
    end_date: data.end_date ?? null,
    department: data.department ?? null,
    department_id: data.department_id ?? null,

    // toggles
    is_active: data.is_active ?? true,
    track_time: data.track_time ?? true,
    track_expenses: data.track_expenses ?? false,
    is_billable: data.is_billable ?? true,

    // budget & invoicing
    billing_rate: data.billing_rate ?? null,
    budget: data.budget ?? null,
    active_po: data.active_po ?? null,
    invoice_item: data.invoice_item ?? null,

    // time settings
    time_type: data.time_type ?? 'hourly',
    max_daily_hours: data.max_daily_hours ?? null,
    time_increment: data.time_increment ?? null,
  }
}

// Shared input style
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

// Table header cell
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

export default function ProjectEditPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params?.id as string
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [project, setProject] = useState<Project | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [projectDepartments, setProjectDepartments] = useState<{ id: string; name: string; code: string | null }[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [projectEmployees, setProjectEmployees] = useState<any[]>([])
  const [approvers, setApprovers] = useState<TimeApprover[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Project>>({
    is_active: true,
    track_time: true,
    track_expenses: true,
    is_billable: true,
  })

  // People tab
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [newPayRate, setNewPayRate] = useState('')
  const [newBillRate, setNewBillRate] = useState('')

  // Approvers tab
  const [selectedApproverId, setSelectedApproverId] = useState('')

  // Time settings (local only for now)
  const [timeTypes, setTimeTypes] = useState([
    { name: 'Regular Time', bill_multiplier: 1, pay_multiplier: 1 },
  ])
  const [customTimeTypes, setCustomTimeTypes] = useState(false)
  const [splitTimeRule, setSplitTimeRule] = useState('company')
  const [maxHoursPerDay, setMaxHoursPerDay] = useState('')
  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState('')
  const [timeIncrements, setTimeIncrements] = useState('')
  const [projectHoursAlert, setProjectHoursAlert] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([loadClients(), loadEmployees()])
        if (projectId && projectId !== 'new') {
          await loadProject()
        }
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error loading clients:', error)
      return
    }

    setClients(data || [])
  }

  const loadDepartments = async (clientId: string) => {
    if (!clientId) { setProjectDepartments([]); return }
    const { data } = await supabase
      .from('departments')
      .select('id, name, code')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('name')
    setProjectDepartments(data || [])
  }

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email, role')
      .order('last_name')

    if (error) {
      console.error('Error loading employees:', error)
      return
    }

    setEmployees((data || []) as Employee[])
  }

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error

      setProject(data as Project)
      setFormData((prev) => ({ ...prev, ...(data as Project) }))
      if (data.client_id) loadDepartments(data.client_id)

      const { data: empData, error: empError } = await supabase
        .from('project_employees')
        .select(
          `
          *,
          employee:employee_id (
            first_name,
            last_name,
            email
          )
        `
        )
        .eq('project_id', projectId)

      if (empError) console.error('Error loading project employees:', empError)
      setProjectEmployees(empData || [])

      const { data: approverData, error: approverError } = await supabase
        .from('time_approvers')
        .select(
          `
          *,
          employee:employee_id (
            first_name,
            last_name,
            email
          )
        `
        )
        .eq('project_id', projectId)

      if (approverError) console.error('Error loading approvers:', approverError)
      setApprovers((approverData || []) as TimeApprover[])
    } catch (err) {
      console.error('Error loading project:', err)
    }
  }

  const saveProject = async () => {
    if (!formData.client_id) {
      alert('Please select a client.')
      return null
    }
    if (!formData.name || !formData.name.trim()) {
      alert('Please enter a project name.')
      return null
    }

    const payload = buildProjectPayload(formData)

    setSaving(true)
    try {
      if (projectId === 'new') {
        const { data, error } = await supabase
          .from('projects')
          .insert([payload])
          .select()
          .single()

        if (error) throw error

        const created = data as Project
        setProject(created)
        // keep any local-only fields (like client_name)
        setFormData((prev) => ({ ...prev, ...created }))

        alert('Project created successfully!')
        return created.id as string
      } else {
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', projectId)

        if (error) throw error

        alert('Project saved successfully!')
        return projectId
      }
    } catch (err: any) {
      console.error('Error saving project:', err)
      alert(`Error saving project: ${err.message || 'Unknown error'}`)
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    const id = await saveProject()
    if (projectId === 'new' && id && id !== 'new') {
      router.replace(`/admin/projects/${id}`)
    }
  }

  const handleSaveAndExit = async () => {
    const id = await saveProject()
    if (id) router.push('/admin/projects')
  }

  const nextTabFor = (tab: TabType): TabType | null => {
    const idx = TAB_ORDER.indexOf(tab)
    if (idx === -1 || idx === TAB_ORDER.length - 1) return null
    return TAB_ORDER[idx + 1]
  }

  const handleSaveAndNext = async () => {
    const id = await saveProject()
    if (!id) return
    const next = nextTabFor(activeTab)
    if (next) setActiveTab(next)
  }

  const handleAddEmployee = async () => {
    if (!projectId || projectId === 'new') {
      alert('Please save the project before adding people.')
      return
    }
    if (!selectedEmployeeId) {
      alert('Please select an employee to add.')
      return
    }

    try {
      const payRate = newPayRate ? Number(newPayRate) : 0
      const billRate = newBillRate ? Number(newBillRate) : 0

      const { error } = await supabase.from('project_employees').insert({
        project_id: projectId,
        employee_id: selectedEmployeeId,
        pay_rate: payRate,
        bill_rate: billRate,
        is_active: true,
      })

      if (error) throw error

      setSelectedEmployeeId('')
      setNewPayRate('')
      setNewBillRate('')
      await loadProject()
    } catch (err) {
      console.error('Error adding employee:', err)
      alert('Error adding employee to project')
    }
  }

  const handleRemoveEmployee = async (projectEmployeeId: string) => {
    try {
      const { error } = await supabase
        .from('project_employees')
        .delete()
        .eq('id', projectEmployeeId)

      if (error) throw error
      await loadProject()
    } catch (err) {
      console.error('Error removing employee:', err)
      alert('Error removing employee from project')
    }
  }

  const handleAddApprover = async () => {
    if (!projectId || projectId === 'new') {
      alert('Please save the project before adding approvers.')
      return
    }
    if (!selectedApproverId) {
      alert('Please select a manager to add as approver.')
      return
    }

    try {
      const { error } = await supabase.from('time_approvers').insert({
        project_id: projectId,
        employee_id: selectedApproverId,
        can_approve: true,
      })

      if (error) throw error

      setSelectedApproverId('')
      await loadProject()
    } catch (err) {
      console.error('Error adding approver:', err)
      alert('Error adding time approver')
    }
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview' },
    { id: 'budget' as TabType, label: 'Budget' },
    { id: 'invoicing' as TabType, label: 'Invoicing' },
    { id: 'people' as TabType, label: 'People' },
    { id: 'approvers' as TabType, label: 'Approvers' },
    { id: 'time-settings' as TabType, label: 'Time Settings' },
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
  const isBillable = formData.is_billable ?? false
  const trackTime = formData.track_time ?? true
  const trackExpenses = formData.track_expenses ?? false

  const pageName =
    projectId === 'new'
      ? 'New Project'
      : formData.name || 'Project'

  const hasSummary = !!project && projectId !== 'new'
  const nextTab = nextTabFor(activeTab)
  const nextTabLabel = nextTab ? tabLabelMap[nextTab] : null

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page Title */}
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div>
          <div className="flex items-center gap-1" style={{ fontSize: 11, color: '#c0bab2', marginBottom: 4 }}>
            <button
              onClick={() => router.push('/admin/projects')}
              style={{ color: '#c0bab2', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#e31c79' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#c0bab2' }}
            >
              Projects
            </button>
            <span>/</span>
            <span style={{ color: '#999' }}>{pageName}</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3, margin: 0 }}>
            {pageName}
          </h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>
            Configure project details, people, and approvals.
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

      {/* Summary card once project exists */}
      {hasSummary && (
        <div
          className="anim-slide-up stagger-1"
          style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', marginBottom: 14 }}>
            Project Summary
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Client', value: formData.client_name || 'Not set' },
              { label: 'Status', value: isActive ? 'Active' : 'Inactive' },
              { label: 'Dates', value: `${formData.start_date || 'Not set'} \u2192 ${formData.end_date || 'Forever'}` },
              { label: 'Department', value: (formData.department_id && projectDepartments.find(d => d.id === formData.department_id)?.name) || formData.department || 'None' },
              { label: 'Tracking', value: `${trackTime ? 'Time' : ''}${trackTime && trackExpenses ? ' + ' : ''}${trackExpenses ? 'Expenses' : !trackTime ? 'None' : ''}` },
              { label: 'People / Approvers', value: `${projectEmployees.length} people \u00b7 ${approvers.length} approver(s)` },
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

      {/* OVERVIEW = MAIN DATA ENTRY */}
      {activeTab === 'overview' && (
        <div
          className="anim-slide-up stagger-2"
          style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '24px' }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 20 }}>
            Project details
          </div>
          <div className="space-y-6">
            {/* main project fields */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label style={labelStyle}>Client</label>
                <select
                  value={formData.client_id || ''}
                  onChange={(e) => {
                    const client = clients.find(
                      (c) => c.id === e.target.value
                    )
                    setFormData({
                      ...formData,
                      client_id: e.target.value,
                      client_name: client?.name,
                    })
                  }}
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                >
                  <option value="">Select client</option>
                  {clients.map((client: any) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Project name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
              <div>
                <label style={labelStyle}>Short name</label>
                <input
                  type="text"
                  value={formData.short_name || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      short_name: e.target.value,
                    })
                  }
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
              <div>
                <label style={labelStyle}>Number</label>
                <input
                  type="text"
                  value={formData.project_number || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      project_number: e.target.value,
                    })
                  }
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
            </div>

            {/* dates */}
            <div style={{ borderTop: '0.5px solid #f0ece7', paddingTop: 24 }} className="grid grid-cols-2 gap-6">
              <div>
                <label style={labelStyle}>Start date</label>
                <input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
              <div>
                <label style={labelStyle}>End date</label>
                <input
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
            </div>

            {/* department + status + toggles */}
            <div style={{ borderTop: '0.5px solid #f0ece7', paddingTop: 24 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label style={labelStyle}>Department</label>
                  {projectDepartments.length > 0 ? (
                    <select
                      value={formData.department_id || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, department_id: e.target.value || undefined })
                      }
                      style={inputStyle}
                      onFocus={focusHandler}
                      onBlur={blurHandler}
                    >
                      <option value="">None</option>
                      {projectDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}{dept.code ? ` (${dept.code})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                      No departments configured for this client
                    </p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Project status</label>
                  <div className="flex gap-3" style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, is_active: true })
                      }
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
                      onClick={() =>
                        setFormData({ ...formData, is_active: false })
                      }
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

              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between" style={{ border: '0.5px solid #e8e4df', borderRadius: 10, padding: '12px 16px', background: '#FDFCFB' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#777', margin: 0 }}>Track time on this project</p>
                    <p style={{ fontSize: 10.5, color: '#c0bab2', marginTop: 2 }}>Controls whether hours can be coded here.</p>
                  </div>
                  <button
                    onClick={() =>
                      setFormData({ ...formData, track_time: !trackTime })
                    }
                    style={{
                      padding: '6px 16px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 7,
                      border: 'none',
                      background: trackTime ? '#e31c79' : '#f5f2ee',
                      color: trackTime ? '#fff' : '#555',
                      cursor: 'pointer',
                    }}
                  >
                    {trackTime ? 'YES' : 'NO'}
                  </button>
                </div>
                <div className="flex items-center justify-between" style={{ border: '0.5px solid #e8e4df', borderRadius: 10, padding: '12px 16px', background: '#FDFCFB' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#777', margin: 0 }}>Track expenses on this project</p>
                    <p style={{ fontSize: 10.5, color: '#c0bab2', marginTop: 2 }}>Controls whether expenses can be submitted.</p>
                  </div>
                  <button
                    onClick={() =>
                      setFormData({ ...formData, track_expenses: !trackExpenses })
                    }
                    style={{
                      padding: '6px 16px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 7,
                      border: 'none',
                      background: trackExpenses ? '#e31c79' : '#f5f2ee',
                      color: trackExpenses ? '#fff' : '#555',
                      cursor: 'pointer',
                    }}
                  >
                    {trackExpenses ? 'YES' : 'NO'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget */}
      {activeTab === 'budget' && (
        <div className="anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 20 }}>Budget</div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label style={labelStyle}>Billing rate ($/hr)</label>
              <input
                type="number"
                step="0.01"
                value={formData.billing_rate ?? ''}
                onChange={(e) => setFormData({ ...formData, billing_rate: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0.00"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>
            <div>
              <label style={labelStyle}>Project budget ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.budget ?? ''}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0.00"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>
            <div>
              <label style={labelStyle}>Active PO number</label>
              <input
                type="text"
                value={formData.active_po || ''}
                onChange={(e) => setFormData({ ...formData, active_po: e.target.value })}
                placeholder="e.g. PO-2026-001"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>
            <div>
              <label style={labelStyle}>Invoice item / line item</label>
              <input
                type="text"
                value={formData.invoice_item || ''}
                onChange={(e) => setFormData({ ...formData, invoice_item: e.target.value })}
                placeholder="e.g. Consulting Services"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>
          </div>
        </div>
      )}

      {/* Invoicing */}
      {activeTab === 'invoicing' && (
        <div className="anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 20 }}>Project invoicing</div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="flex items-center gap-2" style={{ fontSize: 12, color: '#555' }}>
                <input
                  type="radio"
                  checked={!isBillable}
                  onChange={() =>
                    setFormData({ ...formData, is_billable: false })
                  }
                />
                This project is not billable
              </label>
              <label className="flex items-center gap-2" style={{ fontSize: 12, color: '#555' }}>
                <input
                  type="radio"
                  checked={isBillable}
                  onChange={() =>
                    setFormData({ ...formData, is_billable: true })
                  }
                />
                This project is billable and we invoice
              </label>
            </div>

            {isBillable && (
              <>
                <div style={{ borderTop: '0.5px solid #f0ece7', paddingTop: 24 }}>
                  <label style={labelStyle}>Invoice contact</label>
                  <div className="grid grid-cols-2 gap-6" style={{ marginTop: 8 }}>
                    <div>
                      <p style={{ fontSize: 10.5, color: '#c0bab2', marginBottom: 4 }}>Accounts payable contact</p>
                      <input
                        type="text"
                        value={formData.ap_contact || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, ap_contact: e.target.value })
                        }
                        style={inputStyle}
                        onFocus={focusHandler}
                        onBlur={blurHandler}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '0.5px solid #f0ece7', paddingTop: 24 }} className="grid grid-cols-2 gap-6">
                  <div>
                    <label style={labelStyle}>Company name</label>
                    <input
                      type="text"
                      value={formData.company_name || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, company_name: e.target.value })
                      }
                      style={inputStyle}
                      onFocus={focusHandler}
                      onBlur={blurHandler}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Shipping company name</label>
                    <input
                      type="text"
                      value={formData.shipping_company || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, shipping_company: e.target.value })
                      }
                      style={inputStyle}
                      onFocus={focusHandler}
                      onBlur={blurHandler}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Invoice address</label>
                    <textarea
                      value={formData.invoice_address || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, invoice_address: e.target.value })
                      }
                      rows={4}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      onFocus={focusHandler as any}
                      onBlur={blurHandler as any}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Shipping address</label>
                    <textarea
                      value={formData.shipping_address || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, shipping_address: e.target.value })
                      }
                      rows={4}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      onFocus={focusHandler as any}
                      onBlur={blurHandler as any}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* People */}
      {activeTab === 'people' && (
        <div className="anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 20 }}>People</div>

          <div style={{ border: '0.5px solid #e8e4df', borderRadius: 10, padding: 16, background: '#FDFCFB', marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', marginBottom: 12 }}>
              Add person to project
            </div>
            <div className="grid grid-cols-4 gap-4 items-end">
              <div>
                <label style={labelStyle}>Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.last_name}, {emp.first_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Bill rate</label>
                <input
                  type="number"
                  value={newBillRate}
                  onChange={(e) => setNewBillRate(e.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
              <div>
                <label style={labelStyle}>Pay rate</label>
                <input
                  type="number"
                  value={newPayRate}
                  onChange={(e) => setNewPayRate(e.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAddEmployee}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '8px 18px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 7,
                    border: 'none',
                    background: '#e31c79',
                    color: '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = '#cc1069'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#e31c79'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  Add person
                </button>
              </div>
            </div>
          </div>

          <div style={{ border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Active dates', 'Bill rate', 'Pay rate', 'Invoice item', ''].map((h, i) => (
                    <th key={i} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projectEmployees.map((pe: any) => (
                  <tr
                    key={pe.id}
                    style={{ borderBottom: '0.5px solid #f5f2ee', transition: 'background 0.15s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FDFCFB' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                      {pe.employee
                        ? `${pe.employee.last_name}, ${pe.employee.first_name}`
                        : 'Unknown'}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 11, color: '#c0bab2' }}>
                      Current
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>
                      ${pe.bill_rate || 0}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>
                      ${pe.pay_rate || 0}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 11, color: '#c0bab2' }}>
                      Default
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleRemoveEmployee(pe.id)}
                        style={{
                          padding: '4px 6px',
                          borderRadius: 5,
                          border: '0.5px solid #e0dcd7',
                          background: '#fff',
                          color: '#b91c1c',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#b91c1c' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0dcd7' }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </td>
                  </tr>
                ))}
                {projectEmployees.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: '32px 20px', textAlign: 'center', fontSize: 11, color: '#ccc' }}
                    >
                      No people assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approvers */}
      {activeTab === 'approvers' && (
        <div className="anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 20 }}>Approvers</div>

          <div style={{ border: '0.5px solid #e8e4df', borderRadius: 10, padding: 16, background: '#FDFCFB', marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', marginBottom: 12 }}>
              Add time approver
            </div>
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <label style={labelStyle}>Manager</label>
                <select
                  value={selectedApproverId}
                  onChange={(e) => setSelectedApproverId(e.target.value)}
                  style={inputStyle}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                >
                  <option value="">Select manager</option>
                  {employees
                    .filter((e) => e.role === 'manager')
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.last_name}, {emp.first_name}
                      </option>
                    ))}
                </select>
              </div>
              <div />
              <div className="flex justify-end">
                <button
                  onClick={handleAddApprover}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '8px 18px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 7,
                    border: 'none',
                    background: '#e31c79',
                    color: '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = '#cc1069'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#e31c79'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  Add approver
                </button>
              </div>
            </div>
          </div>

          <div style={{ border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Email'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvers.map((ap) => (
                  <tr
                    key={ap.id}
                    style={{ borderBottom: '0.5px solid #f5f2ee', transition: 'background 0.15s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FDFCFB' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                      {ap.employee
                        ? `${ap.employee.last_name}, ${ap.employee.first_name}`
                        : 'Unknown'}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555' }}>
                      {ap.employee?.email || '\u2014'}
                    </td>
                  </tr>
                ))}
                {approvers.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      style={{ padding: '32px 20px', textAlign: 'center', fontSize: 11, color: '#ccc' }}
                    >
                      No time approvers assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Time Settings */}
      {activeTab === 'time-settings' && (
        <div className="anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 20 }}>Time settings</div>

          <div className="space-y-6">
            <div>
              <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', marginBottom: 12 }}>
                Time types
              </div>
              <div style={{ border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Name', 'Multipliers', ''].map((h, i) => (
                        <th key={i} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeTypes.map((type, index) => (
                      <tr key={index} style={{ borderBottom: '0.5px solid #f5f2ee' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <input
                            type="text"
                            value={type.name}
                            readOnly={index === 0}
                            style={{ ...inputStyle, marginTop: 0 }}
                            onFocus={focusHandler}
                            onBlur={blurHandler}
                          />
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <div className="flex items-center gap-2" style={{ fontSize: 11, color: '#555' }}>
                            <span>Bill at</span>
                            <input
                              type="number"
                              value={type.bill_multiplier}
                              readOnly={index === 0}
                              style={{ width: 64, padding: '4px 8px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, outline: 'none' }}
                              onFocus={focusHandler}
                              onBlur={blurHandler}
                            />
                            <span>X</span>
                            <span style={{ marginLeft: 16 }}>Pay at</span>
                            <input
                              type="number"
                              value={type.pay_multiplier}
                              readOnly={index === 0}
                              style={{ width: 64, padding: '4px 8px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, outline: 'none' }}
                              onFocus={focusHandler}
                              onBlur={blurHandler}
                            />
                            <span>X</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                          {index > 0 && (
                            <button style={{
                              padding: '4px 6px',
                              borderRadius: 5,
                              border: '0.5px solid #e0dcd7',
                              background: '#fff',
                              color: '#b91c1c',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}>
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() =>
                  setTimeTypes([
                    ...timeTypes,
                    { name: '', bill_multiplier: 1, pay_multiplier: 1 },
                  ])
                }
                style={{
                  marginTop: 12,
                  background: '#fff',
                  border: '0.5px solid #e0dcd7',
                  borderRadius: 7,
                  padding: '8px 18px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#777',
                  cursor: 'pointer',
                }}
              >
                Add standard time type
              </button>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#777' }}>
                  Split time using this rule:
                </label>
                <select
                  value={splitTimeRule}
                  onChange={(e) => setSplitTimeRule(e.target.value)}
                  style={{ marginLeft: 8, padding: '6px 12px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, color: '#1a1a1a', outline: 'none', background: '#fff' }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                >
                  <option value="company">Use company settings</option>
                  <option value="custom">Custom rule</option>
                </select>
              </div>
            </div>

            <div style={{ borderTop: '0.5px solid #f0ece7', paddingTop: 24 }} className="space-y-4">
              <div>
                <label className="flex items-center gap-2" style={{ fontSize: 12, color: '#555' }}>
                  <input
                    type="checkbox"
                    checked={customTimeTypes}
                    onChange={(e) => setCustomTimeTypes(e.target.checked)}
                  />
                  Custom time types are used on this project
                </label>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.max_daily_hours ?? ''}
                    onChange={(e) => setFormData({ ...formData, max_daily_hours: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="24"
                    style={{ width: 80, padding: '6px 8px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, outline: 'none' }}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  />
                  <span style={{ fontSize: 11, color: '#555' }}>max hours per person, per day</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={maxHoursPerWeek}
                    onChange={(e) => setMaxHoursPerWeek(e.target.value)}
                    placeholder="40"
                    style={{ width: 80, padding: '6px 8px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, outline: 'none' }}
                    onFocus={focusHandler}
                    onBlur={blurHandler}
                  />
                  <span style={{ fontSize: 11, color: '#555' }}>hours per person, per week</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#777' }}>
                  Alert when the total number of hours for this project reaches
                </label>
                <input
                  type="number"
                  value={projectHoursAlert}
                  onChange={(e) => setProjectHoursAlert(e.target.value)}
                  style={{ marginLeft: 8, width: 96, padding: '6px 8px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, outline: 'none' }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#777' }}>
                  Track time for this project in
                </label>
                <input
                  type="number"
                  value={formData.time_increment != null ? formData.time_increment * 60 : ''}
                  onChange={(e) => setFormData({ ...formData, time_increment: e.target.value ? Number(e.target.value) / 60 : undefined })}
                  placeholder="15"
                  style={{ marginLeft: 8, width: 80, padding: '6px 8px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, outline: 'none' }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
                <span style={{ marginLeft: 8, fontSize: 11, color: '#555' }}>minute increments</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between" style={{ borderTop: '0.5px solid #e8e4df', paddingTop: 20, marginTop: 24 }}>
        <button
          onClick={() => router.push('/admin/projects')}
          style={{ fontSize: 12, color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#e31c79' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#999' }}
        >
          &larr; Back to list
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/projects')}
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

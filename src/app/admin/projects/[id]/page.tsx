'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'

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
  track_time: boolean
  track_expenses: boolean
  is_billable: boolean
  billing_rate?: number
  budget?: number
  active_po?: string
  invoice_item?: string
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

export default function ProjectEditPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params?.id as string
  const supabase = createClientComponentClient()

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [project, setProject] = useState<Project | null>(null)
  const [clients, setClients] = useState<any[]>([])
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

    setSaving(true)
    try {
      if (projectId === 'new') {
        const { data, error } = await supabase
          .from('projects')
          .insert([{ ...formData }])
          .select()
          .single()

        if (error) throw error

        setProject(data as Project)
        setFormData((prev) => ({ ...prev, ...(data as Project) }))
        alert('Project created successfully!')
        return data.id as string
      } else {
        const { error } = await supabase
          .from('projects')
          .update(formData)
          .eq('id', projectId)

        if (error) throw error

        alert('Project saved successfully!')
        return projectId
      }
    } catch (err) {
      console.error('Error saving project:', err)
      alert('Error saving project')
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
    // For now, we do NOT change the URL on Save & Next for new projects
    // to avoid losing the tab state. Save or Save & exit can handle routing.
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
      <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-[#e31c79]" />
          <p className="mt-3 text-sm text-gray-500">Loading project…</p>
        </div>
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
    <div className="min-h-screen bg-[#F7F8FC] text-gray-900">
      {/* Admin Portal blue nav with back arrow to project list */}
      <header className="bg-[#05202E] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => router.push('/admin/projects')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10"
              >
                <span className="sr-only">Back</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Image
                src="/WE-logo-SEPT2024v3-WHT.png"
                alt="West End Workforce"
                width={180}
                height={40}
                className="h-9 w-auto"
                priority
              />
              <div className="border-l border-gray-600 pl-3">
                <p className="text-xs text-gray-300 uppercase tracking-wide">
                  Admin Portal
                </p>
              </div>
            </div>
            <div />
          </div>
        </div>
      </header>

      {/* Page Header + Tabs */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
              <span>Admin</span>
              <span className="text-gray-400">/</span>
              <span>Projects</span>
              <span className="text-gray-400">/</span>
              <span>{pageName}</span>
            </div>
            <h1 className="text-xl font-semibold text-[#05202E]">
              {pageName}
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Configure project details, people, and approvals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
                  activeTab === tab.id
                    ? 'border-[#e31c79] text-[#e31c79]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary card once project exists */}
        {hasSummary && (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              Project summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[11px] font-semibold text-gray-500">
                  Client
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formData.client_name || 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500">
                  Status
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500">
                  Dates
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formData.start_date || 'Not set'} →{' '}
                  {formData.end_date || 'Forever'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500">
                  Department / class
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formData.department || 'None'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500">
                  Track time / expenses
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {trackTime ? 'Time' : ''}
                  {trackTime && trackExpenses ? ' + ' : ''}
                  {trackExpenses ? 'Expenses' : !trackTime ? 'None' : ''}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500">
                  People / approvers
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {projectEmployees.length} people · {approvers.length} approver(s)
                </p>
              </div>
            </div>
          </section>
        )}

        {/* OVERVIEW = MAIN DATA ENTRY */}
        {activeTab === 'overview' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-6">
              Project details
            </h2>
            <div className="space-y-6 text-sm">
              {/* main project fields */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Client
                  </label>
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
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
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
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Project name
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Short name
                  </label>
                  <input
                    type="text"
                    value={formData.short_name || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        short_name: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Number
                  </label>
                  <input
                    type="text"
                    value={formData.project_number || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        project_number: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                  />
                </div>
              </div>

              {/* dates */}
              <div className="border-t border-gray-100 pt-6 grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        start_date: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    End date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        end_date: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                  />
                </div>
              </div>

              {/* department + status + toggles */}
              <div className="border-t border-gray-100 pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Department / class
                    </label>
                    <select
                      value={formData.department || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          department: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                    >
                      <option value="">None</option>
                      <option value="IT/Commerce">IT/Commerce</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                      <option value="Marketing">Marketing</option>
                      <option value="HR">Human Resources</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Project status
                    </label>
                    <div className="mt-1 flex gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, is_active: true })
                        }
                        className={`rounded-full px-4 py-1.5 border text-xs font-semibold ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, is_active: false })
                        }
                        className={`rounded-full px-4 py-1.5 border text-xs font-semibold ${
                          !isActive
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-gray-600">
                        Track time on this project
                      </p>
                      <p className="text-xs text-gray-500">
                        Controls whether hours can be coded here.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          track_time: !trackTime,
                        })
                      }
                      className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold ${
                        trackTime
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {trackTime ? 'YES' : 'NO'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-gray-600">
                        Track expenses on this project
                      </p>
                      <p className="text-xs text-gray-500">
                        Controls whether expenses can be submitted.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          track_expenses: !trackExpenses,
                        })
                      }
                      className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold ${
                        trackExpenses
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {trackExpenses ? 'YES' : 'NO'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Budget */}
        {activeTab === 'budget' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-6">
              Budget
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Budget features are scaffolded for future use.
            </p>
            <button className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">
              Add budget
            </button>
          </section>
        )}

        {/* Invoicing */}
        {activeTab === 'invoicing' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-6">
              Project invoicing
            </h2>

            <div className="space-y-6 text-sm">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    checked={!isBillable}
                    onChange={() =>
                      setFormData({ ...formData, is_billable: false })
                    }
                  />
                  This project is not billable
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
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
                  <div className="border-t border-gray-100 pt-6">
                    <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Invoice contact
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Accounts payable contact
                        </p>
                        <input
                          type="text"
                          value={formData.ap_contact || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              ap_contact: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6 grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Company name
                      </label>
                      <input
                        type="text"
                        value={formData.company_name || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            company_name: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Shipping company name
                      </label>
                      <input
                        type="text"
                        value={formData.shipping_company || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shipping_company: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Invoice address
                      </label>
                      <textarea
                        value={formData.invoice_address || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            invoice_address: e.target.value,
                          })
                        }
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Shipping address
                      </label>
                      <textarea
                        value={formData.shipping_address || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shipping_address: e.target.value,
                          })
                        }
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* People */}
        {activeTab === 'people' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-6">
              People
            </h2>

            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-3">
                Add person to project
              </h3>
              <div className="grid grid-cols-4 gap-4 items-end text-sm">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Employee
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
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
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Bill rate
                  </label>
                  <input
                    type="number"
                    value={newBillRate}
                    onChange={(e) => setNewBillRate(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Pay rate
                  </label>
                  <input
                    type="number"
                    value={newPayRate}
                    onChange={(e) => setNewPayRate(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddEmployee}
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center rounded-full bg-[#05202E] px-4 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
                  >
                    Add person
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Active dates
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Bill rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Pay rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Invoice item
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projectEmployees.map((pe: any) => (
                    <tr key={pe.id}>
                      <td className="px-4 py-3">
                        {pe.employee
                          ? `${pe.employee.last_name}, ${pe.employee.first_name}`
                          : 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        Current
                      </td>
                      <td className="px-4 py-3">
                        ${pe.bill_rate || 0}
                      </td>
                      <td className="px-4 py-3">
                        ${pe.pay_rate || 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        Default
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemoveEmployee(pe.id)}
                          className="inline-flex items-center justify-center rounded-full bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {projectEmployees.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-xs text-gray-500"
                      >
                        No people assigned yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Approvers */}
        {activeTab === 'approvers' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-6">
              Approvers
            </h2>

            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-3">
                Add time approver
              </h3>
              <div className="grid grid-cols-3 gap-4 items-end text-sm">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Manager
                  </label>
                  <select
                    value={selectedApproverId}
                    onChange={(e) => setSelectedApproverId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
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
                    className="inline-flex w-full items-center justify-center rounded-full bg-[#05202E] px-4 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
                  >
                    Add approver
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {approvers.map((ap) => (
                    <tr key={ap.id}>
                      <td className="px-4 py-3">
                        {ap.employee
                          ? `${ap.employee.last_name}, ${ap.employee.first_name}`
                          : 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        {ap.employee?.email || '—'}
                      </td>
                    </tr>
                  ))}
                  {approvers.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-6 text-center text-xs text-gray-500"
                      >
                        No time approvers assigned yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Time Settings */}
        {activeTab === 'time-settings' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-6">
              Time settings
            </h2>

            <div className="space-y-6 text-sm">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-3">
                  Time types
                </h3>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Multipliers
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {timeTypes.map((type, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={type.name}
                              readOnly={index === 0}
                              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-xs text-gray-700">
                              <span>Bill at</span>
                              <input
                                type="number"
                                value={type.bill_multiplier}
                                readOnly={index === 0}
                                className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
                              />
                              <span>X</span>
                              <span className="ml-4">Pay at</span>
                              <input
                                type="number"
                                value={type.pay_multiplier}
                                readOnly={index === 0}
                                className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
                              />
                              <span>X</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {index > 0 && (
                              <button className="inline-flex items-center justify-center rounded-full bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100">
                                <Trash2 className="h-4 w-4" />
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
                  className="mt-3 inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Add standard time type
                </button>

                <div className="mt-4">
                  <label className="text-xs font-medium text-gray-600">
                    Split time using this rule:
                  </label>
                  <select
                    value={splitTimeRule}
                    onChange={(e) => setSplitTimeRule(e.target.value)}
                    className="ml-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
                  >
                    <option value="company">Use company settings</option>
                    <option value="custom">Custom rule</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-4">
                <div>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-700">
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
                      value={maxHoursPerDay}
                      onChange={(e) => setMaxHoursPerDay(e.target.value)}
                      placeholder="8"
                      className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-gray-700">
                      hours per person, per day
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={maxHoursPerWeek}
                      onChange={(e) => setMaxHoursPerWeek(e.target.value)}
                      placeholder="40"
                      className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-gray-700">
                      hours per person, per week
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Alert when the total number of hours for this project
                    reaches
                  </label>
                  <input
                    type="number"
                    value={projectHoursAlert}
                    onChange={(e) => setProjectHoursAlert(e.target.value)}
                    className="ml-2 w-24 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Track time for this project in
                  </label>
                  <input
                    type="number"
                    value={timeIncrements}
                    onChange={(e) => setTimeIncrements(e.target.value)}
                    placeholder="15"
                    className="ml-2 w-20 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
                  />
                  <span className="ml-2 text-xs text-gray-700">
                    minute increments
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer actions */}
        <section className="flex items-center justify-between border-t border-gray-200 pt-4">
          <button
            onClick={() => router.push('/admin/projects')}
            className="text-xs text-gray-600 hover:text-gray-800"
          >
            ← Back to list
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/projects')}
              className="rounded-full bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full border border-[#e31c79] text-[#e31c79] px-4 py-2 text-xs font-semibold hover:bg-pink-50 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {nextTab && nextTabLabel && (
              <button
                onClick={handleSaveAndNext}
                disabled={saving}
                className="rounded-full bg-[#05202E] px-4 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
              >
                {saving ? 'Saving…' : `Save & ${nextTabLabel}`}
              </button>
            )}
            <button
              onClick={handleSaveAndExit}
              disabled={saving}
              className="rounded-full bg-[#e31c79] px-4 py-2 text-xs font-semibold text-white hover:bg-[#c71865] disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save & exit'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

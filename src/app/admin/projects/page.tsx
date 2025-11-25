'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter } from 'lucide-react'

interface ProjectRow {
  id: string
  name: string
  short_name?: string
  project_number?: string
  client_id: string
  is_active: boolean
  track_time: boolean
  track_expenses: boolean
  is_billable: boolean
  created_at?: string
}

interface ClientRow {
  id: string
  name: string
  code?: string
}

export default function AdminProjectsPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([loadClients(), loadProjects()])
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(
        'id, name, short_name, project_number, client_id, is_active, track_time, track_expenses, is_billable, created_at'
      )
      .order('name')

    if (error) {
      console.error('Error loading projects:', error)
      return
    }

    setProjects((data || []) as ProjectRow[])
  }

  const clientLookup = useMemo(() => {
    const map: Record<string, ClientRow> = {}
    clients.forEach((c) => {
      map[c.id] = c
    })
    return map
  }, [clients])

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase()
    return projects
      .filter((p) => (showActiveOnly ? p.is_active : true))
      .filter((p) => {
        if (!term) return true
        const client = clientLookup[p.client_id]
        const haystack = [
          p.name,
          p.short_name,
          p.project_number,
          client?.name,
          client?.code,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(term)
      })
  }, [projects, clientLookup, search, showActiveOnly])

  const handleOpen = (id: string) => {
    router.push(`/admin/projects/${id}`)
  }

  const handleNew = () => {
    router.push('/admin/projects/new')
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-gray-900">
      {/* Admin Portal blue nav with back arrow */}
      <header className="bg-[#33393c] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10"
              >
                <span className="sr-only">Back</span>
                ←
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

      {/* Page Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
              <span>Admin</span>
              <span className="text-gray-400">/</span>
              <span>Projects</span>
            </div>
            <h1 className="text-xl font-semibold text-[#33393c]">Projects</h1>
            <p className="mt-1 text-xs text-gray-500">
              Manage client-scoped projects that employees can bill time and expenses to.
            </p>
          </div>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 rounded-full bg-[#e31c79] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#c71865]"
          >
            <Plus className="h-4 w-4" />
            New project
          </button>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters row */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by project or client…"
                className="w-64 rounded-full border border-gray-200 bg-white px-9 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#e31c79] focus:outline-none focus:ring-1 focus:ring-[#e31c79]"
              />
            </div>

            <button
              onClick={() => setShowActiveOnly((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                showActiveOnly
                  ? 'border-[#33393c] bg-[#33393c] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#e31c79] hover:text-[#e31c79]'
              }`}
            >
              <Filter className="h-3 w-3" />
              {showActiveOnly ? 'Active only' : 'All projects'}
            </button>
          </div>

        <div className="text-xs text-gray-500">
          Showing{' '}
          <span className="font-semibold">{filteredProjects.length}</span>{' '}
          of <span className="font-semibold">{projects.length}</span> projects
        </div>
        </div>

        {/* Projects list */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-[#e31c79]" />
              <p className="mt-3 text-sm text-gray-500">
                Loading projects…
              </p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-gray-700">
              No projects found
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Try adjusting your search or create a new project.
            </p>
            <button
              onClick={handleNew}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#e31c79] px-4 py-2 text-sm font-medium text-white hover:bg-[#c71865]"
            >
              <Plus className="h-4 w-4" />
              New project
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tracking
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Billing
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.map((p) => {
                  const client = clientLookup[p.client_id]
                  return (
                    <tr
                      key={p.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleOpen(p.id)}
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {p.name || '(Untitled project)'}
                          </span>
                          <span className="mt-0.5 text-xs text-gray-500">
                            {p.short_name || p.project_number
                              ? [p.short_name, p.project_number]
                                  .filter(Boolean)
                                  .join(' • ')
                              : 'No short name / number'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-800">
                            {client?.name || 'Unassigned'}
                          </span>
                          {client?.code && (
                            <span className="mt-0.5 text-xs text-gray-500">
                              {client.code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {p.track_time && (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                              Time
                            </span>
                          )}
                          {p.track_expenses && (
                            <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                              Expenses
                            </span>
                          )}
                          {!p.track_time && !p.track_expenses && (
                            <span className="text-xs text-gray-400">
                              None
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            p.is_billable
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {p.is_billable ? 'Billable' : 'Non-billable'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <span
                          className={`inline-flex items-center justify-end rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            p.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

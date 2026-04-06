'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAdminFilter } from '@/contexts/AdminFilterContext'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter } from 'lucide-react'
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton'

interface ProjectRow {
  id: string
  name: string
  short_name?: string
  project_number?: string
  client_id: string
  department_id?: string
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
  const supabase = createClient()
  const { selectedClientId, selectedDepartmentId } = useAdminFilter()

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
        'id, name, short_name, project_number, client_id, department_id, is_active, track_time, track_expenses, is_billable, created_at'
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
        if (selectedClientId && p.client_id !== selectedClientId) return false
        if (selectedDepartmentId && p.department_id !== selectedDepartmentId) return false
        return true
      })
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
  }, [projects, clientLookup, search, showActiveOnly, selectedClientId, selectedDepartmentId])

  const handleOpen = (id: string) => {
    router.push(`/admin/projects/${id}`)
  }

  const handleNew = () => {
    router.push('/admin/projects/new')
  }

  // Stat counts
  const activeCount = projects.filter(p => p.is_active).length
  const inactiveCount = projects.filter(p => !p.is_active).length
  const billableCount = projects.filter(p => p.is_billable && p.is_active).length
  const clientCount = new Set(projects.filter(p => p.is_active).map(p => p.client_id)).size

  if (loading) {
    return (
      <div style={{ padding: '36px 40px' }} className="space-y-6">
        <div>
          <div className="anim-shimmer" style={{ width: 160, height: 24, borderRadius: 4, marginBottom: 8 }} />
          <div className="anim-shimmer" style={{ width: 300, height: 14, borderRadius: 4 }} />
        </div>
        <SkeletonStats count={4} />
        <SkeletonList rows={6} />
      </div>
    )
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page Title + Action */}
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3, margin: 0 }}>
            Projects
          </h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>
            Manage client-scoped projects that employees can bill time and expenses to.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2"
          style={{
            backgroundColor: '#e31c79',
            color: '#fff',
            border: 'none',
            borderRadius: 7,
            padding: '8px 18px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#cc1069'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#e31c79'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          New Project
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Active Projects', value: activeCount, accent: true },
          { label: 'Inactive', value: inactiveCount },
          { label: 'Billable', value: billableCount },
          { label: 'Clients', value: clientCount },
        ].map((card, i) => (
          <div
            key={card.label}
            className={`anim-slide-up stagger-${i + 1}`}
            style={{
              background: '#fff',
              border: '0.5px solid #e8e4df',
              borderRadius: 10,
              padding: '22px 24px',
              cursor: 'default',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = i === 0 ? '#e31c79' : '#d3ad6b'
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

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-3">
          <div className="relative" style={{ maxWidth: 300 }}>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ width: 14, height: 14, color: '#d0cbc4', pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project or client..."
              style={{
                width: 280,
                paddingLeft: 34,
                paddingRight: 12,
                paddingTop: 8,
                paddingBottom: 8,
                border: '0.5px solid #e8e4df',
                borderRadius: 7,
                fontSize: 12,
                color: '#1a1a1a',
                outline: 'none',
                background: '#fff',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = '#d3ad6b'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#e8e4df'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <button
            onClick={() => setShowActiveOnly((prev) => !prev)}
            className="flex items-center gap-2"
            style={{
              padding: '7px 14px',
              fontSize: 11,
              fontWeight: 500,
              borderRadius: 7,
              border: showActiveOnly ? '0.5px solid #1a1a1a' : '0.5px solid #e0dcd7',
              background: '#fff',
              color: showActiveOnly ? '#1a1a1a' : '#777',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Filter style={{ width: 12, height: 12 }} />
            {showActiveOnly ? 'Active only' : 'All projects'}
          </button>
        </div>

        <div style={{ fontSize: 11, color: '#c0bab2' }}>
          Showing{' '}
          <span style={{ fontWeight: 600 }}>{filteredProjects.length}</span>{' '}
          of <span style={{ fontWeight: 600 }}>{projects.length}</span> projects
        </div>
      </div>

      {/* Projects Table */}
      {filteredProjects.length === 0 ? (
        <div className="anim-slide-up stagger-1" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '0.5px solid #e8e4df',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Search style={{ width: 18, height: 18, color: '#d0cbc4' }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#999', margin: 0 }}>No projects found</p>
          <p style={{ fontSize: 11, color: '#ccc', marginTop: 4 }}>
            Try adjusting your search or create a new project.
          </p>
          <button
            onClick={handleNew}
            className="flex items-center gap-2"
            style={{
              margin: '16px auto 0',
              backgroundColor: '#e31c79',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              padding: '8px 18px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#cc1069'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#e31c79'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            New Project
          </button>
        </div>
      ) : (
        <div
          className="anim-slide-up stagger-2"
          style={{
            background: '#fff',
            border: '0.5px solid #e8e4df',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Project', 'Client', 'Tracking', 'Billing', 'Status'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '11px 20px',
                      textAlign: i === 4 ? 'right' : 'left',
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: 1.2,
                      color: '#c0bab2',
                      textTransform: 'uppercase',
                      borderBottom: '0.5px solid #f0ece7',
                      background: 'transparent',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => {
                const client = clientLookup[p.client_id]
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '0.5px solid #f5f2ee',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onClick={() => handleOpen(p.id)}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FDFCFB' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                        {p.name || '(Untitled project)'}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#c0bab2', marginTop: 2 }}>
                        {p.short_name || p.project_number
                          ? [p.short_name, p.project_number]
                              .filter(Boolean)
                              .join(' \u2022 ')
                          : 'No short name / number'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                        {client?.name || 'Unassigned'}
                      </div>
                      {client?.code && (
                        <div style={{ fontSize: 10.5, color: '#c0bab2', marginTop: 2 }}>
                          {client.code}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.track_time && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 9,
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: 3,
                            background: '#f0faf5',
                            color: '#2d9b6e',
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2d9b6e' }} />
                            Time
                          </span>
                        )}
                        {p.track_expenses && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 9,
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: 3,
                            background: '#fdf8f0',
                            color: '#c4983a',
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c4983a' }} />
                            Expenses
                          </span>
                        )}
                        {!p.track_time && !p.track_expenses && (
                          <span style={{ fontSize: 11, color: '#ccc' }}>None</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 9,
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 3,
                        background: p.is_billable ? '#fdf8f0' : '#f7f6f4',
                        color: p.is_billable ? '#c4983a' : '#999',
                      }}>
                        {p.is_billable && (
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c4983a' }} />
                        )}
                        {p.is_billable ? 'Billable' : 'Non-billable'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 9,
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 3,
                        background: p.is_active ? '#f0faf5' : '#f7f6f4',
                        color: p.is_active ? '#2d9b6e' : '#999',
                      }}>
                        <span style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: p.is_active ? '#2d9b6e' : '#ccc',
                        }} />
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
    </div>
  )
}

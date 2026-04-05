'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SkeletonList } from '@/components/ui/Skeleton'
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react'

interface AuditLog {
  id: string
  user_id: string | null
  action: string
  timestamp: string
  metadata: Record<string, any>
  user_name?: string
}

const PAGE_SIZE = 20

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '0.5px solid #e8e4df',
  borderRadius: 7,
  fontSize: 12,
  color: '#1a1a1a',
  outline: 'none',
  background: '#fff',
}

const labelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: '#c0bab2',
}

const focusHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#d3ad6b'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)'
}
const blurHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#e8e4df'
  e.currentTarget.style.boxShadow = 'none'
}

export default function AuditLogPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actionTypes, setActionTypes] = useState<string[]>([])
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])

  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadFilterOptions()
  }, [])

  useEffect(() => {
    loadLogs()
  }, [page, search, actionFilter, userFilter, dateFrom, dateTo])

  const loadFilterOptions = async () => {
    // Get distinct action types
    const { data: actionData } = await supabase
      .from('audit_logs')
      .select('action')

    if (actionData) {
      const unique = [...new Set(actionData.map((r: any) => r.action))].sort()
      setActionTypes(unique)
    }

    // Get employees for user filter
    const { data: empData } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .order('last_name')

    if (empData) {
      setUsers(empData.map((e: any) => ({ id: e.id, name: `${e.last_name}, ${e.first_name}` })))
    }
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (actionFilter) {
        query = query.eq('action', actionFilter)
      }
      if (userFilter) {
        query = query.eq('user_id', userFilter)
      }
      if (dateFrom) {
        query = query.gte('timestamp', `${dateFrom}T00:00:00`)
      }
      if (dateTo) {
        query = query.lte('timestamp', `${dateTo}T23:59:59`)
      }
      if (search) {
        query = query.ilike('action', `%${search}%`)
      }

      const { data, count, error } = await query

      if (error) {
        console.error('Error loading audit logs:', error)
        setLogs([])
        setTotalCount(0)
        return
      }

      // Enrich with user names
      const userIds = [...new Set((data || []).map((l: any) => l.user_id).filter(Boolean))]
      let userMap: Record<string, string> = {}

      if (userIds.length > 0) {
        const { data: empData } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .in('id', userIds)

        if (empData) {
          empData.forEach((e: any) => {
            userMap[e.id] = `${e.first_name} ${e.last_name}`
          })
        }
      }

      const enriched = (data || []).map((l: any) => ({
        ...l,
        user_name: l.user_id ? userMap[l.user_id] || 'Unknown User' : 'System',
      }))

      setLogs(enriched)
      setTotalCount(count || 0)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const summarizeMetadata = (meta: Record<string, any>) => {
    if (!meta || Object.keys(meta).length === 0) return '\u2014'
    const entries = Object.entries(meta).slice(0, 3)
    return entries.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ')
  }

  const resetFilters = () => {
    setSearch('')
    setActionFilter('')
    setUserFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  const hasActiveFilters = search || actionFilter || userFilter || dateFrom || dateTo

  return (
    <div style={{ padding: '36px 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3, margin: 0 }}>
          Audit Log
        </h1>
        <p style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
          Track all system actions and changes across the platform.
        </p>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
        <div className="flex-1 relative">
          <Search
            size={14}
            strokeWidth={1.5}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#c0bab2' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search by action..."
            style={{ ...inputStyle, width: '100%', paddingLeft: 32 }}
            onFocus={focusHandler}
            onBlur={blurHandler}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 500,
            color: showFilters || hasActiveFilters ? '#e31c79' : '#777',
            background: '#fff',
            border: `0.5px solid ${showFilters || hasActiveFilters ? '#e31c79' : '#e8e4df'}`,
            borderRadius: 7,
            cursor: 'pointer',
          }}
        >
          <Filter size={13} strokeWidth={1.5} />
          Filters
          {hasActiveFilters && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#e31c79',
            }} />
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            style={{
              fontSize: 11,
              color: '#999',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div
          className="anim-slide-up"
          style={{
            background: '#fff',
            border: '0.5px solid #e8e4df',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 16,
          }}
        >
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label style={labelStyle}>Action type</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(0) }}
                style={{ ...inputStyle, width: '100%', marginTop: 4 }}
                onFocus={focusHandler}
                onBlur={blurHandler}
              >
                <option value="">All actions</option>
                {actionTypes.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>User</label>
              <select
                value={userFilter}
                onChange={(e) => { setUserFilter(e.target.value); setPage(0) }}
                style={{ ...inputStyle, width: '100%', marginTop: 4 }}
                onFocus={focusHandler}
                onBlur={blurHandler}
              >
                <option value="">All users</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>From date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
                style={{ ...inputStyle, width: '100%', marginTop: 4 }}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>
            <div>
              <label style={labelStyle}>To date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
                style={{ ...inputStyle, width: '100%', marginTop: 4 }}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div style={{ fontSize: 11, color: '#c0bab2', marginBottom: 12 }}>
        {loading ? 'Loading...' : `${totalCount} log entries`}
        {totalPages > 1 && !loading && ` \u00b7 Page ${page + 1} of ${totalPages}`}
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonList rows={8} />
      ) : (
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Timestamp', 'User', 'Action', 'Details'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '11px 20px',
                      textAlign: 'left',
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
              {logs.map(log => (
                <tr
                  key={log.id}
                  style={{ borderBottom: '0.5px solid #f5f2ee', transition: 'background 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FDFCFB' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <td style={{ padding: '12px 20px', fontSize: 11.5, color: '#999', whiteSpace: 'nowrap' }}>
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                    {log.user_name}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: 10.5,
                      fontWeight: 500,
                      padding: '2px 10px',
                      borderRadius: 3,
                      background: '#f7f6f4',
                      color: '#777',
                      border: '0.5px solid #e8e4df',
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 11, color: '#999', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {summarizeMetadata(log.metadata)}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ padding: '48px 20px', textAlign: 'center', fontSize: 12, color: '#ccc' }}
                  >
                    {hasActiveFilters ? 'No logs match your filters.' : 'No audit logs recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between" style={{ marginTop: 16 }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '7px 14px',
              fontSize: 12,
              color: page === 0 ? '#ddd' : '#777',
              background: '#fff',
              border: '0.5px solid #e8e4df',
              borderRadius: 7,
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={14} strokeWidth={1.5} />
            Previous
          </button>
          <div style={{ fontSize: 11, color: '#c0bab2' }}>
            Page {page + 1} of {totalPages}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '7px 14px',
              fontSize: 12,
              color: page >= totalPages - 1 ? '#ddd' : '#777',
              background: '#fff',
              border: '0.5px solid #e8e4df',
              borderRadius: 7,
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Next
            <ChevronRight size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  )
}

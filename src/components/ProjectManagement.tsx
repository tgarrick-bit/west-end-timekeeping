'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Project, Client } from '@/types';

type ProjectRow = Project & {
  client_name?: string | null;
};

type StatusUI = 'active' | 'completed' | 'on-hold';

function getStatusBadge(status: StatusUI) {
  const map: Record<StatusUI, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-blue-100 text-blue-700',
    'on-hold': 'bg-amber-100 text-amber-700',
  };
  return map[status] || map.active;
}

export default function ProjectManagement() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: proj }, { data: clis }] = await Promise.all([
        supabase.from('projects').select('*').order('name', { ascending: true }),
        supabase.from('clients').select('*').order('name', { ascending: true }),
      ]);

      const clientMap = new Map((clis || []).map((c) => [c.id, c.name]));
      const rows: ProjectRow[] = (proj || []).map((p) => ({
        ...p,
        client_name: p.client_id ? clientMap.get(p.client_id) ?? null : null,
      }));

      setProjects(rows);
      setClients(clis || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return projects;
    return projects.filter((p) =>
      (p.name ?? '').toLowerCase().includes(term) ||
      (p.code ?? '').toLowerCase().includes(term) ||
      (p.client_name ?? '').toLowerCase().includes(term)
    );
  }, [projects, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Search projects by name, code, or client…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Project</th>
              <th className="text-left px-4 py-2">Client</th>
              <th className="text-left px-4 py-2">Dates</th>
              <th className="text-left px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-4" colSpan={4}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-4" colSpan={4}>No projects found.</td></tr>
            ) : (
              filtered.map((p) => {
                // Map your backend status to UI status buckets
                const uiStatus: StatusUI =
                  p.status === 'archived' ? 'completed'
                    : p.status === 'inactive' ? 'on-hold'
                      : 'active';

                const start = p.start_date ? new Date(p.start_date) : null;
                const end = p.end_date ? new Date(p.end_date) : null;

                return (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-gray-500">{p.code ?? ''}</div>
                    </td>
                    <td className="px-4 py-2">{p.client_name ?? '-'}</td>
                    <td className="px-4 py-2">
                      {start ? start.toLocaleDateString() : '—'}
                      {end ? ` – ${end.toLocaleDateString()}` : ''}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded ${getStatusBadge(uiStatus)}`}>
                        {uiStatus.replace('-', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

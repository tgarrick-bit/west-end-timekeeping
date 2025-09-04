'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

type EmployeeRow = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: UserRole;
  client_id?: string | null;
  is_active?: boolean | null;
};

type FormState = {
  first_name: string;
  last_name: string;
  role: UserRole;
  client_id: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  first_name: '',
  last_name: '',
  role: 'employee',
  client_id: '',
  is_active: true,
};

export default function EmployeeManagement() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Adjust to your table: 'profiles' is common with Supabase
      const { data } = await supabase.from('profiles').select('*').order('last_name', { ascending: true });
      setRows((data as EmployeeRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return rows;
    return rows.filter((e) =>
      (e.first_name ?? '').toLowerCase().includes(term) ||
      (e.last_name ?? '').toLowerCase().includes(term) ||
      (e.email ?? '').toLowerCase().includes(term)
    );
  }, [rows, search]);

  const startEdit = (emp: EmployeeRow) => {
    setEditing(emp);
    setForm({
      first_name: emp.first_name ?? '',
      last_name: emp.last_name ?? '',
      role: (emp.role as UserRole) ?? 'employee',
      client_id: emp.client_id ?? '',
      is_active: !!emp.is_active,
    });
  };

  const reset = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const save = async () => {
    const payload = {
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      role: form.role,
      client_id: form.client_id || null,
      is_active: !!form.is_active,
    };

    if (editing?.id) {
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', editing.id)
        .select('*')
        .single();
      if (!error && data) {
        setRows((prev) => prev.map((r) => (r.id === data.id ? (data as EmployeeRow) : r)));
        reset();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Search employees…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded shadow p-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">First name</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Last name</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Role</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="client_approver">Client Approver</option>
              <option value="payroll">Payroll</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="is_active"
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            <label htmlFor="is_active">Active</label>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={save} disabled={!editing}>
            Save
          </button>
          <button className="px-4 py-2 rounded bg-gray-100" onClick={reset}>
            Reset
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-4" colSpan={5}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-4" colSpan={5}>No employees found.</td></tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-4 py-2">
                    {(e.first_name ?? '') + ' ' + (e.last_name ?? '')}
                  </td>
                  <td className="px-4 py-2">{e.email}</td>
                  <td className="px-4 py-2 capitalize">{(e.role ?? 'employee').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-2">{(e.is_active ?? true) ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-2 text-right">
                    <button className="px-3 py-1 rounded bg-gray-100" onClick={() => startEdit(e)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

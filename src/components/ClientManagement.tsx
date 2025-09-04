'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';

type ClientForm = {
  name: string;
  code: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  time_tracking_method: 'detailed' | 'simple';
  is_active: boolean;
};

const emptyForm: ClientForm = {
  name: '',
  code: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  time_tracking_method: 'detailed',
  is_active: true,
};

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('clients').select('*').order('name', { ascending: true });
      setClients(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return clients;
    return clients.filter((c) =>
      (c.name ?? '').toLowerCase().includes(term) ||
      (c.code ?? '').toLowerCase().includes(term) ||
      (c.contact_name ?? '').toLowerCase().includes(term) ||
      ((c.contact_email ?? '').toLowerCase().includes(term))
    );
  }, [clients, searchTerm]);

  const startEdit = (client: Client) => {
    setEditing(client);
    setForm({
      name: client.name ?? '',
      code: client.code ?? '',
      contact_name: client.contact_name ?? '',
      contact_email: client.contact_email ?? '',
      contact_phone: client.contact_phone ?? '',
      address: client.address ?? '',
      time_tracking_method: (client as any).time_tracking_method ?? 'detailed',
      is_active: client.is_active ?? true,
    });
  };

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.name.trim()) return;

    const payload = {
      name: form.name,
      code: form.code || null,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || '',
      contact_phone: form.contact_phone || '',
      address: form.address || null,
      time_tracking_method: form.time_tracking_method,
      is_active: !!form.is_active,
    };

    if (editing?.id) {
      const { data, error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', editing.id)
        .select('*')
        .single();

      if (!error && data) {
        setClients((prev) => prev.map((c) => (c.id === data.id ? (data as Client) : c)));
        resetForm();
      }
    } else {
      const { data, error } = await supabase
        .from('clients')
        .insert(payload)
        .select('*')
        .single();

      if (!error && data) {
        setClients((prev) => [data as Client, ...prev]);
        resetForm();
      }
    }
  };

  const toggleActive = async (client: Client) => {
    const is_active = !(client.is_active ?? true);
    const { data, error } = await supabase
      .from('clients')
      .update({ is_active })
      .eq('id', client.id)
      .select('*')
      .single();

    if (!error && data) {
      setClients((prev) => prev.map((c) => (c.id === client.id ? (data as Client) : c)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Search clients by name, code, or contact…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          className="px-4 py-2 rounded bg-gray-100"
          onClick={resetForm}
        >
          New
        </button>
      </div>

      <div className="bg-white rounded shadow p-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Code</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Contact Name</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.contact_name}
              onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Contact Email</label>
            <input
              type="email"
              className="border rounded px-3 py-2 w-full"
              value={form.contact_email}
              onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Contact Phone</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.contact_phone}
              onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Address</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Time Tracking</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={form.time_tracking_method}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  time_tracking_method: e.target.value as 'detailed' | 'simple',
                }))
              }
            >
              <option value="detailed">Detailed</option>
              <option value="simple">Simple</option>
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
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white"
            onClick={save}
          >
            {editing ? 'Update Client' : 'Create Client'}
          </button>
          {editing && (
            <button className="px-4 py-2 rounded bg-gray-100" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Contact</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-4" colSpan={5}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-4" colSpan={5}>No clients found.</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.contact_name ?? '-'}</td>
                  <td className="px-4 py-2">{c.contact_email ?? '-'}</td>
                  <td className="px-4 py-2">{(c.is_active ?? true) ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button className="px-3 py-1 rounded bg-gray-100" onClick={() => startEdit(c)}>
                      Edit
                    </button>
                    <button className="px-3 py-1 rounded bg-gray-100" onClick={() => toggleActive(c)}>
                      {(c.is_active ?? true) ? 'Deactivate' : 'Activate'}
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


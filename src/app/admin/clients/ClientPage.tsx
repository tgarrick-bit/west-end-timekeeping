'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Mail,
  Phone,
  GitBranch,
} from 'lucide-react';
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton';

interface Client {
  id: string;
  name: string;
  code: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  bill_rate?: number;
  contract_start?: string;
  contract_end?: string;
  is_active: boolean;
  employee_count?: number;
  project_count?: number;
  created_at: string;
}

interface ClientFormData {
  name: string;
  code: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  bill_rate: number;
  contract_start: string;
  contract_end: string;
  is_active: boolean;
}

interface Department {
  id: string;
  client_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
}

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Department management state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptClient, setDeptClient] = useState<Client | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptFormName, setDeptFormName] = useState('');
  const [deptFormCode, setDeptFormCode] = useState('');
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const initialFormData: ClientFormData = {
    name: '',
    code: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: 'OK',
    zip: '',
    bill_rate: 150,
    contract_start: new Date().toISOString().split('T')[0],
    contract_end: '',
    is_active: true
  };

  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [activeFilter, setActiveFilter] = useState<'active' | 'inactive' | 'all'>('active');

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, activeFilter]);

  const fetchClients = async () => {
    try {
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // Get employee and project counts for each client
      const clientsWithCounts = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { count: employeeCount } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

          const { count: projectCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

          return {
            ...client,
            employee_count: employeeCount || 0,
            project_count: projectCount || 0
          };
        })
      );

      setClients(clientsWithCounts);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    // Active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter(client => client.is_active);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(client => !client.is_active);
    }

    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredClients(filtered);
  };

  const handleAddClient = async () => {
    try {
      if (!formData.name.trim() || !formData.code.trim()) {
        alert('Please enter at least a client name and code.');
        return;
      }

      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        contact_name: formData.contact_name.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state || null,
        zip: formData.zip.trim() || null,
        bill_rate: isNaN(formData.bill_rate) ? null : formData.bill_rate,
        contract_start: formData.contract_start || null,
        contract_end: formData.contract_end || null,
        is_active: formData.is_active,
      };

      const { error } = await supabase
        .from('clients')
        .insert([payload]);

      if (error) {
        console.error('Supabase insert error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        alert(`Error adding client: ${error.message}`);
        return;
      }

      setShowAddModal(false);
      setFormData(initialFormData);
      fetchClients();
    } catch (error) {
      console.error('Unexpected error adding client:', error);
      alert('Unexpected error adding client. Check console for details.');
    }
  };

  const handleUpdateClient = async () => {
    if (!selectedClient) return;

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        contact_name: formData.contact_name.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state || null,
        zip: formData.zip.trim() || null,
        bill_rate: isNaN(formData.bill_rate) ? null : formData.bill_rate,
        contract_start: formData.contract_start || null,
        contract_end: formData.contract_end || null,
        is_active: formData.is_active,
      };

      const { error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', selectedClient.id);

      if (error) {
        console.error('Supabase update error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        alert(`Error updating client: ${error.message}`);
        return;
      }

      setShowEditModal(false);
      setSelectedClient(null);
      setFormData(initialFormData);
      fetchClients();
    } catch (error) {
      console.error('Unexpected error updating client:', error);
      alert('Unexpected error updating client. Check console for details.');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this client?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      fetchClients();
    } catch (error) {
      console.error('Error deactivating client:', error);
      alert('Error deactivating client');
    }
  };

  const handleReactivateClient = async (id: string) => {
    if (!confirm('Are you sure you want to reactivate this client?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;
      fetchClients();
    } catch (error) {
      console.error('Error reactivating client:', error);
      alert('Error reactivating client');
    }
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      code: client.code,
      contact_name: client.contact_name || '',
      contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || 'OK',
      zip: client.zip || '',
      bill_rate: client.bill_rate || 150,
      contract_start: client.contract_start || '',
      contract_end: client.contract_end || '',
      is_active: client.is_active
    });
    setShowEditModal(true);
  };

  // --- Department CRUD ---
  const openDeptModal = async (client: Client) => {
    setDeptClient(client);
    setShowDeptModal(true);
    setDeptFormName('');
    setDeptFormCode('');
    setEditingDept(null);
    await fetchDepartments(client.id);
  };

  const fetchDepartments = async (clientId: string) => {
    setDeptLoading(true);
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('client_id', clientId)
      .order('name');
    if (!error && data) setDepartments(data);
    setDeptLoading(false);
  };

  const handleAddDept = async () => {
    if (!deptClient || !deptFormName.trim()) return;
    const { error } = await supabase.from('departments').insert([{
      client_id: deptClient.id,
      name: deptFormName.trim(),
      code: deptFormCode.trim() || null,
      is_active: true,
    }]);
    if (error) {
      alert(error.message.includes('unique') ? 'A department with this name already exists for this client.' : `Error: ${error.message}`);
      return;
    }
    setDeptFormName('');
    setDeptFormCode('');
    await fetchDepartments(deptClient.id);
  };

  const handleUpdateDept = async () => {
    if (!editingDept || !deptFormName.trim()) return;
    const { error } = await supabase
      .from('departments')
      .update({ name: deptFormName.trim(), code: deptFormCode.trim() || null })
      .eq('id', editingDept.id);
    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }
    setEditingDept(null);
    setDeptFormName('');
    setDeptFormCode('');
    if (deptClient) await fetchDepartments(deptClient.id);
  };

  const handleToggleDeptActive = async (dept: Department) => {
    const { error } = await supabase
      .from('departments')
      .update({ is_active: !dept.is_active })
      .eq('id', dept.id);
    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }
    if (deptClient) await fetchDepartments(deptClient.id);
  };

  const handleDeleteDept = async (dept: Department) => {
    if (!confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('departments').delete().eq('id', dept.id);
    if (error) {
      alert(error.message.includes('violates foreign key') ? 'Cannot delete — employees or projects are still assigned to this department. Deactivate it instead.' : `Error: ${error.message}`);
      return;
    }
    if (deptClient) await fetchDepartments(deptClient.id);
  };

  const startEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptFormName(dept.name);
    setDeptFormCode(dept.code || '');
  };

  const cancelEditDept = () => {
    setEditingDept(null);
    setDeptFormName('');
    setDeptFormCode('');
  };

  // Stats
  const activeCount = clients.filter(c => c.is_active).length;
  const inactiveCount = clients.filter(c => !c.is_active).length;
  const totalEmployees = clients.reduce((sum, c) => sum + (c.employee_count || 0), 0);
  const totalProjects = clients.reduce((sum, c) => sum + (c.project_count || 0), 0);

  if (loading) {
    return (
      <div style={{ padding: '36px 40px' }} className="space-y-6">
        <div>
          <div className="anim-shimmer" style={{ width: 120, height: 24, borderRadius: 4, marginBottom: 8 }} />
          <div className="anim-shimmer" style={{ width: 280, height: 14, borderRadius: 4 }} />
        </div>
        <SkeletonStats count={4} />
        <SkeletonList rows={5} />
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '0.5px solid #e8e4df',
    borderRadius: 7,
    fontSize: 12,
    color: '#1a1a1a',
    outline: 'none',
    background: '#fff',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: 1,
    color: '#c0bab2',
    textTransform: 'uppercase',
    marginBottom: 6,
  };

  return (
    <>
      {/* Main Content */}
      <div style={{ padding: '36px 40px' }}>
        {/* Page title */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3, margin: 0 }}>
              Clients
            </h1>
            <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>
              Manage client companies and their details.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#cc1069';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#e31c79';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Add Client
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
          {[
            { label: 'Active Clients', value: activeCount, accent: true },
            { label: 'Inactive', value: inactiveCount },
            { label: 'Total Employees', value: totalEmployees },
            { label: 'Total Projects', value: totalProjects },
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
                e.currentTarget.style.borderColor = i === 0 ? '#e31c79' : '#d3ad6b';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e8e4df';
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

        {/* Search */}
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div className="relative" style={{ maxWidth: 360 }}>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ width: 14, height: 14, color: '#d0cbc4', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: 320,
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
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#d3ad6b';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e8e4df';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'active' | 'inactive' | 'all')}
              style={{ fontSize: 12, padding: '8px 10px', border: '0.5px solid #e8e4df', borderRadius: 7, background: '#fff', color: '#777', outline: 'none', cursor: 'pointer' }}
            >
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
              <option value="all">All statuses</option>
            </select>
            <span style={{ fontSize: 11, color: '#c0bab2' }}>
              Showing <span style={{ fontWeight: 600 }}>{filteredClients.length}</span> of{' '}
              <span style={{ fontWeight: 600 }}>{clients.length}</span> clients
              {' '}({activeCount} active)
            </span>
          </div>
        </div>

        {/* Clients Table Card */}
        <div
          className="anim-slide-up stagger-2"
          style={{
            background: '#fff',
            border: '0.5px solid #e8e4df',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {/* Card header */}
          <div
            style={{
              padding: '14px 22px',
              borderBottom: '0.5px solid #f0ece7',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Building2 style={{ width: 14, height: 14, color: '#c0bab2' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
              All Clients
            </span>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Client', 'Contact', 'Rate', 'Employees', 'Projects', 'Status', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '11px 20px',
                      textAlign: h === 'Actions' ? 'right' : 'left',
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
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  style={{
                    borderBottom: '0.5px solid #f5f2ee',
                    cursor: 'default',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FDFCFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Client name + code */}
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                      {client.name}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#c0bab2', marginTop: 2 }}>
                      {client.code}
                    </div>
                  </td>

                  {/* Contact */}
                  <td style={{ padding: '12px 20px' }}>
                    {client.contact_email ? (
                      <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: '#555' }}>
                        <Mail style={{ width: 11, height: 11, color: '#c0bab2' }} />
                        {client.contact_email}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12.5, color: '#ccc' }}>--</span>
                    )}
                    {client.contact_phone && (
                      <div className="flex items-center gap-1.5" style={{ fontSize: 10.5, color: '#999', marginTop: 2 }}>
                        <Phone style={{ width: 10, height: 10, color: '#c0bab2' }} />
                        {client.contact_phone}
                      </div>
                    )}
                  </td>

                  {/* Bill rate */}
                  <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                    {client.bill_rate ? `$${client.bill_rate}/hr` : '--'}
                  </td>

                  {/* Employee count */}
                  <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                    {client.employee_count}
                  </td>

                  {/* Project count */}
                  <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                    {client.project_count}
                  </td>

                  {/* Status */}
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
                        backgroundColor: client.is_active ? '#f0faf5' : '#f7f6f4',
                        color: client.is_active ? '#2d9b6e' : '#999',
                      }}
                    >
                      <span style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: client.is_active ? '#2d9b6e' : '#ccc',
                      }} />
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openDeptModal(client)}
                        style={{
                          background: '#fff',
                          border: '0.5px solid #e0dcd7',
                          borderRadius: 5,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 10,
                          fontWeight: 500,
                          color: '#777',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.color = '#555'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0dcd7'; e.currentTarget.style.color = '#777'; }}
                        title="Manage Departments"
                      >
                        <GitBranch style={{ width: 11, height: 11 }} />
                        Depts
                      </button>
                      <button
                        onClick={() => openEditModal(client)}
                        style={{
                          background: '#fff',
                          border: '0.5px solid #e0dcd7',
                          borderRadius: 5,
                          padding: '4px 6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'border-color 0.15s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#d3ad6b' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0dcd7' }}
                        title="Edit"
                      >
                        <Edit style={{ width: 12, height: 12, color: '#777' }} />
                      </button>
                      {client.is_active ? (
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          style={{
                            background: '#fff',
                            border: '0.5px solid #e0dcd7',
                            borderRadius: 5,
                            padding: '4px 6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'border-color 0.15s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#b91c1c' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0dcd7' }}
                          title="Deactivate"
                        >
                          <Trash2 style={{ width: 12, height: 12, color: '#777' }} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivateClient(client.id)}
                          style={{
                            background: '#fff',
                            border: '0.5px solid #e0dcd7',
                            borderRadius: 5,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#777',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d9b6e'; e.currentTarget.style.color = '#2d9b6e'; e.currentTarget.style.background = '#ecfdf5'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0dcd7'; e.currentTarget.style.color = '#777'; e.currentTarget.style.background = '#fff'; }}
                          title="Reactivate"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 22px', textAlign: 'center' }}>
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
                      <Building2 style={{ width: 18, height: 18, color: '#d0cbc4' }} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#999', margin: 0 }}>No clients found</p>
                    <p style={{ fontSize: 11, color: '#ccc', marginTop: 4 }}>
                      Try adjusting your search or add a new client.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {/* Department Management Modal */}
      {showDeptModal && deptClient && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} onClick={() => setShowDeptModal(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 12, border: '0.5px solid #e8e4df', width: '100%', maxWidth: 520, maxHeight: '80vh', overflow: 'auto', padding: 0 }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '0.5px solid #f0ece7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>
                  Departments
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                  {deptClient.name} ({deptClient.code})
                </div>
              </div>
              <button onClick={() => setShowDeptModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X style={{ width: 16, height: 16, color: '#999' }} />
              </button>
            </div>

            {/* Add / Edit form */}
            <div style={{ padding: '16px 24px', borderBottom: '0.5px solid #f0ece7', background: '#FDFCFB' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Department Name {!editingDept && <span style={{ color: '#e31c79' }}>*</span>}
                  </label>
                  <input
                    type="text"
                    value={deptFormName}
                    onChange={(e) => setDeptFormName(e.target.value)}
                    placeholder="e.g. Department of Commerce"
                    style={{ width: '100%', fontSize: 12, padding: '7px 10px', border: '0.5px solid #e8e4df', borderRadius: 6, outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e8e4df'; }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Code
                  </label>
                  <input
                    type="text"
                    value={deptFormCode}
                    onChange={(e) => setDeptFormCode(e.target.value)}
                    placeholder="e.g. DOC"
                    style={{ width: '100%', fontSize: 12, padding: '7px 10px', border: '0.5px solid #e8e4df', borderRadius: 6, outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e8e4df'; }}
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
            <div style={{ padding: '0' }}>
              {deptLoading ? (
                <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: 12, color: '#999' }}>Loading…</div>
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
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
                        title="Edit"
                      >
                        <Edit style={{ width: 11, height: 11, color: '#777' }} />
                      </button>
                      <button
                        onClick={() => handleToggleDeptActive(dept)}
                        style={{ background: 'none', border: '0.5px solid #e0dcd7', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', fontSize: 10, color: '#777' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = dept.is_active ? '#b91c1c' : '#2d9b6e'; e.currentTarget.style.color = dept.is_active ? '#b91c1c' : '#2d9b6e'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0dcd7'; e.currentTarget.style.color = '#777'; }}
                        title={dept.is_active ? 'Deactivate' : 'Reactivate'}
                      >
                        {dept.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteDept(dept)}
                        style={{ background: 'none', border: '0.5px solid #e0dcd7', borderRadius: 4, padding: '3px 5px', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#b91c1c'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
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
        </div>
      )}

      {(showAddModal || showEditModal) && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 50 }}
        >
          <div
            className="anim-scale-in"
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '0.5px solid #e8e4df',
              maxWidth: 640,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: '14px 22px',
                borderBottom: '0.5px solid #f0ece7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
                {showAddModal ? 'Add New Client' : 'Edit Client'}
              </span>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setFormData(initialFormData);
                }}
                style={{
                  background: '#fff',
                  border: '0.5px solid #e0dcd7',
                  borderRadius: 5,
                  padding: '4px 6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <X style={{ width: 14, height: 14, color: '#777' }} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 22px' }}>
              <div className="grid grid-cols-2 gap-4">
                {/* Client Name */}
                <div className="col-span-2">
                  <label style={labelStyle}>Client Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>

                {/* Client Code */}
                <div>
                  <label style={labelStyle}>Client Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., CHK001"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>

                {/* Bill Rate */}
                <div>
                  <label style={labelStyle}>Bill Rate ($/hour)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.bill_rate}
                    onChange={(e) => setFormData({ ...formData, bill_rate: parseFloat(e.target.value) })}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Contact Name */}
                <div>
                  <label style={labelStyle}>Contact Name</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Contact Email */}
                <div>
                  <label style={labelStyle}>Contact Email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label style={labelStyle}>Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Contract Start */}
                <div>
                  <label style={labelStyle}>Contract Start</label>
                  <input
                    type="date"
                    value={formData.contract_start}
                    onChange={(e) => setFormData({ ...formData, contract_start: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Contract End */}
                <div>
                  <label style={labelStyle}>Contract End</label>
                  <input
                    type="date"
                    value={formData.contract_end}
                    onChange={(e) => setFormData({ ...formData, contract_end: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Address */}
                <div className="col-span-2">
                  <label style={labelStyle}>Street Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* City */}
                <div>
                  <label style={labelStyle}>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* State */}
                <div>
                  <label style={labelStyle}>State</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    style={{ ...inputStyle, background: '#fff' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="OK">Oklahoma</option>
                    <option value="TX">Texas</option>
                    <option value="AR">Arkansas</option>
                    <option value="KS">Kansas</option>
                    <option value="MO">Missouri</option>
                  </select>
                </div>

                {/* ZIP */}
                <div>
                  <label style={labelStyle}>ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Status */}
                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                    style={{ ...inputStyle, background: '#fff' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#d3ad6b';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e8e4df';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Modal actions */}
              <div className="flex justify-end gap-3" style={{ marginTop: 24 }}>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setFormData(initialFormData);
                  }}
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
                  onClick={showAddModal ? handleAddClient : handleUpdateClient}
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#cc1069';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#e31c79';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {showAddModal ? 'Add Client' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
} from 'lucide-react';

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

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-4 h-4 border-2 border-[#e8e4df] border-t-[#e31c79] rounded-full animate-spin" />
          <p className="text-[13px]" style={{ color: '#bbb' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Content */}
      <div style={{ padding: '36px 40px' }}>
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
              Clients
            </h1>
            <p style={{ fontSize: 13, fontWeight: 400, color: '#bbb', marginTop: 4 }}>
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
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#cc1069')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e31c79')}
          >
            <Plus className="h-4 w-4" />
            Add Client
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6" style={{ maxWidth: 360 }}>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ width: 14, height: 14, color: '#d0cbc4' }}
          />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
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
            onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
          />
        </div>

        {/* Summary line */}
        <div className="mb-4" style={{ fontSize: 12, color: '#999' }}>
          Showing <span style={{ fontWeight: 600 }}>{filteredClients.length}</span> of{' '}
          <span style={{ fontWeight: 600 }}>{clients.length}</span> clients
          {' '}({clients.filter(c => c.is_active).length} active)
        </div>

        {/* Clients Table Card */}
        <div
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
            <Building2 style={{ width: 14, height: 14, color: '#bbb' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
              All Clients
            </span>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th
                  style={{
                    padding: '10px 22px',
                    textAlign: 'left',
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: 1,
                    color: '#ccc',
                    textTransform: 'uppercase',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  Client
                </th>
                <th
                  style={{
                    padding: '10px 22px',
                    textAlign: 'left',
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: 1,
                    color: '#ccc',
                    textTransform: 'uppercase',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  Contact
                </th>
                <th
                  style={{
                    padding: '10px 22px',
                    textAlign: 'left',
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: 1,
                    color: '#ccc',
                    textTransform: 'uppercase',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  Rate
                </th>
                <th
                  style={{
                    padding: '10px 22px',
                    textAlign: 'left',
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: 1,
                    color: '#ccc',
                    textTransform: 'uppercase',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  Employees
                </th>
                <th
                  style={{
                    padding: '10px 22px',
                    textAlign: 'left',
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: 1,
                    color: '#ccc',
                    textTransform: 'uppercase',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  Projects
                </th>
                <th
                  style={{
                    padding: '10px 22px',
                    textAlign: 'left',
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: 1,
                    color: '#ccc',
                    textTransform: 'uppercase',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: '10px 22px',
                    textAlign: 'right',
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: 1,
                    color: '#ccc',
                    textTransform: 'uppercase',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  style={{
                    borderTop: '0.5px solid #f5f2ee',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FDFCFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Client name + code */}
                  <td style={{ padding: '12px 22px' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                      {client.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                      {client.code}
                    </div>
                  </td>

                  {/* Contact */}
                  <td style={{ padding: '12px 22px' }}>
                    {client.contact_email ? (
                      <div className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: '#555' }}>
                        <Mail style={{ width: 11, height: 11, color: '#ccc' }} />
                        {client.contact_email}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12.5, color: '#ccc' }}>--</span>
                    )}
                    {client.contact_phone && (
                      <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                        <Phone style={{ width: 10, height: 10, color: '#ccc' }} />
                        {client.contact_phone}
                      </div>
                    )}
                  </td>

                  {/* Bill rate */}
                  <td style={{ padding: '12px 22px', fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                    {client.bill_rate ? `$${client.bill_rate}/hr` : '--'}
                  </td>

                  {/* Employee count */}
                  <td style={{ padding: '12px 22px', fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                    {client.employee_count}
                  </td>

                  {/* Project count */}
                  <td style={{ padding: '12px 22px', fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                    {client.project_count}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 22px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 10,
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 9999,
                        backgroundColor: client.is_active ? '#f0fdf4' : '#f5f5f5',
                        color: client.is_active ? '#22c55e' : '#999',
                      }}
                    >
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 22px', textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
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
                        }}
                        title="Edit"
                      >
                        <Edit style={{ width: 12, height: 12, color: '#777' }} />
                      </button>
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
                        }}
                        title="Deactivate"
                      >
                        <Trash2 style={{ width: 12, height: 12, color: '#777' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 22px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: '#999' }}>No clients found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 50 }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
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
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
                    required
                  />
                </div>

                {/* Client Code */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    Client Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., CHK001"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
                    required
                  />
                </div>

                {/* Bill Rate */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    Bill Rate ($/hour)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.bill_rate}
                    onChange={(e) => setFormData({ ...formData, bill_rate: parseFloat(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
                  />
                </div>

                {/* Contact Name */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
                  />
                </div>

                {/* Contact Email */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
                  />
                </div>

                {/* Contract Start */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    Contract Start
                  </label>
                  <input
                    type="date"
                    value={formData.contract_start}
                    onChange={(e) => setFormData({ ...formData, contract_start: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
                  />
                </div>

                {/* Contract End */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    Contract End
                  </label>
                  <input
                    type="date"
                    value={formData.contract_end}
                    onChange={(e) => setFormData({ ...formData, contract_end: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
                  />
                </div>

                {/* Address */}
                <div className="col-span-2">
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
                  />
                </div>

                {/* City */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
                  />
                </div>

                {/* State */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    State
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                      background: '#fff',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
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
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
                  />
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#ccc', textTransform: 'uppercase', marginBottom: 6 }}>
                    Status
                  </label>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 7,
                      fontSize: 12,
                      color: '#1a1a1a',
                      outline: 'none',
                      background: '#fff',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#d3ad6b')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e8e4df')}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Modal actions */}
              <div className="flex justify-end gap-3 mt-6">
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
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#cc1069')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e31c79')}
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

'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  X,
  DollarSign,
  Calendar,
  Users,
  FolderOpen,
  Phone,
  Mail,
  MapPin
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
  active: boolean;
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
  active: boolean;
}

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const supabase = createClientComponentClient();
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
    active: true
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
        active: formData.active,
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
        active: formData.active,
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
        .update({ active: false })
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
      active: client.active
    });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Admin Navigation */}
      <header className="bg-[#05202E] text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* LEFT: Back arrow + Logo + Page Title */}
          <div className="flex items-center gap-4">

            {/* Back Arrow */}
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center justify-center h-8 w-8 rounded-full border border-white/20 hover:bg-white/10 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Logo */}
            <Image
              src="/WE-logo-SEPT2024v3-WHT.png"
              alt="West End Workforce"
              width={150}
              height={40}
              className="h-8 w-auto"
              priority
            />

            {/* Page Title + Subtitle */}
            <div className="border-l border-white/20 pl-4">
              <h1 className="text-base font-semibold tracking-wide">Client Management</h1>
              <p className="text-xs text-gray-300">
                Manage client organizations and contracts
              </p>
            </div>
          </div>

          {/* RIGHT: Sign Out */}
          <button
            onClick={() => router.push('/auth/logout')}
            className="text-sm hover:underline flex items-center gap-2"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div
          className="bg-white rounded-lg shadow-sm mb-6 p-4"
          style={{ borderWidth: '1px', borderColor: '#05202e' }}
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-pink text-white rounded-lg hover:bg-pink-600 flex items-center gap-2"
              style={{ backgroundColor: '#e31c79' }}
            >
              <Plus className="h-4 w-4" />
              Add Client
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div
            className="bg-white rounded-lg shadow-sm p-6"
            style={{ borderWidth: '1px', borderColor: '#05202e' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div
            className="bg-white rounded-lg shadow-sm p-6"
            style={{ borderWidth: '1px', borderColor: '#05202e' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clients.filter((c) => c.active).length}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div
            className="bg-white rounded-lg shadow-sm p-6"
            style={{ borderWidth: '1px', borderColor: '#05202e' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clients.reduce((sum, c) => sum + (c.project_count || 0), 0)}
                </p>
              </div>
              <FolderOpen className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              style={{
                borderWidth: '1px',
                borderColor: client.active ? '#05202e' : '#ccc',
              }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{client.name}</h3>
                      <p className="text-sm text-gray-500">Code: {client.code}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      client.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {client.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {client.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{client.contact_email}</span>
                    </div>
                  )}
                  {client.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{client.contact_phone}</span>
                    </div>
                  )}
                  {client.bill_rate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      <span>${client.bill_rate}/hour</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-500">
                      <span className="font-semibold text-gray-700">
                        {client.employee_count}
                      </span>{' '}
                      employees
                    </span>
                    <span className="text-gray-500">
                      <span className="font-semibold text-gray-700">
                        {client.project_count}
                      </span>{' '}
                      projects
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(client)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {showAddModal ? 'Add New Client' : 'Edit Client'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setFormData(initialFormData);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                    placeholder="e.g., CHK001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bill Rate ($/hour)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.bill_rate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bill_rate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_email: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.contract_start}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contract_start: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract End Date
                  </label>
                  <input
                    type="date"
                    value={formData.contract_end}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contract_end: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        city: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        state: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  >
                    <option value="OK">Oklahoma</option>
                    <option value="TX">Texas</option>
                    <option value="AR">Arkansas</option>
                    <option value="KS">Kansas</option>
                    <option value="MO">Missouri</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        zip: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.active ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        active: e.target.value === 'active',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setFormData(initialFormData);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={showAddModal ? handleAddClient : handleUpdateClient}
                  className="px-4 py-2 text-white rounded-lg hover:opacity-90"
                  style={{ backgroundColor: '#e31c79' }}
                >
                  {showAddModal ? 'Add Client' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft,
  Save,
  X,
  Plus,
  Trash2,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Settings,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  Check
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  short_name?: string;
  project_number?: string;
  client_id: string;
  client_name?: string;
  start_date?: string;
  end_date?: string;
  department?: string;
  track_time: boolean;
  track_expenses: boolean;
  is_billable: boolean;
  billing_rate?: number;
  budget?: number;
  active_po?: string;
  invoice_item?: string;
  ar_account?: string;
  ap_contact?: string;
  company_name?: string;
  shipping_company?: string;
  invoice_address?: string;
  shipping_address?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  pay_rate?: number;
  bill_rate?: number;
}

interface TimeApprover {
  id: string;
  project_id: string;
  employee_id: string;
  can_approve: boolean;
}

type TabType = 'overview' | 'details' | 'budget' | 'invoicing' | 'people' | 'approvers' | 'time-settings';

export default function ProjectEditPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const supabase = createClientComponentClient();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [project, setProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projectEmployees, setProjectEmployees] = useState<any[]>([]);
  const [approvers, setApprovers] = useState<TimeApprover[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Project>>({});

  // Time Settings specific state
  const [timeTypes, setTimeTypes] = useState([{ name: 'Regular Time', bill_multiplier: 1, pay_multiplier: 1 }]);
  const [customTimeTypes, setCustomTimeTypes] = useState(false);
  const [splitTimeRule, setSplitTimeRule] = useState('company');
  const [maxHoursPerDay, setMaxHoursPerDay] = useState('');
  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState('');
  const [timeIncrements, setTimeIncrements] = useState('');
  const [projectHoursAlert, setProjectHoursAlert] = useState('');

  useEffect(() => {
    if (projectId && projectId !== 'new') {
      loadProject();
    } else {
      setLoading(false);
    }
    loadClients();
    loadEmployees();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      
      setProject(data);
      setFormData(data);

      // Load project employees
      const { data: empData } = await supabase
        .from('project_employees')
        .select(`
          *,
          employee:employee_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('project_id', projectId);

      setProjectEmployees(empData || []);

      // Load approvers
      const { data: approverData } = await supabase
        .from('time_approvers')
        .select(`
          *,
          employee:employee_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('project_id', projectId);

      setApprovers(approverData || []);

    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { data } = await supabase
        .from('clients')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, role')
        .order('last_name');
      
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (projectId === 'new') {
        // Create new project
        const { data, error } = await supabase
          .from('projects')
          .insert([formData])
          .select()
          .single();

        if (error) throw error;
        router.push(`/admin/projects/${data.id}`);
      } else {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update(formData)
          .eq('id', projectId);

        if (error) throw error;
      }
      
      alert('Project saved successfully!');
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmployee = async (employeeId: string, payRate: number, billRate: number) => {
    try {
      const { error } = await supabase
        .from('project_employees')
        .insert({
          project_id: projectId,
          employee_id: employeeId,
          pay_rate: payRate,
          bill_rate: billRate,
          is_active: true
        });

      if (error) throw error;
      loadProject();
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };

  const handleRemoveEmployee = async (projectEmployeeId: string) => {
    try {
      const { error } = await supabase
        .from('project_employees')
        .delete()
        .eq('id', projectEmployeeId);

      if (error) throw error;
      loadProject();
    } catch (error) {
      console.error('Error removing employee:', error);
    }
  };

  const handleAddApprover = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from('time_approvers')
        .insert({
          project_id: projectId,
          employee_id: employeeId,
          can_approve: true
        });

      if (error) throw error;
      loadProject();
    } catch (error) {
      console.error('Error adding approver:', error);
    }
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview' },
    { id: 'details' as TabType, label: 'Details' },
    { id: 'budget' as TabType, label: 'Budget' },
    { id: 'invoicing' as TabType, label: 'Invoicing' },
    { id: 'people' as TabType, label: 'People' },
    { id: 'approvers' as TabType, label: 'Approvers' },
    { id: 'time-settings' as TabType, label: 'Time Settings' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#05202E] text-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/projects')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold">
                  Settings / Projects / {formData.name || 'New Project'}
                </h1>
                <p className="text-sm text-gray-300">
                  {formData.client_name ? `Client: ${formData.client_name}` : 'Project Configuration'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                formData.is_active ? 'bg-green-500' : 'bg-gray-500'
              }`}>
                {formData.is_active ? 'Active' : 'Inactive'}
              </span>
              <button className="text-white hover:text-gray-300">Settings</button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="px-6">
          <div className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#e31c79] text-[#e31c79]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">Project Overview</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <div className="text-lg font-semibold">{formData.name || 'Not set'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <div className="text-lg">{formData.client_name || 'Not set'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Dates</label>
                  <div className="text-lg">
                    From {formData.start_date || 'Not set'} to {formData.end_date || 'forever'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department/Class</label>
                  <div className="text-lg">{formData.department || 'None'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Track Time</label>
                  <div className="text-lg font-semibold text-green-600">
                    {formData.track_time ? 'YES' : 'NO'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Track Expenses</label>
                  <div className="text-lg font-semibold text-green-600">
                    {formData.track_expenses ? 'YES' : 'NO'}
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Budget</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                    <div className="text-lg">{formData.budget || 0}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Active P.O.</label>
                    <div className="text-lg">{formData.active_po || 'None'}</div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Invoicing</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Project</label>
                    <div className="text-lg font-semibold text-green-600">
                      {formData.is_billable ? 'YES' : 'NO'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Create Invoices</label>
                    <div className="text-lg">(Company Setting)</div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">People</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager</label>
                  <div className="text-lg">Not assigned</div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Time Settings</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supported Time Types</label>
                    <div className="text-lg">Regular Time</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Approvers</label>
                    <div className="text-lg">{approvers.length} approver(s)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">Project Details</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <select
                    value={formData.client_id || ''}
                    onChange={(e) => {
                      const client = clients.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        client_id: e.target.value,
                        client_name: client?.name
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short Name
                  </label>
                  <input
                    type="text"
                    value={formData.short_name || ''}
                    onChange={(e) => setFormData({...formData, short_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number
                  </label>
                  <input
                    type="text"
                    value={formData.project_number || ''}
                    onChange={(e) => setFormData({...formData, project_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Project Dates</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From
                    </label>
                    <input
                      type="date"
                      value={formData.start_date || ''}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To
                    </label>
                    <input
                      type="date"
                      value={formData.end_date || ''}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Category</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department/Class
                  </label>
                  <select
                    value={formData.department || ''}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
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
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Roles</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center">
                    <label className="text-sm font-medium text-gray-700 mr-4">
                      Track Time on this Project
                    </label>
                    <button
                      onClick={() => setFormData({...formData, track_time: !formData.track_time})}
                      className={`px-4 py-2 rounded font-semibold ${
                        formData.track_time ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {formData.track_time ? 'YES' : 'NO'}
                    </button>
                  </div>
                  <div className="flex items-center">
                    <label className="text-sm font-medium text-gray-700 mr-4">
                      Track Expenses on this Project
                    </label>
                    <button
                      onClick={() => setFormData({...formData, track_expenses: !formData.track_expenses})}
                      className={`px-4 py-2 rounded font-semibold ${
                        formData.track_expenses ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {formData.track_expenses ? 'YES' : 'NO'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Budget Tab */}
        {activeTab === 'budget' && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">Budget</h2>
            <div className="space-y-6">
              <div>
                <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                  Add Budget
                </button>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Purchase Orders</h3>
                <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                  Add P.O. Numbers
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoicing Tab */}
        {activeTab === 'invoicing' && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">Project Invoicing</h2>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <input
                    type="radio"
                    id="not-billable"
                    checked={!formData.is_billable}
                    onChange={() => setFormData({...formData, is_billable: false})}
                  />
                  <label htmlFor="not-billable">This project is not billable</label>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="radio"
                    id="is-billable"
                    checked={formData.is_billable}
                    onChange={() => setFormData({...formData, is_billable: true})}
                  />
                  <label htmlFor="is-billable">This project is billable and we invoice</label>
                  <select className="px-3 py-2 border border-gray-300 rounded-lg">
                    <option>(Company Setting)</option>
                  </select>
                </div>
              </div>

              {formData.is_billable && (
                <>
                  <div className="border-t pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <label>Address invoices to</label>
                      <select className="px-3 py-2 border border-gray-300 rounded-lg">
                        <option>This Project</option>
                      </select>
                      <input type="checkbox" />
                      <label>and create a separate invoice for each person working on this project</label>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Invoice Mapping</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Invoice Item
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                          <option>Default Item</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Accounts Receivable Account
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                          <option>Default Account</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Invoice Contact</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Accounts Payable Contact
                        </label>
                        <input
                          type="text"
                          value={formData.ap_contact || ''}
                          onChange={(e) => setFormData({...formData, ap_contact: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={formData.company_name || ''}
                          onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Shipping Company Name
                        </label>
                        <input
                          type="text"
                          value={formData.shipping_company || ''}
                          onChange={(e) => setFormData({...formData, shipping_company: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Invoice Address
                        </label>
                        <textarea
                          value={formData.invoice_address || ''}
                          onChange={(e) => setFormData({...formData, invoice_address: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Shipping Address
                        </label>
                        <textarea
                          value={formData.shipping_address || ''}
                          onChange={(e) => setFormData({...formData, shipping_address: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* People Tab */}
        {activeTab === 'people' && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">People</h2>
            
            <div className="mb-6">
              <h3 className="font-semibold mb-4">Access</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Track time for: 
                    <select className="ml-2 px-3 py-1 border border-gray-300 rounded">
                      <option>only selected time users</option>
                      <option>all time users</option>
                    </select>
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Track expenses for: 
                    <select className="ml-2 px-3 py-1 border border-gray-300 rounded">
                      <option>only selected expense users</option>
                      <option>all expense users</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-4">Project Payables</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input type="radio" id="not-payable" name="payable" />
                  <label htmlFor="not-payable">This project is not payable</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="radio" id="is-payable" name="payable" defaultChecked />
                  <label htmlFor="is-payable">This project is payable</label>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-4">Project Rates</h3>
              <div className="flex items-center gap-4 mb-4">
                <input type="radio" id="billing-rate" name="rate-type" defaultChecked />
                <label htmlFor="billing-rate">Use the billing rate for each person and task</label>
                <span className="ml-4">Bill everyone <input type="number" className="w-20 px-2 py-1 border rounded" placeholder="$" /> per hour</span>
              </div>
              <div className="flex items-center gap-4">
                <input type="radio" id="pay-rate" name="rate-type" />
                <label htmlFor="pay-rate">Use the pay rate for each person and task</label>
                <span className="ml-4">Pay everyone <input type="number" className="w-20 px-2 py-1 border rounded" placeholder="$" /> per hour</span>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">People</h3>
                <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                  Add Person
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Active Dates</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bill Rate</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pay Rate</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice Item</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {projectEmployees.map((pe) => (
                      <tr key={pe.id}>
                        <td className="px-4 py-2">
                          {pe.employee?.first_name} {pe.employee?.last_name}
                        </td>
                        <td className="px-4 py-2">Current</td>
                        <td className="px-4 py-2">${pe.bill_rate || 0}</td>
                        <td className="px-4 py-2">${pe.pay_rate || 0}</td>
                        <td className="px-4 py-2">Default</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleRemoveEmployee(pe.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Approvers Tab */}
        {activeTab === 'approvers' && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">Approvers</h2>
            
            <div className="mb-6">
              <h3 className="font-semibold mb-4">Manager</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option>Select Manager</option>
                    {employees.filter(e => e.role === 'manager').map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-700 mr-4">
                    Manager approves time
                  </label>
                  <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded">
                    NO
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Time Approvers</h3>
              <div className="mb-4">
                <div className="flex items-center gap-4">
                  <input type="radio" id="any-approver" name="approver-type" defaultChecked />
                  <label htmlFor="any-approver">Any approver can approve time</label>
                </div>
                <div className="flex items-center gap-4">
                  <input type="radio" id="all-approvers" name="approver-type" />
                  <label htmlFor="all-approvers">All approvers must approve time</label>
                </div>
              </div>

              <button className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                Add Time Approvers
              </button>

              <div className="mt-4">
                <input type="checkbox" id="only-use-approvers" />
                <label htmlFor="only-use-approvers" className="ml-2">
                  Only use time approvers on this page
                </label>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Project Burden</h3>
              <div className="flex items-center gap-2">
                <label>When calculating commissions, add a</label>
                <input type="number" className="w-20 px-2 py-1 border rounded" />
                <span>% burden to this project's pay rate</span>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Reps</h3>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                Add Reps
              </button>
            </div>
          </div>
        )}

        {/* Time Settings Tab */}
        {activeTab === 'time-settings' && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">Time Settings</h2>
            
            <div className="mb-6">
              <h3 className="font-semibold mb-4">Time Types</h3>
              <div className="overflow-x-auto mb-4">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Bill Multiplier</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {timeTypes.map((type, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={type.name}
                            className="w-full px-2 py-1 border rounded"
                            readOnly={index === 0}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span>Bill at</span>
                            <input
                              type="number"
                              value={type.bill_multiplier}
                              className="w-16 px-2 py-1 border rounded"
                            />
                            <span>X</span>
                            <span className="ml-4">Pay at</span>
                            <input
                              type="number"
                              value={type.pay_multiplier}
                              className="w-16 px-2 py-1 border rounded"
                            />
                            <span>X</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {index > 0 && (
                            <button className="text-red-600 hover:text-red-800">
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
                onClick={() => setTimeTypes([...timeTypes, { name: '', bill_multiplier: 1, pay_multiplier: 1 }])}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Add Standard Time Type
              </button>

              <div className="mt-4">
                <label>Split Time using this rule:</label>
                <select
                  value={splitTimeRule}
                  onChange={(e) => setSplitTimeRule(e.target.value)}
                  className="ml-2 px-3 py-1 border border-gray-300 rounded"
                >
                  <option value="company">Use My Company settings</option>
                  <option value="custom">Custom rule</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Custom Time Types</h3>
              <div>
                <input
                  type="checkbox"
                  id="custom-types"
                  checked={customTimeTypes}
                  onChange={(e) => setCustomTimeTypes(e.target.checked)}
                />
                <label htmlFor="custom-types" className="ml-2">
                  Custom time types are used on this project
                </label>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Time Policies</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={maxHoursPerDay}
                      onChange={(e) => setMaxHoursPerDay(e.target.value)}
                      className="w-20 px-2 py-1 border rounded"
                      placeholder="8"
                    />
                    <span>hours per person, per day</span>
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border rounded ml-4"
                      placeholder="8"
                    />
                    <span>hours per day</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={maxHoursPerWeek}
                      onChange={(e) => setMaxHoursPerWeek(e.target.value)}
                      className="w-20 px-2 py-1 border rounded"
                      placeholder="40"
                    />
                    <span>hours per person, per week</span>
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border rounded ml-4"
                      placeholder="40"
                    />
                    <span>hours per week</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label>Alert when the total number of hours for this project reaches</label>
                <input
                  type="number"
                  value={projectHoursAlert}
                  onChange={(e) => setProjectHoursAlert(e.target.value)}
                  className="ml-2 w-24 px-2 py-1 border rounded"
                />
              </div>

              <div className="mt-6">
                <label>Track time for this project in</label>
                <input
                  type="number"
                  value={timeIncrements}
                  onChange={(e) => setTimeIncrements(e.target.value)}
                  className="ml-2 w-20 px-2 py-1 border rounded"
                  placeholder="15"
                />
                <span className="ml-2">minute increments</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between mt-6 pt-6 border-t">
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/projects')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              ← Back to List
            </button>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50">
              Cancel
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Save
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save and Exit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
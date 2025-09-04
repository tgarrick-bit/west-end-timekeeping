// app/expense/entry/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  ArrowLeft, Plus, Save, Send, Trash2, Calendar, Upload, 
  DollarSign, Receipt, AlertCircle, Check, Search, 
  Filter, Download, ChevronDown, ChevronUp, Eye, Clock,
  CheckCircle, XCircle, Square, CheckSquare
} from 'lucide-react';

interface ExpenseEntry {
  id: string;
  project_id: string;
  project_name: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string;
  receipt_file?: File | null;
  receipt_url?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  vendor?: string;
  is_billable?: boolean;
}

interface Project {
  id: string;
  name: string;
  client_name?: string;
  is_active: boolean;
}

interface SavedExpense {
  id: string;
  employee_id: string;
  project_id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string;
  receipt_url?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_at?: string;
  vendor?: string;
  is_billable?: boolean;
  created_at: string;
}

const expenseCategories = [
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'mileage', label: 'Mileage', icon: '🚗' },
  { value: 'meals', label: 'Meals & Entertainment', icon: '🍽️' },
  { value: 'accommodation', label: 'Accommodation', icon: '🏨' },
  { value: 'supplies', label: 'Office Supplies', icon: '📎' },
  { value: 'equipment', label: 'Equipment', icon: '💻' },
  { value: 'software', label: 'Software & Subscriptions', icon: '💿' },
  { value: 'training', label: 'Training & Education', icon: '📚' },
  { value: 'communication', label: 'Phone & Internet', icon: '📱' },
  { value: 'parking', label: 'Parking & Tolls', icon: '🅿️' },
  { value: 'shipping', label: 'Shipping & Postage', icon: '📦' },
  { value: 'other', label: 'Other', icon: '📋' }
];

// Smart suggestions based on category
const categorySuggestions: Record<string, string[]> = {
  'meals': ['Business lunch', 'Client dinner', 'Team meeting', 'Coffee meeting'],
  'travel': ['Flight to client', 'Hotel stay', 'Taxi/Uber', 'Train ticket'],
  'mileage': ['Client visit', 'Office commute', 'Site inspection', 'Meeting travel'],
  'supplies': ['Printer paper', 'Ink cartridges', 'Notebooks', 'Pens and pencils'],
  'equipment': ['Computer accessories', 'Monitor', 'Keyboard', 'Mouse'],
  'software': ['Software license', 'Cloud subscription', 'App purchase', 'Domain renewal']
};

export default function ExpenseEntryPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [currentMonth, setCurrentMonth] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<ExpenseEntry[]>([
    {
      id: '1',
      project_id: '',
      project_name: '',
      expense_date: new Date().toISOString().split('T')[0],
      category: '',
      amount: 0,
      description: '',
      receipt_file: null,
      vendor: '',
      is_billable: false,
      status: 'draft'
    }
  ]);
  
  // New state for enhanced features
  const [savedExpenses, setSavedExpenses] = useState<SavedExpense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showRecentExpenses, setShowRecentExpenses] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    checkAuth();
    loadProjects();
    loadRecentExpenses();
    // Set current month
    const today = new Date();
    setCurrentMonth(today.toISOString().slice(0, 7));
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUserEmail(user.email || '');
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        is_active,
        client:clients (
          id,
          name
        )
      `)
      .eq('is_active', true)
      .order('name')
      .limit(500);
    
    if (error) {
      console.error('Error loading projects:', error);
      const { data: fallbackData } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name')
        .limit(500);
      
      const mappedProjects = (fallbackData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        client_name: '',
        is_active: p.is_active !== undefined ? p.is_active : true
      }));
      setProjects(mappedProjects);
    } else {
      const mappedProjects = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        client_name: p.client?.name || '',
        is_active: p.is_active !== undefined ? p.is_active : true
      }));
      setProjects(mappedProjects);
    }
  };

  const loadRecentExpenses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setSavedExpenses(data);
    }
  };

  const updateEntry = (id: string, field: keyof ExpenseEntry, value: any) => {
    setEntries(entries.map((entry: ExpenseEntry) => {
      if (entry.id === id) {
        const updated = { ...entry };
        
        if (field === 'project_id') {
          const selectedProject = projects.find((p: Project) => p.id === value);
          updated.project_id = value as string;
          updated.project_name = selectedProject?.name || '';
        } else if (field === 'amount') {
          updated.amount = parseFloat(value) || 0;
        } else if (field === 'receipt_file') {
          updated.receipt_file = value;
        } else {
          (updated as any)[field] = value;
        }
        
        return updated;
      }
      return entry;
    }));
  };

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload an image (JPG, PNG, GIF) or PDF file');
        return;
      }
      updateEntry(id, 'receipt_file', file);
    }
  };

  const addEntry = () => {
    const newEntry: ExpenseEntry = {
      id: Date.now().toString(),
      project_id: '',
      project_name: '',
      expense_date: new Date().toISOString().split('T')[0],
      category: '',
      amount: 0,
      description: '',
      receipt_file: null,
      vendor: '',
      is_billable: false,
      status: 'draft'
    };
    setEntries([...entries, newEntry]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const calculateTotal = () => {
    return entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  };

  const formatMonthYear = () => {
    if (!currentMonth) return '';
    const [year, month] = currentMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
  
      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('expense-receipts')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      return null;
    }
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please login to submit expenses');
        return;
      }

      // Handle selected entries for bulk submission
      const entriesToSubmit = selectedEntries.length > 0 
        ? entries.filter(e => selectedEntries.includes(e.id) && e.project_id && e.amount > 0 && e.category)
        : entries.filter(e => e.project_id && e.amount > 0 && e.category);

      if (entriesToSubmit.length === 0) {
        alert('Please complete at least one expense entry with project, category, and amount');
        return;
      }

      for (const entry of entriesToSubmit) {
        let receipt_url = null;
        
        if (entry.receipt_file) {
          receipt_url = await uploadReceipt(entry.receipt_file);
        }

        const { error } = await supabase
          .from('expenses')
          .insert({
            employee_id: user.id,
            project_id: entry.project_id,
            expense_date: entry.expense_date,
            category: entry.category,
            amount: entry.amount,
            description: entry.description,
            receipt_url: receipt_url,
            vendor: entry.vendor,
            is_billable: entry.is_billable,
            status: isDraft ? 'draft' : 'submitted',
            submitted_at: isDraft ? null : new Date().toISOString()
          });

        if (error) {
          console.error('Error saving expense:', error);
          alert('Error saving expense. Please try again.');
          return;
        }
      }

      setSuccessMessage(
        isDraft 
          ? `${entriesToSubmit.length} draft${entriesToSubmit.length > 1 ? 's' : ''} saved successfully!` 
          : `${entriesToSubmit.length} expense${entriesToSubmit.length > 1 ? 's' : ''} submitted successfully!`
      );
      setShowSuccess(true);
      setSelectedEntries([]);
      
      // Reload recent expenses
      loadRecentExpenses();
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle selection for bulk actions
  const toggleEntrySelection = (id: string) => {
    setSelectedEntries(prev => 
      prev.includes(id) 
        ? prev.filter(entryId => entryId !== id)
        : [...prev, id]
    );
  };

  const selectAllEntries = () => {
    if (selectedEntries.length === entries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(entries.map(e => e.id));
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Amount', 'Category', 'Description', 'Project', 'Vendor', 'Billable'];
    const csvContent = [
      headers.join(','),
      ...entries.map(expense => [
        expense.expense_date,
        expense.amount,
        expense.category,
        `"${expense.description}"`,
        expense.project_name,
        expense.vendor || '',
        expense.is_billable ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${currentMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Filter saved expenses
  const filteredSavedExpenses = savedExpenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || expense.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-700 border-gray-300', icon: Clock },
      submitted: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock },
      approved: { color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-sm bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Expense Submission
                  </h1>
                  <span className="text-xs text-gray-500">Track your business expenses</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
                title="Export to CSV"
              >
                <Download className="h-5 w-5 text-gray-600" />
              </button>
              <span className="text-sm text-gray-500">{userEmail}</span>
              <div className="h-8 w-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-md">
                {userEmail.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 shadow-lg">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-green-800 font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Selection Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Period
                </label>
                <input
                  type="month"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(e.target.value)}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {formatMonthYear()}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {entries.filter(e => e.project_id && e.amount > 0).length} expense{entries.filter(e => e.project_id && e.amount > 0).length !== 1 ? 's' : ''} ready
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar (shows when items are selected) */}
        {selectedEntries.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-purple-600" />
              <span className="text-purple-900 font-medium">
                {selectedEntries.length} expense{selectedEntries.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedEntries([])}
                className="px-4 py-2 text-purple-700 hover:bg-purple-100 rounded-lg transition-all"
              >
                Clear Selection
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50"
              >
                Submit Selected
              </button>
            </div>
          </div>
        )}

        {/* Expense Entries */}
        <div className="space-y-4 mb-6">
          {entries.map((entry, index) => (
            <div key={entry.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedEntries.includes(entry.id)}
                    onChange={() => toggleEntrySelection(entry.id)}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Expense Entry</h3>
                </div>
                {entries.length > 1 && (
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                    aria-label="Remove expense"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={entry.expense_date}
                    onChange={(e) => updateEntry(entry.id, 'expense_date', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={entry.project_id}
                    onChange={(e) => updateEntry(entry.id, 'project_id', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none"
                    required
                  >
                    <option value="">Select a project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} {project.client_name ? `— ${project.client_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={entry.category}
                    onChange={(e) => updateEntry(entry.id, 'category', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none"
                    required
                  >
                    <option value="">Select category...</option>
                    {expenseCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-gray-500">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={entry.amount || ''}
                      onChange={(e) => updateEntry(entry.id, 'amount', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Vendor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor
                  </label>
                  <input
                    type="text"
                    value={entry.vendor || ''}
                    onChange={(e) => updateEntry(entry.id, 'vendor', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="e.g., Office Depot"
                  />
                </div>

                {/* Billable Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`billable-${entry.id}`}
                    checked={entry.is_billable || false}
                    onChange={(e) => updateEntry(entry.id, 'is_billable', e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <label htmlFor={`billable-${entry.id}`} className="ml-2 text-sm text-gray-700">
                    Billable to client
                  </label>
                </div>

                {/* Receipt Upload */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400 cursor-pointer transition-all">
                      <Upload className="h-5 w-5 mr-2 text-gray-500" />
                      <span className="text-gray-700">
                        {entry.receipt_file ? entry.receipt_file.name : 'Choose file or drag here'}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileChange(entry.id, e)}
                        className="hidden"
                      />
                    </label>
                    {entry.receipt_file && (
                      <button
                        onClick={() => updateEntry(entry.id, 'receipt_file', null)}
                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        aria-label="Remove receipt"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Max 5MB • JPG, PNG, GIF, or PDF</p>
                </div>

                {/* Description */}
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={entry.description}
                    onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                    placeholder="Provide details about this expense..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                    rows={2}
                  />
                  
                  {/* Smart Suggestions */}
                  {entry.category && categorySuggestions[entry.category] && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500">Suggestions:</span>
                      {categorySuggestions[entry.category].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => updateEntry(entry.id, 'description', suggestion)}
                          className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Entry Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={addEntry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 group"
          >
            <Plus className="h-5 w-5 text-gray-400 group-hover:text-purple-600" />
            <span className="font-medium text-gray-700 group-hover:text-purple-600">Add Another Expense</span>
          </button>
        </div>

        {/* Total Card */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg p-6 mb-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-white/80 text-sm mb-1">Total Expenses</div>
              <div className="text-3xl font-bold">
                ${calculateTotal().toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-white/80 text-sm mb-1">Valid Entries</div>
              <div className="text-2xl font-semibold">
                {entries.filter(e => e.project_id && e.amount > 0 && e.category).length}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Expenses Section */}
        {savedExpenses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Search..."
                  />
                </div>
                
                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                
                <button
                  onClick={() => setShowRecentExpenses(!showRecentExpenses)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  {showRecentExpenses ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {showRecentExpenses && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSavedExpenses.slice(0, 5).map((expense) => (
                      <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-sm text-gray-900">
                          {new Date(expense.expense_date).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-600">
                          {expenseCategories.find(c => c.value === expense.category)?.label || expense.category}
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-900 max-w-xs truncate">
                          {expense.description}
                        </td>
                        <td className="py-2 px-3 text-sm font-medium text-gray-900">
                          ${expense.amount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3">
                          {getStatusBadge(expense.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredSavedExpenses.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No expenses found
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Info Alert */}
        {entries.some(e => !e.project_id || !e.category || e.amount <= 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-800 text-sm">
                Please complete all required fields (Project, Category, and Amount) for each expense entry before submitting.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={selectAllEntries}
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium flex items-center gap-2"
            >
              {selectedEntries.length === entries.length ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
              Select All
            </button>
          </div>
          
          <div className="flex gap-3 flex-1 sm:flex-initial">
            <button
              onClick={() => handleSubmit(true)}
              disabled={isLoading || entries.filter(e => e.project_id && e.amount > 0 && e.category).length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5" />
              Save Draft
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={isLoading || entries.filter(e => e.project_id && e.amount > 0 && e.category).length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Send className="h-5 w-5" />
              Submit for Approval
            </button>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
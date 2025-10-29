'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  ArrowLeft, Plus, Save, Send, Trash2, Calendar, Upload, 
  DollarSign, Receipt, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';

interface ExpenseEntry {
  id: string;
  date: string;
  project_id: string;
  project_name: string;
  category: string;
  amount: number;
  vendor: string;
  description: string;
  receipt_file?: File | null;
  receipt_url?: string;
}

interface Project {
  id: string;
  name: string;
  is_active: boolean;
}

const expenseCategories = [
  { value: 'airfare', label: 'Airfare' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'incidental', label: 'Incidental' },
  { value: 'lodging', label: 'Lodging' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'meals_and_incidentals_gsa', label: 'Meals and Incidentals(GSA)' },
  { value: 'mileage', label: 'Mileage' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
  { value: 'parking', label: 'Parking' },
  { value: 'rental_car', label: 'Rental Car' }
];

export default function ExpenseEntryPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [expensePeriod, setExpensePeriod] = useState('');
  const [entries, setEntries] = useState<ExpenseEntry[]>([
    {
      id: '1',
      date: new Date().toISOString().split('T')[0],
      project_id: '',
      project_name: '',
      category: '',
      amount: 0,
      vendor: '',
      description: '',
      receipt_file: null
    }
  ]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    checkAuth();
    loadProjects();
    // Set default expense period (current month)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    setExpensePeriod(`${year}-${month}`);
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUserEmail(user.email || '');
    setUserId(user.id);
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error loading projects:', error);
    } else {
      setProjects(data || []);
    }
  };

  const updateEntry = (entryId: string, field: keyof ExpenseEntry, value: any) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        const updated = { ...entry, [field]: value };
        
        if (field === 'project_id') {
          const project = projects.find(p => p.id === value);
          updated.project_name = project?.name || '';
        }
        
        if (field === 'amount') {
          updated.amount = parseFloat(value) || 0;
        }
        
        return updated;
      }
      return entry;
    }));
  };

  const handleFileChange = (entryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      updateEntry(entryId, 'receipt_file', file);
    }
  };

  const addRow = () => {
    const newEntry: ExpenseEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      project_id: '',
      project_name: '',
      category: '',
      amount: 0,
      vendor: '',
      description: '',
      receipt_file: null
    };
    setEntries([...entries, newEntry]);
  };

  const removeRow = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const calculateTotal = () => {
    return entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
  
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
      if (!userId) {
        alert('Please login to submit expenses');
        setIsLoading(false);
        return;
      }

      const validEntries = entries.filter(e => e.project_id && e.amount > 0 && e.category);
      if (validEntries.length === 0) {
        alert('Please complete at least one expense entry');
        setIsLoading(false);
        return;
      }

      for (const entry of validEntries) {
        let receipt_url = null;
        
        if (entry.receipt_file) {
          receipt_url = await uploadReceipt(entry.receipt_file);
        }

        const { error } = await supabase
          .from('expenses')
          .insert({
            employee_id: userId,
            project_id: entry.project_id,
            expense_date: entry.date,
            category: entry.category,
            amount: entry.amount,
            description: entry.description,
            receipt_url: receipt_url,
            vendor: entry.vendor,
            status: isDraft ? 'draft' : 'submitted',
            submitted_at: isDraft ? null : new Date().toISOString()
          });

        if (error) throw error;
      }

      alert(isDraft ? 'Expenses saved as draft!' : 'Expenses submitted successfully!');
      router.push('/employee');
    } catch (error) {
      console.error('Error submitting expenses:', error);
      alert('Error submitting expenses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = expensePeriod.split('-').map(Number);
    const date = new Date(year, month - 1);
    date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setExpensePeriod(`${newYear}-${newMonth}`);
  };

  const formatPeriod = () => {
    if (!expensePeriod) return '';
    const [year, month] = expensePeriod.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const total = calculateTotal();
  const validEntries = entries.filter(e => e.project_id && e.amount > 0 && e.category);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#05202E] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/employee')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-200 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">Expense Submission</h1>
                  <span className="text-xs text-gray-300">Track your business expenses</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-200">{userEmail}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#e31c79]" />
              <label className="text-sm font-medium text-gray-700">Expense Period:</label>
              <input
                type="month"
                value={expensePeriod}
                onChange={(e) => setExpensePeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={() => setExpensePeriod(new Date().toISOString().slice(0, 7))}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                Current Month
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="mt-3 text-center">
            <div className="text-lg font-medium text-gray-900">{formatPeriod()}</div>
            <div className="text-sm text-gray-500 mt-1">
              {validEntries.length} expense{validEntries.length !== 1 ? 's' : ''} ready
            </div>
          </div>
        </div>

        {/* Expense Entries */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="bg-[#05202E] text-white px-4 py-3">
            <h2 className="text-sm font-medium">EXPENSE ENTRY</h2>
          </div>
          <div className="p-6">
            {entries.map((entry, index) => (
              <div key={entry.id} className={index > 0 ? "border-t border-gray-200 pt-6 mt-6" : ""}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#e31c79]/10 p-2 rounded-lg">
                      <span className="text-[#e31c79] font-semibold">{index + 1}</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Entry #{index + 1}</h3>
                  </div>
                  {entries.length > 1 && (
                    <button
                      onClick={() => removeRow(entry.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                    />
                  </div>

                  {/* Project */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={entry.project_id}
                      onChange={(e) => updateEntry(entry.id, 'project_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                    >
                      <option value="">Select a project...</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={entry.category}
                      onChange={(e) => updateEntry(entry.id, 'category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                    >
                      <option value="">Select category...</option>
                      {expenseCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Vendor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor
                    </label>
                    <input
                      type="text"
                      value={entry.vendor}
                      onChange={(e) => updateEntry(entry.id, 'vendor', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                      placeholder="e.g., Office Depot"
                    />
                  </div>

                  {/* Receipt Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Receipt
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-50 border-2 border-dashed border-gray-300 rounded-md hover:bg-gray-100 hover:border-gray-400 cursor-pointer transition-colors">
                        <Upload className="h-5 w-5 mr-2 text-gray-500" />
                        <span className="text-gray-600 text-sm">
                          {entry.receipt_file ? entry.receipt_file.name : 'Choose file'}
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
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Max 5MB • JPG, PNG, GIF, or PDF</p>
                  </div>

                  {/* Description */}
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={entry.description}
                      onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                      placeholder="Provide details about this expense..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79] resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={addRow}
          className="w-full mb-6 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#e31c79] hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center justify-center gap-2">
            <Plus className="h-5 w-5 text-gray-400 group-hover:text-[#e31c79]" />
            <span className="text-gray-600 group-hover:text-[#e31c79] font-medium">Add Another Expense</span>
          </div>
        </button>

        {/* Total Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Expenses</div>
              <div className="text-3xl font-bold text-[#e31c79]">
                ${total.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Entries</div>
              <div className="text-2xl font-semibold text-gray-900">
                {validEntries.length} of {entries.length}
              </div>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        {entries.some(e => !e.project_id || !e.category || e.amount <= 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  Please complete all required fields (Project, Category, and Amount) for each expense entry before submitting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push('/employee')}
            className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={isLoading || validEntries.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={isLoading || validEntries.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#e31c79] text-white rounded-lg hover:bg-[#c91865] transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Submit for Approval
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
// src/app/expense/entry/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import {
  ArrowLeft,
  Plus,
  Save,
  Send,
  Trash2,
  Calendar,
  Upload,
  DollarSign,
  AlertCircle,
  RotateCw,
  LogOut,
  User,
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

interface ExpenseReportRow {
  id: string;
  employee_id: string;
  title: string | null;
  period_month: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

// === GSA / IRS helpers ===
// Update these when rates change.
const GSA_MILEAGE_RATE = 0.7; // IRS standard mileage rate (example)
const GSA_BREAKFAST_LIMIT = 16;
const GSA_LUNCH_LIMIT = 19;
const GSA_DINNER_LIMIT = 28;
const GSA_INCIDENTAL_LIMIT = 5;

const expenseCategories = [
  { value: 'airfare', label: 'Airfare' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'incidental', label: 'Incidental' },
  { value: 'lodging', label: 'Lodging' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'mileage', label: 'Mileage' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
  { value: 'parking', label: 'Parking' },
  { value: 'rental_car', label: 'Rental Car' },
];

// Per-category GSA meal limit
const getGsaMealLimit = (category: string): number | null => {
  switch (category) {
    case 'breakfast':
      return GSA_BREAKFAST_LIMIT;
    case 'lunch':
      return GSA_LUNCH_LIMIT;
    case 'dinner':
      return GSA_DINNER_LIMIT;
    case 'incidental':
      return GSA_INCIDENTAL_LIMIT;
    default:
      return null;
  }
};

const formatCurrency = (amount: number | null | undefined) => {
  if (!amount) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function ExpenseEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();

  const [reportId, setReportId] = useState<string | null>(null);

  const [reportTitle, setReportTitle] = useState('');
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
      receipt_file: null,
    },
  ]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [mileageInputs, setMileageInputs] = useState<Record<string, string>>({});
  const [hasLoadedExisting, setHasLoadedExisting] = useState(false);

  useEffect(() => {
    checkAuth();
    loadProjects();

    // Default to current *date* for new reports
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setExpensePeriod(`${year}-${month}-${day}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUserEmail(user.email || '');
    setUserId(user.id);

    const firstNameFromMeta = (user.user_metadata as any)?.first_name;
    const firstNameFromEmail = user.email
      ? user.email.split('@')[0]
      : null;
    setEmployeeName(firstNameFromMeta || firstNameFromEmail || null);
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, is_active')
      .order('name');

    if (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
      return;
    }

    const all = data || [];
    const active = all.filter((p) => p.is_active === true);
    setProjects(active.length > 0 ? active : all);
  };

  // Load an existing report + lines when ?id=<reportId> or ?reportId=<reportId> present
  useEffect(() => {
    const idFromQuery =
      searchParams.get('id') || searchParams.get('reportId');

    if (!idFromQuery || !userId || hasLoadedExisting || reportId) return;

    const loadExistingReport = async (existingId: string) => {
      try {
        console.log('🧾 Loading existing expense report:', existingId);

        const { data: report, error: reportError } = await supabase
          .from('expense_reports')
          .select('id, employee_id, title, period_month, status')
          .eq('id', existingId)
          .single<ExpenseReportRow>();

        if (reportError || !report) {
          console.error(
            '🧾 Error loading existing report:',
            reportError
          );
          return;
        }

        if (report.employee_id !== userId) {
          console.warn(
            '🧾 Current user does not own this report, skipping load.'
          );
          return;
        }

        setReportId(report.id);
        setReportTitle(report.title || '');

        if (report.period_month) {
          // Ensure YYYY-MM-DD for <input type="date">
          const dateOnly = report.period_month.slice(0, 10);
          setExpensePeriod(dateOnly);
        }

        const { data: lines, error: linesError } = await supabase
          .from('expenses')
          .select(
            'id, expense_date, project_id, category, amount, vendor, description, receipt_url'
          )
          .eq('report_id', existingId)
          .order('expense_date', { ascending: true });

        if (linesError || !lines) {
          console.error(
            '🧾 Error loading expense lines for existing report:',
            linesError
          );
          return;
        }

        const mapped: ExpenseEntry[] = lines.map((line) => ({
          id: line.id,
          date: line.expense_date,
          project_id: line.project_id || '',
          project_name: '', // will be filled via dropdown selection
          category: line.category || '',
          amount: line.amount || 0,
          vendor: line.vendor || '',
          description: line.description || '',
          receipt_file: null, // existing receipts not re-uploaded here
          receipt_url: line.receipt_url || undefined,
        }));

        if (mapped.length > 0) {
          setEntries(mapped);
        }

        setHasLoadedExisting(true);
        console.log(
          '🧾 Existing report + lines loaded for editing:',
          existingId
        );
      } catch (err) {
        console.error('🧾 Unexpected error loading existing report:', err);
      }
    };

    loadExistingReport(idFromQuery);
  }, [searchParams, supabase, userId, hasLoadedExisting, reportId]);

  const updateEntry = (
    entryId: string,
    field: keyof ExpenseEntry,
    value: any
  ) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id === entryId) {
          const updated: ExpenseEntry = { ...entry, [field]: value } as ExpenseEntry;

          if (field === 'project_id') {
            const project = projects.find((p) => p.id === value);
            updated.project_name = project?.name || '';
          }

          if (field === 'amount') {
            updated.amount =
              typeof value === 'number' ? value : parseFloat(value) || 0;
          }

          return updated;
        }
        return entry;
      })
    );
  };

  const handleFileChange = (
    entryId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      receipt_file: null,
    };
    setEntries((prev) => [...prev, newEntry]);
  };

  const removeRow = (id: string) => {
    setEntries((prev) =>
      prev.length > 1 ? prev.filter((entry) => entry.id !== id) : prev
    );
    setMileageInputs((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const calculateTotal = () => {
    return entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
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

  // 🔥 Helper to call the server route that sends manager email
  const callSubmitRoute = async (reportId: string) => {
    console.log('🔥 calling submit API for report:', reportId);
    try {
      const res = await fetch(`/api/expense-reports/${reportId}/submit`, {
        method: 'POST',
      });

      const text = await res.text();
      console.log('🔥 submit API response status:', res.status);
      console.log('🔥 submit API response body:', text);

      if (!res.ok) {
        throw new Error(
          `Expense submit route failed with status ${res.status}. Body: ${text}`
        );
      }

      console.log('🔥 Expense submit route succeeded for report:', reportId);
    } catch (err) {
      console.error('🔥 Error calling expense submit route:', err);
      throw err;
    }
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    setIsLoading(true);
    try {
      if (!userId) {
        alert('Please login to submit expenses');
        return;
      }

      if (!reportTitle.trim()) {
        alert(
          'Please provide a title for this expense submission (e.g., "Trip to HQ").'
        );
        return;
      }

      const validEntries = entries.filter(
        (e) => e.project_id && e.amount > 0 && e.category
      );
      if (validEntries.length === 0) {
        alert('Please complete at least one expense entry');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert('Please login to submit expenses');
        return;
      }

      const authUserId = user.id;

      // Get or create employee with id === authUserId
      let { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('id', authUserId)
        .single();

      if (!employee) {
        const {
          data: newEmployee,
          error: empInsertError,
        } = await supabase
          .from('employees')
          .insert({
            id: authUserId,
            email: user.email,
            first_name: (user.user_metadata as any)?.first_name || 'Unknown',
            last_name: (user.user_metadata as any)?.last_name || 'User',
            role: 'employee',
            is_active: true,
            hourly_rate: 0,
            department: 'General',
          })
          .select('id')
          .single();

        if (empInsertError || !newEmployee) {
          throw empInsertError || new Error('Could not create employee profile');
        }
        employee = newEmployee;
      }

      const employeeId = employee.id;
      const totalAmount = validEntries.reduce(
        (sum, e) => sum + (e.amount || 0),
        0
      );
      const periodMonth = expensePeriod || null;

      let currentReportId = reportId;

      // 1) Create or update the expense report
      if (!currentReportId) {
        const { data: report, error: reportError } = await supabase
          .from('expense_reports')
          .insert({
            employee_id: employeeId,
            title: reportTitle.trim(),
            period_month: periodMonth,
            status: isDraft ? 'draft' : 'submitted',
            total_amount: totalAmount,
            submitted_at: isDraft ? null : new Date().toISOString(),
          })
          .select('id')
          .single();

        if (reportError || !report) {
          throw reportError || new Error('Could not create expense report');
        }

        currentReportId = report.id;
        setReportId(report.id);
        console.log('🔥 created expense report:', report.id);
      } else {
        console.log('🧾 Updating existing expense report:', currentReportId);

        const { error: updateReportError } = await supabase
          .from('expense_reports')
          .update({
            title: reportTitle.trim(),
            period_month: periodMonth,
            status: isDraft ? 'draft' : 'submitted',
            total_amount: totalAmount,
            submitted_at: isDraft ? null : new Date().toISOString(),
          })
          .eq('id', currentReportId);

        if (updateReportError) {
          console.error(
            '🧾 Error updating existing expense report:',
            updateReportError
          );
          throw updateReportError;
        }
      }

      if (!currentReportId) {
        throw new Error('Missing report id after create/update.');
      }

      // 2) Replace existing lines with current entries
      console.log('🧾 Replacing lines for report:', currentReportId);

      const { error: deleteLinesError } = await supabase
        .from('expenses')
        .delete()
        .eq('report_id', currentReportId);

      if (deleteLinesError) {
        console.error(
          '🧾 Error deleting existing expense lines:',
          deleteLinesError
        );
        throw deleteLinesError;
      }

      for (const entry of validEntries) {
        let receipt_url: string | null = entry.receipt_url || null;

        if (entry.receipt_file) {
          receipt_url = await uploadReceipt(entry.receipt_file);
        }

        const { error } = await supabase.from('expenses').insert({
          employee_id: employeeId,
          report_id: currentReportId,
          project_id: entry.project_id,
          expense_date: entry.date,
          category: entry.category,
          amount: entry.amount,
          description: entry.description,
          receipt_url,
          vendor: entry.vendor,
          status: isDraft ? 'draft' : 'submitted',
          submitted_at: isDraft ? null : new Date().toISOString(),
        });

        if (error) {
          console.error(
            '🧾 Error inserting expense line for report',
            currentReportId,
            'entry',
            entry,
            'error:',
            error
          );
          throw error;
        }
      }

      // 3) If this is a real submission, trigger the server route for manager email
      if (!isDraft && currentReportId) {
        console.log(
          '🔥 triggering submit route for expense report:',
          currentReportId
        );
        await callSubmitRoute(currentReportId);
      }

      alert(
        isDraft
          ? 'Expense report saved as draft!'
          : 'Expense report submitted successfully!'
      );

      router.push('/employee');
    } catch (error: any) {
      console.error('Error submitting expenses:', error);
      alert(error?.message || 'Error submitting expenses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const total = calculateTotal();
  const validEntries = entries.filter(
    (e) => e.project_id && e.amount > 0 && e.category
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleRefresh = () => {
    loadProjects();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header – match Employee Portal style */}
      <header className="bg-[#022234] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/employee')}
                className="mr-1 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/WE-logo-SEPT2024v3-WHT.png"
                  alt="West End Workforce"
                  className="h-9 w-9 object-contain"
                />
                <span className="h-6 w-px bg-white/30" />
                <span className="text-sm tracking-wide">
                  Employee Portal
                </span>
                <span className="ml-3 text-xs text-gray-300">
                  Expense Submission
                </span>
              </div>
            </div>
            <div className="flex items-center gap-5 text-sm">
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-1 text-gray-200 hover:text-gray-100"
              >
                <RotateCw className="h-4 w-4" />
                <span className="font-normal">Refresh</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 text-gray-200">
                <User className="h-4 w-4 opacity-80" />
                <span className="font-normal">
                  Good day, {employeeName ? employeeName.split(' ')[0] : 'Employee'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1 text-gray-200 hover:text-gray-100"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-normal">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Report Title + Expense Report Date */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Report Title */}
            <div className="w-full md:w-[60%]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                placeholder='e.g., "Trip to HQ" or "November Client Visits"'
              />
              <p className="mt-2 text-sm text-gray-500">
                This title will appear in your Recent Expenses list as a single row, with
                each line item listed when you open the report.
              </p>
            </div>

            {/* Expense Report Date */}
            <div className="w-full md:w-[32%]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Report Date
              </label>
              <input
                type="date"
                value={expensePeriod}
                onChange={(e) => setExpensePeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
              />
            </div>
          </div>
        </div>

        {/* Expense Entries */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="bg-[#33393c] text-white px-4 py-3">
            <h2 className="text-sm font-medium">EXPENSE ENTRY</h2>
          </div>
          <div className="p-6">
            {entries.map((entry, index) => {
              const isMileage = entry.category === 'mileage';
              const gsaMealLimit = getGsaMealLimit(entry.category);

              const milesInput =
                mileageInputs[entry.id] ??
                (isMileage && entry.amount
                  ? (entry.amount / GSA_MILEAGE_RATE).toFixed(2)
                  : '');

              return (
                <div
                  key={entry.id}
                  className={index > 0 ? 'border-t border-gray-200 pt-6 mt-6' : ''}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#e31c79]/10 px-3 py-2 rounded-lg">
                        <span className="text-[#e31c79] font-semibold">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Entry #{index + 1}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Edit details for this expense line, then save or submit
                          your report.
                        </p>
                      </div>
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

                  {/* Inline GSA / IRS info – guideline only */}
                  {(isMileage || gsaMealLimit !== null) && (
                    <div className="mb-4 flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-700 mt-0.5" />
                      <p className="text-[11px] text-amber-900">
                        {isMileage ? (
                          <>
                            Mileage amounts are based on guideline IRS rates only.
                            Managers may still approve amounts over these
                            guidelines. See{' '}
                            <a
                              href="https://www.irs.gov/tax-professionals/standard-mileage-rates"
                              target="_blank"
                              rel="noreferrer"
                              className="underline font-semibold"
                            >
                              IRS mileage rates
                            </a>
                            .
                          </>
                        ) : gsaMealLimit !== null ? (
                          <>
                            GSA per diem guidelines for{' '}
                            <span className="font-semibold">
                              {entry.category.charAt(0).toUpperCase() +
                                entry.category.slice(1)}
                            </span>{' '}
                            are provided for reference only. Managers may still
                            approve amounts over these guidelines. See{' '}
                            <a
                              href="https://www.gsa.gov/travel/plan-book/per-diem-rates"
                              target="_blank"
                              rel="noreferrer"
                              className="underline font-semibold"
                            >
                              GSA per diem rates
                            </a>
                            .
                          </>
                        ) : null}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) =>
                          updateEntry(entry.id, 'date', e.target.value)
                        }
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
                        onChange={(e) =>
                          updateEntry(entry.id, 'project_id', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                      >
                        <option value="">Select a project...</option>
                        {projects.map((project) => (
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
                        onChange={(e) =>
                          updateEntry(entry.id, 'category', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                      >
                        <option value="">Select category...</option>
                        {expenseCategories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Amount / Mileage */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isMileage ? 'Mileage' : 'Amount'}{' '}
                        <span className="text-red-500">*</span>
                      </label>

                      {isMileage ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={milesInput}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setMileageInputs((prev) => ({
                                  ...prev,
                                  [entry.id]: raw,
                                }));
                                const numeric =
                                  raw.trim() === ''
                                    ? 0
                                    : parseFloat(raw.replace(/,/g, ''));
                                const amount = Number.isNaN(numeric)
                                  ? 0
                                  : numeric * GSA_MILEAGE_RATE;
                                updateEntry(entry.id, 'amount', amount);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                              placeholder="0.0"
                            />
                            <span className="text-xs text-gray-600">miles</span>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Calculated at{' '}
                            <span className="font-semibold">
                              ${GSA_MILEAGE_RATE.toFixed(3)}
                            </span>{' '}
                            per mile (IRS standard mileage rate – informational
                            only).
                          </p>
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-600">
                              $
                            </span>
                            <input
                              type="text"
                              disabled
                              value={
                                entry.amount
                                  ? entry.amount.toFixed(2)
                                  : '0.00'
                              }
                              className="w-full rounded-r-md border border-gray-200 bg-gray-50 text-sm px-3 py-2 text-right"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <div className="absolute left-3 top-2.5 text-gray-500">
                              <DollarSign className="h-5 w-5" />
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              inputMode="decimal"
                              value={
                                entry.amount !== null &&
                                entry.amount !== undefined
                                  ? entry.amount.toString()
                                  : ''
                              }
                              onChange={(e) =>
                                updateEntry(entry.id, 'amount', e.target.value)
                              }
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79] text-right"
                              placeholder="0.00"
                            />
                          </div>
                          {gsaMealLimit !== null && (
                            <p className="mt-1 text-[11px] text-gray-500">
                              Guideline up to{' '}
                              <span className="font-semibold">
                                {formatCurrency(gsaMealLimit)}
                              </span>{' '}
                              based on GSA per diem (informational only).
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Vendor / Trip Details */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isMileage ? 'Trip Details' : 'Vendor'}
                      </label>
                      {isMileage ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={entry.vendor}
                            onChange={(e) =>
                              updateEntry(entry.id, 'vendor', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                            placeholder="Start location (e.g., Calgary HQ)"
                          />
                          <input
                            type="text"
                            value={entry.description}
                            onChange={(e) =>
                              updateEntry(entry.id, 'description', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                            placeholder="End location (e.g., Client Site)"
                          />
                          {(entry.vendor || entry.description) && (
                            <p className="text-[11px] text-gray-500">
                              Stored as “From: {entry.vendor || '—'} · To:{' '}
                              {entry.description || '—'}” for manager review.
                            </p>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={entry.vendor}
                          onChange={(e) =>
                            updateEntry(entry.id, 'vendor', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                          placeholder="e.g., Office Depot"
                        />
                      )}
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
                            {entry.receipt_file
                              ? entry.receipt_file.name
                              : 'Choose file'}
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
                            onClick={() =>
                              updateEntry(entry.id, 'receipt_file', null)
                            }
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Max 5MB • JPG, PNG, GIF, or PDF
                      </p>
                    </div>

                    {/* Description (non-mileage) */}
                    {!isMileage && (
                      <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={entry.description}
                          onChange={(e) =>
                            updateEntry(entry.id, 'description', e.target.value)
                          }
                          placeholder="Provide details about this expense..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79] resize-none"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={addRow}
          className="w-full mb-6 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#e31c79] hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center justify-center gap-2">
            <Plus className="h-5 w-5 text-gray-400 group-hover:text-[#e31c79]" />
            <span className="text-gray-600 group-hover:text-[#e31c79] font-medium">
              Add Another Expense
            </span>
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
        {(!reportTitle.trim() ||
          entries.some((e) => !e.project_id || !e.category || e.amount <= 0)) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  Please provide a report title and complete all required fields
                  (Project, Category, and Amount) for each expense entry before
                  submitting.
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
              disabled={
                isLoading || validEntries.length === 0 || !reportTitle.trim()
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={
                isLoading || validEntries.length === 0 || !reportTitle.trim()
              }
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

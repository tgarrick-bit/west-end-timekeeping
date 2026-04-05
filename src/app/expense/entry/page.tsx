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
  ScanLine,
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
  const [scanningReceipt, setScanningReceipt] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<Record<string, string>>({});

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

  const handleScanReceipt = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    // Need either a file or existing URL
    if (!entry.receipt_file && !entry.receipt_url) {
      setScanMessage(prev => ({ ...prev, [entryId]: 'Please upload a receipt image first.' }));
      setTimeout(() => setScanMessage(prev => { const next = { ...prev }; delete next[entryId]; return next; }), 3000);
      return;
    }

    setScanningReceipt(entryId);
    setScanMessage(prev => { const next = { ...prev }; delete next[entryId]; return next; });

    try {
      // If we have a file but no URL yet, upload it first
      let imageUrl = entry.receipt_url || '';
      if (entry.receipt_file && !imageUrl) {
        const uploaded = await uploadReceipt(entry.receipt_file);
        if (uploaded) {
          imageUrl = uploaded;
          updateEntry(entryId, 'receipt_url', uploaded);
        }
      }

      if (!imageUrl) {
        setScanMessage(prev => ({ ...prev, [entryId]: 'Could not upload receipt for scanning.' }));
        return;
      }

      const res = await fetch('/api/receipts/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      const result = await res.json();

      if (result.success && result.data) {
        // Auto-fill fields from OCR data
        if (result.data.vendor) updateEntry(entryId, 'vendor', result.data.vendor);
        if (result.data.amount) updateEntry(entryId, 'amount', result.data.amount);
        if (result.data.date) updateEntry(entryId, 'date', result.data.date);
        if (result.data.description) updateEntry(entryId, 'description', result.data.description);
        setScanMessage(prev => ({ ...prev, [entryId]: 'Receipt data extracted successfully.' }));
      } else {
        setScanMessage(prev => ({ ...prev, [entryId]: result.message || 'Receipt scanning coming soon -- please enter details manually.' }));
      }
    } catch (err: any) {
      console.error('Receipt scan error:', err);
      setScanMessage(prev => ({ ...prev, [entryId]: 'Receipt scanning coming soon -- please enter details manually.' }));
    } finally {
      setScanningReceipt(null);
      // Clear message after 4 seconds
      setTimeout(() => {
        setScanMessage(prev => { const next = { ...prev }; delete next[entryId]; return next; });
      }, 4000);
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

      // Look up employee record — never auto-create
      let { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('id', authUserId)
        .single();

      if (!employee) {
        alert('Your account is not set up yet. Please contact your administrator.');
        setIsLoading(false);
        return;
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
    <div style={{ padding: '36px 40px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => router.push('/employee')}
          className="transition-colors duration-150"
          style={{ padding: 8, color: '#999', border: '0.5px solid #e0dcd7', borderRadius: 7, background: '#fff' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = '#555'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; e.currentTarget.style.color = '#999'; }}
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>Expense Submission</h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#999' }}>Create and submit expense reports</p>
        </div>
      </div>

      {/* Main Content */}
      <div>
        {/* Report Title + Expense Report Date */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px', marginBottom: 16 }}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            {/* Report Title */}
            <div className="w-full md:w-[60%]">
              <label style={{ display: 'block', fontSize: 10, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 6 }}>
                Report Title <span style={{ color: '#b91c1c' }}>*</span>
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                placeholder='e.g., "Trip to HQ" or "November Client Visits"'
              />
              <p className="mt-2 text-sm text-[#999]">
                This title will appear in your Recent Expenses list as a single row, with
                each line item listed when you open the report.
              </p>
            </div>

            {/* Expense Report Date */}
            <div className="w-full md:w-[32%]">
              <label className="block text-[10px] font-medium tracking-[1px] text-[#c0bab2] uppercase mb-1">
                Expense Report Date
              </label>
              <input
                type="date"
                value={expensePeriod}
                onChange={(e) => setExpensePeriod(e.target.value)}
                className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
              />
            </div>
          </div>
        </div>

        {/* Expense Entries */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>Expense Entry</h2>
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
                  className={index > 0 ? 'border-t border-[#e8e4df] pt-6 mt-6' : ''}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e31c79', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                        {index + 1}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                          Entry #{index + 1}
                        </h3>
                        <p style={{ fontSize: 11, color: '#c0bab2' }}>
                          Edit details for this expense line, then save or submit
                          your report.
                        </p>
                      </div>
                    </div>
                    {entries.length > 1 && (
                      <button
                        onClick={() => removeRow(entry.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: '#b91c1c' }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Inline GSA / IRS info – guideline only */}
                  {(isMileage || gsaMealLimit !== null) && (
                    <div className="mb-4 flex items-start gap-2 rounded-md bg-white border border-[#e8e4df] px-3 py-2">
                      <AlertCircle className="h-3.5 w-3.5 text-[#c4983a] mt-0.5" />
                      <p className="text-[11px] text-[#c4983a]">
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
                      <label className="block text-[10px] font-medium tracking-[1px] text-[#c0bab2] uppercase mb-1">
                        Date <span style={{ color: '#b91c1c' }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) =>
                          updateEntry(entry.id, 'date', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                      />
                    </div>

                    {/* Project */}
                    <div>
                      <label className="block text-[10px] font-medium tracking-[1px] text-[#c0bab2] uppercase mb-1">
                        Project <span style={{ color: '#b91c1c' }}>*</span>
                      </label>
                      <select
                        value={entry.project_id}
                        onChange={(e) =>
                          updateEntry(entry.id, 'project_id', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
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
                      <label className="block text-[10px] font-medium tracking-[1px] text-[#c0bab2] uppercase mb-1">
                        Category <span style={{ color: '#b91c1c' }}>*</span>
                      </label>
                      <select
                        value={entry.category}
                        onChange={(e) =>
                          updateEntry(entry.id, 'category', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
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
                      <label className="block text-[10px] font-medium tracking-[1px] text-[#c0bab2] uppercase mb-1">
                        {isMileage ? 'Mileage' : 'Amount'}{' '}
                        <span style={{ color: '#b91c1c' }}>*</span>
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
                              className="w-full px-3 py-2 border border-[#e8e4df] rounded-md text-right focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                              placeholder="0.0"
                            />
                            <span className="text-xs text-[#777]">miles</span>
                          </div>
                          <p className="text-[11px] text-[#999]">
                            Calculated at{' '}
                            <span className="font-semibold">
                              ${GSA_MILEAGE_RATE.toFixed(3)}
                            </span>{' '}
                            per mile (IRS standard mileage rate – informational
                            only).
                          </p>
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-[#e8e4df] bg-[#FAFAF8] text-sm text-[#777]">
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
                              className="w-full rounded-r-md border border-[#e8e4df] bg-[#FAFAF8] text-sm px-3 py-2 text-right"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <div className="absolute left-3 top-2.5 text-[#999]">
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
                              className="w-full pl-10 pr-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b] text-right"
                              placeholder="0.00"
                            />
                          </div>
                          {gsaMealLimit !== null && (
                            <p className="mt-1 text-[11px] text-[#999]">
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
                      <label className="block text-[10px] font-medium tracking-[1px] text-[#c0bab2] uppercase mb-1">
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
                            className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                            placeholder="Start location (e.g., Calgary HQ)"
                          />
                          <input
                            type="text"
                            value={entry.description}
                            onChange={(e) =>
                              updateEntry(entry.id, 'description', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                            placeholder="End location (e.g., Client Site)"
                          />
                          {(entry.vendor || entry.description) && (
                            <p className="text-[11px] text-[#999]">
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
                          className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]"
                          placeholder="e.g., Office Depot"
                        />
                      )}
                    </div>

                    {/* Receipt Upload */}
                    <div>
                      <label className="block text-[10px] font-medium tracking-[1px] text-[#c0bab2] uppercase mb-1">
                        Receipt
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 flex items-center justify-center px-4 py-2 bg-[#FAFAF8] border-2 border-dashed border-[#e8e4df] rounded-md hover:bg-[#FAFAF8] hover:border-[#e8e4df] cursor-pointer transition-colors">
                          <Upload className="h-5 w-5 mr-2 text-[#999]" />
                          <span className="text-[#777] text-sm">
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
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: '#b91c1c' }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-[#999] flex-1">
                          Max 5MB • JPG, PNG, GIF, or PDF
                        </p>
                        {(entry.receipt_file || entry.receipt_url) && (
                          <button
                            type="button"
                            onClick={() => handleScanReceipt(entry.id)}
                            disabled={scanningReceipt === entry.id}
                            className="flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            style={{
                              padding: '5px 12px',
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#777',
                              background: '#fff',
                              border: '0.5px solid #e0dcd7',
                              borderRadius: 6,
                            }}
                            onMouseEnter={(e) => { if (scanningReceipt !== entry.id) e.currentTarget.style.borderColor = '#d3ad6b' }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7' }}
                          >
                            {scanningReceipt === entry.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#e31c79]" />
                                <span>Scanning...</span>
                              </>
                            ) : (
                              <>
                                <ScanLine className="h-3.5 w-3.5" />
                                <span>Scan Receipt</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      {scanMessage[entry.id] && (
                        <div
                          className="mt-2 flex items-start gap-2 rounded-md px-3 py-2"
                          style={{
                            background: scanMessage[entry.id].includes('successfully') ? 'rgba(45,155,110,0.06)' : 'rgba(196,152,58,0.06)',
                            border: `0.5px solid ${scanMessage[entry.id].includes('successfully') ? 'rgba(45,155,110,0.2)' : 'rgba(196,152,58,0.2)'}`,
                          }}
                        >
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: scanMessage[entry.id].includes('successfully') ? '#2d9b6e' : '#c4983a' }} />
                          <p className="text-[11px]" style={{ color: scanMessage[entry.id].includes('successfully') ? '#2d9b6e' : '#c4983a' }}>
                            {scanMessage[entry.id]}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Description (non-mileage) */}
                    {!isMileage && (
                      <div className="lg:col-span-3">
                        <label className="block text-[10px] font-medium tracking-[1px] text-[#c0bab2] uppercase mb-1">
                          Description
                        </label>
                        <textarea
                          value={entry.description}
                          onChange={(e) =>
                            updateEntry(entry.id, 'description', e.target.value)
                          }
                          placeholder="Provide details about this expense..."
                          className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b] resize-none"
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
          className="w-full transition-colors group"
          style={{ marginBottom: 16, padding: 14, border: '1px dashed #e8e4df', borderRadius: 10, background: '#fff' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus style={{ width: 16, height: 16, color: '#c0bab2' }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: '#999' }}>
              Add Another Expense
            </span>
          </div>
        </button>

        {/* Total Summary */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 4 }}>Total Expenses</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>
                ${total.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 4 }}>Entries</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>
                {validEntries.length} of {entries.length}
              </div>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        {(!reportTitle.trim() ||
          entries.some((e) => !e.project_id || !e.category || e.amount <= 0)) && (
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle style={{ width: 16, height: 16, color: '#c4983a', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 500, color: '#c4983a' }}>
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
            className="transition-colors duration-150"
            style={{ padding: '9px 20px', fontSize: 12, fontWeight: 500, color: '#777', background: '#fff', border: '0.5px solid #e0dcd7', borderRadius: 7 }}
          >
            Cancel
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={
                isLoading || validEntries.length === 0 || !reportTitle.trim()
              }
              className="inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              style={{ padding: '9px 20px', fontSize: 12, fontWeight: 500, color: '#777', background: '#fff', border: '0.5px solid #e0dcd7', borderRadius: 7 }}
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={
                isLoading || validEntries.length === 0 || !reportTitle.trim()
              }
              className="inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              style={{ padding: '9px 20px', fontSize: 12, fontWeight: 600, color: '#fff', background: '#e31c79', border: 'none', borderRadius: 7 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#cc1069')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#e31c79')}
            >
              <Send className="h-4 w-4" />
              Submit for Approval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

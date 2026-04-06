'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import {
  Calendar,
  FileText,
  Receipt,
  AlertCircle,
  Plus,
  Trash2,
  User,
} from 'lucide-react';

interface ExpenseReport {
  id: string;
  employee_id: string;
  title: string;
  period_month: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_amount: number;
  submitted_at: string | null;
  created_at: string;
}

interface ExpenseLine {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string | null;
  vendor?: string | null;
  project_id: string | null;
  receipt_url?: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  project_name?: string | null;
  project_code?: string | null;
  client_name?: string | null;
  rejection_reason?: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
  code: string | null;
  client_name: string | null;
}

// === GSA / IRS helpers ===
const GSA_MILEAGE_RATE = 0.7;
const GSA_BREAKFAST_LIMIT = 16;
const GSA_LUNCH_LIMIT = 19;
const GSA_DINNER_LIMIT = 28;
const GSA_INCIDENTAL_LIMIT = 5;

const CATEGORY_LABELS: Record<string, string> = {
  airfare: 'Airfare',
  breakfast: 'Breakfast',
  dinner: 'Dinner',
  fuel: 'Fuel',
  incidental: 'Incidental',
  lodging: 'Lodging',
  lunch: 'Lunch',
  meals_and_incidentals_gsa: 'Meals and Incidentals (GSA)', // legacy support
  mileage: 'Mileage',
  miscellaneous: 'Miscellaneous',
  parking: 'Parking',
  rental_car: 'Rental Car',
  travel: 'Travel',
  meals: 'Meals',
  accommodation: 'Accommodation',
  supplies: 'Supplies',
  equipment: 'Equipment',
  software: 'Software',
  training: 'Training',
  communication: 'Communication',
  shipping: 'Shipping',
  other: 'Other',
};

// For dropdown: remove the combined M&I option
const CATEGORY_DROPDOWN_KEYS = Object.keys(CATEGORY_LABELS).filter(
  (key) => key !== 'meals_and_incidentals_gsa'
);

const CATEGORY_OPTIONS = CATEGORY_DROPDOWN_KEYS.map((key) => ({
  value: key,
  label: CATEGORY_LABELS[key],
}));

const getCategoryLabel = (category: string) =>
  CATEGORY_LABELS[category] || category;

const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDateInputValue = (dateString: string | null) => {
  if (!dateString) return '';
  return dateString.split('T')[0];
};

const formatCurrency = (amount: number | null | undefined) => {
  if (!amount) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const statusBadge = (status: ExpenseReport['status']) => {
  const base =
    'inline-flex px-2 py-1 rounded text-[9px] font-medium border';
  switch (status) {
    case 'submitted':
      return `${base} bg-white text-[#c4983a] border-[#e8e4df]`;
    case 'approved':
      return `${base} bg-white text-[#2d9b6e] border-[#e8e4df]`;
    case 'rejected':
      return `${base} bg-white text-[#b91c1c] border-[#e8e4df]`;
    default:
      return `${base} bg-[#FAFAF8] text-[#999] border-[#e8e4df]`;
  }
};

const isImageReceipt = (url?: string | null) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.webp')
  );
};

const isPdfReceipt = (url?: string | null) =>
  !!url && url.toLowerCase().endsWith('.pdf');

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

export default function ExpenseReportPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [lines, setLines] = useState<ExpenseLine[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [employeeName, setEmployeeName] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [actionErrorMessage, setActionErrorMessage] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [linesToDelete, setLinesToDelete] = useState<string[]>([]);
  const [receiptFiles, setReceiptFiles] = useState<Record<string, File | null>>(
    {}
  );
  const [mileageInputs, setMileageInputs] = useState<Record<string, string>>(
    {}
  );

  const reportId = params?.id as string | undefined;

  const loadReport = async () => {
    try {
      setIsLoading(true);
      setLoadErrorMessage('');
      setActionErrorMessage('');
      setActionSuccessMessage('');
      setLinesToDelete([]);
      setReceiptFiles({});
      setMileageInputs({});

      if (!reportId) {
        setLoadErrorMessage('No expense report id was provided in the URL.');
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoadErrorMessage(
          'You must be signed in to view this expense report.'
        );
        return;
      }

      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('id', user.id)
        .single();

      if (empError || !employee) {
        setLoadErrorMessage('Employee profile not found.');
        return;
      }

      setEmployeeName(
        employee.first_name
          ? `${employee.first_name} ${employee.last_name || ''}`.trim()
          : null
      );

      // 1) Load the report header
      const { data: reportData, error: reportError } = await supabase
        .from('expense_reports')
        .select('*')
        .eq('id', reportId)
        .eq('employee_id', employee.id)
        .single();

      if (reportError || !reportData) {
        console.error('Error loading expense report:', reportError);
        setLoadErrorMessage('Expense report not found.');
        return;
      }

      // 2) Load all lines that belong to this report
      const { data: lineData, error: lineError } = await supabase
        .from('expenses')
        .select('*')
        .eq('report_id', reportId)
        .order('expense_date', { ascending: true });

      if (lineError) {
        console.error('Error loading expense lines:', lineError);
        setLoadErrorMessage('Unable to load expense lines for this report.');
        return;
      }

      const baseLines = (lineData || []) as ExpenseLine[];

      // Derive overall report status from line statuses (canonical rules)
      const lineStatuses = baseLines.map((l) => l.status);
      let derivedStatus = reportData.status as ExpenseReport['status'];

      if (lineStatuses.length > 0) {
        const allDraft = lineStatuses.every((s) => s === 'draft');
        const allApproved = lineStatuses.every((s) => s === 'approved');
        const hasSubmitted = lineStatuses.some((s) => s === 'submitted');
        const hasRejected = lineStatuses.some((s) => s === 'rejected');

        if (allDraft) {
          derivedStatus = 'draft';
        } else if (allApproved) {
          derivedStatus = 'approved';
        } else if (hasSubmitted) {
          derivedStatus = 'submitted';
        } else if (hasRejected) {
          derivedStatus = 'rejected';
        }
      }

      setReport({
        ...(reportData as ExpenseReport),
        status: derivedStatus,
      });

      // 3) Load ALL active projects (not just ones used in this report),
      //    but fall back to just the projects referenced on this report
      //    if the active-project query returns nothing.
      let projectList: ProjectOption[] = [];

      // First try: all active projects
      const {
        data: activeProjects,
        error: activeProjectsError,
      } = await supabase
        .from('projects')
        .select('id, name, code, client_name')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!activeProjectsError && activeProjects && activeProjects.length > 0) {
        projectList = activeProjects as ProjectOption[];
      } else {
        console.error(
          'Active projects query returned no rows or errored, falling back to projects used on this report:',
          activeProjectsError
        );

        // Fallback: only projects actually used on this report
        const projectIds = [
          ...new Set(
            baseLines
              .map((l) => l.project_id)
              .filter((id): id is string => !!id)
          ),
        ];

        if (projectIds.length > 0) {
          const {
            data: usedProjects,
            error: usedProjectsError,
          } = await supabase
            .from('projects')
            .select('id, name, code, client_name')
            .in('id', projectIds)
            .order('name', { ascending: true });

          if (usedProjectsError) {
            console.error(
              'Error loading fallback projects for expenses:',
              usedProjectsError
            );
          } else if (usedProjects) {
            projectList = usedProjects as ProjectOption[];
          }
        }
      }

      setProjects(projectList);

      const merged = baseLines.map((line) => {
        const proj = projectList.find((p) => p.id === line.project_id);
        return {
          ...line,
          project_name: proj?.name || null,
          project_code: proj?.code || null,
          client_name: proj?.client_name || null,
        };
      });

      setLines(merged);
    } catch (err) {
      console.error('Unexpected error in loadReport:', err);
      setLoadErrorMessage('Something went wrong loading this expense report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasRejectedLine = lines.some((l) => l.status === 'rejected');

  // Page is editable if report is still draft OR there is at least one draft/rejected line
  const hasDraftOrRejectedLine = lines.some(
    (l) => l.status === 'draft' || l.status === 'rejected'
  );
  const isEditable = report?.status === 'draft' || hasDraftOrRejectedLine;

  const computedTotal = lines.reduce((sum, line) => {
    const value = Number.isFinite(line.amount) ? line.amount : 0;
    return sum + (value || 0);
  }, 0);

  const categoryTotals = lines.reduce<Record<string, number>>((acc, line) => {
    if (!line.category) return acc;
    const value = Number.isFinite(line.amount) ? line.amount : 0;
    acc[line.category] = (acc[line.category] || 0) + (value || 0);
    return acc;
  }, {});

  const handleLineChange = (
    index: number,
    field: keyof ExpenseLine,
    value: any
  ) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleProjectChange = (index: number, projectId: string) => {
    const proj = projects.find((p) => p.id === projectId) || null;
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        project_id: proj ? proj.id : null,
        project_name: proj ? proj.name : null,
        project_code: proj ? proj.code : null,
        client_name: proj ? proj.client_name : null,
      };
      return updated;
    });
  };

  const handleAddLine = () => {
    if (!report) return;

    const todayIso = new Date().toISOString().split('T')[0];
    const defaultDate = report.period_month
      ? getDateInputValue(report.period_month)
      : todayIso;

    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `new-${crypto.randomUUID()}`
        : `new-${Date.now()}`;

    const defaultProject = projects[0] || null;

    const newLine: ExpenseLine = {
      id,
      expense_date: defaultDate,
      category: '',
      amount: 0,
      description: '',
      vendor: '',
      project_id: defaultProject ? defaultProject.id : null,
      receipt_url: null,
      status: 'draft',
      project_name: defaultProject ? defaultProject.name : null,
      project_code: defaultProject ? defaultProject.code : null,
      client_name: defaultProject ? defaultProject.client_name : null,
    };

    setLines((prev) => [...prev, newLine]);
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => {
      const line = prev[index];
      if (line && !line.id.startsWith('new-')) {
        setLinesToDelete((prevDelete) => [...prevDelete, line.id]);
      }
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });

    setReceiptFiles((prev) => {
      const copy = { ...prev };
      const line = lines[index];
      if (line) {
        delete copy[line.id];
      }
      return copy;
    });

    setMileageInputs((prev) => {
      const copy = { ...prev };
      const line = lines[index];
      if (line) {
        delete copy[line.id];
      }
      return copy;
    });
  };

  const handleReceiptFileChange = (lineId: string, file: File | null) => {
    setReceiptFiles((prev) => ({
      ...prev,
      [lineId]: file || null,
    }));
  };

  const saveReportAndLines = async (mode: 'draft' | 'submitted') => {
    if (!report) return;
  
    setActionErrorMessage('');
    setActionSuccessMessage('');
  
    // For submit, validate required fields
    if (mode === 'submitted') {
      if (lines.length === 0) {
        setActionErrorMessage(
          'You must have at least one expense entry before submitting.'
        );
        return;
      }
  
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          !line.expense_date ||
          !line.category ||
          !line.amount ||
          line.amount <= 0 ||
          !line.project_id
        ) {
          setActionErrorMessage(
            `Entry #${i + 1} is missing a valid date, project, category, or amount.`
          );
          return;
        }
      }
    }
  
    try {
      setIsSaving(true);
  
      // Determine per-line status changes
      const updatedLines: ExpenseLine[] = lines.map((line) => {
        let newStatus = line.status;
  
        if (mode === 'submitted') {
          // Only move draft/rejected lines to submitted
          if (line.status === 'draft' || line.status === 'rejected') {
            newStatus = 'submitted';
          }
        }
        // mode === 'draft' → do not change status
  
        return {
          ...line,
          status: newStatus,
        };
      });
  
      const newTotal = updatedLines.reduce((sum, line) => {
        const value = Number.isFinite(line.amount) ? line.amount : 0;
        return sum + (value || 0);
      }, 0);
  
      // Update report: Save as Draft should NEVER change status
// Update report: Save as Draft should NEVER change status
const reportUpdate: Partial<ExpenseReport> = {
  total_amount: newTotal,
};

if (mode === 'submitted') {
  reportUpdate.status = 'submitted';
  reportUpdate.submitted_at = new Date().toISOString();
  // no approved_at / rejected_at columns in this table yet
}    
  
      const { error: reportError } = await supabase
        .from('expense_reports')
        .update(reportUpdate)
        .eq('id', report.id);
  
      if (reportError) {
        console.error('Error updating expense report:', reportError);
        throw reportError;
      }
  
      // Handle deletions
      if (linesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('expenses')
          .delete()
          .in('id', linesToDelete);
  
        if (deleteError) {
          console.error('Error deleting expense lines:', deleteError);
          throw deleteError;
        }
      }
  
      const bucketName = 'receipts';
  
      const updatedLinesPayload: {
        line: ExpenseLine;
        isNew: boolean;
        payload: {
          expense_date: string;
          category: string;
          amount: number;
          description: string | null;
          vendor: string | null;
          project_id: string | null;
          status: ExpenseLine['status'];
          receipt_url: string | null;
          report_id: string;
        };
      }[] = [];
  
      // Build all line payloads using updated statuses
      for (const line of updatedLines) {
        const isNew = line.id.startsWith('new-');
  
        // 🔒 IMPORTANT: do NOT try to update existing approved lines.
        // RLS likely forbids employees from modifying approved entries.
        if (!isNew && line.status === 'approved') {
          continue;
        }
  
        const file = receiptFiles[line.id] || null;
        let receiptUrl = line.receipt_url || null;
  
        if (file) {
          const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
          const path = `${report.employee_id}/${report.id}/${line.id}-${Date.now()}-${safeName}`;
  
          const { data: uploadData, error: uploadError } =
            await supabase.storage.from(bucketName).upload(path, file, {
              upsert: true,
            });
  
          if (uploadError) {
            console.error('Error uploading receipt file:', uploadError);
            throw uploadError;
          }
  
          const { data: publicData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(uploadData.path);
  
          receiptUrl = publicData.publicUrl;
        }
  
        const numericAmount =
          Number.isFinite(line.amount) && line.amount !== null
            ? (line.amount as number)
            : 0;
  
        updatedLinesPayload.push({
          line,
          isNew,
          payload: {
            expense_date: line.expense_date,
            category: line.category,
            amount: numericAmount,
            description: line.description || null,
            vendor: line.vendor || null,
            project_id: line.project_id,
            status: line.status, // IMPORTANT: use per-line status, do not override globally
            receipt_url: receiptUrl,
            report_id: report.id,
          },
        });
      }
  
      // Update existing (non-new) lines – only those we allowed above
      const existingPayloads = updatedLinesPayload.filter(
        (item) => !item.isNew
      );
      if (existingPayloads.length > 0) {
        const results = await Promise.all(
          existingPayloads.map(({ line, payload }) =>
            supabase.from('expenses').update(payload).eq('id', line.id)
          )
        );
  
        for (const { error } of results) {
          if (error) {
            console.error('Error updating expense line:', error);
            throw error;
          }
        }
      }
  
      // Insert new lines
      const newPayloads = updatedLinesPayload.filter((item) => item.isNew);
      if (newPayloads.length > 0) {
        const insertPayloads = newPayloads.map(({ payload }) => payload);
        const { error: insertError } = await supabase
          .from('expenses')
          .insert(insertPayloads);
  
        if (insertError) {
          console.error('Error inserting new expense lines:', insertError);
          throw insertError;
        }
      }
  
      setActionSuccessMessage(
        mode === 'submitted'
          ? 'Expenses updated and resubmitted for approval.'
          : 'Expenses updated and saved as draft.'
      );
  
      await loadReport();
    } catch (err) {
      console.error('Error saving expense changes:', err);
      setActionErrorMessage(
        'Unable to save your changes. Please review your entries and try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };
  

  const handleSaveDraft = () => {
    if (!isEditable) return;
    saveReportAndLines('draft');
  };

  const handleResubmit = () => {
    if (!isEditable) return;
    saveReportAndLines('submitted');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleRefresh = () => {
    loadReport();
  };

  // Auto-scroll to first rejected line
  useEffect(() => {
    if (!isLoading) {
      const firstRejected = lines.find((l) => l.status === 'rejected');
      if (firstRejected) {
        const el = document.getElementById(
          `expense-line-${firstRejected.id}`
        );
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }, [isLoading, lines]);

  if (isLoading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        {/* Skeleton loading */}
        <div style={{ marginBottom: 24 }}>
          <div className="anim-shimmer" style={{ width: 200, height: 24, background: '#f0ece7', borderRadius: 6, marginBottom: 8 }} />
          <div className="anim-shimmer" style={{ width: 300, height: 14, background: '#f0ece7', borderRadius: 6 }} />
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px', marginBottom: 16 }}>
          <div className="anim-shimmer" style={{ width: '100%', height: 60, background: '#f0ece7', borderRadius: 6, marginBottom: 12 }} />
          <div className="anim-shimmer" style={{ width: '100%', height: 80, background: '#f0ece7', borderRadius: 6 }} />
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
          <div className="anim-shimmer" style={{ width: '100%', height: 120, background: '#f0ece7', borderRadius: 6 }} />
        </div>
      </div>
    );
  }

  if (loadErrorMessage && !report) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 16, display: 'flex', gap: 8 }}>
          <AlertCircle style={{ width: 16, height: 16, color: '#b91c1c', flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 12.5, fontWeight: 500, color: '#b91c1c' }}>{loadErrorMessage}</span>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const editableEntryBg = isEditable
    ? 'bg-white border-[#e8e4df]'
    : 'bg-[#FAFAF8] border-[#e8e4df]';

  return (
    <div style={{ padding: '36px 40px' }}>
      <div>
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          {/* header */}
          <div style={{ padding: '22px 24px', borderBottom: '0.5px solid #f0ece7', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className={statusBadge(report.status)}>
                  {report.status.charAt(0).toUpperCase() +
                    report.status.slice(1)}
                </span>
                {isEditable && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 500, background: '#FDFCFB', border: '0.5px solid #e8e4df', color: '#c0bab2' }}>
                    Editable
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>
                Expense Report Details
              </h1>
              <p style={{ marginTop: 4, fontSize: 13, color: '#999', display: 'flex', alignItems: 'center', gap: 8 }}>
                {employeeName && (
                  <>
                    <User style={{ width: 12, height: 12, color: '#c0bab2' }} />
                    <span>{employeeName}</span>
                    <span style={{ opacity: 0.4 }}>&bull;</span>
                  </>
                )}
                <Calendar style={{ width: 12, height: 12, color: '#c0bab2' }} />
                <span>
                  Period:{' '}
                  {report.period_month
                    ? formatDate(report.period_month)
                    : formatDate(report.created_at)}
                </span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>
                Total Expenses
              </p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>
                {formatCurrency(computedTotal)}
              </p>
            </div>
          </div>

          {/* body */}
          <div style={{ padding: '22px 24px' }} className="space-y-4">
            {(report.status === 'rejected' || hasRejectedLine) && (
              <div style={{ padding: 16, background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, display: 'flex', gap: 8 }}>
                <AlertCircle style={{ width: 16, height: 16, color: '#b91c1c', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: '#b91c1c' }}>
                    This expense report has rejected entries.
                  </p>
                  <p style={{ marginTop: 4, fontSize: 12.5, fontWeight: 500, color: '#b91c1c' }}>
                    Review the entries highlighted in red, make the required
                    changes, and then resubmit this report for approval.
                  </p>
                </div>
              </div>
            )}

            {actionErrorMessage && (
              <div style={{ padding: 16, background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, display: 'flex', gap: 8 }}>
                <AlertCircle style={{ width: 16, height: 16, color: '#b91c1c', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#b91c1c' }}>
                  {actionErrorMessage}
                </span>
              </div>
            )}
            {actionSuccessMessage && (
              <div style={{ padding: 16, background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#2d9b6e' }}>{actionSuccessMessage}</span>
              </div>
            )}

            {/* title / period card */}
            <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '18px 22px' }}>
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#777] mb-1">
                    Report Title
                  </label>
                  <input
                    type="text"
                    value={report.title}
                    disabled={!isEditable}
                    onChange={(e) => isEditable && setReport({ ...report, title: e.target.value })}
                    className={`w-full rounded-md border border-[#e8e4df] text-sm px-3 py-2 ${isEditable ? 'bg-white text-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#d3ad6b] focus:border-[#d3ad6b]' : 'bg-[#FAFAF8] text-[#555]'}`}
                  />
                  <p className="mt-1 text-[11px] text-[#999]">
                    This title appears in your Recent Expenses list as a single
                    row.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#777] mb-1">
                    Expense Period
                  </label>
                  <input
                    type="month"
                    value={
                      report.period_month
                        ? getDateInputValue(report.period_month).slice(0, 7)
                        : ''
                    }
                    disabled
                    className="w-full rounded-md border border-[#e8e4df] bg-[#FAFAF8] text-sm px-3 py-2 text-[#555]"
                  />
                  <p className="mt-1 text-[11px] text-[#999]">
                    Period used when grouping expenses on your dashboard.
                  </p>
                </div>
              </div>
            </div>

            {/* category summary */}
            {Object.keys(categoryTotals).length > 0 && (
              <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '18px 22px' }}>
                <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 12 }}>
                  Category Summary
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(categoryTotals).map(([category, total]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#FAFAF8] border border-[#f0ece7]"
                    >
                      <span className="text-xs text-[#555]">
                        {getCategoryLabel(category)}
                      </span>
                      <span className="text-xs font-semibold text-[#1a1a1a]">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* expense entry section */}
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '0.5px solid #e8e4df', background: '#fff' }}>
              <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText style={{ width: 14, height: 14, color: '#c0bab2' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const }}>
                    Expense Entry
                  </span>
                </div>
                {isEditable && (
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="inline-flex items-center gap-1 transition-colors"
                    style={{ padding: '7px 16px', fontSize: 11, fontWeight: 600, borderRadius: 7, background: '#e31c79', color: '#fff', border: 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#cc1069')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#e31c79')}
                  >
                    <Plus style={{ width: 12, height: 12 }} />
                    Add Another Expense
                  </button>
                )}
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {lines.length === 0 ? (
                  <p className="text-sm text-[#999]">
                    No expense entries are attached to this report.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {lines.map((line, idx) => {
                      const isMileage = line.category === 'mileage';
                      const gsaMealLimit = getGsaMealLimit(line.category);

                      const milesInput =
                        mileageInputs[line.id] ??
                        (isMileage && line.amount
                          ? (line.amount / GSA_MILEAGE_RATE).toFixed(2)
                          : '');

                      const isRejectedLine = line.status === 'rejected';
                      const isLineEditable =
                        line.status === 'draft' || line.status === 'rejected';

                      const entryBg = isRejectedLine
                        ? 'bg-white border-[#b91c1c]'
                        : editableEntryBg;

                      return (
                        <div
                          key={line.id}
                          id={`expense-line-${line.id}`}
                          className={`rounded-xl border ${entryBg} px-4 py-4 sm:px-5 sm:py-5`}
                        >
                          {/* entry header */}
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2">
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e31c79', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                                {idx + 1}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-[#1a1a1a]">
                                  Entry #{idx + 1}
                                </span>
                                <span className="text-[11px] text-[#999]">
                                  Edit details for this expense line, then save
                                  or resubmit your report.
                                </span>
                                {isRejectedLine && (
                                  <span style={{ marginTop: 4, display: 'inline-flex', padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 500, background: '#fff', border: '0.5px solid #e8e4df', color: '#b91c1c' }}>
                                    Fix now -- this entry was rejected
                                  </span>
                                )}
                                {isRejectedLine && line.rejection_reason && (
                                  <span style={{ marginTop: 4, fontSize: 11, color: '#b91c1c' }}>
                                    Reason: {line.rejection_reason}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isLineEditable && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                className="inline-flex items-center gap-1 text-[11px]"
                                style={{ color: '#b91c1c' }}
                              >
                                <Trash2 className="h-3 w-3" />
                                Remove
                              </button>
                            )}
                          </div>

                          {/* inline GSA / IRS info – guideline only */}
                          {(isMileage || gsaMealLimit !== null) && (
                            <div className="mb-3 flex items-start gap-2 rounded-md bg-white border border-[#e8e4df] px-3 py-2">
                              <AlertCircle className="h-3.5 w-3.5 text-[#c4983a] mt-0.5" />
                              <p className="text-[11px] text-[#c4983a]">
                                {isMileage ? (
                                  <>
                                    Mileage amounts are based on guideline IRS
                                    rates only. Managers may still approve
                                    amounts over these guidelines. See{' '}
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
                                      {getCategoryLabel(line.category)}
                                    </span>{' '}
                                    are provided for reference only. Managers
                                    may still approve amounts over these
                                    guidelines. See{' '}
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

                          {/* fields */}
                          <div className="space-y-4">
                            {/* row 1: date, project, category */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-[#777] mb-1">
                                  Date
                                </label>
                                {isLineEditable ? (
                                  <input
                                    type="date"
                                    className="w-full rounded-md border border-[#e8e4df] bg-white text-sm px-3 py-2"
                                    value={getDateInputValue(
                                      line.expense_date
                                    )}
                                    onChange={(e) =>
                                      handleLineChange(
                                        idx,
                                        'expense_date',
                                        e.target.value
                                      )
                                    }
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    disabled
                                    value={formatDate(line.expense_date)}
                                    className="w-full rounded-md border border-[#e8e4df] bg-[#FAFAF8] text-sm px-3 py-2 text-[#555]"
                                  />
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-[#777] mb-1">
                                  Project
                                </label>
                                {isLineEditable ? (
                                  <select
                                    className="w-full rounded-md border border-[#e8e4df] bg-white text-sm px-3 py-2"
                                    value={line.project_id || ''}
                                    onChange={(e) =>
                                      handleProjectChange(idx, e.target.value)
                                    }
                                  >
                                    <option value="">Select a project…</option>
                                    {projects.map((proj) => (
                                      <option key={proj.id} value={proj.id}>
                                        {proj.name}
                                        {proj.code ? ` (${proj.code})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    disabled
                                    value={
                                      line.project_name
                                        ? `${line.project_name}${
                                            line.project_code
                                              ? ` (${line.project_code})`
                                              : ''
                                          }`
                                        : '—'
                                    }
                                    className="w-full rounded-md border border-[#e8e4df] bg-[#FAFAF8] text-sm px-3 py-2 text-[#555]"
                                  />
                                )}
                                {line.client_name && (
                                  <p className="mt-1 text-[11px] text-[#999]">
                                    {line.client_name}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-[#777] mb-1">
                                  Category
                                </label>
                                {isLineEditable ? (
                                  <select
                                    className="w-full rounded-md border border-[#e8e4df] bg-white text-sm px-3 py-2"
                                    value={line.category || ''}
                                    onChange={(e) =>
                                      handleLineChange(
                                        idx,
                                        'category',
                                        e.target.value
                                      )
                                    }
                                  >
                                    <option value="">Select category…</option>
                                    {CATEGORY_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    disabled
                                    value={getCategoryLabel(line.category)}
                                    className="w-full rounded-md border border-[#e8e4df] bg-[#FAFAF8] text-sm px-3 py-2 text-[#555]"
                                  />
                                )}
                              </div>
                            </div>

                            {/* row 2: amount / mileage, vendor/trip, receipt */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Amount / Mileage */}
                              <div>
                                <label className="block text-xs font-semibold text-[#777] mb-1">
                                  {isMileage ? 'Mileage' : 'Amount'}
                                </label>

                                {isMileage && isLineEditable ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        className="w-full rounded-md border border-[#e8e4df] bg-white text-sm px-3 py-2 text-right"
                                        value={milesInput}
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          setMileageInputs((prev) => ({
                                            ...prev,
                                            [line.id]: raw,
                                          }));
                                          const numeric =
                                            raw.trim() === ''
                                              ? 0
                                              : parseFloat(
                                                  raw.replace(/,/g, '')
                                                );
                                          const amount = Number.isNaN(numeric)
                                            ? 0
                                            : numeric * GSA_MILEAGE_RATE;
                                          handleLineChange(
                                            idx,
                                            'amount',
                                            amount
                                          );
                                        }}
                                        placeholder="0.0"
                                      />
                                      <span className="text-xs text-[#777]">
                                        miles
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#999]">
                                      Calculated at{' '}
                                      <span className="font-semibold">
                                        ${GSA_MILEAGE_RATE.toFixed(3)}
                                      </span>{' '}
                                      per mile (IRS standard mileage rate –
                                      informational only).
                                    </p>
                                    <div className="flex items-center">
                                      <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-[#e8e4df] bg-[#FAFAF8] text-sm text-[#777]">
                                        $
                                      </span>
                                      <input
                                        type="text"
                                        disabled
                                        className="w-full rounded-r-md border border-[#e8e4df] bg-[#FAFAF8] text-sm px-3 py-2 text-right"
                                        value={
                                          line.amount
                                            ? line.amount.toFixed(2)
                                            : '0.00'
                                        }
                                      />
                                    </div>
                                  </div>
                                ) : isLineEditable ? (
                                  <div className="flex items-center">
                                    <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-[#e8e4df] bg-[#FAFAF8] text-sm text-[#777]">
                                      $
                                    </span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      className="w-full rounded-r-md border border-[#e8e4df] bg-white text-sm px-3 py-2 text-right"
                                      value={
                                        line.amount !== null &&
                                        line.amount !== undefined
                                          ? line.amount.toString()
                                          : ''
                                      }
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        const numeric =
                                          raw.trim() === ''
                                            ? 0
                                            : parseFloat(
                                                raw.replace(/,/g, '')
                                              );
                                        handleLineChange(
                                          idx,
                                          'amount',
                                          Number.isNaN(numeric) ? 0 : numeric
                                        );
                                      }}
                                      placeholder="0.00"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <input
                                      type="text"
                                      disabled
                                      value={formatCurrency(line.amount)}
                                      className="w-full rounded-md border border-[#e8e4df] bg-[#FAFAF8] text-sm px-3 py-2 text-right text-[#555]"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Vendor / Locations */}
                              <div>
                                <label className="block text-xs font-semibold text-[#777] mb-1">
                                  {isMileage ? 'Trip Details' : 'Vendor'}
                                </label>
                                {isMileage ? (
                                  isLineEditable ? (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        className="w-full rounded-md border border-[#e8e4df] bg-white text-sm px-3 py-2"
                                        value={line.vendor || ''}
                                        onChange={(e) =>
                                          handleLineChange(
                                            idx,
                                            'vendor',
                                            e.target.value
                                          )
                                        }
                                        placeholder="Start location (e.g., Calgary HQ)"
                                      />
                                      <input
                                        type="text"
                                        className="w-full rounded-md border border-[#e8e4df] bg-white text-sm px-3 py-2"
                                        value={line.description || ''}
                                        onChange={(e) =>
                                          handleLineChange(
                                            idx,
                                            'description',
                                            e.target.value
                                          )
                                        }
                                        placeholder="End location (e.g., Client Site)"
                                      />
                                      {(line.vendor || line.description) && (
                                        <p className="text-[11px] text-[#999]">
                                          Stored as “From:{' '}
                                          {line.vendor || '—'} · To:{' '}
                                          {line.description || '—'}” for manager
                                          review.
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-[#1a1a1a] space-y-1">
                                      <p>
                                        <span className="font-semibold">
                                          From:{' '}
                                        </span>
                                        {line.vendor || '—'}
                                      </p>
                                      <p>
                                        <span className="font-semibold">
                                          To:{' '}
                                        </span>
                                        {line.description || '—'}
                                      </p>
                                    </div>
                                  )
                                ) : isLineEditable ? (
                                  <input
                                    type="text"
                                    className="w-full rounded-md border border-[#e8e4df] bg-white text-sm px-3 py-2"
                                    value={line.vendor || ''}
                                    onChange={(e) =>
                                      handleLineChange(
                                        idx,
                                        'vendor',
                                        e.target.value
                                      )
                                    }
                                    placeholder="e.g., Office Depot"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    disabled
                                    value={line.vendor || '—'}
                                    className="w-full rounded-md border border-[#e8e4df] bg-[#FAFAF8] text-sm px-3 py-2 text-[#555]"
                                  />
                                )}
                              </div>

                              {/* Receipt */}
                              <div>
                                <label className="block text-xs font-semibold text-[#777] mb-1">
                                  Receipt
                                </label>
                                <div className="space-y-1">
                                  {line.receipt_url ? (
                                    <div>
                                      {/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(line.receipt_url) ? (
                                        <a href={line.receipt_url} target="_blank" rel="noreferrer">
                                          <img
                                            src={line.receipt_url}
                                            alt="Receipt"
                                            style={{ maxWidth: 160, maxHeight: 120, borderRadius: 6, border: '0.5px solid #e8e4df', objectFit: 'cover', cursor: 'zoom-in' }}
                                          />
                                        </a>
                                      ) : (
                                        <a
                                          href={line.receipt_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-xs text-[#e31c79] hover:underline"
                                        >
                                          <Receipt className="h-3 w-3" />
                                          <span>View receipt (PDF)</span>
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-[#999]">
                                      No receipt currently attached.
                                    </p>
                                  )}

                                  {isLineEditable && (
                                    <label className="mt-1 flex items-center justify-center gap-1 border border-dashed border-[#e8e4df] rounded-md px-3 py-2 text-[11px] text-[#777] bg-white cursor-pointer hover:border-[#e31c79]/70 hover:text-[#e31c79]">
                                      <Receipt className="h-3 w-3" />
                                      <span>
                                        {receiptFiles[line.id]
                                          ? 'Receipt selected'
                                          : line.receipt_url
                                          ? 'Replace receipt'
                                          : 'Choose file'}
                                      </span>
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*,application/pdf"
                                        onChange={(e) =>
                                          handleReceiptFileChange(
                                            line.id,
                                            e.target.files?.[0] || null
                                          )
                                        }
                                      />
                                    </label>
                                  )}
                                  {receiptFiles[line.id] && (
                                    <p className="text-[10px] text-[#999]">
                                      {receiptFiles[line.id]?.name}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-[#bbb]">
                                    Max 5MB · JPG, PNG, GIF, or PDF
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* row 3: description – only for non-mileage */}
                            {line.category !== 'mileage' && (
                              <div>
                                <label className="block text-xs font-semibold text-[#777] mb-1">
                                  Description
                                </label>
                                {isLineEditable ? (
                                  <textarea
                                    className="w-full rounded-md border border-[#e8e4df] bg-white text-sm px-3 py-2 min-h-[60px]"
                                    value={line.description || ''}
                                    onChange={(e) =>
                                      handleLineChange(
                                        idx,
                                        'description',
                                        e.target.value
                                      )
                                    }
                                    placeholder="Provide details about this expense..."
                                  />
                                ) : (
                                  <textarea
                                    disabled
                                    className="w-full rounded-md border border-[#e8e4df] bg-[#FAFAF8] text-sm px-3 py-2 min-h-[60px] text-[#555]"
                                    value={line.description || '—'}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* footer / buttons */}
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-dashed border-[#e8e4df]">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs font-semibold text-[#777]">
                        Total Expenses
                      </p>
                      <p className="text-base font-bold text-[#e31c79]">
                        {formatCurrency(computedTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#777]">
                        Entries
                      </p>
                      <p className="text-sm text-[#1a1a1a]">
                        {lines.length} of {lines.length}
                      </p>
                    </div>
                  </div>

                  {isEditable ? (
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end w-full sm:w-auto">
                      {report.status === 'draft' && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Delete this draft expense report? This cannot be undone.')) return;
                            try {
                              await supabase.from('expenses').delete().eq('report_id', report.id);
                              await supabase.from('expense_reports').delete().eq('id', report.id);
                              router.push('/employee');
                            } catch (err) {
                              console.error('Error deleting report:', err);
                            }
                          }}
                          className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-md border border-[#b91c1c] text-[#b91c1c] bg-white hover:bg-[#fef2f2]"
                        >
                          Delete Draft
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push('/employee')}
                        className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-md border border-[#e8e4df] text-[#555] bg-white hover:bg-[#FAFAF8]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                        className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-md border border-[#e8e4df] text-[#555] bg-[#FAFAF8] hover:bg-[#f5f2ee] disabled:opacity-60"
                      >
                        {isSaving ? 'Saving…' : 'Save as Draft'}
                      </button>
                      <button
                        type="button"
                        onClick={handleResubmit}
                        disabled={isSaving}
                        className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-md border border-[#e31c79] bg-white text-[#e31c79] hover:bg-[#ffe5f1] disabled:opacity-60"
                      >
                        {isSaving ? 'Submitting…' : 'Submit for Approval'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end w-full">
                      <button
                        type="button"
                        onClick={() => router.push('/employee')}
                        className="px-4 py-2 text-xs font-medium rounded-md border border-[#e8e4df] text-[#555] bg-white hover:bg-[#FAFAF8]"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

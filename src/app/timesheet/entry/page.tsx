'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { getOTConfig, calculateOvertime } from '@/lib/overtime';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  AlertCircle,
  Plus,
  Trash2,
  Briefcase,
  Copy,
} from 'lucide-react';
import TimeTimer from '@/components/TimeTimer';

interface Project {
  id: string;
  name: string;
  code?: string;
  client_name?: string;
}

interface TimesheetRow {
  id: string;
  project_id: string;
  hours: { [key: string]: number };
  notes: { [key: string]: string };
  is_billable?: boolean;  // defaults to true if not set
}

type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'payroll_approved' | 'rejected';

export default function TimesheetEntry() {
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [rows, setRows] = useState<TimesheetRow[]>([
    {
      id: '1',
      project_id: '',
      hours: {},
      notes: {},
      is_billable: true,
    },
  ]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [attestation, setAttestation] = useState(false);
  const [existingTimesheetId, setExistingTimesheetId] = useState<string | null>(null);
  const [timesheetStatus, setTimesheetStatus] = useState<TimesheetStatus | null>(null);
  const [isExempt, setIsExempt] = useState(false);
  const [employeeState, setEmployeeState] = useState<string | null>(null);
  const isLocked = timesheetStatus === 'approved' || timesheetStatus === 'submitted' || timesheetStatus === 'payroll_approved';

  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadProjects();
    checkExistingTimesheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  const loadProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Load all active projects
      const { data: allProjects, error } = await supabase
        .from('projects')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error || !allProjects) {
        console.error('Error loading projects:', error);
        return;
      }

      // Load this employee's assigned projects for prioritization
      if (user?.id) {
        const { data: assignments } = await supabase
          .from('project_employees')
          .select('project_id')
          .eq('employee_id', user.id)
          .eq('is_active', true);

        const assignedIds = new Set((assignments || []).map(a => a.project_id));

        if (assignedIds.size > 0) {
          // Assigned projects first, then the rest
          const assigned = allProjects.filter(p => assignedIds.has(p.id));
          const other = allProjects.filter(p => !assignedIds.has(p.id));
          setProjects([...assigned, { id: '__separator', name: '── Other Projects ──', code: '' }, ...other]);
          return;
        }
      }

      setProjects(allProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const checkExistingTimesheet = async () => {
    try {
      // Clear banners + state whenever week changes
      setErrorMessage('');
      setSuccessMessage('');
      setExistingTimesheetId(null);
      setTimesheetStatus(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Look up employee by auth user id (NOT email)
      const { data: employee } = await supabase
        .from('employees')
        .select('id, is_exempt, state')
        .eq('id', user.id)
        .single();

      if (employee?.is_exempt) setIsExempt(true);
      if (employee?.state) setEmployeeState(employee.state);

      if (!employee) {
        // No employee yet – start blank
        setRows([
          {
            id: '1',
            project_id: '',
            hours: {},
            notes: {},
            is_billable: true,
          },
        ]);
        return;
      }

      const weekEndingDate = getWeekEndingDate(selectedWeek);

      const { data: existing, error: existingError } = await supabase
        .from('timesheets')
        .select('id, status')
        .eq('employee_id', employee.id)
        .eq('week_ending', weekEndingDate)
        .maybeSingle();

      if (existingError) {
        console.error('Error checking timesheet header:', existingError);
      }

      if (existing) {
        setExistingTimesheetId(existing.id);
        setTimesheetStatus(existing.status as TimesheetStatus);

        if (existing.status === 'approved') {
          setErrorMessage('This timesheet has been approved and cannot be edited.');
        }

        await loadExistingEntries(existing.id);
      } else {
        // No timesheet for this week – reset to a single empty row
        setRows([
          {
            id: '1',
            project_id: '',
            hours: {},
            notes: {},
          },
        ]);
      }
    } catch (error) {
      console.error('Error checking existing timesheet:', error);
    }
  };

  const loadExistingEntries = async (timesheetId: string) => {
    try {
      const { data: entries, error } = await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('timesheet_id', timesheetId)
        .order('date');

      if (error) {
        console.error('Error loading existing entries:', error);
        return;
      }

      if (entries && entries.length > 0) {
        const projectGroups: { [key: string]: TimesheetRow } = {};

        entries.forEach((entry: any) => {
          const projectKey = entry.project_id || 'unassigned';

          if (!projectGroups[projectKey]) {
            projectGroups[projectKey] = {
              id: projectKey,
              project_id: entry.project_id || '',
              hours: {},
              notes: {},
            };
          }
          projectGroups[projectKey].hours[entry.date] = entry.hours;
          if (entry.description) {
            projectGroups[projectKey].notes[entry.date] = entry.description;
          }
        });

        setRows(Object.values(projectGroups));
      } else {
        // Timesheet exists but no entries – show one empty row
        setRows([
          {
            id: '1',
            project_id: '',
            hours: {},
            notes: {},
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading existing entries:', error);
    }
  };

  const getWeekEndingDate = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = 6 - day; // Days until Saturday
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  };

  const getWeekDates = () => {
    const dates: Date[] = [];
    const startDate = new Date(selectedWeek);
    const day = startDate.getDay();
    const diff = startDate.getDate() - day; // back to Sunday
    startDate.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDateHeader = (date: Date) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
    };
  };

  const updateRowHours = (rowId: string, dateStr: string, hours: number) => {
    // Cap individual entry at 24 hours
    const capped = Math.min(Math.max(hours, 0), 24);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            hours: {
              ...row.hours,
              [dateStr]: capped,
            },
          };
        }
        return row;
      }),
    );
  };

  const updateRowProject = (rowId: string, projectId: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            project_id: projectId,
          };
        }
        return row;
      }),
    );
  };

  const addRow = () => {
    const newId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setRows((prev) => [
      ...prev,
      {
        id: newId,
        project_id: '',
        hours: {},
        notes: {},
        is_billable: true,
      },
    ]);
  };

  const copyPreviousWeek = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate previous week ending
      const prevWeek = new Date(selectedWeek);
      prevWeek.setDate(prevWeek.getDate() - 7);
      const day = prevWeek.getDay();
      const prevSaturday = new Date(prevWeek);
      prevSaturday.setDate(prevWeek.getDate() + (6 - day));
      const prevWeekEnding = prevSaturday.toISOString().split('T')[0];

      // Find previous week's timesheet
      const { data: prevTs } = await supabase
        .from('timesheets')
        .select('id')
        .eq('employee_id', user.id)
        .eq('week_ending', prevWeekEnding)
        .single();

      if (!prevTs) {
        alert('No timesheet found for the previous week.');
        return;
      }

      // Get the entries from previous week
      const { data: prevEntries } = await supabase
        .from('timesheet_entries')
        .select('project_id')
        .eq('timesheet_id', prevTs.id);

      if (!prevEntries || prevEntries.length === 0) {
        alert('Previous week timesheet has no entries to copy.');
        return;
      }

      // Get unique project IDs from previous week
      const uniqueProjectIds = [...new Set(prevEntries.map(e => e.project_id).filter(Boolean))];

      if (uniqueProjectIds.length === 0) {
        alert('No projects found in previous week.');
        return;
      }

      // Create rows for each project (with empty hours)
      const newRows: TimesheetRow[] = uniqueProjectIds.map((projectId, i) => ({
        id: `copy-${Date.now()}-${i}`,
        project_id: projectId,
        hours: {},
        notes: {},
        is_billable: true,
      }));

      setRows(newRows);
    } catch (err) {
      console.error('Error copying previous week:', err);
      alert('Failed to copy previous week');
    }
  };

  const removeRow = (rowId: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== rowId));
    }
  };

  const callTimesheetStatusApi = async (
    timesheetId: string,
    action: 'save' | 'submit'
  ) => {
    try {
      const res = await fetch(`/api/timesheets/${timesheetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error(
          'Timesheet status API failed',
          res.status,
          data || res.statusText
        );
      } else {
        const data = await res.json().catch(() => null);
        console.log('Timesheet status API success', data);
      }
    } catch (err) {
      console.error('Error calling timesheet status API:', err);
    }
  };

  const calculateTotals = () => {
    const dailyTotals: { [key: string]: number } = {};
    let weekTotal = 0;

    getWeekDates().forEach((date) => {
      const dateStr = formatDate(date);
      let dayTotal = 0;
      rows.forEach((row) => {
        dayTotal += row.hours[dateStr] || 0;
      });
      dailyTotals[dateStr] = dayTotal;
      weekTotal += dayTotal;
    });  

    // Use OT engine with state-specific rules
    const otConfig = getOTConfig(employeeState, { ot_week_hours: 40 });
    const dailyHoursArray = getWeekDates().map(date => dailyTotals[formatDate(date)] || 0);
    const otResult = calculateOvertime(dailyHoursArray, otConfig, isExempt);

    return {
      dailyTotals,
      weekTotal,
      regularHours: otResult.regularHours,
      overtimeHours: otResult.overtimeHours,
      doubleTimeHours: otResult.doubleTimeHours,
    };
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
  
    // Guard: submitted/approved timesheets are view-only
    if (isLocked) {
      setErrorMessage(
        timesheetStatus === 'approved'
          ? 'This timesheet has already been approved and cannot be edited.'
          : 'This timesheet has been submitted and is pending approval. It cannot be edited until it is returned.'
      );
      setIsLoading(false);
      return;
    }
  
    try {
      // Validate at least one row has project and hours
      const validRows = rows.filter((row) => {
        const hasProject = row.project_id !== '';
        const hasHours = Object.values(row.hours).some((h) => h > 0);
        return hasProject && hasHours;
      });
  
      if (validRows.length === 0) {
        setErrorMessage('Please add at least one project with hours before submitting.');
        setIsLoading(false);
        return;
      }

      // Validate no day exceeds 24 hours across all rows
      const weekDatesForValidation = getWeekDates();
      for (const date of weekDatesForValidation) {
        const dateStr = formatDate(date);
        const dayTotal = rows.reduce((sum, row) => sum + (row.hours[dateStr] || 0), 0);
        if (dayTotal > 24) {
          const dayLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          setErrorMessage(`${dayLabel} has ${dayTotal} hours — maximum is 24 hours per day.`);
          setIsLoading(false);
          return;
        }
      }

      // Get current auth user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
  
      const authUserId = user.id;
  
      // Get or create employee record whose id === auth.user.id
      let { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', authUserId)
        .single();
  
      if (empError && (empError as any).code !== 'PGRST116') {
        throw empError;
      }
  
      if (!employee) {
        const { data: newEmployee, error: empInsertError } = await supabase
          .from('employees')
          .insert({
            id: authUserId,
            email: user.email,
            first_name: user.user_metadata?.first_name || 'Unknown',
            last_name: user.user_metadata?.last_name || 'User',
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
      const weekEndingDate = getWeekEndingDate(selectedWeek);
      const { weekTotal, overtimeHours } = calculateTotals();
  
      let timesheetId = existingTimesheetId;
      const newStatus: TimesheetStatus = isDraft ? 'draft' : 'submitted';
  
      // 1) Upsert the timesheet HEADER (no deletes yet)
      if (existingTimesheetId) {
        const updatePayload: any = {
          employee_id: employeeId,
          week_ending: weekEndingDate,
          total_hours: weekTotal,
          overtime_hours: overtimeHours,
          total_minutes: Math.round(weekTotal * 60),
          overtime_minutes: Math.round(overtimeHours * 60),
          status: newStatus,
          submitted_at: isDraft ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
  
        // If resubmitting a previously rejected sheet, clear rejection_reason
        if (!isDraft) {
          updatePayload.rejection_reason = null; // <-- no 'comments' field here
        }
  
        const { error: updateError } = await supabase
          .from('timesheets')
          .update(updatePayload)
          .eq('id', existingTimesheetId);
  
        if (updateError) throw updateError;
      } else {
        const { data: newTimesheet, error: createError } = await supabase
          .from('timesheets')
          .insert({
            employee_id: employeeId,
            week_ending: weekEndingDate,
            total_hours: weekTotal,
            overtime_hours: overtimeHours,
            total_minutes: Math.round(weekTotal * 60),
            overtime_minutes: Math.round(overtimeHours * 60),
            status: newStatus,
            submitted_at: isDraft ? null : new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
  
        if (createError || !newTimesheet) throw createError;
        timesheetId = newTimesheet.id;
        setExistingTimesheetId(newTimesheet.id);
      }
  
      if (!timesheetId) {
        throw new Error('Unable to determine timesheet id after save.');
      }
  
      // 2) Build the entries for this week
      const entries: any[] = [];
      const weekDates = getWeekDates();
  
      for (const row of validRows) {
        for (const date of weekDates) {
          const dateStr = formatDate(date);
          const hours = row.hours[dateStr] || 0;
  
          if (hours > 0) {
            entries.push({
              timesheet_id: timesheetId,
              date: dateStr,
              project_id: row.project_id,
              hours,
              minutes: Math.round(hours * 60),
              description: row.notes[dateStr] || '',
              is_billable: row.is_billable !== false,
            });
          }
        }
      }
  
      // 3) Replace detail rows atomically for this timesheet
      const { error: deleteError } = await supabase
        .from('timesheet_entries')
        .delete()
        .eq('timesheet_id', timesheetId);
  
      if (deleteError) throw deleteError;
  
      if (entries.length > 0) {
        const { error: entriesError } = await supabase
          .from('timesheet_entries')
          .insert(entries);
        if (entriesError) throw entriesError;
      }

            // 3b) Call status API to trigger emails and central status machine
            if (timesheetId) {
              // For drafts, we still call with 'save' so the route can keep state coherent if needed
              const action = isDraft ? 'save' : 'submit';
              await callTimesheetStatusApi(timesheetId, action);
            }      
  
      setTimesheetStatus(newStatus);
  
      setSuccessMessage(
        existingTimesheetId
          ? isDraft
            ? 'Timesheet saved as draft.'
            : 'Timesheet updated and resubmitted for approval!'
          : isDraft
          ? 'Timesheet saved as draft.'
          : 'Timesheet submitted successfully!'
      );
  
      setTimeout(() => {
        router.push('/employee');
      }, 1500);
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      setErrorMessage(error.message || 'Error submitting timesheet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };  

  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedWeek(newDate);
  };

  const { dailyTotals, weekTotal, regularHours, overtimeHours, doubleTimeHours } = calculateTotals();

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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>Timesheet Entry</h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#999' }}>Enter your hours for the week</p>
        </div>
      </div>

      <div>
        {/* Week Selector + Timer */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px', marginBottom: 16 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>
                Week Ending: {getWeekEndingDate(selectedWeek)}
              </span>
              <TimeTimer
                disabled={isLocked}
                onStop={(hours) => {
                  if (hours < 0.01) return;
                  const today = formatDate(new Date());
                  // Add hours to first row with a project, or first row
                  const targetRow = rows.find(r => r.project_id) || rows[0];
                  if (targetRow) {
                    const existing = targetRow.hours[today] || 0;
                    updateRowHours(targetRow.id, today, Math.round((existing + hours) * 100) / 100);
                  }
                  alert(`Added ${hours.toFixed(2)} hours to today (${today})`);
                }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => navigateWeek(-1)} className="p-2 rounded-md transition-colors" style={{ color: '#999', border: '0.5px solid #e0dcd7' }}>
                <ChevronLeft size={15} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setSelectedWeek(new Date())}
                className="transition-colors duration-150"
                style={{ padding: '6px 14px', fontSize: 11, fontWeight: 600, color: '#fff', background: '#e31c79', borderRadius: 6, border: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#cc1069')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#e31c79')}
              >
                Current Week
              </button>
              <button onClick={() => navigateWeek(1)} className="p-2 rounded-md transition-colors" style={{ color: '#999', border: '0.5px solid #e0dcd7' }}>
                <ChevronRight size={15} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Week Date Range */}
          <div className="text-center text-sm text-[#777]">
            {getWeekDates()[0].toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            -{' '}
            {getWeekDates()[6].toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>

        {/* Messages */}
        {errorMessage && (
          <div style={{ marginBottom: 16, padding: 16, background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#b91c1c', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12.5, fontWeight: 500, color: '#b91c1c' }}>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div style={{ marginBottom: 16, padding: 16, background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: '#2d9b6e' }}>{successMessage}</span>
          </div>
        )}

        {/* Mobile Time Entry — card per day */}
        <div className="md:hidden space-y-3 mb-6">
          {getWeekDates().map((date) => {
            const dateStr = formatDate(date);
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const dayTotal = rows.reduce((sum, row) => sum + (row.hours[dateStr] || 0), 0);
            const isToday = formatDate(new Date()) === dateStr;

            return (
              <div key={dateStr} style={{ background: '#fff', border: isToday ? '0.5px solid #e31c79' : '0.5px solid #e8e4df', borderRadius: 10 }}>
                <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isToday ? 'rgba(227,28,121,0.03)' : '#FDFCFB', borderRadius: '10px 10px 0 0' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: isToday ? '#e31c79' : '#1a1a1a' }}>
                    {dayLabel} {isToday && '(Today)'}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: dayTotal > 0 ? '#e31c79' : '#c0bab2' }}>
                    {dayTotal.toFixed(1)} hrs
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {rows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <select
                        value={row.project_id}
                        onChange={(e) => updateRowProject(row.id, e.target.value)}
                        disabled={isLocked}
                        className="flex-1 text-sm px-2 py-1.5 border border-[#e8e4df] rounded focus:ring-[#d3ad6b] focus:border-[#d3ad6b] disabled:bg-[#FAFAF8]"
                      >
                        <option value="">Project...</option>
                        {projects.map((p) =>
                          p.id === '__separator' ? (
                            <option key="__sep_m" disabled>──────</option>
                          ) : (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          )
                        )}
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={row.hours[dateStr] || ''}
                        onChange={(e) => updateRowHours(row.id, dateStr, parseFloat(e.target.value) || 0)}
                        disabled={isLocked}
                        placeholder="0"
                        className="w-16 text-center text-sm px-2 py-1.5 border border-[#e8e4df] rounded focus:ring-[#d3ad6b] focus:border-[#d3ad6b] disabled:bg-[#FAFAF8]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Mobile total */}
          <div className="text-center" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 16 }}>
            <span style={{ fontSize: 11, color: '#999' }}>Week Total:</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#e31c79', marginLeft: 8 }}>{weekTotal.toFixed(1)}</span>
            <span style={{ fontSize: 11, color: '#999', marginLeft: 4 }}>hrs</span>
          </div>
        </div>

        {/* Desktop Time Entry Table */}
        <div className="hidden md:block overflow-hidden" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, marginBottom: 16 }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, background: 'transparent' }}>PROJECT</th>
                  {getWeekDates().map((date) => {
                    const header = formatDateHeader(date);
                    return (
                      <th
                        key={date.toISOString()}
                        className="text-center px-2 py-3 min-w-[80px]"
                        style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, background: 'transparent' }}
                      >
                        <div>{header.day}</div>
                        <div style={{ fontSize: 10, color: '#c0bab2' }}>{header.date}</div>
                      </th>
                    );
                  })}
                  <th className="text-center px-4 py-3" style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase' as const, background: 'transparent' }}>TOTAL</th>
                  <th className="px-2 py-3" style={{ background: 'transparent' }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowTotal = Object.values(row.hours).reduce((sum, h) => sum + h, 0);
                  return (
                    <tr key={row.id} className="border-b border-[#f5f2ee]">
                      <td className="px-4 py-3">
                        <select
                          value={row.project_id}
                          onChange={(e) => updateRowProject(row.id, e.target.value)}
                          disabled={isLocked}
                          className="w-full px-3 py-2 border border-[#e8e4df] rounded-md focus:ring-2 focus:ring-[#d3ad6b] focus:border-[#d3ad6b] disabled:bg-[#FAFAF8] disabled:text-[#999]"
                        >
                          <option value="">Select a project...</option>
                          {projects.map((project) =>
                            project.id === '__separator' ? (
                              <option key="__sep" disabled>──────────────</option>
                            ) : (
                              <option key={project.id} value={project.id}>
                                {project.name} {project.code && `(${project.code})`}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      {getWeekDates().map((date) => {
                        const dateStr = formatDate(date);
                        return (
                          <td key={dateStr} className="px-2 py-3">
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={row.hours[dateStr] || ''}
                              onChange={(e) =>
                                updateRowHours(
                                  row.id,
                                  dateStr,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              disabled={isLocked}
                              className="w-full px-2 py-1 text-center border border-[#e8e4df] rounded focus:ring-2 focus:ring-[#d3ad6b] focus:border-[#d3ad6b] disabled:bg-[#FAFAF8] disabled:text-[#999]"
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center" style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>
                        {rowTotal.toFixed(1)}
                      </td>
                      <td className="px-2 py-3 flex items-center gap-1">
                        <button
                          onClick={() => setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_billable: !r.is_billable } : r))}
                          disabled={isLocked}
                          title={(row.is_billable !== false) ? 'Billable (click to toggle)' : 'Non-billable (click to toggle)'}
                          className={`p-1 rounded text-xs font-bold transition-colors ${
                            (row.is_billable !== false)
                              ? 'text-[#2d9b6e] hover:bg-[#FDFCFB]'
                              : 'text-[#c0bab2] hover:bg-[#FDFCFB]'
                          }`}
                        >
                          $
                        </button>
                        <button
                          onClick={() => removeRow(row.id)}
                          className="p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ color: '#b91c1c' }}
                          disabled={rows.length === 1 || isLocked}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#FDFCFB' }}>
                  <td className="px-4 py-3" style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>Daily Totals:</td>
                  {getWeekDates().map((date) => {
                    const dateStr = formatDate(date);
                    return (
                      <td key={dateStr} className="px-2 py-3 text-center" style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                        {dailyTotals[dateStr]?.toFixed(1) || '0.0'}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-[#e31c79] font-bold">
                    {weekTotal.toFixed(1)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Add Row + Copy Previous Week */}
          <div className="px-4 py-3 border-t flex items-center gap-3">
            <button
              onClick={addRow}
              disabled={isLocked}
              className="flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ padding: '8px 16px', fontSize: 12, fontWeight: 500, color: '#777', background: '#fff', border: '0.5px solid #e0dcd7', borderRadius: 7 }}
            >
              <Plus className="h-4 w-4" />
              Add Row
            </button>
            <button
              onClick={copyPreviousWeek}
              disabled={isLocked}
              className="flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ padding: '8px 16px', fontSize: 12, fontWeight: 500, color: '#e31c79', background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 7 }}
            >
              <Copy className="h-4 w-4" />
              Copy Previous Week
            </button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#999' }}>Regular Hours:</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{regularHours.toFixed(1)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#999' }}>Overtime:</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#c4983a' }}>{overtimeHours.toFixed(1)}</span>
              </div>
              {doubleTimeHours > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: '#999' }}>Double Time:</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#b91c1c' }}>{doubleTimeHours.toFixed(1)}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: '#999' }}>Total Hours:</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#e31c79' }}>
                  {weekTotal.toFixed(1)}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#c0bab2' }}>
              Status:{' '}
              {timesheetStatus
                ? timesheetStatus.charAt(0).toUpperCase() + timesheetStatus.slice(1)
                : 'Not submitted'}{' '}
              {!isExempt && <>&bull; Non-Exempt Employee</>}{' '}
              {employeeState && <>&bull; State: {employeeState}</>}
            </div>
          </div>
        </div>

        {/* Attestation */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>
            Timesheet Attestation
          </h3>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={attestation}
              onChange={(e) => setAttestation(e.target.checked)}
              disabled={isLocked}
              className="mt-1 h-5 w-5 text-[#e31c79] border-[#e8e4df] rounded focus:ring-[#e31c79]"
            />
            <span className="text-[#555]">
              I certify that the hours recorded above are accurate and complete
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleSubmit(true)}
            disabled={isLoading || isLocked}
            className="flex items-center gap-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ padding: '9px 20px', fontSize: 12, fontWeight: 500, color: '#777', background: '#fff', border: '0.5px solid #e0dcd7', borderRadius: 7 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = '#555'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; e.currentTarget.style.color = '#777'; }}
          >
            <Save size={14} strokeWidth={1.5} />
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={isLoading || !attestation || isLocked}
            className="flex items-center gap-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ padding: '9px 20px', fontSize: 12, fontWeight: 600, color: '#fff', background: '#e31c79', border: 'none', borderRadius: 7 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#cc1069')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#e31c79')}
          >
            <Send size={14} strokeWidth={1.5} />
            Submit Timesheet
          </button>
        </div>
      </div>
    </div>
  );
}

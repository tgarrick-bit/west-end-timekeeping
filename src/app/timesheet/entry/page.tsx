'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
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
} from 'lucide-react';

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
}

type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export default function TimesheetEntry() {
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [rows, setRows] = useState<TimesheetRow[]>([
    {
      id: '1',
      project_id: '',
      hours: {},
      notes: {},
    },
  ]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [attestation, setAttestation] = useState(false);
  const [existingTimesheetId, setExistingTimesheetId] = useState<string | null>(null);
  const [timesheetStatus, setTimesheetStatus] = useState<TimesheetStatus | null>(null);

  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadProjects();
    checkExistingTimesheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        setProjects(data);
      } else {
        console.error('Error loading projects:', error);
      }
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
        .select('id')
        .eq('id', user.id)
        .single();

      if (!employee) {
        // No employee yet – start blank
        setRows([
          {
            id: '1',
            project_id: '',
            hours: {},
            notes: {},
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
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            hours: {
              ...row.hours,
              [dateStr]: hours,
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
      },
    ]);
  };

  const removeRow = (rowId: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== rowId));
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

    const regularHours = Math.min(weekTotal, 40);
    const overtimeHours = Math.max(0, weekTotal - 40);

    return { dailyTotals, weekTotal, regularHours, overtimeHours };
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
  
    // Guard: approved timesheets are view-only
    if (timesheetStatus === 'approved') {
      setErrorMessage('This timesheet has already been approved and cannot be edited.');
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
              description: row.notes[dateStr] || '',
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

  const { dailyTotals, weekTotal, regularHours, overtimeHours } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#05202E] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/employee')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">New Timesheet Entry</h1>
                  <span className="text-xs text-gray-300">West End Workforce</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#e31c79]" />
              <span className="text-lg font-semibold text-[#05202E]">
                Week Ending: {getWeekEndingDate(selectedWeek)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateWeek(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSelectedWeek(new Date())}
                className="px-3 py-1 text-sm bg-[#e31c79] text-white rounded-md hover:bg-[#c91865] transition-colors"
              >
                Current Week
              </button>
              <button
                onClick={() => navigateWeek(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Week Date Range */}
          <div className="text-center text-sm text-gray-600">
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
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-red-700">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-700">{successMessage}</span>
          </div>
        )}

        {/* Time Entry Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#05202E] text-white">
                  <th className="text-left px-4 py-3 font-medium">PROJECT</th>
                  {getWeekDates().map((date) => {
                    const header = formatDateHeader(date);
                    return (
                      <th
                        key={date.toISOString()}
                        className="text-center px-2 py-3 font-medium min-w-[80px]"
                      >
                        <div>{header.day}</div>
                        <div className="text-xs opacity-75">{header.date}</div>
                      </th>
                    );
                  })}
                  <th className="text-center px-4 py-3 font-medium">TOTAL</th>
                  <th className="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowTotal = Object.values(row.hours).reduce((sum, h) => sum + h, 0);
                  return (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <select
                          value={row.project_id}
                          onChange={(e) => updateRowProject(row.id, e.target.value)}
                          disabled={timesheetStatus === 'approved'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#e31c79] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          <option value="">Select a project...</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name} {project.code && `(${project.code})`}
                            </option>
                          ))}
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
                              disabled={timesheetStatus === 'approved'}
                              className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-[#e31c79] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-medium text-[#05202E]">
                        {rowTotal.toFixed(1)}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          onClick={() => removeRow(row.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={rows.length === 1 || timesheetStatus === 'approved'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-3 text-[#05202E]">Daily Totals:</td>
                  {getWeekDates().map((date) => {
                    const dateStr = formatDate(date);
                    return (
                      <td key={dateStr} className="px-2 py-3 text-center text-[#05202E]">
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

          {/* Add Row Button */}
          <div className="px-4 py-3 border-t">
            <button
              onClick={addRow}
              disabled={timesheetStatus === 'approved'}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#05202E] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Add Row
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between text-gray-700">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <span className="text-sm">Regular Hours:</span>
                <span className="font-bold text-lg">{regularHours.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Overtime:</span>
                <span className="font-bold text-lg">{overtimeHours.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Total Hours:</span>
                <span className="font-bold text-lg text-[#e31c79]">
                  {weekTotal.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Status:{' '}
              {timesheetStatus
                ? timesheetStatus.charAt(0).toUpperCase() + timesheetStatus.slice(1)
                : 'Not submitted'}{' '}
              • Non-Exempt Employee • State: TX
            </div>
          </div>
        </div>

        {/* Attestation */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#05202E] mb-4">
            Timesheet Attestation
          </h3>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={attestation}
              onChange={(e) => setAttestation(e.target.checked)}
              disabled={timesheetStatus === 'approved'}
              className="mt-1 h-5 w-5 text-[#e31c79] border-gray-300 rounded focus:ring-[#e31c79]"
            />
            <span className="text-gray-700">
              I certify that the hours recorded above are accurate and complete
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => handleSubmit(true)}
            disabled={isLoading || timesheetStatus === 'approved'}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-5 w-5" />
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={isLoading || !attestation || timesheetStatus === 'approved'}
            className="flex items-center gap-2 px-6 py-3 bg-[#e31c79] text-white rounded-lg hover:bg-[#c91865] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
            Submit Timesheet
          </button>
        </div>
      </main>
    </div>
  );
}

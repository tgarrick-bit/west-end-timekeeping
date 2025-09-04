'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ArrowLeft, Plus, Save, Send, Trash2, Calendar, Briefcase, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

interface TimeEntry {
  id: string;
  project_id: string;
  project_name: string;
  client_name?: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  total: number;
}

interface Project {
  id: string;
  name: string;
  client_name?: string;
  is_active: boolean;
}

interface Employee {
  id: string;
  is_exempt: boolean;
  state: string;
}

export default function TimesheetEntryPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [weekEnding, setWeekEnding] = useState('');
  const [entries, setEntries] = useState<TimeEntry[]>([
    {
      id: '1',
      project_id: '',
      project_name: '',
      client_name: '',
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
      total: 0
    }
  ]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [employeeInfo, setEmployeeInfo] = useState<Employee | null>(null);
  const [attestations, setAttestations] = useState({
    accurateTime: false,
    breaksTaken: false,
    noInjuries: false
  });

  useEffect(() => {
    checkAuth();
    loadProjects();
    // Set default week ending (next Sunday)
    const today = new Date();
    const daysUntilSunday = 7 - today.getDay();
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    setWeekEnding(nextSunday.toISOString().split('T')[0]);
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setUserEmail(user.email || '');
    
    // Fetch employee info for overtime calculation
    const { data: empData } = await supabase
      .from('employees')
      .select('id, is_exempt, state')
      .eq('id', user.id)
      .single();
    
    if (empData) {
      setEmployeeInfo(empData);
    }
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
      .order('name');
    
    if (error) {
      console.error('Error loading projects:', error);
    } else {
      const mappedProjects = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        client_name: p.client?.name || '',
        is_active: p.is_active
      }));
      setProjects(mappedProjects);
    }
  };

  const updateHours = (entryId: string, day: string, hours: string) => {
    const hoursNum = parseFloat(hours) || 0;
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        const updated = { ...entry, [day]: hoursNum };
        updated.total = updated.monday + updated.tuesday + updated.wednesday + 
                       updated.thursday + updated.friday + updated.saturday + updated.sunday;
        return updated;
      }
      return entry;
    }));
  };

  const updateProject = (entryId: string, projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        return {
          ...entry,
          project_id: projectId,
          project_name: project?.name || '',
          client_name: project?.client_name || ''
        };
      }
      return entry;
    }));
  };

  const addRow = () => {
    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      project_id: '',
      project_name: '',
      client_name: '',
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
      total: 0
    };
    setEntries([...entries, newEntry]);
  };

  const removeRow = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const calculateDailyTotals = () => {
    const totals = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
      total: 0
    };
    
    entries.forEach(entry => {
      totals.monday += entry.monday;
      totals.tuesday += entry.tuesday;
      totals.wednesday += entry.wednesday;
      totals.thursday += entry.thursday;
      totals.friday += entry.friday;
      totals.saturday += entry.saturday;
      totals.sunday += entry.sunday;
      totals.total += entry.total;
    });
    
    return totals;
  };

  const calculateOvertime = (totals: any) => {
    if (!employeeInfo || employeeInfo.is_exempt) return 0;
    
    let overtime = 0;
    
    if (employeeInfo.state === 'CA') {
      // California: Daily overtime over 8 hours
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
        if (totals[day] > 8) {
          overtime += totals[day] - 8;
        }
      });
    } else {
      // Other states: Weekly overtime over 40 hours
      overtime = totals.total > 40 ? totals.total - 40 : 0;
    }
    
    return overtime;
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    // Validate California attestations
    if (!isDraft && employeeInfo?.state === 'CA' && !employeeInfo.is_exempt) {
      if (!attestations.accurateTime || !attestations.breaksTaken || !attestations.noInjuries) {
        alert('Please complete all attestations before submitting');
        return;
      }
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please login to submit timesheet');
        return;
      }

      // Validate entries
      const validEntries = entries.filter(e => e.project_id && e.total > 0);
      if (validEntries.length === 0) {
        alert('Please add at least one project with hours');
        return;
      }

      // Calculate totals and overtime
      const totals = calculateDailyTotals();
      const overtimeHours = calculateOvertime(totals);

      // Create timecard with proper overtime calculation
      const { data: timecard, error: timecardError } = await supabase
        .from('timecards')
        .insert({
          employee_id: user.id,
          week_ending: weekEnding,
          total_hours: totals.total,
          total_overtime: overtimeHours,
          regular_hours: totals.total - overtimeHours,
          status: isDraft ? 'draft' : 'pending',
          submitted_at: isDraft ? null : new Date().toISOString(),
          attestations: employeeInfo?.state === 'CA' ? attestations : null
        })
        .select()
        .single();

      if (timecardError) throw timecardError;

      // Create time entries
      for (const entry of validEntries) {
        const { error: entryError } = await supabase
          .from('time_entries')
          .insert({
            timecard_id: timecard.id,
            project_id: entry.project_id,
            monday: entry.monday,
            tuesday: entry.tuesday,
            wednesday: entry.wednesday,
            thursday: entry.thursday,
            friday: entry.friday,
            saturday: entry.saturday,
            sunday: entry.sunday,
            total: entry.total
          });

        if (entryError) throw entryError;
      }

      alert(isDraft ? 'Timesheet saved as draft!' : 'Timesheet submitted successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      alert('Error submitting timesheet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = new Date(weekEnding);
    currentDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setWeekEnding(currentDate.toISOString().split('T')[0]);
  };

  const getWeekDateRange = () => {
    const endDate = new Date(weekEnding);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    
    const format = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${format(startDate)} - ${format(endDate)}`;
  };

  const getDayDate = (dayOffset: number) => {
    const endDate = new Date(weekEnding);
    const targetDate = new Date(endDate);
    targetDate.setDate(endDate.getDate() - (6 - dayOffset));
    return targetDate.getDate();
  };

  const totals = calculateDailyTotals();
  const overtimeHours = calculateOvertime(totals);
  const regularHours = Math.max(0, totals.total - overtimeHours);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#05202E] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-200 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
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
            <div className="text-right">
              <span className="text-sm text-gray-200">{userEmail}</span>
              {employeeInfo && (
                <div className="text-xs text-gray-400">
                  {employeeInfo.is_exempt ? 'Exempt' : 'Non-Exempt'} • {employeeInfo.state}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#e31c79]" />
              <label className="text-sm font-medium text-gray-700">Week Ending:</label>
              <input
                type="date"
                value={weekEnding}
                onChange={(e) => setWeekEnding(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={() => setWeekEnding(new Date().toISOString().split('T')[0])}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                Current Week
              </button>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="mt-3 text-center text-lg font-medium text-gray-900">
            {getWeekDateRange()}
          </div>
        </div>

        {/* Timesheet Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#05202E] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">PROJECT / CLIENT</th>
                  <th className="px-4 py-3 text-center text-sm font-medium w-20">
                    MON<br/>{getDayDate(0)}
                    {employeeInfo?.state === 'CA' && totals.monday > 8 && (
                      <span className="text-orange-400 text-xs block">OT</span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium w-20">
                    TUE<br/>{getDayDate(1)}
                    {employeeInfo?.state === 'CA' && totals.tuesday > 8 && (
                      <span className="text-orange-400 text-xs block">OT</span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium w-20">
                    WED<br/>{getDayDate(2)}
                    {employeeInfo?.state === 'CA' && totals.wednesday > 8 && (
                      <span className="text-orange-400 text-xs block">OT</span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium w-20">
                    THU<br/>{getDayDate(3)}
                    {employeeInfo?.state === 'CA' && totals.thursday > 8 && (
                      <span className="text-orange-400 text-xs block">OT</span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium w-20">
                    FRI<br/>{getDayDate(4)}
                    {employeeInfo?.state === 'CA' && totals.friday > 8 && (
                      <span className="text-orange-400 text-xs block">OT</span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium w-20">
                    SAT<br/>{getDayDate(5)}
                    {employeeInfo?.state === 'CA' && totals.saturday > 8 && (
                      <span className="text-orange-400 text-xs block">OT</span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium w-20">
                    SUN<br/>{getDayDate(6)}
                    {employeeInfo?.state === 'CA' && totals.sunday > 8 && (
                      <span className="text-orange-400 text-xs block">OT</span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium w-24">TOTAL</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <select
                        value={entry.project_id}
                        onChange={(e) => updateProject(entry.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                      >
                        <option value="">Select a project...</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>
                            {project.name} {project.client_name && `- ${project.client_name}`}
                          </option>
                        ))}
                      </select>
                    </td>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <td key={day} className="px-2 py-3">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={entry[day as keyof TimeEntry] || ''}
                          onChange={(e) => updateHours(entry.id, day, e.target.value)}
                          className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79]"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-medium text-[#e31c79]">
                      {entry.total.toFixed(1)}
                    </td>
                    <td className="px-2 py-3">
                      {entries.length > 1 && (
                        <button
                          onClick={() => removeRow(entry.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-3 text-right">Daily Totals:</td>
                  <td className={`px-2 py-3 text-center ${employeeInfo?.state === 'CA' && totals.monday > 8 ? 'text-orange-600' : ''}`}>
                    {totals.monday.toFixed(1)}
                  </td>
                  <td className={`px-2 py-3 text-center ${employeeInfo?.state === 'CA' && totals.tuesday > 8 ? 'text-orange-600' : ''}`}>
                    {totals.tuesday.toFixed(1)}
                  </td>
                  <td className={`px-2 py-3 text-center ${employeeInfo?.state === 'CA' && totals.wednesday > 8 ? 'text-orange-600' : ''}`}>
                    {totals.wednesday.toFixed(1)}
                  </td>
                  <td className={`px-2 py-3 text-center ${employeeInfo?.state === 'CA' && totals.thursday > 8 ? 'text-orange-600' : ''}`}>
                    {totals.thursday.toFixed(1)}
                  </td>
                  <td className={`px-2 py-3 text-center ${employeeInfo?.state === 'CA' && totals.friday > 8 ? 'text-orange-600' : ''}`}>
                    {totals.friday.toFixed(1)}
                  </td>
                  <td className={`px-2 py-3 text-center ${employeeInfo?.state === 'CA' && totals.saturday > 8 ? 'text-orange-600' : ''}`}>
                    {totals.saturday.toFixed(1)}
                  </td>
                  <td className={`px-2 py-3 text-center ${employeeInfo?.state === 'CA' && totals.sunday > 8 ? 'text-orange-600' : ''}`}>
                    {totals.sunday.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-center text-lg font-bold text-[#e31c79]">
                    {totals.total.toFixed(1)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Regular Hours:</span> {regularHours.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">
                Overtime Hours {employeeInfo?.state === 'CA' ? '(8+ daily)' : '(40+ weekly)'}:
              </span> 
              <span className={overtimeHours > 0 ? 'text-orange-600 font-bold ml-1' : 'ml-1'}>
                {overtimeHours.toFixed(1)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Total Week Hours:</span> 
              <span className="text-[#e31c79] font-bold ml-1">{totals.total.toFixed(1)}</span>
            </div>
            {employeeInfo && !employeeInfo.is_exempt && (
              <div className="text-xs text-gray-500">
                Status: Non-Exempt
              </div>
            )}
          </div>
        </div>

        {/* California Attestations */}
        {employeeInfo?.state === 'CA' && !employeeInfo.is_exempt && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900">California Employee Attestations</h3>
                <p className="text-sm text-gray-600">Required for timesheet submission</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={attestations.accurateTime}
                  onChange={(e) => setAttestations({...attestations, accurateTime: e.target.checked})}
                  className="rounded text-[#e31c79]"
                />
                <span className="text-sm">I have entered all time worked accurately</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={attestations.breaksTaken}
                  onChange={(e) => setAttestations({...attestations, breaksTaken: e.target.checked})}
                  className="rounded text-[#e31c79]"
                />
                <span className="text-sm">I have taken all required meal and rest breaks</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={attestations.noInjuries}
                  onChange={(e) => setAttestations({...attestations, noInjuries: e.target.checked})}
                  className="rounded text-[#e31c79]"
                />
                <span className="text-sm">I have not sustained any work-related injuries this week</span>
              </label>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={addRow}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={isLoading || totals.total === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#e31c79] text-white rounded-lg hover:bg-[#c91865] transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Submit Timesheet
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
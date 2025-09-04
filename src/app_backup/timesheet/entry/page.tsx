// app/timesheet/entry/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ArrowLeft, Plus, Save, Send, Trash2, Calendar, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimeEntry {
  id: string;
  project_id: string;
  project_name: string;
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

export default function TimesheetEntryPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [weekEnding, setWeekEnding] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([
    {
      id: '1',
      project_id: '',
      project_name: '',
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
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    checkAuth();
    loadProjects();
    // Set default week ending to next Friday
    const today = new Date();
    const friday = new Date(today);
    const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
    friday.setDate(today.getDate() + daysUntilFriday);
    setWeekEnding(friday.toISOString().split('T')[0]);
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
    // Load projects with client information
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
      // Fallback to loading without join if there's an error
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
      // Map to ensure we have the expected structure
      const mappedProjects = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        client_name: p.client?.name || '',
        is_active: p.is_active !== undefined ? p.is_active : true
      }));
      setProjects(mappedProjects);
    }
  };

  const updateEntry = (id: string, field: string, value: string | number) => {
    setEntries(entries.map((entry: TimeEntry) => {
      if (entry.id === id) {
        const updated = { ...entry };
        
        if (field === 'project_id') {
          const selectedProject = projects.find((p: Project) => p.id === value);
          updated.project_id = value as string;
          updated.project_name = selectedProject?.name || '';
        } else if (field in updated) {
          const fieldKey = field as keyof TimeEntry;
          if (fieldKey !== 'id' && fieldKey !== 'project_id' && fieldKey !== 'project_name' && fieldKey !== 'total') {
            (updated as any)[fieldKey] = typeof value === 'string' ? parseFloat(value) || 0 : Number(value) || 0;
          }
        }
        
        // Recalculate total
        updated.total = (updated.monday || 0) + (updated.tuesday || 0) + (updated.wednesday || 0) + 
                       (updated.thursday || 0) + (updated.friday || 0) + (updated.saturday || 0) + (updated.sunday || 0);
        return updated;
      }
      return entry;
    }));
  };

  const addEntry = () => {
    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      project_id: '',
      project_name: '',
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

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const calculateTotalHours = () => {
    return entries.reduce((sum, entry) => sum + entry.total, 0);
  };

  const calculateDayTotal = (day: string) => {
    return entries.reduce((sum, entry) => sum + ((entry as any)[day] as number || 0), 0);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = new Date(weekEnding);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setWeekEnding(newDate.toISOString().split('T')[0]);
    
    // Reset entries when changing weeks
    setEntries([{
      id: '1',
      project_id: '',
      project_name: '',
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
      total: 0
    }]);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const friday = new Date(today);
    const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
    friday.setDate(today.getDate() + daysUntilFriday);
    setWeekEnding(friday.toISOString().split('T')[0]);
    
    // Reset entries
    setEntries([{
      id: '1',
      project_id: '',
      project_name: '',
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
      sunday: 0,
      total: 0
    }]);
  };

  const formatWeekRange = () => {
    if (!weekEnding) return '';
    const endDate = new Date(weekEnding);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const yearOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', yearOptions)}`;
  };

  const handleSubmit = async () => {
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

      // Create timecard
      const { data: timecard, error: timecardError } = await supabase
        .from('timecards')
        .insert({
          employee_id: user.id,
          week_ending: weekEnding,
          status: 'submitted',
          total_hours: calculateTotalHours(),
          total_amount: calculateTotalHours() * 50, // Assuming $50/hour
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (timecardError) {
        console.error('Error creating timecard:', timecardError);
        alert('Error submitting timesheet. Please try again.');
        return;
      }

      // Create timecard entries
      const entriesData = validEntries.map(entry => ({
        timecard_id: timecard.id,
        project_id: entry.project_id,
        project_name: entry.project_name,
        monday_hours: entry.monday,
        tuesday_hours: entry.tuesday,
        wednesday_hours: entry.wednesday,
        thursday_hours: entry.thursday,
        friday_hours: entry.friday,
        saturday_hours: entry.saturday,
        sunday_hours: entry.sunday,
        total_hours: entry.total
      }));

      const { error: entriesError } = await supabase
        .from('timecard_entries')
        .insert(entriesData);

      if (entriesError) {
        console.error('Error creating entries:', entriesError);
        alert('Error saving timesheet entries. Please try again.');
        return;
      }

      alert('Timesheet submitted successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please login to save draft');
        return;
      }

      // Create timecard as draft
      const { data: timecard, error: timecardError } = await supabase
        .from('timecards')
        .insert({
          employee_id: user.id,
          week_ending: weekEnding,
          status: 'draft',
          total_hours: calculateTotalHours(),
          total_amount: calculateTotalHours() * 50 // Assuming $50/hour
        })
        .select()
        .single();

      if (timecardError) {
        console.error('Error creating draft:', timecardError);
        alert('Error saving draft. Please try again.');
        return;
      }

      // Save entries for draft if any
      const validEntries = entries.filter(e => e.project_id && e.total > 0);
      if (validEntries.length > 0) {
        const entriesData = validEntries.map(entry => ({
          timecard_id: timecard.id,
          project_id: entry.project_id,
          project_name: entry.project_name,
          monday_hours: entry.monday,
          tuesday_hours: entry.tuesday,
          wednesday_hours: entry.wednesday,
          thursday_hours: entry.thursday,
          friday_hours: entry.friday,
          saturday_hours: entry.saturday,
          sunday_hours: entry.sunday,
          total_hours: entry.total
        }));

        await supabase.from('timecard_entries').insert(entriesData);
      }

      alert('Draft saved successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Save draft error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get the dates for the week
  const getWeekDates = () => {
    if (!weekEnding) return [];
    const endDate = new Date(weekEnding);
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - i);
      dates.push(date.getDate());
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          opacity: 1;
        }
      `}</style>

      {/* Header */}
      <header className="bg-[#05202E] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-200 hover:text-white"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">
                    New Timesheet Entry
                  </h1>
                  <span className="text-xs text-gray-300">West End Workforce</span>
                </div>
              </div>
            </div>
            <span className="text-sm text-gray-200">{userEmail}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-[#05202E]">
                <Calendar className="h-4 w-4 text-[#e31c79]" />
                Week Ending:
              </label>
              <input
                type="date"
                value={weekEnding}
                onChange={(e) => setWeekEnding(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-[#05202E] focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79] transition-all text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-[#05202E]"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <button
                onClick={goToCurrentWeek}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-[#05202E] hover:bg-gray-100 rounded-lg transition-colors"
              >
                Current Week
              </button>
              
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-[#05202E]"
                aria-label="Next week"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Week Range Display */}
          <div className="mt-3 text-center">
            <span className="text-lg font-medium text-[#05202E]">
              {formatWeekRange()}
            </span>
          </div>
        </div>

        {/* Time Entry Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#05202E]">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-72">
                    Project / Client
                  </th>
                  {dayNames.map((day, index) => (
                    <th key={day} className="px-3 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider w-20">
                      <div>{day}</div>
                      {weekDates[index] && (
                        <div className="text-gray-300 font-normal text-xs mt-1">{weekDates[index]}</div>
                      )}
                    </th>
                  ))}
                  <th className="px-3 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider w-20">
                    Total
                  </th>
                  <th className="px-3 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider w-16">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <select
                        value={entry.project_id}
                        onChange={(e) => updateEntry(entry.id, 'project_id', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-[#05202E] focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79] transition-all text-sm"
                      >
                        <option value="" className="bg-white">Select a project...</option>
                        <optgroup label="All Projects (A-Z)">
                          {projects.map((project) => (
                            <option key={project.id} value={project.id} className="bg-white py-1">
                              {project.name} {project.client_name ? `— ${project.client_name}` : ''}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </td>
                    {dayKeys.map((day) => (
                      <td key={day} className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={(entry as any)[day] || 0}
                          onChange={(e) => updateEntry(entry.id, day, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1.5 text-center bg-gray-50 border border-gray-300 rounded text-[#05202E] focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-[#e31c79] transition-all text-sm"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center">
                      <span className="font-semibold text-[#e31c79]">
                        {entry.total.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => removeEntry(entry.id)}
                        disabled={entries.length === 1}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td className="px-4 py-4 text-right font-semibold text-[#05202E]">
                    Daily Totals:
                  </td>
                  {dayKeys.map((day) => (
                    <td key={day} className="px-3 py-4 text-center font-semibold text-gray-600 text-sm">
                      {calculateDayTotal(day).toFixed(1)}
                    </td>
                  ))}
                  <td className="px-3 py-4 text-center">
                    <span className="font-bold text-lg text-[#05202E]">
                      {calculateTotalHours().toFixed(1)}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={addEntry}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium text-[#05202E]"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium text-[#05202E] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || calculateTotalHours() === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#e31c79] text-white rounded-lg hover:bg-[#c91865] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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

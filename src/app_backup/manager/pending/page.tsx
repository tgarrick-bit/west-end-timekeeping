'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Use your existing supabase client
import { supabase } from '@/lib/supabaseClient'; // or '@/utils/supabase/client'
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define proper interfaces - Fix for the type assignment issue
interface Project {
  id: string;
  name: string;
  code?: string;
  client_id?: string;
  active: boolean;
}

interface TimeEntry {
  project_id: string;
  hours: number;
  description: string;
  date: string;
  task_type?: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function TimesheetEntryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([{
    project_id: '',
    hours: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    task_type: 'development'
  }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weekEnding, setWeekEnding] = useState('');
  const [totalHours, setTotalHours] = useState(0);
  const router = useRouter();

  // Task types for dropdown
  const taskTypes = [
    { value: 'development', label: 'Development' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'testing', label: 'Testing' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'support', label: 'Support' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchProjects();
    calculateWeekEnding();
  }, []);

  useEffect(() => {
    // Calculate total hours whenever entries change
    const total = entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    setTotalHours(total);
  }, [entries]);

  const calculateWeekEnding = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const friday = new Date(today);
    friday.setDate(today.getDate() + daysUntilFriday);
    setWeekEnding(friday.toISOString().split('T')[0]);
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects');
    }
  };

  // Fix for proper typing - handle different field types correctly
  const handleEntryChange = (index: number, field: keyof TimeEntry, value: string) => {
    const updatedEntries = [...entries];
    
    // Type-safe assignment based on field
    if (field === 'hours') {
      updatedEntries[index] = {
        ...updatedEntries[index],
        [field]: parseFloat(value) || 0
      };
    } else {
      updatedEntries[index] = {
        ...updatedEntries[index],
        [field]: value
      };
    }
    
    setEntries(updatedEntries);
  };

  const addEntry = () => {
    setEntries([...entries, {
      project_id: '',
      hours: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      task_type: 'development'
    }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      const updatedEntries = entries.filter((_, i) => i !== index);
      setEntries(updatedEntries);
    }
  };

  const validateEntries = (): boolean => {
    for (const entry of entries) {
      if (!entry.project_id) {
        setError('Please select a project for all entries');
        return false;
      }
      if (entry.hours <= 0 || entry.hours > 24) {
        setError('Hours must be between 0 and 24');
        return false;
      }
      if (!entry.date) {
        setError('Please select a date for all entries');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    if (!validateEntries()) {
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      // Create timesheet header first
      const { data: timesheetData, error: timesheetError } = await supabase
        .from('timesheets')
        .insert({
          user_id: user.id,
          employee_id: user.id,
          employee_name: user.email?.split('@')[0] || 'Unknown',
          week_ending: weekEnding,
          total_hours: totalHours,
          overtime_hours: totalHours > 40 ? totalHours - 40 : 0,
          status: 'pending',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (timesheetError) throw timesheetError;

      // Save individual timesheet entries
      const entriesWithTimesheetId = entries.map(entry => ({
        ...entry,
        timesheet_id: timesheetData.id,
        user_id: user.id,
        created_at: new Date().toISOString()
      }));

      const { error: entriesError } = await supabase
        .from('timesheet_entries')
        .insert(entriesWithTimesheetId);

      if (entriesError) throw entriesError;

      router.push('/timesheets');
    } catch (error: any) {
      console.error('Error saving timesheet:', error);
      setError(error.message || 'Failed to save timesheet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>New Timesheet Entry</CardTitle>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Week Ending: {new Date(weekEnding).toLocaleDateString()}</span>
            <span className={`font-medium ${totalHours > 40 ? 'text-orange-600' : ''}`}>
              Total Hours: {totalHours.toFixed(1)}
              {totalHours > 40 && ` (${(totalHours - 40).toFixed(1)} OT)`}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {entries.map((entry, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4 bg-gray-50">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-medium">Entry {index + 1}</h3>
                  {entries.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`project-${index}`}>Project *</Label>
                    <select
                      id={`project-${index}`}
                      value={entry.project_id}
                      onChange={(e) => handleEntryChange(index, 'project_id', e.target.value)}
                      className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.code ? `${project.code} - ${project.name}` : project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor={`task-${index}`}>Task Type</Label>
                    <select
                      id={`task-${index}`}
                      value={entry.task_type}
                      onChange={(e) => handleEntryChange(index, 'task_type', e.target.value)}
                      className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {taskTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor={`hours-${index}`}>Hours *</Label>
                    <Input
                      id={`hours-${index}`}
                      type="number"
                      step="0.25"
                      min="0"
                      max="24"
                      value={entry.hours || ''}
                      onChange={(e) => handleEntryChange(index, 'hours', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`date-${index}`}>Date *</Label>
                    <Input
                      id={`date-${index}`}
                      type="date"
                      value={entry.date}
                      onChange={(e) => handleEntryChange(index, 'date', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`description-${index}`}>Description</Label>
                  <textarea
                    id={`description-${index}`}
                    value={entry.description}
                    onChange={(e) => handleEntryChange(index, 'description', e.target.value)}
                    placeholder="What did you work on?"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    rows={3}
                  />
                </div>
              </div>
            ))}
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={addEntry}
              className="w-full"
            >
              + Add Another Entry
            </Button>
            
            <div className="flex justify-between pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              
              <div className="space-x-2">
                <Button 
                  type="submit" 
                  disabled={loading || entries.length === 0}
                >
                  {loading ? 'Saving...' : 'Submit Timesheet'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
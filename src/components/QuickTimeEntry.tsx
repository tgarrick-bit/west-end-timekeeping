'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Project, TimeEntry } from '@/types';

type Task = { id: string; code?: string; name: string };

const DEFAULT_TASKS: Task[] = [
  { id: 'gen', code: 'GEN', name: 'General' },
  { id: 'meet', code: 'MTG', name: 'Meetings' },
  { id: 'dev', code: 'DEV', name: 'Development' },
];

export default function QuickTimeEntry() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);

  const [projectId, setProjectId] = useState<string>('');
  const [taskId, setTaskId] = useState<string>(DEFAULT_TASKS[0].id);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('projects').select('id, name').eq('is_active', true).order('name');
      setProjects((data || []) as Project[]);
      // If you have a tasks table, fetch it here instead of DEFAULT_TASKS
      setTasks(DEFAULT_TASKS);
    })();
  }, []);

  const save = async () => {
    const total_minutes = Math.round(hours * 60);

    const payload: Partial<TimeEntry> = {
      project_id: projectId || null,
      entry_date: date,
      total_minutes,
      notes: notes || null,
      task_id: taskId || null,
    };

    await supabase.from('time_entries').insert(payload);

    setProjectId('');
    setTaskId(DEFAULT_TASKS[0].id);
    setHours(0);
    setNotes('');
  };

  return (
    <div className="bg-white rounded shadow p-4 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Project (optional)</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Task</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code ? `${t.code} - ${t.name}` : t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Date</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Hours</label>
          <input
            type="number"
            step="0.1"
            className="border rounded px-3 py-2 w-full"
            value={hours}
            onChange={(e) => setHours(parseFloat(e.target.value || '0'))}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Notes</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="pt-2">
        <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={save}>
          Save Time
        </button>
      </div>
    </div>
  );
}





'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types';

type ExpenseCategory = { id: string; name: string };

const CATEGORIES: ExpenseCategory[] = [
  { id: 'travel', name: 'Travel' },
  { id: 'meals', name: 'Meals' },
  { id: 'supplies', name: 'Supplies' },
  { id: 'other', name: 'Other' },
];

export default function QuickExpenseEntry() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('projects').select('id, name').eq('is_active', true).order('name');
      setProjects((data || []) as Project[]);
    })();
  }, []);

  const save = async () => {
    if (!date || !amount) return;

    // Adjust to your actual schema fields
    await supabase.from('expense_items').insert({
      project_id: projectId || null,
      date,
      amount,
      category,
      description: description || null,
    });

    setAmount(0);
    setCategory(CATEGORIES[0].id);
    setDescription('');
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
          <label className="block text-sm mb-1">Date</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            className="border rounded px-3 py-2 w-full"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value || '0'))}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Category</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Description</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="pt-2">
        <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={save}>
          Save Expense
        </button>
      </div>
    </div>
  );
}





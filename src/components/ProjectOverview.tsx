'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types';

type ProjectOverviewItem = {
  project: Pick<Project, 'id' | 'name' | 'status'> & {
    description?: string | null;
  };
  totalHours?: number;
  totalExpenses?: number;
  isActive?: boolean;
};

export default function ProjectOverview() {
  const [items, setItems] = useState<ProjectOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: projects } = await supabase.from('projects').select('*').order('name', { ascending: true });

      const rows: ProjectOverviewItem[] = (projects || []).map((p) => ({
        project: {
          id: p.id,
          name: p.name,
          status: p.status,
          description: (p as any)?.description ?? null,
        },
        totalHours: 0,
        totalExpenses: 0,
        isActive: (p.status ?? 'active') === 'active',
      }));

      setItems(rows);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="bg-white rounded shadow p-6">Loading…</div>;
    }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((projectSummary) => {
        const totalHours = projectSummary.totalHours ?? 0;
        const totalExpenses = projectSummary.totalExpenses ?? 0;
        const isActive = projectSummary.isActive ?? false;

        return (
          <div key={projectSummary.project.id} className="bg-white rounded shadow p-6">
            <h3 className="text-lg font-semibold">{projectSummary.project.name}</h3>

            {projectSummary.project.description && (
              <p className="text-gray-600 mt-1">{projectSummary.project.description}</p>
            )}

            <div className="mt-3 text-sm text-gray-500">
              Status: <span className="capitalize">{projectSummary.project.status?.replace(/_/g, ' ')}</span>
            </div>

            <div className="mt-1 text-sm">
              {isActive ? 'Active' : 'Inactive'}
            </div>

            <div className="mt-4 flex justify-between text-sm">
              <div>
                <div className="text-gray-500">Hours</div>
                <div className="font-semibold">{totalHours.toFixed(1)}h this week</div>
              </div>
              <div>
                <div className="text-gray-500">Expenses</div>
                <div className="font-semibold">${totalExpenses.toFixed(2)} this month</div>
              </div>
            </div>

            {totalHours > 0 && (
              <div className="mt-4 h-2 bg-gray-100 rounded">
                <div
                  className="h-2 bg-blue-500 rounded"
                  style={{ width: `${Math.min(100, totalHours * 5)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}




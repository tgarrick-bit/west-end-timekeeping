'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { Users, Clock, ArrowRight } from 'lucide-react';
import { SkeletonList } from '@/components/ui/Skeleton';

interface ActiveEmployee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string | null;
}

function AdminEnterTimeInner() {
  const [employees, setEmployees] = useState<ActiveEmployee[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmployees = async () => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, department')
        .eq('is_active', true)
        .order('last_name');

      if (data) setEmployees(data);
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const goToEntry = () => {
    if (selectedId) {
      router.push(`/timesheet/entry?employeeId=${selectedId}`);
    } else {
      router.push('/timesheet/entry');
    }
  };

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Header */}
      <div className="anim-fade-in stagger-1" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>Enter Time</h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 2 }}>Enter time on behalf of an employee, or enter your own</p>
      </div>

      {/* Selection Card */}
      <div className="anim-fade-in stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, maxWidth: 560 }}>
        <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #f5f2ee', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={14} strokeWidth={1.5} style={{ color: '#c0bab2' }} />
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Select Employee</h2>
        </div>
        <div style={{ padding: '20px 22px' }}>
          {isLoading ? (
            <SkeletonList rows={3} />
          ) : (
            <>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#e8e4df] rounded-md text-sm focus:ring-2 focus:ring-[#d3ad6b] focus:border-[#d3ad6b] focus:outline-none"
                style={{ fontSize: 12.5, color: '#1a1a1a', marginBottom: 16 }}
              >
                <option value="">My Own Time</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.last_name}, {emp.first_name} — {emp.email}{emp.department ? ` (${emp.department})` : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={goToEntry}
                className="flex items-center gap-2 transition-colors duration-150"
                style={{ padding: '9px 20px', fontSize: 12, fontWeight: 600, color: '#fff', background: '#e31c79', border: 'none', borderRadius: 7 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#cc1069')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#e31c79')}
              >
                <Clock size={14} strokeWidth={1.5} />
                Open Timesheet Entry
                <ArrowRight size={14} strokeWidth={1.5} />
              </button>

              {selectedId && (
                <p style={{ fontSize: 10, color: '#c0bab2', marginTop: 12 }}>
                  You will be entering time on behalf of this employee. The timesheet will be attributed to them.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminEnterTimePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-[#e8e4df] border-t-[#e31c79] rounded-full animate-spin" />
      </div>
    }>
      <AdminEnterTimeInner />
    </Suspense>
  );
}

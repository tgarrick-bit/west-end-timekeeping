'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Users, AlertCircle } from 'lucide-react';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string | null;
  status: string | null;
  employee_type: string | null;
  department: string | null;
}

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, { bg: string; color: string; border: string }> = {
    active: { bg: '#ecfdf5', color: '#2d9b6e', border: '#2d9b6e' },
    inactive: { bg: '#FAFAF8', color: '#777', border: '#e8e4df' },
    pending: { bg: '#FFF8E1', color: '#c4983a', border: '#c4983a' },
  };
  const c = colorMap[status] || { bg: '#FAFAF8', color: '#777', border: '#e8e4df' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: 9,
        fontWeight: 500,
        borderRadius: 3,
        background: c.bg,
        color: c.color,
        border: `0.5px solid ${c.border}`,
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function ContractorsIndexClient() {
  const router = useRouter();
  const { user } = useAuth() as any;
  const supabase = createClient();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, role, status, employee_type, department')
        .eq('manager_id', authUser.id)
        .order('last_name', { ascending: true });

      if (error) {
        console.error('Error loading team:', error);
      } else {
        setTeam((data || []) as TeamMember[]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = team.filter(m => m.status === 'active').length;
  const typeCounts: Record<string, number> = {};
  team.forEach(m => {
    const t = m.employee_type || 'Unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  if (loading) {
    const shimmer: React.CSSProperties = {
      background: 'linear-gradient(90deg, #f5f2ee 25%, #ece8e3 50%, #f5f2ee 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: 4,
    };
    return (
      <div style={{ padding: '36px 40px' }}>
        <style dangerouslySetInnerHTML={{ __html: '@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }' }} />
        <div style={{ ...shimmer, width: 220, height: 24 }} />
        <div style={{ ...shimmer, width: 200, height: 13, marginTop: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginTop: 24 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div style={{ ...shimmer, width: 80, height: 10 }} />
              <div style={{ ...shimmer, width: 40, height: 28, marginTop: 8 }} />
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, marginTop: 20, overflow: 'hidden' }}>
          <div style={{ ...shimmer, width: '100%', height: 36, borderRadius: 0 }} />
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ ...shimmer, width: '100%', height: 52, borderRadius: 0, marginTop: 1, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
          My Team
        </h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}>
          View and manage your team members
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', color: '#c0bab2', margin: '0 0 8px 0', letterSpacing: 1.2 }}>Total Team</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>{team.length}</p>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', color: '#c0bab2', margin: '0 0 8px 0', letterSpacing: 1.2 }}>Active</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#2d9b6e' }}>{activeCount}</p>
        </div>
        {Object.entries(typeCounts).map(([type, count]) => (
          <div key={type} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
            <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', color: '#c0bab2', margin: '0 0 8px 0', letterSpacing: 1.2 }}>{type}</p>
            <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>{count}</p>
          </div>
        ))}
      </div>

      {/* Team Table */}
      <div
        style={{
          background: '#fff',
          border: '0.5px solid #e8e4df',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {team.length === 0 ? (
          <div className="text-center py-16">
            <Users className="mx-auto h-8 w-8" style={{ color: '#c0bab2' }} />
            <p className="mt-3" style={{ fontSize: 13, color: '#999' }}>
              No team members found
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Email', 'Role', 'Employee Type', 'Status'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '12px 20px',
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: 1,
                      color: '#c0bab2',
                      textTransform: 'uppercase',
                      borderBottom: '0.5px solid #f5f2ee',
                      background: 'transparent',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => router.push(`/manager/contractors/${member.id}`)}
                  style={{ borderBottom: '0.5px solid #f5f2ee', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#FDFCFB')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }}>
                      {member.first_name} {member.last_name}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                    {member.email}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                    {member.role || '-'}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                    {member.employee_type || '-'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <StatusBadge status={member.status || 'inactive'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

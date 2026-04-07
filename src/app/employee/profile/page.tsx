'use client';

import { useEffect, useState, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { User, Phone, Mail, Building2, Calendar, Briefcase, Shield, DollarSign, FolderKanban, Save, CheckCircle } from 'lucide-react';
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton';

interface EmployeeProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  hire_date: string | null;
  employee_type: string | null;
  role: string;
  hourly_rate: number | null;
  overtime_rate: number | null;
  is_active: boolean;
}

interface ProjectAssignment {
  project_id: string;
  is_active: boolean;
  hourly_rate: number | null;
  project: {
    id: string;
    name: string;
    code: string | null;
    is_active: boolean;
  };
}

export default function EmployeeProfilePage() {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const mounted = useRef(true);

  const supabase = createSupabaseClient();

  useEffect(() => {
    mounted.current = true;
    loadProfile();
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: emp, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, phone, department, hire_date, employee_type, role, hourly_rate, overtime_rate, is_active')
        .eq('id', user.id)
        .single();

      if (error || !emp) {
        console.error('Error loading profile:', error);
        return;
      }

      if (!mounted.current) return;
      setProfile(emp);
      setPhone(emp.phone || '');

      // Load project assignments
      const { data: pa } = await supabase
        .from('project_employees')
        .select('project_id, is_active, hourly_rate, project:projects(id, name, code, is_active)')
        .eq('employee_id', user.id)
        .eq('is_active', true);

      if (pa && mounted.current) {
        setAssignments(pa as unknown as ProjectAssignment[]);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('employees')
        .update({ phone: phone.trim() || null })
        .eq('id', profile.id);

      if (error) throw error;

      setSuccessMessage('Profile updated successfully.');
      setProfile({ ...profile, phone: phone.trim() || null });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '--';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatRole = (r: string) => {
    return r.charAt(0).toUpperCase() + r.slice(1);
  };

  const formatRate = (r: number | null) => {
    if (r == null) return '--';
    return `$${r.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="px-4 py-5 md:px-10 md:py-9">
        <div style={{ marginBottom: 24 }}>
          <div className="anim-shimmer" style={{ width: 140, height: 24, borderRadius: 3, marginBottom: 8 }} />
          <div className="anim-shimmer" style={{ width: 220, height: 12, borderRadius: 3 }} />
        </div>
        <SkeletonStats count={3} />
        <div style={{ marginTop: 16 }}>
          <SkeletonList rows={5} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-4 py-5 md:px-10 md:py-9">
        <p style={{ fontSize: 13, color: '#999' }}>Unable to load profile. Please contact your administrator.</p>
      </div>
    );
  }

  const infoRows: { label: string; value: string; icon: typeof User }[] = [
    { label: 'Full Name', value: `${profile.first_name} ${profile.last_name}`, icon: User },
    { label: 'Email', value: profile.email, icon: Mail },
    { label: 'Department', value: profile.department || '--', icon: Building2 },
    { label: 'Hire Date', value: formatDate(profile.hire_date), icon: Calendar },
    { label: 'Employee Type', value: profile.employee_type || '--', icon: Briefcase },
    { label: 'Role', value: formatRole(profile.role), icon: Shield },
  ];

  return (
    <div className="px-4 py-5 md:px-10 md:py-9">
      {/* Header */}
      <div className="anim-fade-in stagger-1" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>My Profile</h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 2 }}>View and manage your personal information</p>
      </div>

      {/* Success / Error Messages */}
      {successMessage && (
        <div className="anim-fade-in" style={{ marginBottom: 16, padding: 14, background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle style={{ width: 15, height: 15, color: '#2d9b6e', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, fontWeight: 500, color: '#2d9b6e' }}>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="anim-fade-in" style={{ marginBottom: 16, padding: 14, background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: '#b91c1c' }}>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal Information Card */}
        <div className="anim-fade-in stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
          <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #f5f2ee' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Personal Information</h2>
          </div>
          <div>
            {infoRows.map(({ label, value, icon: Icon }, i) => (
              <div
                key={label}
                className="flex items-center gap-3"
                style={{
                  padding: '13px 22px',
                  borderBottom: i < infoRows.length - 1 ? '0.5px solid #f5f2ee' : 'none',
                }}
              >
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} strokeWidth={1.5} style={{ color: '#c0bab2' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase' as const }}>{label}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a', marginTop: 1 }} className="truncate">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact & Pay Card */}
        <div className="space-y-4">
          {/* Editable Phone */}
          <div className="anim-fade-in stagger-3" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
            <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #f5f2ee' }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Contact Information</h2>
            </div>
            <div style={{ padding: '16px 22px' }}>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 6 }}>
                Phone Number
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Phone size={14} strokeWidth={1.5} style={{ color: '#c0bab2', flexShrink: 0 }} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="flex-1 px-3 py-2 border border-[#e8e4df] rounded-md focus:ring-2 focus:ring-[#d3ad6b] focus:border-[#d3ad6b] focus:outline-none"
                    style={{ fontSize: 12.5, color: '#1a1a1a' }}
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving || phone === (profile.phone || '')}
                  className="flex items-center gap-1.5 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#fff', background: '#e31c79', borderRadius: 6, border: 'none' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#cc1069'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; }}
                >
                  <Save size={12} strokeWidth={1.5} />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p style={{ fontSize: 10, color: '#c0bab2', marginTop: 6 }}>
                Contact your administrator to update your name, email, or role.
              </p>
            </div>
          </div>

          {/* Pay Rate */}
          <div className="anim-fade-in stagger-4" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
            <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #f5f2ee' }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Compensation</h2>
            </div>
            <div style={{ padding: '16px 22px', display: 'flex', gap: 32 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 4 }}>Hourly Rate</div>
                <div className="flex items-center gap-1.5">
                  <DollarSign size={14} strokeWidth={1.5} style={{ color: '#2d9b6e' }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{formatRate(profile.hourly_rate)}</span>
                </div>
              </div>
              {profile.overtime_rate != null && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 4 }}>Overtime Rate</div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={14} strokeWidth={1.5} style={{ color: '#c4983a' }} />
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{formatRate(profile.overtime_rate)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Assignments */}
      <div className="anim-fade-in stagger-5" style={{ marginTop: 16, background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
        <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #f5f2ee', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderKanban size={14} strokeWidth={1.5} style={{ color: '#c0bab2' }} />
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Project Assignments</h2>
          <span style={{ fontSize: 10, fontWeight: 500, color: '#c0bab2', marginLeft: 'auto' }}>{assignments.length} active</span>
        </div>
        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <FolderKanban size={18} strokeWidth={1.5} style={{ color: '#d0cbc4', marginBottom: 8 }} />
            <p style={{ fontSize: 12, color: '#999' }}>No project assignments</p>
          </div>
        ) : (
          <div>
            {assignments.map((a, i) => {
              const proj = Array.isArray(a.project) ? a.project[0] : a.project;
              if (!proj) return null;
              return (
                <div
                  key={a.project_id}
                  className="flex items-center gap-3"
                  style={{ padding: '13px 22px', borderBottom: i < assignments.length - 1 ? '0.5px solid #f5f2ee' : 'none' }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Briefcase size={13} strokeWidth={1.5} style={{ color: '#c0bab2' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a' }} className="truncate">{proj.name}</div>
                    {proj.code && <div style={{ fontSize: 10, color: '#c0bab2' }}>{proj.code}</div>}
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: proj.is_active ? '#ecfdf5' : '#f9fafb',
                      color: proj.is_active ? '#2d9b6e' : '#999',
                    }}
                  >
                    {proj.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

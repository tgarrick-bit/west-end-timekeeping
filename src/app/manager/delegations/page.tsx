'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Plus, X, Calendar, UserCheck, ArrowLeft } from 'lucide-react';

interface Delegation {
  id: string;
  delegator_id: string;
  delegate_id: string;
  start_date: string;
  end_date: string | null;
  reason: string | null;
  is_active: boolean;
  created_at: string;
  delegate?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  delegator?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ManagerOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function DelegationsPage() {
  const router = useRouter();
  const { employee } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();

  const [myDelegations, setMyDelegations] = useState<Delegation[]>([]);
  const [delegatedToMe, setDelegatedToMe] = useState<Delegation[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [delegateId, setDelegateId] = useState('');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadDelegations();
    loadManagers();
  }, []);

  const loadDelegations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/delegations');
      const data = await res.json();
      setMyDelegations(data.myDelegations || []);
      setDelegatedToMe(data.delegatedToMe || []);
    } catch (error) {
      console.error('Error loading delegations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, email')
      .in('role', ['manager', 'admin'])
      .eq('is_active', true)
      .order('last_name');

    if (data) {
      // Filter out self
      const { data: { user } } = await supabase.auth.getUser();
      setManagers(data.filter((m) => m.id !== user?.id));
    }
  };

  const handleCreate = async () => {
    if (!delegateId || !startDate) {
      toast('warning', 'Please select a manager and start date.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegate_id: delegateId,
          start_date: startDate,
          end_date: endDate || null,
          reason: reason || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create delegation');
      }

      toast('success', 'Delegation created successfully.');
      setShowForm(false);
      setDelegateId('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setReason('');
      await loadDelegations();
    } catch (error: any) {
      toast('error', error.message || 'Error creating delegation');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/delegations?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to cancel delegation');
      }

      toast('success', 'Delegation cancelled.');
      await loadDelegations();
    } catch (error: any) {
      toast('error', error.message || 'Error cancelling delegation');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isActive = (d: Delegation) => {
    if (!d.is_active) return false;
    const today = new Date().toISOString().split('T')[0];
    if (d.start_date > today) return false;
    if (d.end_date && d.end_date < today) return false;
    return true;
  };

  const inputStyle: React.CSSProperties = {
    border: '0.5px solid #e8e4df',
    borderRadius: 7,
    fontSize: 12,
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: '#555',
    display: 'block',
    marginBottom: 4,
  };

  if (loading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div
          className="anim-shimmer"
          style={{ width: 200, height: 28, borderRadius: 4, marginBottom: 16 }}
        />
        <SkeletonList rows={3} />
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Header */}
      <div
        className="anim-slide-up stagger-1"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => router.push('/manager')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#999',
                padding: 4,
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#1a1a1a',
                margin: 0,
              }}
            >
              Approval Delegations
            </h1>
          </div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: '#999',
              marginTop: 4,
              marginLeft: 34,
            }}
          >
            Delegate your approval responsibilities to another manager for a
            date range.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 18px',
            background: '#e31c79',
            color: '#fff',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = '#cc1069')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = '#e31c79')
          }
        >
          <Plus size={14} />
          Delegate My Approvals
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div
          className="anim-slide-up"
          style={{
            background: '#fff',
            border: '0.5px solid #e8e4df',
            borderRadius: 10,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1,
              color: '#c0bab2',
              textTransform: 'uppercase' as const,
              marginBottom: 16,
            }}
          >
            New Delegation
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            style={{ marginBottom: 16 }}
          >
            <div>
              <label style={labelStyle}>Delegate To</label>
              <select
                value={delegateId}
                onChange={(e) => setDelegateId(e.target.value)}
                style={inputStyle}
                className="focus:border-[#d3ad6b] focus:shadow-[0_0_0_3px_rgba(211,173,107,0.08)]"
              >
                <option value="">Select a manager...</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.last_name}, {m.first_name} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Vacation, Leave of absence"
                style={inputStyle}
                className="focus:border-[#d3ad6b] focus:shadow-[0_0_0_3px_rgba(211,173,107,0.08)]"
              />
            </div>

            <div>
              <label style={labelStyle}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={inputStyle}
                className="focus:border-[#d3ad6b] focus:shadow-[0_0_0_3px_rgba(211,173,107,0.08)]"
              />
            </div>

            <div>
              <label style={labelStyle}>End Date (optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                style={inputStyle}
                className="focus:border-[#d3ad6b] focus:shadow-[0_0_0_3px_rgba(211,173,107,0.08)]"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCreate}
              disabled={saving}
              style={{
                padding: '8px 18px',
                background: '#e31c79',
                color: '#fff',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Creating...' : 'Create Delegation'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                padding: '8px 18px',
                background: '#fff',
                color: '#777',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 500,
                border: '0.5px solid #e8e4df',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* My Active Delegations */}
      <div
        className="anim-slide-up stagger-2"
        style={{
          background: '#fff',
          border: '0.5px solid #e8e4df',
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: '14px 22px',
            borderBottom: '0.5px solid #f0ece7',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <UserCheck size={14} style={{ color: '#e31c79' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
            My Delegations
          </span>
          <span
            style={{
              fontSize: 10,
              color: '#c0bab2',
              marginLeft: 4,
            }}
          >
            ({myDelegations.length})
          </span>
        </div>
        <div style={{ padding: '8px 22px' }}>
          {myDelegations.length === 0 ? (
            <div
              style={{
                padding: '24px 0',
                textAlign: 'center',
                color: '#c0bab2',
                fontSize: 12,
              }}
            >
              No active delegations. Click "Delegate My Approvals" to create
              one.
            </div>
          ) : (
            myDelegations.map((d) => (
              <div
                key={d.id}
                style={{
                  padding: '14px 0',
                  borderBottom: '0.5px solid #f5f2ee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                    {d.delegate?.first_name} {d.delegate?.last_name}
                    <span style={{ color: '#c0bab2', fontSize: 11, marginLeft: 8 }}>
                      {d.delegate?.email}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#999',
                      marginTop: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Calendar size={10} />
                    {formatDate(d.start_date)}
                    {d.end_date ? ` - ${formatDate(d.end_date)}` : ' - Ongoing'}
                    {d.reason && (
                      <span style={{ color: '#c0bab2' }}>
                        {' '}
                        &middot; {d.reason}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: isActive(d)
                        ? 'rgba(45,155,110,0.08)'
                        : 'rgba(153,153,153,0.08)',
                      color: isActive(d) ? '#2d9b6e' : '#999',
                    }}
                  >
                    {isActive(d) ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => handleCancel(d.id)}
                    style={{
                      background: 'none',
                      border: '0.5px solid #e8e4df',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 11,
                      color: '#b91c1c',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <X size={10} />
                    Cancel
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delegated To Me */}
      <div
        className="anim-slide-up stagger-3"
        style={{
          background: '#fff',
          border: '0.5px solid #e8e4df',
          borderRadius: 10,
        }}
      >
        <div
          style={{
            padding: '14px 22px',
            borderBottom: '0.5px solid #f0ece7',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Calendar size={14} style={{ color: '#d3ad6b' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
            Delegated To Me
          </span>
          <span
            style={{
              fontSize: 10,
              color: '#c0bab2',
              marginLeft: 4,
            }}
          >
            ({delegatedToMe.length})
          </span>
        </div>
        <div style={{ padding: '8px 22px' }}>
          {delegatedToMe.length === 0 ? (
            <div
              style={{
                padding: '24px 0',
                textAlign: 'center',
                color: '#c0bab2',
                fontSize: 12,
              }}
            >
              No one has delegated approvals to you.
            </div>
          ) : (
            delegatedToMe.map((d) => (
              <div
                key={d.id}
                style={{
                  padding: '14px 0',
                  borderBottom: '0.5px solid #f5f2ee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                    From: {d.delegator?.first_name} {d.delegator?.last_name}
                    <span style={{ color: '#c0bab2', fontSize: 11, marginLeft: 8 }}>
                      {d.delegator?.email}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#999',
                      marginTop: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Calendar size={10} />
                    {formatDate(d.start_date)}
                    {d.end_date ? ` - ${formatDate(d.end_date)}` : ' - Ongoing'}
                    {d.reason && (
                      <span style={{ color: '#c0bab2' }}>
                        {' '}
                        &middot; {d.reason}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: isActive(d)
                      ? 'rgba(45,155,110,0.08)'
                      : 'rgba(153,153,153,0.08)',
                    color: isActive(d) ? '#2d9b6e' : '#999',
                  }}
                >
                  {isActive(d) ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Check,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  X
} from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface PendingItem {
  id: string;
  type: 'timesheet' | 'expense';
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  amount: number;
  hours?: number;
  weekEnding: string;
  projectName: string;
  submittedAt: string;
  status: string;
  selected?: boolean;
}

interface PendingWeek {
  weekEnding: string;
  items: PendingItem[];
  totalAmount: number;
  totalHours: number;
  expanded: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ── skeleton shimmer ── */
const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
`;

const skeletonBar = (w: string | number, h = 14): React.CSSProperties => ({
  width: typeof w === 'number' ? w : w,
  height: h,
  borderRadius: 4,
  background: 'linear-gradient(90deg, #f5f2ee 25%, #ece8e3 50%, #f5f2ee 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
});

export default function SupervisorPendingView() {
  const { user } = useAuth();
  const router = useRouter();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [groupedWeeks, setGroupedWeeks] = useState<PendingWeek[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<PendingItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; item: PendingItem | null }>({ open: false, item: null });
  const [stats, setStats] = useState({
    pendingTimesheets: 0,
    pendingExpenses: 0,
    urgentItems: 0,
    totalPendingHours: 0,
    totalPendingAmount: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'timesheets' | 'expenses'>('all');

  useEffect(() => {
    if (user) fetchPendingItems();
  }, [user]);

  useEffect(() => {
    groupItemsByWeek();
  }, [pendingItems, searchTerm, filterType]);

  const fetchPendingItems = async () => {
    try {
      const response = await fetch('/api/manager/pending-all');
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setPendingItems(data.items || []);
      setStats(data.stats);
    } catch (error) {
      showMessage('error', 'Failed to load pending items');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupItemsByWeek = () => {
    const filtered = pendingItems.filter(item => {
      const matchesSearch = item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.projectName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' ||
                          (filterType === 'timesheets' && item.type === 'timesheet') ||
                          (filterType === 'expenses' && item.type === 'expense');
      return matchesSearch && matchesFilter;
    });

    const weeks = new Map<string, PendingWeek>();

    filtered.forEach(item => {
      const weekKey = new Date(item.weekEnding).toISOString().split('T')[0];

      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, {
          weekEnding: weekKey,
          items: [],
          totalAmount: 0,
          totalHours: 0,
          expanded: true
        });
      }

      const week = weeks.get(weekKey)!;
      week.items.push(item);

      if (item.type === 'timesheet') {
        week.totalHours += item.hours || 0;
      } else {
        week.totalAmount += item.amount;
      }
    });

    const sortedWeeks = Array.from(weeks.values()).sort((a, b) =>
      new Date(b.weekEnding).getTime() - new Date(a.weekEnding).getTime()
    );

    setGroupedWeeks(sortedWeeks);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const toggleWeekExpansion = (weekEnding: string) => {
    setGroupedWeeks(prev => prev.map(week =>
      week.weekEnding === weekEnding
        ? { ...week, expanded: !week.expanded }
        : week
    ));
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    const allIds = new Set(pendingItems.map(item => item.id));
    setSelectedItems(allIds);
  };

  const selectNone = () => {
    setSelectedItems(new Set());
  };

  const selectWeek = (week: PendingWeek) => {
    const newSelection = new Set(selectedItems);
    week.items.forEach(item => newSelection.add(item.id));
    setSelectedItems(newSelection);
  };

  const approveItem = async (item: PendingItem): Promise<boolean> => {
    try {
      if (item.type === 'timesheet') {
        const res = await fetch(`/api/timesheets/${item.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to approve timesheet');
        }
      } else {
        const res = await fetch(`/api/expense-reports/${item.id}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to approve expense report');
        }
      }
      return true;
    } catch (error: any) {
      console.error('Approve error:', error);
      return false;
    }
  };

  const rejectItem = async (item: PendingItem, reason: string): Promise<boolean> => {
    try {
      if (item.type === 'timesheet') {
        const res = await fetch(`/api/timesheets/${item.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to reject timesheet');
        }
      } else {
        const res = await fetch(`/api/expense-reports/${item.id}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to reject expense report');
        }
      }
      return true;
    } catch (error: any) {
      console.error('Reject error:', error);
      return false;
    }
  };

  const approveSelected = async () => {
    if (selectedItems.size === 0) {
      showMessage('error', 'No items selected');
      return;
    }

    const itemsToApprove = pendingItems.filter(item => selectedItems.has(item.id));
    let successCount = 0;
    let failCount = 0;

    for (const item of itemsToApprove) {
      const ok = await approveItem(item);
      if (ok) successCount++;
      else failCount++;
    }

    setSelectedItems(new Set());

    if (failCount > 0) {
      showMessage('error', `Approved ${successCount}, failed ${failCount}`);
    } else {
      showMessage('success', `Approved ${successCount} item${successCount !== 1 ? 's' : ''}`);
    }

    await fetchPendingItems();
  };

  const approveSingleItem = async (item: PendingItem) => {
    const ok = await approveItem(item);
    setShowDetailModal(false);
    if (ok) {
      showMessage('success', `Approved ${item.type} for ${item.employeeName}`);
    } else {
      showMessage('error', `Failed to approve ${item.type} for ${item.employeeName}`);
    }
    await fetchPendingItems();
  };

  const rejectSingleItem = (item: PendingItem) => {
    setRejectModal({ open: true, item });
  };

  const handleRejectConfirm = async (reason: string) => {
    const item = rejectModal.item;
    setRejectModal({ open: false, item: null });
    if (!item || !reason || !reason.trim()) return;
    const ok = await rejectItem(item, reason.trim());
    setShowDetailModal(false);
    if (ok) {
      showMessage('success', `Rejected ${item.type} for ${item.employeeName}`);
    } else {
      showMessage('error', `Failed to reject ${item.type} for ${item.employeeName}`);
    }
    await fetchPendingItems();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysOld = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <style dangerouslySetInnerHTML={{ __html: shimmerKeyframes }} />
        <div style={skeletonBar(220, 24)} />
        <div style={{ ...skeletonBar(180, 13), marginTop: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 28 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div style={skeletonBar(80, 10)} />
              <div style={{ ...skeletonBar(60, 28), marginTop: 10 }} />
            </div>
          ))}
        </div>
        <div style={{ ...skeletonBar('100%', 48), marginTop: 28, borderRadius: 10 }} />
        {[0, 1, 2].map(i => (
          <div key={i} style={{ ...skeletonBar('100%', 64), marginTop: 12, borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  const totalPending = stats.pendingTimesheets + stats.pendingExpenses;

  /* ── shared styles ── */
  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: 'none',
    fontSize: 13,
    padding: '8px 18px',
  };
  const btnPrimary: React.CSSProperties = { ...btnBase, background: '#e31c79', color: '#fff' };
  const btnOutline: React.CSSProperties = { ...btnBase, background: '#fff', color: '#777', border: '0.5px solid #e0dcd7' };

  return (
    <div style={{ padding: '36px 40px' }}>
      <style dangerouslySetInnerHTML={{ __html: shimmerKeyframes }} />

      {/* Notification Message */}
      {message && (
        <div
          style={{
            padding: '16px 24px',
            borderRadius: 10,
            marginBottom: 24,
            fontWeight: 500,
            fontSize: 13,
            animation: 'slideUp 0.3s ease',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: message.type === 'success' ? '#2d9b6e' : '#b91c1c',
            border: `0.5px solid ${message.type === 'success' ? '#2d9b6e' : '#b91c1c'}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Page Title */}
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: -0.3 }}>
        Pending Approvals
      </h1>
      <p style={{ fontSize: 13, fontWeight: 400, color: '#999', margin: '4px 0 28px 0' }}>
        {totalPending} item{totalPending !== 1 ? 's' : ''} waiting for your review
      </p>

      {/* Section Header */}
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: '0 0 14px 0' }}>
        Overview
      </p>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', color: '#c0bab2', margin: '0 0 8px 0', letterSpacing: 1.2 }}>Timesheets</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>{stats.pendingTimesheets}</p>
          {stats.urgentItems > 0 && (
            <span style={{ background: '#FFF8E1', color: '#c4983a', padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 500, marginTop: 8, display: 'inline-block' }}>
              {stats.urgentItems} urgent
            </span>
          )}
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', color: '#c0bab2', margin: '0 0 8px 0', letterSpacing: 1.2 }}>Expenses</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>{stats.pendingExpenses}</p>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', color: '#c0bab2', margin: '0 0 8px 0', letterSpacing: 1.2 }}>Total Hours</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>{stats.totalPendingHours.toFixed(1)}</p>
        </div>
      </div>

      {/* Section Header */}
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: '0 0 14px 0' }}>
        Actions
      </p>

      {/* Bulk Actions Bar */}
      <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '14px 22px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={approveSelected}
            disabled={selectedItems.size === 0}
            style={{ ...btnPrimary, padding: '10px 24px', fontWeight: 600, opacity: selectedItems.size === 0 ? 0.4 : 1, cursor: selectedItems.size === 0 ? 'not-allowed' : 'pointer' }}
          >
            <Check style={{ width: 14, height: 14, marginRight: 6 }} />
            Approve Selected ({selectedItems.size})
          </button>
          <button onClick={selectAll} style={btnOutline}>Select All</button>
          <button onClick={selectNone} style={btnOutline}>Clear Selection</button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#ccc' }} />
            <input
              type="text"
              placeholder="Search by name or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 14px 8px 34px', border: '0.5px solid #e8e4df', borderRadius: 7, width: 240, fontSize: 13, color: '#555', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(211,173,107,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e8e4df'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'timesheets' | 'expenses')}
            style={{ padding: '8px 14px', border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 13, color: '#555', background: '#fff', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">All Items</option>
            <option value="timesheets">Timesheets Only</option>
            <option value="expenses">Expenses Only</option>
          </select>
        </div>
      </div>

      {/* Section Header */}
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: '#c0bab2', textTransform: 'uppercase', margin: '0 0 14px 0' }}>
        Pending Items
      </p>

      {/* Week Stack View */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groupedWeeks.map(week => (
          <div key={week.weekEnding} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
            <div
              onClick={() => toggleWeekExpansion(week.weekEnding)}
              style={{ padding: '14px 22px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #f0ece7', transition: 'background 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#FDFCFB')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {week.expanded
                  ? <ChevronDown style={{ width: 14, height: 14, color: '#c0bab2', flexShrink: 0 }} />
                  : <ChevronRight style={{ width: 14, height: 14, color: '#c0bab2', flexShrink: 0 }} />
                }
                <div>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Week of {formatDate(week.weekEnding)}</h3>
                  <p style={{ margin: 0, fontSize: 11, color: '#999', fontWeight: 400 }}>
                    {week.items.length} items &middot; {week.totalHours}h &middot; ${week.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); selectWeek(week); }}
                style={{ ...btnOutline, padding: '6px 14px', fontSize: 12 }}
              >
                Select Week
              </button>
            </div>

            {week.expanded && (
              <div>
                {week.items.map(item => {
                  const daysOld = getDaysOld(item.submittedAt);
                  const isUrgent = daysOld > 3;

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '16px 22px',
                        borderBottom: '0.5px solid #f5f2ee',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        background: selectedItems.has(item.id) ? '#FFF8F5' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!selectedItems.has(item.id)) e.currentTarget.style.background = '#FDFCFB'; }}
                      onMouseLeave={(e) => { if (!selectedItems.has(item.id)) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#e31c79' }}
                        />

                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0ebe5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#1a1a1a', flexShrink: 0 }}>
                          {getInitials(item.employeeName)}
                        </div>

                        <div
                          style={{ flex: 1 }}
                          onClick={() => { setSelectedItemDetail(item); setShowDetailModal(true); }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: '#1a1a1a', fontSize: 12.5 }}>{item.employeeName}</span>
                            <span style={{
                              padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 500,
                              background: item.type === 'expense' ? '#FFF8E1' : '#f9fafb',
                              color: item.type === 'expense' ? '#c4983a' : '#999',
                            }}>
                              {item.type}
                            </span>
                            {isUrgent && (
                              <span style={{ background: '#FFF8E1', color: '#c4983a', padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 500 }}>
                                {daysOld}d ago
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 400, color: '#555' }}>
                            {item.projectName} &middot; {item.employeeEmail}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{ textAlign: 'right' }}
                        onClick={() => { setSelectedItemDetail(item); setShowDetailModal(true); }}
                      >
                        <p style={{ margin: '0 0 4px 0', fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>
                          {item.type === 'timesheet' ? `${item.hours}h` : `$${item.amount.toFixed(2)}`}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: '#999', fontWeight: 400 }}>
                          Submitted {formatDate(item.submittedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {groupedWeeks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 10, border: '0.5px solid #e8e4df' }}>
          <CheckCircle style={{ width: 40, height: 40, color: '#c0bab2', margin: '0 auto 20px' }} />
          <h3 style={{ fontSize: 16, color: '#1a1a1a', margin: '0 0 8px 0', fontWeight: 600 }}>All Caught Up</h3>
          <p style={{ color: '#999', margin: 0, fontSize: 13 }}>No pending items require your approval at this time.</p>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedItemDetail && (
        <div
          onClick={() => setShowDetailModal(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e8e4df', width: '90%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', animation: 'scaleIn 0.2s ease' }}
          >
            <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>
                {selectedItemDetail.type === 'timesheet' ? 'Timesheet Details' : 'Expense Details'}
              </h2>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 22 }}>
              {[
                ['Employee', selectedItemDetail.employeeName],
                ['Email', selectedItemDetail.employeeEmail],
                ['Project', selectedItemDetail.projectName],
                ['Date', formatDate(selectedItemDetail.weekEnding)],
                [selectedItemDetail.type === 'timesheet' ? 'Hours' : 'Amount',
                  selectedItemDetail.type === 'timesheet' ? String(selectedItemDetail.hours) : `$${selectedItemDetail.amount.toFixed(2)}`],
                ['Submitted', formatDate(selectedItemDetail.submittedAt)],
              ].map(([label, value]) => (
                <p key={label as string} style={{ margin: '10px 0', color: '#555', fontSize: 12.5 }}>
                  <strong style={{ fontWeight: 600, marginRight: 8, color: '#1a1a1a' }}>{label}:</strong>
                  {value}
                </p>
              ))}
              <p style={{ margin: '10px 0', color: '#555', fontSize: 12.5 }}>
                <strong style={{ fontWeight: 600, marginRight: 8, color: '#1a1a1a' }}>Status:</strong>
                <StatusBadge status={selectedItemDetail.status} />
              </p>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '0.5px solid #f0ece7', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowDetailModal(false)} style={btnOutline}>Cancel</button>
              <button onClick={() => rejectSingleItem(selectedItemDetail)} style={{ ...btnBase, background: '#fef2f2', color: '#b91c1c', border: '0.5px solid #b91c1c' }}>Reject</button>
              <button onClick={() => approveSingleItem(selectedItemDetail)} style={btnPrimary}>Approve</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={rejectModal.open}
        title="Reject Item"
        message={`Reject ${rejectModal.item?.type || 'item'} for ${rejectModal.item?.employeeName || 'employee'}?`}
        confirmLabel="Reject"
        variant="danger"
        inputLabel="Rejection Reason"
        inputPlaceholder="Enter the reason for rejection..."
        inputRequired
        onConfirm={(reason) => handleRejectConfirm(reason || '')}
        onCancel={() => setRejectModal({ open: false, item: null })}
      />
    </div>
  );
}

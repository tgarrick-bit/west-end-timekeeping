'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './pending.module.css';
import { 
  AlertCircle, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Calculator,
  Check,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

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

export default function SupervisorPendingView() {
  const { user } = useAuth();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [groupedWeeks, setGroupedWeeks] = useState<PendingWeek[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
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
    fetchPendingItems();
  }, []);

  useEffect(() => {
    groupItemsByWeek();
  }, [pendingItems, searchTerm, filterType]);

  const fetchPendingItems = async () => {
    try {
      console.log('Fetching from /api/manager/pending-all...');
      const response = await fetch('/api/manager/pending-all');
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('API Response:', data);
      console.log('Items received:', data.items?.length || 0);
      
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
    console.log('groupItemsByWeek called with items:', pendingItems);
    
    const filtered = pendingItems.filter(item => {
      const matchesSearch = item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.projectName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || 
                          (filterType === 'timesheets' && item.type === 'timesheet') ||
                          (filterType === 'expenses' && item.type === 'expense');
      return matchesSearch && matchesFilter;
    });
    
    console.log('Filtered items:', filtered);

    const weeks = new Map<string, PendingWeek>();
    
    filtered.forEach(item => {
      const weekKey = new Date(item.weekEnding).toISOString().split('T')[0];
      console.log('Processing item with weekKey:', weekKey);
      
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
    
    console.log('Grouped weeks:', sortedWeeks);
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

  const approveSelected = async () => {
    if (selectedItems.size === 0) {
      showMessage('error', 'No items selected');
      return;
    }
    showMessage('success', 'Feature coming soon!');
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

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading pending approvals...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Notification Message */}
      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Header Summary Card */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <h1>
            <AlertCircle className={styles.alertIcon} />
            {stats.pendingTimesheets + stats.pendingExpenses} Items Pending Your Approval
          </h1>
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <Clock className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>Timesheets</p>
              <p className={styles.statValue}>{stats.pendingTimesheets}</p>
              {stats.urgentItems > 0 && (
                <span className={styles.urgentBadge}>{stats.urgentItems} urgent</span>
              )}
            </div>
          </div>
          
          <div className={styles.statItem}>
            <DollarSign className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>Expenses</p>
              <p className={styles.statValue}>{stats.pendingExpenses}</p>
            </div>
          </div>
          
          <div className={styles.statItem}>
            <TrendingUp className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>Total Hours</p>
              <p className={styles.statValue}>{stats.totalPendingHours.toFixed(1)}</p>
            </div>
          </div>
          
          <div className={styles.statItem}>
            <Calculator className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>Total Amount</p>
              <p className={styles.statValue}>${stats.totalPendingAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <div className={styles.actionsBar}>
        <div className={styles.actionButtons}>
          <button 
            onClick={approveSelected}
            disabled={selectedItems.size === 0}
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`}
          >
            <Check className={styles.btnIcon} />
            Approve Selected ({selectedItems.size})
          </button>
          <button onClick={selectAll} className={`${styles.btn} ${styles.btnOutline}`}>
            Select All
          </button>
          <button onClick={selectNone} className={`${styles.btn} ${styles.btnOutline}`}>
            Clear Selection
          </button>
        </div>
        
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by name or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className={styles.filterSelect}
          >
            <option value="all">All Items</option>
            <option value="timesheets">Timesheets Only</option>
            <option value="expenses">Expenses Only</option>
          </select>
        </div>
      </div>

      {/* Week Stack View */}
      <div className={styles.weeksList}>
        {groupedWeeks.map(week => (
          <div key={week.weekEnding} className={styles.weekCard}>
            <div 
              className={styles.weekHeader}
              onClick={() => toggleWeekExpansion(week.weekEnding)}
            >
              <div className={styles.weekInfo}>
                {week.expanded ? 
                  <ChevronDown className={styles.expandIcon} /> : 
                  <ChevronRight className={styles.expandIcon} />
                }
                <div>
                  <h3>Week of {formatDate(week.weekEnding)}</h3>
                  <p className={styles.weekSummary}>
                    {week.items.length} items • {week.totalHours}h • ${week.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  selectWeek(week);
                }}
                className={`${styles.btn} ${styles.btnSmall}`}
              >
                Select Week
              </button>
            </div>
            
            {week.expanded && (
              <div className={styles.weekItems}>
                {week.items.map(item => {
                  const daysOld = getDaysOld(item.submittedAt);
                  const isUrgent = daysOld > 3;
                  
                  return (
                    <div
                      key={item.id}
                      className={`${styles.itemRow} ${selectedItems.has(item.id) ? styles.selected : ''}`}
                    >
                      <div className={styles.itemLeft}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className={styles.checkbox}
                        />
                        
                        <div className={styles.itemInfo}>
                          <div className={styles.itemHeader}>
                            <span className={styles.employeeName}>{item.employeeName}</span>
                            <span className={`${styles.badge} ${styles[item.type]}`}>
                              {item.type}
                            </span>
                            {isUrgent && (
                              <span className={styles.urgentBadge}>
                                {daysOld} days old
                              </span>
                            )}
                          </div>
                          <p className={styles.itemDetails}>
                            {item.projectName} • {item.employeeEmail}
                          </p>
                        </div>
                      </div>
                      
                      <div className={styles.itemRight}>
                        <p className={styles.itemAmount}>
                          {item.type === 'timesheet' 
                            ? `${item.hours}h`
                            : `$${item.amount.toFixed(2)}`
                          }
                        </p>
                        <p className={styles.itemDate}>
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
        <div className={styles.emptyState}>
          <CheckCircle className={styles.emptyIcon} />
          <h3>All Caught Up!</h3>
          <p>No pending items require your approval at this time.</p>
        </div>
      )}
    </div>
  );
}
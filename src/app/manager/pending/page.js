// pages/manager/pending.js
// Complete supervisor dashboard with detail view modal

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Calendar, Clock, User, Check, X, ChevronDown, ChevronRight, Eye, DollarSign, Briefcase } from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  'https://ejmubqnsnibbmwbslcab.supabase.co',
  'YOUR-ANON-KEY-HERE' // Replace with your actual anon key
);

export default function SupervisorDashboard() {
  const [timecards, setTimecards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [collapsedWeeks, setCollapsedWeeks] = useState(new Set());
  const [bulkNotes, setBulkNotes] = useState('');
  const [selectedTimecard, setSelectedTimecard] = useState(null);
  const [timecardEntries, setTimecardEntries] = useState([]);
  const [timecardSummary, setTimecardSummary] = useState(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch pending timecards using SQL function
  const fetchPendingTimecards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pending_timecards');
      
      if (error) {
        console.error('Error:', error);
        throw error;
      }
      
      setTimecards(data || []);
    } catch (error) {
      console.error('Error fetching timecards:', error);
      alert('Failed to load timecards. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch timecard entries for detail view
  const fetchTimecardDetails = async (timecardId) => {
    setLoadingEntries(true);
    try {
      // Fetch entries
      const { data: entries, error: entriesError } = await supabase.rpc('get_timecard_entries', {
        timecard_id_param: timecardId
      });
      
      if (entriesError) throw entriesError;
      
      // Fetch summary
      const { data: summary, error: summaryError } = await supabase.rpc('get_timecard_summary', {
        timecard_id_param: timecardId
      });
      
      if (summaryError) throw summaryError;
      
      setTimecardEntries(entries || []);
      setTimecardSummary(summary?.[0] || null);
    } catch (error) {
      console.error('Error fetching timecard details:', error);
      setTimecardEntries([]);
      setTimecardSummary(null);
      alert('Failed to load timecard details');
    } finally {
      setLoadingEntries(false);
    }
  };

  // Open detail modal
  const openDetailModal = async (timecard) => {
    setSelectedTimecard(timecard);
    setShowDetailModal(true);
    await fetchTimecardDetails(timecard.id);
  };

  // Close detail modal
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTimecard(null);
    setTimecardEntries([]);
    setTimecardSummary(null);
  };

  // Approve single timecard using SQL function
  const approveSingle = async (timecardId) => {
    if (!confirm('Are you sure you want to approve this timecard?')) return;
    
    try {
      const { error } = await supabase.rpc('approve_timecard', {
        timecard_id: timecardId
      });
      
      if (error) throw error;
      
      alert('Timecard approved successfully!');
      await fetchPendingTimecards();
      if (showDetailModal) closeDetailModal();
    } catch (error) {
      console.error('Error approving timecard:', error);
      alert('Failed to approve timecard');
    }
  };

  // Bulk approve selected timecards using SQL function
  const bulkApprove = async () => {
    if (selectedIds.size === 0) {
      alert('Please select timecards to approve');
      return;
    }

    if (!confirm(`Are you sure you want to approve ${selectedIds.size} timecard(s)?`)) return;

    try {
      const { error } = await supabase.rpc('bulk_approve_timecards', {
        timecard_ids: Array.from(selectedIds),
        notes: bulkNotes || null
      });
      
      if (error) throw error;
      
      alert(`Successfully approved ${selectedIds.size} timecard(s)!`);
      setSelectedIds(new Set());
      setBulkNotes('');
      await fetchPendingTimecards();
    } catch (error) {
      console.error('Error bulk approving:', error);
      alert('Failed to bulk approve timecards');
    }
  };

  // Toggle selection
  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all in a week
  const selectAllInWeek = (weekTimecards) => {
    const newSelected = new Set(selectedIds);
    weekTimecards.forEach(tc => newSelected.add(tc.id));
    setSelectedIds(newSelected);
  };

  // Toggle week collapse
  const toggleWeek = (weekEnding) => {
    const newCollapsed = new Set(collapsedWeeks);
    if (newCollapsed.has(weekEnding)) {
      newCollapsed.delete(weekEnding);
    } else {
      newCollapsed.add(weekEnding);
    }
    setCollapsedWeeks(newCollapsed);
  };

  // Group timecards by week
  const groupedTimecards = timecards.reduce((acc, timecard) => {
    const week = timecard.week_ending;
    if (!acc[week]) acc[week] = [];
    acc[week].push(timecard);
    return acc;
  }, {});

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Calculate total for entries
  const calculateTotals = () => {
    const totals = {
      regularHours: 0,
      overtimeHours: 0,
      totalAmount: 0
    };

    timecardEntries.forEach(entry => {
      totals.regularHours += parseFloat(entry.regular_hours || 0);
      totals.overtimeHours += parseFloat(entry.overtime_hours || 0);
      const rate = parseFloat(entry.hourly_rate || 0);
      totals.totalAmount += (parseFloat(entry.regular_hours || 0) * rate) + 
                            (parseFloat(entry.overtime_hours || 0) * rate * 1.5);
    });

    return totals;
  };

  // Load data on mount
  useEffect(() => {
    fetchPendingTimecards();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totals = showDetailModal ? calculateTotals() : null;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pending Timecard Approvals</h1>
          <div className="text-sm text-gray-500">
            {timecards.length} pending approval{timecards.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size} timecard{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </button>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Add notes (optional)"
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={bulkApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 transition-colors"
              >
                <Check className="w-4 h-4" />
                Approve Selected
              </button>
            </div>
          </div>
        )}

        {/* Timecards List */}
        <div className="space-y-4">
          {Object.entries(groupedTimecards)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .map(([weekEnding, weekTimecards]) => {
              const isCollapsed = collapsedWeeks.has(weekEnding);
              
              return (
                <div key={weekEnding} className="border rounded-lg">
                  {/* Week Header */}
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleWeek(weekEnding)}
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <span className="font-medium">Week ending {formatDate(weekEnding)}</span>
                      <span className="text-sm text-gray-500">({weekTimecards.length} timecards)</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllInWeek(weekTimecards);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select all
                    </button>
                  </div>

                  {/* Week Timecards */}
                  {!isCollapsed && (
                    <div className="divide-y">
                      {weekTimecards.map((timecard) => (
                        <div key={timecard.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(timecard.id)}
                                onChange={() => toggleSelection(timecard.id)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium">{timecard.employee_name || 'Unknown Employee'}</span>
                                  <span className="text-sm text-gray-500">({timecard.employee_code || 'N/A'})</span>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {timecard.department || 'No Department'} • {timecard.total_hours || 0}h regular, {timecard.total_overtime || 0}h OT
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Submitted {formatDate(timecard.submitted_at)}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailModal(timecard);
                                }}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  approveSingle(timecard.id);
                                }}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1 transition-colors"
                              >
                                <Check className="w-4 h-4" />
                                Approve
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Empty State */}
        {timecards.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No pending timecards to approve</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTimecard && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-white border-b px-6 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">Timecard Details</h2>
                  <div className="mt-2 text-sm text-gray-600">
                    <p className="font-medium">{selectedTimecard.employee_name} ({selectedTimecard.employee_code})</p>
                    <p>{selectedTimecard.department} • Week ending {formatDate(selectedTimecard.week_ending)}</p>
                  </div>
                </div>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingEntries ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* Daily Entries Table */}
                  <div className="mb-6">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Daily Time Entries
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Break</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Regular</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">OT</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {timecardEntries.length > 0 ? (
                            timecardEntries.map((entry) => (
                              <tr key={entry.id}>
                                <td className="px-4 py-2 text-sm whitespace-nowrap">{formatDate(entry.date)}</td>
                                <td className="px-4 py-2 text-sm">{formatTime(entry.start_time)}</td>
                                <td className="px-4 py-2 text-sm">{formatTime(entry.end_time)}</td>
                                <td className="px-4 py-2 text-sm">{entry.break_minutes || 0} min</td>
                                <td className="px-4 py-2 text-sm font-medium">{entry.regular_hours || 0}h</td>
                                <td className="px-4 py-2 text-sm font-medium text-orange-600">
                                  {entry.overtime_hours > 0 ? `${entry.overtime_hours}h` : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <div>
                                    <div className="font-medium">{entry.job_name || 'General'}</div>
                                    <div className="text-xs text-gray-500">{entry.job_code || 'N/A'}</div>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-sm">${entry.hourly_rate || 0}/hr</td>
                                <td className="px-4 py-2 text-sm text-gray-500 max-w-xs truncate">
                                  {entry.notes || '-'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                                No time entries found for this timecard
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Section */}
                  {timecardEntries.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Timecard Summary
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-sm text-gray-600">Regular Hours</div>
                          <div className="text-xl font-bold">{totals?.regularHours.toFixed(2)}h</div>
                        </div>
                        <div className="bg-orange-50 rounded p-3">
                          <div className="text-sm text-gray-600">Overtime Hours</div>
                          <div className="text-xl font-bold text-orange-600">{totals?.overtimeHours.toFixed(2)}h</div>
                        </div>
                        <div className="bg-green-50 rounded p-3">
                          <div className="text-sm text-gray-600">Estimated Total</div>
                          <div className="text-xl font-bold text-green-600">${totals?.totalAmount.toFixed(2)}</div>
                        </div>
                      </div>
                      
                      {/* Additional Summary from SQL function */}
                      {timecardSummary && (
                        <div className="mt-4 p-3 bg-blue-50 rounded">
                          <div className="text-sm text-gray-600">
                            Total entries: {timecardSummary.entry_count} days recorded
                          </div>
                          {timecardSummary.total_amount && (
                            <div className="text-sm text-gray-600 mt-1">
                              Database calculated total: ${parseFloat(timecardSummary.total_amount).toFixed(2)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeDetailModal}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => approveSingle(selectedTimecard.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Approve Timecard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// src/components/TimesheetModal.tsx
'use client';

import React from 'react';
import { X, Calendar, Clock, User, Building2, Check } from 'lucide-react';
import { format } from 'date-fns';

interface TimesheetEntry {
  id: string;
  date: string;
  project_id?: string;
  project_name?: string;
  project_code?: string;
  hours: number;
  description?: string;
}

interface TimesheetDetail {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_department?: string | null;
  week_ending: string;
  total_hours: number;
  total_overtime?: number;
  overtime_hours?: number;
  total_amount?: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  notes?: string | null;
  entries?: TimesheetEntry[];
}

interface TimesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  timesheet: TimesheetDetail | null;
  onApprove?: () => void;
  onReject?: () => void;
  processing?: boolean;
}

export default function TimesheetModal({
  isOpen,
  onClose,
  timesheet,
  onApprove,
  onReject,
  processing = false,
}: TimesheetModalProps) {
  if (!isOpen || !timesheet) return null;

  const getStatusColor = () => {
    switch (timesheet.status) {
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const entries = Array.isArray(timesheet.entries) ? timesheet.entries : [];

  const sortedEntries = [...entries].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;

    if (isNaN(dateA) && isNaN(dateB)) return 0;
    if (isNaN(dateA)) return 1;
    if (isNaN(dateB)) return -1;

    return dateA - dateB;
  });

  const calculatedTotalHours = sortedEntries.reduce((sum, entry) => {
    const hours = parseFloat(String(entry.hours)) || 0;
    return sum + hours;
  }, 0);

  const totalHours =
    sortedEntries.length > 0 ? calculatedTotalHours : timesheet.total_hours || 0;

  const totalRegular = Math.min(40, totalHours);
  const totalOvertime =
    timesheet.total_overtime ??
    timesheet.overtime_hours ??
    Math.max(0, totalHours - 40);

  const hourlyRate = 75;
  const regularAmount = totalRegular * hourlyRate;
  const overtimeAmount = totalOvertime * hourlyRate * 1.5;
  const estimatedTotal =
    timesheet.total_amount ?? regularAmount + overtimeAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#05202e] text-white px-6 py-4 z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">Timecard Details</h2>
              <span
                className={`inline-flex mt-2 px-2 py-1 text-xs font-semibold rounded ${getStatusColor()}`}
              >
                {timesheet.status.charAt(0).toUpperCase() +
                  timesheet.status.slice(1)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Employee Info */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-white/70" />
              <span className="font-medium text-lg text-white">
                {timesheet.employee_name}
              </span>
            </div>
            {timesheet.employee_department && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-white/70" />
                <span className="text-white/90">
                  {timesheet.employee_department}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-white/70" />
              <span className="text-white/90">
                Week ending{' '}
                {timesheet.week_ending &&
                !isNaN(new Date(timesheet.week_ending).getTime())
                  ? format(new Date(timesheet.week_ending), 'EEE, MMM dd, yyyy')
                  : timesheet.week_ending}
              </span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-medium text-gray-500">Regular Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalRegular.toFixed(1)}h
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-medium text-gray-500">Overtime Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalOvertime.toFixed(1)}h
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-medium text-gray-500">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalHours.toFixed(1)}h
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <p className="text-sm font-medium text-gray-500">Estimated Total</p>
              <p className="text-2xl font-bold text-green-600">
                ${estimatedTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Daily Time Entries */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Time Entries by Project ({sortedEntries.length} entries)
          </h3>

          {sortedEntries.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">
                No time entries found for this timecard
              </p>
              {timesheet.total_hours > 0 && (
                <p className="text-sm text-gray-400 mt-2">
                  (Timesheet shows {timesheet.total_hours.toFixed(1)} total hours
                  but entries may not be loaded)
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DATE
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PROJECT/JOB
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      REGULAR
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      OVERTIME
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TOTAL
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AMOUNT
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedEntries.map((entry, index) => {
                    // Running totals to split regular/overtime
                    const prior = sortedEntries.slice(0, index);
                    const runningTotal = prior.reduce((sum, e) => {
                      const hrs = parseFloat(String(e.hours)) || 0;
                      return sum + hrs;
                    }, 0);

                    const entryHours = parseFloat(String(entry.hours)) || 0;
                    const regularHours = Math.max(
                      0,
                      Math.min(entryHours, Math.max(0, 40 - runningTotal))
                    );
                    const overtimeHours = Math.max(0, entryHours - regularHours);

                    const regularAmount = regularHours * hourlyRate;
                    const overtimeAmount = overtimeHours * hourlyRate * 1.5;
                    const totalAmount = regularAmount + overtimeAmount;

                    // Safe date formatting & grouping
                    let currentDateStr = 'Invalid Date';
                    let showDate = index === 0;

                    if (entry.date) {
                      const d = new Date(entry.date);
                      if (!isNaN(d.getTime())) {
                        currentDateStr = format(d, 'EEE, MMM dd, yyyy');

                        const prevRaw = sortedEntries[index - 1]?.date;
                        const prevValid =
                          prevRaw && !isNaN(new Date(prevRaw).getTime())
                            ? format(new Date(prevRaw), 'yyyy-MM-dd')
                            : null;
                        const currKey = format(d, 'yyyy-MM-dd');

                        showDate = index === 0 || prevValid !== currKey;
                      }
                    }

                    return (
                      <tr key={entry.id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {showDate && (
                            <div className="font-medium text-gray-900">
                              {currentDateStr}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {entry.project_name || 'General Work'}
                          {entry.project_code && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({entry.project_code})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                          {regularHours.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                          {overtimeHours > 0 ? overtimeHours.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {entryHours.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-600">
                          ${totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total Row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-right text-gray-900">
                      Week Total:
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {totalRegular.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {totalOvertime.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {calculatedTotalHours.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      ${estimatedTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
          {timesheet.status === 'submitted' && onApprove && onReject && (
            <>
              <button
                onClick={onReject}
                disabled={processing}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={onApprove}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

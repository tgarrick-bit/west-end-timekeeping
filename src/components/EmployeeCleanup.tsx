'use client';

import React, { useState, useEffect } from 'react';
import { Users, Trash2, RotateCcw, Download, Upload, AlertTriangle, CheckCircle, XCircle, Info, X } from 'lucide-react';
import { originalEmployeeService, ORIGINAL_EMPLOYEES } from '@/lib/originalEmployeeService';
import { useNotifications } from '@/contexts/NotificationContext';
import { NOTIFICATION_TYPES } from '@/types/notifications';

export default function EmployeeCleanup() {
  const { createNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [employeeStats, setEmployeeStats] = useState({
    total: 0,
    original: 0,
    imported: 0,
    active: 0,
    inactive: 0,
    byRole: {} as Record<string, number>
  });
  const [validation, setValidation] = useState<{
    isValid: boolean;
    issues: string[];
  }>({ isValid: true, issues: [] });
  const [availableBackups, setAvailableBackups] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showBackupOptions, setShowBackupOptions] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [lastAction, setLastAction] = useState<{
    type: string;
    success: boolean;
    message: string;
  } | null>(null);

  // Load employee statistics and validation on mount
  useEffect(() => {
    if (isOpen) {
      loadEmployeeData();
    }
  }, [isOpen]);

  const loadEmployeeData = () => {
    try {
      const stats = originalEmployeeService.getEmployeeStats();
      const validationResult = originalEmployeeService.validateEmployeeData();
      const backups = originalEmployeeService.getAvailableBackups();

      setEmployeeStats(stats);
      setValidation(validationResult);
      setAvailableBackups(backups);
    } catch (error) {
      console.error('Failed to load employee data:', error);
    }
  };

  const handleResetToOriginal = async () => {
    setActionInProgress(true);
    
    try {
      // Create backup first
      const backupResult = originalEmployeeService.backupCurrentEmployees();
      
      if (backupResult.success) {
        // Reset to original employees
        const resetResult = originalEmployeeService.resetToOriginalEmployees();
        
        if (resetResult.success) {
          // Create success notification
          createNotification(
            NOTIFICATION_TYPES.SYSTEM_INTEGRATION,
            'admin-001',
            undefined,
            'system',
            {
              integration: 'Employee Cleanup',
              status: 'Reset Complete',
              message: `Successfully reset to ${resetResult.removedCount} original employees. Backup created: ${backupResult.message}`,
              removedCount: resetResult.removedCount
            }
          );

          setLastAction({
            type: 'reset',
            success: true,
            message: `Successfully reset to original employees. ${resetResult.removedCount} imported employees removed. Backup created: ${backupResult.message}`
          });

          // Reload data
          loadEmployeeData();
        } else {
          setLastAction({
            type: 'reset',
            success: false,
            message: `Reset failed: ${resetResult.message}`
          });
        }
      } else {
        setLastAction({
          type: 'reset',
          success: false,
          message: `Backup failed: ${backupResult.message}`
        });
      }
    } catch (error) {
      setLastAction({
        type: 'reset',
        success: false,
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setActionInProgress(false);
      setShowConfirmation(false);
    }
  };

  const handleRestoreFromBackup = async (backupKey: string) => {
    setActionInProgress(true);
    
    try {
      const restoreResult = originalEmployeeService.restoreFromBackup(backupKey);
      
      if (restoreResult.success) {
        setLastAction({
          type: 'restore',
          success: true,
          message: restoreResult.message
        });

        // Reload data
        loadEmployeeData();
      } else {
        setLastAction({
          type: 'restore',
          success: false,
          message: restoreResult.message
        });
      }
    } catch (error) {
      setLastAction({
        type: 'restore',
        success: false,
        message: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setActionInProgress(false);
      setShowBackupOptions(false);
    }
  };

  const handleDeleteBackup = (backupKey: string) => {
    if (confirm(`Are you sure you want to delete backup: ${backupKey}?`)) {
      try {
        localStorage.removeItem(backupKey);
        setAvailableBackups(prev => prev.filter(key => key !== backupKey));
      } catch (error) {
        console.error('Failed to delete backup:', error);
      }
    }
  };

  const getStatusColor = (isValid: boolean) => {
    return isValid ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />;
  };

  return (
    <div className="relative">
      {/* Employee Cleanup Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Employee Cleanup"
      >
        <Users className="w-5 h-5" />
        {employeeStats.imported > 0 && (
          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {employeeStats.imported}
          </span>
        )}
      </button>

      {/* Employee Cleanup Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Employee Cleanup</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[calc(80vh-120px)] overflow-y-auto">
            {/* Employee Statistics */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Current Status</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 p-2 rounded">
                  <div className="font-medium text-gray-900">Total Employees</div>
                  <div className="text-gray-600">{employeeStats.total}</div>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <div className="font-medium text-blue-900">Original Employees</div>
                  <div className="text-blue-600">{employeeStats.original}</div>
                </div>
                <div className="bg-orange-50 p-2 rounded">
                  <div className="font-medium text-orange-900">Imported Employees</div>
                  <div className="text-orange-600">{employeeStats.imported}</div>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <div className="font-medium text-green-900">Active Employees</div>
                  <div className="text-green-600">{employeeStats.active}</div>
                </div>
              </div>
            </div>

            {/* Data Validation */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Data Integrity</h4>
              <div className={`flex items-center space-x-2 p-2 rounded ${
                validation.isValid ? 'bg-green-50' : 'bg-red-50'
              }`}>
                {getStatusIcon(validation.isValid)}
                <span className={`text-sm font-medium ${getStatusColor(validation.isValid)}`}>
                  {validation.isValid ? 'Data Valid' : 'Data Issues Found'}
                </span>
              </div>
              
              {validation.issues.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-800">
                  <div className="font-medium mb-1">Issues:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Original Employees List */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Original Employees (Protected)</h4>
              <div className="space-y-1">
                {ORIGINAL_EMPLOYEES.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <div>
                      <div className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                      <div className="text-gray-600">{emp.email}</div>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      {emp.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {employeeStats.imported > 0 && (
                <button
                  onClick={() => setShowConfirmation(true)}
                  disabled={actionInProgress}
                  className={`w-full px-3 py-2 text-sm rounded-lg flex items-center justify-center space-x-2 ${
                    actionInProgress
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reset to Original Employees</span>
                </button>
              )}

              <button
                onClick={() => setShowBackupOptions(!showBackupOptions)}
                className="w-full px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Backup & Restore</span>
              </button>
            </div>

            {/* Backup Options */}
            {showBackupOptions && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Available Backups</h5>
                {availableBackups.length === 0 ? (
                  <p className="text-xs text-gray-600">No backups available</p>
                ) : (
                  <div className="space-y-2">
                    {availableBackups.map((backupKey) => (
                      <div key={backupKey} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="text-xs text-gray-600 truncate flex-1 mr-2">
                          {backupKey.replace('employee_backup_', 'Backup: ')}
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleRestoreFromBackup(backupKey)}
                            disabled={actionInProgress}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(backupKey)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Last Action Result */}
            {lastAction && (
              <div className={`mt-4 p-3 rounded-lg ${
                lastAction.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {lastAction.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <div className="text-sm">
                    <div className={`font-medium ${
                      lastAction.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {lastAction.type === 'reset' ? 'Reset Complete' : 'Restore Complete'}
                    </div>
                    <div className={`text-xs ${
                      lastAction.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {lastAction.message}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <Info className="w-3 h-3" />
              <span>This will remove all imported test employees</span>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Employee Reset</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">
                This action will:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Remove {employeeStats.imported} imported test employees</li>
                <li>Keep only the original 4 employees</li>
                <li>Create a backup of current data</li>
                <li>Clear all employee-related caches</li>
              </ul>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This action cannot be undone. Make sure you have a backup if needed.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToOriginal}
                disabled={actionInProgress}
                className={`flex-1 px-4 py-2 text-sm rounded-lg ${
                  actionInProgress
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {actionInProgress ? 'Processing...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

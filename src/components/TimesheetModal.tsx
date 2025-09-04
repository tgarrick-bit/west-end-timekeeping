import React from 'react';
import { X } from 'lucide-react';

interface TimesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  timesheet: any;
  onApprove?: () => void;
  onReject?: () => void;
}

export default function TimesheetModal({ 
  isOpen, 
  onClose, 
  timesheet, 
  onApprove, 
  onReject 
}: TimesheetModalProps) {
  if (!isOpen || !timesheet) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Timesheet Details</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {/* Add timesheet details here */}
          <pre>{JSON.stringify(timesheet, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
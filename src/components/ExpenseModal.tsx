import React from 'react';
import { X } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: any;
  onApprove?: () => void;
  onReject?: () => void;
}

export default function ExpenseModal({ 
  isOpen, 
  onClose, 
  expense, 
  onApprove, 
  onReject 
}: ExpenseModalProps) {
  if (!isOpen || !expense) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Expense Details</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {/* Add expense details here */}
          <pre>{JSON.stringify(expense, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
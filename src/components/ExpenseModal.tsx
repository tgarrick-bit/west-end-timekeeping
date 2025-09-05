// src/components/ExpenseModal.tsx

import React from 'react';
import { 
  X, 
  Calendar, 
  DollarSign, 
  Receipt, 
  Building, 
  MapPin, 
  CreditCard, 
  Briefcase,
  Image as ImageIcon,
  Check,
  AlertCircle
} from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: {
    id: string;
    employee_name: string;
    employee_email: string;
    employee_department?: string;
    expense_date: string;
    amount: number;
    category: string;
    description: string;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    submitted_at: string | null;
    approved_at?: string | null;
    approved_by?: string | null;
    receipt_urls?: string[];
    project_name?: string;
    vendor?: string;
    payment_method?: string;
    notes?: string;
  };
  onApprove?: () => void;
  onReject?: () => void;
  processing?: boolean;
}

export default function ExpenseModal({ 
  isOpen, 
  onClose, 
  expense, 
  onApprove, 
  onReject,
  processing = false
}: ExpenseModalProps) {
  if (!isOpen || !expense) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 border-gray-300',
      submitted: 'bg-amber-50 text-amber-700 border-amber-300',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      rejected: 'bg-red-50 text-red-700 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      travel: MapPin,
      meals: CreditCard,
      supplies: Briefcase,
      equipment: Building,
      other: Receipt
    };
    const Icon = icons[category.toLowerCase()] || Receipt;
    return <Icon className="h-5 w-5 text-[#e31c79]" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-50 rounded-lg">
                {getCategoryIcon(expense.category)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Expense Details</h2>
                <p className="text-sm text-gray-600">Review and approve expense submission</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Employee Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Employee Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium text-gray-900">{expense.employee_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{expense.employee_email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="font-medium text-gray-900">{expense.employee_department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(expense.status)}`}>
                  {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Expense Details */}
          <div className="bg-pink-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Expense Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-medium text-gray-900">{formatDate(expense.expense_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="font-bold text-2xl text-green-600">
                  {formatCurrency(expense.amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="font-medium text-gray-900 capitalize">
                  {expense.category}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Project</p>
                <p className="font-medium text-gray-900">
                  {expense.project_name || 'General'}
                </p>
              </div>
              {expense.vendor && (
                <div>
                  <p className="text-sm text-gray-600">Vendor</p>
                  <p className="font-medium text-gray-900">{expense.vendor}</p>
                </div>
              )}
              {expense.payment_method && (
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-medium text-gray-900">{expense.payment_method}</p>
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">Description</p>
              <p className="font-medium text-gray-900">
                {expense.description || 'No description provided'}
              </p>
            </div>
          </div>

          {/* Receipt */}
          {expense.receipt_urls && expense.receipt_urls.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Receipt Attachment</h3>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Receipt Attached</p>
                    <p className="text-sm text-gray-500">Click to view receipt image</p>
                  </div>
                  <a
                    href={expense.receipt_urls[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#e31c79] text-white rounded-lg hover:bg-[#c71865] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Receipt
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {expense.notes && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Additional Notes</h3>
              <div className="border rounded-lg p-4 bg-yellow-50">
                <p className="text-gray-700">{expense.notes}</p>
              </div>
            </div>
          )}

          {/* Submission Timeline */}
          <div className="text-sm text-gray-500 space-y-1">
            {expense.submitted_at && (
              <p>Submitted on {formatDate(expense.submitted_at)}</p>
            )}
            {expense.approved_at && (
              <p>
                {expense.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                {formatDate(expense.approved_at)}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Close
          </button>
          
          {expense.status === 'submitted' && onApprove && onReject && (
            <div className="flex gap-3">
              <button
                onClick={onReject}
                disabled={processing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                {processing ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={onApprove}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {processing ? 'Processing...' : 'Approve'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Search, Eye, Paperclip, X, FileText } from 'lucide-react'
import NotificationBell from '@/components/notifications/NotificationBell'

interface ExpenseEntry {
  id: string
  employee: {
    id: string
    name: string
    avatar: string
    department: string
  }
  date: string
  description: string
  category: string
  amount: number
  receipt?: {
    url: string
    filename: string
  }
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  notes?: string
}

export default function ExpenseReviewPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<{ url: string; filename: string } | null>(null)
  const [selectedExpense, setSelectedExpense] = useState<ExpenseEntry | null>(null)

  const mockExpenseData: ExpenseEntry[] = [
    {
      id: 'exp1',
      employee: { id: 'emp2', name: 'Sarah Johnson', avatar: 'SJ', department: 'Software Development' },
      date: '2025-08-19',
      description: 'Client dinner meeting',
      category: 'Meals & Entertainment',
      amount: 245.80,
      receipt: { url: '/receipts/dinner-receipt-081925.pdf', filename: 'dinner-receipt-081925.pdf' },
      status: 'pending',
      submittedAt: '2025-08-19T20:30:00Z',
      notes: 'Dinner with ABC Corp executives to discuss Q4 project requirements'
    },
    {
      id: 'exp2',
      employee: { id: 'emp3', name: 'David Kim', avatar: 'DK', department: 'Data Analysis' },
      date: '2025-08-18',
      description: 'Software license renewal',
      category: 'Software & Tools',
      amount: 156.30,
      receipt: { url: '/receipts/software-license-081825.pdf', filename: 'software-license-081825.pdf' },
      status: 'pending',
      submittedAt: '2025-08-18T14:15:00Z',
      notes: 'Annual renewal for data visualization software'
    },
    {
      id: 'exp3',
      employee: { id: 'emp1', name: 'Mike Chen', avatar: 'MC', department: 'Tech Infrastructure' },
      date: '2025-08-17',
      description: 'Parking for client site visit',
      category: 'Travel',
      amount: 15.00,
      status: 'pending',
      submittedAt: '2025-08-17T18:45:00Z',
      notes: 'Parking at downtown client office for server maintenance'
    }
  ]

  const filteredExpenses = mockExpenseData.filter(expense => {
    const matchesSearch = expense.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = !departmentFilter || expense.employee.department === departmentFilter
    const matchesCategory = !categoryFilter || expense.category === categoryFilter
    
    return matchesSearch && matchesDepartment && matchesCategory
  })

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(filteredExpenses.map(e => e.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const handleViewReceipt = (receipt: { url: string; filename: string }) => {
    setSelectedReceipt(receipt)
    setShowReceiptModal(true)
  }

  const handleViewDetails = (expense: ExpenseEntry) => {
    setSelectedExpense(expense)
    setShowDetailsModal(true)
  }

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch('/api/manager/Approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: mockExpenseData.find(e => e.id === id)?.employee.id,
          type: 'expense',
          action: 'approve_all'
        })
      })
      
      if (response.ok) {
        alert('Expense approved successfully!')
        // In a real app, you would refresh the data here
      } else {
        throw new Error('Approval failed')
      }
    } catch (error) {
      console.error('Approval failed:', error)
      alert('Approval failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleReject = async (id: string) => {
    try {
      const response = await fetch('/api/manager/Reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: mockExpenseData.find(e => e.id === id)?.employee.id,
          type: 'expense',
          action: 'reject'
        })
      })
      
      if (response.ok) {
        alert('Expense rejected successfully!')
        // In a real app, you would refresh the data here
      } else {
        throw new Error('Rejection failed')
      }
    } catch (error) {
      console.error('Rejection failed:', error)
      alert('Rejection failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleBulkApprove = async () => {
    if (selectedItems.length === 0) return
    
    try {
      // In a real app, you would send a bulk approval request
      alert(`Approving ${selectedItems.length} expenses...`)
      setSelectedItems([])
    } catch (error) {
      console.error('Bulk approval failed:', error)
      alert('Bulk approval failed')
    }
  }

  const handleBulkReject = async () => {
    if (selectedItems.length === 0) return
    
    try {
      // In a real app, you would send a bulk rejection request
      alert(`Rejecting ${selectedItems.length} expenses...`)
      setSelectedItems([])
    } catch (error) {
      console.error('Bulk rejection failed:', error)
      alert('Bulk rejection failed')
    }
  }

  const exportReport = (format: string) => {
    alert(`Exporting expense report as ${format}...`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src="/WE logo FC Mar2024.png" 
              alt="West End Workforce Logo" 
              className="w-8 h-8 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, Manager!</h1>
              <p className="text-gray-600">West End Workforce • Manager Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <NotificationBell className="text-gray-600 hover:text-pink-600" />
            
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
              M
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">Manager</div>
              <div className="text-xs text-gray-500">Manager</div>
            </div>
          </div>
        </div>
      </header>

      {/* Page Title Section */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.push('/manager')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Dashboard
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Pending Expenses</h2>
              <p className="text-gray-600">Review and approve contractor expense reports</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <div className="bg-white px-4 py-2 rounded-lg border">
              <span className="text-sm text-gray-500">Total Pending</span>
              <div className="text-lg font-semibold text-gray-900">2 expenses</div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border">
              <span className="text-sm text-gray-500">Total Amount</span>
              <div className="text-lg font-semibold text-gray-900">$402.10</div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border">
              <span className="text-sm text-gray-500">Avg. Expense</span>
              <div className="text-lg font-semibold text-gray-900">$201.05</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter/Search Section */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by contractor or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <select 
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
            >
              <option value="">All Contractors</option>
              <option value="Tech Infrastructure">Tech Infrastructure</option>
              <option value="Software Development">Software Development</option>
              <option value="Data Analysis">Data Analysis</option>
            </select>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500"
            >
              <option value="">All Categories</option>
              <option value="Meals & Entertainment">Meals & Entertainment</option>
              <option value="Travel">Travel</option>
              <option value="Software & Tools">Software & Tools</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => exportReport('csv')}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Export CSV
            </button>
            <button 
              onClick={handleBulkApprove}
              disabled={selectedItems.length === 0}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Approve All Visible
            </button>
          </div>
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input 
                  type="checkbox" 
                  checked={selectedItems.length === filteredExpenses.length && filteredExpenses.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contractor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Receipt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    checked={selectedItems.includes(expense.id)}
                    onChange={() => handleSelectItem(expense.id)}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                      {expense.employee.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{expense.employee.name}</div>
                      <div className="text-sm text-gray-500">{expense.employee.department}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {new Date(expense.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{expense.description}</div>
                  {expense.notes && (
                    <div className="text-xs text-gray-500 mt-1">{expense.notes}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {expense.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">${expense.amount}</td>
                <td className="px-6 py-4">
                  {expense.receipt ? (
                    <button 
                      onClick={() => handleViewReceipt(expense.receipt!)}
                      className="flex items-center text-blue-600 hover:text-blue-900"
                    >
                      <Paperclip className="w-4 h-4 mr-1" />
                      <span className="text-xs">View</span>
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">No receipt</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(expense.submittedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => handleViewDetails(expense)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleApprove(expense.id)}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium hover:bg-green-200"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleReject(expense.id)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium hover:bg-red-200"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions Footer */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedItems.length} expense{selectedItems.length !== 1 ? 's' : ''} selected
              </span>
              <button 
                onClick={() => setSelectedItems([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleBulkReject}
                className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
              >
                Reject Selected
              </button>
              <button 
                onClick={handleBulkApprove}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
              >
                Approve Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Viewer Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Receipt Preview</h3>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600">Filename: {selectedReceipt.filename}</p>
              </div>
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Receipt preview</p>
                <button 
                  onClick={() => window.open(selectedReceipt.url, '_blank')}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                  Open Full Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Details Modal */}
      {showDetailsModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Expense Details</h3>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Contractor</label>
                  <p className="text-gray-900">{selectedExpense.employee.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Department</label>
                  <p className="text-gray-900">{selectedExpense.employee.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <p className="text-gray-900">{new Date(selectedExpense.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-gray-900 font-semibold">${selectedExpense.amount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <p className="text-gray-900">{selectedExpense.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Submitted</label>
                  <p className="text-gray-900">{new Date(selectedExpense.submittedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="text-gray-900">{selectedExpense.description}</p>
              </div>
              {selectedExpense.notes && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-gray-900">{selectedExpense.notes}</p>
                </div>
              )}
              <div className="flex items-center justify-end space-x-3">
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button 
                  onClick={() => handleReject(selectedExpense.id)}
                  className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleApprove(selectedExpense.id)}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

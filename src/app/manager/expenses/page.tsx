'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Receipt, 
  User, 
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Eye,
  ArrowRight,
  Download,
  FileImage,
  TrendingUp,
  CreditCard
} from 'lucide-react'

interface ExpenseSubmission {
  id: string
  employeeId: string
  employeeName: string
  role: string
  date: string
  description: string
  amount: number
  category: string
  project: string
  isYourProject: boolean
  status: 'pending' | 'approved' | 'rejected'
  submissionDate: string
  receiptUrl?: string
  businessJustification?: string
  comments?: string
}

interface ExpenseStats {
  totalSubmissions: number
  pendingApprovals: number
  approvedThisWeek: number
  totalAmount: number
  totalValue: number
}

export default function ExpensesPage() {
  const router = useRouter()
  const { appUser } = useAuth()
  const [expenses, setExpenses] = useState<ExpenseSubmission[]>([])
  const [stats, setStats] = useState<ExpenseStats>({
    totalSubmissions: 0,
    pendingApprovals: 0,
    approvedThisWeek: 0,
    totalAmount: 0,
    totalValue: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [amountFilter, setAmountFilter] = useState<string>('all')
  const [selectedExpense, setSelectedExpense] = useState<ExpenseSubmission | null>(null)

  useEffect(() => {
    loadExpenseData()
  }, [])

  const loadExpenseData = async () => {
    // Simulate loading expense data
    setTimeout(() => {
      const mockExpenses: ExpenseSubmission[] = [
        {
          id: '1',
          employeeId: 'emp1',
          employeeName: 'Mike Chen',
          role: 'Tech Infrastructure',
          date: '2025-01-15',
          description: 'Developer tools and software licenses',
          amount: 89.50,
          category: 'Software',
          project: 'ABC Corp - Tech Infrastructure',
          isYourProject: true,
          status: 'pending',
          submissionDate: '2025-01-17',
          receiptUrl: '/receipt1.jpg',
          businessJustification: 'Required development tools for project completion'
        },
        {
          id: '2',
          employeeId: 'emp2',
          employeeName: 'Sarah Johnson',
          role: 'Software Development',
          date: '2025-01-15',
          description: 'Developer tools and software licenses',
          amount: 156.30,
          category: 'Software',
          project: 'ABC Corp - Software Development',
          isYourProject: true,
          status: 'pending',
          submissionDate: '2025-01-17',
          receiptUrl: '/receipt2.jpg',
          businessJustification: 'Required development tools for project completion'
        },
        {
          id: '3',
          employeeId: 'emp2',
          employeeName: 'Sarah Johnson',
          role: 'Software Development',
          date: '2025-01-17',
          description: 'Working lunch with client stakeholders',
          amount: 245.80,
          category: 'Meals',
          project: 'ABC Corp - Software Development',
          isYourProject: true,
          status: 'pending',
          submissionDate: '2025-01-17',
          receiptUrl: '/receipt3.jpg',
          businessJustification: 'Client meeting to discuss project requirements and feedback'
        },
        {
          id: '4',
          employeeId: 'emp3',
          employeeName: 'David Kim',
          role: 'Data Analysis',
          date: '2025-01-16',
          description: 'Office supplies and materials',
          amount: 156.30,
          category: 'Office Supplies',
          project: 'ABC Corp - Data Analysis',
          isYourProject: true,
          status: 'pending',
          submissionDate: '2025-01-16',
          receiptUrl: '/receipt4.jpg',
          businessJustification: 'Required materials for data analysis and reporting'
        },
        {
          id: '5',
          employeeId: 'emp4',
          employeeName: 'Lisa Wang',
          role: 'Project Management',
          date: '2025-01-14',
          description: 'Project management software subscription',
          amount: 400.70,
          category: 'Software',
          project: 'ABC Corp - Project Management',
          isYourProject: true,
          status: 'approved',
          submissionDate: '2025-01-15',
          receiptUrl: '/receipt5.jpg',
          businessJustification: 'Annual subscription for project management tools'
        },
        {
          id: '6',
          employeeId: 'emp5',
          employeeName: 'Alex Rodriguez',
          role: 'UX Design',
          date: '2025-01-16',
          description: 'Design software and plugins',
          amount: 89.99,
          category: 'Software',
          project: 'ABC Corp - UX Design',
          isYourProject: true,
          status: 'pending',
          submissionDate: '2025-01-17',
          receiptUrl: '/receipt6.jpg',
          businessJustification: 'Required design tools for UX project deliverables'
        },
        {
          id: '7',
          employeeId: 'emp6',
          employeeName: 'Emily Chen',
          role: 'Quality Assurance',
          date: '2025-01-17',
          description: 'Testing tools and equipment',
          amount: 89.99,
          category: 'Equipment',
          project: 'ABC Corp - Quality Assurance',
          isYourProject: true,
          status: 'pending',
          submissionDate: '2025-01-17',
          receiptUrl: '/receipt7.jpg',
          businessJustification: 'Required testing equipment for QA processes'
        }
      ]

      const mockStats: ExpenseStats = {
        totalSubmissions: mockExpenses.length,
        pendingApprovals: mockExpenses.filter(e => e.status === 'pending').length,
        approvedThisWeek: mockExpenses.filter(e => e.status === 'approved').length,
        totalAmount: mockExpenses.reduce((sum, e) => sum + e.amount, 0),
        totalValue: mockExpenses.filter(e => e.isYourProject).reduce((sum, e) => sum + e.amount, 0)
      }

      setExpenses(mockExpenses)
      setStats(mockStats)
      setIsLoading(false)
    }, 1000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Approval'
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      default:
        return 'Unknown'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'software':
        return <FileImage className="w-4 h-4 text-blue-600" />
      case 'meals':
        return <CreditCard className="w-4 h-4 text-green-600" />
      case 'office supplies':
        return <Receipt className="w-4 h-4 text-purple-600" />
      case 'equipment':
        return <TrendingUp className="w-4 h-4 text-orange-600" />
      default:
        return <Receipt className="w-4 h-4 text-gray-600" />
    }
  }

  const handleExpenseAction = (expense: ExpenseSubmission, action: string) => {
    if (action === 'review') {
      router.push(`/manager/approvals?employee=${expense.employeeId}&type=expense`)
    } else if (action === 'approve') {
      // In real app, this would make API call
    } else if (action === 'reject') {
      // In real app, this would make API call
    }
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter
    const matchesAmount = amountFilter === 'all' || 
                         (amountFilter === 'low' && expense.amount < 100) ||
                         (amountFilter === 'medium' && expense.amount >= 100 && expense.amount < 500) ||
                         (amountFilter === 'high' && expense.amount >= 500)
    return matchesSearch && matchesStatus && matchesCategory && matchesAmount
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading Expenses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - EXACTLY matching Admin Dashboard */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Expense Management
            </h1>
            <p className="text-gray-600 mt-1">
              ABC Corporation - External Approver
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Review and approve expense submissions
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Manager ID</p>
            <p className="font-mono text-gray-900">{appUser?.id}</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards - EXACTLY matching Admin Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="p-6 rounded-lg border bg-pink-50 text-pink-700 border-pink-200">
          <h3 className="text-sm font-medium opacity-75">Total Submissions</h3>
          <p className="text-2xl font-bold mt-1">{stats.totalSubmissions}</p>
          <p className="text-sm opacity-75 mt-1">This period</p>
        </div>

        <div className="p-6 rounded-lg border bg-[#05202E]/10 text-[#05202E] border-[#05202E]/20">
          <h3 className="text-sm font-medium opacity-75">Pending Approval</h3>
          <p className="text-2xl font-bold mt-1">{stats.pendingApprovals}</p>
          <p className="text-sm opacity-75 mt-1">Awaiting review</p>
        </div>

        <div className="p-6 rounded-lg border bg-[#E5DDD8]/50 text-[#05202E] border-[#E5DDD8]">
          <h3 className="text-sm font-medium opacity-75">Approved This Week</h3>
          <p className="text-2xl font-bold mt-1">{stats.approvedThisWeek}</p>
          <p className="text-sm opacity-75 mt-1">Completed</p>
        </div>

        <div className="p-6 rounded-lg border bg-blue-50 text-blue-700 border-blue-200">
          <h3 className="text-sm font-medium opacity-75">Total Amount</h3>
          <p className="text-2xl font-bold mt-1">${stats.totalAmount.toLocaleString()}</p>
          <p className="text-sm opacity-75 mt-1">All expenses</p>
        </div>

        <div className="p-6 rounded-lg border bg-green-50 text-green-700 border-green-200">
          <h3 className="text-sm font-medium opacity-75">Your Projects</h3>
          <p className="text-2xl font-bold mt-1">${stats.totalValue.toLocaleString()}</p>
          <p className="text-sm opacity-75 mt-1">Billable amount</p>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search expenses by description, employee, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="Software">Software</option>
                <option value="Meals">Meals</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <select
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              >
                <option value="all">All Amounts</option>
                <option value="low">Low (&lt;$100)</option>
                <option value="medium">Medium ($100-$500)</option>
                <option value="high">High (&gt;$500)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Expense List - EXACTLY matching Admin Dashboard style */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-blue-600" />
            Expense Submissions
          </h2>
          <div className="flex space-x-2">
            <button 
              className="bg-[#05202E] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#0a2f3f] transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export All
            </button>
          </div>
        </div>

        {filteredExpenses.length > 0 ? (
          <div className="space-y-4">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{expense.description}</h3>
                      <p className="text-sm text-gray-600">Employee: {expense.employeeName} • {expense.role}</p>
                      <p className="text-sm text-gray-600">Project: {expense.project.split(' - ')[1]}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Submitted: {formatDate(expense.submissionDate)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(expense.status)}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(expense.status)}`}>
                          {getStatusText(expense.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Date: {formatDate(expense.date)}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        {getCategoryIcon(expense.category)}
                        <span className="text-sm text-gray-600">{expense.category}</span>
                      </div>
                      {expense.businessJustification && (
                        <p className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                          {expense.businessJustification}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        ${expense.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className={`text-sm font-medium ${expense.isYourProject ? 'text-[#e31c79]' : 'text-gray-500'}`}>
                        {expense.isYourProject ? 'Your Project' : 'Other Project'}
                      </p>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      {expense.status === 'pending' ? (
                        <>
                          <button 
                            onClick={() => handleExpenseAction(expense, 'approve')}
                            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </button>
                          <button 
                            onClick={() => handleExpenseAction(expense, 'reject')}
                            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </button>
                        </>
                      ) : null}
                      
                      <button 
                        onClick={() => handleExpenseAction(expense, 'review')}
                        className="bg-[#e31c79] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#c41a6b] transition-colors flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review Details
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expense Details */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Business Justification</h4>
                      <p className="text-sm text-gray-600">
                        {expense.businessJustification || 'No justification provided'}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Receipt</h4>
                      {expense.receiptUrl ? (
                        <button 
                          onClick={() => setSelectedExpense(expense)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                        >
                          <FileImage className="w-4 h-4 mr-1" />
                          View Receipt
                        </button>
                      ) : (
                        <p className="text-sm text-gray-500">No receipt attached</p>
                      )}
                    </div>
                    
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Quick Actions</h4>
                      <div className="space-y-2">
                        {expense.status === 'pending' && (
                          <button 
                            onClick={() => handleExpenseAction(expense, 'approve')}
                            className="w-full bg-green-600 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-green-700 transition-colors"
                          >
                            Quick Approve
                          </button>
                        )}
                        <button 
                          onClick={() => handleExpenseAction(expense, 'review')}
                          className="w-full bg-[#e31c79] text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-[#c41a6b] transition-colors"
                        >
                          Full Review
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No expenses found</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Receipt for {selectedExpense.description}</h3>
              <button 
                onClick={() => setSelectedExpense(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="text-center">
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <FileImage className="w-16 h-16 text-gray-400" />
                <p className="text-gray-500 ml-2">Receipt Image</p>
              </div>
              <p className="text-sm text-gray-600">
                Receipt for ${selectedExpense.amount.toFixed(2)} on {formatDate(selectedExpense.date)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedExpense.employeeName} • {selectedExpense.category}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

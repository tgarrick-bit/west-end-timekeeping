'use client'

import { useState } from 'react'
import { 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  MessageSquare,
  Download,
  Calendar,
  Building,
  Receipt,
  ArrowLeft
} from 'lucide-react'

interface TimeEntry {
  id: string
  date: string
  projectName: string
  clientName: string
  hours: number
  isYourProject: boolean
  hourlyRate: number
  notes?: string
}

interface ExpenseItem {
  id: string
  description: string
  amount: number
  date: string
  category: string
  projectName: string
  clientName: string
  receiptUrl?: string
  isYourProject: boolean
}

interface EmployeeReviewDetailProps {
  employee: {
    id: string
    name: string
    role: string
    employeeId: string
    hourlyRate: number
  }
  week: string
  timeEntries: TimeEntry[]
  expenses: ExpenseItem[]
  onApprove: (type: 'timesheet' | 'expense' | 'both') => void
  onReject: (type: 'timesheet' | 'expense' | 'both', reason?: string) => void
  onBack: () => void
}

export default function EmployeeReviewDetail({
  employee,
  week,
  timeEntries,
  expenses,
  onApprove,
  onReject,
  onBack
}: EmployeeReviewDetailProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectionType, setRejectionType] = useState<'timesheet' | 'expense' | 'both'>('both')

  const yourProjectHours = timeEntries.filter(entry => entry.isYourProject)
  const otherProjectHours = timeEntries.filter(entry => !entry.isYourProject)
  const yourProjectExpenses = expenses.filter(expense => expense.isYourProject)
  const otherProjectExpenses = expenses.filter(expense => !expense.isYourProject)

  const totalYourHours = yourProjectHours.reduce((sum, entry) => sum + entry.hours, 0)
  const totalOtherHours = otherProjectHours.reduce((sum, entry) => sum + entry.hours, 0)
  const totalYourExpenses = yourProjectExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const totalOtherExpenses = otherProjectExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  const totalYourCost = totalYourHours * employee.hourlyRate + totalYourExpenses

  const handleReject = (type: 'timesheet' | 'expense' | 'both') => {
    setRejectionType(type)
    setShowRejectionModal(true)
  }

  const confirmRejection = () => {
    onReject(rejectionType, rejectionReason)
    setShowRejectionModal(false)
    setRejectionReason('')
  }

  const getDayName = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-[#05202E] hover:text-[#e31c79] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Approvals</span>
        </button>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#05202E] mb-2">
                Employee Review: {employee.name}
              </h1>
              <p className="text-lg text-gray-600 mb-1">{employee.role}</p>
              <p className="text-sm text-gray-500">Employee ID: {employee.employeeId}</p>
              <p className="text-sm text-gray-500">Week: {week}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Hourly Rate</div>
              <div className="text-2xl font-bold text-[#e31c79]">${employee.hourlyRate}/hr</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-[#e31c79] bg-opacity-10 rounded-lg">
              <Clock className="w-6 h-6 text-[#e31c79]" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Your Project Hours</p>
              <p className="text-2xl font-bold text-[#e31c79]">{totalYourHours.toFixed(1)}h</p>
              <p className="text-xs text-gray-500">${(totalYourHours * employee.hourlyRate).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Your Project Expenses</p>
              <p className="text-2xl font-bold text-blue-600">${totalYourExpenses.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{yourProjectExpenses.length} items</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Your Cost</p>
              <p className="text-2xl font-bold text-green-600">${totalYourCost.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Hours + Expenses</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Building className="w-6 h-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Other Projects</p>
              <p className="text-2xl font-bold text-gray-600">{totalOtherHours.toFixed(1)}h</p>
              <p className="text-xs text-gray-500">Not your approval</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timesheet Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-[#05202E] flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Weekly Timesheet
          </h2>
        </div>
        
        <div className="p-6">
          {/* Daily Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => {
              const dayEntries = timeEntries.filter(entry => {
                const entryDate = new Date(entry.date)
                const dayOfWeek = entryDate.getDay()
                return dayOfWeek === (index + 1) % 7 // Monday = 1, Sunday = 0
              })
              
              const yourHours = dayEntries
                .filter(entry => entry.isYourProject)
                .reduce((sum, entry) => sum + entry.hours, 0)
              const otherHours = dayEntries
                .filter(entry => !entry.isYourProject)
                .reduce((sum, entry) => sum + entry.hours, 0)
              
              return (
                <div key={day} className="text-center">
                  <div className="font-medium text-[#05202E] mb-2">{day}</div>
                  <div className="space-y-2">
                    {yourHours > 0 && (
                      <div className="bg-[#e31c79] bg-opacity-10 p-2 rounded border border-[#e31c79] border-opacity-30">
                        <div className="text-sm font-medium text-[#e31c79]">{yourHours.toFixed(1)}h</div>
                        <div className="text-xs text-[#e31c79]">Your Projects</div>
                      </div>
                    )}
                    {otherHours > 0 && (
                      <div className="bg-gray-100 p-2 rounded opacity-60">
                        <div className="text-sm font-medium text-gray-600">{otherHours.toFixed(1)}h</div>
                        <div className="text-xs text-gray-500">Other Projects</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Project Breakdown */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[#05202E]">Project Breakdown</h3>
            {timeEntries.map((entry) => (
              <div key={entry.id} className={`p-3 rounded border ${
                entry.isYourProject 
                  ? 'bg-[#e31c79] bg-opacity-10 border-[#e31c79] border-opacity-30' 
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-medium ${
                      entry.isYourProject ? 'text-[#e31c79]' : 'text-gray-600'
                    }`}>
                      {entry.projectName}
                    </p>
                    <p className="text-sm text-gray-500">{entry.clientName}</p>
                    <p className="text-xs text-gray-400">{entry.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{entry.hours.toFixed(1)} hrs</p>
                    <p className="text-sm text-gray-500">${entry.hourlyRate}/hr</p>
                    {entry.isYourProject && (
                      <p className="text-xs text-[#e31c79] font-medium">✓ Your Project</p>
                    )}
                  </div>
                </div>
                {entry.notes && (
                  <p className="text-sm text-gray-600 mt-2 italic">"{entry.notes}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses Section */}
      {expenses.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#05202E] flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Pending Expenses
            </h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div key={expense.id} className={`p-4 rounded border ${
                  expense.isYourProject 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className={`font-medium ${
                        expense.isYourProject ? 'text-blue-900' : 'text-gray-600'
                      }`}>
                        {expense.description}
                      </p>
                      <p className="text-sm text-gray-600">{expense.category}</p>
                      <p className="text-sm text-gray-500">Date: {expense.date}</p>
                      <p className="text-sm text-gray-500">
                        Project: {expense.projectName} - {expense.clientName}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-blue-900">${expense.amount}</p>
                      {expense.isYourProject && (
                        <p className="text-xs text-blue-600 font-medium">✓ Your Project</p>
                      )}
                    </div>
                  </div>
                  
                  {expense.isYourProject && (
                    <div className="flex space-x-2 mt-3">
                      <button className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors flex items-center space-x-1">
                        <Receipt className="w-4 h-4" />
                        <span>Receipt</span>
                      </button>
                      <button className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm hover:bg-green-200 transition-colors">
                        Approve
                      </button>
                      <button className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200 transition-colors">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Approval Actions */}
      <div className="bg-[#E5DDD8] rounded-lg border border-[#05202E] border-opacity-20 p-6">
        <h3 className="text-lg font-medium text-[#05202E] mb-4">Approval Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => onApprove('both')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Approve Everything (Timesheet + Expenses)</span>
          </button>
          
          <button 
            onClick={() => onApprove('timesheet')}
            className="bg-[#e31c79] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#c41a6b] transition-colors flex items-center space-x-2"
          >
            <Clock className="w-5 h-5" />
            <span>Approve Timesheet Only</span>
          </button>
          
          {expenses.length > 0 && (
            <button 
              onClick={() => onApprove('expense')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <DollarSign className="w-5 h-5" />
              <span>Approve Expenses Only</span>
            </button>
          )}
          
          <button 
            onClick={() => handleReject('both')}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <XCircle className="w-5 h-5" />
            <span>Reject All</span>
          </button>
          
          <button className="bg-[#05202E] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#0a2f3f] transition-colors flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Request Changes</span>
          </button>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-[#05202E] mb-4">
              Reject {rejectionType === 'both' ? 'Everything' : rejectionType === 'timesheet' ? 'Timesheet' : 'Expenses'}
            </h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="w-full p-3 border border-gray-300 rounded-md mb-4 h-24 resize-none"
            />
            <div className="flex space-x-3">
              <button
                onClick={confirmRejection}
                className="bg-red-600 text-white px-4 py-2 rounded-md font-medium hover:bg-red-700 transition-colors"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => setShowRejectionModal(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

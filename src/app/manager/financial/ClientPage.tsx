'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  
  ArrowLeft, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface FinancialData {
  totalHours: number
  totalCost: number
  totalExpenses: number
  approvedHours: number
  approvedCost: number
  pendingHours: number
  pendingCost: number
  pendingExpenses: number
  hourlyRates: { rate: number; hours: number; cost: number }[]
  monthlyTrends: { month: string; hours: number; cost: number }[]
  contractorBreakdown: { name: string; hours: number; cost: number; expenses: number }[]
}

export default function ManagerFinancialPage() {
  const router = useRouter()
  const { appUser } = useAuth()
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('current_month')
  const [viewMode, setViewMode] = useState<'overview' | 'breakdown' | 'trends'>('overview')

  useEffect(() => {
    loadFinancialData()
  }, [selectedPeriod])

  const loadFinancialData = async () => {
    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      const mockData: FinancialData = {
        totalHours: 125.5,
        totalCost: 12450.75,
        totalExpenses: 402.10,
        approvedHours: 98.0,
        approvedCost: 9875.50,
        pendingHours: 27.5,
        pendingCost: 2575.25,
        pendingExpenses: 156.30,
        hourlyRates: [
          { rate: 120, hours: 40.0, cost: 4800.00 },
          { rate: 110, hours: 37.5, cost: 4125.00 },
          { rate: 95, hours: 26.0, cost: 2470.00 },
          { rate: 85, hours: 22.0, cost: 1870.00 }
        ],
        monthlyTrends: [
          { month: 'Oct 2024', hours: 480, cost: 45600 },
          { month: 'Nov 2024', hours: 520, cost: 49400 },
          { month: 'Dec 2024', hours: 440, cost: 41800 },
          { month: 'Jan 2025', hours: 125, cost: 12450 }
        ],
        contractorBreakdown: [
          { name: 'Lisa Wang', hours: 40.0, cost: 4800.00, expenses: 0 },
          { name: 'Sarah Johnson', hours: 37.5, cost: 4125.00, expenses: 245.80 },
          { name: 'Mike Chen', hours: 26.0, cost: 2470.00, expenses: 0 },
          { name: 'David Kim', hours: 22.0, cost: 1870.00, expenses: 156.30 }
        ]
      }
      
      setFinancialData(mockData)
      setIsLoading(false)
    }, 1000)
  }

  const handleExport = (type: string) => {
    // In a real app, this would export the data
    alert(`Exporting ${type} data`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)} hrs`
  }

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading Financial Data...</p>
        </div>
      </div>
    )
  }

  if (!financialData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No financial data available</p>
      </div>
    )
  }

  const totalApproved = financialData.approvedCost + financialData.totalExpenses
  const totalPending = financialData.pendingCost + financialData.pendingExpenses
  const previousMonth = financialData.monthlyTrends[financialData.monthlyTrends.length - 2]
  const currentMonth = financialData.monthlyTrends[financialData.monthlyTrends.length - 1]
  const hoursChange = getPercentageChange(currentMonth.hours, previousMonth.hours)
  const costChange = getPercentageChange(currentMonth.cost, previousMonth.cost)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={() => router.push('/manager')}
          className="flex items-center text-[#e31c79] hover:text-[#c41a6b] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#05202E] mb-2">
                Financial Overview
              </h1>
              <p className="text-gray-600">
                Monitor costs, expenses, and financial trends for your contractors
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e31c79] focus:border-transparent"
              >
                <option value="current_week">Current Week</option>
                <option value="current_month">Current Month</option>
                <option value="last_month">Last Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              
              <button
                onClick={() => handleExport('financial')}
                className="bg-[#e31c79] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#c41a6b] transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setViewMode('overview')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'overview'
              ? 'bg-white text-[#e31c79] shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setViewMode('breakdown')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'breakdown'
              ? 'bg-white text-[#e31c79] shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <PieChart className="w-4 h-4 inline mr-2" />
          Breakdown
        </button>
        <button
          onClick={() => setViewMode('trends')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'trends'
              ? 'bg-white text-[#e31c79] shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Trends
        </button>
      </div>

      {/* Overview Tab */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-[#e31c79] bg-opacity-10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-[#e31c79]" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Cost</p>
                  <p className="text-2xl font-bold text-[#05202E]">
                    {formatCurrency(financialData.totalCost)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatHours(financialData.totalHours)} • {formatCurrency(financialData.totalExpenses)} expenses
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-[#05202E]">
                    {formatCurrency(totalApproved)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatHours(financialData.approvedHours)} • {formatCurrency(financialData.totalExpenses)} expenses
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-[#05202E]">
                    {formatCurrency(totalPending)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatHours(financialData.pendingHours)} • {formatCurrency(financialData.pendingExpenses)} expenses
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Monthly Trend</p>
                  <p className="text-2xl font-bold text-[#05202E]">
                    {costChange > 0 ? '+' : ''}{costChange.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    vs last month
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#05202E]">Cost Breakdown by Hourly Rate</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {financialData.hourlyRates.map((rate, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-[#e31c79] bg-opacity-10 rounded-lg flex items-center justify-center">
                        <span className="text-[#e31c79] font-bold text-lg">${rate.rate}</span>
                      </div>
                      <div>
                        <div className="font-medium text-[#05202E]">${rate.rate}/hr</div>
                        <div className="text-sm text-gray-600">{formatHours(rate.hours)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#e31c79]">
                        {formatCurrency(rate.cost)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {((rate.hours / financialData.totalHours) * 100).toFixed(1)}% of total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Tab */}
      {viewMode === 'breakdown' && (
        <div className="space-y-6">
          {/* Contractor Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#05202E]">Contractor Cost Breakdown</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {financialData.contractorBreakdown.map((contractor, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-[#e31c79] bg-opacity-10 rounded-full flex items-center justify-center">
                        <span className="text-[#e31c79] font-bold text-lg">
                          {contractor.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-[#05202E]">{contractor.name}</div>
                        <div className="text-sm text-gray-600">{formatHours(contractor.hours)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#e31c79]">
                        {formatCurrency(contractor.cost)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {contractor.expenses > 0 && `+ ${formatCurrency(contractor.expenses)} expenses`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#e31c79]">
                  {formatCurrency(financialData.totalCost)}
                </div>
                <div className="text-sm text-gray-600">Total Labor Cost</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatHours(financialData.totalHours)} at various rates
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(financialData.totalExpenses)}
                </div>
                <div className="text-sm text-gray-600">Total Expenses</div>
                <div className="text-xs text-gray-500 mt-1">
                  Approved contractor expenses
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(financialData.totalCost + financialData.totalExpenses)}
                </div>
                <div className="text-sm text-gray-600">Total Cost</div>
                <div className="text-xs text-gray-500 mt-1">
                  Labor + Expenses
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {viewMode === 'trends' && (
        <div className="space-y-6">
          {/* Monthly Trends */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#05202E]">Monthly Trends</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {financialData.monthlyTrends.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-[#e31c79] bg-opacity-10 rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-[#e31c79]" />
                      </div>
                      <div>
                        <div className="font-medium text-[#05202E]">{month.month}</div>
                        <div className="text-sm text-gray-600">{formatHours(month.hours)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#e31c79]">
                        {formatCurrency(month.cost)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {index > 0 && (
                          <span className={getPercentageChange(month.cost, financialData.monthlyTrends[index - 1].cost) > 0 ? 'text-green-600' : 'text-red-600'}>
                            {getPercentageChange(month.cost, financialData.monthlyTrends[index - 1].cost) > 0 ? '↗' : '↘'} 
                            {Math.abs(getPercentageChange(month.cost, financialData.monthlyTrends[index - 1].cost)).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trend Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-[#05202E] mb-4">Hours Trend</h3>
              <div className="text-center">
                <div className={`text-3xl font-bold ${hoursChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {hoursChange > 0 ? '+' : ''}{hoursChange.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">vs last month</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatHours(currentMonth.hours)} vs {formatHours(previousMonth.hours)}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-[#05202E] mb-4">Cost Trend</h3>
              <div className="text-center">
                <div className={`text-3xl font-bold ${costChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {costChange > 0 ? '+' : ''}{costChange.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">vs last month</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatCurrency(currentMonth.cost)} vs {formatCurrency(previousMonth.cost)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => handleExport('timesheet')}
          className="bg-orange-100 text-orange-700 p-4 rounded-lg hover:bg-orange-200 transition-colors text-center"
        >
          <Download className="w-8 h-8 mx-auto mb-2" />
          <div className="font-medium">Export Timesheet Data</div>
          <div className="text-sm text-orange-600">Hours and costs breakdown</div>
        </button>
        
        <button 
          onClick={() => handleExport('expenses')}
          className="bg-blue-100 text-blue-700 p-4 rounded-lg hover:bg-blue-200 transition-colors text-center"
        >
          <Download className="w-8 h-8 mx-auto mb-2" />
          <div className="font-medium">Export Expense Data</div>
          <div className="text-sm text-blue-600">Detailed expense breakdown</div>
        </button>
        
        <button 
          onClick={() => handleExport('financial')}
          className="bg-green-100 text-green-700 p-4 rounded-lg hover:bg-green-200 transition-colors text-center"
        >
          <Download className="w-8 h-8 mx-auto mb-2" />
          <div className="font-medium">Export Financial Summary</div>
          <div className="text-sm text-green-600">Complete financial overview</div>
        </button>
      </div>
    </div>
  )
}

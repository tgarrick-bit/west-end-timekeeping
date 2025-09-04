'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import TopNavigation from '@/components/navigation/TopNavigation'
import { Clock, DollarSign, User, Plus, Receipt, ChevronRight } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (!user) {
        router.push('/login')
        return
      }

      // Check if this user should be redirected based on role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      // Force redirect based on role
      if (profile?.role === 'admin') {
        router.push('/admin/dashboard')
        return
      }
      if (profile?.role === 'manager') {
        router.push('/manager/pending')
        return
      }
      
      // If employee, stay on this page
      setIsLoading(false)
    }

    checkUserAndRedirect()
  }, [user, router, supabase])

  const handleCardClick = (route: string) => {
    router.push(route)
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'timesheet':
        router.push('/timesheets')
        break
      case 'expense':
        router.push('/expenses')
        break
      default:
        break
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show employee dashboard
  return (
    <ProtectedRoute allowedRoles={['employee']}>
      <TopNavigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {`${user.first_name} ${user.last_name}`}!
                </h1>
                <p className="text-gray-600 mt-1">
                  Employee • Employee Dashboard
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ID: {user.id}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div 
              onClick={() => handleCardClick('/timesheets')}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-pink-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Timesheets</h3>
              <p className="text-gray-600 text-sm">Track time and submit weekly timesheets</p>
            </div>

            <div 
              onClick={() => handleCardClick('/expenses')}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Expenses</h3>
              <p className="text-gray-600 text-sm">Submit and track business expenses</p>
            </div>

            <div 
              onClick={() => handleCardClick('/profile')}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile</h3>
              <p className="text-gray-600 text-sm">Update your personal information</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last timesheet submitted</p>
                    <p className="text-xs text-gray-500">Submitted for approval</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-900">2 days ago</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Hours this month</p>
                    <p className="text-xs text-gray-500">Total logged hours</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900">0.0h</p>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Average daily hours</p>
                    <p className="text-xs text-gray-500">Daily average this month</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900">0.0h</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => handleQuickAction('timesheet')}
                className="flex items-center justify-center space-x-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-4 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add Time Entry</span>
              </button>

              <button 
                onClick={() => handleQuickAction('expense')}
                className="flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Receipt className="w-5 h-5" />
                <span className="font-medium">Submit Expense</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

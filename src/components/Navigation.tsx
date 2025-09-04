'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Calendar, 
  Receipt, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  LayoutDashboard,
  FileText,
  Building,
  BarChart3,
  Plus,
  User
} from 'lucide-react'


export function Navigation() {
  const { appUser, signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (!appUser) return null

  const navigationItems = getNavigationItems(appUser.role)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <nav className="bg-[#05202E] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#e31c79] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">WE</span>
              </div>
              <span className="text-xl font-bold">West End Workforce</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-[#465079] transition-colors"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-300">Welcome,</span>
                              <span className="ml-1 font-medium">{`${appUser.first_name} ${appUser.last_name}`}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium hover:bg-[#465079] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md hover:bg-[#465079] transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[#465079]">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium hover:bg-[#05202E] transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="border-t border-gray-600 pt-4 mt-4">
              <div className="px-3 py-2 text-sm text-gray-300">
                Welcome, {`${appUser.first_name} ${appUser.last_name}`}
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium hover:bg-[#05202E] transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

function getNavigationItems(role: string) {
  const baseItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]

  switch (role) {
    case 'employee':
      return [
        ...baseItems,
        { href: '/timesheets', label: 'Timesheets', icon: Calendar },
        { href: '/expenses', label: 'Expenses', icon: Receipt },
        { href: '/projects', label: 'Projects', icon: Building },
        { href: '/profile', label: 'Profile', icon: User },
      ]
    
    case 'client_approver':
      return [
        ...baseItems,
        { href: '/approvals', label: 'Approvals', icon: FileText },
        { href: '/reports', label: 'Reports', icon: BarChart3 },
      ]
    
    case 'admin':
      return [
        ...baseItems,
        { href: '/admin/employees', label: 'Employees', icon: Users },
        { href: '/admin/clients', label: 'Clients', icon: Building },
        { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
      ]
    
    case 'payroll':
      return [
        ...baseItems,
        { href: '/timesheets', label: 'Timesheets', icon: Calendar },
        { href: '/expenses', label: 'Expenses', icon: Receipt },
        { href: '/reports', label: 'Reports', icon: BarChart3 },
        { href: '/export', label: 'Export', icon: FileText },
      ]
    
    default:
      return baseItems
  }
}





'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Building, ChevronDown, LogOut, Settings, User, Home, TestTube, Bell } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function TopNavigation() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (!user) return null;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'from-purple-500 to-purple-600';
      case 'manager': return 'from-blue-500 to-blue-600';
      case 'employee': return 'from-pink-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const navigateToProfile = () => {
    switch (user.role) {
      case 'admin':
        router.push('/admin/settings');
        break;
      case 'manager':
        router.push('/manager/profile');
        break;
      case 'employee':
        router.push('/profile');
        break;
    }
    setShowUserMenu(false);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <img 
              src="/WE logo FC Mar2024.png" 
              alt="West End Workforce Logo" 
              className="w-8 h-8 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">West End Workforce</h1>
              <p className="text-sm text-gray-500">Timesheet & Expense Management</p>
            </div>
          </div>
          
          {/* Dashboard Link */}
          {/* Removed Dashboard link to clean up navigation */}
        </div>

        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <NotificationBell />
          
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
            >
              <div className={`w-10 h-10 bg-gradient-to-r ${getRoleColor(user.role)} rounded-full flex items-center justify-center text-white font-semibold`}>
                {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">{`${user.first_name} ${user.last_name}`}</div>
                <div className="text-xs text-gray-500 capitalize">{user.role}</div>

              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => { router.push('/notifications'); setShowUserMenu(false); }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </button>
                
                <button
                  onClick={navigateToProfile}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User className="w-4 h-4" />
                  <span>Profile Settings</span>
                </button>
                
                {user.role === 'admin' && (
                  <button
                    onClick={() => { router.push('/admin/settings'); setShowUserMenu(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4" />
                    <span>System Settings</span>
                  </button>
                )}
                
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={() => { router.push('/test-notifications'); setShowUserMenu(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <TestTube className="w-4 h-4" />
                    <span>Test Notifications</span>
                  </button>
                )}
                
                <hr className="my-1" />
                
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

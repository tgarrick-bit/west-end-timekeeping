'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, Phone, MapPin, Building } from 'lucide-react';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function ProfilePage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!appUser) {
      router.push('/auth/signin');
    } else {
      setIsLoading(false);
    }
  }, [appUser, router]);

  return (
    <ProtectedRoute allowedRoles={['employee']}>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center text-pink-600 hover:text-pink-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
              <div className="h-8 w-px bg-gray-300"></div>
              <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            </div>
          </div>
          <p className="text-gray-600 mt-2">
            Manage your personal information and account settings
          </p>
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center space-x-6 mb-8">
            <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center">
              <User className="h-12 w-12 text-pink-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {appUser ? `${appUser.first_name} ${appUser.last_name}` : ''}
              </h2>
              <p className="text-gray-600 capitalize">{appUser?.role}</p>
              <p className="text-sm text-gray-500">Employee ID: {appUser?.id}</p>
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{appUser?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-gray-900">+1 (555) 123-4567</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="text-gray-900 capitalize">{appUser?.role} Department</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-gray-900">Main Office</p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button className="px-6 py-3 bg-pink-600 text-white font-medium rounded-lg hover:bg-pink-700 transition-colors">
              Edit Profile
            </button>
          </div>
        </div>

        {/* Coming Soon Features */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">⚙️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Management Coming Soon</h3>
          <p className="text-gray-600 mb-4">
            We're working on additional profile features including:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="bg-pink-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <User className="h-6 w-6 text-pink-600" />
              </div>
              <p className="text-sm text-gray-600">Update Personal Info</p>
            </div>
            
            <div className="text-center">
              <div className="bg-[#05202E]/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <Mail className="h-6 w-6 text-[#05202E]" />
              </div>
              <p className="text-sm text-gray-600">Change Email</p>
            </div>
            
            <div className="text-center">
              <div className="bg-amber-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <Phone className="h-6 w-6 text-amber-600" />
              </div>
              <p className="text-sm text-gray-600">Update Contact</p>
            </div>
          </div>
          
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}

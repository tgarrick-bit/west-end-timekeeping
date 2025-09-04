'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Navigation } from '@/components/Navigation'
import ClientManagement from '@/components/ClientManagement'

export default function ClientsPage() {
  const { appUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!appUser) {
      router.push('/auth/signin')
    } else if (appUser.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [appUser, router])

  if (!appUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (appUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Access denied. Admin privileges required.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClientManagement />
      </main>
    </div>
  )
}

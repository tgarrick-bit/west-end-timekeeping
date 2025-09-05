'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { appUser } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!appUser) {
      router.push('/auth/signin')
    } else if (appUser.role !== 'manager') {
      router.push('/dashboard')
    } else {
      setIsLoading(false)
    }
  }, [appUser, router])

  if (isLoading || !appUser || appUser.role !== 'manager') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e31c79] mx-auto"></div>
          <p className="text-gray-600">Loading Manager Portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}

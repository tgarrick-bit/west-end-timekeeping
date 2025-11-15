import Image from 'next/image'
import { RefreshCcw, User, LogOut } from 'lucide-react'

interface HeaderProps {
  userEmail?: string
  portalType: 'Employee Portal' | 'Manager Portal' | 'Admin Portal'
  onRefresh?: () => void
  onSignOut?: () => void
}

export function Header({ userEmail, portalType, onRefresh, onSignOut }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-expense via-gray-900 to-expense text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Portal Type */}
          <div className="flex items-center gap-4">
            {/* Remove the small icon and text, replace with single logo */}
            <Image
              src="/WE-logo-SEPT2024v3-WHT.png"
              alt="West End Workforce"
              width={200}
              height={50}
              className="h-10 w-auto"
              priority
            />
            <div className="border-l border-gray-600 pl-4">
              <p className="font-body text-sm text-gray-300">{portalType}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors font-body font-medium"
              >
                <RefreshCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            
            {userEmail && (
              <div className="flex items-center gap-2 px-4 py-2 font-body">
                <User className="w-4 h-4" />
                <span className="hidden md:inline text-sm">{userEmail}</span>
              </div>
            )}

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors font-body font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
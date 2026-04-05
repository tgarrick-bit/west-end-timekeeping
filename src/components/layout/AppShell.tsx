'use client';

import { Sidebar, type UserRole } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';

interface AppShellProps {
  children: React.ReactNode;
  role: UserRole;
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
  /** Show bottom tab nav on mobile (employee only) */
  showBottomNav?: boolean;
}

export function AppShell({
  children,
  role,
  userName,
  userEmail,
  onSignOut,
  showBottomNav = false,
}: AppShellProps) {
  const portalLabel =
    role === 'admin' ? 'Admin Portal' : role === 'manager' ? 'Manager Portal' : 'Employee Portal';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--we-bg)' }}>
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        onSignOut={onSignOut}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top header — visible below md */}
        <MobileHeader portalLabel={portalLabel} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0" style={{
          paddingBottom: showBottomNav ? 'var(--we-mobile-nav-height)' : '0',
        }}>
          <div className="anim-fade-in">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav — employee only */}
        {showBottomNav && <MobileBottomNav />}
      </div>
    </div>
  );
}

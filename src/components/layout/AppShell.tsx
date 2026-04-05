'use client';

import { Sidebar, type UserRole } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  role: UserRole;
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
}

export function AppShell({ children, role, userName, userEmail, onSignOut }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      <Sidebar role={role} userName={userName} userEmail={userEmail} onSignOut={onSignOut} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <main className="flex-1 overflow-y-auto pt-12 lg:pt-0">
          <div className="anim-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

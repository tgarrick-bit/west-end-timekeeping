'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Clock, Receipt, Users, Building2, FolderKanban,
  Wallet, FileText, BarChart3, Settings, CheckSquare, UserCheck,
  LogOut, Menu, X, type LucideIcon,
} from 'lucide-react';

export type UserRole = 'admin' | 'manager' | 'employee';

interface NavItem { label: string; href: string; icon: LucideIcon; }

const NAV: Record<UserRole, NavItem[]> = {
  employee: [
    { label: 'Dashboard', href: '/employee', icon: LayoutDashboard },
    { label: 'Timesheet', href: '/timesheet/entry', icon: Clock },
    { label: 'Expenses', href: '/expense/entry', icon: Receipt },
  ],
  manager: [
    { label: 'Dashboard', href: '/manager', icon: LayoutDashboard },
    { label: 'Approvals', href: '/manager/pending', icon: CheckSquare },
    { label: 'Timesheets', href: '/manager/timesheets', icon: Clock },
    { label: 'Expenses', href: '/manager/expenses', icon: Receipt },
    { label: 'Contractors', href: '/manager/contractors', icon: UserCheck },
    { label: 'Reports', href: '/manager/reports', icon: BarChart3 },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Employees', href: '/admin/employees', icon: Users },
    { label: 'Clients', href: '/admin/clients', icon: Building2 },
    { label: 'Projects', href: '/admin/projects', icon: FolderKanban },
    { label: 'Timesheets', href: '/admin/timesheets', icon: Clock },
    { label: 'Expenses', href: '/admin/expenses', icon: Receipt },
    { label: 'Payroll', href: '/admin/payroll', icon: Wallet },
    { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { label: 'Billing', href: '/admin/billing', icon: FileText },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ],
};

interface SidebarProps {
  role: UserRole;
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
}

export function Sidebar({ role, userName, userEmail, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV[role];
  const firstName = userName?.split(' ')[0] || 'User';

  const portalLabel = role === 'admin' ? 'ADMIN PORTAL' : role === 'manager' ? 'MANAGER PORTAL' : 'EMPLOYEE PORTAL';

  const isActive = (href: string) => {
    if (href === '/employee' || href === '/manager' || href === '/admin') return pathname === href;
    return pathname.startsWith(href);
  };

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    const h = () => setMobileOpen(true);
    document.addEventListener('we:open-sidebar', h);
    return () => document.removeEventListener('we:open-sidebar', h);
  }, []);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const nav = (
    <aside
      className="flex flex-col h-screen shrink-0"
      style={{
        width: 'var(--sidebar-w)',
        background: '#FFFFFF',
        borderRight: '0.5px solid var(--border)',
      }}
    >
      {/* Logo + portal label */}
      <div className="px-5 pt-6 pb-1">
        <div className="flex items-center gap-2.5">
          <Image
            src="/WE logo FC Mar2024.png"
            alt="WE"
            width={34}
            height={34}
            className="h-[34px] w-auto"
            priority
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
            Timekeeping
          </span>
        </div>
        <p style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2, color: '#c4a96a', marginTop: 6 }}>
          {portalLabel}
        </p>
      </div>

      {/* Divider */}
      <div className="mx-5 mt-4 mb-3" style={{ height: '0.5px', background: 'var(--border)' }} />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {items.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-[9px] rounded-md relative transition-colors duration-150"
              style={{
                fontSize: 12.5,
                fontWeight: active ? 600 : 400,
                color: active ? '#1a1a1a' : '#999',
                background: active ? '#FAFAF8' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = '#FAFAF8'; }
              }}
              onMouseLeave={(e) => {
                if (!active) { e.currentTarget.style.color = '#999'; e.currentTarget.style.background = 'transparent'; }
              }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2" style={{
                  width: 2.5, height: 16, background: '#e31c79', borderRadius: 2,
                }} />
              )}
              <Icon size={15} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="mx-3 mb-4 mt-3 pt-3" style={{ borderTop: '0.5px solid var(--border)' }}>
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div
            className="shrink-0 flex items-center justify-center rounded-full"
            style={{ width: 30, height: 30, background: '#f0ebe5', fontSize: 10, fontWeight: 600, color: '#999' }}
          >
            {firstName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a' }} className="truncate">{firstName}</p>
            {userEmail && <p style={{ fontSize: 10, color: '#bbb' }} className="truncate">{userEmail}</p>}
          </div>
        </div>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 mt-0.5 transition-colors duration-150"
            style={{ fontSize: 10, color: '#ccc' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#e31c79')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#ccc')}
          >
            <LogOut size={12} strokeWidth={1.5} />
            Sign out
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">{nav}</div>

      {/* Mobile trigger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center px-4 h-12" style={{ background: '#FFFFFF', borderBottom: '0.5px solid var(--border)' }}>
        <button onClick={() => setMobileOpen(true)} style={{ color: '#999' }}><Menu size={18} strokeWidth={1.5} /></button>
        <div className="flex items-center gap-2 ml-3">
          <Image src="/WE logo FC Mar2024.png" alt="WE" width={24} height={24} className="h-6 w-auto" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>Timekeeping</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full" style={{ width: 'var(--sidebar-w)' }}>
            {nav}
            <button onClick={() => setMobileOpen(false)} className="absolute top-5 right-3" style={{ color: '#ccc' }}>
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

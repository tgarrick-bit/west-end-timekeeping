'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Clock,
  Receipt,
  Users,
  Building2,
  FolderKanban,
  Wallet,
  FileText,
  BarChart3,
  Settings,
  CheckSquare,
  UserCheck,
  LogOut,
  X,
  type LucideIcon,
} from 'lucide-react';

export type UserRole = 'admin' | 'manager' | 'employee';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
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
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const firstName = userName?.split(' ')[0] ?? 'User';
  const items = NAV_ITEMS[role] ?? NAV_ITEMS.employee;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Listen for open trigger
  useEffect(() => {
    const handler = () => setMobileOpen(true);
    document.addEventListener('we:open-sidebar', handler);
    return () => document.removeEventListener('we:open-sidebar', handler);
  }, []);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, mobileOpen]);

  const isActive = (href: string) => {
    if (href === '/employee' || href === '/manager' || href === '/admin') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const mobileStyle = isMobile
    ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        height: '100dvh',
        zIndex: 50,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 260ms cubic-bezier(0.4, 0, 0.2, 1)',
      }
    : {};

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className="flex flex-col h-screen shrink-0"
        style={{
          width: 'var(--we-sidebar-width)',
          background: 'var(--we-navy)',
          ...mobileStyle,
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <Image
            src="/WE-logo-SEPT2024v3-WHT.png"
            alt="West End Workforce"
            width={160}
            height={40}
            className="h-8 w-auto"
            priority
          />
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Role label */}
        <div className="px-5 mb-4">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: 'rgba(255, 255, 255, 0.3)' }}
          >
            {role === 'admin' ? 'Admin Portal' : role === 'manager' ? 'Manager Portal' : 'Employee Portal'}
          </span>
        </div>

        {/* Divider */}
        <div className="mx-5 mb-3" style={{ height: '0.5px', background: 'rgba(255, 255, 255, 0.08)' }} />

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {items.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 relative"
                style={{
                  color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                  background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                    style={{ width: '2px', height: '16px', background: 'var(--we-pink)' }}
                  />
                )}
                <Icon size={16} style={{ opacity: active ? 1 : 0.7 }} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + sign out */}
        <div
          className="mx-3 mb-4 mt-4 pt-4"
          style={{ borderTop: '0.5px solid rgba(255, 255, 255, 0.08)' }}
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <div
              className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold"
              style={{
                background: 'rgba(227, 28, 121, 0.15)',
                color: '#e31c79',
                border: '0.5px solid rgba(227, 28, 121, 0.2)',
              }}
            >
              {firstName[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate" style={{ color: '#ffffff' }}>
                {firstName}
              </p>
              {userEmail && (
                <p className="text-[10px] truncate" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                  {userEmail}
                </p>
              )}
            </div>
          </div>

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] rounded-lg transition-colors duration-150 mt-0.5"
              style={{ color: 'rgba(255, 255, 255, 0.4)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)')}
            >
              <LogOut size={14} />
              Sign out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

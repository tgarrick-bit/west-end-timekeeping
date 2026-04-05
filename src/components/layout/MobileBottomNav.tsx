'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Clock, Receipt, User, type LucideIcon } from 'lucide-react';

interface NavTab {
  label: string;
  href: string;
  icon: LucideIcon;
}

const TABS: NavTab[] = [
  { label: 'Home', href: '/employee', icon: LayoutDashboard },
  { label: 'Time', href: '/timesheet/entry', icon: Clock },
  { label: 'Expenses', href: '/expense/entry', icon: Receipt },
  { label: 'Profile', href: '/auth/logout', icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/employee') return pathname === '/employee';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around"
      style={{
        height: 56,
        background: '#fff',
        borderTop: '0.5px solid #e8e4df',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {TABS.map(({ label, href, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors duration-150 relative"
            style={{ color: active ? '#e31c79' : '#ccc' }}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' }}>
              {label}
            </span>
            {active && (
              <span
                className="absolute top-0 rounded-full"
                style={{ width: 20, height: 2, background: '#e31c79' }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

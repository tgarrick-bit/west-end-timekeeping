'use client';

import { useRouter, usePathname } from 'next/navigation';

const TABS = [
  { label: 'Review & Approve', href: '/admin' },
  { label: 'Employees', href: '/admin/employees' },
  { label: 'Clients', href: '/admin/clients' },
  { label: 'Projects', href: '/admin/projects' },
  { label: 'Timesheets', href: '/admin/timesheets' },
  { label: 'Expenses', href: '/admin/expenses' },
  { label: 'Payroll', href: '/admin/payroll' },
  { label: 'Reports', href: '/admin/reports' },
  { label: 'Billing', href: '/admin/billing' },
  { label: 'Settings', href: '/admin/settings' },
];

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div style={{ padding: '0 40px', borderBottom: '0.5px solid #e8e4df', overflowX: 'auto' }}>
      <div className="flex" style={{ gap: 24 }}>
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className="whitespace-nowrap transition-colors duration-150 shrink-0"
              style={{
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? '#1a1a1a' : '#999',
                padding: '12px 0',
                borderBottom: active ? '2px solid #e31c79' : '2px solid transparent',
                background: 'none',
                border: 'none',
                borderBottomWidth: 2,
                borderBottomStyle: 'solid',
                borderBottomColor: active ? '#e31c79' : 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#555'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#999'; }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

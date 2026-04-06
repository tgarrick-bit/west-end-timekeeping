'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAdminFilter } from '@/contexts/AdminFilterContext';
import { Building2, GitBranch } from 'lucide-react';

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
  { label: 'Audit Log', href: '/admin/audit' },
  { label: 'Settings', href: '/admin/settings' },
];

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    selectedClientId,
    selectedDepartmentId,
    setSelectedClientId,
    setSelectedDepartmentId,
    clients,
    departments,
  } = useAdminFilter();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div style={{ borderBottom: '0.5px solid #e8e4df' }}>
      {/* Filter bar */}
      <div
        style={{
          padding: '8px 40px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '0.5px solid #f0ece7',
          background: '#FDFCFB',
        }}
      >
        <Building2 size={14} color="#999" />
        <select
          value={selectedClientId || ''}
          onChange={(e) => setSelectedClientId(e.target.value || null)}
          style={{
            fontSize: 12,
            fontFamily: 'Montserrat, sans-serif',
            color: selectedClientId ? '#1a1a1a' : '#999',
            fontWeight: selectedClientId ? 500 : 400,
            padding: '4px 8px',
            border: '0.5px solid #e8e4df',
            borderRadius: 6,
            background: '#fff',
            outline: 'none',
            cursor: 'pointer',
            minWidth: 160,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#e8e4df'; }}
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>

        {selectedClientId && departments.length > 0 && (
          <>
            <GitBranch size={14} color="#999" />
            <select
              value={selectedDepartmentId || ''}
              onChange={(e) => setSelectedDepartmentId(e.target.value || null)}
              style={{
                fontSize: 12,
                fontFamily: 'Montserrat, sans-serif',
                color: selectedDepartmentId ? '#1a1a1a' : '#999',
                fontWeight: selectedDepartmentId ? 500 : 400,
                padding: '4px 8px',
                border: '0.5px solid #e8e4df',
                borderRadius: 6,
                background: '#fff',
                outline: 'none',
                cursor: 'pointer',
                minWidth: 160,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e8e4df'; }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.code ? ` (${d.code})` : ''}
                </option>
              ))}
            </select>
          </>
        )}

        {selectedClientId && (
          <button
            onClick={() => setSelectedClientId(null)}
            style={{
              fontSize: 11,
              color: '#999',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#e31c79'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#999'; }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ padding: '0 40px', overflowX: 'auto' }}>
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
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  DollarSign, FileText, Download,
  Calendar, CreditCard, Receipt
} from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'pending'>('invoices');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial data load
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div className="mb-6">
          <div className="anim-shimmer" style={{ width: 100, height: 24, borderRadius: 6, marginBottom: 8 }} />
          <div className="anim-shimmer" style={{ width: 280, height: 14, borderRadius: 4 }} />
        </div>

        {/* Tab skeleton */}
        <div className="flex items-center gap-6 mb-6" style={{ borderBottom: '0.5px solid #f0ece7', paddingBottom: 10 }}>
          {[80, 90, 120].map((w, i) => (
            <div key={i} className="anim-shimmer" style={{ width: w, height: 12, borderRadius: 3 }} />
          ))}
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className={`anim-slide-up stagger-${n}`} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div className="anim-shimmer" style={{ width: 70, height: 8, borderRadius: 3, marginBottom: 12 }} />
              <div className="anim-shimmer" style={{ width: 80, height: 28, borderRadius: 4 }} />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="anim-slide-up stagger-5" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
            <div className="anim-shimmer" style={{ width: 140, height: 14, borderRadius: 4 }} />
          </div>
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div className="anim-shimmer mx-auto" style={{ width: 40, height: 40, borderRadius: 8, marginBottom: 16 }} />
            <div className="anim-shimmer mx-auto" style={{ width: 160, height: 12, borderRadius: 4 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page Header */}
      <div className="mb-6 anim-slide-up stagger-1">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>Billing</h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999' }}>Invoices, payments, and billing management</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-6 anim-slide-up stagger-1" style={{ borderBottom: '0.5px solid #f0ece7' }}>
        {(['invoices', 'payments', 'pending'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              fontSize: 12,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? '#1a1a1a' : '#999',
              borderBottom: activeTab === tab ? '2px solid #e31c79' : '2px solid transparent',
              paddingBottom: 10,
              transition: 'color 0.15s ease',
            }}
          >
            {tab === 'invoices' ? 'Invoices' : tab === 'payments' ? 'Payments' : 'Pending Approval'}
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'This Month', value: '$0.00', accent: true },
          { label: 'Outstanding', value: '$0.00', pink: true },
          { label: 'Overdue', value: '$0.00' },
          { label: 'YTD Total', value: '$0.00' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`anim-slide-up stagger-${i + 1}`}
            style={{
              background: '#fff',
              border: '0.5px solid #e8e4df',
              borderRadius: 10,
              padding: '22px 24px',
              transition: 'border-color 0.15s ease',
              cursor: 'default',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = i === 0 ? '#e31c79' : '#d3ad6b' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e8e4df' }}
          >
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.2, color: '#c0bab2' }}>{stat.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.pink ? '#e31c79' : '#1a1a1a' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Actions Bar */}
      <div className="anim-slide-up stagger-3" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '16px 22px', marginBottom: 24 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2"
              style={{ padding: '8px 18px', background: '#e31c79', color: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#cc1069'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <FileText className="h-4 w-4" />
              Generate Invoice
            </button>
            <button
              className="flex items-center gap-2 transition-colors"
              style={{ padding: '8px 18px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          <div className="flex items-center gap-3">
            <select
              style={{ border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, padding: '6px 10px', color: '#555' }}
              className="focus:outline-none focus:border-[#d3ad6b] focus:shadow-[0_0_0_3px_rgba(211,173,107,0.08)]"
            >
              <option>All Clients</option>
            </select>
            <select
              style={{ border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, padding: '6px 10px', color: '#555' }}
              className="focus:outline-none focus:border-[#d3ad6b] focus:shadow-[0_0_0_3px_rgba(211,173,107,0.08)]"
            >
              <option>Last 30 Days</option>
              <option>Last Quarter</option>
              <option>This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="anim-slide-up stagger-4" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
        <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
            {activeTab === 'invoices' && 'Recent Invoices'}
            {activeTab === 'payments' && 'Payment History'}
            {activeTab === 'pending' && 'Pending Approvals'}
          </h3>
        </div>

        <div className="p-8 text-center">
          <CreditCard className="h-10 w-10 mx-auto mb-4" style={{ color: '#e0dcd7' }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: '#999' }}>No billing data yet</p>
          <p style={{ fontSize: 11, color: '#c0bab2', marginTop: 4 }}>
            Invoices will appear here once timesheets are approved and processed
          </p>
        </div>
      </div>
    </div>
  );
}

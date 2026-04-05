'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import {
  DollarSign, FileText, Download,
  Calendar, CreditCard, Receipt
} from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'pending'>('invoices');
  
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div style={{ padding: '36px 40px' }}>
        {/* Page Header */}
        <div className="mb-6">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>Billing</h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: '#bbb' }}>Invoices, payments, and billing management</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mb-6" style={{ borderBottom: '0.5px solid #f0ece7' }}>
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
              }}
            >
              {tab === 'invoices' ? 'Invoices' : tab === 'payments' ? 'Payments' : 'Pending Approval'}
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>This Month</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>$0.00</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>Outstanding</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#e31c79' }}>$0.00</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>Overdue</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>$0.00</div>
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: '#c0bab2' }}>YTD Total</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>$0.00</div>
          </div>
        </div>

        {/* Actions Bar */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '16px 22px', marginBottom: 24 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2"
                style={{ padding: '8px 16px', background: '#e31c79', color: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 500 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#cc1069'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#e31c79'; }}
              >
                <FileText className="h-4 w-4" />
                Generate Invoice
              </button>
              <button
                className="flex items-center gap-2 hover:border-[#ccc] hover:text-[#555]"
                style={{ padding: '8px 16px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 500 }}
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>

            <div className="flex items-center gap-3">
              <select style={{ border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, padding: '6px 10px', color: '#555' }} className="focus:outline-none focus:border-[#d3ad6b]">
                <option>All Clients</option>
              </select>
              <select style={{ border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, padding: '6px 10px', color: '#555' }} className="focus:outline-none focus:border-[#d3ad6b]">
                <option>Last 30 Days</option>
                <option>Last Quarter</option>
                <option>This Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
            <h3 style={{ fontSize: 12, fontWeight: 600 }}>
              {activeTab === 'invoices' && 'Recent Invoices'}
              {activeTab === 'payments' && 'Payment History'}
              {activeTab === 'pending' && 'Pending Approvals'}
            </h3>
          </div>

          <div className="p-8 text-center" style={{ color: '#999' }}>
            <CreditCard className="h-10 w-10 mx-auto mb-4" style={{ color: '#e0dcd7' }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: '#999' }}>No billing data yet</p>
            <p style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>
              Invoices will appear here once timesheets are approved and processed
            </p>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
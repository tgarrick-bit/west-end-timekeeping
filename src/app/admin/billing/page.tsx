'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  DollarSign, Download, Calendar, Users, BarChart3,
} from 'lucide-react';

interface BillingRow {
  client_id: string;
  client_name: string;
  employee_id: string;
  employee_name: string;
  project_id: string;
  project_name: string;
  project_code: string;
  total_hours: number;
  bill_rate: number;
  billable_amount: number;
  week_ending: string;
}

interface ClientGroup {
  client_id: string;
  client_name: string;
  total_hours: number;
  total_amount: number;
  rows: BillingRow[];
}

export default function BillingPage() {
  const router = useRouter();
  const supabase = createClient();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [loading, setLoading] = useState(true);
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [totalBillable, setTotalBillable] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [activeClients, setActiveClients] = useState(0);
  const [avgRate, setAvgRate] = useState(0);

  useEffect(() => {
    fetchBillingData();
  }, [selectedMonth]);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Fetch approved/payroll_approved timesheets with joins
      const { data: timesheets, error } = await supabase
        .from('timesheets')
        .select(`
          id,
          employee_id,
          week_ending,
          total_hours,
          status,
          project_id,
          employees!timesheets_employee_id_fkey (
            id,
            first_name,
            last_name,
            client_id,
            bill_rate
          ),
          projects (
            id,
            name,
            code,
            client_id,
            bill_rate
          )
        `)
        .gte('week_ending', startStr)
        .lte('week_ending', endStr)
        .in('status', ['approved', 'payroll_approved', 'client_approved']);

      if (error) {
        console.error('Error fetching billing data:', error);
        setLoading(false);
        return;
      }

      // Fetch clients for name lookup
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name');

      const clientMap: Record<string, string> = {};
      (clients || []).forEach(c => { clientMap[c.id] = c.name; });

      // Also fetch project_employees for per-assignment bill rates
      const { data: projectEmployees } = await supabase
        .from('project_employees')
        .select('employee_id, project_id, bill_rate');

      const peRateMap: Record<string, number> = {};
      (projectEmployees || []).forEach(pe => {
        if (pe.bill_rate) {
          peRateMap[`${pe.employee_id}_${pe.project_id}`] = pe.bill_rate;
        }
      });

      // Build billing rows
      const rows: BillingRow[] = [];
      (timesheets || []).forEach((ts: any) => {
        const emp = ts.employees;
        const proj = ts.projects;
        const clientId = proj?.client_id || emp?.client_id || 'unassigned';
        const clientName = clientMap[clientId] || 'Unassigned';
        const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : 'Unknown';

        // Bill rate priority: project_employees > project > employee > 0
        const peKey = `${ts.employee_id}_${ts.project_id}`;
        const billRate = peRateMap[peKey] || proj?.bill_rate || emp?.bill_rate || 0;

        const hours = ts.total_hours || 0;

        rows.push({
          client_id: clientId,
          client_name: clientName,
          employee_id: ts.employee_id,
          employee_name: empName,
          project_id: ts.project_id || '',
          project_name: proj?.name || 'No Project',
          project_code: proj?.code || '',
          total_hours: hours,
          bill_rate: billRate,
          billable_amount: hours * billRate,
          week_ending: ts.week_ending,
        });
      });

      // Group by client
      const groupMap: Record<string, ClientGroup> = {};
      rows.forEach(row => {
        if (!groupMap[row.client_id]) {
          groupMap[row.client_id] = {
            client_id: row.client_id,
            client_name: row.client_name,
            total_hours: 0,
            total_amount: 0,
            rows: [],
          };
        }
        groupMap[row.client_id].total_hours += row.total_hours;
        groupMap[row.client_id].total_amount += row.billable_amount;
        groupMap[row.client_id].rows.push(row);
      });

      const groups = Object.values(groupMap).sort((a, b) => b.total_amount - a.total_amount);

      const grandTotalAmount = groups.reduce((s, g) => s + g.total_amount, 0);
      const grandTotalHours = groups.reduce((s, g) => s + g.total_hours, 0);
      const clientsWithActivity = groups.filter(g => g.total_hours > 0).length;
      const avgBillRate = grandTotalHours > 0 ? grandTotalAmount / grandTotalHours : 0;

      setClientGroups(groups);
      setTotalBillable(grandTotalAmount);
      setTotalHours(grandTotalHours);
      setActiveClients(clientsWithActivity);
      setAvgRate(avgBillRate);
    } catch (error) {
      console.error('Error in billing fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (clientGroups.length === 0) {
      alert('No billing data to export.');
      return;
    }

    const exportData: any[] = [];
    clientGroups.forEach(group => {
      group.rows.forEach(row => {
        exportData.push({
          'Client': row.client_name,
          'Employee': row.employee_name,
          'Project': row.project_name,
          'Project Code': row.project_code,
          'Week Ending': row.week_ending,
          'Hours': row.total_hours.toFixed(2),
          'Bill Rate': `$${row.bill_rate.toFixed(2)}`,
          'Billable Amount': `$${row.billable_amount.toFixed(2)}`,
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    if (exportData.length > 0) {
      const colWidths = Object.keys(exportData[0]).map(key => {
        const maxLength = Math.max(
          key.length,
          ...exportData.map(row => String(row[key]).length)
        );
        return { wch: Math.min(maxLength + 2, 30) };
      });
      ws['!cols'] = colWidths;
    }
    XLSX.utils.book_append_sheet(wb, ws, 'Billing');
    XLSX.writeFile(wb, `billing_${selectedMonth}.xlsx`);
  };

  // Generate month options (past 12 months)
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push({ value: val, label });
  }

  if (loading) {
    return (
      <div style={{ padding: '36px 40px' }}>
        <div className="mb-6">
          <div className="anim-shimmer" style={{ width: 100, height: 24, borderRadius: 6, marginBottom: 8 }} />
          <div className="anim-shimmer" style={{ width: 280, height: 14, borderRadius: 4 }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className={`anim-slide-up stagger-${n}`} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '22px 24px' }}>
              <div className="anim-shimmer" style={{ width: 70, height: 8, borderRadius: 3, marginBottom: 12 }} />
              <div className="anim-shimmer" style={{ width: 80, height: 28, borderRadius: 4 }} />
            </div>
          ))}
        </div>
        <div className="anim-slide-up stagger-5" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
            <div className="anim-shimmer" style={{ width: 140, height: 14, borderRadius: 4 }} />
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ padding: '12px 20px', borderBottom: '0.5px solid #f5f2ee' }} className="flex items-center gap-6">
              <div className="anim-shimmer" style={{ width: 140, height: 14, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 80, height: 14, borderRadius: 4 }} />
              <div className="anim-shimmer" style={{ width: 60, height: 14, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 40px' }}>
      {/* Page Header */}
      <div className="mb-6 anim-slide-up stagger-1">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: -0.3 }}>Billing</h1>
        <p style={{ fontSize: 13, fontWeight: 400, color: '#999' }}>Billable hours and amounts by client for approved timesheets</p>
      </div>

      {/* Controls Bar */}
      <div className="anim-slide-up stagger-2" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '16px 22px', marginBottom: 24 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar style={{ width: 14, height: 14, color: '#c0bab2' }} />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ border: '0.5px solid #e8e4df', borderRadius: 7, fontSize: 12, padding: '6px 10px', color: '#555' }}
              className="focus:outline-none focus:border-[#d3ad6b] focus:shadow-[0_0_0_3px_rgba(211,173,107,0.08)]"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 transition-colors"
            style={{ padding: '8px 18px', background: '#fff', border: '0.5px solid #e0dcd7', color: '#777', borderRadius: 7, fontSize: 12, fontWeight: 600 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d3ad6b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e0dcd7'; }}
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Billable', value: `$${totalBillable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, accent: true },
          { label: 'Total Hours', value: totalHours.toFixed(1) },
          { label: 'Clients with Activity', value: String(activeClients) },
          { label: 'Average Rate', value: `$${avgRate.toFixed(2)}/hr` },
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
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.accent ? '#e31c79' : '#1a1a1a' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Client Billing Breakdown */}
      {clientGroups.length === 0 ? (
        <div className="anim-slide-up stagger-5" style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: 48, textAlign: 'center' }}>
          <DollarSign className="h-10 w-10 mx-auto mb-4" style={{ color: '#e0dcd7' }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: '#999' }}>No billing data for this period</p>
          <p style={{ fontSize: 11, color: '#c0bab2', marginTop: 4 }}>
            Approved timesheets will appear here once available
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clientGroups.map((group, gIdx) => (
            <div
              key={group.client_id}
              className={`anim-slide-up stagger-${Math.min(gIdx + 5, 6)}`}
              style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, overflow: 'hidden' }}
            >
              {/* Client Header */}
              <div style={{ padding: '14px 22px', borderBottom: '0.5px solid #f0ece7' }}>
                <div className="flex items-center justify-between">
                  <h2 style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>
                    {group.client_name}
                  </h2>
                  <div className="flex items-center gap-4">
                    <span style={{ fontSize: 11, color: '#c0bab2' }}>
                      {group.total_hours.toFixed(1)} hrs
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#e31c79' }}>
                      ${group.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      {['Employee', 'Project', 'Week Ending', 'Hours', 'Bill Rate', 'Amount'].map(h => (
                        <th
                          key={h}
                          className="text-left"
                          style={{
                            padding: '11px 20px',
                            fontSize: 9,
                            fontWeight: 500,
                            letterSpacing: 1.2,
                            color: '#c0bab2',
                            textTransform: 'uppercase',
                            borderBottom: '0.5px solid #f0ece7',
                            textAlign: ['Hours', 'Bill Rate', 'Amount'].includes(h) ? 'right' : 'left',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, rIdx) => (
                      <tr key={`${row.employee_id}-${row.project_id}-${row.week_ending}-${rIdx}`} className="hover:bg-[#FDFCFB]" style={{ borderBottom: '0.5px solid #f5f2ee', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#1a1a1a' }}>{row.employee_name}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontSize: 12.5, color: '#1a1a1a' }}>{row.project_name}</div>
                          {row.project_code && (
                            <div style={{ fontSize: 10.5, color: '#c0bab2' }}>{row.project_code}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555' }}>
                          {new Date(row.week_ending + 'T00:00:00').toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555', textAlign: 'right' }}>
                          {row.total_hours.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 20px', fontSize: 12.5, color: '#555', textAlign: 'right' }}>
                          ${row.bill_rate.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 20px', fontSize: 12.5, fontWeight: 600, color: '#1a1a1a', textAlign: 'right' }}>
                          ${row.billable_amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

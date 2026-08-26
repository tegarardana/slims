'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Server,
  BookmarkCheck,
  Wrench,
  TrendingUp,
  DollarSign,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

type ReportTab = 'INVENTORY' | 'LOANS' | 'MAINTENANCE';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('INVENTORY');

  // Fetch Inventory Report Data
  const { data: invReport, isLoading: isLoadingInv } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: async () => {
      const res = await fetch('/api/reports/inventory');
      const json = await res.json();
      if (!json.success) throw new Error('Failed to load inventory report');
      return json.data;
    },
    enabled: activeTab === 'INVENTORY',
  });

  // Fetch Loans Report Data
  const { data: loanReport, isLoading: isLoadingLoans } = useQuery({
    queryKey: ['report-loans'],
    queryFn: async () => {
      const res = await fetch('/api/reports/loans');
      const json = await res.json();
      if (!json.success) throw new Error('Failed to load loan report');
      return json.data;
    },
    enabled: activeTab === 'LOANS',
  });

  // Fetch Maintenance Report Data
  const { data: maintReport, isLoading: isLoadingMaint } = useQuery({
    queryKey: ['report-maintenance'],
    queryFn: async () => {
      const res = await fetch('/api/reports/maintenance');
      const json = await res.json();
      if (!json.success) throw new Error('Failed to load maintenance report');
      return json.data;
    },
    enabled: activeTab === 'MAINTENANCE',
  });

  const handleExportCSV = () => {
    if (activeTab === 'INVENTORY' && invReport?.devices) {
      const headers = ['Asset Tag,Brand,Model,Category,Location,Status,Condition,Valuation'];
      const rows = invReport.devices.map(
        (d: any) =>
          `"${d.assetTag}","${d.brand}","${d.model}","${d.category}","${d.location}","${d.status}","${d.condition}",${d.purchasePrice}`
      );
      downloadCsv('slims_inventory_report.csv', [headers, ...rows].join('\n'));
    } else if (activeTab === 'LOANS' && loanReport?.recentLoans) {
      const headers = ['Loan ID,Purpose,Borrower,Department,Start Date,Due Date,Status,Items'];
      const rows = loanReport.recentLoans.map(
        (l: any) =>
          `"${l.id}","${l.purpose}","${l.borrower}","${l.department || ''}","${l.startDate}","${l.expectedReturnDate}","${l.status}","${l.deviceTags}"`
      );
      downloadCsv('slims_loans_report.csv', [headers, ...rows].join('\n'));
    } else if (activeTab === 'MAINTENANCE' && maintReport?.jobs) {
      const headers = ['Job ID,Device Tag,Equipment,Type,Problem,Action Taken,Parts Replaced,Cost,Technician,Status'];
      const rows = maintReport.jobs.map(
        (j: any) =>
          `"${j.id}","${j.deviceTag}","${j.equipment}","${j.maintenanceType}","${j.problem}","${j.actionTaken}","${j.partsReplaced}",${j.cost},"${j.technician}","${j.status}"`
      );
      downloadCsv('slims_maintenance_report.csv', [headers, ...rows].join('\n'));
    }
  };

  const downloadCsv = (filename: string, content: string) => {
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + content);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Analytics & Auditing
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Reports & Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Export official lab inventory audits, borrowing metrics, and repair cost summaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        {[
          { id: 'INVENTORY', label: 'Inventory & Valuation', icon: Server },
          { id: 'LOANS', label: 'Loan Utilization & Trends', icon: BookmarkCheck },
          { id: 'MAINTENANCE', label: 'Maintenance & Expenditures', icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          const isCurrent = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                isCurrent
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. INVENTORY REPORT */}
      {activeTab === 'INVENTORY' && (
        <div className="space-y-6">
          {isLoadingInv ? (
            <div className="py-20 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              Compiling inventory valuation...
            </div>
          ) : invReport ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Asset Count</span>
                  <div className="text-2xl font-bold text-slate-900">{invReport.summary.totalDevices} Units</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Recorded Valuation</span>
                  <div className="text-2xl font-bold text-indigo-600 font-mono">
                    Rp {invReport.summary.totalValuation.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Available for Borrowing</span>
                  <div className="text-2xl font-bold text-emerald-600">
                    {invReport.summary.byStatus.AVAILABLE} Units
                  </div>
                </div>
              </div>

              {/* Category & Location Breakdown Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                    Assets by Category
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {invReport.categoryBreakdown?.map((c: any) => (
                      <div key={c.id} className="py-2.5 flex items-center justify-between">
                        <span className="font-medium text-slate-800">{c.name}</span>
                        <span className="font-mono font-semibold text-indigo-600">{c.deviceCount} units</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                    Assets by Physical Location
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {invReport.locationBreakdown?.map((l: any) => (
                      <div key={l.id} className="py-2.5 flex items-center justify-between">
                        <span className="font-medium text-slate-800">{l.name}</span>
                        <span className="font-mono font-semibold text-indigo-600">{l.deviceCount} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 2. LOANS REPORT */}
      {activeTab === 'LOANS' && (
        <div className="space-y-6">
          {isLoadingLoans ? (
            <div className="py-20 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              Compiling borrowing metrics...
            </div>
          ) : loanReport ? (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Loans Filed</span>
                  <div className="text-2xl font-bold text-slate-900">{loanReport.summary.totalLoans}</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Active In-Use Loans</span>
                  <div className="text-2xl font-bold text-blue-600">{loanReport.summary.activeLoans}</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">On-Time Return Rate</span>
                  <div className="text-2xl font-bold text-emerald-600">{loanReport.summary.onTimeRate}%</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Currently Overdue</span>
                  <div className="text-2xl font-bold text-red-600">{loanReport.summary.overdueLoans}</div>
                </div>
              </div>

              {/* Top Borrowed Equipment Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Top 10 Most Borrowed Hardware Items
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Asset Tag</th>
                        <th className="px-4 py-3">Brand & Model</th>
                        <th className="px-4 py-3 text-right">Borrow Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loanReport.topBorrowedEquipment?.map((item: any) => (
                        <tr key={item.tag} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600">{item.tag}</td>
                          <td className="px-4 py-3 font-medium">
                            {item.brand} {item.model}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-right text-slate-900">
                            {item.count} loans
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 3. MAINTENANCE REPORT */}
      {activeTab === 'MAINTENANCE' && (
        <div className="space-y-6">
          {isLoadingMaint ? (
            <div className="py-20 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              Compiling repair analytics...
            </div>
          ) : maintReport ? (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Service Jobs</span>
                  <div className="text-2xl font-bold text-slate-900">{maintReport.summary.totalJobs}</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Repair Expenditure</span>
                  <div className="text-2xl font-bold text-indigo-600 font-mono">
                    Rp {maintReport.summary.totalCost.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Completed Services</span>
                  <div className="text-2xl font-bold text-emerald-600">
                    {maintReport.summary.completedJobs}
                  </div>
                </div>
              </div>

              {/* Service History Log */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Completed Service & Parts Log
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Device Tag</th>
                        <th className="px-4 py-3">Service Type</th>
                        <th className="px-4 py-3">Action Taken</th>
                        <th className="px-4 py-3">Parts Replaced</th>
                        <th className="px-4 py-3">Cost (IDR)</th>
                        <th className="px-4 py-3">Technician</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {maintReport.jobs?.map((j: any) => (
                        <tr key={j.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600">{j.deviceTag}</td>
                          <td className="px-4 py-3 font-medium">{j.maintenanceType}</td>
                          <td className="px-4 py-3 text-slate-700">{j.actionTaken}</td>
                          <td className="px-4 py-3 text-slate-600">{j.partsReplaced}</td>
                          <td className="px-4 py-3 font-mono font-semibold">
                            {j.cost > 0 ? `Rp ${j.cost.toLocaleString('id-ID')}` : 'Internal'}
                          </td>
                          <td className="px-4 py-3 font-medium">{j.technician}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

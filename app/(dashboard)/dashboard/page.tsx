'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Server,
  BookmarkCheck,
  Wrench,
  AlertTriangle,
  ClipboardCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Plus,
  FileSpreadsheet,
  Activity,
  Layers,
  MapPin,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.baseRole === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch dashboard stats');
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading system analytics...</p>
      </div>
    );
  }

  // ================= ADMIN / TECHNICIAN DASHBOARD =================
  if (data?.role === 'ADMIN' || user?.isTechnician) {
    const kpis = data.kpis;
    const health = data.conditionHealth;

    return (
      <div className="space-y-6">
        {/* Welcome & Live Date Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Lab Management Overview
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user?.name || 'Administrator'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              SLIMS Enterprise Network & Lab Infrastructure Operations Dashboard.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/inventory"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Browse Inventory</span>
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Analytics & Reports</span>
            </Link>
          </div>
        </div>

        {/* Action Attention Banner (Overdue Loans / Pending Approvals) */}
        {(kpis.pendingLoans > 0 || kpis.overdueCount > 0 || kpis.criticalIncidents > 0) && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold">Attention Required:</span>{' '}
                {kpis.pendingLoans > 0 && <span>{kpis.pendingLoans} loan request(s) awaiting approval. </span>}
                {kpis.overdueCount > 0 && <span>{kpis.overdueCount} active loan(s) currently overdue. </span>}
                {kpis.criticalIncidents > 0 && (
                  <span className="font-bold text-red-700">
                    {kpis.criticalIncidents} critical incident(s) reported!
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {kpis.pendingLoans > 0 && (
                <Link
                  href="/loans?status=PENDING_APPROVAL"
                  className="text-xs font-bold text-indigo-700 hover:underline"
                >
                  Review Loans →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* 4 Primary Operational KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/inventory"
            className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-500/50 hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Equipment</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-slate-900">{kpis.totalDevices}</div>
              <span className="text-xs text-emerald-600 font-semibold">{kpis.availableDevices} Available</span>
            </div>
          </Link>

          <Link
            href="/loans"
            className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-500/50 hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Active Borrowings</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <BookmarkCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-slate-900">{kpis.borrowedDevices}</div>
              <span className="text-xs text-blue-600 font-semibold">{kpis.activeLoansCount} Active Loans</span>
            </div>
          </Link>

          <Link
            href="/maintenance"
            className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-500/50 hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Under Repair / Maintenance</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-slate-900">{kpis.maintenanceDevices}</div>
              <span className="text-xs text-amber-600 font-semibold">{kpis.activeMaintenances} Service Jobs</span>
            </div>
          </Link>

          <Link
            href="/incidents"
            className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-red-500/50 hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Open Incidents</span>
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-slate-900">{kpis.openIncidents}</div>
              {kpis.criticalIncidents > 0 ? (
                <span className="text-xs text-red-600 font-bold">{kpis.criticalIncidents} Critical</span>
              ) : (
                <span className="text-xs text-slate-400">0 Critical</span>
              )}
            </div>
          </Link>
        </div>

        {/* Middle Section: Condition Health Breakdown & Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Condition Health Grade Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Hardware Physical Health</h3>
              <ShieldCheck className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-emerald-700">Excellent</span>
                  <span>{health.EXCELLENT}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${(health.EXCELLENT / (kpis.totalDevices || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-blue-700">Good</span>
                  <span>{health.GOOD}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(health.GOOD / (kpis.totalDevices || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-yellow-700">Fair</span>
                  <span>{health.FAIR}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${(health.FAIR / (kpis.totalDevices || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-red-700">Damaged / Critical</span>
                  <span>{health.DAMAGED + health.CRITICAL}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${((health.DAMAGED + health.CRITICAL) / (kpis.totalDevices || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Category & Placement Distribution */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Category & Lab Distribution</h3>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                  By Category
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {data.categoryDistribution?.map((cat: any) => (
                    <div key={cat.name} className="p-2.5 flex items-center justify-between bg-slate-50/50">
                      <span className="font-medium text-slate-800">{cat.name}</span>
                      <span className="font-mono font-bold text-indigo-600">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                  By Location / Lab Room
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {data.locationDistribution?.map((loc: any) => (
                    <div key={loc.name} className="p-2.5 flex items-center justify-between bg-slate-50/50">
                      <span className="font-medium text-slate-800">{loc.name}</span>
                      <span className="font-mono font-bold text-indigo-600">{loc.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Recent Loans & Audit Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Loans */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Recent Borrowing Activity</h3>
              <Link href="/loans" className="text-xs font-semibold text-indigo-600 hover:underline">
                View All →
              </Link>
            </div>
            <div className="space-y-2 text-xs">
              {data.recentLoans?.map((loan: any) => (
                <Link
                  key={loan.id}
                  href={`/loans/${loan.id}`}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between transition-colors block"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{loan.purpose}</div>
                    <div className="text-[11px] text-slate-500">
                      Borrower: {loan.requester.fullName} • {loan.items.length} item(s)
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-700">
                    {loan.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Audit Activity Stream */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Audit Trail Timeline</h3>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
            <div className="space-y-2 text-xs">
              {data.recentAuditLogs?.map((log: any) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px]">
                        {log.action}
                      </span>
                      <span>by {log.actor?.fullName || 'System'}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= STUDENT / TEACHER DASHBOARD =================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Student & Teacher Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Hello, {user?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Borrow lab equipment, track active loans, and submit hardware defect reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/loans"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Request Loan</span>
          </Link>
          <Link
            href="/incidents"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span>Report Defect</span>
          </Link>
        </div>
      </div>

      {/* Active Borrowing Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
          My Currently Borrowed Equipment ({data?.myActiveLoans?.length || 0})
        </h3>

        {data?.myActiveLoans?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {data.myActiveLoans.map((loan: any) => (
              <Link
                key={loan.id}
                href={`/loans/${loan.id}`}
                className="p-4 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 transition-colors block space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{loan.purpose}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                    {loan.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {loan.items.map((i: any) => (
                    <span
                      key={i.device.assetTag}
                      className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold"
                    >
                      {i.device.assetTag} ({i.device.brand} {i.device.model})
                    </span>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Due Date: {new Date(loan.expectedReturnDate).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            You currently have no active equipment loans.
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {data?.myPendingLoans?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Pending Approval Requests ({data.myPendingLoans.length})
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {data.myPendingLoans.map((loan: any) => (
              <div key={loan.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{loan.purpose}</div>
                  <div className="text-[11px] text-slate-400">
                    Requested on {new Date(loan.createdAt).toLocaleDateString()} • {loan.items.length} item(s)
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Pending Review
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableFilterOption } from '@/components/data-table/data-table';
import {
  Activity,
  User,
  Clock,
  Code,
  Search,
  Eye,
  ShieldCheck,
  Layers,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface AuditLogItem {
  id: string;
  actorId: string;
  actor: { id: string; fullName: string; email: string; baseRole: string };
  action: string;
  targetType: string;
  targetId: string;
  previousValue?: any;
  newValue?: any;
  context?: any;
  createdAt: string;
}

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.baseRole === 'ADMIN';

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Inspector Modal State
  const [inspectLog, setInspectLog] = useState<AuditLogItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs-table', { search, targetTypeFilter, page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        ...(targetTypeFilter && { targetType: targetTypeFilter }),
      });
      const res = await fetch(`/api/audit-logs?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to load audit logs');
      return json;
    },
  });

  const columns: ColumnDef<AuditLogItem>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Timestamp',
      cell: ({ row }) => {
        const d = new Date(row.original.createdAt);
        return (
          <div className="text-xs">
            <div className="font-semibold text-slate-800">{d.toLocaleDateString()}</div>
            <div className="text-[11px] text-slate-400 font-mono">
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'actor',
      header: 'Actor',
      cell: ({ row }) => {
        const actor = row.original.actor;
        return (
          <div className="text-xs">
            <div className="font-semibold text-slate-900">{actor?.fullName || 'System Event'}</div>
            <div className="text-[11px] text-slate-400">
              {actor?.email ? `${actor.email} (${actor.baseRole})` : 'Automated Task'}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'action',
      header: 'Action Performed',
      cell: ({ row }) => {
        const act = row.original.action;
        let color = 'bg-slate-100 text-slate-700 border-slate-200';
        if (act.includes('CREATE') || act.includes('HANDOVER') || act.includes('APPROVE')) {
          color = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        } else if (act.includes('DELETE') || act.includes('REJECT') || act.includes('RETIRE')) {
          color = 'bg-red-50 text-red-800 border-red-200';
        } else if (act.includes('UPDATE') || act.includes('VERIFY') || act.includes('RECONCILE')) {
          color = 'bg-blue-50 text-blue-800 border-blue-200';
        }

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${color}`}>
            {act}
          </span>
        );
      },
    },
    {
      accessorKey: 'targetType',
      header: 'Target Entity',
      cell: ({ row }) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800">{row.original.targetType}</span>
          <div className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
            {row.original.targetId}
          </div>
        </div>
      ),
    },
    {
      id: 'inspect',
      header: 'Details',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setInspectLog(row.original)}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <Code className="w-3.5 h-3.5" />
          <span>Inspect JSON</span>
        </button>
      ),
    },
  ];

  const filterOptions: DataTableFilterOption[] = [
    {
      key: 'targetType',
      label: 'Entity Type',
      value: targetTypeFilter,
      onChange: (v) => {
        setTargetTypeFilter(v);
        setPage(1);
      },
      options: [
        { label: 'Device', value: 'Device' },
        { label: 'Loan Request', value: 'LoanRequest' },
        { label: 'Incident', value: 'Incident' },
        { label: 'Maintenance', value: 'Maintenance' },
        { label: 'Stock Opname', value: 'StockOpnameSession' },
        { label: 'Category', value: 'Category' },
        { label: 'Location', value: 'Location' },
        { label: 'User', value: 'User' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Compliance & Governance
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full tamper-evident audit history of all equipment lifecycle events, loans, and reconciliations.
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.data || []}
        totalRows={data?.meta?.total || 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        searchValue={search}
        onSearchChange={(s) => {
          setSearch(s);
          setPage(1);
        }}
        searchPlaceholder="Search action, actor, target entity..."
        filters={filterOptions}
        isLoading={isLoading}
        emptyMessage="No audit log records match your filter."
      />

      {/* JSON Inspector Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>Audit Payload</span>
                  <span className="font-mono text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                    {inspectLog.action}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Target: {inspectLog.targetType} ({inspectLog.targetId}) • By {inspectLog.actor?.fullName || 'System'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar">
              {inspectLog.context && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                    Context & Metadata
                  </label>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(inspectLog.context, null, 2)}
                  </pre>
                </div>
              )}

              {inspectLog.previousValue && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                    Previous State (Before Mutation)
                  </label>
                  <pre className="p-3 bg-slate-900 text-red-300 rounded-xl font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(inspectLog.previousValue, null, 2)}
                  </pre>
                </div>
              )}

              {inspectLog.newValue && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                    New State (After Mutation)
                  </label>
                  <pre className="p-3 bg-slate-900 text-blue-300 rounded-xl font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(inspectLog.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

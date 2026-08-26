'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableFilterOption } from '@/components/data-table/data-table';
import {
  AlertTriangle,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  Wrench,
  Server,
  User,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface IncidentItem {
  id: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'REPORTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'IN_PROGRESS' | 'RESOLVED';
  verificationOutcome: string | null;
  reportDate: string;
  device: { id: string; assetTag: string; brand: string; model: string; category: { name: string } };
  reporter: { id: string; fullName: string; email: string; baseRole: string };
  verifiedBy: { id: string; fullName: string } | null;
  location: { id: string; name: string } | null;
  _count: { maintenances: number };
}

export default function IncidentsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.baseRole === 'ADMIN';
  const isTechnician = Boolean(user?.isTechnician);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    deviceId: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    notes: string;
  }>({
    deviceId: '',
    description: '',
    severity: 'MEDIUM',
    notes: '',
  });

  // Fetch Devices for Picker
  const { data: allDevices } = useQuery({
    queryKey: ['devices-picker-incident'],
    queryFn: async () => {
      const res = await fetch('/api/devices?pageSize=150');
      const json = await res.json();
      return (json.data || []) as Array<{
        id: string;
        assetTag: string;
        brand: string;
        model: string;
        category: { name: string };
      }>;
    },
    enabled: isReportModalOpen,
  });

  // Fetch Incidents Query
  const { data, isLoading } = useQuery({
    queryKey: ['incidents', { search, statusFilter, severityFilter, page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(severityFilter && { severity: severityFilter }),
      });
      const res = await fetch(`/api/incidents?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch incidents');
      return json;
    },
  });

  // Report Incident Mutation
  const reportMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to report incident');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Incident reported successfully. A technician will review it.');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setIsReportModalOpen(false);
      setFormData({
        deviceId: '',
        description: '',
        severity: 'MEDIUM',
        notes: '',
      });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const columns: ColumnDef<IncidentItem>[] = [
    {
      accessorKey: 'device',
      header: 'Equipment',
      cell: ({ row }) => {
        const inc = row.original;
        return (
          <Link
            href={`/incidents/${inc.id}`}
            className="group flex items-start gap-3 hover:text-indigo-600 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-mono font-bold text-slate-900 group-hover:text-indigo-600">
                {inc.device.assetTag}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {inc.device.brand} {inc.device.model}
              </div>
            </div>
          </Link>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Reported Issue',
      cell: ({ row }) => {
        const inc = row.original;
        return (
          <div className="max-w-md">
            <div className="font-medium text-slate-900 text-xs line-clamp-1">{inc.description}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Reported on {new Date(inc.reportDate).toLocaleDateString()}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => {
        const sev = row.original.severity;
        let color = 'bg-slate-100 text-slate-700 border-slate-200';
        if (sev === 'LOW') color = 'bg-blue-50 text-blue-700 border-blue-200';
        if (sev === 'MEDIUM') color = 'bg-yellow-50 text-yellow-800 border-yellow-200';
        if (sev === 'HIGH') color = 'bg-orange-50 text-orange-700 border-orange-200';
        if (sev === 'CRITICAL') color = 'bg-red-50 text-red-700 border-red-200';

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${color}`}>
            {sev}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const inc = row.original;
        let color = 'bg-slate-100 text-slate-700 border-slate-200';
        if (inc.status === 'REPORTED') color = 'bg-amber-50 text-amber-700 border-amber-200';
        if (inc.status === 'VERIFIED') color = 'bg-blue-50 text-blue-700 border-blue-200';
        if (inc.status === 'IN_PROGRESS') color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        if (inc.status === 'RESOLVED') color = 'bg-emerald-50 text-emerald-700 border-emerald-200';

        return (
          <div className="space-y-0.5">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
              {inc.status.replace('_', ' ')}
            </span>
            {inc.verificationOutcome && (
              <div className="text-[10px] text-slate-500 font-medium">
                {inc.verificationOutcome.replace('_', ' ')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'reporter',
      header: 'Reporter / Verifier',
      cell: ({ row }) => {
        const inc = row.original;
        return (
          <div className="text-[11px]">
            <div className="text-slate-800 font-medium">{inc.reporter.fullName}</div>
            <div className="text-slate-400">
              {inc.verifiedBy ? `Verified: ${inc.verifiedBy.fullName}` : 'Pending verification'}
            </div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const inc = row.original;
        return (
          <Link
            href={`/incidents/${inc.id}`}
            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center gap-1 text-xs font-semibold"
          >
            <Eye className="w-4 h-4" />
            <span>Details</span>
          </Link>
        );
      },
    },
  ];

  const filterOptions: DataTableFilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      value: statusFilter,
      onChange: (v) => {
        setStatusFilter(v);
        setPage(1);
      },
      options: [
        { label: 'Reported / Open', value: 'REPORTED' },
        { label: 'Verified', value: 'VERIFIED' },
        { label: 'In Progress', value: 'IN_PROGRESS' },
        { label: 'Resolved', value: 'RESOLVED' },
      ],
    },
    {
      key: 'severity',
      label: 'Severity',
      value: severityFilter,
      onChange: (v) => {
        setSeverityFilter(v);
        setPage(1);
      },
      options: [
        { label: 'Low', value: 'LOW' },
        { label: 'Medium', value: 'MEDIUM' },
        { label: 'High', value: 'HIGH' },
        { label: 'Critical', value: 'CRITICAL' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Maintenance / Health
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Incident Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track hardware damage reports, technician verifications, and repair escalations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Report Incident</span>
        </button>
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
        searchPlaceholder="Search by tag, brand, problem description, reporter..."
        filters={filterOptions}
        isLoading={isLoading}
        emptyMessage="No incident reports filed."
      />

      {/* Report Incident Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Report Hardware Issue</h3>
                <p className="text-[11px] text-slate-500">
                  Notify lab technicians of broken ports, power failures, or damage.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                reportMutation.mutate(formData);
              }}
              className="p-6 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar"
            >
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Select Affected Device *</label>
                <select
                  required
                  value={formData.deviceId}
                  onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                >
                  <option value="">-- Choose Equipment --</option>
                  {allDevices?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.assetTag} — {d.brand} {d.model} ({d.category.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Estimated Severity *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setFormData({ ...formData, severity: sev })}
                      className={`py-2 rounded-lg font-bold text-center border transition-all text-xs ${
                        formData.severity === sev
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Problem Description *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Port Ethernet 3 dan 4 tidak mendeteksi link, lampu indikator mati..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Additional Notes / Circumstances</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Terjadi setelah pemadaman listrik di Lab TKJ 1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportMutation.isPending || !formData.deviceId}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-60"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

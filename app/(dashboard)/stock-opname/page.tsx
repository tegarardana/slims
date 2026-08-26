'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableFilterOption } from '@/components/data-table/data-table';
import {
  ClipboardCheck,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Server,
  User,
  Calendar,
  Layers,
  MapPin,
  Barcode,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface OpnameSessionItem {
  id: string;
  sessionName: string;
  locationScope: string[];
  categoryScope: string[];
  startDate: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  assignedVerifier: { id: string; fullName: string; email: string };
  metrics: {
    totalCount: number;
    verifiedCount: number;
    foundCount: number;
    missingCount: number;
    wrongLocationCount: number;
    damagedCount: number;
    discrepancyCount: number;
    unreconciledDiscrepancies: number;
    progressPercent: number;
  };
}

export default function StockOpnamePage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.baseRole === 'ADMIN';

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    sessionName: '',
    startDate: new Date().toISOString().slice(0, 10),
    assignedVerifierId: user?.id || '',
    locationScope: [] as string[],
    categoryScope: [] as string[],
    notes: '',
  });

  // Fetch Master Data for Scope Pickers
  const { data: locations } = useQuery({
    queryKey: ['locations-active'],
    queryFn: async () => {
      const res = await fetch('/api/locations?status=ACTIVE');
      const json = await res.json();
      return json.data as Array<{ id: string; name: string }>;
    },
    enabled: isCreateModalOpen,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-active'],
    queryFn: async () => {
      const res = await fetch('/api/categories?status=ACTIVE');
      const json = await res.json();
      return json.data as Array<{ id: string; name: string }>;
    },
    enabled: isCreateModalOpen,
  });

  const { data: verifiers } = useQuery({
    queryKey: ['verifiers-picker'],
    queryFn: async () => {
      const res = await fetch('/api/users?pageSize=100');
      const json = await res.json();
      return ((json.data || []) as Array<any>).filter(
        (u) => u.baseRole === 'ADMIN' || u.isTechnician
      );
    },
    enabled: isCreateModalOpen,
  });

  // Fetch Opname Sessions Query
  const { data, isLoading } = useQuery({
    queryKey: ['stock-opname-sessions', { search, statusFilter, page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/stock-opname?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch sessions');
      return json;
    },
  });

  // Create Session Mutation (BR-018)
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch('/api/stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to create opname session');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Audit session started');
      queryClient.invalidateQueries({ queryKey: ['stock-opname-sessions'] });
      setIsCreateModalOpen(false);
      setFormData({
        sessionName: '',
        startDate: new Date().toISOString().slice(0, 10),
        assignedVerifierId: user?.id || '',
        locationScope: [],
        categoryScope: [],
        notes: '',
      });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const columns: ColumnDef<OpnameSessionItem>[] = [
    {
      accessorKey: 'sessionName',
      header: 'Audit Session',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <Link
            href={`/stock-opname/${s.id}`}
            className="group flex items-start gap-3 hover:text-indigo-600 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 group-hover:text-indigo-600">
                {s.sessionName}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Started {new Date(s.startDate).toLocaleDateString()} • {s.metrics.totalCount} items
              </div>
            </div>
          </Link>
        );
      },
    },
    {
      accessorKey: 'assignedVerifier',
      header: 'Assigned Verifier',
      cell: ({ row }) => (
        <div className="text-xs font-medium text-slate-800">
          {row.original.assignedVerifier.fullName}
        </div>
      ),
    },
    {
      accessorKey: 'progress',
      header: 'Audit Progress',
      cell: ({ row }) => {
        const m = row.original.metrics;
        return (
          <div className="w-36 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-800">{m.progressPercent}%</span>
              <span className="text-slate-400">
                {m.verifiedCount}/{m.totalCount}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${m.progressPercent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'discrepancies',
      header: 'Discrepancies',
      cell: ({ row }) => {
        const m = row.original.metrics;
        if (m.discrepancyCount === 0) {
          return (
            <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>0 Discrepancies</span>
            </span>
          );
        }
        return (
          <div className="space-y-0.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {m.discrepancyCount} Discrepancies
            </span>
            {m.unreconciledDiscrepancies > 0 && (
              <div className="text-[10px] text-red-600 font-semibold">
                {m.unreconciledDiscrepancies} pending reconcile
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        let color = 'bg-slate-100 text-slate-700 border-slate-200';
        if (s === 'OPEN') color = 'bg-blue-50 text-blue-700 border-blue-200';
        if (s === 'IN_PROGRESS') color = 'bg-amber-50 text-amber-700 border-amber-200';
        if (s === 'COMPLETED') color = 'bg-emerald-50 text-emerald-700 border-emerald-200';

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
            {s.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <Link
            href={`/stock-opname/${s.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>Audit Workspace</span>
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
        { label: 'In Progress', value: 'IN_PROGRESS' },
        { label: 'Open (Ready to Start)', value: 'OPEN' },
        { label: 'Completed', value: 'COMPLETED' },
      ],
    },
  ];

  const handleToggleLocation = (locId: string) => {
    setFormData((prev) => {
      const exists = prev.locationScope.includes(locId);
      return {
        ...prev,
        locationScope: exists
          ? prev.locationScope.filter((id) => id !== locId)
          : [...prev.locationScope, locId],
      };
    });
  };

  const handleToggleCategory = (catId: string) => {
    setFormData((prev) => {
      const exists = prev.categoryScope.includes(catId);
      return {
        ...prev,
        categoryScope: exists
          ? prev.categoryScope.filter((id) => id !== catId)
          : [...prev.categoryScope, catId],
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Inventory / Physical Audit
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Stock Opname & Auditing
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Conduct physical inventory audits, scan QR codes, and reconcile location/condition discrepancies.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Stock Opname Session</span>
          </button>
        )}
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
        searchPlaceholder="Search session name..."
        filters={filterOptions}
        isLoading={isLoading}
        emptyMessage="No stock opname sessions found."
      />

      {/* Create Session Modal (BR-018) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">New Stock Opname Session</h3>
                <p className="text-[11px] text-slate-500">
                  Target equipment in chosen locations will be automatically populated (BR-018).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="p-6 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar"
            >
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Audit Session Name *</label>
                <input
                  type="text"
                  required
                  value={formData.sessionName}
                  onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                  placeholder="e.g. Stock Opname Semester Ganjil 2026 - Lab TKJ & Server Room"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Audit Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Assigned Verifier *</label>
                  <select
                    required
                    value={formData.assignedVerifierId}
                    onChange={(e) => setFormData({ ...formData, assignedVerifierId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="">-- Choose Verifier --</option>
                    {verifiers?.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.fullName} ({v.baseRole})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location Scope Multi-select */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">
                    Location Scope ({formData.locationScope.length === 0 ? 'All Rooms' : `${formData.locationScope.length} selected`})
                  </label>
                  <span className="text-[11px] text-slate-400">Leave empty to audit all locations</span>
                </div>
                <div className="border border-slate-200 rounded-xl p-2.5 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 bg-slate-50/50">
                  {locations?.map((loc) => {
                    const isChecked = formData.locationScope.includes(loc.id);
                    return (
                      <label
                        key={loc.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-indigo-50 border-indigo-200 font-semibold text-indigo-900' : 'bg-white border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleLocation(loc.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate">{loc.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Category Scope Multi-select */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">
                    Category Scope ({formData.categoryScope.length === 0 ? 'All Categories' : `${formData.categoryScope.length} selected`})
                  </label>
                  <span className="text-[11px] text-slate-400">Leave empty for all equipment types</span>
                </div>
                <div className="border border-slate-200 rounded-xl p-2.5 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 bg-slate-50/50">
                  {categories?.map((cat) => {
                    const isChecked = formData.categoryScope.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-indigo-50 border-indigo-200 font-semibold text-indigo-900' : 'bg-white border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCategory(cat.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate">{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-60"
                >
                  Start Audit Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

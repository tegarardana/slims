'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableFilterOption } from '@/components/data-table/data-table';
import {
  ClipboardList,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BookmarkCheck,
  Calendar,
  User,
  Server,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface LoanItemRecord {
  id: string;
  purpose: string;
  startDate: string;
  expectedReturnDate: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'RETURNED' | 'PARTIALLY_RETURNED';
  isOverdue: boolean;
  requester: { id: string; fullName: string; email: string; department: string | null };
  approver: { id: string; fullName: string } | null;
  itemCount: number;
  items: Array<{
    id: string;
    itemStatus: string;
    device: { assetTag: string; brand: string; model: string; category: { name: string } };
  }>;
  createdAt: string;
}

export default function LoansPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.baseRole === 'ADMIN';

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    purpose: '',
    startDate: new Date().toISOString().slice(0, 10),
    expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    notes: '',
    selectedDeviceIds: [] as string[],
  });

  // Fetch Available Devices for Loan Picker
  const { data: availableDevices } = useQuery({
    queryKey: ['available-devices-for-loan'],
    queryFn: async () => {
      const res = await fetch('/api/devices?availableOnly=true&pageSize=100');
      const json = await res.json();
      return (json.data || []) as Array<{
        id: string;
        assetTag: string;
        brand: string;
        model: string;
        category: { name: string };
        location: { name: string };
      }>;
    },
    enabled: isRequestModalOpen,
  });

  // Fetch Loans Query
  const { data, isLoading } = useQuery({
    queryKey: ['loans', { search, statusFilter, overdueOnly, page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(overdueOnly && { overdueOnly: 'true' }),
      });
      const res = await fetch(`/api/loans?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch loans');
      return json;
    },
  });

  // Create Loan Request Mutation
  const createLoanMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: payload.purpose,
          startDate: payload.startDate,
          expectedReturnDate: payload.expectedReturnDate,
          notes: payload.notes,
          deviceIds: payload.selectedDeviceIds,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to submit loan request');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Loan request submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setIsRequestModalOpen(false);
      setFormData({
        purpose: '',
        startDate: new Date().toISOString().slice(0, 10),
        expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        notes: '',
        selectedDeviceIds: [],
      });
    },
    onError: (err: any) => toast.error(err.message, { duration: 5000 }),
  });

  const columns: ColumnDef<LoanItemRecord>[] = [
    {
      accessorKey: 'id',
      header: 'Loan Details',
      cell: ({ row }) => {
        const l = row.original;
        return (
          <Link
            href={`/loans/${l.id}`}
            className="group block hover:text-indigo-600 transition-colors"
          >
            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 flex items-center gap-1.5">
              <span>{l.purpose}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
              <span>ID: {l.id.slice(-8).toUpperCase()}</span>
              <span>•</span>
              <span>{l.itemCount} item(s)</span>
            </div>
          </Link>
        );
      },
    },
    {
      accessorKey: 'requester',
      header: 'Borrower',
      cell: ({ row }) => {
        const req = row.original.requester;
        return (
          <div>
            <div className="font-semibold text-slate-900">{req.fullName}</div>
            <div className="text-[11px] text-slate-500">{req.department || req.email}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'items',
      header: 'Requested Equipment',
      cell: ({ row }) => {
        const items = row.original.items;
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {items.map((i) => (
              <span
                key={i.id}
                className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[10px] font-semibold"
              >
                {i.device.assetTag}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'period',
      header: 'Loan Period',
      cell: ({ row }) => {
        const l = row.original;
        return (
          <div className="text-[11px]">
            <div className="text-slate-700 font-medium">
              {new Date(l.startDate).toLocaleDateString()} →{' '}
              {new Date(l.expectedReturnDate).toLocaleDateString()}
            </div>
            {l.isOverdue && (
              <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-bold mt-0.5">
                <AlertTriangle className="w-3 h-3" />
                OVERDUE
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const l = row.original;
        let color = 'bg-slate-100 text-slate-700 border-slate-200';
        if (l.status === 'PENDING_APPROVAL') color = 'bg-amber-50 text-amber-700 border-amber-200';
        if (l.status === 'APPROVED') color = 'bg-blue-50 text-blue-700 border-blue-200';
        if (l.status === 'ACTIVE') color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        if (l.status === 'PARTIALLY_RETURNED') color = 'bg-purple-50 text-purple-700 border-purple-200';
        if (l.status === 'RETURNED') color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (l.status === 'REJECTED') color = 'bg-red-50 text-red-700 border-red-200';

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
            {l.status.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const l = row.original;
        return (
          <Link
            href={`/loans/${l.id}`}
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
        { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
        { label: 'Approved (Pending Handover)', value: 'APPROVED' },
        { label: 'Active Loans', value: 'ACTIVE' },
        { label: 'Partially Returned', value: 'PARTIALLY_RETURNED' },
        { label: 'Returned', value: 'RETURNED' },
        { label: 'Rejected', value: 'REJECTED' },
      ],
    },
  ];

  const handleDeviceToggle = (deviceId: string) => {
    setFormData((prev) => {
      const exists = prev.selectedDeviceIds.includes(deviceId);
      return {
        ...prev,
        selectedDeviceIds: exists
          ? prev.selectedDeviceIds.filter((id) => id !== deviceId)
          : [...prev.selectedDeviceIds, deviceId],
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Operations / Borrowing
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Equipment Loan Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage device requests, approval workflows, equipment handovers, and return inspections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
              overdueOnly
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {overdueOnly ? '✓ Showing Overdue Only' : 'Filter Overdue'}
          </button>

          <button
            type="button"
            onClick={() => setIsRequestModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Request Loan</span>
          </button>
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
        searchPlaceholder="Search by purpose, borrower name, asset tag..."
        filters={filterOptions}
        isLoading={isLoading}
        emptyMessage="No loan records found."
      />

      {/* Request Loan Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">New Equipment Loan Request</h3>
                <p className="text-[11px] text-slate-500">
                  Select available hardware and specify borrowing dates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (formData.selectedDeviceIds.length === 0) {
                  toast.error('Please select at least 1 device to borrow');
                  return;
                }
                createLoanMutation.mutate(formData);
              }}
              className="p-6 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar"
            >
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Purpose of Loan *</label>
                <input
                  type="text"
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g. Praktik Jaringan Routing Dinamik Kelas XII TKJ"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Expected Return Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expectedReturnDate}
                    onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Equipment Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">
                    Select Equipment to Borrow ({formData.selectedDeviceIds.length} selected) *
                  </label>
                  <span className="text-[11px] text-slate-400">Showing available hardware only</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                  {availableDevices?.length ? (
                    availableDevices.map((d) => {
                      const isSelected = formData.selectedDeviceIds.includes(d.id);
                      return (
                        <div
                          key={d.id}
                          onClick={() => handleDeviceToggle(d.id)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/80 font-semibold' : 'hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <div className="font-mono text-slate-900">{d.assetTag}</div>
                              <div className="text-[11px] text-slate-500">
                                {d.brand} {d.model} • {d.category.name}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {d.location.name}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-slate-400">
                      No available devices found for loan at this time.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Additional Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Needs console cable & power adapter"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoanMutation.isPending || formData.selectedDeviceIds.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-60"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

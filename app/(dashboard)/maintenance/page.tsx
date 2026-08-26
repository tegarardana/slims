'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableFilterOption } from '@/components/data-table/data-table';
import {
  Wrench,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Server,
  User,
  Calendar,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface MaintenanceItem {
  id: string;
  maintenanceType: 'CORRECTIVE' | 'PREVENTIVE' | 'CALIBRATION' | 'UPGRADE';
  problem: string;
  startDate: string;
  completionDate: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'CANCELLED';
  cost: number | null;
  device: { id: string; assetTag: string; brand: string; model: string; category: { name: string } };
  technician: { id: string; fullName: string; email: string } | null;
  relatedIncident: { id: string; description: string; severity: string } | null;
}

export default function MaintenancePage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.baseRole === 'ADMIN';
  const isTechnician = Boolean(user?.isTechnician);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    deviceId: string;
    maintenanceType: 'CORRECTIVE' | 'PREVENTIVE' | 'CALIBRATION' | 'UPGRADE';
    problem: string;
    startDate: string;
    technicianId: string;
    status: 'OPEN' | 'IN_PROGRESS';
    cost: number;
    notes: string;
  }>({
    deviceId: '',
    maintenanceType: 'CORRECTIVE',
    problem: '',
    startDate: new Date().toISOString().slice(0, 10),
    technicianId: '',
    status: 'IN_PROGRESS',
    cost: 0,
    notes: '',
  });

  // Fetch Devices for Picker
  const { data: allDevices } = useQuery({
    queryKey: ['devices-picker-maintenance'],
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
    enabled: isCreateModalOpen,
  });

  // Fetch Technicians for Picker
  const { data: technicians } = useQuery({
    queryKey: ['technicians-picker'],
    queryFn: async () => {
      const res = await fetch('/api/users?pageSize=100');
      const json = await res.json();
      return ((json.data || []) as Array<any>).filter(
        (u) => u.baseRole === 'ADMIN' || u.isTechnician
      );
    },
    enabled: isCreateModalOpen,
  });

  // Fetch Maintenance Records Query
  const { data, isLoading } = useQuery({
    queryKey: ['maintenances', { search, statusFilter, typeFilter, page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter }),
      });
      const res = await fetch(`/api/maintenances?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch maintenance jobs');
      return json;
    },
  });

  // Create Maintenance Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch('/api/maintenances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          cost: payload.cost > 0 ? Number(payload.cost) : null,
          technicianId: payload.technicianId || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to create maintenance ticket');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Maintenance ticket created. Device is now under maintenance.');
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      setIsCreateModalOpen(false);
      setFormData({
        deviceId: '',
        maintenanceType: 'CORRECTIVE',
        problem: '',
        startDate: new Date().toISOString().slice(0, 10),
        technicianId: '',
        status: 'IN_PROGRESS',
        cost: 0,
        notes: '',
      });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const columns: ColumnDef<MaintenanceItem>[] = [
    {
      accessorKey: 'device',
      header: 'Equipment',
      cell: ({ row }) => {
        const m = row.original;
        return (
          <Link
            href={`/maintenance/${m.id}`}
            className="group flex items-start gap-3 hover:text-indigo-600 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <div className="font-mono font-bold text-slate-900 group-hover:text-indigo-600">
                {m.device.assetTag}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {m.device.brand} {m.device.model}
              </div>
            </div>
          </Link>
        );
      },
    },
    {
      accessorKey: 'maintenanceType',
      header: 'Service Type',
      cell: ({ row }) => {
        const t = row.original.maintenanceType;
        let color = 'bg-slate-100 text-slate-700 border-slate-200';
        if (t === 'CORRECTIVE') color = 'bg-red-50 text-red-700 border-red-200';
        if (t === 'PREVENTIVE') color = 'bg-blue-50 text-blue-700 border-blue-200';
        if (t === 'CALIBRATION') color = 'bg-purple-50 text-purple-700 border-purple-200';
        if (t === 'UPGRADE') color = 'bg-emerald-50 text-emerald-700 border-emerald-200';

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${color}`}>
            {t}
          </span>
        );
      },
    },
    {
      accessorKey: 'problem',
      header: 'Scope / Problem',
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="max-w-xs">
            <div className="font-medium text-slate-900 text-xs line-clamp-1">{m.problem}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Start: {new Date(m.startDate).toLocaleDateString()}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'technician',
      header: 'Technician',
      cell: ({ row }) => {
        const tech = row.original.technician;
        return (
          <div className="text-xs font-medium text-slate-800">
            {tech ? tech.fullName : 'Unassigned'}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const m = row.original;
        let color = 'bg-slate-100 text-slate-700 border-slate-200';
        if (m.status === 'OPEN') color = 'bg-blue-50 text-blue-700 border-blue-200';
        if (m.status === 'IN_PROGRESS') color = 'bg-amber-50 text-amber-700 border-amber-200';
        if (m.status === 'WAITING_PARTS') color = 'bg-purple-50 text-purple-700 border-purple-200';
        if (m.status === 'COMPLETED') color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (m.status === 'CANCELLED') color = 'bg-slate-100 text-slate-500 border-slate-200';

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
            {m.status.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const m = row.original;
        return (
          <Link
            href={`/maintenance/${m.id}`}
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
        { label: 'In Progress', value: 'IN_PROGRESS' },
        { label: 'Open', value: 'OPEN' },
        { label: 'Waiting Parts', value: 'WAITING_PARTS' },
        { label: 'Completed', value: 'COMPLETED' },
        { label: 'Cancelled', value: 'CANCELLED' },
      ],
    },
    {
      key: 'type',
      label: 'Service Type',
      value: typeFilter,
      onChange: (v) => {
        setTypeFilter(v);
        setPage(1);
      },
      options: [
        { label: 'Corrective (Repair)', value: 'CORRECTIVE' },
        { label: 'Preventive (Routine)', value: 'PREVENTIVE' },
        { label: 'Calibration', value: 'CALIBRATION' },
        { label: 'Hardware Upgrade', value: 'UPGRADE' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Operations / Service
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Maintenance Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Schedule routine servicing, track corrective repair logs, and log spare parts.
          </p>
        </div>

        {(isAdmin || isTechnician) && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Maintenance Job</span>
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
        searchPlaceholder="Search by tag, brand, problem, technician..."
        filters={filterOptions}
        isLoading={isLoading}
        emptyMessage="No maintenance jobs found."
      />

      {/* Create Maintenance Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">New Maintenance Job</h3>
                <p className="text-[11px] text-slate-500">
                  Target device will be transitioned to Under Maintenance (BR-013).
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
                <label className="font-semibold text-slate-700">Target Equipment *</label>
                <select
                  required
                  value={formData.deviceId}
                  onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="">-- Choose Equipment --</option>
                  {allDevices?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.assetTag} — {d.brand} {d.model} ({d.category.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Service Type *</label>
                  <select
                    value={formData.maintenanceType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maintenanceType: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="CORRECTIVE">Corrective (Repair)</option>
                    <option value="PREVENTIVE">Preventive (Routine)</option>
                    <option value="CALIBRATION">Calibration</option>
                    <option value="UPGRADE">Hardware Upgrade</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Initial Job Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="IN_PROGRESS">In Progress (Starting now)</option>
                    <option value="OPEN">Open (Queued)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Assigned Technician</label>
                <select
                  value={formData.technicianId}
                  onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="">-- Assign to Me ({user.name}) --</option>
                  {technicians?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.baseRole})
                    </option>
                  ))}
                </select>
              </div>

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
                <label className="font-semibold text-slate-700">Problem / Scope Description *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  placeholder="e.g. Penggantian kapasitor power supply dan pembersihan kipas pendingin..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
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
                  disabled={createMutation.isPending || !formData.deviceId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-60"
                >
                  Create Maintenance Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

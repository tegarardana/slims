'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableFilterOption } from '@/components/data-table/data-table';
import { Plus, Edit, Archive, CheckCircle2, Trash2, MapPin, Server, GitBranch } from 'lucide-react';
import { toast } from 'sonner';

interface LocationItem {
  id: string;
  name: string;
  parentLocationId: string | null;
  parentLocation: { id: string; name: string } | null;
  status: 'ACTIVE' | 'ARCHIVED';
  deviceCount: number;
  childLocationCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function LocationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    parentLocationId: '',
  });

  // Fetch Locations
  const { data, isLoading } = useQuery({
    queryKey: ['locations', { search, statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/locations?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch locations');
      return json.data as LocationItem[];
    },
  });

  // Create Location
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          parentLocationId: payload.parentLocationId || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to create location');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Location created successfully');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setIsAddModalOpen(false);
      setFormData({ name: '', parentLocationId: '' });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update Location
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/locations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to update location');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Location updated successfully');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setEditingLocation(null);
      setFormData({ name: '', parentLocationId: '' });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete Location (Enforcing BR-015)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to delete location');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Location deleted');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (err: any) => {
      toast.error(err.message, { duration: 5000 });
    },
  });

  const columns: ColumnDef<LocationItem>[] = [
    {
      accessorKey: 'name',
      header: 'Location Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{row.original.name}</div>
            <div className="text-[11px] text-slate-400">ID: {row.original.id}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'parentLocation',
      header: 'Parent Location',
      cell: ({ row }) => {
        const parent = row.original.parentLocation;
        return parent ? (
          <span className="inline-flex items-center gap-1 text-slate-700 text-xs font-medium">
            <GitBranch className="w-3.5 h-3.5 text-slate-400" />
            <span>{parent.name}</span>
          </span>
        ) : (
          <span className="text-slate-400 text-xs">— (Top-level)</span>
        );
      },
    },
    {
      accessorKey: 'deviceCount',
      header: 'Placed Devices',
      cell: ({ row }) => {
        const count = row.original.deviceCount;
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span>{count} device(s)</span>
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.original.status === 'ACTIVE';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              active
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                active ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {row.original.status}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const loc = row.original;
        const isArchived = loc.status === 'ARCHIVED';

        return (
          <div className="flex items-center gap-2">
            {/* Edit */}
            <button
              type="button"
              onClick={() => {
                setEditingLocation(loc);
                setFormData({
                  name: loc.name,
                  parentLocationId: loc.parentLocationId || '',
                });
              }}
              title="Edit location"
              className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>

            {/* Archive / Reactivate Toggle */}
            <button
              type="button"
              onClick={() =>
                updateMutation.mutate({
                  id: loc.id,
                  payload: { status: isArchived ? 'ACTIVE' : 'ARCHIVED' },
                })
              }
              title={isArchived ? 'Reactivate location' : 'Archive location'}
              className={`p-1 rounded transition-colors ${
                isArchived
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-amber-600 hover:bg-amber-50'
              }`}
            >
              {isArchived ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </button>

            {/* Delete button (with safe BR-015 check) */}
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    `Are you sure you want to delete '${loc.name}'? If it has linked devices or sub-locations, deletion will be blocked.`
                  )
                ) {
                  deleteMutation.mutate(loc.id);
                }
              }}
              title="Delete location"
              className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  const filterOptions: DataTableFilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      value: statusFilter,
      onChange: (v) => setStatusFilter(v),
      options: [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Archived', value: 'ARCHIVED' },
      ],
    },
  ];

  const handleExport = () => {
    if (!data?.length) return;
    const headers = ['Location ID,Location Name,Parent Location,Status,Linked Devices'];
    const rows = data.map(
      (l) =>
        `"${l.id}","${l.name}","${l.parentLocation?.name || 'Top-level'}","${l.status}",${l.deviceCount}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `slims_locations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Inventory / Master Data
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Physical Locations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage lab rooms, server racks, and storage areas for network equipment.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormData({ name: '', parentLocationId: '' });
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Location</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data || []}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search locations..."
        filters={filterOptions}
        isLoading={isLoading}
        onExportCsv={handleExport}
        emptyMessage="No locations found."
      />

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingLocation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingLocation ? 'Edit Location' : 'Create New Location'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingLocation(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingLocation) {
                  updateMutation.mutate({
                    id: editingLocation.id,
                    payload: formData,
                  });
                } else {
                  createMutation.mutate(formData);
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Location Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Lab TKJ 3 (Building B)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">
                  Parent Location (Optional Hierarchy)
                </label>
                <select
                  value={formData.parentLocationId}
                  onChange={(e) =>
                    setFormData({ ...formData, parentLocationId: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="">-- None (Top-level Location) --</option>
                  {data
                    ?.filter((l) => l.id !== editingLocation?.id)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingLocation(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-60"
                >
                  {editingLocation ? 'Save Changes' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

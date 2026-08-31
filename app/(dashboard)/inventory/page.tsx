'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableFilterOption, BulkActionOption } from '@/components/data-table/data-table';
import {
  Server,
  Plus,
  Eye,
  Edit,
  Trash2,
  Upload,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface DeviceItem {
  id: string;
  assetTag: string;
  serialNumber: string | null;
  qrCodeValue: string;
  deviceType: string;
  brand: string;
  model: string;
  category: { id: string; name: string };
  location: { id: string; name: string };
  status: 'AVAILABLE' | 'BORROWED' | 'UNDER_MAINTENANCE' | 'LOST' | 'RETIRED' | 'DISPOSED';
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'CRITICAL';
  yearAcquired: number | null;
  currentCustodian: { id: string; fullName: string } | null;
  isAvailableForLoan: boolean;
  createdAt: string;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.baseRole === 'ADMIN';

  // Filters and Pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Sync search param from URL if redirected from global search header
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSearch = urlParams.get('search');
      if (urlSearch) {
        setSearch(urlSearch);
      }
    }
  }, []);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceItem | null>(null);

  // Bulk Modal State
  const [bulkModalType, setBulkModalType] = useState<
    'LOCATION' | 'STATUS' | 'CONDITION' | 'RETIRE' | null
  >(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [bulkTargetLocation, setBulkTargetLocation] = useState('');
  const [bulkTargetStatus, setBulkTargetStatus] = useState('AVAILABLE');
  const [bulkTargetCondition, setBulkTargetCondition] = useState('GOOD');

  // Form State
  const [formData, setFormData] = useState({
    assetTag: '',
    serialNumber: '',
    categoryId: '',
    deviceType: 'Router',
    brand: '',
    model: '',
    locationId: '',
    yearAcquired: new Date().getFullYear(),
    acquisitionSource: '',
    purchasePrice: 0,
    warrantyInfo: '',
    status: 'AVAILABLE' as const,
    condition: 'GOOD' as const,
    description: '',
    notes: '',
  });

  // Fetch Master Data for dropdowns
  const { data: categories } = useQuery({
    queryKey: ['categories-active'],
    queryFn: async () => {
      const res = await fetch('/api/categories?status=ACTIVE');
      const json = await res.json();
      return json.data as Array<{ id: string; name: string }>;
    },
  });

  const { data: locations } = useQuery({
    queryKey: ['locations-active'],
    queryFn: async () => {
      const res = await fetch('/api/locations?status=ACTIVE');
      const json = await res.json();
      return json.data as Array<{ id: string; name: string }>;
    },
  });

  // Fetch Devices
  const { data, isLoading } = useQuery({
    queryKey: [
      'devices',
      { search, categoryFilter, locationFilter, statusFilter, conditionFilter, availableOnly, page, pageSize },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        ...(categoryFilter && { categoryId: categoryFilter }),
        ...(locationFilter && { locationId: locationFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(conditionFilter && { condition: conditionFilter }),
        ...(availableOnly && { availableOnly: 'true' }),
      });
      const res = await fetch(`/api/devices?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch devices');
      return json;
    },
  });

  // Create Device Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to create device');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Device added to inventory');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update Device Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/devices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to update device');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Device updated');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setEditingDevice(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete Device Mutation (BR-015)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to delete device');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Device removed');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (err: any) => toast.error(err.message, { duration: 6000 }),
  });

  // Bulk Action Mutation (BR-016)
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload: any }) => {
      const res = await fetch('/api/devices/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceIds: selectedBulkIds, action, payload }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Bulk action failed');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Bulk update completed');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setBulkModalType(null);
      setSelectedBulkIds([]);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormData({
      assetTag: '',
      serialNumber: '',
      categoryId: categories?.[0]?.id || '',
      deviceType: 'Router',
      brand: '',
      model: '',
      locationId: locations?.[0]?.id || '',
      yearAcquired: new Date().getFullYear(),
      acquisitionSource: '',
      purchasePrice: 0,
      warrantyInfo: '',
      status: 'AVAILABLE',
      condition: 'GOOD',
      description: '',
      notes: '',
    });
  };

  const handleEditClick = (device: DeviceItem) => {
    setEditingDevice(device);
    setFormData({
      assetTag: device.assetTag,
      serialNumber: device.serialNumber || '',
      categoryId: device.category.id,
      deviceType: device.deviceType,
      brand: device.brand,
      model: device.model,
      locationId: device.location.id,
      yearAcquired: device.yearAcquired || new Date().getFullYear(),
      acquisitionSource: '',
      purchasePrice: 0,
      warrantyInfo: '',
      status: device.status as any,
      condition: device.condition as any,
      description: '',
      notes: '',
    });
  };

  const columns: ColumnDef<DeviceItem>[] = [
    {
      accessorKey: 'assetTag',
      header: 'Asset Identity',
      cell: ({ row }) => {
        const d = row.original;
        return (
          <Link
            href={`/inventory/${d.id}`}
            className="group flex items-start gap-3 hover:text-indigo-600 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="font-mono font-bold text-slate-900 group-hover:text-indigo-600 tracking-tight flex items-center gap-1.5">
                <span>{d.assetTag}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {d.brand} {d.model}
              </div>
            </div>
          </Link>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
          <Layers className="w-3 h-3 text-slate-400" />
          <span>{row.original.category.name}</span>
        </span>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Current Location',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>{row.original.location.name}</span>
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        let color = 'bg-slate-100 text-slate-700 border-slate-200';
        if (s === 'AVAILABLE') color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (s === 'BORROWED') color = 'bg-blue-50 text-blue-700 border-blue-200';
        if (s === 'UNDER_MAINTENANCE') color = 'bg-amber-50 text-amber-700 border-amber-200';
        if (s === 'LOST' || s === 'DISPOSED') color = 'bg-red-50 text-red-700 border-red-200';

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
            {s.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      accessorKey: 'condition',
      header: 'Condition',
      cell: ({ row }) => {
        const c = row.original.condition;
        let color = 'bg-slate-100 text-slate-700 border-slate-200';
        if (c === 'EXCELLENT') color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (c === 'GOOD') color = 'bg-blue-50 text-blue-700 border-blue-200';
        if (c === 'FAIR') color = 'bg-yellow-50 text-yellow-800 border-yellow-200';
        if (c === 'DAMAGED' || c === 'CRITICAL') color = 'bg-red-50 text-red-700 border-red-200';

        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${color}`}>
            {c}
          </span>
        );
      },
    },
    {
      accessorKey: 'isAvailableForLoan',
      header: 'Loan Status',
      cell: ({ row }) => {
        const avail = row.original.isAvailableForLoan;
        return (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
              avail ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${avail ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span>{avail ? 'Available' : 'Unavailable'}</span>
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex items-center gap-2">
            <Link
              href={`/inventory/${d.id}`}
              title="View details & QR"
              className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </Link>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => handleEditClick(d)}
                  title="Edit device"
                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${d.assetTag}?`)) {
                      deleteMutation.mutate(d.id);
                    }
                  }}
                  title="Delete device"
                  className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const filterOptions: DataTableFilterOption[] = [
    {
      key: 'category',
      label: 'Category',
      value: categoryFilter,
      onChange: (v) => {
        setCategoryFilter(v);
        setPage(1);
      },
      options: categories?.map((c) => ({ label: c.name, value: c.id })) || [],
    },
    {
      key: 'location',
      label: 'Location',
      value: locationFilter,
      onChange: (v) => {
        setLocationFilter(v);
        setPage(1);
      },
      options: locations?.map((l) => ({ label: l.name, value: l.id })) || [],
    },
    {
      key: 'status',
      label: 'Status',
      value: statusFilter,
      onChange: (v) => {
        setStatusFilter(v);
        setPage(1);
      },
      options: [
        { label: 'Available', value: 'AVAILABLE' },
        { label: 'Borrowed', value: 'BORROWED' },
        { label: 'Under Maintenance', value: 'UNDER_MAINTENANCE' },
        { label: 'Lost', value: 'LOST' },
        { label: 'Retired', value: 'RETIRED' },
      ],
    },
    {
      key: 'condition',
      label: 'Condition',
      value: conditionFilter,
      onChange: (v) => {
        setConditionFilter(v);
        setPage(1);
      },
      options: [
        { label: 'Excellent', value: 'EXCELLENT' },
        { label: 'Good', value: 'GOOD' },
        { label: 'Fair', value: 'FAIR' },
        { label: 'Damaged', value: 'DAMAGED' },
        { label: 'Critical', value: 'CRITICAL' },
      ],
    },
  ];

  // Contextual Bulk Action Bar Options (DESIGN.md §27, §29)
  const bulkActions: BulkActionOption[] = isAdmin
    ? [
        {
          label: 'Change Location',
          action: (ids) => {
            setSelectedBulkIds(ids);
            setBulkTargetLocation(locations?.[0]?.id || '');
            setBulkModalType('LOCATION');
          },
        },
        {
          label: 'Change Status',
          action: (ids) => {
            setSelectedBulkIds(ids);
            setBulkTargetStatus('AVAILABLE');
            setBulkModalType('STATUS');
          },
        },
        {
          label: 'Change Condition',
          action: (ids) => {
            setSelectedBulkIds(ids);
            setBulkTargetCondition('GOOD');
            setBulkModalType('CONDITION');
          },
        },
        {
          label: 'Retire Devices',
          action: (ids) => {
            setSelectedBulkIds(ids);
            setBulkModalType('RETIRE');
          },
          variant: 'danger',
        },
      ]
    : [];

  const handleExport = () => {
    if (!data?.data?.length) return;
    const headers = ['Asset Tag,Serial Number,Brand,Model,Category,Location,Status,Condition,Available for Loan'];
    const rows = data.data.map(
      (d: DeviceItem) =>
        `"${d.assetTag}","${d.serialNumber || ''}","${d.brand}","${d.model}","${d.category.name}","${d.location.name}","${d.status}","${d.condition}",${d.isAvailableForLoan}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `slims_devices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header (DESIGN.md §12, §25) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Inventory / Equipment
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Device Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage networking hardware, tracking tags, locations, and lifecycle statuses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAvailableOnly(!availableOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
              availableOnly
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {availableOnly ? '✓ Available Only' : 'Filter Available Only'}
          </button>

          {isAdmin && (
            <>
              <Link
                href="/inventory/import"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Import CSV</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Device</span>
              </button>
            </>
          )}
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
        searchPlaceholder="Search by tag, serial, brand, model..."
        filters={filterOptions}
        bulkActions={bulkActions}
        isLoading={isLoading}
        onExportCsv={handleExport}
        emptyMessage="No devices match your search criteria."
      />

      {/* Bulk Action Modals (DESIGN.md §30) */}
      {bulkModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Bulk Update: {selectedBulkIds.length} Device(s)
              </h3>
              <button
                type="button"
                onClick={() => setBulkModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Change Location */}
            {bulkModalType === 'LOCATION' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Select new physical placement for all selected equipment:
                </p>
                <select
                  value={bulkTargetLocation}
                  onChange={(e) => setBulkTargetLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-medium"
                >
                  {locations?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBulkModalType(null)}
                    className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      bulkActionMutation.mutate({
                        action: 'CHANGE_LOCATION',
                        payload: { locationId: bulkTargetLocation },
                      })
                    }
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    Apply New Location
                  </button>
                </div>
              </div>
            )}

            {/* Change Status */}
            {bulkModalType === 'STATUS' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600">Update operational status for all selected equipment:</p>
                <select
                  value={bulkTargetStatus}
                  onChange={(e) => setBulkTargetStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-medium"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  <option value="LOST">Lost</option>
                  <option value="RETIRED">Retired</option>
                  <option value="DISPOSED">Disposed</option>
                </select>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBulkModalType(null)}
                    className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      bulkActionMutation.mutate({
                        action: 'CHANGE_STATUS',
                        payload: { status: bulkTargetStatus },
                      })
                    }
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    Apply Status
                  </button>
                </div>
              </div>
            )}

            {/* Change Condition */}
            {bulkModalType === 'CONDITION' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600">Update physical condition state for all selected equipment:</p>
                <select
                  value={bulkTargetCondition}
                  onChange={(e) => setBulkTargetCondition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-medium"
                >
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBulkModalType(null)}
                    className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      bulkActionMutation.mutate({
                        action: 'CHANGE_CONDITION',
                        payload: { condition: bulkTargetCondition },
                      })
                    }
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    Apply Condition
                  </button>
                </div>
              </div>
            )}

            {/* Retire */}
            {bulkModalType === 'RETIRE' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>
                    This action will mark {selectedBulkIds.length} device(s) as <strong>RETIRED</strong>.
                    They will no longer be available for student or teacher loans.
                  </span>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBulkModalType(null)}
                    className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      bulkActionMutation.mutate({
                        action: 'RETIRE',
                        payload: {},
                      })
                    }
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    Confirm Retirement
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Device Modal */}
      {(isAddModalOpen || editingDevice) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingDevice ? `Edit Device — ${editingDevice.assetTag}` : 'Register New Device'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Fill in hardware identity, initial status, and placement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingDevice(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingDevice) {
                  updateMutation.mutate({
                    id: editingDevice.id,
                    payload: formData,
                  });
                } else {
                  createMutation.mutate(formData);
                }
              }}
              className="p-6 overflow-y-auto space-y-5 text-xs flex-1 custom-scrollbar"
            >
              {/* Section 1: Identification */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px] border-b border-slate-100 pb-1">
                  1. Identification & Classification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Asset Tag *</label>
                    <input
                      type="text"
                      required
                      value={formData.assetTag}
                      onChange={(e) => setFormData({ ...formData, assetTag: e.target.value.toUpperCase() })}
                      placeholder="e.g. RTR-001 or SW-02"
                      className="w-full font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Serial Number</label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      placeholder="e.g. FOC22340Z1A"
                      className="w-full font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Category *</label>
                    <select
                      required
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    >
                      <option value="">-- Select Category --</option>
                      {categories?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Device Type *</label>
                    <input
                      type="text"
                      required
                      value={formData.deviceType}
                      onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                      placeholder="e.g. Managed Switch, Core Router"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Hardware Details */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px] border-b border-slate-100 pb-1">
                  2. Hardware Brand & Model
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Brand / Manufacturer *</label>
                    <input
                      type="text"
                      required
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="e.g. Cisco, MikroTik, Ubiquiti"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Model *</label>
                    <input
                      type="text"
                      required
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="e.g. Catalyst 2960-24TT"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Placement & Lifecycle */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px] border-b border-slate-100 pb-1">
                  3. Location & Operational State
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Location *</label>
                    <select
                      required
                      value={formData.locationId}
                      onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    >
                      <option value="">-- Select Location --</option>
                      {locations?.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Initial Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                      <option value="RETIRED">Retired</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Physical Condition</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    >
                      <option value="EXCELLENT">Excellent</option>
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair</option>
                      <option value="DAMAGED">Damaged</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Acquisition Notes */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px] border-b border-slate-100 pb-1">
                  4. Acquisition & Specifications (Optional)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Year Acquired</label>
                    <input
                      type="number"
                      value={formData.yearAcquired || ''}
                      onChange={(e) => setFormData({ ...formData, yearAcquired: parseInt(e.target.value, 10) || 0 })}
                      placeholder="e.g. 2024"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Warranty Info</label>
                    <input
                      type="text"
                      value={formData.warrantyInfo}
                      onChange={(e) => setFormData({ ...formData, warrantyInfo: e.target.value })}
                      placeholder="e.g. Cisco SmartNet Valid until 2028"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-semibold text-slate-700">Description / Technical Notes</label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g. 24 Gigabit Ethernet ports + 2 SFP uplinks..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingDevice(null);
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
                  {editingDevice ? 'Save Changes' : 'Register Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

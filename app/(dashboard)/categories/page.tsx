'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableFilterOption } from '@/components/data-table/data-table';
import { Plus, Edit, Archive, CheckCircle2, Trash2, Layers, Server, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CategoryItem {
  id: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
  deviceCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryName, setCategoryName] = useState('');

  // Fetch Categories
  const { data, isLoading } = useQuery({
    queryKey: ['categories', { search, statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/categories?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch categories');
      return json.data as CategoryItem[];
    },
  });

  // Create Category
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to create category');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsAddModalOpen(false);
      setCategoryName('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update Category
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to update category');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Category updated successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingCategory(null);
      setCategoryName('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete Category (Enforcing BR-015)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to delete category');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Category deleted');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: any) => {
      toast.error(err.message, { duration: 5000 });
    },
  });

  const columns: ColumnDef<CategoryItem>[] = [
    {
      accessorKey: 'name',
      header: 'Category Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{row.original.name}</div>
            <div className="text-[11px] text-slate-400">ID: {row.original.id}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'deviceCount',
      header: 'Linked Devices',
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
        const cat = row.original;
        const isArchived = cat.status === 'ARCHIVED';

        return (
          <div className="flex items-center gap-2">
            {/* Edit */}
            <button
              type="button"
              onClick={() => {
                setEditingCategory(cat);
                setCategoryName(cat.name);
              }}
              title="Edit category"
              className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>

            {/* Archive / Reactivate Toggle */}
            <button
              type="button"
              onClick={() =>
                updateMutation.mutate({
                  id: cat.id,
                  payload: { status: isArchived ? 'ACTIVE' : 'ARCHIVED' },
                })
              }
              title={isArchived ? 'Reactivate category' : 'Archive category'}
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
                    `Are you sure you want to delete '${cat.name}'? If it has linked devices, deletion will be blocked.`
                  )
                ) {
                  deleteMutation.mutate(cat.id);
                }
              }}
              title="Delete category"
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
    const headers = ['Category ID,Category Name,Status,Linked Devices'];
    const rows = data.map((c) => `"${c.id}","${c.name}","${c.status}",${c.deviceCount}`);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `slims_categories_${new Date().toISOString().slice(0, 10)}.csv`);
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
            Device Categories
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage classification categories for routers, switches, servers, and cables.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCategoryName('');
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data || []}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search categories..."
        filters={filterOptions}
        isLoading={isLoading}
        onExportCsv={handleExport}
        emptyMessage="No categories found."
      />

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCategory(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingCategory) {
                  updateMutation.mutate({
                    id: editingCategory.id,
                    payload: { name: categoryName },
                  });
                } else {
                  createMutation.mutate(categoryName);
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Category Name *</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Wireless Controller"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCategory(null);
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
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

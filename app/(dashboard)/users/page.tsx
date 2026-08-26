'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableFilterOption, BulkActionOption } from '@/components/data-table/data-table';
import { Plus, Upload, UserPlus, Edit, Shield, CheckCircle, XCircle, Wrench, Key } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  username: string | null;
  studentOrEmployeeId: string | null;
  baseRole: 'STUDENT' | 'TEACHER' | 'ADMIN';
  isTechnician: boolean;
  department: string | null;
  contact: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();

  // Filters and Pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    studentOrEmployeeId: '',
    baseRole: 'STUDENT' as 'STUDENT' | 'TEACHER' | 'ADMIN',
    isTechnician: false,
    department: '',
    contact: '',
    password: '',
  });

  // Fetch Users Query
  const { data, isLoading } = useQuery({
    queryKey: ['users', { search, roleFilter, statusFilter, techFilter, page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(techFilter && { isTechnician: techFilter }),
      });
      const res = await fetch(`/api/users?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch users');
      return json;
    },
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to create user');
      return json.data;
    },
    onSuccess: () => {
      toast.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update User Mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to update user');
      return json.data;
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Toggle Technician Mutation
  const toggleTechMutation = useMutation({
    mutationFn: async ({ id, enable }: { id: string; enable: boolean }) => {
      const res = await fetch(`/api/users/${id}/technician-capability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to update capability');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Technician capability updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Bulk Action Mutation
  const bulkActionMutation = useMutation({
    mutationFn: async ({ userIds, action }: { userIds: string[]; action: string }) => {
      const res = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, action }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Bulk action failed');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(`Updated ${data.updatedCount} user(s)`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      username: '',
      studentOrEmployeeId: '',
      baseRole: 'STUDENT',
      isTechnician: false,
      department: '',
      contact: '',
      password: '',
    });
  };

  const handleEditClick = (user: UserItem) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      username: user.username || '',
      studentOrEmployeeId: user.studentOrEmployeeId || '',
      baseRole: user.baseRole,
      isTechnician: user.isTechnician,
      department: user.department || '',
      contact: user.contact || '',
      password: '',
    });
  };

  const columns: ColumnDef<UserItem>[] = [
    {
      accessorKey: 'fullName',
      header: 'User Identity',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div>
            <div className="font-semibold text-slate-900">{u.fullName}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>{u.email}</span>
              {u.username && <span>• @{u.username}</span>}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'studentOrEmployeeId',
      header: 'ID / NIS / NIP',
      cell: ({ row }) => (
        <span className="font-mono text-slate-600">
          {row.original.studentOrEmployeeId || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'baseRole',
      header: 'Base Role',
      cell: ({ row }) => {
        const role = row.original.baseRole;
        const color =
          role === 'ADMIN'
            ? 'bg-purple-100 text-purple-800 border-purple-200'
            : role === 'TEACHER'
            ? 'bg-blue-100 text-blue-800 border-blue-200'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200';
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}
          >
            {role}
          </span>
        );
      },
    },
    {
      accessorKey: 'isTechnician',
      header: 'Technician Cap.',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <button
            type="button"
            onClick={() =>
              toggleTechMutation.mutate({ id: u.id, enable: !u.isTechnician })
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              u.isTechnician
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{u.isTechnician ? 'Enabled' : 'Disabled'}</span>
          </button>
        );
      },
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => (
        <span className="text-slate-600">{row.original.department || '—'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.original.status === 'ACTIVE';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
              active
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                active ? 'bg-emerald-500' : 'bg-slate-400'
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
        const u = row.original;
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleEditClick(u)}
              aria-label={`Edit ${u.fullName}`}
              className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  const filterOptions: DataTableFilterOption[] = [
    {
      key: 'role',
      label: 'Role',
      value: roleFilter,
      onChange: (v) => {
        setRoleFilter(v);
        setPage(1);
      },
      options: [
        { label: 'Admin', value: 'ADMIN' },
        { label: 'Teacher', value: 'TEACHER' },
        { label: 'Student', value: 'STUDENT' },
      ],
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
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Inactive', value: 'INACTIVE' },
      ],
    },
    {
      key: 'tech',
      label: 'Technician',
      value: techFilter,
      onChange: (v) => {
        setTechFilter(v);
        setPage(1);
      },
      options: [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ],
    },
  ];

  const bulkActions: BulkActionOption[] = [
    {
      label: 'Activate Selected',
      action: (ids) => bulkActionMutation.mutate({ userIds: ids, action: 'ACTIVATE' }),
    },
    {
      label: 'Deactivate Selected',
      action: (ids) => bulkActionMutation.mutate({ userIds: ids, action: 'DEACTIVATE' }),
      variant: 'danger',
    },
    {
      label: 'Set as Technician',
      action: (ids) => bulkActionMutation.mutate({ userIds: ids, action: 'SET_TECHNICIAN' }),
    },
    {
      label: 'Remove Technician Cap.',
      action: (ids) => bulkActionMutation.mutate({ userIds: ids, action: 'UNSET_TECHNICIAN' }),
    },
  ];

  const handleExport = () => {
    if (!data?.data?.length) return;
    const headers = ['Full Name,Email,Username,ID,Base Role,Is Technician,Department,Status'];
    const rows = data.data.map(
      (u: UserItem) =>
        `"${u.fullName}","${u.email}","${u.username || ''}","${u.studentOrEmployeeId || ''}","${u.baseRole}","${u.isTechnician}","${u.department || ''}","${u.status}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `slims_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header (DESIGN.md §12) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Administration / Users
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            User Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student, teacher, and administrator accounts and capabilities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/users/import"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import Users</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users DataTable */}
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
        searchPlaceholder="Search by name, email, username, or ID..."
        filters={filterOptions}
        bulkActions={bulkActions}
        isLoading={isLoading}
        onExportCsv={handleExport}
        emptyMessage="No users found matching your filters."
      />

      {/* Add / Edit User Modal */}
      {(isAddModalOpen || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingUser ? 'Edit User Profile' : 'Add New User'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingUser) {
                  updateUserMutation.mutate({
                    id: editingUser.id,
                    payload: formData,
                  });
                } else {
                  createUserMutation.mutate(formData);
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    placeholder="e.g. Ahmad Fauzan"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="user@slims.edu"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Username (optional)</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="e.g. afauzan"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Student/Employee ID</label>
                  <input
                    type="text"
                    value={formData.studentOrEmployeeId}
                    onChange={(e) =>
                      setFormData({ ...formData, studentOrEmployeeId: e.target.value })
                    }
                    placeholder="NIS / NIP"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Base Role *</label>
                  <select
                    value={formData.baseRole}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        baseRole: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Department / Class</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    placeholder="e.g. TKJ / RPL"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Password {editingUser ? '(leave blank to keep)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Technician Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isTechnician}
                    onChange={(e) =>
                      setFormData({ ...formData, isTechnician: e.target.checked })
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">
                      Grant Technician Capability
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Allows this user to verify incidents, manage maintenance records, and perform stock opnames.
                    </div>
                  </div>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-60"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

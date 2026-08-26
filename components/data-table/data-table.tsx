'use client';

import React, { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  RowSelectionState,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  Download,
  CheckSquare,
  Square,
  MinusSquare,
  Loader2,
  FolderOpen,
} from 'lucide-react';

export interface DataTableFilterOption {
  key: string;
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}

export interface BulkActionOption {
  label: string;
  action: (selectedIds: string[]) => void;
  variant?: 'default' | 'danger';
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  totalRows?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  searchValue?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  filters?: DataTableFilterOption[];
  bulkActions?: BulkActionOption[];
  isLoading?: boolean;
  emptyMessage?: string;
  onExportCsv?: () => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  totalRows = data.length,
  page = 1,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters = [],
  bulkActions = [],
  isLoading = false,
  emptyMessage = 'No records found.',
  onExportCsv,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = Object.keys(rowSelection).length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;

  const handleSelectAll = () => {
    if (selectedCount === data.length && data.length > 0) {
      setRowSelection({});
    } else {
      const all: RowSelectionState = {};
      data.forEach((_, idx) => {
        all[idx] = true;
      });
      setRowSelection(all);
    }
  };

  const getSelectedIds = (): string[] => {
    return selectedRows.map((r: any) => r.original.id);
  };

  return (
    <div className="space-y-3.5">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {onSearchChange && (
            <div className="relative min-w-[240px] max-w-sm flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-xs"
              />
            </div>
          )}

          {/* Filters */}
          {filters.map((filter) => (
            <select
              key={filter.key}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              aria-label={filter.label}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
            >
              <option value="">{filter.label}: All</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ))}
        </div>

        {/* Global Export Button */}
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Contextual Bulk Action Bar (DESIGN.md §27, §29) */}
      {selectedCount > 0 && bulkActions.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900">
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            <span>{selectedCount} item(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  action.action(getSelectedIds());
                  setRowSelection({});
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shadow-xs ${
                  action.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                {action.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRowSelection({})}
              className="text-xs text-indigo-700 hover:underline px-1.5"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-slate-50 border-b border-slate-200">
                  {/* Select All Checkbox */}
                  {bulkActions.length > 0 && (
                    <th className="w-10 px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-slate-400 hover:text-slate-700 flex items-center justify-center"
                      >
                        {selectedCount === 0 ? (
                          <Square className="w-4 h-4" />
                        ) : selectedCount === data.length ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <MinusSquare className="w-4 h-4 text-indigo-600" />
                        )}
                      </button>
                    </th>
                  )}
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[11px]"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)}
                    className="py-16 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                      <span>Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      row.getIsSelected() ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    {bulkActions.length > 0 && (
                      <td className="w-10 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.getIsSelected()}
                          onChange={row.getToggleSelectedHandler()}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-slate-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)}
                    className="py-14 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderOpen className="w-8 h-8 text-slate-300 stroke-1" />
                      <p className="text-sm font-medium text-slate-600">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing {data.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(page * pageSize, totalRows)} of {totalRows} records
            </span>
            {onPageSizeChange && (
              <div className="flex items-center gap-1.5 ml-3">
                <span className="text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  aria-label="Rows per page"
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700"
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {onPageChange && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(1)}
                disabled={page <= 1 || isLoading}
                aria-label="First page"
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1 || isLoading}
                aria-label="Previous page"
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || isLoading}
                aria-label="Next page"
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                disabled={page >= totalPages || isLoading}
                aria-label="Last page"
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

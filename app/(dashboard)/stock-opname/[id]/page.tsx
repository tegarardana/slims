'use client';

import React, { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowLeft,
  Server,
  User,
  MapPin,
  RefreshCw,
  Layers,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

type ResultFilter = 'ALL' | 'UNVERIFIED' | 'FOUND' | 'MISSING' | 'WRONG_LOCATION' | 'DAMAGED';

export default function StockOpnameWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.baseRole === 'ADMIN';

  // Filters & State
  const [resultFilter, setResultFilter] = useState<ResultFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [scanInput, setScanInput] = useState('');

  // Wrong Location Modal State
  const [wrongLocModalRecord, setWrongLocModalRecord] = useState<{
    recordId: string;
    assetTag: string;
  } | null>(null);
  const [selectedPhysicalLocation, setSelectedPhysicalLocation] = useState('');

  // Damaged Modal State
  const [damagedModalRecord, setDamagedModalRecord] = useState<{
    recordId: string;
    assetTag: string;
  } | null>(null);
  const [selectedPhysicalCondition, setSelectedPhysicalCondition] = useState<
    'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'CRITICAL'
  >('DAMAGED');

  // Fetch Session Detail
  const { data: opnameSession, isLoading } = useQuery({
    queryKey: ['stock-opname-session', id],
    queryFn: async () => {
      const res = await fetch(`/api/stock-opname/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch opname session');
      return json.data;
    },
  });

  // Fetch Locations for Wrong Location Picker
  const { data: locations } = useQuery({
    queryKey: ['locations-active'],
    queryFn: async () => {
      const res = await fetch('/api/locations?status=ACTIVE');
      const json = await res.json();
      return json.data as Array<{ id: string; name: string }>;
    },
  });

  // Scan / Verify Mutation (BR-019)
  const scanMutation = useMutation({
    mutationFn: async (payload: {
      recordId?: string;
      scannedTagOrQr?: string;
      verificationResult: string;
      physicalLocationId?: string;
      physicalCondition?: string;
    }) => {
      const res = await fetch(`/api/stock-opname/${id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Verification failed');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(
        `Verified ${data.device.assetTag} as ${data.verificationResult.replace('_', ' ')}`
      );
      queryClient.invalidateQueries({ queryKey: ['stock-opname-session', id] });
      setScanInput('');
      setWrongLocModalRecord(null);
      setDamagedModalRecord(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Reconcile Discrepancies Mutation (BR-020)
  const reconcileMutation = useMutation({
    mutationFn: async (recordIds: string[]) => {
      const res = await fetch(`/api/stock-opname/${id}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordIds, action: 'SYNC_ALL_DISCREPANCIES' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Reconciliation failed');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Discrepancies reconciled into core inventory');
      queryClient.invalidateQueries({ queryKey: ['stock-opname-session', id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Complete Session Mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/stock-opname/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to complete session');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Audit session closed');
      queryClient.invalidateQueries({ queryKey: ['stock-opname-session', id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    scanMutation.mutate({
      scannedTagOrQr: scanInput.trim(),
      verificationResult: 'FOUND',
    });
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading stock opname workspace...</p>
      </div>
    );
  }

  if (!opnameSession) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8">
        <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Session Not Found</h3>
        <Link
          href="/stock-opname"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold mt-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sessions</span>
        </Link>
      </div>
    );
  }

  const { metrics, records } = opnameSession;
  const isCompleted = opnameSession.status === 'COMPLETED';

  // Filter records in workspace
  const filteredRecords = records.filter((r: any) => {
    const matchesFilter =
      resultFilter === 'ALL'
        ? true
        : (resultFilter as string) === 'DISCREPANCIES'
        ? r.verificationResult === 'MISSING' ||
          r.verificationResult === 'WRONG_LOCATION' ||
          r.verificationResult === 'DAMAGED'
        : r.verificationResult === resultFilter;

    const matchesSearch =
      !searchTerm ||
      r.device.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.device.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.device.model.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const unreconciledRecordIds = records
    .filter(
      (r: any) =>
        (r.verificationResult === 'MISSING' ||
          r.verificationResult === 'WRONG_LOCATION' ||
          r.verificationResult === 'DAMAGED') &&
        !r.reconciled
    )
    .map((r: any) => r.id);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/stock-opname" className="hover:text-slate-800 transition-colors">
            Stock Opname
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">{opnameSession.sessionName}</span>
        </div>

        <Link
          href="/stock-opname"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sessions</span>
        </Link>
      </div>

      {/* Header & Metric Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                AUDIT SESSION
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  opnameSession.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : opnameSession.status === 'IN_PROGRESS'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {opnameSession.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{opnameSession.sessionName}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned Verifier: {opnameSession.assignedVerifier.fullName} • Started{' '}
              {new Date(opnameSession.startDate).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {!isCompleted && unreconciledRecordIds.length > 0 && isAdmin && (
              <button
                type="button"
                onClick={() => reconcileMutation.mutate(unreconciledRecordIds)}
                disabled={reconcileMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Reconcile {unreconciledRecordIds.length} Discrepancies (BR-020)</span>
              </button>
            )}

            {!isCompleted && isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to finalize and close this audit session?')) {
                    completeMutation.mutate();
                  }
                }}
                disabled={completeMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Close Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Metric Progress Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-400 font-semibold block">Total In Scope</span>
            <span className="text-xl font-bold text-slate-800">{metrics.totalCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
            <span className="text-[11px] text-emerald-700 font-semibold block">Found & Verified</span>
            <span className="text-xl font-bold">{metrics.foundCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900">
            <span className="text-[11px] text-purple-700 font-semibold block">Wrong Location</span>
            <span className="text-xl font-bold">{metrics.wrongLocationCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <span className="text-[11px] text-amber-700 font-semibold block">Damaged</span>
            <span className="text-xl font-bold">{metrics.damagedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">
            <span className="text-[11px] text-red-700 font-semibold block">Missing</span>
            <span className="text-xl font-bold">{metrics.missingCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
            <span className="text-[11px] text-blue-700 font-semibold block">Unverified</span>
            <span className="text-xl font-bold">{metrics.unverifiedCount}</span>
          </div>
        </div>
      </div>

      {/* Rapid Barcode / QR Scanner Box (BR-019) */}
      {!isCompleted && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-3">
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
            <Barcode className="w-4 h-4" />
            <span>Fast QR Code & Barcode Scanner Input</span>
          </div>
          <form onSubmit={handleScanSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan or type Asset Tag / QR identifier (e.g. RTR-001 or SLIMS-SW-001-XYZ)..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder:text-slate-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              type="submit"
              disabled={scanMutation.isPending || !scanInput.trim()}
              className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 font-semibold rounded-xl text-xs shadow-xs transition-colors disabled:opacity-60"
            >
              Verify Tag
            </button>
          </form>
          <p className="text-[11px] text-slate-400">
            Works with USB barcode scanners in keyboard emulation mode or handheld mobile cameras.
          </p>
        </div>
      )}

      {/* Record Items Workspace */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Result Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(
              [
                { id: 'ALL', label: `All (${records.length})` },
                { id: 'UNVERIFIED', label: `Unverified (${metrics.unverifiedCount})` },
                { id: 'FOUND', label: `Found (${metrics.foundCount})` },
                { id: 'WRONG_LOCATION', label: `Wrong Location (${metrics.wrongLocationCount})` },
                { id: 'DAMAGED', label: `Damaged (${metrics.damagedCount})` },
                { id: 'MISSING', label: `Missing (${metrics.missingCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setResultFilter(tab.id as ResultFilter)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  resultFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Audit Records Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="px-4 py-3">Asset Tag</th>
                <th className="px-4 py-3">Equipment</th>
                <th className="px-4 py-3">System Placement</th>
                <th className="px-4 py-3">Audit Outcome</th>
                <th className="px-4 py-3">Reconciled</th>
                {!isCompleted && <th className="px-4 py-3 text-right">Instant Verify</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r: any) => {
                const res = r.verificationResult;
                let color = 'bg-slate-100 text-slate-600';
                if (res === 'FOUND') color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (res === 'WRONG_LOCATION') color = 'bg-purple-50 text-purple-700 border-purple-200';
                if (res === 'DAMAGED') color = 'bg-amber-50 text-amber-700 border-amber-200';
                if (res === 'MISSING') color = 'bg-red-50 text-red-700 border-red-200';

                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                      <Link href={`/inventory/${r.device.id}`} className="hover:underline">
                        {r.device.assetTag}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {r.device.brand} {r.device.model}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.device.location?.name} ({r.device.category?.name})
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
                        {res.replace('_', ' ')}
                      </span>
                      {r.physicalLocation && (
                        <div className="text-[10px] text-purple-700 font-medium mt-0.5">
                          Found in: {r.physicalLocation.name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.reconciled ? (
                        <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Reconciled</span>
                        </span>
                      ) : res !== 'UNVERIFIED' && res !== 'FOUND' ? (
                        <span className="text-amber-600 font-semibold text-[11px]">
                          Pending Reconcile
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Instant Verification Action Buttons */}
                    {!isCompleted && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Mark Found"
                            onClick={() =>
                              scanMutation.mutate({
                                recordId: r.id,
                                verificationResult: 'FOUND',
                              })
                            }
                            className={`p-1.5 rounded-md border text-xs font-semibold transition-colors ${
                              res === 'FOUND'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200'
                            }`}
                          >
                            ✓ Found
                          </button>

                          <button
                            type="button"
                            title="Mark Wrong Location"
                            onClick={() => {
                              setWrongLocModalRecord({
                                recordId: r.id,
                                assetTag: r.device.assetTag,
                              });
                              setSelectedPhysicalLocation(locations?.[0]?.id || '');
                            }}
                            className={`p-1.5 rounded-md border text-xs font-semibold transition-colors ${
                              res === 'WRONG_LOCATION'
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white hover:bg-purple-50 text-purple-700 border-slate-200'
                            }`}
                          >
                            Wrong Loc
                          </button>

                          <button
                            type="button"
                            title="Mark Damaged"
                            onClick={() => {
                              setDamagedModalRecord({
                                recordId: r.id,
                                assetTag: r.device.assetTag,
                              });
                            }}
                            className={`p-1.5 rounded-md border text-xs font-semibold transition-colors ${
                              res === 'DAMAGED'
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-white hover:bg-amber-50 text-amber-700 border-slate-200'
                            }`}
                          >
                            Damaged
                          </button>

                          <button
                            type="button"
                            title="Mark Missing"
                            onClick={() =>
                              scanMutation.mutate({
                                recordId: r.id,
                                verificationResult: 'MISSING',
                              })
                            }
                            className={`p-1.5 rounded-md border text-xs font-semibold transition-colors ${
                              res === 'MISSING'
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white hover:bg-red-50 text-red-700 border-slate-200'
                            }`}
                          >
                            Missing
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wrong Location Modal */}
      {wrongLocModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-base">
              Wrong Location — {wrongLocModalRecord.assetTag}
            </h3>
            <p className="text-xs text-slate-500">
              Select the physical room / lab where this device was actually discovered:
            </p>
            <select
              value={selectedPhysicalLocation}
              onChange={(e) => setSelectedPhysicalLocation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-medium"
            >
              {locations?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWrongLocModalRecord(null)}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  scanMutation.mutate({
                    recordId: wrongLocModalRecord.recordId,
                    verificationResult: 'WRONG_LOCATION',
                    physicalLocationId: selectedPhysicalLocation,
                  })
                }
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Save Location Discrepancy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Damaged Modal */}
      {damagedModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-base">
              Damaged Equipment — {damagedModalRecord.assetTag}
            </h3>
            <p className="text-xs text-slate-500">
              Select the observed physical condition state:
            </p>
            <select
              value={selectedPhysicalCondition}
              onChange={(e) => setSelectedPhysicalCondition(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-medium"
            >
              <option value="FAIR">Fair (Minor defect)</option>
              <option value="DAMAGED">Damaged (Broken ports/power)</option>
              <option value="CRITICAL">Critical (Non-functioning)</option>
            </select>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDamagedModalRecord(null)}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  scanMutation.mutate({
                    recordId: damagedModalRecord.recordId,
                    verificationResult: 'DAMAGED',
                    physicalCondition: selectedPhysicalCondition,
                  })
                }
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Save Condition Discrepancy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

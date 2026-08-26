'use client';

import React, { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Server,
  User,
  ShieldCheck,
  Calendar,
  Layers,
  MapPin,
  FileText,
  DollarSign,
  AlertTriangle,
  Loader2,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export default function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.baseRole === 'ADMIN';
  const isTechnician = Boolean(user?.isTechnician);

  // Complete Modal State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeData, setCompleteData] = useState<{
    diagnosis: string;
    actionTaken: string;
    partsReplaced: string;
    cost: number;
    notes: string;
    result: string;
    deviceNewCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'CRITICAL';
  }>({
    diagnosis: '',
    actionTaken: '',
    partsReplaced: '',
    cost: 0,
    notes: '',
    result: 'REPAIRED_SUCCESSFULLY',
    deviceNewCondition: 'GOOD',
  });

  // Fetch Maintenance Detail
  const { data: maintenance, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: async () => {
      const res = await fetch(`/api/maintenances/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch maintenance');
      return json.data;
    },
  });

  // Complete Maintenance Mutation (BR-014)
  const completeMutation = useMutation({
    mutationFn: async (payload: typeof completeData) => {
      const res = await fetch(`/api/maintenances/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          cost: payload.cost > 0 ? Number(payload.cost) : null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to complete maintenance');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Maintenance completed successfully');
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      setIsCompleteModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Start Job Mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/maintenances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to start job');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Maintenance status updated to In Progress');
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading maintenance ticket...</p>
      </div>
    );
  }

  if (!maintenance) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8">
        <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Maintenance Job Not Found</h3>
        <Link
          href="/maintenance"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold mt-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Maintenance</span>
        </Link>
      </div>
    );
  }

  const isCompleted = maintenance.status === 'COMPLETED';

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/maintenance" className="hover:text-slate-800 transition-colors">
            Maintenance
          </Link>
          <span>/</span>
          <span className="font-mono font-semibold text-slate-800">
            MAINT-{maintenance.id.slice(-6).toUpperCase()}
          </span>
        </div>

        <Link
          href="/maintenance"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Maintenance</span>
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                MAINT-{maintenance.id.slice(-6).toUpperCase()}
              </span>
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Type: {maintenance.maintenanceType}
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${
                  maintenance.status === 'OPEN'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : maintenance.status === 'IN_PROGRESS'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : maintenance.status === 'WAITING_PARTS'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : maintenance.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {maintenance.status.replace('_', ' ')}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {maintenance.problem}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Started: {new Date(maintenance.startDate).toLocaleDateString()}
                  {maintenance.completionDate && ` • Completed: ${new Date(maintenance.completionDate).toLocaleDateString()}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Technician: {maintenance.technician?.fullName || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          {/* Contextual Action Buttons */}
          <div className="flex items-center gap-2.5">
            {maintenance.status === 'OPEN' && (isAdmin || isTechnician) && (
              <button
                type="button"
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Clock className="w-4 h-4" />
                <span>Start Service (In Progress)</span>
              </button>
            )}

            {!isCompleted && (isAdmin || isTechnician) && (
              <button
                type="button"
                onClick={() => {
                  setCompleteData({
                    diagnosis: maintenance.diagnosis || '',
                    actionTaken: maintenance.actionTaken || '',
                    partsReplaced: maintenance.partsReplaced || '',
                    cost: maintenance.cost ? Number(maintenance.cost) : 0,
                    notes: maintenance.notes || '',
                    result: maintenance.result || 'REPAIRED_SUCCESSFULLY',
                    deviceNewCondition: 'GOOD',
                  });
                  setIsCompleteModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Maintenance Job</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Device Specs + Job Work Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Target Hardware</h3>
            <Link
              href={`/inventory/${maintenance.device.id}`}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View Device Inventory →
            </Link>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="font-mono font-bold text-base text-slate-900">
                {maintenance.device.assetTag}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                {maintenance.device.brand} {maintenance.device.model}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Category: {maintenance.device.category?.name} • Location: {maintenance.device.location?.name}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Status</span>
              <span className="font-semibold text-slate-800">{maintenance.device.status}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Current Condition</span>
              <span className="font-semibold text-slate-800">{maintenance.device.condition}</span>
            </div>
          </div>
        </div>

        {/* Linked Incident Card (if any) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
            Source / Triggering Incident
          </h3>

          {maintenance.relatedIncident ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-red-600">
                  INC-{maintenance.relatedIncident.id.slice(-6).toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                  {maintenance.relatedIncident.severity}
                </span>
              </div>
              <p className="text-slate-700">{maintenance.relatedIncident.description}</p>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                Completing this maintenance ticket will automatically resolve the source incident report (BR-014).
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              Direct / Routine Maintenance (No linked incident).
            </div>
          )}
        </div>
      </div>

      {/* Repair & Work Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
          Service Diagnostic & Work Summary
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div>
            <span className="text-slate-400 block mb-1 font-semibold">Diagnosis</span>
            <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 min-h-[60px]">
              {maintenance.diagnosis || 'Diagnosis pending or in progress...'}
            </p>
          </div>

          <div>
            <span className="text-slate-400 block mb-1 font-semibold">Action Taken / Solution</span>
            <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 min-h-[60px]">
              {maintenance.actionTaken || 'No repair action logged yet.'}
            </p>
          </div>

          <div>
            <span className="text-slate-400 block mb-1 font-semibold">Spare Parts Replaced</span>
            <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {maintenance.partsReplaced || 'None'}
            </p>
          </div>

          <div>
            <span className="text-slate-400 block mb-1 font-semibold">Cost / Expense</span>
            <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono font-semibold">
              {maintenance.cost ? `Rp ${Number(maintenance.cost).toLocaleString('id-ID')}` : 'Rp 0 (Internal Labor)'}
            </p>
          </div>
        </div>
      </div>

      {/* Complete Maintenance Modal (BR-014) */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Complete Service — {maintenance.device.assetTag}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Log actions, parts replaced, and update final condition grade (BR-014).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                completeMutation.mutate(completeData);
              }}
              className="p-6 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar"
            >
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Diagnosis Findings</label>
                <input
                  type="text"
                  value={completeData.diagnosis}
                  onChange={(e) => setCompleteData({ ...completeData, diagnosis: e.target.value })}
                  placeholder="e.g. IC Power Switch rusak akibat lonjakan tegangan"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Action Taken / Repair Solution *</label>
                <textarea
                  rows={2}
                  required
                  value={completeData.actionTaken}
                  onChange={(e) => setCompleteData({ ...completeData, actionTaken: e.target.value })}
                  placeholder="e.g. Solder ulang IC regulator dan ganti sekering 2A, running test 2 jam normal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Parts Replaced</label>
                  <input
                    type="text"
                    value={completeData.partsReplaced}
                    onChange={(e) => setCompleteData({ ...completeData, partsReplaced: e.target.value })}
                    placeholder="e.g. Fuse 2A, Cap 100uF"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Cost (IDR)</label>
                  <input
                    type="number"
                    value={completeData.cost || ''}
                    onChange={(e) => setCompleteData({ ...completeData, cost: parseInt(e.target.value, 10) || 0 })}
                    placeholder="e.g. 150000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="font-semibold text-slate-700">Final Post-Service Device Condition *</label>
                <select
                  value={completeData.deviceNewCondition}
                  onChange={(e) =>
                    setCompleteData({
                      ...completeData,
                      deviceNewCondition: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="EXCELLENT">Excellent (Normal / Like New) → Restores to Available</option>
                  <option value="GOOD">Good (Functional normal) → Restores to Available</option>
                  <option value="FAIR">Fair (Functioning with minor defect) → Restores to Available</option>
                  <option value="DAMAGED">Damaged (Unresolved repair) → Remains Under Maintenance</option>
                  <option value="CRITICAL">Critical (Non-repairable) → Remains Under Maintenance</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completeMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-60"
                >
                  Confirm Completion & Restore Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

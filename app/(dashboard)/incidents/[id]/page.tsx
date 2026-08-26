'use client';

import React, { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Server,
  User,
  ShieldCheck,
  Wrench,
  History,
  Loader2,
  Calendar,
  Layers,
  MapPin,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export default function IncidentDetailPage({
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

  // Modals state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verificationOutcome, setVerificationOutcome] = useState<
    | 'NO_ISSUE_FOUND'
    | 'MINOR_ISSUE'
    | 'MAJOR_ISSUE'
    | 'MAINTENANCE_REQUIRED'
    | 'REPLACEMENT_REQUIRED'
    | 'RETIREMENT_RECOMMENDED'
  >('MAINTENANCE_REQUIRED');
  const [verificationNotes, setVerificationNotes] = useState('');

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Fetch Incident Detail
  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: async () => {
      const res = await fetch(`/api/incidents/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch incident');
      return json.data;
    },
  });

  // Verify Incident Mutation (BR-011)
  const verifyMutation = useMutation({
    mutationFn: async (payload: { verificationOutcome: string; notes: string }) => {
      const res = await fetch(`/api/incidents/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Verification failed');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Incident verified');
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      setIsVerifyModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Resolve Incident Mutation (BR-012)
  const resolveMutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await fetch(`/api/incidents/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Resolution failed');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Incident marked as resolved');
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      setIsResolveModalOpen(false);
      setResolutionNotes('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading incident report...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8">
        <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Incident Not Found</h3>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold mt-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Incidents</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/incidents" className="hover:text-slate-800 transition-colors">
            Incidents
          </Link>
          <span>/</span>
          <span className="font-mono font-semibold text-slate-800">
            INC-{incident.id.slice(-6).toUpperCase()}
          </span>
        </div>

        <Link
          href="/incidents"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Incidents</span>
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-100">
                INC-{incident.id.slice(-6).toUpperCase()}
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${
                  incident.severity === 'CRITICAL'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : incident.severity === 'HIGH'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : incident.severity === 'MEDIUM'
                    ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                Severity: {incident.severity}
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${
                  incident.status === 'REPORTED'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : incident.status === 'VERIFIED'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : incident.status === 'IN_PROGRESS'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {incident.status.replace('_', ' ')}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {incident.description}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Reported on {new Date(incident.reportDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Reporter: {incident.reporter.fullName}</span>
              </div>
            </div>
          </div>

          {/* Contextual Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Step 1: REPORTED or UNDER_REVIEW -> Technician Verifies (BR-011) */}
            {(incident.status === 'REPORTED' || incident.status === 'UNDER_REVIEW') &&
              (isAdmin || isTechnician) && (
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Verify Hardware Issue</span>
                </button>
              )}

            {/* Step 2: VERIFIED or IN_PROGRESS -> Resolve (BR-012) */}
            {incident.status !== 'RESOLVED' && (isAdmin || isTechnician) && (
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Resolved</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Affected Device + Verification Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Information Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Affected Equipment</h3>
            <Link
              href={`/inventory/${incident.device.id}`}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View Device →
            </Link>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="font-mono font-bold text-base text-slate-900">
                {incident.device.assetTag}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                {incident.device.brand} {incident.device.model}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Category: {incident.device.category?.name} • Location: {incident.device.location?.name}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Current Status</span>
              <span className="font-semibold text-slate-800">{incident.device.status}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Condition Grade</span>
              <span className="font-semibold text-slate-800">{incident.device.condition}</span>
            </div>
          </div>
        </div>

        {/* Verification & Outcome Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
            Technician Verification
          </h3>

          {incident.verifiedBy ? (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Verified By</span>
                <span className="font-semibold text-slate-800">
                  {incident.verifiedBy.fullName} on{' '}
                  {new Date(incident.verifiedAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Inspection Outcome</span>
                <span className="inline-flex px-2.5 py-1 rounded-md font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {incident.verificationOutcome?.replace('_', ' ')}
                </span>
              </div>
              {incident.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Notes</span>
                  <p className="text-slate-700 whitespace-pre-line">{incident.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              Pending verification by lab technician or administrator.
            </div>
          )}
        </div>
      </div>

      {/* Linked Maintenance Records */}
      {incident.maintenances?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Linked Maintenance Records ({incident.maintenances.length})
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Technician</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incident.maintenances.map((m: any) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(m.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{m.maintenanceType}</td>
                    <td className="px-4 py-3 font-semibold">{m.technician?.fullName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verification Modal (BR-011) */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-base">Verify Incident & Inspect</h3>
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyMutation.mutate({
                  verificationOutcome,
                  notes: verificationNotes,
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Verification Outcome *</label>
                <select
                  value={verificationOutcome}
                  onChange={(e) => setVerificationOutcome(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-medium"
                >
                  <option value="MAINTENANCE_REQUIRED">
                    Maintenance Required (Moves device to Under Maintenance)
                  </option>
                  <option value="MINOR_ISSUE">Minor Issue (Resolved on spot)</option>
                  <option value="MAJOR_ISSUE">Major Issue</option>
                  <option value="NO_ISSUE_FOUND">No Issue Found (False alarm)</option>
                  <option value="REPLACEMENT_REQUIRED">Replacement Required</option>
                  <option value="RETIREMENT_RECOMMENDED">Retirement Recommended</option>
                </select>
              </div>

              {(verificationOutcome === 'MAINTENANCE_REQUIRED' ||
                verificationOutcome === 'REPLACEMENT_REQUIRED') && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px]">
                  ⚠️ Note: Selecting this outcome will automatically set device status to{' '}
                  <strong>UNDER_MAINTENANCE</strong> (BR-011).
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Technician Diagnostic Notes</label>
                <textarea
                  rows={3}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="e.g. Diuji dengan tester LAN, port 3 short-circuit, perlu penggantian IC PHY"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-60"
                >
                  Confirm Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal (BR-012) */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-base">Resolve Incident</h3>
            <p className="text-xs text-slate-500">
              Provide resolution notes before closing this incident:
            </p>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Sudah diperbaiki dan diuji normal."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resolveMutation.isPending}
                onClick={() => resolveMutation.mutate(resolutionNotes)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-60"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

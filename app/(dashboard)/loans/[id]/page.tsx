'use client';

import React, { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Server,
  User,
  ShieldCheck,
  Send,
  RotateCcw,
  History,
  Loader2,
  Calendar,
  Layers,
  MapPin,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export default function LoanDetailPage({
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
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [returnModalItem, setReturnModalItem] = useState<{
    id: string;
    assetTag: string;
  } | null>(null);
  const [returnCondition, setReturnCondition] = useState<
    'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'CRITICAL'
  >('GOOD');
  const [returnNotes, setReturnNotes] = useState('');

  // Fetch Loan Detail
  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan', id],
    queryFn: async () => {
      const res = await fetch(`/api/loans/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch loan');
      return json.data;
    },
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/loans/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Approval failed');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Loan request approved');
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/loans/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Rejection failed');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Loan request rejected');
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
      setIsRejectModalOpen(false);
      setRejectionReason('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Handover Mutation (BR-006)
  const handoverMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/loans/${id}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Handover failed');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Equipment handed over');
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Return Mutation (BR-007, BR-008)
  const returnMutation = useMutation({
    mutationFn: async (payload: { loanItemId: string; returnCondition: string; returnNotes: string }) => {
      const res = await fetch(`/api/loans/${id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Return failed');
      return json.data;
    },
    onSuccess: (data) => {
      toast.success('Item return processed successfully');
      queryClient.invalidateQueries({ queryKey: ['loan', id] });
      setReturnModalItem(null);
      setReturnNotes('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading loan details...</p>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8">
        <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Loan Request Not Found</h3>
        <Link
          href="/loans"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold mt-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Loans</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/loans" className="hover:text-slate-800 transition-colors">
            Loans
          </Link>
          <span>/</span>
          <span className="font-mono font-semibold text-slate-800">
            {loan.id.slice(-8).toUpperCase()}
          </span>
        </div>

        <Link
          href="/loans"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Loans</span>
        </Link>
      </div>

      {/* Overdue Warning Banner (BR-009) */}
      {loan.isOverdue && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-xs">Loan is Overdue (Exceeded Expected Return Date)</div>
            <div className="text-[11px] text-red-700 mt-0.5">
              This loan was expected back on {new Date(loan.expectedReturnDate).toLocaleDateString()}. Please contact the borrower ({loan.requester.fullName}) immediately for return inspection.
            </div>
          </div>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                LOAN #{loan.id.slice(-8).toUpperCase()}
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${
                  loan.status === 'PENDING_APPROVAL'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : loan.status === 'APPROVED'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : loan.status === 'ACTIVE'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : loan.status === 'PARTIALLY_RETURNED'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : loan.status === 'RETURNED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {loan.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{loan.purpose}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {new Date(loan.startDate).toLocaleDateString()} →{' '}
                  {new Date(loan.expectedReturnDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Borrower: {loan.requester.fullName} ({loan.requester.department || loan.requester.email})</span>
              </div>
            </div>
          </div>

          {/* Contextual Action Bar */}
          <div className="flex items-center gap-2.5">
            {/* Step 1: PENDING_APPROVAL -> Approve or Reject */}
            {loan.status === 'PENDING_APPROVAL' && (isAdmin || user.canApproveLoans) && (
              <>
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(true)}
                  className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve Loan</span>
                </button>
              </>
            )}

            {/* Step 2: APPROVED -> Handover Equipment (BR-006) */}
            {loan.status === 'APPROVED' && (isAdmin || isTechnician) && (
              <button
                type="button"
                onClick={() => handoverMutation.mutate()}
                disabled={handoverMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                <span>Confirm Handover to Borrower</span>
              </button>
            )}

            {/* Step 3: ACTIVE or PARTIALLY_RETURNED -> Prompt return */}
            {(loan.status === 'ACTIVE' || loan.status === 'PARTIALLY_RETURNED') && (isAdmin || isTechnician) && (
              <div className="text-xs text-slate-500 font-medium">
                Equipment is currently with borrower. Process returns per item below.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Equipment Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Borrowed Equipment Items ({loan.items?.length})</h3>
            <p className="text-xs text-slate-500">
              Each device is tracked independently for partial return workflows (BR-008).
            </p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="px-4 py-3">Asset Tag</th>
                <th className="px-4 py-3">Equipment</th>
                <th className="px-4 py-3">Category & Location</th>
                <th className="px-4 py-3">Item Status</th>
                <th className="px-4 py-3">Return Details</th>
                {(loan.status === 'ACTIVE' || loan.status === 'PARTIALLY_RETURNED') && (isAdmin || isTechnician) && (
                  <th className="px-4 py-3 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loan.items?.map((item: any) => {
                const isReturned = item.itemStatus === 'RETURNED';
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                      <Link href={`/inventory/${item.device.id}`} className="hover:underline">
                        {item.device.assetTag}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {item.device.brand} {item.device.model}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.device.category?.name} • {item.device.location?.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isReturned
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {item.itemStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {isReturned ? (
                        <div>
                          <span className="font-semibold">Condition: {item.returnCondition}</span>
                          {item.returnNotes && (
                            <div className="text-[11px] text-slate-400">Notes: {item.returnNotes}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">— In Use</span>
                      )}
                    </td>
                    {(loan.status === 'ACTIVE' || loan.status === 'PARTIALLY_RETURNED') && (isAdmin || isTechnician) && (
                      <td className="px-4 py-3 text-right">
                        {!isReturned ? (
                          <button
                            type="button"
                            onClick={() =>
                              setReturnModalItem({
                                id: item.id,
                                assetTag: item.device.assetTag,
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Process Return</span>
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-xs flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Returned</span>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-base">Reject Loan Request</h3>
            <p className="text-xs text-slate-500">
              Please provide a clear reason for rejecting this equipment loan request:
            </p>
            <textarea
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Requested devices are scheduled for maintenance or exams"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate(rejectionReason)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-60"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Inspection Modal (BR-007, BR-008) */}
      {returnModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-base">
                Return Inspection — {returnModalItem.assetTag}
              </h3>
              <button
                type="button"
                onClick={() => setReturnModalItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                returnMutation.mutate({
                  loanItemId: returnModalItem.id,
                  returnCondition,
                  returnNotes,
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Physical Return Condition *</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-medium"
                >
                  <option value="EXCELLENT">Excellent (Normal / Like New)</option>
                  <option value="GOOD">Good (Normal minor wear)</option>
                  <option value="FAIR">Fair (Functioning with cosmetic issues)</option>
                  <option value="DAMAGED">Damaged (Requires Repair / Maintenance)</option>
                  <option value="CRITICAL">Critical (Non-functioning)</option>
                </select>
              </div>

              {(returnCondition === 'DAMAGED' || returnCondition === 'CRITICAL') && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px]">
                  ⚠️ Note: Marking condition as <strong>{returnCondition}</strong> will automatically route this device to <strong>UNDER_MAINTENANCE</strong> status.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Inspection Notes</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g. Checked with console cable, all ports functional"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturnModalItem(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-60"
                >
                  Confirm Item Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

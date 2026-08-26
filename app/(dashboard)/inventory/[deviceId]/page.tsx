'use client';

import React, { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Server,
  QrCode,
  Layers,
  MapPin,
  Calendar,
  ShieldCheck,
  Download,
  Printer,
  Edit,
  AlertTriangle,
  Wrench,
  BookmarkCheck,
  History,
  FileText,
  Clock,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

type Tab = 'OVERVIEW' | 'LOANS' | 'INCIDENTS' | 'MAINTENANCE' | 'ACTIVITY';

export default function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = use(params);
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.baseRole === 'ADMIN';
  const isTechnician = Boolean(user?.isTechnician);

  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newCondition, setNewCondition] = useState('');

  // Fetch Device Detail
  const { data: device, isLoading } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      const res = await fetch(`/api/devices/${deviceId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch device');
      return json.data;
    },
  });

  // Fetch QR Code Image
  const { data: qrData } = useQuery({
    queryKey: ['device-qr', deviceId],
    queryFn: async () => {
      const res = await fetch(`/api/devices/${deviceId}/qrcode`);
      const json = await res.json();
      if (!json.success) throw new Error('Failed to generate QR');
      return json.data;
    },
  });

  // Update Status / Condition Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (payload: { status?: string; condition?: string }) => {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to update device');
      return json.data;
    },
    onSuccess: () => {
      toast.success('Device status updated');
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      setIsStatusModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message, { duration: 5000 }),
  });

  const handlePrintQR = () => {
    if (!qrData?.qrDataUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code — ${device?.assetTag}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 90vh; text-align: center; }
            img { width: 260px; height: 260px; }
            .tag { font-size: 24px; font-weight: bold; margin-top: 12px; }
            .info { font-size: 14px; color: #475569; margin-top: 4px; }
          </style>
        </head>
        <body>
          <img src="${qrData.qrDataUrl}" alt="QR Code" />
          <div class="tag">${device?.assetTag}</div>
          <div class="info">${device?.brand} ${device?.model}</div>
          <div class="info">Location: ${device?.location?.name}</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadQR = () => {
    if (!qrData?.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrData.qrDataUrl;
    link.download = `QR_${device?.assetTag}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading device details...</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8">
        <Server className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Device Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          The requested device does not exist or has been removed.
        </p>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Inventory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/inventory" className="hover:text-slate-800 transition-colors">
            Inventory
          </Link>
          <span>/</span>
          <span>Devices</span>
          <span>/</span>
          <span className="font-mono font-semibold text-slate-800">{device.assetTag}</span>
        </div>

        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Inventory</span>
        </Link>
      </div>

      {/* Header Card (DESIGN.md §31) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Server className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {device.assetTag}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    device.status === 'AVAILABLE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : device.status === 'BORROWED'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : device.status === 'UNDER_MAINTENANCE'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {device.status.replace('_', ' ')}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Condition: {device.condition}
                </span>
                {device.isAvailableForLoan && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-600 text-white">
                    Available for Loan
                  </span>
                )}
              </div>
              <p className="text-base font-semibold text-slate-700">
                {device.brand} {device.model}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Type: {device.deviceType} • Category: {device.category?.name} • Location: {device.location?.name}
              </p>
            </div>
          </div>

          {/* Contextual Action Buttons */}
          <div className="flex items-center gap-2.5">
            {(isAdmin || isTechnician) && (
              <button
                type="button"
                onClick={() => {
                  setNewStatus(device.status);
                  setNewCondition(device.condition);
                  setIsStatusModalOpen(true);
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Change Status / Condition
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintQR}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print QR Label</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: QR Card + Quick Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Code Identification Card (DESIGN.md §32) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col items-center justify-between text-center space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              QR Code Identification
            </div>
            <div className="font-mono text-xs text-slate-500 mt-0.5">
              {device.qrCodeValue}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-xs">
            {qrData?.qrDataUrl ? (
              <img
                src={qrData.qrDataUrl}
                alt="Device QR Code"
                className="w-44 h-44 object-contain rounded-lg"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
          </div>

          <div className="w-full flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleDownloadQR}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
          </div>
        </div>

        {/* Specifications & Placement Cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
              Hardware Specifications & Placement
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Serial Number</span>
                <span className="font-mono font-semibold text-slate-800">
                  {device.serialNumber || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Category</span>
                <span className="font-semibold text-slate-800">{device.category?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Current Location</span>
                <span className="font-semibold text-slate-800">{device.location?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Year Acquired</span>
                <span className="font-semibold text-slate-800">{device.yearAcquired || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Warranty Info</span>
                <span className="font-semibold text-slate-800">{device.warrantyInfo || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Current Custodian</span>
                <span className="font-semibold text-slate-800">
                  {device.currentCustodian?.fullName || 'None (In Lab/Storage)'}
                </span>
              </div>
            </div>
            {device.description && (
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 block mb-0.5">Description</span>
                <p className="text-slate-700">{device.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Tabs Section (PRD §6.5, DESIGN.md §31) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: 'Overview', icon: FileText },
            { id: 'LOANS', label: `Loan History (${device.loanItems?.length || 0})`, icon: BookmarkCheck },
            { id: 'INCIDENTS', label: `Incidents (${device.incidents?.length || 0})`, icon: AlertTriangle },
            { id: 'MAINTENANCE', label: `Maintenance (${device.maintenances?.length || 0})`, icon: Wrench },
            { id: 'ACTIVITY', label: `Activity Logs (${device.auditLogs?.length || 0})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* 1. OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800">Lifecycle Summary</h4>
                  <p className="text-slate-600">
                    Device ID: <span className="font-mono">{device.id}</span>
                  </p>
                  <p className="text-slate-600">
                    Registered On: {new Date(device.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-slate-600">
                    Last Updated: {new Date(device.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800">Availability Calculation</h4>
                  <p className="text-slate-600">
                    Calculated Status:{' '}
                    <span className="font-semibold text-indigo-700">
                      {device.isAvailableForLoan ? 'Available for borrowing' : 'Reserved / Unavailable'}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Availability is derived dynamically from hardware state, maintenance status, and active loans (PRD §1.3).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. LOANS */}
          {activeTab === 'LOANS' && (
            <div className="space-y-3">
              {device.loanItems?.length ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Loan ID</th>
                        <th className="px-4 py-3">Borrower</th>
                        <th className="px-4 py-3">Loan Period</th>
                        <th className="px-4 py-3">Item Status</th>
                        <th className="px-4 py-3">Return Condition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {device.loanItems.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-semibold text-indigo-600">
                            {item.loanRequest?.id}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {item.loanRequest?.requester?.fullName}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(item.loanRequest?.startDate).toLocaleDateString()} —{' '}
                            {new Date(item.loanRequest?.expectedReturnDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100">
                              {item.itemStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {item.returnCondition || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No loan history recorded for this device.
                </div>
              )}
            </div>
          )}

          {/* 3. INCIDENTS */}
          {activeTab === 'INCIDENTS' && (
            <div className="space-y-3">
              {device.incidents?.length ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Report Date</th>
                        <th className="px-4 py-3">Reporter</th>
                        <th className="px-4 py-3">Severity</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Technician Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {device.incidents.map((inc: any) => (
                        <tr key={inc.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(inc.reportDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 font-medium">{inc.reporter?.fullName}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                              {inc.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold">{inc.status}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {inc.verificationOutcome?.replace('_', ' ') || 'Pending Verification'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No incident reports filed for this device.
                </div>
              )}
            </div>
          )}

          {/* 4. MAINTENANCE */}
          {activeTab === 'MAINTENANCE' && (
            <div className="space-y-3">
              {device.maintenances?.length ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Start Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Problem</th>
                        <th className="px-4 py-3">Technician</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {device.maintenances.map((m: any) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(m.startDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 font-medium">{m.maintenanceType}</td>
                          <td className="px-4 py-3 text-slate-700">{m.problem}</td>
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
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No maintenance records for this device.
                </div>
              )}
            </div>
          )}

          {/* 5. ACTIVITY LOGS */}
          {activeTab === 'ACTIVITY' && (
            <div className="space-y-3">
              {device.auditLogs?.length ? (
                <div className="space-y-2 text-xs">
                  {device.auditLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px]">
                            {log.action}
                          </span>
                          <span>by {log.actor?.fullName || 'System'}</span>
                        </div>
                        {log.newValue && (
                          <pre className="text-[11px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto max-w-xl">
                            {JSON.stringify(log.newValue, null, 2)}
                          </pre>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No activity logs recorded yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Status / Condition Update Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-base">
                Update Status & Condition
              </h3>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateStatusMutation.mutate({
                  status: newStatus,
                  condition: newCondition,
                });
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Operational Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  <option value="LOST">Lost</option>
                  <option value="RETIRED">Retired</option>
                  <option value="DISPOSED">Disposed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Physical Condition</label>
                <select
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-60"
                >
                  Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

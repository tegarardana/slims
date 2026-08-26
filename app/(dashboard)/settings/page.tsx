'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Building,
  BookmarkCheck,
  ShieldCheck,
  Save,
  Database,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.baseRole === 'ADMIN';

  const [formData, setFormData] = useState({
    institutionName: '',
    labName: '',
    defaultLoanDurationDays: 3,
    maxDevicesPerLoan: 5,
    overdueWarningDays: 1,
    allowSelfIncidentReporting: true,
    requireApprovalForTeachers: false,
    autoArchiveCompletedAudits: false,
  });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (!json.success) throw new Error('Failed to load settings');
      return json.data;
    },
  });

  useEffect(() => {
    if (settingsData) {
      setFormData(settingsData);
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Failed to save settings');
      return json.data;
    },
    onSuccess: () => {
      toast.success('System configuration saved successfully');
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleExportBackup = async () => {
    try {
      toast.info('Generating complete system snapshot...');
      const [devicesRes, loansRes, incidentsRes, categoriesRes, locationsRes] = await Promise.all([
        fetch('/api/devices?pageSize=1000').then((r) => r.json()),
        fetch('/api/loans?pageSize=1000').then((r) => r.json()),
        fetch('/api/incidents?pageSize=1000').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/locations').then((r) => r.json()),
      ]);

      const backupData = {
        exportedAt: new Date().toISOString(),
        system: 'SLIMS (Smart Lab Inventory Management System)',
        version: '1.0.0',
        categories: categoriesRes.data || [],
        locations: locationsRes.data || [],
        devices: devicesRes.data || [],
        loans: loansRes.data || [],
        incidents: incidentsRes.data || [],
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `slims_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success('System database snapshot downloaded successfully');
    } catch (err: any) {
      toast.error('Failed to generate snapshot: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading system preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            System Administration
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Settings & Global Preferences
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure institution parameters, borrowing thresholds, and export backup snapshots.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isAdmin) saveMutation.mutate(formData);
        }}
        className="space-y-6"
      >
        {/* Section 1: Institution & Lab Identity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Institution & Lab Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 sm:col-span-2">
              <label className="font-semibold text-slate-700">Institution / School Name</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.institutionName}
                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:opacity-70"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-semibold text-slate-700">Primary Lab / Department Scope</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.labName}
                onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:opacity-70"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Loan Policies & Thresholds */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <BookmarkCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Borrowing & Loan Policies</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Default Loan Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="30"
                disabled={!isAdmin}
                value={formData.defaultLoanDurationDays}
                onChange={(e) =>
                  setFormData({ ...formData, defaultLoanDurationDays: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:opacity-70"
              />
              <p className="text-[10px] text-slate-400">Recommended standard for student assignments.</p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Max Devices per Loan Request</label>
              <input
                type="number"
                min="1"
                max="20"
                disabled={!isAdmin}
                value={formData.maxDevicesPerLoan}
                onChange={(e) =>
                  setFormData({ ...formData, maxDevicesPerLoan: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:opacity-70"
              />
              <p className="text-[10px] text-slate-400">Prevents hoarding of shared networking kits.</p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Overdue Warning Alert Window</label>
              <input
                type="number"
                min="0"
                max="5"
                disabled={!isAdmin}
                value={formData.overdueWarningDays}
                onChange={(e) =>
                  setFormData({ ...formData, overdueWarningDays: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:opacity-70"
              />
              <p className="text-[10px] text-slate-400">Days before due date to alert borrowers.</p>
            </div>
          </div>
        </div>

        {/* Section 3: Governance & Security Toggles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Security & Operational Governance</h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={formData.allowSelfIncidentReporting}
                onChange={(e) => setFormData({ ...formData, allowSelfIncidentReporting: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-800 block">
                  Allow Public & Student Incident Self-Reporting (BR-010)
                </span>
                <span className="text-slate-500 text-[11px]">
                  Allows students to flag damaged equipment immediately without prior teacher intervention.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={formData.requireApprovalForTeachers}
                onChange={(e) => setFormData({ ...formData, requireApprovalForTeachers: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-800 block">
                  Enforce Admin Approval for Teacher Borrowing Requests
                </span>
                <span className="text-slate-500 text-[11px]">
                  When disabled, verified faculty members can request equipment with auto-approval privileges.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 4: Disaster Recovery & Data Backup */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Disaster Recovery & Data Export</h3>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export Full JSON Snapshot</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Download an offline, structured JSON archive containing all devices, locations, categories, loan logs, and incident records for external archiving or migration purposes.
          </p>
        </div>
      </form>
    </div>
  );
}

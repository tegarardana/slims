'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCircle2,
  BookmarkCheck,
  AlertTriangle,
  Wrench,
  ClipboardCheck,
  Check,
  Clock,
  Layers,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type NotifFilter = 'ALL' | 'UNREAD' | 'LOAN_STATUS' | 'INCIDENT_ALERT' | 'MAINTENANCE_UPDATE' | 'STOCK_OPNAME';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotifFilter>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-full', filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(filter === 'UNREAD' && { unreadOnly: 'true' }),
        ...(filter !== 'ALL' && filter !== 'UNREAD' && { type: filter }),
      });
      const res = await fetch(`/api/notifications?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error('Failed to load notifications');
      return json.data as { unreadCount: number; notifications: any[] };
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications-full'] });
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] });
    },
  });

  const markSingleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-full'] });
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Communication Center
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track approval requests, handover updates, maintenance status changes, and overdue reminders.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5 text-indigo-600" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-xs">
        {[
          { id: 'ALL', label: 'All Notifications' },
          { id: 'UNREAD', label: `Unread (${unreadCount})` },
          { id: 'LOAN_STATUS', label: 'Loans' },
          { id: 'INCIDENT_ALERT', label: 'Incidents' },
          { id: 'MAINTENANCE_UPDATE', label: 'Maintenance' },
          { id: 'STOCK_OPNAME', label: 'Stock Opname' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as NotifFilter)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filter === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
            Loading notification feed...
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const payload = n.payload || {};
              let Icon = Bell;
              let iconColor = 'bg-slate-100 text-slate-600';

              if (n.type === 'LOAN_STATUS') {
                Icon = BookmarkCheck;
                iconColor = 'bg-blue-50 text-blue-600';
              } else if (n.type === 'INCIDENT_ALERT') {
                Icon = AlertTriangle;
                iconColor = 'bg-red-50 text-red-600';
              } else if (n.type === 'MAINTENANCE_UPDATE') {
                Icon = Wrench;
                iconColor = 'bg-amber-50 text-amber-600';
              } else if (n.type === 'STOCK_OPNAME') {
                Icon = ClipboardCheck;
                iconColor = 'bg-purple-50 text-purple-600';
              }

              return (
                <div
                  key={n.id}
                  className={`p-4.5 flex items-start justify-between gap-4 transition-colors ${
                    !n.isRead ? 'bg-indigo-50/30' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {payload.title || n.type}
                        </span>
                        {!n.isRead && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                        {payload.message}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                        {payload.link && (
                          <Link
                            href={payload.link}
                            className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>Open Record</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markSingleMutation.mutate(n.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors flex-shrink-0"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center text-xs text-slate-400">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No notifications in this view.
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Bell,
  LogOut,
  User,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowRight,
  Check,
} from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Fetch Unread Notifications
  const { data: notifData } = useQuery({
    queryKey: ['header-notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=5');
      const json = await res.json();
      return json.data as { unreadCount: number; notifications: any[] };
    },
    refetchInterval: 15000, // auto poll every 15s
  });

  // Mark all as read mutation
  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['header-notifications'] });
    },
  });

  const unreadCount = notifData?.unreadCount || 0;
  const notifications = notifData?.notifications || [];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Search Bar (DESIGN.md §8, §9) */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search devices, asset tags, users, loans... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100/80 border border-slate-200 rounded-lg pl-9 pr-12 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Role Badge */}
        {user?.baseRole && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-slate-100 border-slate-200 text-slate-700">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                user.baseRole === 'ADMIN'
                  ? 'bg-purple-500'
                  : user.baseRole === 'TEACHER'
                  ? 'bg-blue-500'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="font-semibold">{user.baseRole}</span>
            {user.isTechnician && (
              <span className="bg-amber-100 text-amber-800 text-[9px] px-1 py-0.2 rounded font-bold">
                TECH
              </span>
            )}
          </div>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            aria-label="View notifications"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 px-1.5 py-0.2 text-[9px] font-bold text-white bg-red-600 rounded-full ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-xs">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllMutation.mutate()}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs space-y-1 transition-colors ${
                        !n.isRead ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 flex items-center justify-between">
                        <span>{n.payload?.title || n.type}</span>
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {n.payload?.message}
                      </p>
                      <div className="text-[10px] text-slate-400 pt-0.5">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No new notifications
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  <span>View All Notifications</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-200" />

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.name || 'Authorized User'}
            </div>
            <div className="text-[11px] text-slate-500">{user?.email}</div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out of SLIMS"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

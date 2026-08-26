'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Server,
  Layers,
  MapPin,
  ClipboardList,
  BookmarkCheck,
  Clock,
  AlertTriangle,
  Wrench,
  ScanLine,
  FileText,
  Users,
  History,
  Settings,
  ChevronRight,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  const role = user?.baseRole || 'STUDENT';
  const isTechnician = Boolean(user?.isTechnician);

  const getNavSections = (): NavSection[] => {
    // 1. Student Navigation (DESIGN.md §7)
    if (role === 'STUDENT') {
      return [
        {
          items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { label: 'Browse Devices', href: '/inventory', icon: Server },
            { label: 'My Loans', href: '/loans', icon: BookmarkCheck },
            { label: 'Report Damage', href: '/incidents', icon: AlertTriangle },
            { label: 'Notifications', href: '/notifications', icon: Clock },
          ],
        },
      ];
    }

    // 2. Teacher Navigation (DESIGN.md §7)
    if (role === 'TEACHER' && !isTechnician) {
      return [
        {
          items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { label: 'Browse Devices', href: '/inventory', icon: Server },
            { label: 'My Loans', href: '/loans', icon: BookmarkCheck },
            { label: 'Report Damage', href: '/incidents', icon: AlertTriangle },
            { label: 'Notifications', href: '/notifications', icon: Clock },
          ],
        },
      ];
    }

    // 3. Teacher with Technician capability (DESIGN.md §7)
    if (role === 'TEACHER' && isTechnician) {
      return [
        {
          items: [
            { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { label: 'Browse Devices', href: '/inventory', icon: Server },
            { label: 'My Loans', href: '/loans', icon: BookmarkCheck },
            { label: 'Notifications', href: '/notifications', icon: Clock },
          ],
        },
        {
          title: 'Operations (Technician)',
          items: [
            { label: 'Incidents Queue', href: '/incidents', icon: AlertTriangle },
            { label: 'Maintenance', href: '/maintenance', icon: Wrench },
            { label: 'Stock Opname', href: '/stock-opname', icon: ScanLine },
          ],
        },
      ];
    }

    // 4. Admin Navigation (Full ManageEngine style — DESIGN.md §6, §7)
    return [
      {
        items: [
          { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Notifications', href: '/notifications', icon: Clock },
        ],
      },
      {
        title: 'Inventory',
        items: [
          { label: 'Devices', href: '/inventory', icon: Server },
          { label: 'Categories', href: '/categories', icon: Layers },
          { label: 'Locations', href: '/locations', icon: MapPin },
        ],
      },
      {
        title: 'Loans',
        items: [
          { label: 'All Loans', href: '/loans', icon: ClipboardList },
          { label: 'Pending Approvals', href: '/loans?status=PENDING_APPROVAL', icon: Clock },
        ],
      },
      {
        title: 'Operations',
        items: [
          { label: 'Incidents', href: '/incidents', icon: AlertTriangle },
          { label: 'Maintenance', href: '/maintenance', icon: Wrench },
          { label: 'Stock Opname', href: '/stock-opname', icon: ScanLine },
        ],
      },
      {
        title: 'Analytics & Admin',
        items: [
          { label: 'Reports', href: '/reports', icon: FileText },
          { label: 'Users Management', href: '/users', icon: Users },
          { label: 'Audit Activity Log', href: '/audit-logs', icon: History },
          { label: 'Settings', href: '/settings', icon: Settings },
        ],
      },
    ];
  };

  const sections = getNavSections();

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950/60">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
            SLIMS
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-900/80 text-indigo-300 border border-indigo-700/50">
              v2.0
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
            Network Equipment Inventory
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
        {sections.map((section, sIndex) => (
          <div key={sIndex} className="space-y-1">
            {section.title && (
              <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                {section.title}
              </div>
            )}
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors group relative ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span className="truncate flex-1">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-200 opacity-80" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* User Role Card */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs uppercase">
            {user?.name?.slice(0, 2) || 'AD'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {user?.name || 'User'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="capitalize">{role.toLowerCase()}</span>
              {isTechnician && (
                <span className="inline-flex items-center text-[10px] text-amber-400 font-medium">
                  • Tech
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

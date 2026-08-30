'use client';

import React, { useEffect } from 'react';
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
  PanelLeftClose,
  Cpu,
  X,
} from 'lucide-react';
import { useSidebar } from './sidebar-context';

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
  const { isCollapsed, toggleSidebar, isMobileOpen, closeMobileSidebar } = useSidebar();
  const user = session?.user as any;
  const role = user?.baseRole || 'STUDENT';
  const isTechnician = Boolean(user?.isTechnician);

  // Close mobile sidebar whenever the route changes
  useEffect(() => {
    closeMobileSidebar();
  }, [pathname]);

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
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col h-screen select-none bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-[72px]' : 'md:w-64'} w-64`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center border-b border-slate-800 bg-slate-950/60 transition-all duration-300 ${
            isCollapsed ? 'md:justify-center md:px-2 px-4 justify-between' : 'px-4 justify-between'
          }`}
        >
          {isCollapsed ? (
            /* When collapsed: Logo acts as button to open/expand sidebar (LLM AI style) */
            <div className="relative group flex items-center justify-center">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Buka Sidebar"
                className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Cpu className="w-5 h-5 transition-transform group-hover:scale-110" />
              </button>

              {/* Floating Tooltip */}
              <div className="hidden md:group-hover:flex fixed left-[78px] z-50 items-center px-2.5 py-1.5 rounded-md bg-slate-800 text-white text-xs font-medium shadow-xl border border-slate-700 whitespace-nowrap animate-in fade-in-0 zoom-in-95 pointer-events-none">
                Buka sidebar
              </div>
            </div>
          ) : (
            /* When expanded: Logo info on the left, close button on the right */
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>

                <div className="overflow-hidden whitespace-nowrap">
                  <div className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
                    SLIMS
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-900/80 text-indigo-300 border border-indigo-700/50">
                      v2.0
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                    Network Equipment
                  </div>
                </div>
              </div>

              {/* Close Button for Desktop */}
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Tutup sidebar"
                title="Tutup sidebar"
                className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <PanelLeftClose className="w-5 h-5" />
              </button>

              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={closeMobileSidebar}
                aria-label="Tutup menu"
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5 custom-scrollbar overflow-x-hidden">
          {sections.map((section, sIndex) => (
            <div key={sIndex} className="space-y-1">
              {section.title && (
                <div
                  className={`text-[11px] font-semibold tracking-wider text-slate-400 uppercase transition-all duration-300 ${
                    isCollapsed
                      ? 'md:hidden px-3 pb-1.5'
                      : 'px-3 pb-1.5 truncate'
                  }`}
                >
                  {section.title}
                </div>
              )}
              {section.title && isCollapsed && (
                <div className="hidden md:block my-2 border-t border-slate-800/80 mx-2" />
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
                      className={`group relative flex items-center rounded-lg text-xs font-medium transition-all ${
                        isCollapsed
                          ? 'md:justify-center md:px-0 md:py-2.5 px-3 py-2 gap-3'
                          : 'px-3 py-2 gap-3'
                      } ${
                        isActive
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />

                      {/* Expanded Label */}
                      <span
                        className={`truncate flex-1 transition-all duration-200 ${
                          isCollapsed ? 'md:hidden' : 'block'
                        }`}
                      >
                        {item.label}
                      </span>

                      {/* Active Indicator Chevron */}
                      {isActive && !isCollapsed && (
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-200 opacity-80" />
                      )}

                      {/* Collapsed Tooltip (Desktop) */}
                      {isCollapsed && (
                        <div className="hidden md:group-hover:flex fixed left-[78px] z-50 items-center px-2.5 py-1.5 rounded-md bg-slate-800 text-white text-xs font-medium shadow-xl border border-slate-700 whitespace-nowrap animate-in fade-in-0 zoom-in-95 pointer-events-none">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

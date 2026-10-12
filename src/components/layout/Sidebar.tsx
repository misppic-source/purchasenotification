import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Clock,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Receipt as ReceiptIcon,
  Bot,
  FileBarChart2,
  History,
  ShieldCheck,
  Users,
  Settings,
  Bell,
  Truck,
  PieChart,
  LogOut,
  ChevronRight,
  Factory,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  pendingApprovalCount: number;
  unreadNotificationCount: number;
}

interface NavSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
    badgeColor?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  pendingApprovalCount,
  unreadNotificationCount,
}) => {
  const { user, isPPIC, logout } = useAuth();

  const ppicSections: NavSection[] = [
    {
      title: 'Operations',
      items: [
        { id: 'dashboard', label: 'Command Dashboard', icon: LayoutDashboard },
        { id: 'calendar', label: 'Planning Calendar', icon: Calendar },
        { id: 'schedules', label: 'Master Schedules', icon: Layers },
        { id: 'today', label: 'Due Today', icon: Clock },
        { id: 'next3days', label: 'Next 3 Days', icon: CalendarClock },
        {
          id: 'overdue',
          label: 'Overdue Items',
          icon: AlertTriangle,
          badge: 'Alert',
          badgeColor: 'bg-rose-500',
        },
        { id: 'yetToArrive', label: 'Yet To Arrive', icon: Layers },
      ],
    },
    {
      title: 'Verification & Receipts',
      items: [
        {
          id: 'approvalQueue',
          label: 'Approval Queue',
          icon: CheckCircle2,
          badge: pendingApprovalCount > 0 ? String(pendingApprovalCount) : undefined,
          badgeColor: 'bg-amber-500',
        },
        { id: 'receiptTracking', label: 'Official Receipts', icon: ReceiptIcon },
      ],
    },
    {
      title: 'Planning & Imports',
      items: [
        { id: 'excelImport', label: 'Excel Matrix Import', icon: FileSpreadsheet },
        { id: 'rmHistory', label: 'Material History', icon: History },
      ],
    },
    {
      title: 'Intelligence & Management',
      items: [
        { id: 'aiAssistant', label: 'Operational AI', icon: Bot },
        { id: 'reports', label: 'Reports & Export', icon: FileBarChart2 },
        { id: 'auditHistory', label: 'Audit Trail', icon: ShieldCheck },
        { id: 'userManagement', label: 'User Accounts', icon: Users },
        { id: 'settings', label: 'System Settings', icon: Settings },
      ],
    },
  ];

  const purchaseSections: NavSection[] = [
    {
      title: 'My Materials',
      items: [
        { id: 'dashboard', label: 'Purchase Console', icon: LayoutDashboard },
        { id: 'calendar', label: 'Planning Calendar', icon: Calendar },
        { id: 'schedules', label: 'All Permitted RM', icon: Layers },
        { id: 'today', label: 'Due Today', icon: Clock },
        { id: 'next3days', label: 'Next 3 Days', icon: CalendarClock },
        { id: 'next7days', label: 'Next 7 Days', icon: CalendarClock },
        {
          id: 'overdue',
          label: 'Overdue Follow-up',
          icon: AlertTriangle,
          badge: 'Alert',
          badgeColor: 'bg-rose-500',
        },
      ],
    },
    {
      title: 'Gate Arrival & Reports',
      items: [
        {
          id: 'arrivalRequests',
          label: 'Arrival Reports',
          icon: Truck,
          badge: pendingApprovalCount > 0 ? String(pendingApprovalCount) : undefined,
          badgeColor: 'bg-amber-500',
        },
        { id: 'partialReceipts', label: 'Partial Receipts', icon: PieChart },
      ],
    },
    {
      title: 'Intelligence & Alerts',
      items: [
        { id: 'aiAssistant', label: 'Operational AI', icon: Bot },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: Bell,
          badge: unreadNotificationCount > 0 ? String(unreadNotificationCount) : undefined,
          badgeColor: 'bg-indigo-500',
        },
      ],
    },
  ];

  const sections = isPPIC ? ppicSections : purchaseSections;

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay when open */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Off-Canvas Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-slate-950 text-slate-300 flex flex-col h-screen border-r border-slate-800/80 shadow-2xl z-50 transform transition-transform duration-200 ease-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with Close X Button */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
              <Factory className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-100 text-xs tracking-tight truncate uppercase">
                Elkitch Manufacturing
              </h1>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                RM Arrival Control
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors shrink-0"
            title="Close Menu (Esc)"
            aria-label="Close Navigation Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Pill Banner */}
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPPIC ? 'bg-indigo-400' : 'bg-emerald-400'
              }`}
            />
            <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300">
              {isPPIC ? 'PPIC Admin Control' : 'Purchase Follow-up'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">IST</span>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {sections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {sec.title}
              </div>

              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full ${
                            item.badgeColor || 'bg-indigo-500'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80">
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-900/60 transition-colors">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
            </div>
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  Search,
  Bell,
  Clock,
  Sparkles,
  RefreshCw,
  Factory,
  UserRound,
  LogIn,
  LogOut,
} from 'lucide-react';
import { api } from '../../services/api';
import { NotificationRecord } from '../../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  pendingApprovalsCount?: number;
  onSearch: (query: string) => void;
  onOpenNotifications: () => void;
  onOpenAI: () => void;
  onDataRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  isSidebarOpen,
  pendingApprovalsCount = 0,
  onSearch,
  onOpenNotifications,
  onOpenAI,
  onDataRefresh,
}) => {
  const { user, isPPIC, logout } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Time in Asia/Kolkata
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      };
      setCurrentTimeStr(new Intl.DateTimeFormat('en-IN', options).format(now));
    }
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(
    (n) => user && !n.readBy.includes(user.id)
  ).length;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onSearch(e.target.value);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onDataRefresh();
      await loadNotifications();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left: 3-bar Menu Hamburger Button + Branding */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="relative p-2 -ml-1 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/90 shadow-2xs flex items-center justify-center group"
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu (3 Bar Menu)"
        >
          {/* Classic 3-bar hamburger icon */}
          <Menu className="w-5 h-5 text-slate-800 transition-transform group-hover:scale-105" />
          {/* Indicator dot if pending approvals or unread alerts */}
          {(pendingApprovalsCount > 0 || unreadCount > 0) && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
          )}
        </button>

        {/* Facility Brand Identity */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-2xs shrink-0">
            <Factory className="w-4 h-4" />
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-xs font-bold text-slate-900 tracking-tight uppercase">
              Elkitch Manufacturing
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              RM Arrival Control & Notification
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Global Search */}
      <div className="flex-1 max-w-sm hidden md:block">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search RM code, description, supplier..."
            className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-400 transition-all font-normal"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Live Clock IST */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTimeStr || 'IST'}</span>
        </div>

        {/* AI Quick Button */}
        <button
          onClick={onOpenAI}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          title="Open Operational AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">AI Query</span>
        </button>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/70"
          title="Refresh Data & Statuses"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative border border-slate-200/70"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Quick Dropdown */}
          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Alerts & Reminders</span>
                <button
                  onClick={() => {
                    setShowNotifMenu(false);
                    onOpenNotifications();
                  }}
                  className="text-[11px] text-indigo-600 hover:underline font-semibold"
                >
                  View All
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (user) api.markNotificationRead(n.id);
                      setShowNotifMenu(false);
                      onOpenNotifications();
                    }}
                    className={`p-3 text-xs hover:bg-slate-50 cursor-pointer ${
                      user && !n.readBy.includes(user.id) ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <div className="font-semibold text-slate-900 line-clamp-1">{n.title}</div>
                    <div className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">{n.message}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400">No active notifications.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Account menu */}
        <div className="relative pl-2 border-l border-slate-200">
          <button
            type="button"
            onClick={() => setShowProfileMenu((open) => !open)}
            className="flex items-center gap-2 rounded-lg p-1.5 text-left hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            aria-label="Open profile menu"
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
          >
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
              {user?.name.charAt(0) || 'U'}
            </div>
            <div className="hidden lg:block leading-tight">
              <div className="text-xs font-semibold text-slate-900 truncate max-w-[110px]">{user?.name}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">{isPPIC ? 'PPIC Admin' : 'Purchase Team'}</div>
            </div>
            <UserRound className="w-3.5 h-3.5 text-slate-500 lg:hidden" />
          </button>

          {showProfileMenu && (
            <div
              className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50"
              role="menu"
              aria-label="Profile menu"
            >
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-900 truncate">{user?.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                <div className="text-[10px] text-indigo-600 font-semibold mt-1">{isPPIC ? 'PPIC Admin' : 'Purchase Team'}</div>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 mt-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <LogIn className="w-4 h-4 text-slate-500" />
                Login as another user
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

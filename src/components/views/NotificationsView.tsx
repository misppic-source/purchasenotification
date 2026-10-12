import React, { useState, useEffect } from 'react';
import { NotificationRecord } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Check,
  XCircle,
  Calendar,
  Layers,
  Truck,
} from 'lucide-react';

interface NotificationsViewProps {
  onSelectSchedule?: (scheduleId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onSelectSchedule,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'OVERDUE' | 'ARRIVALS'>('ALL');
  const [loading, setLoading] = useState(true);

  const loadNotifs = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && user ? { ...n, readBy: [...n.readBy, user.id] } : n))
    );
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return user && !n.readBy.includes(user.id);
    if (filter === 'OVERDUE') return n.type === 'OVERDUE';
    if (filter === 'ARRIVALS')
      return (
        n.type === 'ARRIVAL_REQUEST_SUBMITTED' ||
        n.type === 'ARRIVAL_APPROVED' ||
        n.type === 'ARRIVAL_PARTIALLY_APPROVED' ||
        n.type === 'ARRIVAL_REJECTED'
      );
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            <span>Procurement & PPIC Notification Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time feed of automated 3-day reminders, due today alerts, gate dispatches, and daily overdue notices.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('UNREAD')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filter === 'UNREAD' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Unread Only
          </button>
          <button
            onClick={() => setFilter('OVERDUE')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filter === 'OVERDUE' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Overdue
          </button>
          <button
            onClick={() => setFilter('ARRIVALS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filter === 'ARRIVALS' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Arrivals & Approvals
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="divide-y divide-slate-100 text-xs">
          {filtered.map((n) => {
            const isRead = user && n.readBy.includes(user.id);
            return (
              <div
                key={n.id}
                className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                  isRead ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/40 hover:bg-indigo-50/60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        n.type === 'OVERDUE'
                          ? 'bg-rose-100 text-rose-800'
                          : n.type === 'DUE_TODAY'
                          ? 'bg-blue-100 text-blue-800'
                          : n.type === 'ARRIVAL_REQUEST_SUBMITTED'
                          ? 'bg-amber-100 text-amber-900'
                          : n.type === 'ARRIVAL_APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {n.type.replace(/_/g, ' ')}
                    </span>
                    <strong className="text-slate-900">{n.title}</strong>
                    {!isRead && (
                      <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                    )}
                  </div>

                  <p className="text-slate-700 leading-relaxed">{n.message}</p>

                  <div className="text-[10px] text-slate-400 font-mono">
                    Dispatched: {new Date(n.createdAt).toLocaleString()} | Target: {n.targetRole}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isRead && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              No notifications matching current filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

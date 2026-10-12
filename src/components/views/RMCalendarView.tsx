import React, { useState } from 'react';
import { RMSchedule } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  ArrowRight,
  List,
  Eye,
  Truck,
  Building2,
} from 'lucide-react';

interface RMCalendarViewProps {
  schedules: RMSchedule[];
  userRole: 'PPIC_ADMIN' | 'PURCHASE_TEAM';
  todayStr: string;
  onViewDetails: (s: RMSchedule) => void;
  onMaterialArrived?: (s: RMSchedule) => void;
}

export const RMCalendarView: React.FC<RMCalendarViewProps> = ({
  schedules,
  userRole,
  todayStr,
  onViewDetails,
  onMaterialArrived,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');

  // Base month state: parsed from todayStr (2026-10)
  const initialYear = parseInt(todayStr.slice(0, 4), 10) || 2026;
  const initialMonth = parseInt(todayStr.slice(5, 7), 10) - 1 || 9; // October is 9 (0-indexed)

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const y = parseInt(todayStr.slice(0, 4), 10);
    const m = parseInt(todayStr.slice(5, 7), 10) - 1;
    setCurrentYear(y);
    setCurrentMonth(m);
    setSelectedDate(todayStr);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Build grid days for Month View
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarDays: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Prev month padding
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = currentMonth === 0 ? 12 : currentMonth;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dateStr, dayNum: d, isCurrentMonth: true });
  }

  // Next month padding to make full 35 or 42 grid
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const m = currentMonth === 11 ? 1 : currentMonth + 2;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  // Get schedules for selected date
  const selectedDateSchedules = schedules.filter((s) => s.plannedDate === selectedDate);
  const totalSelectedPlanned = selectedDateSchedules.reduce((acc, s) => acc + s.plannedQty, 0);
  const totalSelectedReceived = selectedDateSchedules.reduce((acc, s) => acc + s.receivedQty, 0);
  const totalSelectedBalance = selectedDateSchedules.reduce((acc, s) => acc + s.balanceQty, 0);

  return (
    <div className="space-y-4">
      {/* Calendar Header Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <p className="text-xs text-slate-500">
              Interactive Raw Material arrival timeline & daily gate dispatch schedule
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                viewMode === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                viewMode === 'agenda' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agenda List
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-700"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Section */}
      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 7-column Calendar Grid (2 Cols wide) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 flex-1">
              {calendarDays.map((cd, idx) => {
                const daySchedules = schedules.filter((s) => s.plannedDate === cd.dateStr);
                const isSelected = selectedDate === cd.dateStr;
                const isToday = cd.dateStr === todayStr;
                const hasOverdue = daySchedules.some(
                  (s) => (s.plannedDate < todayStr && s.balanceQty > 0) || s.status === 'OVERDUE'
                );

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(cd.dateStr)}
                    className={`min-h-[96px] p-2 flex flex-col cursor-pointer transition-colors relative group ${
                      !cd.isCurrentMonth
                        ? 'bg-slate-50/40 text-slate-300'
                        : isSelected
                        ? 'bg-indigo-50/60 ring-1 ring-indigo-500/20'
                        : isToday
                        ? 'bg-blue-50/30'
                        : 'bg-white hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Day number & indicators */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-md font-mono ${
                          isToday
                            ? 'bg-slate-900 text-white font-bold'
                            : isSelected
                            ? 'bg-indigo-100 text-indigo-900 font-bold'
                            : 'text-slate-700'
                        }`}
                      >
                        {cd.dayNum}
                      </span>

                      {daySchedules.length > 0 && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {daySchedules.length}
                        </span>
                      )}
                    </div>

                    {/* Schedule Micro-pills */}
                    <div className="space-y-1 overflow-hidden flex-1">
                      {daySchedules.slice(0, 2).map((s) => (
                        <div
                          key={s.id}
                          className={`text-[10px] truncate px-1.5 py-0.5 rounded font-mono border leading-tight ${
                            s.status === 'OVERDUE'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : s.status === 'RECEIVED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : s.status === 'ARRIVAL_PENDING_APPROVAL'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                          title={`${s.rmCode}: ${s.rmDescription} (${s.plannedQty} ${s.uom})`}
                        >
                          <span className="font-bold mr-1">{s.rmCode}</span>
                          <span>{s.plannedQty}</span>
                        </div>
                      ))}

                      {daySchedules.length > 2 && (
                        <div className="text-[9px] text-slate-400 font-mono pl-1">
                          +{daySchedules.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Overdue alert dot */}
                    {hasOverdue && (
                      <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Date Detailed Breakdown (Section 21) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[11px] font-bold uppercase text-slate-500">Day Breakdown</span>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5 font-mono">
                {selectedDate} {selectedDate === todayStr && <span className="text-xs text-indigo-600 font-bold ml-2">[TODAY]</span>}
              </h3>
            </div>

            {/* Daily Totals Bar */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center text-xs">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Planned</div>
                <div className="text-sm font-extrabold text-slate-900">{totalSelectedPlanned.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-600">Received</div>
                <div className="text-sm font-extrabold text-emerald-700">{totalSelectedReceived.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-rose-600">Balance</div>
                <div className="text-sm font-extrabold text-rose-700">{totalSelectedBalance.toLocaleString()}</div>
              </div>
            </div>

            {/* List of RM for selected date */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Arrival Records ({selectedDateSchedules.length})</span>
              </div>

              {selectedDateSchedules.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  No RM arrivals scheduled for this date.
                </div>
              ) : (
                selectedDateSchedules.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded">
                            {s.rmCode}
                          </span>
                          <StatusBadge status={s.status} size="sm" />
                        </div>
                        <div className="font-semibold text-slate-800 mt-1 line-clamp-1">
                          {s.rmDescription}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded">
                      <div>
                        Planned: <strong className="text-slate-800">{s.plannedQty} {s.uom}</strong>
                      </div>
                      <div>
                        Balance: <strong className="text-rose-700">{s.balanceQty} {s.uom}</strong>
                      </div>
                      <div className="col-span-2 truncate">
                        Supplier: {s.supplier || 'N/A'}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        onClick={() => onViewDetails(s)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>

                      {userRole === 'PURCHASE_TEAM' && s.status !== 'CANCELLED' && s.balanceQty > 0 && onMaterialArrived && (
                        <button
                          onClick={() => onMaterialArrived(s)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Material Arrived</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Agenda / List View */
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Chronological RM Arrival Agenda
            </h3>
            <span className="text-xs text-slate-500">{schedules.length} Total Registered Schedules</span>
          </div>

          <div className="divide-y divide-slate-100">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-slate-50 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 bg-slate-100 rounded-lg text-center font-mono shrink-0 w-24">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Planned</div>
                    <div className="text-xs font-bold text-slate-900">{s.plannedDate}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{s.rmCode}</span>
                      <span className="font-semibold text-slate-800 truncate">{s.rmDescription}</span>
                      <StatusBadge status={s.status} size="sm" />
                    </div>
                    <div className="text-slate-500 mt-1 flex items-center gap-4 text-[11px]">
                      <span>Supplier: <strong className="text-slate-700">{s.supplier || 'N/A'}</strong></span>
                      <span>PO: <strong className="text-slate-700">{s.poNumber || 'N/A'}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between md:justify-end shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      {s.plannedQty.toLocaleString()} <span className="text-[10px] text-slate-500">{s.uom}</span>
                    </div>
                    <div className="text-[11px] text-rose-600 font-semibold">
                      Bal: {s.balanceQty.toLocaleString()} {s.uom}
                    </div>
                  </div>

                  <button
                    onClick={() => onViewDetails(s)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

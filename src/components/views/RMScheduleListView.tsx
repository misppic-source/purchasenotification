import React, { useState } from 'react';
import { RMSchedule } from '../../types';
import { RMCard } from '../common/RMCard';
import { StatusBadge } from '../common/StatusBadge';
import {
  Layers,
  Filter,
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface RMScheduleListViewProps {
  schedules: RMSchedule[];
  userRole: 'PPIC_ADMIN' | 'PURCHASE_TEAM';
  title?: string;
  onViewDetails: (s: RMSchedule) => void;
  onMaterialArrived?: (s: RMSchedule) => void;
  onEditSchedule?: (s: RMSchedule) => void;
  onCancelSchedule?: (s: RMSchedule) => void;
  onApproveArrival?: (s: RMSchedule) => void;
  onCreateSchedule?: () => void;
}

type SortKey = 'plannedDate' | 'balanceQty' | 'supplier';

export const RMScheduleListView: React.FC<RMScheduleListViewProps> = ({
  schedules,
  userRole,
  title = 'Raw Material Schedules',
  onViewDetails,
  onMaterialArrived,
  onEditSchedule,
  onCancelSchedule,
  onApproveArrival,
  onCreateSchedule,
}) => {
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('plannedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filtered = schedules.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && s.priority !== priorityFilter) return false;
    return true;
  });

  const sortedAndFiltered = [...filtered].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'plannedDate') {
      comp = (a.plannedDate || '').localeCompare(b.plannedDate || '');
    } else if (sortBy === 'balanceQty') {
      comp = (a.balanceQty || 0) - (b.balanceQty || 0);
    } else if (sortBy === 'supplier') {
      const supA = (a.supplier || '').toLowerCase();
      const supB = (b.supplier || '').toLowerCase();
      comp = supA.localeCompare(supB);
    }
    return sortDirection === 'asc' ? comp : -comp;
  });

  const handleColumnHeaderSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{title}</span>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200">
              {sortedAndFiltered.length} Records
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative master planning database with real-time balance tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {userRole === 'PPIC_ADMIN' && onCreateSchedule && (
            <button
              onClick={onCreateSchedule}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New RM Schedule</span>
            </button>
          )}

          {/* Layout Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-md transition-all ${
                layoutMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('table')}
              className={`p-1.5 rounded-md transition-all ${
                layoutMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3 flex-wrap text-xs">
        {/* Filters */}
        <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[11px]">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="DUE_TODAY">Due Today</option>
          <option value="DUE_SOON">Due Soon (3 Days)</option>
          <option value="OVERDUE">Overdue</option>
          <option value="ARRIVAL_PENDING_APPROVAL">Pending PPIC Approval</option>
          <option value="PARTIALLY_RECEIVED">Partially Received</option>
          <option value="RECEIVED">Officially Received</option>
          <option value="SCHEDULED">Scheduled Future</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">Critical Priority</option>
          <option value="HIGH">High Priority</option>
          <option value="NORMAL">Normal Priority</option>
        </select>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-slate-500 font-bold uppercase text-[11px]">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Sort By:</span>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="plannedDate">Planned Date</option>
            <option value="balanceQty">Balance Quantity</option>
            <option value="supplier">Supplier Name</option>
          </select>

          <button
            type="button"
            onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
            title={`Toggle order: currently ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            {sortDirection === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span className="text-[11px] font-medium hidden md:inline">
              {sortDirection === 'asc' ? 'Asc' : 'Desc'}
            </span>
          </button>
        </div>

        {(statusFilter !== 'ALL' || priorityFilter !== 'ALL' || sortBy !== 'plannedDate' || sortDirection !== 'asc') && (
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setPriorityFilter('ALL');
              setSortBy('plannedDate');
              setSortDirection('asc');
            }}
            className="text-indigo-600 hover:underline text-[11px] font-bold ml-auto"
          >
            Reset
          </button>
        )}
      </div>

      {/* Main Content */}
      {sortedAndFiltered.length === 0 ? (
        <div className="p-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
          No raw material schedules match the selected criteria.
        </div>
      ) : layoutMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAndFiltered.map((s) => (
            <RMCard
              key={s.id}
              schedule={s}
              userRole={userRole}
              onViewDetails={onViewDetails}
              onMaterialArrived={onMaterialArrived}
              onEditSchedule={onEditSchedule}
              onCancelSchedule={onCancelSchedule}
              onApproveArrival={onApproveArrival}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-3">RM Code</th>
                  <th className="p-3">Description</th>
                  <th
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleColumnHeaderSort('plannedDate')}
                    title="Click to sort by Planned Date"
                  >
                    <div className="flex items-center gap-1">
                      <span>Planned Date</span>
                      {sortBy === 'plannedDate' && (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        )
                      )}
                    </div>
                  </th>
                  <th className="p-3 text-right">Planned</th>
                  <th className="p-3 text-right">Received</th>
                  <th
                    className="p-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleColumnHeaderSort('balanceQty')}
                    title="Click to sort by Balance Quantity"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Balance</span>
                      {sortBy === 'balanceQty' && (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        )
                      )}
                    </div>
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleColumnHeaderSort('supplier')}
                    title="Click to sort by Supplier Name"
                  >
                    <div className="flex items-center gap-1">
                      <span>Supplier</span>
                      {sortBy === 'supplier' && (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        )
                      )}
                    </div>
                  </th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedAndFiltered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">{s.rmCode}</td>
                    <td className="p-3 font-semibold text-slate-800 max-w-xs truncate">{s.rmDescription}</td>
                    <td className="p-3 font-mono">{s.plannedDate}</td>
                    <td className="p-3 text-right font-bold">{s.plannedQty.toLocaleString()} {s.uom}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">{s.receivedQty.toLocaleString()} {s.uom}</td>
                    <td className="p-3 text-right font-bold text-rose-700">{s.balanceQty.toLocaleString()} {s.uom}</td>
                    <td className="p-3 text-slate-600 truncate max-w-xs">{s.supplier}</td>
                    <td className="p-3">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onViewDetails(s)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

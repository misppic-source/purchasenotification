import React, { useState } from 'react';
import { RMSchedule, ArrivalRequest } from '../../types';
import { RMCard } from '../common/RMCard';
import { RMTile } from '../common/RMTile';
import { StatusBadge } from '../common/StatusBadge';
import {
  Truck,
  Clock,
  CalendarClock,
  AlertTriangle,
  PieChart,
  RotateCcw,
  LayoutGrid,
  Layers,
  Table as TableIcon,
} from 'lucide-react';

interface PurchaseDashboardViewProps {
  schedules: RMSchedule[];
  myArrivalRequests: ArrivalRequest[];
  todayStr: string;
  onViewDetails: (s: RMSchedule) => void;
  onMaterialArrived: (s: RMSchedule) => void;
  onResubmitRequest: (req: ArrivalRequest) => void;
}

export const PurchaseDashboardView: React.FC<PurchaseDashboardViewProps> = ({
  schedules,
  myArrivalRequests,
  todayStr,
  onViewDetails,
  onMaterialArrived,
  onResubmitRequest,
}) => {
  const [activeTab, setActiveTab] = useState<
    'TODAY' | 'NEXT3' | 'OVERDUE' | 'PARTIAL' | 'REQUESTS' | 'NEXT7'
  >('TODAY');

  // Display Mode: 'tiles' (Small Icons) | 'details' (Cards) | 'table' (Spreadsheet)
  const [displayMode, setDisplayMode] = useState<'tiles' | 'details' | 'table'>(() => {
    return (localStorage.getItem('elkitch_rm_display_mode') as any) || 'tiles';
  });

  const handleDisplayModeChange = (mode: 'tiles' | 'details' | 'table') => {
    setDisplayMode(mode);
    localStorage.setItem('elkitch_rm_display_mode', mode);
  };

  const todayArrivals = schedules.filter((s) => s.plannedDate === todayStr && s.status !== 'CANCELLED');
  const overdueArrivals = schedules.filter(
    (s) => (s.plannedDate < todayStr && s.balanceQty > 0 && s.status !== 'CANCELLED') || s.status === 'OVERDUE'
  );
  const partialArrivals = schedules.filter((s) => s.status === 'PARTIALLY_RECEIVED');

  const todayObj = new Date(`${todayStr}T00:00:00Z`);
  const next3Days = schedules.filter((s) => {
    if (s.status === 'CANCELLED' || s.balanceQty <= 0) return false;
    const diff = Math.ceil((new Date(`${s.plannedDate}T00:00:00Z`).getTime() - todayObj.getTime()) / (1000 * 3600 * 24));
    return diff > 0 && diff <= 3;
  });

  const next7Days = schedules.filter((s) => {
    if (s.status === 'CANCELLED' || s.balanceQty <= 0) return false;
    const diff = Math.ceil((new Date(`${s.plannedDate}T00:00:00Z`).getTime() - todayObj.getTime()) / (1000 * 3600 * 24));
    return diff > 0 && diff <= 7;
  });

  const pendingRequests = myArrivalRequests.filter((r) => r.status === 'PENDING_APPROVAL');
  const rejectedRequests = myArrivalRequests.filter((r) => r.status === 'REJECTED');

  const renderMaterialList = (items: RMSchedule[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <div className="py-12 text-center text-slate-400 text-xs">
          {emptyMessage}
        </div>
      );
    }

    if (displayMode === 'tiles') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {items.map((s) => (
            <RMTile
              key={s.id}
              schedule={s}
              userRole="PURCHASE_TEAM"
              onViewDetails={onViewDetails}
              onMaterialArrived={onMaterialArrived}
            />
          ))}
        </div>
      );
    }

    if (displayMode === 'table') {
      return (
        <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-2.5">RM Code</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 font-mono">Date</th>
                  <th className="p-2.5 text-right font-mono">Planned</th>
                  <th className="p-2.5 text-right font-mono">Received</th>
                  <th className="p-2.5 text-right font-mono">Balance</th>
                  <th className="p-2.5">Supplier</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-mono font-bold text-slate-900">{s.rmCode}</td>
                    <td className="p-2.5 font-medium text-slate-800 max-w-xs truncate">{s.rmDescription}</td>
                    <td className="p-2.5 font-mono text-slate-600">{s.plannedDate}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-800">{s.plannedQty.toLocaleString()} {s.uom}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700">{s.receivedQty.toLocaleString()} {s.uom}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-rose-700">{s.balanceQty.toLocaleString()} {s.uom}</td>
                    <td className="p-2.5 text-slate-500 max-w-xs truncate">{s.supplier || 'N/A'}</td>
                    <td className="p-2.5">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="p-2.5 text-right">
                      {s.balanceQty > 0 && s.status !== 'CANCELLED' && (
                        <button
                          onClick={() => onMaterialArrived(s)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Report</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((s) => (
          <RMCard
            key={s.id}
            schedule={s}
            userRole="PURCHASE_TEAM"
            onViewDetails={onViewDetails}
            onMaterialArrived={onMaterialArrived}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Purchase Arrival & Follow-Up Console
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Follow up with suppliers, report factory gate arrivals with challans, and track PPIC verification status.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('TODAY')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">RM Due Today</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {todayArrivals.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Expected at factory gate today</div>
        </div>

        <div
          onClick={() => setActiveTab('NEXT3')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Next 3 Days</span>
            <CalendarClock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {next3Days.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Confirm transporter LR</div>
        </div>

        <div
          onClick={() => setActiveTab('OVERDUE')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Overdue Follow-up</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 font-mono mt-1">
            {overdueArrivals.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Delayed past planned date</div>
        </div>

        <div
          onClick={() => setActiveTab('REQUESTS')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">My Arrival Reports</span>
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {pendingRequests.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {rejectedRequests.length > 0 ? (
              <span className="text-rose-600 font-semibold">{rejectedRequests.length} need correction</span>
            ) : (
              'All reports under review or approved'
            )}
          </div>
        </div>
      </div>

      {/* Tabs & View Mode Switcher */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/70 px-4 py-2 sm:py-0 bg-slate-50/50 gap-2">
          {/* Tabs */}
          <div className="flex items-center border-b sm:border-b-0 border-slate-200/70 overflow-x-auto text-xs font-semibold scrollbar-none">
            {[
              { id: 'TODAY', label: 'Due Today', count: todayArrivals.length },
              { id: 'NEXT3', label: 'Next 3 Days', count: next3Days.length },
              { id: 'OVERDUE', label: 'Overdue Follow-up', count: overdueArrivals.length, isAlert: overdueArrivals.length > 0 },
              { id: 'PARTIAL', label: 'Partial Receipts', count: partialArrivals.length },
              { id: 'NEXT7', label: 'Next 7 Days', count: next7Days.length },
              { id: 'REQUESTS', label: 'My Submissions', count: myArrivalRequests.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white font-bold'
                      : tab.isAlert
                      ? 'bg-rose-100 text-rose-800 font-bold'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Toggle */}
          {activeTab !== 'REQUESTS' && (
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center py-2 sm:py-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-0.5 hidden lg:inline">View:</span>
              <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => handleDisplayModeChange('tiles')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    displayMode === 'tiles'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tiles Mode (Small Icons & Compact High-Density Grid)"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tiles</span>
                </button>

                <button
                  onClick={() => handleDisplayModeChange('details')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    displayMode === 'details'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Details Mode (Full Spec Cards with Planned / Received / Balance breakdown)"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Details</span>
                </button>

                <button
                  onClick={() => handleDisplayModeChange('table')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    displayMode === 'table'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Table Mode (Compact Spreadsheet)"
                >
                  <TableIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Table</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {activeTab === 'TODAY' && (
            <div className="space-y-4">
              {renderMaterialList(
                todayArrivals,
                'No materials scheduled for factory gate arrival today.'
              )}
            </div>
          )}

          {activeTab === 'NEXT3' && (
            <div className="space-y-4">
              {renderMaterialList(
                next3Days,
                'No arrivals in next 3 days.'
              )}
            </div>
          )}

          {activeTab === 'OVERDUE' && (
            <div className="space-y-4">
              {overdueArrivals.length === 0 ? (
                <div className="py-12 text-center text-emerald-600 text-xs font-semibold">
                  Zero overdue items. All dispatches on schedule.
                </div>
              ) : (
                renderMaterialList(overdueArrivals, '')
              )}
            </div>
          )}

          {activeTab === 'PARTIAL' && (
            <div className="space-y-4">
              {renderMaterialList(
                partialArrivals,
                'No partial deliveries currently pending remaining balance.'
              )}
            </div>
          )}

          {activeTab === 'NEXT7' && (
            <div className="space-y-4">
              {renderMaterialList(
                next7Days,
                'No arrivals in next 7 days.'
              )}
            </div>
          )}

          {activeTab === 'REQUESTS' && (
            <div className="space-y-4">
              {myArrivalRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No arrival reports submitted yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden text-xs">
                  {myArrivalRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {req.id}
                          </span>
                          <span className="font-semibold text-slate-800">{req.rmCode} — {req.rmDescription}</span>
                          <StatusBadge status={req.status} size="sm" />
                        </div>
                        <div className="text-slate-500">
                          Reported: <strong className="text-slate-900 font-mono">{req.reportedQty}</strong> on {req.actualArrivalDate} · Challan: {req.deliveryChallan || 'N/A'}
                        </div>
                        {req.rejectionReason && (
                          <div className="text-rose-700 bg-rose-50 p-2 rounded border border-rose-100 text-[11px]">
                            <strong>Correction needed:</strong> {req.rejectionReason}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {req.status === 'REJECTED' && (
                          <button
                            onClick={() => onResubmitRequest(req)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Resubmit Corrected</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

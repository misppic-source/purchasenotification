import React, { useState } from 'react';
import { RMSchedule, ArrivalRequest, KPIData, AuditLog } from '../../types';
import { RMCard } from '../common/RMCard';
import { RMTile } from '../common/RMTile';
import { StatusBadge } from '../common/StatusBadge';
import {
  Layers,
  LayoutGrid,
  Table as TableIcon,
  CalendarCheck2,
  Clock,
  CalendarClock,
  AlertTriangle,
  PieChart,
  CheckCircle2,
  CheckSquare,
  Ban,
  Activity,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface PPICDashboardViewProps {
  kpis: KPIData | null;
  schedules: RMSchedule[];
  pendingRequests: ArrivalRequest[];
  auditLogs: AuditLog[];
  todayStr: string;
  onViewDetails: (s: RMSchedule) => void;
  onEditSchedule: (s: RMSchedule) => void;
  onCancelSchedule: (s: RMSchedule) => void;
  onApproveArrival: (s: RMSchedule) => void;
  onNavigateTab: (tab: string) => void;
}

export const PPICDashboardView: React.FC<PPICDashboardViewProps> = ({
  kpis,
  schedules,
  pendingRequests,
  auditLogs,
  todayStr,
  onViewDetails,
  onEditSchedule,
  onCancelSchedule,
  onApproveArrival,
  onNavigateTab,
}) => {
  const [activeSection, setActiveSection] = useState<
    'TODAY' | 'NEXT3' | 'OVERDUE' | 'PENDING' | 'PARTIAL' | 'NEXT7' | 'ACTIVITY'
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
  const partiallyReceived = schedules.filter((s) => s.status === 'PARTIALLY_RECEIVED');

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

  const totalPlanned = kpis?.totalPlannedQty || schedules.reduce((a, b) => a + b.plannedQty, 0);
  const totalReceived = kpis?.totalReceivedQty || schedules.reduce((a, b) => a + b.receivedQty, 0);
  const totalBalance = kpis?.totalBalanceQty || schedules.reduce((a, b) => a + b.balanceQty, 0);
  const percentReceived = totalPlanned > 0 ? Math.round((totalReceived / totalPlanned) * 100) : 0;

  /**
   * Render schedules based on selected display mode: tiles (small icons), details (cards), or table
   */
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
              userRole="PPIC_ADMIN"
              onViewDetails={onViewDetails}
              onEditSchedule={onEditSchedule}
              onApproveArrival={onApproveArrival}
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
                      <button
                        onClick={() => onViewDetails(s)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors"
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
      );
    }

    // Default: Details Mode (Spec Cards)
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((s) => (
          <RMCard
            key={s.id}
            schedule={s}
            userRole="PPIC_ADMIN"
            onViewDetails={onViewDetails}
            onEditSchedule={onEditSchedule}
            onCancelSchedule={onCancelSchedule}
            onApproveArrival={onApproveArrival}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            PPIC Planning & Arrival Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Central manufacturing inventory schedule, gate dispatch tracking, and official receipt verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingRequests.length > 0 && (
            <button
              onClick={() => onNavigateTab('approvalQueue')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Verify Arrivals ({pendingRequests.length})</span>
            </button>
          )}
          <button
            onClick={() => onNavigateTab('excelImport')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <span>+ Import Excel Matrix</span>
          </button>
        </div>
      </div>

      {/* Primary Clean Metric Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Planned Volume */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Planned Volume</div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1 tracking-tight">
            {totalPlanned.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across {kpis?.totalArrivals || schedules.length} material schedules
          </div>
        </div>

        {/* Metric 2: Officially Received */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Officially Received</span>
            <span className="text-[11px] font-mono font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
              {percentReceived}%
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1 tracking-tight">
            {totalReceived.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            PPIC verified receipts only
          </div>
        </div>

        {/* Metric 3: Remaining Balance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Outstanding Balance</div>
          <div className="text-2xl font-bold text-slate-800 font-mono mt-1 tracking-tight">
            {totalBalance.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Planned minus approved receipts
          </div>
        </div>

        {/* Metric 4: Immediate Action */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Action Required</span>
            {overdueArrivals.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1 tracking-tight">
            {overdueArrivals.length + pendingRequests.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {overdueArrivals.length} overdue · {pendingRequests.length} pending review
          </div>
        </div>
      </div>

      {/* Operational Sections Segmented Navigation + Display Mode Toggle */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/70 px-4 py-2 sm:py-0 bg-slate-50/50 gap-2">
          {/* Section Tabs */}
          <div className="flex items-center overflow-x-auto text-xs font-semibold scrollbar-none">
            {[
              { id: 'TODAY', label: 'Due Today', count: todayArrivals.length },
              { id: 'NEXT3', label: 'Next 3 Days', count: next3Days.length },
              { id: 'OVERDUE', label: 'Overdue RM', count: overdueArrivals.length, isAlert: overdueArrivals.length > 0 },
              { id: 'PENDING', label: 'Pending Approvals', count: pendingRequests.length, isWarning: pendingRequests.length > 0 },
              { id: 'PARTIAL', label: 'Partially Received', count: partiallyReceived.length },
              { id: 'NEXT7', label: 'Next 7 Days', count: next7Days.length },
              { id: 'ACTIVITY', label: 'Recent Activity', count: auditLogs.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeSection === tab.id
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    activeSection === tab.id
                      ? 'bg-slate-900 text-white font-bold'
                      : tab.isAlert
                      ? 'bg-rose-100 text-rose-800 font-bold'
                      : tab.isWarning
                      ? 'bg-amber-100 text-amber-800 font-bold'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Display Mode Options Switcher: Tiles (Small Icons) vs Details vs Table */}
          {activeSection !== 'PENDING' && activeSection !== 'ACTIVITY' && (
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

        {/* Section Content */}
        <div className="p-5">
          {activeSection === 'TODAY' && (
            <div className="space-y-4">
              {renderMaterialList(
                todayArrivals,
                'No raw materials scheduled for gate arrival today.'
              )}
            </div>
          )}

          {activeSection === 'NEXT3' && (
            <div className="space-y-4">
              {renderMaterialList(
                next3Days,
                'No upcoming RM arrivals scheduled in the next 3 days.'
              )}
            </div>
          )}

          {activeSection === 'OVERDUE' && (
            <div className="space-y-4">
              {overdueArrivals.length === 0 ? (
                <div className="py-12 text-center text-emerald-600 text-xs font-semibold">
                  Zero overdue materials. All planning timelines are up to date.
                </div>
              ) : (
                renderMaterialList(overdueArrivals, '')
              )}
            </div>
          )}

          {activeSection === 'PENDING' && (
            <div className="space-y-4">
              {pendingRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  All reported material arrivals have been processed. Queue is clear.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
                  {pendingRequests.map((req) => {
                    const sch = schedules.find((s) => s.id === req.scheduleId);
                    return (
                      <div
                        key={req.id}
                        className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                              {req.rmCode}
                            </span>
                            <span className="font-semibold text-slate-800">{req.rmDescription}</span>
                            <StatusBadge status={req.status} size="sm" />
                          </div>
                          <div className="text-slate-500">
                            Reported: <strong className="text-slate-900 font-mono">{req.reportedQty} {sch?.uom}</strong> on {req.actualArrivalDate} by {req.purchaseUserName}
                          </div>
                          {req.deliveryChallan && (
                            <div className="text-[11px] text-slate-400 font-mono">
                              Challan: {req.deliveryChallan} {req.invoiceNumber ? `· Invoice: ${req.invoiceNumber}` : ''}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {sch && (
                            <button
                              onClick={() => onApproveArrival(sch)}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
                            >
                              Verify & Decide
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeSection === 'PARTIAL' && (
            <div className="space-y-4">
              {renderMaterialList(
                partiallyReceived,
                'No partial deliveries pending remaining balance.'
              )}
            </div>
          )}

          {activeSection === 'NEXT7' && (
            <div className="space-y-4">
              {renderMaterialList(
                next7Days,
                'No arrivals in next 7 days.'
              )}
            </div>
          )}

          {activeSection === 'ACTIVITY' && (
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden text-xs">
              {auditLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="p-3 bg-white flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono text-[11px]">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{log.entityType}</span>
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      {log.reason || 'System event'} · by <span className="font-semibold">{log.userName}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { RMSchedule } from '../../types';
import { StatusBadge } from './StatusBadge';
import {
  Circle,
  Package,
  Layers,
  Droplet,
  Truck,
  Eye,
  CheckSquare,
  AlertTriangle,
  Component,
} from 'lucide-react';

interface RMTileProps {
  schedule: RMSchedule;
  userRole: 'PPIC_ADMIN' | 'PURCHASE_TEAM';
  onViewDetails: (s: RMSchedule) => void;
  onMaterialArrived?: (s: RMSchedule) => void;
  onEditSchedule?: (s: RMSchedule) => void;
  onApproveArrival?: (s: RMSchedule) => void;
}

/**
 * Returns a domain-specific category icon based on RM Description / Code
 */
function getMaterialIcon(desc: string, code: string) {
  const d = (desc + ' ' + code).toLowerCase();
  if (d.includes('circle') || d.includes('round') || d.includes('plate') || d.includes('lid') || d.includes('ring')) {
    return Circle;
  }
  if (d.includes('coat') || d.includes('paint') || d.includes('spatter') || d.includes('primer')) {
    return Droplet;
  }
  if (d.includes('sheet') || d.includes('coil') || d.includes('partition') || d.includes('carton') || d.includes('box')) {
    return Layers;
  }
  if (d.includes('handle') || d.includes('knob') || d.includes('screw') || d.includes('rivet') || d.includes('clamp')) {
    return Component;
  }
  return Package;
}

export const RMTile: React.FC<RMTileProps> = ({
  schedule,
  userRole,
  onViewDetails,
  onMaterialArrived,
  onEditSchedule,
  onApproveArrival,
}) => {
  const isOverdue =
    schedule.status === 'OVERDUE' ||
    (schedule.plannedDate < new Date().toISOString().split('T')[0] &&
      schedule.balanceQty > 0 &&
      schedule.status !== 'CANCELLED');
  const isPendingApproval = schedule.status === 'ARRIVAL_PENDING_APPROVAL';
  const isReceived = schedule.status === 'RECEIVED';
  const isCancelled = schedule.status === 'CANCELLED';

  const MaterialIcon = getMaterialIcon(schedule.rmDescription, schedule.rmCode);

  return (
    <div
      onClick={() => onViewDetails(schedule)}
      className={`group relative bg-white rounded-lg border p-3 cursor-pointer transition-all duration-150 hover:shadow-sm flex flex-col justify-between ${
        isOverdue
          ? 'border-rose-200 border-l-3 border-l-rose-500 bg-rose-50/10'
          : isPendingApproval
          ? 'border-amber-200 border-l-3 border-l-amber-500 bg-amber-50/10'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Line: Small Material Icon + RM Code + Status dot */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
              isOverdue
                ? 'bg-rose-100 text-rose-700'
                : isPendingApproval
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600'
            }`}
          >
            <MaterialIcon className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-xs font-bold text-slate-900 truncate">
            {schedule.rmCode}
          </span>
        </div>

        <StatusBadge status={schedule.status} size="sm" />
      </div>

      {/* Material Description */}
      <div
        className="font-medium text-xs text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors"
        title={schedule.rmDescription}
      >
        {schedule.rmDescription}
      </div>

      {/* Supplier & Date */}
      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 truncate">
        <span className="font-mono text-[10px] text-slate-600 font-semibold">{schedule.plannedDate}</span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span className="truncate text-[10px] text-slate-400">{schedule.supplier || 'Unassigned'}</span>
      </div>

      {/* Compact Quantities Strip */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <div className="text-slate-500 font-mono">
          <span className="text-[9px] uppercase text-slate-400 mr-1">Plan</span>
          <span className="font-semibold text-slate-700">{schedule.plannedQty.toLocaleString()}</span>
        </div>

        <div className="text-right font-mono">
          <span className="text-[9px] uppercase text-slate-400 mr-1">Bal</span>
          <span
            className={`font-bold ${
              schedule.balanceQty <= 0
                ? 'text-emerald-700'
                : isOverdue
                ? 'text-rose-700'
                : 'text-slate-900'
            }`}
          >
            {schedule.balanceQty.toLocaleString()}{' '}
            <span className="text-[9px] font-normal text-slate-400">{schedule.uom}</span>
          </span>
        </div>
      </div>

      {/* Quick Hover CTA buttons */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-2 pt-1.5 flex items-center justify-end gap-1"
      >
        {userRole === 'PURCHASE_TEAM' && !isCancelled && !isReceived && onMaterialArrived && (
          <button
            onClick={() => onMaterialArrived(schedule)}
            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
            title="Report Arrival at Gate"
          >
            <Truck className="w-3 h-3" />
            <span>Report</span>
          </button>
        )}

        {userRole === 'PPIC_ADMIN' && isPendingApproval && onApproveArrival && (
          <button
            onClick={() => onApproveArrival(schedule)}
            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
            title="Verify Arrival"
          >
            <CheckSquare className="w-3 h-3" />
            <span>Verify</span>
          </button>
        )}

        {userRole === 'PPIC_ADMIN' && !isCancelled && onEditSchedule && (
          <button
            onClick={() => onEditSchedule(schedule)}
            className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            title="Edit Plan"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
};

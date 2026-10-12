import React from 'react';
import { RMSchedule } from '../../types';
import { StatusBadge } from './StatusBadge';
import {
  Truck,
  Eye,
  Calendar,
  Building2,
  FileText,
  CheckSquare,
  Edit3,
  Ban,
} from 'lucide-react';

interface RMCardProps {
  schedule: RMSchedule;
  userRole: 'PPIC_ADMIN' | 'PURCHASE_TEAM';
  onViewDetails: (s: RMSchedule) => void;
  onMaterialArrived?: (s: RMSchedule) => void;
  onEditSchedule?: (s: RMSchedule) => void;
  onCancelSchedule?: (s: RMSchedule) => void;
  onApproveArrival?: (s: RMSchedule) => void;
}

export const RMCard: React.FC<RMCardProps> = ({
  schedule,
  userRole,
  onViewDetails,
  onMaterialArrived,
  onEditSchedule,
  onCancelSchedule,
  onApproveArrival,
}) => {
  const isCancelled = schedule.status === 'CANCELLED';
  const isReceived = schedule.status === 'RECEIVED';
  const isPendingApproval = schedule.status === 'ARRIVAL_PENDING_APPROVAL';
  const isOverdue = schedule.status === 'OVERDUE';

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-150 flex flex-col justify-between ${
        isOverdue
          ? 'border-rose-200 border-l-4 border-l-rose-500 shadow-2xs'
          : isPendingApproval
          ? 'border-amber-200 border-l-4 border-l-amber-500 shadow-2xs'
          : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
      }`}
    >
      {/* Top Header */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
              {schedule.rmCode}
            </span>
            {schedule.priority === 'CRITICAL' && (
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                Critical
              </span>
            )}
          </div>
          <StatusBadge status={schedule.status} size="sm" />
        </div>

        <div>
          <h3
            className="font-semibold text-slate-900 text-sm line-clamp-1 leading-snug"
            title={schedule.rmDescription}
          >
            {schedule.rmDescription}
          </h3>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 truncate">
            <span>{schedule.plannedDate}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{schedule.supplier || 'Unassigned'}</span>
            {schedule.poNumber && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono truncate">{schedule.poNumber}</span>
              </>
            )}
          </div>
        </div>

        {/* Quantities Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
          <div className="p-1.5 rounded-lg bg-slate-50/70">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Planned</div>
            <div className="text-xs font-bold text-slate-800 font-mono mt-0.5">
              {schedule.plannedQty.toLocaleString()}{' '}
              <span className="text-[9px] font-normal text-slate-400">{schedule.uom}</span>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-50/70">
            <div className="text-[10px] uppercase font-semibold text-emerald-600">Received</div>
            <div className="text-xs font-bold text-emerald-700 font-mono mt-0.5">
              {schedule.receivedQty.toLocaleString()}{' '}
              <span className="text-[9px] font-normal text-emerald-600/70">{schedule.uom}</span>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-50/70">
            <div className="text-[10px] uppercase font-semibold text-rose-600">Balance</div>
            <div className="text-xs font-bold text-rose-700 font-mono mt-0.5">
              {schedule.balanceQty.toLocaleString()}{' '}
              <span className="text-[9px] font-normal text-rose-600/70">{schedule.uom}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2 rounded-b-xl">
        <button
          onClick={() => onViewDetails(schedule)}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          Details
        </button>

        <div className="flex items-center gap-1.5">
          {/* Purchase CTA */}
          {userRole === 'PURCHASE_TEAM' && !isCancelled && !isReceived && onMaterialArrived && (
            <button
              onClick={() => onMaterialArrived(schedule)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Report Arrival</span>
            </button>
          )}

          {/* PPIC Admin Actions */}
          {userRole === 'PPIC_ADMIN' && (
            <>
              {isPendingApproval && onApproveArrival && (
                <button
                  onClick={() => onApproveArrival(schedule)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Verify</span>
                </button>
              )}

              {!isCancelled && onEditSchedule && (
                <button
                  onClick={() => onEditSchedule(schedule)}
                  className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                  title="Edit schedule"
                >
                  Edit
                </button>
              )}

              {!isCancelled && onCancelSchedule && (
                <button
                  onClick={() => onCancelSchedule(schedule)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  title="Cancel schedule"
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

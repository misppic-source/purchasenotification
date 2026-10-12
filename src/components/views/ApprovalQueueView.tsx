import React, { useState } from 'react';
import { ArrivalRequest, RMSchedule } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  FileText,
  User,
  Calendar,
  Building2,
  AlertTriangle,
} from 'lucide-react';

interface ApprovalQueueViewProps {
  arrivalRequests: ArrivalRequest[];
  schedules: RMSchedule[];
  onOpenApprovalModal: (req: ArrivalRequest) => void;
  onViewScheduleDetails: (s: RMSchedule) => void;
}

export const ApprovalQueueView: React.FC<ApprovalQueueViewProps> = ({
  arrivalRequests,
  schedules,
  onOpenApprovalModal,
  onViewScheduleDetails,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED'>('PENDING_APPROVAL');

  const filteredRequests = arrivalRequests.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const pendingCount = arrivalRequests.filter((r) => r.status === 'PENDING_APPROVAL').length;
  const approvedCount = arrivalRequests.filter((r) => r.status === 'APPROVED' || r.status === 'PARTIALLY_APPROVED').length;
  const rejectedCount = arrivalRequests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>PPIC Arrival Verification Queue</span>
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded-full font-mono">
                {pendingCount} Pending
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational principle: Purchase reports arrival · PPIC verifies delivery documents & weigh slips · System confirms official inventory receipt.
          </p>
        </div>

        {/* Clean Segmented Filter Bar */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
          <button
            onClick={() => setFilter('PENDING_APPROVAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'PENDING_APPROVAL'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'APPROVED'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'REJECTED'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All History
          </button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-slate-900">Official Receipt Enforcement:</strong> Reported quantities are awaiting physical warehouse verification. Only approved quantities will update official inventory and decrease the outstanding balance.
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200/80">
            No arrival reports found in this view.
          </div>
        ) : (
          filteredRequests.map((req) => {
            const sch = schedules.find((s) => s.id === req.scheduleId);
            const isPending = req.status === 'PENDING_APPROVAL';

            return (
              <div
                key={req.id}
                className={`bg-white rounded-xl border p-4 transition-all shadow-2xs ${
                  isPending
                    ? 'border-amber-200 border-l-4 border-l-amber-500'
                    : 'border-slate-200/80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Material Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {req.id}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {req.rmCode}
                      </span>
                      <StatusBadge status={req.status} size="sm" />
                    </div>

                    <h3 className="font-semibold text-slate-900 text-sm leading-snug">{req.rmDescription}</h3>

                    {/* Metadata text */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span>Submitted by <strong className="text-slate-700">{req.purchaseUserName}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Arrival: <strong className="text-slate-700 font-mono">{req.actualArrivalDate}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Supplier: <strong className="text-slate-700">{req.supplier || 'N/A'}</strong></span>
                      {req.deliveryChallan && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-[11px]">DC: {req.deliveryChallan}</span>
                        </>
                      )}
                      {req.invoiceNumber && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-[11px]">Inv: {req.invoiceNumber}</span>
                        </>
                      )}
                    </div>

                    {req.remarks && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-1">
                        <strong>Purchase Note:</strong> {req.remarks}
                      </div>
                    )}

                    {/* Reviewed history */}
                    {req.reviewedAt && (
                      <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 mt-1 space-y-0.5">
                        <div className="font-semibold text-slate-900">
                          Reviewed by {req.reviewedByName || req.reviewedBy} on {new Date(req.reviewedAt).toLocaleDateString()}
                          {req.approvedQty != null && (
                            <span className="text-emerald-700 font-bold ml-2">
                              (Approved: {req.approvedQty} {sch?.uom || 'KG'})
                            </span>
                          )}
                        </div>
                        {req.reviewerRemarks && <div>Note: {req.reviewerRemarks}</div>}
                        {req.rejectionReason && (
                          <div className="text-rose-700 font-semibold">Reason: {req.rejectionReason}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Quantities & Verification CTA */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-3 shrink-0 lg:border-l lg:border-slate-100 lg:pl-5">
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Reported By Gate</div>
                      <div className="text-xl font-bold text-slate-900 font-mono">
                        {req.reportedQty.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-500">{sch?.uom || 'KG'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Planned: {req.plannedQty} · Bal: {req.currentBalanceQty}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {sch && (
                        <button
                          onClick={() => onViewScheduleDetails(sch)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                        >
                          Schedule
                        </button>
                      )}

                      {isPending && (
                        <button
                          onClick={() => onOpenApprovalModal(req)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Verify & Decide</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
